# Database Subsystem — Directory-Level Instructions
#
# Task 3.1: This is a DIRECTORY-LEVEL CLAUDE.md.
# It applies only when working on files under src/db/.
# Supplements the project-level CLAUDE.md with database-specific context.

## This Directory

Database access layer using Drizzle ORM with PostgreSQL.
Implements repository interfaces defined in `src/domain/`.

## Key Files

- `repositories/` — Concrete repository implementations
- `migrations/` — SQL migration files (numbered, immutable)
- `schema/` — Drizzle schema definitions (table, column, index)
- `connection.ts` — Connection pool setup and health checks
- `index.ts` — Repository factory (dependency injection entry point)

## Rules for This Directory

- All queries must use Drizzle's query builder (never raw SQL strings)
- Repository functions must return domain types, not Drizzle row types
- Map between DB rows and domain types at the repository boundary
- Multi-table writes must use transactions
- Never expose the database connection outside this directory

## Migration Discipline

- One migration file per schema change
- Never modify an existing migration that has been merged to main
- Always provide both up and down migrations
- Test migrations on a fresh database before merging

## Connection Handling

- Pool size is configured via `DATABASE_POOL_SIZE` env var (default: 10)
- Implement graceful shutdown: drain connections on SIGTERM
- Health check endpoint must verify DB connectivity

## Testing

Database tests use a test container (Testcontainers) for isolation:
```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const container = await new PostgreSqlContainer().start();
const db = createConnection(container.getConnectionUri());
// Run migrations, then test queries against real Postgres
```
