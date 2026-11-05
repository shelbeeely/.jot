// Writes the compressed 3D model fixtures in site/fixtures/scene/: a textured cube with one animation ("Spin"), saved
//   textured.glb         plain glTF, PNG texture
//   draco.glb            KHR_draco_mesh_compression
//   meshopt.glb          EXT_meshopt_compression (+ KHR_mesh_quantization)
//   ktx2.glb             KHR_texture_basisu (ETC1S)
//   draco-ktx2.glb       both, as an optimized model usually is
// The encoders are development tools, not part of Jot. Run it from an empty scratch folder with them installed:
//   npm i @gltf-transform/core@4.5.1 @gltf-transform/extensions@4.5.1 @gltf-transform/functions@4.5.1 draco3dgltf@1.5.7 \
//         meshoptimizer@0.22.0 ktx2-encoder@0.6.0
//   cp <repo>/site/fixtures/scene/make-compressed.mjs . && node make-compressed.mjs <repo>/site/fixtures/scene
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, meshopt, reorder, quantize } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { ktx2 } from 'ktx2-encoder/gltf-transform';

const out = process.argv[2]; if (!out) throw new Error('Usage: node make-compressed.mjs <output folder>');

function png(w, h, pixel) { // a small RGBA PNG, written by hand so the texture is the same every time
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(pixel(x, y), y * (w * 4 + 1) + 1 + x * 4);
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4), sum = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type), data]); len.writeUInt32BE(data.length); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// The KTX2 encoder needs pixels; these are the textures png() wrote (RGBA, 8 bits, no row filters), so reading them back is short.
async function pixels(bytes) {
  const b = Buffer.from(bytes), idat = []; let at = 8, w = 0, h = 0;
  while (at < b.length) { const len = b.readUInt32BE(at), type = b.toString('latin1', at + 4, at + 8), data = b.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 6) throw new Error('Only RGBA 8-bit PNG here.'); }
    if (type === 'IDAT') idat.push(data); at += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) { if (raw[y * (w * 4 + 1)] !== 0) throw new Error('Row filters are not expected here.'); out.set(raw.subarray(y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1)), y * w * 4); }
  return { width: w, height: h, data: out };
}

function cube() {
  const doc = new Document(), buffer = doc.createBuffer();
  const pos = [], uv = [], nor = [], idx = [];
  const faces = [[[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]];
  for (const [n, u, v] of faces) {
    const b = pos.length / 3;
    for (const [s, t] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(n[0] + s * u[0] + t * v[0], n[1] + s * u[1] + t * v[1], n[2] + s * u[2] + t * v[2]); nor.push(...n); uv.push((s + 1) / 2, 1 - (t + 1) / 2); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const tile = png(64, 64, (x, y) => ((x >> 3) + (y >> 3)) % 2 ? [221, 108, 79, 255] : [244, 230, 196, 255]);
  const texture = doc.createTexture('checker').setImage(tile).setMimeType('image/png');
  const material = doc.createMaterial('clay').setBaseColorTexture(texture).setRoughnessFactor(0.8).setMetallicFactor(0);
  const prim = doc.createPrimitive().setAttribute('POSITION', acc('VEC3', new Float32Array(pos))).setAttribute('NORMAL', acc('VEC3', new Float32Array(nor)))
    .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(uv))).setIndices(acc('SCALAR', new Uint16Array(idx))).setMaterial(material);
  const node = doc.createNode('Cube').setMesh(doc.createMesh('Cube').addPrimitive(prim));
  doc.createScene('Scene').addChild(node);
  const s = Math.SQRT1_2, sampler = doc.createAnimationSampler().setInput(acc('SCALAR', new Float32Array([0, 1, 2]))).setOutput(acc('VEC4', new Float32Array([0, 0, 0, 1, 0, s, 0, s, 0, 1, 0, 0]))).setInterpolation('LINEAR');
  doc.createAnimation('Spin').addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(sampler));
  return doc;
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(), 'draco3d.decoder': await draco3d.createDecoderModule(), 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
await MeshoptEncoder.ready;
const variants = {
  'textured.glb': [],
  'draco.glb': [draco({ method: 'edgebreaker' })],
  'meshopt.glb': [reorder({ encoder: MeshoptEncoder }), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' })],
  'ktx2.glb': [ktx2({ isUASTC: false, qualityLevel: 128, generateMipmap: true, imageDecoder: pixels })],
  'draco-ktx2.glb': [ktx2({ isUASTC: false, qualityLevel: 128, generateMipmap: true, imageDecoder: pixels }), draco({ method: 'edgebreaker' })],
};
for (const [name, steps] of Object.entries(variants)) {
  const doc = cube(); if (steps.length) await doc.transform(...steps);
  const bytes = await io.writeBinary(doc); fs.writeFileSync(path.join(out, name), bytes);
  console.log(name, bytes.length, 'bytes', doc.getRoot().listExtensionsUsed().map((e) => e.extensionName).join(' ') || '(no extensions)');
}
