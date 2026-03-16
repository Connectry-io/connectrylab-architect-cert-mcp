/**
 * Responder Subagent — Response Drafting with Few-Shot Examples
 *
 * Task Statements Covered:
 *   D4: 4.2 — Few-shot examples establish tone, structure, and quality
 *   D4: 4.4 — Output validation against quality checklist
 *   D5: 5.6 — Provenance attached to response claims
 *
 * The responder takes the analysis and research results, then drafts
 * a customer-facing response. It uses few-shot examples (D4: 4.2) to
 * match the appropriate tone and structure, and validates the output
 * against a quality checklist (D4: 4.4) before returning.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentResult,
  DraftResponse,
  Ticket,
  TicketAnalysis,
  ResearchResult,
  SessionContext,
  ProvenanceEntry,
} from "../types.js";
import { ResponseDraftSchema } from "../prompts/schemas.js";
import {
  buildFewShotSection,
  RESPONSE_QUALITY_PROMPT,
} from "../prompts/few-shot-templates.js";
import {
  successResult,
  failedResult,
  partialResult,
  buildMetadata,
  apiError,
  parseError,
  validationFailedError,
} from "../context/error-propagation.js";
import {
  fromAgentInference,
  mergeProvenance,
} from "../context/provenance.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_ID = "responder";
const MODEL = "claude-sonnet-4-20250514";

// ---------------------------------------------------------------------------
// Structured Output Tool
// ---------------------------------------------------------------------------

const RESPONSE_DRAFT_TOOL: Anthropic.Tool = {
  name: "submit_response",
  description:
    "Submit your drafted customer response. You MUST call this tool with the response.",
  input_schema: {
    type: "object" as const,
    properties: {
      subject: {
        type: "string",
        description: "Email subject line (5-120 chars)",
      },
      greeting: {
        type: "string",
        description: "Personalized greeting",
      },
      body: {
        type: "string",
        description: "Main response content (min 50 chars)",
      },
      closingAction: {
        type: "string",
        description: "Next step or call to action",
      },
      signature: {
        type: "string",
        description: "Professional sign-off",
      },
      tone: {
        type: "string",
        enum: ["empathetic", "professional", "technical"],
        description: "Tone used in this response",
      },
      internalNotes: {
        type: "string",
        description: "Notes for the support team (not sent to customer)",
      },
    },
    required: [
      "subject",
      "greeting",
      "body",
      "closingAction",
      "signature",
      "tone",
      "internalNotes",
    ],
  },
};

// ---------------------------------------------------------------------------
// System Prompt Builder
// ---------------------------------------------------------------------------

function buildResponderPrompt(
  ticket: Ticket,
  analysis: TicketAnalysis,
  research: ResearchResult,
  session: SessionContext
): string {
  const fewShotSection = buildFewShotSection(analysis.category);

  return `You are a customer support response writer. Your job is to draft a helpful, accurate, and appropriately-toned response to a customer's support ticket.

## Context

### Ticket
- **ID**: ${ticket.id}
- **Subject**: ${ticket.subject}
- **Customer**: ${ticket.customerEmail}
- **Category**: ${analysis.category}
- **Priority**: ${analysis.priority}
- **Sentiment**: ${analysis.sentiment}

### Customer Message
${ticket.body}

### Analysis
- **Key Issues**: ${analysis.keyIssues.join(", ")}
- **Suggested Actions**: ${analysis.suggestedActions.join(", ")}
- **Requires Escalation**: ${analysis.requiresEscalation}

### Research Findings
${research.articles.length > 0 ? research.articles.map((a) => `- **${a.title}** (${a.id}): ${a.content.slice(0, 200)}...`).join("\n") : "No relevant articles found."}

### Customer Preferences
- Communication style: ${session.customerPreferences.communicationStyle}
- Previous issues: ${session.customerPreferences.previousIssueCategories.join(", ") || "none"}

## Tone Selection Rules
- If sentiment is "frustrated" → use "empathetic" tone
- If sentiment is "neutral" and category is "technical" → use "technical" tone
- If sentiment is "neutral" and category is not "technical" → use "professional" tone
- If sentiment is "satisfied" → use "professional" tone
- Override: if customer preference is "technical", always use "technical" tone

${fewShotSection}

${RESPONSE_QUALITY_PROMPT}

## Instructions
1. Study the few-shot examples above to match expected tone and structure
2. Draft a response that addresses ALL key issues identified in the analysis
3. Include specific, actionable steps from the research findings
4. Reference knowledge base articles by their actions, not by KB ID (customer doesn't know KB IDs)
5. Run through the quality checklist before submitting
6. Submit your response using the submit_response tool

IMPORTANT: Every claim in your response must be traceable to the research findings or ticket data. Do not invent information.`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Draft a customer-facing response using few-shot examples and
 * quality validation.
 */
export async function runResponder(
  client: Anthropic,
  ticket: Ticket,
  analysis: TicketAnalysis,
  research: ResearchResult,
  session: SessionContext
): Promise<AgentResult<DraftResponse>> {
  const startTime = Date.now();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: buildResponderPrompt(ticket, analysis, research, session),
      tools: [RESPONSE_DRAFT_TOOL],
      tool_choice: { type: "tool", name: "submit_response" },
      messages: [
        {
          role: "user",
          content: `Draft a response for ticket ${ticket.id}. Address all ${analysis.keyIssues.length} identified issues. Use an ${determineTone(analysis, session)} tone.`,
        },
      ],
    });

    // Extract tool call
    const toolUse = response.content.find(
      (b) => b.type === "tool_use" && b.name === "submit_response"
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      return failedResult(
        parseError(AGENT_ID, "Model did not call submit_response tool"),
        buildMetadata(AGENT_ID, startTime, {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        })
      );
    }

    // Validate structure
    const rawInput = toolUse.input as Record<string, unknown>;
    const draftInput = {
      ticketId: ticket.id,
      subject: rawInput["subject"],
      body: assembleResponseBody(rawInput),
      tone: rawInput["tone"],
      suggestedActions: analysis.suggestedActions,
      internalNotes: rawInput["internalNotes"] ?? "",
      provenance: research.provenance,
    };

    const parsed = ResponseDraftSchema.safeParse(draftInput);

    if (!parsed.success) {
      const issues = parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`
      );

      // Attempt partial salvage
      if (rawInput["body"] && typeof rawInput["body"] === "string") {
        const partial: DraftResponse = {
          ticketId: ticket.id,
          subject: typeof rawInput["subject"] === "string" ? rawInput["subject"] : `Re: ${ticket.subject}`,
          body: assembleResponseBody(rawInput),
          tone: determineTone(analysis, session),
          suggestedActions: analysis.suggestedActions,
          internalNotes: typeof rawInput["internalNotes"] === "string" ? rawInput["internalNotes"] : "",
          provenance: research.provenance,
        };

        return partialResult(
          partial,
          validationFailedError(AGENT_ID, issues),
          buildMetadata(
            AGENT_ID,
            startTime,
            {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
            },
            research.provenance
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

    // Attach full provenance chain
    const responseProvenance = mergeProvenance(
      research.provenance,
      [fromAgentInference(AGENT_ID, "Response drafted from research findings", 0.85)]
    );

    const draft: DraftResponse = {
      ticketId: ticket.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
      tone: parsed.data.tone,
      suggestedActions: analysis.suggestedActions,
      internalNotes: parsed.data.internalNotes,
      provenance: responseProvenance,
    };

    return successResult(
      draft,
      buildMetadata(
        AGENT_ID,
        startTime,
        {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        responseProvenance
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

/**
 * Determine the appropriate tone based on analysis and customer preferences.
 */
function determineTone(
  analysis: TicketAnalysis,
  session: SessionContext
): DraftResponse["tone"] {
  // Customer preference override
  if (session.customerPreferences.communicationStyle === "technical") {
    return "technical";
  }

  if (analysis.sentiment === "frustrated") return "empathetic";
  if (analysis.category === "technical") return "technical";
  return "professional";
}

/**
 * Assemble the full response body from the structured tool output.
 * Combines greeting, body, closing, and signature into a single string.
 */
function assembleResponseBody(rawInput: Record<string, unknown>): string {
  const parts = [
    rawInput["greeting"],
    rawInput["body"],
    rawInput["closingAction"],
    rawInput["signature"],
  ].filter((p) => typeof p === "string" && p.length > 0);

  return parts.join("\n\n");
}
