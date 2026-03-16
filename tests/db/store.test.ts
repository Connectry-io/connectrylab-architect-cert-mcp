import { describe, it, expect, afterEach } from 'vitest';
import { createDatabase } from '../../src/db/store.js';
import Database from 'better-sqlite3';

describe('store', () => {
  let db: Database.Database;

  afterEach(() => {
    if (db) db.close();
  });

  it('creates all required tables', () => {
    db = createDatabase(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('domain_mastery');
    expect(tableNames).toContain('answers');
    expect(tableNames).toContain('review_schedule');
    expect(tableNames).toContain('study_sessions');
    expect(tableNames).toContain('handout_views');
    expect(tableNames).toContain('session_state');
  });

  it('enables WAL mode', () => {
    db = createDatabase(':memory:');
    const result = db.pragma('journal_mode') as Array<{ journal_mode: string }>;
    expect(result).toBeDefined();
  });

  it('enables foreign keys', () => {
    db = createDatabase(':memory:');
    const result = db.pragma('foreign_keys') as Array<{ foreign_keys: number }>;
    expect(result[0].foreign_keys).toBe(1);
  });

  it('is idempotent', () => {
    db = createDatabase(':memory:');
    expect(() => createDatabase(':memory:')).not.toThrow();
  });
});
