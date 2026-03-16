# Domain 1: Mini Agentic Loop — Multi-Agent Research Coordinator

> **Connectry Architect Certification — Reference Project**
> Covers all Domain 1 task statements (1.1–1.7)

## What This Teaches

This project demonstrates a complete multi-agent research coordination system built with the Anthropic SDK. It covers every task statement in Domain 1: Agentic Architecture & Orchestration.

**Domain Mental Model:** "The model drives decisions, code enforces guardrails"

The model decides what to research, how to decompose tasks, and when to stop. The code enforces schema validation at every boundary, scopes tools to each agent, isolates context between agents, and manages session state.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  COORDINATOR                      │
│  • Agentic loop (1.1)                            │
│  • Hub-and-spoke orchestration (1.2)             │
│  • Task decomposition (1.6)                      │
│  • Session management (1.7)                      │
└──────────┬──────────────────────┬────────────────┘
           │                      │
    ┌──────▼──────┐       ┌──────▼──────────┐
    │ RESEARCHER  │       │    ANALYZER      │
    │  • Scoped   │       │  • Scoped tools  │
    │    tools    │       │  • Handoff       │
    │  • Isolated │       │    pattern       │
    │    context  │       │  • Structured    │
    │  (1.3)      │       │    output (1.3,  │
    └─────────────┘       │    1.4)          │
                          └─────────────────┘

    ┌─────────────┐       ┌─────────────────┐
    │   HOOKS     │       │    WORKFLOW      │
    │  • Before/  │       │  • Zod schema    │
    │    after    │       │    enforcement   │
    │    tool     │       │  • Stage         │
    │    calls    │       │    transitions   │
    │  (1.5)      │       │  (1.4, 1.6)     │
    └─────────────┘       └─────────────────┘

    ┌──────────────────────────────────────┐
    │             SESSION                   │
    │  • Named sessions, resume, fork       │
    │  (1.7)                               │
    └──────────────────────────────────────┘
```

## How to Run

```bash
# Install dependencies
npm install

# Run the coordinator (requires API key)
ANTHROPIC_API_KEY=sk-... npx tsx src/coordinator.ts

# Or build and run
npm run build
ANTHROPIC_API_KEY=sk-... node dist/coordinator.js
```

The coordinator will:
1. Decompose a research query into subtasks
2. Dispatch researcher subagents to gather information
3. Dispatch analyzer subagents to evaluate findings
4. Synthesize results through a schema-validated workflow
5. Manage session state throughout the process

## File-by-File Walkthrough

### `src/types.ts` — Shared Type Definitions
**Task Statements:** Foundation for all (1.1–1.7)

All interfaces use `readonly` properties to enforce immutability. Includes both TypeScript interfaces (compile-time safety) and Zod schemas (runtime validation). Key types:
- `AgentLoopConfig`, `IterationResult` — agentic loop structures (1.1)
- `ResearchQuery`, `SubTask`, `SubTaskResult` — coordinator/subagent data (1.2, 1.3)
- `WorkflowState`, `StageTransition` — workflow enforcement (1.4)
- `HookContext`, `HookRegistry` — hook system (1.5)
- `Session`, `SessionForkOptions` — session management (1.7)

### `src/coordinator.ts` — Main Coordinator Agent
**Task Statements:** 1.1 (agentic loop), 1.2 (coordinator pattern), 1.6 (task decomposition)

The orchestrator that decomposes research queries into subtasks and dispatches them to specialized subagents. Contains the primary agentic loop (`while` checking `stop_reason`), coordinator-level tools for dispatching work, and the main entry point.

Key patterns demonstrated:
- **Agentic loop:** `while (iterations < max) { call API → check stop_reason → execute tools → continue }`
- **Hub-and-spoke:** Coordinator dispatches to researchers and analyzers, aggregates results
- **Dynamic decomposition:** Model decides how to break down the query

### `src/subagents/researcher.ts` — Research Subagent
**Task Statements:** 1.3 (subagent invocation, scoped tools, explicit context), 1.1 (own agentic loop)

A specialized subagent with scoped tools (`web_search`, `read_document`, `take_notes`) and isolated context. Receives only the specific task description from the coordinator — not the full conversation history.

Key patterns demonstrated:
- **Scoped tools:** Only research tools, no coordinator or analysis tools
- **Explicit context passing:** Coordinator crafts a focused message
- **Isolated agentic loop:** Runs independently from the coordinator

### `src/subagents/analyzer.ts` — Analysis Subagent
**Task Statements:** 1.3 (subagent invocation), 1.4 (handoff patterns)

Receives research results from the coordinator (handoff pattern) and produces structured analysis. Has its own scoped tools (`evaluate_evidence`, `compare_findings`, `structure_output`).

Key patterns demonstrated:
- **Handoff:** Coordinator validates research output, then passes to analyzer
- **Different tool scope:** Analysis tools, not research tools
- **Structured output:** Produces JSON matching the AnalysisOutputSchema

### `src/hooks.ts` — Tool Call Interception and Data Normalization
**Task Statements:** 1.5 (hooks for tool call interception and data normalization)

Implements the hook system: `beforeToolCall` for input validation/sanitization and `afterToolCall` for output normalization. Includes built-in hooks for sanitization, max-length validation, rate limiting, output normalization, and logging.

Key patterns demonstrated:
- **Pipeline execution:** Hooks run in order, each can transform data or block
- **Immutable registry:** Adding hooks returns a new registry
- **Layered validation:** Global hooks + tool-specific hooks

### `src/workflow.ts` — Multi-Step Workflow with Schema Enforcement
**Task Statements:** 1.4 (multi-step workflows, enforcement), 1.6 (task decomposition strategies)

Defines a 5-stage workflow pipeline (decomposition → research → analysis → synthesis → review) with Zod schema validation at every stage boundary. Contrasts static decomposition (prompt chaining) with dynamic decomposition.

Key patterns demonstrated:
- **Schema enforcement:** Zod validates output before allowing stage transitions
- **Programmatic guardrails:** Code prevents skipping stages or invalid transitions
- **Static vs dynamic decomposition:** Two strategies for breaking down work

### `src/session.ts` — Session State Management
**Task Statements:** 1.7 (session state, resumption, forking)

Implements named sessions with full CRUD operations, pause/resume, and fork capabilities. All operations return new state objects (immutable). Sessions track conversation history and workflow state.

Key patterns demonstrated:
- **Named sessions:** Look up sessions by name for resumption
- **Fork:** Create a new session branching from a point in an existing one
- **Immutable state:** Every update returns a new store, original unchanged
- **Session summary:** Compact context for passing to subagents

## Task Statement Coverage Matrix

| Task Statement | Primary File(s) | What to Study |
|---|---|---|
| 1.1 Agentic loops | `coordinator.ts`, `researcher.ts` | The `while` loop checking `stop_reason`, tool execution, result returning |
| 1.2 Coordinator-subagent | `coordinator.ts` | Hub-and-spoke dispatch, result aggregation |
| 1.3 Subagent invocation | `researcher.ts`, `analyzer.ts` | Scoped tools, explicit context, isolated loops |
| 1.4 Multi-step workflows | `workflow.ts`, `analyzer.ts` | Zod enforcement at boundaries, handoff pattern |
| 1.5 Hooks | `hooks.ts` | Before/after hooks, pipeline execution, built-in patterns |
| 1.6 Task decomposition | `workflow.ts`, `coordinator.ts` | Static (prompt chaining) vs dynamic decomposition |
| 1.7 Session management | `session.ts` | Named sessions, resume, fork, immutable state |

## Key Concepts to Remember

1. **Agentic loop = while(stop_reason !== "end_turn")** — The model decides when to stop; your code decides what tools are available and validates all inputs/outputs.

2. **Hub-and-spoke** — The coordinator dispatches; subagents execute. They never talk to each other directly.

3. **Scoped tools** — Each agent type gets exactly the tools it needs. The researcher can't dispatch tasks; the coordinator can't search the web.

4. **Explicit context** — Subagents receive crafted context messages, not the coordinator's full history. Less context = faster, cheaper, safer.

5. **Schema enforcement** — Zod schemas at every stage boundary. The model produces output; the code validates it before the workflow advances.

6. **Hooks = guardrails** — Before hooks validate and sanitize inputs. After hooks normalize outputs. Any hook can block a tool call.

7. **Immutable sessions** — Every state change creates a new object. Fork creates a new session inheriting state at the fork point.
