// Your life online: data exports to a Jot journal, in this browser (worker.mjs runs engine.mjs). Nothing is uploaded. In the Jot
// desktop app (window.jotDesktop), the app opens the exports instead, any size, a file at a time, and the engine runs on this page.
import '../jot/vendor/jszip.mjs';
import { makeEngine } from './engine.mjs';

const $ = (id) => document.getElementById(id);
const OPTS = ['reposts', 'comments', 'stories', 'places', 'from', 'to', 'timeZone', 'per', 'media', 'title'];
const SHOW = 200000; // the preview shows the first 200,000 characters of a file; downloads are whole
const desktop = window.jotDesktop || null;
const worker = desktop ? null : new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
const local = desktop ? makeEngine() : null;
let seq = 0, waiting = new Map(), result = null, count = 0;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const say = (html) => { $('check').innerHTML = html; };
const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); };
const ask = (msg) => (local ? local(msg) : new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); worker.postMessage({ id, ...msg }); }));
if (worker) {
  worker.onmessage = ({ data }) => { const r = waiting.get(data.id); waiting.delete(data.id); if (r) r(data); };
  worker.onerror = () => say('<span class="warn">The importer could not start in this browser.</span>');
}

try { $('o-timeZone').value = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* left empty: the browser's own */ }
const options = () => Object.fromEntries(OPTS.map((k) => { const el = $('o-' + k); return [k, el.type === 'checkbox' ? el.checked : el.value.trim()]; }));

function showFound(found) {
  const list = $('found'); list.replaceChildren();
  for (const f of found) { const li = document.createElement('li'); li.textContent = `${f.name}: ${f.services.length ? f.services.join(', ') : 'nothing this can read yet'}${f.warnings && f.warnings.length ? ` (${f.warnings.length} ${f.warnings.length === 1 ? 'file' : 'files'} skipped as unsafe)` : ''}`; list.append(li); }
  count = found.length; $('clear').disabled = !count; $('go').disabled = !found.some((f) => f.services.length);
  if (count && !found.some((f) => f.services.length)) say('None of these is an export this can read yet. The guide lists the ones it knows.');
  else if (count) say('Choose what to bring in, then <strong>Make the journal</strong>.');
}
async function add(msg, what) {
  say(`Reading ${esc(what)}…`); $('go').disabled = true;
  const r = await ask({ add: msg });
  if (!r.ok) { say(`<span class="warn">${esc(r.error)}</span>`); $('go').disabled = !count; return; }
  showFound(r.found);
}
async function addFromApp(folder) {
  let sources;
  try { sources = await desktop.pickArchives(folder); } catch (e) { say(`<span class="warn">${esc(e.message || e)}</span>`); return; }
  if (sources.length) add({ sources }, sources.map((s) => s.name).join(', '));
}
$('add-zip').onclick = () => (desktop ? addFromApp(false) : $('zips').click());
$('add-dir').onclick = () => (desktop ? addFromApp(true) : $('dir').click());
if (desktop) $('size-hint').textContent = 'In the app, exports of any size work, ZIPs included: it reads them a file at a time. Add as many as you like; they become one timeline.';
$('zips').onchange = (e) => { const zips = [...e.target.files]; e.target.value = ''; if (zips.length) add({ zips }, zips.map((z) => z.name).join(', ')); };
$('dir').onchange = (e) => {
  const picked = [...e.target.files]; e.target.value = ''; if (!picked.length) return;
  const top = (picked[0].webkitRelativePath || picked[0].name).split('/')[0];
  const files = picked.map((f) => ({ path: (f.webkitRelativePath || f.name).split('/').slice(1).join('/') || f.name, file: f }));
  add({ folder: { name: top, files } }, top);
};
$('clear').onclick = async () => { await ask({ clear: true }); showFound([]); result = null; render(); say('Add an export to begin.'); };

$('go').onclick = async () => {
  const o = options();
  try { if (o.timeZone) new Intl.DateTimeFormat('en', { timeZone: o.timeZone }); } catch { say(`<span class="warn">"${esc(o.timeZone)}" is not a time zone this browser knows. Try a name like Europe/London.</span>`); return; }
  $('go').disabled = true; say('Making the journal…');
  const r = await ask({ make: o }); $('go').disabled = false;
  if (!r.ok) { result = null; render(); say(`<span class="warn">${esc(r.error)}</span>`); return; }
  result = r; render();
};

function render() {
  const has = !!(result && result.files.length);
  $('out-actions').hidden = $('jot').hidden = $('file-pick').hidden = !has;
  const w = $('warnings'); w.replaceChildren(); w.hidden = true;
  if (!has) return;
  const s = result.summary, f0 = result.files[0], last = result.files.at(-1), problems = result.files.reduce((n, f) => n + f.problems, 0);
  say(`<strong>${s.items} posts and notes</strong> from ${esc(s.found.join(', '))}, ${esc(f0.from)} to ${esc(last.to)}, dated in ${esc(s.timeZone)}: ${result.files.length} ${result.files.length === 1 ? 'file' : 'files'}.${s.left.length ? ` Left out: ${esc(s.left.join(', '))}.` : ''} ${problems ? `<span class="warn">${problems} problems found by the Jot checker.</span>` : 'Every file is valid Jot.'}`);
  for (const m of result.warnings) { const li = document.createElement('li'); li.textContent = m; w.append(li); w.hidden = false; }
  const sel = $('file-sel'); sel.replaceChildren(...result.files.map((f, i) => { const o = document.createElement('option'); o.value = i; o.textContent = `${f.name} · ${f.items} items · ${kb(f.bytes)}${f.photos ? ` · ${f.photos} photos` : ''}`; return o; }));
  showFile();
}
function showFile() { const f = result.files[Number($('file-sel').value) || 0]; $('jot').textContent = f.text.length > SHOW ? f.text.slice(0, SHOW) + '\n…' : f.text; }
$('file-sel').onchange = showFile;
const blobOf = (f) => new Blob([f.data || f.text], { type: f.data ? 'application/zip' : 'text/plain;charset=utf-8' });
const save = (blob, name) => { const u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 15000); };
$('dl-one').onclick = () => { const f = result.files[Number($('file-sel').value) || 0]; save(blobOf(f), f.name); toast(`Downloaded ${f.name}`); };
$('dl-zip').onclick = async () => {
  const z = new globalThis.JSZip(); for (const f of result.files) z.file(f.name, f.data || f.text);
  save(await z.generateAsync({ type: 'blob' }), `${(result.files[0].name.replace(/(-\d{4}(-\d{2})?)?\.jotz?$/, '')) || 'life-online'}.zip`); toast('Downloaded all the files');
};
