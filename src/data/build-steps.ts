export interface BuildStep {
  readonly stepIndex: number;
  readonly fileName: string;
  readonly taskStatements: readonly string[];
  readonly description: string;
  readonly codeHints: string;
}

export const BUILD_STEPS: readonly BuildStep[] = [
  {
    stepIndex: 1,
    fileName: 'CLAUDE.md, .claude/',
    taskStatements: ['3.1', '3.2', '3.3'],
    description: 'Project config and rules',
    codeHints:
      'Generate a CLAUDE.md with hierarchical instructions, @import references, and .claude/rules/ with path-scoped YAML frontmatter. Include a custom slash command definition.',
  },
  {
    stepIndex: 2,
    fileName: 'package.json, tsconfig.json',
    taskStatements: ['3.4'],
    description: 'Project setup and CI hooks',
    codeHints:
      'Set up TypeScript project configuration with strict compiler options, lint/test scripts suitable for plan-mode assessment, and pre-commit hooks.',
  },
  {
    stepIndex: 3,
    fileName: 'src/server.ts',
    taskStatements: ['2.1', '2.2'],
    description: 'MCP server with tool registration',
    codeHints:
      'Create an MCP server entry point that registers tools with clear descriptions and boundaries, and returns structured error responses with isError flags.',
  },
  {
    stepIndex: 4,
    fileName: 'src/tools/',
    taskStatements: ['2.1', '2.3', '2.5'],
    description: 'Tool definitions and scoping',
    codeHints:
      'Define tool modules with scoped access per agent, tool_choice configuration, and demonstrate effective use of built-in tools like Grep, Glob, and Read.',
  },
  {
    stepIndex: 5,
    fileName: 'src/error-handling.ts',
    taskStatements: ['2.2'],
    description: 'Error boundaries and recovery',
    codeHints:
      'Implement error boundary utilities that categorize errors as retryable vs non-retryable, attach structured metadata, and format MCP-compliant error responses.',
  },
  {
    stepIndex: 6,
    fileName: 'src/coordinator.ts',
    taskStatements: ['1.1', '1.2', '1.6'],
    description: 'Main agentic loop',
    codeHints:
      'Build a coordinator that runs the agentic loop (send request, inspect stop_reason, execute tools, return results) with hub-and-spoke orchestration and task decomposition.',
  },
  {
    stepIndex: 7,
    fileName: 'src/subagents/',
    taskStatements: ['1.3', '1.4'],
    description: 'Subagent definitions and routing',
    codeHints:
      'Define subagent configurations with allowedTools, explicit context passing, and structured handoff protocols for multi-step workflow enforcement.',
  },
  {
    stepIndex: 8,
    fileName: 'src/hooks.ts',
    taskStatements: ['1.5'],
    description: 'Pre/post tool-use hooks',
    codeHints:
      'Implement PostToolUse hooks that intercept tool calls for data normalization, demonstrating deterministic compliance checks vs probabilistic validation.',
  },
  {
    stepIndex: 9,
    fileName: 'src/workflow.ts',
    taskStatements: ['1.4', '1.6'],
    description: 'Multi-step workflows',
    codeHints:
      'Create workflow orchestration with programmatic enforcement gates, prompt chaining stages, and per-file analysis that feeds into cross-file integration.',
  },
  {
    stepIndex: 10,
    fileName: 'src/session.ts',
    taskStatements: ['1.7'],
    description: 'Session and state management',
    codeHints:
      'Implement session lifecycle with named sessions, fork_session for parallel exploration, and structured summaries to avoid stale context on resumption.',
  },
  {
    stepIndex: 11,
    fileName: 'src/prompts/system.ts',
    taskStatements: ['4.1', '4.2'],
    description: 'System prompts with few-shot',
    codeHints:
      'Design system prompts with explicit criteria for precision, and embed few-shot examples that handle ambiguous cases and demonstrate expected output format.',
  },
  {
    stepIndex: 12,
    fileName: 'src/prompts/extraction.ts',
    taskStatements: ['4.3', '4.4'],
    description: 'Structured output and validation',
    codeHints:
      'Enforce structured output via tool_use with JSON schemas and enum patterns, plus retry-with-error-feedback loops that track detected_pattern for progressive improvement.',
  },
  {
    stepIndex: 13,
    fileName: 'src/prompts/batch.ts',
    taskStatements: ['4.5', '4.6'],
    description: 'Batch processing and multi-pass',
    codeHints:
      'Implement batch processing using the Message Batches API with custom_id tracking and failure handling, plus multi-pass review with independent instances.',
  },
  {
    stepIndex: 14,
    fileName: 'src/context/preservation.ts',
    taskStatements: ['5.1'],
    description: 'Context preservation strategies',
    codeHints:
      'Implement context preservation that mitigates progressive summarization risks and lost-in-the-middle effects, with tool output trimming to retain critical information.',
  },
  {
    stepIndex: 15,
    fileName: 'src/context/triggers.ts',
    taskStatements: ['5.2'],
    description: 'Context refresh triggers',
    codeHints:
      'Define escalation triggers and ambiguity resolution patterns that detect when context needs refreshing, using customer preference signals rather than unreliable sentiment.',
  },
  {
    stepIndex: 16,
    fileName: 'src/context/propagation.ts',
    taskStatements: ['5.3'],
    description: 'Cross-agent context propagation',
    codeHints:
      'Implement structured error context propagation across agents, distinguishing access failures from empty results and handling partial result aggregation.',
  },
  {
    stepIndex: 17,
    fileName: 'src/context/scratchpad.ts',
    taskStatements: ['5.4'],
    description: 'Scratchpad and subagent delegation',
    codeHints:
      'Build scratchpad file management for large codebase exploration, with subagent delegation to prevent context degradation and /compact integration.',
  },
  {
    stepIndex: 18,
    fileName: 'src/context/confidence.ts',
    taskStatements: ['5.5', '5.6'],
    description: 'Confidence calibration and synthesis',
    codeHints:
      'Implement field-level confidence scoring with stratified sampling for human review, plus claim-source mappings with conflict annotation for provenance tracking.',
  },
] as const;
