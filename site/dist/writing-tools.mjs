// Text edits stay ordinary Jot/Markdown and go through the browser's undo stack.
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
    if (!applyWritingEdit(editor, replacement)) return false;
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
