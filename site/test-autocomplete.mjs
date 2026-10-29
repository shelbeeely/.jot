import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../parser/jot.mjs';
import { completionIndex, localSuggestions } from './dist/local-autocomplete.mjs';
const source = `### 2026-10-27 | Walk by the river

#Work @Home and #café.
[link](https://example.test/#not-a-tag) and \`#secret @code\`.

\`\`\`
#private @hidden
\`\`\`

:::record scale #mood-scale
name: Mood range
minimum: 1
maximum: 5
:::

:::record observation #walk
label: River reflection
body: Quiet water.
:::

:::record measurement #sleep-one
metric: sleep
unit: h
value: 7
:::

:::record measurement #sleep-other
metric: sleep
unit: min
value: 420
:::

:::record measurement #mood-one
metric: mood
scale: #mood-scale
value: 3
:::
`;
const suggest = (tail) => { const text = source + '\n' + tail; return localSuggestions(text, text.length); };
test('index collects current writing only, excluding code, URL destinations and record IDs as tags', () => {
  const index = completionIndex(parse(source));
  assert.deepEqual(index.tags.sort(), ['#Work', '#café']); assert.deepEqual(index.contexts, ['@Home']);
  assert.ok(index.targets.some((target) => target.id === 'walk' && target.label === 'River reflection'));
  assert.ok(index.targets.some((target) => target.id === '2026-10-27'));
  assert.equal(suggest('#wo').items[0].value, '#Work'); assert.equal(suggest('@ho').items[0].value, '@Home');
  assert.equal(suggest('#ca').items[0].value, '#café');
});
test('internal links can search titles or IDs, fill blank labels and replace the destination suffix', () => {
  let result = suggest('[See](#River'); assert.ok(result.items.some((item) => item.value === '[See](#walk)'));
  result = suggest('[](#2026'); assert.match(result.items[0].value, /Walk by the river.*\(#2026-10-27\)/);
  const text = source + '\n[See](#waZZ) after'; const caret = text.indexOf('ZZ)');
  result = localSuggestions(text, caret); assert.equal(text.slice(result.start, result.end), '[See](#waZZ)');
  assert.equal(text.slice(0, result.start) + result.items.find((item) => item.value === '[See](#walk)').value + text.slice(result.end), source + '\n[See](#walk) after');
  const titled = source + '\n[See](#waZZ "Keep this title") after';
  const named = localSuggestions(titled, titled.indexOf('ZZ "'));
  assert.equal(named.items.find((item) => item.value.startsWith('[See](#walk')).value, '[See](#walk "Keep this title")');
  const duplicate = source + '\n:::record observation #walk\nbody: duplicate\n:::\n[See](#River';
  assert.ok(!localSuggestions(duplicate, duplicate.length)?.items.some((item) => item.value.includes('(#walk)')));
});
test('metrics, units and scales come from existing records without supplying values or conversions', () => {
  assert.equal(suggest(':::record measurement\nmetric: sl').items[0].value, 'sleep');
  const unit = suggest(':::record measurement\nmetric: sleep\nunit: ');
  assert.deepEqual(unit.items.map((item) => item.value).sort(), ['h', 'min']);
  assert.equal(suggest(':::record measurement\nmetric: unknown\nunit: '), null);
  assert.equal(suggest(':::record measurement\nmetric: mood\nscale: #mo').items[0].value, '#mood-scale');
  assert.equal(suggest(':::record measurement\nmetric: mood\nvalue: '), null);
});
test('code, comments, metadata, escapes, heading text, emails and plain URLs do not trigger completions', () => {
  for (const tail of ['```\n#wo', '~~~\n@ho', '/*\n#wo', '    #wo', '`#wo', '\\#wo', '### A heading', 'https://example.test/#wo', 'mail@ho', ':::record observation\nmetric: sl']) assert.equal(suggest(tail), null, tail);
  assert.equal(localSuggestions('---\nTitle: #wo', 16), null);
  const text = source + '\n#woZZ'; const caret = text.length - 2, result = localSuggestions(text, caret);
  assert.equal(text.slice(result.start, result.end), '#woZZ');
  assert.equal(localSuggestions('A different journal\n#wo', 23), null, 'no state from a previous journal');
});


test('Markdown tables and nested lists index visible tags without treating header flags as token arrays', () => {
  const index = completionIndex(parse('| Label | Value |\n| --- | --- |\n| #Table | @Desk |\n\n- A nested **#Strong** tag\n  - @Office\n'));
  assert.ok(index.tags.includes('#Table')); assert.ok(index.tags.includes('#Strong'));
  assert.ok(index.contexts.includes('@Desk')); assert.ok(index.contexts.includes('@Office'));
});
