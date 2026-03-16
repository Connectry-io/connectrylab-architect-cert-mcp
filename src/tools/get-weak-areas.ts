import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { getWeakAreas } from '../db/mastery.js';
import { loadCurriculum } from '../data/loader.js';
import { ensureUser } from '../db/users.js';

export function registerGetWeakAreas(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'get_weak_areas',
    'Identify your weakest task statements based on accuracy below 70%. Focus your study on these areas.',
    {},
    async () => {
      const userId = userConfig.userId;
      ensureUser(db, userId);
      const curriculum = loadCurriculum();
      const weakAreas = getWeakAreas(db, userId);

      if (weakAreas.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No weak areas identified yet. Complete some questions first or all areas are above 70%!' }],
        };
      }

      const lines = ['═══ WEAK AREAS ═══', ''];
      for (const area of weakAreas) {
        const domain = curriculum.domains.find(d => d.id === area.domainId);
        const ts = domain?.taskStatements.find(t => t.id === area.taskStatement);
        lines.push(`  ${area.taskStatement}: ${ts?.title ?? 'Unknown'}`);
        lines.push(`    Accuracy: ${area.accuracyPercent}% (${area.correctAttempts}/${area.totalAttempts})`);
        lines.push(`    Mastery: ${area.masteryLevel}`);
        lines.push('');
      }
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
