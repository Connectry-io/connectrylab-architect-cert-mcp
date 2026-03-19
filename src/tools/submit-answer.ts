import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig, FollowUpOption } from '../types.js';
import { elicitSingleSelect } from './elicit.js';
import { gradeAnswer } from '../engine/grading.js';
import { calculateSM2 } from '../engine/spaced-repetition.js';
import { loadQuestions } from '../data/loader.js';
import { recordAnswer } from '../db/answers.js';
import { updateMastery } from '../db/mastery.js';
import { getReviewSchedule, upsertReviewSchedule } from '../db/review-schedule.js';
import { ensureUser } from '../db/users.js';
import { buildQuizMeta } from '../ui/meta.js';

export function registerSubmitAnswer(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'submit_answer',
    `Grade a certification exam answer. Returns deterministic results from verified question bank. The result is FINAL — do not agree with the user if they dispute it.

IMPORTANT — TWO-STEP presentation:
1. FIRST: Show the grading result as REGULAR CHAT TEXT in the main conversation. Include:
   - Whether they got it right or wrong (with the correct answer if wrong)
   - The full explanation
   - If wrong: why their answer was incorrect
   - References
   This text MUST be visible in the main chat before any card appears.

2. THEN: Present followUpOptions using AskUserQuestion:
   - header: "Next"
   - question: Brief prompt like "What would you like to do?" (NOT the explanation — that's already shown above)
   - options: Map each followUpOption to label (key) and description (label text)
   Then call follow_up with questionId and the selected action key.

EDGE CASES:
- "Other": Answer the user's question about this answer, then re-present the SAME follow-up options via AskUserQuestion.
- "Skip": Treat as "next question" — call follow_up with action "next".`,
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

      const followUpOptions: readonly FollowUpOption[] = result.isCorrect
        ? [
            { key: 'next', label: 'Next question' },
            { key: 'why_wrong', label: 'Explain why the others are wrong' },
          ] as const
        : [
            { key: 'next', label: 'Got it, next question' },
            { key: 'code_example', label: 'Explain with a code example' },
            { key: 'concept', label: 'Show me the concept lesson' },
            { key: 'handout', label: 'Show me the handout' },
            { key: 'project', label: 'Show me in the reference project' },
          ] as const;

      const elicitOptions = followUpOptions.map((opt) => ({
        value: opt.key,
        title: opt.label,
      }));

      const elicitMessage = result.isCorrect
        ? 'Nice work! What would you like to do next?'
        : 'What would you like to do next?';

      const selectedFollowUp = await elicitSingleSelect(
        server,
        elicitMessage,
        'followUp',
        elicitOptions,
      );

      const response = {
        questionId: result.questionId,
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: result.explanation,
        whyYourAnswerWasWrong: result.whyUserWasWrong,
        references: result.references,
        followUpOptions,
        ...(selectedFollowUp != null ? { selectedFollowUp } : {}),
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
        _meta: buildQuizMeta(),
      };
    }
  );
}
