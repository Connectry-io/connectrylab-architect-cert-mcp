/**
 * Agent-Scoped Tools — Tool Distribution and tool_choice Patterns
 *
 * Covers: Task Statement 2.3
 *   - Tool distribution across agents (principle of least privilege)
 *   - Read-only tools for research agents
 *   - Write tools for action agents
 *   - tool_choice patterns: auto, any, tool (forced)
 *   - Why giving every agent every tool causes confusion
 *
 * Key insight: Every tool you give an agent expands what it can do — and
 * what it can do wrong. A research subagent that only needs to read documents
 * should never hold a delete_record tool.
 *
 * This module does NOT register MCP tools directly. Instead, it demonstrates
 * the Anthropic Messages API pattern for distributing tools across agents
 * with scoped access and tool_choice configuration.
 */

import type { AgentToolConfig, ToolChoiceMode } from '../types.js';

// ---- Tool Definitions ----

/**
 * All tools defined once in a central registry. Subsets are distributed
 * per agent role. The model has no awareness of tools not listed in its
 * request — it cannot be tricked into calling them.
 *
 * This is the only reliable enforcement boundary for tool access.
 */
export const TOOL_REGISTRY = {
  // Read-only tools — safe for research agents
  get_invoice: {
    name: 'get_invoice',
    description:
      'Retrieve a single invoice by its exact invoice ID (format: INV-XXXXXX). ' +
      'Returns full invoice details including line items and payment status. ' +
      'Use this when you already have the invoice ID. ' +
      'Do NOT use this to list invoices or search by customer.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: {
          type: 'string',
          description: 'The invoice ID in the format INV-XXXXXX',
        },
      },
      required: ['invoiceId'],
    },
  },

  list_invoices: {
    name: 'list_invoices',
    description:
      'List all invoices for a specific customer, optionally filtered by status. ' +
      'Returns a summary list (ID, date, amount, status) — NOT full line items. ' +
      'Use this to discover invoice IDs before calling get_invoice.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customerId: {
          type: 'string',
          description: 'The customer UUID, e.g. cust_a1b2c3',
        },
        status: {
          type: 'string',
          enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'all'],
          description: 'Filter by payment status. Defaults to "all".',
        },
      },
      required: ['customerId'],
    },
  },

  get_customer: {
    name: 'get_customer',
    description:
      'Retrieve a customer profile by their UUID. Returns name, email, and tier. ' +
      'Use this when you need customer context before processing an invoice.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customerId: {
          type: 'string',
          description: 'The customer UUID',
        },
      },
      required: ['customerId'],
    },
  },

  // Write tools — only for action agents
  create_invoice: {
    name: 'create_invoice',
    description:
      'Create a new draft invoice for a customer. The invoice is created in "draft" ' +
      'status and is NOT automatically sent.',
    input_schema: {
      type: 'object' as const,
      properties: {
        customerId: { type: 'string' },
        customerName: { type: 'string' },
        lineItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unitPriceCents: { type: 'number' },
            },
          },
        },
        currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'] },
        dueInDays: { type: 'number' },
      },
      required: ['customerId', 'customerName', 'lineItems', 'currency', 'dueInDays'],
    },
  },

  send_invoice: {
    name: 'send_invoice',
    description:
      'Send a draft invoice to the customer via email. Changes status from "draft" to "sent". ' +
      'This action is irreversible — the customer will receive the invoice immediately.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: {
          type: 'string',
          description: 'The invoice ID to send (must be in "draft" status)',
        },
      },
      required: ['invoiceId'],
    },
  },

  cancel_invoice: {
    name: 'cancel_invoice',
    description:
      'Cancel an existing invoice. Only invoices in "draft" or "sent" status can be cancelled. ' +
      'Paid invoices cannot be cancelled — issue a credit note instead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: { type: 'string' },
        reason: { type: 'string', description: 'Reason for cancellation (required for audit trail)' },
      },
      required: ['invoiceId', 'reason'],
    },
  },

  // Validation tool — used for forced first-step patterns
  validate_request: {
    name: 'validate_request',
    description:
      'Validate that a user request is well-formed before processing. ' +
      'Returns structured validation results. Must be called before any other action.',
    input_schema: {
      type: 'object' as const,
      properties: {
        input: {
          type: 'string',
          description: 'The raw user request to validate',
        },
      },
      required: ['input'],
    },
  },
} as const;

type ToolName = keyof typeof TOOL_REGISTRY;

// ---- Agent Configurations ----

/**
 * Research agent — READ-ONLY tools.
 *
 * This agent can look up invoices and customers but cannot create,
 * send, or cancel anything. If a prompt injection tries to make it
 * call create_invoice, the call will fail because the tool is not
 * in its tool list.
 *
 * tool_choice: "auto" — the agent decides when to search.
 */
export const RESEARCH_AGENT_CONFIG: AgentToolConfig = {
  role: 'research',
  description: 'Research specialist — looks up invoices and customer data',
  allowedTools: ['get_invoice', 'list_invoices', 'get_customer'],
  toolChoice: { type: 'auto' },
};

/**
 * Action agent — WRITE tools plus the read tools it needs for context.
 *
 * tool_choice: "any" — every turn must produce a tool call. This is
 * appropriate because the action agent is invoked only when a concrete
 * action is needed. Pure text responses are invalid in this context.
 */
export const ACTION_AGENT_CONFIG: AgentToolConfig = {
  role: 'action',
  description: 'Action specialist — creates, sends, and cancels invoices',
  allowedTools: [
    'get_invoice',       // needs read access for context
    'create_invoice',
    'send_invoice',
    'cancel_invoice',
  ],
  toolChoice: { type: 'any' },
};

/**
 * Coordinator agent — forced first step with validate_request.
 *
 * tool_choice: { type: "tool", name: "validate_request" }
 *
 * This forces the coordinator to ALWAYS call validate_request as its
 * first action. After validation succeeds, the coordinator switches
 * to "auto" for the remaining turns so it can reason freely about
 * which subagent to delegate to.
 *
 * IMPORTANT: Forced tool selection is valuable at the START of a workflow
 * for a guaranteed structured output. Do NOT leave it in place for
 * subsequent turns — switch back to "auto".
 */
export const COORDINATOR_FIRST_TURN_CONFIG: AgentToolConfig = {
  role: 'admin',
  description: 'Coordinator — validates input then delegates to subagents',
  allowedTools: ['validate_request'],
  toolChoice: { type: 'tool', name: 'validate_request' },
};

export const COORDINATOR_SUBSEQUENT_CONFIG: AgentToolConfig = {
  role: 'admin',
  description: 'Coordinator — routes validated requests to the right subagent',
  allowedTools: ['validate_request', 'get_invoice', 'list_invoices'],
  toolChoice: { type: 'auto' },
};

// ---- Helper Functions ----

/**
 * Filter the global tool registry to return only the tools allowed
 * for a given agent configuration.
 *
 * This is the core scoping mechanism: the model never sees tools
 * outside its allowed set. Tools not in the list cannot be called,
 * regardless of what the prompt says.
 */
export function getToolsForAgent(
  config: AgentToolConfig,
): readonly (typeof TOOL_REGISTRY)[ToolName][] {
  return config.allowedTools.map((name) => {
    const tool = TOOL_REGISTRY[name as ToolName];
    if (!tool) {
      throw new Error(`Unknown tool in agent config: ${name}`);
    }
    return tool;
  });
}

/**
 * Build the tool_choice parameter for an API request.
 *
 * Maps our AgentToolConfig.toolChoice to the Anthropic Messages API format:
 *   - { type: "auto" }                  → Claude decides whether to call a tool
 *   - { type: "any" }                   → Claude must call at least one tool
 *   - { type: "tool", name: "..." }     → Claude must call the named tool
 */
export function getToolChoice(config: AgentToolConfig): ToolChoiceMode {
  return config.toolChoice;
}

/**
 * Example: constructing an API request for the research agent.
 *
 * This shows how tool scoping and tool_choice come together in a
 * real API call. The research agent sees only 3 tools (not 7),
 * and Claude decides when to use them (auto mode).
 */
export function buildResearchAgentRequest(query: string): {
  readonly model: string;
  readonly maxTokens: number;
  readonly system: string;
  readonly tools: readonly (typeof TOOL_REGISTRY)[ToolName][];
  readonly toolChoice: ToolChoiceMode;
  readonly messages: readonly { readonly role: string; readonly content: string }[];
} {
  const config = RESEARCH_AGENT_CONFIG;
  return {
    model: 'claude-haiku-4-5',
    maxTokens: 1024,
    system:
      'You are a research specialist for a billing system. ' +
      'Look up invoices and customer data to answer questions. ' +
      'You have read-only access — you cannot create, modify, or delete anything.',
    tools: getToolsForAgent(config),
    toolChoice: getToolChoice(config),
    messages: [{ role: 'user', content: query }],
  };
}

/**
 * Example: constructing the coordinator's forced first-turn request.
 *
 * The coordinator MUST call validate_request before anything else.
 * After this turn, the caller should switch to COORDINATOR_SUBSEQUENT_CONFIG
 * with tool_choice: "auto".
 */
export function buildCoordinatorFirstTurn(userInput: string): {
  readonly model: string;
  readonly maxTokens: number;
  readonly system: string;
  readonly tools: readonly (typeof TOOL_REGISTRY)[ToolName][];
  readonly toolChoice: ToolChoiceMode;
  readonly messages: readonly { readonly role: string; readonly content: string }[];
} {
  const config = COORDINATOR_FIRST_TURN_CONFIG;
  return {
    model: 'claude-sonnet-4-5-20250514',
    maxTokens: 1024,
    system:
      'You are a billing coordinator. Your first action must always be to validate ' +
      'the user request. After validation, delegate to the appropriate specialist agent.',
    tools: getToolsForAgent(config),
    toolChoice: getToolChoice(config),
    messages: [{ role: 'user', content: userInput }],
  };
}
