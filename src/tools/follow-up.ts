import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { loadQuestions, loadHandout, loadCurriculum } from '../data/loader.js';

const FOLLOW_UP_ACTIONS = ['next', 'code_example', 'concept', 'handout', 'project', 'why_wrong'] as const;

const DOMAIN_PROJECT_MAP: Readonly<Record<number, string>> = {
  1: 'd1-agentic',
  2: 'd2-tools',
  3: 'd3-config',
  4: 'd4-prompts',
  5: 'd5-context',
} as const;

function extractSection(markdown: string, sectionName: string): string | null {
  const pattern = new RegExp(`^## ${sectionName}\\b`, 'm');
  const match = pattern.exec(markdown);
  if (!match) return null;

  const startIndex = match.index + match[0].length;
  const nextSectionMatch = /^## /m.exec(markdown.slice(startIndex));
  const endIndex = nextSectionMatch ? startIndex + nextSectionMatch.index : markdown.length;

  return markdown.slice(startIndex, endIndex).trim();
}

function findQuestion(questionId: string) {
  const allQuestions = loadQuestions();
  return allQuestions.find((q) => q.id === questionId) ?? null;
}

export function registerFollowUp(server: McpServer, _db: Database.Database, _userConfig: UserConfig): void {
  server.tool(
    'follow_up',
    'Handle post-answer follow-up actions. Use after submit_answer to explore concepts, code examples, handouts, or reference projects.',
    {
      questionId: z.string().describe('The question ID from the previous answer'),
      action: z.enum(FOLLOW_UP_ACTIONS).describe('The follow-up action to take'),
    },
    async ({ questionId, action }) => {
      const question = findQuestion(questionId);

      if (!question) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Question not found', questionId }) }],
          isError: true,
        };
      }

      switch (action) {
        case 'next': {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                instruction: 'Call get_practice_question to get the next question.',
                taskStatement: question.taskStatement,
                domainId: question.domainId,
              }, null, 2),
            }],
          };
        }

        case 'code_example': {
          const handout = loadHandout(question.taskStatement);
          if (!handout) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No handout found for this task statement', taskStatement: question.taskStatement }) }],
              isError: true,
            };
          }
          const codeExample = extractSection(handout, 'Code Example');
          if (!codeExample) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No Code Example section found in handout', taskStatement: question.taskStatement }) }],
              isError: true,
            };
          }
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                taskStatement: question.taskStatement,
                codeExample,
              }, null, 2),
            }],
          };
        }

        case 'concept': {
          const handout = loadHandout(question.taskStatement);
          if (!handout) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No handout found for this task statement', taskStatement: question.taskStatement }) }],
              isError: true,
            };
          }
          const concept = extractSection(handout, 'Concept');
          if (!concept) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No Concept section found in handout', taskStatement: question.taskStatement }) }],
              isError: true,
            };
          }
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                taskStatement: question.taskStatement,
                concept,
              }, null, 2),
            }],
          };
        }

        case 'handout': {
          const handout = loadHandout(question.taskStatement);
          if (!handout) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No handout found for this task statement', taskStatement: question.taskStatement }) }],
              isError: true,
            };
          }
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                taskStatement: question.taskStatement,
                handout,
              }, null, 2),
            }],
          };
        }

        case 'project': {
          const projectId = DOMAIN_PROJECT_MAP[question.domainId] ?? null;
          if (!projectId) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify({ error: 'No reference project mapped for this domain', domainId: question.domainId }) }],
              isError: true,
            };
          }
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                instruction: 'Call scaffold_project to explore the reference project for this domain.',
                projectId,
                domainId: question.domainId,
              }, null, 2),
            }],
          };
        }

        case 'why_wrong': {
          const incorrectOptions = Object.entries(question.whyWrongMap)
            .filter(([key]) => key !== question.correctAnswer)
            .reduce<Record<string, string>>((acc, [key, value]) => {
              if (value) {
                return { ...acc, [key]: value };
              }
              return acc;
            }, {});

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                questionId: question.id,
                correctAnswer: question.correctAnswer,
                explanation: question.explanation,
                whyOthersAreWrong: incorrectOptions,
              }, null, 2),
            }],
          };
        }
      }
    }
  );
}
