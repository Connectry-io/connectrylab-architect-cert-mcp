import type { Question, DomainExamScore } from '../types.js';

/** Domain weights matching the real exam, mapped to 60 questions */
const EXAM_DISTRIBUTION: ReadonlyArray<{ readonly domainId: number; readonly count: number }> = [
  { domainId: 1, count: 16 },  // 27%
  { domainId: 2, count: 11 },  // 18%
  { domainId: 3, count: 12 },  // 20%
  { domainId: 4, count: 12 },  // 20%
  { domainId: 5, count: 9 },   // 15%
] as const;

const PASSING_SCORE = 720;
const TOTAL_SCALE = 1000;

/**
 * Build a 60-question practice exam by randomly selecting from the question bank.
 * Avoids repeating questions from recent exams when possible.
 * Difficulty mix per domain: ~30% easy, ~40% medium, ~30% hard
 *
 * @param previouslyUsedIds - Question IDs from recent exams to avoid (best-effort)
 */
export function buildPracticeExam(
  allQuestions: readonly Question[],
  previouslyUsedIds: ReadonlySet<string> = new Set(),
): readonly Question[] {
  const selected: Question[] = [];

  for (const { domainId, count } of EXAM_DISTRIBUTION) {
    const domainQuestions = allQuestions.filter(q => q.domainId === domainId);

    // Prefer questions NOT used in recent exams
    const fresh = domainQuestions.filter(q => !previouslyUsedIds.has(q.id));
    const pool = fresh.length >= count ? fresh : domainQuestions;

    const easy = shuffleArray(pool.filter(q => q.difficulty === 'easy'));
    const medium = shuffleArray(pool.filter(q => q.difficulty === 'medium'));
    const hard = shuffleArray(pool.filter(q => q.difficulty === 'hard'));

    const easyCount = Math.round(count * 0.3);
    const hardCount = Math.round(count * 0.3);
    const mediumCount = count - easyCount - hardCount;

    const pick = [
      ...easy.slice(0, easyCount),
      ...medium.slice(0, mediumCount),
      ...hard.slice(0, hardCount),
    ];

    // If we don't have enough of a difficulty, fill from others
    if (pick.length < count) {
      const remaining = shuffleArray(
        pool.filter(q => !pick.some(p => p.id === q.id))
      );
      pick.push(...remaining.slice(0, count - pick.length));
    }

    selected.push(...pick.slice(0, count));
  }

  return shuffleArray(selected);
}

/** Build initial domain scores map for a new exam */
export function buildInitialDomainScores(
  questions: readonly Question[],
  domainTitles: ReadonlyMap<number, string>,
): Record<string, DomainExamScore> {
  const scores: Record<string, DomainExamScore> = {};

  for (const { domainId, count } of EXAM_DISTRIBUTION) {
    scores[`d${domainId}`] = {
      domainId,
      domainTitle: domainTitles.get(domainId) ?? `Domain ${domainId}`,
      totalQuestions: count,
      correctAnswers: 0,
      accuracyPercent: 0,
      weight: getWeight(domainId),
    };
  }

  return scores;
}

export function calculateExamScore(correctAnswers: number, totalQuestions: number): number {
  return Math.round((correctAnswers / totalQuestions) * TOTAL_SCALE);
}

export function isPassingScore(score: number): boolean {
  return score >= PASSING_SCORE;
}

export { EXAM_DISTRIBUTION, PASSING_SCORE, TOTAL_SCALE };

function getWeight(domainId: number): number {
  const weights: Record<number, number> = { 1: 27, 2: 18, 3: 20, 4: 20, 5: 15 };
  return weights[domainId] ?? 0;
}

function shuffleArray<T>(arr: readonly T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
