/**
 * Research Subagent — Isolated Context and Scoped Tools
 *
 * Task Statements Covered:
 *   1.3: Configure subagent invocation, context passing, and spawning
 *   1.1: Design and implement agentic loops (subagent runs its own loop)
 *
 * What This Teaches:
 *   - How to spawn a subagent with a SCOPED set of tools (not all tools)
 *   - Explicit context passing — the subagent receives only what it needs
 *   - Isolated context — the subagent has no access to the coordinator's
 *     full conversation history or other subagents' state
 *   - The subagent runs its own agentic loop independently
 *
 * Key Concepts:
 *   In the Claude Agent SDK, subagents are spawned via the Task tool.
 *   Each subagent gets:
 *     - Its own system prompt (defining its role)
 *     - A scoped set of tools (not the coordinator's full toolset)
 *     - Explicit context (passed as the user message)
 *     - Its own conversation history (isolated from parent)
 *
 *   The coordinator does NOT share its full conversation with the subagent.
 *   Instead, it crafts a focused context message with exactly what the
 *   subagent needs to complete its task. This is both a performance
 *   optimization (smaller context = faster, cheaper) and a safety measure
 *   (subagent can't see sensitive data from other tasks).
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ToolDefinition,
  ToolResult,
  SubTask,
  SubTaskResult,
  AgentLoopConfig,
  ConversationMessage,
} from "../types.js";
import { runBeforeHooks, runAfterHooks } from "../hooks.js";
import type { HookRegistry, HookContext } from "../types.js";

// ---------------------------------------------------------------------------
// Research Tools — Scoped to This Subagent Only
// ---------------------------------------------------------------------------

/**
 * The researcher's scoped tool set. These are the ONLY tools available
 * to this subagent. The coordinator has different tools; other subagents
 * have their own scoped sets.
 *
 * KEY CONCEPT (1.3): Scoped tools are a guardrail. The research subagent
 * can search for information and take notes, but it CANNOT dispatch tasks
 * to other agents or modify the workflow state. This prevents accidental
 * interference between agents.
 */
const RESEARCH_TOOLS: readonly ToolDefinition[] = [
  {
    name: "web_search",
    description:
      "Search the web for information on a topic. Returns relevant snippets and URLs.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results (1-10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_document",
    description:
      "Read a document or web page and extract its text content.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL or document identifier to read",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "take_notes",
    description:
      "Record a research finding with a confidence score and source attribution.",
    input_schema: {
      type: "object",
      properties: {
        finding: {
          type: "string",
          description: "The research finding to record",
        },
        confidence: {
          type: "number",
          description: "Confidence score 0-1",
        },
        source: {
          type: "string",
          description: "Source URL or reference",
        },
      },
      required: ["finding", "confidence", "source"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Executor — Simulated for Demo
// ---------------------------------------------------------------------------

/**
 * Executes a research tool call. In production, these would call real
 * APIs (search engines, document readers, etc.). Here they return
 * simulated results for demonstration purposes.
 *
 * The executor receives the tool name and input, and returns a string
 * result. Hooks intercept before and after execution.
 */
async function executeResearchTool(
  toolName: string,
  input: Record<string, unknown>,
  hookRegistry: HookRegistry,
  hookContext: HookContext
): Promise<ToolResult> {
  // Run before hooks (validation, sanitization)
  const beforeResult = await runBeforeHooks(hookRegistry, hookContext, input);
  if (!beforeResult.proceed) {
    return {
      tool_use_id: hookContext.timestamp,
      content: `Tool call blocked: ${beforeResult.message}`,
      is_error: true,
    };
  }

  const validatedInput = beforeResult.value;
  let rawOutput: string;

  // Simulated tool execution
  switch (toolName) {
    case "web_search": {
      const query = validatedInput["query"] as string;
      rawOutput = JSON.stringify({
        results: [
          {
            title: `Research result for: ${query}`,
            snippet: `Comprehensive findings about ${query} from academic sources...`,
            url: `https://example.com/research/${encodeURIComponent(query)}`,
          },
          {
            title: `${query} — Recent Developments`,
            snippet: `Latest developments in ${query} indicate significant progress...`,
            url: `https://example.com/news/${encodeURIComponent(query)}`,
          },
        ],
      });
      break;
    }
    case "read_document": {
      const url = validatedInput["url"] as string;
      rawOutput = JSON.stringify({
        content: `Document content from ${url}: This is a detailed exploration of the topic...`,
        wordCount: 1500,
        lastUpdated: new Date().toISOString(),
      });
      break;
    }
    case "take_notes": {
      rawOutput = JSON.stringify({
        recorded: true,
        finding: validatedInput["finding"],
        confidence: validatedInput["confidence"],
        source: validatedInput["source"],
      });
      break;
    }
    default:
      rawOutput = JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }

  // Run after hooks (normalization, logging)
  const afterResult = await runAfterHooks(
    hookRegistry,
    hookContext,
    rawOutput
  );

  return {
    tool_use_id: hookContext.timestamp,
    content: afterResult.value,
    is_error: false,
  };
}

// ---------------------------------------------------------------------------
// Research Subagent — Agentic Loop with Scoped Context
// ---------------------------------------------------------------------------

/**
 * Creates the system prompt for the research subagent.
 * The system prompt defines the agent's role and constraints.
 */
function createResearcherSystemPrompt(task: SubTask): string {
  return `You are a focused research agent. Your job is to investigate a specific topic and report your findings.

TASK: ${task.description}

CONTEXT: ${task.context}

INSTRUCTIONS:
1. Use web_search to find relevant information
2. Use read_document to get detailed content from promising sources
3. Use take_notes to record each significant finding with a confidence score
4. When you have gathered enough information (at least 3 findings), synthesize your results
5. Report your findings as a JSON object with: output (string summary), confidence (0-1), sources (array of URLs)

Be thorough but focused. Only research what is relevant to your assigned task.
Do not attempt to coordinate with other agents or modify the overall workflow.`;
}

/**
 * Prepares the explicit context message for the subagent.
 *
 * KEY CONCEPT (1.3): Context passing is EXPLICIT. The coordinator crafts
 * a specific message containing only what the subagent needs. The subagent
 * does NOT receive the coordinator's full conversation history.
 *
 * What gets passed:
 *   - The task description and context
 *   - Any relevant data from prior stages
 *   - Constraints and expectations
 *
 * What does NOT get passed:
 *   - Other subagents' results
 *   - The coordinator's internal reasoning
 *   - The user's original query (unless relevant)
 *   - Other sessions' data
 */
function prepareSubagentContext(
  task: SubTask,
  additionalContext?: string
): string {
  const parts = [
    `Research Task: ${task.description}`,
    "",
    `Background Context:`,
    task.context,
  ];

  if (additionalContext) {
    parts.push("", "Additional Context from Coordinator:", additionalContext);
  }

  parts.push(
    "",
    "Please begin your research. Use the available tools to gather information,",
    "then provide a comprehensive summary of your findings."
  );

  return parts.join("\n");
}

/**
 * Runs the research subagent. This is the main entry point called by
 * the coordinator to dispatch a research task.
 *
 * The subagent:
 *   1. Receives scoped tools (RESEARCH_TOOLS only)
 *   2. Receives explicit context (not the full coordinator state)
 *   3. Runs its own agentic loop (while stop_reason !== "end_turn")
 *   4. Returns a SubTaskResult to the coordinator
 *
 * KEY CONCEPT (1.3): The subagent is fully isolated. It has its own
 * conversation history, its own tools, and its own system prompt.
 * The coordinator spawns it, waits for its result, and aggregates.
 */
export async function runResearchSubagent(
  client: Anthropic,
  task: SubTask,
  hookRegistry: HookRegistry,
  additionalContext?: string
): Promise<SubTaskResult> {
  const systemPrompt = createResearcherSystemPrompt(task);
  const userMessage = prepareSubagentContext(task, additionalContext);
  const agentId = `researcher-${task.id.slice(0, 8)}`;

  console.log(`[RESEARCHER:${agentId}] Starting research: ${task.description}`);

  // The subagent's own conversation history — isolated from coordinator
  const messages: ConversationMessage[] = [
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  const maxIterations = 10;
  const collectedSources: string[] = [];

  // Agentic loop (1.1) — the subagent keeps running until it's done
  while (iterations < maxIterations) {
    iterations++;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: RESEARCH_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool["input_schema"],
      })),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content as string,
      })),
    });

    // Check stop_reason to determine if loop continues
    if (response.stop_reason === "end_turn") {
      // Agent has finished — extract the final text response
      const textBlock = response.content.find((b) => b.type === "text");
      const finalText = textBlock && "text" in textBlock ? textBlock.text : "";

      console.log(
        `[RESEARCHER:${agentId}] Completed in ${iterations} iterations`
      );

      // Parse the agent's final output to extract structured result
      return parseResearcherOutput(task.id, agentId, finalText, collectedSources);
    }

    if (response.stop_reason === "tool_use") {
      // Agent wants to use a tool — execute it and return the result
      const assistantContent = response.content;
      messages.push({
        role: "assistant",
        content: assistantContent as unknown as string,
      });

      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
        is_error: boolean;
      }> = [];

      for (const block of assistantContent) {
        if (block.type === "tool_use") {
          const hookContext: HookContext = {
            toolName: block.name,
            agentId,
            sessionId: task.id,
            timestamp: new Date().toISOString(),
          };

          const result = await executeResearchTool(
            block.name,
            block.input as Record<string, unknown>,
            hookRegistry,
            hookContext
          );

          // Track sources from search results
          if (block.name === "web_search" || block.name === "read_document") {
            const url = (block.input as Record<string, unknown>)["url"];
            if (typeof url === "string") {
              collectedSources.push(url);
            }
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result.content,
            is_error: result.is_error,
          });
        }
      }

      messages.push({
        role: "user",
        content: toolResults as unknown as string,
      });
    }
  }

  // Max iterations reached — return partial result
  console.warn(`[RESEARCHER:${agentId}] Hit max iterations (${maxIterations})`);
  return {
    taskId: task.id,
    agentId,
    output: "Research incomplete — max iterations reached",
    confidence: 0.3,
    sources: collectedSources,
    status: "partial",
  };
}

/**
 * Parses the researcher's natural language output into a structured result.
 * Attempts to extract JSON if present, otherwise wraps the text.
 */
function parseResearcherOutput(
  taskId: string,
  agentId: string,
  rawOutput: string,
  collectedSources: readonly string[]
): SubTaskResult {
  // Try to parse as JSON first
  try {
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        output?: string;
        confidence?: number;
        sources?: string[];
      };
      return {
        taskId,
        agentId,
        output: parsed.output ?? rawOutput,
        confidence: parsed.confidence ?? 0.7,
        sources: parsed.sources ?? [...collectedSources],
        status: "success",
      };
    }
  } catch {
    // JSON parsing failed — use raw text
  }

  return {
    taskId,
    agentId,
    output: rawOutput,
    confidence: 0.6,
    sources: [...collectedSources],
    status: "success",
  };
}

/**
 * Returns the tool definitions available to the researcher.
 * Used by the coordinator to understand what capabilities each
 * subagent type has.
 */
export function getResearcherTools(): readonly ToolDefinition[] {
  return RESEARCH_TOOLS;
}
