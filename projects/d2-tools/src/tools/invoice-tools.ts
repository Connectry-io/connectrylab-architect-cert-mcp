/**
 * Invoice Tools — Well-Designed Split Tools with Clear Boundaries
 *
 * Covers: Task Statement 2.1
 *   - Tool interface design with clear descriptions
 *   - Disambiguating descriptions (what it does, when to use, what NOT to do)
 *   - Split vs consolidate decision (read vs write, single vs list)
 *   - Parameter naming and schema design
 *
 * Covers: Task Statement 2.2
 *   - Every error path uses the structured toolError() builder
 *   - Consistent error categories and retryable metadata
 *
 * Domain mental model: "Tool descriptions are the LLM's only guide —
 * design them like API docs."
 *
 * This module demonstrates three invoice tools that are intentionally SPLIT
 * rather than consolidated behind a single "invoice_action" tool with a
 * mode parameter. The split is correct because:
 *   - get_invoice (read, single) vs list_invoices (read, list) vs
 *     create_invoice (write) have different preconditions and risk profiles
 *   - A mode parameter would make tool selection ambiguous for the LLM
 *   - Read operations are safe to call speculatively; write operations are not
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Invoice, InvoiceSummary, LineItem } from '../types.js';
import {
  toolSuccess,
  validationError,
  notFoundError,
  rateLimitError,
  withErrorGuard,
} from './error-handling.js';

// ---- In-Memory Store (demo only) ----

const INVOICES: ReadonlyMap<string, Invoice> = new Map([
  [
    'INV-004821',
    {
      id: 'INV-004821',
      customerId: 'cust_a1b2c3',
      customerName: 'Acme Corp',
      status: 'paid',
      lineItems: [
        { description: 'Consulting — 40 hours', quantity: 40, unitPriceCents: 15000, totalCents: 600000 },
        { description: 'Travel expenses', quantity: 1, unitPriceCents: 45000, totalCents: 45000 },
      ],
      subtotalCents: 645000,
      taxCents: 51600,
      totalCents: 696600,
      currency: 'USD',
      issuedAt: '2025-11-01T00:00:00Z',
      dueAt: '2025-12-01T00:00:00Z',
      paidAt: '2025-11-28T14:30:00Z',
    },
  ],
  [
    'INV-004822',
    {
      id: 'INV-004822',
      customerId: 'cust_a1b2c3',
      customerName: 'Acme Corp',
      status: 'overdue',
      lineItems: [
        { description: 'Platform license — Q1 2026', quantity: 1, unitPriceCents: 250000, totalCents: 250000 },
      ],
      subtotalCents: 250000,
      taxCents: 20000,
      totalCents: 270000,
      currency: 'USD',
      issuedAt: '2025-12-15T00:00:00Z',
      dueAt: '2026-01-15T00:00:00Z',
      paidAt: null,
    },
  ],
  [
    'INV-004823',
    {
      id: 'INV-004823',
      customerId: 'cust_x9y8z7',
      customerName: 'Widgets Inc',
      status: 'sent',
      lineItems: [
        { description: 'API integration — fixed price', quantity: 1, unitPriceCents: 800000, totalCents: 800000 },
      ],
      subtotalCents: 800000,
      taxCents: 64000,
      totalCents: 864000,
      currency: 'USD',
      issuedAt: '2026-02-01T00:00:00Z',
      dueAt: '2026-03-01T00:00:00Z',
      paidAt: null,
    },
  ],
]);

// Simple rate limiter for demo purposes
let lastCallTimestamp = 0;
const RATE_LIMIT_MS = 100;

function checkRateLimit(): { readonly allowed: boolean; readonly resetInMs: number } {
  const now = Date.now();
  if (now - lastCallTimestamp < RATE_LIMIT_MS) {
    return { allowed: false, resetInMs: RATE_LIMIT_MS - (now - lastCallTimestamp) };
  }
  lastCallTimestamp = now;
  return { allowed: true, resetInMs: 0 };
}

// ---- Tool Registration ----

export function registerInvoiceTools(server: McpServer): void {
  /**
   * TOOL: get_invoice
   *
   * Design decisions (2.1):
   *   - Description answers: WHAT (retrieve single invoice), WHEN (you have the ID),
   *     and NOT (don't use for listing or searching)
   *   - Parameter description specifies the exact format expected
   *   - This is a READ operation — safe to call speculatively
   *   - Returns FULL details including line items (vs list which returns summaries)
   */
  server.tool(
    'get_invoice',
    'Retrieve a single invoice by its exact invoice ID (format: INV-XXXXXX). ' +
      'Returns full invoice details including line items, payment status, and dates. ' +
      'Use this when you already have the invoice ID. ' +
      'Do NOT use this to list invoices or search by customer — use list_invoices instead.',
    {
      invoiceId: z
        .string()
        .describe('The invoice ID in the format INV-XXXXXX, e.g. INV-004821'),
    },
    withErrorGuard(async ({ invoiceId }) => {
      // Validate format (2.2 — validation error with field metadata)
      if (!/^INV-\d{6}$/.test(invoiceId)) {
        return validationError(
          'Invoice ID must match the format INV-XXXXXX (six digits)',
          'invoiceId',
          invoiceId,
        );
      }

      // Check rate limit (2.2 — retryable error with retryAfterMs)
      const limit = checkRateLimit();
      if (!limit.allowed) {
        return rateLimitError(
          'Too many requests — please wait before retrying',
          limit.resetInMs,
        );
      }

      // Lookup (2.2 — not_found error with resource metadata)
      const invoice = INVOICES.get(invoiceId);
      if (!invoice) {
        return notFoundError(
          `Invoice '${invoiceId}' does not exist. Use list_invoices to find valid invoice IDs.`,
          invoiceId,
        );
      }

      return toolSuccess(invoice);
    }),
  );

  /**
   * TOOL: list_invoices
   *
   * Design decisions (2.1):
   *   - SPLIT from get_invoice because it returns summaries (not full details)
   *     and searches by customer (not by invoice ID)
   *   - Description explicitly states what it returns and what it does NOT return
   *   - Status filter uses z.enum() — valid values are enumerated inline
   *   - Optional parameters have clear default behavior documented
   */
  server.tool(
    'list_invoices',
    'List all invoices for a specific customer, optionally filtered by payment status. ' +
      'Returns a summary list (ID, date, amount, status) — NOT full line items. ' +
      'Use this to discover invoice IDs before calling get_invoice for details. ' +
      'Do NOT use this to retrieve the full details of a single known invoice.',
    {
      customerId: z
        .string()
        .describe('The customer UUID, e.g. cust_a1b2c3'),
      status: z
        .enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'all'])
        .optional()
        .describe(
          'Filter by payment status. Valid values: draft, sent, paid, overdue, cancelled, all. ' +
            'Defaults to "all" when omitted.',
        ),
    },
    withErrorGuard(async ({ customerId, status }) => {
      const effectiveStatus = status ?? 'all';

      // Validate customerId format
      if (!customerId.startsWith('cust_')) {
        return validationError(
          'Customer ID must start with "cust_"',
          'customerId',
          customerId,
        );
      }

      const limit = checkRateLimit();
      if (!limit.allowed) {
        return rateLimitError(
          'Too many requests — please wait before retrying',
          limit.resetInMs,
        );
      }

      // Filter invoices by customer and optional status
      const summaries: readonly InvoiceSummary[] = Array.from(INVOICES.values())
        .filter((inv) => inv.customerId === customerId)
        .filter((inv) => effectiveStatus === 'all' || inv.status === effectiveStatus)
        .map((inv): InvoiceSummary => ({
          id: inv.id,
          customerId: inv.customerId,
          customerName: inv.customerName,
          status: inv.status,
          totalCents: inv.totalCents,
          currency: inv.currency,
          issuedAt: inv.issuedAt,
          dueAt: inv.dueAt,
        }));

      return toolSuccess({
        customerId,
        statusFilter: effectiveStatus,
        invoices: summaries,
        totalCount: summaries.length,
      });
    }),
  );

  /**
   * TOOL: create_invoice
   *
   * Design decisions (2.1):
   *   - SPLIT from the read tools because this is a WRITE operation with side effects
   *   - Description explicitly marks it as a write action ("Creates a new draft invoice")
   *   - Boundary: does NOT send the invoice — only creates it in draft status
   *   - Complex input schema with nested line items — each field is documented
   *   - This tool should NOT be given to research-only agents (see 2.3)
   */
  server.tool(
    'create_invoice',
    'Create a new draft invoice for a customer. The invoice is created in "draft" status ' +
      'and is NOT automatically sent. Line items, tax, and totals are calculated server-side. ' +
      'Use this to generate a new invoice. ' +
      'Do NOT use this to modify an existing invoice or to send/finalize an invoice.',
    {
      customerId: z
        .string()
        .describe('The customer UUID, e.g. cust_a1b2c3'),
      customerName: z
        .string()
        .describe('Display name of the customer for the invoice header'),
      lineItems: z
        .array(
          z.object({
            description: z.string().describe('Description of the line item, e.g. "Consulting — 10 hours"'),
            quantity: z.number().int().positive().describe('Number of units (must be a positive integer)'),
            unitPriceCents: z.number().int().nonnegative().describe('Price per unit in cents, e.g. 15000 for $150.00'),
          }),
        )
        .min(1)
        .describe('At least one line item is required'),
      currency: z
        .enum(['USD', 'EUR', 'GBP'])
        .describe('ISO 4217 currency code. Supported: USD, EUR, GBP'),
      dueInDays: z
        .number()
        .int()
        .min(1)
        .max(90)
        .describe('Number of days until the invoice is due (1-90)'),
    },
    withErrorGuard(async ({ customerId, customerName, lineItems, currency, dueInDays }) => {
      // Validate customer ID format
      if (!customerId.startsWith('cust_')) {
        return validationError(
          'Customer ID must start with "cust_"',
          'customerId',
          customerId,
        );
      }

      const limit = checkRateLimit();
      if (!limit.allowed) {
        return rateLimitError(
          'Too many requests — please wait before retrying',
          limit.resetInMs,
        );
      }

      // Calculate totals immutably
      const computedLineItems: readonly LineItem[] = lineItems.map(
        (item): LineItem => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalCents: item.quantity * item.unitPriceCents,
        }),
      );

      const subtotalCents = computedLineItems.reduce(
        (sum, item) => sum + item.totalCents,
        0,
      );
      const taxRate = 0.08; // 8% tax for demo
      const taxCents = Math.round(subtotalCents * taxRate);
      const totalCents = subtotalCents + taxCents;

      // Generate invoice ID (in a real system this would come from the DB)
      const nextId = `INV-${String(Math.floor(Math.random() * 900000) + 100000)}`;

      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + dueInDays);

      const newInvoice: Invoice = {
        id: nextId,
        customerId,
        customerName,
        status: 'draft',
        lineItems: computedLineItems,
        subtotalCents,
        taxCents,
        totalCents,
        currency,
        issuedAt: now.toISOString(),
        dueAt: dueDate.toISOString(),
        paidAt: null,
      };

      // In a real system we would persist this. For the demo we just return it.
      return toolSuccess({
        message: `Invoice ${nextId} created in draft status`,
        invoice: newInvoice,
      });
    }),
  );
}
