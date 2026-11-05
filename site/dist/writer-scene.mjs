// The Scenes view: each dated entry as a small 3D place a model designs from the entry's words (spec 8.1.9). Drag to turn it,
// scroll to zoom, choose a thing to read the moments it holds (the writer's own sentences), switch days with the tabs, and open
// the whole entry. Nothing is sent until Make this day's scene, after the writer sees exactly what goes where; a made scene is a
// draft until Keep it, which saves it as an attachment and one `@setting:` line (with Undo). Kept scenes draw with no model.
// It loads three.js only when shown, never edits the writing on its own, and clears when the journal locks.
import { journalDays, placePrompt, validatePlace, placeFile, readPlaceFile, settingEdit, PLACE_SCHEMA } from './scene-journal-core.mjs';
import { buildPlace } from './writer-scene-build.mjs';
import { requestJSON } from './ai-client.mjs';

export function setupWriterScene({ editor, jumpTo = () => {}, rewrite, placeText = () => null, attachPlace, renderEntry, ai }) {
  const doc = editor.ownerDocument, win = doc.defaultView;
  const el = (tag, text, attributes = {}) => { const n = doc.createElement(tag); if (text !== undefined) n.textContent = text; for (const [k, v] of Object.entries(attributes)) n.setAttribute(k, v); return n; };
  const button = (text, attributes = {}) => el('button', text, { type: 'button', ...attributes });
  const section = el('section', undefined, { id: 'writerScenes', class: 'writer-scenes', 'aria-labelledby': 'writerScenesTitle' }); section.hidden = true;
  const summary = el('p', '', { id: 'writerScenesSummary', class: 'writer-scenes-summary', role: 'status' });
  const head = el('div', undefined, { class: 'writer-scenes-head' }); head.append(el('h2', 'Scenes', { id: 'writerScenesTitle' }), summary);
  const tabs = el('div', undefined, { class: 'writer-scenes-tabs', role: 'tablist', 'aria-label': 'Days' });
  const panel = el('div', undefined, { id: 'writerScenesPanel', class: 'writer-scenes-panel', role: 'tabpanel' });
  const about = el('p', '', { class: 'writer-scenes-about' });
  const stage = el('div', undefined, { class: 'writer-scenes-stage' }); stage.hidden = true;
  const tools = el('div', undefined, { class: 'writer-scenes-tools' });
  const pause = button('Pause weather', { 'aria-pressed': 'false', id: 'writerScenesPause' }), resetView = button('Reset view', { id: 'writerScenesReset' });
  tools.append(resetView, pause);
  const draftBar = el('div', undefined, { class: 'writer-scenes-draft', role: 'group', 'aria-label': 'This scene is a draft' }); draftBar.hidden = true;
  const keep = button('Keep it', { id: 'writerScenesKeep', class: 'button' }), again = button('Try again', { id: 'writerScenesAgain' }), discard = button('Discard', { id: 'writerScenesDiscard', class: 'quiet' });
  draftBar.append(el('span', 'A draft: nothing is saved until you keep it.'), keep, again, discard);
  const make = el('div', undefined, { class: 'writer-scenes-make' });
  const confirm = el('div', undefined, { class: 'writer-scenes-confirm', role: 'group', 'aria-labelledby': 'writerScenesConfirmTitle' }); confirm.hidden = true;
  const things = el('ul', undefined, { class: 'writer-scenes-things', 'aria-label': 'Things in this scene' });
  const moment = el('div', undefined, { class: 'writer-scenes-moment', role: 'region', 'aria-live': 'polite', 'aria-label': 'Moment' });
  const journal = el('div', undefined, { class: 'writer-scenes-journal', role: 'region', 'aria-label': 'The whole entry' }); journal.hidden = true;
  panel.append(about, make, confirm, stage, tools, draftBar, things, moment, journal);
  section.append(head, tabs, panel);
  (doc.querySelector('.writing-grid') || doc.body).after(section);

  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayName = (d) => { const t = new Date(d.date + 'T12:00:00Z'); return Number.isNaN(+t) ? d.date : dateFormat.format(t); };
  let days = [], current = 0, drafts = new Map(), view = null, three = null, controller = null, timer = 0, shown = false, paused = reduced.matches, frame = 0, last = 0, key = '';
  const keyOf = (d) => `${d.date}#${days.filter((x) => x.date === d.date).indexOf(d)}`; // the same date can hold more than one entry

  // three.js, its renderer and controls: made once, on first show.
  async function engine() {
    if (three) return three;
    await import('./jot/vendor/three.mjs');
    const T = globalThis.JotThree, canvas = el('canvas', undefined, { class: 'writer-scenes-canvas', role: 'img', tabindex: '0' });
    const renderer = new T.WebGLRenderer({ canvas, antialias: true }); renderer.outputColorSpace = T.SRGBColorSpace; renderer.setPixelRatio(Math.min(win.devicePixelRatio || 1, 2));
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(45, 16 / 10, 0.05, 200), controls = new T.OrbitControls(camera, canvas);
    controls.enableDamping = false; controls.maxPolarAngle = Math.PI * 0.49; controls.minDistance = 1.2; controls.maxDistance = 30;
    controls.addEventListener('change', draw);
    stage.append(canvas);
    new win.ResizeObserver(() => { const w = stage.clientWidth || 640, h = stage.clientHeight || 400; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw(); }).observe(stage);
    // A click (not a drag) chooses the thing under the pointer.
    let down = null;
    canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || !view) return;
      const r = canvas.getBoundingClientRect(), ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      for (const hit of ray.intersectObjects(view.built.objects, true)) { let o = hit.object; while (o && o.userData.object === undefined) o = o.parent; if (o) { choose(o.userData.object); return; } }
    });
    three = { T, renderer, scene, camera, controls, canvas };
    return three;
  }
  function draw() { if (!frame && three && shown) frame = win.requestAnimationFrame(tick); }
  function tick(now) {
    frame = 0; if (!three || !view) return;
    const dt = last ? (now - last) / 1000 : 0; last = now;
    if (view.built.moving && !paused) { view.built.tick(dt); draw(); } else last = 0;
    three.renderer.render(three.scene, three.camera);
  }
  function clearView() {
    if (view) { three.scene.remove(view.built.root); view.built.dispose(); }
    view = null; things.replaceChildren(); moment.replaceChildren(); stage.hidden = true; tools.hidden = true; draftBar.hidden = true;
  }

  async function show3D(place, { draft = false, model = '' } = {}) {
    const t = await engine(), { T } = t;
    if (view) clearView();
    const built = buildPlace(T, place);
    t.scene.add(built.root); t.scene.background = new T.Color(built.sky);
    t.scene.fog = built.fog ? new T.Fog(built.fog.color, built.fog.near, built.fog.far) : null;
    view = { place, built, draft };
    stage.hidden = false; tools.hidden = false; draftBar.hidden = !draft; pause.hidden = !built.moving;
    t.canvas.setAttribute('aria-label', `${place.title}: a 3D scene of this day. Drag to turn it, scroll to zoom; the things in it are listed below.`);
    reset3D();
    about.textContent = `${place.title}. ${draft ? `Made just now by ${model}. ` : place.made?.model ? `Made by ${place.made.model}. ` : ''}Choose a thing to read its moment.`;
    const held = place.objects.map((o, i) => [o, i]).filter(([o]) => o.moments.length);
    for (const [o, i] of held) { const li = el('li'), b = button(o.name, { 'data-object': String(i) }); b.onclick = () => choose(i, true); li.append(b); things.append(li); }
    if (!held.length) things.append(el('li', 'Nothing in this scene is tied to a sentence yet.'));
    draw();
  }
  function reset3D() { // the model's camera, moved back if it would stand inside the place or too close to see it whole
    if (!view || !three) return;
    const { T, camera, controls } = three, target = new T.Vector3(...view.place.camera.target), from = new T.Vector3(...view.place.camera.position), b = view.built.bounds;
    if (b) {
      const need = (b.radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.05, dir = from.clone().sub(target);
      if (dir.lengthSq() < 1e-6) dir.set(1, 0.6, 1);
      if (from.distanceTo(b.center) < need) { target.copy(b.center); from.copy(b.center).add(dir.normalize().multiplyScalar(need)); }
    }
    camera.position.copy(from); controls.target.copy(target); controls.update(); draw();
  }
  function choose(index, fromList = false) {
    if (!view) return; const o = view.place.objects[index]; if (!o) return;
    view.built.highlight(index); draw();
    moment.replaceChildren(el('h3', o.name));
    if (!o.moments.length) moment.append(el('p', 'Nothing in the entry is tied to this.'));
    else { const ul = el('ul'); for (const m of o.moments) { const text = typeof m === 'string' ? m : m.text; const li = el('li', text); if (m.missing) li.append(el('span', ' (no longer in this entry)', { class: 'writer-scenes-missing' })); ul.append(li); } moment.append(ul); }
    const day = days[current], open = button('Open journal', { class: 'writer-scenes-open' }), go = button('Go to this entry', { class: 'quiet' });
    open.onclick = () => openJournal(); go.onclick = () => jumpTo(day.start, dayName(day));
    moment.append(open, go);
    if (fromList) moment.querySelector('h3').scrollIntoView?.({ block: 'nearest' });
  }
  function openJournal() {
    const day = days[current]; if (!day) return;
    journal.hidden = false; journal.replaceChildren();
    const close = button('Close the entry', { class: 'quiet' }), page = el('article', undefined, { class: 'writer-scenes-page' });
    close.onclick = () => { journal.hidden = true; journal.replaceChildren(); };
    journal.append(close, page);
    try { renderEntry?.(editor.value.slice(day.start, day.end), page); } catch { page.textContent = day.text; }
    close.focus();
  }

  // A day without a scene: its words, and Make this day's scene (after showing exactly what is sent, and where).
  function showMake(day, note = '') {
    make.hidden = false; make.replaceChildren();
    if (!day.sentences.length) { make.append(el('p', 'This day has no writing to make a scene from yet.')); return; }
    make.append(el('p', note || 'This day has no scene yet.'));
    const go = button('Make this day\'s scene', { class: 'button', id: 'writerScenesMake' }); go.onclick = () => ask(day); make.append(go);
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
      send.disabled = true; summary.textContent = 'Asking the model for this day\'s scene…';
      try {
        const value = await requestJSON({ ...conn, system: prompt.system, user: prompt.user, schema: PLACE_SCHEMA, name: 'jot_place', maxTokens: 8192 }, { signal: controller.signal });
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
  pause.onclick = () => { paused = !paused; pause.setAttribute('aria-pressed', String(paused)); pause.textContent = paused ? 'Play weather' : 'Pause weather'; draw(); };
  pause.setAttribute('aria-pressed', String(paused)); pause.textContent = paused ? 'Play weather' : 'Pause weather';
  resetView.onclick = () => reset3D();

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
  async function select(i, focus = false) { current = i; drawTabs(); if (focus) tabs.children[i]?.focus(); journal.hidden = true; confirm.hidden = true; await render(); }
  async function render() {
    const day = days[current]; make.hidden = true;
    if (!day) { clearView(); about.textContent = 'Dated entries become scenes here. Write a date heading such as ### 2026-10-03 to begin.'; return; }
    const draft = drafts.get(keyOf(day)), now = `${keyOf(day)}|${draft ? 'draft' : day.setting?.path || ''}|${day.sentences.join('\n')}`;
    if (now === key) return; key = now;
    if (draft) { await show3D(draft.place, { draft: true, model: draft.model }); return; }
    if (day.setting) {
      const text = placeText(day.setting.path);
      try { if (text == null) throw new Error(`${day.setting.path} is not attached`); await show3D(readPlaceFile(text, day)); return; }
      catch (e) { clearView(); about.textContent = ''; showMake(day, `The kept scene could not be shown: ${e.message}.`); return; }
    }
    clearView(); about.textContent = `${dayName(day)}${day.label ? ` · ${day.label}` : ''}`; showMake(day);
  }
  async function compute(force = false) {
    const before = days[current] && keyOf(days[current]);
    days = journalDays(editor.value);
    const again = days.findIndex((d) => keyOf(d) === before);
    current = again >= 0 ? again : Math.min(current, Math.max(0, days.length - 1));
    const kept = days.filter((d) => d.setting).length;
    summary.textContent = days.length ? `${days.length} ${days.length === 1 ? 'day' : 'days'}; ${kept} with a kept scene.` : 'No dated entries yet.';
    if (force) key = '';
    drawTabs(); await render();
  }
  editor.addEventListener('input', () => { if (section.hidden) return; win.clearTimeout(timer); timer = win.setTimeout(() => compute(), 400); });

  return {
    async show() { if (editor.readOnly) return; section.hidden = false; shown = true; await compute(true); draw(); },
    hide() { section.hidden = true; shown = false; controller?.abort(); },
    // Locking clears everything the view drew or held: drafts, the request, the 3D scene.
    reset() {
      section.hidden = true; shown = false; controller?.abort(); controller = null; drafts = new Map(); days = []; current = 0; key = '';
      if (three) clearView(); about.textContent = ''; summary.textContent = ''; tabs.replaceChildren(); make.replaceChildren(); confirm.replaceChildren(); confirm.hidden = true; journal.replaceChildren(); journal.hidden = true;
    },
  };
}
export default { setupWriterScene };
