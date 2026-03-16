import type Database from 'better-sqlite3';
import type { SessionState, StackFrame } from '../types.js';

export function getSessionState(db: Database.Database, userId: string): SessionState | undefined {
  const row = db.prepare('SELECT * FROM session_state WHERE userId = ?').get(userId) as any;
  if (!row) return undefined;
  return {
    ...row,
    positionStack: JSON.parse(row.positionStack) as readonly StackFrame[],
    reviewQueueIds: JSON.parse(row.reviewQueueIds) as readonly string[],
  };
}

export function saveSessionState(db: Database.Database, state: SessionState): void {
  db.prepare(`
    INSERT INTO session_state (userId, currentMode, currentDomain, currentTaskStatement, currentQuestionIndex, positionStack, reviewQueueIds, lastUpdatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(userId) DO UPDATE SET
      currentMode = excluded.currentMode, currentDomain = excluded.currentDomain,
      currentTaskStatement = excluded.currentTaskStatement, currentQuestionIndex = excluded.currentQuestionIndex,
      positionStack = excluded.positionStack, reviewQueueIds = excluded.reviewQueueIds, lastUpdatedAt = CURRENT_TIMESTAMP
  `).run(state.userId, state.currentMode, state.currentDomain, state.currentTaskStatement, state.currentQuestionIndex, JSON.stringify(state.positionStack), JSON.stringify(state.reviewQueueIds));
}

export function startStudySession(db: Database.Database, userId: string, mode: string, domainId?: number): number {
  const result = db.prepare('INSERT INTO study_sessions (userId, mode, domainId) VALUES (?, ?, ?)').run(userId, mode, domainId ?? null);
  return Number(result.lastInsertRowid);
}

export function endStudySession(db: Database.Database, sessionId: number, questionsAnswered: number, correctAnswers: number): void {
  db.prepare('UPDATE study_sessions SET endedAt = CURRENT_TIMESTAMP, questionsAnswered = ?, correctAnswers = ? WHERE id = ?').run(questionsAnswered, correctAnswers, sessionId);
}
