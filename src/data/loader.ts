import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Curriculum, Question, QuestionBank } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In bundled mode, __dirname is dist/. Data files are at dist/data/.
// In dev mode, __dirname is src/data/. Data files are in the same directory.
const DATA_DIR = fs.existsSync(path.join(__dirname, 'data', 'curriculum.json'))
  ? path.join(__dirname, 'data')
  : __dirname;

let cachedCurriculum: Curriculum | null = null;
let cachedQuestions: ReadonlyMap<number, readonly Question[]> | null = null;

export function loadCurriculum(): Curriculum {
  if (cachedCurriculum) return cachedCurriculum;
  const raw = fs.readFileSync(path.join(DATA_DIR, 'curriculum.json'), 'utf-8');
  cachedCurriculum = JSON.parse(raw) as Curriculum;
  return cachedCurriculum;
}

export function loadQuestions(domainId?: number): readonly Question[] {
  if (!cachedQuestions) {
    const questionsMap = new Map<number, readonly Question[]>();
    for (let d = 1; d <= 5; d++) {
      const filePath = path.join(DATA_DIR, 'questions', `domain-${d}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const bank = JSON.parse(raw) as QuestionBank;
        questionsMap.set(d, bank.questions);
      } else {
        questionsMap.set(d, []);
      }
    }
    cachedQuestions = questionsMap;
  }
  if (domainId !== undefined) return cachedQuestions.get(domainId) ?? [];
  return Array.from(cachedQuestions.values()).flat();
}

export function loadHandout(taskStatement: string): string | null {
  const filename = getHandoutFilename(taskStatement);
  const filePath = path.join(DATA_DIR, 'handouts', filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function getHandoutFilename(taskStatement: string): string {
  const curriculum = loadCurriculum();
  for (const domain of curriculum.domains) {
    for (const ts of domain.taskStatements) {
      if (ts.id === taskStatement) {
        const slug = ts.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
        return `${ts.id}-${slug}.md`;
      }
    }
  }
  return `${taskStatement}.md`;
}
