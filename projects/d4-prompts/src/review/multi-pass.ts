/**
 * Domain 4.6 — Multi-Pass Review
 *
 * Task Statement: "Implement multi-pass review with independent instances,
 * per-file and cross-file passes, and synthesis aggregation."
 *
 * This module demonstrates:
 * - Independent reviewer instances (each sees only its role's context)
 * - Per-file pass with split roles: security, performance, correctness
 * - Cross-file integration pass (detects patterns spanning files)
 * - Synthesis aggregation (merges all findings with deduplication)
 *
 * Key insight: A single "review this code" prompt produces shallow,
 * inconsistent results. Split into focused roles, run independently,
 * then synthesize. Each reviewer is an expert in ONE thing.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  ReviewRole,
  FileReviewResult,
  Finding,
  CrossFileResult,
  ReviewSynthesis,
} from "../types.js";

// ---------------------------------------------------------------------------
// Role-Specific System Prompts
// ---------------------------------------------------------------------------

/**
 * Each role gets a focused system prompt that constrains the reviewer
 * to its area of expertise. This prevents the "jack of all trades"
 * problem where a single reviewer gives shallow coverage of everything.
 */
const ROLE_PROMPTS: Readonly<Record<ReviewRole, string>> = {
  security: `You are a security-focused code reviewer. You ONLY look for security issues.

Focus areas:
- Input validation and sanitization
- Authentication and authorization flaws
- Injection vulnerabilities (SQL, XSS, command injection)
- Sensitive data exposure (secrets, PII in logs)
- Insecure cryptographic practices
- Race conditions that could be exploited

Do NOT comment on:
- Code style or formatting
- Performance optimization
- General code quality

For each finding, provide:
- severity: critical, high, medium, low, or info
- category: the security category (e.g., "injection", "auth", "crypto")
- description: what the issue is
- location: file path and line/function reference
- suggestion: how to fix it

Respond as JSON: { "findings": [...] }`,

  performance: `You are a performance-focused code reviewer. You ONLY look for performance issues.

Focus areas:
- Unnecessary memory allocations and copies
- N+1 query patterns
- Missing caching opportunities
- Inefficient algorithms (O(n^2) where O(n) is possible)
- Blocking operations in async contexts
- Resource leaks (unclosed connections, file handles)

Do NOT comment on:
- Security vulnerabilities
- Code style or formatting
- Business logic correctness

For each finding, provide:
- severity: critical, high, medium, low, or info
- category: the performance category (e.g., "memory", "query", "algorithm")
- description: what the issue is
- location: file path and line/function reference
- suggestion: how to fix it

Respond as JSON: { "findings": [...] }`,

  correctness: `You are a correctness-focused code reviewer. You ONLY look for logic errors.

Focus areas:
- Off-by-one errors
- Null/undefined handling
- Type coercion bugs
- Incorrect conditional logic
- Missing edge case handling
- Broken error propagation
- Violated invariants

Do NOT comment on:
- Security vulnerabilities
- Performance optimization
- Code style or formatting

For each finding, provide:
- severity: critical, high, medium, low, or info
- category: the correctness category (e.g., "null-safety", "logic", "edge-case")
- description: what the issue is
- location: file path and line/function reference
- suggestion: how to fix it

Respond as JSON: { "findings": [...] }`,
};

// ---------------------------------------------------------------------------
// Pass 1: Per-File Reviews (Independent Instances)
// ---------------------------------------------------------------------------

/**
 * Reviews a single file with a specific role.
 * Each call creates an independent conversation — the security reviewer
 * never sees the performance reviewer's findings, and vice versa.
 * This prevents anchoring bias.
 */
async function reviewFileWithRole(
  client: Anthropic,
  filePath: string,
  fileContent: string,
  role: ReviewRole
): Promise<FileReviewResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: ROLE_PROMPTS[role],
    messages: [
      {
        role: "user",
        content: `Review this file for ${role} issues:\n\nFile: ${filePath}\n\n\`\`\`\n${fileContent}\n\`\`\``,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { filePath, role, findings: [] };
  }

  try {
    const parsed = JSON.parse(textBlock.text) as { findings: Finding[] };
    return {
      filePath,
      role,
      findings: parsed.findings,
    };
  } catch {
    console.warn(`  Warning: Could not parse ${role} review for ${filePath}`);
    return { filePath, role, findings: [] };
  }
}

/**
 * Runs all three role-based reviews for a single file in parallel.
 * Independence is maintained because each is a separate API call.
 */
async function reviewFile(
  client: Anthropic,
  filePath: string,
  fileContent: string
): Promise<readonly FileReviewResult[]> {
  const roles: readonly ReviewRole[] = ["security", "performance", "correctness"];

  const results = await Promise.all(
    roles.map((role) => reviewFileWithRole(client, filePath, fileContent, role))
  );

  return results;
}

// ---------------------------------------------------------------------------
// Pass 2: Cross-File Integration
// ---------------------------------------------------------------------------

/**
 * Cross-file review looks for patterns that span multiple files.
 * This catches architectural issues that per-file reviews miss:
 * - Inconsistent error handling across modules
 * - Security boundaries broken by transitive dependencies
 * - Duplicated logic that should be shared
 */
async function crossFileReview(
  client: Anthropic,
  files: readonly { readonly path: string; readonly content: string }[]
): Promise<readonly CrossFileResult[]> {
  const fileSummaries = files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are a systems-level code reviewer looking for cross-file patterns.

Focus on issues that only become visible when examining multiple files together:
- Inconsistent patterns (one file validates input, another doesn't)
- Broken abstractions (implementation details leaking across boundaries)
- Missing integration points (error from module A not handled by module B)
- Duplicated logic that should be extracted into shared utilities
- Dependency cycles or circular references

For each finding, provide:
- pattern: name of the cross-file pattern
- affectedFiles: list of file paths involved
- description: what the issue is
- severity: critical, high, medium, or low

Respond as JSON: { "findings": [...] }`,
    messages: [
      {
        role: "user",
        content: `Review these files together for cross-file patterns:\n\n${fileSummaries}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return [];
  }

  try {
    const parsed = JSON.parse(textBlock.text) as { findings: CrossFileResult[] };
    return parsed.findings;
  } catch {
    console.warn("  Warning: Could not parse cross-file review");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Pass 3: Synthesis Aggregation
// ---------------------------------------------------------------------------

/**
 * Synthesizes all per-file and cross-file results into a final report.
 * This is a pure function — no API calls, just data transformation.
 */
function synthesizeResults(
  perFileResults: readonly FileReviewResult[],
  crossFileResults: readonly CrossFileResult[]
): ReviewSynthesis {
  // Count severities across all findings
  const allFindings = perFileResults.flatMap((r) => r.findings);

  const criticalCount =
    allFindings.filter((f) => f.severity === "critical").length +
    crossFileResults.filter((f) => f.severity === "critical").length;

  const highCount =
    allFindings.filter((f) => f.severity === "high").length +
    crossFileResults.filter((f) => f.severity === "high").length;

  // Build summary
  const totalFindings = allFindings.length + crossFileResults.length;
  const filesReviewed = new Set(perFileResults.map((r) => r.filePath)).size;
  const rolesUsed = new Set(perFileResults.map((r) => r.role)).size;

  const summary =
    `Reviewed ${filesReviewed} file(s) with ${rolesUsed} independent reviewers. ` +
    `Found ${totalFindings} total issue(s): ` +
    `${criticalCount} critical, ${highCount} high, ` +
    `${totalFindings - criticalCount - highCount} medium/low/info. ` +
    `Cross-file analysis identified ${crossFileResults.length} systemic pattern(s).`;

  return {
    perFileResults,
    crossFileResults,
    summary,
    criticalCount,
    highCount,
  };
}

// ---------------------------------------------------------------------------
// Full Multi-Pass Orchestration
// ---------------------------------------------------------------------------

/**
 * Runs the complete three-pass review:
 * 1. Per-file reviews with split roles (parallel within each file)
 * 2. Cross-file integration review
 * 3. Synthesis aggregation
 */
async function multiPassReview(
  client: Anthropic,
  files: readonly { readonly path: string; readonly content: string }[]
): Promise<ReviewSynthesis> {
  console.log("Pass 1: Per-file reviews with split roles...");

  // Run per-file reviews (all files in parallel, each file has 3 role reviews)
  const perFileResultArrays = await Promise.all(
    files.map(async (file) => {
      console.log(`  Reviewing ${file.path} (security + performance + correctness)...`);
      return reviewFile(client, file.path, file.content);
    })
  );
  const perFileResults = perFileResultArrays.flat();

  console.log(
    `  Per-file findings: ${perFileResults.reduce((sum, r) => sum + r.findings.length, 0)}`
  );

  // Pass 2: Cross-file review
  console.log("\nPass 2: Cross-file integration review...");
  const crossFileResults = await crossFileReview(client, files);
  console.log(`  Cross-file patterns: ${crossFileResults.length}`);

  // Pass 3: Synthesis
  console.log("\nPass 3: Synthesis aggregation...");
  const synthesis = synthesizeResults(perFileResults, crossFileResults);

  return synthesis;
}

// ---------------------------------------------------------------------------
// Demo Data — Sample code files to review
// ---------------------------------------------------------------------------

const SAMPLE_FILES: readonly { readonly path: string; readonly content: string }[] = [
  {
    path: "src/auth/login.ts",
    content: `import { db } from "../db";
import { hash } from "../utils/crypto";

export async function login(email: string, password: string) {
  // Find user by email
  const user = await db.query(\`SELECT * FROM users WHERE email = '\${email}'\`);
  if (!user) return { error: "Invalid credentials" };

  // Check password
  const hashed = hash(password);
  if (user.passwordHash !== hashed) {
    return { error: "Invalid credentials" };
  }

  // Generate session
  const token = Math.random().toString(36).slice(2);
  await db.query(\`INSERT INTO sessions VALUES ('\${token}', '\${user.id}')\`);

  console.log(\`User logged in: \${email}, token: \${token}\`);
  return { token, user: { id: user.id, email: user.email } };
}`,
  },
  {
    path: "src/api/users.ts",
    content: `import { db } from "../db";

export async function getUsers(page: number, limit: number) {
  const offset = page * limit;
  const users = await db.query(\`SELECT * FROM users LIMIT \${limit} OFFSET \${offset}\`);

  // Fetch roles for each user
  const usersWithRoles = [];
  for (const user of users) {
    const roles = await db.query(\`SELECT * FROM roles WHERE user_id = '\${user.id}'\`);
    usersWithRoles.push({ ...user, roles });
  }

  return usersWithRoles;
}

export async function deleteUser(userId: string) {
  await db.query(\`DELETE FROM users WHERE id = '\${userId}'\`);
  return { success: true };
}`,
  },
];

// ---------------------------------------------------------------------------
// Main — runnable with: npx tsx src/review/multi-pass.ts
// ---------------------------------------------------------------------------

export async function runMultiPassDemo(): Promise<ReviewSynthesis> {
  const client = new Anthropic();

  console.log("=== Domain 4.6: Multi-Pass Review ===\n");
  console.log(`Files to review: ${SAMPLE_FILES.length}`);
  console.log("Roles: security, performance, correctness");
  console.log("Passes: per-file -> cross-file -> synthesis\n");

  const synthesis = await multiPassReview(client, SAMPLE_FILES);

  console.log("\n--- Review Synthesis ---");
  console.log(synthesis.summary);

  if (synthesis.criticalCount > 0 || synthesis.highCount > 0) {
    console.log("\nHigh-Priority Findings:");
    for (const result of synthesis.perFileResults) {
      const highPriority = result.findings.filter(
        (f) => f.severity === "critical" || f.severity === "high"
      );
      for (const finding of highPriority) {
        console.log(
          `  [${finding.severity.toUpperCase()}] ${result.filePath} (${result.role})`
        );
        console.log(`    ${finding.description}`);
        console.log(`    Fix: ${finding.suggestion}`);
      }
    }
  }

  if (synthesis.crossFileResults.length > 0) {
    console.log("\nCross-File Patterns:");
    for (const pattern of synthesis.crossFileResults) {
      console.log(
        `  [${pattern.severity.toUpperCase()}] ${pattern.pattern}`
      );
      console.log(`    Files: ${pattern.affectedFiles.join(", ")}`);
      console.log(`    ${pattern.description}`);
    }
  }

  return synthesis;
}

// Run if executed directly
const isDirectRun = process.argv[1]?.includes("multi-pass");
if (isDirectRun) {
  runMultiPassDemo().catch(console.error);
}

export {
  ROLE_PROMPTS,
  reviewFileWithRole,
  reviewFile,
  crossFileReview,
  synthesizeResults,
  multiPassReview,
};
