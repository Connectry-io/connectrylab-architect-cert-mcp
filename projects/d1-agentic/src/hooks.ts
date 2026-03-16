/**
 * Hooks — Tool Call Interception and Data Normalization
 *
 * Task Statements Covered:
 *   1.5: Apply Agent SDK hooks for tool call interception and data normalization
 *
 * What This Teaches:
 *   - How to intercept tool calls BEFORE they execute (input validation)
 *   - How to transform tool outputs AFTER execution (normalization)
 *   - Building a registry of hooks that apply per-tool or globally
 *   - The "guardrails" half of "model drives decisions, code enforces guardrails"
 *
 * In the Claude Agent SDK, hooks are configured in the agent definition:
 *   hooks: { beforeToolCall, afterToolCall }
 *
 * This module implements that pattern from scratch to show the mechanics.
 * Each hook is a pure async function that receives context and returns
 * a HookResult indicating whether to proceed and any transformed values.
 */

import type {
  BeforeToolCallHook,
  AfterToolCallHook,
  HookContext,
  HookRegistry,
  HookResult,
} from "./types.js";

// ---------------------------------------------------------------------------
// Hook Registry — Immutable Collection of Hooks
// ---------------------------------------------------------------------------

/**
 * Creates an empty hook registry. The registry is immutable — adding hooks
 * returns a new registry rather than mutating the existing one.
 */
export function createHookRegistry(): HookRegistry {
  return {
    beforeHooks: new Map(),
    afterHooks: new Map(),
  };
}

/**
 * Registers a beforeToolCall hook for a specific tool (or "*" for all tools).
 * Returns a NEW registry — the original is not modified.
 *
 * This pattern mirrors how Agent SDK hooks work: you declare them in config,
 * and the framework calls them at the right time. Here we make the mechanics
 * explicit so you can see exactly what happens.
 */
export function registerBeforeHook(
  registry: HookRegistry,
  toolPattern: string,
  hook: BeforeToolCallHook
): HookRegistry {
  const existingHooks = registry.beforeHooks.get(toolPattern) ?? [];
  const updatedHooks = [...existingHooks, hook];

  const newBeforeHooks = new Map(registry.beforeHooks);
  newBeforeHooks.set(toolPattern, updatedHooks);

  return {
    beforeHooks: newBeforeHooks,
    afterHooks: registry.afterHooks,
  };
}

/**
 * Registers an afterToolCall hook for a specific tool (or "*" for all tools).
 * Returns a NEW registry — the original is not modified.
 */
export function registerAfterHook(
  registry: HookRegistry,
  toolPattern: string,
  hook: AfterToolCallHook
): HookRegistry {
  const existingHooks = registry.afterHooks.get(toolPattern) ?? [];
  const updatedHooks = [...existingHooks, hook];

  const newAfterHooks = new Map(registry.afterHooks);
  newAfterHooks.set(toolPattern, updatedHooks);

  return {
    beforeHooks: registry.beforeHooks,
    afterHooks: newAfterHooks,
  };
}

// ---------------------------------------------------------------------------
// Hook Execution — Running Hooks in Pipeline Order
// ---------------------------------------------------------------------------

/**
 * Collects all hooks that match a given tool name. Hooks registered for
 * "*" (global) run first, followed by tool-specific hooks.
 */
function collectHooks<T>(
  hookMap: ReadonlyMap<string, readonly T[]>,
  toolName: string
): readonly T[] {
  const globalHooks = hookMap.get("*") ?? [];
  const specificHooks = hookMap.get(toolName) ?? [];
  return [...globalHooks, ...specificHooks];
}

/**
 * Runs all beforeToolCall hooks in pipeline order. Each hook receives
 * the (potentially modified) input from the previous hook.
 *
 * If any hook returns { proceed: false }, execution stops immediately
 * and the tool call is blocked. This is how guardrails work — the model
 * decides to call a tool, but code can veto that decision.
 *
 * KEY CONCEPT (1.5): Hooks run synchronously in a pipeline. The first
 * hook to reject stops the entire chain. This gives you layered validation:
 *   1. Global sanitization hook (runs on every tool)
 *   2. Tool-specific validation (runs only for matching tools)
 *   3. Rate limiting hook (runs on every tool)
 */
export async function runBeforeHooks(
  registry: HookRegistry,
  context: HookContext,
  input: Record<string, unknown>
): Promise<HookResult<Record<string, unknown>>> {
  const hooks = collectHooks(registry.beforeHooks, context.toolName);

  let currentInput = { ...input };

  for (const hook of hooks) {
    const result = await hook(context, currentInput);

    if (!result.proceed) {
      return {
        proceed: false,
        value: currentInput,
        message: result.message ?? `Hook blocked tool call: ${context.toolName}`,
      };
    }

    // Each hook can transform the input for the next hook in the pipeline
    currentInput = { ...result.value };
  }

  return { proceed: true, value: currentInput };
}

/**
 * Runs all afterToolCall hooks in pipeline order. Each hook receives
 * the (potentially modified) output from the previous hook.
 *
 * After hooks are used for:
 *   - Output normalization (consistent formatting)
 *   - Enrichment (adding metadata)
 *   - Logging and telemetry
 *   - PII redaction
 */
export async function runAfterHooks(
  registry: HookRegistry,
  context: HookContext,
  output: string
): Promise<HookResult<string>> {
  const hooks = collectHooks(registry.afterHooks, context.toolName);

  let currentOutput = output;

  for (const hook of hooks) {
    const result = await hook(context, currentOutput);

    if (!result.proceed) {
      return {
        proceed: false,
        value: currentOutput,
        message: result.message ?? `After-hook blocked result: ${context.toolName}`,
      };
    }

    currentOutput = result.value;
  }

  return { proceed: true, value: currentOutput };
}

// ---------------------------------------------------------------------------
// Built-in Hooks — Common Patterns
// ---------------------------------------------------------------------------

/**
 * Input sanitization hook. Trims whitespace from all string values and
 * removes any keys with null/undefined values. Runs as a global hook.
 *
 * This is a "data normalization" hook — it ensures consistent input
 * format regardless of how the model constructs tool call arguments.
 */
export const sanitizeInputHook: BeforeToolCallHook = async (
  _context,
  input
) => {
  const sanitized = Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value != null)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ])
  );

  return { proceed: true, value: sanitized };
};

/**
 * Input length validation hook. Rejects tool calls where any string
 * argument exceeds the specified maximum length. Prevents the model
 * from sending excessively long inputs that could waste tokens or
 * cause downstream issues.
 */
export function createMaxLengthHook(maxLength: number): BeforeToolCallHook {
  return async (_context, input) => {
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string" && value.length > maxLength) {
        return {
          proceed: false,
          value: input,
          message: `Input field "${key}" exceeds max length of ${maxLength} characters (got ${value.length})`,
        };
      }
    }
    return { proceed: true, value: input };
  };
}

/**
 * Required fields validation hook. Ensures specified fields are present
 * and non-empty in the tool call input. This catches cases where the
 * model omits required arguments.
 */
export function createRequiredFieldsHook(
  fields: readonly string[]
): BeforeToolCallHook {
  return async (_context, input) => {
    const missing = fields.filter((field) => {
      const value = input[field];
      return value === undefined || value === null || value === "";
    });

    if (missing.length > 0) {
      return {
        proceed: false,
        value: input,
        message: `Missing required fields: ${missing.join(", ")}`,
      };
    }

    return { proceed: true, value: input };
  };
}

/**
 * Output normalization hook. Ensures all tool outputs follow a consistent
 * JSON envelope format: { status, data, timestamp }.
 *
 * This demonstrates the "after" side of hooks — transforming raw tool
 * output into a normalized format that downstream consumers expect.
 */
export const normalizeOutputHook: AfterToolCallHook = async (
  context,
  output
) => {
  // If output is already valid JSON with our envelope, pass through
  try {
    const parsed = JSON.parse(output);
    if (parsed && typeof parsed === "object" && "status" in parsed) {
      return { proceed: true, value: output };
    }
  } catch {
    // Not JSON — wrap it
  }

  const normalized = JSON.stringify({
    status: "success",
    data: output,
    tool: context.toolName,
    agent: context.agentId,
    timestamp: context.timestamp,
  });

  return { proceed: true, value: normalized };
};

/**
 * Logging hook. Records every tool call for debugging and telemetry.
 * In production, this would write to a structured logging system.
 *
 * This hook always returns { proceed: true } — it observes but never blocks.
 */
export const loggingHook: BeforeToolCallHook = async (context, input) => {
  const logEntry = {
    event: "tool_call",
    tool: context.toolName,
    agent: context.agentId,
    session: context.sessionId,
    timestamp: context.timestamp,
    inputKeys: Object.keys(input),
  };
  console.log("[HOOK:LOG]", JSON.stringify(logEntry));

  return { proceed: true, value: input };
};

/**
 * Rate limiting hook factory. Tracks call counts per tool per session
 * and rejects calls that exceed the limit within the time window.
 *
 * NOTE: This uses a mutable Map internally for tracking, but exposes
 * an immutable interface. In production, use Redis or similar for
 * distributed rate limiting.
 */
export function createRateLimitHook(
  maxCalls: number,
  windowMs: number
): BeforeToolCallHook {
  const callLog = new Map<string, readonly number[]>();

  return async (context, input) => {
    const key = `${context.sessionId}:${context.toolName}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const previousCalls = callLog.get(key) ?? [];
    const recentCalls = previousCalls.filter((t) => t > windowStart);

    if (recentCalls.length >= maxCalls) {
      return {
        proceed: false,
        value: input,
        message: `Rate limit exceeded for ${context.toolName}: ${maxCalls} calls per ${windowMs}ms`,
      };
    }

    // Track this call (internal mutation for performance, external immutability)
    callLog.set(key, [...recentCalls, now]);

    return { proceed: true, value: input };
  };
}

// ---------------------------------------------------------------------------
// Hook Registry Builder — Convenience for Setting Up Common Patterns
// ---------------------------------------------------------------------------

/**
 * Creates a hook registry pre-loaded with sensible defaults:
 *   - Global input sanitization
 *   - Global logging
 *   - Global output normalization
 *   - Global max-length validation (10,000 chars)
 *   - Global rate limiting (20 calls per minute)
 *
 * This mirrors how you'd configure hooks in an Agent SDK agent definition.
 */
export function createDefaultHookRegistry(): HookRegistry {
  let registry = createHookRegistry();

  // Global before hooks (run on every tool call)
  registry = registerBeforeHook(registry, "*", loggingHook);
  registry = registerBeforeHook(registry, "*", sanitizeInputHook);
  registry = registerBeforeHook(registry, "*", createMaxLengthHook(10_000));
  registry = registerBeforeHook(
    registry,
    "*",
    createRateLimitHook(20, 60_000)
  );

  // Global after hooks
  registry = registerAfterHook(registry, "*", normalizeOutputHook);

  return registry;
}
