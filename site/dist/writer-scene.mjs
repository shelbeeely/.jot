// The Scenes view: each dated entry as a small 3D place a model designs from the entry's words (spec 8.1.9). Drag to turn it,
// scroll to zoom (or arrow keys and + or −), choose a thing to read the moments it holds (the writer's own sentences), switch days
// with the tabs, and open the whole entry. Each place is drawn as a pop-up book (writer-scene-build.mjs); its look is the model's
// interpretation of the entry, and the view says so. Nothing is sent until Make this day's scene, after the writer sees exactly what goes where; a made scene is a
// draft until Keep it, which saves it as an attachment and one `@setting:` line (with Undo). Kept scenes draw with no model.
// It loads three.js only when shown, never edits the writing on its own, and clears when the journal locks.
// The view is a theatre (Jot's charcoal room, light ink, cream paper): the day's own title and first sentence over the scene, the
// things that hold moments beside it, a paper card for the chosen moment, the whole entry in a paper dialog, a pill of days below
// and Full screen. With readOnly (the site's demo page) it only shows kept scenes: nothing is made, sent or kept.
import { journalDays, placePrompt, validatePlace, placeFile, readPlaceFile, settingEdit, PLACE_SCHEMA } from './scene-journal-core.mjs';
import { buildPlace } from './writer-scene-build.mjs';
import { requestJSON } from './ai-client.mjs';
import { mediaMentions } from './media-shelf-core.mjs';

export function setupWriterScene({ editor, jumpTo = null, rewrite, placeText = () => null, attachPlace, renderEntry, ai, asset = () => null, readOnly = false, heading = 'Scenes', eyebrow = '', mount = null }) {
  const doc = editor.ownerDocument, win = doc.defaultView;
  const el = (tag, text, attributes = {}) => { const n = doc.createElement(tag); if (text !== undefined) n.textContent = text; for (const [k, v] of Object.entries(attributes)) n.setAttribute(k, v); return n; };
  const button = (text, attributes = {}) => el('button', text, { type: 'button', ...attributes });
  const section = el('section', undefined, { id: 'writerScenes', class: 'writer-scenes', 'aria-labelledby': 'writerScenesTitle' }); section.hidden = true;
  const summary = el('p', '', { id: 'writerScenesSummary', class: 'writer-scenes-summary', role: 'status' });
  const head = el('div', undefined, { class: 'writer-scenes-head' }); head.append(el('h2', heading, { id: 'writerScenesTitle' }), summary);
  const tabs = el('div', undefined, { class: 'writer-scenes-tabs', role: 'tablist', 'aria-label': 'Days' });
  const panel = el('div', undefined, { id: 'writerScenesPanel', class: 'writer-scenes-panel', role: 'tabpanel' });
  // Over the scene: the date, the day's own title, its first sentence (the writer's words) and what the scene is.
  const lede = el('div', undefined, { class: 'writer-scenes-lede' });
  const dateLine = el('p', '', { class: 'writer-scenes-eyebrow' }), headline = el('h3', '', { class: 'writer-scenes-headline' }), first = el('p', '', { class: 'writer-scenes-first' });
  const about = el('p', '', { class: 'writer-scenes-about' });
  lede.append(dateLine, headline, first, about);
  const stage = el('div', undefined, { class: 'writer-scenes-stage' }); stage.hidden = true;
  const tools = el('div', undefined, { class: 'writer-scenes-tools' });
  const pause = button('Pause motion', { 'aria-pressed': 'false', id: 'writerScenesPause' }), resetView = button('Reset view', { id: 'writerScenesReset' });
  const full = button('Full screen', { id: 'writerScenesFull', 'aria-pressed': 'false' });
  const readEntry = button('Open journal ↗', { id: 'writerScenesJournal', class: 'accent' });
  tools.append(resetView, pause, full, readEntry);
  const hint = el('p', 'Choose a thing to read its moment. Drag to turn · scroll to zoom', { class: 'writer-scenes-hint' });
  const draftBar = el('div', undefined, { class: 'writer-scenes-draft', role: 'group', 'aria-label': 'This scene is a draft' }); draftBar.hidden = true;
  const keep = button('Keep it', { id: 'writerScenesKeep', class: 'button' }), again = button('Try again', { id: 'writerScenesAgain' }), discard = button('Discard', { id: 'writerScenesDiscard', class: 'quiet' });
  draftBar.append(el('span', 'A draft: nothing is saved until you keep it.'), keep, again, discard);
  const make = el('div', undefined, { class: 'writer-scenes-make' });
  const confirm = el('div', undefined, { class: 'writer-scenes-confirm', role: 'group', 'aria-labelledby': 'writerScenesConfirmTitle' }); confirm.hidden = true;
  const things = el('ul', undefined, { class: 'writer-scenes-things', 'aria-label': 'Things in this scene' });
  const moment = el('div', undefined, { class: 'writer-scenes-moment', role: 'region', 'aria-live': 'polite', 'aria-label': 'Moment' });
  const journal = el('dialog', undefined, { class: 'writer-scenes-journal', 'aria-label': 'The whole entry' });
  // Below the scene: the day counter and title, and the pill of days with previous and next.
  const counter = el('span', '', { class: 'writer-scenes-counter' }), caption = el('p', undefined, { class: 'writer-scenes-caption' }), captionTitle = el('span', '');
  caption.append(counter, captionTitle);
  const prev = button('←', { class: 'writer-scenes-step', 'aria-label': 'Previous day' }), next = button('→', { class: 'writer-scenes-step', 'aria-label': 'Next day' });
  const pill = el('div', undefined, { class: 'writer-scenes-pill' }); pill.append(prev, tabs, next);
  const nav = el('nav', undefined, { class: 'writer-scenes-nav', 'aria-label': 'Days' }); nav.append(caption, pill);
  panel.append(stage, lede, tools, things, moment, make, hint);
  const theatre = el('div', undefined, { class: 'writer-scenes-theatre' }); theatre.append(panel, nav);
  section.append(head, theatre, confirm, draftBar, journal);
  if (mount) mount.append(section); else (doc.querySelector('.writing-grid') || doc.body).after(section);
  if (!doc.fullscreenEnabled || !theatre.requestFullscreen) full.hidden = true;
  full.onclick = async () => { try { if (doc.fullscreenElement) await doc.exitFullscreen(); else await theatre.requestFullscreen(); } catch { /* the browser said no */ } };
  doc.addEventListener('fullscreenchange', () => { const on = doc.fullscreenElement === theatre; full.setAttribute('aria-pressed', String(on)); full.textContent = on ? 'Leave full screen' : 'Full screen'; });
  prev.onclick = () => { if (current > 0) select(current - 1); };
  next.onclick = () => { if (current < days.length - 1) select(current + 1); };

  // Still pages: the system's reduced-motion setting, or Writer's own (Preferences → Reduce motion).
  const media = win.matchMedia('(prefers-reduced-motion: reduce)'), reduced = { get matches() { return media.matches || doc.documentElement.hasAttribute('data-pref-motion'); } };
  const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayName = (d) => { const t = new Date(d.date + 'T12:00:00Z'); return Number.isNaN(+t) ? d.date : dateFormat.format(t); };
  const longDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const dayLong = (d) => { const t = new Date(d.date + 'T12:00:00Z'); return Number.isNaN(+t) ? d.date : longDate.format(t); };
  function setLede(day, place = null) { // the writer's own words first: the day's title and its first sentence
    dateLine.textContent = day ? `${dayLong(day)}${eyebrow ? ` · ${eyebrow}` : ''}` : '';
    headline.textContent = day ? day.label || place?.title || dayName(day) : '';
    first.textContent = day?.sentences[0] || '';
    counter.textContent = day ? `${String(current + 1).padStart(2, '0')} / ${String(days.length).padStart(2, '0')}` : '';
    captionTitle.textContent = day ? day.label || dayName(day) : '';
    prev.disabled = current <= 0; next.disabled = current >= days.length - 1;
  }
  let days = [], current = 0, drafts = new Map(), view = null, three = null, controller = null, timer = 0, shown = false, paused = reduced.matches, frame = 0, last = 0, key = '', glide = null;
  const keyOf = (d) => `${d.date}#${days.filter((x) => x.date === d.date).indexOf(d)}`; // the same date can hold more than one entry

  // three.js, its renderer and controls: made once, on first show.
  async function engine() {
    if (three) return three;
    await import('./jot/vendor/three.mjs');
    const T = globalThis.JotThree, canvas = el('canvas', undefined, { class: 'writer-scenes-canvas', role: 'img', tabindex: '0' });
    const renderer = new T.WebGLRenderer({ canvas, antialias: true }); renderer.outputColorSpace = T.SRGBColorSpace; renderer.setPixelRatio(Math.min(win.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.toneMapping = T.NeutralToneMapping; renderer.toneMappingExposure = 1.08;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(45, 16 / 10, 0.05, 200), controls = new T.OrbitControls(camera, canvas);
    controls.enableDamping = false; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 1.2; controls.maxDistance = 30;
    controls.addEventListener('change', draw); controls.addEventListener('start', () => { glide = null; }); // a drag takes over from a glide
    // Keys on the focused scene: arrows turn it around what it looks at, + and − (or Page Up and Page Down) zoom.
    canvas.addEventListener('keydown', (e) => {
      const turn = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key], zoom = { '+': 0.85, '=': 0.85, PageUp: 0.85, '-': 1.18, _: 1.18, PageDown: 1.18 }[e.key];
      if (!turn && !zoom) return; e.preventDefault();
      const offset = camera.position.clone().sub(controls.target), sphere = new T.Spherical().setFromVector3(offset);
      if (turn) { sphere.theta += turn[0] * 0.18; sphere.phi = Math.max(0.15, Math.min(controls.maxPolarAngle, sphere.phi + turn[1] * 0.12)); }
      if (zoom) sphere.radius = Math.max(controls.minDistance, Math.min(controls.maxDistance, sphere.radius * zoom));
      camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(sphere)); controls.update(); draw();
    });
    stage.append(canvas);
    new win.ResizeObserver(() => { const w = stage.clientWidth || 640, h = stage.clientHeight || 400; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw(); }).observe(stage);
    // A click (not a drag) chooses the thing under the pointer; the thing under a resting pointer lifts a little.
    let down = null;
    const under = (e) => {
      const r = canvas.getBoundingClientRect(), ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      for (const hit of ray.intersectObjects(view.built.objects, true)) { let o = hit.object; while (o && o.userData.object === undefined) o = o.parent; if (o) return o.userData.object; }
      return -1;
    };
    canvas.addEventListener('pointermove', (e) => { if (!view || e.buttons) return; const i = under(e); canvas.style.cursor = i >= 0 ? 'pointer' : ''; view.built.hover(i); draw(); });
    canvas.addEventListener('pointerleave', () => { if (view) { view.built.hover(-1); draw(); } });
    canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || !view) return;
      const i = under(e); if (i >= 0) choose(i);
    });
    three = { T, renderer, scene, camera, controls, canvas };
    return three;
  }
  function draw() { if (!frame && three && shown) frame = win.requestAnimationFrame(tick); }
  function tick(now) {
    frame = 0; if (!three || !view) return;
    const dt = last ? (now - last) / 1000 : 0; last = now;
    let more = view.built.update(dt, { motion: !paused }); // the opening always finishes; weather and movement only when playing
    if (glide) { // the view gliding toward a chosen thing (or back to the whole book)
      glide.t = Math.min(1, glide.t + dt / 0.9); const k = 1 - (1 - glide.t) ** 3;
      three.camera.position.lerpVectors(glide.from, glide.to, k); three.controls.target.lerpVectors(glide.fromTarget, glide.toTarget, k); three.controls.update();
      if (glide.t >= 1) glide = null; else more = true;
    }
    if (more) draw(); else last = 0;
    three.renderer.render(three.scene, three.camera);
  }
  function clearView() {
    if (view) { three.scene.remove(view.built.root); view.built.dispose(); }
    view = null; things.replaceChildren(); moment.replaceChildren(); stage.hidden = true; tools.hidden = true; draftBar.hidden = true; hint.hidden = true; things.hidden = true;
  }

  // The day's own media for the scene's screens, covers and frames: titles the entry names with what was done (Watched, Listened to,
  // Reading; never "want to"), and the first picture it attaches, read from the journal's own bytes. Nothing is fetched.
  const SCREEN_KINDS = new Set(['film', 'tv', 'video', 'anime', 'game-or-film', 'music', 'podcast']);
  async function mediaOf(day) {
    if (!day) return null;
    let mentions = [];
    try { mentions = mediaMentions(editor.value).filter((m) => m.position >= day.start && m.position < day.end && m.status !== 'want'); } catch { /* no media */ }
    const watched = mentions.find((m) => SCREEN_KINDS.has(m.kind)), reading = mentions.find((m) => m.kind === 'book');
    let picture = null;
    for (const m of editor.value.slice(day.start, day.end).matchAll(/!\[[^\]]*\]\((media\/[^\s)]+)\)/g)) {
      const a = asset(m[1]); if (!a?.url || !/^image\//.test(a.mediaType || '')) continue;
      const image = new win.Image(); image.src = a.url;
      try { await Promise.race([image.decode(), new Promise((_, no) => win.setTimeout(() => no(new Error('slow')), 3000))]); picture = image; } catch { /* left blank */ }
      break;
    }
    return { screen: watched ? { label: watched.activity || 'Mentioned', title: watched.title } : null, book: reading ? { title: reading.title } : null, picture };
  }

  async function show3D(place, { draft = false, model = '', day = null } = {}) {
    const t = await engine(), { T } = t, media = await mediaOf(day);
    if (view) clearView();
    const built = buildPlace(T, place, { reduced: reduced.matches, document: doc, media });
    t.scene.add(built.root); t.scene.background = new T.Color(built.background); theatre.style.background = built.background; // the room and the scene are one colour
    t.scene.fog = built.fog ? new T.Fog(built.fog.color, built.fog.near, built.fog.far) : null;
    view = { place, built, draft };
    stage.hidden = false; tools.hidden = false; draftBar.hidden = !draft; pause.hidden = !built.moving; hint.hidden = false; things.hidden = false;
    t.canvas.setAttribute('aria-label', `${place.title}: a pop-up scene of this day. Drag or use the arrow keys to turn it; scroll or press + and − to zoom. The things in it are listed beside it.`);
    reset3D(true);
    const by = draft ? model : place.made?.model || '', feel = place.atmosphere && place.atmosphere !== 'neutral' ? `, with a ${place.atmosphere} feel` : '';
    about.textContent = `${place.title}. ${by ? `Imagined by ${by}` : 'Imagined'} from this entry's words${feel}: the look is an interpretation; the moments are the entry's own sentences. ${draft ? 'Made just now. ' : ''}Choose a thing to read its moment.`;
    const held = place.objects.map((o, i) => [o, i]).filter(([o]) => o.moments.length);
    for (const [o, i] of held) { const li = el('li'), b = button(o.name, { 'data-object': String(i) }); b.onclick = () => choose(i, true); li.append(b); things.append(li); }
    if (!held.length) things.append(el('li', 'Nothing in this scene is tied to a sentence yet.'));
    draw();
  }
  function reset3D(instant = false) { // the whole open book from the reader's side (or the model's camera, moved to fit the place)
    if (!view || !three) return;
    const { T, camera, controls } = three, target = new T.Vector3(...view.place.camera.target), from = new T.Vector3(...view.place.camera.position), b = view.built.bounds, f = view.built.frame;
    if (f) { // fit the book in the narrower of the view's two directions, so a phone held upright sees all of it too
      const half = Math.min((camera.fov * Math.PI) / 360, Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)), d = (f.radius / Math.sin(half)) * 1.02;
      target.copy(f.target); from.copy(f.target).add(f.direction.clone().multiplyScalar(d)); controls.maxDistance = Math.max(30, d * 2.5);
    } else if (b) {
      const need = (b.radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.05, dir = from.clone().sub(target);
      if (dir.lengthSq() < 1e-6) dir.set(1, 0.6, 1);
      // From the model's side, at the distance that fits the whole place: never inside it, never so far it is a speck.
      const d = from.distanceTo(b.center); if (d < need || d > need * 1.6) { target.copy(b.center); from.copy(b.center).add(dir.normalize().multiplyScalar(need)); }
    }
    move(from, target, instant);
  }
  // Moves the view: a glide while motion plays, at once with reduced motion or Pause motion.
  function move(to, toTarget, instant = false) {
    const { camera, controls } = three; glide = null;
    if (instant || paused || !camera.position.distanceToSquared(to)) { camera.position.copy(to); controls.target.copy(toTarget); controls.update(); draw(); return; }
    glide = { t: 0, from: camera.position.clone(), to: to.clone(), fromTarget: controls.target.clone(), toTarget: toTarget.clone() }; last = 0; draw();
  }
  function lookAt(index) { // closer to a chosen thing, from the side the reader is already looking from
    const { T, camera, controls } = three, g = view.built.objects[index]; if (!g) return;
    const s = new T.Box3().expandByObject(g).getBoundingSphere(new T.Sphere()), dir = camera.position.clone().sub(controls.target).normalize();
    const d = Math.max(controls.minDistance * 1.2, (Math.max(s.radius, 0.25) / Math.sin((camera.fov * Math.PI) / 360)) * 2.2);
    move(s.center.clone().add(dir.multiplyScalar(d)), s.center);
  }
  function choose(index, fromList = false) {
    if (!view) return; const o = view.place.objects[index]; if (!o) return;
    view.built.highlight(index); view.built.hop(index); lookAt(index); draw();
    moment.replaceChildren(el('h3', o.name));
    // The moment writes itself in ink (a CSS reveal; shown at once with reduced motion). The words are the entry's own.
    moment.classList.remove('is-inking'); void moment.offsetWidth; moment.classList.add('is-inking');
    if (!o.moments.length) moment.append(el('p', 'Nothing in the entry is tied to this.'));
    else { const ul = el('ul'); for (const m of o.moments) { const text = typeof m === 'string' ? m : m.text; const li = el('li', text); if (m.missing) li.append(el('span', ' (no longer in this entry)', { class: 'writer-scenes-missing' })); ul.append(li); } moment.append(ul); }
    const day = days[current], open = button('Open journal', { class: 'writer-scenes-open' }); open.onclick = () => openJournal(); moment.append(open);
    if (jumpTo) { const go = button('Go to this entry', { class: 'quiet' }); go.onclick = () => jumpTo(day.start, dayName(day)); moment.append(go); }
    if (fromList) moment.querySelector('h3').scrollIntoView?.({ block: 'nearest' });
  }
  function openJournal() { // the whole entry on cream paper, as the journal renders it; Escape or Close returns to the scene
    const day = days[current]; if (!day) return;
    journal.replaceChildren();
    const top = el('div', undefined, { class: 'writer-scenes-journal-top' }), close = button('Close the entry', { class: 'quiet' }), page = el('article', undefined, { class: 'writer-scenes-page' });
    top.append(el('span', dayLong(day)), close);
    close.onclick = () => journal.close();
    const step = el('div', undefined, { class: 'writer-scenes-journal-nav' }), back = button('← Previous', {}), on = button('Next →', {});
    back.disabled = current <= 0; on.disabled = current >= days.length - 1;
    back.onclick = async () => { journal.close(); await select(current - 1); openJournal(); }; on.onclick = async () => { journal.close(); await select(current + 1); openJournal(); };
    step.append(back, on);
    journal.append(top, page, step);
    try { renderEntry?.(editor.value.slice(day.start, day.end), page); } catch { page.textContent = day.text; }
    if (!journal.open) { if (journal.showModal) journal.showModal(); else journal.setAttribute('open', ''); }
    close.focus();
  }
  journal.addEventListener('close', () => journal.replaceChildren());

  // A day without a scene: its words, and Make this day's scene (after showing exactly what is sent, and where).
  function showMake(day, note = '') {
    make.hidden = false; make.replaceChildren();
    if (!day.sentences.length) { make.append(el('p', 'This day has no writing to make a scene from yet.')); return; }
    if (readOnly) { const read = button('Open journal', { class: 'button' }); read.onclick = () => openJournal(); make.append(el('p', note || 'No scene was kept for this day.'), read); return; }
    make.append(el('p', note || 'This day has no scene yet.'));
    const go = button('Make this day\'s scene', { class: 'button', id: 'writerScenesMake' }); go.onclick = () => ask(day);
    const read = button('Open journal', { class: 'quiet' }); read.onclick = () => openJournal(); make.append(go, read);
  }
  function ask(day) {
    const conn = ai?.connection?.();
    confirm.hidden = false; confirm.replaceChildren(el('h3', 'Make this day\'s scene', { id: 'writerScenesConfirmTitle' }));
    if (!conn) {
      const open = button('Open the AI companion', { class: 'button' }); open.onclick = () => ai?.open?.();
      const close = button('Not now', { class: 'quiet' }); close.onclick = () => { confirm.hidden = true; };
      confirm.append(el('p', 'Scenes are made by the model you use with the AI companion. Turn on AI for this session there and choose a model, then come back.'), open, close);
      return;
    }
    const where = conn.provider === 'openrouter' ? `OpenRouter and the provider of ${conn.model}${conn.zdr ? ', with Zero Data Retention required' : ''}; data collection is denied` : `the server on this computer at ${conn.base} (${conn.model})`;
    confirm.append(el('p', `These ${day.sentences.length} sentences from ${dayName(day)}, and nothing else from your journal, go to ${where}. The model returns a scene as data; it writes no journal text.`));
    const list = el('ol', undefined, { class: 'writer-scenes-sent' }); for (const s of day.sentences) list.append(el('li', s)); confirm.append(list);
    const send = button('Send and make the scene', { class: 'button', id: 'writerScenesSend' }), cancel = button('Cancel', { class: 'quiet' });
    cancel.onclick = () => { controller?.abort(); confirm.hidden = true; };
    send.onclick = async () => {
      const prompt = placePrompt(day), mine = keyOf(day); controller?.abort(); controller = new AbortController();
      send.disabled = true; summary.textContent = 'Asking the model for this day\'s scene. Some models take a minute or two; Cancel stops it.';
      try {
        const value = await requestJSON({ ...conn, system: prompt.system, user: prompt.user, schema: PLACE_SCHEMA, name: 'jot_place', maxTokens: 24000, reasoning: { effort: 'low' } }, { signal: controller.signal });
        const place = validatePlace(value, day.sentences);
        drafts.set(mine, { place, model: conn.model, sentences: day.sentences.join('\n') });
        confirm.hidden = true; summary.textContent = `A draft scene for ${dayName(day)}. Look around, then keep it or try again.`;
        if (keyOf(days[current] || {}) === mine) { key = ''; await render(); }
      } catch (e) { summary.textContent = e.message; send.disabled = false; }
    };
    confirm.append(send, cancel); send.focus();
  }
  keep.onclick = async () => {
    const day = days[current], mine = day && keyOf(day), draft = mine && drafts.get(mine); if (!draft) return;
    keep.disabled = true;
    try {
      const path = await attachPlace(placeFile(draft.place, { model: draft.model }));
      const fresh = journalDays(editor.value).filter((d) => d.date === day.date)[Number(mine.split('#')[1])];
      if (!fresh) throw new Error('That entry is no longer in the journal.');
      rewrite(settingEdit(editor.value, fresh, path), `Kept the scene for ${dayName(day)}: one @setting: line under its date, and the scene as an attachment. Undo takes the line back out.`);
      drafts.delete(mine); key = ''; await compute(true);
    } catch (e) { summary.textContent = 'Could not keep the scene: ' + e.message; }
    finally { keep.disabled = false; }
  };
  again.onclick = () => { const day = days[current]; if (day) ask(day); };
  discard.onclick = async () => { const day = days[current]; if (!day) return; drafts.delete(keyOf(day)); key = ''; summary.textContent = 'The draft is gone. Your journal is unchanged.'; await render(); };
  pause.onclick = () => { paused = !paused; pause.setAttribute('aria-pressed', String(paused)); pause.textContent = paused ? 'Play motion' : 'Pause motion'; draw(); };
  pause.setAttribute('aria-pressed', String(paused)); pause.textContent = paused ? 'Play motion' : 'Pause motion';
  resetView.onclick = () => reset3D();
  readEntry.onclick = () => openJournal();

  function drawTabs() {
    tabs.replaceChildren();
    days.forEach((d, i) => {
      const t = button(dayName(d), { role: 'tab', id: `writerScenesTab${i}`, 'aria-selected': String(i === current), 'aria-controls': 'writerScenesPanel', tabindex: i === current ? '0' : '-1' });
      if (d.setting || drafts.has(keyOf(d))) t.classList.add('has-scene');
      t.onclick = () => select(i);
      t.onkeydown = (e) => { const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: days.length - 1 }[e.key]; if (to === undefined) return; e.preventDefault(); select(Math.max(0, Math.min(days.length - 1, to)), true); };
      tabs.append(t);
    });
    panel.setAttribute('aria-labelledby', `writerScenesTab${current}`);
  }
  async function select(i, focus = false) {
    current = i; drawTabs(); tabs.children[i]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); if (focus) tabs.children[i]?.focus();
    if (journal.open) journal.close(); confirm.hidden = true; await render();
  }
  async function render() {
    const day = days[current];
    setLede(day);
    if (!day) { make.hidden = true; clearView(); about.textContent = 'Dated entries become scenes here. Write a date heading such as ### 2026-10-03 to begin.'; return; }
    const draft = drafts.get(keyOf(day)), now = `${keyOf(day)}|${draft ? 'draft' : day.setting?.path || ''}|${day.sentences.join('\n')}`;
    if (now === key) return; // nothing changed: what is shown stays, the Make button included
    key = now; make.hidden = true;
    if (draft) { await show3D(draft.place, { draft: true, model: draft.model, day }); setLede(day, draft.place); return; }
    if (day.setting) {
      const text = placeText(day.setting.path);
      try { if (text == null) throw new Error(`${day.setting.path} is not attached`); const place = readPlaceFile(text, day); await show3D(place, { day }); setLede(day, place); return; }
      catch (e) { clearView(); about.textContent = ''; showMake(day, `The kept scene could not be shown: ${e.message}.`); return; }
    }
    clearView(); about.textContent = ''; showMake(day);
  }
  async function compute(force = false) {
    const before = days[current] && keyOf(days[current]);
    days = journalDays(editor.value);
    const again = days.findIndex((d) => keyOf(d) === before);
    current = again >= 0 ? again : Math.min(current, Math.max(0, days.length - 1));
    const kept = days.filter((d) => d.setting).length;
    summary.textContent = days.length ? `${days.length} ${days.length === 1 ? 'day' : 'days'}; ${kept} with a ${readOnly ? '' : 'kept '}scene.` : 'No dated entries yet.';
    if (force) key = '';
    drawTabs(); await render();
  }
  editor.addEventListener('input', () => { if (section.hidden) return; win.clearTimeout(timer); timer = win.setTimeout(() => compute(), 400); });

  return {
    async show() {
      if (editor.readOnly) return;
      if (reduced.matches && !paused) { paused = true; pause.setAttribute('aria-pressed', 'true'); pause.textContent = 'Play motion'; } // a preference changed since
      section.hidden = false; shown = true; await compute(true); draw();
    },
    hide() { section.hidden = true; shown = false; controller?.abort(); },
    // Locking clears everything the view drew or held: drafts, the request, the 3D scene.
    reset() {
      section.hidden = true; shown = false; controller?.abort(); controller = null; drafts = new Map(); days = []; current = 0; key = '';
      if (three) clearView(); about.textContent = ''; summary.textContent = ''; tabs.replaceChildren(); make.replaceChildren(); confirm.replaceChildren(); confirm.hidden = true;
      if (journal.open) journal.close(); journal.replaceChildren(); setLede(null);
    },
  };
}
export default { setupWriterScene };
