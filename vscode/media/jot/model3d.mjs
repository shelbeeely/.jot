/** Jot 3D models, draft 0.1: what a `:::record model` holds, as plain data. No DOM, so the parser's warnings, the preview
 * (preview.mjs), the EPUB export and the tests all read a model the same way. The viewer is model3d-view.mjs.
 *
 *   :::record model #garden-bed
 *   label: The garden bed in October
 *   file: media/1b4e…  A clay model of the raised bed with three seedlings   (an attached .glb, then its description)
 *   poster: media/9c2d…                     (optional: a still picture, shown wherever the model is not turned in 3D)
 *   camera: 2, 1.5, 3                       (optional: where the camera starts, x, y, z in the model's units)
 *   target: 0, 0.4, 0                       (optional: the point it looks at; absent, the middle of the model)
 *   lighting: soft                          (soft | studio | dim; absent, soft)
 *   background: #f4efe4                     (optional: #RRGGBB or #RGB; absent, the page shows through)
 *   animation: Grow                         (optional: a named animation in the model, played only when the reader asks)
 *   caption: Built from scraps on Sunday.
 *   credit: Model by me
 *   :::
 *
 * A model is data, never code: the file is a self-contained glTF file (binary .glb, or .gltf with everything embedded) already in
 * the journal, and every interaction comes from the reader. A field that does not fit is kept as written and listed in `invalid`;
 * the parser warns about it (`invalid-model-field`, `model-without-file`).
 *
 *   modelOf(record)        { title, file: { path, alt } | null, poster, camera, target, lighting, background, animation, caption,
 *                            credit, invalid: [{ name, value, why }], rest: [{ name, value }] }
 *   modelProblems(record)  [{ code, message, field }] for the parser
 *   isModelType(type)      a glTF media type
 *   gltfExtensions(bytes)  { used: [...], required: [...] } from a .glb or .gltf file's own JSON, or null when it is not glTF
 *   decodersFor(bytes)     the decoder files (vendor/three-decoders/) a model needs: Draco meshes, Basis Universal (KTX2) textures.
 *                          meshopt (EXT_meshopt_compression) is built into vendor/three.mjs and needs none.
 */
import { COLOR } from './palette.mjs';

export const LIGHTING = ['soft', 'studio', 'dim'];
export const MODEL_TYPES = { glb: 'model/gltf-binary', gltf: 'model/gltf+json' };
export const isModelType = (type) => /^model\/gltf(-binary|\+json)$/i.test(String(type || '').split(';')[0].trim());
const LIMIT = 1e4; // camera and target coordinates, in model units
const KNOWN = new Set(['label', 'file', 'poster', 'camera', 'target', 'lighting', 'background', 'animation', 'caption', 'credit']);

/** "2, 1.5, 3" or "2 1.5 3" -> [2, 1.5, 3], or null when it is not three finite numbers within ±10,000. */
export function vector(value) {
  const parts = String(value ?? '').trim().split(/\s*,\s*|\s+/).filter(Boolean);
  if (parts.length !== 3 || !parts.every((p) => /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(p))) return null;
  const v = parts.map(Number);
  return v.every((n) => Number.isFinite(n) && Math.abs(n) <= LIMIT) ? v : null;
}
const split = (value) => { const m = /^(\S+)(?:[ \t]+(.*))?$/s.exec(String(value ?? '').trim()); return m ? { path: m[1], alt: (m[2] || '').trim() } : null; };
const hex = (raw) => { const m = COLOR.exec(raw); if (!m || m[2]) return null; return '#' + (m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]).toLowerCase(); };

export function modelOf(record) {
  const out = { title: '', file: null, poster: null, camera: null, target: null, lighting: 'soft', background: null, animation: '', caption: '', credit: '', invalid: [], rest: [] };
  const bad = (name, value, why) => out.invalid.push({ name, value, why });
  for (const { name, value } of record?.fields || []) {
    const v = String(value ?? '').trim();
    if (!KNOWN.has(name)) { out.rest.push({ name, value }); continue; }
    if (name === 'label') out.title ||= v;
    else if (name === 'caption' || name === 'credit') out[name] ||= v;
    else if (name === 'animation') out.animation ||= v;
    else if (name === 'file' || name === 'poster') {
      const ref = split(v);
      if (!ref) bad(name, value, `${name} names an attached file`);
      else if (out[name]) bad(name, value, `a model has one ${name}`);
      else out[name] = { path: ref.path, alt: ref.alt };
    } else if (name === 'camera' || name === 'target') {
      const p = vector(v);
      if (!p) bad(name, value, `${name} is three numbers, x, y, z`); else if (!out[name]) out[name] = p;
    } else if (name === 'lighting') {
      if (LIGHTING.includes(v.toLowerCase())) out.lighting = v.toLowerCase(); else bad(name, value, `lighting is ${LIGHTING.join(', ')}`);
    } else if (name === 'background') {
      const h = hex(v); if (h) out.background = h; else bad(name, value, 'background is a color, #RRGGBB or #RGB');
    }
  }
  if (!out.title) out.title = out.file?.alt || 'A 3D model';
  return out;
}

/** The parser's warnings for one model record: the field each is about, so it points at the right line. */
export function modelProblems(record) {
  const s = modelOf(record), problems = [];
  if (!s.file) problems.push({ code: 'model-without-file', message: 'A 3D model needs file: and the path of an attached .glb or .gltf file.', field: null });
  for (const x of s.invalid) problems.push({ code: 'invalid-model-field', message: `Model ${x.name}: ${x.why}. It is kept as written.`, field: x });
  return problems;
}

/** The glTF extensions a model declares, read from its own JSON (the first chunk of a .glb). Never runs or fetches anything. */
export function gltfExtensions(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  let json;
  try {
    if (b.length >= 20 && b[0] === 0x67 && b[1] === 0x6c && b[2] === 0x54 && b[3] === 0x46) { // 'glTF'
      const view = new DataView(b.buffer, b.byteOffset, b.byteLength), length = view.getUint32(12, true);
      if (view.getUint32(16, true) !== 0x4e4f534a || 20 + length > b.length) return null; // 'JSON'
      json = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + length)));
    } else json = JSON.parse(new TextDecoder().decode(b));
  } catch { return null; }
  if (!json || typeof json !== 'object' || !json.asset) return null;
  const list = (x) => (Array.isArray(x) ? x.filter((e) => typeof e === 'string') : []);
  return { used: list(json.extensionsUsed), required: list(json.extensionsRequired) };
}
export const DECODERS = { KHR_draco_mesh_compression: ['draco_wasm_wrapper.js', 'draco_decoder.wasm'], KHR_texture_basisu: ['basis_transcoder.js', 'basis_transcoder.wasm'] };
export function decodersFor(bytes) { const ext = gltfExtensions(bytes); return ext ? ext.used.flatMap((e) => DECODERS[e] || []) : []; }

export default { modelOf, modelProblems, gltfExtensions, decodersFor, DECODERS, vector, isModelType, LIGHTING, MODEL_TYPES };
