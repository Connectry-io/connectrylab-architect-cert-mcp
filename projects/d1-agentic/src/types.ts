/**
 * Shared Types — Domain 1 Mini Reference Project
 *
 * Task Statements Covered:
 *   All — provides the type foundation for every module
 *
 * Design Principle: IMMUTABILITY
 *   Every interface uses `readonly` properties. Functions return new objects
 *   rather than mutating existing ones. This prevents hidden side effects
 *   and makes the agentic system easier to debug and reason about.
 *
 * Mental Model: "The model drives decisions, code enforces guardrails"
 *   Types are the first layer of guardrails — they constrain what data
 *   can flow through the system at compile time.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

/**
 * A tool that can be provided to Claude via the Messages API.
 * Tools are the primary mechanism for agents to interact with the world.
 */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly input_schema: {
    readonly type: "object";
    readonly properties: Record<string, unknown>;
    readonly required?: readonly string[];
  };
}

/**
 * Result of executing a tool. Contains the output text and whether
 * the execution encountered an error.
 */
export interface ToolResult {
  readonly tool_use_id: string;
  readonly content: string;
  readonly is_error: boolean;
}

// ---------------------------------------------------------------------------
// Message Types
// ---------------------------------------------------------------------------

/**
 * A single message in a conversation. Messages are immutable — to add
 * context, create a new array with the additional message appended.
 */
export interface ConversationMessage {
  readonly role: "user" | "assistant";
  readonly content: string | readonly ContentBlock[];
}

export interface ContentBlock {
  readonly type: string;
  readonly [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Agentic Loop Types (1.1)
// ---------------------------------------------------------------------------

/**
 * Configuration for an agentic loop. Controls how many iterations
 * the agent can run and what model to use.
 */
export interface AgentLoopConfig {
  readonly model: string;
  readonly maxIterations: number;
  readonly tools: readonly ToolDefinition[];
  readonly systemPrompt: string;
}

/**
 * The result of a single iteration in the agentic loop.
 * stop_reason determines whether the loop continues or terminates.
 */
export interface IterationResult {
  readonly stop_reason: "end_turn" | "tool_use" | "max_tokens";
  readonly content: readonly ContentBlock[];
  readonly toolCalls: readonly ToolCall[];
  readonly usage: TokenUsage;
}

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly input: Record<string, unknown>;
}

export interface TokenUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
}

/**
 * Final result of an agentic loop execution. Contains the complete
 * conversation history, iteration count, and the agent's final output.
 */
export interface AgentLoopResult {
  readonly finalResponse: string;
  readonly iterations: number;
  readonly messages: readonly ConversationMessage[];
  readonly totalUsage: TokenUsage;
}

// ---------------------------------------------------------------------------
// Coordinator Types (1.2, 1.6)
// ---------------------------------------------------------------------------

/**
 * A research query that the coordinator decomposes into subtasks.
 * Task decomposition (1.6) transforms one query into many subtasks.
 */
export interface ResearchQuery {
  readonly topic: string;
  readonly depth: "shallow" | "moderate" | "deep";
  readonly focusAreas: readonly string[];
}

/**
 * A subtask produced by task decomposition. Each subtask is assigned
 * to a specific subagent with its own scoped context.
 */
export interface SubTask {
  readonly id: string;
  readonly type: "research" | "analysis";
  readonly description: string;
  readonly context: string;
  readonly assignedAgent: string;
  readonly dependencies: readonly string[];
}

/**
 * Result from a subagent completing its subtask. Results are
 * aggregated by the coordinator into the final output.
 */
export interface SubTaskResult {
  readonly taskId: string;
  readonly agentId: string;
  readonly output: string;
  readonly confidence: number;
  readonly sources: readonly string[];
  readonly status: "success" | "partial" | "failed";
}

/**
 * The coordinator's aggregated final output after all subagents
 * have completed their work.
 */
export interface CoordinatorResult {
  readonly query: ResearchQuery;
  readonly subtasks: readonly SubTask[];
  readonly results: readonly SubTaskResult[];
  readonly synthesis: string;
  readonly totalIterations: number;
}

// ---------------------------------------------------------------------------
// Workflow Types (1.4)
// ---------------------------------------------------------------------------

/**
 * Stages in a multi-step workflow. Each stage has a Zod schema
 * that enforces the shape of data at the boundary.
 */
export type WorkflowStage =
  | "decomposition"
  | "research"
  | "analysis"
  | "synthesis"
  | "review";

export interface WorkflowState {
  readonly currentStage: WorkflowStage;
  readonly completedStages: readonly WorkflowStage[];
  readonly stageData: Readonly<Record<string, unknown>>;
  readonly errors: readonly WorkflowError[];
}

export interface WorkflowError {
  readonly stage: WorkflowStage;
  readonly message: string;
  readonly timestamp: string;
}

/**
 * A transition between workflow stages. The coordinator validates
 * output against the target stage's schema before allowing the
 * transition to proceed.
 */
export interface StageTransition {
  readonly from: WorkflowStage;
  readonly to: WorkflowStage;
  readonly validatedData: unknown;
  readonly timestamp: string;
}

// ---------------------------------------------------------------------------
// Hook Types (1.5)
// ---------------------------------------------------------------------------

/**
 * Hook functions intercept tool calls before and after execution.
 * beforeToolCall can modify inputs (validation, normalization).
 * afterToolCall can transform outputs (formatting, enrichment).
 */
export interface HookContext {
  readonly toolName: string;
  readonly agentId: string;
  readonly sessionId: string;
  readonly timestamp: string;
}

export interface BeforeToolCallHook {
  (
    context: HookContext,
    input: Record<string, unknown>
  ): Promise<HookResult<Record<string, unknown>>>;
}

export interface AfterToolCallHook {
  (context: HookContext, output: string): Promise<HookResult<string>>;
}

export interface HookResult<T> {
  readonly proceed: boolean;
  readonly value: T;
  readonly message?: string;
}

export interface HookRegistry {
  readonly beforeHooks: ReadonlyMap<string, readonly BeforeToolCallHook[]>;
  readonly afterHooks: ReadonlyMap<string, readonly AfterToolCallHook[]>;
}

// ---------------------------------------------------------------------------
// Session Types (1.7)
// ---------------------------------------------------------------------------

/**
 * A session tracks the state of a research coordination run.
 * Sessions can be paused, resumed, and forked (creating a new
 * session that inherits the parent's state at the fork point).
 */
export interface Session {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly forkPoint: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: "active" | "paused" | "completed" | "forked";
  readonly messages: readonly ConversationMessage[];
  readonly workflowState: WorkflowState;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Options for creating a new session or forking an existing one.
 */
export interface SessionCreateOptions {
  readonly name: string;
  readonly initialQuery?: ResearchQuery;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface SessionForkOptions {
  readonly sourceSessionId: string;
  readonly newName: string;
  readonly forkAtMessage?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Zod Schemas for Runtime Validation
// ---------------------------------------------------------------------------

/**
 * Zod schemas mirror the TypeScript interfaces but provide RUNTIME
 * validation. Used at stage boundaries in workflows (1.4) and in
 * hooks for input validation (1.5).
 */
export const ResearchQuerySchema = z.object({
  topic: z.string().min(1, "Topic must not be empty"),
  depth: z.enum(["shallow", "moderate", "deep"]),
  focusAreas: z.array(z.string()).min(1, "At least one focus area required"),
});

export const SubTaskSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["research", "analysis"]),
  description: z.string().min(10),
  context: z.string(),
  assignedAgent: z.string(),
  dependencies: z.array(z.string()),
});

export const SubTaskResultSchema = z.object({
  taskId: z.string().uuid(),
  agentId: z.string(),
  output: z.string().min(1),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()),
  status: z.enum(["success", "partial", "failed"]),
});

export const DecompositionOutputSchema = z.object({
  subtasks: z.array(SubTaskSchema).min(1),
  reasoning: z.string(),
});

export const ResearchOutputSchema = z.object({
  results: z.array(SubTaskResultSchema).min(1),
});

export const AnalysisOutputSchema = z.object({
  findings: z.array(
    z.object({
      claim: z.string(),
      evidence: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  gaps: z.array(z.string()),
});

export const SynthesisOutputSchema = z.object({
  summary: z.string().min(50),
  keyFindings: z.array(z.string()).min(1),
  recommendations: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const ReviewOutputSchema = z.object({
  approved: z.boolean(),
  feedback: z.string(),
  qualityScore: z.number().min(0).max(1),
  revisionsNeeded: z.array(z.string()),
});
