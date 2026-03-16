/**
 * Domain 4 — Shared Types
 *
 * All types are readonly/immutable. This file provides the shared type
 * vocabulary for the entire d4-prompts project.
 *
 * Mental model: "Specificity beats vagueness. Examples beat instructions.
 * Schemas beat parsing."
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// 4.1 — Criteria Prompt Types
// ---------------------------------------------------------------------------

/** A single evaluation criterion with definition and negative examples */
export interface CriterionDefinition {
  readonly name: string;
  readonly description: string;
  readonly weight: number;
  /** Negative examples help reduce false positives */
  readonly negativeExamples: readonly string[];
}

/** Result of a criteria-based review */
export interface ReviewResult {
  readonly documentId: string;
  readonly criteria: readonly CriterionScore[];
  readonly overallScore: number;
  readonly summary: string;
  readonly falsePositiveFlags: readonly string[];
}

export interface CriterionScore {
  readonly criterion: string;
  readonly score: number;
  readonly confidence: number;
  readonly evidence: string;
  readonly reasoning: string;
}

// ---------------------------------------------------------------------------
// 4.2 — Few-Shot Types
// ---------------------------------------------------------------------------

export type SentimentLabel = "positive" | "negative" | "neutral" | "sarcastic";

export interface FewShotExample {
  readonly input: string;
  readonly output: SentimentClassification;
  /** Why this example was chosen — helps learners understand targeting */
  readonly selectionReason: string;
}

export interface SentimentClassification {
  readonly label: SentimentLabel;
  readonly confidence: number;
  readonly reasoning: string;
}

// ---------------------------------------------------------------------------
// 4.3 — Structured Output Types (Zod schemas + inferred types)
// ---------------------------------------------------------------------------

export const ContactSchema = z.object({
  name: z.string().describe("Full name of the contact"),
  email: z.string().email().nullable().describe("Email address, null if not found"),
  phone: z.string().nullable().describe("Phone number, null if not found"),
  role: z
    .enum(["decision_maker", "influencer", "end_user", "unknown"])
    .describe("Role classification"),
  company: z.string().nullable().describe("Company name, null if not found"),
});

export const ExtractionResultSchema = z.object({
  contacts: z.array(ContactSchema).describe("All contacts extracted from text"),
  metadata: z.object({
    sourceType: z
      .enum(["email", "meeting_notes", "linkedin", "other"])
      .describe("Source document type"),
    extractionConfidence: z
      .number()
      .min(0)
      .max(1)
      .describe("Overall extraction confidence"),
    warnings: z
      .array(z.string())
      .describe("Any issues encountered during extraction"),
  }),
});

export type Contact = z.infer<typeof ContactSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// ---------------------------------------------------------------------------
// 4.4 — Validation / Retry Types
// ---------------------------------------------------------------------------

export interface ValidationAttempt {
  readonly attemptNumber: number;
  readonly rawOutput: string;
  readonly errors: readonly string[];
  readonly detectedPattern: string | null;
}

export interface ValidationResult<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly attempts: readonly ValidationAttempt[];
  readonly totalAttempts: number;
}

export interface RetryConfig {
  readonly maxAttempts: number;
  readonly feedbackStrategy: "append_errors" | "replace_prompt" | "escalate";
}

// ---------------------------------------------------------------------------
// 4.5 — Batch Processing Types
// ---------------------------------------------------------------------------

export interface BatchItem {
  readonly customId: string;
  readonly content: string;
}

export interface BatchRequestParams {
  readonly model: string;
  readonly maxTokens: number;
  readonly systemPrompt: string;
}

export interface BatchResultItem {
  readonly customId: string;
  readonly status: "succeeded" | "errored" | "expired";
  readonly result: unknown | null;
  readonly error: string | null;
}

export interface BatchProcessingResult {
  readonly batchId: string;
  readonly succeeded: readonly BatchResultItem[];
  readonly errored: readonly BatchResultItem[];
  readonly totalItems: number;
  readonly successRate: number;
}

// ---------------------------------------------------------------------------
// 4.6 — Multi-Pass Review Types
// ---------------------------------------------------------------------------

export type ReviewRole = "security" | "performance" | "correctness";

export interface FileReviewResult {
  readonly filePath: string;
  readonly role: ReviewRole;
  readonly findings: readonly Finding[];
}

export interface Finding {
  readonly severity: "critical" | "high" | "medium" | "low" | "info";
  readonly category: string;
  readonly description: string;
  readonly location: string;
  readonly suggestion: string;
}

export interface CrossFileResult {
  readonly pattern: string;
  readonly affectedFiles: readonly string[];
  readonly description: string;
  readonly severity: "critical" | "high" | "medium" | "low";
}

export interface ReviewSynthesis {
  readonly perFileResults: readonly FileReviewResult[];
  readonly crossFileResults: readonly CrossFileResult[];
  readonly summary: string;
  readonly criticalCount: number;
  readonly highCount: number;
}
