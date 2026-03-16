# API Subsystem — Directory-Level Instructions
#
# Task 3.1: This is a DIRECTORY-LEVEL CLAUDE.md.
# It applies only when working on files under src/api/.
# These instructions supplement (not override) the project-level CLAUDE.md.
#
# Directory-level CLAUDE.md files are ideal for subsystem-specific
# context that would be noise in the root configuration.

## This Directory

HTTP API layer built with Express.js. Handles request validation,
authentication, authorization, and response formatting.

## Key Files

- `routes/` — Route definitions grouped by resource
- `middleware/` — Express middleware (auth, rate-limit, error-handler)
- `schemas/` — Zod validation schemas for request bodies and params
- `index.ts` — Router assembly and middleware application

## Rules for This Directory

- Every route handler must validate input with a Zod schema
- Never import from `src/db/` directly; use domain service interfaces
- All responses must use the standard envelope: `{ ok, data?, error?, meta? }`
- Error responses must never expose internal details (stack traces, SQL errors)
- Rate limiting is mandatory on all public endpoints

## Common Patterns

When adding a new endpoint:
1. Define the Zod schema in `schemas/`
2. Create the route handler in `routes/`
3. Register the route in `index.ts`
4. Add corresponding tests (handler + integration)

## Testing

API tests should use `supertest` for integration testing:
```typescript
import request from 'supertest';
import { createApp } from '../index';

const app = createApp(mockDependencies);
const response = await request(app).get('/api/users/usr_123');
expect(response.status).toBe(200);
```
