import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig, Question } from '../types.js';
import { loadQuestions } from '../data/loader.js';
import { gradeAnswer } from '../engine/grading.js';
import { getExamById, recordExamAnswer, completeExam, getExamHistory } from '../db/exam-attempts.js';
import { ensureUser } from '../db/users.js';

export function registerSubmitExamAnswer(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'submit_exam_answer',
    'Submit an answer for a practice exam question. The answer is graded deterministically. After all 60 questions, the exam is scored and saved. DO NOT soften results — relay the grading output verbatim.',
    {
      examId: z.number().describe('The practice exam ID'),
      questionId: z.string().describe('The question ID being answered'),
      answer: z.string().describe('Your answer: A, B, C, or D'),
    },
    async ({ examId, questionId, answer }) => {
      const userId = userConfig.userId;
      ensureUser(db, userId);

      const exam = getExamById(db, examId);
      if (!exam) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Exam not found', examId }) }],
          isError: true,
        };
      }
      if (exam.completedAt) {
        return {
          content: [{ type: 'text' as const, text: 'This exam is already completed. Start a new practice exam to try again.' }],
          isError: true,
        };
      }
      if (exam.answeredQuestionIds.includes(questionId)) {
        return {
          content: [{ type: 'text' as const, text: `Question ${questionId} has already been answered in this exam.` }],
          isError: true,
        };
      }

      const allQuestions = loadQuestions();
      const question = allQuestions.find(q => q.id === questionId);
      if (!question) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Question not found', questionId }) }],
          isError: true,
        };
      }

      // Grade the answer
      const result = gradeAnswer(question, answer);

      // Record in exam
      recordExamAnswer(db, examId, questionId, result.isCorrect, question.domainId);

      const answeredCount = exam.answeredQuestionIds.length + 1;
      const remaining = exam.totalQuestions - answeredCount;

      const lines: string[] = [];

      // Grade feedback
      if (result.isCorrect) {
        lines.push(`✅ Correct! (${answeredCount}/${exam.totalQuestions})`);
      } else {
        lines.push(`❌ Incorrect. The correct answer is ${result.correctAnswer}. (${answeredCount}/${exam.totalQuestions})`);
        if (result.whyUserWasWrong) {
          lines.push('', `Why ${result.userAnswer} is wrong: ${result.whyUserWasWrong}`);
        }
      }
      lines.push('', result.explanation);

      // Check if exam is complete
      if (remaining === 0) {
        const completed = completeExam(db, examId);
        if (completed) {
          lines.push('', '═══ PRACTICE EXAM COMPLETE ═══', '');
          lines.push(`Score: ${completed.score}/1000`);
          lines.push(`Result: ${completed.passed ? '✅ PASSED' : '❌ FAILED'} (passing: 720/1000)`);
          lines.push(`Correct: ${completed.correctAnswers}/${completed.totalQuestions}`);
          lines.push('');
          lines.push('Domain Breakdown:');

          const scores = completed.domainScores;
          for (const key of Object.keys(scores).sort()) {
            const ds = scores[key];
            lines.push(`  D${ds.domainId}: ${ds.domainTitle} — ${ds.correctAnswers}/${ds.totalQuestions} (${ds.accuracyPercent}%) [weight: ${ds.weight}%]`);
          }

          // Compare with previous attempts
          const history = getExamHistory(db, userId);
          if (history.length > 1) {
            const previous = history[1]; // history[0] is current
            const scoreDiff = completed.score - previous.score;
            const arrow = scoreDiff > 0 ? '↑' : scoreDiff < 0 ? '↓' : '→';
            lines.push('');
            lines.push('─── Compared to Previous Attempt ───');
            lines.push(`  Previous score: ${previous.score}/1000 ${previous.passed ? '(passed)' : '(failed)'}`);
            lines.push(`  Change: ${arrow} ${scoreDiff > 0 ? '+' : ''}${scoreDiff} points`);

            // Per-domain comparison
            for (const key of Object.keys(scores).sort()) {
              const current = scores[key];
              const prev = previous.domainScores[key];
              if (prev) {
                const diff = current.accuracyPercent - prev.accuracyPercent;
                const dArrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
                lines.push(`  D${current.domainId}: ${prev.accuracyPercent}% → ${current.accuracyPercent}% ${dArrow}`);
              }
            }
          }
        }
      } else {
        // Serve next question
        const nextQuestionId = exam.questionIds.find(
          id => !exam.answeredQuestionIds.includes(id) && id !== questionId
        );
        if (nextQuestionId) {
          const nextQuestion = allQuestions.find(q => q.id === nextQuestionId);
          if (nextQuestion) {
            lines.push('');
            lines.push(`─── Question ${answeredCount + 1} of ${exam.totalQuestions} ───`);
            lines.push('');
            lines.push(`Domain: D${nextQuestion.domainId}`);
            lines.push(`Task: ${nextQuestion.taskStatement}`);
            lines.push(`Difficulty: ${nextQuestion.difficulty}`);
            lines.push('');
            lines.push(`Scenario: ${nextQuestion.scenario}`);
            lines.push('');
            lines.push(nextQuestion.text);
            lines.push('');
            lines.push(`A) ${nextQuestion.options.A}`);
            lines.push(`B) ${nextQuestion.options.B}`);
            lines.push(`C) ${nextQuestion.options.C}`);
            lines.push(`D) ${nextQuestion.options.D}`);
          }
        }
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
