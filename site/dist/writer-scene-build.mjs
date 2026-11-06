import { PARTS, buildPart } from './writer-scene-parts.mjs';

// Draws a journal place (scene-journal-core.mjs validatePlace / readPlaceFile) with the bundled three.js (globalThis.JotThree), as a
// pop-up book: an open book lying flat, read as a book is, with the place and the sky's paper cut-outs rising out of its pages.
// Only Jot's code runs: the place is data, simple shapes with sizes and colours. Card-stock grain, ink outlines and soft shadows give
// every day the same paper look; the place's time, weather and atmosphere (the model's reading of the entry's feeling) give each its
// own light. When a day opens, its pieces rise from the page on hinges; while motion plays the page lives: pieces breathe, paper rain
// and snow sway from the clouds, the light shifts a little, a piece lifts under the pointer and hops when chosen. With reduced motion (or
// Pause motion) it all stays still. Each object is a group with userData.object = its index, so a click can find it.
//
// media (optional) is the day's own: { screen: { label, title, picture? }, book: { title, picture? }, picture }. A screen shows a kept
// still (or a title card), a book its kept cover (or its title), a frame the entry's own picture. Screens
// show what the entry says was watched or listened to, a book's cover the book it is reading, a frame its picture; nothing is fetched.
//
//   buildPlace(T, place, { reduced, document, media }) -> { root, objects: [Group], background, bounds, frame: { target, direction, radius },
//     fog: { color, near, far } | null, moving, update(seconds, { motion }) -> needs another frame, settle(), highlight(index),
//     hover(index | -1), hop(index), dispose() }

// Night and evening stay readable: a dim key light, but enough fill to see the place.
const LIGHT = { morning: ['#ffe0b5', 2.1, 0.75], day: ['#ffffff', 2.4, 0.85], evening: ['#ffb27a', 1.6, 0.8], night: ['#9db1ff', 0.8, 0.7] };
const GLOW = { morning: 0.5, day: 0.35, evening: 1.2, night: 1.8 };
// Atmosphere: key light tint and strength, fill, colour grading (saturation, lightness), glow and how fast things move.
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
// Jot's brand (docs/brand/README.md): ink blue covers, cream paper, a charcoal room lit with the light ink.
const PAPER = '#f3ecdc', COVER = '#1f3a8a', INK = '#3a3226', CHARCOAL = '#242622', LIGHT_INK = '#cbd5eb';

function geometry(T, s) {
  const [x, y, z] = s.size;
  switch (s.type) {
    case 'box': return new T.BoxGeometry(x, y, z);
    case 'cylinder': return new T.CylinderGeometry(x, z, y, 20);
    case 'cone': return new T.ConeGeometry(x, y, 20);
    case 'torus': return new T.TorusGeometry(x, Math.min(y, x), 10, 28);
    case 'plane': return new T.PlaneGeometry(x, z).rotateX(-Math.PI / 2); // a flat surface, width by depth, facing up (a floor, a rug, a puddle)
    case 'capsule': return new T.CapsuleGeometry(x, y, 6, 14);
    default: return new T.SphereGeometry(1, 18, 12); // sphere: scaled to its three radii below
  }
}
const seeded = (i) => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };
const backOut = (x) => { const c = 1.6; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
const easeOut = (x) => 1 - (1 - x) ** 3, easeIn = (x) => x * x * x;

// Paper made in the page (nothing is fetched): card-stock grain, a dot-grid page and the sky's paper cut-outs.
function paperTextures(T, doc, place) {
  const make = (w, h, paint) => { const c = doc.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
  const grain = (g, w, h, spread = 19) => {
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < w * h; i++) { const n = seeded(i + 0.5) * spread - spread / 2; for (let k = 0; k < 3; k++) img.data[i * 4 + k] = Math.max(0, Math.min(255, img.data[i * 4 + k] + n)); }
    g.putImageData(img, 0, 0);
  };
  const card = make(128, 128, (g, w, h) => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h); grain(g, w, h); });
  card.wrapS = card.wrapT = T.RepeatWrapping;
  const dots = make(256, 256, (g, w, h) => {
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h); grain(g, w, h, 14); g.fillStyle = 'rgba(58,50,38,.28)';
    for (let x = 16; x < w; x += 32) for (let y = 16; y < h; y += 32) { g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill(); }
  });
  dots.wrapS = dots.wrapT = T.RepeatWrapping;
  // The sky as paper cut-outs, each on its own transparent sheet: the sun or moon by the time of day, clouds (grey when wet), stars at
  // night. They stand on stalks at the back of the pages and rise with the book; no backdrop stands behind the place.
  const sky = [], wet = ['rain', 'fog', 'snow'].includes(place.weather);
  const cut = (w, h, paint) => make(w, h, (g) => { g.clearRect(0, 0, w, h); g.shadowColor = 'rgba(40,30,20,.25)'; g.shadowBlur = 6; g.shadowOffsetX = 2; g.shadowOffsetY = 3; paint(g); });
  const disc = (g, x, y, r, colour) => { g.fillStyle = colour; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  if (place.time === 'night') {
    sky.push({ kind: 'moon', size: 0.8, aspect: 1, glow: true, map: cut(256, 256, (g) => { disc(g, 128, 128, 96, '#f4f0dc'); g.globalCompositeOperation = 'destination-out'; disc(g, 170, 104, 84, '#000'); }) });
    for (let i = 0; i < 2; i++) sky.push({ kind: 'star', size: 0.32, aspect: 1, glow: true, map: cut(128, 128, (g) => { g.fillStyle = '#fff3c4'; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 22 : 54, a = -Math.PI / 2 + (k * Math.PI) / 5; g.lineTo(64 + r * Math.cos(a), 64 + r * Math.sin(a)); } g.closePath(); g.fill(); }) });
  } else if (!wet) {
    const colour = { morning: '#ffd27a', evening: '#ff9a5c' }[place.time] || '#fff0a8';
    sky.push({ kind: 'sun', size: place.time === 'evening' ? 1 : 0.85, aspect: 1, glow: true, map: cut(256, 256, (g) => { g.strokeStyle = colour; g.lineWidth = 10; for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; g.beginPath(); g.moveTo(128 + 80 * Math.cos(a), 128 + 80 * Math.sin(a)); g.lineTo(128 + 112 * Math.cos(a), 128 + 112 * Math.sin(a)); g.stroke(); } disc(g, 128, 128, 66, colour); }) });
  }
  if (place.weather !== 'sun') for (let i = 0; i < (wet ? 3 : 2); i++) {
    const colour = wet ? '#aab3c0' : '#ffffff';
    sky.push({ kind: 'cloud', size: 1.3, aspect: 1.8, map: cut(360, 200, (g) => { g.fillStyle = colour; g.beginPath(); for (const [x, y, r] of [[120, 120, 56], [190, 92, 62], [258, 118, 52], [80, 138, 38], [300, 140, 34], [180, 146, 50]]) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); } g.fill(); grain(g, 360, 200, 10); }) });
  }
  const flake = cut(128, 128, (g) => { g.strokeStyle = '#ffffff'; g.lineWidth = 9; g.lineCap = 'round'; for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 50 * Math.cos(a), 64 + 50 * Math.sin(a)); g.stroke(); } });
  const mist = cut(512, 160, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, 160); for (let x = 0; x <= 512; x += 16) g.lineTo(x, 60 + Math.sin(x / 40) * 18 + Math.sin(x / 13) * 6); g.lineTo(512, 160); g.closePath(); g.fill(); });
  return { card, dots, sky, flake, mist, all: [card, dots, flake, mist, ...sky.map((x) => x.map)] };
}

// A card drawn in the page: a small label and a title, wrapped (the entry's words, drawn as pixels; never markup).
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

// enter: how the book comes in. 'open' (a closed book, opened as an English book is: the left page lifts off the right half and
// swings over to the left), 'next' (a page turned forward: it comes over from the right) or 'prev' (turned back: from the left).
export function buildPlace(T, place, { reduced = false, document: doc = globalThis.document, media = null, enter = 'open' } = {}) {
  const root = new T.Group(), objects = [], hinges = [], lights = [], weather = [], motions = [], textures = [], idle = [];
  const mood = ATMOSPHERE[place.atmosphere] || ATMOSPHERE.neutral;
  const [tint, sun, hemi] = LIGHT[place.time] || LIGHT.day, glow = (GLOW[place.time] ?? 0.4) * mood.glow;
  const paper = doc?.createElement ? paperTextures(T, doc, place) : null; if (paper) textures.push(...paper.all);
  // The model's colours, graded by the atmosphere and drawn a little toward cream paper, so every day is one pastel diorama.
  const grade = (c) => new T.Color(c).offsetHSL(0, mood.sat, mood.light).lerp(new T.Color(PAPER), 0.14);
  const material = (c, extra = {}) => new T.MeshStandardMaterial({ color: grade(c), roughness: 0.82, metalness: 0, flatShading: true, map: paper?.card || null,
    ...extra, ...(extra.emissive ? { emissive: grade(extra.emissive) } : {}) });
  const lift = (c) => grade(c).lerp(new T.Color('#ffffff'), 0.55); // fill light from the sky and ground colours, lightened so dark places stay readable
  root.add(new T.HemisphereLight(lift(place.sky), lift(place.ground), hemi * mood.fill));
  const key = new T.DirectionalLight(new T.Color(tint).multiply(new T.Color(mood.key)), sun * mood.keyScale);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02; root.add(key, key.target);
  if (place.weather === 'sun') { const warm = new T.DirectionalLight('#fff2cf', 0.8); warm.position.set(-5, 6, 2); root.add(warm); }
  const rim = new T.DirectionalLight(LIGHT_INK, 1.1); root.add(rim, rim.target); // a cool edge from behind, as on a stage
  const ink = new T.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.45 });
  const outline = (mesh) => { const line = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 35), ink); line.raycast = () => {}; mesh.add(line); };

  place.objects.forEach((o, index) => {
    // hinge (on the page, at the object's foot) > swing (sway, bob, drift) > group (the object as the model placed it)
    const hinge = new T.Group(), swing = new T.Group(), group = new T.Group();
    hinge.position.set(o.position[0], 0, o.position[2]); group.position.set(0, o.position[1], 0); group.rotation.set(...o.rotation);
    group.userData.object = index; group.name = o.name;
    const glowing = [];
    for (const s of o.shapes) {
      const part = PARTS.includes(s.type) ? buildPart(T, s.type, s.size, s.color, { material, glow: s.glow }) : null;
      let piece;
      if (part) piece = part; // a crafted part: Jot's own pieces, sized to its box
      else {
        piece = new T.Mesh(geometry(T, s), material(s.color, { roughness: Math.max(0.55, s.roughness), emissive: s.glow ? s.color : '#000000', emissiveIntensity: s.glow ? glow : 0,
          ...(s.type === 'plane' ? { side: T.DoubleSide } : {}) }));
        if (s.type === 'sphere') piece.scale.set(...s.size);
      }
      piece.position.set(...s.position); piece.rotation.set(...s.rotation); group.add(piece);
      piece.traverse((mesh) => {
        if (!mesh.isMesh) return;
        mesh.castShadow = s.type !== 'plane' && s.type !== 'rug' && !s.glow; mesh.receiveShadow = true;
        mesh.userData.base = { emissive: mesh.material.emissive.getHex(), intensity: mesh.material.emissiveIntensity };
        if (s.glow && mesh.material.emissiveIntensity > 0.5) glowing.push(mesh.material);
        if (!part || mesh.geometry.type === 'BoxGeometry' || mesh.geometry.type === 'CylinderGeometry') outline(mesh);
      });
      if (!part && s.glow) glowing.push(piece.material);
      if (s.glow && lights.length < 6) { const l = new T.PointLight(s.color, glow * 3, 6, 2); l.position.set(...s.position); if (part) l.position.y += s.size[1] * 0.2; group.add(l); lights.push(l); glowing.push(l); }
    }
    swing.add(group); hinge.add(swing); root.add(hinge); objects.push(group); hinges.push(hinge);
    if (o.motion && o.motion !== 'none') motions.push({ index, motion: o.motion, hinge, swing, group, glowing, base: group.rotation.y, phase: seeded(index + 0.7) * 6 });
    else idle.push({ swing, phase: seeded(index + 2.9) * 6 }); // the rest breathe
  });

  // The day's own media on the surfaces that can show it.
  if (media && doc?.createElement) for (const g of objects) g.traverse((m) => {
    const kind = m.userData?.surface; if (!m.isMesh || !kind) return;
    const p = m.geometry.parameters || {}, aspect = (p.width || 1) / (p.height || p.depth || 1);
    let map = null;
    if (kind === 'screen' && media.screen?.picture) { try { map = pictureTexture(T, doc, media.screen.picture, aspect); } catch { map = null; } } // a kept still
    else if (kind === 'screen' && media.screen) map = titleCard(T, doc, { label: media.screen.label, title: media.screen.title, aspect, glyph: '▶' });
    else if (kind === 'cover' && media.book?.picture) { try { map = pictureTexture(T, doc, media.book.picture, aspect); } catch { map = null; } }
    else if (kind === 'cover' && media.book) map = titleCard(T, doc, { title: media.book.title, colour: `#${m.material.color.getHexString()}`, aspect });
    else if (kind === 'picture' && media.picture) { try { map = pictureTexture(T, doc, media.picture, aspect); } catch { map = null; } }
    if (!map) return;
    textures.push(map); m.material.map = map; m.material.color.set('#ffffff');
    if (kind === 'screen') { m.material.emissive.set('#ffffff'); m.material.emissiveMap = map; m.material.emissiveIntensity = 0.8; }
    m.material.needsUpdate = true; m.userData.base = { emissive: m.material.emissive.getHex(), intensity: m.material.emissiveIntensity }; m.userData.shows = kind;
  });

  // How big the place is (objects only): the book is sized to all of it; the view is framed on what the day is about, the things
  // that hold sentences (or everything when none do).
  root.updateMatrixWorld(true);
  const all = new T.Box3(); for (const g of objects) all.expandByObject(g);
  const box = new T.Box3(), held = objects.filter((g, i) => place.objects[i].moments.length); for (const g of held.length ? held : objects) box.expandByObject(g);
  const bounds = box.isEmpty() ? null : box.getBoundingSphere(new T.Sphere());
  const whole = all.isEmpty() ? new T.Sphere(new T.Vector3(), 2) : all.getBoundingSphere(new T.Sphere());
  const centre = new T.Vector3(whole.center.x, 0, whole.center.z), R = Math.max(2, whole.radius * 0.95 + 0.25), H = Math.max(2.4, (all.isEmpty() ? 0 : all.max.y) + 0.8, R * 0.9);

  // The reader's side: where the model put the camera. The book lies open toward it: a left and a right page with the gutter running
  // toward the reader, and the place and the sky's cut-outs standing across both. No backdrop stands behind the place.
  const toward = new T.Vector3(place.camera.position[0] - place.camera.target[0], 0, place.camera.position[2] - place.camera.target[2]);
  if (toward.lengthSq() < 1e-6) toward.set(0, 0, 1); toward.normalize();
  const book = new T.Group(); book.position.copy(centre); book.rotation.y = Math.atan2(toward.x, toward.z); root.add(book);
  const up = new T.Vector3(0, 1, 0), axis = new T.Vector3(0, 0, 1).applyAxisAngle(up, book.rotation.y); // the gutter's direction, about which things rise
  const slab = (w, h, d, material) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), material); m.receiveShadow = true; return m; };
  const floorTint = grade(place.ground).lerp(new T.Color(PAPER), 0.3);
  const dots = paper?.dots; if (dots) dots.repeat.set(R / 2, R);
  const pageMat = new T.MeshStandardMaterial({ color: floorTint, roughness: place.weather === 'rain' ? 0.55 : 1, map: dots || null, flatShading: true });
  const edgeMat = new T.MeshStandardMaterial({ color: PAPER, roughness: 1, map: paper?.card || null }), coverMat = new T.MeshStandardMaterial({ color: COVER, roughness: 0.9 });
  // A book's proportions: each page upright, about 1 : 1.42, the spread wider than it is deep, sized to hold the whole place.
  const sideAxis = new T.Vector3(1, 0, 0).applyAxisAngle(up, book.rotation.y), fwdAxis = new T.Vector3(0, 0, 1).applyAxisAngle(up, book.rotation.y);
  let xMax = 1, zMax = 1;
  for (const g of objects) {
    const b = new T.Box3().expandByObject(g); if (b.isEmpty()) continue;
    for (const x of [b.min.x, b.max.x]) for (const z of [b.min.z, b.max.z]) { const v = new T.Vector3(x - centre.x, 0, z - centre.z); xMax = Math.max(xMax, Math.abs(v.dot(sideAxis))); zMax = Math.max(zMax, Math.abs(v.dot(fwdAxis))); }
  }
  const D = Math.max(2.6, zMax * 2.2 + 0.3), W = Math.max(xMax * 1.1 + 0.15, D / 1.42); // a page's depth on the table, and its width
  const side = (sign) => { // one page: the page, the block of pages under it, the cover under that
    const g = new T.Group();
    const page = slab(W, 0.05, D, pageMat); page.position.set(sign * W / 2, -0.025, 0);
    const block = slab(W + 0.12, 0.08, D + 0.14, edgeMat); block.position.set(sign * (W / 2 + 0.06), -0.07, 0);
    const board = slab(W + 0.26, 0.05, D + 0.3, coverMat); board.position.set(sign * (W / 2 + 0.12), -0.135, 0);
    g.add(page, block, board); for (const m of [page, block, board]) m.raycast = () => {};
    return g;
  };
  const leftPage = side(-1), rightPage = side(1); book.add(leftPage, rightPage);
  const gutter = new T.Mesh(new T.PlaneGeometry(0.16, D), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.16, depthWrite: false }));
  gutter.rotation.x = -Math.PI / 2; gutter.position.y = 0.003; gutter.raycast = () => {}; book.add(gutter); // the fold's soft shadow
  const spine = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, D + 0.3, 16, 1, false, 0, Math.PI), coverMat); spine.rotation.set(Math.PI / 2, 0, Math.PI / 2); spine.position.y = -0.16; spine.raycast = () => {}; book.add(spine);
  // The sky's cut-outs along the back of the pages, spread across both, each held up by a folded paper strut (an A, as pop-up books
  // do it) and folding flat toward the gutter with its page. Rain and snow hang from the clouds as paper; nothing floats free.
  const skyHinges = [], hanging = [];
  const strut = (tall) => { const lean = Math.atan2(0.09, tall), legs = [-1, 1].map((k) => { const leg = slab(0.03, tall / Math.cos(lean), 0.012, edgeMat); leg.position.set(k * 0.045, tall / 2, 0); leg.rotation.z = -k * lean; leg.castShadow = true; leg.raycast = () => {}; return leg; }); return legs; };
  const skyScale = Math.max(1, W / 2.4); // the sky's cut-outs grow with the book
  (paper?.sky || []).forEach((raw, i, list) => {
    const piece = { ...raw, size: raw.size * skyScale };
    const x = (list.length === 1 ? 0.4 : -0.8 + (1.6 * i) / (list.length - 1)) * W * 0.8, z = -D / 2 + 0.3 + seeded(i + 3.7) * 0.4;
    const tall = H * (piece.kind === 'cloud' ? 0.6 + seeded(i + 1.9) * 0.18 : piece.kind === 'star' ? 0.7 + seeded(i + 2.3) * 0.25 : 0.88);
    const hinge = new T.Group(); hinge.position.set(x, 0, z); book.add(hinge);
    const legs = strut(tall);
    const flat = new T.Mesh(new T.PlaneGeometry(piece.size, piece.size / piece.aspect), new T.MeshStandardMaterial({ map: piece.map, transparent: true, alphaTest: 0.5, side: T.DoubleSide, roughness: 1,
      emissive: piece.glow ? '#ffffff' : '#000000', emissiveMap: piece.glow ? piece.map : null, emissiveIntensity: piece.glow ? 0.3 : 0 }));
    flat.position.y = tall;
    hinge.add(...legs, flat); flat.raycast = () => {};
    skyHinges.push({ hinge, sign: x >= 0 ? 1 : -1 });
    // Rain as paper strips and snow as paper flakes on threads, hung from the cloud; they sway, they never fall.
    if (piece.kind === 'cloud' && (place.weather === 'rain' || place.weather === 'snow')) {
      const rain = place.weather === 'rain', w = piece.size, below = tall - piece.size / piece.aspect / 2;
      for (let k = 0; k < 5; k++) {
        const length = below * (0.35 + seeded(i * 7 + k) * 0.25), holder = new T.Group(); holder.position.set((k / 4 - 0.5) * w * 0.75, below + 0.02, 0.01);
        if (rain) { const strip = new T.Mesh(new T.PlaneGeometry(0.035, length), new T.MeshStandardMaterial({ color: '#8fa3bf', roughness: 1, side: T.DoubleSide })); strip.position.y = -length / 2; holder.add(strip); }
        else {
          const thread = new T.Mesh(new T.PlaneGeometry(0.008, length), new T.MeshBasicMaterial({ color: '#d8dde6', side: T.DoubleSide })); thread.position.y = -length / 2;
          const flake = new T.Mesh(new T.PlaneGeometry(0.16, 0.16), new T.MeshStandardMaterial({ map: paper?.flake || null, color: '#ffffff', transparent: true, alphaTest: 0.5, side: T.DoubleSide, roughness: 1 })); flake.position.y = -length;
          holder.add(thread, flake);
        }
        holder.traverse((m) => { if (m.isMesh) m.raycast = () => {}; });
        hinge.add(holder); hanging.push({ holder, phase: seeded(i + k * 3.1) * 6, rain });
      }
    }
  });
  // Fog as a pale paper band standing across the back of both pages, rising with them.
  let fogBand = null;
  if (place.weather === 'fog') {
    fogBand = new T.Group(); fogBand.position.set(0, 0, -D / 2 + 0.6); book.add(fogBand);
    const band = new T.Mesh(new T.PlaneGeometry(2 * W * 0.9, H * 0.4), new T.MeshStandardMaterial({ map: paper?.mist || null, color: '#eef1f4', transparent: true, alphaTest: 0.3, opacity: 0.85, side: T.DoubleSide, roughness: 1 }));
    band.position.y = H * 0.2; band.raycast = () => {}; fogBand.add(band);
  }

  // Key light and its soft shadow, fitted to the book.
  key.position.copy(centre).add(new T.Vector3(0.45, 0.85, 0.35).applyAxisAngle(new T.Vector3(0, 1, 0), book.rotation.y).multiplyScalar(R * 3)); key.target.position.copy(centre);
  rim.position.copy(centre).add(new T.Vector3(-0.5, 0.6, -1).applyAxisAngle(new T.Vector3(0, 1, 0), book.rotation.y).multiplyScalar(R * 3)); rim.target.position.copy(centre);
  Object.assign(key.shadow.camera, { left: -R * 1.4, right: R * 1.4, top: R * 1.4, bottom: -R * 1.4, near: 0.1, far: R * 8 }); key.shadow.camera.updateProjectionMatrix();

  // Weather moves only what hangs from the pages' clouds: rain strips sway, snowflakes turn on their threads.
  if (hanging.length) weather.push(() => { for (const h of hanging) { const t = clock * (h.rain ? 1.4 : 0.8) + h.phase; h.holder.rotation.z = Math.sin(t) * (h.rain ? 0.05 : 0.12); if (!h.rain) h.holder.children[1].rotation.y = t; } });

  // Steam: a few soft puffs rising from the top of the thing.
  const puff = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
  for (const m of motions) {
    if (m.motion !== 'steam') continue;
    const top = new T.Box3().expandByObject(m.group), at = m.hinge.worldToLocal(new T.Vector3((top.min.x + top.max.x) / 2, top.max.y, (top.min.z + top.max.z) / 2));
    m.puffs = Array.from({ length: 4 }, (_, i) => { const p = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), puff.clone()); p.raycast = () => {}; p.userData.from = at.clone(); p.userData.offset = i / 4; m.swing.add(p); return p; });
  }

  let clock = 0, unfold = reduced ? 1 : 0, lit = -1, over = -1, leaving = null;
  const lifted = hinges.map(() => 0), hops = new Map(), keyBase = key.intensity;
  // Where each piece stands: which side of the gutter (it folds toward the gutter) and how far from it (the nearest rise first).
  const spots = hinges.map((h) => { const local = book.worldToLocal(h.getWorldPosition(new T.Vector3())); return { sign: local.x >= 0 ? 1 : -1, far: Math.min(1, Math.abs(local.x) / W) }; });
  function pose() { // the book opening toward the reader: a page swings over, the sky card stands, the pieces rise out of the gutter
    const turn = easeOut(Math.min(1, unfold / 0.5));
    if (enter === 'prev') rightPage.rotation.z = (Math.PI / 2) * (1 - turn); // the page turned back comes down from standing at the gutter
    else leftPage.rotation.z = -(enter === 'next' ? Math.PI / 2 : Math.PI) * (1 - turn); // closed, the left page lies over the right half
    const rise = Math.max(0, Math.min(1, (unfold - 0.3) / 0.45)); // the sky's cut-outs, in the book's own axes (its z runs along the gutter)
    for (const sky of skyHinges) sky.hinge.rotation.z = sky.sign * (Math.PI / 2) * (1 - backOut(rise));
    if (fogBand) fogBand.rotation.x = -(Math.PI / 2) * (1 - backOut(rise)); // the fog band lies back toward the spine until it rises
    hinges.forEach((h, i) => { const start = 0.3 + spots[i].far * 0.3, p = Math.max(0, Math.min(1, (unfold - start) / 0.4)); h.quaternion.setFromAxisAngle(axis, spots[i].sign * (Math.PI / 2) * (1 - backOut(p))); });
  }
  pose();
  function fold(dt) {
    const l = Math.min(1, leaving.t += dt / 1.1), down = easeIn(Math.min(1, l / 0.55)), lift = easeIn(Math.max(0, (l - 0.4) / 0.6));
    hinges.forEach((h, i) => { h.quaternion.setFromAxisAngle(axis, spots[i].sign * (Math.PI / 2) * down); h.visible = down < 0.98; });
    for (const sky of skyHinges) { sky.hinge.rotation.z = sky.sign * (Math.PI / 2) * down; sky.hinge.visible = down < 0.98; }
    if (fogBand) { fogBand.rotation.x = -(Math.PI / 2) * down; fogBand.visible = down < 0.98; }
    if (leaving.direction === 'prev') leftPage.rotation.z = -(Math.PI / 2) * lift; else rightPage.rotation.z = (Math.PI / 2) * lift;
    if (l >= 1) { const done = leaving.resolve; leaving = null; done(); }
  }
  function animate(dt) {
    clock += dt * mood.speed;
    for (const m of motions) {
      const t = clock + m.phase;
      if (m.motion === 'sway') m.swing.rotation.set(Math.sin(t * 1.3) * 0.06, 0, Math.sin(t * 1.1) * 0.07);
      else if (m.motion === 'bob') m.swing.position.y = Math.sin(t * 1.6) * 0.06;
      else if (m.motion === 'drift') m.swing.position.set(Math.sin(t * 0.5) * 0.18, Math.sin(t * 0.9) * 0.03, Math.cos(t * 0.4) * 0.08);
      else if (m.motion === 'turn') m.group.rotation.y = m.base + t * 0.6;
      else if (m.motion === 'flicker' && m.index !== lit) { const f = 0.82 + 0.18 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1)); for (const g of m.glowing) { if (g.isLight) g.intensity = glow * 3 * f; else g.emissiveIntensity = glow * f; } }
      else if (m.motion === 'steam') for (const p of m.puffs) { const k = (t * 0.35 + p.userData.offset) % 1; p.position.copy(p.userData.from).add(new T.Vector3(Math.sin(k * 6 + p.userData.offset * 9) * 0.04, 0.05 + k * 0.55, 0)); p.scale.setScalar(0.6 + k * 1.6); p.material.opacity = 0.5 * (1 - k); }
    }
    if (!dt) return; // at rest: where things start, before anything moves
    for (const b of idle) { const t = clock * 0.9 + b.phase; b.swing.scale.set(1, 1 + Math.sin(t) * 0.014, 1); b.swing.rotation.z = Math.sin(t * 0.7) * 0.012; }
    key.intensity = keyBase * (1 + 0.05 * Math.sin(clock * 0.25) * Math.sin(clock * 0.17 + 2)); // light shifting, as if clouds passed
    hinges.forEach((h, i) => { // a piece lifts a little under the pointer; a chosen one hops
      lifted[i] += ((i === over ? 0.06 : 0) - lifted[i]) * Math.min(1, dt * 8);
      const start = hops.get(i), k = start === undefined ? 1 : (clock - start) / 0.55; if (k >= 1) hops.delete(i);
      h.position.y = lifted[i] + (k < 1 ? Math.sin(Math.PI * k) * 0.16 : 0);
    });
  }
  animate(0); // everything starts where it rests (steam above its cup), still until motion is played

  return {
    root, objects, bounds, sky: place.sky,
    background: `#${new T.Color(CHARCOAL).lerp(new T.Color(place.sky), 0.05).getHexString()}`, // every day in the same dark room
    // As a book is read: from the reader's side of the table, looking down at the open spread (about 55°).
    frame: { target: new T.Vector3(centre.x, H * 0.18, centre.z), radius: Math.hypot(W * 1.04, D * 0.5, H * 0.3),
      direction: toward.clone().multiplyScalar(Math.cos(0.95)).add(new T.Vector3(0, Math.sin(0.95), 0)).normalize() },
    fog: null, // fog is a paper band in the book, not haze in the room
    moving: objects.length > 0, // a living page: something always breathes
    get unfolding() { return unfold < 1; },
    // Advances the opening and, when motion is on, the weather and the things that move. True while another frame is needed.
    update(dt, { motion = true } = {}) {
      dt = Math.min(dt, 0.1);
      if (leaving) { fold(dt); return true; }
      if (unfold < 1) { unfold = Math.min(1, unfold + dt / 1.8); pose(); }
      if (motion) { for (const f of weather) f(dt); animate(dt); }
      return unfold < 1 || (motion && objects.length > 0);
    },
    settle() { unfold = 1; pose(); },
    // Turning the page: the pieces fold flat into the gutter and the sky card lies down, then the page lifts to standing at the gutter
    // ('next' lifts the right page, 'prev' the left). Resolves when the page stands; the caller then draws the next day coming in.
    leave(direction = 'next') {
      if (reduced) return Promise.resolve();
      unfold = 1; pose();
      return new Promise((resolve) => { leaving = { direction, t: 0, resolve }; });
    },
    hover(index) { over = index; }, // the piece under the pointer lifts while motion plays
    hop(index) { if (objects[index]) hops.set(index, clock); },
    highlight(index) { // the chosen object glows softly; the last one goes back to how it was
      for (const [i, on] of [[lit, false], [index, true]]) {
        const g = objects[i]; if (!g) continue;
        g.traverse((m) => { if (!m.isMesh || !m.userData.base) return; const b = m.userData.base; m.material.emissive.setHex(on ? 0xf2c94c : b.emissive); m.material.emissiveIntensity = on ? 0.35 : b.intensity; });
      }
      lit = index;
    },
    dispose() { root.traverse((m) => { m.geometry?.dispose(); for (const x of [].concat(m.material || [])) x.dispose(); }); for (const t of textures) t.dispose(); ink.dispose(); puff.dispose(); },
  };
}
export default { buildPlace };
