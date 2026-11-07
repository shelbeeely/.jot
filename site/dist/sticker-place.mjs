// Free placement in the preview: a sticker or stamp placed on the page (a sticker record with x and y, drawn by the shared
// renderer with its record's source offset) can be dragged, or selected and moved with the keyboard, and made smaller or
// larger, turned or removed from a small bar beside it. Every change rewrites only that record's fields, through the
// editor's edit path, so Undo, autosave and protection apply. The bar lives outside the page, so it is never printed or
// exported. A locked or read-only journal can't be changed here.
import { parse } from './jot/jot.mjs';
import { stickerOf } from './jot/preview.mjs';
import { clamp, placementValues, setRecordFields } from './sticker-packs-core.mjs';
import { applyWritingEdit } from './writing-tools.mjs';

const KEYS = 'Arrow keys move it (Shift for bigger steps), + and - change its size, [ and ] turn it, Delete removes it.';

export function setupStickerPlacement({ editor, preview, status = () => {} }) {
  const doc = editor.ownerDocument, win = doc.defaultView;
  const help = doc.createElement('p'); help.id = 'stickerPlaceHelp'; help.hidden = true; help.textContent = KEYS; doc.body.append(help);
  const bar = doc.createElement('div');
  bar.id = 'stickerPlaceBar'; bar.className = 'sticker-place-bar'; bar.setAttribute('role', 'toolbar'); bar.hidden = true;
  bar.innerHTML = '<button type="button" data-do="smaller">Smaller</button><button type="button" data-do="larger">Larger</button><button type="button" data-do="left">Turn left</button><button type="button" data-do="right">Turn right</button><button type="button" data-do="remove">Remove</button>';
  doc.body.append(bar);
  let selected = null; // the record start of the chosen sticker, which no change to its own fields moves

  /** The sticker record that starts at this offset in the current source, and what the renderer read from it. */
  function recordAt(start) {
    const node = parse(editor.value).nodes.find(n => n.start === start), s = stickerOf(node);
    return s && s.placed ? { node, s } : null;
  }
  const figureAt = start => preview.querySelector(`.jot-sticker.jot-placed[data-jot-start="${start}"]`);
  function decorate() {
    for (const fig of preview.querySelectorAll('.jot-sticker.jot-placed[data-jot-start]')) {
      if (fig.tabIndex === 0) continue;
      const img = fig.querySelector('img'), words = img?.alt || 'picture';
      fig.tabIndex = 0; fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', `${fig.classList.contains('jot-finish-stamp') ? 'Stamp' : 'Sticker'}: ${words}`);
      fig.setAttribute('aria-describedby', help.id); fig.setAttribute('aria-roledescription', 'movable picture');
      if (img) img.draggable = false;
    }
    if (selected !== null) { const fig = figureAt(selected); if (fig) { fig.classList.add('jot-sticker-selected'); showBar(fig); } else hideBar(); }
  }
  new win.MutationObserver(decorate).observe(preview, { childList: true, subtree: true });

  function change(start, values, said, remove = []) {
    if (editor.readOnly) { status('Unlock this journal to move stickers.'); return false; }
    const found = recordAt(start);
    if (!found) { status('That sticker has changed in the writing. Try again.'); return false; }
    const { node } = found, raw = editor.value.slice(node.start, node.end), trail = /\r?\n$/.exec(raw)?.[0] || '';
    const text = setRecordFields(raw.slice(0, raw.length - trail.length), values, remove) + trail;
    if (text === raw) return false;
    const a = editor.selectionStart, b = editor.selectionEnd, shift = (p) => p >= node.end ? p + text.length - raw.length : Math.min(p, node.start + text.length);
    applyWritingEdit(editor, { start: node.start, end: node.end, text, selectionStart: shift(a), selectionEnd: shift(b) });
    if (said) status(said);
    return true;
  }
  function remove(start) {
    if (editor.readOnly) { status('Unlock this journal to remove stickers.'); return; }
    const found = recordAt(start); if (!found) return;
    let { start: a, end: b } = found.node; const v = editor.value;
    if (v.slice(b).startsWith('\n')) b += 1; else if (a && v[a - 1] === '\n' && v[a - 2] === '\n') a -= 1; // its blank line too
    applyWritingEdit(editor, { start: a, end: b, text: '', selectionStart: Math.min(editor.selectionStart, a), selectionEnd: Math.min(editor.selectionEnd, a) });
    select(null); status(`Removed the “${found.s.alt || 'picture'}” ${found.s.finish}. Undo puts it back; the picture stays attached.`);
  }
  function adjust(start, how) {
    const found = recordAt(start); if (!found) return;
    const { s } = found, step = how.big ? 5 : 1, v = {};
    if (how.dx) v.x = clamp(s.x + how.dx * step, 0, 100);
    if (how.dy) v.y = clamp(s.y + how.dy * (how.big ? 1 : 0.25), -200, 200);
    if (how.size) v.width = clamp(s.width + how.size * 0.5, 1, 20);
    if (how.turn) v.rotate = s.rotate + how.turn * 5;
    const out = placementValues(v), drop = out.rotate === '0deg' ? ['rotate'] : [];
    if (drop.length) delete out.rotate;
    const words = [out.x && `left edge ${out.x} across`, out.y && `${out.y} from its place`, out.width && `${out.width} wide`, (out.rotate || drop.length) && `turned ${out.rotate || '0deg'}`].filter(Boolean).join(', ');
    if (change(start, out, `${s.alt || 'Picture'}: ${words}.`, drop)) refocus(start);
  }
  function refocus(start, focus = true) {
    let tries = 0;
    const again = () => { const fig = figureAt(start); if (fig && fig.isConnected) { select(start); if (focus) fig.focus({ preventScroll: true }); } else if (tries++ < 20) win.requestAnimationFrame(again); };
    win.requestAnimationFrame(again);
  }
  function select(start) {
    for (const x of preview.querySelectorAll('.jot-sticker-selected')) x.classList.remove('jot-sticker-selected');
    selected = start;
    const fig = start === null ? null : figureAt(start);
    if (fig) { fig.classList.add('jot-sticker-selected'); showBar(fig); } else hideBar();
  }
  function showBar(fig) {
    if (editor.readOnly) { hideBar(); return; }
    const r = fig.getBoundingClientRect();
    bar.setAttribute('aria-label', `Change ${fig.getAttribute('aria-label') || 'picture'}`);
    bar.hidden = false;
    const w = bar.offsetWidth, h = bar.offsetHeight;
    bar.style.left = `${clamp(r.left + r.width / 2 - w / 2, 8, win.innerWidth - w - 8)}px`;
    bar.style.top = `${r.bottom + 8 + h > win.innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8}px`;
  }
  function hideBar() { bar.hidden = true; }
  bar.addEventListener('click', event => {
    const what = event.target.closest('button')?.dataset.do; if (!what || selected === null) return;
    if (what === 'remove') { remove(selected); return; }
    const start = selected;
    adjust(start, { size: what === 'smaller' ? -1 : what === 'larger' ? 1 : 0, turn: what === 'left' ? -1 : what === 'right' ? 1 : 0 });
    let tries = 0; const back = () => { const b = bar.querySelector(`[data-do="${what}"]`); if (!bar.hidden && figureAt(start)) b.focus(); else if (tries++ < 20) win.requestAnimationFrame(back); };
    win.requestAnimationFrame(back);
  });

  preview.addEventListener('keydown', event => {
    const fig = event.target.closest?.('.jot-sticker.jot-placed[data-jot-start]'); if (!fig) return;
    const start = Number(fig.dataset.jotStart), big = event.shiftKey;
    const moves = { ArrowLeft: { dx: -1 }, ArrowRight: { dx: 1 }, ArrowUp: { dy: -1 }, ArrowDown: { dy: 1 }, '+': { size: 1 }, '=': { size: 1 }, '-': { size: -1 }, '[': { turn: -1 }, ']': { turn: 1 } };
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(start); return; }
    if (event.key === 'Escape') { select(null); return; }
    const how = moves[event.key]; if (!how || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault(); adjust(start, { ...how, big });
  });
  preview.addEventListener('focusin', event => { const fig = event.target.closest?.('.jot-sticker.jot-placed[data-jot-start]'); if (fig) select(Number(fig.dataset.jotStart)); });
  doc.addEventListener('pointerdown', event => { if (!event.target.closest?.('.jot-sticker.jot-placed, #stickerPlaceBar')) select(null); }, true);

  // Dragging: the picture follows the pointer, and one edit writes its new x and y when it is let go.
  preview.addEventListener('pointerdown', event => {
    const fig = event.target.closest?.('.jot-sticker.jot-placed[data-jot-start]');
    if (!fig || event.button !== 0 || editor.readOnly) return;
    event.preventDefault();
    const start = Number(fig.dataset.jotStart), anchor = fig.parentElement, x0 = event.clientX, y0 = event.clientY, base = fig.style.transform;
    const scale = anchor.getBoundingClientRect().width / (anchor.offsetWidth || 1) || 1;
    let moved = false;
    select(start); fig.focus({ preventScroll: true }); fig.setPointerCapture?.(event.pointerId);
    const move = e => {
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true; hideBar(); fig.classList.add('jot-sticker-dragging');
      fig.style.transform = `translate(${dx / scale}px, ${dy / scale}px) ${base}`;
    };
    const up = e => {
      fig.removeEventListener('pointermove', move); fig.removeEventListener('pointerup', up); fig.removeEventListener('pointercancel', up);
      fig.classList.remove('jot-sticker-dragging');
      if (!moved || e.type === 'pointercancel') { fig.style.transform = base; if (!moved) select(start); return; }
      const em = parseFloat(win.getComputedStyle(anchor).fontSize) || 16, width = anchor.clientWidth || 1;
      const x = (fig.offsetLeft + (e.clientX - x0) / scale) / width * 100, y = (fig.offsetTop + (e.clientY - y0) / scale) / em;
      const found = recordAt(start);
      if (!found) { fig.style.transform = base; return; }
      const out = placementValues({ x, y });
      fig.style.transform = base; // the redraw puts it at its new place
      if (change(start, out, `Moved the “${found.s.alt || 'picture'}” ${found.s.finish}: left edge ${out.x} across, ${out.y} from its place. Undo puts it back.`)) refocus(start);
    };
    fig.addEventListener('pointermove', move); fig.addEventListener('pointerup', up); fig.addEventListener('pointercancel', up);
  });
  editor.addEventListener('jot-sticker-placed', event => refocus(event.detail.start, false)); // shown as chosen; the cursor stays in the writing
  return { select, adjust, remove };
}
