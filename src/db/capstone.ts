import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import type { CapstoneBuild, CapstoneBuildStep, BuildStepTemplate, BuildStepUpdates } from '../types.js';

export function getActiveBuild(db: Database.Database, userId: string): CapstoneBuild | null {
  const row = db.prepare(
    `SELECT * FROM capstone_builds WHERE userId = ? AND status IN ('shaping', 'building') ORDER BY createdAt DESC LIMIT 1`
  ).get(userId) as CapstoneBuild | undefined;
  return row ?? null;
}

export function createBuild(db: Database.Database, userId: string, theme: string): CapstoneBuild {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO capstone_builds (id, userId, theme, currentStep, status, themeValidated, createdAt, updatedAt)
     VALUES (?, ?, ?, 0, 'shaping', 0, ?, ?)`
  ).run(id, userId, theme, now, now);
  return db.prepare('SELECT * FROM capstone_builds WHERE id = ?').get(id) as CapstoneBuild;
}

export function updateBuildTheme(db: Database.Database, buildId: string, theme: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE capstone_builds SET theme = ?, updatedAt = ? WHERE id = ?`
  ).run(theme, now, buildId);
}

export function confirmBuild(db: Database.Database, buildId: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE capstone_builds SET status = 'building', themeValidated = 1, currentStep = 1, updatedAt = ? WHERE id = ?`
  ).run(now, buildId);
}

export function abandonBuild(db: Database.Database, buildId: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE capstone_builds SET status = 'abandoned', updatedAt = ? WHERE id = ?`
  ).run(now, buildId);
}

export function completeBuild(db: Database.Database, buildId: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE capstone_builds SET status = 'completed', updatedAt = ? WHERE id = ?`
  ).run(now, buildId);
}

export function getBuildStep(db: Database.Database, buildId: string, stepIndex: number): CapstoneBuildStep | null {
  const row = db.prepare(
    `SELECT * FROM capstone_build_steps WHERE buildId = ? AND stepIndex = ?`
  ).get(buildId, stepIndex) as CapstoneBuildStep | undefined;
  return row ?? null;
}

export function createBuildSteps(db: Database.Database, buildId: string, steps: readonly BuildStepTemplate[]): void {
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO capstone_build_steps (id, buildId, stepIndex, fileName, taskStatements, quizQuestionIds, quizCompleted, buildCompleted, walkthroughViewed, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, NULL, 0, 0, 0, ?, ?)`
  );
  const insertAll = db.transaction((stepsToInsert: readonly BuildStepTemplate[]) => {
    for (const step of stepsToInsert) {
      insert.run(
        crypto.randomUUID(),
        buildId,
        step.stepIndex,
        step.fileName,
        JSON.stringify(step.taskStatements),
        now,
        now
      );
    }
  });
  insertAll(steps);
}

export function updateBuildStep(db: Database.Database, stepId: string, updates: Partial<BuildStepUpdates>): void {
  const now = new Date().toISOString();
  const setClauses: string[] = ['updatedAt = ?'];
  const params: (string | number)[] = [now];

  if (updates.quizCompleted !== undefined) {
    setClauses.push('quizCompleted = ?');
    params.push(updates.quizCompleted);
  }
  if (updates.buildCompleted !== undefined) {
    setClauses.push('buildCompleted = ?');
    params.push(updates.buildCompleted);
  }
  if (updates.walkthroughViewed !== undefined) {
    setClauses.push('walkthroughViewed = ?');
    params.push(updates.walkthroughViewed);
  }

  params.push(stepId);
  db.prepare(`UPDATE capstone_build_steps SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
}

export function setQuizQuestionIds(db: Database.Database, stepId: string, questionIds: readonly string[]): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE capstone_build_steps SET quizQuestionIds = ?, updatedAt = ? WHERE id = ?`
  ).run(JSON.stringify(questionIds), now, stepId);
}

export function advanceBuildStep(db: Database.Database, buildId: string, nextStep: number): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE capstone_builds SET currentStep = ?, updatedAt = ? WHERE id = ?`
  ).run(nextStep, now, buildId);
}

export function getBuildSteps(db: Database.Database, buildId: string): readonly CapstoneBuildStep[] {
  return db.prepare(
    `SELECT * FROM capstone_build_steps WHERE buildId = ? ORDER BY stepIndex ASC`
  ).all(buildId) as CapstoneBuildStep[];
}
