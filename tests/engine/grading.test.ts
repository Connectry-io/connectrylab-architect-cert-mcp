import { describe, it, expect } from 'vitest';
import { gradeAnswer } from '../../src/engine/grading.js';
import type { Question } from '../../src/types.js';

const mockQuestion: Question = {
  id: 'q-test-1', taskStatement: '1.1', domainId: 1, difficulty: 'medium',
  scenario: 'Test scenario', text: 'What is the correct answer?',
  options: { A: 'Option A', B: 'Option B', C: 'Option C', D: 'Option D' },
  correctAnswer: 'A', explanation: 'A is correct because...',
  whyWrongMap: { B: 'B is wrong because...', C: 'C is wrong because...', D: 'D is wrong because...' },
  references: ['https://docs.anthropic.com/example'],
};

describe('gradeAnswer', () => {
  it('returns isCorrect=true for correct answer', () => {
    const result = gradeAnswer(mockQuestion, 'A');
    expect(result.isCorrect).toBe(true);
    expect(result.correctAnswer).toBe('A');
    expect(result.whyUserWasWrong).toBeNull();
  });
  it('returns isCorrect=false for wrong answer with specific explanation', () => {
    const result = gradeAnswer(mockQuestion, 'B');
    expect(result.isCorrect).toBe(false);
    expect(result.correctAnswer).toBe('A');
    expect(result.whyUserWasWrong).toBe('B is wrong because...');
  });
  it('is case-insensitive', () => {
    const result = gradeAnswer(mockQuestion, 'a');
    expect(result.isCorrect).toBe(true);
  });
  it('includes explanation and references', () => {
    const result = gradeAnswer(mockQuestion, 'C');
    expect(result.explanation).toBe('A is correct because...');
    expect(result.references).toEqual(['https://docs.anthropic.com/example']);
  });
});
