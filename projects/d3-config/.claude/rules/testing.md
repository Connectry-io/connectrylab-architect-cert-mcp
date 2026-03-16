# Testing Rules
#
# Task 3.1: Another .claude/rules/ file, auto-loaded project-wide.
# @imported from root CLAUDE.md alongside coding-style.md.
# Demonstrates how teams encode shared testing expectations into
# Claude Code's instruction hierarchy.

## Test File Placement

- Co-locate tests with source: `user-service.ts` → `user-service.test.ts`
- Shared test utilities go in `src/__test-utils__/`
- Fixtures go in `src/__fixtures__/`

## Test Structure

Use the Arrange-Act-Assert pattern in every test:

```typescript
it('should return user by id', () => {
  // Arrange — set up test data and dependencies
  const mockRepo = createMockUserRepo({ users: [testUser] });
  const service = createUserService(mockRepo);

  // Act — call the function under test
  const result = service.getUserById(testUser.id);

  // Assert — verify the expected outcome
  expect(result).toEqual({ ok: true, data: testUser });
});
```

## Coverage Requirements

- Minimum 80% line coverage on all packages
- 100% coverage on domain layer (pure functions are easy to test)
- Coverage is enforced in CI; builds fail below threshold

## Mocking Strategy

- Mock at the boundary: repositories, external APIs, filesystem
- Never mock the code under test
- Use dependency injection; avoid module-level mocking
- Prefer fakes (in-memory implementations) over stubs for repositories

## Test Naming

Use descriptive names that read as specifications:
- `should return 404 when user does not exist`
- `should reject passwords shorter than 8 characters`
- `should retry failed requests up to 3 times`
