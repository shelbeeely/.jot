import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { validateMethod, validateLinks, checkLibrary } from './check-methods.mjs';
import { parse } from '../parser/jot.mjs';

const valid = `---
title: "Example"
summary: "A short practice."
slug: example
category: productivity
evidenceLevel: anecdotal
lastReviewed: 2026-11-02
status: draft
licence: CC0-1.0
---
\n${Array.from({ length: 28 }, (_, i) => `## ${i + 1}. Section\n\n${i === 27 ? '1. A source. https://example.org/' : 'Text [1].'}\n`).join('\n')}`;

test('every profile has a structured guide with working local references', () => {
  const result = checkLibrary();
  assert.deepEqual(result.errors, []);
  assert.ok(result.profiles > 0);
  assert.ok(result.guides >= result.profiles);
});

test('rejects missing sections, invalid metadata and unresolved references', () => {
  assert.deepEqual(validateMethod(valid, 'example.md'), []);
  const broken = valid.replace('## 12. Section', '## 13. Section').replace('2026-11-02', '2026-02-30').replace('evidenceLevel: anecdotal', 'evidenceLevel: guaranteed').replace('Text [1].', 'Text [99].');
  const errors = validateMethod(broken, 'wrong-name.md');
  for (const pattern of [/slug/, /date/, /evidenceLevel/, /28 numbered/, /\[99\]/]) assert.ok(errors.some((error) => pattern.test(error)), errors.join('\n'));
  assert.ok(validateMethod(valid.replace('summary: "A short practice."\n', ''), 'example.md').includes('missing summary'));
  assert.ok(validateMethod(valid.replace('1. A source.', '1. A source.\n1. Duplicate.'), 'example.md').includes('duplicate source numbers'));
  assert.deepEqual(validateMethod(valid.replace('1. A source. https://example.org/', '| # | Source |\n| --- | --- |\n| 1 | https://example.org/ |'), 'example.md'), []);
  for (const citation of ['[1, 99]', '[1–3]', '[1-3]']) assert.ok(validateMethod(valid.replace('Text [1].', `Text ${citation}.`), 'example.md').some((e) => e.includes('has no source')));
});

test('checks local headings and targets without treating code samples as document links or citations', () => {
  const filename = path.resolve('/example/guide.md');
  const read = (file) => { if (file === path.resolve('/example/other.md')) return '# Other\n\n## 2. A heading\n'; throw Error('missing'); };
  const errors = validateLinks('[Good](other.md#2-a-heading) [Bad](other.md#missing) [Gone](gone.md) [Web](https://example.org/)', filename, read);
  assert.equal(errors.length, 2);
  assert.ok(errors.some((e) => e.includes('heading')));
  assert.ok(errors.some((e) => e.includes('target')));
  const sample = '\n```md\n## 99. Example\n[999] [Not a link to check](missing.md)\n```\n';
  assert.deepEqual(validateMethod(valid + sample, 'example.md'), []);
  assert.deepEqual(validateLinks(sample, filename, read), []);
  assert.deepEqual(validateLinks('`[Example](missing.md)` and ``[More](missing.md)``', filename, read), []);
  assert.equal(validateLinks('`code` [Real](missing.md)', filename, read).length, 1);
  const dirLink = new URL('../docs/methods/', import.meta.url).pathname;
  assert.deepEqual(validateLinks(`[Directory](${dirLink})`, filename), []);
});

test('Jot examples parse together within each guide, including linked reviews', () => {
  const dir = new URL('../docs/methods/', import.meta.url);
  let examples = 0;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !['README.md', 'TEMPLATE.md'].includes(f))) {
    const text = fs.readFileSync(new URL(file, dir), 'utf8');
    const blocks = [...text.matchAll(/^```jot\s*\n([\s\S]*?)^```/gm)].map((m) => m[1]);
    if (!blocks.length) continue;
    examples += blocks.length;
    assert.deepEqual(parse(blocks.join('\n\n')).diagnostics, [], file);
  }
  assert.ok(examples > 0);
});
