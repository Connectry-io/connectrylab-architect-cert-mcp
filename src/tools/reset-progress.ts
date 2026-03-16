import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';

export function registerResetProgress(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'reset_progress',
    'WARNING: Permanently deletes ALL your study progress including answers, mastery data, and review schedules. This cannot be undone.',
    { confirmed: z.boolean().describe('Must be true to confirm the reset') },
    async ({ confirmed }) => {
      if (!confirmed) {
        return { content: [{ type: 'text' as const, text: 'Reset cancelled. Your progress is safe.' }] };
      }
      const userId = userConfig.userId;
      db.prepare('DELETE FROM answers WHERE userId = ?').run(userId);
      db.prepare('DELETE FROM domain_mastery WHERE userId = ?').run(userId);
      db.prepare('DELETE FROM review_schedule WHERE userId = ?').run(userId);
      db.prepare('DELETE FROM session_state WHERE userId = ?').run(userId);
      db.prepare('DELETE FROM study_sessions WHERE userId = ?').run(userId);
      db.prepare('DELETE FROM handout_views WHERE userId = ?').run(userId);

      return { content: [{ type: 'text' as const, text: 'All progress has been reset. You can start fresh with start_assessment.' }] };
    }
  );
}
