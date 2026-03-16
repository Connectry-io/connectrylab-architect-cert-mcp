import type { SM2Result } from '../types.js';

interface SM2Input {
  readonly isCorrect: boolean;
  readonly previousInterval: number;
  readonly previousEaseFactor: number;
  readonly previousConsecutiveCorrect: number;
}

export function calculateSM2(input: SM2Input): SM2Result {
  const { isCorrect, previousInterval, previousEaseFactor, previousConsecutiveCorrect } = input;
  if (!isCorrect) {
    const newEase = Math.max(1.3, previousEaseFactor - 0.2);
    const nextReviewAt = addDays(new Date(), 1);
    return { interval: 1, easeFactor: Math.round(newEase * 100) / 100, consecutiveCorrect: 0, nextReviewAt: nextReviewAt.toISOString() };
  }
  const newConsecutive = previousConsecutiveCorrect + 1;
  const newEase = Math.max(1.3, previousEaseFactor + 0.1);
  let interval: number;
  if (newConsecutive === 1) interval = 1;
  else if (newConsecutive === 2) interval = 3;
  else interval = Math.round(previousInterval * previousEaseFactor);
  const nextReviewAt = addDays(new Date(), interval);
  return { interval, easeFactor: Math.round(newEase * 100) / 100, consecutiveCorrect: newConsecutive, nextReviewAt: nextReviewAt.toISOString() };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
