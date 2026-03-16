/**
 * Subagent Delegation (Coordinator Pattern) — Domain 5.4
 *
 * Task Statements Covered:
 *   5.4: Large codebase context management — coordinator delegates to
 *        subagents with fresh context windows, collects summaries
 *
 * Key Insights:
 *   - The coordinator NEVER reads raw files. It only sees subagent summaries.
 *     This keeps the coordinator's context clean for decision-making.
 *   - Each subagent gets a fresh context window scoped to its task.
 *     A subagent examining auth code doesn't need database schema context.
 *   - Subagent results are collected as AgentResult<SubagentSummary> so
 *     the coordinator can handle partial failures gracefully.
 *
 * Mental Model: "Coordinator = manager who reads reports; subagents = analysts
 *   who read raw data"
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentResult,
  SubagentSummary,
  SubagentTask,
} from "../types.js";
import { success, failure, partial } from "../errors/propagation.js";

// ---------------------------------------------------------------------------
// Task Planning
// ---------------------------------------------------------------------------

/**
 * Decomposes a high-level investigation goal into scoped subagent tasks.
 * Each task gets a context budget that limits how much the subagent can read.
 *
 * The coordinator uses Claude to plan the decomposition, but the key
 * constraint is that tasks must be INDEPENDENT — no subagent depends on
 * another subagent's output. This enables parallel execution.
 */
export async function planSubagentTasks(
  client: Anthropic,
  goal: string,
  availableScopes: readonly string[],
  totalContextBudget: number
): Promise<readonly SubagentTask[]> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a task planner for code investigation. Break a goal into independent subtasks.
Each subtask should examine a specific scope (set of files/directories).
Return a JSON array of objects: { description, scope: string[], contextBudget: number }
Total context budget across all tasks must not exceed ${totalContextBudget} tokens.
Tasks must be INDEPENDENT — no task should depend on another task's results.`,
    messages: [
      {
        role: "user",
        content: `Goal: ${goal}\n\nAvailable scopes:\n${availableScopes.join("\n")}`,
      },
    ],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "[]";

  return parseTaskArray(text, totalContextBudget);
}

// ---------------------------------------------------------------------------
// Subagent Execution
// ---------------------------------------------------------------------------

/**
 * Executes a single subagent task. The subagent gets a fresh context
 * window with ONLY the information relevant to its scope.
 *
 * The subagent returns a summary — never raw file contents. This is
 * critical: the coordinator must remain at the summary level.
 */
export async function executeSubagent(
  client: Anthropic,
  task: SubagentTask,
  fileContents: ReadonlyMap<string, string>
): Promise<AgentResult<SubagentSummary>> {
  const startedAt = new Date().toISOString();

  try {
    // Build scoped context: only include files matching the task's scope
    const scopedFiles = buildScopedContext(task.scope, fileContents);

    if (scopedFiles.length === 0) {
      return failure(
        "EMPTY_RESULT",
        `No files matched scope: ${task.scope.join(", ")}`,
        `subagent-${task.id}`,
        startedAt
      );
    }

    const fileContext = scopedFiles
      .map(([path, content]) => `=== ${path} ===\n${content}`)
      .join("\n\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a code analysis subagent. Analyze the provided files and produce a summary.
Return a JSON object with:
- findings: string[] (key observations, max 10)
- confidence: number (0-1, how confident you are in the analysis)
Be specific and factual. Do not speculate beyond what the code shows.`,
      messages: [
        {
          role: "user",
          content: `Task: ${task.description}\n\nFiles:\n${fileContext}`,
        },
      ],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const parsed = safeParseSubagentOutput(text);
    const tokenCost = response.usage.input_tokens + response.usage.output_tokens;

    const summary: SubagentSummary = {
      taskId: task.id,
      findings: parsed.findings,
      filesExamined: scopedFiles.map(([path]) => path),
      confidence: parsed.confidence,
      tokenCost,
    };

    return success(summary, startedAt, tokenCost);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failure(
      "INTERNAL_ERROR",
      `Subagent failed: ${message}`,
      `subagent-${task.id}`,
      startedAt
    );
  }
}

// ---------------------------------------------------------------------------
// Coordinator Fan-Out
// ---------------------------------------------------------------------------

/**
 * The coordinator's main execution loop. Fans out to multiple subagents
 * in parallel, collects their summaries, and synthesizes a final answer.
 *
 * Critical pattern: the coordinator handles partial failures. If 3 of 5
 * subagents succeed, the coordinator works with what it has and notes
 * the gaps — it does NOT fail entirely.
 */
export async function coordinatorFanOut(
  client: Anthropic,
  tasks: readonly SubagentTask[],
  fileContents: ReadonlyMap<string, string>
): Promise<AgentResult<CoordinatorOutput>> {
  const startedAt = new Date().toISOString();

  // Execute all subagents in parallel
  const results = await Promise.all(
    tasks.map((task) => executeSubagent(client, task, fileContents))
  );

  // Separate successes and failures
  const summaries: SubagentSummary[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "success" && result.data) {
      summaries.push(result.data);
    } else {
      const errorMsg = result.errors.map((e) => e.message).join("; ");
      errors.push(errorMsg);
    }
  }

  // If ALL subagents failed, the coordinator fails
  if (summaries.length === 0) {
    return failure(
      "ACCESS_FAILURE",
      `All ${tasks.length} subagents failed: ${errors.join(" | ")}`,
      "coordinator",
      startedAt
    );
  }

  // Synthesize from available summaries
  const synthesis = await synthesizeFromSummaries(client, summaries);
  const totalTokens = summaries.reduce((sum, s) => sum + s.tokenCost, 0);

  const output: CoordinatorOutput = {
    synthesis,
    subagentResults: summaries,
    failedTasks: errors,
    coverageRatio: summaries.length / tasks.length,
  };

  // Partial if some subagents failed
  if (errors.length > 0) {
    return partial(
      output,
      errors.map((msg) => ({
        code: "PARTIAL_DATA" as const,
        message: msg,
        source: "coordinator",
        recoverable: true,
        timestamp: new Date().toISOString(),
      })),
      startedAt,
      totalTokens
    );
  }

  return success(output, startedAt, totalTokens);
}

// ---------------------------------------------------------------------------
// Synthesis
// ---------------------------------------------------------------------------

/**
 * The coordinator synthesizes subagent summaries into a cohesive answer.
 * It ONLY sees summaries — never raw file contents.
 */
async function synthesizeFromSummaries(
  client: Anthropic,
  summaries: readonly SubagentSummary[]
): Promise<string> {
  const summaryText = summaries
    .map(
      (s) =>
        `Task ${s.taskId} (confidence: ${s.confidence}):\n${s.findings.map((f) => `  - ${f}`).join("\n")}`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a synthesis agent. Combine subagent findings into a cohesive summary.
Note areas of agreement, disagreement, and gaps. Be concise and factual.`,
    messages: [
      {
        role: "user",
        content: `Synthesize these subagent findings:\n\n${summaryText}`,
      },
    ],
  });

  return response.content[0]?.type === "text"
    ? response.content[0].text
    : "Synthesis failed — no output generated";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CoordinatorOutput {
  readonly synthesis: string;
  readonly subagentResults: readonly SubagentSummary[];
  readonly failedTasks: readonly string[];
  readonly coverageRatio: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildScopedContext(
  scope: readonly string[],
  fileContents: ReadonlyMap<string, string>
): readonly [string, string][] {
  const result: [string, string][] = [];

  for (const [path, content] of fileContents) {
    const matches = scope.some(
      (s) => path.includes(s) || path.startsWith(s)
    );
    if (matches) {
      result.push([path, content]);
    }
  }

  return result;
}

function parseTaskArray(
  text: string,
  totalBudget: number
): readonly SubagentTask[] {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    let budgetRemaining = totalBudget;

    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
      )
      .map((item, index) => {
        const budget = Math.min(
          Number(item.contextBudget) || 10000,
          budgetRemaining
        );
        budgetRemaining -= budget;

        return {
          id: `task-${index}`,
          description: String(item.description ?? ""),
          scope: Array.isArray(item.scope)
            ? item.scope.map(String)
            : [],
          contextBudget: budget,
        };
      })
      .filter((task) => task.contextBudget > 0);
  } catch {
    return [];
  }
}

function safeParseSubagentOutput(text: string): {
  readonly findings: readonly string[];
  readonly confidence: number;
} {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { findings: [text], confidence: 0.5 };
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    return {
      findings: Array.isArray(parsed.findings)
        ? parsed.findings.map(String)
        : [text],
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    };
  } catch {
    return { findings: [text], confidence: 0.5 };
  }
}
