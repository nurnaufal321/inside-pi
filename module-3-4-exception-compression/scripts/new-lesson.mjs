#!/usr/bin/env node
// Scaffold a lesson + Try it from templates/ and register it in src/lessons/index.ts.
// Usage: npm run new-lesson -- <chapter-id> <lesson-id> "<Title>" ["<Chapter title>"]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [chapter, id, title, chapterTitle] = process.argv.slice(2);
const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;

if (!chapter || !id || !title || !kebab.test(chapter) || !kebab.test(id)) {
  console.error('Usage: npm run new-lesson -- <chapter-id> <lesson-id> "<Title>" ["<Chapter title>"]\nIds are kebab-case.');
  process.exit(1);
}

const lessonPath = join(root, 'src/lessons', `${id}.tsx`);
const tryPath = join(root, 'src/components/tryit', `${id}.tsx`);
const indexPath = join(root, 'src/lessons/index.ts');
for (const p of [lessonPath, tryPath]) {
  if (existsSync(p)) { console.error(`Already exists: ${p}`); process.exit(1); }
}

const camel = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = camel[0].toUpperCase() + camel.slice(1);
const fill = s => s.replaceAll('__ID__', id).replaceAll('__CHAPTER__', chapter).replaceAll('__TITLE__', title.replaceAll("'", "\\'")).replaceAll('__COMPONENT__', pascal);

writeFileSync(lessonPath, fill(readFileSync(join(root, 'templates/lesson.tsx.tmpl'), 'utf8')));
writeFileSync(tryPath, fill(readFileSync(join(root, 'templates/tryit.tsx.tmpl'), 'utf8')));

let idx = readFileSync(indexPath, 'utf8');

// import line after the last lesson import
const imports = [...idx.matchAll(/^import \w+ from '\.\/[\w-]+';$/gm)];
const last = imports.at(-1);
const at = last.index + last[0].length;
idx = `${idx.slice(0, at)}\nimport ${camel} from './${id}';${idx.slice(at)}`;

// append to LESSONS
idx = idx.replace(/(export const LESSONS: Lesson\[\] = \[[\s\S]*?)(\n\];)/, `$1\n  ${camel},$2`);

// add the chapter if it is new
if (!new RegExp(`id: '${chapter}'`).test(idx)) {
  const PALETTE = ['#8a6fd1', '#e08a3c', '#2aa39a', '#c4683f', '#5b7fd6', '#b3922c', '#cf5fa8', '#5a9e3a'];
  const used = [...idx.matchAll(/color: '(#[0-9a-f]{6})'/gi)].map(m => m[1].toLowerCase());
  const color = PALETTE.find(c => !used.includes(c)) ?? PALETTE[0];
  const name = chapterTitle ?? chapter.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  idx = idx.replace(/(export const CHAPTERS: Chapter\[\] = \[[\s\S]*?)(\n\];)/, `$1\n  { id: '${chapter}', title: '${name.replaceAll("'", "\\'")}', color: '${color}' },$2`);
  console.log(`Added chapter ${chapter} (${name}, ${color})`);
}
writeFileSync(indexPath, idx);

console.log(`Created src/lessons/${id}.tsx and src/components/tryit/${id}.tsx, registered in index.ts.`);
console.log('Next: fill the TODOs, then npm run check && npm run build.');
