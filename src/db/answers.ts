import type Database from 'better-sqlite3';
import type { AnswerRecord } from '../types.js';

export function recordAnswer(
  db: Database.Database, userId: string, questionId: string, taskStatement: string,
  domainId: number, userAnswer: string, correctAnswer: string, isCorrect: boolean, difficulty: string
): void {
  db.prepare(`
    INSERT INTO answers (userId, questionId, taskStatement, domainId, userAnswer, correctAnswer, isCorrect, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, questionId, taskStatement, domainId, userAnswer, correctAnswer, isCorrect ? 1 : 0, difficulty);
}

export function getRecentAnswers(db: Database.Database, userId: string, limit: number = 50): readonly AnswerRecord[] {
  return db.prepare('SELECT * FROM answers WHERE userId = ? ORDER BY answeredAt DESC LIMIT ?').all(userId, limit) as AnswerRecord[];
}

export function getAnswersByTaskStatement(db: Database.Database, userId: string, taskStatement: string): readonly AnswerRecord[] {
  return db.prepare('SELECT * FROM answers WHERE userId = ? AND taskStatement = ? ORDER BY answeredAt DESC').all(userId, taskStatement) as AnswerRecord[];
}

export function getAnsweredQuestionIds(db: Database.Database, userId: string): Set<string> {
  const rows = db.prepare('SELECT DISTINCT questionId FROM answers WHERE userId = ?').all(userId) as Array<{ questionId: string }>;
  return new Set(rows.map(r => r.questionId));
}

export function getTotalStats(db: Database.Database, userId: string): { total: number; correct: number } {
  const row = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN isCorrect THEN 1 ELSE 0 END) as correct FROM answers WHERE userId = ?').get(userId) as { total: number; correct: number };
  return { total: row.total, correct: row.correct ?? 0 };
}
