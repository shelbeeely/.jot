// 3D models (spec 8.1.6): a model record is data. Fields that do not fit are kept as written and warned about on their line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from './jot.mjs';
import { modelOf, modelProblems, vector, isModelType } from './model3d.mjs';

const record = (src) => parse(src).nodes.find((n) => n.type === 'record');
const at = (src, d) => Buffer.from(src).subarray(d.start, d.end).toString();

test('reads a model record', () => {
  const m = modelOf(record(':::record model #cube\nlabel: A clay cube\nfile: media/cube.glb A small clay cube\nposter: media/cube.png\ncamera: 2, 1.5, 3\ntarget: 0 0.4 0\nlighting: Studio\nbackground: #FA0\nanimation: Spin\ncaption: Sunday.\ncredit: Me\nmood: calm\n:::\n'));
  assert.deepEqual(m.file, { path: 'media/cube.glb', alt: 'A small clay cube' });
  assert.equal(m.poster.path, 'media/cube.png');
  assert.deepEqual([m.camera, m.target, m.lighting, m.background, m.animation, m.title], [[2, 1.5, 3], [0, 0.4, 0], 'studio', '#ffaa00', 'Spin', 'A clay cube']);
  assert.deepEqual(m.rest, [{ name: 'mood', value: 'calm' }]);
  assert.deepEqual(m.invalid, []);
});
test('defaults: soft light, the page shows through, the title from the description', () => {
  const m = modelOf(record(':::record model\nfile: media/x.glb A paper boat\n:::\n'));
  assert.deepEqual([m.lighting, m.background, m.camera, m.title], ['soft', null, null, 'A paper boat']);
});
test('vectors are three finite numbers within ±10,000', () => {
  assert.deepEqual(vector('1, -2.5, .5'), [1, -2.5, 0.5]);
  assert.deepEqual(vector('1e2 0 0'), [100, 0, 0]);
  for (const bad of ['1, 2', '1, 2, 3, 4', '1, two, 3', '20000, 0, 0', 'NaN, 0, 0', '']) assert.equal(vector(bad), null, bad);
});
test('warns on the right lines, keeps the source byte for byte', () => {
  const src = ':::record model\nlabel: Unfinished\ncamera: 1, two, 3\nlighting: neon\nbackground: #12345\n:::\n', ast = parse(src);
  assert.deepEqual(ast.diagnostics.map((d) => [d.code, at(src, d)]), [
    ['model-without-file', ':::record model\n'], ['invalid-model-field', 'camera: 1, two, 3\n'], ['invalid-model-field', 'lighting: neon\n'], ['invalid-model-field', 'background: #12345\n']]);
  assert.equal(ast.nodes.map((n) => n.raw).join(''), src);
  assert.equal(modelProblems(record(src)).length, 4);
});
test('a second file is kept as written, not used', () => {
  const m = modelOf(record(':::record model\nfile: media/a.glb\nfile: media/b.glb\n:::\n'));
  assert.equal(m.file.path, 'media/a.glb'); assert.equal(m.invalid[0].name, 'file');
});
test('only glTF media types are models', () => {
  for (const t of ['model/gltf-binary', 'model/gltf+json', 'MODEL/GLTF-BINARY; x=1']) assert.ok(isModelType(t), t);
  for (const t of ['application/octet-stream', 'model/obj', 'image/png', '', undefined]) assert.ok(!isModelType(t), String(t));
});
test('other records named like Fountain scenes are untouched', () => {
  assert.deepEqual(parse('.0830 - WORKSHOP\n').diagnostics, []);
  assert.deepEqual(parse(':::record scene\nmodel: x\n:::\n').diagnostics, []);
});

// Compressed models: which decoders a model needs comes from its own JSON, never from running anything.
import { gltfExtensions, decodersFor } from './model3d.mjs';
const glb = (json) => { // a minimal .glb: header and a JSON chunk
  let text = JSON.stringify(json); while (text.length % 4) text += ' ';
  const body = new TextEncoder().encode(text), out = new Uint8Array(20 + body.length), v = new DataView(out.buffer);
  v.setUint32(0, 0x46546c67, true); v.setUint32(4, 2, true); v.setUint32(8, out.length, true); v.setUint32(12, body.length, true); v.setUint32(16, 0x4e4f534a, true); out.set(body, 20);
  return out;
};
test('reads the extensions a model declares', () => {
  const asset = { version: '2.0' };
  assert.deepEqual(gltfExtensions(glb({ asset, extensionsUsed: ['KHR_draco_mesh_compression', 'KHR_texture_basisu'], extensionsRequired: ['KHR_draco_mesh_compression'] })),
    { used: ['KHR_draco_mesh_compression', 'KHR_texture_basisu'], required: ['KHR_draco_mesh_compression'] });
  assert.deepEqual(gltfExtensions(new TextEncoder().encode(JSON.stringify({ asset, extensionsUsed: ['EXT_meshopt_compression'] }))), { used: ['EXT_meshopt_compression'], required: [] });
  for (const bad of [new Uint8Array([1, 2, 3]), new TextEncoder().encode('{"no":"asset"}'), glb({ asset }).subarray(0, 24)]) assert.equal(gltfExtensions(bad), null);
});
test('Draco and Basis need their decoders; meshopt and plain models need none', () => {
  const asset = { version: '2.0' };
  assert.deepEqual(decodersFor(glb({ asset, extensionsUsed: ['KHR_draco_mesh_compression'] })), ['draco_wasm_wrapper.js', 'draco_decoder.wasm']);
  assert.deepEqual(decodersFor(glb({ asset, extensionsUsed: ['KHR_texture_basisu', 'KHR_draco_mesh_compression'] })), ['basis_transcoder.js', 'basis_transcoder.wasm', 'draco_wasm_wrapper.js', 'draco_decoder.wasm']);
  assert.deepEqual(decodersFor(glb({ asset, extensionsUsed: ['EXT_meshopt_compression', 'KHR_mesh_quantization', 'EXT_texture_webp'] })), []);
  assert.deepEqual(decodersFor(new Uint8Array([0])), []);
});
test('hotspots: three numbers, then what is there; at most twenty', () => {
  const m = modelOf(record(':::record model\nfile: media/x.glb\nhotspot: 0.3, 0.9, 0.2 The first seedling\nhotspot: 1 2 3 Top\nhotspot: 1, 2 nope\nhotspot: 1, 2, 3\n:::\n'));
  assert.deepEqual(m.hotspots, [{ at: [0.3, 0.9, 0.2], label: 'The first seedling' }, { at: [1, 2, 3], label: 'Top' }]);
  assert.deepEqual(m.invalid.map((x) => x.value), ['1, 2 nope', '1, 2, 3']);
  const many = modelOf(record(`:::record model\nfile: media/x.glb\n${Array.from({ length: 21 }, (_, i) => `hotspot: ${i}, 0, 0 Spot ${i}`).join('\n')}\n:::\n`));
  assert.equal(many.hotspots.length, 20); assert.match(many.invalid[0].why, /at most 20/);
});
