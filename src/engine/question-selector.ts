import type { Question, ReviewScheduleEntry, DomainMastery } from '../types.js';

export function selectNextQuestion(
  allQuestions: readonly Question[], overdueReviews: readonly ReviewScheduleEntry[],
  weakAreas: readonly DomainMastery[], answeredQuestionIds: ReadonlySet<string>,
): Question | undefined {
  if (overdueReviews.length > 0) {
    const weakestFirst = [...overdueReviews].sort((a, b) => a.easeFactor - b.easeFactor);
    for (const review of weakestFirst) {
      const question = findUnansweredForTaskStatement(allQuestions, review.taskStatement, answeredQuestionIds);
      if (question) return question;
    }
  }
  if (weakAreas.length > 0) {
    for (const area of weakAreas) {
      const question = findUnansweredForTaskStatement(allQuestions, area.taskStatement, answeredQuestionIds);
      if (question) return question;
    }
  }
  return allQuestions.find((q) => !answeredQuestionIds.has(q.id));
}

function findUnansweredForTaskStatement(
  questions: readonly Question[], taskStatement: string, answeredIds: ReadonlySet<string>,
): Question | undefined {
  return questions.find((q) => q.taskStatement === taskStatement && !answeredIds.has(q.id));
}
