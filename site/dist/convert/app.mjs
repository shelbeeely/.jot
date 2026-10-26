// The diary converter page: the same converter as the command line (../jot/convert.mjs, from converter/convert.mjs), in a worker.
// Everything stays in this browser; the only request it makes is a "From a web address" fetch the user asks for.
import '../jot/vendor/jszip.mjs';

const $ = (id) => document.getElementById(id);
const MAX_INPUT = 64 * 1024 * 1024, SHOW = 200000; // the preview shows the first 200,000 characters of a file; downloads are whole
const OPTS = ['year', 'calendar', 'notes', 'per', 'title', 'author', 'source', 'name'];
const worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
const HINT = $('source-state').innerHTML;
let seq = 0, latest = 0, result = null, hasSource = false;

// the converter's warnings name the command-line options; here they name the controls on this page
const WORDS = [[/\(--year\)/g, '(Starting year, above)'], [/try --calendar julian/g, 'set Calendar to Old Style'], [/\(split it with --per year or --per month\)/g, '(set Files to a file a year or a month)']];
const words = (m) => WORDS.reduce((t, [re, w]) => t.replace(re, w), m);
const options = () => Object.fromEntries(OPTS.map((k) => [k, $(`o-${k}`).value]));
const toast = (msg) => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 3200); };
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const say = (html) => { $('check').innerHTML = html; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function send(msg) { latest = ++seq; say('Converting…'); worker.postMessage({ id: latest, options: options(), ...msg }, msg.bytes ? [msg.bytes] : []); }

worker.onmessage = ({ data }) => {
  if (data.id !== latest) return; // an older run, overtaken by a newer one
  if (!data.ok) { result = null; show(); say(`<span class="warn">${esc(data.error)}</span>`); return; }
  result = data; show();
};
worker.onerror = () => say('<span class="warn">The converter could not start in this browser.</span>');

function show() {
  const files = result ? result.files : [];
  $('out-actions').hidden = !files.length; $('jot').hidden = !files.length;
  $('file-pick').hidden = files.length < 2; $('dl-zip').hidden = files.length < 2;
  const w = $('warnings'); w.replaceChildren(); w.hidden = true;
  if (!result) return;
  const problems = files.reduce((n, f) => n + f.problems.length, 0);
  say(`${result.summary.map(esc).join('<br>')}<br>${files.length} file${files.length > 1 ? 's' : ''} · ${problems ? `<span class="warn">${problems} problems found</span>` : '<span class="ok">valid Jot</span>'}`);
  for (const m of [...result.warnings.map(words), ...files.flatMap((f) => f.problems.map((p) => `${f.name}: ${p}`))]) { const li = document.createElement('li'); li.textContent = m; w.append(li); w.hidden = false; }
  const sel = $('file-sel'), keep = sel.value;
  sel.replaceChildren(...files.map((f, i) => new Option(`${f.name} · ${f.entries} entries · ${kb(f.bytes)}`, String(i))));
  sel.value = files[+keep] ? keep : '0';
  showFile();
}
function showFile() {
  const f = result.files[+$('file-sel').value || 0];
  $('jot').textContent = f.text.length > SHOW ? `${f.text.slice(0, SHOW)}\n\n… the rest of this file (${kb(f.bytes)} in all) is in the download.` : f.text;
}

// ---- input ----
function setSource(label) { hasSource = true; $('clear').disabled = false; $('source-state').textContent = label; }
async function openFile(file) {
  if (!file) return;
  if (file.size > MAX_INPUT) { toast(`${file.name} is over 64 MB: too big for a diary in plain text.`); return; }
  if (/\.(jotz|zip|pdf|docx?|epub)$/i.test(file.name)) { toast('That is not a plain-text file. Save the diary as plain text (UTF-8) first.'); return; }
  setSource(`${file.name} · ${kb(file.size)}`); say('Converting…');
  $('paste').value = '';
  send({ bytes: await file.arrayBuffer() });
}
$('open').onclick = () => $('file').click();
$('file').onchange = (e) => { openFile(e.target.files[0]); e.target.value = ''; };
const toggle = (btn, box) => { const open = box.hidden; box.hidden = !open; $(btn).setAttribute('aria-expanded', String(open)); if (open) box.querySelector('textarea, input').focus(); };
$('paste-toggle').onclick = () => toggle('paste-toggle', $('paste-box'));
$('url-toggle').onclick = () => toggle('url-toggle', $('url-box'));
let pasteTimer;
$('paste').oninput = () => {
  clearTimeout(pasteTimer); say('Converting…');
  pasteTimer = setTimeout(() => { const t = $('paste').value; if (!t.trim()) return clear(); setSource(`Pasted text · ${kb(new Blob([t]).size)}`); send({ text: t }); }, 300);
};
$('fetch').onclick = async () => {
  let u;
  try { u = new URL($('url').value.trim()); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { toast('Give a web address that starts with https://'); return; }
  say(`Fetching ${esc(u.host)}…`);
  try {
    const res = await fetch(u, { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`the site answered ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_INPUT) throw new Error('the file is over 64 MB');
    setSource(`${u.host}${u.pathname} · ${kb(buf.byteLength)}`); $('paste').value = '';
    send({ bytes: buf });
  } catch (e) {
    say(`<span class="warn">Could not fetch it${e instanceof TypeError ? ': that site does not let other pages read its files' : `: ${esc(e.message)}`}.</span> Download the file, then open it with <strong>Open a text file</strong>.`);
  }
};
function clear() {
  hasSource = false; result = null; latest = ++seq; $('clear').disabled = true; $('paste').value = '';
  $('source-state').innerHTML = HINT; say('Open a diary to begin.'); show();
}
$('clear').onclick = clear;

// drop anywhere on the page
addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); document.body.classList.add('dropping'); } });
addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dropping'); });
addEventListener('drop', (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); document.body.classList.remove('dropping'); openFile(e.dataTransfer.files[0]); });

// ---- options: any change converts again (the worker keeps the diary) ----
let optTimer;
for (const k of OPTS) $(`o-${k}`).addEventListener(['calendar', 'notes', 'per'].includes(k) ? 'change' : 'input', () => {
  if (!hasSource) return; say('Converting…'); clearTimeout(optTimer); optTimer = setTimeout(() => send({}), 250);
});

// ---- output ----
$('file-sel').onchange = showFile;
const save = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
$('dl-one').onclick = () => { const f = result.files[+$('file-sel').value || 0]; save(new Blob([f.text], { type: 'text/plain;charset=utf-8' }), f.name); };
$('dl-zip').onclick = async () => {
  const zip = new globalThis.JSZip();
  for (const f of result.files) zip.file(f.name, f.text, { date: new Date() });
  save(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), `${result.stem}.zip`);
};
$('copy').onclick = async () => {
  const f = result.files[+$('file-sel').value || 0];
  try { await navigator.clipboard.writeText(f.text); toast(`Copied ${f.name}.`); } catch { toast('This browser did not allow copying. Use Download instead.'); }
};
