// Draws a journal place (scene-journal-core.mjs validatePlace / readPlaceFile) with the bundled three.js (globalThis.JotThree).
// Only Jot's code runs: the place is data, simple shapes with sizes and colours. Low-poly, flat-shaded, with the place's weather
// (rain, snow, fog) and time of day. Each object is a group with userData.object = its index, so a click can find it.
//
//   buildPlace(T, place) -> { root, objects: [Group], sky, fog: { color, near, far } | null, tick(seconds), highlight(index), dispose() }

// Night and evening stay readable: a dim key light, but enough fill to see the place (a live run's night desk was nearly black).
const LIGHT = { morning: ['#ffe0b5', 2.2, 0.6], day: ['#ffffff', 2.6, 0.75], evening: ['#ffb27a', 1.5, 0.7], night: ['#9db1ff', 0.7, 0.55] };
const GLOW = { morning: 0.5, day: 0.35, evening: 1.2, night: 1.8 };

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

export function buildPlace(T, place) {
  const root = new T.Group(), objects = [], lights = [], weather = [];
  const [tint, sun, hemi] = LIGHT[place.time] || LIGHT.day, glow = GLOW[place.time] ?? 0.4;
  const lift = (c) => new T.Color(c).lerp(new T.Color('#ffffff'), 0.55); // fill light from the sky and ground colours, lightened so dark places stay readable
  root.add(new T.HemisphereLight(lift(place.sky), lift(place.ground), hemi));
  const key = new T.DirectionalLight(tint, sun); key.position.set(4, 8, 5); root.add(key);
  if (place.weather === 'sun') { const warm = new T.DirectionalLight('#fff2cf', 0.8); warm.position.set(-5, 6, 2); root.add(warm); }
  // The ground: a low disc of the place's ground colour.
  const groundMat = new T.MeshStandardMaterial({ color: place.ground, roughness: place.weather === 'rain' ? 0.35 : 0.95, flatShading: true });
  const ground = new T.Mesh(new T.CylinderGeometry(1, 1.04, 0.25, 48), groundMat); ground.position.y = -0.125; root.add(ground); // sized to the place below
  place.objects.forEach((o, index) => {
    const group = new T.Group(); group.userData.object = index; group.name = o.name;
    group.position.set(...o.position); group.rotation.set(...o.rotation);
    for (const s of o.shapes) {
      const material = new T.MeshStandardMaterial({ color: s.color, roughness: s.roughness, metalness: 0, flatShading: true,
        emissive: s.glow ? s.color : '#000000', emissiveIntensity: s.glow ? glow : 0, ...(s.type === 'plane' ? { side: T.DoubleSide } : {}) });
      const mesh = new T.Mesh(geometry(T, s), material);
      mesh.position.set(...s.position); mesh.rotation.set(...s.rotation);
      if (s.type === 'sphere') mesh.scale.set(...s.size);
      mesh.userData.base = { emissive: material.emissive.getHex(), intensity: material.emissiveIntensity };
      group.add(mesh);
      if (s.glow && lights.length < 6) { const l = new T.PointLight(s.color, glow * 3, 6, 2); l.position.set(...s.position); group.add(l); lights.push(l); }
    }
    root.add(group); objects.push(group);
  });
  // Weather: rain as falling streaks, snow as drifting points, fog as distance haze (set on the scene by the caller).
  if (place.weather === 'rain' || place.weather === 'snow') {
    const rain = place.weather === 'rain', n = rain ? 900 : 700, pos = new Float32Array(n * (rain ? 6 : 3)), speed = rain ? 7 : 0.8;
    const seed = (i) => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };
    for (let i = 0; i < n; i++) {
      const x = (seed(i) - 0.5) * 13, y = seed(i + 7.1) * 8, z = (seed(i + 3.3) - 0.5) * 13;
      if (rain) pos.set([x, y, z, x - 0.02, y - 0.28, z], i * 6); else pos.set([x, y, z], i * 3);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const mat = rain ? new T.LineBasicMaterial({ color: '#c9d6e8', transparent: true, opacity: 0.55 }) : new T.PointsMaterial({ color: '#ffffff', size: 0.06, transparent: true, opacity: 0.9 });
    const drops = rain ? new T.LineSegments(geo, mat) : new T.Points(geo, mat); drops.userData.weather = true; root.add(drops);
    weather.push((dt) => {
      const a = geo.attributes.position.array, step = rain ? 6 : 3;
      for (let i = 0; i < a.length; i += step) {
        const fall = speed * dt, drift = rain ? 0 : Math.sin((a[i + 1] + i) * 0.7) * 0.15 * dt;
        a[i + 1] -= fall; a[i] += drift; if (rain) { a[i + 4] -= fall; a[i + 3] += drift; }
        if (a[i + 1] < 0) { a[i + 1] += 8; if (rain) a[i + 4] += 8; }
      }
      geo.attributes.position.needsUpdate = true;
    });
  }
  // How big the place is (objects only, not the ground or weather): the view keeps far enough back to see all of it.
  // Framed on what the day is about: the things that hold sentences, or everything when none do.
  const box = new T.Box3(), held = objects.filter((g, i) => place.objects[i].moments.length); for (const g of held.length ? held : objects) box.expandByObject(g);
  const bounds = box.isEmpty() ? null : box.getBoundingSphere(new T.Sphere());
  const reach = Math.max(2.5, (bounds?.radius || 3) * 1.5); ground.scale.set(reach, 1, reach); if (bounds) ground.position.set(bounds.center.x, -0.125, bounds.center.z);
  let lit = -1;
  return {
    root, objects, sky: place.sky, bounds,
    fog: place.weather === 'fog' ? { color: place.sky, near: 4, far: 16 } : place.weather === 'rain' ? { color: place.sky, near: 10, far: 30 } : null,
    moving: weather.length > 0,
    tick(dt) { for (const f of weather) f(Math.min(dt, 0.1)); },
    highlight(index) { // the chosen object glows softly; the last one goes back to how it was
      for (const [i, on] of [[lit, false], [index, true]]) {
        const g = objects[i]; if (!g) continue;
        g.traverse((m) => { if (!m.isMesh) return; const b = m.userData.base; m.material.emissive.setHex(on ? 0xf2c94c : b.emissive); m.material.emissiveIntensity = on ? 0.35 : b.intensity; });
      }
      lit = index;
    },
    dispose() { root.traverse((m) => { m.geometry?.dispose(); for (const x of [].concat(m.material || [])) x.dispose(); }); },
  };
}
export default { buildPlace };
