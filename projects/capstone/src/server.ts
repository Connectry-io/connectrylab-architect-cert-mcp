/**
 * MCP Server — Entry Point & Tool/Resource Registration
 *
 * Task Statements Covered:
 *   D2: 2.1 — Register well-designed tools with clear names and schemas
 *   D2: 2.2 — Structured error handling for all tool responses
 *   D2: 2.3 — Expose resources (ticket data, KB articles) via MCP
 *   D1: 1.5 — Initialize hook system for tool call interception
 *
 * This is the main entry point for the Support Agent Pro MCP server.
 * It registers all tools, resources, and prompts, then starts the
 * stdio transport for communication with MCP clients.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  handleGetTicket,
  handleSearchTickets,
  handleUpdateTicket,
  GetTicketInputSchema,
  SearchTicketsInputSchema,
  UpdateTicketInputSchema,
} from "./tools/ticket-tools.js";
import {
  handleSearchKnowledgeBase,
  handleGetArticle,
  SearchKnowledgeBaseInputSchema,
  GetArticleInputSchema,
} from "./tools/knowledge-tools.js";
import { processTicket } from "./coordinator.js";
import { registerDefaultHooks, runBeforeHooks, runAfterHooks } from "./hooks/index.js";
import { formatMcpError, internalError } from "./tools/error-handler.js";

// ---------------------------------------------------------------------------
// Server Initialization
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "support-agent-pro",
  version: "1.0.0",
});

// Initialize the Anthropic client (used by coordinator and subagents)
const anthropicClient = new Anthropic();

// Register default hooks (audit logging, rate limiting, sanitization)
registerDefaultHooks();

// ---------------------------------------------------------------------------
// Tool Registration (D2: 2.1)
// ---------------------------------------------------------------------------

// --- Ticket Tools ---

server.tool(
  "get_ticket",
  "Retrieve a support ticket by its ID. Returns the full ticket including subject, body, customer info, priority, category, status, tags, and complete event history.",
  { ticket_id: z.string().min(1).describe("The ticket ID to retrieve, e.g. TKT-001") },
  async ({ ticket_id }) => {
    const hookCtx = makeHookContext("get_ticket", "server");
    const beforeResult = await runBeforeHooks(hookCtx, { ticket_id });
    if (!beforeResult.proceed) {
      return formatMcpError(internalError("get_ticket", beforeResult.message ?? "Blocked by hook"));
    }

    const result = handleGetTicket({ ticket_id: beforeResult.value["ticket_id"] as string });

    if (!result.isError) {
      const afterResult = await runAfterHooks(hookCtx, result.content[0].text);
      if (afterResult.proceed) {
        return { content: [{ type: "text" as const, text: afterResult.value }] };
      }
    }

    return result;
  }
);

server.tool(
  "search_tickets",
  "Search support tickets by query text, status, priority, or category. Returns matching tickets sorted by relevance.",
  {
    query: z.string().optional().describe("Text to search in subject, body, and tags"),
    status: z.enum(["open", "in_progress", "waiting_customer", "escalated", "resolved", "closed"]).optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).optional(),
    category: z.enum(["billing", "technical", "account", "product", "general"]).optional(),
    limit: z.number().int().min(1).max(50).default(10).describe("Maximum results to return"),
  },
  async (params) => {
    const hookCtx = makeHookContext("search_tickets", "server");
    const beforeResult = await runBeforeHooks(hookCtx, params);
    if (!beforeResult.proceed) {
      return formatMcpError(internalError("search_tickets", beforeResult.message ?? "Blocked by hook"));
    }

    const result = handleSearchTickets(beforeResult.value as Parameters<typeof handleSearchTickets>[0]);

    if (!result.isError) {
      const afterResult = await runAfterHooks(hookCtx, result.content[0].text);
      if (afterResult.proceed) {
        return { content: [{ type: "text" as const, text: afterResult.value }] };
      }
    }

    return result;
  }
);

server.tool(
  "update_ticket",
  "Update a ticket's status, priority, or add an internal note. Always include a note explaining why the change was made.",
  {
    ticket_id: z.string().min(1).describe("The ticket ID to update"),
    status: z.enum(["open", "in_progress", "waiting_customer", "escalated", "resolved", "closed"]).optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).optional(),
    note: z.string().optional().describe("Internal note explaining the change"),
    tags: z.array(z.string()).optional().describe("Additional tags to add"),
  },
  async (params) => {
    const hookCtx = makeHookContext("update_ticket", "server");
    const beforeResult = await runBeforeHooks(hookCtx, params);
    if (!beforeResult.proceed) {
      return formatMcpError(internalError("update_ticket", beforeResult.message ?? "Blocked by hook"));
    }

    const result = handleUpdateTicket(beforeResult.value as Parameters<typeof handleUpdateTicket>[0]);

    if (!result.isError) {
      const afterResult = await runAfterHooks(hookCtx, result.content[0].text);
      if (afterResult.proceed) {
        return { content: [{ type: "text" as const, text: afterResult.value }] };
      }
    }

    return result;
  }
);

// --- Knowledge Base Tools ---

server.tool(
  "search_knowledge_base",
  "Search the knowledge base for articles relevant to a support issue. Returns articles ranked by relevance.",
  {
    query: z.string().min(1).describe("Search query"),
    category: z.enum(["billing", "technical", "account", "product", "general"]).optional(),
    tags: z.array(z.string()).optional().describe("Filter by tags"),
    limit: z.number().int().min(1).max(20).default(5),
  },
  async (params) => {
    const hookCtx = makeHookContext("search_knowledge_base", "server");
    const beforeResult = await runBeforeHooks(hookCtx, params);
    if (!beforeResult.proceed) {
      return formatMcpError(internalError("search_knowledge_base", beforeResult.message ?? "Blocked by hook"));
    }

    const result = handleSearchKnowledgeBase(
      beforeResult.value as Parameters<typeof handleSearchKnowledgeBase>[0]
    );

    if (!result.isError) {
      const afterResult = await runAfterHooks(hookCtx, result.content[0].text);
      if (afterResult.proceed) {
        return { content: [{ type: "text" as const, text: afterResult.value }] };
      }
    }

    return result;
  }
);

server.tool(
  "get_article",
  "Retrieve a specific knowledge base article by its ID. Returns the full article content.",
  {
    article_id: z.string().min(1).describe("The article ID to retrieve, e.g. KB-001"),
  },
  async ({ article_id }) => {
    const hookCtx = makeHookContext("get_article", "server");
    const beforeResult = await runBeforeHooks(hookCtx, { article_id });
    if (!beforeResult.proceed) {
      return formatMcpError(internalError("get_article", beforeResult.message ?? "Blocked by hook"));
    }

    const result = handleGetArticle({ article_id: beforeResult.value["article_id"] as string });

    if (!result.isError) {
      const afterResult = await runAfterHooks(hookCtx, result.content[0].text);
      if (afterResult.proceed) {
        return { content: [{ type: "text" as const, text: afterResult.value }] };
      }
    }

    return result;
  }
);

// --- Coordinator Tool (D1: orchestration entry point) ---

server.tool(
  "process_ticket",
  "Process a support ticket end-to-end using multi-agent orchestration. Analyzes the ticket, researches the knowledge base, and drafts a response. Returns the full analysis, research findings, draft response, and pipeline execution details.",
  {
    ticket_id: z.string().min(1).describe("The ticket ID to process"),
    session_id: z.string().min(1).describe("Session ID for context continuity"),
  },
  async ({ ticket_id, session_id }) => {
    try {
      const result = await processTicket(anthropicClient, {
        ticketId: ticket_id,
        sessionId: session_id,
      });

      if (result.status === "failed") {
        return formatMcpError(
          internalError("process_ticket", result.error?.message ?? "Processing failed")
        );
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                status: result.status,
                data: result.data,
                metadata: {
                  durationMs: result.metadata.durationMs,
                  provenance: result.metadata.provenance,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return formatMcpError(
        internalError(
          "process_ticket",
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeHookContext(toolName: string, agentId: string) {
  return {
    toolName,
    agentId,
    sessionId: "server-session",
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Server Startup
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[support-agent-pro] MCP server running on stdio");
}

main().catch((error) => {
  console.error("[support-agent-pro] Fatal error:", error);
  process.exit(1);
});
