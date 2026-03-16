/**
 * Error Handler — Structured Error Builder
 *
 * Task Statements Covered:
 *   D2: 2.2 — Return structured errors from tools with clear categories
 *
 * Every tool error flows through this module so that MCP clients receive
 * consistent, actionable error responses. Errors are categorised so the
 * coordinator can decide whether to retry, escalate, or abort.
 */

import type { ToolError } from "../types.js";

// ---------------------------------------------------------------------------
// Error Category Definitions
// ---------------------------------------------------------------------------

const ERROR_TEMPLATES: Readonly<
  Record<ToolError["category"], { readonly prefix: string; readonly recoverable: boolean }>
> = {
  not_found: { prefix: "NOT_FOUND", recoverable: false },
  validation: { prefix: "VALIDATION", recoverable: true },
  internal: { prefix: "INTERNAL", recoverable: false },
  rate_limit: { prefix: "RATE_LIMIT", recoverable: true },
  permission: { prefix: "PERMISSION", recoverable: false },
};

// ---------------------------------------------------------------------------
// Builder Functions
// ---------------------------------------------------------------------------

export function buildToolError(
  category: ToolError["category"],
  message: string,
  details?: Readonly<Record<string, unknown>>
): ToolError {
  const template = ERROR_TEMPLATES[category];
  return {
    code: `${template.prefix}_ERROR`,
    message,
    category,
    details,
  };
}

export function notFoundError(
  resourceType: string,
  resourceId: string
): ToolError {
  return buildToolError("not_found", `${resourceType} '${resourceId}' not found`, {
    resourceType,
    resourceId,
  });
}

export function validationError(
  field: string,
  reason: string
): ToolError {
  return buildToolError("validation", `Invalid value for '${field}': ${reason}`, {
    field,
    reason,
  });
}

export function internalError(
  operation: string,
  cause: string
): ToolError {
  return buildToolError("internal", `Internal error during '${operation}': ${cause}`, {
    operation,
  });
}

export function rateLimitError(
  retryAfterMs: number
): ToolError {
  return buildToolError("rate_limit", `Rate limit exceeded. Retry after ${retryAfterMs}ms`, {
    retryAfterMs,
  });
}

export function permissionError(
  action: string,
  resource: string
): ToolError {
  return buildToolError("permission", `Permission denied: cannot '${action}' on '${resource}'`, {
    action,
    resource,
  });
}

// ---------------------------------------------------------------------------
// MCP-Formatted Error Response
// ---------------------------------------------------------------------------

/**
 * Format a ToolError into the shape MCP expects for isError: true responses.
 * Returns a plain object with `content` array suitable for CallToolResult.
 */
export function formatMcpError(error: ToolError): {
  content: [{ type: "text"; text: string }];
  isError: true;
} {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(error, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Check whether a ToolError is recoverable (worth retrying).
 */
export function isRecoverable(error: ToolError): boolean {
  return ERROR_TEMPLATES[error.category].recoverable;
}
