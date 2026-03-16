import type Database from 'better-sqlite3';
import type { User } from '../types.js';

export function ensureUser(db: Database.Database, userId: string): User {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
  if (existing) {
    db.prepare('UPDATE users SET lastActivityAt = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
    return { ...existing, lastActivityAt: new Date().toISOString() };
  }
  db.prepare(
    'INSERT INTO users (id, createdAt, lastActivityAt) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
  ).run(userId);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;
}

export function updateLearningPath(db: Database.Database, userId: string, path: string): void {
  db.prepare('UPDATE users SET learningPath = ?, assessmentCompleted = TRUE WHERE id = ?').run(path, userId);
}

export function getUser(db: Database.Database, userId: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User | undefined;
}
