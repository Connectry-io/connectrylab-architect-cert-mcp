import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type Database from 'better-sqlite3';
import type { UserConfig } from '../types.js';
import { loadQuestions } from '../data/loader.js';

export function registerPrompts(server: McpServer, db: Database.Database, userConfig: UserConfig): void {
  server.prompt(
    'quiz_question',
    'Present a certification exam question with clickable A/B/C/D options',
    { questionId: { description: 'Question ID to present', required: true } },
    async ({ questionId }) => {
      const questions = loadQuestions();
      const question = questions.find(q => q.id === questionId);
      if (!question) {
        return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text: 'Question not found.' } }] };
      }
      return {
        messages: [{
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `**${question.scenario}**\n\n${question.text}\n\n  A) ${question.options.A}\n  B) ${question.options.B}\n  C) ${question.options.C}\n  D) ${question.options.D}\n\nSelect your answer (A/B/C/D):`,
          },
        }],
      };
    }
  );

  server.prompt(
    'choose_mode',
    'Select a study mode for the current session',
    {},
    async () => ({
      messages: [{
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: 'How would you like to study?\n\n1. **Guided Capstone** — Work through the reference project touching all domains\n2. **Dynamic Exercises** — Targeted questions based on your weak areas\n3. **Quick Quiz** — Rapid-fire questions across all domains\n4. **Review Weak Areas** — Focus on topics you\'ve struggled with\n\nChoose a mode (1-4):',
        },
      }],
    })
  );

  server.prompt(
    'assessment_question',
    'Present an assessment question with A/B/C/D options',
    { questionId: { description: 'Assessment question ID', required: true }, questionNumber: { description: 'Current question number (1-15)', required: true } },
    async ({ questionId, questionNumber }) => {
      const question = loadQuestions().find(q => q.id === questionId);
      if (!question) return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text: 'Question not found.' } }] };
      return {
        messages: [{
          role: 'user' as const,
          content: { type: 'text' as const, text: `**Assessment Question ${questionNumber}/15**\n\n${question.scenario}\n\n${question.text}\n\n  A) ${question.options.A}\n  B) ${question.options.B}\n  C) ${question.options.C}\n  D) ${question.options.D}\n\nSelect your answer:` },
        }],
      };
    }
  );

  server.prompt(
    'choose_domain',
    'Select which domain to study',
    {},
    async () => ({
      messages: [{
        role: 'user' as const,
        content: { type: 'text' as const, text: 'Which domain would you like to study?\n\n1. **Agentic Architecture & Orchestration** (27%)\n2. **Tool Design & MCP Integration** (18%)\n3. **Claude Code Configuration & Workflows** (20%)\n4. **Prompt Engineering & Structured Output** (20%)\n5. **Context Management & Reliability** (15%)\n\nChoose a domain (1-5):' },
      }],
    })
  );

  server.prompt(
    'choose_difficulty',
    'Select question difficulty level',
    {},
    async () => ({
      messages: [{
        role: 'user' as const,
        content: { type: 'text' as const, text: 'Choose your difficulty level:\n\n1. **Easy** — Concept recall and basic understanding\n2. **Medium** — Applied scenarios requiring analysis\n3. **Hard** — Complex multi-step reasoning\n\nSelect difficulty (1-3):' },
      }],
    })
  );

  server.prompt(
    'post_answer_options',
    'Present options after answering a question',
    { wasCorrect: { description: 'Whether the previous answer was correct', required: true } },
    async ({ wasCorrect }) => {
      const options = wasCorrect === 'true'
        ? '1. **Next Question** — Continue with the next question\n2. **Explain Further** — Show a deeper explanation with code example\n3. **View Handout** — Read the concept lesson for this topic\n4. **Change Topic** — Switch to a different domain'
        : '1. **Next Question** — Continue with the next question\n2. **Explain Why I Was Wrong** — Show a detailed explanation with code example\n3. **View Concept Lesson** — Review the concept before continuing\n4. **Try Similar Question** — Get another question on this same topic';
      return {
        messages: [{
          role: 'user' as const,
          content: { type: 'text' as const, text: `What would you like to do next?\n\n${options}\n\nChoose an option (1-4):` },
        }],
      };
    }
  );

  server.prompt(
    'skip_options',
    'Present options to skip or customize the current content',
    {},
    async () => ({
      messages: [{
        role: 'user' as const,
        content: { type: 'text' as const, text: 'This topic has a concept lesson before the questions.\n\n1. **Read Lesson** — Learn the concept first (recommended for new topics)\n2. **Skip to Questions** — Go straight to practice questions\n3. **Quick Summary** — Get a 3-line summary then start questions\n\nChoose an option (1-3):' },
      }],
    })
  );

  server.prompt(
    'confirm_action',
    'Confirm a destructive action like resetting progress',
    { action: { description: 'The action to confirm', required: true } },
    async ({ action }) => ({
      messages: [{
        role: 'user' as const,
        content: { type: 'text' as const, text: `Are you sure?\n\nThis will ${action}. This action cannot be undone.\n\n1. **Yes, proceed** — Confirm the action\n2. **No, cancel** — Go back\n\nChoose (1-2):` },
      }],
    })
  );
}
