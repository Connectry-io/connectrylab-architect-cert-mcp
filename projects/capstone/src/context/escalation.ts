/**
 * Escalation Engine — Typed Escalation Triggers
 *
 * Task Statements Covered:
 *   D5: 5.2 — Implement typed escalation triggers that preserve customer
 *              preferences and conversation context when handing off
 *
 * The escalation engine evaluates a ticket analysis against a set of
 * typed triggers. Each trigger has explicit criteria and produces a
 * structured escalation decision. When escalation is needed, the engine
 * packages the full context so the receiving team has everything they
 * need without asking the customer to repeat themselves.
 */

import type {
  TicketAnalysis,
  SessionContext,
  EscalationDecision,
  EscalationTrigger,
  EscalationRecord,
  Ticket,
} from "../types.js";

// ---------------------------------------------------------------------------
// Trigger Definitions
// ---------------------------------------------------------------------------

interface TriggerRule {
  readonly trigger: EscalationTrigger;
  readonly evaluate: (input: EscalationInput) => TriggerResult;
  readonly urgency: EscalationDecision["urgency"];
  readonly targetTeam: string;
}

interface TriggerResult {
  readonly fired: boolean;
  readonly reason: string;
}

interface EscalationInput {
  readonly analysis: TicketAnalysis;
  readonly session: SessionContext;
  readonly ticket: Ticket;
}

// ---------------------------------------------------------------------------
// Trigger Rules Registry
// ---------------------------------------------------------------------------

const TRIGGER_RULES: readonly TriggerRule[] = [
  {
    trigger: "sentiment_critical",
    urgency: "next_available",
    targetTeam: "Manager",
    evaluate: ({ analysis }): TriggerResult => {
      if (analysis.sentiment === "frustrated" && analysis.priority === "critical") {
        return {
          fired: true,
          reason: "Customer is frustrated with a critical-priority issue",
        };
      }
      if (analysis.sentiment === "frustrated") {
        // Check for compounding frustration signals
        const frustrationKeywords = ["again", "still", "unacceptable", "terrible"];
        const issueText = analysis.keyIssues.join(" ").toLowerCase();
        const signals = frustrationKeywords.filter((k) => issueText.includes(k));
        if (signals.length >= 2) {
          return {
            fired: true,
            reason: `Multiple frustration signals detected: ${signals.join(", ")}`,
          };
        }
      }
      return { fired: false, reason: "" };
    },
  },
  {
    trigger: "repeated_issue",
    urgency: "next_available",
    targetTeam: "Tier 2 Support",
    evaluate: ({ session, ticket }): TriggerResult => {
      // Check if the customer has had similar issues before
      const sameCategory = session.customerPreferences.previousIssueCategories.filter(
        (c) => c === ticket.category
      );
      if (sameCategory.length >= 3) {
        return {
          fired: true,
          reason: `Customer has reported ${sameCategory.length} issues in the '${ticket.category}' category`,
        };
      }

      // Check for recurring signals in extracted facts
      const recurringFact = session.facts.find(
        (f) => f.category === "history" && f.content.toLowerCase().includes("recurring")
      );
      if (recurringFact) {
        return {
          fired: true,
          reason: `Recurring issue detected: ${recurringFact.content}`,
        };
      }

      return { fired: false, reason: "" };
    },
  },
  {
    trigger: "sla_breach",
    urgency: "immediate",
    targetTeam: "Tier 2 Support",
    evaluate: ({ ticket }): TriggerResult => {
      const slaHours: Record<string, number> = {
        critical: 1,
        high: 4,
        medium: 8,
        low: 24,
      };
      const maxHours = slaHours[ticket.priority] ?? 24;
      const ageMs = Date.now() - new Date(ticket.createdAt).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);

      // Trigger if within 1 hour of SLA breach
      if (ageHours >= maxHours - 1) {
        return {
          fired: true,
          reason: `SLA ${ageHours >= maxHours ? "breached" : "breach imminent"}: ticket age ${ageHours.toFixed(1)}h, SLA ${maxHours}h`,
        };
      }

      return { fired: false, reason: "" };
    },
  },
  {
    trigger: "customer_request",
    urgency: "next_available",
    targetTeam: "Manager",
    evaluate: ({ ticket }): TriggerResult => {
      const escalationPhrases = [
        "speak to a manager",
        "escalate this",
        "your supervisor",
        "talk to someone else",
        "manager please",
        "higher up",
      ];
      const bodyLower = ticket.body.toLowerCase();
      const match = escalationPhrases.find((p) => bodyLower.includes(p));
      if (match) {
        return {
          fired: true,
          reason: `Customer explicitly requested escalation: "${match}"`,
        };
      }
      return { fired: false, reason: "" };
    },
  },
  {
    trigger: "technical_complexity",
    urgency: "scheduled",
    targetTeam: "Engineering",
    evaluate: ({ analysis }): TriggerResult => {
      const technicalSignals = [
        "bug",
        "code-level",
        "infrastructure",
        "production",
        "deployment",
      ];
      const issueText = analysis.keyIssues.join(" ").toLowerCase();
      const matches = technicalSignals.filter((s) => issueText.includes(s));

      if (matches.length >= 2) {
        return {
          fired: true,
          reason: `Technical complexity requires engineering involvement: ${matches.join(", ")}`,
        };
      }
      return { fired: false, reason: "" };
    },
  },
  {
    trigger: "policy_exception",
    urgency: "scheduled",
    targetTeam: "Billing Team",
    evaluate: ({ ticket }): TriggerResult => {
      const policySignals = [
        "refund",
        "contract",
        "custom pricing",
        "legal",
        "compliance",
        "exception",
      ];
      const bodyLower = ticket.body.toLowerCase();
      const matches = policySignals.filter((s) => bodyLower.includes(s));

      if (matches.length >= 1) {
        return {
          fired: true,
          reason: `Policy exception may be needed: ${matches.join(", ")} mentioned`,
        };
      }
      return { fired: false, reason: "" };
    },
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate all escalation triggers and return a decision.
 * If multiple triggers fire, the most urgent one is selected.
 */
export function evaluateEscalation(
  analysis: TicketAnalysis,
  session: SessionContext,
  ticket: Ticket
): EscalationDecision {
  const input: EscalationInput = { analysis, session, ticket };

  const firedTriggers = TRIGGER_RULES
    .map((rule) => ({
      rule,
      result: rule.evaluate(input),
    }))
    .filter(({ result }) => result.fired);

  if (firedTriggers.length === 0) {
    return {
      shouldEscalate: false,
      trigger: null,
      reason: "No escalation triggers fired",
      targetTeam: null,
      urgency: "scheduled",
    };
  }

  // Sort by urgency: immediate > next_available > scheduled
  const urgencyOrder: Record<string, number> = {
    immediate: 0,
    next_available: 1,
    scheduled: 2,
  };

  const sorted = [...firedTriggers].sort(
    (a, b) =>
      (urgencyOrder[a.rule.urgency] ?? 2) - (urgencyOrder[b.rule.urgency] ?? 2)
  );

  const primary = sorted[0]!;
  const allReasons = firedTriggers
    .map(({ rule, result }) => `[${rule.trigger}] ${result.reason}`)
    .join("; ");

  return {
    shouldEscalate: true,
    trigger: primary.rule.trigger,
    reason: allReasons,
    targetTeam: primary.rule.targetTeam,
    urgency: primary.rule.urgency,
  };
}

/**
 * Build an escalation context package that preserves all information
 * the receiving team needs. This prevents the customer from having
 * to repeat themselves.
 */
export function buildEscalationPackage(
  ticket: Ticket,
  analysis: TicketAnalysis,
  session: SessionContext,
  decision: EscalationDecision
): Readonly<Record<string, unknown>> {
  return {
    escalation: {
      trigger: decision.trigger,
      urgency: decision.urgency,
      targetTeam: decision.targetTeam,
      reason: decision.reason,
      timestamp: new Date().toISOString(),
    },
    ticket: {
      id: ticket.id,
      subject: ticket.subject,
      body: ticket.body,
      customerEmail: ticket.customerEmail,
      priority: ticket.priority,
      category: ticket.category,
      status: ticket.status,
      ageHours: (
        (Date.now() - new Date(ticket.createdAt).getTime()) /
        (1000 * 60 * 60)
      ).toFixed(1),
    },
    analysis: {
      sentiment: analysis.sentiment,
      keyIssues: analysis.keyIssues,
      suggestedActions: analysis.suggestedActions,
    },
    customerContext: {
      preferences: session.customerPreferences,
      extractedFacts: session.facts,
      conversationSummary: session.conversationSummary,
      turnCount: session.turnCount,
    },
  };
}

/**
 * Record an escalation event in the session's customer preferences.
 * Returns a NEW session (immutable update).
 */
export function recordEscalation(
  session: SessionContext,
  decision: EscalationDecision
): SessionContext {
  if (!decision.shouldEscalate || !decision.trigger) {
    return session;
  }

  const record: EscalationRecord = {
    trigger: decision.trigger,
    timestamp: new Date().toISOString(),
    reason: decision.reason,
    ticketId: session.ticketId,
  };

  return {
    ...session,
    customerPreferences: {
      ...session.customerPreferences,
      escalationHistory: [
        ...session.customerPreferences.escalationHistory,
        record,
      ],
    },
    updatedAt: new Date().toISOString(),
  };
}
