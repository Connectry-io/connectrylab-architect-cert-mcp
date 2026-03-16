/**
 * Example Runner — Domain 5 Mini Reference Project
 *
 * Demonstrates all Domain 5 patterns in a single flow:
 *   5.1: Context preservation (fact extraction, trimming, constraint restatement)
 *   5.2: Escalation (trigger evaluation, preference routing)
 *   5.3: Error propagation (AgentResult envelope, partial results)
 *   5.4: Large codebase context (scratchpad, subagent delegation)
 *   5.5: Human review (field confidence, stratified sampling, calibration)
 *   5.6: Information provenance (claim synthesis, conflict detection, temporal decay)
 *
 * Run with: npx tsx src/index.ts
 *
 * Note: API calls require ANTHROPIC_API_KEY in the environment.
 * Non-API demos (escalation, errors, review, provenance) run without a key.
 */

// --- Context Preservation (5.1) ---
import {
  restateConstraints,
  trimToolOutput,
} from "./context/preservation.js";

// --- Scratchpad (5.4) ---
import {
  createScratchpad,
  writeScratchpadEntry,
  readSection,
  listSections,
  serializeToMarkdown,
  parseFromMarkdown,
  generateReAnchorPrompt,
} from "./context/scratchpad.js";

// --- Escalation (5.2) ---
import {
  createDefaultTriggers,
  evaluateTriggers,
  evaluateHighestPriority,
} from "./escalation/triggers.js";
import type { EvaluationContext } from "./escalation/triggers.js";
import {
  createPreferenceBuilder,
  withDefaultChannel,
  withTopicOverride,
  withAlwaysEscalate,
  withContact,
  buildPreferences,
  createPreferenceStore,
  setCustomerPreferences,
  getCustomerPreferences,
  routeEscalation,
  routeMultipleEscalations,
} from "./escalation/preferences.js";

// --- Error Propagation (5.3) ---
import {
  success,
  failure,
  partial,
  mapResult,
  combineResults,
  wrapAsync,
  wrapSync,
  hasRecoverableErrors,
  unwrapOrThrow,
} from "./errors/propagation.js";
import type { AgentError } from "./types.js";

// --- Human Review (5.5) ---
import {
  createDefaultConfig,
  scoreDocument,
  flagFieldsForReview,
  generateReviewSummary,
  createDefaultSamplingConfig,
  stratifiedSample,
} from "./review/confidence.js";
import {
  createCalibrationData,
  recordCorrection,
  generateCalibrationReport,
  formatCalibrationReport,
  adjustThreshold,
  createCorrectionFromReview,
} from "./review/calibration.js";

// --- Provenance (5.6) ---
import {
  createSourceBinding,
  synthesizeClaim,
  mergeClaims,
  formatClaimWithProvenance,
  formatInlineCitation,
  detectConflicts,
} from "./provenance/synthesis.js";

// ---------------------------------------------------------------------------
// Demo Runner
// ---------------------------------------------------------------------------

function separator(title: string): void {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(70)}\n`);
}

function demoContextPreservation(): void {
  separator("5.1 — Context Preservation: Trimming & Constraint Restatement");

  // Demo: Tool output trimming with different strategies
  const largeOutput = Array.from(
    { length: 100 },
    (_, i) => `line ${i + 1}: data_${Math.random().toFixed(4)}_value_${i * 42}`
  ).join("\n");

  console.log("Original output: 100 lines");

  const truncated = trimToolOutput(largeOutput, "truncate", 50);
  console.log(`\nTruncate strategy (${truncated.retainedRatio.toFixed(2)} retained):`);
  console.log(`  Lost-in-middle warning: ${truncated.lostInMiddleWarning}`);
  console.log(`  Preview: ${truncated.trimmed.slice(0, 120)}...`);

  const sampled = trimToolOutput(largeOutput, "sample", 50);
  console.log(`\nSample strategy (${sampled.retainedRatio.toFixed(2)} retained):`);
  console.log(`  Preview: ${sampled.trimmed.slice(0, 120)}...`);

  // Demo: JSON structured trimming
  const jsonOutput = JSON.stringify({
    results: Array.from({ length: 20 }, (_, i) => ({
      id: i,
      name: `item_${i}`,
      description: "A long description that takes up space in the context window",
      metadata: { created: "2024-01-01", tags: ["a", "b", "c"] },
    })),
  });

  const structured = trimToolOutput(jsonOutput, "structured", 100);
  console.log(`\nStructured strategy (${structured.retainedRatio.toFixed(2)} retained):`);
  console.log(`  Preview: ${structured.trimmed.slice(0, 200)}...`);

  // Demo: Constraint restatement
  const facts = [
    {
      id: "f1",
      content: "Response must be under 500 tokens",
      source: "system",
      extractedAt: new Date().toISOString(),
      confidence: 1.0,
      category: "constraint" as const,
    },
    {
      id: "f2",
      content: "Never reveal API keys in responses",
      source: "policy",
      extractedAt: new Date().toISOString(),
      confidence: 1.0,
      category: "constraint" as const,
    },
    {
      id: "f3",
      content: "Project uses TypeScript with strict mode",
      source: "tsconfig",
      extractedAt: new Date().toISOString(),
      confidence: 0.95,
      category: "finding" as const,
    },
  ];

  const restated = restateConstraints(facts, ["constraint"]);
  console.log("\nConstraint restatement (inserted before critical operations):");
  console.log(restated);
}

function demoScratchpad(): void {
  separator("5.4 — Scratchpad: Surviving /compact");

  // Create and populate a scratchpad
  let pad = createScratchpad("./investigation-notes.md");
  pad = writeScratchpadEntry(pad, "auth-module", "pattern", "Uses JWT with RS256 signing");
  pad = writeScratchpadEntry(pad, "auth-module", "issue", "Token refresh has race condition on line 142");
  pad = writeScratchpadEntry(pad, "database", "schema", "Users table has 12 columns, 3 indexes");
  pad = writeScratchpadEntry(pad, "database", "perf", "Slow query on users.email lookup — missing index");

  console.log("Scratchpad sections:", listSections(pad));
  console.log("\nAuth module entries:");
  for (const entry of readSection(pad, "auth-module")) {
    console.log(`  ${entry.key}: ${entry.value}`);
  }

  // Serialize to markdown (what gets written to disk)
  const markdown = serializeToMarkdown(pad);
  console.log("\nSerialized to markdown:");
  console.log(markdown.slice(0, 300) + "...");

  // Simulate /compact: parse back from markdown
  const recovered = parseFromMarkdown("./investigation-notes.md", markdown);
  console.log(`\nRecovered after /compact: ${recovered.entries.length} entries`);
  console.log("Sections:", listSections(recovered));

  // Generate re-anchor prompt
  const prompt = generateReAnchorPrompt("./investigation-notes.md");
  console.log("\nRe-anchor prompt (first message after /compact):");
  console.log(prompt);
}

function demoEscalation(): void {
  separator("5.2 — Escalation: Typed Triggers & Customer Preferences");

  const registry = createDefaultTriggers();

  // Scenario 1: Low confidence
  const lowConfidenceContext: EvaluationContext = {
    currentConfidence: 0.55,
    topicClassification: "billing",
    policyViolations: [],
    consecutiveFailures: 0,
    financialImpact: null,
    customerRequestedEscalation: false,
    sensitiveTopics: [],
  };

  const events1 = evaluateTriggers(registry, lowConfidenceContext);
  console.log("Scenario 1 — Low confidence:");
  console.log(`  Triggers fired: ${events1.length}`);
  for (const e of events1) {
    console.log(`  - [${e.trigger.severity}] ${e.trigger.category}: ${e.recommendedAction}`);
  }

  // Scenario 2: Policy violation + sensitive topic
  const criticalContext: EvaluationContext = {
    currentConfidence: 0.9,
    topicClassification: "medical",
    policyViolations: ["Attempted to provide medical diagnosis"],
    consecutiveFailures: 0,
    financialImpact: null,
    customerRequestedEscalation: false,
    sensitiveTopics: ["medical_advice"],
  };

  const events2 = evaluateTriggers(registry, criticalContext);
  console.log("\nScenario 2 — Policy violation + sensitive topic:");
  console.log(`  Triggers fired: ${events2.length}`);
  for (const e of events2) {
    console.log(`  - [${e.trigger.severity}] ${e.trigger.category}: ${e.recommendedAction}`);
  }

  // Customer preferences and routing
  const prefs = buildPreferences(
    withContact(
      withContact(
        withAlwaysEscalate(
          withTopicOverride(
            withDefaultChannel(
              createPreferenceBuilder("customer-acme"),
              "slack"
            ),
            {
              topic: "billing",
              channel: "email",
              severity: "medium",
              bypassAutoResolve: true,
            }
          ),
          "policy_violation"
        ),
        { name: "Alice", channel: "slack", address: "#support-acme", priority: 1 }
      ),
      { name: "Bob", channel: "email", address: "bob@acme.com", priority: 1 }
    )
  );

  let store = createPreferenceStore();
  store = setCustomerPreferences(store, prefs);

  const retrieved = getCustomerPreferences(store, "customer-acme");
  if (retrieved && events2.length > 0) {
    const decisions = routeMultipleEscalations(events2, retrieved);
    console.log("\nRouting decisions for ACME Corp:");
    for (const d of decisions) {
      console.log(`  - ${d.event.trigger.category} → ${d.channel} (${d.contacts.map((c) => c.name).join(", ")})`);
      if (d.appliedOverride) {
        console.log(`    Applied topic override: ${d.appliedOverride.topic}`);
      }
    }
  }
}

function demoErrorPropagation(): void {
  separator("5.3 — Error Propagation: AgentResult<T> Envelope");

  // Success case
  const ok = success({ answer: "42", sources: ["db", "cache"] }, new Date().toISOString(), 150);
  console.log("Success result:", ok.status, "data:", ok.data);

  // Failure case: access failure vs empty result
  const accessFail = failure<string>(
    "ACCESS_FAILURE",
    "Database connection refused",
    "db-agent",
    new Date().toISOString()
  );
  console.log("\nAccess failure:", accessFail.status);
  console.log("  Recoverable:", hasRecoverableErrors(accessFail));

  const emptyResult = failure<string>(
    "EMPTY_RESULT",
    "No records match the query",
    "db-agent",
    new Date().toISOString()
  );
  console.log("\nEmpty result:", emptyResult.status);
  console.log("  Recoverable:", hasRecoverableErrors(emptyResult));

  // Partial result
  const partialErrors: readonly AgentError[] = [
    {
      code: "TIMEOUT",
      message: "API-2 timed out after 30s",
      source: "api-2-agent",
      recoverable: true,
      timestamp: new Date().toISOString(),
    },
  ];
  const partialResult = partial(
    { available: ["api-1-result", "api-3-result"] },
    partialErrors,
    new Date().toISOString()
  );
  console.log("\nPartial result:", partialResult.status, "data:", partialResult.data);
  console.log("  Errors:", partialResult.errors.map((e) => e.message));

  // Combining results (coordinator fan-out)
  // Use unknown to combine heterogeneous result types, as a real coordinator would
  const combined = combineResults<unknown>([ok, accessFail, partialResult]);
  console.log("\nCombined 3 results:", combined.status);
  console.log("  Successful data count:", combined.data?.length ?? 0);
  console.log("  Total errors:", combined.errors.length);

  // Map over results
  const mapped = mapResult(ok, (d) => `The answer is ${d.answer}`);
  console.log("\nMapped result:", mapped.data);

  // Wrap sync function
  const wrapped = wrapSync("parser", () => JSON.parse('{"key": "value"}'));
  console.log("\nWrapped sync:", wrapped.status, wrapped.data);

  const wrappedFail = wrapSync("parser", () => JSON.parse("not json"));
  console.log("Wrapped sync fail:", wrappedFail.status, wrappedFail.errors[0]?.code);
}

function demoHumanReview(): void {
  separator("5.5 — Human Review: Confidence, Sampling & Calibration");

  const config = createDefaultConfig();

  // Score some documents
  const invoice = scoreDocument("inv-001", "invoice", [
    { name: "vendor", value: "Acme Corp", confidence: 0.95 },
    { name: "amount", value: 1234.56, confidence: 0.72 },
    { name: "date", value: "2024-03-15", confidence: 0.88 },
    { name: "invoice_number", value: "INV-2024-001", confidence: 0.99 },
  ], config);

  const medicalRecord = scoreDocument("med-001", "medical_record", [
    { name: "patient_name", value: "John Doe", confidence: 0.92 },
    { name: "diagnosis", value: "Type 2 Diabetes", confidence: 0.78 },
    { name: "dosage", value: "500mg metformin", confidence: 0.65 },
    { name: "date", value: "2024-03-10", confidence: 0.97 },
  ], config);

  console.log(generateReviewSummary(invoice));
  console.log("");
  console.log(generateReviewSummary(medicalRecord));

  // Stratified sampling
  const documents = [
    invoice,
    medicalRecord,
    scoreDocument("inv-002", "invoice", [
      { name: "amount", value: 500, confidence: 0.99 },
    ], config),
    scoreDocument("inv-003", "invoice", [
      { name: "amount", value: 750, confidence: 0.91 },
    ], config),
    scoreDocument("con-001", "contract", [
      { name: "party_a", value: "Company A", confidence: 0.88 },
      { name: "value", value: 50000, confidence: 0.76 },
    ], config),
  ];

  const samplingConfig = createDefaultSamplingConfig();
  const sampled = stratifiedSample(documents, samplingConfig);
  console.log(`\nStratified sample: ${sampled.length} of ${documents.length} documents selected`);
  for (const doc of sampled) {
    console.log(`  - ${doc.id} (${doc.type}, priority: ${doc.reviewPriority})`);
  }

  // Calibration
  let calData = createCalibrationData();

  // Simulate human corrections
  const corrections = [
    { confidence: 0.95, correct: true },
    { confidence: 0.92, correct: true },
    { confidence: 0.88, correct: true },
    { confidence: 0.85, correct: false }, // overconfident
    { confidence: 0.78, correct: true },
    { confidence: 0.72, correct: false },
    { confidence: 0.65, correct: false },
    { confidence: 0.60, correct: true },
    { confidence: 0.55, correct: false },
    { confidence: 0.50, correct: false },
    // Add more for statistical significance
    ...Array.from({ length: 40 }, (_, i) => ({
      confidence: 0.5 + (i / 80),
      correct: Math.random() < 0.5 + (i / 80) * 0.4,
    })),
  ];

  for (const c of corrections) {
    calData = recordCorrection(calData, {
      fieldName: "test_field",
      predictedValue: "predicted",
      predictedConfidence: c.confidence,
      humanVerifiedValue: c.correct ? "predicted" : "different",
      wasCorrect: c.correct,
      documentType: "invoice",
      correctedAt: new Date().toISOString(),
    });
  }

  const report = generateCalibrationReport(calData);
  console.log("\n" + formatCalibrationReport(report));

  // Adjust threshold based on calibration
  const currentThreshold = 0.85;
  const adjusted = adjustThreshold(currentThreshold, report);
  console.log(`\nThreshold adjustment: ${currentThreshold} → ${adjusted}`);
}

function demoProvenance(): void {
  separator("5.6 — Information Provenance: Claims, Conflicts & Temporal Decay");

  // Create source bindings from different origins
  const dbSource = createSourceBinding(
    "db-query-users-count",
    "database",
    "SELECT COUNT(*) FROM users → 15,432",
    null,
    0.95
  );

  const apiSource = createSourceBinding(
    "analytics-api-v2",
    "api_response",
    "Total active users: 15,430",
    null,
    0.85
  );

  const cachedSource = createSourceBinding(
    "cache-dashboard-stats",
    "cached_result",
    "User count as of yesterday: 15,100",
    "2024-03-14",
    0.60
  );

  // Synthesize a claim from agreeing sources
  const userCountClaim = synthesizeClaim(
    "The platform has approximately 15,430 active users",
    [dbSource, apiSource, cachedSource]
  );

  console.log("Claim with provenance:");
  console.log(formatClaimWithProvenance(userCountClaim));
  console.log("\nInline citation:");
  console.log(formatInlineCitation(userCountClaim));

  // Demonstrate conflicting sources
  const sourceA = createSourceBinding(
    "pricing-api",
    "api_response",
    "Current plan price: $99/month",
    null,
    0.90
  );

  const sourceB = createSourceBinding(
    "contract-doc",
    "document",
    "Agreed price: $79/month (special rate)",
    "2024-01-15",
    0.85
  );

  const conflictingClaim = synthesizeClaim(
    "Customer's monthly plan price",
    [sourceA, sourceB]
  );

  console.log("\n\nConflicting claim:");
  console.log(formatClaimWithProvenance(conflictingClaim));

  // Demonstrate merge
  const claim1 = synthesizeClaim("Revenue grew 15% in Q1", [
    createSourceBinding("finance-db", "database", "Q1 revenue: $1.15M vs Q4: $1.0M"),
  ]);

  const claim2 = synthesizeClaim("Q1 showed strong growth", [
    createSourceBinding("ceo-email", "document", "We saw 15% revenue growth this quarter"),
  ]);

  const merged = mergeClaims([claim1, claim2], "Q1 revenue grew 15% to $1.15M, confirmed by finance and executive sources");
  console.log("\n\nMerged claim:");
  console.log(formatClaimWithProvenance(merged));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log("Domain 5 Mini Reference Project — Context Manager Demo");
  console.log("Mental Model: Context is finite and degrades — extract facts, trim noise, verify provenance");

  demoContextPreservation();
  demoScratchpad();
  demoEscalation();
  demoErrorPropagation();
  demoHumanReview();
  demoProvenance();

  separator("Demo Complete");
  console.log("All Domain 5 patterns demonstrated without API calls.");
  console.log("For API-dependent features (fact extraction, progressive summarization,");
  console.log("subagent delegation), set ANTHROPIC_API_KEY and uncomment the relevant calls.");
}

main();
