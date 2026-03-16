/**
 * Information Provenance & Synthesis — Domain 5.6
 *
 * Task Statements Covered:
 *   5.6: Information provenance — claim-source mappings, conflict annotation,
 *        temporal confidence handling
 *
 * Key Insights:
 *   - Every claim an agent makes must trace back to one or more sources.
 *     "Model generation" is a valid source type, but it should carry lower
 *     reliability than verified data.
 *   - When sources conflict, annotate the conflict explicitly. Don't silently
 *     pick one source — surface the disagreement so humans (or the next
 *     agent) can make an informed decision.
 *   - Temporal confidence: data gets stale. A price from 5 minutes ago is
 *     more reliable than one from 5 days ago. Apply time-based penalties.
 *
 * Mental Model: "Every claim has a receipt — show your sources, flag conflicts,
 *   penalize stale data"
 */

import type {
  ConflictAnnotation,
  ConflictResolution,
  SourceBinding,
  SourceType,
  SynthesizedClaim,
} from "../types.js";

// ---------------------------------------------------------------------------
// Source Binding Creation
// ---------------------------------------------------------------------------

/**
 * Creates a source binding for a claim. Every piece of data used in
 * synthesis gets a binding that records where it came from, when it
 * was retrieved, and how reliable the source is.
 */
export function createSourceBinding(
  sourceId: string,
  sourceType: SourceType,
  excerpt: string,
  documentDate: string | null = null,
  reliability: number = sourceTypeDefaultReliability(sourceType)
): SourceBinding {
  return {
    sourceId,
    sourceType,
    excerpt,
    retrievedAt: new Date().toISOString(),
    documentDate,
    reliability,
  };
}

/**
 * Default reliability scores by source type. These reflect the general
 * trustworthiness of different data origins.
 *
 * - database: 0.95 — structured, validated data
 * - api_response: 0.85 — live data, may have errors
 * - document: 0.80 — authored content, may be outdated
 * - user_input: 0.70 — subjective, may be inaccurate
 * - cached_result: 0.60 — was reliable, but may be stale
 * - model_generation: 0.50 — hallucination risk
 */
function sourceTypeDefaultReliability(sourceType: SourceType): number {
  const defaults: Record<SourceType, number> = {
    database: 0.95,
    api_response: 0.85,
    document: 0.80,
    user_input: 0.70,
    cached_result: 0.60,
    model_generation: 0.50,
  };
  return defaults[sourceType];
}

// ---------------------------------------------------------------------------
// Temporal Confidence Penalty
// ---------------------------------------------------------------------------

/**
 * Calculates a temporal confidence penalty based on data age. The older
 * the data, the less confident we should be in it.
 *
 * Uses exponential decay: penalty = 1 - e^(-age/halfLife)
 * where age is in hours and halfLife controls the decay rate.
 *
 * @param retrievedAt When the data was retrieved (ISO string)
 * @param halfLifeHours How many hours until confidence halves (default: 24)
 * @returns Penalty between 0 (fresh) and ~1 (very stale)
 */
export function calculateTemporalPenalty(
  retrievedAt: string,
  halfLifeHours = 24
): number {
  const retrievedTime = new Date(retrievedAt).getTime();
  const now = Date.now();
  const ageHours = (now - retrievedTime) / (1000 * 60 * 60);

  if (ageHours <= 0) return 0;

  // Exponential decay: approaches 1 as age increases
  const decayRate = Math.LN2 / halfLifeHours;
  const penalty = 1 - Math.exp(-decayRate * ageHours);

  return Math.min(1, Math.max(0, penalty));
}

/**
 * Applies temporal penalty to a source binding's reliability.
 * Returns a new binding with adjusted reliability — never mutates.
 */
export function applyTemporalPenalty(
  binding: SourceBinding,
  halfLifeHours = 24
): SourceBinding {
  const penalty = calculateTemporalPenalty(binding.retrievedAt, halfLifeHours);
  const adjustedReliability = binding.reliability * (1 - penalty);

  return {
    ...binding,
    reliability: Math.max(0, adjustedReliability),
  };
}

// ---------------------------------------------------------------------------
// Conflict Detection
// ---------------------------------------------------------------------------

/**
 * Detects conflicts between source bindings for the same claim.
 * Two sources conflict if they provide different excerpts for the
 * same claim and both have reliability above a minimum threshold.
 *
 * Returns conflict annotations that describe what disagrees and
 * suggests a resolution strategy.
 */
export function detectConflicts(
  sources: readonly SourceBinding[],
  similarityThreshold = 0.3
): readonly ConflictAnnotation[] {
  const conflicts: ConflictAnnotation[] = [];

  for (let i = 0; i < sources.length; i++) {
    for (let j = i + 1; j < sources.length; j++) {
      const sourceA = sources[i];
      const sourceB = sources[j];

      if (!sourceA || !sourceB) continue;

      // Check if excerpts are meaningfully different
      const similarity = calculateSimilarity(
        sourceA.excerpt,
        sourceB.excerpt
      );

      if (similarity < similarityThreshold) {
        const resolution = suggestResolution(sourceA, sourceB);

        conflicts.push({
          sourceA: sourceA.sourceId,
          sourceB: sourceB.sourceId,
          description: buildConflictDescription(sourceA, sourceB, similarity),
          resolution,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Suggests a conflict resolution based on source reliability,
 * recency, and type.
 */
function suggestResolution(
  a: SourceBinding,
  b: SourceBinding
): ConflictResolution {
  // Large reliability gap: prefer the more reliable source
  const reliabilityGap = Math.abs(a.reliability - b.reliability);
  if (reliabilityGap > 0.2) {
    return a.reliability > b.reliability
      ? "source_a_preferred"
      : "source_b_preferred";
  }

  // If reliability is similar, prefer the more recent source
  const aTime = new Date(a.retrievedAt).getTime();
  const bTime = new Date(b.retrievedAt).getTime();
  const timeDiffHours = Math.abs(aTime - bTime) / (1000 * 60 * 60);

  if (timeDiffHours > 24) {
    return aTime > bTime ? "source_a_preferred" : "source_b_preferred";
  }

  // If one is model-generated and the other isn't, prefer the non-generated one
  if (a.sourceType === "model_generation" && b.sourceType !== "model_generation") {
    return "source_b_preferred";
  }
  if (b.sourceType === "model_generation" && a.sourceType !== "model_generation") {
    return "source_a_preferred";
  }

  // Close call — defer to human
  return "deferred_to_human";
}

// ---------------------------------------------------------------------------
// Claim Synthesis
// ---------------------------------------------------------------------------

/**
 * Synthesizes a claim from one or more source bindings. This is the
 * core provenance operation: create a claim, bind it to sources,
 * detect conflicts, and apply temporal penalties.
 */
export function synthesizeClaim(
  claim: string,
  sources: readonly SourceBinding[],
  temporalHalfLifeHours = 24
): SynthesizedClaim {
  // Apply temporal penalties to all sources
  const adjustedSources = sources.map((s) =>
    applyTemporalPenalty(s, temporalHalfLifeHours)
  );

  // Detect conflicts between sources
  const conflicts = detectConflicts(adjustedSources);

  // Calculate composite confidence from source reliabilities
  const baseConfidence = calculateCompositeConfidence(adjustedSources);

  // Apply conflict penalty: each unresolved conflict reduces confidence
  const conflictPenalty = conflicts.reduce((penalty, c) => {
    if (c.resolution === "unresolved" || c.resolution === "deferred_to_human") {
      return penalty + 0.1;
    }
    return penalty + 0.02;
  }, 0);

  // Calculate the temporal penalty as the average across sources
  const avgTemporalPenalty =
    sources.length > 0
      ? sources.reduce(
          (sum, s) =>
            sum + calculateTemporalPenalty(s.retrievedAt, temporalHalfLifeHours),
          0
        ) / sources.length
      : 0;

  const confidence = Math.max(
    0,
    Math.min(1, baseConfidence - conflictPenalty)
  );

  return {
    id: `claim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    claim,
    sources: adjustedSources,
    confidence,
    conflicts,
    temporalPenalty: avgTemporalPenalty,
    synthesizedAt: new Date().toISOString(),
  };
}

/**
 * Merges multiple claims about the same topic into one synthesized claim.
 * All source bindings are combined, conflicts are re-detected, and
 * confidence is recalculated.
 */
export function mergeClaims(
  claims: readonly SynthesizedClaim[],
  mergedClaimText: string
): SynthesizedClaim {
  const allSources = claims.flatMap((c) => [...c.sources]);
  return synthesizeClaim(mergedClaimText, allSources);
}

// ---------------------------------------------------------------------------
// Provenance Formatting
// ---------------------------------------------------------------------------

/**
 * Formats a synthesized claim with full provenance information.
 * This is what gets shown to users or included in agent outputs.
 */
export function formatClaimWithProvenance(claim: SynthesizedClaim): string {
  const lines: string[] = [
    `Claim: ${claim.claim}`,
    `Confidence: ${claim.confidence.toFixed(3)}${claim.temporalPenalty > 0.1 ? ` (temporal penalty: ${claim.temporalPenalty.toFixed(3)})` : ""}`,
    "",
    "Sources:",
  ];

  for (const source of claim.sources) {
    lines.push(
      `  [${source.sourceType}] ${source.sourceId} (reliability: ${source.reliability.toFixed(3)})`
    );
    lines.push(`    "${source.excerpt}"`);
    if (source.documentDate) {
      lines.push(`    Document date: ${source.documentDate}`);
    }
  }

  if (claim.conflicts.length > 0) {
    lines.push("", "Conflicts:");
    for (const conflict of claim.conflicts) {
      lines.push(
        `  ${conflict.sourceA} vs ${conflict.sourceB}: ${conflict.description}`
      );
      lines.push(`    Resolution: ${conflict.resolution}`);
    }
  }

  return lines.join("\n");
}

/**
 * Creates a citation-style reference for inline use.
 * Example: "[claim text] (Source: db-query-123, api-response-456; confidence: 0.87)"
 */
export function formatInlineCitation(claim: SynthesizedClaim): string {
  const sourceIds = claim.sources.map((s) => s.sourceId).join(", ");
  const conflictNote =
    claim.conflicts.length > 0
      ? `; ${claim.conflicts.length} conflict(s)`
      : "";

  return `${claim.claim} [Sources: ${sourceIds}; confidence: ${claim.confidence.toFixed(2)}${conflictNote}]`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculates composite confidence from multiple source reliabilities.
 * Uses a weighted average where higher-reliability sources have more
 * influence, plus a bonus for having multiple corroborating sources.
 */
function calculateCompositeConfidence(
  sources: readonly SourceBinding[]
): number {
  if (sources.length === 0) return 0;

  // Weighted average by reliability
  const totalWeight = sources.reduce((sum, s) => sum + s.reliability, 0);
  const weightedSum = sources.reduce(
    (sum, s) => sum + s.reliability * s.reliability,
    0
  );
  const baseConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Corroboration bonus: more sources increase confidence slightly
  const corroborationBonus = Math.min(0.1, (sources.length - 1) * 0.03);

  return Math.min(1, baseConfidence + corroborationBonus);
}

/**
 * Simple word-overlap similarity between two excerpts.
 * Returns 0-1 where 1 means identical word sets.
 */
function calculateSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function buildConflictDescription(
  a: SourceBinding,
  b: SourceBinding,
  similarity: number
): string {
  return `Sources disagree (similarity: ${similarity.toFixed(2)}). ` +
    `${a.sourceType} "${a.excerpt.slice(0, 50)}..." vs ` +
    `${b.sourceType} "${b.excerpt.slice(0, 50)}..."`;
}
