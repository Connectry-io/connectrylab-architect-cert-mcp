import type Database from 'better-sqlite3';
import type { DomainMastery, MasteryLevel } from '../types.js';

export function getMastery(db: Database.Database, userId: string, taskStatement: string): DomainMastery | undefined {
  return db.prepare('SELECT * FROM domain_mastery WHERE userId = ? AND taskStatement = ?').get(userId, taskStatement) as DomainMastery | undefined;
}

export function getAllMastery(db: Database.Database, userId: string): readonly DomainMastery[] {
  return db.prepare('SELECT * FROM domain_mastery WHERE userId = ? ORDER BY domainId, taskStatement').all(userId) as DomainMastery[];
}

export function getWeakAreas(db: Database.Database, userId: string, threshold: number = 70): readonly DomainMastery[] {
  return db.prepare('SELECT * FROM domain_mastery WHERE userId = ? AND accuracyPercent < ? AND totalAttempts > 0 ORDER BY accuracyPercent ASC').all(userId, threshold) as DomainMastery[];
}

function calculateMasteryLevel(accuracy: number, total: number, consecutiveCorrect: number): MasteryLevel {
  if (total === 0) return 'unassessed';
  if (accuracy >= 90 && total >= 5 && consecutiveCorrect >= 3) return 'mastered';
  if (accuracy >= 70) return 'strong';
  if (accuracy >= 50) return 'developing';
  return 'weak';
}

export function updateMastery(
  db: Database.Database, userId: string, taskStatement: string, domainId: number, isCorrect: boolean, consecutiveCorrect: number
): DomainMastery {
  const existing = getMastery(db, userId, taskStatement);
  if (!existing) {
    const accuracy = isCorrect ? 100 : 0;
    const level = calculateMasteryLevel(accuracy, 1, isCorrect ? 1 : 0);
    db.prepare(`INSERT INTO domain_mastery (userId, taskStatement, domainId, totalAttempts, correctAttempts, accuracyPercent, masteryLevel, lastTestedAt) VALUES (?, ?, ?, 1, ?, ?, ?, CURRENT_TIMESTAMP)`).run(userId, taskStatement, domainId, isCorrect ? 1 : 0, accuracy, level);
  } else {
    const newTotal = existing.totalAttempts + 1;
    const newCorrect = existing.correctAttempts + (isCorrect ? 1 : 0);
    const accuracy = Math.round((newCorrect / newTotal) * 100);
    const level = calculateMasteryLevel(accuracy, newTotal, consecutiveCorrect);
    db.prepare(`UPDATE domain_mastery SET totalAttempts = ?, correctAttempts = ?, accuracyPercent = ?, masteryLevel = ?, lastTestedAt = CURRENT_TIMESTAMP WHERE userId = ? AND taskStatement = ?`).run(newTotal, newCorrect, accuracy, level, userId, taskStatement);
  }
  return getMastery(db, userId, taskStatement)!;
}
