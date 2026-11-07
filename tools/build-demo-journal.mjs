// Build the complete month from readable source, original media and saved live-model replies. Never calls a provider.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { pack, readDocument, reconcileEntries, searchArchive } from '../parser/container.mjs';
import { parse } from '../parser/jot.mjs';
import { Marked } from '../parser/vendor/marked.mjs';
import { journalDays, PLACE_TYPE } from '../site/dist/scene-journal-core.mjs';
import { reusableScene } from './generate-demo-scenes.mjs';
import { demoAssets } from './demo-assets.mjs';
import { brandLink, iconLinks } from './sync-brand.mjs';
import { siteNavigation, navigationStyles } from './sync-navigation.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const SCENE_DAYS = Array.from({ length: 6 }, (_, i) => `2026-10-0${i + 2}`); // 1 October waits to be remade (DEMO.md)
export const DEMO_PASSPHRASE = 'jot-demo-only'; // Published fictional fixture, never a real secret.
const sourcePath = path.join(ROOT, 'examples/demo-month.jot');
const output = path.join(ROOT, 'site/dist/examples');
const stableId = (name) => {
  const hex = createHash('sha256').update('jot-month-demo-v1:' + name).digest('hex').slice(0, 32).split('');
  hex[12] = '4'; hex[16] = '8';
  const text = hex.join('');
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
};

export async function demoInputs() {
  const source = fs.readFileSync(sourcePath, 'utf8'), ast = parse(source), days = journalDays(source);
  assert.deepEqual(ast.diagnostics.filter((d) => d.severity !== 'info'), [], 'The demo source must pass strict validation.');
  assert.deepEqual(days.map((d) => d.date), Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`));
  const provenance = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/demo-scenes/index.json'), 'utf8'));
  const assets = await demoAssets();
  // The first week carries kept scenes (2 to 7 October for now); the rest of the month is writing only.
  assert.deepEqual(days.filter((d) => d.setting).map((d) => d.date), SCENE_DAYS, 'Scenes are kept for 2–7 October only.');
  for (const day of days.filter((d) => d.setting)) {
    const name = `scene-${day.date}.json`, text = fs.readFileSync(path.join(ROOT, 'examples/demo-scenes', day.date + '.json'), 'utf8');
    const item = provenance.scenes[day.date];
    assert.equal(item?.provider, 'openrouter', `${day.date} needs an actual OpenRouter reply.`);
    assert.equal(item.dataCollection, 'deny');
    assert.equal(reusableScene(day, item, text, { model: item.model, zdr: item.zdr }), true, `${day.date}'s scene must match its exact current prompt and sentences. Regenerate this day explicitly.`);
    assert.equal(day.setting?.path, 'media/' + name);
    assets.push({ path: 'media/' + name, name, mediaType: PLACE_TYPE, data: new TextEncoder().encode(text) });
  }
  assets.sort((a, b) => a.path.localeCompare(b.path));
  for (const asset of assets) asset.id = stableId(asset.path);
  const paths = new Set(assets.map((a) => a.path));
  assert.equal(paths.size, assets.length, 'Each attachment alias is unique.');
  for (const reference of source.match(/media\/[A-Za-z0-9._-]+/g) || []) assert.ok(paths.has(reference), `Missing demo attachment: ${reference}`);
  const entries = reconcileEntries(source).map((entry, i) => ({ ...entry, id: stableId('entry:' + (entry.date || 'preface') + ':' + i) }));
  const metadata = { title: 'demo-month', workspace: { name: 'demo-month', filename: 'demo-month.jotz', cursor: 0, scroll: 0 } };
  return { source, assets, entries, metadata, id: stableId('archive'), previous: { index: { id: stableId('index') } }, index: 'always' };
}

async function verifyArchive(bytes, input, mixed) {
  const doc = await readDocument(bytes, mixed ? { secret: DEMO_PASSPHRASE } : {});
  try {
    assert.equal(doc.source, input.source);
    assert.equal(doc.indexError, null);
    assert.ok(doc.index && doc.indexBytes, 'The example carries its public SQLite search index.');
    assert.deepEqual(doc.entries.map((e) => e.id), input.entries.map((e) => e.id));
    assert.deepEqual(doc.entries.filter((e) => e.private).map((e) => e.date), mixed ? ['2026-10-31'] : []);
    assert.deepEqual(doc.metadata, input.metadata);
    assert.equal(doc.assets.length, input.assets.length);
    for (const original of input.assets) {
      const asset = doc.assets.find((a) => a.path === original.path);
      assert.ok(asset, original.path); assert.equal(asset.id, original.id); assert.equal(asset.mediaType, original.mediaType);
      // Compare bytes directly: a failing deepEqual on large buffers builds a diff that can exhaust memory.
      assert.ok(Buffer.from(asset.data).equals(Buffer.from(original.data)), original.path + ' must retain exact original bytes.');
    }
  } finally { doc.index?.close(); }
  if (mixed) {
    const locked = await readDocument(bytes);
    try {
      assert.equal(locked.partial, true); assert.equal(locked.assets.length, 0);
      assert.equal(locked.entries.at(-1).source, null);
      assert.equal(locked.manifest.assets.every((a) => a.encryption?.cipher === 'AES-256-GCM'), true);
      assert.equal((await searchArchive(locked, { from: '2026-10-31', to: '2026-10-31' })).length, 0);
    } finally { locked.index?.close(); }
  }
}

// On the site, the demo opens straight in Writer (Writer asks before it replaces any writing in this browser).
const OPEN_LINKS = '<p class="demo-open" style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn primary" href="scenes.html">See the first week as scenes (experimental)</a> <a class="btn" href="../write/?open=examples/demo-month.jotz">Open the demo in Writer</a> <a class="btn" href="../write/?open=examples/demo-month-mixed.jotz">Open the protected copy</a></p>';
function guideHTML(markdown) {
  const marked = new Marked({ gfm: true });
  // Only repository-authored documentation, never journal or model output, enters this page.
  markdown = markdown.replace('(demo-scenes/)', '(demo-scenes/index.json)');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><title>Explore the demo · Jot</title>${iconLinks('../')}
<link rel="stylesheet" href="../editor/editor.css"><link rel="stylesheet" href="../guide/guide.css">${navigationStyles('../')}</head>
<body class="jot-site"><a class="skip" href="#demo">Skip to the demo guide</a><header class="top">${brandLink('../')}${siteNavigation('../', 'tools', false)}</header>
<main><div class="guide-wrap" id="demo" style="grid-template-columns:minmax(0,760px);justify-content:center"><article class="guide">${marked.parse(markdown).replace(/<table>/g, '<table tabindex="0">').replace('</h1>', `</h1>\n${OPEN_LINKS}`)}</article></div></main></body></html>\n`;
}

export async function buildDemo({ check = false } = {}) {
  const input = await demoInputs();
  const publicBytes = await pack(input);
  const write = (filename, bytes) => {
    if (check) assert.ok(fs.existsSync(filename) && fs.readFileSync(filename).equals(Buffer.from(bytes)), `Stale demo output: ${path.relative(ROOT, filename)}`);
    else { fs.mkdirSync(path.dirname(filename), { recursive: true }); fs.writeFileSync(filename, bytes); }
  };
  const plainFile = path.join(ROOT, 'examples/demo-month.jotz'), mixedFile = path.join(ROOT, 'examples/demo-month-mixed.jotz');
  write(plainFile, publicBytes);
  await verifyArchive(publicBytes, input, false);
  // Encryption deliberately uses fresh random keys/IVs. Reuse a valid existing fixture; never weaken crypto for reproducible bytes.
  let mixedBytes = fs.existsSync(mixedFile) ? fs.readFileSync(mixedFile) : null;
  if (mixedBytes) try { await verifyArchive(mixedBytes, input, true); } catch (error) { if (check) throw error; mixedBytes = null; }
  if (!mixedBytes) {
    assert.equal(check, false, 'Mixed demo archive is missing.');
    mixedBytes = await pack({ ...input, id: stableId('mixed-archive'), secret: DEMO_PASSPHRASE, privateEntries: [input.entries.at(-1).id] });
    await verifyArchive(mixedBytes, input, true); write(mixedFile, mixedBytes);
  }
  write(path.join(output, 'demo-month.jotz'), publicBytes);
  write(path.join(output, 'demo-month-mixed.jotz'), mixedBytes);
  write(path.join(output, 'demo-month.jot'), input.source);
  for (const name of ['people.jot', 'places.jot', 'demo-numbers.csv']) write(path.join(output, name), fs.readFileSync(path.join(ROOT, 'examples', name)));
  const guide = fs.readFileSync(path.join(ROOT, 'examples/DEMO.md'), 'utf8');
  write(path.join(output, 'demo.html'), guideHTML(guide));
  // Public fixture provenance and saved replies, linked from the walkthrough.
  for (const name of fs.readdirSync(path.join(ROOT, 'examples/demo-scenes')).filter((n) => /^(?:index|2026-10-\d{2})\.json$/.test(n))) {
    write(path.join(output, 'demo-scenes', name), fs.readFileSync(path.join(ROOT, 'examples/demo-scenes', name)));
  }
  console.log(`Month demo: ${check ? 'current' : 'built'}, 31 entries, ${SCENE_DAYS.length} live-model scenes, ${input.assets.length} attachments (${Math.round(publicBytes.length / 1024)} KiB).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await buildDemo({ check: process.argv.includes('--check') }); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
