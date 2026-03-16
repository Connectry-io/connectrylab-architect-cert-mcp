/**
 * Session Manager — Long Conversation Context Management
 *
 * Task Statements Covered:
 *   D5: 5.1 — Maintain context across long conversations by extracting
 *              and storing key facts, preferences, and summaries
 *   D5: 5.4 — Fact extraction from conversation history to build a
 *              persistent context that survives context window limits
 *
 * The session manager maintains a structured context for each support
 * session. As the conversation progresses, it:
 *   1. Extracts discrete facts from new messages
 *   2. Maintains a rolling summary of the conversation
 *   3. Tracks customer preferences discovered over time
 *   4. Provides a compressed context window for the coordinator
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  SessionContext,
  ExtractedFact,
  CustomerPreferences,
  Ticket,
} from "../types.js";
import { FACT_EXTRACTION_PROMPT } from "../prompts/extraction.js";

// ---------------------------------------------------------------------------
// Session Store (in-memory, would be backed by DB in production)
// ---------------------------------------------------------------------------

const SESSION_STORE: Map<string, SessionContext> = new Map();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new session context for a ticket. Initializes with facts
 * extracted from the ticket itself.
 */
export async function createSession(
  client: Anthropic,
  sessionId: string,
  ticket: Ticket
): Promise<SessionContext> {
  const initialFacts = extractFactsFromTicket(ticket);
  const preferences = inferInitialPreferences(ticket);

  const session: SessionContext = {
    sessionId,
    ticketId: ticket.id,
    facts: initialFacts,
    customerPreferences: preferences,
    conversationSummary: `New support ticket: ${ticket.subject}. Category: ${ticket.category}, Priority: ${ticket.priority}.`,
    turnCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  SESSION_STORE.set(sessionId, session);
  return session;
}

/**
 * Retrieve an existing session context.
 */
export function getSession(sessionId: string): SessionContext | undefined {
  return SESSION_STORE.get(sessionId);
}

/**
 * Update session with new facts extracted from the latest interaction.
 * Returns a NEW session object (immutable update).
 */
export async function updateSessionWithFacts(
  client: Anthropic,
  sessionId: string,
  newContent: string
): Promise<SessionContext> {
  const existing = SESSION_STORE.get(sessionId);
  if (!existing) {
    throw new Error(`Session '${sessionId}' not found`);
  }

  // Extract facts from the new content using the model
  const extractedFacts = await extractFactsWithModel(client, newContent, existing);

  // Merge facts, deduplicating by content similarity
  const mergedFacts = mergeFacts(existing.facts, extractedFacts);

  // Update conversation summary
  const updatedSummary = await updateSummary(
    client,
    existing.conversationSummary,
    newContent,
    existing.turnCount
  );

  // Build new session immutably
  const updated: SessionContext = {
    ...existing,
    facts: mergedFacts,
    conversationSummary: updatedSummary,
    turnCount: existing.turnCount + 1,
    updatedAt: new Date().toISOString(),
  };

  SESSION_STORE.set(sessionId, updated);
  return updated;
}

/**
 * Build a compressed context string suitable for inclusion in a system
 * prompt. This gives the coordinator or subagent all critical context
 * without consuming the full conversation history.
 */
export function buildCompressedContext(session: SessionContext): string {
  const factsByCategory = groupFactsByCategory(session.facts);

  const factsSections = Object.entries(factsByCategory)
    .map(
      ([category, facts]) =>
        `### ${category}\n${facts.map((f) => `- ${f.content} (confidence: ${f.confidence})`).join("\n")}`
    )
    .join("\n\n");

  return `## Session Context (Turn ${session.turnCount})
### Summary
${session.conversationSummary}

### Customer Preferences
- Communication style: ${session.customerPreferences.communicationStyle}
- Language: ${session.customerPreferences.language}
- Previous issue categories: ${session.customerPreferences.previousIssueCategories.join(", ") || "none"}
- Escalation history: ${session.customerPreferences.escalationHistory.length} previous escalations

### Extracted Facts
${factsSections}`;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Extract structured facts from the ticket without calling the model.
 * This handles the "obvious" facts that are directly present in ticket fields.
 */
function extractFactsFromTicket(ticket: Ticket): readonly ExtractedFact[] {
  const now = new Date().toISOString();
  const facts: ExtractedFact[] = [];

  facts.push({
    id: `fact-${ticket.id}-email`,
    category: "customer",
    content: `Customer email: ${ticket.customerEmail}`,
    source: "ticket.customerEmail",
    extractedAt: now,
    confidence: 1.0,
  });

  facts.push({
    id: `fact-${ticket.id}-subject`,
    category: "issue",
    content: `Issue: ${ticket.subject}`,
    source: "ticket.subject",
    extractedAt: now,
    confidence: 1.0,
  });

  if (ticket.tags.length > 0) {
    facts.push({
      id: `fact-${ticket.id}-tags`,
      category: "issue",
      content: `Tags: ${ticket.tags.join(", ")}`,
      source: "ticket.tags",
      extractedAt: now,
      confidence: 1.0,
    });
  }

  // Check for recurring issue signals in the ticket body
  const recurringSignals = ["again", "third time", "still", "recurring", "keeps happening"];
  const bodyLower = ticket.body.toLowerCase();
  const hasRecurringSignal = recurringSignals.some((s) => bodyLower.includes(s));

  if (hasRecurringSignal) {
    facts.push({
      id: `fact-${ticket.id}-recurring`,
      category: "history",
      content: "Customer indicates this is a recurring issue",
      source: "ticket.body",
      extractedAt: now,
      confidence: 0.85,
    });
  }

  return facts;
}

/**
 * Infer initial customer preferences from ticket metadata.
 */
function inferInitialPreferences(ticket: Ticket): CustomerPreferences {
  // Infer communication style from ticket tone
  const bodyLower = ticket.body.toLowerCase();
  const isTechnical =
    bodyLower.includes("api") ||
    bodyLower.includes("error code") ||
    bodyLower.includes("integration") ||
    bodyLower.includes("req/min");
  const isCasual =
    bodyLower.includes("hi") ||
    bodyLower.includes("hey") ||
    bodyLower.includes("thanks");

  const communicationStyle: CustomerPreferences["communicationStyle"] = isTechnical
    ? "technical"
    : isCasual
      ? "casual"
      : "formal";

  return {
    communicationStyle,
    language: "en",
    previousIssueCategories: [ticket.category],
    escalationHistory: [],
  };
}

/**
 * Use Claude to extract facts from new content, guided by the extraction prompt.
 */
async function extractFactsWithModel(
  client: Anthropic,
  content: string,
  session: SessionContext
): Promise<readonly ExtractedFact[]> {
  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: FACT_EXTRACTION_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extract facts from this new content in the context of ticket ${session.ticketId}:\n\n${content}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    const parsed = JSON.parse(textBlock.text);
    if (!Array.isArray(parsed)) return [];

    const now = new Date().toISOString();
    return parsed.map(
      (f: { id?: string; category?: string; content?: string; source?: string; confidence?: number }) => ({
        id: f.id ?? `fact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        category: f.category ?? "general",
        content: f.content ?? "",
        source: f.source ?? "model-extraction",
        extractedAt: now,
        confidence: typeof f.confidence === "number" ? f.confidence : 0.7,
      })
    );
  } catch {
    // Fail gracefully — fact extraction is enhancement, not critical path
    return [];
  }
}

/**
 * Update the conversation summary with new content. Uses a rolling
 * summarization approach to keep context compressed.
 */
async function updateSummary(
  client: Anthropic,
  currentSummary: string,
  newContent: string,
  turnCount: number
): Promise<string> {
  // For early turns, just append to avoid unnecessary API calls
  if (turnCount < 3) {
    return `${currentSummary}\n\nTurn ${turnCount + 1}: ${newContent.slice(0, 200)}${newContent.length > 200 ? "..." : ""}`;
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system:
        "You are a conversation summarizer. Given the current summary and new content, produce an updated summary that captures all key information in 3-5 sentences. Preserve critical facts, decisions, and open questions.",
      messages: [
        {
          role: "user",
          content: `Current summary:\n${currentSummary}\n\nNew content:\n${newContent}\n\nProduce an updated summary:`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : currentSummary;
  } catch {
    // Graceful fallback — keep existing summary
    return currentSummary;
  }
}

/**
 * Merge new facts with existing, deduplicating by content similarity.
 */
function mergeFacts(
  existing: readonly ExtractedFact[],
  incoming: readonly ExtractedFact[]
): readonly ExtractedFact[] {
  const merged = [...existing];

  for (const fact of incoming) {
    const isDuplicate = existing.some(
      (e) =>
        e.content.toLowerCase() === fact.content.toLowerCase() ||
        (e.category === fact.category &&
          contentSimilarity(e.content, fact.content) > 0.8)
    );

    if (!isDuplicate) {
      merged.push(fact);
    }
  }

  return merged;
}

/**
 * Simple word-overlap similarity measure (Jaccard index).
 */
function contentSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Group facts by category for display.
 */
function groupFactsByCategory(
  facts: readonly ExtractedFact[]
): Readonly<Record<string, readonly ExtractedFact[]>> {
  const groups: Record<string, ExtractedFact[]> = {};
  for (const fact of facts) {
    const category = fact.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category]!.push(fact);
  }
  return groups;
}
