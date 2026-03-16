import { describe, it, expect } from 'vitest';
import { recommendPath, getDomainOrder, getNextRecommendedDomain, estimateTimeRemaining } from '../../src/engine/adaptive-path.js';
import type { DomainMastery } from '../../src/types.js';

describe('adaptive-path', () => {
  it('recommends beginner-friendly for accuracy below 60', () => {
    expect(recommendPath(45)).toBe('beginner-friendly');
  });
  it('recommends exam-weighted for accuracy 60+', () => {
    expect(recommendPath(75)).toBe('exam-weighted');
  });
  it('returns beginner domain order starting with D3', () => {
    const order = getDomainOrder('beginner-friendly');
    expect(order[0]).toBe(3);
  });
  it('returns exam-weighted domain order starting with D1', () => {
    const order = getDomainOrder('exam-weighted');
    expect(order[0]).toBe(1);
  });
  it('recommends first domain below 70% accuracy', () => {
    const masteryMap = new Map<number, readonly DomainMastery[]>([
      [1, [{ userId: 'u1', taskStatement: '1.1', domainId: 1, totalAttempts: 5, correctAttempts: 4, accuracyPercent: 80, masteryLevel: 'strong', lastTestedAt: null }]],
      [3, [{ userId: 'u1', taskStatement: '3.1', domainId: 3, totalAttempts: 5, correctAttempts: 2, accuracyPercent: 40, masteryLevel: 'weak', lastTestedAt: null }]],
    ]);
    expect(getNextRecommendedDomain('exam-weighted', masteryMap)).toBe(3);
  });
  it('estimates time remaining correctly', () => {
    expect(estimateTimeRemaining(100, 50, 60)).toBe('50 minutes');
  });
});
