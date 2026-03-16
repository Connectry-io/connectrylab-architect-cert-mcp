/**
 * Analyzer Subagent — Ticket Classification & Structured Extraction
 *
 * Task Statements Covered:
 *   D1: 1.3 — Scoped subagent with focused responsibility
 *   D4: 4.1 — Explicit evaluation criteria in the classification prompt
 *   D4: 4.3 — Structured output via Zod-validated tool_use
 *
 * The analyzer receives a raw ticket and produces a structured
 * TicketAnalysis. It uses the extraction prompt (D4: 4.1) which
 * contains explicit criteria for each classification field, and
 * enforces output structure through a tool_use pattern with Zod
 * validation (D4: 4.3).
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AgentResult, Ticket, TicketAnalysis } from "../types.js";
import { TicketClassificationSchema } from "../prompts/schemas.js";
import { TICKET_CLASSIFICATION_PROMPT } from "../prompts/extraction.js";
import {
  successResult,
  failedResult,
  partialResult,
  buildMetadata,
  apiError,
  parseError,
  validationFailedError,
} from "../context/error-propagation.js";
import { fromAgentInference } from "../context/provenance.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_ID = "analyzer";
const MODEL = "claude-sonnet-4-20250514";

// ---------------------------------------------------------------------------
// Structured Output Tool (D4: 4.3)
// ---------------------------------------------------------------------------

/**
 * We define a "classification" tool that the model must call to submit
 * its analysis. The input_schema matches our Zod schema, ensuring the
 * model produces exactly the shape we need.
 */
const CLASSIFICATION_TOOL: Anthropic.Tool = {
  name: "submit_classification",
  description:
    "Submit your ticket classification. You MUST call this tool with your analysis results.",
  input_schema: {
    type: "object" as const,
    properties: {
      category: {
        type: "string",
        enum: ["billing", "technical", "account", "product", "general"],
        description: "Primary ticket category",
      },
      priority: {
        type: "string",
        enum: ["critical", "high", "medium", "low"],
        description: "Urgency level",
      },
      sentiment: {
        type: "string",
        enum: ["frustrated", "neutral", "satisfied"],
        description: "Customer emotional state",
      },
      keyIssues: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 5,
        description: "Distinct issues identified, most important first",
      },
      suggestedActions: {
        type: "array",
        items: { type: "string" },
        description: "Recommended next steps",
      },
      requiresEscalation: {
        type: "boolean",
        description: "Whether this ticket needs human escalation",
      },
      escalationReason: {
        type: "string",
        description: "Required if requiresEscalation is true",
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Classification confidence (0-1)",
      },
    },
    required: [
      "category",
      "priority",
      "sentiment",
      "keyIssues",
      "suggestedActions",
      "requiresEscalation",
      "confidence",
    ],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a support ticket and produce a structured classification.
 * Uses explicit criteria prompting (D4: 4.1) and structured output
 * via tool_use (D4: 4.3).
 */
export async function runAnalyzer(
  client: Anthropic,
  ticket: Ticket
): Promise<AgentResult<TicketAnalysis>> {
  const startTime = Date.now();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: TICKET_CLASSIFICATION_PROMPT,
      tools: [CLASSIFICATION_TOOL],
      tool_choice: { type: "tool", name: "submit_classification" },
      messages: [
        {
          role: "user",
          content: buildAnalysisRequest(ticket),
        },
      ],
    });

    // Extract the tool_use block
    const toolUse = response.content.find(
      (b) => b.type === "tool_use" && b.name === "submit_classification"
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      return failedResult(
        parseError(AGENT_ID, "Model did not call submit_classification tool"),
        buildMetadata(AGENT_ID, startTime, {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        })
      );
    }

    // Validate with Zod (D4: 4.3 — runtime validation of structured output)
    const parsed = TicketClassificationSchema.safeParse(toolUse.input);

    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      );

      // Try to salvage partial data
      const rawInput = toolUse.input as Record<string, unknown>;
      if (rawInput["category"] && rawInput["priority"]) {
        const partialAnalysis: TicketAnalysis = {
          ticketId: ticket.id,
          category: (rawInput["category"] as TicketAnalysis["category"]) ?? "general",
          priority: (rawInput["priority"] as TicketAnalysis["priority"]) ?? "medium",
          sentiment: (rawInput["sentiment"] as TicketAnalysis["sentiment"]) ?? "neutral",
          keyIssues: Array.isArray(rawInput["keyIssues"])
            ? (rawInput["keyIssues"] as string[])
            : [ticket.subject],
          suggestedActions: Array.isArray(rawInput["suggestedActions"])
            ? (rawInput["suggestedActions"] as string[])
            : [],
          requiresEscalation: Boolean(rawInput["requiresEscalation"]),
          escalationReason: rawInput["escalationReason"] as string | undefined,
        };

        return partialResult(
          partialAnalysis,
          validationFailedError(AGENT_ID, issues),
          buildMetadata(
            AGENT_ID,
            startTime,
            {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
            },
            [fromAgentInference(AGENT_ID, "Partial classification with validation errors", 0.5)]
          )
        );
      }

      return failedResult(
        validationFailedError(AGENT_ID, issues),
        buildMetadata(AGENT_ID, startTime, {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        })
      );
    }

    // Build the validated TicketAnalysis
    const analysis: TicketAnalysis = {
      ticketId: ticket.id,
      category: parsed.data.category,
      priority: parsed.data.priority,
      sentiment: parsed.data.sentiment,
      keyIssues: parsed.data.keyIssues,
      suggestedActions: parsed.data.suggestedActions,
      requiresEscalation: parsed.data.requiresEscalation,
      escalationReason: parsed.data.escalationReason,
    };

    const confidence = parsed.data.confidence;
    const provenance = [
      fromAgentInference(
        AGENT_ID,
        `Classification confidence: ${confidence}`,
        confidence
      ),
    ];

    return successResult(
      analysis,
      buildMetadata(
        AGENT_ID,
        startTime,
        {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        provenance
      )
    );
  } catch (error) {
    return failedResult(
      apiError(AGENT_ID, error instanceof Error ? error.message : String(error)),
      buildMetadata(AGENT_ID, startTime, { inputTokens: 0, outputTokens: 0 })
    );
  }
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function buildAnalysisRequest(ticket: Ticket): string {
  const historySection =
    ticket.history.length > 0
      ? `\n\n## Ticket History\n${ticket.history.map((e) => `- [${e.timestamp}] ${e.type}: ${e.detail}`).join("\n")}`
      : "";

  return `## Ticket to Classify
**ID**: ${ticket.id}
**Subject**: ${ticket.subject}
**Customer**: ${ticket.customerEmail} (${ticket.customerId})
**Created**: ${ticket.createdAt}
**Tags**: ${ticket.tags.join(", ")}

## Customer Message
${ticket.body}${historySection}

Analyze this ticket and submit your classification using the submit_classification tool. Follow the criteria in your instructions precisely.`;
}
