import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_SQL } from './schema.js';

export function createDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA_SQL);
  return db;
}

export function getDefaultDbPath(): string {
  const dir = path.join(
    process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.',
    '.connectry-architect'
  );
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'progress.db');
}
