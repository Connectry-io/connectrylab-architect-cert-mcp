/**
 * Meta Tools — Demonstrating Agent Scoping and tool_choice via MCP
 *
 * Covers: Task Statement 2.3
 *   - Tool distribution patterns exposed as inspectable MCP tools
 *   - Shows how agent configurations map to tool subsets
 *   - tool_choice mode explanations
 *
 * These tools don't perform business operations — they expose the
 * agent-scoping configuration so a learner can query them and
 * understand how tool distribution works in practice.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { toolSuccess, validationError } from './error-handling.js';
import {
  RESEARCH_AGENT_CONFIG,
  ACTION_AGENT_CONFIG,
  COORDINATOR_FIRST_TURN_CONFIG,
  COORDINATOR_SUBSEQUENT_CONFIG,
  getToolsForAgent,
  TOOL_REGISTRY,
} from './agent-scoped-tools.js';
import type { AgentToolConfig } from '../types.js';

// ---- Agent Config Map ----

const AGENT_CONFIGS: Readonly<Record<string, AgentToolConfig>> = {
  research: RESEARCH_AGENT_CONFIG,
  action: ACTION_AGENT_CONFIG,
  'coordinator-first-turn': COORDINATOR_FIRST_TURN_CONFIG,
  'coordinator-subsequent': COORDINATOR_SUBSEQUENT_CONFIG,
};

// ---- Tool Registration ----

export function registerMetaTools(server: McpServer): void {
  /**
   * TOOL: get_agent_config
   *
   * Inspect the tool configuration for a specific agent role.
   * Returns which tools are allowed and which tool_choice mode is used.
   *
   * This is an educational tool — it lets learners query the scoping
   * setup and understand why each agent sees only a subset of tools.
   */
  server.tool(
    'get_agent_config',
    'Inspect the tool-scoping configuration for a specific agent role. ' +
      'Returns which tools the agent can access and its tool_choice mode. ' +
      'Use this to understand how tool distribution works across agent roles. ' +
      'Do NOT use this to perform any business operation — this is read-only metadata.',
    {
      agentRole: z
        .enum(['research', 'action', 'coordinator-first-turn', 'coordinator-subsequent'])
        .describe(
          'The agent role to inspect. ' +
            'Valid values: research, action, coordinator-first-turn, coordinator-subsequent',
        ),
    },
    async ({ agentRole }) => {
      const config = AGENT_CONFIGS[agentRole];
      if (!config) {
        return validationError(
          `Unknown agent role: ${agentRole}`,
          'agentRole',
          agentRole,
        );
      }

      const tools = getToolsForAgent(config);

      return toolSuccess({
        role: config.role,
        description: config.description,
        toolChoice: config.toolChoice,
        toolChoiceExplanation: explainToolChoice(config.toolChoice),
        allowedToolCount: tools.length,
        allowedTools: tools.map((t) => ({
          name: t.name,
          description: t.description,
        })),
        excludedTools: Object.keys(TOOL_REGISTRY).filter(
          (name) => !config.allowedTools.includes(name),
        ),
      });
    },
  );

  /**
   * TOOL: compare_agent_scoping
   *
   * Compare tool access between two agent roles side by side.
   * Highlights which tools are shared and which are exclusive.
   */
  server.tool(
    'compare_agent_scoping',
    'Compare tool access between two agent roles. Shows shared tools, ' +
      'tools exclusive to each role, and the different tool_choice modes. ' +
      'Use this to understand the principle of least privilege in multi-agent systems. ' +
      'Do NOT use this to perform any business operation.',
    {
      roleA: z
        .enum(['research', 'action', 'coordinator-first-turn', 'coordinator-subsequent'])
        .describe('First agent role to compare'),
      roleB: z
        .enum(['research', 'action', 'coordinator-first-turn', 'coordinator-subsequent'])
        .describe('Second agent role to compare'),
    },
    async ({ roleA, roleB }) => {
      const configA = AGENT_CONFIGS[roleA];
      const configB = AGENT_CONFIGS[roleB];

      if (!configA || !configB) {
        return validationError(
          'One or both agent roles are invalid',
          'roleA/roleB',
          { roleA, roleB },
        );
      }

      const setA = new Set(configA.allowedTools);
      const setB = new Set(configB.allowedTools);

      const shared = configA.allowedTools.filter((t) => setB.has(t));
      const onlyA = configA.allowedTools.filter((t) => !setB.has(t));
      const onlyB = configB.allowedTools.filter((t) => !setA.has(t));

      return toolSuccess({
        comparison: {
          roleA: {
            role: roleA,
            toolChoice: configA.toolChoice,
            toolCount: configA.allowedTools.length,
          },
          roleB: {
            role: roleB,
            toolChoice: configB.toolChoice,
            toolCount: configB.allowedTools.length,
          },
        },
        sharedTools: shared,
        exclusiveToA: onlyA,
        exclusiveToB: onlyB,
        insight:
          shared.length > 0
            ? `Both roles share ${shared.length} tool(s): ${shared.join(', ')}. ` +
              `${roleA} has ${onlyA.length} exclusive tool(s), ` +
              `${roleB} has ${onlyB.length} exclusive tool(s).`
            : `These roles have completely disjoint tool sets — they serve different purposes.`,
      });
    },
  );

  /**
   * TOOL: explain_tool_choice
   *
   * Get a detailed explanation of what a tool_choice mode does
   * and when to use it.
   */
  server.tool(
    'explain_tool_choice',
    'Get a detailed explanation of a tool_choice mode (auto, any, or tool). ' +
      'Explains the behavior, when to use it, and common mistakes. ' +
      'Use this to understand tool_choice configuration for the certification exam.',
    {
      mode: z
        .enum(['auto', 'any', 'tool'])
        .describe('The tool_choice mode to explain: auto, any, or tool'),
    },
    async ({ mode }) => {
      const explanations: Readonly<Record<string, {
        readonly behavior: string;
        readonly whenToUse: string;
        readonly commonMistake: string;
        readonly example: string;
      }>> = {
        auto: {
          behavior:
            'Claude decides whether to call a tool or respond with text. ' +
            'This is the default and the right choice for most conversational agents.',
          whenToUse:
            'General-purpose agents that sometimes need tools and sometimes just need ' +
            'to reason or respond. The model uses tools when it judges them necessary.',
          commonMistake:
            'Using "auto" when you need a guaranteed tool call (e.g., a logging step). ' +
            'With "auto", the model can skip the tool entirely.',
          example: 'tool_choice: { type: "auto" }',
        },
        any: {
          behavior:
            'Claude MUST call at least one tool from the list, but it chooses which one. ' +
            'Pure text responses are not allowed.',
          whenToUse:
            'Steps where a tool call is a hard contract — for example, a logging step ' +
            'where every response must be recorded, or an action agent that should always ' +
            'perform a concrete operation.',
          commonMistake:
            'Confusing "any" with "auto". "auto" means "use a tool if you judge it necessary"; ' +
            '"any" means "you MUST use a tool — pick one."',
          example: 'tool_choice: { type: "any" }',
        },
        tool: {
          behavior:
            'Claude MUST call exactly the named tool. No other tool can be selected, ' +
            'and text-only responses are not allowed.',
          whenToUse:
            'Forcing a deterministic first step — for example, always running validate_input ' +
            'before any other action, or always calling plan_subtasks at the start of delegation. ' +
            'Most valuable at the START of a workflow.',
          commonMistake:
            'Leaving forced tool selection in place for more than one turn. After the forced ' +
            'step resolves, switch back to "auto" so the agent can reason freely.',
          example: 'tool_choice: { type: "tool", name: "validate_input" }',
        },
      };

      const explanation = explanations[mode];
      if (!explanation) {
        return validationError(`Unknown mode: ${mode}`, 'mode', mode);
      }

      return toolSuccess({ mode, ...explanation });
    },
  );
}

// ---- Helpers ----

function explainToolChoice(
  choice: AgentToolConfig['toolChoice'],
): string {
  switch (choice.type) {
    case 'auto':
      return 'Claude decides whether to call a tool or respond with text (default mode).';
    case 'any':
      return 'Claude MUST call at least one tool — pure text responses are not allowed.';
    case 'tool':
      return `Claude MUST call exactly "${choice.name}" — no other tool or text response is allowed.`;
    default:
      return 'Unknown tool_choice mode.';
  }
}
