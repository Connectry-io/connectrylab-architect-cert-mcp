import { defineConfig } from 'tsup';
import { cpSync, statSync } from 'node:fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  onSuccess: async () => {
    cpSync('src/data/curriculum.json', 'dist/data/curriculum.json');
    cpSync('src/data/questions', 'dist/data/questions', { recursive: true });
    cpSync('src/data/handouts', 'dist/data/handouts', { recursive: true });
    cpSync('src/ui', 'dist/ui', {
      recursive: true,
      filter: (src) => src.endsWith('.html') || statSync(src).isDirectory(),
    });
  },
});
