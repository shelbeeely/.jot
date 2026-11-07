// The Stickers dialog: choose a sticker or stamp from a pack and place it, with Undo: free on the page (its own record after
// the paragraph at the cursor, then dragged or nudged in the preview by sticker-place.mjs) or in the line of writing (an
// image reference at the cursor). The picture is attached to the journal once (the same bytes are never attached twice), so it travels inside the .jotz,
// is protected with the journal when it is locked, and reads offline. Jot's own pack is drawn here; other packs are
// .jotz files the person opens, or pictures they choose. Packs stay in this page unless the person asks to keep one
// in this browser, where it is stored unencrypted and apart from any journal. Nothing is fetched.
import { MAX_INPUT_BYTES, MAX_STICKERS, PICTURE_TYPES, STICKER_SIZE, attachedCopy, blockEnd, blockInsertion, builtinPack, labelFromName, packSource, placedRecord, readPack, slug, stickerId, stickerPath, stickerReference } from './sticker-packs-core.mjs';
import { applyWritingEdit } from './writing-tools.mjs';
import { pack as packArchive, readDocument } from './jot/container.mjs';
import * as storage from './jot/storage.mjs';

const KEPT = 'sticker-packs-v1'; // a key in the opt-in library store that People & Places also uses
const CHOSEN = 'jot-sticker-pack-v1', HOW = 'jot-sticker-place-v1';
export const INKS = [['#1f1f1f', 'Black'], ['#24407a', 'Blue'], ['#8a2430', 'Red'], ['#2f5d3a', 'Green'], ['#5a3d7a', 'Purple']];
const SVG = 'http://www.w3.org/2000/svg';

function canvasOf(doc, size) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(size, size);
  const c = doc.createElement('canvas'); c.width = size; c.height = size; return c;
}
async function pngBytes(canvas) {
  const blob = canvas.convertToBlob ? await canvas.convertToBlob({ type: 'image/png' }) : await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('This browser could not draw the sticker.')), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}
/** One of Jot's own stickers as a PNG: a white die-cut disc with a dark edge and a bold black icon, legible on any paper and in print. */
export async function drawBuiltin(doc, sticker, size = STICKER_SIZE) {
  const canvas = canvasOf(doc, size), ctx = canvas.getContext('2d'), r = size / 2;
  ctx.beginPath(); ctx.arc(r, r, r - size * 0.04, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.lineWidth = size * 0.025; ctx.strokeStyle = '#1f1f1f'; ctx.stroke();
  const box = size * 0.58, scale = box / 24;
  ctx.save(); ctx.translate((size - box) / 2, (size - box) / 2); ctx.scale(scale, scale);
  ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111111';
  ctx.stroke(new Path2D(sticker.d)); ctx.restore();
  return pngBytes(canvas);
}
// A stamp is ink, not paper: the icon alone, or a picture's dark parts, in one ink color, with a fixed speckle where the
// ink did not take (the same every time, so the same stamp is the same bytes and is attached once).
const speckle = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h & 255) / 255; };
function inkOver(ctx, w, h, ink) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(ink.slice(i, i + 2), 16)), img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const dark = 1 - (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255, a = (d[i + 3] / 255) * Math.min(1, dark * 1.4);
    const take = speckle(p % w, Math.floor(p / w)) < 0.12 ? 0.35 : 1;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = Math.round(255 * a * take * 0.92);
  }
  ctx.putImageData(img, 0, 0);
}
export async function drawStamp(doc, sticker, ink, size = STICKER_SIZE) {
  if (!/^#[0-9a-f]{6}$/i.test(ink)) throw new Error('Choose an ink color.');
  const canvas = canvasOf(doc, size), ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (sticker.d) {
    const box = size * 0.84, scale = box / 24;
    ctx.save(); ctx.translate((size - box) / 2, (size - box) / 2); ctx.scale(scale, scale);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#000000'; ctx.stroke(new Path2D(sticker.d)); ctx.restore();
  } else {
    const bitmap = await createImageBitmap(new Blob([sticker.data], { type: sticker.mediaType }));
    canvas.width = bitmap.width; canvas.height = bitmap.height; ctx.drawImage(bitmap, 0, 0); bitmap.close?.();
  }
  inkOver(ctx, canvas.width, canvas.height, ink);
  return pngBytes(canvas);
}
/** A chosen picture scaled to fit a sticker, as a PNG (transparency kept; an animation keeps its first frame only). */
export async function shrinkPicture(doc, file, size = STICKER_SIZE) {
  if (!PICTURE_TYPES.has(file.type)) throw new Error(`${file.name}: choose PNG, JPEG, WebP, GIF or AVIF pictures.`);
  if (file.size > MAX_INPUT_BYTES) throw new Error(`${file.name} is over 8 MiB.`);
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error(`${file.name} could not be read as a picture.`); }
  const k = Math.min(1, size / Math.max(bitmap.width, bitmap.height)), w = Math.max(1, Math.round(bitmap.width * k)), h = Math.max(1, Math.round(bitmap.height * k));
  const canvas = canvasOf(doc, size); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bitmap, 0, 0, w, h); bitmap.close?.();
  return pngBytes(canvas);
}

export function setupStickerPacks({ editor, status = () => {}, assets = () => [], attach, download }) {
  const doc = editor.ownerDocument, win = doc.defaultView;
  const dialog = doc.createElement('dialog');
  dialog.id = 'stickerPicker'; dialog.className = 'writer-small-dialog sticker-picker'; dialog.setAttribute('aria-labelledby', 'stickerTitle');
  // Static markup only; pack titles and sticker words from files are set with textContent.
  dialog.innerHTML = `<div class="dialog-header"><h2 id="stickerTitle">Stickers</h2><button id="stickerClose" class="icon-button" type="button" aria-label="Close stickers">✕</button></div>
<div class="sticker-row"><label>Pack <select id="stickerPack"></select></label></div>
<p id="stickerAbout" class="small"></p>
<ul id="stickerGrid" class="sticker-grid" aria-label="Stickers in this pack"></ul>
<div id="stickerReview" class="sticker-review" hidden><label for="stickerAlt">What it says (read aloud, and the words in the file)</label><input id="stickerAlt" maxlength="120" autocomplete="off">
<fieldset class="sticker-choices"><legend>Where</legend><label><input type="radio" name="stickerHow" value="free" checked> Free on the page</label><label><input type="radio" name="stickerHow" value="line"> In the line of writing</label></fieldset>
<fieldset class="sticker-choices"><legend>As a</legend><label><input type="radio" name="stickerFinish" value="sticker" checked> Sticker</label><label><input type="radio" name="stickerFinish" value="stamp"> Stamp</label>
<label id="stickerInkLabel" hidden>Ink <select id="stickerInk"></select></label></fieldset>
<p id="stickerHowHelp" class="small"></p>
<div class="writer-small-actions"><button id="stickerInsert" class="button primary" type="button">Place</button><button id="stickerRename" class="quiet" type="button" hidden>Keep these words in the pack</button></div></div>
<p id="stickerStatus" role="status" aria-live="polite"></p>
<details class="sticker-more"><summary>Packs</summary>
<div class="writer-small-actions"><button id="stickerMake" class="quiet" type="button">Make a pack from pictures…</button><button id="stickerOpen" class="quiet" type="button">Open a pack .jotz…</button><button id="stickerDownload" class="quiet" type="button">Download this pack .jotz</button></div>
<label class="sticker-check" id="stickerKeepLabel"><input id="stickerKeep" type="checkbox"> Keep this pack in this browser</label>
<button id="stickerRemove" class="quiet" type="button">Remove this pack</button>
<p class="small">Packs you make or open stay in this page until you keep one. Kept packs are stored unencrypted in this browser, apart from your journals. A placed sticker is attached to the journal, so it is locked with it and travels in the .jotz.</p>
<input id="stickerPictures" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple hidden><input id="stickerFile" type="file" accept=".jotz,application/zip" hidden></details>`;
  doc.body.append(dialog);
  const button = doc.createElement('button');
  button.id = 'stickersBtn'; button.type = 'button'; button.className = 'quiet'; button.textContent = 'Stickers';
  button.title = 'Place a sticker from a pack at the cursor: functional icons, or your own pictures';
  doc.querySelector('.tool-row')?.append(button);
  const $ = id => dialog.querySelector('#' + id), say = text => { $('stickerStatus').textContent = text; };
  const how = () => dialog.querySelector('[name=stickerHow]:checked').value, finish = () => dialog.querySelector('[name=stickerFinish]:checked').value;
  for (const [value, words] of INKS) { const o = doc.createElement('option'); o.value = value; o.textContent = words; $('stickerInk').append(o); }
  try { const saved = JSON.parse(win.localStorage.getItem(HOW) || '{}'); for (const [name, value] of [['stickerHow', saved.how], ['stickerFinish', saved.finish]]) { const r = dialog.querySelector(`[name=${name}][value="${value}"]`); if (r) r.checked = true; } if (INKS.some(([v]) => v === saved.ink)) $('stickerInk').value = saved.ink; } catch { /* standard choices */ }
  function showHow() {
    $('stickerInkLabel').hidden = finish() !== 'stamp';
    $('stickerHowHelp').textContent = how() === 'free'
      ? 'It goes after the paragraph at your cursor and moves with it. Drag it in the preview, or select it there and use the arrow keys.'
      : 'It goes in at your cursor, like a word.';
    try { win.localStorage.setItem(HOW, JSON.stringify({ how: how(), finish: finish(), ink: $('stickerInk').value })); } catch { /* this visit only */ }
  }
  for (const r of dialog.querySelectorAll('[name=stickerHow],[name=stickerFinish]')) r.onchange = showHow;
  $('stickerInk').onchange = showHow;

  const builtin = builtinPack(), packs = [builtin], kept = new Set(), urls = [];
  let current = builtin, chosen = null, caret = 0, ready = null;
  try { const id = win.localStorage.getItem(CHOSEN); if (id) current = { id }; } catch { /* first pack */ }

  async function loadKept() {
    try {
      for (const p of (await storage.get('references', KEPT)) || []) {
        if (!p?.id || packs.some(x => x.id === p.id) || !Array.isArray(p.stickers)) continue;
        const stickers = p.stickers.filter(s => s && PICTURE_TYPES.has(s.mediaType) && s.data instanceof Uint8Array).slice(0, MAX_STICKERS);
        if (stickers.length) { packs.push({ ...p, stickers }); kept.add(p.id); }
      }
    } catch { /* storage unavailable: this visit only */ }
  }
  async function saveKept() {
    try { await storage.put('references', KEPT, packs.filter(p => kept.has(p.id)).map(({ id, title, stickers }) => ({ id, title, stickers: stickers.map(({ name, alt, role, path, mediaType, data, license, creator }) => ({ name, alt, role, path, mediaType, data, license, creator })) }))); }
    catch { say('This browser could not keep the pack. It stays until you close the page.'); }
  }
  const revoke = () => { while (urls.length) win.URL.revokeObjectURL(urls.pop()); };

  function showPacks() {
    const select = $('stickerPack'); select.textContent = '';
    if (!packs.some(p => p.id === current.id)) current = builtin;
    for (const p of packs) { const o = doc.createElement('option'); o.value = p.id; o.textContent = p.title + (p.builtin ? '' : kept.has(p.id) ? ' (kept)' : ''); select.append(o); }
    select.value = current.id;
    $('stickerAbout').textContent = current.builtin
      ? 'Black and white icons that each carry information, with their words beside them. Jot’s own drawings, free to use (CC0).'
      : `${current.stickers.length} sticker${current.stickers.length === 1 ? '' : 's'}${current.stickers.some(s => s.role === 'functional') ? '' : ', decorative'}.`;
    $('stickerKeep').checked = kept.has(current.id); $('stickerKeepLabel').hidden = !!current.builtin; $('stickerRemove').hidden = !!current.builtin;
    showGrid();
  }
  function showGrid() {
    revoke(); chosen = null; $('stickerReview').hidden = true;
    const grid = $('stickerGrid'); grid.textContent = '';
    for (const s of current.stickers) {
      const li = doc.createElement('li'), b = doc.createElement('button');
      b.type = 'button'; b.className = 'sticker-choice'; b.setAttribute('aria-pressed', 'false');
      if (s.d) {
        const svg = doc.createElementNS(SVG, 'svg'), path = doc.createElementNS(SVG, 'path');
        svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); path.setAttribute('d', s.d); svg.append(path); b.append(svg);
      } else {
        const img = doc.createElement('img'), url = win.URL.createObjectURL(new Blob([s.data], { type: s.mediaType }));
        urls.push(url); img.src = url; img.alt = ''; b.append(img);
      }
      const words = doc.createElement('span'); words.textContent = s.alt; b.append(words);
      b.onclick = () => choose(s, b);
      li.append(b); grid.append(li);
    }
  }
  function choose(s, b) {
    chosen = s;
    for (const x of $('stickerGrid').querySelectorAll('[aria-pressed]')) x.setAttribute('aria-pressed', String(x === b));
    $('stickerReview').hidden = false; $('stickerAlt').value = s.alt; $('stickerRename').hidden = !!current.builtin;
    $('stickerAlt').focus(); $('stickerAlt').select();
  }

  async function bytesOf(s) { return s.data || (s.data = await drawBuiltin(doc, s)); }
  /** The journal's path for this sticker or stamp: an attachment with the same bytes if there is one, otherwise a new one. */
  async function attached(s, stamp) {
    const ink = $('stickerInk').value, data = stamp ? await drawStamp(doc, s.d ? s : { ...s, data: await bytesOf(s) }, ink) : await bytesOf(s), list = assets(), copy = attachedCopy(list, data);
    if (copy) return copy.path;
    const wanted = stamp ? s.path.replace(/\.png$/, `-stamp-${ink.slice(1).toLowerCase()}.png`) : s.path;
    const taken = new Set(list.map(a => a.path)), path = taken.has(wanted) || !/^assets\/stickers\//.test(wanted) ? stickerPath(current.id, (s.name || s.alt) + (stamp ? '-stamp' : ''), taken) : wanted;
    const file = new File([data], path.split('/').pop(), { type: s.mediaType }); file.jotPath = path;
    const [added] = await attach([file]);
    return added;
  }
  $('stickerInsert').onclick = async () => {
    if (!chosen) return;
    if (editor.readOnly) { say('Unlock this journal to place stickers.'); return; }
    try {
      const alt = $('stickerAlt').value.replace(/\s+/g, ' ').trim(), stamp = finish() === 'stamp', kind = stamp ? 'stamp' : 'sticker';
      stickerReference(alt, 'assets/stickers/x/x.png'); // words first, before anything is attached
      const path = await attached(chosen, stamp), source = editor.value, at = Math.min(caret, source.length);
      if (how() === 'free') {
        const record = placedRecord({ id: stickerId(source, chosen.name || alt), path, alt, role: chosen.role, finish: kind });
        const change = blockInsertion(source, blockEnd(source, at), record), keep = Math.min(editor.selectionStart, change.start);
        dialog.close();
        applyWritingEdit(editor, { start: change.start, end: change.end, text: change.text, selectionStart: keep, selectionEnd: keep });
        editor.dispatchEvent(new CustomEvent('jot-sticker-placed', { detail: { start: change.recordStart } }));
        status(`Placed the “${alt}” ${kind} on the page. Drag it in the preview, or select it there and use the arrow keys. Undo removes it.`);
        return;
      }
      const text = stickerReference(alt, path), before = source[at - 1], after = source[at];
      const lead = at && before && !/\s/.test(before) ? ' ' : '', tail = after && !/\s/.test(after) ? ' ' : '';
      const end = at + lead.length + text.length;
      dialog.close();
      applyWritingEdit(editor, { start: at, end: at, text: lead + text + tail, selectionStart: end, selectionEnd: end });
      status(`Placed the “${alt}” ${kind} in the line. Undo removes it from the writing; the picture stays attached.`);
    } catch (error) { say(error.message); }
  };
  $('stickerRename').onclick = async () => {
    const words = $('stickerAlt').value.replace(/\s+/g, ' ').trim();
    if (!chosen || current.builtin || !words) return;
    chosen.alt = words.slice(0, 120); showGrid();
    if (kept.has(current.id)) await saveKept();
    say('The pack now uses those words.');
  };

  function addPack(p) {
    let id = p.id || slug(p.title, 'pack'), n = 2;
    while (packs.some(x => x.id === id)) id = `${p.id || slug(p.title, 'pack')}-${n++}`;
    current = { ...p, id }; packs.push(current); remember(); showPacks();
  }
  const remember = () => { try { win.localStorage.setItem(CHOSEN, current.id); } catch { /* this visit only */ } };
  $('stickerPack').onchange = () => { current = packs.find(p => p.id === $('stickerPack').value) || builtin; remember(); showPacks(); };
  $('stickerMake').onclick = () => $('stickerPictures').click();
  $('stickerPictures').onchange = async event => {
    const files = [...event.target.files].slice(0, MAX_STICKERS); event.target.value = '';
    if (!files.length) return;
    const stickers = [], problems = [], id = 'my-stickers';
    say('Making the pack…');
    for (const file of files) {
      try { const name = slug(labelFromName(file.name)); stickers.push({ name, alt: labelFromName(file.name), role: 'decorative', path: stickerPath(id, name, new Set(stickers.map(s => s.path))), mediaType: 'image/png', data: await shrinkPicture(doc, file) }); }
      catch (error) { problems.push(error.message); }
    }
    if (!stickers.length) { say(problems[0] || 'No pictures could be used.'); return; }
    addPack({ id, title: 'My stickers', stickers });
    say(`Made a pack of ${stickers.length}.${problems.length ? ' Left out: ' + problems.join(' ') : ''} Check each sticker’s words before you place it.`);
  };
  $('stickerOpen').onclick = () => $('stickerFile').click();
  $('stickerFile').onchange = async event => {
    const [file] = event.target.files; event.target.value = '';
    if (!file) return;
    try {
      const opened = await readDocument(new Uint8Array(await file.arrayBuffer()));
      if (opened.protected) throw new Error('That pack is locked. Unlock it in Writer and download it without a lock to use it as a pack.');
      const read = readPack(opened.source, opened.assets, labelFromName(file.name));
      if (!read.stickers.length) throw new Error('No stickers found: a pack lists attached pictures in planner-sticker-and-deco-culture@1 attachment records.');
      addPack({ id: slug(read.title, 'pack'), title: read.title, stickers: read.stickers });
      say(`Opened ${read.title}: ${read.stickers.length} sticker${read.stickers.length === 1 ? '' : 's'}.${read.skipped ? ` ${read.skipped} record${read.skipped === 1 ? ' was' : 's were'} left out (missing or not a picture Jot shows).` : ''}`);
    } catch (error) { say(error.message || 'That file could not be opened as a pack.'); }
  };
  $('stickerDownload').onclick = async () => {
    try {
      const stickers = await Promise.all(current.stickers.map(async s => ({ ...s, data: await bytesOf(s) })));
      const source = packSource({ ...current, stickers }), files = stickers.map(s => ({ path: s.path, mediaType: s.mediaType, name: s.path.split('/').pop(), data: s.data }));
      download(await packArchive({ source, assets: files, metadata: { title: current.title } }), slug(current.title, 'stickers') + '.jotz', 'application/zip');
      say('Downloaded the pack. It opens here under Packs, and in Writer as an ordinary journal.');
    } catch (error) { say(error.message); }
  };
  $('stickerKeep').onchange = async () => {
    if ($('stickerKeep').checked) kept.add(current.id); else kept.delete(current.id);
    await saveKept(); showPacks();
    say($('stickerKeep').checked ? 'Kept in this browser, unencrypted and apart from your journals.' : 'No longer kept: it stays until you close the page.');
  };
  $('stickerRemove').onclick = async () => {
    if (current.builtin) return;
    const was = current.title; packs.splice(packs.indexOf(current), 1);
    if (kept.delete(current.id)) await saveKept();
    current = builtin; remember(); showPacks(); say(`Removed ${was}. Stickers already placed stay in your journals.`);
  };

  async function open() {
    if (editor.readOnly) { status('Unlock this journal to place stickers.'); return; }
    caret = editor.selectionEnd; say('');
    ready ||= loadKept();
    await ready;
    current = packs.find(p => p.id === current.id) || builtin;
    showPacks(); showHow();
    dialog.showModal();
    dialog.querySelector('.sticker-choice')?.focus();
  }
  $('stickerClose').onclick = () => { dialog.close(); editor.focus(); };
  dialog.addEventListener('close', revoke);
  button.onclick = open;
  return { open, packs: () => packs };
}
