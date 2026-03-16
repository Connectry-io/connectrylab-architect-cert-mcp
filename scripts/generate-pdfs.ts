#!/usr/bin/env tsx
/**
 * Generate branded PDFs from all concept handout markdown files.
 * Uses Puppeteer to render styled HTML → PDF with the Architect Cert branding.
 *
 * Usage: npx tsx scripts/generate-pdfs.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HANDOUTS_DIR = path.join(__dirname, '..', 'src', 'data', 'handouts');
const OUTPUT_DIR = path.join(__dirname, '..', 'generated', 'handouts');

/** SVG logo for PDF header — dark background version (white text, Claude orange icon) */
const LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 80" width="280" height="53">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#E8784A"/>
      <stop offset="100%" style="stop-color:#D4603A"/>
    </linearGradient>
  </defs>
  <circle cx="30" cy="40" r="16" fill="none" stroke="url(#gradient)" stroke-width="4"/>
  <rect x="46" y="37" width="28" height="6" rx="3" fill="url(#gradient)"/>
  <circle cx="90" cy="40" r="16" fill="none" stroke="url(#gradient)" stroke-width="4"/>
  <text x="120" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="40" font-weight="700" fill="#1a1a2e">Architect Cert</text>
</svg>`;

/** HTML template wrapping the converted markdown content */
function buildHtml(markdownContent: string, filename: string): string {
  const htmlBody = marked.parse(markdownContent, { async: false }) as string;

  // Extract domain info from filename (e.g., "1.2-some-title.md" → Domain 1)
  const idMatch = filename.match(/^(\d+)\.(\d+)/);
  const domainId = idMatch ? parseInt(idMatch[1], 10) : 0;
  const domainNames: Record<number, string> = {
    1: 'Agentic Architecture & Orchestration',
    2: 'Tool Design & MCP Integration',
    3: 'Claude Code Configuration & Workflows',
    4: 'Prompt Engineering & Structured Output',
    5: 'Context Management & Reliability',
  };
  const domainLabel = domainNames[domainId] ?? `Domain ${domainId}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 60px 50px 50px 50px;
      size: A4;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      font-size: 13px;
      line-height: 1.65;
      color: #1a1a2e;
      padding: 0;
    }

    /* ─── Header bar ─── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      margin-bottom: 28px;
      border-bottom: 3px solid #E8784A;
      background: linear-gradient(135deg, #fdf6f2 0%, #fff 100%);
      border-radius: 8px 8px 0 0;
    }

    .header-logo { height: 42px; }

    .header-domain {
      font-size: 11px;
      font-weight: 600;
      color: #D4603A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ─── Content ─── */
    .content { padding: 0 8px; }

    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #1a1a2e;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #eee;
    }

    h2 {
      font-size: 16px;
      font-weight: 700;
      color: #D4603A;
      margin-top: 28px;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 1px solid #f0e0d6;
    }

    h3 {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-top: 18px;
      margin-bottom: 8px;
    }

    p { margin-bottom: 12px; }

    ul, ol {
      margin-bottom: 12px;
      padding-left: 24px;
    }

    li { margin-bottom: 6px; }

    strong { color: #1a1a2e; }

    code {
      font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', Menlo, monospace;
      font-size: 12px;
      background: #f5f0ec;
      padding: 2px 6px;
      border-radius: 4px;
      color: #D4603A;
    }

    pre {
      background: #1a1a2e;
      color: #e8e8e8;
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow-x: auto;
      border-left: 4px solid #E8784A;
    }

    pre code {
      background: none;
      color: #e8e8e8;
      padding: 0;
      font-size: 11.5px;
      line-height: 1.5;
    }

    a {
      color: #D4603A;
      text-decoration: none;
      border-bottom: 1px dotted #D4603A;
    }

    blockquote {
      border-left: 4px solid #E8784A;
      padding: 8px 16px;
      margin: 12px 0;
      background: #fdf6f2;
      border-radius: 0 6px 6px 0;
      font-style: italic;
      color: #555;
    }

    /* ─── Footer ─── */
    .footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #eee;
      text-align: center;
      font-size: 10px;
      color: #999;
    }

    .footer span { color: #D4603A; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-logo">${LOGO_SVG}</div>
    <div class="header-domain">Domain ${domainId} — ${domainLabel}</div>
  </div>

  <div class="content">
    ${htmlBody}
  </div>

  <div class="footer">
    <span>Connectry LABS</span> — Claude Certified Architect Exam Prep — Free & Open Source
  </div>
</body>
</html>`;
}

async function generatePdfs(): Promise<void> {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Find all markdown handouts
  const files = fs.readdirSync(HANDOUTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.log('No handout files found in', HANDOUTS_DIR);
    return;
  }

  console.log(`Found ${files.length} handouts. Generating PDFs...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results: Array<{ file: string; status: 'ok' | 'error'; error?: string }> = [];

  for (const file of files) {
    try {
      const markdown = fs.readFileSync(path.join(HANDOUTS_DIR, file), 'utf-8');
      const html = buildHtml(markdown, file);
      const pdfName = file.replace(/\.md$/, '.pdf');

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: path.join(OUTPUT_DIR, pdfName),
        format: 'A4',
        printBackground: true,
        margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
      });
      await page.close();

      results.push({ file: pdfName, status: 'ok' });
      console.log(`  ✓ ${pdfName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ file, status: 'error', error: message });
      console.error(`  ✗ ${file}: ${message}`);
    }
  }

  await browser.close();

  const succeeded = results.filter(r => r.status === 'ok').length;
  const failed = results.filter(r => r.status === 'error').length;
  console.log(`\nDone: ${succeeded} PDFs generated, ${failed} failures.`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

generatePdfs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
