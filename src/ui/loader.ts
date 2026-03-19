import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let quizWidgetHtml: string | null = null;

export function getQuizWidgetHtml(): string {
  if (!quizWidgetHtml) {
    quizWidgetHtml = readFileSync(resolve(__dirname, '../ui/quiz-widget.html'), 'utf-8');
  }
  return quizWidgetHtml;
}
