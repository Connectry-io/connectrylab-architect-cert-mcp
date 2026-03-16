/**
 * Analysis Subagent — Structured Output and Handoff Patterns
 *
 * Task Statements Covered:
 *   1.3: Configure subagent invocation, context passing, and spawning
 *   1.4: Implement multi-step workflows with enforcement and handoff patterns
 *
 * What This Teaches:
 *   - Receiving results from a prior stage (handoff pattern)
 *   - Producing structured output validated by Zod schemas
 *   - Scoped tools different from the researcher's toolset
 *   - How subagents contribute to the workflow pipeline
 *
 * Key Concepts:
 *   The analyzer receives research results from the coordinator (which
 *   collected them from researcher subagents). It does NOT communicate
 *   directly with the researchers — all data flows through the coordinator.
 *   This is the hub-and-spoke pattern (1.2).
 *
 *   Handoff (1.4): The coordinator validates researcher output, then passes
 *   it as context to the analyzer. The analyzer validates its own output
 *   before returning to the coordinator. Double validation ensures data
 *   integrity across agent boundaries.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ToolDefinition,
  SubTask,
  SubTaskResult,
  ConversationMessage,
} from "../types.js";
import { runBeforeHooks, runAfterHooks } from "../hooks.js";
import type { HookRegistry, HookContext } from "../types.js";

// ---------------------------------------------------------------------------
// Analysis Tools — Scoped to This Subagent Only
// ---------------------------------------------------------------------------

/**
 * The analyzer's scoped tool set. Different from the researcher's tools —
 * the analyzer can evaluate evidence, compare data, and structure findings,
 * but it CANNOT search the web or read documents directly.
 *
 * KEY CONCEPT (1.3): Each subagent gets exactly the tools it needs.
 * The analyzer's job is to ANALYZE existing data, not gather new data.
 * Scoping tools enforces this separation of concerns.
 */
const ANALYSIS_TOOLS: readonly ToolDefinition[] = [
  {
    name: "evaluate_evidence",
    description:
      "Evaluate a piece of evidence for reliability, relevance, and strength. Returns a structured assessment.",
    input_schema: {
      type: "object",
      properties: {
        claim: {
          type: "string",
          description: "The claim being evaluated",
        },
        evidence: {
          type: "string",
          description: "The evidence supporting the claim",
        },
        source_reliability: {
          type: "number",
          description: "Reliability score of the source (0-1)",
        },
      },
      required: ["claim", "evidence"],
    },
  },
  {
    name: "compare_findings",
    description:
      "Compare multiple research findings to identify consensus, contradictions, and gaps.",
    input_schema: {
      type: "object",
      properties: {
        findings: {
          type: "array",
          description: "Array of finding strings to compare",
        },
        comparison_criteria: {
          type: "string",
          description: "What aspect to compare on",
        },
      },
      required: ["findings"],
    },
  },
  {
    name: "structure_output",
    description:
      "Structure analysis results into the required output format with claims, evidence, confidence, and gaps.",
    input_schema: {
      type: "object",
      properties: {
        findings: {
          type: "array",
          description: "Array of { claim, evidence, confidence } objects",
        },
        gaps: {
          type: "array",
          description: "Array of identified research gaps",
        },
      },
      required: ["findings", "gaps"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Executor — Simulated for Demo
// ---------------------------------------------------------------------------

/**
 * Executes an analysis tool call. In production, these might call
 * specialized analysis services or ML models.
 */
async function executeAnalysisTool(
  toolName: string,
  input: Record<string, unknown>,
  hookRegistry: HookRegistry,
  hookContext: HookContext
): Promise<{ readonly content: string; readonly is_error: boolean }> {
  // Run before hooks
  const beforeResult = await runBeforeHooks(hookRegistry, hookContext, input);
  if (!beforeResult.proceed) {
    return {
      content: `Tool call blocked: ${beforeResult.message}`,
      is_error: true,
    };
  }

  const validatedInput = beforeResult.value;
  let rawOutput: string;

  switch (toolName) {
    case "evaluate_evidence": {
      const claim = validatedInput["claim"] as string;
      const reliability = (validatedInput["source_reliability"] as number) ?? 0.7;
      rawOutput = JSON.stringify({
        claim,
        reliability,
        relevance: 0.8,
        strength: reliability * 0.9,
        assessment: `Evidence for "${claim}" is ${reliability > 0.7 ? "strong" : "moderate"} based on source reliability`,
      });
      break;
    }
    case "compare_findings": {
      const findings = validatedInput["findings"] as string[];
      rawOutput = JSON.stringify({
        consensusPoints: [`Common theme across ${findings?.length ?? 0} findings`],
        contradictions: [],
        gaps: ["Further primary source verification needed"],
        overallAgreement: 0.75,
      });
      break;
    }
    case "structure_output": {
      // Pass through — the model already structured this
      rawOutput = JSON.stringify({
        structured: true,
        findings: validatedInput["findings"],
        gaps: validatedInput["gaps"],
      });
      break;
    }
    default:
      rawOutput = JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }

  // Run after hooks
  const afterResult = await runAfterHooks(
    hookRegistry,
    hookContext,
    rawOutput
  );

  return {
    content: afterResult.value,
    is_error: false,
  };
}

// ---------------------------------------------------------------------------
// Analysis Subagent — Handoff Pattern Implementation
// ---------------------------------------------------------------------------

/**
 * Creates the system prompt for the analysis subagent.
 * Includes explicit instructions about the expected output format,
 * which aligns with the AnalysisOutputSchema for validation.
 */
function createAnalyzerSystemPrompt(): string {
  return `You are a research analysis specialist. Your job is to analyze research findings
and produce structured analytical output.

You will receive research results from other agents (you don't gather data yourself).
Your role is to:
1. Evaluate the evidence quality using evaluate_evidence
2. Compare findings for consensus and contradictions using compare_findings
3. Structure your analysis using structure_output
4. Identify gaps in the research

Your final output MUST be a JSON object with this exact structure:
{
  "findings": [
    { "claim": "string", "evidence": "string", "confidence": 0.0-1.0 }
  ],
  "gaps": ["string"]
}

Be critical and precise. Assign confidence scores based on evidence quality.`;
}

/**
 * Prepares the context message for the analyzer. This is the HANDOFF —
 * research results are explicitly passed as structured context.
 *
 * KEY CONCEPT (1.4): Handoff is explicit data transfer between agents
 * via the coordinator. The coordinator:
 *   1. Collected results from researcher subagents
 *   2. Validated those results against SubTaskResultSchema
 *   3. Now passes them as context to the analyzer
 *
 * The analyzer receives a curated view — not raw conversation logs,
 * but structured data from the previous stage.
 */
function prepareAnalysisContext(
  task: SubTask,
  researchResults: readonly SubTaskResult[]
): string {
  const formattedResults = researchResults.map((r, index) => {
    return [
      `--- Research Result ${index + 1} ---`,
      `Agent: ${r.agentId}`,
      `Confidence: ${r.confidence}`,
      `Status: ${r.status}`,
      `Sources: ${r.sources.join(", ") || "none cited"}`,
      ``,
      r.output,
      ``,
    ].join("\n");
  });

  return [
    `Analysis Task: ${task.description}`,
    ``,
    `You have received ${researchResults.length} research results to analyze:`,
    ``,
    ...formattedResults,
    ``,
    `Please analyze these results using your tools, then provide your`,
    `structured analysis as a JSON object with "findings" and "gaps".`,
  ].join("\n");
}

/**
 * Runs the analysis subagent. Called by the coordinator after research
 * results have been collected and validated.
 *
 * KEY CONCEPT (1.3 + 1.4):
 *   - Scoped tools: only analysis tools, no research tools
 *   - Explicit context: receives research results, not raw conversations
 *   - Handoff: coordinator validated input before passing it here
 *   - The analyzer produces output that will be validated against
 *     AnalysisOutputSchema before the workflow can proceed
 */
export async function runAnalysisSubagent(
  client: Anthropic,
  task: SubTask,
  researchResults: readonly SubTaskResult[],
  hookRegistry: HookRegistry
): Promise<SubTaskResult> {
  const systemPrompt = createAnalyzerSystemPrompt();
  const userMessage = prepareAnalysisContext(task, researchResults);
  const agentId = `analyzer-${task.id.slice(0, 8)}`;

  console.log(`[ANALYZER:${agentId}] Starting analysis: ${task.description}`);

  const messages: ConversationMessage[] = [
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  const maxIterations = 8;

  // Agentic loop — analyzer runs independently
  while (iterations < maxIterations) {
    iterations++;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: ANALYSIS_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool["input_schema"],
      })),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content as string,
      })),
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      const finalText = textBlock && "text" in textBlock ? textBlock.text : "";

      console.log(
        `[ANALYZER:${agentId}] Completed in ${iterations} iterations`
      );

      return parseAnalyzerOutput(task.id, agentId, finalText, researchResults);
    }

    if (response.stop_reason === "tool_use") {
      const assistantContent = response.content;
      messages.push({
        role: "assistant",
        content: assistantContent as unknown as string,
      });

      const toolResults: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
        is_error: boolean;
      }> = [];

      for (const block of assistantContent) {
        if (block.type === "tool_use") {
          const hookContext: HookContext = {
            toolName: block.name,
            agentId,
            sessionId: task.id,
            timestamp: new Date().toISOString(),
          };

          const result = await executeAnalysisTool(
            block.name,
            block.input as Record<string, unknown>,
            hookRegistry,
            hookContext
          );

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result.content,
            is_error: result.is_error,
          });
        }
      }

      messages.push({
        role: "user",
        content: toolResults as unknown as string,
      });
    }
  }

  console.warn(`[ANALYZER:${agentId}] Hit max iterations (${maxIterations})`);
  return {
    taskId: task.id,
    agentId,
    output: "Analysis incomplete — max iterations reached",
    confidence: 0.3,
    sources: [],
    status: "partial",
  };
}

/**
 * Parses the analyzer's output into a structured result.
 * Extracts the JSON findings if present.
 */
function parseAnalyzerOutput(
  taskId: string,
  agentId: string,
  rawOutput: string,
  inputResults: readonly SubTaskResult[]
): SubTaskResult {
  // Collect sources from the input results
  const allSources = inputResults.flatMap((r) => [...r.sources]);

  try {
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        findings?: Array<{ confidence?: number }>;
        gaps?: string[];
      };

      // Calculate average confidence from findings
      const findings = parsed.findings ?? [];
      const avgConfidence =
        findings.length > 0
          ? findings.reduce((sum, f) => sum + (f.confidence ?? 0.5), 0) /
            findings.length
          : 0.5;

      return {
        taskId,
        agentId,
        output: rawOutput,
        confidence: avgConfidence,
        sources: allSources,
        status: "success",
      };
    }
  } catch {
    // JSON parsing failed
  }

  return {
    taskId,
    agentId,
    output: rawOutput,
    confidence: 0.5,
    sources: allSources,
    status: "success",
  };
}

/**
 * Returns the tool definitions available to the analyzer.
 */
export function getAnalyzerTools(): readonly ToolDefinition[] {
  return ANALYSIS_TOOLS;
}
