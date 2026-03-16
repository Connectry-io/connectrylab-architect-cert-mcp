import { describe, it, expect } from 'vitest';
import { selectNextQuestion } from '../../src/engine/question-selector.js';
import type { Question, ReviewScheduleEntry, DomainMastery } from '../../src/types.js';

const makeQuestion = (id: string, ts: string, difficulty: string): Question => ({
  id, taskStatement: ts, domainId: 1, difficulty: difficulty as any,
  scenario: 'test', text: 'test?', options: { A: 'a', B: 'b', C: 'c', D: 'd' },
  correctAnswer: 'A', explanation: 'because', whyWrongMap: {}, references: [],
});

describe('selectNextQuestion', () => {
  it('returns a review question when reviews are overdue', () => {
    const questions = [makeQuestion('q1', '1.1', 'easy'), makeQuestion('q2', '1.2', 'easy')];
    const overdueReviews: ReviewScheduleEntry[] = [
      { userId: 'u1', taskStatement: '1.1', nextReviewAt: '2020-01-01', interval: 1, easeFactor: 2.5, consecutiveCorrect: 0 },
    ];
    const result = selectNextQuestion(questions, overdueReviews, [], new Set());
    expect(result?.taskStatement).toBe('1.1');
  });
  it('returns new material when no reviews are due', () => {
    const questions = [makeQuestion('q1', '1.1', 'easy'), makeQuestion('q2', '1.2', 'easy')];
    const result = selectNextQuestion(questions, [], [], new Set());
    expect(result).toBeDefined();
  });
  it('skips already-answered questions', () => {
    const questions = [makeQuestion('q1', '1.1', 'easy'), makeQuestion('q2', '1.1', 'medium')];
    const result = selectNextQuestion(questions, [], [], new Set(['q1']));
    expect(result?.id).toBe('q2');
  });
  it('returns undefined when all questions answered', () => {
    const questions = [makeQuestion('q1', '1.1', 'easy')];
    const result = selectNextQuestion(questions, [], [], new Set(['q1']));
    expect(result).toBeUndefined();
  });
});
