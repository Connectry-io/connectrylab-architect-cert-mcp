import type Database from 'better-sqlite3';
import type { ExamAttempt, DomainExamScore } from '../types.js';

export function createExamAttempt(
  db: Database.Database,
  userId: string,
  questionIds: readonly string[],
): number {
  const stmt = db.prepare(
    'INSERT INTO exam_attempts (userId, totalQuestions, questionIds) VALUES (?, ?, ?)'
  );
  const result = stmt.run(userId, questionIds.length, JSON.stringify(questionIds));
  return Number(result.lastInsertRowid);
}

export function getActiveExam(db: Database.Database, userId: string): ExamAttempt | null {
  const row = db.prepare(
    'SELECT * FROM exam_attempts WHERE userId = ? AND completedAt IS NULL ORDER BY startedAt DESC LIMIT 1'
  ).get(userId) as Record<string, unknown> | undefined;
  return row ? rowToExamAttempt(row) : null;
}

export function getExamById(db: Database.Database, examId: number): ExamAttempt | null {
  const row = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(examId) as Record<string, unknown> | undefined;
  return row ? rowToExamAttempt(row) : null;
}

export function recordExamAnswer(
  db: Database.Database,
  examId: number,
  questionId: string,
  isCorrect: boolean,
  domainId: number,
): void {
  const row = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(examId) as Record<string, unknown> | undefined;
  if (!row) return;

  const answeredIds: string[] = JSON.parse(row.answeredQuestionIds as string);
  const updatedAnswered = [...answeredIds, questionId];
  const newCorrect = (row.correctAnswers as number) + (isCorrect ? 1 : 0);

  const domainScores: Record<string, DomainExamScore> = JSON.parse(row.domainScores as string);
  const domainKey = `d${domainId}`;
  const existing = domainScores[domainKey];
  if (existing) {
    const updatedCorrect = existing.correctAnswers + (isCorrect ? 1 : 0);
    const updatedTotal = existing.totalQuestions;
    domainScores[domainKey] = {
      ...existing,
      correctAnswers: updatedCorrect,
      accuracyPercent: Math.round((updatedCorrect / updatedTotal) * 100),
    };
  }

  db.prepare(
    'UPDATE exam_attempts SET correctAnswers = ?, answeredQuestionIds = ?, domainScores = ? WHERE id = ?'
  ).run(newCorrect, JSON.stringify(updatedAnswered), JSON.stringify(domainScores), examId);
}

export function completeExam(db: Database.Database, examId: number): ExamAttempt | null {
  const row = db.prepare('SELECT * FROM exam_attempts WHERE id = ?').get(examId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const totalQuestions = row.totalQuestions as number;
  const correctAnswers = row.correctAnswers as number;
  const score = Math.round((correctAnswers / totalQuestions) * 1000);
  const passed = score >= 720;

  db.prepare(
    'UPDATE exam_attempts SET completedAt = CURRENT_TIMESTAMP, score = ?, passed = ? WHERE id = ?'
  ).run(score, passed ? 1 : 0, examId);

  return getExamById(db, examId);
}

export function getExamHistory(db: Database.Database, userId: string): readonly ExamAttempt[] {
  const rows = db.prepare(
    'SELECT * FROM exam_attempts WHERE userId = ? AND completedAt IS NOT NULL ORDER BY completedAt DESC'
  ).all(userId) as Record<string, unknown>[];
  return rows.map(rowToExamAttempt);
}

function rowToExamAttempt(row: Record<string, unknown>): ExamAttempt {
  return {
    id: row.id as number,
    userId: row.userId as string,
    startedAt: row.startedAt as string,
    completedAt: (row.completedAt as string) ?? null,
    totalQuestions: row.totalQuestions as number,
    correctAnswers: row.correctAnswers as number,
    score: row.score as number,
    passed: Boolean(row.passed),
    questionIds: JSON.parse(row.questionIds as string),
    answeredQuestionIds: JSON.parse(row.answeredQuestionIds as string),
    domainScores: JSON.parse(row.domainScores as string),
  };
}
