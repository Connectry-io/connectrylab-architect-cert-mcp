---
# Task 3.3: Path-specific rules via YAML frontmatter.
# The `paths` array accepts glob patterns. These rules ONLY activate
# when Claude is working on files matching these patterns.
# This keeps API-specific guidance out of unrelated subsystems.
paths:
  - "src/api/**"
---

# API Layer Patterns

## Route Handler Structure

Every route handler must follow this sequence:

1. **Validate** — Parse request body/params with Zod schema
2. **Authorize** — Check user permissions for this operation
3. **Execute** — Call domain service (never access DB directly)
4. **Respond** — Return consistent JSON envelope

```typescript
// Correct pattern for a route handler
export const createUserHandler: RequestHandler = async (req, res, next) => {
  // 1. Validate
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: formatZodError(parsed.error) });
  }

  // 2. Authorize
  if (!req.user?.permissions.includes('user:create')) {
    return res.status(403).json({ ok: false, error: 'Insufficient permissions' });
  }

  // 3. Execute
  const result = await userService.createUser(parsed.data);

  // 4. Respond
  if (!result.ok) {
    return res.status(409).json({ ok: false, error: result.error });
  }
  return res.status(201).json({ ok: true, data: result.data });
};
```

## Response Envelope

All API responses use a consistent shape:

```typescript
// Success
{ "ok": true, "data": { ... } }

// Error
{ "ok": false, "error": "Human-readable message" }

// Paginated
{ "ok": true, "data": [...], "meta": { "total": 100, "page": 1, "limit": 20 } }
```

## Middleware Order

Apply middleware in this order on every router:

1. `cors()` — Cross-origin configuration
2. `rateLimit()` — Request throttling
3. `authenticate()` — JWT verification
4. `authorize(permission)` — Role-based access (per-route)
5. Route handler

## Input Validation

- Define a Zod schema for every endpoint's body, query, and params
- Validate at the handler level, not in middleware (keeps schemas co-located)
- Return 400 with field-level error messages on validation failure
