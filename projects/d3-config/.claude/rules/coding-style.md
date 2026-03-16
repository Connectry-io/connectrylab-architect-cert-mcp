# Coding Style Rules
#
# Task 3.1: This file lives in .claude/rules/ and is auto-loaded for
# every session in this project. It is also explicitly @imported from
# the root CLAUDE.md to make the dependency visible.
#
# .claude/rules/ files contain instructions that apply project-wide.
# For path-specific rules, see api-patterns.md and db-patterns.md
# which use YAML frontmatter with `paths:` to scope activation.

## Naming Conventions

- Files: kebab-case (`user-service.ts`, `auth-middleware.ts`)
- Types/Interfaces: PascalCase with descriptive names (`UserProfile`, `AuthToken`)
- Functions: camelCase, verb-first (`getUserById`, `validateToken`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT_MS`)
- Booleans: prefix with is/has/can/should (`isActive`, `hasPermission`)

## Import Order

Enforce consistent import ordering (top to bottom):

1. Node built-ins (`node:fs`, `node:path`)
2. External packages (`express`, `zod`)
3. Internal aliases (`@/domain/`, `@/shared/`)
4. Relative imports (`./utils`, `../types`)

Separate each group with a blank line.

## Type Safety

- Never use `any`; prefer `unknown` and narrow with type guards
- Use discriminated unions over optional fields for state modeling
- Define Zod schemas at API boundaries; derive TypeScript types with `z.infer`
- Prefer branded types for domain identifiers (`UserId`, `OrderId`)

## Immutability

- Use `readonly` on all interface/type properties unless mutation is required
- Prefer `ReadonlyArray<T>` (or `readonly T[]`) over `Array<T>`
- Use object spread for updates: `{ ...original, field: newValue }`
- Never mutate function arguments

## Error Handling

- Use Result types (`{ ok: true, data } | { ok: false, error }`) in domain layer
- Throw only in infrastructure code; catch at the boundary
- All error messages must be user-safe (no stack traces, no internal paths)
- Log full error context server-side with structured logging
