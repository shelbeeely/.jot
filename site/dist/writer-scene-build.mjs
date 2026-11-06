import { PARTS, buildPart } from './writer-scene-parts.mjs';

// Draws a journal place (scene-journal-core.mjs validatePlace / readPlaceFile) with the bundled three.js (globalThis.JotThree), as a
// pop-up book: an open spread whose floor page carries the place and whose back page stands at the fold, painted with the sky.
// Only Jot's code runs: the place is data, simple shapes with sizes and colours. Card-stock grain, ink outlines and soft shadows give
// every day the same paper look; the place's time, weather and atmosphere (the model's reading of the entry's feeling) give each its
// own light. When a day opens, its pieces rise from the page on hinges; while motion plays the page lives: pieces breathe, motes of
// light drift over it, the light shifts a little, a piece lifts under the pointer and hops when chosen. With reduced motion (or
// Pause motion) it all stays still. Each object is a group with userData.object = its index, so a click can find it.
//
// media (optional) is the day's own: { screen: { label, title }, book: { title }, picture: an image of an attached picture }. Screens
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
const easeOut = (x) => 1 - (1 - x) ** 3;

// Paper made in the page (nothing is fetched): card-stock grain, a dot-grid page and the painted sky of the back page.
function paperTextures(T, doc, place, mood) {
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
  const sky = make(512, 384, (g, w, h) => {
    const top = new T.Color(place.sky).offsetHSL(0, mood.sat, mood.light - 0.04), low = new T.Color(place.sky).lerp(new T.Color(PAPER), 0.55);
    const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, `#${top.getHexString()}`); grad.addColorStop(1, `#${low.getHexString()}`);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.shadowColor = 'rgba(40,30,20,.22)'; g.shadowBlur = 8; g.shadowOffsetX = 3; g.shadowOffsetY = 4; // cut paper lifted off the page
    const disc = (x, y, r, colour) => { g.fillStyle = colour; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    const cloud = (x, y, s, colour) => { g.fillStyle = colour; g.beginPath(); for (const [dx, dy, r] of [[0, 0, 1], [0.9, -0.35, 0.8], [1.7, 0.05, 0.75], [-0.8, 0.15, 0.7]]) { g.moveTo(x + (dx + r) * s, y + dy * s); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); } g.fill(); };
    const wet = ['rain', 'fog', 'snow'].includes(place.weather);
    if (place.time === 'night') {
      g.save(); g.shadowBlur = 0; g.shadowOffsetX = g.shadowOffsetY = 0; g.fillStyle = 'rgba(255,250,225,.85)';
      for (let i = 0; i < 40; i++) { const x = seeded(i + 1.3) * w, y = seeded(i + 9.7) * h * 0.6; g.fillRect(x, y, 2.4, 2.4); }
      g.restore(); if (!wet) disc(w * 0.78, h * 0.22, 26, '#f4f0dc');
    } else if (!wet) {
      const [x, y, r, colour] = { morning: [0.2, 0.55, 34, '#ffd27a'], day: [0.8, 0.2, 30, '#fff0a8'], evening: [0.72, 0.6, 46, '#ff9a5c'] }[place.time] || [0.8, 0.2, 30, '#fff0a8'];
      disc(w * x, h * y, r, colour);
    }
    if (place.weather !== 'sun') {
      const colour = wet ? '#aab3c0' : 'rgba(255,255,255,.92)';
      for (let i = 0; i < (wet ? 4 : 2); i++) cloud(w * (0.12 + i * 0.24 + seeded(i + 4.2) * 0.08), h * (0.16 + seeded(i + 2.1) * 0.18), 22 + seeded(i) * 8, colour);
    }
    g.shadowColor = 'transparent'; grain(g, w, h, 12);
  });
  return { card, dots, sky, all: [card, dots, sky] };
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

export function buildPlace(T, place, { reduced = false, document: doc = globalThis.document, media = null } = {}) {
  const root = new T.Group(), objects = [], hinges = [], lights = [], weather = [], motions = [], textures = [], idle = [];
  const mood = ATMOSPHERE[place.atmosphere] || ATMOSPHERE.neutral;
  const [tint, sun, hemi] = LIGHT[place.time] || LIGHT.day, glow = (GLOW[place.time] ?? 0.4) * mood.glow;
  const paper = doc?.createElement ? paperTextures(T, doc, place, mood) : null; if (paper) textures.push(...paper.all);
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
    if (kind === 'screen' && media.screen) map = titleCard(T, doc, { label: media.screen.label, title: media.screen.title, aspect, glyph: '▶' });
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
  // toward the reader, the place standing across both, and a painted sky card standing along the far edge.
  const toward = new T.Vector3(place.camera.position[0] - place.camera.target[0], 0, place.camera.position[2] - place.camera.target[2]);
  if (toward.lengthSq() < 1e-6) toward.set(0, 0, 1); toward.normalize();
  const book = new T.Group(); book.position.copy(centre); book.rotation.y = Math.atan2(toward.x, toward.z); root.add(book);
  const up = new T.Vector3(0, 1, 0), axis = new T.Vector3(0, 0, 1).applyAxisAngle(up, book.rotation.y); // the gutter's direction, about which things rise
  const slab = (w, h, d, material) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), material); m.receiveShadow = true; return m; };
  const floorTint = grade(place.ground).lerp(new T.Color(PAPER), 0.3);
  const dots = paper?.dots; if (dots) dots.repeat.set(R / 2, R);
  const pageMat = new T.MeshStandardMaterial({ color: floorTint, roughness: place.weather === 'rain' ? 0.55 : 1, map: dots || null, flatShading: true });
  const edgeMat = new T.MeshStandardMaterial({ color: PAPER, roughness: 1, map: paper?.card || null }), coverMat = new T.MeshStandardMaterial({ color: COVER, roughness: 0.9 });
  const W = R; // each page is half the spread
  const side = (sign) => { // one page: the page, the block of pages under it, the cover under that
    const g = new T.Group();
    const page = slab(W, 0.05, 2 * R, pageMat); page.position.set(sign * W / 2, -0.025, 0);
    const block = slab(W + 0.12, 0.08, 2 * R + 0.14, edgeMat); block.position.set(sign * (W / 2 + 0.06), -0.07, 0);
    const board = slab(W + 0.26, 0.05, 2 * R + 0.3, coverMat); board.position.set(sign * (W / 2 + 0.12), -0.135, 0);
    g.add(page, block, board); for (const m of [page, block, board]) m.raycast = () => {};
    return g;
  };
  const leftPage = side(-1), rightPage = side(1); book.add(leftPage, rightPage);
  const gutter = new T.Mesh(new T.PlaneGeometry(0.16, 2 * R), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.16, depthWrite: false }));
  gutter.rotation.x = -Math.PI / 2; gutter.position.y = 0.003; gutter.raycast = () => {}; book.add(gutter); // the fold's soft shadow
  const spine = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 2 * R + 0.3, 16, 1, false, 0, Math.PI), coverMat); spine.rotation.set(Math.PI / 2, 0, Math.PI / 2); spine.position.y = -0.16; spine.raycast = () => {}; book.add(spine);
  // The sky card: a pop-up layer standing along the far edge of both pages, folded flat until the book opens.
  const backPage = new T.Group(); backPage.position.set(0, 0, -R + 0.05); book.add(backPage);
  const painted = new T.Mesh(new T.PlaneGeometry(2 * W * 0.96, H), new T.MeshStandardMaterial({ color: paper ? '#ffffff' : grade(place.sky), map: paper?.sky || null, roughness: 1, side: T.DoubleSide }));
  painted.position.set(0, H / 2, 0.025); painted.receiveShadow = true;
  const backMargin = slab(2 * W * 0.96 + 0.12, H + 0.1, 0.035, edgeMat); backMargin.position.set(0, H / 2 + 0.02, 0);
  backPage.add(painted, backMargin);
  for (const m of [painted, backMargin]) m.raycast = () => {};

  // Key light and its soft shadow, fitted to the book.
  key.position.copy(centre).add(new T.Vector3(0.45, 0.85, 0.35).applyAxisAngle(new T.Vector3(0, 1, 0), book.rotation.y).multiplyScalar(R * 3)); key.target.position.copy(centre);
  rim.position.copy(centre).add(new T.Vector3(-0.5, 0.6, -1).applyAxisAngle(new T.Vector3(0, 1, 0), book.rotation.y).multiplyScalar(R * 3)); rim.target.position.copy(centre);
  Object.assign(key.shadow.camera, { left: -R * 1.4, right: R * 1.4, top: R * 1.4, bottom: -R * 1.4, near: 0.1, far: R * 8 }); key.shadow.camera.updateProjectionMatrix();

  // Weather: rain as falling streaks, snow as drifting points, over the page.
  if (place.weather === 'rain' || place.weather === 'snow') {
    const rain = place.weather === 'rain', n = rain ? 700 : 500, pos = new Float32Array(n * (rain ? 6 : 3)), speed = rain ? 6 : 0.7;
    for (let i = 0; i < n; i++) {
      const x = (seeded(i) - 0.5) * 1.9 * R, y = seeded(i + 7.1) * H, z = (seeded(i + 3.3) - 0.5) * 1.9 * R; // over the page, in the book's own axes
      if (rain) pos.set([x, y, z, x - 0.02, y - 0.24, z], i * 6); else pos.set([x, y, z], i * 3);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const mat = rain ? new T.LineBasicMaterial({ color: '#8fa3bf', transparent: true, opacity: 0.6 }) : new T.PointsMaterial({ color: '#ffffff', size: 0.06, transparent: true, opacity: 0.95 });
    const drops = rain ? new T.LineSegments(geo, mat) : new T.Points(geo, mat); drops.userData.weather = true; drops.raycast = () => {}; book.add(drops);
    weather.push((dt) => {
      const a = geo.attributes.position.array, step = rain ? 6 : 3;
      for (let i = 0; i < a.length; i += step) {
        const fall = speed * mood.speed * dt, drift = rain ? 0 : Math.sin((a[i + 1] + i) * 0.7) * 0.15 * dt;
        a[i + 1] -= fall; a[i] += drift; if (rain) { a[i + 4] -= fall; a[i + 3] += drift; }
        if (a[i + 1] < 0) { a[i + 1] += H; if (rain) a[i + 4] += H; }
      }
      geo.attributes.position.needsUpdate = true;
    });
  }

  // Motes of light drifting over the page: warm glints by lamplight and starlight, dust in daylight (rain and snow have their own).
  let motes = null;
  if (place.weather !== 'rain' && place.weather !== 'snow') {
    const n = 56, pos = new Float32Array(n * 3), home = [];
    for (let i = 0; i < n; i++) { const h = [(seeded(i + 0.31) - 0.5) * 1.7 * R, 0.25 + seeded(i + 5.17) * H * 0.75, (seeded(i + 8.43) - 0.5) * 1.7 * R]; home.push(h); pos.set(h, i * 3); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const warm = place.time === 'evening' || place.time === 'night', mat = new T.PointsMaterial({ color: warm ? '#ffd98a' : '#fff6dc', size: warm ? 0.07 : 0.045, transparent: true, opacity: warm ? 0.75 : 0.5, depthWrite: false });
    const points = new T.Points(geo, mat); points.raycast = () => {}; book.add(points);
    motes = { geo, home, mat, base: mat.opacity };
  }

  // Steam: a few soft puffs rising from the top of the thing.
  const puff = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
  for (const m of motions) {
    if (m.motion !== 'steam') continue;
    const top = new T.Box3().expandByObject(m.group), at = m.hinge.worldToLocal(new T.Vector3((top.min.x + top.max.x) / 2, top.max.y, (top.min.z + top.max.z) / 2));
    m.puffs = Array.from({ length: 4 }, (_, i) => { const p = new T.Mesh(new T.SphereGeometry(0.05, 8, 6), puff.clone()); p.raycast = () => {}; p.userData.from = at.clone(); p.userData.offset = i / 4; m.swing.add(p); return p; });
  }

  let clock = 0, unfold = reduced ? 1 : 0, lit = -1, over = -1;
  const lifted = hinges.map(() => 0), hops = new Map(), keyBase = key.intensity;
  // Where each piece stands: which side of the gutter (it folds toward the gutter) and how far from it (the nearest rise first).
  const spots = hinges.map((h) => { const local = book.worldToLocal(h.getWorldPosition(new T.Vector3())); return { sign: local.x >= 0 ? 1 : -1, far: Math.min(1, Math.abs(local.x) / R) }; });
  function pose() { // the book opening toward the reader: the right page swings over, the sky card stands, the pieces rise out of the gutter
    const turn = easeOut(Math.min(1, unfold / 0.5));
    rightPage.rotation.z = Math.PI * (1 - turn); // closed, the right page lies over the left one
    backPage.rotation.x = -(Math.PI / 2) * (1 - easeOut(Math.max(0, Math.min(1, (unfold - 0.25) / 0.45)))); // in the book's own axes
    hinges.forEach((h, i) => { const start = 0.3 + spots[i].far * 0.3, p = Math.max(0, Math.min(1, (unfold - start) / 0.4)); h.quaternion.setFromAxisAngle(axis, spots[i].sign * (Math.PI / 2) * (1 - backOut(p))); });
  }
  pose();
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
    if (motes) {
      const a = motes.geo.attributes.position.array;
      motes.home.forEach((h, i) => { const t = clock * 0.35 + i; a[i * 3] = h[0] + Math.sin(t * 0.9) * 0.25; a[i * 3 + 1] = h[1] + Math.sin(t * 0.6 + i) * 0.18; a[i * 3 + 2] = h[2] + Math.cos(t * 0.7) * 0.25; });
      motes.geo.attributes.position.needsUpdate = true; motes.mat.opacity = motes.base * (0.75 + 0.25 * Math.sin(clock * 1.3));
    }
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
    // The whole open book, seen from the reader's side of the place, a little above it, as a book is read.
    frame: { target: new T.Vector3(centre.x, H * 0.28, centre.z), radius: Math.hypot(R * 0.96, H * 0.5),
      direction: toward.clone().multiplyScalar(Math.cos(0.6)).add(new T.Vector3(0, Math.sin(0.6), 0)).normalize() },
    fog: place.weather === 'fog' ? { color: `#${new T.Color(CHARCOAL).lerp(new T.Color(place.sky), 0.35).getHexString()}`, near: R * 2.4, far: R * 7.5 } : null,
    moving: objects.length > 0, // a living page: something always breathes
    get unfolding() { return unfold < 1; },
    // Advances the opening and, when motion is on, the weather and the things that move. True while another frame is needed.
    update(dt, { motion = true } = {}) {
      dt = Math.min(dt, 0.1);
      if (unfold < 1) { unfold = Math.min(1, unfold + dt / 1.8); pose(); }
      if (motion) { for (const f of weather) f(dt); animate(dt); }
      return unfold < 1 || (motion && objects.length > 0);
    },
    settle() { unfold = 1; pose(); },
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
