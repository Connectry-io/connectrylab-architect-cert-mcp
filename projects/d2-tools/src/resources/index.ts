/**
 * MCP Resources and Resource Templates
 *
 * Covers: Task Statement 2.4
 *   - MCP resources: structured, addressable, read-only content
 *   - Static resources with fixed URIs
 *   - Resource templates with URI patterns (RFC 6570)
 *   - Difference between resources and tools:
 *       Resources = read-only context injection
 *       Tools = side-effecting actions
 *
 * Key insight: Expose large read-only context (docs, records, config)
 * as resources. Use tools only for actions with side effects. Returning
 * large documents via tool calls bloats the tool call history and
 * consumes output tokens unnecessarily.
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CustomerRecord, PricingTier } from '../types.js';

// ---- Demo Data ----

const CUSTOMERS: ReadonlyMap<string, CustomerRecord> = new Map([
  [
    'cust_a1b2c3',
    {
      id: 'cust_a1b2c3',
      name: 'Acme Corp',
      email: 'billing@acme.example.com',
      tier: 'enterprise',
      createdAt: '2024-03-15T00:00:00Z',
    },
  ],
  [
    'cust_x9y8z7',
    {
      id: 'cust_x9y8z7',
      name: 'Widgets Inc',
      email: 'accounts@widgets.example.com',
      tier: 'pro',
      createdAt: '2024-09-01T00:00:00Z',
    },
  ],
  [
    'cust_m4n5o6',
    {
      id: 'cust_m4n5o6',
      name: 'Startup Labs',
      email: 'hello@startuplabs.example.com',
      tier: 'free',
      createdAt: '2025-01-10T00:00:00Z',
    },
  ],
]);

const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPriceCents: 0,
    features: ['5 invoices/month', 'Email support', 'Basic reports'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPriceCents: 2900,
    features: ['Unlimited invoices', 'Priority support', 'Advanced reports', 'API access'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPriceCents: 9900,
    features: ['Unlimited invoices', 'Dedicated support', 'Custom reports', 'API access', 'SSO', 'Audit logs'],
  },
];

// ---- Resource Registration ----

export function registerResources(server: McpServer): void {
  /**
   * RESOURCE TEMPLATE: Customer Profile
   *
   * URI pattern: customers://{customerId}/profile
   *
   * This is a parameterized resource template. When Claude needs
   * customer cust_a1b2c3's profile, it resolves the template to:
   *   customers://cust_a1b2c3/profile
   *
   * Templates let a single declaration cover an unbounded set of
   * resources without enumerating each one.
   *
   * The `list` callback allows Claude to discover available customers
   * by listing all resources matching this template.
   */
  server.resource(
    'customer-profile',
    new ResourceTemplate('customers://{customerId}/profile', {
      list: async () => {
        const resources = Array.from(CUSTOMERS.values()).map((c) => ({
          uri: `customers://${c.id}/profile`,
          name: `${c.name} — ${c.tier} tier`,
          mimeType: 'application/json' as const,
        }));
        return { resources };
      },
    }),
    { mimeType: 'application/json' },
    async (uri, { customerId }) => {
      const id = customerId as string;
      const customer = CUSTOMERS.get(id);

      if (!customer) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({
                error: `Customer '${id}' not found`,
              }),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(customer),
          },
        ],
      };
    },
  );

  /**
   * RESOURCE TEMPLATE: Customer Invoice History
   *
   * URI pattern: customers://{customerId}/invoices
   *
   * Demonstrates a second template on the same URI scheme but
   * a different path segment. This shows how resource templates
   * can model a REST-like hierarchy.
   */
  server.resource(
    'customer-invoices',
    new ResourceTemplate('customers://{customerId}/invoices', {
      list: async () => {
        const resources = Array.from(CUSTOMERS.values()).map((c) => ({
          uri: `customers://${c.id}/invoices`,
          name: `Invoices for ${c.name}`,
          mimeType: 'application/json' as const,
        }));
        return { resources };
      },
    }),
    { mimeType: 'application/json' },
    async (uri, { customerId }) => {
      const id = customerId as string;
      const customer = CUSTOMERS.get(id);

      // In a real system this would query the invoice database.
      // For the demo we return a placeholder with realistic structure.
      const invoiceData = customer
        ? {
            customerId: id,
            customerName: customer.name,
            invoices: [
              { id: 'INV-004821', status: 'paid', totalCents: 696600 },
              { id: 'INV-004822', status: 'overdue', totalCents: 270000 },
            ],
          }
        : { error: `Customer '${id}' not found` };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(invoiceData),
          },
        ],
      };
    },
  );

  /**
   * STATIC RESOURCE: Pricing Tiers
   *
   * URI: billing://pricing/tiers
   *
   * A static resource has a fixed URI — it does not use parameters.
   * This is appropriate for reference data that does not change
   * per request (pricing tiers, documentation, configuration).
   *
   * Static resources are declared with a plain string URI instead
   * of a ResourceTemplate.
   */
  server.resource(
    'pricing-tiers',
    'billing://pricing/tiers',
    { mimeType: 'application/json' },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({
            tiers: PRICING_TIERS,
            currency: 'USD',
            billingCycle: 'monthly',
          }),
        },
      ],
    }),
  );

  /**
   * STATIC RESOURCE: API Documentation
   *
   * URI: billing://docs/api-reference
   *
   * Large read-only documents should be exposed as resources, not
   * returned via tool calls. This keeps the tool call history clean
   * and avoids wasting output tokens on static content.
   */
  server.resource(
    'api-docs',
    'billing://docs/api-reference',
    { mimeType: 'text/markdown' },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: API_DOCUMENTATION,
        },
      ],
    }),
  );
}

// ---- Static Content ----

const API_DOCUMENTATION = `# Billing API Reference

## Invoices

### GET /invoices/:id
Retrieve a single invoice by ID.

**Parameters:**
- \`id\` (path) — Invoice ID in the format INV-XXXXXX

**Response:** Full invoice object with line items, status, and dates.

### GET /invoices?customerId=:id&status=:status
List invoices for a customer, optionally filtered by status.

**Parameters:**
- \`customerId\` (query, required) — Customer UUID
- \`status\` (query, optional) — Filter: draft, sent, paid, overdue, cancelled, all

**Response:** Array of invoice summaries (no line items).

### POST /invoices
Create a new draft invoice.

**Body:**
- \`customerId\` (string, required) — Customer UUID
- \`customerName\` (string, required) — Display name
- \`lineItems\` (array, required) — At least one line item
- \`currency\` (string, required) — USD, EUR, or GBP
- \`dueInDays\` (number, required) — 1-90

**Response:** The created invoice object in draft status.

## Customers

### GET /customers/:id
Retrieve a customer profile.

### GET /pricing/tiers
List all pricing tiers with features and pricing.

## Error Responses

All errors follow a consistent envelope:
\`\`\`json
{
  "error": {
    "category": "validation | auth | not_found | rate_limit",
    "message": "Human-readable explanation",
    "retryable": false,
    "details": { "field": "invoiceId", "received": "bad-id" }
  }
}
\`\`\`
`;
