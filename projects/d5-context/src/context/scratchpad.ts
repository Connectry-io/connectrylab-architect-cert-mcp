/**
 * External Scratchpad System — Domain 5.4
 *
 * Task Statements Covered:
 *   5.4: Large codebase context management — scratchpad files that survive
 *        /compact, re-anchoring after compaction
 *
 * Key Insights:
 *   - The context window is ephemeral — /compact wipes it. But files on
 *     disk persist. Write important findings to a scratchpad file BEFORE
 *     they're needed, not after.
 *   - After /compact, the first thing an agent should do is read the
 *     scratchpad to recover its working state.
 *   - Scratchpad entries are keyed so they can be updated without
 *     duplicating information.
 *
 * Mental Model: "Disk is your long-term memory; context window is RAM"
 */

import type { ScratchpadEntry, ScratchpadFile } from "../types.js";

// ---------------------------------------------------------------------------
// Scratchpad Operations (all pure / return new objects)
// ---------------------------------------------------------------------------

/**
 * Creates a new empty scratchpad file. Call this at the start of a
 * long-running investigation to establish the persistence layer.
 */
export function createScratchpad(path: string): ScratchpadFile {
  return {
    path,
    entries: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Writes or updates a keyed entry in the scratchpad. If an entry with
 * the same key and section already exists, it is replaced (not duplicated).
 *
 * Returns a new ScratchpadFile — the original is never mutated.
 */
export function writeScratchpadEntry(
  scratchpad: ScratchpadFile,
  section: string,
  key: string,
  value: string
): ScratchpadFile {
  const now = new Date().toISOString();
  const newEntry: ScratchpadEntry = {
    id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    value,
    section,
    writtenAt: now,
  };

  // Replace existing entry with same key+section, or append
  const existingIndex = scratchpad.entries.findIndex(
    (e) => e.key === key && e.section === section
  );

  const updatedEntries =
    existingIndex >= 0
      ? [
          ...scratchpad.entries.slice(0, existingIndex),
          newEntry,
          ...scratchpad.entries.slice(existingIndex + 1),
        ]
      : [...scratchpad.entries, newEntry];

  return {
    ...scratchpad,
    entries: updatedEntries,
    lastUpdated: now,
  };
}

/**
 * Reads all entries from a section. Use this after /compact to recover
 * the findings for a particular area of investigation.
 */
export function readSection(
  scratchpad: ScratchpadFile,
  section: string
): readonly ScratchpadEntry[] {
  return scratchpad.entries.filter((e) => e.section === section);
}

/**
 * Reads a single entry by key and section.
 */
export function readEntry(
  scratchpad: ScratchpadFile,
  section: string,
  key: string
): ScratchpadEntry | null {
  return (
    scratchpad.entries.find(
      (e) => e.key === key && e.section === section
    ) ?? null
  );
}

/**
 * Removes an entry by key and section. Returns a new ScratchpadFile.
 */
export function removeEntry(
  scratchpad: ScratchpadFile,
  section: string,
  key: string
): ScratchpadFile {
  return {
    ...scratchpad,
    entries: scratchpad.entries.filter(
      (e) => !(e.key === key && e.section === section)
    ),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Lists all sections in the scratchpad. Useful for orientation after
 * /compact — quickly see what areas of work have been tracked.
 */
export function listSections(scratchpad: ScratchpadFile): readonly string[] {
  const sections = new Set(scratchpad.entries.map((e) => e.section));
  return [...sections].sort();
}

// ---------------------------------------------------------------------------
// Serialization (for writing to / reading from disk)
// ---------------------------------------------------------------------------

/**
 * Serializes the scratchpad to a human-readable markdown format.
 * This format is chosen because:
 *   1. It's easy for Claude to parse after /compact
 *   2. It's human-readable for debugging
 *   3. It uses clear section delimiters
 */
export function serializeToMarkdown(scratchpad: ScratchpadFile): string {
  const sections = listSections(scratchpad);
  const lines: string[] = [
    `# Scratchpad: ${scratchpad.path}`,
    `> Last updated: ${scratchpad.lastUpdated}`,
    "",
  ];

  for (const section of sections) {
    lines.push(`## ${section}`);
    lines.push("");

    const entries = readSection(scratchpad, section);
    for (const entry of entries) {
      lines.push(`### ${entry.key}`);
      lines.push(`- Written: ${entry.writtenAt}`);
      lines.push(entry.value);
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Parses a markdown-serialized scratchpad back into a ScratchpadFile.
 * This is the re-anchoring step after /compact.
 */
export function parseFromMarkdown(
  path: string,
  markdown: string
): ScratchpadFile {
  const entries: ScratchpadEntry[] = [];
  let currentSection = "";
  let currentKey = "";
  let currentTimestamp = "";
  let valueLines: string[] = [];
  let entryIndex = 0;

  const flushEntry = () => {
    if (currentKey && currentSection) {
      entries.push({
        id: `sp-parsed-${entryIndex++}`,
        key: currentKey,
        value: valueLines.join("\n").trim(),
        section: currentSection,
        writtenAt: currentTimestamp || new Date().toISOString(),
      });
    }
    currentKey = "";
    currentTimestamp = "";
    valueLines = [];
  };

  const lines = markdown.split("\n");
  for (const line of lines) {
    if (line.startsWith("## ") && !line.startsWith("### ")) {
      flushEntry();
      currentSection = line.slice(3).trim();
    } else if (line.startsWith("### ")) {
      flushEntry();
      currentKey = line.slice(4).trim();
    } else if (line.startsWith("- Written: ")) {
      currentTimestamp = line.slice(11).trim();
    } else if (currentKey) {
      // Skip the scratchpad header and metadata lines
      if (!line.startsWith("# Scratchpad:") && !line.startsWith("> Last updated:")) {
        valueLines.push(line);
      }
    }
  }

  // Flush the last entry
  flushEntry();

  const lastEntry = entries[entries.length - 1];
  return {
    path,
    entries,
    lastUpdated: lastEntry?.writtenAt ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Re-Anchoring Protocol
// ---------------------------------------------------------------------------

/**
 * Generates the re-anchoring prompt to use after /compact. This prompt
 * tells the agent to read the scratchpad and restore its working context.
 *
 * Usage: Insert this as the first user message after compaction.
 */
export function generateReAnchorPrompt(scratchpadPath: string): string {
  return `CONTEXT RECOVERY: The conversation was compacted. Your working state is saved in the scratchpad file at: ${scratchpadPath}

Please read the scratchpad file to recover your working context:
1. Read the file to see all sections and entries
2. Identify the current investigation phase from the scratchpad
3. Resume work from where you left off
4. Continue writing findings to the scratchpad as you discover them

Do NOT start over — the scratchpad contains everything you've learned so far.`;
}
