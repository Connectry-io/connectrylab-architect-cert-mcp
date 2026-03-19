import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { startDashboardServer } from '../ui/server.js';

let cachedServer: { port: number; close: () => void } | null = null;

export function registerDashboard(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'get_dashboard',
    'Open the study progress dashboard in Claude Preview. Shows mastery levels, exam history, activity timeline, and capstone progress.\n\nIMPORTANT: After getting the URL, use the preview_start tool to open it in Claude Preview. If the user says "show dashboard" or "open dashboard", call this tool.',
    {},
    async () => {
      if (!cachedServer) {
        cachedServer = await startDashboardServer(db, userConfig);
      }

      const url = `http://127.0.0.1:${cachedServer.port}/dashboard`;

      // Also build a text summary for non-Preview clients
      const summary = buildTextSummary(db, userConfig.userId);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Dashboard ready at: ${url}\n\nUse preview_start to open this URL in Claude Preview.\n\n${summary}`,
          },
        ],
      };
    }
  );
}

function buildTextSummary(db: Database.Database, userId: string): string {
  const DOMAIN_NAMES: Readonly<Record<number, string>> = {
    1: 'Agentic Architecture',
    2: 'Tool Design & MCP',
    3: 'Claude Code Config',
    4: 'Prompt Engineering',
    5: 'Context & Reliability',
  };

  interface DomainSummaryRow {
    readonly domainId: number;
    readonly avgAccuracy: number;
    readonly totalAttempts: number;
  }

  const domainRows = db.prepare(`
    SELECT domainId, AVG(accuracyPercent) as avgAccuracy, SUM(totalAttempts) as totalAttempts
    FROM domain_mastery
    WHERE userId = ?
    GROUP BY domainId
    ORDER BY domainId ASC
  `).all(userId) as readonly DomainSummaryRow[];

  const domainMap = new Map(domainRows.map(r => [r.domainId, r]));

  const domainLines = [1, 2, 3, 4, 5].map(id => {
    const row = domainMap.get(id);
    const mastery = row ? Math.round(row.avgAccuracy) : 0;
    const answered = row ? row.totalAttempts : 0;
    return `  D${id}: ${DOMAIN_NAMES[id]} — ${mastery}% mastery, ${answered} answered`;
  });

  const overallMastery = domainRows.length > 0
    ? Math.round(domainRows.reduce((sum, r) => sum + r.avgAccuracy, 0) / 5)
    : 0;

  interface ExamCountRow {
    readonly total: number;
    readonly passed: number;
  }

  const examStats = db.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed
    FROM exam_attempts
    WHERE userId = ? AND completedAt IS NOT NULL
  `).get(userId) as ExamCountRow;

  return [
    '--- TEXT SUMMARY ---',
    `Overall Readiness: ${overallMastery}%`,
    '',
    'Domain Progress:',
    ...domainLines,
    '',
    `Practice Exams: ${examStats.total} taken, ${examStats.passed ?? 0} passed`,
  ].join('\n');
}
