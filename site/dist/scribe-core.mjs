// The scribe's plain-text rules: spoken commands, where words go in today's entry, and its questions.
// No model writes here: the words are the speech engine's transcript, placed verbatim.
import { parse } from './jot/jot.mjs';

// Light, skippable questions, one at a time, never heavy (docs/methods/prompt-journaling.md, lines 113 and 476).
export const SCRIBE_QUESTIONS = Object.freeze([
  'What else happened today?',
  'What can you hear right now?',
  'What did you eat that was good?',
  'What was easier than you expected?',
  'What is a small thing you finished?',
  'What helped today, even a bit?',
  'Who did you talk to today?',
  'Where did you go today?',
  'What are you looking forward to?',
  'What would make tomorrow a little easier?',
  'What is still on your mind?',
  'Sum up today in a few words.'
]);

const plain = sentence => sentence.toLowerCase().replace(/[.,!?;:"“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const EDITS = new Map([
  ['new paragraph', 'paragraph'], ['next paragraph', 'paragraph'],
  ['new line', 'line'], ['next line', 'line'],
  ['scratch that', 'scratch'], ['delete that', 'scratch'], ['undo', 'scratch'], ['undo that', 'scratch'],
  ['stop listening', 'stop'], ['stop', 'stop'], ['stop scribe', 'stop'],
  ['skip', 'skip'], ['skip question', 'skip'], ['skip that question', 'skip'], ['skip it', 'skip'],
  ['another question', 'another'], ['ask me a question', 'another'], ['ask me something', 'another'], ['next question', 'another']
]);
const tidy = text => text.trim().replace(/^[,;:\s-]+/, '').replace(/[,;:\s]+$/, '');
const capital = text => text.charAt(0).toLocaleUpperCase() + text.slice(1);

/** What one spoken sentence means: a command, a piece of Jot structure, or words to write as said. */
export function readCommand(sentence) {
  const said = String(sentence ?? '').trim();
  if (!said) return null;
  const words = plain(said);
  if (EDITS.has(words)) return { kind: EDITS.get(words) };
  let m = /^(?:new|add(?: a)?) (task|to-?do|note|heading)\b[\s,:-]*(.*)$/i.exec(said.replace(/^[\s"“]+/, ''));
  if (m && !tidy(m[2])) return { kind: /^to-?do$/i.test(m[1]) ? 'task' : m[1].toLowerCase(), text: '' };
  if (m && tidy(m[2])) {
    const kind = /^to-?do$/i.test(m[1]) ? 'task' : m[1].toLowerCase();
    const text = capital(tidy(m[2]));
    return { kind, text: kind === 'note' ? text : text.replace(/[.]+$/, '') };
  }
  m = /^(?:add )?(?:tag|hashtag)\s+(.+)$/i.exec(plain(said));
  if (m && m[1].split(' ').length <= 3) {
    const tags = m[1].split(/\s+and\s+|\s*,\s*/).map(t => t.replace(/[^\p{L}\p{N}_ -]+/gu, '').trim().replace(/\s+/g, '-')).filter(Boolean);
    if (tags.length) return { kind: 'tag', text: tags.map(t => '#' + t).join(' ') };
  }
  return { kind: 'text', text: said };
}

// "Find film Dune", "look up the book The Hobbit": a media search the scribe shows for the writer to choose from.
const FIND_KINDS = { film: 'film', movie: 'film', show: 'tv', series: 'tv', 'tv show': 'tv', 'tv series': 'tv', book: 'book', novel: 'book', anime: 'anime', manga: 'manga', podcast: 'podcast', game: 'game', 'video game': 'game', song: 'music', album: 'music', music: 'music' };
const FIND = new RegExp('^(?:find|look up|search for)(?: the| a| an)? (' + Object.keys(FIND_KINDS).sort((a, b) => b.length - a.length).join('|') + ')[\\s,:-]+(.+)$', 'i');
const PICK = new Map([['link it', 0], ['link that', 0], ['use that', 0], ['first one', 0], ['the first one', 0], ['use the first one', 0], ['second one', 1], ['the second one', 1], ['use the second one', 1], ['third one', 2], ['the third one', 2], ['use the third one', 2]]);
export function readFind(sentence) {
  const said = String(sentence ?? '').trim().replace(/[.!?]+$/, '');
  const m = FIND.exec(said);
  if (m && m[2].trim().length >= 2) return { kind: 'find', mediaKind: FIND_KINDS[m[1].toLowerCase()], query: m[2].trim() };
  const words = said.toLowerCase().replace(/[.,!?]+/g, '').trim();
  return PICK.has(words) ? { kind: 'pick', index: PICK.get(words) } : null;
}

/**
 * Titles already in the journal, as things the scribe may link without asking: "The Matrix (1999)" is matched as
 * "the matrix", "Dune by Frank Herbert (1965)" as "dune". Short or one-letter titles are left out, so ordinary words
 * are not linked. Longest first, so "The Matrix Reloaded" wins over "The Matrix".
 */
export function knownTitles(shelf) {
  const seen = new Map();
  for (const item of shelf || []) {
    if (!item?.target || !item.title || item.kind === 'video') continue;
    let key = item.title.replace(/\s*\(\d{4}\)$/, '').replace(/\s+by\s+[^:]+$/, '').replace(/[“”"]/g, '').trim();
    if (/S\d+E\d+/.test(key)) continue; // episodes are too specific to spot in speech
    if (key.length < 4 || (!/\s/.test(key) && key.length < 5) || /^(IMDb|YouTube|Spotify|MusicBrainz) /.test(key)) continue;
    const lower = key.toLowerCase();
    if (!seen.has(lower)) seen.set(lower, { key: lower, target: item.target });
  }
  return [...seen.values()].sort((a, b) => b.key.length - a.key.length);
}
const escapeLabel = text => String(text).replace(/([\\[\]*_`<>~=^|#])/g, '\\$1');
const escapeRe = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The spoken words exactly as said, with known titles turned into links. Each title is linked once per sentence. */
export function linkKnownTitles(text, titles) {
  let out = String(text), used = [];
  for (const { key, target } of titles || []) {
    const re = new RegExp('(^|[^\\p{L}\\p{N}])(' + escapeRe(key).replace(/\\ /g, '\\s+') + ')(?=$|[^\\p{L}\\p{N}])', 'giu');
    // The first place it appears outside a link already made.
    const m = [...out.matchAll(re)].find(found => { const at = found.index + found[1].length; return !used.some(([a, b]) => at < b && at + found[2].length > a) && !/\[[^\]]*$/.test(out.slice(0, at)); });
    if (!m) continue;
    const start = m.index + m[1].length, end = start + m[2].length;
    const link = '[' + escapeLabel(m[2]) + '](' + target + ')';
    out = out.slice(0, start) + link + out.slice(end);
    used = used.map(([a, b]) => a >= end ? [a + link.length - m[2].length, b + link.length - m[2].length] : [a, b]);
    used.push([start, start + link.length]);
  }
  return out;
}

/** Whole sentences ready to write, and the unfinished rest kept for later. */
export function splitSentences(buffer) {
  const text = String(buffer ?? '').replace(/\s+/g, ' ').trimStart();
  const complete = [];
  const pattern = /[^.!?]*[.!?]+["”)]*(?=\s|$)/g;
  let at = 0, m;
  while ((m = pattern.exec(text))) { const piece = m[0].trim(); if (piece) complete.push(piece); at = pattern.lastIndex; }
  return { complete, rest: text.slice(at).trim() };
}

const encoder = new TextEncoder(), decoder = new TextDecoder();
/** The end of the dated entry's writing (after its last non-space character), or -1 when there is no such entry. */
export function entryEnd(source, date) {
  const ast = parse(source), entry = ast.entries.find(e => e.date === date);
  if (!entry) return -1;
  const bytes = encoder.encode(ast.source), charAt = byte => decoder.decode(bytes.slice(0, byte)).length;
  let end = entry.endNode < ast.nodes.length ? charAt(ast.nodes[entry.endNode].start) : source.length;
  const floor = charAt(ast.nodes[entry.startNode].start);
  while (end > floor && /\s/.test(source[end - 1])) end--;
  return end;
}

/**
 * Where and how the next piece goes at the end of today's entry.
 * state: { lastEnd, lastKind, separator } from earlier writing; item: readCommand's { kind, text }; question: a pending question.
 * Returns { start, text } for an insertion, or null when today's entry is missing.
 */
export function planWrite(source, date, state, item, question = '') {
  const end = entryEnd(source, date);
  if (end < 0) return null;
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const tail = state.lastEnd === end; // our last words are still the end of the entry
  const block = item.kind === 'task' ? '[ ] ' + item.text : item.kind === 'note' ? '- ' + item.text : item.kind === 'heading' ? '#### ' + item.text : item.text;
  let gap;
  if (question) gap = newline + newline + '> ' + question + newline + newline;
  else if (!tail || state.separator === 'paragraph') gap = newline + newline;
  else if (state.separator === 'line') gap = newline;
  else if (item.kind === 'tag' || (item.kind === 'text' && state.lastKind === 'text')) gap = ' ';
  else if ((item.kind === 'task' || item.kind === 'note') && state.lastKind === item.kind) gap = newline;
  else gap = newline + newline;
  if (item.kind === 'heading' && gap !== ' ') gap = newline + newline;
  return { start: end, text: gap + block };
}
