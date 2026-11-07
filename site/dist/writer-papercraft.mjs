import { PARTS, buildPart } from './writer-scene-parts.mjs';

// Draws a journal place (scene-journal-core.mjs validatePlace / readPlaceFile) as papercraft, with the bundled three.js
// (globalThis.JotThree). The place is data, never code: simple shapes and Jot's crafted parts with sizes and colours.
//
// Everything is paper. Each thing the model placed is printed face-on as a die-cut piece of card (an ink outline, a white cut
// margin, grain) with real thickness, so its edges show. Standing pieces are glued in layers on panels that stand on scored
// creases, one hinge per layer and page; side walls stand as wings; the floor is printed on the pages; the sky's pieces stand on
// folded stalks at the back. Opening a spread lands the page first, then raises its scenery on its hinges, back to front. Closing
// or turning folds every piece flat, front to back, before the page moves. With reduced motion (or Pause motion) everything simply
// stands. Each piece group carries userData.object (its index), so a click can find it.
//
// media (optional) is the day's own: { screen: { label, title, picture? }, book: { title, picture? }, picture }, printed onto the
// pieces whose parts have a surface (a screen, a book's cover, a frame); nothing is fetched.
//
//   buildPlace(T, place, { reduced, document, media, enter }) -> { root, objects, pickables, boxOf(i), background, bounds, frame,
//     fog, moving, unfolding, update(seconds, { motion }), settle(), leave(direction), hover(i), hop(i), highlight(i), inspect(),
//     dispose() }
//   traceOutlines(filled, width, height) -> [{ points: [[x, y]...], holes: [[[x, y]...]] }]   (grid cells, y down)

const LIGHT = { morning: ['#ffe0b5', 2.0, 0.95], day: ['#ffffff', 2.2, 1.0], evening: ['#ffb27a', 1.5, 0.9], night: ['#9db1ff', 0.9, 0.8] };
const GLOW = { morning: 0.5, day: 0.35, evening: 1.2, night: 1.8 };
const ATMOSPHERE = {
  neutral: { key: '#ffffff', keyScale: 1, fill: 1, sat: 0, light: 0, glow: 1, speed: 1 },
  calm: { key: '#eef3ff', keyScale: 0.9, fill: 1.1, sat: -0.06, light: 0.03, glow: 1, speed: 0.7 },
  cosy: { key: '#ffd7a3', keyScale: 0.95, fill: 1, sat: 0.03, light: 0, glow: 1.4, speed: 0.8 },
  bright: { key: '#fff4dc', keyScale: 1.2, fill: 1.15, sat: 0.08, light: 0.05, glow: 1, speed: 1.1 },
  lively: { key: '#fff0d2', keyScale: 1.15, fill: 1.05, sat: 0.14, light: 0.03, glow: 1.1, speed: 1.4 },
  tender: { key: '#ffe2dc', keyScale: 0.9, fill: 1.15, sat: -0.02, light: 0.05, glow: 1.2, speed: 0.8 },
  wistful: { key: '#dde5ff', keyScale: 0.85, fill: 1, sat: -0.14, light: 0.02, glow: 1, speed: 0.6 },
  heavy: { key: '#c7d0e0', keyScale: 0.7, fill: 0.85, sat: -0.22, light: -0.05, glow: 0.8, speed: 0.5 },
  tense: { key: '#e6edff', keyScale: 1.15, fill: 0.7, sat: -0.05, light: -0.03, glow: 1, speed: 1.3 },
};
// Jot's brand (docs/brand/README.md): ink blue covers, cream paper, a charcoal room.
const PAPER = '#f3ecdc', EDGE = '#efe5cf', COVER = '#1f3a8a', INK = '#2f2b33', CHARCOAL = '#242622';
const CARD = 0.012, GAP = 0.016, PPM = 170, CELL = 4; // card thickness, layer spacing, print pixels per metre, trace cell in pixels
const seeded = (i) => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const backOut = (x) => { const c = 1.4; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const easeIn = (x) => x * x * x, easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

function geometry(T, s) {
  const [x, y, z] = s.size;
  switch (s.type) {
    case 'box': return new T.BoxGeometry(x, y, z);
    case 'cylinder': return new T.CylinderGeometry(x, z, y, 20);
    case 'cone': return new T.ConeGeometry(x, y, 20);
    case 'torus': return new T.TorusGeometry(x, Math.min(y, x), 10, 28);
    case 'plane': return new T.PlaneGeometry(x, z).rotateX(-Math.PI / 2);
    case 'capsule': return new T.CapsuleGeometry(x, y, 6, 14);
    default: return new T.SphereGeometry(1, 18, 12);
  }
}

// ---- tracing a print's cut line --------------------------------------------------------------------------------------------
// filled: a Uint8Array of width × height grid cells (1 = paper). Returns the outer loops, each with the holes inside it, as grid
// corner points (y down), simplified. Loops smaller than four cells are dropped.
export function traceOutlines(filled, width, height) {
  const at = (x, y) => (x >= 0 && y >= 0 && x < width && y < height ? filled[y * width + x] : 0);
  const out = new Map(), key = (x, y) => y * (width + 1) + x; // outgoing boundary edges by start corner
  const add = (x0, y0, x1, y1) => { const k = key(x0, y0); if (!out.has(k)) out.set(k, []); out.get(k).push([x1, y1]); };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!at(x, y)) continue; // each filled cell's boundary sides, clockwise on screen, so paper is always on the same side
    if (!at(x, y - 1)) add(x, y, x + 1, y);
    if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!at(x - 1, y)) add(x, y + 1, x, y);
  }
  const loops = [];
  for (const [start, list] of out) {
    while (list.length) {
      const sx = start % (width + 1), sy = Math.floor(start / (width + 1)), loop = [[sx, sy]];
      let [x, y] = list.pop(), px = sx, py = sy, guard = 0;
      while ((x !== sx || y !== sy) && guard++ < 4 * width * height + 8) {
        loop.push([x, y]);
        const next = out.get(key(x, y)); if (!next?.length) break;
        let pick = 0; // at a corner where two pieces touch, keep turning the same way so loops stay simple
        if (next.length > 1) { const dx = x - px, dy = y - py; pick = next.findIndex(([nx, ny]) => (nx - x) * dy - (ny - y) * dx > 0); if (pick < 0) pick = 0; }
        const [nx, ny] = next.splice(pick, 1)[0]; px = x; py = y; x = nx; y = ny;
      }
      if (loop.length >= 4) loops.push(loop);
    }
  }
  const area = (pts) => pts.reduce((n, p, k) => { const q = pts[(k + 1) % pts.length]; return n + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const simplified = loops.map((pts) => simplify(pts)).filter((pts) => pts.length >= 3 && Math.abs(area(pts)) >= 4);
  const outers = simplified.filter((pts) => area(pts) > 0).map((points) => ({ points, holes: [] }));
  const inside = ([x, y], pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  for (const hole of simplified.filter((pts) => area(pts) < 0)) {
    const probe = [(hole[0][0] + hole[1][0]) / 2, (hole[0][1] + hole[1][1]) / 2];
    const owner = outers.find((o) => inside(probe, o.points)); if (owner) owner.holes.push(hole);
  }
  return outers;
}
function simplify(pts, eps = 0.8) { // drop points on straight runs, then Ramer–Douglas–Peucker on the closed loop
  const run = pts.filter((p, k) => { const a = pts[(k - 1 + pts.length) % pts.length], b = pts[(k + 1) % pts.length]; return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0; });
  if (run.length < 8) return run;
  const rdp = (list) => {
    if (list.length < 3) return list;
    const [ax, ay] = list[0], [bx, by] = list[list.length - 1], len = Math.hypot(bx - ax, by - ay) || 1;
    let far = 0, idx = 0;
    for (let k = 1; k < list.length - 1; k++) { const d = Math.abs((bx - ax) * (ay - list[k][1]) - (ax - list[k][0]) * (by - ay)) / len; if (d > far) { far = d; idx = k; } }
    return far > eps ? [...rdp(list.slice(0, idx + 1)).slice(0, -1), ...rdp(list.slice(idx))] : [list[0], list[list.length - 1]];
  };
  const half = Math.floor(run.length / 2), a = rdp(run.slice(0, half + 1)), b = rdp([...run.slice(half), run[0]]);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

// ---- drawing on paper ------------------------------------------------------------------------------------------------------
function titleCard(T, doc, { label = '', title = '', colour = '#1f3a8a', aspect = 1.6, glyph = '' }) {
  const c = doc.createElement('canvas'); c.width = 512; c.height = Math.max(96, Math.min(1024, Math.round(512 / aspect)));
  const g = c.getContext('2d'), pad = 40, room = c.width - 2 * pad, base = Math.min(c.width, c.height);
  const grad = g.createLinearGradient(0, 0, c.width, c.height); grad.addColorStop(0, colour); grad.addColorStop(1, `#${new T.Color(colour).offsetHSL(0, 0, -0.12).getHexString()}`);
  g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height); g.textBaseline = 'top';
  let y = pad;
  if (label) { g.fillStyle = '#cbd5eb'; g.font = `700 ${Math.round(base * 0.075)}px "Jot Sans", sans-serif`; g.fillText(label.toUpperCase(), pad, y, room); y += base * 0.16; }
  const size = Math.round(base * (label ? 0.12 : 0.11)); g.font = `700 ${size}px "Jot Sans", sans-serif`; g.fillStyle = '#fffdf6';
  const lines = []; let line = '';
  for (const word of String(title).split(/\s+/).filter(Boolean)) { const t = line ? `${line} ${word}` : word; if (line && g.measureText(t).width > room) { lines.push(line); line = word; } else line = t; }
  if (line) lines.push(line);
  lines.slice(0, 4).forEach((l, i) => g.fillText(l, pad, y + i * size * 1.18, room));
  if (glyph) { g.font = `${Math.round(base * 0.13)}px sans-serif`; g.fillText(glyph, c.width - pad - base * 0.13, c.height - pad - base * 0.13); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function pictureTexture(T, doc, image, aspect) { // the picture, cropped to fill its frame
  const c = doc.createElement('canvas'); c.width = 512; c.height = Math.max(64, Math.min(1024, Math.round(512 / aspect)));
  const g = c.getContext('2d'), iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height, k = Math.max(c.width / iw, c.height / ih);
  g.drawImage(image, (c.width - iw * k) / 2, (c.height - ih * k) / 2, iw * k, ih * k);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
// Grain laid over a print from one small tile (fast), only where there is paper.
let grainTile = null;
const grainOver = (doc, g, w, h) => {
  if (!grainTile) { grainTile = doc.createElement('canvas'); grainTile.width = grainTile.height = 96; const x = grainTile.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 96, 96); grain(x, 96, 96, 70); }
  g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.16; g.fillStyle = g.createPattern(grainTile, 'repeat'); g.fillRect(0, 0, w, h); g.restore();
};
const grain = (g, w, h, spread = 16, onlyPaper = false) => {
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) { if (onlyPaper && !img.data[i * 4 + 3]) continue; const n = seeded(i * 0.37 + 0.5) * spread - spread / 2; for (let k = 0; k < 3; k++) img.data[i * 4 + k] = Math.max(0, Math.min(255, img.data[i * 4 + k] + n)); }
  g.putImageData(img, 0, 0);
};
// The sky's pieces, drawn flat (they are printed and die-cut like everything else).
function skyArt(doc, place) {
  const draw = (w, h, paint) => { const c = doc.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); paint(g); return c; };
  const disc = (g, x, y, r, colour) => { g.fillStyle = colour; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const sky = [], wet = ['rain', 'fog', 'snow'].includes(place.weather);
  if (place.time === 'night') {
    sky.push({ kind: 'moon', size: 0.8, glow: true, canvas: draw(256, 256, (g) => { disc(g, 128, 128, 96, '#f4f0dc'); g.globalCompositeOperation = 'destination-out'; disc(g, 170, 104, 84, '#000'); }) });
    for (let i = 0; i < 2; i++) sky.push({ kind: 'star', size: 0.34, glow: true, canvas: draw(128, 128, (g) => { g.fillStyle = '#fff3c4'; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 22 : 54, a = -Math.PI / 2 + (k * Math.PI) / 5; g.lineTo(64 + r * Math.cos(a), 64 + r * Math.sin(a)); } g.closePath(); g.fill(); }) });
  } else if (!wet) {
    const colour = { morning: '#f6c862', evening: '#ff9a5c' }[place.time] || '#fbe08a';
    sky.push({ kind: 'sun', size: place.time === 'evening' ? 1 : 0.85, glow: true, canvas: draw(256, 256, (g) => { g.strokeStyle = colour; g.lineWidth = 14; g.lineCap = 'round'; for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; g.beginPath(); g.moveTo(128 + 80 * Math.cos(a), 128 + 80 * Math.sin(a)); g.lineTo(128 + 110 * Math.cos(a), 128 + 110 * Math.sin(a)); g.stroke(); } disc(g, 128, 128, 66, colour); }) });
  }
  if (place.weather !== 'sun') for (let i = 0; i < (wet ? 3 : 2); i++) {
    const colour = wet ? '#aab3c0' : '#ffffff';
    sky.push({ kind: 'cloud', size: 1.3, canvas: draw(360, 200, (g) => { g.fillStyle = colour; g.beginPath(); for (const [x, y, r] of [[120, 120, 56], [190, 92, 62], [258, 118, 52], [80, 138, 38], [300, 140, 34], [180, 146, 50]]) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); } g.fill(); }) });
  }
  if (place.weather === 'fog') sky.push({ kind: 'fog', size: 3, canvas: draw(512, 160, (g) => { g.fillStyle = '#eef1f4'; g.beginPath(); g.moveTo(0, 160); for (let x = 0; x <= 512; x += 16) g.lineTo(x, 60 + Math.sin(x / 40) * 18 + Math.sin(x / 13) * 6); g.lineTo(512, 160); g.closePath(); g.fill(); }) });
  return sky;
}

// One WebGL context prints every piece, reused across days.
let printer = null;
function printRenderer(T) {
  if (!printer) { printer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); printer.outputColorSpace = T.SRGBColorSpace; printer.setPixelRatio(1); }
  return printer;
}

// enter: how the book comes in. 'open' (closed, opened as an English book is: the left half swings over to the left), 'next' (a page
// turned forward comes over from the right) or 'prev' (turned back, from the left).
export function buildPlace(T, place, { reduced = false, document: doc = globalThis.document, media = null, enter = 'open' } = {}) {
  const canDraw = !!doc?.createElement && typeof doc.createElement('canvas')?.getContext === 'function';
  const root = new T.Group(), textures = [], disposables = [], objects = [], pickables = [], pieces = new Map();
  const hinges = []; // { group, axis: 'x'|'z', flat, rank, kind }
  const motions = [], lights = [], hanging = [];
  const mood = ATMOSPHERE[place.atmosphere] || ATMOSPHERE.neutral;
  const [tint, sun, hemi] = LIGHT[place.time] || LIGHT.day, glow = (GLOW[place.time] ?? 0.4) * mood.glow;
  const grade = (c) => new T.Color(c).offsetHSL(0, mood.sat, mood.light).lerp(new T.Color(PAPER), 0.1);
  const keep = (x) => { disposables.push(x); return x; };
  const tex = (canvas) => { const t = new T.CanvasTexture(canvas); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; textures.push(t); return t; };

  // ---- the place in the reader's frame: the book squared to the place, the reader at +z ----
  const toward = new T.Vector3(place.camera.position[0] - place.camera.target[0], 0, place.camera.position[2] - place.camera.target[2]);
  const turn = toward.lengthSq() < 1e-6 ? 0 : Math.round(Math.atan2(toward.x, toward.z) / (Math.PI / 2)) * (Math.PI / 2);
  const shapeMat = (c, extra = {}) => keep(new T.MeshStandardMaterial({ color: grade(c), roughness: 1, metalness: 0, flatShading: true, ...extra, ...(extra.emissive ? { emissive: grade(extra.emissive) } : {}) }));
  const things = place.objects.map((o, index) => {
    const shapes = new T.Group();
    for (const s of o.shapes) {
      let piece = PARTS.includes(s.type) ? buildPart(T, s.type, s.size, s.color, { material: shapeMat, glow: s.glow }) : null;
      if (!piece) { piece = new T.Mesh(geometry(T, s), shapeMat(s.color, s.glow ? { emissive: s.color, emissiveIntensity: 0.7 } : {})); if (s.type === 'sphere') piece.scale.set(...s.size); }
      piece.position.set(...s.position); piece.rotation.set(...s.rotation); shapes.add(piece);
    }
    shapes.position.set(...o.position); shapes.rotation.set(...o.rotation);
    const holder = new T.Group(); holder.rotation.y = -turn; holder.add(shapes); holder.updateMatrixWorld(true);
    return { o, index, holder, box: new T.Box3().setFromObject(holder), glow: o.shapes.some((s) => s.glow) };
  });
  const all = new T.Box3(); for (const t of things) if (!t.box.isEmpty()) all.union(t.box);
  if (all.isEmpty()) all.set(new T.Vector3(-1, 0, -1), new T.Vector3(1, 1, 1));
  const cx = (all.min.x + all.max.x) / 2, cz = (all.min.z + all.max.z) / 2;
  for (const t of things) { t.holder.position.set(-cx, 0, -cz); t.holder.updateMatrixWorld(true); t.box.setFromObject(t.holder); }
  all.makeEmpty(); for (const t of things) if (!t.box.isEmpty()) all.union(t.box);
  for (const t of things) {
    const b = t.box, dx = b.max.x - b.min.x, dz = b.max.z - b.min.z, dy = b.max.y - b.min.y;
    t.kind = b.isEmpty() ? 'none' : (b.max.y <= 0.14 && b.min.y <= 0.08 && !t.glow) ? 'flat' : (dz > 1.2 && dz > dx * 3 && dy > 0.6) ? 'wing' : 'standing';
    t.resting = t.kind === 'standing' && b.min.y > 0.15;
  }
  // The day's own media, printed onto the surfaces that can show it.
  if (media && canDraw) for (const t of things) t.holder.traverse((m) => {
    const kind = m.userData?.surface; if (!m.isMesh || !kind) return;
    const p = m.geometry.parameters || {}, aspect = (p.width || 1) / (p.height || p.depth || 1); let map = null;
    try {
      if (kind === 'screen' && media.screen?.picture) map = pictureTexture(T, doc, media.screen.picture, aspect);
      else if (kind === 'screen' && media.screen) map = titleCard(T, doc, { label: media.screen.label, title: media.screen.title, aspect, glyph: '▶' });
      else if (kind === 'cover' && media.book?.picture) map = pictureTexture(T, doc, media.book.picture, aspect);
      else if (kind === 'cover' && media.book) map = titleCard(T, doc, { title: media.book.title, colour: `#${m.material.color.getHexString()}`, aspect });
      else if (kind === 'picture' && media.picture) map = pictureTexture(T, doc, media.picture, aspect);
    } catch { map = null; }
    if (!map) return; textures.push(map); m.material = keep(new T.MeshBasicMaterial({ map }));
  });

  // ---- printing: a set of things drawn flat (face-on, from a side, or from above), with ink and a die-cut margin ----
  function print(list, { view = 'front', x0 = -Infinity, x1 = Infinity, margin = true } = {}) {
    if (!canDraw) return null;
    const b = new T.Box3(); for (const t of list) b.union(t.box);
    const lo = Math.max(b.min.x, x0), hi = Math.min(b.max.x, x1); if (hi - lo < 0.02 && view !== 'left' && view !== 'right') return null;
    const pad = margin ? 0.05 : 0.01, ground = view !== 'top' && b.min.y <= 0.05; // pieces on the ground are cut along the page
    let u0, u1, v0, v1; // the print's extent: u across, v up (metres)
    if (view === 'top') { u0 = lo - pad; u1 = hi + pad; v0 = -(b.max.z + pad); v1 = -(b.min.z - pad); }
    else if (view === 'left') { u0 = -(b.max.z + pad); u1 = -(b.min.z - pad); v0 = ground ? 0 : b.min.y - pad; v1 = b.max.y + pad; }
    else if (view === 'right') { u0 = b.min.z - pad; u1 = b.max.z + pad; v0 = ground ? 0 : b.min.y - pad; v1 = b.max.y + pad; }
    else { u0 = lo - (lo > b.min.x ? 0 : pad); u1 = hi + (hi < b.max.x ? 0 : pad); v0 = ground ? 0 : b.min.y - pad; v1 = b.max.y + pad; }
    const w = u1 - u0, h = v1 - v0, ppm = Math.min(PPM, 2048 / Math.max(w, h)), pw = Math.max(8, Math.round(w * ppm)), ph = Math.max(8, Math.round(h * ppm));
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight('#ffffff', '#d6cdbd', 2.2 * mood.fill));
    const key = new T.DirectionalLight(new T.Color(tint).multiply(new T.Color(mood.key)), 1.0 * mood.keyScale); key.position.set(-3, 5, 6); scene.add(key);
    const far = 800, mu = (u0 + u1) / 2, mv = (v0 + v1) / 2, cam = new T.PerspectiveCamera((2 * Math.atan(h / 2 / far) * 180) / Math.PI, w / h, far - 80, far + 80);
    if (view === 'top') { cam.position.set(mu, far, -mv); cam.up.set(0, 0, -1); cam.lookAt(mu, 0, -mv); }
    else if (view === 'left') { cam.position.set(far, mv, -mu); cam.lookAt(0, mv, -mu); }
    else if (view === 'right') { cam.position.set(-far, mv, mu); cam.lookAt(0, mv, mu); }
    else { cam.position.set(mu, mv, far); cam.lookAt(mu, mv, 0); }
    const inkLine = new T.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.5 });
    const added = list.map((t) => { const c = t.holder.clone(true); c.traverse((m) => { if (m.isMesh && m.material?.isMeshStandardMaterial) m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry, 32), inkLine)); }); scene.add(c); return c; });
    const r = printRenderer(T); r.setSize(pw, ph, false); r.setClearColor(0x000000, 0); r.render(scene, cam);
    const base = doc.createElement('canvas'); base.width = pw; base.height = ph; base.getContext('2d').drawImage(r.domElement, 0, 0);
    for (const c of added) c.traverse((m) => { if (m.isLineSegments) m.geometry.dispose(); }); inkLine.dispose();
    const outCanvas = doc.createElement('canvas'); outCanvas.width = pw; outCanvas.height = ph; const g = outCanvas.getContext('2d');
    const sil = (colour) => { const c = doc.createElement('canvas'); c.width = pw; c.height = ph; const x = c.getContext('2d'); x.drawImage(base, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = colour; x.fillRect(0, 0, pw, ph); return c; };
    const ring = (c, rad) => { for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; g.drawImage(c, Math.cos(a) * rad, Math.sin(a) * rad); } };
    if (margin) { ring(sil('#fbf8f0'), 6); ring(sil(INK), 2.2); } else ring(sil(INK), 1.2);
    g.drawImage(base, 0, 0); grainOver(doc, g, pw, ph);
    if (ground) g.clearRect(0, ph - 1, pw, 1);
    return { canvas: outCanvas, u0, u1, v0, v1, w, h, pw, ph };
  }

  // ---- a printed piece of card with real thickness: its cut line traced and extruded; front printed, back plain, edges cream ----
  const backMat = keep(new T.MeshStandardMaterial({ color: '#e9dfca', roughness: 1 })), edgeMat = keep(new T.MeshStandardMaterial({ color: EDGE, roughness: 1 }));
  function cutPiece(p, { glowing = false } = {}) { // -> { mesh, front } with geometry in metres, u → x, v → y, front at z = CARD
    const map = tex(p.canvas);
    const front = keep(new T.MeshStandardMaterial({ map, roughness: 0.95, transparent: false, alphaTest: 0.5, ...(glowing ? { emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow * 0.35 } : {}) }));
    front.userData.base = { emissive: front.emissive.getHex(), intensity: front.emissiveIntensity };
    const gw = Math.ceil(p.pw / CELL), gh = Math.ceil(p.ph / CELL), cells = new Uint8Array(gw * gh);
    const data = p.canvas.getContext('2d').getImageData(0, 0, p.pw, p.ph).data;
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { let n = 0, m = 0; for (let yy = y * CELL; yy < Math.min(p.ph, (y + 1) * CELL); yy++) for (let xx = x * CELL; xx < Math.min(p.pw, (x + 1) * CELL); xx++) { m++; if (data[(yy * p.pw + xx) * 4 + 3] > 127) n++; } cells[y * gw + x] = n * 2 >= m ? 1 : 0; }
    const toM = ([x, y]) => new T.Vector2(p.u0 + (x * CELL / p.pw) * p.w, p.v1 - (y * CELL / p.ph) * p.h);
    const outlines = traceOutlines(cells, gw, gh);
    let geo = null;
    if (outlines.length) {
      const shapes = outlines.map((o) => { const s = new T.Shape(o.points.map(toM)); for (const h of o.holes) s.holes.push(new T.Path(h.map(toM))); return s; });
      const uv = { generateTopUV: (g, v, a, b, c) => [a, b, c].map((i) => new T.Vector2((v[i * 3] - p.u0) / p.w, (v[i * 3 + 1] - p.v0) / p.h)),
        generateSideWallUV: () => [new T.Vector2(0, 0), new T.Vector2(1, 0), new T.Vector2(1, 1), new T.Vector2(0, 1)] };
      try {
        geo = new T.ExtrudeGeometry(shapes, { depth: CARD, bevelEnabled: false, curveSegments: 1, UVGenerator: uv });
        const caps = geo.groups.find((gr) => gr.materialIndex === 0), sides = geo.groups.find((gr) => gr.materialIndex === 1);
        if (caps && caps.count % 6 === 0) { const half = caps.count / 2; geo.clearGroups(); geo.addGroup(caps.start, half, 1); geo.addGroup(caps.start + half, half, 0); if (sides) geo.addGroup(sides.start, sides.count, 2); }
      } catch { geo = null; }
    }
    if (!geo) { // a plain alpha-cut card when the cut line cannot be traced
      geo = new T.BoxGeometry(p.w, p.h, CARD); geo.translate(p.u0 + p.w / 2, p.v0 + p.h / 2, CARD / 2);
      return { mesh: new T.Mesh(geo, [edgeMat, edgeMat, edgeMat, edgeMat, front, backMat]), front };
    }
    return { mesh: new T.Mesh(geo, [front, backMat, edgeMat]), front };
  }
  // Without a page to draw on (tests), a piece is a plain card the size of the thing.
  function plainPiece(t, view) {
    const b = t.box, w = view === 'front' ? b.max.x - b.min.x : b.max.z - b.min.z, h = Math.max(0.05, b.max.y - Math.max(0, b.min.y));
    const front = keep(new T.MeshStandardMaterial({ color: PAPER })); front.userData.base = { emissive: 0, intensity: 0 };
    const geo = new T.BoxGeometry(Math.max(0.05, w), h, CARD); geo.translate(view === 'front' ? (b.min.x + b.max.x) / 2 : 0, Math.max(0, b.min.y) + h / 2, CARD / 2);
    return { mesh: new T.Mesh(geo, front), front };
  }

  // ---- the open book: two blocks of leaves, boards proud of them, a rounded spine, a ribbon ----
  const D = Math.max(2.6, (all.max.z - all.min.z) * 1.12 + 0.5), W = Math.max(Math.max(-all.min.x, all.max.x) * 1.06 + 0.3, D / 1.42);
  const H = Math.max(1.6, all.max.y + 0.6), thick = Math.min(0.42, Math.max(0.2, W * 0.065));
  const book = new T.Group(); book.rotation.y = turn; root.add(book);
  const leaves = canDraw ? (() => { const c = doc.createElement('canvas'); c.width = 8; c.height = 128; const g = c.getContext('2d'); g.fillStyle = PAPER; g.fillRect(0, 0, 8, 128); for (let y = 2; y < 128; y += 4) { g.fillStyle = `rgba(90,74,52,${0.16 + seeded(y) * 0.14})`; g.fillRect(0, y, 8, 1); } return tex(c); })() : null;
  const paperTex = canDraw ? (() => { const c = doc.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#f4efe3'; g.fillRect(0, 0, 256, 256); grain(g, 256, 256, 12); const t = tex(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(W / 2, D / 2); return t; })() : null;
  const pageMat = keep(new T.MeshStandardMaterial({ color: new T.Color(PAPER).lerp(grade(place.ground), 0.12), map: paperTex, roughness: 1 }));
  const leafMat = keep(new T.MeshStandardMaterial({ color: '#ffffff', map: leaves, roughness: 1 })), coverMat = keep(new T.MeshStandardMaterial({ color: COVER, roughness: 0.85 }));
  const halves = [-1, 1].map((sign) => {
    const g = new T.Group();
    const block = new T.Mesh(new T.BoxGeometry(W, thick, D), [leafMat, leafMat, pageMat, leafMat, leafMat, leafMat]); block.position.set(sign * W / 2, -thick / 2, 0);
    const board = new T.Mesh(new T.BoxGeometry(W + 0.1, 0.06, D + 0.24), coverMat); board.position.set(sign * (W / 2 + 0.05), -thick - 0.03, 0);
    for (const m of [block, board]) { m.receiveShadow = true; m.castShadow = true; m.raycast = () => {}; }
    g.add(block, board); book.add(g); return g;
  });
  const [leftPage, rightPage] = halves, pageOf = (x) => (x < 0 ? leftPage : rightPage);
  { const spine = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, D + 0.24, 24), coverMat); spine.rotation.x = Math.PI / 2; spine.position.y = -thick - 0.05; spine.raycast = () => {}; book.add(spine); }
  if (canDraw) { // the gutter's soft shadow, lying in the fold
    const c = doc.createElement('canvas'); c.width = 64; c.height = 4; const g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 64, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, 'rgba(40,30,20,.4)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, 64, 4);
    const m = new T.Mesh(new T.PlaneGeometry(0.6, D), keep(new T.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false })));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.006; m.renderOrder = 2; m.raycast = () => {}; book.add(m);
  }
  { // a ribbon marker from the gutter, over the front edge of the right-hand page
    const ribbon = keep(new T.MeshStandardMaterial({ color: '#8a2f3c', roughness: 0.7, side: T.DoubleSide }));
    const lie = new T.Mesh(new T.PlaneGeometry(0.07, 0.45).rotateX(-Math.PI / 2), ribbon); lie.position.set(0.22, 0.004, D / 2 - 0.22);
    const hang = new T.Mesh(new T.PlaneGeometry(0.07, thick + 0.3), ribbon); hang.position.set(0.22, -(thick + 0.3) / 2, D / 2 + 0.004);
    for (const m of [lie, hang]) { m.raycast = () => {}; m.castShadow = true; } rightPage.add(lie, hang);
  }

  // ---- the floor, printed on each page; the flat things' shapes stay behind unseen, so they can still be chosen ----
  const flats = things.filter((t) => t.kind === 'flat');
  if (flats.length && canDraw) for (const sign of [-1, 1]) {
    const p = print(flats, { view: 'top', x0: sign < 0 ? -Infinity : 0, x1: sign < 0 ? 0 : Infinity, margin: false }); if (!p) continue;
    const m = new T.Mesh(new T.PlaneGeometry(p.w, p.h).rotateX(-Math.PI / 2), keep(new T.MeshStandardMaterial({ map: tex(p.canvas), alphaTest: 0.3, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })));
    m.position.set((p.u0 + p.u1) / 2, 0.003, -(p.v0 + p.v1) / 2); m.receiveShadow = true; m.raycast = () => {}; pageOf(sign).add(m);
  }
  for (const t of flats) { // printed first, then hidden: the shapes stay only to be chosen and framed
    t.holder.traverse((m) => { if (m.isMesh) { m.material = keep(new T.MeshBasicMaterial({ visible: false })); m.castShadow = false; } });
    t.holder.userData.object = t.index; book.add(t.holder); objects[t.index] = t.holder; pickables.push(t.holder); pieces.set(t.index, [t.holder]);
  }

  // ---- standing things: printed face-on, glued in layers on panels that stand on scored creases, one hinge per layer and page ----
  const tabMat = keep(new T.MeshStandardMaterial({ color: '#ddd1b8', roughness: 1 })), strutMat = keep(new T.MeshStandardMaterial({ color: '#d8ccb3', roughness: 1, side: T.DoubleSide }));
  const creaseMat = keep(new T.LineDashedMaterial({ color: INK, dashSize: 0.05, gapSize: 0.035, transparent: true, opacity: 0.55 }));
  const crease = (a, b) => { const l = new T.LineSegments(new T.BufferGeometry().setFromPoints([a, b]), creaseMat); l.computeLineDistances(); l.raycast = () => {}; return l; };
  const standing = things.filter((t) => t.kind === 'standing');
  const LAYERS = 4;
  for (const sign of [-1, 1]) {
    const here = standing.filter((t) => (sign < 0 ? t.box.min.x < -0.02 : t.box.max.x > 0.02));
    if (!here.length) continue;
    const zOf = (t) => (t.box.min.z + t.box.max.z) / 2, z0 = Math.min(...here.map(zOf)), z1 = Math.max(...here.map(zOf));
    const bands = Array.from({ length: LAYERS }, () => []);
    for (const t of here) bands[Math.min(LAYERS - 1, Math.floor(((zOf(t) - z0) / Math.max(0.01, z1 - z0)) * LAYERS))].push(t);
    bands.forEach((band, rank) => {
      if (!band.length) return;
      const base = band.filter((t) => !t.resting), footZ = (base.length ? base : band).reduce((n, t) => n + zOf(t), 0) / (base.length || band.length); // the layer stands at its things' depth
      const hinge = new T.Group(); hinge.position.set(0, 0, footZ); pageOf(sign).add(hinge);
      hinges.push({ group: hinge, axis: 'x', flat: -Math.PI / 2, rank, kind: 'layer' });
      // back to front, things resting on others after what holds them: layered card, each a little in front of the last
      band.sort((a, b) => zOf(a) - zOf(b) + (a.resting - b.resting) * 0.5);
      let span0 = Infinity, span1 = -Infinity, tall = 0;
      band.forEach((t, k) => {
        const x0 = sign < 0 ? -Infinity : 0, x1 = sign < 0 ? 0 : Infinity;
        const p = print([t], { view: 'front', x0, x1 });
        if (canDraw && !p) return;
        const { mesh, front } = p ? cutPiece(p, { glowing: t.glow }) : plainPiece(t, 'front');
        const holder = new T.Group(), lift = new T.Group(), cxp = p ? (p.u0 + p.u1) / 2 : (t.box.min.x + t.box.max.x) / 2;
        mesh.geometry.translate(-cxp, 0, 0); mesh.castShadow = true; mesh.receiveShadow = true;
        holder.position.set(cxp, 0, (k + 1) * GAP); holder.add(lift); lift.add(mesh); hinge.add(holder);
        holder.userData.object = t.index; mesh.userData.object = t.index;
        if (!objects[t.index]) objects[t.index] = holder;
        pickables.push(holder); pieces.set(t.index, [...(pieces.get(t.index) || []), holder]);
        holder.userData.front = front; holder.userData.lift = lift; holder.userData.z = holder.position.z;
        span0 = Math.min(span0, p ? p.u0 : t.box.min.x); span1 = Math.max(span1, p ? p.u1 : t.box.max.x); tall = Math.max(tall, t.box.max.y);
        if (t.o.motion && t.o.motion !== 'none') motions.push({ index: t.index, motion: t.o.motion, holder, lift, front, phase: seeded(t.index + 0.7) * 6, top: t.box.max.y });
        if (t.glow && lights.length < 4) { const l = new T.PointLight(t.o.shapes.find((s) => s.glow)?.color || '#ffd59a', glow * 2.5, 5, 2); l.position.set(0, t.box.max.y * 0.85, 0.2); lift.add(l); lights.push(l); }
      });
      if (!isFinite(span0)) return;
      // the glue tab in front of the foot, the scored crease along it, and folded supports behind a tall layer
      const tab = new T.Mesh(new T.BoxGeometry(span1 - span0, 0.003, 0.1), tabMat); tab.position.set((span0 + span1) / 2, 0.0015, footZ + 0.06 + (band.length + 1) * GAP); tab.receiveShadow = true; tab.raycast = () => {}; pageOf(sign).add(tab);
      pageOf(sign).add(crease(new T.Vector3(span0, 0.005, footZ + 0.012), new T.Vector3(span1, 0.005, footZ + 0.012)));
      if (tall > 0.7) for (const sx of [0.2, 0.8]) {
        const sh = Math.min(tall * 0.22, 0.24), strut = new T.Mesh(new T.BoxGeometry(0.09, sh * 1.25, 0.004), strutMat);
        strut.position.set(span0 + (span1 - span0) * sx, sh * 0.5, -sh * 0.32); strut.rotation.x = -0.62; strut.castShadow = true; strut.raycast = () => {}; hinge.add(strut);
      }
    });
  }

  // ---- side walls stand as wings at the side of their page, printed from inside, folding outward ----
  for (const t of things.filter((x) => x.kind === 'wing')) {
    const left = (t.box.min.x + t.box.max.x) / 2 < 0, p = print([t], { view: left ? 'left' : 'right' });
    if (canDraw && !p) continue;
    const { mesh, front } = p ? cutPiece(p) : plainPiece(t, 'side');
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.rotation.y = left ? Math.PI / 2 : -Math.PI / 2;
    const hinge = new T.Group(); hinge.position.set(left ? t.box.max.x : t.box.min.x, 0, 0); pageOf(left ? -1 : 1).add(hinge);
    const holder = new T.Group(), lift = new T.Group(); holder.add(lift); lift.add(mesh); hinge.add(holder);
    holder.userData.object = t.index; mesh.userData.object = t.index; holder.userData.front = front; holder.userData.lift = lift; holder.userData.z = 0;
    objects[t.index] = holder; pickables.push(holder); pieces.set(t.index, [holder]);
    hinges.push({ group: hinge, axis: 'z', flat: left ? Math.PI / 2 : -Math.PI / 2, rank: -0.5, kind: 'wing' });
    pageOf(left ? -1 : 1).add(crease(new T.Vector3(hinge.position.x, 0.005, t.box.min.z), new T.Vector3(hinge.position.x, 0.005, t.box.max.z)));
  }
  // Anything left without a piece (empty, or nothing printable) still gets a group so indices hold.
  place.objects.forEach((o, i) => { if (!objects[i]) { const g = new T.Group(); g.userData.object = i; book.add(g); objects[i] = g; pieces.set(i, [g]); } });

  // ---- the sky's pieces on folded stalks at the back of the pages; rain and snow hang from the clouds ----
  if (canDraw) skyArt(doc, place).forEach((s, i, list) => {
    const fog = s.kind === 'fog', x = fog ? 0 : (list.length === 1 ? 0.45 : -0.8 + (1.6 * i) / Math.max(1, list.length - 1)) * W * 0.8;
    const z = -D / 2 + 0.25 + (fog ? 0.35 : seeded(i + 3.7) * 0.3), tall = fog ? H * 0.22 : H * (s.kind === 'cloud' ? 0.75 + seeded(i + 1.9) * 0.15 : 0.95);
    const aspect = s.canvas.width / s.canvas.height, w = fog ? Math.min(W * 1.6, 5) : s.size * Math.max(1, W / 2.6), h = w / aspect;
    const ctx = doc.createElement('canvas'); ctx.width = s.canvas.width + 24; ctx.height = s.canvas.height + 24; const g = ctx.getContext('2d');
    const sil = (colour) => { const c = doc.createElement('canvas'); c.width = ctx.width; c.height = ctx.height; const x2 = c.getContext('2d'); x2.drawImage(s.canvas, 12, 12); x2.globalCompositeOperation = 'source-in'; x2.fillStyle = colour; x2.fillRect(0, 0, c.width, c.height); return c; };
    for (const [c, r] of [[sil('#fbf8f0'), 7], [sil(INK), 2.5]]) for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2; g.drawImage(c, Math.cos(a) * r, Math.sin(a) * r); }
    g.drawImage(s.canvas, 12, 12); grainOver(doc, g, ctx.width, ctx.height);
    const scale = w / s.canvas.width, pw = ctx.width * scale, ph = ctx.height * scale;
    const p = { canvas: ctx, u0: -pw / 2, u1: pw / 2, v0: tall - ph / 2, v1: tall + ph / 2, w: pw, h: ph, pw: ctx.width, ph: ctx.height };
    if (fog) { p.v0 = 0.02; p.v1 = 0.02 + ph; }
    const { mesh } = cutPiece(p, { glowing: !!s.glow }); mesh.castShadow = !fog; mesh.raycast = () => {};
    const hinge = new T.Group(); hinge.position.set(x, 0, z); pageOf(x || 0.001).add(hinge); hinge.add(mesh);
    if (!fog) { const stalk = new T.Mesh(new T.BoxGeometry(0.035, tall - h * 0.3, 0.006), strutMat); stalk.position.set(0, (tall - h * 0.3) / 2, -0.01); stalk.castShadow = true; stalk.raycast = () => {}; hinge.add(stalk); }
    hinges.push({ group: hinge, axis: 'x', flat: -Math.PI / 2, rank: -1, kind: 'sky' });
    if (s.kind === 'cloud' && (place.weather === 'rain' || place.weather === 'snow')) {
      const rain = place.weather === 'rain', below = tall - h * 0.35;
      for (let k = 0; k < 5; k++) {
        const length = below * (0.3 + seeded(i * 7 + k) * 0.25), holder = new T.Group(); holder.position.set((k / 4 - 0.5) * w * 0.7, below, 0.02);
        if (rain) { const strip = new T.Mesh(new T.BoxGeometry(0.03, length, 0.003), keep(new T.MeshStandardMaterial({ color: '#8fa3bf', roughness: 1 }))); strip.position.y = -length / 2; holder.add(strip); }
        else { const thread = new T.Mesh(new T.PlaneGeometry(0.006, length), keep(new T.MeshBasicMaterial({ color: '#d8dde6', side: T.DoubleSide }))); thread.position.y = -length / 2; const flake = new T.Mesh(new T.PlaneGeometry(0.12, 0.12), keep(new T.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: T.DoubleSide }))); flake.position.y = -length; holder.add(thread, flake); }
        holder.traverse((m) => { if (m.isMesh) { m.raycast = () => {}; m.castShadow = true; } });
        hinge.add(holder); hanging.push({ holder, phase: seeded(i + k * 3.1) * 6, rain });
      }
    }
  });

  // ---- light: one warm key from the reader's upper left, a soft fill from the room ----
  root.add(new T.HemisphereLight(new T.Color('#fff7ea').lerp(grade(place.sky), 0.25), '#5b5346', hemi * 1.25 * mood.fill));
  const key = new T.DirectionalLight(new T.Color(tint).multiply(new T.Color(mood.key)), sun * mood.keyScale);
  const R = Math.hypot(W * 2, D);
  key.position.copy(new T.Vector3(-0.45, 0.85, 0.55).applyAxisAngle(new T.Vector3(0, 1, 0), turn).multiplyScalar(R * 1.6)); key.target.position.set(0, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -R * 0.8, right: R * 0.8, top: R * 0.8, bottom: -R * 0.8, near: 0.1, far: R * 4 }); key.shadow.camera.updateProjectionMatrix();
  root.add(key, key.target);
  // a soft fill from the reader's right, so wings and pieces turned from the key are still read as paper, not shadow
  const fill = new T.DirectionalLight('#f3f0ff', 0.55 * mood.fill); fill.position.copy(new T.Vector3(0.7, 0.5, 0.6).applyAxisAngle(new T.Vector3(0, 1, 0), turn).multiplyScalar(R)); root.add(fill);
  const keyBase = key.intensity;

  // ---- hinges and pages: one timeline. Opening lands the page, then raises the scenery back to front; leaving folds it flat,
  // front to back, before the page moves. ----
  const ranks = [...new Set(hinges.map((h) => h.rank))].sort((a, b) => a - b), rankOf = (h) => ranks.indexOf(h.rank) / Math.max(1, ranks.length - 1);
  const PAGE = 0.4, RISE = 0.42; // shares of the opening: the page, then the rise (with a stagger across ranks)
  const setHinge = (h, standing) => { const a = h.flat * (1 - standing); if (h.axis === 'x') h.group.rotation.x = a; else h.group.rotation.z = a; };
  const pageAngle = { left: 0, right: 0 };
  const setPages = (l, r) => { pageAngle.left = l; pageAngle.right = r; leftPage.rotation.z = l; rightPage.rotation.z = r; };
  let opening = reduced ? 1 : 0, leaving = null, clock = 0, lit = -1, over = -1;
  const hops = new Map();
  function pose() {
    const page = easeInOut(clamp01(opening / PAGE));
    if (enter === 'prev') setPages(0, (Math.PI / 2) * (1 - page)); // the page turned back comes down from standing at the gutter
    else setPages(-(enter === 'next' ? Math.PI / 2 : Math.PI) * (1 - page), 0);
    for (const h of hinges) { const start = PAGE + 0.02 + rankOf(h) * (1 - PAGE - RISE - 0.02); setHinge(h, opening >= 1 ? 1 : backOut(clamp01((opening - start) / RISE))); }
  }
  function fold(dt) {
    const l = Math.min(1, (leaving.t += dt / 1.4));
    for (const h of hinges) { const start = (1 - rankOf(h)) * 0.2; setHinge(h, 1 - easeIn(clamp01((l - start) / 0.32))); } // front first; all flat by 0.52
    const page = easeInOut(clamp01((l - 0.56) / 0.44)); // the page waits until everything lies flat
    if (leaving.direction === 'prev') setPages(-(Math.PI / 2) * page, 0); else setPages(0, (Math.PI / 2) * page);
    if (l >= 1) { const done = leaving.resolve; leaving = null; done(); }
  }
  pose();

  const puffs = [];
  if (canDraw) for (const m of motions) if (m.motion === 'steam') for (let k = 0; k < 4; k++) {
    const puff = new T.Mesh(new T.PlaneGeometry(0.09, 0.07), keep(new T.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, roughness: 1, side: T.DoubleSide })));
    puff.raycast = () => {}; m.lift.add(puff); puffs.push({ puff, m, offset: k / 4 });
  }
  function animate(dt) {
    clock += dt * mood.speed;
    for (const m of motions) {
      const t = clock + m.phase;
      if (m.motion === 'sway') m.lift.rotation.z = Math.sin(t * 1.2) * 0.05;
      else if (m.motion === 'bob') m.lift.position.y = Math.abs(Math.sin(t * 1.6)) * 0.05;
      else if (m.motion === 'drift') m.lift.position.x = Math.sin(t * 0.5) * 0.12;
      else if (m.motion === 'turn') m.lift.rotation.y = Math.sin(t * 0.8) * 0.5;
      else if (m.motion === 'flicker' && m.index !== lit) m.front.emissiveIntensity = glow * 0.35 * (0.8 + 0.2 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1)));
    }
    for (const { puff, m, offset } of puffs) { const k = (clock * 0.35 + offset) % 1; puff.position.set(Math.sin(k * 6 + offset * 9) * 0.04, m.top + 0.05 + k * 0.5, 0.02); puff.scale.setScalar(0.6 + k * 1.4); puff.material.opacity = 0.8 * (1 - k); }
    for (const h of hanging) { const t = clock * (h.rain ? 1.4 : 0.8) + h.phase; h.holder.rotation.z = Math.sin(t) * (h.rain ? 0.05 : 0.12); }
    if (!dt) return;
    key.intensity = keyBase * (1 + 0.04 * Math.sin(clock * 0.25) * Math.sin(clock * 0.17 + 2));
    for (const [i, list] of pieces) {
      const start = hops.get(i), k = start === undefined ? 1 : (clock - start) / 0.5; if (k >= 1) hops.delete(i);
      for (const g of list) { if (g.userData.z === undefined) continue; const want = g.userData.z + (i === over ? 0.05 : 0) + (k < 1 ? Math.sin(Math.PI * k) * 0.1 : 0); g.position.z += (want - g.position.z) * Math.min(1, dt * 10); }
    }
  }
  animate(0);

  // Bounds and framing, measured with everything standing.
  const measure = () => {
    const saved = hinges.map((h) => [h.group.rotation.x, h.group.rotation.z]), pages = [leftPage.rotation.z, rightPage.rotation.z];
    for (const h of hinges) setHinge(h, 1); leftPage.rotation.z = 0; rightPage.rotation.z = 0; root.updateMatrixWorld(true);
    const held = place.objects.map((o, i) => (o.moments.length ? i : -1)).filter((i) => i >= 0), box = new T.Box3();
    for (const i of held.length ? held : place.objects.map((o, i) => i)) for (const g of pieces.get(i) || []) box.expandByObject(g);
    hinges.forEach((h, k) => { h.group.rotation.x = saved[k][0]; h.group.rotation.z = saved[k][1]; }); leftPage.rotation.z = pages[0]; rightPage.rotation.z = pages[1]; root.updateMatrixWorld(true);
    return box.isEmpty() ? null : box.getBoundingSphere(new T.Sphere());
  };
  const bounds = measure();
  const facing = new T.Vector3(Math.sin(turn), 0, Math.cos(turn));

  return {
    root, objects, pickables, bounds, sky: place.sky,
    background: `#${new T.Color(CHARCOAL).lerp(new T.Color(place.sky), 0.05).getHexString()}`,
    // As a pop-up book is looked at: from the reader's side, a little to one side and fairly low (about 36°), so layers read in depth.
    frame: { target: new T.Vector3(0, H * 0.32, 0), radius: Math.hypot(W * 0.92, D * 0.42, H * 0.32),
      direction: facing.clone().applyAxisAngle(new T.Vector3(0, 1, 0), 0.26).multiplyScalar(Math.cos(0.63)).add(new T.Vector3(0, Math.sin(0.63), 0)).normalize() },
    fog: null,
    moving: place.objects.length > 0,
    get unfolding() { return opening < 1; },
    boxOf(index) { const box = new T.Box3(); for (const g of pieces.get(index) || []) box.expandByObject(g); return box; },
    update(dt, { motion = true } = {}) {
      dt = Math.min(dt, 0.1);
      if (leaving) { fold(dt); return true; }
      if (opening < 1) { opening = Math.min(1, opening + dt / 2.4); pose(); }
      if (motion) animate(dt);
      return opening < 1 || (motion && place.objects.length > 0);
    },
    settle() { opening = 1; pose(); },
    leave(direction = 'next') {
      if (reduced) return Promise.resolve();
      opening = 1; pose();
      return new Promise((resolve) => { leaving = { direction, t: 0, resolve }; });
    },
    hover(index) { over = index; },
    hop(index) { if (pieces.has(index)) hops.set(index, clock); },
    highlight(index) {
      for (const [i, on] of [[lit, false], [index, true]]) for (const g of pieces.get(i) || []) {
        const f = g.userData.front; if (!f?.userData.base) continue; const b = f.userData.base;
        f.emissive.setHex(on ? 0xf2c94c : b.emissive); f.emissiveIntensity = on ? 0.3 : b.intensity;
      }
      lit = index;
    },
    // For tests: where the pages and hinges are (radians), and how far the scenery stands (1 = all standing, 0 = all flat).
    inspect() { return { left: pageAngle.left, right: pageAngle.right, hinges: hinges.map((h) => 1 - (h.axis === 'x' ? h.group.rotation.x : h.group.rotation.z) / h.flat) }; },
    dispose() {
      root.traverse((m) => { m.geometry?.dispose(); });
      for (const t of things) t.holder.traverse((m) => m.geometry?.dispose());
      for (const x of disposables) x.dispose(); for (const t of textures) t.dispose();
    },
  };
}
export default { buildPlace, traceOutlines };
