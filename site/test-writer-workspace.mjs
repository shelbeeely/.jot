import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outlineItems } from './dist/writer-workspace.mjs';

test('outline uses parsed headings, excludes code/comments/records, and maps UTF-8 positions to editor selections', () => {
  const source = '# Café 🌿\r\n\r\nWords with é and 日本語.\r\n\r\n~~~text\r\n## Code heading\r\n~~~\r\n\r\n/*\r\n## Comment heading\r\n*/\r\n\r\n:::record note #note\r\nlabel: # Not a heading\r\n:::\r\n\r\n### 2026-10-28 | Wednesday\r\n\r\n#### A section\r\n';
  const items = outlineItems(source);
  assert.deepEqual(items.map(item => item.label), ['Café 🌿', '2026-10-28 | Wednesday', 'A section']);
  assert.deepEqual(items.map(item => item.level), [1, 3, 4]);
  assert.deepEqual(items.map(item => item.date), ['', '2026-10-28', '']);
  for (const item of items) assert.ok(source.slice(item.position).startsWith('#'.repeat(item.level) + ' '), item.label);
  assert.equal(items[1].position, source.indexOf('### 2026-10-28'));
});
