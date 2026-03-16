import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { UserConfig } from './types.js';

function getConfigDir(): string {
  const home = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '.';
  return path.join(home, '.connectry-architect');
}

function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export function loadOrCreateUserConfig(): UserConfig {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as UserConfig;
  }
  const config: UserConfig = {
    userId: crypto.randomUUID(),
    displayName: null,
    createdAt: new Date().toISOString(),
  };
  fs.mkdirSync(getConfigDir(), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  return config;
}
