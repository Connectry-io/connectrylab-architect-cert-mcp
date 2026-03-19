import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { loadQuestions, loadCurriculum } from '../data/loader.js';
import { buildPracticeExam, buildInitialDomainScores, EXAM_DISTRIBUTION } from '../engine/exam-builder.js';
import { createExamAttempt, getActiveExam, getExamHistory } from '../db/exam-attempts.js';
import { ensureUser } from '../db/users.js';
import { elicitSingleSelect } from './elicit.js';
import { buildQuizMeta } from '../ui/meta.js';

export function registerStartPracticeExam(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'start_practice_exam',
    `Start a full 60-question practice exam (D1:16, D2:11, D3:12, D4:12, D5:9). Scored 0-1000, passing 720.

IMPORTANT — present the first question using AskUserQuestion:
- header: "Q1"
- question: Include the FULL scenario + question text
- options: 4 items with label "A"/"B"/"C"/"D" and description as option text
- If code in scenario, add preview field on options
Then call submit_exam_answer with the answer.

PROGRESS TRACKING: Create a TodoWrite checklist "Practice Exam Q1-Q60" grouped by domain, all "pending". Update each to "completed" after grading.

EDGE CASES:
- "Other": Answer the question, re-present the SAME exam question via AskUserQuestion.
- "Skip": Move to next exam question without grading. Never break the flow.`,
    {},
    async () => {
      const userId = userConfig.userId;
      ensureUser(db, userId);

      // Check for active exam
      const active = getActiveExam(db, userId);
      if (active) {
        const remaining = active.totalQuestions - active.answeredQuestionIds.length;
        return {
          content: [{
            type: 'text' as const,
            text: [
              '═══ PRACTICE EXAM IN PROGRESS ═══',
              '',
              `You have an active practice exam (started ${active.startedAt}).`,
              `Progress: ${active.answeredQuestionIds.length}/${active.totalQuestions} questions answered`,
              `Remaining: ${remaining} questions`,
              '',
              'Use get_practice_exam_question to continue, or ask to abandon this exam first.',
            ].join('\n'),
          }],
        };
      }

      const allQuestions = loadQuestions();
      const curriculum = loadCurriculum();
      const domainTitles = new Map(curriculum.domains.map(d => [d.id, d.title]));

      // Gather question IDs from the most recent exam to avoid repetition
      const history = getExamHistory(db, userId);
      const recentIds = new Set(
        history.length > 0 ? history[0].questionIds : []
      );

      const examQuestions = buildPracticeExam(allQuestions, recentIds);
      const questionIds = examQuestions.map(q => q.id);
      const domainScores = buildInitialDomainScores(examQuestions, domainTitles);

      const examId = createExamAttempt(db, userId, questionIds);

      // Store domain scores
      db.prepare('UPDATE exam_attempts SET domainScores = ? WHERE id = ?')
        .run(JSON.stringify(domainScores), examId);

      const distribution = EXAM_DISTRIBUTION.map(({ domainId, count }) => {
        const title = domainTitles.get(domainId) ?? `Domain ${domainId}`;
        return `  D${domainId}: ${title} — ${count} questions (${domainScores[`d${domainId}`].weight}%)`;
      });

      const firstQuestion = examQuestions[0];

      const text = [
            '═══ PRACTICE EXAM STARTED ═══',
            '',
            'Simulating the Claude Certified Architect — Foundations exam.',
            '',
            `Exam ID: ${examId}`,
            'Total Questions: 60',
            'Passing Score: 720/1000',
            '',
            'Question Distribution:',
            ...distribution,
            '',
            '─── Question 1 of 60 ───',
            '',
            `Domain: D${firstQuestion.domainId}`,
            `Task: ${firstQuestion.taskStatement}`,
            `Difficulty: ${firstQuestion.difficulty}`,
            '',
            `Scenario: ${firstQuestion.scenario}`,
            '',
            firstQuestion.text,
            '',
            `A) ${firstQuestion.options.A}`,
            `B) ${firstQuestion.options.B}`,
            `C) ${firstQuestion.options.C}`,
            `D) ${firstQuestion.options.D}`,
            '',
            `[Submit your answer using submit_exam_answer with examId: ${examId} and questionId: "${firstQuestion.id}"]`,
          ].join('\n');

      const selected = await elicitSingleSelect(server, 'Select your answer:', 'answer', [
        { value: 'A', title: `A) ${firstQuestion.options.A}` },
        { value: 'B', title: `B) ${firstQuestion.options.B}` },
        { value: 'C', title: `C) ${firstQuestion.options.C}` },
        { value: 'D', title: `D) ${firstQuestion.options.D}` },
      ]);

      const responseText = selected !== null
        ? `${text}\n\nUser selected: ${selected}`
        : text;

      return {
        content: [{
          type: 'text' as const,
          text: responseText,
        }],
        _meta: buildQuizMeta(),
      };
    }
  );
}
