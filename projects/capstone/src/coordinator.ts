/**
 * Coordinator — Main Orchestration Agent
 *
 * Task Statements Covered:
 *   D1: 1.1 — Agentic loop with tool calls and stop conditions
 *   D1: 1.2 — Coordinator-subagent pattern for task decomposition
 *   D1: 1.6 — Task decomposition: ticket → analysis + research + response
 *   D5: 5.1 — Session context management via session-manager
 *   D5: 5.2 — Escalation evaluation after analysis
 *   D5: 5.3 — Error propagation via AgentResult envelopes
 *
 * The coordinator is the entry point for processing a support ticket.
 * It decomposes the work into three subtasks (analysis, research,
 * response drafting), dispatches them to specialized subagents, and
 * aggregates the results. The coordinator also manages session context
 * and evaluates escalation triggers.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  CoordinatorInput,
  CoordinatorOutput,
  Ticket,
  TicketAnalysis,
  ResearchResult,
  DraftResponse,
  AgentResult,
  SessionContext,
} from "./types.js";
import { runAnalyzer } from "./subagents/analyzer.js";
import { runResearcher } from "./subagents/researcher.js";
import { runResponder } from "./subagents/responder.js";
import { handleGetTicket } from "./tools/ticket-tools.js";
import { createSession, getSession, buildCompressedContext } from "./context/session-manager.js";
import { evaluateEscalation, recordEscalation, buildEscalationPackage } from "./context/escalation.js";
import {
  successResult,
  failedResult,
  buildMetadata,
  agentError,
  aggregateStatus,
  mergeTokenUsage,
  collectProvenance,
} from "./context/error-propagation.js";
import { runPipeline, PipelineAbortError, PipelineBoundaryError } from "./workflow/pipeline.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_ID = "coordinator";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Process a support ticket end-to-end. This is the main entry point
 * called by the MCP server when the "process_ticket" tool is invoked.
 *
 * Flow:
 *   1. Fetch ticket data
 *   2. Initialize/retrieve session context
 *   3. Run analysis subagent (classification, priority, sentiment)
 *   4. Run researcher subagent (KB lookup, provenance tracking)
 *   5. Run responder subagent (draft with few-shot examples)
 *   6. Evaluate escalation triggers
 *   7. Return aggregated result
 */
export async function processTicket(
  client: Anthropic,
  input: CoordinatorInput
): Promise<AgentResult<CoordinatorOutput>> {
  const startTime = Date.now();

  try {
    const output = await runPipeline(input.ticketId, {
      fetchTicket: (ticketId) => fetchTicketAsResult(ticketId),
      analyzeTicket: (ticket) => runAnalyzer(client, ticket),
      researchTicket: (ticket, analysis) => runResearcher(client, ticket, analysis),
      draftResponse: async (ticket, analysis, research) => {
        // Ensure session exists for the responder
        let session = getSession(input.sessionId);
        if (!session) {
          session = await createSession(client, input.sessionId, ticket);
        }

        // Evaluate escalation before drafting response
        const escalationDecision = evaluateEscalation(analysis, session, ticket);
        if (escalationDecision.shouldEscalate) {
          const updatedSession = recordEscalation(session, escalationDecision);
          const _escalationPackage = buildEscalationPackage(
            ticket,
            analysis,
            updatedSession,
            escalationDecision
          );
          console.log(
            `[COORDINATOR] Escalation triggered: ${escalationDecision.trigger} → ${escalationDecision.targetTeam}`
          );
          session = updatedSession;
        }

        return runResponder(client, ticket, analysis, research, session);
      },
    });

    // Build final result with aggregated provenance
    return successResult(
      output,
      buildMetadata(
        AGENT_ID,
        startTime,
        { inputTokens: 0, outputTokens: 0 }, // Aggregated from subagents
        output.draftResponse.provenance
      )
    );
  } catch (error) {
    if (error instanceof PipelineAbortError) {
      return failedResult(
        agentError(
          "PIPELINE_ABORT",
          `Pipeline aborted at stage '${error.stage}': ${error.message}`,
          AGENT_ID,
          false,
          { stage: error.stage }
        ),
        buildMetadata(AGENT_ID, startTime, { inputTokens: 0, outputTokens: 0 })
      );
    }

    if (error instanceof PipelineBoundaryError) {
      return failedResult(
        agentError(
          "BOUNDARY_VALIDATION",
          `Stage boundary validation failed at '${error.stage}': ${error.message}`,
          AGENT_ID,
          false,
          { stage: error.stage }
        ),
        buildMetadata(AGENT_ID, startTime, { inputTokens: 0, outputTokens: 0 })
      );
    }

    return failedResult(
      agentError(
        "COORDINATOR_ERROR",
        error instanceof Error ? error.message : String(error),
        AGENT_ID,
        false
      ),
      buildMetadata(AGENT_ID, startTime, { inputTokens: 0, outputTokens: 0 })
    );
  }
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Wrap the ticket fetch tool call in an AgentResult envelope so it
 * integrates with the pipeline's error propagation system.
 */
function fetchTicketAsResult(ticketId: string): Promise<AgentResult<Ticket>> {
  const startTime = Date.now();

  const result = handleGetTicket({ ticket_id: ticketId });

  if (result.isError) {
    return Promise.resolve(
      failedResult(
        agentError(
          "TICKET_FETCH_FAILED",
          `Failed to fetch ticket '${ticketId}'`,
          AGENT_ID,
          false,
          { ticketId }
        ),
        buildMetadata(AGENT_ID, startTime, { inputTokens: 0, outputTokens: 0 })
      )
    );
  }

  try {
    const ticket = JSON.parse(result.content[0].text) as Ticket;
    return Promise.resolve(
      successResult(
        ticket,
        buildMetadata(AGENT_ID, startTime, { inputTokens: 0, outputTokens: 0 })
      )
    );
  } catch (error) {
    return Promise.resolve(
      failedResult(
        agentError(
          "PARSE_ERROR",
          `Failed to parse ticket data: ${error instanceof Error ? error.message : String(error)}`,
          AGENT_ID,
          false
        ),
        buildMetadata(AGENT_ID, startTime, { inputTokens: 0, outputTokens: 0 })
      )
    );
  }
}
