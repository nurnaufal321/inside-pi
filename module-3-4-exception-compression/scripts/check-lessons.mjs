#!/usr/bin/env node
// Content checks the type checker can't do. Loads the lesson registry through Vite's SSR loader.
import { createServer } from 'vite';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
const errors = [];
const warn = [];

try {
  const { CHAPTERS, LESSONS } = await server.ssrLoadModule('/src/lessons/index.ts');
  const chapterIds = new Set(CHAPTERS.map(c => c.id));
  const seen = new Set();
  const files = readdirSync(join(root, 'src/lessons')).filter(f => f.endsWith('.tsx')).map(f => f.replace(/\.tsx$/, ''));

  for (const l of LESSONS) {
    const e = msg => errors.push(`${l.id}: ${msg}`);
    if (seen.has(l.id)) e('duplicate lesson id');
    seen.add(l.id);
    if (!chapterIds.has(l.chapter)) e(`chapter "${l.chapter}" is not in CHAPTERS`);
    const n = l.steps.length;
    if (n < 3) e(`only ${n} steps`);
    if (l.camera) {
      for (let s = 0; s < n; s++) {
        const c = l.camera(s);
        if (!Array.isArray(c) || c.length !== 3 || c.some(v => typeof v !== 'number' || Number.isNaN(v))) { e(`camera(${s}) is not [x, y, zoom]`); break; }
      }
    }
    for (const it of l.learn) if (it.at < 0 || it.at >= n) e(`learn "${it.text}" points at step ${it.at}, but there are ${n} steps`);
    if (l.steps.at(-1)?.tag !== 'recap') e('last step should be tagged recap');
    if (l.docs.length < 2) e(`needs at least 2 docs links (has ${l.docs.length})`);
    for (const d of l.docs) if (!/^https:\/\/docs\.aveva\.com\/bundle\/[\w-]+\/page\//.test(d.url)) e(`docs URL is not a docs.aveva.com bundle page: ${d.url}`);
    const todo = JSON.stringify({ t: l.title, s: l.subtitle, steps: l.steps, learn: l.learn, legend: l.legend });
    if (todo.includes('TODO')) e('still contains TODO text');
    const tryFile = join(root, 'src/components/tryit', `${l.id}.tsx`);
    if (existsSync(tryFile)) {
      const src = readFileSync(tryFile, 'utf8');
      if (src.includes('TODO')) e(`src/components/tryit/${l.id}.tsx still contains TODO text`);
      if (!src.includes('<Checklist')) warn.push(`${l.id}: Try it has no Checklist`);
    }
  }
  for (const f of files) if (!seen.has(f) && !['types'].includes(f)) warn.push(`src/lessons/${f}.tsx is not registered in LESSONS`);
  for (const c of CHAPTERS) if (!LESSONS.some(l => l.chapter === c.id)) warn.push(`chapter ${c.id} has no lessons`);
  console.log(`Checked ${LESSONS.length} lessons in ${CHAPTERS.length} chapters.`);
} finally {
  await server.close();
}

for (const w of warn) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);
process.exit(errors.length ? 1 : 0);
