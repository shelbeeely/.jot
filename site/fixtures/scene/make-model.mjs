// Writes site/fixtures/scene/cube.glb: a small coloured cube with one named animation ("Spin"), for the scene tests.
//   node site/fixtures/scene/make-model.mjs
import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
const P = [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1]];
const faces = [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]], pos = [], col = [], idx = [];
const tint = [[.85,.42,.31],[.31,.55,.85],[.4,.7,.4],[.9,.75,.3],[.6,.45,.8],[.5,.5,.5]];
faces.forEach((f, i) => { const b = pos.length / 3; for (const v of f) { pos.push(...P[v]); col.push(...tint[i], 1); } idx.push(b, b+1, b+2, b, b+2, b+3); });
const times = [0, 1, 2], rot = [0,0,0,1, 0,Math.SQRT1_2,0,Math.SQRT1_2, 0,1,0,0];
const parts = [new Float32Array(pos), new Float32Array(col), new Uint16Array(idx), new Float32Array(times), new Float32Array(rot)];
let offset = 0; const views = parts.map((a) => { const v = { buffer: 0, byteOffset: offset, byteLength: a.byteLength }; offset += Math.ceil(a.byteLength / 4) * 4; return v; });
const bin = new Uint8Array(offset); parts.forEach((a, i) => bin.set(new Uint8Array(a.buffer), views[i].byteOffset));
const gltf = { asset: { version: '2.0', generator: 'Jot test fixture' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'Cube', mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, COLOR_0: 1 }, indices: 2, material: 0 }] }], materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: .8 } }],
  buffers: [{ byteLength: bin.byteLength }], bufferViews: views,
  accessors: [{ bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-1,-1,-1], max: [1,1,1] }, { bufferView: 1, componentType: 5126, count: 24, type: 'VEC4' },
    { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR' }, { bufferView: 3, componentType: 5126, count: 3, type: 'SCALAR', min: [0], max: [2] }, { bufferView: 4, componentType: 5126, count: 3, type: 'VEC4' }],
  animations: [{ name: 'Spin', samplers: [{ input: 3, output: 4, interpolation: 'LINEAR' }], channels: [{ sampler: 0, target: { node: 0, path: 'rotation' } }] }] };
let json = Buffer.from(JSON.stringify(gltf)); json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const head = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8);
head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4e4f534a, 4); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
fs.writeFileSync(new URL('./cube.glb', import.meta.url), Buffer.concat([head, jh, json, bh, Buffer.from(bin)]));
