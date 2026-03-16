/**
 * Field-Level Confidence & Review Prioritization — Domain 5.5
 *
 * Task Statements Covered:
 *   5.5: Human review workflows — field-level confidence scoring,
 *        flagFieldsForReview, stratified sampling by document type
 *
 * Key Insights:
 *   - Not all fields in a document need human review. Only flag fields
 *     where the model's confidence is below a threshold. This dramatically
 *     reduces the human review workload.
 *   - Stratified sampling ensures quality across document types. If you
 *     have 1000 invoices and 10 contracts, random sampling might never
 *     select a contract for review.
 *   - Review priority should reflect both confidence and document type.
 *     A low-confidence medical record needs expert review; a low-confidence
 *     invoice might only need a spot check.
 *
 * Mental Model: "Review what matters — use confidence to focus human
 *   attention where the model is least certain"
 */

import { z } from "zod";
import type {
  DocumentType,
  FieldConfidence,
  ReviewPriority,
  ReviewableDocument,
} from "../types.js";

// ---------------------------------------------------------------------------
// Confidence Scoring
// ---------------------------------------------------------------------------

/**
 * Configuration for field-level confidence thresholds. Different document
 * types can have different thresholds because the cost of errors varies.
 * A wrong amount on an invoice is less critical than a wrong dosage on
 * a medical record.
 */
export interface ConfidenceConfig {
  readonly defaultThreshold: number;
  readonly typeThresholds: ReadonlyMap<DocumentType, number>;
  readonly criticalFields: ReadonlySet<string>;
  readonly criticalFieldBoost: number;
}

/**
 * Creates a default confidence configuration. Critical fields (like
 * amounts, dates, names) get a boosted threshold.
 */
export function createDefaultConfig(): ConfidenceConfig {
  return {
    defaultThreshold: 0.85,
    typeThresholds: new Map<DocumentType, number>([
      ["invoice", 0.80],
      ["contract", 0.90],
      ["support_ticket", 0.75],
      ["medical_record", 0.95],
      ["financial_report", 0.90],
    ]),
    criticalFields: new Set([
      "amount",
      "total",
      "date",
      "name",
      "dosage",
      "account_number",
      "diagnosis",
      "signature",
    ]),
    criticalFieldBoost: 0.05,
  };
}

/**
 * Scores the confidence of a single field extraction. The confidence
 * value comes from the model; this function determines the threshold
 * and whether review is needed.
 *
 * Returns a new FieldConfidence with needsReview set based on the
 * threshold for this document type and field criticality.
 */
export function scoreField(
  fieldName: string,
  value: unknown,
  modelConfidence: number,
  docType: DocumentType,
  config: ConfidenceConfig
): FieldConfidence {
  const baseThreshold =
    config.typeThresholds.get(docType) ?? config.defaultThreshold;

  // Critical fields get a higher threshold
  const isCritical = config.criticalFields.has(fieldName.toLowerCase());
  const threshold = isCritical
    ? Math.min(1.0, baseThreshold + config.criticalFieldBoost)
    : baseThreshold;

  const needsReview = modelConfidence < threshold;
  const reason = needsReview
    ? `Confidence ${modelConfidence.toFixed(3)} below threshold ${threshold.toFixed(3)}${isCritical ? " (critical field)" : ""}`
    : "Above threshold";

  return {
    fieldName,
    value,
    confidence: modelConfidence,
    needsReview,
    reason,
  };
}

/**
 * Scores all fields in a document and creates a ReviewableDocument.
 * The overall confidence is the minimum of all field confidences
 * (weakest link principle).
 */
export function scoreDocument(
  id: string,
  docType: DocumentType,
  fields: readonly { readonly name: string; readonly value: unknown; readonly confidence: number }[],
  config: ConfidenceConfig
): ReviewableDocument {
  const scoredFields = fields.map((f) =>
    scoreField(f.name, f.value, f.confidence, docType, config)
  );

  const overallConfidence =
    scoredFields.length > 0
      ? Math.min(...scoredFields.map((f) => f.confidence))
      : 0;

  const reviewPriority = determineReviewPriority(
    docType,
    overallConfidence,
    scoredFields
  );

  return {
    id,
    type: docType,
    fields: scoredFields,
    overallConfidence,
    reviewPriority,
  };
}

// ---------------------------------------------------------------------------
// Flag Fields for Review
// ---------------------------------------------------------------------------

/**
 * Extracts only the fields that need human review from a document.
 * Returns them sorted by confidence (lowest first = most uncertain).
 */
export function flagFieldsForReview(
  doc: ReviewableDocument
): readonly FieldConfidence[] {
  return [...doc.fields]
    .filter((f) => f.needsReview)
    .sort((a, b) => a.confidence - b.confidence);
}

/**
 * Generates a human-readable review summary for a document.
 * This is what a human reviewer would see in their queue.
 */
export function generateReviewSummary(doc: ReviewableDocument): string {
  const flagged = flagFieldsForReview(doc);

  if (flagged.length === 0) {
    return `Document ${doc.id} (${doc.type}): No fields need review. Priority: ${doc.reviewPriority}`;
  }

  const fieldLines = flagged
    .map(
      (f) =>
        `  - ${f.fieldName}: ${JSON.stringify(f.value)} (confidence: ${f.confidence.toFixed(3)}) — ${f.reason}`
    )
    .join("\n");

  return [
    `Document ${doc.id} (${doc.type})`,
    `Priority: ${doc.reviewPriority}`,
    `Overall confidence: ${doc.overallConfidence.toFixed(3)}`,
    `Fields needing review (${flagged.length}/${doc.fields.length}):`,
    fieldLines,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Stratified Sampling
// ---------------------------------------------------------------------------

/**
 * Sampling configuration per document type. Controls what fraction of
 * documents are sampled for review and the minimum sample count.
 */
export interface SamplingConfig {
  readonly typeRates: ReadonlyMap<DocumentType, number>;
  readonly defaultRate: number;
  readonly minimumPerType: number;
}

/**
 * Creates a default sampling configuration. Higher-risk document types
 * get higher sampling rates.
 */
export function createDefaultSamplingConfig(): SamplingConfig {
  return {
    typeRates: new Map<DocumentType, number>([
      ["invoice", 0.05],
      ["contract", 0.20],
      ["support_ticket", 0.03],
      ["medical_record", 0.25],
      ["financial_report", 0.15],
    ]),
    defaultRate: 0.10,
    minimumPerType: 1,
  };
}

/**
 * Performs stratified sampling across document types. Ensures each type
 * is represented in the review sample proportionally to its risk level.
 *
 * The sampling is deterministic given the same seed, so results are
 * reproducible for auditing.
 */
export function stratifiedSample(
  documents: readonly ReviewableDocument[],
  config: SamplingConfig,
  seed = 42
): readonly ReviewableDocument[] {
  // Group documents by type
  const byType = new Map<DocumentType, ReviewableDocument[]>();
  for (const doc of documents) {
    const existing = byType.get(doc.type) ?? [];
    byType.set(doc.type, [...existing, doc]);
  }

  const sampled: ReviewableDocument[] = [];

  for (const [docType, docs] of byType) {
    const rate = config.typeRates.get(docType) ?? config.defaultRate;
    const targetCount = Math.max(
      config.minimumPerType,
      Math.ceil(docs.length * rate)
    );

    // Sort by confidence (lowest first) so we preferentially sample
    // the least confident documents
    const sorted = [...docs].sort(
      (a, b) => a.overallConfidence - b.overallConfidence
    );

    // Take the least confident up to targetCount
    const selected = sorted.slice(0, targetCount);
    sampled.push(...selected);
  }

  // Deterministic shuffle using seed for reproducibility
  return deterministicShuffle(sampled, seed);
}

// ---------------------------------------------------------------------------
// Review Priority Determination
// ---------------------------------------------------------------------------

/**
 * Determines review priority based on document type, confidence, and
 * flagged field count. This creates a 4-tier system:
 *
 * - skip: High confidence, no flagged fields
 * - spot_check: Moderate confidence, few flagged fields
 * - full_review: Low confidence or many flagged fields
 * - expert_review: Very low confidence on high-risk document types
 */
function determineReviewPriority(
  docType: DocumentType,
  overallConfidence: number,
  fields: readonly FieldConfidence[]
): ReviewPriority {
  const flaggedCount = fields.filter((f) => f.needsReview).length;
  const flaggedRatio =
    fields.length > 0 ? flaggedCount / fields.length : 0;

  const isHighRisk =
    docType === "medical_record" ||
    docType === "contract" ||
    docType === "financial_report";

  // Expert review: very low confidence on high-risk docs
  if (isHighRisk && overallConfidence < 0.6) {
    return "expert_review";
  }

  // Full review: low confidence or many flagged fields
  if (overallConfidence < 0.7 || flaggedRatio > 0.5) {
    return "full_review";
  }

  // Spot check: moderate confidence
  if (overallConfidence < 0.85 || flaggedCount > 0) {
    return "spot_check";
  }

  // Skip: high confidence, no issues
  return "skip";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic shuffle using a seeded PRNG. Ensures stratified sampling
 * is reproducible for audit purposes.
 */
function deterministicShuffle<T>(
  items: readonly T[],
  seed: number
): readonly T[] {
  const result = [...items];
  let s = seed;

  for (let i = result.length - 1; i > 0; i--) {
    // Simple LCG PRNG
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    const temp = result[i];
    const swapItem = result[j];
    if (temp !== undefined && swapItem !== undefined) {
      result[i] = swapItem;
      result[j] = temp;
    }
  }

  return result;
}
