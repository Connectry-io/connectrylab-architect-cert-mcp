import type { Question, GradeResult, AnswerOption } from '../types.js';

export function gradeAnswer(question: Question, userAnswer: string): GradeResult {
  const normalizedAnswer = userAnswer.toUpperCase() as AnswerOption;
  const isCorrect = normalizedAnswer === question.correctAnswer;
  return {
    questionId: question.id, isCorrect, userAnswer: normalizedAnswer,
    correctAnswer: question.correctAnswer, explanation: question.explanation,
    whyUserWasWrong: isCorrect ? null : (question.whyWrongMap[normalizedAnswer] ?? null),
    references: question.references,
  };
}
