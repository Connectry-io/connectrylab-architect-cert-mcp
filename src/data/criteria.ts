export interface Criterion {
  readonly id: string;
  readonly title: string;
  readonly domain: number;
  readonly domainName: string;
  readonly description: string;
}

const DOMAIN_NAMES: Readonly<Record<number, string>> = {
  1: 'Agentic Architecture & Orchestration',
  2: 'Tool Design & MCP Integration',
  3: 'Claude Code Configuration & Workflows',
  4: 'Prompt Engineering & Structured Output',
  5: 'Context Management & Reliability',
} as const;

export const CRITERIA: readonly Criterion[] = [
  // Domain 1: Agentic Architecture & Orchestration
  {
    id: '1.1',
    title: 'Design and implement agentic loops for autonomous task execution',
    domain: 1,
    domainName: DOMAIN_NAMES[1],
    description:
      'Understanding the agentic loop lifecycle: sending requests, inspecting stop_reason, executing tools, and returning results.',
  },
  {
    id: '1.2',
    title: 'Orchestrate multi-agent systems with coordinator-subagent patterns',
    domain: 1,
    domainName: DOMAIN_NAMES[1],
    description:
      'Hub-and-spoke architecture, isolated context, task decomposition, and result aggregation.',
  },
  {
    id: '1.3',
    title: 'Configure subagent invocation, context passing, and spawning',
    domain: 1,
    domainName: DOMAIN_NAMES[1],
    description:
      'Task tool, allowedTools, explicit context passing, parallel subagent execution.',
  },
  {
    id: '1.4',
    title: 'Implement multi-step workflows with enforcement and handoff patterns',
    domain: 1,
    domainName: DOMAIN_NAMES[1],
    description:
      'Programmatic enforcement vs prompt-based guidance, structured handoff protocols.',
  },
  {
    id: '1.5',
    title: 'Apply Agent SDK hooks for tool call interception and data normalization',
    domain: 1,
    domainName: DOMAIN_NAMES[1],
    description:
      'PostToolUse hooks, tool call interception, deterministic vs probabilistic compliance.',
  },
  {
    id: '1.6',
    title: 'Design task decomposition strategies for complex workflows',
    domain: 1,
    domainName: DOMAIN_NAMES[1],
    description:
      'Prompt chaining vs dynamic decomposition, per-file analysis vs cross-file integration.',
  },
  {
    id: '1.7',
    title: 'Manage session state, resumption, and forking',
    domain: 1,
    domainName: DOMAIN_NAMES[1],
    description:
      'Named sessions, fork_session, structured summaries vs stale context.',
  },

  // Domain 2: Tool Design & MCP Integration
  {
    id: '2.1',
    title: 'Design effective tool interfaces with clear descriptions and boundaries',
    domain: 2,
    domainName: DOMAIN_NAMES[2],
    description:
      'Tool descriptions as selection mechanism, disambiguation, splitting vs consolidating.',
  },
  {
    id: '2.2',
    title: 'Implement structured error responses for MCP tools',
    domain: 2,
    domainName: DOMAIN_NAMES[2],
    description:
      'isError flag, error categories, retryable vs non-retryable, structured metadata.',
  },
  {
    id: '2.3',
    title: 'Distribute tools appropriately across agents and configure tool choice',
    domain: 2,
    domainName: DOMAIN_NAMES[2],
    description:
      'Scoped tool access, tool_choice options, forced selection patterns.',
  },
  {
    id: '2.4',
    title: 'Integrate MCP servers into Claude Code and agent workflows',
    domain: 2,
    domainName: DOMAIN_NAMES[2],
    description:
      'Project vs user scope, .mcp.json, environment variable expansion, MCP resources.',
  },
  {
    id: '2.5',
    title: 'Select and apply built-in tools effectively',
    domain: 2,
    domainName: DOMAIN_NAMES[2],
    description:
      'Grep vs Glob vs Read/Write/Edit, incremental codebase understanding.',
  },

  // Domain 3: Claude Code Configuration & Workflows
  {
    id: '3.1',
    title: 'Configure CLAUDE.md files with appropriate hierarchy and scoping',
    domain: 3,
    domainName: DOMAIN_NAMES[3],
    description:
      'User-level, project-level, directory-level, @import syntax, .claude/rules/.',
  },
  {
    id: '3.2',
    title: 'Create and configure custom slash commands and skills',
    domain: 3,
    domainName: DOMAIN_NAMES[3],
    description:
      'Project vs user scope, context: fork, allowed-tools, argument-hint frontmatter.',
  },
  {
    id: '3.3',
    title: 'Apply path-specific rules for conditional convention loading',
    domain: 3,
    domainName: DOMAIN_NAMES[3],
    description:
      'YAML frontmatter paths, glob patterns, conditional activation.',
  },
  {
    id: '3.4',
    title: 'Determine when to use plan mode vs direct execution',
    domain: 3,
    domainName: DOMAIN_NAMES[3],
    description:
      'Complexity assessment, architectural decisions, Explore subagent.',
  },
  {
    id: '3.5',
    title: 'Apply iterative refinement techniques for progressive improvement',
    domain: 3,
    domainName: DOMAIN_NAMES[3],
    description:
      'Input/output examples, test-driven iteration, interview pattern.',
  },
  {
    id: '3.6',
    title: 'Integrate Claude Code into CI/CD pipelines',
    domain: 3,
    domainName: DOMAIN_NAMES[3],
    description:
      '-p flag, --output-format json, --json-schema, session context isolation.',
  },

  // Domain 4: Prompt Engineering & Structured Output
  {
    id: '4.1',
    title: 'Design prompts with explicit criteria to improve precision',
    domain: 4,
    domainName: DOMAIN_NAMES[4],
    description:
      'Explicit criteria vs vague instructions, false positive management.',
  },
  {
    id: '4.2',
    title: 'Apply few-shot prompting to improve output consistency',
    domain: 4,
    domainName: DOMAIN_NAMES[4],
    description:
      'Targeted examples, ambiguous case handling, format demonstration.',
  },
  {
    id: '4.3',
    title: 'Enforce structured output using tool use and JSON schemas',
    domain: 4,
    domainName: DOMAIN_NAMES[4],
    description:
      'tool_use with schemas, tool_choice options, nullable fields, enum patterns.',
  },
  {
    id: '4.4',
    title: 'Implement validation, retry, and feedback loops',
    domain: 4,
    domainName: DOMAIN_NAMES[4],
    description:
      'Retry-with-error-feedback, limits of retry, detected_pattern tracking.',
  },
  {
    id: '4.5',
    title: 'Design efficient batch processing strategies',
    domain: 4,
    domainName: DOMAIN_NAMES[4],
    description:
      'Message Batches API, latency tolerance, custom_id, failure handling.',
  },
  {
    id: '4.6',
    title: 'Design multi-instance and multi-pass review architectures',
    domain: 4,
    domainName: DOMAIN_NAMES[4],
    description:
      'Self-review limitations, independent review instances, per-file + cross-file passes.',
  },

  // Domain 5: Context Management & Reliability
  {
    id: '5.1',
    title: 'Manage conversation context to preserve critical information',
    domain: 5,
    domainName: DOMAIN_NAMES[5],
    description:
      'Progressive summarization risks, lost-in-the-middle, tool output trimming.',
  },
  {
    id: '5.2',
    title: 'Design effective escalation and ambiguity resolution patterns',
    domain: 5,
    domainName: DOMAIN_NAMES[5],
    description:
      'Escalation triggers, customer preferences, sentiment unreliability.',
  },
  {
    id: '5.3',
    title: 'Implement error propagation strategies across multi-agent systems',
    domain: 5,
    domainName: DOMAIN_NAMES[5],
    description:
      'Structured error context, access failures vs empty results, partial results.',
  },
  {
    id: '5.4',
    title: 'Manage context effectively in large codebase exploration',
    domain: 5,
    domainName: DOMAIN_NAMES[5],
    description:
      'Context degradation, scratchpad files, subagent delegation, /compact.',
  },
  {
    id: '5.5',
    title: 'Design human review workflows and confidence calibration',
    domain: 5,
    domainName: DOMAIN_NAMES[5],
    description:
      'Stratified sampling, field-level confidence, accuracy by document type.',
  },
  {
    id: '5.6',
    title: 'Preserve information provenance and handle uncertainty in synthesis',
    domain: 5,
    domainName: DOMAIN_NAMES[5],
    description:
      'Claim-source mappings, conflict annotation, temporal data handling.',
  },
] as const;
