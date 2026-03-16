import type { DomainMastery, LearningPath } from '../types.js';

const BEGINNER_ORDER = [3, 4, 2, 1, 5];
const EXAM_WEIGHTED_ORDER = [1, 3, 4, 2, 5];

export function recommendPath(assessmentAccuracy: number): LearningPath {
  return assessmentAccuracy >= 60 ? 'exam-weighted' : 'beginner-friendly';
}

export function getDomainOrder(path: LearningPath): readonly number[] {
  return path === 'beginner-friendly' ? BEGINNER_ORDER : EXAM_WEIGHTED_ORDER;
}

export function getNextRecommendedDomain(path: LearningPath, masteryByDomain: ReadonlyMap<number, readonly DomainMastery[]>): number {
  const order = getDomainOrder(path);
  for (const domainId of order) {
    const masteries = masteryByDomain.get(domainId) ?? [];
    const avgAccuracy = masteries.length > 0 ? masteries.reduce((sum, m) => sum + m.accuracyPercent, 0) / masteries.length : 0;
    if (avgAccuracy < 70) return domainId;
  }
  let weakestDomain = order[0];
  let lowestAccuracy = 100;
  for (const domainId of order) {
    const masteries = masteryByDomain.get(domainId) ?? [];
    const avg = masteries.length > 0 ? masteries.reduce((sum, m) => sum + m.accuracyPercent, 0) / masteries.length : 0;
    if (avg < lowestAccuracy) { lowestAccuracy = avg; weakestDomain = domainId; }
  }
  return weakestDomain;
}

export function estimateTimeRemaining(totalQuestions: number, answeredQuestions: number, avgSecondsPerQuestion: number = 45): string {
  const remaining = totalQuestions - answeredQuestions;
  const totalMinutes = Math.round((remaining * avgSecondsPerQuestion) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} minutes`;
  return `${hours} hours ${minutes} minutes`;
}
