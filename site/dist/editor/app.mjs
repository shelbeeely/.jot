// Jot template editor: the page. The model and the .jot text come from template.mjs; the check uses the Jot parser (../jot/jot.mjs).
// The template is kept in this browser (localStorage, if allowed); nothing is sent anywhere.
import { BLOCKS, BLOCK_ORDER, ZONES, STARTERS, INKDECK_BYTES, WIDGET_LIMIT, widgetCount, allowedIn, newBlock, normalizeTemplate, fromStarter, renderFiles, monthLabel, templateFromJot } from './template.mjs';
import { parse } from '../jot/jot.mjs';
import { renderPreview, addChartStyles } from '../jot/preview.mjs';
addChartStyles(document);

const $ = (s) => document.querySelector(s);
const KEY = 'jot-template-v1';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } },
  set(t) { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* private mode: the template lives only in this tab */ } },
};
let tpl = store.get() ? normalizeTemplate(store.get()) : fromStarter('checkin', { title: 'My journal' });
const open = new Set(); // block ids whose options are showing
let files = [], shown = 0;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200); }
const save = () => store.set(tpl);

// ---- undo and redo: a snapshot before every change; typing in one field is one step (edits within a second of each other join up) ----
const undo = [], redo = [];
let lastKind = '', lastAt = 0;
function record(kind) {
  const now = Date.now();
  if (!(kind && kind === lastKind && now - lastAt < 1000)) { undo.push(JSON.stringify(tpl)); if (undo.length > 100) undo.shift(); }
  lastKind = kind; lastAt = now; redo.length = 0; drawHistory();
}
function drawHistory() { $('#undo').disabled = !undo.length; $('#redo').disabled = !redo.length; }
function step(from, to, word) {
  if (!from.length) return;
  to.push(JSON.stringify(tpl)); tpl = normalizeTemplate(JSON.parse(from.pop())); lastKind = '';
  drawSettings(); changed(true); drawHistory(); toast(word);
}
$('#undo').onclick = () => step(undo, redo, 'Undone');
$('#redo').onclick = () => step(redo, undo, 'Redone');
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== 'z' && e.key.toLowerCase() !== 'y') return;
  if (e.target.closest('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]')) return; // a field keeps its own undo
  e.preventDefault();
  if (e.key.toLowerCase() === 'y' || e.shiftKey) $('#redo').click(); else $('#undo').click();
});
const zoneName = (id) => ZONES.find((z) => z.id === id).name;
const find = (id) => { for (const z of ZONES) { const i = tpl.zones[z.id].findIndex((b) => b.id === id); if (i >= 0) return { zone: z.id, i, b: tpl.zones[z.id][i] }; } return null; };

// ---- the template: zones and blocks ----
function optsHtml(b) {
  const B = BLOCKS[b.type];
  return B.opts.map((o) => {
    const id = `o-${b.id}-${o.k}`, lab = `<label for="${id}">${esc(o.label)}</label>`;
    if (o.k === 'title' && b.type !== 'text') return ''; // the title is edited in the block's own row
    if (o.kind === 'num') return `<div class="opt">${lab}<input id="${id}" type="number" inputmode="numeric" min="${o.lo}" max="${o.hi}" value="${b[o.k]}" data-k="${o.k}"></div>`;
    if (o.kind === 'list') return `<div class="opt">${lab}<textarea id="${id}" rows="${Math.min(8, Math.max(3, b[o.k].length + 1))}" data-k="${o.k}" data-list="1" aria-describedby="${id}-n">${esc(b[o.k].join('\n'))}</textarea><span class="note" id="${id}-n">One a line, up to ${o.max}.</span></div>`;
    if (o.kind === 'choice') return `<div class="opt">${lab}<select id="${id}" data-k="${o.k}">${o.choices.map(([v, l]) => `<option value="${v}"${b[o.k] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    if (o.long) return `<div class="opt">${lab}<textarea id="${id}" rows="3" maxlength="${o.max}" data-k="${o.k}">${esc(b[o.k])}</textarea></div>`;
    return `<div class="opt">${lab}<input id="${id}" maxlength="${o.max}" value="${esc(b[o.k])}" data-k="${o.k}" autocomplete="off"></div>`;
  }).join('') + `<p class="opt note">${esc(B.hint)}</p>`;
}
function blockHtml(b, zone, i, n) {
  const B = BLOCKS[b.type], isOpen = open.has(b.id), hasTitle = B.opts.some((o) => o.k === 'title') && b.type !== 'text';
  const summary = b.type === 'prompt' ? (b.questions[0] || 'Prompt') + (b.questions.length > 1 ? ` (+${b.questions.length - 1} more)` : '') : b.type === 'text' ? (b.title || b.body || 'Words to keep') : '';
  const label = b.title || summary || B.name;
  return `<li class="blk${isOpen ? ' open' : ''}" data-id="${b.id}">
    <div class="blk-head">
      <span class="drag" aria-hidden="true" title="Drag to move">⠿</span>
      <span class="blk-icon" aria-hidden="true">${esc(B.icon)}</span>
      <div class="blk-main">${hasTitle ? `<input aria-label="${esc(B.name)}: title" value="${esc(b.title)}" maxlength="80" data-k="title" autocomplete="off" placeholder="${esc(B.name)}">` : `<span class="blk-summary">${esc(summary.slice(0, 90))}</span>`}<span class="blk-type">${esc(B.name)}</span></div>
      <button class="icon-btn mv" type="button" data-act="up" aria-label="Move ${esc(label)} up"${i === 0 ? ' disabled' : ''}>↑</button>
      <button class="icon-btn mv" type="button" data-act="down" aria-label="Move ${esc(label)} down"${i === n - 1 ? ' disabled' : ''}>↓</button>
      <button class="icon-btn" type="button" data-act="opts" aria-expanded="${isOpen}" aria-controls="opts-${b.id}" aria-label="Options for ${esc(label)}">⚙</button>
      <button class="icon-btn" type="button" data-act="del" aria-label="Remove ${esc(label)}">✕</button>
    </div>
    <div class="blk-opts" id="opts-${b.id}"${isOpen ? '' : ' hidden'}>${isOpen ? optsHtml(b) : ''}${isOpen ? `<div class="opt-row"><div class="opt"><label for="z-${b.id}">Zone</label><select id="z-${b.id}" data-act="zone">${ZONES.filter((z) => allowedIn(b.type, z.id)).map((z) => `<option value="${z.id}"${z.id === zone ? ' selected' : ''}>${esc(z.name)}</option>`).join('')}</select></div><button class="btn small" type="button" data-act="dup">Duplicate</button></div>` : ''}</div>
  </li>`;
}
function drawZones(focusSel) {
  $('#zones').innerHTML = ZONES.map((z) => {
    const list = tpl.zones[z.id];
    return `<section class="zone" data-zone="${z.id}" aria-labelledby="z-${z.id}">
      <h2 id="z-${z.id}">${esc(z.name)}</h2><p class="hint">${esc(z.hint)}</p>${z.id === 'weekStart' && widgetCount(tpl) > WIDGET_LIMIT ? `<p class="hint warn-note" role="note">${widgetCount(tpl)} widgets on the week page. Five to seven is what most people can take in at a glance (the "rule of 7"); think about folding some together.</p>` : ''}
      ${list.length ? `<ol class="blocks">${list.map((b, i) => blockHtml(b, z.id, i, list.length)).join('')}</ol>` : '<p class="empty">Nothing here yet.</p>'}
      <button class="btn small add" type="button" data-act="add" data-zone="${z.id}"><span aria-hidden="true">＋</span> Add a block</button>
    </section>`;
  }).join('');
  // focus goes to the first match that can take it (a move button at the end of the list is disabled: the other one takes it)
  for (const sel of [].concat(focusSel || [])) { const el = [...document.querySelectorAll(sel)].find((x) => !x.disabled); if (el) { el.focus(); break; } }
}
// A change to the structure redraws the zones; typing in a field only redraws the preview (so the cursor stays where it is).
function changed(redraw, focusSel) { save(); if (redraw) drawZones(focusSel); drawPreview(); }

$('#zones').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]'); if (!btn) return;
  const act = btn.dataset.act;
  if (act === 'add') return openPalette(btn.dataset.zone);
  const li = btn.closest('.blk'), at = li && find(li.dataset.id); if (!at) return;
  const list = tpl.zones[at.zone], name = at.b.title || BLOCKS[at.b.type].name;
  if (act === 'up' || act === 'down') {
    const j = at.i + (act === 'up' ? -1 : 1); if (j < 0 || j >= list.length) return;
    record('');
    [list[at.i], list[j]] = [list[j], list[at.i]];
    changed(true, [`.blk[data-id="${at.b.id}"] [data-act="${act}"]`, `.blk[data-id="${at.b.id}"] [data-act="${act === 'up' ? 'down' : 'up'}"]`]);
    toast(`Moved ${name} to ${j + 1} of ${list.length}`);
  } else if (act === 'opts') {
    if (open.has(at.b.id)) open.delete(at.b.id); else open.add(at.b.id);
    changed(true, `.blk[data-id="${at.b.id}"] [data-act="opts"]`);
  } else if (act === 'del') {
    record(''); list.splice(at.i, 1); open.delete(at.b.id);
    const next = list[at.i] || list[at.i - 1];
    changed(true, next ? `.blk[data-id="${next.id}"] [data-act="del"]` : `[data-act="add"][data-zone="${at.zone}"]`);
    toast(`Removed ${name}`);
  } else if (act === 'dup') {
    record(''); const copy = newBlock(at.b.type, at.zone); Object.assign(copy, JSON.parse(JSON.stringify(at.b)), { id: copy.id });
    list.splice(at.i + 1, 0, copy); open.add(copy.id);
    changed(true, [`.blk[data-id="${copy.id}"] .blk-main input`, `.blk[data-id="${copy.id}"] [data-act="opts"]`]);
    toast(`Duplicated ${name}`);
  }
});
$('#zones').addEventListener('input', (e) => {
  const el = e.target, k = el.dataset.k, li = el.closest('.blk'); if (!k || !li) return;
  const at = find(li.dataset.id); if (!at) return;
  const o = BLOCKS[at.b.type].opts.find((x) => x.k === k);
  let v = el.value;
  if (o.kind === 'num' && (v === '' || !Number.isFinite(+v))) return;
  record(`${at.b.id}:${k}`);
  if (o.kind === 'num') { if (v === '' || !Number.isFinite(+v)) return; v = Math.min(o.hi, Math.max(o.lo, Math.round(+v))); }
  if (o.kind === 'list') v = v.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, o.max);
  at.b[k] = v;
  if ((at.b.type === 'scale' || at.b.type === 'ratings') && at.b.max <= at.b.min) at.b.max = at.b.min + 1; // the file always gets a real range
  if (at.b.type === 'times' && at.b.to <= at.b.from) at.b.to = Math.min(24, at.b.from + 1);
  changed(false);
});

// Move to another zone (the keyboard way across zones; dragging does the same with a pointer)
function moveBlock(id, zone, index) {
  const at = find(id); if (!at || !allowedIn(at.b.type, zone)) return false;
  const [b] = tpl.zones[at.zone].splice(at.i, 1), dest = tpl.zones[zone];
  let i = index === undefined ? dest.length : index;
  if (at.zone === zone && index !== undefined && index > at.i) i--;
  dest.splice(Math.max(0, Math.min(i, dest.length)), 0, b);
  return { b, i: dest.indexOf(b), n: dest.length };
}
$('#zones').addEventListener('change', (e) => {
  const sel = e.target.closest('select[data-act="zone"]'); if (!sel) return;
  const id = sel.closest('.blk').dataset.id, at = find(id); if (!at || at.zone === sel.value) return;
  record(''); const r = moveBlock(id, sel.value);
  changed(true, `#z-${id}`); toast(`Moved ${r.b.title || BLOCKS[r.b.type].name} to ${zoneName(sel.value)}`);
});

// ---- dragging: the handle on each block; a line shows where it lands, red where it cannot go ----
let drag = null;
const mark = document.createElement('div'); mark.className = 'drop-mark'; mark.hidden = true; document.body.append(mark);
function dropTarget(x, y) {
  const el = document.elementFromPoint(x, y), zoneEl = el && el.closest('.zone'); if (!zoneEl) return null;
  const zone = zoneEl.dataset.zone, items = [...zoneEl.querySelectorAll('.blk')].filter((li) => li.dataset.id !== drag.id);
  let index = items.length, ref = null;
  for (const [k, li] of items.entries()) { const r = li.getBoundingClientRect(); if (y < r.top + r.height / 2) { index = k; ref = li; break; } }
  const list = zoneEl.querySelector('.blocks') || zoneEl.querySelector('.empty') || zoneEl, box = list.getBoundingClientRect();
  const top = ref ? ref.getBoundingClientRect().top - 5 : items.length ? items[items.length - 1].getBoundingClientRect().bottom + 3 : box.top + box.height / 2;
  // index among the zone's blocks with the dragged one put back (what moveBlock expects)
  const full = tpl.zones[zone].map((b) => b.id), realIndex = ref ? full.indexOf(ref.dataset.id) : full.length;
  return { zone, index: realIndex, ok: allowedIn(drag.type, zone), top, left: box.left, width: box.width };
}
$('#zones').addEventListener('pointerdown', (e) => {
  const h = e.target.closest('.drag'); if (!h || e.button > 0) return;
  const li = h.closest('.blk'), at = find(li.dataset.id); if (!at) return;
  e.preventDefault(); h.setPointerCapture(e.pointerId);
  drag = { id: at.b.id, type: at.b.type, li, x: e.clientX, y: e.clientY, on: false, t: null };
});
$('#zones').addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.on) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return; drag.on = true; drag.li.classList.add('dragging'); }
  if (e.clientY < 70) window.scrollBy(0, -14); else if (e.clientY > innerHeight - 70) window.scrollBy(0, 14);
  drag.t = dropTarget(e.clientX, e.clientY);
  if (!drag.t) { mark.hidden = true; return; }
  Object.assign(mark.style, { top: `${drag.t.top}px`, left: `${drag.t.left}px`, width: `${drag.t.width}px` });
  mark.classList.toggle('bad', !drag.t.ok); mark.hidden = false;
});
function endDrag(apply) {
  if (!drag) return;
  const d = drag; drag = null; mark.hidden = true; d.li.classList.remove('dragging');
  if (!apply || !d.on || !d.t) return;
  const name = (find(d.id) || {}).b ? find(d.id).b.title || BLOCKS[d.type].name : '';
  if (!d.t.ok) { toast(`${BLOCKS[d.type].name} can't go in ${zoneName(d.t.zone)}`); return; }
  const before = JSON.stringify(tpl);
  record(''); const r = moveBlock(d.id, d.t.zone, d.t.index);
  if (JSON.stringify(tpl) === before) { undo.pop(); drawHistory(); return; } // dropped where it was
  changed(true); toast(`Moved ${name} to ${zoneName(d.t.zone)}, ${r.i + 1} of ${r.n}`);
}
$('#zones').addEventListener('pointerup', () => endDrag(true));
$('#zones').addEventListener('pointercancel', () => endDrag(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drag) endDrag(false); });

// ---- adding blocks, starters ----
function openPalette(zone) {
  $('#palette-zone').textContent = `To: ${zoneName(zone)}`;
  $('#palette-list').innerHTML = BLOCK_ORDER.filter((t) => allowedIn(t, zone)).map((t) => `<button class="pal" type="button" data-type="${t}" data-zone="${zone}"><span class="pi" aria-hidden="true">${esc(BLOCKS[t].icon)}</span><strong>${esc(BLOCKS[t].name)}</strong><span>${esc(BLOCKS[t].hint)}</span></button>`).join('');
  $('#palette').showModal();
}
$('#palette-list').addEventListener('click', (e) => {
  const btn = e.target.closest('.pal'); if (!btn) return;
  const b = newBlock(btn.dataset.type, btn.dataset.zone);
  record('');
  tpl.zones[btn.dataset.zone].push(b); open.add(b.id);
  $('#palette').close();
  changed(true, [`.blk[data-id="${b.id}"] .blk-main input`, `.blk[data-id="${b.id}"] .blk-opts textarea, .blk[data-id="${b.id}"] .blk-opts input`, `.blk[data-id="${b.id}"] [data-act="opts"]`]);
  toast(`Added ${BLOCKS[b.type].name} to ${zoneName(btn.dataset.zone)}`);
});
$('#starter').onclick = () => {
  $('#starter-list').innerHTML = STARTERS.map((s) => `<button class="pal" type="button" data-starter="${s.id}"><span class="pi" aria-hidden="true">◇</span><strong>${esc(s.name)}</strong><span>${esc(s.blurb)}</span></button>`).join('');
  $('#starters').showModal();
};
$('#starter-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-starter]'); if (!btn) return;
  record(''); tpl = fromStarter(btn.dataset.starter, { title: tpl.title, month: tpl.month, per: tpl.per }); open.clear();
  $('#starters').close(); changed(true, '#starter'); toast(`Started from ${btn.querySelector('strong').textContent}`);
});

// ---- settings ----
function drawSettings() { $('#t-title').value = tpl.title; $('#t-month').value = tpl.month; $('#t-per').value = tpl.per; }
$('#t-title').addEventListener('input', (e) => { record('title'); tpl.title = e.target.value.slice(0, 80) || 'My journal'; changed(false); });
$('#t-month').addEventListener('change', (e) => { if (/^\d{4}-\d{2}$/.test(e.target.value)) { record(''); tpl.month = e.target.value; shown = 0; changed(false); } });
$('#t-per').addEventListener('change', (e) => { record(''); tpl.per = e.target.value; shown = 0; changed(false); });

// ---- the preview and the check ----
function drawPreview() {
  files = renderFiles(tpl);
  if (shown >= files.length) shown = 0;
  const f = files[shown], pick = $('#file-pick');
  pick.hidden = files.length < 2;
  if (files.length > 1) $('#file-sel').innerHTML = files.map((x, i) => `<option value="${i}"${i === shown ? ' selected' : ''}>${esc(x.file)}</option>`).join('');
  $('#jot').textContent = f.text;
  const ast = parse(f.text), probs = ast.diagnostics, big = files.filter((x) => x.bytes > INKDECK_BYTES);
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  $('#check').innerHTML = `${files.length > 1 ? `${files.length} files · ` : ''}${ast.entries.length} ${ast.entries.length === 1 ? 'day' : 'days'} in this file · ${kb(f.bytes)} · `
    + (probs.length ? `<span class="warn">${probs.length} ${probs.length === 1 ? 'problem' : 'problems'}</span>` : '<span class="ok">valid Jot</span>')
    + (big.length ? ` · <span class="warn">over the 16 KB InkDeck opens${tpl.per === 'month' ? ': choose a file a week' : ''}</span>` : '');
  const ul = $('#problems'); ul.hidden = !probs.length;
  ul.innerHTML = probs.slice(0, 8).map((p) => `<li>${esc(p.message)}</li>`).join('');
  document.title = `${tpl.title} · ${monthLabel(tpl.month)} · Jot template editor`;
  const hasNumbers = ast.nodes.some((n) => n.type === 'record' && n.recordType === 'chart');
  $('#sample-wrap').hidden = view !== 'page' || !hasNumbers;
  $('#hand-wrap').hidden = view !== 'page';
  if (view === 'page') renderPreview(ast, $('#page'), { sample: hasNumbers && $('#sample').checked, empty: 'Add a block to see the page.', hand: $('#handwritten').checked ? { hand: 'pen', ink: 'blue', pitchMm: 5 } : null });
}
// ---- Text or Page: the file as it is, or as a journal reader shows it (charts drawn) ----
let view = 'text';
function setView(v, focus) {
  view = v;
  for (const [id, name] of [['#tab-text', 'text'], ['#tab-page', 'page']]) { const t = $(id); t.setAttribute('aria-selected', String(name === v)); t.tabIndex = name === v ? 0 : -1; if (focus && name === v) t.focus(); }
  $('#jot').hidden = v !== 'text'; $('#page-view').hidden = v !== 'page';
  $('#preview-h').textContent = v === 'text' ? 'The .jot file' : 'The page';
  drawPreview();
}
$('#tab-text').onclick = () => setView('text');
$('#tab-page').onclick = () => setView('page');
$('.view-tabs').addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); setView(view === 'text' ? 'page' : 'text', true); } });
$('#sample').onchange = () => drawPreview();
$('#handwritten').onchange = () => drawPreview();
$('#file-sel').addEventListener('change', (e) => { shown = +e.target.value; drawPreview(); });

// ---- files out and in ----
async function download(name, text, type = 'text/plain;charset=utf-8') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
$('#download').onclick = async () => {
  for (const [i, f] of files.entries()) { await download(f.file, f.text); if (i < files.length - 1) await new Promise((r) => setTimeout(r, 300)); } // browsers drop downloads that come too close together
  toast(files.length > 1 ? `Saved ${files.length} .jot files` : `Saved ${files[0].file}`);
};
const menu = (show) => { $('#more-menu').hidden = !show; $('#more').setAttribute('aria-expanded', String(show)); if (show) $('#more-menu button').focus(); };
$('#more').onclick = () => menu($('#more-menu').hidden);
document.addEventListener('click', (e) => { if (!e.target.closest('.more')) menu(false); });
$('#more-menu').addEventListener('keydown', (e) => {
  const items = [...$('#more-menu').querySelectorAll('button')], i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { menu(false); $('#more').focus(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
});
$('#save-tpl').onclick = () => { menu(false); download(`${tpl.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'journal'}.jot-template.json`, `${JSON.stringify(tpl, null, 1)}\n`, 'application/json'); toast('Saved the template'); };
$('#open-tpl').onclick = () => { menu(false); $('#open-file').click(); };
// One way in for every file: a .jot made here (plain or packaged) brings its template back, and a template .json opens. Anything else is
// refused and the template is left as it was.
async function openFile(f) {
  if (f.size > 4 * 1024 * 1024) throw new Error('That file is too big to be a template');
  const bytes = new Uint8Array(await f.arrayBuffer());
  let text;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) { const { readDocument } = await import('../jot/container.mjs'); text = (await readDocument(bytes)).source; }
  else text = new TextDecoder().decode(bytes);
  const fromJot = templateFromJot(text);
  if (fromJot) { record(''); tpl = fromJot; open.clear(); drawSettings(); changed(true); return `Opened ${tpl.title} from ${f.name}`; }
  let raw = null; try { raw = JSON.parse(text); } catch { /* not JSON */ }
  if (raw && typeof raw === 'object' && raw.zones) { record(''); tpl = normalizeTemplate(raw); open.clear(); drawSettings(); changed(true); return `Opened ${tpl.title}`; }
  throw new Error(/\.jotz?$/i.test(f.name) ? 'This journal file has no template in it (it was not made with this editor)' : 'That file is not a Jot template or a .jot');
}
$('#open-file').onchange = async () => {
  const f = $('#open-file').files[0]; $('#open-file').value = ''; if (!f) return;
  try { toast(await openFile(f)); } catch (e) { toast(e && e.message && !/JSON|Unexpected/.test(e.message) ? e.message : 'That file could not be read'); }
};
$('#copy-jot').onclick = async () => { menu(false); try { await navigator.clipboard.writeText(files[shown].text); toast('Copied the .jot text'); } catch { toast('Copy is not allowed here: select the text instead'); } };

drawSettings(); drawZones(); drawPreview(); drawHistory();
