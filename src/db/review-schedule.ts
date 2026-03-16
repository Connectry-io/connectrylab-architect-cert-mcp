import type Database from 'better-sqlite3';
import type { ReviewScheduleEntry } from '../types.js';

export function getReviewSchedule(db: Database.Database, userId: string, taskStatement: string): ReviewScheduleEntry | undefined {
  return db.prepare('SELECT * FROM review_schedule WHERE userId = ? AND taskStatement = ?').get(userId, taskStatement) as ReviewScheduleEntry | undefined;
}

export function getOverdueReviews(db: Database.Database, userId: string): readonly ReviewScheduleEntry[] {
  return db.prepare('SELECT * FROM review_schedule WHERE userId = ? AND nextReviewAt <= CURRENT_TIMESTAMP ORDER BY nextReviewAt ASC').all(userId) as ReviewScheduleEntry[];
}

export function upsertReviewSchedule(
  db: Database.Database, userId: string, taskStatement: string, interval: number, easeFactor: number, consecutiveCorrect: number, nextReviewAt: string
): void {
  db.prepare(`
    INSERT INTO review_schedule (userId, taskStatement, nextReviewAt, interval, easeFactor, consecutiveCorrect) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId, taskStatement) DO UPDATE SET nextReviewAt = excluded.nextReviewAt, interval = excluded.interval, easeFactor = excluded.easeFactor, consecutiveCorrect = excluded.consecutiveCorrect
  `).run(userId, taskStatement, nextReviewAt, interval, easeFactor, consecutiveCorrect);
}
