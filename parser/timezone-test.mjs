import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify } from './jot.mjs';
import { validTimezone, resolveLocalTime, setEntryTimezone, entryAtCaret } from './timezone.mjs';
import { extract, toICS } from './automation.mjs';
const source = `---
Timezone: America/Los_Angeles
---

### 2026-10-28 | London
@timezone: Europe/London

o Breakfast at 09:00

### 2026-10-29 | Back to the default

o Breakfast at 09:00
`;
test('entry overrides are validated, source-preserving and reset at the next entry', () => {
  const ast = parse(source); assert.equal(stringify(ast), source);
  assert.deepEqual(ast.diagnostics, []); assert.equal(ast.timezone, 'America/Los_Angeles');
  assert.deepEqual(ast.entries.map((entry) => [entry.timezone, entry.timezoneSource]), [['Europe/London', 'entry'], ['America/Los_Angeles', 'document']]);
  assert.deepEqual(extract(ast).events.map((event) => event.timezone), ['Europe/London', 'America/Los_Angeles']);
  const calendar = toICS(ast); assert.match(calendar, /DTSTART:20261028T090000Z/); assert.match(calendar, /DTSTART:20261029T160000Z/);
  for (const zone of ['UTC', 'Europe/London', 'Asia/Kathmandu', 'Etc/GMT+8']) assert.equal(validTimezone(zone), true);
  for (const zone of ['', 'PST', '+01:00', 'Not/AZone', 'Europe/London\n@paper: A0']) assert.equal(validTimezone(zone), false);
});
test('invalid, duplicate and orphan overrides are visible warnings without device-zone fallback', () => {
  const ast = parse('@timezone: Europe/London\n\n### 2026-10-28\n@timezone: UTC\n@timezone: Invalid/Zone\no Call at 09:00\n\n### 2026-10-29\no Next at 09:00\n');
  assert.equal(ast.entries[0].timezone, null); assert.equal(ast.entries[0].timezoneSource, 'entry'); assert.equal(ast.entries[1].timezone, null);
  assert.deepEqual(new Set(ast.diagnostics.map((d) => d.code)), new Set(['invalid-timezone', 'duplicate-timezone', 'orphan-timezone']));
  assert.throws(() => toICS(ast), /unresolved/);
  const scoped = parse('### 2026-10-28\n\n```\n@timezone: Europe/London\n```\n\n/*\n@timezone: Asia/Tokyo\n*/\n\n:::record place #tokyo\nlabel: Tokyo\ntimezone: Asia/Tokyo\n:::\n');
  assert.equal(scoped.entries[0].timezone, null); assert.deepEqual(scoped.diagnostics, []);
  const duplicate = parse('---\nTimezone: UTC\ntimezone: Europe/London\n---\n### 2026-10-28\n');
  assert.equal(duplicate.timezone, 'Europe/London'); assert.ok(duplicate.diagnostics.some((d) => d.code === 'duplicate-timezone'));
});
test('DST gaps and folds are never guessed, while explicit-offset instants retain their meaning', () => {
  assert.equal(resolveLocalTime('2026-03-08', '02:30', 'America/New_York').status, 'nonexistent');
  const fold = resolveLocalTime('2026-11-01', '01:30', 'America/New_York'); assert.equal(fold.status, 'ambiguous'); assert.equal(fold.instants.length, 2);
  assert.equal(new Date(resolveLocalTime('2026-10-28', '09:00', 'Asia/Kathmandu').instants[0]).toISOString(), '2026-10-28T03:15:00.000Z');
  assert.equal(new Date(resolveLocalTime('2026-10-28', '09:00:45', 'UTC').instants[0]).toISOString(), '2026-10-28T09:00:45.000Z');
  assert.equal(resolveLocalTime('2026-02-30', '09:00', 'UTC').status, 'invalid');
  for (const [date,time] of [['2026-03-08','02:30'],['2026-11-01','01:30']]) assert.throws(() => toICS(parse(`### ${date}\n@timezone: America/New_York\no Call at ${time}\n`)), /complete RFC 3339/);
  const explicit = parse('### 2026-11-01\n@timezone: America/New_York\n\n:::record event\nlabel: Later occurrence\nstart: 2026-11-01T01:30:00-05:00\nend: 2026-11-01T02:30:00-05:00\n:::\n');
  assert.match(toICS(explicit), /DTSTART:20261101T063000Z\r\nDTEND:20261101T073000Z/);
  assert.match(toICS(parse('### 2026-10-28\no Call at 09:00\n')), /DTSTART:20261028T090000\r\n/);
  assert.match(toICS(parse('### 2026-10-28\n@timezone: Asia/Tokyo\no All day\n')), /DTSTART;VALUE=DATE:20261028/);
});
test('entry editing preserves BOM/CRLF, unrelated text, code and duplicate-date scopes', () => {
  const text = '\uFEFF---\r\nTimezone: UTC\r\n---\r\n### 2026-10-28 | 🌍\r\n@timezone: Europe/London\r\n@timezone: Asia/Tokyo\r\nText\r\n### 2026-10-28 | Second\r\no Call at 09:00\r\n';
  const caret = text.indexOf('Text'), ast = parse(text); assert.equal(entryAtCaret(ast, caret), ast.entries[0]);
  const changed = setEntryTimezone(ast, caret, 'Asia/Kathmandu');
  assert.ok(changed.source.startsWith('\uFEFF---\r\nTimezone: UTC\r\n---\r\n'));
  assert.equal((changed.source.match(/@timezone:/g) || []).length, 1); assert.ok(changed.source.includes('@timezone: Asia/Kathmandu\r\n'));
  assert.ok(changed.source.endsWith(text.slice(text.indexOf('### 2026-10-28 | Second'))));
  assert.deepEqual(parse(changed.source).entries.map((entry) => entry.timezone), ['Asia/Kathmandu', 'UTC']);
  const reset = setEntryTimezone(parse(changed.source), changed.source.indexOf('Text'), '');
  assert.ok(!reset.source.includes('@timezone:')); assert.equal(parse(reset.source).entries[0].timezoneSource, 'document');
  assert.throws(() => setEntryTimezone(parse('Preamble\n'), 4, 'UTC'), /dated entry/);
});
