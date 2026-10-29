import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../parser/jot.mjs';
import { timestampAt } from '../parser/timezone.mjs';
import { currentTimeText, capturedPlace, locationNote } from './dist/editor-capture.mjs';
import { collectNumbers } from '../parser/charts.mjs';
const instant = Date.parse('2026-10-28T12:34:56.789Z');
test('current timestamp respects an explicit entry/default zone and otherwise records the device offset explicitly', () => {
  const text = '---\nTimezone: Asia/Tokyo\n---\n### 2026-10-28\n@timezone: Europe/London\nWriting\n';
  assert.equal(currentTimeText(text, text.length, instant, 'America/Los_Angeles').text, '2026-10-28T12:34:56Z');
  assert.equal(currentTimeText(text.slice(0, text.indexOf('###')), 0, instant, 'America/Los_Angeles').text, '2026-10-28T21:34:56+09:00');
  const device = currentTimeText('Old undated writing.', 8, instant, 'America/Los_Angeles');
  assert.equal(device.text, '2026-10-28T05:34:56-07:00'); assert.equal(device.source, 'device');
  assert.equal(timestampAt(instant, 'Asia/Kathmandu'), '2026-10-28T18:19:56+05:45');
  assert.throws(() => currentTimeText('### 2026-10-28\n@timezone: Invalid/Zone\nText', 50, instant, 'UTC'), /Fix the declared/);
});
test('one-shot location records retain supplied accuracy and time, never infer address or timezone, and are not measurements', () => {
  const values = capturedPlace({ coords: { latitude: 0, longitude: 0, accuracy: 10, altitude: null }, timestamp: instant });
  assert.equal(values['accuracy-m'], '10'); assert.equal(values['captured-at'], '2026-10-28T12:34:56.789Z');
  assert.ok(!Object.hasOwn(values, 'timezone') && !Object.hasOwn(values, 'address-line1') && !Object.hasOwn(values, 'altitude-m'));
  const ast = parse(locationNote(values, 'place-capture-test')); assert.deepEqual(ast.diagnostics, []);
  assert.equal(ast.nodes[0].recordType, 'place'); assert.equal(collectNumbers(ast).metrics.size, 0);
  assert.throws(() => capturedPlace({ coords:{latitude:91, longitude:0}, timestamp:instant }), /Latitude/);
});
