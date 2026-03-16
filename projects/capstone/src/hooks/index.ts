/**
 * Hook System — Tool Call Interception
 *
 * Task Statements Covered:
 *   D1: 1.5 — Implement hooks that intercept tool calls before and after
 *              execution for validation, logging, and transformation
 *
 * Hooks provide a cross-cutting concern layer that sits between the
 * agent and the tool execution. They enable:
 *   - Input validation before tool execution
 *   - Rate limiting and access control
 *   - Audit logging of all tool interactions
 *   - Output transformation and enrichment
 *   - Sensitive data redaction
 *
 * Hooks are registered per-tool and executed in order. A "before" hook
 * can block execution by returning { proceed: false }.
 */

import type {
  HookContext,
  HookResult,
  BeforeToolCallHook,
  AfterToolCallHook,
} from "../types.js";

// ---------------------------------------------------------------------------
// Hook Registry (Immutable Registration)
// ---------------------------------------------------------------------------

interface HookRegistryState {
  readonly beforeHooks: ReadonlyMap<string, readonly BeforeToolCallHook[]>;
  readonly afterHooks: ReadonlyMap<string, readonly AfterToolCallHook[]>;
}

let registry: HookRegistryState = {
  beforeHooks: new Map(),
  afterHooks: new Map(),
};

/**
 * Register a before-hook for a specific tool. Returns a new registry
 * reference (the old one is not mutated).
 */
export function registerBeforeHook(
  toolName: string,
  hook: BeforeToolCallHook
): void {
  const existing = registry.beforeHooks.get(toolName) ?? [];
  const updated = new Map(registry.beforeHooks);
  updated.set(toolName, [...existing, hook]);
  registry = { ...registry, beforeHooks: updated };
}

/**
 * Register an after-hook for a specific tool.
 */
export function registerAfterHook(
  toolName: string,
  hook: AfterToolCallHook
): void {
  const existing = registry.afterHooks.get(toolName) ?? [];
  const updated = new Map(registry.afterHooks);
  updated.set(toolName, [...existing, hook]);
  registry = { ...registry, afterHooks: updated };
}

// ---------------------------------------------------------------------------
// Hook Execution Engine
// ---------------------------------------------------------------------------

/**
 * Run all registered before-hooks for a tool. Returns the potentially
 * modified input, or a blocked result if any hook returns proceed: false.
 */
export async function runBeforeHooks(
  context: HookContext,
  input: Readonly<Record<string, unknown>>
): Promise<HookResult<Readonly<Record<string, unknown>>>> {
  const hooks = registry.beforeHooks.get(context.toolName) ?? [];

  let currentInput = input;
  for (const hook of hooks) {
    const result = await hook(context, currentInput);
    if (!result.proceed) {
      return result;
    }
    currentInput = result.value;
  }

  return { proceed: true, value: currentInput };
}

/**
 * Run all registered after-hooks for a tool. Returns the potentially
 * transformed output.
 */
export async function runAfterHooks(
  context: HookContext,
  output: string
): Promise<HookResult<string>> {
  const hooks = registry.afterHooks.get(context.toolName) ?? [];

  let currentOutput = output;
  for (const hook of hooks) {
    const result = await hook(context, currentOutput);
    if (!result.proceed) {
      return result;
    }
    currentOutput = result.value;
  }

  return { proceed: true, value: currentOutput };
}

// ---------------------------------------------------------------------------
// Built-in Hooks
// ---------------------------------------------------------------------------

/**
 * Audit logging hook — logs every tool call with timestamp and agent ID.
 * Registered as a before-hook on all tools.
 */
export const auditLogHook: BeforeToolCallHook = async (
  context: HookContext,
  input: Readonly<Record<string, unknown>>
): Promise<HookResult<Readonly<Record<string, unknown>>>> => {
  console.log(
    `[AUDIT] ${context.timestamp} | agent=${context.agentId} | tool=${context.toolName} | session=${context.sessionId}`
  );
  return { proceed: true, value: input };
};

/**
 * Input sanitization hook — strips potentially dangerous content
 * from string inputs before they reach tools.
 */
export const sanitizeInputHook: BeforeToolCallHook = async (
  _context: HookContext,
  input: Readonly<Record<string, unknown>>
): Promise<HookResult<Readonly<Record<string, unknown>>>> => {
  const sanitized = Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (typeof value === "string") {
        // Strip potential injection patterns
        const cleaned = value
          .replace(/<script[^>]*>.*?<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .trim();
        return [key, cleaned];
      }
      return [key, value];
    })
  );

  return { proceed: true, value: sanitized };
};

/**
 * Rate limiting hook — prevents excessive tool calls within a session.
 * Uses a sliding window counter per session.
 */
const sessionCallCounts: Map<string, { count: number; windowStart: number }> =
  new Map();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_CALLS = 30;

export const rateLimitHook: BeforeToolCallHook = async (
  context: HookContext,
  input: Readonly<Record<string, unknown>>
): Promise<HookResult<Readonly<Record<string, unknown>>>> => {
  const now = Date.now();
  const entry = sessionCallCounts.get(context.sessionId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    sessionCallCounts.set(context.sessionId, { count: 1, windowStart: now });
    return { proceed: true, value: input };
  }

  if (entry.count >= RATE_LIMIT_MAX_CALLS) {
    return {
      proceed: false,
      value: input,
      message: `Rate limit exceeded: ${RATE_LIMIT_MAX_CALLS} calls per ${RATE_LIMIT_WINDOW_MS / 1000}s window`,
    };
  }

  // Increment count (mutation is contained to this tracking structure)
  sessionCallCounts.set(context.sessionId, {
    count: entry.count + 1,
    windowStart: entry.windowStart,
  });

  return { proceed: true, value: input };
};

/**
 * Sensitive data redaction hook — masks PII in tool outputs before
 * they're returned to the model.
 */
export const redactSensitiveDataHook: AfterToolCallHook = async (
  _context: HookContext,
  output: string
): Promise<HookResult<string>> => {
  let redacted = output;

  // Redact email addresses (keep first 3 chars)
  redacted = redacted.replace(
    /([a-zA-Z0-9._%+-]{3})[a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "$1***@***"
  );

  // Redact potential credit card numbers
  redacted = redacted.replace(
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    "****-****-****-****"
  );

  // Redact SSN patterns
  redacted = redacted.replace(
    /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    "***-**-****"
  );

  return { proceed: true, value: redacted };
};

// ---------------------------------------------------------------------------
// Default Hook Setup
// ---------------------------------------------------------------------------

/**
 * Register the default set of hooks for the support agent system.
 * Called during server initialization.
 */
export function registerDefaultHooks(): void {
  // Audit logging on all tools
  const allTools = [
    "get_ticket",
    "search_tickets",
    "update_ticket",
    "search_knowledge_base",
    "get_article",
  ];

  for (const tool of allTools) {
    registerBeforeHook(tool, auditLogHook);
    registerBeforeHook(tool, sanitizeInputHook);
    registerBeforeHook(tool, rateLimitHook);
    registerAfterHook(tool, redactSensitiveDataHook);
  }
}
