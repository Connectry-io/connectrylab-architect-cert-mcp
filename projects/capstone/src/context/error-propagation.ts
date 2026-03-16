/**
 * Error Propagation — AgentResult Envelope
 *
 * Task Statements Covered:
 *   D5: 5.3 — Implement structured error propagation across subagents
 *              using a consistent result envelope pattern
 *
 * Every subagent returns an AgentResult<T> envelope. This ensures:
 *   - Errors are never silently swallowed
 *   - The coordinator can distinguish success, partial, and failure
 *   - Duration and token usage are tracked per subagent
 *   - Provenance is attached to every result
 *
 * The coordinator uses these envelopes to decide whether to retry,
 * use partial results, or abort the pipeline.
 */

import type {
  AgentResult,
  AgentResultStatus,
  AgentError,
  ResultMetadata,
  TokenUsage,
  ProvenanceEntry,
} from "../types.js";

// ---------------------------------------------------------------------------
// Result Builders (Immutable Constructors)
// ---------------------------------------------------------------------------

/**
 * Create a successful AgentResult.
 */
export function successResult<T>(
  data: T,
  metadata: ResultMetadata
): AgentResult<T> {
  return {
    status: "success",
    data,
    error: null,
    metadata,
  };
}

/**
 * Create a partial result — the subagent produced something useful
 * but could not fully complete the task.
 */
export function partialResult<T>(
  data: T,
  error: AgentError,
  metadata: ResultMetadata
): AgentResult<T> {
  return {
    status: "partial",
    data,
    error,
    metadata,
  };
}

/**
 * Create a failed result — the subagent could not produce useful output.
 */
export function failedResult<T>(
  error: AgentError,
  metadata: ResultMetadata
): AgentResult<T> {
  return {
    status: "failed",
    data: null,
    error,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Error Builders
// ---------------------------------------------------------------------------

export function agentError(
  code: string,
  message: string,
  source: string,
  recoverable: boolean,
  context?: Readonly<Record<string, unknown>>
): AgentError {
  return { code, message, source, recoverable, context };
}

export function apiError(source: string, cause: string): AgentError {
  return agentError("API_ERROR", cause, source, true, { cause });
}

export function parseError(source: string, cause: string): AgentError {
  return agentError("PARSE_ERROR", `Failed to parse model output: ${cause}`, source, true);
}

export function timeoutError(source: string, durationMs: number): AgentError {
  return agentError("TIMEOUT", `Operation timed out after ${durationMs}ms`, source, true, {
    durationMs,
  });
}

export function validationFailedError(
  source: string,
  issues: readonly string[]
): AgentError {
  return agentError(
    "VALIDATION_FAILED",
    `Output failed validation: ${issues.join("; ")}`,
    source,
    false,
    { issues }
  );
}

// ---------------------------------------------------------------------------
// Metadata Builder
// ---------------------------------------------------------------------------

export function buildMetadata(
  agentId: string,
  startTime: number,
  tokenUsage: TokenUsage,
  provenance: readonly ProvenanceEntry[] = []
): ResultMetadata {
  return {
    agentId,
    durationMs: Date.now() - startTime,
    tokenUsage,
    timestamp: new Date().toISOString(),
    provenance,
  };
}

// ---------------------------------------------------------------------------
// Result Combinators
// ---------------------------------------------------------------------------

/**
 * Combine multiple AgentResults into a single aggregated status.
 * - All success → success
 * - Any failed → failed (if no successful results)
 * - Mix of success and failed → partial
 */
export function aggregateStatus(
  results: readonly AgentResult<unknown>[]
): AgentResultStatus {
  const statuses = results.map((r) => r.status);

  if (statuses.every((s) => s === "success")) return "success";
  if (statuses.every((s) => s === "failed")) return "failed";
  return "partial";
}

/**
 * Merge token usage from multiple subagent results.
 */
export function mergeTokenUsage(
  usages: readonly TokenUsage[]
): TokenUsage {
  return usages.reduce(
    (acc, u) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
    }),
    { inputTokens: 0, outputTokens: 0 }
  );
}

/**
 * Collect all errors from a set of results.
 */
export function collectErrors(
  results: readonly AgentResult<unknown>[]
): readonly AgentError[] {
  return results
    .filter((r) => r.error !== null)
    .map((r) => r.error!);
}

/**
 * Check if any result has a non-recoverable error.
 */
export function hasNonRecoverableError(
  results: readonly AgentResult<unknown>[]
): boolean {
  return collectErrors(results).some((e) => !e.recoverable);
}

/**
 * Extract all provenance entries from a set of results.
 */
export function collectProvenance(
  results: readonly AgentResult<unknown>[]
): readonly ProvenanceEntry[] {
  return results.flatMap((r) => r.metadata.provenance);
}
