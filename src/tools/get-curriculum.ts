import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { loadCurriculum } from '../data/loader.js';
import { getAllMastery } from '../db/mastery.js';
import { ensureUser } from '../db/users.js';

export function registerGetCurriculum(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'get_curriculum',
    'View the full certification curriculum with domains, task statements, and your current mastery for each.',
    {},
    async () => {
      const userId = userConfig.userId;
      ensureUser(db, userId);
      const curriculum = loadCurriculum();
      const mastery = getAllMastery(db, userId);

      const lines: string[] = ['═══ CERTIFICATION CURRICULUM ═══', ''];
      for (const domain of curriculum.domains) {
        lines.push(`## Domain ${domain.id}: ${domain.title} (${domain.weight}%)`);
        lines.push('');
        for (const ts of domain.taskStatements) {
          const m = mastery.find(x => x.taskStatement === ts.id);
          const level = m ? m.masteryLevel : 'unassessed';
          const acc = m ? `${m.accuracyPercent}%` : '—';
          lines.push(`  ${ts.id} [${level.toUpperCase()}] ${ts.title} (${acc})`);
        }
        lines.push('');
      }
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
