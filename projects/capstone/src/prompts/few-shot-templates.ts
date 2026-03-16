/**
 * Few-Shot Templates — Example Responses by Category
 *
 * Task Statements Covered:
 *   D4: 4.2 — Use few-shot examples within prompts to establish response
 *              patterns, tone, and structure for the responder subagent
 *   D4: 4.4 — Validate outputs against quality criteria
 *
 * Each template set provides 2-3 examples for the responder to pattern-match
 * against. The examples demonstrate:
 *   - Appropriate tone for the category
 *   - Structure (greeting, acknowledgment, steps, closing)
 *   - Level of technical detail
 *   - Empathy markers
 */

// ---------------------------------------------------------------------------
// Template Interface
// ---------------------------------------------------------------------------

interface ResponseExample {
  readonly category: string;
  readonly scenario: string;
  readonly customerMessage: string;
  readonly agentResponse: string;
  readonly tone: "empathetic" | "professional" | "technical";
}

// ---------------------------------------------------------------------------
// Billing Response Examples
// ---------------------------------------------------------------------------

export const BILLING_EXAMPLES: readonly ResponseExample[] = [
  {
    category: "billing",
    scenario: "Customer cannot access billing dashboard",
    customerMessage:
      "I've been trying to access my billing page for 2 days and keep getting a 403 error. I need my invoices for tax filing.",
    agentResponse: `Hi [Customer Name],

I completely understand the urgency — tax deadlines are stressful enough without access issues adding to it. I'm sorry you've been dealing with this for two days.

Here's what I'd like you to try first, as this resolves the issue in most cases:

1. **Clear your browser cache and cookies** for our domain specifically
2. **Log out completely**, close your browser, then log back in
3. Try accessing the billing page again

If that doesn't resolve the 403 error, I'll need to check your account permissions on my end, which I'm doing in parallel right now.

Could you let me know if the steps above help? If not, I'll have an update from the permissions check ready for you.

Best regards,
Support Team`,
    tone: "empathetic",
  },
  {
    category: "billing",
    scenario: "Unexpected charge on invoice",
    customerMessage: "I was charged $299 this month but my plan is $199/month. What is this extra charge?",
    agentResponse: `Hi [Customer Name],

Thank you for flagging this — I want to make sure your billing is exactly right.

I've reviewed your account and can see the breakdown for this month:
- **Base plan (Professional)**: $199.00
- **Overage charge (API calls)**: $100.00

Your plan includes 50,000 API calls per month. This billing cycle, your account used 60,000 calls, resulting in the $100 overage at our standard rate of $10 per 1,000 additional calls.

**What you can do:**
- View detailed usage in Settings > Usage Dashboard
- Set up usage alerts to get notified at 80% and 100% of your quota
- Consider upgrading to Enterprise ($399/mo) which includes 200,000 calls if this is a regular pattern

Would you like me to set up those usage alerts for you, or would you prefer to discuss plan options?

Best regards,
Support Team`,
    tone: "professional",
  },
];

// ---------------------------------------------------------------------------
// Technical Response Examples
// ---------------------------------------------------------------------------

export const TECHNICAL_EXAMPLES: readonly ResponseExample[] = [
  {
    category: "technical",
    scenario: "API rate limiting issues",
    customerMessage:
      "Our integration is hitting rate limits at 50 req/min but we're on Enterprise with a 100 req/min limit.",
    agentResponse: `Hi [Customer Name],

Thanks for the detailed report — this shouldn't be happening on an Enterprise plan. Let me help troubleshoot.

**Immediate diagnostic steps:**

1. Check the \`X-RateLimit-Limit\` header in your API responses — this shows the limit the server is applying. If it shows 50 instead of 100, there's a configuration issue on our end.

2. Verify your API key is linked to your Enterprise organization:
   - Go to Settings > API Keys
   - Confirm the "Organization" column shows your Enterprise org name

3. Note that our rate limiter uses a **rolling 60-second window** (not fixed minute boundaries), and bursts of >20 requests within a 5-second window trigger temporary throttling even within your overall limit.

**If the header shows the wrong limit**, this is a known issue when API keys were created before a plan upgrade. I'm escalating this to our engineering team with your account details right now.

Could you share:
- The API key prefix (first 8 characters only, for security)
- A timestamp when you last hit the limit

This will help engineering pinpoint the issue quickly.

Best regards,
Support Team`,
    tone: "technical",
  },
  {
    category: "technical",
    scenario: "Webhook delivery failures",
    customerMessage: "Our webhooks stopped arriving about 3 hours ago. We rely on these for our pipeline.",
    agentResponse: `Hi [Customer Name],

I understand this is blocking your pipeline — let me help get this resolved quickly.

**Quick checks on your end:**
1. Verify your webhook endpoint is returning a 2xx status code within 30 seconds
2. Check if your server's SSL certificate is valid and not expired
3. Look for any firewall changes that might block our IP ranges (listed at docs.example.com/webhooks/ips)

**What I'm doing on my end:**
- Checking our webhook delivery logs for your account
- Verifying there are no ongoing platform incidents
- Reviewing your endpoint's response history

I can see from our logs that your endpoint started returning 503 errors approximately 3 hours ago, which matches your timeline. After 5 consecutive failures, our system pauses delivery to protect both sides.

**To resume delivery:**
1. Fix the 503 issue on your endpoint
2. I'll re-enable webhook delivery from our side
3. Failed events from the past 3 hours are queued and will be replayed

Let me know once your endpoint is back up and I'll trigger the replay immediately.

Best regards,
Support Team`,
    tone: "technical",
  },
];

// ---------------------------------------------------------------------------
// Account Response Examples
// ---------------------------------------------------------------------------

export const ACCOUNT_EXAMPLES: readonly ResponseExample[] = [
  {
    category: "account",
    scenario: "Plan upgrade inquiry",
    customerMessage: "I'd like to upgrade from Starter to Professional. How does that work?",
    agentResponse: `Hi [Customer Name],

Great choice — the Professional plan unlocks a lot of powerful features! Here's how the upgrade works:

**Self-service (fastest):**
1. Go to **Settings > Billing > Change Plan**
2. Select "Professional ($199/month)"
3. Review the prorated charge for the remainder of your current billing period
4. Confirm your payment method and you're all set

**What happens next:**
- All Professional features unlock **immediately** — no migration or downtime
- You'll be charged the prorated difference today
- Your next full billing cycle will be at the Professional rate
- **No data loss** — everything from your Starter plan carries over

**Pro tip:** If you'd like to try it before committing, the Professional plan comes with a **14-day free trial**. You can start the trial from the same upgrade page.

Would you like me to walk you through the upgrade, or do you have any questions about what's included in Professional?

Best regards,
Support Team`,
    tone: "professional",
  },
];

// ---------------------------------------------------------------------------
// Template Selection
// ---------------------------------------------------------------------------

const EXAMPLES_BY_CATEGORY: Readonly<Record<string, readonly ResponseExample[]>> = {
  billing: BILLING_EXAMPLES,
  technical: TECHNICAL_EXAMPLES,
  account: ACCOUNT_EXAMPLES,
  product: ACCOUNT_EXAMPLES, // Reuse professional tone
  general: ACCOUNT_EXAMPLES,
};

/**
 * Build a few-shot prompt section for the given ticket category.
 * Returns a formatted string with examples the responder can reference.
 */
export function buildFewShotSection(category: string): string {
  const examples = EXAMPLES_BY_CATEGORY[category] ?? ACCOUNT_EXAMPLES;

  const formatted = examples
    .map(
      (ex, i) => `### Example ${i + 1}: ${ex.scenario}
**Customer wrote:**
${ex.customerMessage}

**Agent response (tone: ${ex.tone}):**
${ex.agentResponse}`
    )
    .join("\n\n---\n\n");

  return `## Reference Examples
Study these examples to match the expected tone, structure, and detail level:

${formatted}

## Key Patterns to Follow
1. Start with acknowledgment of the customer's situation
2. Provide clear, numbered steps when applicable
3. Show what you're doing proactively ("I'm checking on my end...")
4. End with a specific question or next step
5. Keep the tone appropriate: empathetic for frustrated customers, professional for neutral, technical for developers`;
}

// ---------------------------------------------------------------------------
// Response Quality Checklist (D4: 4.4)
// ---------------------------------------------------------------------------

export const RESPONSE_QUALITY_PROMPT = `Before finalizing the response, verify it meets ALL of these criteria:

## Quality Checklist
1. **Addresses the core issue** — Does the response directly answer what the customer asked?
2. **Actionable** — Are there clear next steps the customer can follow?
3. **Appropriate tone** — Does the tone match the customer's emotional state?
4. **No hallucination** — Are all claims backed by the knowledge base or ticket data?
5. **No internal jargon** — Would a non-technical customer understand this?
6. **Personalized** — Does it reference the customer's specific situation (not generic)?
7. **Complete** — Does it address ALL issues identified in the analysis?
8. **Appropriate length** — Not too brief (dismissive) or too long (overwhelming)?

## Disqualifiers (any one = rewrite needed)
- Mentions internal tools or systems the customer cannot access
- Makes promises about timelines without authority
- Contains placeholder text like [FILL IN] or [TODO]
- Suggests the customer contact support (they already did)
- Ignores emotional subtext when customer is frustrated`;
