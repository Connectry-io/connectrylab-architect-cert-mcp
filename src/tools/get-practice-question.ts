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
import { elicitSingleSelect } from './elicit.js';
import { buildQuizMeta } from '../ui/meta.js';

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

function formatQuestionText(question: {
  readonly id: string;
  readonly taskStatement: string;
  readonly domainId: number;
  readonly difficulty: string;
  readonly scenario: string;
  readonly text: string;
  readonly options: { readonly A: string; readonly B: string; readonly C: string; readonly D: string };
}): string {
  const lines = [
    `**Question ${question.id}** (Domain ${question.domainId} | ${question.difficulty})`,
    '',
    `**Task:** ${question.taskStatement}`,
    '',
    '---',
    '',
    question.scenario,
    '',
    `**${question.text}**`,
    '',
    ...OPTION_KEYS.map(key => `  **${key}.** ${question.options[key]}`),
  ];
  return lines.join('\n');
}

export function registerGetPracticeQuestion(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'get_practice_question',
    `Get the next practice question. Prioritizes review questions, then weak areas, then new material.

IMPORTANT — present the question using AskUserQuestion:
- header: "Answer"
- question: Include the FULL scenario text AND question text from the response
- options: 4 items with label "A"/"B"/"C"/"D" and description as the option text
- If the scenario contains code, add a "preview" field on each option showing the code snippet
Then call submit_answer with the questionId and selected answer. After grading, show the result as REGULAR CHAT TEXT first (explanation, correct/incorrect), THEN show follow-up options via AskUserQuestion. Explanations must be readable in the main chat, not hidden behind cards.

EDGE CASES:
- "Other": Answer the user's question, then re-present the SAME question via AskUserQuestion.
- "Skip": Call get_practice_question again for a new question. Never break the flow.`,
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

      const questionText = formatQuestionText(question);

      const elicitOptions = OPTION_KEYS.map(key => ({
        value: key,
        title: `${key}. ${question.options[key]}`,
      }));

      const selectedAnswer = await elicitSingleSelect(
        server,
        questionText,
        'answer',
        elicitOptions,
      );

      if (selectedAnswer) {
        const responseText = [
          questionText,
          '',
          '---',
          '',
          `**Selected answer: ${selectedAnswer}**`,
          '',
          `Use submit_answer with questionId "${question.id}" and answer "${selectedAnswer}" to grade this response.`,
        ].join('\n');

        return {
          content: [{ type: 'text' as const, text: responseText }],
          _meta: buildQuizMeta(),
        };
      }

      const fallbackText = [
        questionText,
        '',
        '---',
        '',
        `Question ID: ${question.id}`,
        '',
        'Use submit_answer with the question ID and your chosen answer (A, B, C, or D) to check your response.',
      ].join('\n');

      return {
        content: [{ type: 'text' as const, text: fallbackText }],
        _meta: buildQuizMeta(),
      };
    }
  );
}
