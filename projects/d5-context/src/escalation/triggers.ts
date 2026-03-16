/**
 * Escalation Trigger System — Domain 5.2
 *
 * Task Statements Covered:
 *   5.2: Escalation patterns — typed triggers, confidence thresholds,
 *        policy violations, sensitivity levels
 *
 * Key Insights:
 *   - NEVER rely on sentiment analysis for escalation decisions. Sentiment
 *     models are unreliable and culturally biased. Use typed, policy-based
 *     triggers instead.
 *   - Each trigger has a clear, testable condition. "Confidence below 0.7"
 *     is testable; "customer seems upset" is not.
 *   - Triggers are evaluated in priority order: policy violations first,
 *     then sensitivity, then confidence thresholds.
 *
 * Mental Model: "Escalation is a policy decision, not a vibes check"
 */

import { z } from "zod";
import type {
  EscalationCategory,
  EscalationEvent,
  EscalationSeverity,
  EscalationTrigger,
} from "../types.js";

// ---------------------------------------------------------------------------
// Trigger Registry
// ---------------------------------------------------------------------------

/**
 * An immutable registry of escalation triggers. Triggers are evaluated
 * in priority order determined by severity.
 */
export interface TriggerRegistry {
  readonly triggers: readonly EscalationTrigger[];
}

/**
 * Creates a new trigger registry from a list of triggers, sorted by
 * evaluation priority (critical first).
 */
export function createTriggerRegistry(
  triggers: readonly EscalationTrigger[]
): TriggerRegistry {
  const sorted = [...triggers].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity)
  );
  return { triggers: sorted };
}

/**
 * Adds a trigger to the registry. Returns a new registry.
 */
export function addTrigger(
  registry: TriggerRegistry,
  trigger: EscalationTrigger
): TriggerRegistry {
  return createTriggerRegistry([...registry.triggers, trigger]);
}

// ---------------------------------------------------------------------------
// Trigger Evaluation
// ---------------------------------------------------------------------------

/**
 * The evaluation context provides the data needed to check triggers.
 * This is a structured alternative to sentiment analysis — every field
 * is objective and testable.
 */
export interface EvaluationContext {
  readonly currentConfidence: number;
  readonly topicClassification: string;
  readonly policyViolations: readonly string[];
  readonly consecutiveFailures: number;
  readonly financialImpact: number | null;
  readonly customerRequestedEscalation: boolean;
  readonly sensitiveTopics: readonly string[];
}

/**
 * Schema for validating evaluation context at system boundaries.
 */
export const EvaluationContextSchema = z.object({
  currentConfidence: z.number().min(0).max(1),
  topicClassification: z.string(),
  policyViolations: z.array(z.string()),
  consecutiveFailures: z.number().min(0),
  financialImpact: z.number().nullable(),
  customerRequestedEscalation: z.boolean(),
  sensitiveTopics: z.array(z.string()),
});

/**
 * Evaluates all triggers against the current context. Returns an array
 * of escalation events for every trigger that fired.
 *
 * Evaluation order matters: critical triggers are checked first so that
 * the most severe escalation is reported first.
 */
export function evaluateTriggers(
  registry: TriggerRegistry,
  context: EvaluationContext
): readonly EscalationEvent[] {
  const now = new Date().toISOString();
  const events: EscalationEvent[] = [];

  for (const trigger of registry.triggers) {
    const fired = checkTrigger(trigger, context);
    if (fired) {
      events.push({
        triggerId: trigger.id,
        trigger,
        context: buildEventContext(trigger, context),
        detectedAt: now,
        currentConfidence: context.currentConfidence,
        recommendedAction: recommendAction(trigger, context),
      });
    }
  }

  return events;
}

/**
 * Returns only the highest-severity event, or null if no triggers fired.
 * Use this when you need a single escalation decision.
 */
export function evaluateHighestPriority(
  registry: TriggerRegistry,
  context: EvaluationContext
): EscalationEvent | null {
  const events = evaluateTriggers(registry, context);
  return events[0] ?? null;
}

/**
 * Checks whether a specific trigger should fire given the context.
 * Each category has a deterministic check — no sentiment analysis.
 */
function checkTrigger(
  trigger: EscalationTrigger,
  context: EvaluationContext
): boolean {
  switch (trigger.category) {
    case "policy_violation":
      return context.policyViolations.length > 0;

    case "confidence_below_threshold":
      return context.currentConfidence < trigger.confidenceThreshold;

    case "sensitive_topic":
      return context.sensitiveTopics.length > 0;

    case "customer_request":
      return context.customerRequestedEscalation;

    case "repeated_failure":
      // Escalate after 3+ consecutive failures by default
      return context.consecutiveFailures >= 3;

    case "financial_impact":
      // Escalate if financial impact exceeds a threshold based on severity
      return (
        context.financialImpact !== null &&
        context.financialImpact > financialThreshold(trigger.severity)
      );
  }
}

// ---------------------------------------------------------------------------
// Default Trigger Sets
// ---------------------------------------------------------------------------

/**
 * Creates a standard set of triggers suitable for most support systems.
 * These can be extended or overridden per-customer via preferences.
 */
export function createDefaultTriggers(): TriggerRegistry {
  const triggers: readonly EscalationTrigger[] = [
    {
      id: "trig-policy-violation",
      category: "policy_violation",
      severity: "critical",
      description: "Any policy violation detected in agent response or user request",
      confidenceThreshold: 0,
      autoEscalate: true,
    },
    {
      id: "trig-sensitive-topic",
      category: "sensitive_topic",
      severity: "high",
      description: "Conversation involves sensitive topics (medical, legal, financial advice)",
      confidenceThreshold: 0,
      autoEscalate: true,
    },
    {
      id: "trig-customer-request",
      category: "customer_request",
      severity: "high",
      description: "Customer explicitly requested to speak with a human",
      confidenceThreshold: 0,
      autoEscalate: true,
    },
    {
      id: "trig-low-confidence",
      category: "confidence_below_threshold",
      severity: "medium",
      description: "Agent confidence dropped below threshold for reliable responses",
      confidenceThreshold: 0.7,
      autoEscalate: false,
    },
    {
      id: "trig-repeated-failure",
      category: "repeated_failure",
      severity: "medium",
      description: "Agent failed to complete the same type of task 3+ times",
      confidenceThreshold: 0,
      autoEscalate: false,
    },
    {
      id: "trig-financial-impact",
      category: "financial_impact",
      severity: "high",
      description: "Action involves significant financial impact",
      confidenceThreshold: 0,
      autoEscalate: true,
    },
  ];

  return createTriggerRegistry(triggers);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityRank(severity: EscalationSeverity): number {
  const ranks: Record<EscalationSeverity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return ranks[severity];
}

function financialThreshold(severity: EscalationSeverity): number {
  const thresholds: Record<EscalationSeverity, number> = {
    low: 10000,
    medium: 5000,
    high: 1000,
    critical: 100,
  };
  return thresholds[severity];
}

function buildEventContext(
  trigger: EscalationTrigger,
  context: EvaluationContext
): string {
  const parts: string[] = [`Trigger: ${trigger.description}`];

  if (context.policyViolations.length > 0) {
    parts.push(`Policy violations: ${context.policyViolations.join(", ")}`);
  }
  if (context.sensitiveTopics.length > 0) {
    parts.push(`Sensitive topics: ${context.sensitiveTopics.join(", ")}`);
  }
  if (context.financialImpact !== null) {
    parts.push(`Financial impact: $${context.financialImpact}`);
  }
  parts.push(`Confidence: ${context.currentConfidence}`);
  parts.push(`Consecutive failures: ${context.consecutiveFailures}`);

  return parts.join(" | ");
}

function recommendAction(
  trigger: EscalationTrigger,
  context: EvaluationContext
): string {
  if (trigger.autoEscalate) {
    return `Auto-escalate to human agent: ${trigger.description}`;
  }

  if (trigger.category === "confidence_below_threshold") {
    return `Consider escalation: confidence at ${context.currentConfidence} (threshold: ${trigger.confidenceThreshold})`;
  }

  if (trigger.category === "repeated_failure") {
    return `Review after ${context.consecutiveFailures} consecutive failures`;
  }

  return `Monitor and escalate if condition persists`;
}
