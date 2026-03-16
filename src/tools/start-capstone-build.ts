import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { CRITERIA } from '../data/criteria.js';
import { getActiveBuild, createBuild, updateBuildTheme } from '../db/capstone.js';
import { ensureUser } from '../db/users.js';

function formatCriteria(): string {
  const lines: string[] = [];
  let currentDomain = 0;

  for (const criterion of CRITERIA) {
    if (criterion.domain !== currentDomain) {
      currentDomain = criterion.domain;
      if (lines.length > 0) lines.push('');
      lines.push(`Domain ${criterion.domain}: ${criterion.domainName}`);
    }
    lines.push(`  ${criterion.id} — ${criterion.title}: ${criterion.description}`);
  }

  return lines.join('\n');
}

function buildResponse(theme: string | null): string {
  const sections: string[] = [
    '=== GUIDED CAPSTONE BUILD ===',
    '',
    '--- 30 Architectural Criteria ---',
    '',
    formatCriteria(),
  ];

  if (theme) {
    sections.push(
      '',
      '--- Your Project Theme ---',
      theme,
      '',
      '--- Instructions ---',
      "Review the criteria above against your project idea. Claude will analyze",
      "which criteria are naturally covered and suggest modifications for any gaps.",
      "When you're satisfied with coverage, use capstone_build_step with action",
      "'confirm' to begin building.",
    );
  } else {
    sections.push(
      '',
      '--- Instructions ---',
      'Choose a project theme that excites you. The best capstone projects are ones',
      'you actually want to build. Provide your theme using start_capstone_build',
      "with a 'theme' parameter, and Claude will analyze how well it covers the",
      '30 criteria above.',
    );
  }

  return sections.join('\n');
}

export function registerStartCapstoneBuild(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'start_capstone_build',
    'Start or refine a guided capstone build. Build your own project while learning all 30 certification task statements hands-on.',
    {
      theme: z.string().optional().describe("Your project idea or theme. Omit to see the 30 criteria first."),
    },
    async ({ theme }) => {
      const userId = userConfig.userId;
      ensureUser(db, userId);

      // Case 1: No theme — return criteria with instructions
      if (!theme) {
        return {
          content: [{ type: 'text' as const, text: buildResponse(null) }],
        };
      }

      const activeBuild = getActiveBuild(db, userId);

      // Case 4: Active build in 'building' status — error
      if (activeBuild && activeBuild.status === 'building') {
        return {
          content: [{
            type: 'text' as const,
            text: "You have an active build in progress. Use capstone_build_step with action 'abandon' to start over.",
          }],
          isError: true,
        };
      }

      // Case 3: Active build in 'shaping' status — update theme
      if (activeBuild && activeBuild.status === 'shaping') {
        updateBuildTheme(db, activeBuild.id, theme);
        return {
          content: [{ type: 'text' as const, text: buildResponse(theme) }],
        };
      }

      // Case 2: No active build — create new build
      createBuild(db, userId, theme);
      return {
        content: [{ type: 'text' as const, text: buildResponse(theme) }],
      };
    }
  );
}
