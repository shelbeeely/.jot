// The user guides (docs/guide/*.md, built into dist/guide/): current, their Jot examples valid, their links real, and what they say
// about the template editor matching the editor.   node --test test-guides.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse } from './dist/jot/jot.mjs';
import { BLOCKS, ZONES, STARTERS } from './dist/editor/template.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), SRC = path.join(HERE, '../docs/guide'), DIST = path.join(HERE, 'dist');
const guides = fs.readdirSync(SRC).filter((f) => f.endsWith('.md')).map((f) => [f, fs.readFileSync(path.join(SRC, f), 'utf8')]);
const md = (name) => guides.find(([f]) => f === name)[1];

test('the guide pages are built from the current guides', () => {
  execFileSync('node', [path.join(HERE, 'build-guides.mjs'), '--check'], { stdio: 'pipe' });
});

test('every Jot example in the guides is valid Jot', () => {
  let n = 0;
  for (const [f, text] of guides) for (const m of text.matchAll(/```jot\n([\s\S]*?)```/g)) {
    const a = parse(m[1]); n++;
    assert.equal(a.diagnostics.length, 0, `${f}: ${JSON.stringify(a.diagnostics)}\n${m[1]}`);
  }
  assert.ok(n >= 10, `${n} examples`);
  const marks = parse(md('writing-jot.md').match(/```jot\n([^`]*?\[x\] Water[^`]*?)```/)[1]).nodes.map((x) => x.type);
  for (const t of ['task', 'event', 'question', 'idea']) assert.ok(marks.includes(t), `the quick marks example shows a ${t}`);
});

test('every link on the guide pages goes somewhere real', () => {
  for (const f of fs.readdirSync(path.join(DIST, 'guide')).filter((x) => x.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(DIST, 'guide', f), 'utf8');
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (/^https?:/.test(href)) continue;
      const [p, hash] = href.split('#'), target = p ? path.resolve(DIST, 'guide', p.endsWith('/') ? p + 'index.html' : p) : path.join(DIST, 'guide', f);
      assert.ok(fs.existsSync(target), `${f}: ${href}`);
      if (hash && target.endsWith('.html')) assert.ok(fs.readFileSync(target, 'utf8').includes(`id="${hash}"`), `${f}: ${href} (no such heading)`);
    }
  }
});

test('the template editor guide names what the editor has', () => {
  const g = md('template-editor.md');
  for (const z of ZONES) assert.ok(g.includes(`**${z.name}**`), `zone ${z.name}`);
  for (const s of STARTERS) assert.ok(g.includes(`**${s.name}:**`), `starter ${s.name}`);
  for (const b of Object.values(BLOCKS)) assert.ok(g.includes(`| **${b.name}** |`), `block ${b.name}`);
  const editor = fs.readFileSync(path.join(DIST, 'editor/index.html'), 'utf8');
  for (const label of ['Download .jot', 'Start from…', 'Save template (.json)', 'Open a .jot or a template…', 'A file a week (fits InkDeck)', 'One file for the month', 'Undo', 'Redo']) {
    assert.ok(editor.includes(label.replace('…', '…')), `the editor has "${label}"`);
    assert.ok(g.includes(label.replace(/ \(\.json\)$/, '').replace(/…$/, '')), `the guide mentions "${label}"`);
  }
});

test('the guides hold nothing personal', () => {
  for (const [f, text] of guides) assert.ok(!/shelbee|spokane|keeping watch/i.test(text), f);
});

test('the unfinished scanner is hidden: no page links to it, and its own page asks not to be indexed', () => {
  const pages = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'scan' || e.name === 'diaries' ? [] : pages(path.join(dir, e.name))) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []));
  for (const f of pages(DIST)) assert.ok(!/<a\b[^>]*href="(?:\.\.\/|\.\/)?scan\//.test(fs.readFileSync(f, 'utf8')), `${path.relative(DIST, f)} links to the scanner`);
  const scan = fs.readFileSync(path.join(DIST, 'scan/index.html'), 'utf8');
  assert.match(scan, /<meta name="robots" content="noindex,nofollow">/); assert.match(scan, /unfinished/);
  for (const g of fs.readdirSync(SRC)) assert.ok(!/scan\/|[Ss]canner/.test(fs.readFileSync(path.join(SRC, g), 'utf8')), `${g} sends people to the scanner`);
});
