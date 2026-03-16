/**
 * Shared Types — Capstone Support Agent Pro
 *
 * Task Statements Covered:
 *   All domains — provides the immutable type foundation for the entire system
 *
 * Design Principle: IMMUTABILITY
 *   Every interface uses `readonly` properties. Functions return new objects
 *   rather than mutating existing ones. This prevents hidden side effects
 *   across the multi-agent pipeline.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Ticket Domain
// ---------------------------------------------------------------------------

export type TicketPriority = "critical" | "high" | "medium" | "low";
export type TicketCategory =
  | "billing"
  | "technical"
  | "account"
  | "product"
  | "general";
export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "escalated"
  | "resolved"
  | "closed";
export type SentimentLevel = "frustrated" | "neutral" | "satisfied";

export interface Ticket {
  readonly id: string;
  readonly subject: string;
  readonly body: string;
  readonly customerEmail: string;
  readonly customerId: string;
  readonly priority: TicketPriority;
  readonly category: TicketCategory;
  readonly status: TicketStatus;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly history: readonly TicketEvent[];
}

export interface TicketEvent {
  readonly timestamp: string;
  readonly type: "created" | "updated" | "note_added" | "escalated" | "resolved";
  readonly actor: string;
  readonly detail: string;
}

// ---------------------------------------------------------------------------
// Knowledge Base
// ---------------------------------------------------------------------------

export interface KnowledgeArticle {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly category: TicketCategory;
  readonly tags: readonly string[];
  readonly lastUpdated: string;
  readonly relevanceScore?: number;
}

// ---------------------------------------------------------------------------
// Agent Result Envelope (D5: 5.3)
// ---------------------------------------------------------------------------

export type AgentResultStatus = "success" | "partial" | "failed";

export interface AgentResult<T> {
  readonly status: AgentResultStatus;
  readonly data: T | null;
  readonly error: AgentError | null;
  readonly metadata: ResultMetadata;
}

export interface AgentError {
  readonly code: string;
  readonly message: string;
  readonly source: string;
  readonly recoverable: boolean;
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface ResultMetadata {
  readonly agentId: string;
  readonly durationMs: number;
  readonly tokenUsage: TokenUsage;
  readonly timestamp: string;
  readonly provenance: readonly ProvenanceEntry[];
}

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

// ---------------------------------------------------------------------------
// Provenance (D5: 5.6)
// ---------------------------------------------------------------------------

export interface ProvenanceEntry {
  readonly sourceId: string;
  readonly sourceType: "knowledge_base" | "ticket_history" | "agent_inference" | "customer_data";
  readonly confidence: number;
  readonly excerpt?: string;
}

// ---------------------------------------------------------------------------
// Subagent Communication
// ---------------------------------------------------------------------------

export interface SubagentTask {
  readonly taskId: string;
  readonly type: "research" | "analysis" | "response";
  readonly input: Readonly<Record<string, unknown>>;
  readonly context: readonly string[];
  readonly constraints: readonly string[];
}

export interface TicketAnalysis {
  readonly ticketId: string;
  readonly category: TicketCategory;
  readonly priority: TicketPriority;
  readonly sentiment: SentimentLevel;
  readonly keyIssues: readonly string[];
  readonly suggestedActions: readonly string[];
  readonly requiresEscalation: boolean;
  readonly escalationReason?: string;
}

export interface ResearchResult {
  readonly query: string;
  readonly articles: readonly KnowledgeArticle[];
  readonly relevantHistory: readonly TicketEvent[];
  readonly provenance: readonly ProvenanceEntry[];
}

export interface DraftResponse {
  readonly ticketId: string;
  readonly subject: string;
  readonly body: string;
  readonly tone: "empathetic" | "professional" | "technical";
  readonly suggestedActions: readonly string[];
  readonly internalNotes: string;
  readonly provenance: readonly ProvenanceEntry[];
}

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

export interface CoordinatorInput {
  readonly ticketId: string;
  readonly sessionId: string;
}

export interface CoordinatorOutput {
  readonly ticketId: string;
  readonly analysis: TicketAnalysis;
  readonly research: ResearchResult;
  readonly draftResponse: DraftResponse;
  readonly pipelineStages: readonly PipelineStageRecord[];
  readonly totalDurationMs: number;
}

export interface PipelineStageRecord {
  readonly stage: PipelineStage;
  readonly status: AgentResultStatus;
  readonly durationMs: number;
  readonly error?: string;
}

export type PipelineStage =
  | "ticket_fetch"
  | "analysis"
  | "research"
  | "response_draft"
  | "validation";

// ---------------------------------------------------------------------------
// Session & Context (D5: 5.1)
// ---------------------------------------------------------------------------

export interface SessionContext {
  readonly sessionId: string;
  readonly ticketId: string;
  readonly facts: readonly ExtractedFact[];
  readonly customerPreferences: CustomerPreferences;
  readonly conversationSummary: string;
  readonly turnCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ExtractedFact {
  readonly id: string;
  readonly category: string;
  readonly content: string;
  readonly source: string;
  readonly extractedAt: string;
  readonly confidence: number;
}

export interface CustomerPreferences {
  readonly communicationStyle: "formal" | "casual" | "technical";
  readonly language: string;
  readonly previousIssueCategories: readonly TicketCategory[];
  readonly escalationHistory: readonly EscalationRecord[];
}

// ---------------------------------------------------------------------------
// Escalation (D5: 5.2)
// ---------------------------------------------------------------------------

export type EscalationTrigger =
  | "sentiment_critical"
  | "repeated_issue"
  | "sla_breach"
  | "customer_request"
  | "technical_complexity"
  | "policy_exception";

export interface EscalationRecord {
  readonly trigger: EscalationTrigger;
  readonly timestamp: string;
  readonly reason: string;
  readonly ticketId: string;
  readonly resolvedAt?: string;
}

export interface EscalationDecision {
  readonly shouldEscalate: boolean;
  readonly trigger: EscalationTrigger | null;
  readonly reason: string;
  readonly targetTeam: string | null;
  readonly urgency: "immediate" | "next_available" | "scheduled";
}

// ---------------------------------------------------------------------------
// Hook Types (D1: 1.5)
// ---------------------------------------------------------------------------

export interface HookContext {
  readonly toolName: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly timestamp: string;
}

export interface HookResult<T> {
  readonly proceed: boolean;
  readonly value: T;
  readonly message?: string;
}

export type BeforeToolCallHook = (
  context: HookContext,
  input: Readonly<Record<string, unknown>>
) => Promise<HookResult<Readonly<Record<string, unknown>>>>;

export type AfterToolCallHook = (
  context: HookContext,
  output: string
) => Promise<HookResult<string>>;

// ---------------------------------------------------------------------------
// MCP Tool Schemas (D2)
// ---------------------------------------------------------------------------

export interface ToolError {
  readonly code: string;
  readonly message: string;
  readonly category: "not_found" | "validation" | "internal" | "rate_limit" | "permission";
  readonly details?: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Zod Schemas — Runtime Validation
// ---------------------------------------------------------------------------

export const TicketPrioritySchema = z.enum(["critical", "high", "medium", "low"]);
export const TicketCategorySchema = z.enum([
  "billing",
  "technical",
  "account",
  "product",
  "general",
]);
export const TicketStatusSchema = z.enum([
  "open",
  "in_progress",
  "waiting_customer",
  "escalated",
  "resolved",
  "closed",
]);
export const SentimentSchema = z.enum(["frustrated", "neutral", "satisfied"]);

export const TicketAnalysisSchema = z.object({
  ticketId: z.string().min(1),
  category: TicketCategorySchema,
  priority: TicketPrioritySchema,
  sentiment: SentimentSchema,
  keyIssues: z.array(z.string()).min(1, "At least one issue must be identified"),
  suggestedActions: z.array(z.string()),
  requiresEscalation: z.boolean(),
  escalationReason: z.string().optional(),
});

export const ResearchResultSchema = z.object({
  query: z.string().min(1),
  articles: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      category: TicketCategorySchema,
      tags: z.array(z.string()),
      lastUpdated: z.string(),
      relevanceScore: z.number().min(0).max(1).optional(),
    })
  ),
  relevantHistory: z.array(
    z.object({
      timestamp: z.string(),
      type: z.enum(["created", "updated", "note_added", "escalated", "resolved"]),
      actor: z.string(),
      detail: z.string(),
    })
  ),
  provenance: z.array(
    z.object({
      sourceId: z.string(),
      sourceType: z.enum([
        "knowledge_base",
        "ticket_history",
        "agent_inference",
        "customer_data",
      ]),
      confidence: z.number().min(0).max(1),
      excerpt: z.string().optional(),
    })
  ),
});

export const DraftResponseSchema = z.object({
  ticketId: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(20, "Response must be substantive"),
  tone: z.enum(["empathetic", "professional", "technical"]),
  suggestedActions: z.array(z.string()),
  internalNotes: z.string(),
  provenance: z.array(
    z.object({
      sourceId: z.string(),
      sourceType: z.enum([
        "knowledge_base",
        "ticket_history",
        "agent_inference",
        "customer_data",
      ]),
      confidence: z.number().min(0).max(1),
      excerpt: z.string().optional(),
    })
  ),
});

export const EscalationDecisionSchema = z.object({
  shouldEscalate: z.boolean(),
  trigger: z
    .enum([
      "sentiment_critical",
      "repeated_issue",
      "sla_breach",
      "customer_request",
      "technical_complexity",
      "policy_exception",
    ])
    .nullable(),
  reason: z.string(),
  targetTeam: z.string().nullable(),
  urgency: z.enum(["immediate", "next_available", "scheduled"]),
});
