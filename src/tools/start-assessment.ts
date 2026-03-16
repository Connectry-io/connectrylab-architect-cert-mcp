import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig, Question } from '../types.js';
import { loadQuestions } from '../data/loader.js';
import { ensureUser } from '../db/users.js';

export function registerStartAssessment(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'start_assessment',
    'Start the initial assessment with 15 questions (3 per domain: 1 easy, 1 medium, 1 hard) to determine your learning path.',
    {},
    async () => {
      const userId = userConfig.userId;
      ensureUser(db, userId);

      const assessmentQuestions: Question[] = [];
      for (let d = 1; d <= 5; d++) {
        const domainQuestions = loadQuestions(d);
        const easy = domainQuestions.find(q => q.difficulty === 'easy');
        const medium = domainQuestions.find(q => q.difficulty === 'medium');
        const hard = domainQuestions.find(q => q.difficulty === 'hard');
        if (easy) assessmentQuestions.push(easy);
        if (medium) assessmentQuestions.push(medium);
        if (hard) assessmentQuestions.push(hard);
      }

      if (assessmentQuestions.length === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No assessment questions available yet. The question bank is being populated.' }],
        };
      }

      const response = {
        totalQuestions: assessmentQuestions.length,
        questions: assessmentQuestions.map((q, i) => ({
          number: i + 1,
          questionId: q.id,
          domainId: q.domainId,
          difficulty: q.difficulty,
          scenario: q.scenario,
          text: q.text,
          options: q.options,
        })),
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }] };
    }
  );
}
