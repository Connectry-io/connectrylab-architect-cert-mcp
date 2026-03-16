---
# Task 3.3: Path-specific rules scoped to the database layer.
# These rules activate ONLY when working on files under src/db/.
# The glob pattern ensures API and domain code are not affected.
paths:
  - "src/db/**"
---

# Database Layer Patterns

## Repository Implementation

Every repository must implement the interface defined in the domain layer:

```typescript
// Domain layer defines the interface (src/domain/user-repository.ts)
export interface UserRepository {
  readonly findById: (id: UserId) => Promise<User | null>;
  readonly findAll: (filter: UserFilter) => Promise<readonly User[]>;
  readonly create: (input: CreateUserInput) => Promise<User>;
  readonly update: (id: UserId, input: UpdateUserInput) => Promise<User | null>;
  readonly remove: (id: UserId) => Promise<boolean>;
}

// DB layer provides the concrete implementation (src/db/user-repository.ts)
export const createDrizzleUserRepo = (db: Database): UserRepository => ({
  findById: async (id) => { /* Drizzle query */ },
  // ...
});
```

## Query Patterns

- Always use parameterized queries (Drizzle handles this by default)
- Never concatenate user input into SQL strings
- Use transactions for multi-table writes: `db.transaction(async (tx) => { ... })`
- Prefer `.select()` with explicit columns over `SELECT *`

## Migration Rules

- One migration per schema change; never modify existing migrations
- Migration files: `NNNN_descriptive-name.sql` (e.g., `0003_add-user-email-index.sql`)
- Always include both `up` and `down` directions
- Test migrations against a fresh database in CI

## Connection Management

- Use a connection pool; never create connections per-request
- Set pool size via environment variable: `DATABASE_POOL_SIZE`
- Implement health check query: `SELECT 1`
- Handle connection errors with retry and exponential backoff

## Naming Conventions (SQL)

- Tables: plural snake_case (`user_profiles`, `order_items`)
- Columns: singular snake_case (`created_at`, `email_address`)
- Indexes: `idx_<table>_<columns>` (`idx_users_email`)
- Foreign keys: `fk_<table>_<referenced_table>` (`fk_orders_users`)
