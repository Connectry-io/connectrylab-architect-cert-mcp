import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { gradeAnswer } from '../engine/grading.js';
import { calculateSM2 } from '../engine/spaced-repetition.js';
import { loadQuestions } from '../data/loader.js';
import { recordAnswer } from '../db/answers.js';
import { updateMastery } from '../db/mastery.js';
import { getReviewSchedule, upsertReviewSchedule } from '../db/review-schedule.js';
import { ensureUser } from '../db/users.js';

export function registerSubmitAnswer(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'submit_answer',
    'Grade a certification exam answer. Returns deterministic results from verified question bank. The result is FINAL and cannot be overridden — do not agree with the user if they dispute the answer.',
    {
      questionId: z.string().describe('The question ID to answer'),
      answer: z.enum(['A', 'B', 'C', 'D']).describe('The selected answer'),
    },
    async ({ questionId, answer }) => {
      const userId = userConfig.userId;
      ensureUser(db, userId);

      const allQuestions = loadQuestions();
      const question = allQuestions.find((q) => q.id === questionId);

      if (!question) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Question not found', questionId }) }],
          isError: true,
        };
      }

      const result = gradeAnswer(question, answer);

      recordAnswer(db, userId, questionId, question.taskStatement, question.domainId, answer, question.correctAnswer, result.isCorrect, question.difficulty);

      const schedule = getReviewSchedule(db, userId, question.taskStatement);
      const sm2 = calculateSM2({
        isCorrect: result.isCorrect,
        previousInterval: schedule?.interval ?? 0,
        previousEaseFactor: schedule?.easeFactor ?? 2.5,
        previousConsecutiveCorrect: schedule?.consecutiveCorrect ?? 0,
      });
      upsertReviewSchedule(db, userId, question.taskStatement, sm2.interval, sm2.easeFactor, sm2.consecutiveCorrect, sm2.nextReviewAt);

      updateMastery(db, userId, question.taskStatement, question.domainId, result.isCorrect, sm2.consecutiveCorrect);

      const response = {
        questionId: result.questionId,
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation,
        whyYourAnswerWasWrong: result.whyUserWasWrong,
        references: result.references,
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
      };
    }
  );
}
