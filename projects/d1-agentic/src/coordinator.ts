/**
 * Coordinator — Multi-Agent Research Orchestrator
 *
 * Task Statements Covered:
 *   1.1: Design and implement agentic loops for autonomous task execution
 *   1.2: Orchestrate multi-agent systems with coordinator-subagent patterns
 *   1.6: Design task decomposition strategies for complex workflows
 *
 * What This Teaches:
 *   - The coordinator pattern (hub-and-spoke): one orchestrator dispatches
 *     tasks to specialized subagents and aggregates their results
 *   - The agentic loop: while(stop_reason !== "end_turn") { execute tools }
 *   - Task decomposition: breaking a complex query into smaller subtasks
 *   - How the coordinator manages the overall workflow while subagents
 *     handle individual tasks in isolation
 *
 * Mental Model: "The model drives decisions, code enforces guardrails"
 *   - The MODEL decides how to decompose the research query
 *   - The CODE enforces that each subtask has a valid schema, that results
 *     are validated, and that the workflow progresses correctly
 *
 * Architecture:
 *   ┌──────────────────────────────┐
 *   │       COORDINATOR            │
 *   │  (agentic loop, dispatch,    │
 *   │   aggregation, workflow)     │
 *   └──────┬────────────┬─────────┘
 *          │            │
 *   ┌──────▼──────┐ ┌──▼───────────┐
 *   │ RESEARCHER  │ │  ANALYZER    │
 *   │ (scoped     │ │ (scoped      │
 *   │  tools,     │ │  tools,      │
 *   │  isolated   │ │  handoff     │
 *   │  context)   │ │  pattern)    │
 *   └─────────────┘ └──────────────┘
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx src/coordinator.ts
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ResearchQuery,
  SubTask,
  SubTaskResult,
  CoordinatorResult,
  ToolDefinition,
  ConversationMessage,
  ToolCall,
} from "./types.js";
import { ResearchQuerySchema, SubTaskSchema } from "./types.js";
import { runResearchSubagent } from "./subagents/researcher.js";
import { runAnalysisSubagent } from "./subagents/analyzer.js";
import { createDefaultHookRegistry } from "./hooks.js";
import {
  createWorkflowState,
  attemptTransition,
  executeWorkflow,
  formatWorkflowState,
  dynamicDecompositionPrompt,
} from "./workflow.js";
import {
  createSessionStore,
  createSession,
  addMessage,
  updateWorkflowState,
  pauseSession,
  resumeSession,
  forkSession,
  completeSession,
  createSessionSummary,
} from "./session.js";
import type { HookRegistry } from "./types.js";

// ---------------------------------------------------------------------------
// Coordinator Tools — Available Only to the Coordinator
// ---------------------------------------------------------------------------

/**
 * The coordinator's tools are meta-level: they dispatch work to subagents
 * and manage the workflow. The coordinator does NOT have research or
 * analysis tools — those belong to the subagents.
 *
 * KEY CONCEPT (1.2): The coordinator orchestrates; subagents execute.
 * This separation ensures the coordinator stays focused on the big picture
 * while subagents handle the details.
 */
const COORDINATOR_TOOLS: readonly ToolDefinition[] = [
  {
    name: "decompose_query",
    description:
      "Break a research query into subtasks. Returns a list of subtasks with types, descriptions, and dependencies.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The research topic to decompose",
        },
        depth: {
          type: "string",
          description: "Research depth: shallow, moderate, or deep",
        },
        focus_areas: {
          type: "array",
          description: "Specific areas to focus on",
        },
      },
      required: ["topic", "depth", "focus_areas"],
    },
  },
  {
    name: "dispatch_research",
    description:
      "Dispatch a research subtask to a researcher subagent. The subagent will execute independently and return results.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "ID of the subtask to dispatch",
        },
        task_description: {
          type: "string",
          description: "Description of the research task",
        },
        context: {
          type: "string",
          description: "Context to pass to the researcher",
        },
      },
      required: ["task_id", "task_description", "context"],
    },
  },
  {
    name: "dispatch_analysis",
    description:
      "Dispatch an analysis subtask to an analyzer subagent. Pass research results for the analyzer to process.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "ID of the analysis subtask",
        },
        task_description: {
          type: "string",
          description: "Description of the analysis task",
        },
        research_results: {
          type: "array",
          description: "Research results to analyze",
        },
      },
      required: ["task_id", "task_description"],
    },
  },
  {
    name: "synthesize_results",
    description:
      "Combine all subagent results into a final research report.",
    input_schema: {
      type: "object",
      properties: {
        results: {
          type: "array",
          description: "All collected results from subagents",
        },
        original_query: {
          type: "string",
          description: "The original research query for context",
        },
      },
      required: ["results", "original_query"],
    },
  },
];

// ---------------------------------------------------------------------------
// Coordinator Tool Execution
// ---------------------------------------------------------------------------

/**
 * Executes a coordinator-level tool call. These tools dispatch work to
 * subagents rather than performing work directly.
 *
 * KEY CONCEPT (1.2): When the coordinator calls "dispatch_research",
 * it spawns a new subagent (researcher) with:
 *   - Isolated context (only the task description and context)
 *   - Scoped tools (only research tools)
 *   - Its own agentic loop
 *
 * The coordinator waits for the subagent to finish, then continues.
 */
async function executeCoordinatorTool(
  client: Anthropic,
  toolCall: ToolCall,
  hookRegistry: HookRegistry,
  collectedResults: SubTaskResult[]
): Promise<string> {
  const input = toolCall.input;

  switch (toolCall.name) {
    case "decompose_query": {
      // The model decided how to decompose — we validate the request
      const topic = input["topic"] as string;
      const depth = input["depth"] as string;
      const focusAreas = input["focus_areas"] as string[];

      console.log(`[COORDINATOR] Decomposing query: "${topic}" (depth: ${depth})`);

      // Generate dynamic decomposition prompt for the model
      const prompt = dynamicDecompositionPrompt(topic, focusAreas);
      return JSON.stringify({
        status: "decomposed",
        prompt,
        suggestedSubtasks: focusAreas.map((area, i) => ({
          id: crypto.randomUUID(),
          type: i < Math.ceil(focusAreas.length * 0.6) ? "research" : "analysis",
          description: `Investigate: ${area}`,
          context: `Part of research on "${topic}" at ${depth} depth`,
          assignedAgent: i < Math.ceil(focusAreas.length * 0.6) ? "researcher" : "analyzer",
          dependencies: [],
        })),
      });
    }

    case "dispatch_research": {
      const taskId = (input["task_id"] as string) ?? crypto.randomUUID();
      const description = input["task_description"] as string;
      const context = (input["context"] as string) ?? "";

      console.log(`[COORDINATOR] Dispatching research: ${description}`);

      const subtask: SubTask = {
        id: taskId,
        type: "research",
        description,
        context,
        assignedAgent: "researcher",
        dependencies: [],
      };

      // Spawn research subagent (1.3) — isolated context, scoped tools
      const result = await runResearchSubagent(
        client,
        subtask,
        hookRegistry,
        context
      );

      collectedResults.push(result);
      return JSON.stringify(result);
    }

    case "dispatch_analysis": {
      const taskId = (input["task_id"] as string) ?? crypto.randomUUID();
      const description = input["task_description"] as string;

      console.log(`[COORDINATOR] Dispatching analysis: ${description}`);

      const subtask: SubTask = {
        id: taskId,
        type: "analysis",
        description,
        context: `Analyzing ${collectedResults.length} research results`,
        assignedAgent: "analyzer",
        dependencies: [],
      };

      // Pass collected research results to the analyzer (1.4 handoff)
      const result = await runAnalysisSubagent(
        client,
        subtask,
        collectedResults,
        hookRegistry
      );

      collectedResults.push(result);
      return JSON.stringify(result);
    }

    case "synthesize_results": {
      const originalQuery = input["original_query"] as string;

      console.log(`[COORDINATOR] Synthesizing ${collectedResults.length} results`);

      const synthesis = {
        query: originalQuery,
        totalResults: collectedResults.length,
        successfulResults: collectedResults.filter((r) => r.status === "success").length,
        averageConfidence:
          collectedResults.length > 0
            ? collectedResults.reduce((sum, r) => sum + r.confidence, 0) /
              collectedResults.length
            : 0,
        allSources: [
          ...new Set(collectedResults.flatMap((r) => [...r.sources])),
        ],
        combinedOutput: collectedResults
          .map((r) => `[${r.agentId}] ${r.output}`)
          .join("\n\n"),
      };

      return JSON.stringify(synthesis);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
  }
}

// ---------------------------------------------------------------------------
// Coordinator Agentic Loop
// ---------------------------------------------------------------------------

/**
 * The coordinator's system prompt. Defines its role as an orchestrator
 * and explains the available tools.
 */
const COORDINATOR_SYSTEM_PROMPT = `You are a research coordinator agent. Your job is to orchestrate a team of
specialized subagents to answer complex research queries.

Your workflow:
1. Use decompose_query to break the research topic into subtasks
2. Use dispatch_research for each research subtask (these run independently)
3. Use dispatch_analysis to analyze the collected research results
4. Use synthesize_results to combine everything into a final report

IMPORTANT:
- You orchestrate; you do NOT do research yourself
- Each subagent has its own tools and isolated context
- You decide WHAT to research and WHEN to analyze, the subagents decide HOW

When you have a complete synthesis, present the final report to the user.`;

/**
 * Runs the main coordinator agentic loop.
 *
 * KEY CONCEPT (1.1): The agentic loop pattern:
 *   while (true) {
 *     response = call Claude API
 *     if (stop_reason === "end_turn") → done, return result
 *     if (stop_reason === "tool_use") → execute tools, add results, continue
 *   }
 *
 * This is the fundamental pattern of agentic systems. The model decides
 * what to do next (which tool to call, or to stop), and the code executes
 * the tool and feeds the result back. The loop continues until the model
 * decides it's done.
 *
 * The coordinator's loop dispatches to subagents, which run their own
 * internal loops. This creates a hierarchy of agentic loops:
 *   Coordinator loop → dispatches → Researcher loop → returns → Coordinator continues
 */
export async function runCoordinator(
  client: Anthropic,
  query: ResearchQuery,
  hookRegistry: HookRegistry
): Promise<CoordinatorResult> {
  // Validate the input query using Zod schema (guardrail)
  const validatedQuery = ResearchQuerySchema.parse(query);

  console.log(`[COORDINATOR] Starting research on: "${validatedQuery.topic}"`);
  console.log(`[COORDINATOR] Depth: ${validatedQuery.depth}`);
  console.log(`[COORDINATOR] Focus areas: ${validatedQuery.focusAreas.join(", ")}`);

  // Initialize session (1.7)
  let sessionStore = createSessionStore();
  const [storeWithSession, session] = createSession(sessionStore, {
    name: `Research: ${validatedQuery.topic}`,
    initialQuery: validatedQuery,
    metadata: { startedAt: new Date().toISOString() },
  });
  sessionStore = storeWithSession;

  // Initialize workflow state (1.4)
  const initialWorkflowState = createWorkflowState();
  sessionStore = updateWorkflowState(
    sessionStore,
    session.id,
    initialWorkflowState
  );

  // Build the initial user message
  const userMessage = [
    `Research this topic: ${validatedQuery.topic}`,
    `Depth: ${validatedQuery.depth}`,
    `Focus areas: ${validatedQuery.focusAreas.join(", ")}`,
    "",
    "Please decompose this into subtasks, dispatch them to your subagents,",
    "and synthesize the results into a comprehensive report.",
  ].join("\n");

  // Conversation history for the coordinator's loop
  const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [
    { role: "user", content: userMessage },
  ];

  // Track session messages (1.7)
  sessionStore = addMessage(sessionStore, session.id, {
    role: "user",
    content: userMessage,
  });

  const collectedResults: SubTaskResult[] = [];
  const subtasks: SubTask[] = [];
  let iterations = 0;
  const maxIterations = 15;

  // ===== THE AGENTIC LOOP (1.1) =====
  // This is the core pattern. The model decides what to do, code executes it.
  while (iterations < maxIterations) {
    iterations++;
    console.log(`\n[COORDINATOR] === Iteration ${iterations} ===`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: COORDINATOR_SYSTEM_PROMPT,
      tools: COORDINATOR_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool["input_schema"],
      })),
      messages: messages as Anthropic.MessageParam[],
    });

    // ----- CHECK STOP REASON -----
    // This is the decision point in every agentic loop iteration.

    if (response.stop_reason === "end_turn") {
      // Model is done — extract final response
      const textBlock = response.content.find((b) => b.type === "text");
      const finalText = textBlock && "text" in textBlock ? textBlock.text : "";

      console.log(`[COORDINATOR] Completed in ${iterations} iterations`);

      // Record in session (1.7)
      sessionStore = addMessage(sessionStore, session.id, {
        role: "assistant",
        content: finalText,
      });
      sessionStore = completeSession(sessionStore, session.id);

      console.log("\n" + createSessionSummary(
        sessionStore.get(session.id)!
      ));

      return {
        query: validatedQuery,
        subtasks,
        results: collectedResults,
        synthesis: finalText,
        totalIterations: iterations,
      };
    }

    if (response.stop_reason === "tool_use") {
      // Model wants to use tools — execute them and feed results back
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }> = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const toolCall: ToolCall = {
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          };

          console.log(`[COORDINATOR] Tool call: ${toolCall.name}`);

          // Execute the tool (may spawn subagents)
          const result = await executeCoordinatorTool(
            client,
            toolCall,
            hookRegistry,
            collectedResults
          );

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }
  }

  // Max iterations reached
  console.warn(`[COORDINATOR] Hit max iterations (${maxIterations})`);
  sessionStore = completeSession(sessionStore, session.id);

  return {
    query: validatedQuery,
    subtasks,
    results: collectedResults,
    synthesis: "Research incomplete — coordinator hit max iterations",
    totalIterations: iterations,
  };
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

/**
 * Demonstrates the full multi-agent research coordinator.
 *
 * To run:
 *   ANTHROPIC_API_KEY=sk-... npx tsx src/coordinator.ts
 *
 * This will:
 *   1. Create a research query
 *   2. Initialize the hook registry (1.5)
 *   3. Run the coordinator's agentic loop (1.1)
 *   4. The coordinator decomposes the query (1.6)
 *   5. Dispatches to researcher subagents (1.2, 1.3)
 *   6. Dispatches to analyzer subagents (1.3, 1.4)
 *   7. Synthesizes results through the workflow (1.4)
 *   8. Manages session state throughout (1.7)
 */
async function main(): Promise<void> {
  // Validate environment
  if (!process.env["ANTHROPIC_API_KEY"]) {
    console.error("ERROR: ANTHROPIC_API_KEY environment variable is required");
    console.error("Usage: ANTHROPIC_API_KEY=sk-... npx tsx src/coordinator.ts");
    process.exit(1);
  }

  const client = new Anthropic();

  // Initialize hook registry (1.5)
  const hookRegistry = createDefaultHookRegistry();

  // Define the research query
  const query: ResearchQuery = {
    topic: "Best practices for building production agentic systems with Claude",
    depth: "moderate",
    focusAreas: [
      "Agentic loop design patterns",
      "Multi-agent coordination strategies",
      "Error handling and recovery in agent systems",
      "Session management and state persistence",
    ],
  };

  console.log("=== Multi-Agent Research Coordinator ===");
  console.log(`Topic: ${query.topic}`);
  console.log(`Depth: ${query.depth}`);
  console.log(`Focus Areas: ${query.focusAreas.join(", ")}`);
  console.log("");

  try {
    const result = await runCoordinator(client, query, hookRegistry);

    console.log("\n=== FINAL REPORT ===");
    console.log(`Query: ${result.query.topic}`);
    console.log(`Subtasks: ${result.subtasks.length}`);
    console.log(`Results: ${result.results.length}`);
    console.log(`Total Iterations: ${result.totalIterations}`);
    console.log("\n--- Synthesis ---");
    console.log(result.synthesis);
  } catch (error) {
    console.error("Coordinator failed:", error);
    process.exit(1);
  }
}

// Run if this is the entry point
main().catch(console.error);
