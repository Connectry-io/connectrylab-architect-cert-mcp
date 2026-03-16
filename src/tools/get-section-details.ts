import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { loadCurriculum, loadHandout } from '../data/loader.js';
import { getMastery } from '../db/mastery.js';
import { getAnswersByTaskStatement } from '../db/answers.js';
import { hasViewedHandout } from '../db/handout-views.js';
import { ensureUser } from '../db/users.js';

export function registerGetSectionDetails(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'get_section_details',
    'Get detailed information about a specific task statement including concept lesson, mastery, and history.',
    { taskStatement: z.string().describe('Task statement ID, e.g. "1.1"') },
    async ({ taskStatement }) => {
      const userId = userConfig.userId;
      ensureUser(db, userId);
      const curriculum = loadCurriculum();
      let found = null;
      for (const d of curriculum.domains) {
        for (const ts of d.taskStatements) {
          if (ts.id === taskStatement) { found = { domain: d, ts }; break; }
        }
        if (found) break;
      }
      if (!found) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Task statement not found', taskStatement }) }],
          isError: true,
        };
      }
      const mastery = getMastery(db, userId, taskStatement);
      const answers = getAnswersByTaskStatement(db, userId, taskStatement);
      const handoutViewed = hasViewedHandout(db, userId, taskStatement);
      const handout = loadHandout(taskStatement);

      const lines: string[] = [
        `═══ ${found.ts.id}: ${found.ts.title} ═══`,
        `Domain: ${found.domain.title}`,
        `Description: ${found.ts.description}`,
        '',
        `Mastery: ${mastery?.masteryLevel ?? 'unassessed'}`,
        `Accuracy: ${mastery?.accuracyPercent ?? 0}%`,
        `Attempts: ${mastery?.totalAttempts ?? 0}`,
        `Handout Viewed: ${handoutViewed ? 'Yes' : 'No'}`,
        '',
      ];
      if (handout) {
        lines.push('--- Concept Lesson ---', '', handout);
      }
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
