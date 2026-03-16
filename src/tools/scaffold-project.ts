import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';

export function registerScaffoldProject(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'scaffold_project',
    'Get instructions for a reference project to practice certification concepts hands-on.',
    { projectId: z.string().optional().describe('Project ID (e.g. "capstone", "d1-agentic"). Omit to see available projects.') },
    async ({ projectId }) => {
      const projects = [
        { id: 'capstone', name: 'Capstone — Multi-Agent Research System', domains: [1, 2, 3, 4, 5] },
        { id: 'd1-agentic', name: 'D1 Mini — Agentic Loop', domains: [1] },
        { id: 'd2-tools', name: 'D2 Mini — Tool Design', domains: [2] },
        { id: 'd3-config', name: 'D3 Mini — Claude Code Config', domains: [3] },
        { id: 'd4-prompts', name: 'D4 Mini — Prompt Engineering', domains: [4] },
        { id: 'd5-context', name: 'D5 Mini — Context Management', domains: [5] },
      ];

      if (!projectId) {
        const lines = [
          '═══ REFERENCE PROJECTS ═══',
          '',
          ...projects.map(p => `  ${p.id}: ${p.name} (Domains: ${p.domains.join(', ')})`),
        ];
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      }

      const project = projects.find(p => p.id === projectId);
      if (!project) {
        return {
          content: [{ type: 'text' as const, text: `Project "${projectId}" not found. Use scaffold_project without arguments to see available projects.` }],
          isError: true,
        };
      }

      return {
        content: [{ type: 'text' as const, text: `Reference project "${project.name}" is being prepared and will be available in a future update. Check back soon!` }],
      };
    }
  );
}
