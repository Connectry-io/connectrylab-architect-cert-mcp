import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { loadCurriculum, loadHandout } from '../data/loader.js';
import { recordHandoutView } from '../db/handout-views.js';
import { getQuizWidgetHtml } from '../ui/loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function registerResources(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  // 1. Handouts as dynamic resource
  server.resource(
    'handout',
    new ResourceTemplate('handout://{taskStatement}', {
      list: async () => {
        const curriculum = loadCurriculum();
        const resources = curriculum.domains.flatMap(d =>
          d.taskStatements.map(ts => ({
            uri: `handout://${ts.id}`,
            name: `${ts.id} — ${ts.title}`,
            mimeType: 'text/markdown' as const,
          }))
        );
        return { resources };
      },
    }),
    { mimeType: 'text/markdown' },
    async (uri, { taskStatement }) => {
      const ts = taskStatement as string;
      const content = loadHandout(ts);
      recordHandoutView(db, userConfig.userId, ts);
      return {
        contents: [{
          uri: uri.href,
          text: content ?? `Handout for ${ts} is not yet available.`,
          mimeType: 'text/markdown',
        }],
      };
    }
  );

  // 2. Reference projects as dynamic resource
  server.resource(
    'reference-project',
    new ResourceTemplate('reference-project://{projectId}', {
      list: async () => ({
        resources: [
          { uri: 'reference-project://capstone', name: 'Capstone — Multi-Agent Research System', mimeType: 'text/markdown' as const },
          { uri: 'reference-project://d1-agentic', name: 'D1 Mini — Agentic Loop', mimeType: 'text/markdown' as const },
          { uri: 'reference-project://d2-tools', name: 'D2 Mini — Tool Design', mimeType: 'text/markdown' as const },
          { uri: 'reference-project://d3-config', name: 'D3 Mini — Claude Code Config', mimeType: 'text/markdown' as const },
          { uri: 'reference-project://d4-prompts', name: 'D4 Mini — Prompt Engineering', mimeType: 'text/markdown' as const },
          { uri: 'reference-project://d5-context', name: 'D5 Mini — Context Management', mimeType: 'text/markdown' as const },
        ],
      }),
    }),
    { mimeType: 'text/markdown' },
    async (uri, { projectId }) => {
      const id = projectId as string;
      const projectPath = path.join(__dirname, '..', '..', 'projects', id, 'README.md');
      const content = fs.existsSync(projectPath)
        ? fs.readFileSync(projectPath, 'utf-8')
        : `Reference project "${id}" is not yet available. It will be added in the content creation phase.`;
      return {
        contents: [{ uri: uri.href, text: content, mimeType: 'text/markdown' }],
      };
    }
  );

  // 3. Quiz widget UI resource (MCP App)
  server.resource(
    'quiz-widget',
    'ui://connectry-architect/quiz',
    { mimeType: 'text/html;profile=mcp-app' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'text/html;profile=mcp-app',
        text: getQuizWidgetHtml(),
      }],
    }),
  );

  // 4. Exam info as static resource
  server.resource(
    'exam-info',
    'exam-info://overview',
    { mimeType: 'text/markdown' },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: EXAM_INFO_MARKDOWN,
        mimeType: 'text/markdown',
      }],
    })
  );
}

const EXAM_INFO_MARKDOWN = `# Claude Certified Architect — Foundations

## Exam Format
- Multiple choice (1 correct, 3 distractors)
- Scenario-based questions (4 of 6 scenarios per exam)
- Passing score: 720 / 1000

## Domain Weightings
| Domain | Weight |
|--------|--------|
| D1: Agentic Architecture & Orchestration | 27% |
| D2: Tool Design & MCP Integration | 18% |
| D3: Claude Code Configuration & Workflows | 20% |
| D4: Prompt Engineering & Structured Output | 20% |
| D5: Context Management & Reliability | 15% |

## Exam Scenarios
1. Customer Support Resolution Agent
2. Code Generation with Claude Code
3. Multi-Agent Research System
4. Developer Productivity with Claude
5. Claude Code for Continuous Integration
6. Structured Data Extraction
`;
