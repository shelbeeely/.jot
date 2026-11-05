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
