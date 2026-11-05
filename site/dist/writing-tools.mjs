// Text edits stay ordinary Jot/Markdown and go through the browser's undo stack.
import { parse } from './jot/jot.mjs';
import { entryAtCaret } from './jot/timezone.mjs';
const PREF = 'jot-smart-lists-v1';
const TASK = '\\[[ xX><!\\-]\\]';
const PREFIX = new RegExp(`^([ \\t]*)(?:#{1,6}[ \\t]+|(?:[-+*]|\\d+[.)])[ \\t]+(?:${TASK}[ \\t]*)?|${TASK}[ \\t]*|(?:>[ \\t]*)+)`);

function bounds(source, start, end) {
  start = Math.max(0, Math.min(source.length, start));
  end = Math.max(start, Math.min(source.length, end));
  return [start, end];
}
function lineStart(source, at) {
  const start = at <= 0 ? 0 : source.lastIndexOf('\n', at - 1) + 1;
  return start === 0 && source.startsWith('\uFEFF') ? 1 : start;
}
function lineEnd(source, at) {
  const next = source.indexOf('\n', at);
  const end = next < 0 ? source.length : next;
  return end > 0 && source[end - 1] === '\r' ? end - 1 : end;
}
function linesIn(source, start, end) {
  const first = lineStart(source, start);
  // A selection ending at the start of a line does not include that line.
  const last = lineEnd(source, end > start && source[end - 1] === '\n' ? end - 1 : end);
  const lines = [];
  let at = first;
  do {
    const finish = lineEnd(source, at);
    lines.push({ start: at, end: finish, text: source.slice(at, finish) });
    if (finish >= last) break;
    at = source.indexOf('\n', finish) + 1;
  } while (at > 0 && at <= source.length);
  return lines;
}
function literalAt(source, at) {
  let block = null;
  const lines = source.slice(0, lineEnd(source, at)).replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (block?.kind === 'comment') { if (line === '*/') block = null; continue; }
    if (block?.kind === 'record') { if (line === ':::') block = null; continue; }
    if (block?.kind === 'metadata') { if (line === '---') block = null; continue; }
    const match = /^[ \t]{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (block?.kind === 'fence') {
      if (match && match[1][0] === block.marker && match[1].length >= block.length && !match[2].trim()) block = null;
      continue;
    }
    if (i === 0 && line === '---') block = { kind: 'metadata' };
    else if (match) block = { kind: 'fence', marker: match[1][0], length: match[1].length };
    else if (/^:::record [a-z][a-z0-9-]*(?: #[A-Za-z0-9][A-Za-z0-9._-]{0,127})?$/.test(line)) block = { kind: 'record' };
    else if (line === '/*') block = { kind: 'comment' };
  }
  return !!block;
}
function edit(start, end, text, selectionStart = start + text.length, selectionEnd = selectionStart) {
  return { start, end, text, selectionStart, selectionEnd };
}
function inlineEdit(source, start, end, marker) {
  const selected = source.slice(start, end);
  if (selected.length >= marker.length * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const text = selected.slice(marker.length, -marker.length);
    return edit(start, end, text, start, start + text.length);
  }
  if (source.slice(start - marker.length, start) === marker && source.slice(end, end + marker.length) === marker) {
    return edit(start - marker.length, end + marker.length, selected, start - marker.length, end - marker.length);
  }
  return edit(start, end, marker + selected + marker, start + marker.length, end + marker.length);
}
function mappedPosition(position, changes) {
  let delta = 0;
  for (const change of changes) {
    if (position < change.start) break;
    if (position <= change.end) return change.start + delta + change.text.length;
    delta += change.text.length - (change.end - change.start);
  }
  return position + delta;
}
function combine(source, start, end, changes) {
  if (!changes.length) return null;
  const from = changes[0].start, to = changes.at(-1).end;
  let text = '', at = from;
  for (const change of changes) { text += source.slice(at, change.start) + change.text; at = change.end; }
  text += source.slice(at, to);
  return edit(from, to, text, mappedPosition(start, changes), mappedPosition(end, changes));
}

// Removes inline formatting marks inside the selection (and marks wrapped directly around it); the words stay.
const WRAPS = ['**', '__', '~~', '==', '++', '*', '_', '^', '`'];
function clearEdit(source, start, end) {
  if (start === end) return null;
  let from = start, to = end, grew = true;
  while (grew) {
    grew = false;
    for (const mark of WRAPS) if (source.slice(from - mark.length, from) === mark && source.slice(to, to + mark.length) === mark) { from -= mark.length; to += mark.length; grew = true; break; }
  }
  const selected = source.slice(from, to), text = clearText(selected);
  return text === selected ? null : edit(from, to, text, from, from + text.length);
}

// Escapes, link destinations and web addresses are set aside first, so their * and _ are never read as formatting.
function clearText(selected) {
  const kept = [];
  const keep = match => { kept.push(match); return '\uE000' + (kept.length - 1) + '\uE001'; };
  const text = selected
    .replace(/\\[\\`*_{}[\]()#+\-.!~=^|>]/g, keep)
    .replace(/\]\([^)\s]*(?:\s+"[^"]*")?\)/g, keep)
    .replace(/<[a-z][a-z0-9+.-]*:[^>\s]*>|\bhttps?:\/\/[^\s<>()]+/gi, keep)
    .replace(/\[([^\]\r\n]*)\]\{(?:(?:ink|highlight|strike|underline)=#[0-9a-fA-F]{6}[ ]?)+\}/g, '$1')
    .replace(/(\*\*|~~|==|\+\+)(?=\S)([^\r\n]*?\S)\1/g, '$2')
    .replace(/(^|[^\w])__(?=\S)([^\r\n]*?\S)__(?!\w)/g, '$1$2')
    .replace(/\*(?=[^\s*])([^*\r\n]*?[^\s*])\*/g, '$1')
    .replace(/(^|[^\w])_(?=[^\s_])([^_\r\n]*?[^\s_])_(?!\w)/g, '$1$2')
    .replace(/\^([^\s^[\]]+)\^/g, '$1')
    .replace(/`([^`\r\n]+)`/g, '$1')
    .replace(/^(\*\*|__|~~|==|\+\+|\*|_|\^|`)([\s\S]*)\1$/, '$2');
  return text.replace(/\uE000(\d+)\uE001/g, (_, i) => kept[Number(i)]);
}

// Prose blocks whose inline marks "Clear formatting in this entry" removes. Code, records, comments and directives keep theirs.
const PROSE = new Set(['paragraph', 'heading', 'list', 'task', 'blockquote', 'table']);
/** Clears inline formatting in the dated entry at `caret` only; earlier and later entries are untouched. Null when there is nothing to clear. */
export function clearEntryEdit(source, caret, ast = parse(source)) {
  const entry = entryAtCaret(ast, caret);
  if (!entry) return null;
  const bytes = new TextEncoder().encode(ast.source), decoder = new TextDecoder();
  const charAt = byte => decoder.decode(bytes.slice(0, byte)).length;
  const changes = [];
  for (let i = entry.startNode + 1; i < entry.endNode; i++) {
    const node = ast.nodes[i];
    if (!PROSE.has(node.type)) continue;
    const start = charAt(node.start), end = charAt(node.end), raw = source.slice(start, end);
    // Each line is cleared on its own, so a mark never joins two lines.
    const text = raw.split(/(\r?\n)/).map((part, k) => k % 2 ? part : clearText(part)).join('');
    if (text !== raw) changes.push({ start, end, text });
  }
  const result = combine(source, caret, caret, changes);
  if (!result) return null;
  // Keep the caret near the same words: inside a cleared block, count only the words before it.
  const inside = changes.find(change => caret > change.start && caret < change.end);
  if (inside) {
    const shift = changes.filter(change => change.end <= inside.start).reduce((sum, change) => sum + change.text.length - (change.end - change.start), 0);
    const kept = Math.min(inside.text.length, clearText(source.slice(inside.start, caret)).length);
    result.selectionStart = result.selectionEnd = inside.start + shift + kept;
  }
  return result;
}

// A margin note (spec 4.2.8): a [[...]] line straight after the paragraph, list item or quote at the cursor.
const NOTE_AFTER = new Set(['paragraph', 'list', 'task', 'blockquote', 'heading', 'table', 'annotation']);
/** Adds a margin note after the block at `caret`; the annotated words are not changed. Null when the note is empty. */
export function marginNoteEdit(source, caret, note) {
  const text = String(note ?? '').replace(/\s+/g, ' ').trim().replace(/\]\]/g, '] ]').replace(/\]$/, '] ');
  if (!text) return null;
  const ast = parse(source), bytes = new TextEncoder().encode(ast.source), decoder = new TextDecoder();
  const charAt = byte => decoder.decode(bytes.slice(0, byte)).length, newline = source.includes('\r\n') ? '\r\n' : '\n';
  let target = null;
  for (const node of ast.nodes) { const start = charAt(node.start), end = charAt(node.end); if (caret >= start && caret <= end && NOTE_AFTER.has(node.type)) target = { start, end }; if (start > caret) break; }
  let at;
  if (target) { at = target.end; while (at > target.start && /[\r\n]/.test(source[at - 1])) at--; }
  else at = lineEnd(source, caret);
  // A list item or quote ends at the end of its own line, so the note annotates the line the cursor is on.
  if (target && /^\s*(?:[-+*]|\d+[.)]|\[[ xX><!\-]\]|>)/.test(source.slice(lineStart(source, caret), lineEnd(source, caret)))) at = lineEnd(source, caret);
  const line = newline + '[[' + text + ']]';
  return edit(at, at, line, caret, caret);
}

/** A minimal replacement plus absolute final selection; null means no change. */
export function writingEdit(source, start, end, action) {
  [start, end] = bounds(source, start, end);
  if (action === 'bold' || action === 'italic') return inlineEdit(source, start, end, action === 'bold' ? '**' : '*');
  if (action === 'code') {
    const selected = source.slice(start, end);
    const opening = /^`+/.exec(selected)?.[0], closing = /`+$/.exec(selected)?.[0];
    if (opening && closing && opening === closing && selected.length > opening.length + closing.length) {
      let text = selected.slice(opening.length, -closing.length);
      if (text.startsWith(' ') && text.endsWith(' ') && text.trim()) text = text.slice(1, -1);
      return edit(start, end, text, start, start + text.length);
    }
    const before = /`+$/.exec(source.slice(0, start))?.[0], after = /^`+/.exec(source.slice(end))?.[0];
    if (before && before === after) return edit(start - before.length, end + after.length, selected, start - before.length, end - before.length);
    const runs = selected.match(/`+/g) || [];
    const marker = '`'.repeat(Math.max(0, ...runs.map(run => run.length)) + 1);
    if (!runs.length) return inlineEdit(source, start, end, '`');
    const pad = selected.startsWith('`') || selected.endsWith('`') || (/^ .* $/.test(selected) && selected.trim()) ? ' ' : '';
    return edit(start, end, marker + pad + selected + pad + marker, start + marker.length + pad.length, end + marker.length + pad.length);
  }
  // Jot's fuller formatting (specification 4.2.1): underline ++, highlight ==, superscript ^word^, GFM strikethrough ~~.
  if (action === 'underline') return inlineEdit(source, start, end, '++');
  if (action === 'highlight') return inlineEdit(source, start, end, '==');
  if (action === 'strike') return inlineEdit(source, start, end, '~~');
  if (action === 'superscript') {
    const selected = source.slice(start, end);
    // Superscript is one word: no whitespace, carets or brackets.
    if (!selected || /[\s^[\]]/.test(selected.replace(/^\^(.*)\^$/, '$1'))) return null;
    return inlineEdit(source, start, end, '^');
  }
  if (action === 'clear') return clearEdit(source, start, end);
  if (action === 'clearEntry') return clearEntryEdit(source, start);
  if (action === 'tick') {
    // Tick or untick the task lines touched by the selection: [ ] and [!] become [x]; [x] becomes [ ]. Other lines stay.
    const from = lineStart(source, start), to = lineEnd(source, Math.max(start, end));
    const lines = source.slice(from, to), any = /^([ \t]*(?:(?:[-+*]|\d+[.)])[ \t]+)?)\[([ xX!])\]/m.test(lines);
    if (!any) return null;
    const done = /^[ \t]*(?:(?:[-+*]|\d+[.)])[ \t]+)?\[[ !]\]/m.test(lines);
    const text = lines.replace(/^([ \t]*(?:(?:[-+*]|\d+[.)])[ \t]+)?)\[([ xX!])\]/gm, (m, lead, state) => lead + (done ? (state === ' ' || state === '!' ? '[x]' : m.slice(lead.length)) : '[ ]'));
    return text === lines ? null : edit(from, to, text, start, end);
  }
  if (action === 'link') {
    const selected = source.slice(start, end);
    if (/[\r\n]/.test(selected)) return null;
    const text = '[' + selected.replace(/[\\[\]]/g, '\\$&') + ']()';
    return edit(start, end, text, start + text.length - 1);
  }
  const lines = linesIn(source, start, end);
  const changes = [];
  if (action === 'indent' || action === 'outdent') {
    for (const line of lines) {
      if (action === 'indent') changes.push(edit(line.start, line.start, '  '));
      else { const match = /^(?: {1,2}|\t)/.exec(line.text); if (match) changes.push(edit(line.start, line.start + match[0].length, '')); }
    }
    return combine(source, start, end, changes);
  }
  if (action === 'center' || action === 'left' || action === 'paragraph') {
    // A centred line is "-> text <-" alone on its line; "paragraph" also drops heading marks.
    const centred = /^([ \t]*)->[ \t]*(.*?)[ \t]*<-[ \t]*$/;
    const nonempty = lines.filter(line => line.text.trim());
    const allCentred = nonempty.length > 0 && nonempty.every(line => centred.test(line.text));
    for (const line of nonempty) {
      let text = line.text;
      if (action === 'paragraph') text = text.replace(/^([ \t]*)#{1,6}[ \t]+/, '$1');
      const match = centred.exec(text);
      if (match && (action !== 'center' || allCentred)) text = match[1] + match[2];
      else if (!match && action === 'center') text = text.replace(/^([ \t]*)(.*?)[ \t]*$/, '$1-> $2 <-');
      if (text !== line.text) changes.push(edit(line.start, line.start + line.text.length, text));
    }
    return combine(source, start, end, changes);
  }
  const level = action === 'heading' ? 2 : /^heading[1-6]$/.test(action) ? Number(action.at(-1)) : 0;
  const target = level ? new RegExp(`^#{${level}}[ \\t]+`) : {
    bullet: /^[-+*][ \t]+(?!\[[ xX><!\-]\])/, number: /^\d+[.)][ \t]+/,
    task: new RegExp(`^(?:[-+*][ \\t]+)?${TASK}[ \\t]*`), quote: /^(?:>[ \t]*)+/
  }[action];
  if (!target) return null;
  const nonempty = lines.filter(line => line.text.trim());
  const remove = nonempty.length > 0 && nonempty.every(line => target.test(line.text.trimStart()));
  let number = 1;
  for (const line of lines) {
    if (!line.text.trim() && lines.length > 1) continue;
    const match = PREFIX.exec(line.text), whitespace = /^[ \t]*/.exec(line.text)[0];
    const previous = match ? match[0] : whitespace;
    let prefix = remove ? '' : level ? '#'.repeat(level) + ' ' : { bullet: '- ', task: '[ ] ', quote: '> ', number: number + '. ' }[action];
    if (action === 'number' && !remove) number++;
    prefix = whitespace + prefix;
    if (prefix !== previous) changes.push(edit(line.start, line.start + previous.length, prefix));
  }
  return combine(source, start, end, changes);
}

/** Structural Enter only: no prose, dates, task completion or data is inferred. */
export function continueListEdit(source, start, end = start) {
  [start, end] = bounds(source, start, end);
  if (start !== end || literalAt(source, start)) return null;
  const from = lineStart(source, start), to = lineEnd(source, start), line = source.slice(from, to);
  const match = /^([ \t]*)(?:(?:([-+*]|\d+[.)])[ \t]+)(?:(\[[ xX><!\-]\])[ \t]+)?|(\[[ xX><!\-]\])[ \t]+|((?:>[ \t]*)+))/.exec(line);
  if (!match || start < from + match[0].length) return null;
  const content = line.slice(match[0].length);
  if (!content.trim()) return edit(from, to, match[1]);
  let prefix = match[0];
  if (match[3] || match[4]) prefix = prefix.replace(/\[[ xX><!\-]\]/, '[ ]');
  if (match[2] && /^\d/.test(match[2])) {
    const number = Number(match[2].slice(0, -1));
    if (!Number.isSafeInteger(number) || number === Number.MAX_SAFE_INTEGER) return null;
    prefix = prefix.replace(match[2], String(number + 1) + match[2].at(-1));
  }
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  return edit(start, end, newline + prefix);
}

export function applyWritingEdit(editor, replacement) {
  if (!replacement) return false;
  if (editor.jotApplyEdit) return editor.jotApplyEdit(replacement);
  const doc = editor.ownerDocument;
  editor.focus(); editor.setSelectionRange(replacement.start, replacement.end);
  let native = false;
  try { native = !!doc.execCommand?.('insertText', false, replacement.text); } catch { /* fallback for non-supporting browsers */ }
  if (!native) {
    editor.setRangeText(replacement.text, replacement.start, replacement.end, 'end');
    editor.dispatchEvent(new (doc.defaultView?.Event || Event)('input', { bubbles: true }));
  }
  editor.setSelectionRange(replacement.selectionStart, replacement.selectionEnd);
  return true;
}

export function setupWritingTools({ editor, status = () => {} }) {
  const win = editor.ownerDocument.defaultView;
  let smartLists = true, composing = false, manualLineBreak = false;
  try { smartLists = win.localStorage.getItem(PREF) !== 'off'; } catch { /* optional preference */ }
  function run(action) {
    if (action === 'link' && /[\r\n]/.test(editor.value.slice(editor.selectionStart, editor.selectionEnd))) {
      status('Select text on one line to add a link.'); return false;
    }
    const replacement = writingEdit(editor.value, editor.selectionStart, editor.selectionEnd, action);
    if (!replacement) {
      if (action === 'superscript') status('Select one word, with no spaces, to make it superscript.');
      else if (action === 'tick') status('Put the cursor on a task line ([ ] …) to tick it.');
      else if (action === 'clear') status('Select formatted words to clear their formatting, or use Clear formatting in this entry.');
      else if (action === 'clearEntry') status(entryAtCaret(parse(editor.value), editor.selectionStart) ? 'This entry has no bold, italics or other formatting to clear.' : 'Put the cursor in a dated entry to clear its formatting.');
      return false;
    }
    if (!applyWritingEdit(editor, replacement)) return false;
    if (action === 'clearEntry') { status('Cleared the formatting in this entry. Other entries are unchanged; Undo brings it back.'); return true; }
    status('Applied ' + action.replace(/heading[1-6]/, 'heading') + '. Undo restores the previous writing.');
    return true;
  }
  editor.addEventListener('compositionstart', () => { composing = true; });
  editor.addEventListener('compositionend', () => { composing = false; });
  editor.addEventListener('keydown', event => {
    manualLineBreak = event.key === 'Enter' && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey);
    if (event.defaultPrevented || event.isComposing || composing || event.altKey) return;
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && ['b', 'i'].includes(event.key.toLowerCase())) {
      event.preventDefault(); run(event.key.toLowerCase() === 'b' ? 'bold' : 'italic'); return;
    }
    if (event.ctrlKey || event.metaKey) return;
    if (event.key === 'Enter' && !event.shiftKey && smartLists) {
      const replacement = continueListEdit(editor.value, editor.selectionStart, editor.selectionEnd);
      if (replacement) { event.preventDefault(); applyWritingEdit(editor, replacement); }
    } else if (event.key === 'Tab') {
      const from = lineStart(editor.value, editor.selectionStart), to = lineEnd(editor.value, editor.selectionEnd);
      const selected = editor.value.slice(editor.selectionStart, editor.selectionEnd);
      const line = editor.value.slice(from, to);
      if (!literalAt(editor.value, editor.selectionStart) && (selected.includes('\n') || /^(?:[ \t]*(?:[-+*]|\d+[.)])[ \t]+|[ \t]*\[[ xX><!\-]\][ \t]+)/.test(line))) {
        const replacement = writingEdit(editor.value, editor.selectionStart, editor.selectionEnd, event.shiftKey ? 'outdent' : 'indent');
        if (replacement) { event.preventDefault(); applyWritingEdit(editor, replacement); }
      }
    }
  });
  editor.addEventListener('keyup', event => { if (event.key === 'Enter') manualLineBreak = false; });
  // Chromium software keyboards may emit beforeinput without an identifiable
  // Enter keydown. A prevented keydown emits no native line-break beforeinput.
  editor.addEventListener('beforeinput', event => {
    if (!['insertParagraph', 'insertLineBreak'].includes(event.inputType)) return;
    if (manualLineBreak) { manualLineBreak = false; return; }
    if (!event.cancelable || event.defaultPrevented || event.isComposing || composing || !smartLists) return;
    const replacement = continueListEdit(editor.value, editor.selectionStart, editor.selectionEnd);
    if (replacement) { event.preventDefault(); applyWritingEdit(editor, replacement); }
  });
  return {
    run,
    get smartLists() { return smartLists; },
    setSmartLists(enabled) { smartLists = !!enabled; try { win.localStorage.setItem(PREF, smartLists ? 'on' : 'off'); } catch { /* optional preference */ } }
  };
}
