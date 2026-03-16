/**
 * Context Preservation — Domain 5.1
 *
 * Task Statements Covered:
 *   5.1: Context preservation strategies including progressive summarization,
 *        lost-in-the-middle mitigation, and tool output trimming
 *
 * Key Insights:
 *   - Raw tool output should NEVER be kept verbatim in context. Extract
 *     structured facts and discard the rest.
 *   - The "lost in the middle" phenomenon means models pay less attention
 *     to content in the middle of long contexts. Restate constraints at
 *     the point of use, not just at the beginning.
 *   - Progressive summarization replaces older messages with compressed
 *     summaries, preserving facts while freeing token budget.
 *
 * Mental Model: "Context is finite and degrades — extract facts, trim noise"
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ExtractedFact,
  FactCategory,
  ProgressiveSummary,
  TrimmedOutput,
  TrimmingStrategy,
} from "../types.js";

// ---------------------------------------------------------------------------
// Fact Extraction
// ---------------------------------------------------------------------------

/**
 * Extracts structured facts from raw tool output using Claude.
 * This is the core of context preservation: transform verbose,
 * unstructured tool output into compact, categorized facts.
 *
 * Example: A file listing of 500 lines becomes 5-10 facts like
 * "Project uses TypeScript with ESM modules" and "Entry point is src/index.ts"
 */
export async function extractFactsFromToolOutput(
  client: Anthropic,
  toolName: string,
  rawOutput: string,
  existingFacts: readonly ExtractedFact[]
): Promise<readonly ExtractedFact[]> {
  // Build a context that includes existing facts so we don't extract duplicates
  const existingFactList = existingFacts
    .map((f) => `- [${f.category}] ${f.content}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a fact extraction system. Extract key facts from tool output.
Return ONLY a JSON array of objects with fields: content, category, confidence.
Categories: constraint, requirement, finding, decision, assumption, metric.
Confidence is 0-1 indicating how certain the fact is.
Do NOT repeat facts already known. Be concise — each fact should be one sentence.`,
    messages: [
      {
        role: "user",
        content: `Tool: ${toolName}
Already known facts:
${existingFactList || "(none)"}

Raw output to extract from:
${rawOutput}`,
      },
    ],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "[]";

  // Parse the extracted facts, falling back to empty array on parse failure
  const parsed = safeParseFactArray(text);
  const now = new Date().toISOString();

  return parsed.map((raw, index) => ({
    id: `fact-${Date.now()}-${index}`,
    content: String(raw.content ?? ""),
    source: toolName,
    extractedAt: now,
    confidence: clampConfidence(raw.confidence),
    category: validateCategory(raw.category),
  }));
}

// ---------------------------------------------------------------------------
// Progressive Summarization
// ---------------------------------------------------------------------------

/**
 * Creates a progressive summary from a range of conversation messages.
 * The summary preserves extracted facts while compressing narrative.
 *
 * This is called when context usage approaches a threshold (e.g., 70%
 * of the window). The summary replaces the covered messages, freeing
 * token budget for new work.
 *
 * Strategy:
 *   1. Collect all facts from the message range
 *   2. Ask Claude to synthesize a concise summary preserving all facts
 *   3. Return a ProgressiveSummary that replaces the raw messages
 */
export async function createProgressiveSummary(
  client: Anthropic,
  messages: readonly string[],
  existingFacts: readonly ExtractedFact[],
  messageRange: readonly [number, number]
): Promise<ProgressiveSummary> {
  const messagesText = messages
    .slice(messageRange[0], messageRange[1] + 1)
    .join("\n---\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: `You are a summarization system. Create a concise summary that preserves
all key facts and decisions. The summary must be self-contained — a reader
should understand the current state without seeing the original messages.
Return plain text, not JSON.`,
    messages: [
      {
        role: "user",
        content: `Summarize these messages, preserving all facts:\n\n${messagesText}`,
      },
    ],
  });

  const summaryText =
    response.content[0]?.type === "text"
      ? response.content[0].text
      : "No summary generated";

  // Estimate tokens as ~4 chars per token (rough heuristic)
  const tokenEstimate = Math.ceil(summaryText.length / 4);

  return {
    id: `summary-${Date.now()}`,
    facts: existingFacts,
    coveringMessageRange: messageRange,
    createdAt: new Date().toISOString(),
    tokenEstimate,
  };
}

// ---------------------------------------------------------------------------
// Constraint Restatement (Lost-in-the-Middle Mitigation)
// ---------------------------------------------------------------------------

/**
 * Restates critical constraints at the point of use. This combats
 * the "lost in the middle" phenomenon where models pay less attention
 * to content sandwiched between the system prompt and recent messages.
 *
 * Call this before any operation where constraints matter — don't rely
 * on constraints stated 50 messages ago still being followed.
 */
export function restateConstraints(
  facts: readonly ExtractedFact[],
  relevantCategories: readonly FactCategory[]
): string {
  const relevant = facts.filter((f) =>
    relevantCategories.includes(f.category)
  );

  if (relevant.length === 0) {
    return "";
  }

  const lines = relevant.map(
    (f) => `- [${f.category.toUpperCase()}] ${f.content} (confidence: ${f.confidence})`
  );

  return [
    "=== ACTIVE CONSTRAINTS (restated for accuracy) ===",
    ...lines,
    "=== END CONSTRAINTS ===",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Tool Output Trimming
// ---------------------------------------------------------------------------

/**
 * Trims tool output to fit within a token budget. Three strategies:
 *
 * "structured" — Parse key-value pairs or JSON, keep structure, drop values
 *   Best for: API responses, config files, structured data
 *
 * "truncate" — Keep first N and last M lines, mark middle as trimmed
 *   Best for: Logs, stack traces (error is usually at top or bottom)
 *
 * "sample" — Keep every Nth line to get a representative sample
 *   Best for: Large file listings, repetitive data
 */
export function trimToolOutput(
  rawOutput: string,
  strategy: TrimmingStrategy,
  maxTokens: number
): TrimmedOutput {
  const estimatedTokens = Math.ceil(rawOutput.length / 4);

  // If output already fits, no trimming needed
  if (estimatedTokens <= maxTokens) {
    return {
      original: rawOutput,
      trimmed: rawOutput,
      strategy,
      retainedRatio: 1.0,
      lostInMiddleWarning: false,
    };
  }

  const maxChars = maxTokens * 4;

  switch (strategy) {
    case "structured":
      return trimStructured(rawOutput, maxChars);
    case "truncate":
      return trimTruncate(rawOutput, maxChars);
    case "sample":
      return trimSample(rawOutput, maxChars);
  }
}

/**
 * Structured trimming: attempt to parse as JSON and keep keys with
 * truncated values. Falls back to truncation if not parseable.
 */
function trimStructured(raw: string, maxChars: number): TrimmedOutput {
  try {
    const parsed = JSON.parse(raw);
    const skeleton = createJsonSkeleton(parsed, maxChars);
    const trimmed = JSON.stringify(skeleton, null, 2);
    return {
      original: raw,
      trimmed,
      strategy: "structured",
      retainedRatio: trimmed.length / raw.length,
      lostInMiddleWarning: false,
    };
  } catch {
    // Not JSON, fall back to truncation
    return trimTruncate(raw, maxChars);
  }
}

/**
 * Keep head and tail, mark the middle as trimmed. This avoids the
 * lost-in-the-middle problem by ensuring the most visible parts
 * (beginning and end) are preserved.
 */
function trimTruncate(raw: string, maxChars: number): TrimmedOutput {
  const lines = raw.split("\n");
  const headCount = Math.floor(lines.length * 0.4);
  const tailCount = Math.floor(lines.length * 0.4);
  const head = lines.slice(0, headCount);
  const tail = lines.slice(lines.length - tailCount);
  const omitted = lines.length - headCount - tailCount;

  const trimmed = [
    ...head,
    `\n... [${omitted} lines trimmed] ...\n`,
    ...tail,
  ].join("\n").slice(0, maxChars);

  return {
    original: raw,
    trimmed,
    strategy: "truncate",
    retainedRatio: trimmed.length / raw.length,
    lostInMiddleWarning: true,
  };
}

/**
 * Sample every Nth line to get a representative overview.
 */
function trimSample(raw: string, maxChars: number): TrimmedOutput {
  const lines = raw.split("\n");
  const targetLines = Math.floor(maxChars / 80); // assume ~80 chars per line
  const step = Math.max(1, Math.floor(lines.length / targetLines));

  const sampled: string[] = [`[Sampled every ${step} lines from ${lines.length} total]`];
  for (let i = 0; i < lines.length; i += step) {
    const line = lines[i];
    if (line !== undefined) {
      sampled.push(line);
    }
  }

  const trimmed = sampled.join("\n").slice(0, maxChars);

  return {
    original: raw,
    trimmed,
    strategy: "sample",
    retainedRatio: trimmed.length / raw.length,
    lostInMiddleWarning: false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a JSON skeleton that preserves structure but truncates leaf values.
 * Arrays show only the first element with a count annotation.
 */
function createJsonSkeleton(obj: unknown, maxChars: number, depth = 0): unknown {
  if (depth > 4 || JSON.stringify(obj).length < 100) {
    return obj;
  }

  if (Array.isArray(obj)) {
    const first = obj.length > 0 ? createJsonSkeleton(obj[0], maxChars, depth + 1) : null;
    return first !== null ? [first, `... (${obj.length - 1} more)`] : [];
  }

  if (typeof obj === "object" && obj !== null) {
    const entries = Object.entries(obj);
    const result: Record<string, unknown> = {};
    let currentSize = 0;

    for (const [key, value] of entries) {
      const processed = createJsonSkeleton(value, maxChars, depth + 1);
      const entrySize = JSON.stringify(processed).length;

      if (currentSize + entrySize > maxChars / (depth + 1)) {
        result["..."] = `(${entries.length - Object.keys(result).length} more fields)`;
        break;
      }

      result[key] = processed;
      currentSize += entrySize;
    }

    return result;
  }

  if (typeof obj === "string" && obj.length > 100) {
    return obj.slice(0, 97) + "...";
  }

  return obj;
}

function safeParseFactArray(text: string): readonly Record<string, unknown>[] {
  try {
    // Find JSON array in the response text
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed as Record<string, unknown>[];
  } catch {
    return [];
  }
}

function clampConfidence(value: unknown): number {
  const num = Number(value);
  if (Number.isNaN(num)) return 0.5;
  return Math.max(0, Math.min(1, num));
}

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  "constraint",
  "requirement",
  "finding",
  "decision",
  "assumption",
  "metric",
]);

function validateCategory(value: unknown): FactCategory {
  const str = String(value);
  if (VALID_CATEGORIES.has(str)) return str as FactCategory;
  return "finding";
}
