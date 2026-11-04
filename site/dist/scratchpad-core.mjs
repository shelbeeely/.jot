// An entry's scratchpad (spec 4.2.7): a fenced block named draft, kept in the file and left off the formatted page.
// These helpers return plain source edits { start, end, text }; nothing outside the chosen entry changes.
import { parse } from './jot/jot.mjs';
import { entryAtCaret } from './jot/timezone.mjs';

const encoder = new TextEncoder(), decoder = new TextDecoder();
function chars(ast) { const bytes = encoder.encode(ast.source); return byte => decoder.decode(bytes.slice(0, byte)).length; }

/** The entry's first scratchpad, with character offsets: the whole block and its content. */
function draftIn(ast, entry, charAt) {
  for (let i = entry.startNode + 1; i < entry.endNode; i++) {
    const n = ast.nodes[i];
    if (n.type !== 'code' || !n.draft) continue;
    const start = charAt(n.start), end = charAt(n.end), raw = ast.source.slice(start, end);
    const open = /^[^\r\n]*\r?\n?/.exec(raw)[0], close = /(?:^|\r?\n)( {0,3}(?:`{3,}|~{3,})[ \t]*)(\r?\n)?$/.exec(raw);
    const contentStart = start + open.length;
    const contentEnd = close ? end - close[0].length + (close[0].startsWith('\r\n') ? 2 : close[0].startsWith('\n') ? 1 : 0) : end;
    return { start, end, contentStart, contentEnd: Math.max(contentStart, contentEnd), text: n.text ?? '' };
  }
  return null;
}
function entryAt(source, caret) { const ast = parse(source); return { ast, entry: entryAtCaret(ast, caret), charAt: chars(ast) }; }
function entryOn(source, date) { const ast = parse(source); return { ast, entry: ast.entries.find(e => e.date === date) || null, charAt: chars(ast) }; }

/** A fence longer than any run of tildes that starts a line of the draft. */
function fenceFor(text) { let longest = 2; for (const m of text.matchAll(/^ {0,3}(~{3,})/gm)) longest = Math.max(longest, m[1].length); return '~'.repeat(longest + 1); }
// A rewritten block ends the way the old one did (the parser may leave its last line break to the blank line after it).
const same = (next, old) => /\r?\n$/.test(old) ? next : next.replace(/\r?\n$/, '');
function block(text, newline) { const fence = fenceFor(text), body = text.replace(/\r?\n/g, newline).replace(/[\r\n]+$/, ''); return fence + 'draft' + newline + (body ? body + newline : '') + fence + newline; }

/** What the scratchpad of the entry at the cursor holds; null outside a dated entry. */
export function scratchpadAt(source, caret) {
  const { ast, entry, charAt } = entryAt(source, caret);
  if (!entry) return null;
  const draft = draftIn(ast, entry, charAt);
  return { date: entry.date, text: draft ? draft.text : '', exists: !!draft };
}

/** Writes the scratchpad of the entry at the cursor: replaces it, adds it under the heading, or removes it when empty. */
export function setScratchpad(source, caret, text) {
  const { ast, entry, charAt } = entryAt(source, caret);
  if (!entry) throw new Error('Put the cursor in a dated entry to use its scratchpad.');
  return draftEdit(source, ast, entry, charAt, String(text ?? ''));
}
function draftEdit(source, ast, entry, charAt, text) {
  const newline = source.includes('\r\n') ? '\r\n' : '\n', draft = draftIn(ast, entry, charAt);
  if (draft) {
    if (!text.trim()) {
      // Removing it also takes the blank line after it, so the entry reads as before.
      const after = (/\r?\n$/.test(source.slice(draft.start, draft.end)) ? /^(?:\r?\n)?/ : /^(?:\r?\n){0,2}/).exec(source.slice(draft.end))[0];
      return { start: draft.start, end: draft.end + after.length, text: '' };
    }
    return { start: draft.start, end: draft.end, text: same(block(text, newline), source.slice(draft.start, draft.end)) };
  }
  if (!text.trim()) return null;
  const heading = ast.nodes[entry.startNode], at = charAt(heading.end), headRaw = source.slice(charAt(heading.start), at);
  const lead = /\r?\n\r?\n$/.test(headRaw) ? '' : /\r?\n$/.test(headRaw) ? newline : newline + newline;
  const rest = source.slice(at), tail = !rest.trim() ? '' : /^\r?\n/.test(rest) ? '' : newline;
  return { start: at, end: at, text: lead + block(text, newline) + tail };
}

/** Adds words to the end of a dated entry's scratchpad (made if needed): the scribe's rough-draft mode. */
export function appendToScratchpad(source, date, piece, joiner = ' ') {
  const { ast, entry, charAt } = entryOn(source, date);
  if (!entry) return null;
  const draft = draftIn(ast, entry, charAt);
  if (!draft) return draftEdit(source, ast, entry, charAt, piece.replace(/^\s+/, ''));
  const newline = source.includes('\r\n') ? '\r\n' : '\n', body = draft.text;
  const text = (body.trim() ? body + joiner.replace(/\n/g, newline) : '') + piece.replace(/^\s+/, '');
  // The whole block is rewritten so the fence stays longer than anything said inside it.
  return { start: draft.start, end: draft.end, text: same(block(text, newline), source.slice(draft.start, draft.end)) };
}

/** Puts text from the scratchpad at the end of the entry's own writing, as new paragraphs. */
export function addToEntry(source, caret, text) {
  const words = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (!words) return null;
  const { ast, entry, charAt } = entryAt(source, caret);
  if (!entry) throw new Error('Put the cursor in a dated entry first.');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  let end = entry.endNode < ast.nodes.length ? charAt(ast.nodes[entry.endNode].start) : source.length;
  const floor = charAt(ast.nodes[entry.startNode].start);
  while (end > floor && /\s/.test(source[end - 1])) end--;
  return { start: end, end, text: newline + newline + words.replace(/\n/g, newline) };
}
