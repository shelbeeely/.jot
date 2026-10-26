// The privacy gate catches what it should, including inside compressed archives, and passes the real site.
//   node --test tools/test-privacy.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from './privacy-check.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-privacy-'));
  for (const [name, data] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true }); fs.writeFileSync(path.join(dir, name), data); }
  return dir;
};

test('the published site passes', async () => {
  assert.deepEqual(await check(path.join(ROOT, 'site/dist')), []);
});

test('a clean site passes; each kind of leak is caught', async () => {
  assert.deepEqual(await check(site({ 'index.html': '<p>Northlight, Lakemont MN</p>', 'a/b.jot': '### 2026-10-25\n\nRain.\n' })), []);
  const cases = {
    'a personal name': { 'index.html': '<p>by Shelbee</p>' },
    'a personal place': { 'x.jot': 'A walk in Spokane.' },
    'the personal book title': { 'x.md': 'Keeping  Watch, volume 2' },
    'calendar data': { 'x.txt': 'BEGIN:VCALENDAR\nEND:VCALENDAR' },
    'a GitHub token': { 'app.js': `const t = 'ghp_${'a'.repeat(36)}';` },
    'a private key': { 'k.txt': '-----BEGIN OPENSSH PRIVATE KEY-----' },
    'an email address': { 'about.html': 'write to someone@example.org' },
    'not a kind of file the site publishes': { 'cal/october.ics': 'x' },
    'a private path': { 'private/notes.txt': 'x' },
  };
  for (const [what, files] of Object.entries(cases)) {
    const found = await check(site(files));
    assert.ok(found.some((f) => f.includes(what)), `${what}: ${JSON.stringify(found)}`);
  }
});

test('inside a compressed .zip or .jotz, where the raw bytes hide it', async () => {
  await import('../parser/vendor/jszip.mjs');
  const zip = new globalThis.JSZip();
  zip.file('journal.txt', 'Dinner in Spokane, then home.\n'.repeat(50));
  zip.file('private/cal.txt', 'x');
  const data = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  assert.ok(!data.toString('latin1').includes('Spokane'), 'the test archive really is compressed');
  const found = await check(site({ 'examples/x.jotz': data }));
  assert.ok(found.some((f) => f.includes('x.jotz › journal.txt: a personal place')), JSON.stringify(found));
  assert.ok(found.some((f) => f.includes('x.jotz › private/cal.txt: a private path')), JSON.stringify(found));
});
