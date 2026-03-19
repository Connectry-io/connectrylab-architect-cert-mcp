import type DatabaseType from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { SCHEMA_SQL } from './schema.js';

function getDefaultDbPath(): string {
  const dir = path.join(
    process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.',
    '.connectry-architect',
  );
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'progress.db');
}

/**
 * Lazy database wrapper. Defers the expensive better-sqlite3 native module
 * load and DB initialization until the first actual tool call.
 * This lets the MCP server register tools and connect to stdio instantly.
 */
export function createLazyDb(): DatabaseType.Database {
  let instance: DatabaseType.Database | null = null;

  function getInstance(): DatabaseType.Database {
    if (!instance) {
      const require = createRequire(import.meta.url);
      const Database = require('better-sqlite3') as typeof DatabaseType;
      const dbPath = process.env['CONNECTRY_DB_PATH'] ?? getDefaultDbPath();
      instance = new Database(dbPath);
      instance.pragma('journal_mode = WAL');
      instance.pragma('foreign_keys = ON');
      instance.pragma('synchronous = NORMAL');
      instance.pragma('busy_timeout = 5000');
      instance.exec(SCHEMA_SQL);
    }
    return instance;
  }

  // Proxy forwards all access to the real DB instance, created on first use
  return new Proxy({} as DatabaseType.Database, {
    get(_target, prop, receiver) {
      const db = getInstance();
      const value = Reflect.get(db, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(db);
      }
      return value;
    },
    set(_target, prop, value) {
      const db = getInstance();
      return Reflect.set(db, prop, value);
    },
  });
}
