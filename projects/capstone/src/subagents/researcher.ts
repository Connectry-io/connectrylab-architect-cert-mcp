/**
 * Researcher Subagent — Knowledge Base Research
 *
 * Task Statements Covered:
 *   D1: 1.3 — Scoped subagent with read-only tools (least privilege)
 *   D2: 2.3 — Uses MCP tools to access knowledge base
 *   D5: 5.6 — Attaches provenance to every finding
 *
 * The researcher receives a research task from the coordinator and uses
 * the knowledge base tools to find relevant articles. It synthesizes
 * findings and tracks provenance so every piece of information in the
 * final response can be traced back to its source.
 *
 * Principle: This agent has READ-ONLY access. It cannot modify tickets,
 * update statuses, or perform any write operations. This is enforced
 * by only providing search/read tools.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentResult,
  ResearchResult,
  Ticket,
  TicketAnalysis,
  KnowledgeArticle,
  ProvenanceEntry,
} from "../types.js";
import {
  handleSearchKnowledgeBase,
  handleGetArticle,
} from "../tools/knowledge-tools.js";
import {
  successResult,
  failedResult,
  partialResult,
  buildMetadata,
  apiError,
  parseError,
} from "../context/error-propagation.js";
import {
  fromKnowledgeBase,
  fromTicketHistory,
  mergeProvenance,
} from "../context/provenance.js";
import { ResearchSummarySchema } from "../prompts/schemas.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_ID = "researcher";
const MAX_ITERATIONS = 5;
const MODEL = "claude-sonnet-4-20250514";

// ---------------------------------------------------------------------------
// Tool Definitions (read-only subset)
// ---------------------------------------------------------------------------

const RESEARCHER_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_knowledge_base",
    description:
      "Search the knowledge base for articles relevant to a support issue. Returns articles ranked by relevance.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        category: {
          type: "string",
          enum: ["billing", "technical", "account", "product", "general"],
          description: "Optional category filter",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tag filter",
        },
        limit: {
          type: "number",
          description: "Max results (1-20, default 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_article",
    description:
      "Retrieve a specific knowledge base article by ID for full content.",
    input_schema: {
      type: "object" as const,
      properties: {
        article_id: {
          type: "string",
          description: "The article ID to retrieve",
        },
      },
      required: ["article_id"],
    },
  },
];

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

function buildResearcherPrompt(ticket: Ticket, analysis: TicketAnalysis): string {
  return `You are a knowledge base researcher for a customer support system.

## Your Task
Research the knowledge base to find information that will help resolve this support ticket.

## Ticket Details
- **ID**: ${ticket.id}
- **Subject**: ${ticket.subject}
- **Category**: ${analysis.category}
- **Priority**: ${analysis.priority}
- **Key Issues**: ${analysis.keyIssues.join(", ")}

## Customer Message
${ticket.body}

## Instructions
1. Search the knowledge base using relevant terms from the ticket
2. Retrieve full articles for the most relevant results
3. Focus on finding resolution steps, not just descriptions of the problem
4. Search for related issues that might provide additional context
5. Track EVERY source you reference — provenance is mandatory

## Output
After researching, call the "submit_research" tool with your findings. Every piece of information must reference a specific article ID or ticket event.

## Constraints
- You have READ-ONLY access — do not attempt to modify anything
- Do not fabricate information — only report what you find in the knowledge base
- If the KB lacks sufficient information, clearly state the gaps
- Maximum ${MAX_ITERATIONS} tool calls to stay within budget`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute the researcher subagent. Returns a structured ResearchResult
 * with provenance tracking.
 */
export async function runResearcher(
  client: Anthropic,
  ticket: Ticket,
  analysis: TicketAnalysis
): Promise<AgentResult<ResearchResult>> {
  const startTime = Date.now();
  const provenance: ProvenanceEntry[] = [];
  const foundArticles: KnowledgeArticle[] = [];

  try {
    // Build tool list including the structured output tool
    const tools: Anthropic.Tool[] = [
      ...RESEARCHER_TOOLS,
      {
        name: "submit_research",
        description: "Submit your research findings after searching the knowledge base.",
        input_schema: {
          type: "object" as const,
          properties: {
            relevantArticles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  articleId: { type: "string" },
                  title: { type: "string" },
                  relevance: { type: "number" },
                  keyExcerpt: { type: "string" },
                },
                required: ["articleId", "title", "relevance", "keyExcerpt"],
              },
            },
            synthesizedAnswer: { type: "string" },
            gaps: { type: "array", items: { type: "string" } },
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string", enum: ["knowledge_base", "ticket_history", "customer_data"] },
                  confidence: { type: "number" },
                },
                required: ["id", "type", "confidence"],
              },
            },
          },
          required: ["relevantArticles", "synthesizedAnswer", "gaps", "sources"],
        },
      },
    ];

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Research the knowledge base for ticket ${ticket.id}: "${ticket.subject}"`,
      },
    ];

    // Agentic loop — let the model decide which tools to call
    let iterations = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: buildResearcherPrompt(ticket, analysis),
        tools,
        messages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Check for structured output submission
      const submitCall = response.content.find(
        (b) => b.type === "tool_use" && b.name === "submit_research"
      );

      if (submitCall && submitCall.type === "tool_use") {
        // Validate with Zod
        const parsed = ResearchSummarySchema.safeParse(submitCall.input);
        if (parsed.success) {
          // Build provenance from the validated output
          for (const article of parsed.data.relevantArticles) {
            provenance.push(
              fromKnowledgeBase(article.articleId, article.relevance, article.keyExcerpt)
            );
          }

          // Build ticket history provenance
          for (const event of ticket.history) {
            provenance.push(fromTicketHistory(ticket.id, event.detail, 0.9));
          }

          const result: ResearchResult = {
            query: `${ticket.subject} ${analysis.keyIssues.join(" ")}`,
            articles: foundArticles,
            relevantHistory: ticket.history,
            provenance: mergeProvenance(provenance),
          };

          return successResult(
            result,
            buildMetadata(
              AGENT_ID,
              startTime,
              { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
              provenance
            )
          );
        }

        // Validation failed — report as partial
        return partialResult(
          {
            query: ticket.subject,
            articles: foundArticles,
            relevantHistory: ticket.history,
            provenance,
          },
          parseError(AGENT_ID, parsed.error.message),
          buildMetadata(
            AGENT_ID,
            startTime,
            { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
            provenance
          )
        );
      }

      // Process tool calls
      if (response.stop_reason === "tool_use") {
        const toolResults: Anthropic.MessageParam = {
          role: "user",
          content: response.content
            .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
            .map((toolCall) => {
              const handlerResult = executeResearcherTool(
                toolCall.name,
                toolCall.input as Record<string, unknown>
              );

              // Track found articles for provenance
              if (toolCall.name === "get_article" && !handlerResult.isError) {
                try {
                  const article = JSON.parse(
                    handlerResult.content[0].text
                  ) as KnowledgeArticle;
                  foundArticles.push(article);
                } catch {
                  // Ignore parse failures on article tracking
                }
              }

              return {
                type: "tool_result" as const,
                tool_use_id: toolCall.id,
                content: handlerResult.content[0].text,
                is_error: handlerResult.isError ?? false,
              };
            }),
        };

        messages.push({ role: "assistant", content: response.content });
        messages.push(toolResults);
        continue;
      }

      // Model finished without submitting — break loop
      break;
    }

    // Fell through without structured output — return partial
    return partialResult(
      {
        query: ticket.subject,
        articles: foundArticles,
        relevantHistory: ticket.history,
        provenance,
      },
      parseError(AGENT_ID, "Researcher did not submit structured findings"),
      buildMetadata(
        AGENT_ID,
        startTime,
        { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
        provenance
      )
    );
  } catch (error) {
    return failedResult(
      apiError(AGENT_ID, error instanceof Error ? error.message : String(error)),
      buildMetadata(
        AGENT_ID,
        startTime,
        { inputTokens: 0, outputTokens: 0 },
        provenance
      )
    );
  }
}

// ---------------------------------------------------------------------------
// Internal Tool Router
// ---------------------------------------------------------------------------

function executeResearcherTool(
  name: string,
  input: Record<string, unknown>
): { content: [{ type: "text"; text: string }]; isError?: true } {
  switch (name) {
    case "search_knowledge_base":
      return handleSearchKnowledgeBase(input as Parameters<typeof handleSearchKnowledgeBase>[0]);
    case "get_article":
      return handleGetArticle(input as Parameters<typeof handleGetArticle>[0]);
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}
