/**
 * Shared Types — Domain 5 Mini Reference Project
 *
 * Task Statements Covered:
 *   All — provides the type foundation for every module
 *
 * Design Principle: IMMUTABILITY
 *   Every interface uses `readonly` properties. Functions return new objects
 *   rather than mutating existing ones. This prevents hidden side effects
 *   and makes long-session context management easier to reason about.
 *
 * Mental Model: "Context is finite and degrades — extract facts, trim noise,
 *   verify provenance"
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Context Preservation Types (5.1)
// ---------------------------------------------------------------------------

/**
 * A structured fact extracted from raw tool output. Facts are the atomic
 * unit of context preservation — they survive summarization while raw
 * tool output does not.
 */
export interface ExtractedFact {
  readonly id: string;
  readonly content: string;
  readonly source: string;
  readonly extractedAt: string;
  readonly confidence: number;
  readonly category: FactCategory;
}

export type FactCategory =
  | "constraint"
  | "requirement"
  | "finding"
  | "decision"
  | "assumption"
  | "metric";

/**
 * A progressive summary that compresses earlier conversation context
 * while preserving key facts. Each summary layer replaces the raw
 * messages it covers.
 */
export interface ProgressiveSummary {
  readonly id: string;
  readonly facts: readonly ExtractedFact[];
  readonly coveringMessageRange: readonly [number, number];
  readonly createdAt: string;
  readonly tokenEstimate: number;
}

/**
 * The trimming strategy determines which parts of tool output to keep.
 * "structured" extracts key-value pairs; "truncate" keeps head/tail;
 * "sample" keeps representative lines.
 */
export type TrimmingStrategy = "structured" | "truncate" | "sample";

export interface TrimmedOutput {
  readonly original: string;
  readonly trimmed: string;
  readonly strategy: TrimmingStrategy;
  readonly retainedRatio: number;
  readonly lostInMiddleWarning: boolean;
}

// ---------------------------------------------------------------------------
// Scratchpad / Large Codebase Types (5.4)
// ---------------------------------------------------------------------------

/**
 * A scratchpad entry persisted to disk. Scratchpad files survive /compact
 * because they exist outside the context window. After compaction, the
 * agent re-reads the scratchpad to recover working state.
 */
export interface ScratchpadEntry {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly section: string;
  readonly writtenAt: string;
}

export interface ScratchpadFile {
  readonly path: string;
  readonly entries: readonly ScratchpadEntry[];
  readonly lastUpdated: string;
}

/**
 * A subagent task for the coordinator pattern. The coordinator never
 * reads raw files — it delegates to subagents who each get fresh context.
 */
export interface SubagentTask {
  readonly id: string;
  readonly description: string;
  readonly scope: readonly string[];
  readonly contextBudget: number;
}

export interface SubagentSummary {
  readonly taskId: string;
  readonly findings: readonly string[];
  readonly filesExamined: readonly string[];
  readonly confidence: number;
  readonly tokenCost: number;
}

// ---------------------------------------------------------------------------
// Escalation Types (5.2)
// ---------------------------------------------------------------------------

/**
 * Typed escalation triggers. Each trigger has a category, a confidence
 * threshold below which escalation fires, and a severity.
 *
 * Key insight: sentiment analysis is unreliable for escalation decisions.
 * Use typed, policy-based triggers instead.
 */
export type EscalationCategory =
  | "policy_violation"
  | "confidence_below_threshold"
  | "sensitive_topic"
  | "customer_request"
  | "repeated_failure"
  | "financial_impact";

export type EscalationSeverity = "low" | "medium" | "high" | "critical";

export interface EscalationTrigger {
  readonly id: string;
  readonly category: EscalationCategory;
  readonly severity: EscalationSeverity;
  readonly description: string;
  readonly confidenceThreshold: number;
  readonly autoEscalate: boolean;
}

export interface EscalationEvent {
  readonly triggerId: string;
  readonly trigger: EscalationTrigger;
  readonly context: string;
  readonly detectedAt: string;
  readonly currentConfidence: number;
  readonly recommendedAction: string;
}

/**
 * Per-customer escalation preferences. Some customers want all issues
 * escalated immediately; others prefer automated resolution first.
 */
export type EscalationChannel = "email" | "slack" | "pagerduty" | "in_app";

export interface CustomerEscalationPreferences {
  readonly customerId: string;
  readonly defaultChannel: EscalationChannel;
  readonly topicOverrides: readonly TopicOverride[];
  readonly alwaysEscalateCategories: readonly EscalationCategory[];
  readonly neverAutoResolve: boolean;
  readonly escalationContacts: readonly EscalationContact[];
}

export interface TopicOverride {
  readonly topic: string;
  readonly channel: EscalationChannel;
  readonly severity: EscalationSeverity;
  readonly bypassAutoResolve: boolean;
}

export interface EscalationContact {
  readonly name: string;
  readonly channel: EscalationChannel;
  readonly address: string;
  readonly priority: number;
}

// ---------------------------------------------------------------------------
// Error Propagation Types (5.3)
// ---------------------------------------------------------------------------

/**
 * AgentResult<T> is the universal envelope for all agent operations.
 * It distinguishes between:
 *   - success: operation completed with data
 *   - partial: some data available but errors occurred
 *   - failure: no usable data
 *
 * Key insight: "access failure" (couldn't reach data) is fundamentally
 * different from "empty result" (reached data, nothing there).
 */
export type AgentResultStatus = "success" | "partial" | "failure";

export interface AgentResult<T> {
  readonly status: AgentResultStatus;
  readonly data: T | null;
  readonly errors: readonly AgentError[];
  readonly metadata: ResultMetadata;
}

export interface AgentError {
  readonly code: AgentErrorCode;
  readonly message: string;
  readonly source: string;
  readonly recoverable: boolean;
  readonly timestamp: string;
}

export type AgentErrorCode =
  | "ACCESS_FAILURE"
  | "EMPTY_RESULT"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INVALID_INPUT"
  | "INTERNAL_ERROR"
  | "PARTIAL_DATA";

export interface ResultMetadata {
  readonly startedAt: string;
  readonly completedAt: string;
  readonly tokenCost: number;
  readonly retryCount: number;
}

// ---------------------------------------------------------------------------
// Human Review Types (5.5)
// ---------------------------------------------------------------------------

/**
 * Field-level confidence enables stratified review: only flag the fields
 * that fall below a threshold, not the entire document.
 */
export interface FieldConfidence {
  readonly fieldName: string;
  readonly value: unknown;
  readonly confidence: number;
  readonly needsReview: boolean;
  readonly reason: string;
}

export interface ReviewableDocument {
  readonly id: string;
  readonly type: DocumentType;
  readonly fields: readonly FieldConfidence[];
  readonly overallConfidence: number;
  readonly reviewPriority: ReviewPriority;
}

export type DocumentType =
  | "invoice"
  | "contract"
  | "support_ticket"
  | "medical_record"
  | "financial_report";

export type ReviewPriority = "skip" | "spot_check" | "full_review" | "expert_review";

/**
 * A calibration bucket tracks how accurate the model's confidence
 * scores are for a given range. If the model says "90% confident"
 * but is only correct 70% of the time, the bucket reveals the gap.
 */
export interface CalibrationBucket {
  readonly rangeMin: number;
  readonly rangeMax: number;
  readonly predictedConfidence: number;
  readonly actualAccuracy: number;
  readonly sampleCount: number;
  readonly isCalibrated: boolean;
}

export interface CalibrationReport {
  readonly buckets: readonly CalibrationBucket[];
  readonly overallBrierScore: number;
  readonly recommendedThresholdAdjustment: number;
  readonly generatedAt: string;
}

// ---------------------------------------------------------------------------
// Provenance Types (5.6)
// ---------------------------------------------------------------------------

/**
 * A synthesized claim with explicit source bindings. Every claim
 * must trace back to one or more sources, with conflict detection
 * and temporal confidence penalties for stale data.
 */
export interface SourceBinding {
  readonly sourceId: string;
  readonly sourceType: SourceType;
  readonly excerpt: string;
  readonly retrievedAt: string;
  readonly documentDate: string | null;
  readonly reliability: number;
}

export type SourceType =
  | "api_response"
  | "document"
  | "database"
  | "user_input"
  | "cached_result"
  | "model_generation";

export interface SynthesizedClaim {
  readonly id: string;
  readonly claim: string;
  readonly sources: readonly SourceBinding[];
  readonly confidence: number;
  readonly conflicts: readonly ConflictAnnotation[];
  readonly temporalPenalty: number;
  readonly synthesizedAt: string;
}

export interface ConflictAnnotation {
  readonly sourceA: string;
  readonly sourceB: string;
  readonly description: string;
  readonly resolution: ConflictResolution;
}

export type ConflictResolution =
  | "source_a_preferred"
  | "source_b_preferred"
  | "merged"
  | "unresolved"
  | "deferred_to_human";

// ---------------------------------------------------------------------------
// Zod Schemas for Runtime Validation
// ---------------------------------------------------------------------------

export const ExtractedFactSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1),
  source: z.string().min(1),
  extractedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  category: z.enum([
    "constraint",
    "requirement",
    "finding",
    "decision",
    "assumption",
    "metric",
  ]),
});

export const EscalationTriggerSchema = z.object({
  id: z.string().min(1),
  category: z.enum([
    "policy_violation",
    "confidence_below_threshold",
    "sensitive_topic",
    "customer_request",
    "repeated_failure",
    "financial_impact",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(1),
  confidenceThreshold: z.number().min(0).max(1),
  autoEscalate: z.boolean(),
});

export const AgentResultSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    status: z.enum(["success", "partial", "failure"]),
    data: dataSchema.nullable(),
    errors: z.array(
      z.object({
        code: z.enum([
          "ACCESS_FAILURE",
          "EMPTY_RESULT",
          "TIMEOUT",
          "RATE_LIMITED",
          "INVALID_INPUT",
          "INTERNAL_ERROR",
          "PARTIAL_DATA",
        ]),
        message: z.string(),
        source: z.string(),
        recoverable: z.boolean(),
        timestamp: z.string().datetime(),
      })
    ),
    metadata: z.object({
      startedAt: z.string().datetime(),
      completedAt: z.string().datetime(),
      tokenCost: z.number().min(0),
      retryCount: z.number().min(0),
    }),
  });

export const SynthesizedClaimSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(1),
  sources: z
    .array(
      z.object({
        sourceId: z.string(),
        sourceType: z.enum([
          "api_response",
          "document",
          "database",
          "user_input",
          "cached_result",
          "model_generation",
        ]),
        excerpt: z.string(),
        retrievedAt: z.string().datetime(),
        documentDate: z.string().nullable(),
        reliability: z.number().min(0).max(1),
      })
    )
    .min(1),
  confidence: z.number().min(0).max(1),
  conflicts: z.array(
    z.object({
      sourceA: z.string(),
      sourceB: z.string(),
      description: z.string(),
      resolution: z.enum([
        "source_a_preferred",
        "source_b_preferred",
        "merged",
        "unresolved",
        "deferred_to_human",
      ]),
    })
  ),
  temporalPenalty: z.number().min(0).max(1),
  synthesizedAt: z.string().datetime(),
});
