// The file cases in specification/conformance.json: plain .jot and packaged .jotz are told apart by content, never by extension alone.
//   node --test tools/test-files.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDocument } from '../parser/container.mjs';
import { parse } from '../parser/jot.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'specification/conformance.json'), 'utf8')).cases.filter((c) => c.file || c.fileFrom);

test('every file case in the conformance fixtures', async () => {
  assert.equal(cases.length, 4);
  for (const c of cases) {
    const bytes = new Uint8Array(fs.readFileSync(path.join(ROOT, c.file || c.fileFrom))), name = c.saveAs || path.basename(c.file);
    const doc = await readDocument(bytes), zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
    assert.equal(doc.packaged, zip, `${c.id}: ${name} read by content`);
    assert.equal(parse(doc.source).diagnostics.filter((d) => d.severity === 'error').length, 0, c.id);
    if (zip) assert.ok(doc.assets.length >= 1 && doc.manifest, `${c.id}: the package's assets and manifest`);
    else assert.equal(doc.assets.length, 0, c.id);
  }
});

test('the repository follows the rule it states: every .jot is plain, every .jotz a package', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (['.git', 'node_modules', 'out'].includes(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const files = walk(ROOT).filter((f) => /\.jotz?$/.test(f));
  assert.ok(files.length >= 8, `${files.length} files`);
  for (const f of files) {
    const b = fs.readFileSync(f), zip = b[0] === 0x50 && b[1] === 0x4b;
    assert.equal(zip, f.endsWith('.jotz'), path.relative(ROOT, f));
  }
});
