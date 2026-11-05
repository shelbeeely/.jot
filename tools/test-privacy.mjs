// The privacy gate catches what it should, including inside compressed archives, and passes the real site.
//   node --test tools/test-privacy.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, decryptedFindings } from './privacy-check.mjs';
import { pack, readDocument } from '../parser/container.mjs';

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
  assert.ok((await check(site({ 'notes.md': 'My plans:\r\nBEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n' }))).some((f) => f.includes('calendar data')), 'a calendar pasted into the middle of a file is caught');
  assert.deepEqual(await check(site({ 'jot/gen.mjs': "const L = ['BEGIN:VCALENDAR', 'VERSION:2.0'];" })), [], 'code that writes a calendar is not one');
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


test('ZIP comments, directory names and binary members are inspected as well as text', async () => {
  const zip = new globalThis.JSZip();
  zip.comment = 'someone@example.org';
  zip.folder('private');
  zip.file('picture.png', Buffer.from('metadata: someone@example.net'), {comment:'other@example.com'});
  const data = await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
  const found = await check(site({'docs/sample.zip':data}));
  assert.ok(found.some(f=>f.includes('(archive comment): an email address')));
  assert.ok(found.some(f=>f.includes('private/: a private path')));
  assert.ok(found.some(f=>f.includes('(comment): an email address')));
  assert.ok(found.some(f=>f.includes('picture.png: an email address')));
});

test('a pinned upstream license preserves its public contact without allowing emails elsewhere', async () => {
  const name='vendor/browser/dijkstrajs-LICENSE.md.txt',license=fs.readFileSync(path.join(ROOT,'site/dist',name));
  assert.deepEqual(await check(site({[name]:license})),[]);
  assert.ok((await check(site({'journal.jot':'self@wyattbaldwin.com'}))).some(issue=>issue.includes('email')));
  assert.ok((await check(site({[name]:Buffer.concat([license,Buffer.from('\nChanged.\n')])}))).some(issue=>issue.includes('email')));
});

test('only the exact published fictional CSV is allowed and its contents remain scanned', async (t) => {
  const name = 'examples/demo-numbers.csv', data = fs.readFileSync(path.join(ROOT, 'site/dist', name));
  const clean = site({ [name]: data }); t.after(() => fs.rmSync(clean, { recursive: true, force: true }));
  assert.deepEqual(await check(clean), []);
  const renamed = site({ 'examples/other.csv': data }); t.after(() => fs.rmSync(renamed, { recursive: true, force: true }));
  assert.ok((await check(renamed)).some((issue) => issue.includes('not a kind of file')));
  const changed = site({ [name]: Buffer.concat([data, Buffer.from('\nsomeone@example.org\n')]) }); t.after(() => fs.rmSync(changed, { recursive: true, force: true }));
  const findings = await check(changed);
  assert.ok(findings.some((issue) => issue.includes('SHA-256 pin')));
  assert.ok(findings.some((issue) => issue.includes('an email address')));
  assert.ok(findings.some((issue) => issue.includes('not a kind of file')));
});

test('the exact mixed demo is decrypted and compared; copies, missing companions and tampering keep the private-path gate', async (t) => {
  const mixedName = 'examples/demo-month-mixed.jotz', publicName = 'examples/demo-month.jotz';
  const mixed = fs.readFileSync(path.join(ROOT, 'site/dist', mixedName)), publicBytes = fs.readFileSync(path.join(ROOT, 'site/dist', publicName));
  const make = (files) => { const dir = site(files); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
  assert.deepEqual(await check(make({ [mixedName]: mixed, [publicName]: publicBytes })), []);
  const renamed = await check(make({ 'examples/copied.jotz': mixed, [publicName]: publicBytes }));
  assert.ok(renamed.some((issue) => issue.includes('a private path')));
  const missing = await check(make({ [mixedName]: mixed }));
  assert.ok(missing.some((issue) => issue.includes('could not audit the decrypted demo')));
  assert.ok(missing.some((issue) => issue.includes('a private path')));
  const zip = await globalThis.JSZip.loadAsync(mixed); zip.comment = 'Modified fixture';
  const altered = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const tampered = await check(make({ [mixedName]: altered, [publicName]: publicBytes }));
  assert.ok(tampered.some((issue) => issue.includes('SHA-256 pin')));
  assert.ok(tampered.some((issue) => issue.includes('a private path')));
  const doc = await readDocument(publicBytes);
  let changedCompanion;
  try { changedCompanion = await pack({ source: doc.source, entries: doc.entries, assets: doc.assets, metadata: { ...doc.metadata, contact: 'someone@example.org' }, index: 'never' }); }
  finally { doc.index?.close(); }
  const mismatch = await check(make({ [mixedName]: mixed, [publicName]: changedCompanion }));
  assert.ok(mismatch.some((issue) => issue.includes('does not match its all-public companion')));
  assert.ok(mismatch.some((issue) => issue.includes('an email address')));
  assert.ok(mismatch.some((issue) => issue.includes('a private path')));
});

test('decrypted demo writing, entry/catalog metadata and every attachment byte still use the leak rules', () => {
  const found = decryptedFindings({ source: 'Dinner in Spokane.', metadata: { contact: 'someone@example.org' },
    entries: [{ source: 'A note.', private: true, extra: 'Keeping Watch' }],
    assets: [{ path: 'media/picture.png', name: 'other@example.net', mediaType: 'image/png', data: Buffer.from('metadata: hidden@example.com') }] }, 'demo');
  assert.ok(found.some((issue) => issue.includes('(decrypted writing): a personal place')));
  assert.ok(found.some((issue) => issue.includes('(decrypted document metadata): an email address')));
  assert.ok(found.some((issue) => issue.includes('(decrypted entry metadata): the personal book title')));
  assert.ok(found.some((issue) => issue.includes('(asset metadata): an email address')));
  assert.ok(found.some((issue) => issue.includes('decrypted media/picture.png): an email address')));
});
