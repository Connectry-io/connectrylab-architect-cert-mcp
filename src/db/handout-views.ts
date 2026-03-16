import type Database from 'better-sqlite3';

export function recordHandoutView(db: Database.Database, userId: string, taskStatement: string): void {
  db.prepare(`INSERT INTO handout_views (userId, taskStatement) VALUES (?, ?) ON CONFLICT(userId, taskStatement) DO UPDATE SET viewedAt = CURRENT_TIMESTAMP`).run(userId, taskStatement);
}

export function hasViewedHandout(db: Database.Database, userId: string, taskStatement: string): boolean {
  const row = db.prepare('SELECT 1 FROM handout_views WHERE userId = ? AND taskStatement = ?').get(userId, taskStatement);
  return row !== undefined;
}
