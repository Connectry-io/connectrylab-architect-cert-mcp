/**
 * Structured Error Responses for MCP Tools
 *
 * Covers: Task Statement 2.2
 *   - isError flag on tool results
 *   - Error categories: validation, auth, not_found, rate_limit
 *   - Retryable vs non-retryable classification
 *   - Structured metadata (field, resource, retryAfterMs, scope)
 *
 * Key insight: Error responses must carry enough structured information
 * for the model to decide what to do next. A raw stack trace or a generic
 * "Something went wrong" gives the model nothing actionable. A structured
 * error with a category, message, and retry guidance gives it a path forward.
 */

import type { ErrorCategory } from '../types.js';

/**
 * MCP tool result shape compatible with the SDK's server.tool() callback.
 * We define it here (rather than importing from types.ts) to keep the
 * return type co-located with the builders and avoid readonly/mutable
 * mismatches with the SDK's expected callback signature.
 *
 * The index signature `[key: string]: unknown` is required because the
 * SDK's CallToolResult type uses an index signature for extensibility.
 */
interface McpToolResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

// ---- Error Builder ----

/**
 * Shared error-response builder that ensures every tool returns errors
 * in a consistent, structured format.
 *
 * WHY this matters:
 * - The `isError: true` flag tells the model "this call did not succeed"
 *   without being an uncaught exception.
 * - The `category` field lets the model classify the failure and decide
 *   on a recovery strategy (fix input, escalate, wait and retry).
 * - The `retryable` flag tells the model whether the same call might
 *   succeed if attempted again.
 * - The `details` object provides machine-readable context: which field
 *   failed validation, which resource was missing, how long to wait.
 *
 * NEVER include raw stack traces — they leak implementation details
 * and are not actionable for a language model.
 */
export function toolError(
  category: ErrorCategory,
  message: string,
  details: Readonly<Record<string, unknown>> = {},
  retryable = false,
): McpToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          error: { category, message, retryable, details },
        }),
      },
    ],
  };
}

// ---- Success Builder ----

/**
 * Consistent success-response builder. Using both toolError() and
 * toolSuccess() ensures the response envelope is predictable:
 * - Success responses contain `data` and never `error`.
 * - Error responses contain `error` and never `data`.
 *
 * This consistency helps the model parse responses without guessing
 * which shape it received.
 */
export function toolSuccess(data: unknown): McpToolResult {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ data }),
      },
    ],
  };
}

// ---- Specialized Error Factories ----

/**
 * Validation error — the input was malformed or missing required fields.
 * Non-retryable: the model must fix the input before calling again.
 *
 * @param message Human-readable explanation of what is wrong
 * @param field   Which parameter caused the failure
 * @param received The value that was provided (for diagnostics)
 */
export function validationError(
  message: string,
  field: string,
  received?: unknown,
): McpToolResult {
  return toolError('validation', message, {
    field,
    ...(received !== undefined ? { received } : {}),
  });
}

/**
 * Auth error — missing or invalid credentials or permissions.
 * Non-retryable: the model should escalate to the user.
 *
 * @param message Human-readable explanation
 * @param scope   The permission scope that is missing (e.g. "invoices:write")
 * @param resource Optional: the resource the user tried to access
 */
export function authError(
  message: string,
  scope: string,
  resource?: string,
): McpToolResult {
  return toolError('auth', message, {
    scope,
    ...(resource ? { resource } : {}),
  });
}

/**
 * Not-found error — the requested resource does not exist.
 * Non-retryable: the model should verify the identifier.
 *
 * @param message  Human-readable explanation
 * @param resource The identifier that was not found
 */
export function notFoundError(
  message: string,
  resource: string,
): McpToolResult {
  return toolError('not_found', message, { resource });
}

/**
 * Rate-limit error — too many requests in a short window.
 * Retryable: the model should wait and try again.
 *
 * @param message       Human-readable explanation
 * @param retryAfterMs  Milliseconds to wait before retrying
 */
export function rateLimitError(
  message: string,
  retryAfterMs: number,
): McpToolResult {
  return toolError(
    'rate_limit',
    message,
    { retryAfterMs },
    true, // retryable = true
  );
}

// ---- Error Guard ----

/**
 * Wraps a tool handler to catch unexpected exceptions and convert them
 * into structured error responses. This prevents uncaught throws from
 * terminating the tool call with no structured information.
 *
 * Usage:
 *   server.tool("my_tool", schema, withErrorGuard(async (args) => { ... }));
 */
export function withErrorGuard<TArgs>(
  handler: (args: TArgs) => Promise<McpToolResult>,
): (args: TArgs) => Promise<McpToolResult> {
  return async (args: TArgs): Promise<McpToolResult> => {
    try {
      return await handler(args);
    } catch (error: unknown) {
      // Log the real error server-side for debugging
      console.error('[tool-error-guard]', error);

      // Return a sanitized error to the model — no stack traces
      const message = error instanceof Error
        ? error.message
        : 'An unexpected error occurred';

      return toolError('validation', message, {
        note: 'This error was caught by the error guard. Check server logs for details.',
      });
    }
  };
}
