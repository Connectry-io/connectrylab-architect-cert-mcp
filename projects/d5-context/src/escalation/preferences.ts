/**
 * Customer Escalation Preferences — Domain 5.2
 *
 * Task Statements Covered:
 *   5.2: Escalation patterns — per-customer preferences, channel routing,
 *        topic overrides
 *
 * Key Insights:
 *   - Different customers have wildly different escalation preferences.
 *     A startup might prefer Slack; an enterprise might require PagerDuty
 *     for critical issues and email for everything else.
 *   - Topic overrides let customers customize escalation by domain.
 *     "Billing issues always go to finance@company.com via email"
 *   - The preference system layers on top of the trigger system: triggers
 *     decide IF to escalate; preferences decide HOW and WHERE.
 *
 * Mental Model: "Triggers = what fires; Preferences = where it routes"
 */

import { z } from "zod";
import type {
  CustomerEscalationPreferences,
  EscalationCategory,
  EscalationChannel,
  EscalationContact,
  EscalationEvent,
  EscalationSeverity,
  TopicOverride,
} from "../types.js";

// ---------------------------------------------------------------------------
// Preference Store
// ---------------------------------------------------------------------------

/**
 * An immutable store of customer escalation preferences.
 * In production this would be backed by a database; here we use
 * an in-memory map for demonstration.
 */
export interface PreferenceStore {
  readonly preferences: ReadonlyMap<string, CustomerEscalationPreferences>;
}

/**
 * Creates an empty preference store.
 */
export function createPreferenceStore(): PreferenceStore {
  return { preferences: new Map() };
}

/**
 * Adds or replaces preferences for a customer. Returns a new store.
 */
export function setCustomerPreferences(
  store: PreferenceStore,
  prefs: CustomerEscalationPreferences
): PreferenceStore {
  const updated = new Map(store.preferences);
  updated.set(prefs.customerId, prefs);
  return { preferences: updated };
}

/**
 * Retrieves preferences for a customer, or null if not configured.
 */
export function getCustomerPreferences(
  store: PreferenceStore,
  customerId: string
): CustomerEscalationPreferences | null {
  return store.preferences.get(customerId) ?? null;
}

// ---------------------------------------------------------------------------
// Routing Decision
// ---------------------------------------------------------------------------

/**
 * A routing decision combines the trigger's escalation event with the
 * customer's preferred channel and contacts.
 */
export interface RoutingDecision {
  readonly event: EscalationEvent;
  readonly channel: EscalationChannel;
  readonly contacts: readonly EscalationContact[];
  readonly bypassAutoResolve: boolean;
  readonly appliedOverride: TopicOverride | null;
}

/**
 * Routes an escalation event according to customer preferences.
 * The routing logic:
 *
 * 1. Check if the customer has a topic override matching the event
 * 2. If yes, use the override's channel and settings
 * 3. If no, check if the event's category is in alwaysEscalateCategories
 * 4. Fall back to the customer's default channel
 * 5. Select contacts based on the resolved channel
 */
export function routeEscalation(
  event: EscalationEvent,
  prefs: CustomerEscalationPreferences
): RoutingDecision {
  // Step 1: Check topic overrides
  const override = findTopicOverride(event, prefs.topicOverrides);

  if (override) {
    return {
      event,
      channel: override.channel,
      contacts: filterContactsByChannel(prefs.escalationContacts, override.channel),
      bypassAutoResolve: override.bypassAutoResolve,
      appliedOverride: override,
    };
  }

  // Step 2: Check if category is always-escalate
  const isAlwaysEscalate = prefs.alwaysEscalateCategories.includes(
    event.trigger.category
  );

  // Step 3: Use default channel, potentially upgraded for critical severity
  const channel = selectChannel(event.trigger.severity, prefs.defaultChannel);

  return {
    event,
    channel,
    contacts: filterContactsByChannel(prefs.escalationContacts, channel),
    bypassAutoResolve: isAlwaysEscalate || prefs.neverAutoResolve,
    appliedOverride: null,
  };
}

/**
 * Routes multiple escalation events for the same customer. Events are
 * deduplicated by trigger category — if both a "low confidence" and a
 * "policy violation" trigger fire, both are routed independently.
 */
export function routeMultipleEscalations(
  events: readonly EscalationEvent[],
  prefs: CustomerEscalationPreferences
): readonly RoutingDecision[] {
  // Deduplicate by category, keeping highest severity
  const byCategory = new Map<EscalationCategory, EscalationEvent>();

  for (const event of events) {
    const existing = byCategory.get(event.trigger.category);
    if (
      !existing ||
      severityRank(event.trigger.severity) >
        severityRank(existing.trigger.severity)
    ) {
      byCategory.set(event.trigger.category, event);
    }
  }

  return [...byCategory.values()].map((event) =>
    routeEscalation(event, prefs)
  );
}

// ---------------------------------------------------------------------------
// Default Preference Builder
// ---------------------------------------------------------------------------

/**
 * Builder for creating customer preferences with sensible defaults.
 * Uses an immutable builder pattern — each method returns a new builder.
 */
export interface PreferenceBuilder {
  readonly customerId: string;
  readonly defaultChannel: EscalationChannel;
  readonly topicOverrides: readonly TopicOverride[];
  readonly alwaysEscalateCategories: readonly EscalationCategory[];
  readonly neverAutoResolve: boolean;
  readonly escalationContacts: readonly EscalationContact[];
}

export function createPreferenceBuilder(
  customerId: string
): PreferenceBuilder {
  return {
    customerId,
    defaultChannel: "email",
    topicOverrides: [],
    alwaysEscalateCategories: [],
    neverAutoResolve: false,
    escalationContacts: [],
  };
}

export function withDefaultChannel(
  builder: PreferenceBuilder,
  channel: EscalationChannel
): PreferenceBuilder {
  return { ...builder, defaultChannel: channel };
}

export function withTopicOverride(
  builder: PreferenceBuilder,
  override: TopicOverride
): PreferenceBuilder {
  return {
    ...builder,
    topicOverrides: [...builder.topicOverrides, override],
  };
}

export function withAlwaysEscalate(
  builder: PreferenceBuilder,
  category: EscalationCategory
): PreferenceBuilder {
  return {
    ...builder,
    alwaysEscalateCategories: [
      ...builder.alwaysEscalateCategories,
      category,
    ],
  };
}

export function withContact(
  builder: PreferenceBuilder,
  contact: EscalationContact
): PreferenceBuilder {
  return {
    ...builder,
    escalationContacts: [...builder.escalationContacts, contact],
  };
}

export function withNeverAutoResolve(
  builder: PreferenceBuilder
): PreferenceBuilder {
  return { ...builder, neverAutoResolve: true };
}

export function buildPreferences(
  builder: PreferenceBuilder
): CustomerEscalationPreferences {
  return {
    customerId: builder.customerId,
    defaultChannel: builder.defaultChannel,
    topicOverrides: builder.topicOverrides,
    alwaysEscalateCategories: builder.alwaysEscalateCategories,
    neverAutoResolve: builder.neverAutoResolve,
    escalationContacts: builder.escalationContacts,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const CustomerPreferencesSchema = z.object({
  customerId: z.string().min(1),
  defaultChannel: z.enum(["email", "slack", "pagerduty", "in_app"]),
  topicOverrides: z.array(
    z.object({
      topic: z.string().min(1),
      channel: z.enum(["email", "slack", "pagerduty", "in_app"]),
      severity: z.enum(["low", "medium", "high", "critical"]),
      bypassAutoResolve: z.boolean(),
    })
  ),
  alwaysEscalateCategories: z.array(
    z.enum([
      "policy_violation",
      "confidence_below_threshold",
      "sensitive_topic",
      "customer_request",
      "repeated_failure",
      "financial_impact",
    ])
  ),
  neverAutoResolve: z.boolean(),
  escalationContacts: z.array(
    z.object({
      name: z.string().min(1),
      channel: z.enum(["email", "slack", "pagerduty", "in_app"]),
      address: z.string().min(1),
      priority: z.number().min(1),
    })
  ),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findTopicOverride(
  event: EscalationEvent,
  overrides: readonly TopicOverride[]
): TopicOverride | null {
  // Match on trigger description containing the override topic
  return (
    overrides.find((o) =>
      event.context.toLowerCase().includes(o.topic.toLowerCase())
    ) ?? null
  );
}

function filterContactsByChannel(
  contacts: readonly EscalationContact[],
  channel: EscalationChannel
): readonly EscalationContact[] {
  const matched = contacts.filter((c) => c.channel === channel);
  // If no contacts match the channel, return all sorted by priority
  if (matched.length === 0) {
    return [...contacts].sort((a, b) => a.priority - b.priority);
  }
  return [...matched].sort((a, b) => a.priority - b.priority);
}

/**
 * For critical severity events, upgrade the channel to PagerDuty
 * if the default is a lower-urgency channel.
 */
function selectChannel(
  severity: EscalationSeverity,
  defaultChannel: EscalationChannel
): EscalationChannel {
  if (severity === "critical" && defaultChannel !== "pagerduty") {
    return "pagerduty";
  }
  return defaultChannel;
}

function severityRank(severity: EscalationSeverity): number {
  const ranks: Record<EscalationSeverity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return ranks[severity];
}
