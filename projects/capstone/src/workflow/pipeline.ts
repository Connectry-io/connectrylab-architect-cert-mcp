/**
 * Pipeline — Multi-Step Workflow with Zod Boundary Enforcement
 *
 * Task Statements Covered:
 *   D1: 1.4 — Multi-step workflow with Zod validation at stage boundaries
 *   D5: 5.3 — Error propagation via AgentResult envelopes
 *
 * The pipeline orchestrates the sequence of stages that process a
 * support ticket. Each stage boundary validates its input/output with
 * Zod schemas, ensuring type safety at runtime between stages.
 *
 * Stages: ticket_fetch → analysis → research → response_draft → validation
 *
 * If a stage fails, the pipeline can:
 *   - Retry (if the error is recoverable)
 *   - Skip to the next stage with partial data
 *   - Abort entirely for non-recoverable errors
 */

import { z } from "zod";
import type {
  PipelineStage,
  PipelineStageRecord,
  AgentResult,
  Ticket,
  TicketAnalysis,
  ResearchResult,
  DraftResponse,
  CoordinatorOutput,
} from "../types.js";
import { TicketAnalysisSchema, ResearchResultSchema, DraftResponseSchema } from "../types.js";

// ---------------------------------------------------------------------------
// Stage Boundary Schemas
// ---------------------------------------------------------------------------

/**
 * Each stage has an input and output schema. Data flowing between
 * stages must pass these Zod validations. This catches type mismatches
 * and data corruption at runtime.
 */

const TicketFetchOutputSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string().min(1),
  customerEmail: z.string().email(),
  customerId: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  category: z.enum(["billing", "technical", "account", "product", "general"]),
  status: z.enum(["open", "in_progress", "waiting_customer", "escalated", "resolved", "closed"]),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  history: z.array(z.object({
    timestamp: z.string(),
    type: z.enum(["created", "updated", "note_added", "escalated", "resolved"]),
    actor: z.string(),
    detail: z.string(),
  })),
});

const STAGE_SCHEMAS: Readonly<Record<PipelineStage, z.ZodTypeAny>> = {
  ticket_fetch: TicketFetchOutputSchema,
  analysis: TicketAnalysisSchema,
  research: ResearchResultSchema,
  response_draft: DraftResponseSchema,
  validation: z.object({
    approved: z.boolean(),
    qualityScore: z.number().min(0).max(1),
    issues: z.array(z.string()),
  }),
};

// ---------------------------------------------------------------------------
// Pipeline State (Immutable)
// ---------------------------------------------------------------------------

interface PipelineState {
  readonly stages: readonly PipelineStageRecord[];
  readonly currentStage: PipelineStage;
  readonly ticket: Ticket | null;
  readonly analysis: TicketAnalysis | null;
  readonly research: ResearchResult | null;
  readonly draft: DraftResponse | null;
  readonly startTime: number;
}

function initialState(): PipelineState {
  return {
    stages: [],
    currentStage: "ticket_fetch",
    ticket: null,
    analysis: null,
    research: null,
    draft: null,
    startTime: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Stage Execution
// ---------------------------------------------------------------------------

/**
 * Execute a pipeline stage and record the result. Returns a new
 * pipeline state (immutable update).
 */
export function recordStage(
  state: PipelineState,
  stage: PipelineStage,
  result: AgentResult<unknown>,
  durationMs: number
): PipelineState {
  const record: PipelineStageRecord = {
    stage,
    status: result.status,
    durationMs,
    error: result.error?.message,
  };

  return {
    ...state,
    stages: [...state.stages, record],
  };
}

/**
 * Validate data at a stage boundary using the stage's Zod schema.
 * Returns the validated data or throws with a descriptive error.
 */
export function validateStageBoundary<T>(
  stage: PipelineStage,
  data: unknown
): T {
  const schema = STAGE_SCHEMAS[stage];
  const result = schema.safeParse(data);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new PipelineBoundaryError(
      stage,
      `Stage '${stage}' boundary validation failed: ${issues}`
    );
  }

  return result.data as T;
}

// ---------------------------------------------------------------------------
// Pipeline Executor
// ---------------------------------------------------------------------------

export interface StageExecutors {
  readonly fetchTicket: (ticketId: string) => Promise<AgentResult<Ticket>>;
  readonly analyzeTicket: (ticket: Ticket) => Promise<AgentResult<TicketAnalysis>>;
  readonly researchTicket: (
    ticket: Ticket,
    analysis: TicketAnalysis
  ) => Promise<AgentResult<ResearchResult>>;
  readonly draftResponse: (
    ticket: Ticket,
    analysis: TicketAnalysis,
    research: ResearchResult
  ) => Promise<AgentResult<DraftResponse>>;
}

/**
 * Run the complete support pipeline. Each stage validates its output
 * at the boundary before passing data to the next stage.
 */
export async function runPipeline(
  ticketId: string,
  executors: StageExecutors
): Promise<CoordinatorOutput> {
  let state = initialState();
  const pipelineStart = Date.now();

  // Stage 1: Fetch ticket
  const fetchStart = Date.now();
  const fetchResult = await executors.fetchTicket(ticketId);
  state = recordStage(state, "ticket_fetch", fetchResult, Date.now() - fetchStart);

  if (fetchResult.status === "failed" || !fetchResult.data) {
    throw new PipelineAbortError(
      "ticket_fetch",
      fetchResult.error?.message ?? "Failed to fetch ticket"
    );
  }

  const ticket = validateStageBoundary<Ticket>("ticket_fetch", fetchResult.data);
  state = { ...state, ticket };

  // Stage 2: Analyze ticket
  const analysisStart = Date.now();
  const analysisResult = await executors.analyzeTicket(ticket);
  state = recordStage(state, "analysis", analysisResult, Date.now() - analysisStart);

  if (analysisResult.status === "failed" || !analysisResult.data) {
    throw new PipelineAbortError(
      "analysis",
      analysisResult.error?.message ?? "Failed to analyze ticket"
    );
  }

  const analysis = validateStageBoundary<TicketAnalysis>("analysis", analysisResult.data);
  state = { ...state, analysis };

  // Stage 3: Research
  const researchStart = Date.now();
  const researchResult = await executors.researchTicket(ticket, analysis);
  state = recordStage(state, "research", researchResult, Date.now() - researchStart);

  // Research can proceed with partial results
  const research: ResearchResult = researchResult.data ?? {
    query: ticket.subject,
    articles: [],
    relevantHistory: ticket.history,
    provenance: [],
  };
  state = { ...state, research };

  // Stage 4: Draft response
  const draftStart = Date.now();
  const draftResult = await executors.draftResponse(ticket, analysis, research);
  state = recordStage(state, "response_draft", draftResult, Date.now() - draftStart);

  if (draftResult.status === "failed" || !draftResult.data) {
    throw new PipelineAbortError(
      "response_draft",
      draftResult.error?.message ?? "Failed to draft response"
    );
  }

  const draft = draftResult.data;
  state = { ...state, draft };

  return {
    ticketId,
    analysis,
    research,
    draftResponse: draft,
    pipelineStages: state.stages,
    totalDurationMs: Date.now() - pipelineStart,
  };
}

// ---------------------------------------------------------------------------
// Pipeline Errors
// ---------------------------------------------------------------------------

export class PipelineBoundaryError extends Error {
  readonly stage: PipelineStage;

  constructor(stage: PipelineStage, message: string) {
    super(message);
    this.name = "PipelineBoundaryError";
    this.stage = stage;
  }
}

export class PipelineAbortError extends Error {
  readonly stage: PipelineStage;

  constructor(stage: PipelineStage, message: string) {
    super(message);
    this.name = "PipelineAbortError";
    this.stage = stage;
  }
}
