import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { getUser } from '../db/users.js';
import { getAllMastery } from '../db/mastery.js';
import { getOverdueReviews } from '../db/review-schedule.js';
import { getTotalStats } from '../db/answers.js';
import { loadCurriculum, loadQuestions } from '../data/loader.js';
import { getNextRecommendedDomain, getDomainOrder, estimateTimeRemaining } from '../engine/adaptive-path.js';
import { ensureUser } from '../db/users.js';

export function registerGetStudyPlan(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'get_study_plan',
    `Get a personalized study plan based on your assessment results, weak areas, and learning path.

IMPORTANT — after showing the study plan, use AskUserQuestion with header "Focus" and multiSelect: true to let the user pick which domains they want to focus on. Options should be the 5 domains with their current mastery as descriptions. Then use their selection to filter get_practice_question calls.

Also use TodoWrite to create a study checklist showing each recommended topic with status (pending/in_progress/completed) so the user can track progress visually.`,
    {},
    async () => {
      const userId = userConfig.userId;
      ensureUser(db, userId);
      const user = getUser(db, userId);
      const curriculum = loadCurriculum();
      const mastery = getAllMastery(db, userId);
      const overdueReviews = getOverdueReviews(db, userId);
      const stats = getTotalStats(db, userId);
      const allQuestions = loadQuestions();
      const path = user?.learningPath ?? 'beginner-friendly';

      const masteryByDomain = new Map<number, typeof mastery>();
      for (const m of mastery) {
        const existing = masteryByDomain.get(m.domainId) ?? [];
        masteryByDomain.set(m.domainId, [...existing, m]);
      }

      const nextDomain = getNextRecommendedDomain(path as any, masteryByDomain);
      const domainOrder = getDomainOrder(path as any);
      const timeEstimate = estimateTimeRemaining(allQuestions.length, stats.total);

      const domain = curriculum.domains.find(d => d.id === nextDomain);

      const lines = [
        '═══ YOUR STUDY PLAN ═══',
        '',
        `Learning Path: ${path}`,
        `Estimated Time Remaining: ${timeEstimate}`,
        '',
        `Next Recommended Domain: D${nextDomain} — ${domain?.title ?? 'Unknown'}`,
        '',
        'Domain Study Order:',
        ...domainOrder.map((id, i) => {
          const d = curriculum.domains.find(x => x.id === id);
          return `  ${i + 1}. D${id}: ${d?.title ?? 'Unknown'}`;
        }),
        '',
        `Reviews Due: ${overdueReviews.length}`,
        overdueReviews.length > 0 ? 'Start with your overdue reviews before new material.' : '',
      ];
      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
