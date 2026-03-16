/**
 * Shared types for the D2 Tools Demo MCP Server.
 *
 * Covers: All Domain 2 task statements (shared across modules)
 *
 * Design principle: Every type is readonly/immutable. Objects are never
 * mutated — new copies are created with updated fields instead.
 */

// ---- Invoice Domain ----

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface LineItem {
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly totalCents: number;
}

export interface Invoice {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly status: InvoiceStatus;
  readonly lineItems: readonly LineItem[];
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly currency: string;
  readonly issuedAt: string;
  readonly dueAt: string;
  readonly paidAt: string | null;
}

export interface InvoiceSummary {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly status: InvoiceStatus;
  readonly totalCents: number;
  readonly currency: string;
  readonly issuedAt: string;
  readonly dueAt: string;
}

export interface CreateInvoiceInput {
  readonly customerId: string;
  readonly customerName: string;
  readonly lineItems: readonly {
    readonly description: string;
    readonly quantity: number;
    readonly unitPriceCents: number;
  }[];
  readonly currency: string;
  readonly dueInDays: number;
}

// ---- Error Handling ----

export type ErrorCategory = 'validation' | 'auth' | 'not_found' | 'rate_limit';

export interface StructuredError {
  readonly error: {
    readonly category: ErrorCategory;
    readonly message: string;
    readonly retryable: boolean;
    readonly details: Readonly<Record<string, unknown>>;
  };
}

/**
 * Tool result type compatible with the MCP SDK's server.tool() callback.
 * Note: The SDK requires mutable arrays for the content field, so we
 * use mutable types here even though we treat them as immutable in practice.
 */
export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

// ---- Agent Scoping ----

export type AgentRole = 'research' | 'action' | 'admin';

export type ToolChoiceMode =
  | { readonly type: 'auto' }
  | { readonly type: 'any' }
  | { readonly type: 'tool'; readonly name: string };

export interface AgentToolConfig {
  readonly role: AgentRole;
  readonly description: string;
  readonly allowedTools: readonly string[];
  readonly toolChoice: ToolChoiceMode;
}

// ---- MCP Resources ----

export interface CustomerRecord {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly tier: 'free' | 'pro' | 'enterprise';
  readonly createdAt: string;
}

export interface PricingTier {
  readonly id: string;
  readonly name: string;
  readonly monthlyPriceCents: number;
  readonly features: readonly string[];
}

// ---- Built-in Tool Patterns ----

export interface CodeSearchResult {
  readonly filePath: string;
  readonly lineNumber: number;
  readonly matchedLine: string;
  readonly context: readonly string[];
}

export interface FileDiscoveryResult {
  readonly pattern: string;
  readonly matchedPaths: readonly string[];
  readonly totalMatches: number;
}
