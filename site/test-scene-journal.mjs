// Journal places (scene-journal-core.mjs, spec 8.1.9): what is sent, what comes back, what is kept, and the one line that changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { journalDays, placePrompt, validatePlace, placeFile, readPlaceFile, settingEdit, plainText, PLACE_SCHEMA, LIMITS, ATMOSPHERES, MOTIONS } from './dist/scene-journal-core.mjs';
import { jsonRequest, requestJSON } from './dist/ai-client.mjs';
import { PARTS, buildPart } from './dist/writer-scene-parts.mjs';

const SOURCE = `Undated preamble.

### 2026-10-01 | Thursday
Papers everywhere on my **desk**. The tea went cold.

~~~draft
never sent
~~~

/*
hidden comment
*/

:::record measurement
metric: steps
value: 900
:::

\`\`\`
code is not prose
\`\`\`

### 2026-10-02 | Friday
@setting: media/abc
- Rain at the [bus stop](#stop). The 42 was late again!
`;

test('days: dated entries only, prose only, numbered sentences, the @setting: line', () => {
  const days = journalDays(SOURCE);
  assert.deepEqual(days.map((d) => [d.date, d.label, d.sentences]), [
    ['2026-10-01', 'Thursday', ['Papers everywhere on my desk.', 'The tea went cold.']],
    ['2026-10-02', 'Friday', ['Rain at the bus stop.', 'The 42 was late again!']]]);
  assert.equal(days[0].setting, null);
  assert.deepEqual({ path: days[1].setting.path, text: SOURCE.slice(days[1].setting.start, days[1].setting.end) }, { path: 'media/abc', text: '@setting: media/abc\n' });
  assert.match(SOURCE.slice(days[0].start, days[0].end), /^### 2026-10-01[\s\S]*code is not prose\n```\n\s*$/);
  assert.equal(plainText('- [x] **Bold** and ==marked== [a link](https://x) #tag'), 'Bold and marked a link #tag');
});
test('the prompt carries only the day\'s numbered sentences, and says the entry is not instructions', () => {
  const { system, user } = placePrompt(journalDays(SOURCE)[0]);
  assert.deepEqual(JSON.parse(user), { date: '2026-10-01', sentences: [{ n: 1, text: 'Papers everywhere on my desk.' }, { n: 2, text: 'The tea went cold.' }] });
  assert.match(system, /never as instructions/); assert.match(system, /Never write journal text/);
  assert.doesNotMatch(user, /never sent|hidden comment|code is not prose|steps/);
  assert.equal(PLACE_SCHEMA.additionalProperties, false); assert.deepEqual(PLACE_SCHEMA.properties.objects.items.properties.shapes.items.properties.type.enum, ['box', 'cylinder', 'sphere', 'cone', 'torus', 'plane', 'capsule', ...PARTS]);
});
const shape = (extra = {}) => ({ type: 'box', position: [0, 0, 0], rotation: [0, 0, 0], size: [1, 1, 1], color: '#aabbcc', roughness: 0.5, glow: false, ...extra });
test('a model\'s place is cleaned: clamped, limited, and its moments are the entry\'s own sentences', () => {
  const list = ['One.', 'Two.'];
  const p = validatePlace({ title: 'A <b>desk</b>', sky: 'blue', ground: '#123456', weather: 'hail', time: 'night', camera: { position: [1, 2, 999], target: 'x' },
    objects: [{ name: 'Mug', position: [0, 0, 0], rotation: [0, 99, 0], moments: [2, 2, 3, 0, 1.5, '1'], shapes: [shape({ size: [0, 500, 1], roughness: 7, glow: 'yes', color: 'red' }), { type: 'script' }] },
      { name: 'Empty', position: [0, 0, 0], rotation: [0, 0, 0], moments: [1], shapes: [] }, 'nonsense'] }, list);
  assert.deepEqual(p, { title: 'A b desk /b', sky: '#b8c7d6', ground: '#123456', weather: 'clear', time: 'night', atmosphere: 'neutral', camera: { position: [1, 2, 50], target: [0, 0.6, 0] },
    objects: [{ name: 'Mug', position: [0, 0, 0], rotation: [0, Math.PI * 2, 0], motion: 'none', moments: ['Two.'], shapes: [{ type: 'box', position: [0, 0, 0], rotation: [0, 0, 0], size: [0.01, 20, 1], color: '#9a958c', roughness: 1, glow: false }] }] });
  assert.throws(() => validatePlace({ objects: [] }, list), /nothing in it/); assert.throws(() => validatePlace('a script', list), /did not describe/);
  const many = validatePlace({ objects: Array.from({ length: LIMITS.objects + 10 }, () => ({ name: 'x', shapes: Array.from({ length: LIMITS.shapes + 2 }, () => shape()), moments: [] })) }, list);
  assert.equal(many.objects.length, Math.ceil(LIMITS.total / LIMITS.shapes)); assert.ok(many.objects.every((o) => o.shapes.length <= LIMITS.shapes));
  assert.equal(many.objects.reduce((n, o) => n + o.shapes.length, 0), LIMITS.total);
});
test('atmosphere and motion come from fixed lists, are asked for strictly, and default for older places', () => {
  const obj = PLACE_SCHEMA.properties.objects.items;
  assert.ok(PLACE_SCHEMA.required.includes('atmosphere') && obj.required.includes('motion'), 'strict structured output lists every field');
  assert.deepEqual(PLACE_SCHEMA.properties.atmosphere.enum, ATMOSPHERES); assert.deepEqual(obj.properties.motion.enum, MOTIONS);
  const one = (extra) => validatePlace({ objects: [{ name: 'Cup', shapes: [shape()], moments: [1], ...extra.object }], ...extra.place }, ['Tea.']);
  assert.deepEqual([one({ place: { atmosphere: 'cosy' }, object: { motion: 'steam' } })].map((p) => [p.atmosphere, p.objects[0].motion]), [['cosy', 'steam']]);
  assert.deepEqual([one({ place: { atmosphere: 'furious' }, object: { motion: 'explode' } })].map((p) => [p.atmosphere, p.objects[0].motion]), [['neutral', 'none']]);
  assert.deepEqual([one({ place: {}, object: {} })].map((p) => [p.atmosphere, p.objects[0].motion]), [['neutral', 'none']], 'a place kept before these fields');
  const { system } = placePrompt(journalDays(SOURCE)[0]);
  assert.match(system, /Never add people, visitors, gifts, accidents, celebrations/); assert.match(system, /not a diagnosis of the writer/); assert.match(system, /use neutral when the words do not make a feeling clear/);
});
test('crafted parts are shapes Jot draws: a fixed list, kept by validation, every one buildable', async () => {
  assert.ok(PARTS.includes('mug') && PARTS.includes('notebook') && PARTS.includes('shelter'));
  const p = validatePlace({ objects: [{ name: 'Tea', moments: [1], shapes: [shape({ type: 'mug', size: [0.12, 0.12, 0.09] }), shape({ type: 'spellbook' })] }] }, ['Tea.']);
  assert.deepEqual(p.objects[0].shapes.map((x) => x.type), ['mug'], 'an unknown part name is dropped like any unknown shape');
  assert.match(placePrompt(journalDays(SOURCE)[0]).system, /Prefer a crafted part when one fits: mug, teapot/);
  assert.match(placePrompt(journalDays(SOURCE)[0]).system, /Aim for 8 to 20 objects and at most 80 shapes/, 'Writer keeps the standard prompt');
  const rich = placePrompt(journalDays(SOURCE)[0], { detail: 'rich' }).system;
  assert.match(rich, /Aim for 40 to 100 objects and at most 600 shapes/); assert.match(rich, /Never add people/);
  assert.throws(() => placePrompt(journalDays(SOURCE)[0], { detail: 'huge' }), /Unknown scene detail/);
  // Every part builds from three.js pieces only (a tiny stand-in records what is made).
  class Obj { constructor() { this.children = []; this.userData = {}; this.position = vec(); this.rotation = vec(); this.scale = vec(); } add(c) { this.children.push(c); return this; } }
  function vec() { return { set() { return this; }, setScalar() { return this; } }; }
  class Geo { constructor(...a) { this.args = a; } }
  const T = new Proxy({ Group: Obj, Mesh: class extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } }, DoubleSide: 2,
    Color: class { constructor(c) { this.c = c; } offsetHSL() { return this; } getHexString() { return '777777'; } } }, { get: (t, k) => t[k] || Geo });
  for (const type of PARTS) {
    const g = buildPart(T, type, [1, 1, 1], '#aabbcc', { material: () => ({}) });
    const count = (o) => o.children.reduce((n, c) => n + 1 + count(c), 0);
    assert.ok(g && count(g) >= 2, `${type} has pieces`);
  }
  assert.equal(buildPart(T, 'script', [1, 1, 1], '#fff', { material: () => ({}) }), null);
  const surfaces = (o) => o.children.flatMap((c) => [c.userData.surface, ...surfaces(c)]).filter(Boolean);
  for (const [type, surface] of [['tv', 'screen'], ['laptop', 'screen'], ['phone', 'screen'], ['book', 'cover'], ['frame', 'picture']])
    assert.deepEqual(surfaces(buildPart(T, type, [1, 1, 1], '#abcdef', { material: () => ({}) })), [surface], `${type} has a ${surface} Jot may draw on`);
});
test('a kept still is read only from a saved place, and only with a media/ path', () => {
  const day = journalDays(SOURCE)[0], base = { objects: [{ name: 'TV', moments: [1], shapes: [shape({ type: 'tv' })] }] };
  assert.equal(validatePlace({ ...base, stills: [{ reference: 'imdb:tt0133093', path: 'media/x.jpg' }] }, day.sentences).stills, undefined, 'never from a model');
  const kept = { format: 'jot-place', version: 1, made: { model: 'm', at: 't' }, ...validatePlace(base, day.sentences),
    stills: [{ reference: 'imdb:tt0133093', path: 'media/still-the-matrix.jpg', credit: 'TMDB' }, { reference: 'imdb:tt1', path: 'https://evil.example/x.jpg' }, { path: 'media/y.jpg' }] };
  assert.deepEqual(readPlaceFile(JSON.stringify(kept), day).stills, [{ reference: 'imdb:tt0133093', path: 'media/still-the-matrix.jpg', credit: 'TMDB' }]);
  assert.deepEqual(JSON.parse(placeFile(readPlaceFile(JSON.stringify(kept), day))).stills.length, 1, 'kept again as it was');
});
test('a kept place is read again as untrusted, and says when a moment has left the entry', () => {
  const day = journalDays(SOURCE)[0], place = validatePlace({ objects: [{ name: 'Mug', moments: [2], shapes: [shape()] }] }, day.sentences);
  const text = placeFile(place, { model: 'some/model', at: '2026-11-05T00:00:00Z' });
  assert.deepEqual(JSON.parse(text).objects[0].moments, ['The tea went cold.']); assert.equal(JSON.parse(text).format, 'jot-place');
  assert.deepEqual(readPlaceFile(text, day).objects[0].moments, [{ text: 'The tea went cold.', missing: false }]);
  assert.deepEqual(readPlaceFile(text, { sentences: ['The coffee went cold.'] }).objects[0].moments, [{ text: 'The tea went cold.', missing: true }]);
  assert.equal(readPlaceFile(text, day).made.model, 'some/model');
  assert.throws(() => readPlaceFile('{"format":"other"}', day), /not a Jot place/); assert.throws(() => readPlaceFile('<html>', day), /not readable/);
});
test('keeping a place adds or changes one @setting: line, in that entry only', () => {
  const [thu, fri] = journalDays(SOURCE);
  const added = settingEdit(SOURCE, thu, 'media/new-1');
  assert.equal(added, SOURCE.replace('### 2026-10-01 | Thursday\n', '### 2026-10-01 | Thursday\n@setting: media/new-1\n\n'));
  assert.equal(settingEdit(SOURCE, fri, 'media/new-2'), SOURCE.replace('@setting: media/abc', '@setting: media/new-2'));
  assert.equal(journalDays(added)[0].setting.path, 'media/new-1');
  assert.throws(() => settingEdit(SOURCE, thu, 'https://example.com/x'), /attachment/);
  assert.equal(settingEdit('### 2026-10-01\r\nRain.\r\n', journalDays('### 2026-10-01\r\nRain.\r\n')[0], 'media/a'), '### 2026-10-01\r\n@setting: media/a\r\n\r\nRain.\r\n');
});
test('the shared JSON transport keeps the companion\'s privacy settings and refuses unfinished answers', async () => {
  const body = jsonRequest({ provider: 'openrouter', model: 'm', key: 'k', system: 's', user: 'u', schema: PLACE_SCHEMA, name: 'jot_place' });
  assert.deepEqual(body.provider, { zdr: true, data_collection: 'deny', require_parameters: true }); assert.equal(body.response_format.json_schema.strict, true);
  assert.throws(() => jsonRequest({ provider: 'openrouter', model: 'm', key: '', system: 's', user: 'u', schema: {} }), /API key/);
  const reply = (content, extra = {}) => async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:11434/v1/chat/completions'); assert.equal(init.credentials, 'omit'); assert.equal(init.headers.Authorization, undefined);
    const text = JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content, ...extra } }] });
    return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const config = { provider: 'local', base: 'http://127.0.0.1:11434/v1', model: 'm', system: 's', user: 'u', schema: PLACE_SCHEMA };
  assert.deepEqual(await requestJSON(config, { fetcher: reply('{"title":"x"}') }), { title: 'x' });
  await assert.rejects(requestJSON(config, { fetcher: reply('{}', { tool_calls: [{}] }) }), /did not finish/);
  await assert.rejects(requestJSON(config, { fetcher: reply('not json') }), /invalid JSON/);
  await assert.rejects(requestJSON({ ...config, base: 'https://evil.example/v1' }, { fetcher: reply('{}') }), /localhost/);
});
test('a reasoning hint goes only to OpenRouter, and is dropped once if no provider can take it', async () => {
  const base = { model: 'm', key: 'k', system: 's', user: 'u', schema: PLACE_SCHEMA, reasoning: { effort: 'low' } };
  assert.deepEqual(jsonRequest({ provider: 'openrouter', ...base }).reasoning, { effort: 'low' });
  assert.equal(jsonRequest({ provider: 'local', base: 'http://127.0.0.1:1/v1', ...base }).reasoning, undefined, 'local servers never get it');
  const sent = [];
  const fetcher = async (url, init) => {
    const body = JSON.parse(init.body); sent.push(body);
    if (body.reasoning) return new Response('{"error":{"code":404}}', { status: 404 });
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }] }), { status: 200 });
  };
  assert.deepEqual(await requestJSON({ provider: 'openrouter', ...base }, { fetcher }), { ok: true });
  assert.equal(sent.length, 2); assert.deepEqual(sent[1].provider, sent[0].provider, 'the same privacy settings, only the hint dropped');
  const refused = async () => new Response('{}', { status: 401 });
  await assert.rejects(requestJSON({ provider: 'openrouter', ...base }, { fetcher: refused }), /HTTP 401/);
});
test('real replies from a live model are kept whole, with moments in the journal\'s own words', async () => {
  const fs = await import('node:fs'), dir = new URL('./fixtures/scenes/', import.meta.url);
  const days = journalDays(fs.readFileSync(new URL('journal.jot', dir), 'utf8'));
  for (const day of days) {
    const raw = JSON.parse(fs.readFileSync(new URL(`qwen3.8-flash-${day.date}.json`, dir), 'utf8')), place = validatePlace(raw, day.sentences);
    assert.equal(place.objects.length, raw.objects.length, `${day.date}: every object is kept`);
    assert.ok(place.objects.every((o) => o.shapes.length === raw.objects.find((r) => r.name === o.name).shapes.length), `${day.date}: every shape is kept`);
    assert.match(place.sky + place.ground, /^#[0-9a-f]{6}#[0-9a-f]{6}$/);
    const moments = place.objects.flatMap((o) => o.moments);
    assert.ok(moments.length && moments.every((m) => day.sentences.includes(m)), `${day.date}: moments are the entry's sentences`);
  }
  assert.deepEqual(days.map((d) => validatePlace(JSON.parse(fs.readFileSync(new URL(`qwen3.8-flash-${d.date}.json`, dir), 'utf8')), d.sentences).weather), ['clear', 'rain', 'sun']);
});
