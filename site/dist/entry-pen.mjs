// Pen and ink for one dated entry (spec 8.3.1): writes `@hand:` and `@ink:` lines under the entry's heading.
// Earlier entries are never edited, and their source and look stay as they were.
import { parse } from './jot/jot.mjs';
import { entryAtCaret } from './jot/timezone.mjs';
import { HANDS, INKS, entryPens, handOf, inkOf } from './jot/handwriting.mjs';

const encoder = new TextEncoder(), decoder = new TextDecoder();

/** A readable label for a pen or ink value, as stored ('script10', 'green', '#8a2d1a') or null for the reader's choice. */
export function penLabel(name, value) {
  if (value === null || value === undefined) return 'page setting';
  if (name === 'hand') return HANDS[value]?.name || value;
  return Object.hasOwn(INKS, value) ? value : value.toUpperCase();
}

/**
 * Sets the pen and ink of the dated entry at `caret`.
 * `hand` and `ink` are a known value, null for the reader's choice, or undefined to leave that setting alone.
 * scope 'entry' keeps later entries as they were (the next entry gets a line that goes back, unless it already sets its own);
 * scope 'onward' lets later entries follow until one sets its own.
 */
export function setEntryPen(source, caret, { hand, ink, scope = 'entry' } = {}) {
  const ast = parse(source), entry = entryAtCaret(ast, caret);
  if (!entry) throw new Error('Place your cursor inside a dated entry first.');
  if (hand !== undefined && hand !== null && handOf(hand) !== hand) throw new Error('Choose one of the listed pens.');
  if (ink !== undefined && ink !== null && inkOf(ink) !== ink) throw new Error('Use one of the listed inks or a colour such as #8a2d1a.');
  const bytes = encoder.encode(ast.source), charAt = byte => decoder.decode(bytes.slice(0, byte)).length;
  const pens = entryPens(ast), index = ast.entries.indexOf(entry), next = ast.entries[index + 1];
  const before = entry.startNode > 0 ? pens[entry.startNode - 1] : { hand: null, ink: null };
  const own = (e, name) => ast.nodes.slice(e.startNode + 1, e.endNode).filter(n => n.type === 'directive' && n.name === name);
  const heading = ast.nodes[entry.startNode], newline = /\r\n/.test(heading.raw) ? '\r\n' : '\n';
  const edits = [], lines = [], restore = [];
  for (const name of ['hand', 'ink']) {
    const wanted = name === 'hand' ? hand : ink;
    if (wanted === undefined) continue;
    for (const n of own(entry, name)) edits.push({ from: charAt(n.start), to: charAt(n.end), text: '' });
    if (wanted !== before[name]) lines.push('@' + name + ': ' + (wanted ?? 'default'));
    // Only this entry: the next entry goes back to what it showed before, unless it chooses for itself.
    if (scope === 'entry' && next && !own(next, name).length) {
      const was = pens[next.startNode]?.[name] ?? null;
      if (wanted !== was) restore.push('@' + name + ': ' + (was ?? 'default'));
    }
  }
  // The lines go straight under the heading, with a blank line before the writing so the source stays easy to read.
  const insertAfter = (node, added) => {
    const at = charAt(node.end), rest = source.slice(at);
    const gap = /^(?:\r?\n|[ \t]*$)/.test(rest) || /^@(?:hand|ink):/.test(rest) ? '' : newline;
    edits.push({ from: at, to: at, text: (/[\r\n]$/.test(node.raw) ? '' : newline) + added.join(newline) + newline + gap });
  };
  const at = charAt(heading.end);
  if (lines.length) insertAfter(heading, lines);
  if (restore.length) insertAfter(ast.nodes[next.startNode], restore);
  // Choosing "and after" runs until a later entry that sets its own pen or ink.
  const later = ast.entries.slice(index + 1).find(e => (hand !== undefined && own(e, 'hand').length) || (ink !== undefined && own(e, 'ink').length));
  // Removing an entry's own lines (with nothing written in their place) also takes away the blank line after them.
  const removed = edits.filter(edit => !edit.text && edit.from > charAt(heading.start) && (!next || edit.from < charAt(ast.nodes[next.startNode].start))).sort((x, y) => x.from - y.from);
  if (!lines.length && removed.length) {
    const last = removed.at(-1), gap = source.slice(last.to).match(/^\r?\n/);
    let before = source.slice(0, last.from);
    for (const edit of removed.slice(0, -1).reverse()) before = before.slice(0, edit.from) + before.slice(edit.to);
    if (gap && /\n\r?\n$/.test(before)) last.to += gap[0].length;
  }
  edits.sort((a, b) => b.from - a.from || b.to - a.to);
  let out = source;
  for (const edit of edits) out = out.slice(0, edit.from) + edit.text + out.slice(edit.to);
  return { source: out, date: entry.date, next: scope === 'entry' && next ? next.date : null, until: scope === 'onward' && later ? later.date : null, caret: Math.min(out.length, at) };
}

/** What the entry at `caret` uses now, and whether it chose that itself or follows an earlier entry. */
export function entryPenAt(source, caret) {
  const ast = parse(source), entry = entryAtCaret(ast, caret);
  if (!entry) return null;
  const state = entryPens(ast)[entry.startNode] || { hand: null, ink: null };
  const own = name => ast.nodes.slice(entry.startNode + 1, entry.endNode).some(n => n.type === 'directive' && n.name === name);
  return { date: entry.date, hand: state.hand, ink: state.ink, ownHand: own('hand'), ownInk: own('ink') };
}

export function setupEntryPen({ editor, rewrite, status, defaults = () => ({}) }) {
  const doc = editor.ownerDocument, $ = id => doc.getElementById(id), dialog = $('entryPenDialog');
  if (!dialog) return;
  const pen = $('entryPenHand'), ink = $('entryPenInk'), custom = $('entryPenColor'), customWrap = $('entryPenColorWrap');
  let snapshot = '', caret = 0;
  const option = (select, value, label) => { const o = doc.createElement('option'); o.value = value; o.textContent = label; select.append(o); };
  option(pen, '', 'Page setting');
  for (const [key, value] of Object.entries(HANDS)) option(pen, key, value.name);
  option(ink, '', 'Page setting');
  for (const key of Object.keys(INKS)) option(ink, key, key[0].toUpperCase() + key.slice(1));
  option(ink, 'custom', 'Another colour…');
  const showCustom = () => { customWrap.hidden = ink.value !== 'custom'; };
  ink.onchange = showCustom;
  $('entryPenBtn').onclick = () => {
    caret = editor.selectionStart; snapshot = editor.value;
    const state = entryPenAt(snapshot, caret);
    if (!state) { status('Place your cursor inside a dated entry before choosing its pen and ink.', true); editor.focus(); return; }
    $('entryPenHeading').textContent = 'Pen and ink for ' + state.date;
    pen.value = state.hand || '';
    if (state.ink && !Object.hasOwn(INKS, state.ink)) { ink.value = 'custom'; custom.value = state.ink; } else ink.value = state.ink || '';
    showCustom();
    const reader = defaults(), from = state.ownHand || state.ownInk ? 'This entry chooses its own.' : state.hand || state.ink ? 'This entry follows an earlier one.' : 'This entry uses your page settings' + (reader.hand ? ' (' + penLabel('hand', reader.hand) + ', ' + penLabel('ink', reader.ink) + ')' : '') + '.';
    $('entryPenNow').textContent = 'Now: ' + penLabel('hand', state.hand) + ' · ' + penLabel('ink', state.ink) + '. ' + from;
    $('entryPenOnly').checked = true;
    $('entryPenStatus').textContent = '';
    dialog.showModal(); pen.focus();
  };
  $('entryPenForm').onsubmit = event => {
    event.preventDefault();
    if (editor.value !== snapshot) { $('entryPenStatus').textContent = 'The journal changed. Close and reopen this at the entry you want.'; return; }
    const chosenInk = ink.value === 'custom' ? custom.value.toLowerCase() : ink.value || null;
    const scope = $('entryPenOnward').checked ? 'onward' : 'entry';
    try {
      const result = setEntryPen(snapshot, caret, { hand: pen.value || null, ink: chosenInk, scope });
      dialog.close();
      if (result.source === snapshot) { status('This entry already uses that pen and ink.'); editor.focus(); return; }
      rewrite(result.source, 'Pen and ink set for ' + result.date + (scope === 'entry' ? (result.next ? '. ' + result.next + ' and later entries look as they did.' : '.') : (result.until ? ' and the entries after it, up to ' + result.until + ', which sets its own.' : ' and the entries after it.')) + ' Earlier entries are unchanged.');
      editor.focus(); editor.setSelectionRange(result.caret, result.caret);
    } catch (error) { $('entryPenStatus').textContent = error.message; }
  };
  $('entryPenClose').onclick = () => { dialog.close(); editor.focus(); };
}
