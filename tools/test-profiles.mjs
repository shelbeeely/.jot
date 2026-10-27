// The method catalogue (specification/profiles.json) and the copy the workspace's Methods dialog reads (site/dist/jot/profiles.json):
// the two match, every profile is well formed, and every profile's example parses as a clean, complete record.
//   node --test tools/test-profiles.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '../parser/jot.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const canonical = JSON.parse(read('specification/profiles.json'));
const site = JSON.parse(read('site/dist/jot/profiles.json'));
const spec = read('specification/Jot-Complete-Specification.md');
const profiles = canonical.profiles;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// §5.1 record types; applications may add x-organization- types.
const TYPES = new Set(['task', 'event', 'reflection', 'prompt', 'response', 'measurement', 'scale', 'habit', 'observation', 'session', 'period', 'collection', 'quotation', 'attachment', 'layout', 'review', 'consent', 'medication', 'correction', 'relation', 'chart', 'sync']);
// §5.1: available to every profile, so an example may use them without the profile listing them.
const COMMON = new Set(['body', 'source', 'relation', 'label', 'author', 'privacy', 'created', 'modified']);

/** The record a writer gets from the Methods dialog's "with record" insert. */
const recordOf = (p) => `:::record ${p.recordType}\nmethod: ${p.id}@${p.version}\n${p.example}\n:::\n`;

test('the site copy is the canonical catalogue, byte for byte', () => {
  assert.equal(read('site/dist/jot/profiles.json'), read('specification/profiles.json'));
  assert.deepEqual(site, canonical);
  assert.equal(canonical.format, 'jot-profiles');
  assert.equal(canonical.version, 1);
  assert.ok(Array.isArray(profiles) && profiles.length > 0);
});

test('profile ids are unique kebab-case and every profile has its fields', () => {
  const seen = new Set();
  for (const p of profiles) {
    assert.match(p.id, KEBAB, p.id);
    assert.ok(!seen.has(p.id), `duplicate profile id ${p.id}`); seen.add(p.id);
    assert.ok(Number.isInteger(p.version) && p.version > 0, `${p.id}: version`);
    assert.ok(TYPES.has(p.recordType) || /^x-[a-z0-9]+(-[a-z0-9]+)+$/.test(p.recordType), `${p.id}: record type ${p.recordType}`);
    for (const k of ['label', 'purpose', 'prompt', 'example', 'notes']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id}: ${k}`);
    assert.ok(Array.isArray(p.required) && Array.isArray(p.optional), `${p.id}: field lists`);
    const fields = [...p.required, ...p.optional];
    for (const f of fields) assert.match(f, KEBAB, `${p.id}: field ${f}`);
    assert.equal(new Set(fields).size, fields.length, `${p.id}: a field is listed twice`);
    assert.ok(!fields.includes('method'), `${p.id}: method is the selector, not a field`);
  }
});

test('every example parses with no diagnostics and is a complete record of its profile', () => {
  for (const p of profiles) {
    const ast = parse(recordOf(p));
    assert.deepEqual(ast.diagnostics, [], `${p.id}: diagnostics`);
    const records = ast.nodes.filter((n) => n.type === 'record');
    assert.equal(records.length, 1, `${p.id}: one record`);
    const [r] = records;
    assert.equal(r.recordType, p.recordType);
    assert.deepEqual(r.unparsed, [], `${p.id}: every example line is a field`);
    const names = r.fields.map((f) => f.name);
    for (const f of p.required) assert.ok(names.includes(f), `${p.id}: example lacks required ${f}`);
    const allowed = new Set(['method', ...p.required, ...p.optional, ...COMMON]);
    for (const f of names) assert.ok(allowed.has(f), `${p.id}: example field ${f} is not in the profile`);
  }
});

test('the specification catalogues every profile at its version', () => {
  for (const p of profiles) assert.ok(spec.includes(`Profile: \`${p.id}@${p.version}\` | Record type: \`${p.recordType}\``), `§13 has no entry for ${p.id}@${p.version}`);
});

test('specification/examples-methods.txt has every profile\'s example record', () => {
  const examples = read('specification/examples-methods.txt');
  for (const p of profiles) assert.ok(examples.includes(`:::record ${p.recordType} #example-${p.id}\nmethod: ${p.id}@${p.version}\n${p.example}\n:::`), `examples-methods.txt lacks ${p.id}`);
  assert.deepEqual(parse(examples).diagnostics, []);
});

test('the Methods dialog can find voice practice and the AuDHD profiles', () => {
  // studio.mjs searches label + purpose
  const find = (q) => profiles.filter((p) => (p.label + ' ' + p.purpose).toLowerCase().includes(q)).map((p) => p.id);
  assert.ok(find('voice').includes('voice-practice'));
  for (const id of ['task-initiation-and-transitions', 'low-demand-check-in', 'access-needs-and-scripts']) assert.ok(find('audhd').includes(id), id);
});

test('voice practice numbers are chartable and a skipped check-in carries no values', () => {
  const voice = profiles.find((p) => p.id === 'voice-practice');
  const fields = Object.fromEntries(parse(recordOf(voice)).nodes[0].fields.map((f) => [f.name, f.value]));
  for (const k of ['minutes', 'pitch-hz', 'resonance', 'felt-like-me']) assert.match(fields[k], /^-?[0-9]+(\.[0-9]+)?$/, k);
  const check = profiles.find((p) => p.id === 'low-demand-check-in');
  assert.deepEqual(check.required, ['status']);
  const skipped = parse(`:::record ${check.recordType}\nmethod: low-demand-check-in@${check.version}\nstatus: skipped\n:::\n`);
  assert.deepEqual(skipped.diagnostics, []);
});
