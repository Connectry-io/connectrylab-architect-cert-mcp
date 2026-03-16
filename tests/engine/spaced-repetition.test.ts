import { describe, it, expect } from 'vitest';
import { calculateSM2 } from '../../src/engine/spaced-repetition.js';

describe('calculateSM2', () => {
  it('sets interval to 1 day on first correct answer', () => {
    const result = calculateSM2({ isCorrect: true, previousInterval: 0, previousEaseFactor: 2.5, previousConsecutiveCorrect: 0 });
    expect(result.interval).toBe(1);
    expect(result.consecutiveCorrect).toBe(1);
  });
  it('sets interval to 3 days on second consecutive correct', () => {
    const result = calculateSM2({ isCorrect: true, previousInterval: 1, previousEaseFactor: 2.5, previousConsecutiveCorrect: 1 });
    expect(result.interval).toBe(3);
    expect(result.consecutiveCorrect).toBe(2);
  });
  it('multiplies by ease factor on third+ consecutive correct', () => {
    const result = calculateSM2({ isCorrect: true, previousInterval: 3, previousEaseFactor: 2.5, previousConsecutiveCorrect: 2 });
    expect(result.interval).toBe(8);
    expect(result.consecutiveCorrect).toBe(3);
  });
  it('increases ease factor on correct', () => {
    const result = calculateSM2({ isCorrect: true, previousInterval: 1, previousEaseFactor: 2.5, previousConsecutiveCorrect: 0 });
    expect(result.easeFactor).toBeCloseTo(2.6);
  });
  it('resets to 1 day on wrong answer', () => {
    const result = calculateSM2({ isCorrect: false, previousInterval: 8, previousEaseFactor: 2.5, previousConsecutiveCorrect: 5 });
    expect(result.interval).toBe(1);
    expect(result.consecutiveCorrect).toBe(0);
  });
  it('decreases ease factor on wrong but never below 1.3', () => {
    const result = calculateSM2({ isCorrect: false, previousInterval: 1, previousEaseFactor: 1.4, previousConsecutiveCorrect: 0 });
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
  it('returns a valid nextReviewAt ISO string', () => {
    const result = calculateSM2({ isCorrect: true, previousInterval: 0, previousEaseFactor: 2.5, previousConsecutiveCorrect: 0 });
    expect(() => new Date(result.nextReviewAt)).not.toThrow();
  });
});
