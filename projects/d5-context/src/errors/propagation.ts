/**
 * Error Propagation with AgentResult<T> — Domain 5.3
 *
 * Task Statements Covered:
 *   5.3: Error propagation — AgentResult envelope, distinguishing access
 *        failures from empty results, partial result handling in coordinator
 *        fan-out patterns
 *
 * Key Insights:
 *   - "I couldn't reach the database" (ACCESS_FAILURE) is fundamentally
 *     different from "I queried the database and found nothing" (EMPTY_RESULT).
 *     The first means retry might help; the second means the data doesn't exist.
 *   - Subagents should NEVER throw exceptions. They wrap all errors in
 *     AgentResult so the coordinator can make informed decisions.
 *   - Partial results are often more useful than total failure. If 3 of 5
 *     data sources respond, work with what you have.
 *
 * Mental Model: "Every result is an envelope — unwrap it, check the status,
 *   handle all three cases (success, partial, failure)"
 */

import type {
  AgentError,
  AgentErrorCode,
  AgentResult,
  AgentResultStatus,
  ResultMetadata,
} from "../types.js";

// ---------------------------------------------------------------------------
// Result Constructors (immutable factory functions)
// ---------------------------------------------------------------------------

/**
 * Creates a successful result. Use when the operation completed with
 * all expected data.
 */
export function success<T>(
  data: T,
  startedAt: string,
  tokenCost = 0
): AgentResult<T> {
  return {
    status: "success",
    data,
    errors: [],
    metadata: createMetadata(startedAt, tokenCost, 0),
  };
}

/**
 * Creates a failure result. Use when the operation could not produce
 * any usable data.
 *
 * IMPORTANT: Choose the error code carefully:
 *   - ACCESS_FAILURE: couldn't reach the data source (retry may help)
 *   - EMPTY_RESULT: reached the source, nothing there (retry won't help)
 *   - TIMEOUT: operation took too long
 *   - RATE_LIMITED: hit API limits
 *   - INVALID_INPUT: bad request parameters
 *   - INTERNAL_ERROR: unexpected bug
 */
export function failure<T>(
  code: AgentErrorCode,
  message: string,
  source: string,
  startedAt: string
): AgentResult<T> {
  return {
    status: "failure",
    data: null,
    errors: [
      {
        code,
        message,
        source,
        recoverable: isRecoverable(code),
        timestamp: new Date().toISOString(),
      },
    ],
    metadata: createMetadata(startedAt, 0, 0),
  };
}

/**
 * Creates a partial result. Use when some data is available but errors
 * occurred for other parts. This is the critical middle ground between
 * success and failure.
 *
 * Example: querying 5 APIs, 3 responded, 2 timed out. The 3 responses
 * are still valuable — return them as partial with errors noting the gaps.
 */
export function partial<T>(
  data: T,
  errors: readonly AgentError[],
  startedAt: string,
  tokenCost = 0
): AgentResult<T> {
  return {
    status: "partial",
    data,
    errors,
    metadata: createMetadata(startedAt, tokenCost, 0),
  };
}

// ---------------------------------------------------------------------------
// Result Combinators
// ---------------------------------------------------------------------------

/**
 * Maps the data inside an AgentResult without changing the status.
 * If the result is a failure (data is null), returns the result unchanged.
 */
export function mapResult<T, U>(
  result: AgentResult<T>,
  fn: (data: T) => U
): AgentResult<U> {
  if (result.data === null) {
    return {
      ...result,
      data: null,
    };
  }

  return {
    ...result,
    data: fn(result.data),
  };
}

/**
 * Flat-maps the data inside an AgentResult. Useful when the mapping
 * function itself can fail.
 */
export function flatMapResult<T, U>(
  result: AgentResult<T>,
  fn: (data: T) => AgentResult<U>
): AgentResult<U> {
  if (result.data === null) {
    return {
      ...result,
      data: null,
    };
  }

  const inner = fn(result.data);

  // Merge errors from both layers
  return {
    ...inner,
    errors: [...result.errors, ...inner.errors],
    metadata: mergeMetadata(result.metadata, inner.metadata),
  };
}

/**
 * Combines multiple AgentResults into a single result. The combined
 * status is determined by the worst individual status:
 *   - All success → success
 *   - Any failure but some success → partial
 *   - All failure → failure
 *
 * This is the core pattern for coordinator fan-out: collect all subagent
 * results and combine them.
 */
export function combineResults<T>(
  results: readonly AgentResult<T>[]
): AgentResult<readonly T[]> {
  if (results.length === 0) {
    return success([], new Date().toISOString());
  }

  const successes: T[] = [];
  const allErrors: AgentError[] = [];
  let totalTokens = 0;
  let earliestStart = results[0]?.metadata.startedAt ?? new Date().toISOString();

  for (const result of results) {
    if (result.data !== null) {
      successes.push(result.data);
    }
    allErrors.push(...result.errors);
    totalTokens += result.metadata.tokenCost;

    if (result.metadata.startedAt < earliestStart) {
      earliestStart = result.metadata.startedAt;
    }
  }

  const status = determineCompositeStatus(results);

  return {
    status,
    data: successes.length > 0 ? successes : null,
    errors: allErrors,
    metadata: createMetadata(earliestStart, totalTokens, 0),
  };
}

// ---------------------------------------------------------------------------
// Error Wrapping for Subagents
// ---------------------------------------------------------------------------

/**
 * Wraps an async function in AgentResult error handling. Use this in
 * subagents to ensure exceptions never propagate — they're always
 * captured in the result envelope.
 *
 * Usage:
 *   const result = await wrapAsync("my-subagent", async () => {
 *     const data = await fetchSomething();
 *     return data;
 *   });
 */
export async function wrapAsync<T>(
  source: string,
  fn: () => Promise<T>
): Promise<AgentResult<T>> {
  const startedAt = new Date().toISOString();

  try {
    const data = await fn();
    return success(data, startedAt);
  } catch (error) {
    const code = classifyError(error);
    const message =
      error instanceof Error ? error.message : String(error);
    return failure(code, message, source, startedAt);
  }
}

/**
 * Wraps a synchronous function in AgentResult error handling.
 */
export function wrapSync<T>(
  source: string,
  fn: () => T
): AgentResult<T> {
  const startedAt = new Date().toISOString();

  try {
    const data = fn();
    return success(data, startedAt);
  } catch (error) {
    const code = classifyError(error);
    const message =
      error instanceof Error ? error.message : String(error);
    return failure(code, message, source, startedAt);
  }
}

// ---------------------------------------------------------------------------
// Result Inspection
// ---------------------------------------------------------------------------

/**
 * Checks if a result has any recoverable errors. Useful for deciding
 * whether to retry.
 */
export function hasRecoverableErrors<T>(result: AgentResult<T>): boolean {
  return result.errors.some((e) => e.recoverable);
}

/**
 * Extracts only the recoverable errors from a result.
 */
export function recoverableErrors<T>(
  result: AgentResult<T>
): readonly AgentError[] {
  return result.errors.filter((e) => e.recoverable);
}

/**
 * Adds a retry count to the metadata. Returns a new result.
 */
export function withRetryCount<T>(
  result: AgentResult<T>,
  retryCount: number
): AgentResult<T> {
  return {
    ...result,
    metadata: {
      ...result.metadata,
      retryCount,
    },
  };
}

/**
 * Unwraps a successful result or throws. Use ONLY at the top level
 * when you must convert back to exception-based flow.
 */
export function unwrapOrThrow<T>(result: AgentResult<T>): T {
  if (result.data !== null) {
    return result.data;
  }

  const errorMessages = result.errors.map((e) => `[${e.code}] ${e.message}`);
  throw new Error(`AgentResult failure: ${errorMessages.join("; ")}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMetadata(
  startedAt: string,
  tokenCost: number,
  retryCount: number
): ResultMetadata {
  return {
    startedAt,
    completedAt: new Date().toISOString(),
    tokenCost,
    retryCount,
  };
}

function mergeMetadata(a: ResultMetadata, b: ResultMetadata): ResultMetadata {
  return {
    startedAt: a.startedAt < b.startedAt ? a.startedAt : b.startedAt,
    completedAt: new Date().toISOString(),
    tokenCost: a.tokenCost + b.tokenCost,
    retryCount: a.retryCount + b.retryCount,
  };
}

function isRecoverable(code: AgentErrorCode): boolean {
  const recoverableCodes: ReadonlySet<AgentErrorCode> = new Set([
    "ACCESS_FAILURE",
    "TIMEOUT",
    "RATE_LIMITED",
  ]);
  return recoverableCodes.has(code);
}

function determineCompositeStatus<T>(
  results: readonly AgentResult<T>[]
): AgentResultStatus {
  const statuses = new Set(results.map((r) => r.status));

  if (statuses.size === 1 && statuses.has("success")) return "success";
  if (statuses.size === 1 && statuses.has("failure")) return "failure";
  return "partial";
}

/**
 * Classifies a caught error into an AgentErrorCode. This heuristic
 * examines the error message to distinguish access failures from
 * other error types.
 */
function classifyError(error: unknown): AgentErrorCode {
  if (!(error instanceof Error)) return "INTERNAL_ERROR";

  const msg = error.message.toLowerCase();

  if (msg.includes("timeout") || msg.includes("timed out")) return "TIMEOUT";
  if (msg.includes("rate limit") || msg.includes("429")) return "RATE_LIMITED";
  if (
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("network") ||
    msg.includes("fetch failed")
  ) {
    return "ACCESS_FAILURE";
  }
  if (msg.includes("not found") || msg.includes("404")) return "EMPTY_RESULT";
  if (msg.includes("invalid") || msg.includes("validation")) return "INVALID_INPUT";

  return "INTERNAL_ERROR";
}
