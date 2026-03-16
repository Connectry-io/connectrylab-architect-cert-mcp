import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { registerSubmitAnswer } from './submit-answer.js';
import { registerGetProgress } from './get-progress.js';
import { registerGetCurriculum } from './get-curriculum.js';
import { registerGetSectionDetails } from './get-section-details.js';
import { registerGetPracticeQuestion } from './get-practice-question.js';
import { registerStartAssessment } from './start-assessment.js';
import { registerGetWeakAreas } from './get-weak-areas.js';
import { registerGetStudyPlan } from './get-study-plan.js';
import { registerScaffoldProject } from './scaffold-project.js';
import { registerResetProgress } from './reset-progress.js';
import { registerStartPracticeExam } from './start-practice-exam.js';
import { registerSubmitExamAnswer } from './submit-exam-answer.js';
import { registerGetExamHistory } from './get-exam-history.js';

export function registerTools(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  registerSubmitAnswer(server, db, userConfig);
  registerGetProgress(server, db, userConfig);
  registerGetCurriculum(server, db, userConfig);
  registerGetSectionDetails(server, db, userConfig);
  registerGetPracticeQuestion(server, db, userConfig);
  registerStartAssessment(server, db, userConfig);
  registerGetWeakAreas(server, db, userConfig);
  registerGetStudyPlan(server, db, userConfig);
  registerScaffoldProject(server, db, userConfig);
  registerResetProgress(server, db, userConfig);
  registerStartPracticeExam(server, db, userConfig);
  registerSubmitExamAnswer(server, db, userConfig);
  registerGetExamHistory(server, db, userConfig);
}
