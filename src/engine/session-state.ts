import type { SessionState, StudyMode, StackFrame } from '../types.js';

export function createInitialState(userId: string, mode: StudyMode, domain: number, taskStatement: string): SessionState {
  return { userId, currentMode: mode, currentDomain: domain, currentTaskStatement: taskStatement, currentQuestionIndex: 0, positionStack: [], reviewQueueIds: [] };
}

export function pushDetour(state: SessionState, detourMode: StudyMode, domain: number, taskStatement: string): SessionState {
  const frame: StackFrame = { mode: state.currentMode, domain: state.currentDomain ?? domain, taskStatement: state.currentTaskStatement ?? taskStatement, questionIndex: state.currentQuestionIndex };
  return { ...state, currentMode: detourMode, currentDomain: domain, currentTaskStatement: taskStatement, positionStack: [...state.positionStack, frame] };
}

export function popDetour(state: SessionState): SessionState {
  if (state.positionStack.length === 0) return state;
  const stack = [...state.positionStack];
  const frame = stack.pop()!;
  return { ...state, currentMode: frame.mode, currentDomain: frame.domain, currentTaskStatement: frame.taskStatement, currentQuestionIndex: frame.questionIndex + 1, positionStack: stack };
}

export function popAllDetours(state: SessionState): SessionState {
  if (state.positionStack.length === 0) return state;
  const bottomFrame = state.positionStack[0];
  return { ...state, currentMode: bottomFrame.mode, currentDomain: bottomFrame.domain, currentTaskStatement: bottomFrame.taskStatement, currentQuestionIndex: bottomFrame.questionIndex + 1, positionStack: [] };
}
