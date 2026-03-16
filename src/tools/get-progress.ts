import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { getAllMastery } from '../db/mastery.js';
import { getTotalStats } from '../db/answers.js';
import { getOverdueReviews } from '../db/review-schedule.js';
import { loadCurriculum } from '../data/loader.js';
import { ensureUser } from '../db/users.js';

export function registerGetProgress(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'get_progress',
    'Get your certification study progress overview including mastery levels, accuracy, and review status.',
    {},
    async () => {
      const userId = userConfig.userId;
      ensureUser(db, userId);
      const curriculum = loadCurriculum();
      const mastery = getAllMastery(db, userId);
      const stats = getTotalStats(db, userId);
      const overdueReviews = getOverdueReviews(db, userId);

      const domainProgress = curriculum.domains.map(d => {
        const domainMastery = mastery.filter(m => m.domainId === d.id);
        const avgAccuracy = domainMastery.length > 0
          ? Math.round(domainMastery.reduce((sum, m) => sum + m.accuracyPercent, 0) / domainMastery.length)
          : 0;
        const masteredCount = domainMastery.filter(m => m.masteryLevel === 'mastered').length;
        return `  D${d.id}: ${d.title} — ${avgAccuracy}% accuracy, ${masteredCount}/${d.taskStatements.length} mastered`;
      });

      const overallAccuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

      const text = [
        '═══ CERTIFICATION STUDY PROGRESS ═══',
        '',
        `Questions Answered: ${stats.total}`,
        `Overall Accuracy: ${overallAccuracy}%`,
        `Reviews Due: ${overdueReviews.length}`,
        '',
        'Domain Progress:',
        ...domainProgress,
      ].join('\n');

      return { content: [{ type: 'text' as const, text }] };
    }
  );
}
