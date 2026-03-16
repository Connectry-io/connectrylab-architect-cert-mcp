/**
 * Prompt Schemas — Zod Schemas for Structured LLM Output
 *
 * Task Statements Covered:
 *   D4: 4.3 — Constrain model output with structured formats (Zod schemas
 *              used with tool_use to enforce JSON structure)
 *
 * These schemas define the exact shape of data the model must produce
 * at each stage of the support pipeline. By using tool_use with these
 * schemas as the input_schema, we get guaranteed valid JSON output.
 *
 * Pattern: Define Zod schema → convert to JSON Schema → register as
 * tool input_schema → model "calls" the tool with structured data.
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ---------------------------------------------------------------------------
// Ticket Classification Schema (used by Analyzer)
// ---------------------------------------------------------------------------

export const TicketClassificationSchema = z.object({
  category: z
    .enum(["billing", "technical", "account", "product", "general"])
    .describe("The primary category this ticket belongs to"),
  priority: z
    .enum(["critical", "high", "medium", "low"])
    .describe("Urgency level based on impact and customer tier"),
  sentiment: z
    .enum(["frustrated", "neutral", "satisfied"])
    .describe("Customer emotional state inferred from tone and language"),
  keyIssues: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("List of distinct issues identified in the ticket, most important first"),
  suggestedActions: z
    .array(z.string())
    .describe("Recommended next steps for the support agent"),
  requiresEscalation: z
    .boolean()
    .describe("Whether this ticket needs human escalation"),
  escalationReason: z
    .string()
    .optional()
    .describe("Required if requiresEscalation is true — explain why"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Model confidence in this classification (0-1)"),
});

export type TicketClassification = z.infer<typeof TicketClassificationSchema>;

// ---------------------------------------------------------------------------
// Research Summary Schema (used by Researcher)
// ---------------------------------------------------------------------------

export const ResearchSummarySchema = z.object({
  relevantArticles: z
    .array(
      z.object({
        articleId: z.string().describe("Knowledge base article ID"),
        title: z.string().describe("Article title"),
        relevance: z
          .number()
          .min(0)
          .max(1)
          .describe("How relevant this article is to the ticket (0-1)"),
        keyExcerpt: z
          .string()
          .describe("Most relevant passage from the article"),
      })
    )
    .describe("Articles found in the knowledge base"),
  synthesizedAnswer: z
    .string()
    .min(20)
    .describe("Combined answer synthesized from all sources"),
  gaps: z
    .array(z.string())
    .describe("Information gaps — questions the KB cannot answer"),
  sources: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["knowledge_base", "ticket_history", "customer_data"]),
        confidence: z.number().min(0).max(1),
      })
    )
    .describe("Provenance tracking for the synthesized answer"),
});

export type ResearchSummary = z.infer<typeof ResearchSummarySchema>;

// ---------------------------------------------------------------------------
// Response Draft Schema (used by Responder)
// ---------------------------------------------------------------------------

export const ResponseDraftSchema = z.object({
  subject: z
    .string()
    .min(5)
    .max(120)
    .describe("Email subject line for the response"),
  greeting: z
    .string()
    .describe("Personalized greeting using customer's name if available"),
  body: z
    .string()
    .min(50)
    .describe("Main response content — clear, actionable, empathetic"),
  closingAction: z
    .string()
    .describe("Next step or call to action for the customer"),
  signature: z
    .string()
    .describe("Professional sign-off"),
  tone: z
    .enum(["empathetic", "professional", "technical"])
    .describe("The tone used in this response"),
  internalNotes: z
    .string()
    .describe("Notes visible only to support team, not sent to customer"),
});

export type ResponseDraft = z.infer<typeof ResponseDraftSchema>;

// ---------------------------------------------------------------------------
// Escalation Assessment Schema
// ---------------------------------------------------------------------------

export const EscalationAssessmentSchema = z.object({
  shouldEscalate: z.boolean(),
  trigger: z
    .enum([
      "sentiment_critical",
      "repeated_issue",
      "sla_breach",
      "customer_request",
      "technical_complexity",
      "policy_exception",
    ])
    .nullable()
    .describe("The specific escalation trigger, null if no escalation"),
  reason: z.string().describe("Human-readable explanation"),
  targetTeam: z
    .string()
    .nullable()
    .describe("Team to escalate to, e.g. 'Engineering', 'Billing Team'"),
  urgency: z
    .enum(["immediate", "next_available", "scheduled"])
    .describe("How quickly the escalation needs attention"),
});

export type EscalationAssessment = z.infer<typeof EscalationAssessmentSchema>;

// ---------------------------------------------------------------------------
// JSON Schema Conversion (for MCP tool registration)
// ---------------------------------------------------------------------------

/**
 * Convert a Zod schema to a JSON Schema object suitable for MCP
 * tool input_schema. Strips the outer $schema and $ref wrappers.
 */
export function toToolInputSchema(
  schema: z.ZodTypeAny
): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(schema, { target: "openApi3" });
  // zodToJsonSchema wraps in { $schema, ... } — we need the inner object
  const { $schema, ...rest } = jsonSchema as Record<string, unknown>;
  return { type: "object", ...rest };
}

/**
 * Create a "structured output" tool definition. The model "calls" this
 * tool to produce structured output matching the schema.
 */
export function createOutputTool(
  name: string,
  description: string,
  schema: z.ZodTypeAny
): {
  readonly name: string;
  readonly description: string;
  readonly input_schema: Record<string, unknown>;
} {
  return {
    name,
    description,
    input_schema: toToolInputSchema(schema),
  };
}
