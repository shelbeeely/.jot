// Crafted parts for journal places (spec 8.1.9): a mug with a handle, an open notebook, a plant in a pot, a window with panes.
// A place names a part like any other shape (type, position, rotation, size, colour, glow); Jot draws it here from simple
// three.js pieces. Size is the part's bounding box (width, height, depth) and its position is the box's centre, as for a box.
// The colour is the part's main colour; the rest (paper, ink, wood, glass, leaves) is Jot's, so every day shares one look.
// Some parts have a surface Jot may draw on (userData.surface): a screen (tv, laptop, phone), a book's cover, a frame's picture.
//
//   PARTS                                          the part names a place may use
//   buildPart(T, type, size, colour, { material, glow })  -> Group centred on its box, or null for an unknown name

export const PARTS = Object.freeze(['mug', 'teapot', 'plate', 'bottle', 'book', 'notebook', 'papers', 'laptop', 'phone', 'lamp', 'candle', 'plant',
  'tree', 'chair', 'table', 'bed', 'sofa', 'shelf', 'window', 'door', 'rug', 'bag', 'umbrella', 'bench', 'clock', 'frame', 'bus', 'streetlight', 'shelter', 'tv']);

const CREAM = '#f3ecdc', INK = '#2c3350', WOOD = '#9a7357', DARK_WOOD = '#6a4c3b', GLASS = '#cfe0ea', LEAF = '#6f9a72', METAL = '#7c8590', SOIL = '#4a3a30';

export function buildPart(T, type, size, colour, { material, glow = false } = {}) {
  if (!PARTS.includes(type)) return null;
  const [w, h, d] = size, g = new T.Group(), shade = (c, l) => `#${new T.Color(c).offsetHSL(0, 0, l).getHexString()}`;
  const add = (geometry, c, at = [0, 0, 0], turn = [0, 0, 0], extra = {}) => {
    const m = new T.Mesh(geometry, material(c, extra)); m.position.set(at[0], at[1], at[2]); m.rotation.set(turn[0], turn[1], turn[2]); g.add(m); return m;
  };
  const box = (x, y, z, c, at, turn, extra) => add(new T.BoxGeometry(Math.max(x, 0.005), Math.max(y, 0.005), Math.max(z, 0.005)), c, at, turn, extra);
  const cyl = (r1, r2, hh, c, at, turn, extra, seg = 24) => add(new T.CylinderGeometry(Math.max(r1, 0.003), Math.max(r2, 0.003), Math.max(hh, 0.005), seg), c, at, turn, extra);
  const ball = (r, c, at, scale = [1, 1, 1], extra) => { const m = add(new T.SphereGeometry(Math.max(r, 0.005), 18, 12), c, at, [0, 0, 0], extra); m.scale.set(scale[0], scale[1], scale[2]); return m; };
  const ring = (r, tube, c, at, turn, extra, arc = Math.PI * 2) => add(new T.TorusGeometry(Math.max(r, 0.005), Math.max(tube, 0.002), 8, 24, arc), c, at, turn, extra);
  const light = (c, intensity = 1) => ({ emissive: c, emissiveIntensity: glow ? intensity : 0.12 });
  const bottom = -h / 2, r = Math.min(w, d) / 2;
  const legs = (top, inset, lw, c) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(lw, top - bottom, lw, c, [sx * (w / 2 - inset), (top + bottom) / 2, sz * (d / 2 - inset)]); };

  switch (type) {
    case 'mug': {
      const br = Math.min(w * 0.36, d / 2);
      cyl(br, br * 0.92, h, colour, [-w * 0.1, 0, 0]);
      cyl(br * 0.86, br * 0.86, 0.01, '#5b3b2a', [-w * 0.1, h / 2 - 0.012, 0]);
      ring(h * 0.26, Math.max(0.008, h * 0.06), colour, [-w * 0.1 + br + h * 0.12, 0, 0], [0, 0, 0], {}, Math.PI * 1.15).rotation.z = -Math.PI * 0.58;
      break;
    }
    case 'teapot': {
      ball(r * 0.8, colour, [0, -h * 0.08, 0], [1, (h * 0.75) / (r * 1.6), 1]);
      cyl(r * 0.25, r * 0.32, h * 0.12, shade(colour, -0.08), [0, h * 0.34, 0]); ball(r * 0.1, shade(colour, -0.12), [0, h * 0.44, 0]);
      cyl(r * 0.07, r * 0.13, w * 0.32, colour, [w * 0.36, h * 0.05, 0], [0, 0, -Math.PI / 3.2]);
      ring(h * 0.2, r * 0.07, colour, [-w * 0.38, -h * 0.05, 0], [0, 0, Math.PI / 2], {}, Math.PI);
      break;
    }
    case 'plate': cyl(w / 2, w / 2 * 0.8, h, colour); ring(w / 2 * 0.86, Math.max(0.004, h * 0.25), shade(colour, -0.06), [0, h / 2, 0], [Math.PI / 2, 0, 0]); break;
    case 'bottle': {
      cyl(r * 0.9, r * 0.95, h * 0.62, colour, [0, bottom + h * 0.31, 0], [0, 0, 0], { opacity: 0.85, transparent: true });
      cyl(r * 0.35, r * 0.9, h * 0.18, colour, [0, bottom + h * 0.71, 0], [0, 0, 0], { opacity: 0.85, transparent: true });
      cyl(r * 0.33, r * 0.33, h * 0.12, shade(colour, -0.2), [0, bottom + h * 0.86, 0]); cyl(r * 0.38, r * 0.38, h * 0.06, INK, [0, h / 2 - h * 0.03, 0]);
      break;
    }
    case 'book': {
      box(w, h, d, colour); box(w * 0.94, h * 0.78, d * 0.96, CREAM, [w * 0.03, 0, 0]);
      box(w * 0.06, h * 1.02, d * 1.01, shade(colour, -0.12), [-w / 2 + w * 0.03, 0, 0]);
      const cover = add(new T.PlaneGeometry(w * 0.86, d * 0.9), colour, [w * 0.03, h / 2 + 0.002, 0], [-Math.PI / 2, 0, 0]); cover.userData.surface = 'cover';
      break;
    }
    case 'notebook': { // open, lying flat: two pages rising gently from the gutter, ruled, with a ribbon
      box(w, h * 0.35, d, colour, [0, bottom + h * 0.175, 0]);
      for (const s of [-1, 1]) {
        const page = box(w * 0.48, h * 0.5, d * 0.94, CREAM, [s * w * 0.245, bottom + h * 0.6, 0], [0, 0, s * 0.06]);
        for (let i = 0; i < 6; i++) { const line = new T.Mesh(new T.BoxGeometry(w * 0.36, 0.003, 0.006), material('#b7aecb')); line.position.set(0, h * 0.26, -d * 0.36 + i * d * 0.13); page.add(line); }
      }
      box(w * 0.03, h * 0.05, d * 0.5, '#b0424f', [w * 0.05, h / 2, d * 0.3]);
      break;
    }
    case 'papers': for (let i = 0; i < 4; i++) box(w * (0.92 - i * 0.03), h / 4.5, d * (0.92 - i * 0.02), i % 2 ? CREAM : shade(colour, 0.1), [i * w * 0.02, bottom + h / 9 + i * h / 4, -i * d * 0.015], [0, (i - 1.5) * 0.12, 0]); break;
    case 'laptop': {
      box(w, h * 0.08, d * 0.62, colour, [0, bottom + h * 0.04, d * 0.19]); box(w * 0.8, h * 0.012, d * 0.36, shade(colour, -0.15), [0, bottom + h * 0.085, d * 0.15]);
      const lid = new T.Group(); lid.position.set(0, bottom + h * 0.08, -d * 0.12); lid.rotation.x = -0.28; g.add(lid);
      const s1 = new T.Mesh(new T.BoxGeometry(w, h * 0.9, 0.03), material(colour)); s1.position.y = h * 0.45; lid.add(s1);
      const s2 = new T.Mesh(new T.BoxGeometry(w * 0.88, h * 0.76, 0.005), material('#dfe7f5', { emissive: '#cfe0ff', emissiveIntensity: 0.35 })); s2.position.set(0, h * 0.46, 0.018); s2.userData.surface = 'screen'; lid.add(s2);
      break;
    }
    case 'phone': box(w, h, d, INK); box(w * 0.86, h * 0.88, 0.004, colour, [0, 0, d / 2 + 0.002], [0, 0, 0], { emissive: colour, emissiveIntensity: 0.3 }).userData.surface = 'screen'; break;
    case 'tv': { // a flat screen on a low stand (or on a wall, when the model hangs it there)
      box(w, h * 0.82, d * 0.35, INK, [0, bottom + h * 0.59, 0]);
      box(w * 0.94, h * 0.72, 0.006, '#1c2440', [0, bottom + h * 0.59, d * 0.18], [0, 0, 0], { emissive: '#3b4f8f', emissiveIntensity: 0.4 }).userData.surface = 'screen';
      box(w * 0.08, h * 0.16, d * 0.2, INK, [0, bottom + h * 0.1, 0]); box(w * 0.4, h * 0.03, d, INK, [0, bottom + h * 0.015, 0]);
      break;
    }
    case 'lamp': {
      cyl(r * 0.55, r * 0.65, h * 0.06, shade(colour, -0.15), [0, bottom + h * 0.03, 0]); cyl(r * 0.06, r * 0.06, h * 0.6, INK, [0, bottom + h * 0.36, 0]);
      cyl(r * 0.45, r, h * 0.36, colour, [0, h / 2 - h * 0.18, 0], [0, 0, 0], { side: T.DoubleSide, ...light(colour, 0.9) });
      ball(r * 0.18, '#fff3c4', [0, h / 2 - h * 0.3, 0], [1, 1, 1], light('#ffe9a8', 1.6));
      break;
    }
    case 'candle': cyl(r * 0.8, r * 0.85, h * 0.78, colour, [0, bottom + h * 0.39, 0]); add(new T.ConeGeometry(r * 0.35, h * 0.2, 12), '#ffcf6b', [0, h / 2 - h * 0.1, 0], [0, 0, 0], { emissive: '#ffb347', emissiveIntensity: glow ? 2 : 0.8 }); break;
    case 'plant': {
      cyl(r * 0.7, r * 0.5, h * 0.36, colour, [0, bottom + h * 0.18, 0]); cyl(r * 0.62, r * 0.62, 0.01, SOIL, [0, bottom + h * 0.35, 0]);
      for (let i = 0; i < 7; i++) { const a = i * 2.3, leaf = ball(r * 0.32, i % 2 ? LEAF : shade(LEAF, 0.06), [Math.cos(a) * r * 0.3, bottom + h * (0.5 + i * 0.065), Math.sin(a) * r * 0.3], [0.6, 2, 0.45]); leaf.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.6); }
      break;
    }
    case 'tree': {
      cyl(r * 0.1, r * 0.14, h * 0.45, DARK_WOOD, [0, bottom + h * 0.225, 0]);
      ball(r * 0.62, colour, [0, bottom + h * 0.58, 0], [1, 0.85, 1]); ball(r * 0.46, shade(colour, 0.05), [r * 0.25, bottom + h * 0.78, r * 0.1]); ball(r * 0.4, shade(colour, -0.05), [-r * 0.28, bottom + h * 0.72, -r * 0.12]);
      break;
    }
    case 'chair': {
      const seat = bottom + h * 0.46; box(w, h * 0.06, d, colour, [0, seat, 0]); legs(seat, w * 0.08, Math.min(w, d) * 0.08, shade(colour, -0.12));
      box(w, h * 0.48, d * 0.08, colour, [0, seat + h * 0.27, -d / 2 + d * 0.04]);
      break;
    }
    case 'table': { const top = h / 2 - h * 0.03; box(w, h * 0.06, d, colour, [0, top, 0]); legs(top - h * 0.03, Math.min(w, d) * 0.08, Math.min(w, d) * 0.07, shade(colour, -0.14)); break; }
    case 'bed': {
      box(w, h * 0.3, d, WOOD, [0, bottom + h * 0.15, 0]); box(w * 0.96, h * 0.2, d * 0.96, CREAM, [0, bottom + h * 0.4, 0]);
      box(w * 0.98, h * 0.08, d * 0.62, colour, [0, bottom + h * 0.52, d * 0.18]); box(w * 0.42, h * 0.12, d * 0.18, '#ffffff', [-w * 0.2, bottom + h * 0.55, -d * 0.36]); box(w * 0.42, h * 0.12, d * 0.18, '#ffffff', [w * 0.22, bottom + h * 0.55, -d * 0.36]);
      box(w, h, d * 0.06, WOOD, [0, 0, -d / 2 + d * 0.03]);
      break;
    }
    case 'sofa': {
      box(w, h * 0.35, d, shade(colour, -0.08), [0, bottom + h * 0.175, 0]); box(w * 0.8, h * 0.14, d * 0.8, colour, [0, bottom + h * 0.42, d * 0.06]);
      box(w, h * 0.55, d * 0.24, colour, [0, bottom + h * 0.6, -d / 2 + d * 0.12]); for (const s of [-1, 1]) box(w * 0.1, h * 0.55, d, colour, [s * (w / 2 - w * 0.05), bottom + h * 0.28, 0]);
      break;
    }
    case 'shelf': {
      for (const s of [-1, 1]) box(w * 0.05, h, d, colour, [s * (w / 2 - w * 0.025), 0, 0]); box(w, h, d * 0.05, shade(colour, -0.1), [0, 0, -d / 2 + d * 0.025]);
      const hues = ['#b0424f', '#3f6e9a', '#d9b25c', '#6f9a72', '#8a6fb0', '#e0d6c3'];
      for (let k = 0; k < 4; k++) {
        const y = bottom + (k * h) / 3.4; box(w, h * 0.03, d, colour, [0, y, 0]);
        if (k < 3) for (let i = 0; i < 6; i++) box(w * 0.1, h * 0.2 * (0.8 + ((i * 7 + k) % 3) * 0.1), d * 0.7, hues[(i + k) % hues.length], [-w * 0.36 + i * w * 0.14, y + h * 0.11, 0]);
      }
      break;
    }
    case 'window': {
      box(w, h, d * 0.5, '#dfeaf2', [0, 0, -d * 0.1], [0, 0, 0], { emissive: '#dfeaf2', emissiveIntensity: 0.25, roughness: 0.3 });
      const t = Math.min(w, h) * 0.06;
      for (const s of [-1, 1]) { box(t, h, d, colour, [s * (w / 2 - t / 2), 0, 0]); box(w, t, d, colour, [0, s * (h / 2 - t / 2), 0]); }
      box(t * 0.6, h, d * 0.8, colour); box(w, t * 0.6, d * 0.8, colour); box(w * 1.08, t, d * 2.2, colour, [0, bottom - t / 2, d * 0.4]);
      break;
    }
    case 'door': box(w, h, d, colour); box(w * 1.1, h * 1.04, d * 0.6, shade(colour, -0.12), [0, h * 0.02, -d * 0.3]); ball(Math.min(w, h) * 0.04, '#d9b25c', [w * 0.36, -h * 0.02, d / 2 + 0.01]); break;
    case 'rug': { const m = cyl(0.5, 0.5, h, colour, [0, 0, 0], [0, 0, 0], {}, 40); m.scale.set(w, 1, d); const b = ring(0.46, 0.012, shade(colour, 0.12), [0, h / 2, 0], [Math.PI / 2, 0, 0]); b.scale.set(w, d, 1); break; }
    case 'bag': box(w, h * 0.7, d, colour, [0, bottom + h * 0.35, 0]); box(w * 1.01, h * 0.22, d * 1.02, shade(colour, -0.1), [0, bottom + h * 0.6, 0]); ring(w * 0.28, Math.min(w, d) * 0.04, shade(colour, -0.15), [0, bottom + h * 0.7, 0], [0, 0, 0], {}, Math.PI); break;
    case 'umbrella': {
      add(new T.ConeGeometry(Math.max(w, d) / 2, h * 0.3, 16, 1, true), colour, [0, h / 2 - h * 0.15, 0], [0, 0, 0], { side: T.DoubleSide });
      cyl(0.012, 0.012, h * 0.85, INK, [0, bottom + h * 0.425, 0]); ring(0.05, 0.012, INK, [0.05, bottom + 0.02, 0], [0, 0, Math.PI], {}, Math.PI);
      break;
    }
    case 'bench': {
      const seat = bottom + h * 0.45; for (let i = 0; i < 3; i++) box(w, h * 0.04, d * 0.28, colour, [0, seat, -d / 2 + d * 0.16 + i * d * 0.3]);
      for (let i = 0; i < 2; i++) box(w, h * 0.08, d * 0.06, colour, [0, seat + h * 0.2 + i * h * 0.17, -d / 2 + d * 0.03], [-0.15, 0, 0]);
      for (const s of [-1, 1]) { box(w * 0.04, seat - bottom, d * 0.9, METAL, [s * w * 0.42, (seat + bottom) / 2, 0]); box(w * 0.04, h * 0.5, d * 0.06, METAL, [s * w * 0.42, seat + h * 0.22, -d / 2 + d * 0.03]); }
      break;
    }
    case 'clock': {
      cyl(Math.min(w, h) / 2, Math.min(w, h) / 2, d, CREAM, [0, 0, 0], [Math.PI / 2, 0, 0]); ring(Math.min(w, h) / 2, d * 0.5, colour, [0, 0, 0]);
      box(0.012, Math.min(w, h) * 0.3, 0.006, INK, [0, Math.min(w, h) * 0.12, d / 2 + 0.004]); box(Math.min(w, h) * 0.24, 0.012, 0.006, INK, [Math.min(w, h) * 0.1, 0, d / 2 + 0.004]);
      break;
    }
    case 'frame': box(w, h, d, colour); box(w * 0.8, h * 0.8, 0.004, shade(colour, 0.3), [0, 0, d / 2 + 0.002]).userData.surface = 'picture'; box(w * 0.6, h * 0.35, 0.004, LEAF, [0, -h * 0.15, d / 2 + 0.004]); ball(Math.min(w, h) * 0.08, '#f4d27a', [w * 0.18, h * 0.18, d / 2 + 0.006], [1, 1, 0.2]); break;
    case 'bus': {
      box(w, h * 0.78, d, colour, [0, bottom + h * 0.5, 0]); box(w * 0.92, h * 0.26, d * 1.01, '#cfe0ea', [0, bottom + h * 0.66, 0], [0, 0, 0], { emissive: '#ffe9b0', emissiveIntensity: 0.25, roughness: 0.3 });
      box(w * 1.005, h * 0.08, d * 1.005, shade(colour, -0.15), [0, bottom + h * 0.2, 0]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(h * 0.13, h * 0.13, d * 0.12, INK, [sx * w * 0.32, bottom + h * 0.13, sz * d * 0.47], [Math.PI / 2, 0, 0]);
      break;
    }
    case 'streetlight': {
      cyl(r * 0.06, r * 0.08, h * 0.95, METAL, [0, bottom + h * 0.475, 0]); box(w * 0.5, h * 0.03, r * 0.12, METAL, [w * 0.2, h / 2 - h * 0.05, 0]);
      add(new T.ConeGeometry(r * 0.3, h * 0.08, 12), INK, [w * 0.42, h / 2 - h * 0.08, 0]); ball(r * 0.12, '#fff3c4', [w * 0.42, h / 2 - h * 0.12, 0], [1, 0.6, 1], light('#ffd98a', 1.8));
      break;
    }
    case 'shelter': {
      box(w, h * 0.05, d, colour, [0, h / 2 - h * 0.025, 0]); for (const s of [-1, 1]) box(w * 0.03, h, w * 0.03, METAL, [s * (w / 2 - w * 0.02), 0, -d / 2 + w * 0.02]);
      box(w * 0.96, h * 0.75, d * 0.03, GLASS, [0, h * 0.05, -d / 2 + d * 0.02], [0, 0, 0], { opacity: 0.55, transparent: true, roughness: 0.2 });
      box(w * 0.7, h * 0.04, d * 0.3, WOOD, [0, bottom + h * 0.2, -d * 0.25]);
      break;
    }
  }
  return g;
}
export default { PARTS, buildPart };
