import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_DIR = path.resolve(__dirname, '..', '..', 'projects');

const PROJECTS = [
  { id: 'capstone', name: 'Capstone — Multi-Agent Research System', domains: [1, 2, 3, 4, 5] },
  { id: 'd1-agentic', name: 'D1 Mini — Agentic Loop', domains: [1] },
  { id: 'd2-tools', name: 'D2 Mini — Tool Design', domains: [2] },
  { id: 'd3-config', name: 'D3 Mini — Claude Code Config', domains: [3] },
  { id: 'd4-prompts', name: 'D4 Mini — Prompt Engineering', domains: [4] },
  { id: 'd5-context', name: 'D5 Mini — Context Management', domains: [5] },
] as const;

function listFilesRecursive(dir: string, prefix = ''): readonly string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry): readonly string[] => {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      return listFilesRecursive(path.join(dir, entry.name), relativePath);
    }
    return [relativePath];
  });
}

export function registerScaffoldProject(server: McpServer, _db: Database.Database, _userConfig: UserConfig): void {
  server.tool(
    'scaffold_project',
    'Get instructions for a reference project to practice certification concepts hands-on.',
    { projectId: z.string().optional().describe('Project ID (e.g. "capstone", "d1-agentic"). Omit to see available projects.') },
    async ({ projectId }) => {
      if (!projectId) {
        const lines = [
          '═══ REFERENCE PROJECTS ═══',
          '',
          ...PROJECTS.map(p => `  ${p.id}: ${p.name} (Domains: ${p.domains.join(', ')})`),
        ];
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      }

      const project = PROJECTS.find(p => p.id === projectId);
      if (!project) {
        return {
          content: [{ type: 'text' as const, text: `Project "${projectId}" not found. Use scaffold_project without arguments to see available projects.` }],
          isError: true,
        };
      }

      const projectDir = path.join(PROJECTS_DIR, projectId);
      if (!fs.existsSync(projectDir)) {
        return {
          content: [{ type: 'text' as const, text: `Project directory for "${project.name}" not found. The project files may not be installed yet.` }],
          isError: true,
        };
      }

      const readmePath = path.join(projectDir, 'README.md');
      const readme = fs.existsSync(readmePath)
        ? fs.readFileSync(readmePath, 'utf-8')
        : null;

      const files = listFilesRecursive(projectDir);

      const sections = [
        `═══ ${project.name} ═══`,
        '',
        `Domains: ${project.domains.join(', ')}`,
        '',
      ];

      if (readme) {
        sections.push('--- README ---', '', readme, '');
      }

      sections.push(
        '--- Project Files ---',
        '',
        ...files.map(f => `  ${f}`),
        '',
        '--- Next Steps ---',
        '',
        'Explore the project files above to understand the architecture.',
        'Each file demonstrates certification concepts in practice.',
        `Project root: projects/${projectId}/`,
      );

      return {
        content: [{ type: 'text' as const, text: sections.join('\n') }],
      };
    }
  );
}
