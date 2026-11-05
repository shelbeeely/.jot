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

export default { modelOf, modelProblems, vector, isModelType, LIGHTING, MODEL_TYPES };
