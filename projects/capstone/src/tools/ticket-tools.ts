/**
 * Ticket Tools — MCP Tool Definitions for Ticket Operations
 *
 * Task Statements Covered:
 *   D2: 2.1 — Well-designed tools with clear names, descriptions, and boundaries
 *   D2: 2.2 — Structured error responses via error-handler
 *
 * These tools expose ticket CRUD operations to MCP clients. Each tool has:
 *   - A clear, verb_noun name
 *   - Detailed description with examples
 *   - Zod-validated input schema
 *   - Structured error handling
 *
 * The in-memory store simulates a database. In production this would be
 * backed by better-sqlite3 or an external API.
 */

import { z } from "zod";
import type { Ticket, TicketStatus, TicketPriority } from "../types.js";
import {
  notFoundError,
  validationError,
  formatMcpError,
} from "./error-handler.js";

// ---------------------------------------------------------------------------
// In-Memory Ticket Store (simulates DB)
// ---------------------------------------------------------------------------

const TICKET_STORE: Map<string, Ticket> = new Map([
  [
    "TKT-001",
    {
      id: "TKT-001",
      subject: "Cannot access billing dashboard",
      body: "I've been trying to access my billing page for the past 2 days but keep getting a 403 error. I need to download my invoices urgently for tax filing. This is the third time this has happened this quarter.",
      customerEmail: "alex@example.com",
      customerId: "CUST-100",
      priority: "high",
      category: "billing",
      status: "open",
      tags: ["billing", "access-issue", "recurring"],
      createdAt: "2026-03-15T10:30:00Z",
      updatedAt: "2026-03-15T10:30:00Z",
      history: [
        {
          timestamp: "2026-03-15T10:30:00Z",
          type: "created",
          actor: "system",
          detail: "Ticket created via email",
        },
      ],
    },
  ],
  [
    "TKT-002",
    {
      id: "TKT-002",
      subject: "API rate limiting too aggressive",
      body: "Our integration is hitting rate limits at 50 req/min which is well below the documented 100 req/min limit. We're on the Enterprise plan. Can you investigate?",
      customerEmail: "dev@startup.io",
      customerId: "CUST-200",
      priority: "medium",
      category: "technical",
      status: "open",
      tags: ["api", "rate-limit", "enterprise"],
      createdAt: "2026-03-14T14:00:00Z",
      updatedAt: "2026-03-14T14:00:00Z",
      history: [
        {
          timestamp: "2026-03-14T14:00:00Z",
          type: "created",
          actor: "system",
          detail: "Ticket created via API",
        },
      ],
    },
  ],
  [
    "TKT-003",
    {
      id: "TKT-003",
      subject: "How to upgrade my plan?",
      body: "Hi, I'd like to upgrade from the Starter plan to Professional. Can you walk me through the process?",
      customerEmail: "newuser@gmail.com",
      customerId: "CUST-300",
      priority: "low",
      category: "account",
      status: "open",
      tags: ["upgrade", "plan-change"],
      createdAt: "2026-03-16T08:00:00Z",
      updatedAt: "2026-03-16T08:00:00Z",
      history: [
        {
          timestamp: "2026-03-16T08:00:00Z",
          type: "created",
          actor: "system",
          detail: "Ticket created via web form",
        },
      ],
    },
  ],
]);

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

export const GetTicketInputSchema = z.object({
  ticket_id: z.string().min(1, "ticket_id is required"),
});

export const SearchTicketsInputSchema = z.object({
  query: z.string().optional(),
  status: z
    .enum(["open", "in_progress", "waiting_customer", "escalated", "resolved", "closed"])
    .optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  category: z.enum(["billing", "technical", "account", "product", "general"]).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export const UpdateTicketInputSchema = z.object({
  ticket_id: z.string().min(1, "ticket_id is required"),
  status: z
    .enum(["open", "in_progress", "waiting_customer", "escalated", "resolved", "closed"])
    .optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ---------------------------------------------------------------------------
// Tool Definitions (for MCP registration)
// ---------------------------------------------------------------------------

export const TICKET_TOOL_DEFINITIONS = [
  {
    name: "get_ticket",
    description:
      "Retrieve a support ticket by its ID. Returns the full ticket including subject, body, customer info, priority, category, status, tags, and complete event history. Use this as the first step when handling a specific ticket.",
    inputSchema: GetTicketInputSchema,
  },
  {
    name: "search_tickets",
    description:
      "Search support tickets by query text, status, priority, or category. Returns matching tickets sorted by relevance. Use this to find related tickets or patterns. Example: search for all open billing tickets to identify systemic issues.",
    inputSchema: SearchTicketsInputSchema,
  },
  {
    name: "update_ticket",
    description:
      "Update a ticket's status, priority, or add an internal note. Only modifiable fields can be changed — the ticket body and customer info are immutable. Always include a note explaining why the change was made.",
    inputSchema: UpdateTicketInputSchema,
  },
] as const;

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

export function handleGetTicket(
  input: z.infer<typeof GetTicketInputSchema>
): { content: [{ type: "text"; text: string }]; isError?: true } {
  const parsed = GetTicketInputSchema.safeParse(input);
  if (!parsed.success) {
    return formatMcpError(
      validationError("ticket_id", parsed.error.issues[0]?.message ?? "Invalid input")
    );
  }

  const ticket = TICKET_STORE.get(parsed.data.ticket_id);
  if (!ticket) {
    return formatMcpError(notFoundError("Ticket", parsed.data.ticket_id));
  }

  return {
    content: [{ type: "text", text: JSON.stringify(ticket, null, 2) }],
  };
}

export function handleSearchTickets(
  input: z.infer<typeof SearchTicketsInputSchema>
): { content: [{ type: "text"; text: string }]; isError?: true } {
  const parsed = SearchTicketsInputSchema.safeParse(input);
  if (!parsed.success) {
    return formatMcpError(
      validationError("search", parsed.error.issues[0]?.message ?? "Invalid input")
    );
  }

  const { query, status, priority, category, limit } = parsed.data;

  const results = Array.from(TICKET_STORE.values())
    .filter((ticket) => {
      if (status && ticket.status !== status) return false;
      if (priority && ticket.priority !== priority) return false;
      if (category && ticket.category !== category) return false;
      if (query) {
        const lowerQuery = query.toLowerCase();
        const matchesSubject = ticket.subject.toLowerCase().includes(lowerQuery);
        const matchesBody = ticket.body.toLowerCase().includes(lowerQuery);
        const matchesTags = ticket.tags.some((t) => t.toLowerCase().includes(lowerQuery));
        if (!matchesSubject && !matchesBody && !matchesTags) return false;
      }
      return true;
    })
    .slice(0, limit);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ tickets: results, total: results.length }, null, 2),
      },
    ],
  };
}

export function handleUpdateTicket(
  input: z.infer<typeof UpdateTicketInputSchema>
): { content: [{ type: "text"; text: string }]; isError?: true } {
  const parsed = UpdateTicketInputSchema.safeParse(input);
  if (!parsed.success) {
    return formatMcpError(
      validationError("update", parsed.error.issues[0]?.message ?? "Invalid input")
    );
  }

  const existing = TICKET_STORE.get(parsed.data.ticket_id);
  if (!existing) {
    return formatMcpError(notFoundError("Ticket", parsed.data.ticket_id));
  }

  const now = new Date().toISOString();

  // Build new event entries immutably
  const newEvents: readonly TicketEvent[] = [
    ...(parsed.data.status
      ? [
          {
            timestamp: now,
            type: "updated" as const,
            actor: "support-agent",
            detail: `Status changed from '${existing.status}' to '${parsed.data.status}'`,
          },
        ]
      : []),
    ...(parsed.data.note
      ? [
          {
            timestamp: now,
            type: "note_added" as const,
            actor: "support-agent",
            detail: parsed.data.note,
          },
        ]
      : []),
  ];

  // Create immutable updated ticket
  const updated: Ticket = {
    ...existing,
    status: (parsed.data.status as TicketStatus) ?? existing.status,
    priority: (parsed.data.priority as TicketPriority) ?? existing.priority,
    tags: parsed.data.tags ? [...existing.tags, ...parsed.data.tags] : existing.tags,
    updatedAt: now,
    history: [...existing.history, ...newEvents],
  };

  // Store is the only mutable structure (simulates DB write)
  TICKET_STORE.set(updated.id, updated);

  return {
    content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
  };
}

// Re-export for type use
type TicketEvent = Ticket["history"][number];
