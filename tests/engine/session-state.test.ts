import { describe, it, expect } from 'vitest';
import { pushDetour, popDetour, popAllDetours, createInitialState } from '../../src/engine/session-state.js';

describe('session-state', () => {
  it('creates initial state', () => {
    const state = createInitialState('user-1', 'quiz', 1, '1.1');
    expect(state.currentMode).toBe('quiz');
    expect(state.positionStack).toEqual([]);
    expect(state.currentQuestionIndex).toBe(0);
  });
  it('pushes detour and preserves current position', () => {
    const state = createInitialState('user-1', 'quiz', 1, '1.1');
    const updated = { ...state, currentQuestionIndex: 7 };
    const detoured = pushDetour(updated, 'guided', 1, '1.1');
    expect(detoured.positionStack).toHaveLength(1);
    expect(detoured.positionStack[0].questionIndex).toBe(7);
    expect(detoured.currentMode).toBe('guided');
  });
  it('pops detour and restores position with next question', () => {
    const state = createInitialState('user-1', 'quiz', 1, '1.1');
    const updated = { ...state, currentQuestionIndex: 7 };
    const detoured = pushDetour(updated, 'guided', 1, '1.1');
    const restored = popDetour(detoured);
    expect(restored.currentMode).toBe('quiz');
    expect(restored.currentQuestionIndex).toBe(8);
    expect(restored.positionStack).toHaveLength(0);
  });
  it('handles nested detours', () => {
    let state = createInitialState('user-1', 'quiz', 1, '1.1');
    state = { ...state, currentQuestionIndex: 5 };
    state = pushDetour(state, 'guided', 1, '1.1');
    state = pushDetour(state, 'project', 1, '1.1');
    expect(state.positionStack).toHaveLength(2);
    state = popDetour(state);
    expect(state.positionStack).toHaveLength(1);
    state = popDetour(state);
    expect(state.currentMode).toBe('quiz');
    expect(state.currentQuestionIndex).toBe(6);
  });
  it('popAllDetours clears full stack and restores bottommost frame', () => {
    let state = createInitialState('user-1', 'quiz', 1, '1.1');
    state = { ...state, currentQuestionIndex: 5 };
    state = pushDetour(state, 'guided', 1, '1.1');
    state = pushDetour(state, 'project', 1, '1.1');
    state = popAllDetours(state);
    expect(state.positionStack).toHaveLength(0);
    expect(state.currentMode).toBe('quiz');
    expect(state.currentQuestionIndex).toBe(6);
  });
});
