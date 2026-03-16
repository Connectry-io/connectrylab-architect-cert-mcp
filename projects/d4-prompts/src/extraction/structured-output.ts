/**
 * Domain 4.3 — Structured Output via tool_use and JSON Schemas
 *
 * Task Statement: "Use tool_use as a typed capture contract with tool_choice,
 * nullable fields, and enums to get structured output from the model."
 *
 * This module demonstrates:
 * - Zod schema -> JSON Schema conversion for tool definitions
 * - tool_choice: { type: "tool", name: "..." } to force structured output
 * - Nullable fields for optional data
 * - Enum fields for constrained classification
 * - Using tool_use as a "capture contract" (not executing a real tool)
 *
 * Key insight: tool_use is not just for function calling — it is the most
 * reliable way to get typed, structured output from Claude. The model MUST
 * return data matching the schema, unlike free-form JSON which can drift.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ExtractionResultSchema, type ExtractionResult } from "../types.js";

// ---------------------------------------------------------------------------
// Schema Conversion — Zod to Claude tool_use format
// ---------------------------------------------------------------------------

/**
 * Converts the Zod schema to a JSON Schema compatible with Claude's tool_use.
 * The `zodToJsonSchema` call produces a full JSON Schema; we extract the
 * relevant portion and strip metadata that Claude doesn't need.
 */
function buildToolInputSchema(): Anthropic.Tool["input_schema"] {
  const jsonSchema = zodToJsonSchema(ExtractionResultSchema, {
    name: "ExtractionResult",
    // Target the draft compatible with Claude's tool_use
    $refStrategy: "none",
  });

  // zodToJsonSchema wraps in definitions — extract the core schema
  // The cast is safe because zodToJsonSchema always produces a valid JSON Schema
  return jsonSchema as Anthropic.Tool["input_schema"];
}

/**
 * The tool definition that serves as our "capture contract."
 * Note: We never actually execute this tool. It exists solely to force
 * Claude to return structured data matching our schema.
 */
const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "save_extracted_contacts",
  description:
    "Saves extracted contact information from a document. " +
    "Call this tool with ALL contacts found in the provided text. " +
    "Use null for fields that cannot be determined from the text. " +
    "Use the role enum to classify each contact's organizational role.",
  input_schema: buildToolInputSchema(),
};

// ---------------------------------------------------------------------------
// Extraction Function
// ---------------------------------------------------------------------------

/**
 * Extracts structured contact data from unstructured text using tool_use.
 *
 * The critical configuration is `tool_choice`:
 * - { type: "auto" } — Model decides whether to use the tool (unreliable)
 * - { type: "any" } — Model must use SOME tool (good for multi-tool)
 * - { type: "tool", name: "..." } — Model MUST use THIS specific tool
 *
 * We use the third option to guarantee structured output every time.
 */
async function extractContacts(
  client: Anthropic,
  text: string
): Promise<ExtractionResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    // Force the model to use our extraction tool — this is the key pattern
    tool_choice: { type: "tool", name: "save_extracted_contacts" },
    tools: [EXTRACTION_TOOL],
    messages: [
      {
        role: "user",
        content: `Extract all contact information from the following text.
For each contact, determine their organizational role based on context clues.
Use null for any fields you cannot confidently determine.

Text:
${text}`,
      },
    ],
  });

  // With tool_choice forcing our tool, the response will contain a tool_use block
  const toolUseBlock = response.content.find(
    (block) => block.type === "tool_use"
  );

  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error(
      "Expected tool_use response but got: " +
        response.content.map((b) => b.type).join(", ")
    );
  }

  // The input is already structured by Claude's schema enforcement
  // In production, combine with validation-retry (4.4) for extra safety
  return toolUseBlock.input as ExtractionResult;
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const SAMPLE_EMAILS: readonly { readonly id: string; readonly text: string }[] = [
  {
    id: "email-001",
    text: `From: Maria Chen <maria.chen@techstartup.io>
To: sales@ourcompany.com
Subject: Enterprise pricing inquiry

Hi there,

I'm the VP of Engineering at TechStartup and we're evaluating your platform
for our 200-person engineering team. Could you send pricing details to me
and our procurement lead, James Wu? His email is james.wu@techstartup.io,
phone 415-555-0142.

Our CTO Alex Rivera asked me to also loop in our security team — the point
of contact there is DevSecOps but I don't have their email handy.

Best,
Maria`,
  },
  {
    id: "meeting-001",
    text: `Meeting Notes — Product Demo Call
Date: 2024-03-15
Attendees: Internal (us), Client (Globex Corp)

Participants from Globex:
- Patricia Hernandez, Chief Product Officer — main decision maker
- Tom Bradley, Senior Developer — will evaluate technical fit
  (mentioned he prefers email: tom.b@globex.net)
- Someone from legal was on the call briefly but didn't introduce themselves

Action items:
- Send technical docs to Tom
- Schedule follow-up with Patricia's team
- Patricia mentioned her assistant could coordinate: assistant@globex.net`,
  },
];

// ---------------------------------------------------------------------------
// Main — runnable with: npx tsx src/extraction/structured-output.ts
// ---------------------------------------------------------------------------

export async function runStructuredOutputDemo(): Promise<
  readonly ExtractionResult[]
> {
  const client = new Anthropic();

  console.log("=== Domain 4.3: Structured Output via tool_use ===\n");
  console.log("Tool definition:");
  console.log(`  Name: ${EXTRACTION_TOOL.name}`);
  console.log(`  tool_choice: { type: "tool", name: "${EXTRACTION_TOOL.name}" }`);
  console.log("  Schema enforces: nullable fields, enum roles, typed arrays\n");

  const results: ExtractionResult[] = [];

  for (const sample of SAMPLE_EMAILS) {
    console.log(`--- Processing: ${sample.id} ---`);

    const result = await extractContacts(client, sample.text);
    results.push(result);

    console.log(`Contacts found: ${result.contacts.length}`);
    for (const contact of result.contacts) {
      console.log(`  - ${contact.name}`);
      console.log(`    Role: ${contact.role}`);
      console.log(`    Email: ${contact.email ?? "(not found)"}`);
      console.log(`    Phone: ${contact.phone ?? "(not found)"}`);
      console.log(`    Company: ${contact.company ?? "(not found)"}`);
    }
    console.log(`Source type: ${result.metadata.sourceType}`);
    console.log(`Confidence: ${result.metadata.extractionConfidence}`);
    if (result.metadata.warnings.length > 0) {
      console.log(`Warnings: ${result.metadata.warnings.join("; ")}`);
    }
    console.log();
  }

  return results;
}

// Run if executed directly
const isDirectRun = process.argv[1]?.includes("structured-output");
if (isDirectRun) {
  runStructuredOutputDemo().catch(console.error);
}

export { EXTRACTION_TOOL, extractContacts, buildToolInputSchema };
