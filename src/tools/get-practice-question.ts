import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { loadQuestions } from '../data/loader.js';
import { selectNextQuestion } from '../engine/question-selector.js';
import { getAnsweredQuestionIds } from '../db/answers.js';
import { getOverdueReviews } from '../db/review-schedule.js';
import { getWeakAreas } from '../db/mastery.js';
import { ensureUser } from '../db/users.js';

export function registerGetPracticeQuestion(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'get_practice_question',
    'Get the next practice question based on your learning progress. Prioritizes review questions, then weak areas, then new material.',
    {
      domainId: z.number().optional().describe('Optional domain ID to filter questions (1-5)'),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('Optional difficulty filter'),
    },
    async ({ domainId, difficulty }) => {
      const userId = userConfig.userId;
      ensureUser(db, userId);
      const answeredIds = getAnsweredQuestionIds(db, userId);
      const overdueReviews = getOverdueReviews(db, userId);
      const weakAreas = getWeakAreas(db, userId);
      let questions = loadQuestions(domainId);
      if (difficulty) {
        questions = questions.filter(q => q.difficulty === difficulty);
      }
      const question = selectNextQuestion(questions, overdueReviews, weakAreas, answeredIds);
      if (!question) {
        return {
          content: [{ type: 'text' as const, text: 'No more questions available for the selected criteria. Try a different domain or difficulty.' }],
        };
      }
      const response = {
        questionId: question.id,
        taskStatement: question.taskStatement,
        domainId: question.domainId,
        difficulty: question.difficulty,
        scenario: question.scenario,
        text: question.text,
        options: question.options,
      };
      return { content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }] };
    }
  );
}
