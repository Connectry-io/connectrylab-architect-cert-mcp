/**
 * Multi-Step Workflow — Schema-Enforced Stage Boundaries
 *
 * Task Statements Covered:
 *   1.4: Implement multi-step workflows with enforcement and handoff patterns
 *   1.6: Design task decomposition strategies for complex workflows
 *
 * What This Teaches:
 *   - Multi-step workflows where each stage has a defined contract
 *   - Zod schemas as programmatic enforcement at stage boundaries
 *   - Handoff patterns — how data flows from one stage to the next
 *   - The difference between prompt chaining (static) and dynamic decomposition
 *   - How "code enforces guardrails" at every transition point
 *
 * Architecture:
 *   The workflow is a linear pipeline of stages:
 *     decomposition → research → analysis → synthesis → review
 *
 *   Each transition validates output against a Zod schema BEFORE allowing
 *   the next stage to begin. If validation fails, the transition is rejected
 *   and the current stage must retry or produce conforming output.
 *
 *   This is "programmatic enforcement" — the model produces output, but
 *   code decides whether that output is acceptable for the next step.
 */

import { z } from "zod";
import type {
  WorkflowState,
  WorkflowStage,
  WorkflowError,
  StageTransition,
} from "./types.js";
import {
  DecompositionOutputSchema,
  ResearchOutputSchema,
  AnalysisOutputSchema,
  SynthesisOutputSchema,
  ReviewOutputSchema,
} from "./types.js";

// ---------------------------------------------------------------------------
// Stage Definitions — Static Pipeline Configuration
// ---------------------------------------------------------------------------

/**
 * The ordered sequence of stages in the workflow pipeline.
 * This is a "prompt chaining" approach (1.6) — the stages are predetermined
 * and execute in a fixed order. Compare this to dynamic decomposition
 * in the coordinator, where the model decides what subtasks to create.
 */
const STAGE_ORDER: readonly WorkflowStage[] = [
  "decomposition",
  "research",
  "analysis",
  "synthesis",
  "review",
];

/**
 * Maps each stage to its output validation schema.
 * When transitioning FROM a stage, its output is validated against
 * the corresponding schema. This is the "enforcement" in 1.4.
 */
const STAGE_SCHEMAS: Readonly<Record<WorkflowStage, z.ZodSchema>> = {
  decomposition: DecompositionOutputSchema,
  research: ResearchOutputSchema,
  analysis: AnalysisOutputSchema,
  synthesis: SynthesisOutputSchema,
  review: ReviewOutputSchema,
};

/**
 * System prompts for each stage. These tell the model what role it plays
 * and what format of output to produce. The schema enforcement ensures
 * the model actually follows these instructions.
 */
const STAGE_PROMPTS: Readonly<Record<WorkflowStage, string>> = {
  decomposition: `You are a research decomposition specialist. Break the given research query
into concrete subtasks. Each subtask should have a clear description, type (research or analysis),
and any dependencies on other subtasks.

Output format: JSON with "subtasks" array and "reasoning" string explaining your decomposition strategy.`,

  research: `You are a research specialist. For each assigned subtask, conduct thorough
research and report your findings. Include confidence levels and cite sources.

Output format: JSON with "results" array, each containing taskId, output, confidence, sources, status.`,

  analysis: `You are a research analyst. Examine the research results and extract key
findings. Identify claims with supporting evidence, assign confidence levels,
and note any gaps in the research.

Output format: JSON with "findings" array (claim, evidence, confidence) and "gaps" array.`,

  synthesis: `You are a synthesis specialist. Combine all analysis findings into a coherent
summary. Produce key findings, actionable recommendations, and an overall confidence score.

Output format: JSON with "summary", "keyFindings" array, "recommendations" array, "confidence".`,

  review: `You are a quality reviewer. Evaluate the synthesis for completeness, accuracy,
and actionability. Decide whether to approve or request revisions.

Output format: JSON with "approved" boolean, "feedback", "qualityScore", "revisionsNeeded" array.`,
};

// ---------------------------------------------------------------------------
// Workflow State Management
// ---------------------------------------------------------------------------

/**
 * Creates an initial workflow state. Every workflow starts at decomposition.
 */
export function createWorkflowState(): WorkflowState {
  return {
    currentStage: "decomposition",
    completedStages: [],
    stageData: {},
    errors: [],
  };
}

/**
 * Gets the index of a stage in the pipeline.
 */
function getStageIndex(stage: WorkflowStage): number {
  return STAGE_ORDER.indexOf(stage);
}

/**
 * Gets the next stage in the pipeline, or null if at the end.
 */
export function getNextStage(
  currentStage: WorkflowStage
): WorkflowStage | null {
  const currentIndex = getStageIndex(currentStage);
  const nextIndex = currentIndex + 1;
  return nextIndex < STAGE_ORDER.length ? STAGE_ORDER[nextIndex]! : null;
}

/**
 * Gets the system prompt for a given stage.
 */
export function getStagePrompt(stage: WorkflowStage): string {
  return STAGE_PROMPTS[stage];
}

/**
 * Checks whether a stage transition is valid. Transitions must follow
 * the pipeline order — you can't skip stages or go backwards.
 *
 * KEY CONCEPT (1.4): This is "programmatic enforcement". The model
 * might want to jump ahead, but the code prevents it. The pipeline
 * order is a guardrail that ensures thorough processing.
 */
export function isValidTransition(
  from: WorkflowStage,
  to: WorkflowStage
): boolean {
  const fromIndex = getStageIndex(from);
  const toIndex = getStageIndex(to);
  // Must go to the immediately next stage
  return toIndex === fromIndex + 1;
}

// ---------------------------------------------------------------------------
// Stage Transition — Validation and Handoff
// ---------------------------------------------------------------------------

/**
 * Result of attempting a stage transition. Either succeeds with the new
 * workflow state, or fails with validation errors.
 */
export type TransitionResult =
  | { readonly success: true; readonly state: WorkflowState; readonly transition: StageTransition }
  | { readonly success: false; readonly errors: readonly string[] };

/**
 * Attempts to transition the workflow from the current stage to the next.
 * Validates the stage output against its Zod schema before allowing the
 * transition. If validation fails, the transition is rejected.
 *
 * KEY CONCEPT (1.4): This is the core of the enforcement pattern.
 *   1. The model produces output (whatever it wants)
 *   2. Code validates that output against a strict schema
 *   3. If valid: transition to next stage with validated data
 *   4. If invalid: reject and require the model to retry
 *
 * The model drives the work, but code enforces the contract at each boundary.
 *
 * @param state - Current workflow state
 * @param stageOutput - Raw output from the current stage (will be validated)
 * @returns TransitionResult indicating success or failure with errors
 */
export function attemptTransition(
  state: WorkflowState,
  stageOutput: unknown
): TransitionResult {
  const currentStage = state.currentStage;
  const nextStage = getNextStage(currentStage);

  // Check if workflow is already complete
  if (nextStage === null) {
    return {
      success: false,
      errors: [`Workflow is at the final stage (${currentStage}), no transition possible`],
    };
  }

  // Validate output against the current stage's schema
  const schema = STAGE_SCHEMAS[currentStage];
  const validation = schema.safeParse(stageOutput);

  if (!validation.success) {
    const zodErrors = validation.error.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );

    const errorEntry: WorkflowError = {
      stage: currentStage,
      message: `Validation failed: ${zodErrors.join("; ")}`,
      timestamp: new Date().toISOString(),
    };

    // Return failure — the state is NOT modified on the original,
    // but we return what the error state WOULD look like
    return {
      success: false,
      errors: zodErrors,
    };
  }

  // Validation passed — create the transition
  const now = new Date().toISOString();
  const transition: StageTransition = {
    from: currentStage,
    to: nextStage,
    validatedData: validation.data,
    timestamp: now,
  };

  // Build new state with the transition applied (immutable)
  const newState: WorkflowState = {
    currentStage: nextStage,
    completedStages: [...state.completedStages, currentStage],
    stageData: {
      ...state.stageData,
      [currentStage]: validation.data,
    },
    errors: state.errors,
  };

  return {
    success: true,
    state: newState,
    transition,
  };
}

// ---------------------------------------------------------------------------
// Workflow Execution — Running Through All Stages
// ---------------------------------------------------------------------------

/**
 * A stage executor function. Given the current state and context from
 * previous stages, produces output for the current stage.
 *
 * In practice, this calls the Claude API with the stage prompt and
 * context. Here we define the interface; the coordinator uses it.
 */
export type StageExecutor = (
  stage: WorkflowStage,
  prompt: string,
  previousData: Readonly<Record<string, unknown>>
) => Promise<unknown>;

/**
 * Runs the complete workflow pipeline from the current stage to completion.
 * At each stage boundary, validates output and transitions to the next.
 *
 * KEY CONCEPT (1.4 + 1.6): This function demonstrates both:
 *   - Multi-step enforcement: validation at every boundary
 *   - Prompt chaining: stages run in a fixed order
 *
 * If any stage fails validation, the executor is called again (up to
 * maxRetries times). This gives the model a chance to correct its output.
 *
 * @param initialState - Workflow state to start from
 * @param executor - Function that produces output for each stage
 * @param maxRetries - Max retries per stage on validation failure
 * @returns Final workflow state with all stage data
 */
export async function executeWorkflow(
  initialState: WorkflowState,
  executor: StageExecutor,
  maxRetries: number = 2
): Promise<WorkflowState> {
  let currentState = initialState;

  while (getNextStage(currentState.currentStage) !== null) {
    const stage = currentState.currentStage;
    const prompt = getStagePrompt(stage);
    let retries = 0;
    let transitioned = false;

    while (retries <= maxRetries && !transitioned) {
      // Call the executor to produce stage output
      const output = await executor(stage, prompt, currentState.stageData);

      // Attempt transition with validation
      const result = attemptTransition(currentState, output);

      if (result.success) {
        currentState = result.state;
        transitioned = true;
        console.log(
          `[WORKFLOW] Stage "${stage}" completed, transitioning to "${currentState.currentStage}"`
        );
      } else {
        retries++;
        console.warn(
          `[WORKFLOW] Stage "${stage}" validation failed (attempt ${retries}/${maxRetries + 1}):`,
          result.errors
        );

        if (retries > maxRetries) {
          // Record the error and stop the workflow
          const errorEntry: WorkflowError = {
            stage,
            message: `Failed after ${maxRetries + 1} attempts: ${result.errors.join("; ")}`,
            timestamp: new Date().toISOString(),
          };
          currentState = {
            ...currentState,
            errors: [...currentState.errors, errorEntry],
          };
          throw new Error(
            `Workflow halted at stage "${stage}": validation failed after ${maxRetries + 1} attempts`
          );
        }
      }
    }
  }

  // Process the final stage (review) — validate but don't transition
  const finalStage = currentState.currentStage;
  const finalPrompt = getStagePrompt(finalStage);
  const finalOutput = await executor(
    finalStage,
    finalPrompt,
    currentState.stageData
  );

  const schema = STAGE_SCHEMAS[finalStage];
  const validation = schema.safeParse(finalOutput);

  if (validation.success) {
    currentState = {
      ...currentState,
      completedStages: [...currentState.completedStages, finalStage],
      stageData: {
        ...currentState.stageData,
        [finalStage]: validation.data,
      },
    };
  }

  return currentState;
}

// ---------------------------------------------------------------------------
// Workflow Visualization — For Debugging and Learning
// ---------------------------------------------------------------------------

/**
 * Produces a human-readable summary of the workflow state.
 * Useful for debugging and for showing the user what stage the
 * research is at.
 */
export function formatWorkflowState(state: WorkflowState): string {
  const lines: string[] = [
    "=== Workflow Status ===",
    "",
  ];

  for (const stage of STAGE_ORDER) {
    const isCompleted = state.completedStages.includes(stage);
    const isCurrent = state.currentStage === stage;
    const marker = isCompleted ? "[x]" : isCurrent ? "[>]" : "[ ]";
    const stageErrors = state.errors.filter((e) => e.stage === stage);

    lines.push(`  ${marker} ${stage}`);

    if (stageErrors.length > 0) {
      for (const err of stageErrors) {
        lines.push(`      ERROR: ${err.message}`);
      }
    }
  }

  lines.push("");
  lines.push(
    `Completed: ${state.completedStages.length}/${STAGE_ORDER.length}`
  );
  lines.push(`Errors: ${state.errors.length}`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Task Decomposition Strategies (1.6)
// ---------------------------------------------------------------------------

/**
 * Static decomposition — predetermined subtask structure.
 * The decomposition is the same regardless of the query.
 * Simple and predictable, good for well-understood problem domains.
 *
 * KEY CONCEPT (1.6): This is "prompt chaining" — the tasks are fixed.
 * Contrast with dynamic decomposition in the coordinator where the
 * model decides what subtasks to create.
 */
export function staticDecomposition(
  topic: string
): readonly { readonly type: string; readonly focus: string }[] {
  return [
    { type: "research", focus: `Background and history of ${topic}` },
    { type: "research", focus: `Current state and recent developments in ${topic}` },
    { type: "research", focus: `Key challenges and open problems in ${topic}` },
    { type: "analysis", focus: `Comparative analysis of approaches to ${topic}` },
    { type: "analysis", focus: `Future outlook and recommendations for ${topic}` },
  ];
}

/**
 * Dynamic decomposition prompt — the model decides the subtasks.
 * Returns a system prompt that instructs the model to analyze the
 * query and produce a custom decomposition.
 *
 * KEY CONCEPT (1.6): This is "dynamic decomposition" — the model
 * examines the query and decides how to break it down. More flexible
 * but less predictable than static decomposition.
 */
export function dynamicDecompositionPrompt(
  topic: string,
  focusAreas: readonly string[]
): string {
  return `Analyze this research topic and decompose it into 3-7 concrete subtasks.

Topic: ${topic}
Focus Areas: ${focusAreas.join(", ")}

Consider:
- What background research is needed?
- What specific aspects require deep investigation?
- What comparisons or analyses would be most valuable?
- Are there dependencies between subtasks?

Produce a JSON object with:
- "subtasks": array of { id (UUID), type ("research"|"analysis"), description, context, assignedAgent, dependencies (array of task IDs) }
- "reasoning": string explaining your decomposition strategy`;
}
