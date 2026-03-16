/**
 * Built-in Tool Selection — Glob, Grep, Read, Edit Funnel Pattern
 *
 * Covers: Task Statement 2.5
 *   - The five built-in tools: Glob, Grep, Read, Write, Edit
 *   - Progressive narrowing strategy (Glob -> Grep -> Read -> Edit)
 *   - When to use each tool and common mistakes
 *   - Context-efficient codebase exploration
 *
 * Key insight: The most common mistake agents make is attempting to read
 * the entire codebase before acting. The correct approach is a progressive
 * narrowing strategy that keeps context usage proportional to the task.
 *
 * This file is NOT runnable code — it is a documented walkthrough of
 * built-in tool patterns that demonstrates the decision logic an agent
 * should follow. Each section shows the tool call, the reasoning, and
 * the anti-pattern to avoid.
 */

// ---- Scenario: Find and Fix an Error Message ----

/**
 * SCENARIO: You need to update the error message in an authentication
 * handler, but you don't know which file it lives in.
 *
 * This demonstrates the four-step funnel:
 * 1. Broad discovery with Glob (orient yourself)
 * 2. Content search with Grep (locate the target)
 * 3. Targeted inspection with Read (understand the context)
 * 4. Precise modification with Edit (make the smallest change)
 */
export const FUNNEL_EXAMPLE = {
  scenario: 'Update the authentication error message in a TypeScript project',

  /**
   * STEP 1: Glob — Discover file structure
   *
   * WHY: You don't know where the auth code lives. Glob shows you the
   * file tree without reading any content, keeping context minimal.
   *
   * Tool call:
   *   Glob({ pattern: "src/**\/*.ts" })
   *
   * Returns ~47 file paths. Now you know the structure.
   *
   * ANTI-PATTERN: Reading all 47 files to find the auth handler.
   * That would consume the entire context window on files you don't need.
   */
  step1_glob: {
    tool: 'Glob',
    input: { pattern: 'src/**/*.ts' },
    reasoning: 'Discover which files exist and where they live. No content is read.',
    antiPattern: 'Do NOT read all discovered files. Glob is for orientation only.',
    expectedOutput: [
      'src/index.ts',
      'src/auth/middleware.ts',
      'src/auth/providers/oauth.ts',
      'src/api/handlers/login.ts',
      'src/api/handlers/invoice.ts',
      'src/utils/errors.ts',
      // ...37 more files
    ],
  },

  /**
   * STEP 2: Grep — Search for the target pattern
   *
   * WHY: You know the error message contains "unauthorized". Grep finds
   * the exact files and line numbers without reading full file contents.
   *
   * Tool call:
   *   Grep({ pattern: "unauthorized", path: "src/", type: "ts" })
   *
   * Returns 2 matches: middleware.ts:52 and login.ts:87
   *
   * ANTI-PATTERN: Using an overly broad pattern like "error" which would
   * match hundreds of lines across the codebase.
   */
  step2_grep: {
    tool: 'Grep',
    input: { pattern: 'unauthorized', path: 'src/', type: 'ts' },
    reasoning: 'Locate the specific pattern. Narrows from 47 files to 2.',
    antiPattern: 'Do NOT use overly broad patterns. "error" would match everything.',
    expectedOutput: [
      { file: 'src/auth/middleware.ts', line: 52, match: 'throw new Error("unauthorized access")' },
      { file: 'src/api/handlers/login.ts', line: 87, match: '// handle unauthorized response' },
    ],
  },

  /**
   * STEP 3: Read — Inspect the relevant file
   *
   * WHY: Now you know the exact file and approximate line number.
   * Use Read with offset/limit to view just the relevant section.
   *
   * Tool call:
   *   Read({ file_path: "/project/src/auth/middleware.ts", offset: 45, limit: 20 })
   *
   * ANTI-PATTERN: Reading the entire 300-line file when you only need
   * lines 45-65. Always scope with offset and limit for large files.
   */
  step3_read: {
    tool: 'Read',
    input: {
      file_path: '/project/src/auth/middleware.ts',
      offset: 45,
      limit: 20,
    },
    reasoning: 'Only read the relevant section. 20 lines is enough context.',
    antiPattern: 'Do NOT read the full file. Use offset and limit to scope.',
  },

  /**
   * STEP 4: Edit — Make the targeted change
   *
   * WHY: Edit replaces a specific string. It is the smallest possible
   * change and leaves the rest of the file untouched.
   *
   * Tool call:
   *   Edit({
   *     file_path: "/project/src/auth/middleware.ts",
   *     old_string: 'throw new Error("unauthorized access")',
   *     new_string: 'throw new Error("Access denied. Please check your credentials.")'
   *   })
   *
   * ANTI-PATTERN: Using Write to save the entire file after changing one line.
   * Write overwrites everything. If you didn't read the full file first,
   * existing content is lost.
   */
  step4_edit: {
    tool: 'Edit',
    input: {
      file_path: '/project/src/auth/middleware.ts',
      old_string: 'throw new Error("unauthorized access")',
      new_string: 'throw new Error("Access denied. Please check your credentials.")',
    },
    reasoning: 'Smallest possible change. One string replacement, zero side effects.',
    antiPattern: 'Do NOT use Write to modify existing files. Write overwrites everything.',
  },

  summary: 'Four tool calls. Zero wasted context. No ambiguity about what changed.',
} as const;

// ---- Decision Matrix ----

/**
 * When to use each built-in tool.
 *
 * This matrix maps the question you're trying to answer to the
 * correct tool. The key differentiator:
 *   - Glob: I know the naming pattern, where is it?
 *   - Grep: I know the content pattern, which files contain it?
 *   - Read: I know the file, show me the content.
 *   - Edit: I know what to change, make the replacement.
 *   - Write: I need a brand new file (or a complete rewrite).
 */
export const TOOL_DECISION_MATRIX = [
  {
    question: 'What files exist in this project?',
    tool: 'Glob',
    pattern: '**/*',
    note: 'Scope to a subdirectory or extension to avoid overwhelming results.',
  },
  {
    question: 'Where is the config file?',
    tool: 'Glob',
    pattern: '**/*.config.{ts,js,json}',
    note: 'Use brace expansion to match multiple extensions in one query.',
  },
  {
    question: 'Which files import this module?',
    tool: 'Grep',
    pattern: "from ['\"]./utils/errors['\"]",
    note: 'Regex pattern matches both single and double quotes.',
  },
  {
    question: 'Where is this function defined?',
    tool: 'Grep',
    pattern: 'export function handleAuth',
    note: 'Search for the function declaration, not just the name.',
  },
  {
    question: 'What does this file do?',
    tool: 'Read',
    pattern: '/absolute/path/to/file.ts',
    note: 'Always use absolute paths. Read the whole file for small files, use offset/limit for large ones.',
  },
  {
    question: 'I need to change one line in this file.',
    tool: 'Edit',
    pattern: 'old_string -> new_string',
    note: 'Provide enough surrounding context to make old_string unique (2-3 lines).',
  },
  {
    question: 'I need to create a brand new file.',
    tool: 'Write',
    pattern: '/absolute/path/to/new-file.ts',
    note: 'Only for new files. Never use Write to modify existing files.',
  },
] as const;

// ---- Common Anti-Patterns ----

/**
 * Anti-patterns that waste context or introduce errors.
 * Each entry describes what NOT to do and why.
 */
export const ANTI_PATTERNS = [
  {
    name: 'Reading before searching',
    description:
      'Jumping to Read without using Grep first forces the agent to process ' +
      'entire files to find a single symbol. Always search before reading.',
    correctApproach: 'Grep to find the file and line, then Read with offset/limit.',
  },
  {
    name: 'Using Write to modify existing files',
    description:
      'Write overwrites the complete file. If the file was not read first, ' +
      'existing content is lost. For any modification, use Edit.',
    correctApproach: 'Read the file first, then use Edit for targeted replacements.',
  },
  {
    name: 'Non-unique old_string in Edit',
    description:
      'Edit fails when old_string matches more than one location in the file. ' +
      'Include 2-3 lines of surrounding context to make the match unique.',
    correctApproach: 'Provide enough context around the target line to disambiguate.',
  },
  {
    name: 'Overly broad Glob patterns',
    description:
      '"**/*" on a large monorepo returns thousands of paths. Scope Glob to ' +
      'the relevant subdirectory or file extension.',
    correctApproach: 'Use "src/**/*.ts" instead of "**/*" to stay focused.',
  },
  {
    name: 'Reading large files without line ranges',
    description:
      'A 3,000-line file read in full consumes significant context. Use offset ' +
      'and limit to read only the relevant section.',
    correctApproach: 'Grep the file first to find the line number, then Read with offset.',
  },
  {
    name: 'Using relative paths',
    description:
      'All file-path tools require absolute paths. Relative paths silently ' +
      'resolve against the process working directory, which may not match the project root.',
    correctApproach: 'Always confirm and use the absolute path before passing it.',
  },
] as const;

// ---- Composition Pattern ----

/**
 * Real-world example: multi-step codebase exploration.
 *
 * This shows how an agent would compose built-in tools to answer
 * "Find all files that handle authentication errors and update them
 * to use a consistent error format."
 *
 * The agent does NOT read the entire codebase. It narrows progressively:
 *   1. Glob to find candidate files
 *   2. Grep across candidates to find the exact pattern
 *   3. Read each matching file at the matching lines
 *   4. Edit each file with the consistent format
 */
export const COMPOSITION_EXAMPLE = {
  task: 'Standardize authentication error messages across the codebase',

  steps: [
    {
      step: 1,
      tool: 'Glob',
      call: { pattern: 'src/**/*.ts' },
      result: '47 TypeScript files found',
      contextCost: 'Minimal — only file paths, no content',
    },
    {
      step: 2,
      tool: 'Grep',
      call: { pattern: 'unauthorized|forbidden|access.denied', path: 'src/', type: 'ts' },
      result: '4 files with 7 matches',
      contextCost: 'Low — only matching lines with context',
    },
    {
      step: 3,
      tool: 'Read',
      call: [
        { file_path: '/project/src/auth/middleware.ts', offset: 48, limit: 15 },
        { file_path: '/project/src/api/handlers/login.ts', offset: 82, limit: 15 },
        { file_path: '/project/src/api/handlers/profile.ts', offset: 31, limit: 15 },
        { file_path: '/project/src/utils/guards.ts', offset: 12, limit: 15 },
      ],
      result: '60 lines read across 4 files',
      contextCost: 'Proportional — only relevant sections, not full files',
    },
    {
      step: 4,
      tool: 'Edit',
      call: '4 targeted string replacements, one per file',
      result: 'All error messages standardized',
      contextCost: 'Minimal — only the changed strings',
    },
  ],

  totalContextUsed: '~150 lines across all steps (vs ~3,000+ if all files were read in full)',
} as const;
