# Project Configuration — Team Workflow Setup
#
# Task 3.1: This is a PROJECT-LEVEL CLAUDE.md.
# It sits at the repo root and applies to every file in the repository.
# Directory-level CLAUDE.md files (e.g., src/api/CLAUDE.md) can add
# narrower instructions but cannot override these project-wide rules.

## Team Conventions

- Language: TypeScript (strict mode)
- Runtime: Node.js 22+
- Package manager: pnpm
- Test framework: Vitest
- Linter: ESLint with @typescript-eslint
- Formatter: Prettier (2-space indent, single quotes, trailing commas)

## Code Standards

- All functions must have JSDoc comments with @param and @returns
- Prefer `const` over `let`; never use `var`
- Use named exports; avoid default exports
- Maximum file length: 400 lines
- Maximum function length: 40 lines
- All async functions must have explicit error handling

## Git Conventions

- Commit messages follow Conventional Commits: `type(scope): description`
- Types: feat, fix, refactor, docs, test, chore, perf, ci
- PRs require at least one approval before merge
- Squash merge to main; delete branch after merge

## Import Directives
#
# Task 3.1: @import pulls in shared rule files from .claude/rules/.
# These files are automatically loaded when present in .claude/rules/,
# but @import makes the dependency explicit and controls load order.
# Each imported file focuses on a single concern.

@import .claude/rules/coding-style.md
@import .claude/rules/testing.md

## Build & Run Commands

- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`
- Dev server: `pnpm dev`
- Type check: `pnpm typecheck`

## Architecture Overview

This project uses a layered architecture:

```
src/
├── api/       # HTTP handlers (Express routes)
├── db/        # Database access (Drizzle ORM)
├── domain/    # Business logic (pure functions)
├── shared/    # Cross-cutting utilities
└── index.ts   # Application entry point
```

- API layer depends on domain layer, never on db directly
- Domain layer is pure; no I/O, no framework imports
- DB layer implements repository interfaces defined in domain
