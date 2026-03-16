/**
 * Provenance Tracker — Source Attribution for Synthesized Responses
 *
 * Task Statements Covered:
 *   D5: 5.6 — Track provenance of information across the multi-agent
 *              pipeline so every claim in the response can be traced
 *              back to its source
 *
 * The provenance tracker follows information as it flows through:
 *   Ticket → Researcher (KB lookup) → Analyzer → Responder
 *
 * Each piece of information gets a provenance entry recording:
 *   - Where it came from (source ID + type)
 *   - How confident the agent is in the information
 *   - An excerpt from the original source
 *
 * This enables: audit trails, hallucination detection, trust calibration,
 * and "show your work" transparency in customer-facing responses.
 */

import type { ProvenanceEntry } from "../types.js";

// ---------------------------------------------------------------------------
// Provenance Builder Functions
// ---------------------------------------------------------------------------

/**
 * Create a provenance entry for a knowledge base article.
 */
export function fromKnowledgeBase(
  articleId: string,
  confidence: number,
  excerpt?: string
): ProvenanceEntry {
  return {
    sourceId: articleId,
    sourceType: "knowledge_base",
    confidence: clampConfidence(confidence),
    excerpt,
  };
}

/**
 * Create a provenance entry for ticket history.
 */
export function fromTicketHistory(
  ticketId: string,
  eventDetail: string,
  confidence: number
): ProvenanceEntry {
  return {
    sourceId: ticketId,
    sourceType: "ticket_history",
    confidence: clampConfidence(confidence),
    excerpt: eventDetail,
  };
}

/**
 * Create a provenance entry for an agent's inference (not directly
 * sourced from a document).
 */
export function fromAgentInference(
  agentId: string,
  reasoning: string,
  confidence: number
): ProvenanceEntry {
  return {
    sourceId: agentId,
    sourceType: "agent_inference",
    confidence: clampConfidence(confidence),
    excerpt: reasoning,
  };
}

/**
 * Create a provenance entry for customer data (profile, preferences).
 */
export function fromCustomerData(
  customerId: string,
  dataPoint: string,
  confidence: number
): ProvenanceEntry {
  return {
    sourceId: customerId,
    sourceType: "customer_data",
    confidence: clampConfidence(confidence),
    excerpt: dataPoint,
  };
}

// ---------------------------------------------------------------------------
// Provenance Chain Operations
// ---------------------------------------------------------------------------

/**
 * Merge multiple provenance chains, deduplicating by source ID.
 * When duplicates exist, keep the entry with higher confidence.
 */
export function mergeProvenance(
  ...chains: readonly (readonly ProvenanceEntry[])[]
): readonly ProvenanceEntry[] {
  const byKey = new Map<string, ProvenanceEntry>();

  for (const chain of chains) {
    for (const entry of chain) {
      const key = `${entry.sourceType}:${entry.sourceId}`;
      const existing = byKey.get(key);
      if (!existing || entry.confidence > existing.confidence) {
        byKey.set(key, entry);
      }
    }
  }

  return Array.from(byKey.values());
}

/**
 * Filter provenance entries by minimum confidence threshold.
 */
export function filterByConfidence(
  entries: readonly ProvenanceEntry[],
  minConfidence: number
): readonly ProvenanceEntry[] {
  return entries.filter((e) => e.confidence >= minConfidence);
}

/**
 * Calculate the overall confidence for a set of provenance entries.
 * Uses weighted average where knowledge_base sources are weighted
 * higher than agent_inference sources.
 */
export function calculateOverallConfidence(
  entries: readonly ProvenanceEntry[]
): number {
  if (entries.length === 0) return 0;

  const weights: Record<ProvenanceEntry["sourceType"], number> = {
    knowledge_base: 1.0,
    ticket_history: 0.9,
    customer_data: 0.85,
    agent_inference: 0.6,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const entry of entries) {
    const weight = weights[entry.sourceType];
    totalWeight += weight;
    weightedSum += entry.confidence * weight;
  }

  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

/**
 * Format provenance chain into a human-readable audit trail.
 */
export function formatAuditTrail(
  entries: readonly ProvenanceEntry[]
): string {
  if (entries.length === 0) return "No provenance information available.";

  const lines = entries.map((e, i) => {
    const sourceLabel = formatSourceType(e.sourceType);
    const excerptNote = e.excerpt ? ` — "${e.excerpt.slice(0, 100)}${e.excerpt.length > 100 ? "..." : ""}"` : "";
    return `${i + 1}. [${sourceLabel}] ${e.sourceId} (confidence: ${(e.confidence * 100).toFixed(0)}%)${excerptNote}`;
  });

  return `Provenance Trail:\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function formatSourceType(type: ProvenanceEntry["sourceType"]): string {
  const labels: Record<ProvenanceEntry["sourceType"], string> = {
    knowledge_base: "KB Article",
    ticket_history: "Ticket History",
    agent_inference: "Agent Inference",
    customer_data: "Customer Data",
  };
  return labels[type];
}
