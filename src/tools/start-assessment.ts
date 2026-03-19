import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig, Question } from '../types.js';
import { loadQuestions } from '../data/loader.js';
import { ensureUser } from '../db/users.js';

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

const DOMAIN_NAMES: Readonly<Record<number, string>> = {
  1: 'Agentic Architecture',
  2: 'Tool Design & MCP',
  3: 'Claude Code Config',
  4: 'Prompt Engineering',
  5: 'Context & Reliability',
};

function buildAssessmentQuestions(): readonly Question[] {
  const questions: Question[] = [];
  for (let d = 1; d <= 5; d++) {
    const domainQuestions = loadQuestions(d);
    const easy = domainQuestions.find(q => q.difficulty === 'easy');
    const medium = domainQuestions.find(q => q.difficulty === 'medium');
    const hard = domainQuestions.find(q => q.difficulty === 'hard');
    if (easy) questions.push(easy);
    if (medium) questions.push(medium);
    if (hard) questions.push(hard);
  }
  return questions;
}

export function registerStartAssessment(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.tool(
    'start_assessment',
    `Start the initial assessment. Returns ONE question at a time (15 total, 3 per domain).

IMPORTANT — follow this flow for EVERY question:

1. Check if "isNewDomain" is true. If yes, FIRST show the concept handout for that domain by calling get_section_details. Tell the user: "Let's learn about [domain] before testing your knowledge." After showing the handout, proceed to step 2.

2. Present the question to the user using AskUserQuestion:
   - header: "Q[number]"
   - question: Include the FULL scenario text AND question text from the response
   - options: Use the 4 answer options (A/B/C/D) with label as the letter and description as the option text
   - If the scenario contains code, add a "preview" field on each option showing the relevant code snippet so the user can reference it while choosing

3. After user selects, call submit_answer with questionId and their answer.

4. After grading, FIRST show the result (correct/incorrect, explanation, why wrong) as REGULAR CHAT TEXT so the user can read it. THEN present follow-up options using AskUserQuestion. The explanation must NOT be hidden behind the card.

5. Call start_assessment again for the next question.

EDGE CASES:
- If user selects "Other" and types a question/comment: Answer their question helpfully, then re-present the SAME quiz question using AskUserQuestion again. Never lose the current question.
- If user clicks "Skip": Treat it as moving to the next question. Call start_assessment again immediately. The skipped question remains unanswered and will appear again later.
- NEVER let Other or Skip break the assessment flow. Always continue to the next question or re-ask the current one.

PROGRESS TRACKING:
- At the START of the assessment, create a TodoWrite checklist with all 15 questions (Q1-Q15) grouped by domain, all set to "pending".
- After each answer, update the corresponding todo item to "completed" (with correct/incorrect note).
- This gives the user a visual progress tracker throughout the assessment.

When assessment is complete, present next steps using AskUserQuestion with header "Next step".`,
    {},
    async () => {
      const userId = userConfig.userId;
      ensureUser(db, userId);

      const questions = buildAssessmentQuestions();
      if (questions.length === 0) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No assessment questions available.' }) }],
        };
      }

      const answeredIds = db.prepare(
        `SELECT questionId FROM answers WHERE userId = ? AND questionId IN (${questions.map(() => '?').join(',')})`,
      ).all(userId, ...questions.map(q => q.id)) as readonly { questionId: string }[];

      const answeredSet = new Set(answeredIds.map(r => r.questionId));
      const nextQuestion = questions.find(q => !answeredSet.has(q.id));

      // All done — compute results
      if (!nextQuestion) {
        const results = db.prepare(
          `SELECT domainId, COUNT(*) as total, SUM(CASE WHEN isCorrect THEN 1 ELSE 0 END) as correct
           FROM answers WHERE userId = ? AND questionId IN (${questions.map(() => '?').join(',')})
           GROUP BY domainId`,
        ).all(userId, ...questions.map(q => q.id)) as readonly { domainId: number; total: number; correct: number }[];

        const totalCorrect = results.reduce((sum, r) => sum + r.correct, 0);
        const totalQuestions = results.reduce((sum, r) => sum + r.total, 0);
        const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        const path = overallAccuracy >= 60 ? 'exam-weighted' : 'beginner-friendly';

        db.prepare('UPDATE users SET assessmentCompleted = TRUE, learningPath = ? WHERE id = ?').run(path, userId);

        const response = {
          status: 'complete',
          overall: { correct: totalCorrect, total: totalQuestions, accuracy: overallAccuracy },
          learningPath: path === 'exam-weighted' ? 'Exam-Weighted' : 'Beginner-Friendly',
          domainResults: results.map(r => ({
            domain: r.domainId,
            name: DOMAIN_NAMES[r.domainId] ?? '',
            correct: r.correct,
            total: r.total,
            accuracy: Math.round((r.correct / r.total) * 100),
          })),
          nextStepOptions: [
            { label: 'Study Plan', description: 'Get personalized study recommendations based on your results' },
            { label: 'Practice Questions', description: 'Start adaptive practice targeting your weak areas' },
            { label: 'Capstone Build', description: 'Build your own project while learning all 30 task statements' },
            { label: 'Reference Projects', description: 'Explore runnable code examples for each domain' },
          ],
          instruction: 'Present nextStepOptions using AskUserQuestion with header "Next step".',
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
        };
      }

      // Determine if this is the first question for a new domain
      const questionIndex = answeredSet.size;
      const previousDomainIds = questions
        .filter(q => answeredSet.has(q.id))
        .map(q => q.domainId);
      const isNewDomain = !previousDomainIds.includes(nextQuestion.domainId);

      const response = {
        status: 'question',
        questionNumber: questionIndex + 1,
        totalQuestions: questions.length,
        questionId: nextQuestion.id,
        domainId: nextQuestion.domainId,
        domainName: DOMAIN_NAMES[nextQuestion.domainId] ?? 'Unknown',
        difficulty: nextQuestion.difficulty,
        taskStatement: nextQuestion.taskStatement,
        isNewDomain,
        scenario: nextQuestion.scenario,
        questionText: nextQuestion.text,
        options: {
          A: nextQuestion.options.A,
          B: nextQuestion.options.B,
          C: nextQuestion.options.C,
          D: nextQuestion.options.D,
        },
        instruction: isNewDomain
          ? `This is a NEW domain (${DOMAIN_NAMES[nextQuestion.domainId]}). Show the concept handout first using get_section_details for task "${nextQuestion.taskStatement}", then present this question using AskUserQuestion. Put the scenario + question in the "question" field. Use options with label "A"/"B"/"C"/"D" and description as the option text.`
          : `Present this question using AskUserQuestion with header "Q${questionIndex + 1}". Put the scenario + question text in the "question" field. Use options with label "A"/"B"/"C"/"D" and description as the option text.`,
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
      };
    }
  );
}
