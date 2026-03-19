import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig, CapstoneBuild, CapstoneBuildStep } from '../types.js';
import { loadQuestions } from '../data/loader.js';
import { BUILD_STEPS } from '../data/build-steps.js';
import { CRITERIA } from '../data/criteria.js';
import { ensureUser } from '../db/users.js';
import {
  getActiveBuild,
  confirmBuild,
  createBuildSteps,
  getBuildStep,
  setQuizQuestionIds,
  updateBuildStep,
  advanceBuildStep,
  completeBuild,
  abandonBuild,
  getBuildSteps,
} from '../db/capstone.js';
import { elicitSingleSelect } from './elicit.js';

const ACTIONS = ['confirm', 'quiz', 'build', 'next', 'status', 'abandon'] as const;

const TOTAL_STEPS = 18;

function errorResponse(message: string) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

function textResponse(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
  };
}

function getStepTemplate(stepIndex: number) {
  return BUILD_STEPS.find((s) => s.stepIndex === stepIndex) ?? null;
}

function formatStepPreview(step: CapstoneBuildStep, template: ReturnType<typeof getStepTemplate>) {
  const taskIds = JSON.parse(step.taskStatements) as readonly string[];
  const criteria = taskIds
    .map((id) => CRITERIA.find((c) => c.id === id))
    .filter(Boolean);

  return [
    `=== Step ${step.stepIndex}/${TOTAL_STEPS}: ${step.fileName} ===`,
    '',
    `Description: ${template?.description ?? 'N/A'}`,
    '',
    '--- Task Statements ---',
    ...criteria.map((c) => `  ${c!.id}: ${c!.title}`),
    '',
    'Next action: Call capstone_build_step with action "quiz" to get quiz questions for this step.',
  ].join('\n');
}

function shuffleArray<T>(arr: readonly T[]): readonly T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getAnsweredQuestionIdsForBuild(db: Database.Database, userId: string, questionIds: readonly string[]): Set<string> {
  if (questionIds.length === 0) return new Set();
  const placeholders = questionIds.map(() => '?').join(', ');
  const rows = db.prepare(
    `SELECT DISTINCT questionId FROM answers WHERE userId = ? AND questionId IN (${placeholders})`
  ).all(userId, ...questionIds) as Array<{ questionId: string }>;
  return new Set(rows.map((r) => r.questionId));
}

function handleConfirm(db: Database.Database, userId: string): ReturnType<typeof textResponse> {
  const build = getActiveBuild(db, userId);
  if (!build) {
    return errorResponse('No active build found. Use capstone_theme to start a new build.');
  }
  if (build.status !== 'shaping') {
    return errorResponse(`Build is already in "${build.status}" status. Only "shaping" builds can be confirmed.`);
  }

  confirmBuild(db, build.id);
  createBuildSteps(db, build.id, BUILD_STEPS);

  const step = getBuildStep(db, build.id, 1);
  if (!step) {
    return errorResponse('Failed to create build steps.');
  }

  const template = getStepTemplate(1);
  return textResponse(formatStepPreview(step, template));
}

function handleQuiz(db: Database.Database, userId: string): ReturnType<typeof textResponse> {
  const build = getActiveBuild(db, userId);
  if (!build) {
    return errorResponse('No active build found.');
  }
  if (build.status !== 'building') {
    return errorResponse(`Build must be in "building" status to get quiz questions. Current status: "${build.status}".`);
  }

  const step = getBuildStep(db, build.id, build.currentStep);
  if (!step) {
    return errorResponse(`Build step ${build.currentStep} not found.`);
  }

  if (step.quizCompleted === 1) {
    return errorResponse('Quiz already completed for this step. Use action "build" to get build instructions.');
  }

  const taskIds = JSON.parse(step.taskStatements) as readonly string[];
  const allQuestions = loadQuestions();
  const stepQuestions = allQuestions.filter((q) => taskIds.includes(q.taskStatement));

  if (stepQuestions.length === 0) {
    return errorResponse(`No questions found for task statements: ${taskIds.join(', ')}`);
  }

  const shuffled = shuffleArray(stepQuestions);
  const quizCount = Math.min(shuffled.length, taskIds.length >= 3 ? 3 : 2);
  const selected = shuffled.slice(0, quizCount);
  const selectedIds = selected.map((q) => q.id);

  setQuizQuestionIds(db, step.id, selectedIds);

  const formattedQuestions = selected.map((q) => ({
    questionId: q.id,
    taskStatement: q.taskStatement,
    difficulty: q.difficulty,
    scenario: q.scenario,
    text: q.text,
    options: q.options,
  }));

  return textResponse({
    step: step.stepIndex,
    fileName: step.fileName,
    quizQuestions: formattedQuestions,
    instruction: 'Answer each question using the submit_answer tool.',
  });
}

function handleBuild(db: Database.Database, userId: string, build: CapstoneBuild): ReturnType<typeof textResponse> {
  const step = getBuildStep(db, build.id, build.currentStep);
  if (!step) {
    return errorResponse(`Build step ${build.currentStep} not found.`);
  }

  if (step.quizQuestionIds) {
    const questionIds = JSON.parse(step.quizQuestionIds) as readonly string[];
    const answered = getAnsweredQuestionIdsForBuild(db, userId, questionIds);
    const remaining = questionIds.filter((id) => !answered.has(id));

    if (remaining.length > 0) {
      return errorResponse(
        `Not all quiz questions answered. Remaining question IDs: ${remaining.join(', ')}. Use submit_answer to answer them first.`
      );
    }

    if (step.quizCompleted !== 1) {
      updateBuildStep(db, step.id, { quizCompleted: 1 });
    }
  }

  updateBuildStep(db, step.id, { buildCompleted: 1 });

  const template = getStepTemplate(build.currentStep);
  const taskIds = JSON.parse(step.taskStatements) as readonly string[];
  const criteria = taskIds
    .map((id) => CRITERIA.find((c) => c.id === id))
    .filter(Boolean);

  const taskDetails = criteria.map((c) => [
    `  ${c!.id}: ${c!.title}`,
    `    ${c!.description}`,
    `    Code hints: ${template?.codeHints ?? 'N/A'}`,
  ].join('\n')).join('\n\n');

  const output = [
    `=== Step ${build.currentStep}/${TOTAL_STEPS}: ${step.fileName} ===`,
    '',
    `Theme: ${build.theme}`,
    `Task Statements: ${taskIds.join(', ')}`,
    '',
    '--- Build Instructions ---',
    `Generate the code for ${step.fileName} themed to the user's project above.`,
    'The code should demonstrate these certification concepts:',
    '',
    taskDetails,
    '',
    'After generating the code, provide a walkthrough explaining each section:',
    '- What the code does',
    '- Which task statement it demonstrates',
    '- How it connects to the broader architecture',
    '',
    '--- Task Statement Details ---',
    ...criteria.map((c) => `${c!.id} — ${c!.title}: ${c!.description}`),
  ].join('\n');

  return textResponse(output);
}

function handleNext(db: Database.Database, userId: string): ReturnType<typeof textResponse> {
  const build = getActiveBuild(db, userId);
  if (!build) {
    return errorResponse('No active build found.');
  }
  if (build.status !== 'building') {
    return errorResponse(`Build must be in "building" status. Current status: "${build.status}".`);
  }

  const step = getBuildStep(db, build.id, build.currentStep);
  if (!step) {
    return errorResponse(`Build step ${build.currentStep} not found.`);
  }
  if (step.buildCompleted !== 1) {
    return errorResponse('Current step build is not completed. Use action "build" first.');
  }

  if (build.currentStep >= TOTAL_STEPS) {
    completeBuild(db, build.id);

    const allSteps = getBuildSteps(db, build.id);
    const completedCount = allSteps.filter((s) => s.buildCompleted === 1).length;

    return textResponse({
      status: 'completed',
      message: 'Congratulations! You have completed all 18 capstone build steps.',
      theme: build.theme,
      stepsCompleted: completedCount,
      totalSteps: TOTAL_STEPS,
      instruction: 'Review your completed project files and ensure all certification concepts are demonstrated.',
    });
  }

  const nextStepIndex = build.currentStep + 1;
  advanceBuildStep(db, build.id, nextStepIndex);

  const nextStep = getBuildStep(db, build.id, nextStepIndex);
  if (!nextStep) {
    return errorResponse(`Next step ${nextStepIndex} not found.`);
  }

  const template = getStepTemplate(nextStepIndex);
  return textResponse(formatStepPreview(nextStep, template));
}

function handleStatus(db: Database.Database, userId: string): ReturnType<typeof textResponse> {
  const build = getActiveBuild(db, userId);
  if (!build) {
    return errorResponse('No active build found.');
  }

  const allSteps = getBuildSteps(db, build.id);
  const completedSteps = allSteps.filter((s) => s.buildCompleted === 1);
  const remainingSteps = allSteps.filter((s) => s.buildCompleted !== 1);

  const coveredTaskIds = new Set(
    completedSteps.flatMap((s) => JSON.parse(s.taskStatements) as string[])
  );
  const totalCriteria = CRITERIA.length;
  const coveredCriteria = CRITERIA.filter((c) => coveredTaskIds.has(c.id)).length;

  return textResponse({
    buildId: build.id,
    theme: build.theme,
    status: build.status,
    currentStep: build.currentStep,
    stepsCompleted: completedSteps.length,
    stepsRemaining: remainingSteps.length,
    totalSteps: TOTAL_STEPS,
    criteriaCoverage: `${coveredCriteria}/${totalCriteria}`,
    completedFiles: completedSteps.map((s) => s.fileName),
    remainingFiles: remainingSteps.map((s) => s.fileName),
  });
}

function handleAbandon(db: Database.Database, userId: string): ReturnType<typeof textResponse> {
  const build = getActiveBuild(db, userId);
  if (!build) {
    return errorResponse('No active build found to abandon.');
  }

  abandonBuild(db, build.id);

  return textResponse({
    status: 'abandoned',
    message: `Build "${build.theme}" has been abandoned.`,
    buildId: build.id,
  });
}

function appendSelectedAction(
  response: ReturnType<typeof textResponse>,
  selected: string | null,
): ReturnType<typeof textResponse> {
  if (!selected) return response;

  const existingText = response.content[0].text;
  return {
    ...response,
    content: [{ type: 'text' as const, text: `${existingText}\n\nUser selected next action: ${selected}` }],
  };
}

export function registerCapstoneBuildStep(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'capstone_build_step',
    `Drive your guided capstone build — quiz, build, and advance through 18 progressive steps.

IMPORTANT:
- When presenting quiz questions, use AskUserQuestion with header "Answer" for A/B/C/D selection. If code is in the scenario, add preview fields.
- After grading a quiz answer, FIRST show the result (correct/incorrect, explanation) as REGULAR CHAT TEXT so the user can read it. THEN present follow-up options or the next question via AskUserQuestion. Explanations must NOT be hidden behind cards.
- When presenting action choices (quiz/build/next), use AskUserQuestion with header "Action".

PROGRESS TRACKING:
- On "confirm": Create a TodoWrite checklist with all 18 build steps, all set to "pending".
- On "next": Update the completed step to "completed" and the new current step to "in_progress".
- This gives the user a visual build progress tracker.

EDGE CASES:
- "Other": Answer the question, then re-present the current options via AskUserQuestion.
- "Skip": During quiz, treat as moving to the build phase. During build, treat as advancing to next step.`,
    {
      action: z.enum(ACTIONS).describe('The build action: confirm, quiz, build, next, status, or abandon'),
    },
    async ({ action }) => {
      const userId = userConfig.userId;
      ensureUser(db, userId);

      switch (action) {
        case 'confirm': {
          const result = handleConfirm(db, userId);
          if ('isError' in result) return result;
          const selected = await elicitSingleSelect(
            server,
            'Build confirmed! What would you like to do next?',
            'nextAction',
            [{ value: 'quiz', title: 'Start the first quiz' }],
          );
          return appendSelectedAction(result, selected);
        }

        case 'quiz':
          return handleQuiz(db, userId);

        case 'build': {
          const build = getActiveBuild(db, userId);
          if (!build) {
            return errorResponse('No active build found.');
          }
          if (build.status !== 'building') {
            return errorResponse(`Build must be in "building" status. Current status: "${build.status}".`);
          }
          const result = handleBuild(db, userId, build);
          if ('isError' in result) return result;
          const selected = await elicitSingleSelect(
            server,
            'Build instructions generated. What would you like to do next?',
            'nextAction',
            [
              { value: 'next', title: 'Advance to the next step' },
              { value: 'status', title: 'Check build progress' },
            ],
          );
          return appendSelectedAction(result, selected);
        }

        case 'next': {
          const result = handleNext(db, userId);
          if ('isError' in result) return result;
          const selected = await elicitSingleSelect(
            server,
            'Step advanced. What would you like to do next?',
            'nextAction',
            [
              { value: 'quiz', title: 'Start this step\'s quiz' },
              { value: 'status', title: 'Check build progress' },
            ],
          );
          return appendSelectedAction(result, selected);
        }

        case 'status':
          return handleStatus(db, userId);

        case 'abandon':
          return handleAbandon(db, userId);
      }
    }
  );
}
