/**
 * Knowledge Base Tools — MCP Tool Definitions for KB Operations
 *
 * Task Statements Covered:
 *   D2: 2.1 — Well-designed tools with structured inputs and clear boundaries
 *   D2: 2.2 — Structured error responses with categories
 *
 * Exposes read-only access to the knowledge base. The researcher subagent
 * uses these tools exclusively — it never has access to ticket mutation
 * tools, enforcing the principle of least privilege (D1: 1.3).
 */

import { z } from "zod";
import type { KnowledgeArticle, TicketCategory } from "../types.js";
import { notFoundError, validationError, formatMcpError } from "./error-handler.js";

// ---------------------------------------------------------------------------
// In-Memory Knowledge Base (simulates DB)
// ---------------------------------------------------------------------------

const KB_STORE: ReadonlyMap<string, KnowledgeArticle> = new Map([
  [
    "KB-001",
    {
      id: "KB-001",
      title: "Resolving Billing Dashboard Access Issues",
      content: `## Problem
Customers may encounter 403 errors when accessing the billing dashboard.

## Common Causes
1. **Session expiry** — Billing tokens expire after 24h. Customer needs to log out and back in.
2. **Permission drift** — If the account was recently transferred, billing permissions may not have propagated. Allow 15 minutes after transfer.
3. **Browser cache** — Stale CSRF tokens cause 403. Clear cookies for the domain.
4. **Plan downgrade** — Billing dashboard access requires an active paid plan.

## Resolution Steps
1. Ask customer to clear browser cache and cookies
2. Have them log out completely and log back in
3. If issue persists, check account permissions in admin panel
4. Escalate to billing team if the account shows correct permissions but access is denied

## SLA
High priority billing issues should be resolved within 4 hours.`,
      category: "billing",
      tags: ["403", "access", "billing-dashboard", "permissions"],
      lastUpdated: "2026-02-20T12:00:00Z",
    },
  ],
  [
    "KB-002",
    {
      id: "KB-002",
      title: "API Rate Limiting — Configuration and Troubleshooting",
      content: `## Rate Limits by Plan
- Starter: 20 req/min
- Professional: 60 req/min
- Enterprise: 100 req/min
- Custom: As configured

## Common Issues
1. **Burst detection** — Even within the limit, bursts of >20 requests in 5 seconds trigger temporary throttling.
2. **Shared limits** — All API keys under one account share the same rate limit pool.
3. **Incorrect plan detection** — If an Enterprise customer hits limits at lower thresholds, check that their API key is linked to the correct organization.

## Troubleshooting
1. Verify the customer's plan in the admin panel
2. Check the X-RateLimit-* response headers
3. Review the rate limit dashboard for the specific API key
4. If limits appear incorrect for the plan, escalate to Engineering with the API key and timestamps

## Technical Note
Rate limits reset on a rolling 60-second window, not a fixed minute boundary.`,
      category: "technical",
      tags: ["api", "rate-limit", "throttling", "enterprise"],
      lastUpdated: "2026-03-01T09:00:00Z",
    },
  ],
  [
    "KB-003",
    {
      id: "KB-003",
      title: "Plan Upgrade Process",
      content: `## Self-Service Upgrade
Customers can upgrade their plan at any time through:
1. Settings > Billing > Change Plan
2. Select the desired plan
3. Review prorated charges
4. Confirm payment method

## Prorating
- Upgrades are prorated for the remaining billing period
- The difference is charged immediately
- Downgrades take effect at the next billing cycle

## Common Questions
- **"Will I lose data?"** — No, upgrades never result in data loss
- **"Can I try before buying?"** — Professional plan has a 14-day trial
- **"Do I need to migrate?"** — No migration needed, features unlock immediately

## Support Actions
If the customer cannot self-serve:
1. Verify their identity (email + last 4 of payment method)
2. Process the upgrade through the admin panel
3. Send confirmation email with new plan details`,
      category: "account",
      tags: ["upgrade", "plan-change", "billing", "self-service"],
      lastUpdated: "2026-01-15T16:00:00Z",
    },
  ],
  [
    "KB-004",
    {
      id: "KB-004",
      title: "Escalation Policy and SLA Guidelines",
      content: `## When to Escalate
- Customer has experienced the same issue 3+ times in 30 days
- SLA breach is imminent (within 1 hour of deadline)
- Customer explicitly requests manager/supervisor
- Issue requires code-level investigation
- Policy exception needed (refund > $500, contract modification)

## Escalation Tiers
- **Tier 1 → Tier 2**: Technical issues beyond KB resolution
- **Tier 2 → Engineering**: Bug reports, infrastructure issues
- **Tier 2 → Billing Team**: Refunds, payment disputes, plan exceptions
- **Any → Manager**: Customer dissatisfaction, complaint escalation

## SLA Targets
- Critical: 1 hour response, 4 hour resolution
- High: 4 hour response, 24 hour resolution
- Medium: 8 hour response, 48 hour resolution
- Low: 24 hour response, 72 hour resolution`,
      category: "general",
      tags: ["escalation", "sla", "policy", "process"],
      lastUpdated: "2026-03-10T11:00:00Z",
    },
  ],
]);

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

export const SearchKnowledgeBaseInputSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  category: z
    .enum(["billing", "technical", "account", "product", "general"])
    .optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

export const GetArticleInputSchema = z.object({
  article_id: z.string().min(1, "article_id is required"),
});

// ---------------------------------------------------------------------------
// Tool Definitions (for MCP registration)
// ---------------------------------------------------------------------------

export const KNOWLEDGE_TOOL_DEFINITIONS = [
  {
    name: "search_knowledge_base",
    description:
      "Search the knowledge base for articles relevant to a support issue. Matches against article titles, content, tags, and categories. Returns articles ranked by relevance. Use this to find resolution steps, troubleshooting guides, and policy information.",
    inputSchema: SearchKnowledgeBaseInputSchema,
  },
  {
    name: "get_article",
    description:
      "Retrieve a specific knowledge base article by its ID. Returns the full article content including resolution steps and technical details. Use this after search_knowledge_base identifies a relevant article and you need the complete content.",
    inputSchema: GetArticleInputSchema,
  },
] as const;

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

export function handleSearchKnowledgeBase(
  input: z.infer<typeof SearchKnowledgeBaseInputSchema>
): { content: [{ type: "text"; text: string }]; isError?: true } {
  const parsed = SearchKnowledgeBaseInputSchema.safeParse(input);
  if (!parsed.success) {
    return formatMcpError(
      validationError("search", parsed.error.issues[0]?.message ?? "Invalid input")
    );
  }

  const { query, category, tags, limit } = parsed.data;
  const lowerQuery = query.toLowerCase();

  const scored = Array.from(KB_STORE.values())
    .filter((article) => {
      if (category && article.category !== category) return false;
      return true;
    })
    .map((article) => {
      let score = 0;

      // Title match (highest weight)
      if (article.title.toLowerCase().includes(lowerQuery)) score += 3;

      // Content match
      if (article.content.toLowerCase().includes(lowerQuery)) score += 2;

      // Tag match
      const queryTerms = lowerQuery.split(/\s+/);
      for (const term of queryTerms) {
        if (article.tags.some((t) => t.toLowerCase().includes(term))) score += 1;
      }

      // Bonus for tag filter match
      if (tags) {
        const matchingTags = tags.filter((t) =>
          article.tags.some((at) => at.toLowerCase() === t.toLowerCase())
        );
        score += matchingTags.length;
      }

      return { ...article, relevanceScore: Math.min(score / 7, 1) };
    })
    .filter((a) => a.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ articles: scored, total: scored.length }, null, 2),
      },
    ],
  };
}

export function handleGetArticle(
  input: z.infer<typeof GetArticleInputSchema>
): { content: [{ type: "text"; text: string }]; isError?: true } {
  const parsed = GetArticleInputSchema.safeParse(input);
  if (!parsed.success) {
    return formatMcpError(
      validationError("article_id", parsed.error.issues[0]?.message ?? "Invalid input")
    );
  }

  const article = KB_STORE.get(parsed.data.article_id);
  if (!article) {
    return formatMcpError(notFoundError("Article", parsed.data.article_id));
  }

  return {
    content: [{ type: "text", text: JSON.stringify(article, null, 2) }],
  };
}
