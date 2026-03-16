import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig, CapstoneBuildStep } from '../types.js';
import { getActiveBuild, getBuildSteps } from '../db/capstone.js';
import { BUILD_STEPS } from '../data/build-steps.js';
import { CRITERIA } from '../data/criteria.js';

interface QuizStats {
  readonly domainId: number;
  readonly total: number;
  readonly correct: number;
}

function collectQuizQuestionIds(steps: readonly CapstoneBuildStep[]): readonly string[] {
  return steps.flatMap(step => {
    if (!step.quizQuestionIds) return [];
    const parsed = JSON.parse(step.quizQuestionIds) as readonly string[];
    return [...parsed];
  });
}

function getQuizPerformance(db: Database.Database, userId: string, questionIds: readonly string[]): readonly QuizStats[] {
  if (questionIds.length === 0) return [];

  const placeholders = questionIds.map(() => '?').join(', ');
  const rows = db.prepare(
    `SELECT domainId, COUNT(*) as total, SUM(CASE WHEN isCorrect THEN 1 ELSE 0 END) as correct
     FROM answers
     WHERE userId = ? AND questionId IN (${placeholders})
     GROUP BY domainId
     ORDER BY domainId ASC`
  ).all(userId, ...questionIds) as Array<{ domainId: number; total: number; correct: number }>;

  return rows.map(r => ({
    domainId: r.domainId,
    total: r.total,
    correct: r.correct ?? 0,
  }));
}

function countCoveredCriteria(completedSteps: readonly CapstoneBuildStep[]): number {
  const coveredIds = new Set<string>();
  for (const step of completedSteps) {
    if (!step.buildCompleted) continue;
    const taskStatements = JSON.parse(step.taskStatements) as readonly string[];
    for (const ts of taskStatements) {
      coveredIds.add(ts);
    }
  }
  return coveredIds.size;
}

function formatBuildingStatus(
  theme: string,
  currentStep: number,
  steps: readonly CapstoneBuildStep[],
  quizPerformance: readonly QuizStats[],
): string {
  const totalSteps = BUILD_STEPS.length;
  const totalCriteria = CRITERIA.length;
  const coveredCriteria = countCoveredCriteria(steps);
  const remainingCriteria = totalCriteria - coveredCriteria;

  const stepLines = BUILD_STEPS.map(template => {
    const dbStep = steps.find(s => s.stepIndex === template.stepIndex);
    const isCompleted = dbStep?.buildCompleted === 1;
    const isCurrent = template.stepIndex === currentStep;
    const marker = isCompleted ? '[x]' : '[ ]';
    const suffix = isCurrent && !isCompleted ? ' \u2190 current' : '';
    const criteria = template.taskStatements.join(', ');
    return `  ${marker} Step ${template.stepIndex}: ${template.fileName} (${criteria})${suffix}`;
  });

  const quizLines = quizPerformance.length > 0
    ? quizPerformance.map(q => {
        const pct = q.total > 0 ? Math.round((q.correct / q.total) * 100) : 0;
        return `  Domain ${q.domainId}: ${q.correct}/${q.total} correct (${pct}%)`;
      })
    : ['  No quiz answers yet.'];

  const sections = [
    '=== CAPSTONE BUILD PROGRESS ===',
    '',
    `Theme: ${theme}`,
    'Status: Building',
    `Current Step: ${currentStep}/${totalSteps}`,
    '',
    '--- Completed Steps ---',
    ...stepLines,
    '',
    '--- Criteria Coverage ---',
    `  Covered: ${coveredCriteria}/${totalCriteria} task statements`,
    `  Remaining: ${remainingCriteria} task statements`,
    '',
    '--- Quiz Performance ---',
    ...quizLines,
  ];

  return sections.join('\n');
}

export function registerCapstoneBuildStatus(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'capstone_build_status',
    'Check your guided capstone build progress \u2014 current step, criteria coverage, and quiz performance.',
    {},
    async () => {
      const userId = userConfig.userId;
      const build = getActiveBuild(db, userId);

      if (!build) {
        return {
          content: [{
            type: 'text' as const,
            text: 'No active capstone build found. Use start_capstone_build to begin a guided build.',
          }],
        };
      }

      if (build.status === 'shaping') {
        const lines = [
          '=== CAPSTONE BUILD STATUS ===',
          '',
          `Theme: ${build.theme}`,
          'Status: Shaping',
          '',
          'Your theme is being shaped. You can:',
          '  - Confirm it to start building',
          '  - Refine it with a new description',
        ];
        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      }

      // Status is 'building'
      const steps = getBuildSteps(db, build.id);
      const quizQuestionIds = collectQuizQuestionIds(steps);
      const quizPerformance = getQuizPerformance(db, userId, quizQuestionIds);

      const text = formatBuildingStatus(build.theme, build.currentStep, steps, quizPerformance);

      return {
        content: [{ type: 'text' as const, text }],
      };
    }
  );
}
