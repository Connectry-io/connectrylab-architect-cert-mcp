import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { BUILD_STEPS } from '../data/build-steps.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- Domain name map ----

const DOMAIN_NAMES: Readonly<Record<number, string>> = {
  1: 'Agentic Architecture',
  2: 'Tool Design & MCP',
  3: 'Claude Code Config',
  4: 'Prompt Engineering',
  5: 'Context & Reliability',
};

const ALL_DOMAIN_IDS = [1, 2, 3, 4, 5] as const;

// ---- Dashboard data shape ----

interface DashboardDomain {
  readonly id: number;
  readonly name: string;
  readonly mastery: number;
  readonly level: string;
  readonly answered: number;
  readonly total: number;
}

interface DashboardExamEntry {
  readonly date: string;
  readonly score: number;
  readonly passed: boolean;
}

interface DashboardActivity {
  readonly questionId: string;
  readonly domain: string;
  readonly correct: boolean;
  readonly timestamp: string;
}

interface DashboardCapstone {
  readonly theme: string;
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly criteriaCompleted: number;
  readonly totalCriteria: number;
}

interface DashboardData {
  readonly overallReadiness: number;
  readonly domains: readonly DashboardDomain[];
  readonly examHistory: readonly DashboardExamEntry[];
  readonly recentActivity: readonly DashboardActivity[];
  readonly capstoneBuild: DashboardCapstone | null;
}

// ---- Data queries ----

interface DomainAggRow {
  readonly domainId: number;
  readonly totalAttempts: number;
  readonly avgAccuracy: number;
  readonly masteryLevel: string;
  readonly taskCount: number;
}

interface ExamRow {
  readonly completedAt: string;
  readonly score: number;
  readonly passed: number;
}

interface AnswerRow {
  readonly questionId: string;
  readonly domainId: number;
  readonly isCorrect: number;
  readonly answeredAt: string;
}

interface CapstoneRow {
  readonly theme: string;
  readonly currentStep: number;
  readonly id: string;
}

interface StepRow {
  readonly buildCompleted: number;
  readonly taskStatements: string;
}

function buildDashboardData(db: Database.Database, userId: string): DashboardData {
  // Domain mastery aggregated by domainId
  const domainRows = db.prepare(`
    SELECT domainId,
           SUM(totalAttempts) as totalAttempts,
           AVG(accuracyPercent) as avgAccuracy,
           MIN(masteryLevel) as masteryLevel,
           COUNT(*) as taskCount
    FROM domain_mastery
    WHERE userId = ?
    GROUP BY domainId
    ORDER BY domainId ASC
  `).all(userId) as readonly DomainAggRow[];

  const domainMap = new Map(domainRows.map(r => [r.domainId, r]));

  const domains: readonly DashboardDomain[] = ALL_DOMAIN_IDS.map(id => {
    const row = domainMap.get(id);
    return {
      id,
      name: DOMAIN_NAMES[id] ?? `Domain ${id}`,
      mastery: row ? Math.round(row.avgAccuracy) : 0,
      level: row ? deriveDomainLevel(row.avgAccuracy) : 'unassessed',
      answered: row ? row.totalAttempts : 0,
      total: row ? row.taskCount : 0,
    };
  });

  const overallReadiness = domains.length > 0
    ? Math.round(domains.reduce((sum, d) => sum + d.mastery, 0) / domains.length)
    : 0;

  // Exam history
  const examRows = db.prepare(`
    SELECT completedAt, score, passed
    FROM exam_attempts
    WHERE userId = ? AND completedAt IS NOT NULL
    ORDER BY completedAt DESC
  `).all(userId) as readonly ExamRow[];

  const examHistory: readonly DashboardExamEntry[] = examRows.map(r => ({
    date: r.completedAt,
    score: r.score,
    passed: Boolean(r.passed),
  }));

  // Recent activity (last 10 answers)
  const answerRows = db.prepare(`
    SELECT questionId, domainId, isCorrect, answeredAt
    FROM answers
    WHERE userId = ?
    ORDER BY answeredAt DESC
    LIMIT 10
  `).all(userId) as readonly AnswerRow[];

  const recentActivity: readonly DashboardActivity[] = answerRows.map(r => ({
    questionId: r.questionId,
    domain: DOMAIN_NAMES[r.domainId] ?? `Domain ${r.domainId}`,
    correct: Boolean(r.isCorrect),
    timestamp: r.answeredAt,
  }));

  // Capstone build
  const capstoneRow = db.prepare(`
    SELECT id, theme, currentStep
    FROM capstone_builds
    WHERE userId = ? AND status IN ('shaping', 'building')
    ORDER BY createdAt DESC
    LIMIT 1
  `).get(userId) as CapstoneRow | undefined;

  let capstoneBuild: DashboardCapstone | null = null;

  if (capstoneRow) {
    const steps = db.prepare(`
      SELECT buildCompleted, taskStatements
      FROM capstone_build_steps
      WHERE buildId = ?
      ORDER BY stepIndex ASC
    `).all(capstoneRow.id) as readonly StepRow[];

    const coveredCriteria = new Set<string>();
    for (const step of steps) {
      if (!step.buildCompleted) continue;
      const taskStatements = JSON.parse(step.taskStatements) as readonly string[];
      for (const ts of taskStatements) {
        coveredCriteria.add(ts);
      }
    }

    capstoneBuild = {
      theme: capstoneRow.theme,
      currentStep: capstoneRow.currentStep,
      totalSteps: BUILD_STEPS.length,
      criteriaCompleted: coveredCriteria.size,
      totalCriteria: BUILD_STEPS.reduce((sum, s) => sum + s.taskStatements.length, 0),
    };
  }

  return { overallReadiness, domains, examHistory, recentActivity, capstoneBuild };
}

function deriveDomainLevel(avgAccuracy: number): string {
  if (avgAccuracy >= 90) return 'mastered';
  if (avgAccuracy >= 70) return 'strong';
  if (avgAccuracy >= 50) return 'developing';
  if (avgAccuracy > 0) return 'weak';
  return 'unassessed';
}

// ---- MIME types ----

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}

// ---- HTTP server ----

export function startDashboardServer(
  db: Database.Database,
  userConfig: UserConfig,
): Promise<{ port: number; close: () => void }> {
  // In bundled mode, __dirname is dist/. UI files are at dist/ui/.
  // In dev mode, __dirname is src/ui/. UI files are at ../../dist/ui/.
  const bundledPath = path.resolve(__dirname, 'ui');
  const devPath = path.resolve(__dirname, '..', '..', 'dist', 'ui');
  const distUiDir = fs.existsSync(bundledPath) ? bundledPath : devPath;
  const userId = userConfig.userId;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost`);
    const pathname = url.pathname;

    // CORS headers for local dev
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (pathname === '/api/data') {
      const data = buildDashboardData(db, userId);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/dashboard' || pathname === '/') {
      const htmlPath = path.join(distUiDir, 'dashboard.html');
      let html: string;
      try {
        html = fs.readFileSync(htmlPath, 'utf-8');
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('dashboard.html not found');
        return;
      }

      const data = buildDashboardData(db, userId);
      const injection = `<script>window.__DASHBOARD_DATA__ = ${JSON.stringify(data)};</script>`;
      const injectedHtml = html.replace('</head>', `${injection}\n</head>`);

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(injectedHtml);
      return;
    }

    // Static file serving
    const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(distUiDir, safePath);

    // Prevent directory traversal
    if (!filePath.startsWith(distUiDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }
      resolve({
        port: addr.port,
        close: () => server.close(),
      });
    });
  });
}
