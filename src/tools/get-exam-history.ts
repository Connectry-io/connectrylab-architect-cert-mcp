import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { getExamHistory } from '../db/exam-attempts.js';
import { ensureUser } from '../db/users.js';

export function registerGetExamHistory(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'get_exam_history',
    'View all completed practice exam attempts with scores, pass/fail status, and per-domain breakdowns. Compare your progress across attempts.',
    {},
    async () => {
      const userId = userConfig.userId;
      ensureUser(db, userId);
      const history = getExamHistory(db, userId);

      if (history.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: [
              '═══ EXAM HISTORY ═══',
              '',
              'No completed practice exams yet.',
              '',
              'Use start_practice_exam to take your first 60-question practice exam.',
              'Questions are weighted by domain — just like the real exam.',
            ].join('\n'),
          }],
        };
      }

      const lines: string[] = [
        '═══ EXAM HISTORY ═══',
        '',
        `Total Attempts: ${history.length}`,
        `Best Score: ${Math.max(...history.map(h => h.score))}/1000`,
        `Latest Score: ${history[0].score}/1000`,
        '',
      ];

      for (const [i, attempt] of history.entries()) {
        const label = i === 0 ? ' (latest)' : '';
        lines.push(`─── Attempt #${history.length - i}${label} ───`);
        lines.push(`  Date: ${attempt.completedAt ?? attempt.startedAt}`);
        lines.push(`  Score: ${attempt.score}/1000 ${attempt.passed ? '✅ PASSED' : '❌ FAILED'}`);
        lines.push(`  Correct: ${attempt.correctAnswers}/${attempt.totalQuestions} (${Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)}%)`);
        lines.push('');
        lines.push('  Domain Scores:');

        const scores = attempt.domainScores;
        for (const key of Object.keys(scores).sort()) {
          const ds = scores[key];
          lines.push(`    D${ds.domainId}: ${ds.domainTitle} — ${ds.correctAnswers}/${ds.totalQuestions} (${ds.accuracyPercent}%)`);
        }

        // Show improvement from previous attempt
        if (i < history.length - 1) {
          const previous = history[i + 1];
          const diff = attempt.score - previous.score;
          const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
          lines.push('');
          lines.push(`  Change from previous: ${arrow} ${diff > 0 ? '+' : ''}${diff} points`);
        }

        lines.push('');
      }

      // Trend summary
      if (history.length >= 2) {
        const latest = history[0].score;
        const first = history[history.length - 1].score;
        const totalImprovement = latest - first;
        lines.push('─── Overall Trend ───');
        lines.push(`  First attempt: ${first}/1000`);
        lines.push(`  Latest attempt: ${latest}/1000`);
        lines.push(`  Total improvement: ${totalImprovement > 0 ? '+' : ''}${totalImprovement} points`);
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }
  );
}
