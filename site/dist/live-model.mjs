// Source-first editing projection. No DOM is read or serialized back into Jot.
import { parse, mediaURL } from './jot/jot.mjs';

const KIND = { strong: 'strong', em: 'em', codespan: 'code', link: 'link', mark: 'highlight', del: 'strike', ins: 'underline' };
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const safeHref = value => {
  const href = mediaURL(value || '') || value || '';
  return /^(?:https?:|mailto:|#)/i.test(href) || /^[A-Za-z0-9][A-Za-z0-9._-]*\.jot#[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(href) ? href : undefined;
};

function normalized(raw, from) {
  let text = '', map = [from];
  for (let i = 0; i < raw.length;) {
    if (raw[i] === '\r') { i += raw[i + 1] === '\n' ? 2 : 1; text += '\n'; }
    else { text += raw[i]; i++; }
    map.push(from + i);
  }
  return { text, map };
}
function textPart(source, from, to, { entities = false, code = false } = {}) {
  const raw = source.slice(from, to), map = [from];
  let text = '';
  for (let i = 0; i < raw.length;) {
    const entity = entities && /^&(amp|lt|gt|quot|#39);/.exec(raw.slice(i));
    if (entity) { text += ENTITIES[entity[0]]; i += entity[0].length; }
    else if (raw[i] === '\r') { text += code ? ' ' : '\n'; i += raw[i + 1] === '\n' ? 2 : 1; }
    else { text += code && raw[i] === '\n' ? ' ' : raw[i]; i++; }
    map.push(from + i);
  }
  const part = { kind: 'text', from, to, contentFrom: from, contentTo: to, text };
  if (text !== raw) part.map = map;
  return part;
}
function labelEnd(raw) {
  if (raw[0] !== '[') return -1;
  let depth = 1;
  for (let i = 1; i < raw.length; i++) {
    if (raw[i] === '\\') { i++; continue; }
    if (raw[i] === '`') {
      let size = 1; while (raw[i + size] === '`') size++;
      const close = raw.indexOf('`'.repeat(size), i + size);
      if (close >= 0) { i = close + size - 1; continue; }
    }
    if (raw[i] === '[') depth++;
    else if (raw[i] === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function inlineParts(source, from, to, tokens) {
  const original = source.slice(from, to), norm = normalized(original, from), result = [];
  let cursor = 0;
  for (const token of tokens || []) {
    const raw = token.raw || '';
    if (!raw || norm.text.slice(cursor, cursor + raw.length) !== raw) return [textPart(source, from, to)];
    const a = norm.map[cursor], b = norm.map[cursor + raw.length]; cursor += raw.length;
    const kind = KIND[token.type];
    if (token.type === 'escape' && raw.startsWith('\\') && raw.length === 2) {
      result.push({ kind: 'text', from: a, to: b, contentFrom: a + 1, contentTo: b, text: raw.slice(1), map: [a + 1, b] }); continue;
    }
    if (!kind) { result.push(textPart(source, a, b, { entities: token.type === 'text' })); continue; }
    let begin = 0, finish = raw.length;
    if (kind === 'strong' || kind === 'strike' || kind === 'highlight' || kind === 'underline') { begin = 2; finish -= 2; }
    else if (kind === 'em') { begin = 1; finish--; }
    else if (kind === 'code') {
      const fence = /^`+/.exec(raw)?.[0];
      if (!fence || !raw.endsWith(fence) || raw.length < fence.length * 2) { result.push(textPart(source, a, b)); continue; }
      begin = fence.length; finish -= fence.length;
      const body = raw.slice(begin, finish);
      if (body.startsWith(' ') && body.endsWith(' ') && body.trim()) { begin++; finish--; }
    } else if (kind === 'link') {
      const close = labelEnd(raw);
      if (close < 0) { result.push(textPart(source, a, b)); continue; }
      begin = 1; finish = close;
    }
    if (finish < begin) { result.push(textPart(source, a, b)); continue; }
    const contentFrom = norm.map[cursor - raw.length + begin], contentTo = norm.map[cursor - raw.length + finish];
    const part = { kind, from: a, to: b, contentFrom, contentTo };
    if (kind === 'code') {
      const leaf = textPart(source, contentFrom, contentTo, { code: true });
      part.text = leaf.text; if (leaf.map) part.map = leaf.map;
    } else {
      const children = token.tokens || [];
      part.children = inlineParts(source, contentFrom, contentTo, children);
      if (kind === 'link') { const href = safeHref(token.href); if (href) part.href = href; }
    }
    result.push(part);
  }
  if (cursor < norm.text.length) result.push(textPart(source, norm.map[cursor], to));
  return result;
}
function leavesOf(parts, marks = [], href) {
  return parts.flatMap(part => {
    const nextMarks = part.kind === 'text' ? marks : [...marks, part.kind];
    const nextHref = part.href || href;
    if (part.children) return leavesOf(part.children, nextMarks, nextHref);
    const leaf = { from: part.contentFrom, to: part.contentTo, text: part.text || '', marks: nextMarks };
    if (part.map) leaf.map = part.map;
    if (nextHref) leaf.href = nextHref;
    return [leaf];
  });
}
function block(source, from, to, kind, contentFrom = from, contentTo = to, tokens, extra = {}) {
  const parts = kind === 'opaque' ? [] : inlineParts(source, contentFrom, contentTo, tokens);
  return { from, to, contentFrom, contentTo, kind, raw: source.slice(from, to), parts, leaves: leavesOf(parts), ...extra };
}
const withoutEnding = raw => raw.replace(/(?:\r\n|\n|\r)+$/, '');
function simpleBlock(source, from, to, node) {
  const raw = source.slice(from, to), body = withoutEnding(raw), end = from + body.length;
  if (node.type === 'heading') {
    const match = /^(#{1,6})[ \t]+/.exec(body);
    if (!match) return /^[#]{1,6}$/.test(body) ? block(source, from, to, 'paragraph', from, end, []) : null;
    if (/\r|\n/.test(body)) return null;
    // Closing ATX hashes are syntax too; setext headings remain source-editable.
    const trailing = /[ \t]+#+[ \t]*$/.exec(body);
    const contentTo = trailing ? from + trailing.index : end;
    return block(source, from, to, 'heading', from + match[0].length, contentTo, node.markdown?.tokens, { level: match[1].length, prefix: match[0] });
  }
  if (node.type === 'paragraph') {
    // Empty Markdown/Jot markers are still ordinary paragraphs to the parser,
    // but already provide the editable list cell while the person starts it.
    const placeholder = /^( {0,3})([-+*]|\d+[.)])[ \t]+(?:\[([ xX])\][ \t]+)?$/.exec(body);
    const task = /^\[([ x><!\-])\] [ \t]*$/.exec(body);
    if (placeholder || task) return block(source, from, to, task || placeholder[3] !== undefined ? 'task' : 'list', end, end, [],
      { prefix: body, ordered: placeholder ? /^\d/.test(placeholder[2]) : false, ...((task || placeholder?.[3] !== undefined) ? { state: task ? task[1] : placeholder[3] } : {}) });
    return block(source, from, to, 'paragraph', from, end, node.markdown?.tokens);
  }
  if (node.type === 'blank') return block(source, from, to, 'paragraph', from, to, [], { blank: true });
  if (node.type === 'task' && !/[\r\n]/.test(body)) {
    const prefix = /^\[[ x><!\-]\] /.exec(body)?.[0];
    if (prefix) return block(source, from, to, 'task', from + prefix.length, end, node.inline?.[0]?.tokens, { prefix, state: prefix[1] });
  }
  if (node.type === 'blockquote' && !/[\r\n]/.test(body)) {
    const prefix = /^ {0,3}>[ \t]?/.exec(body)?.[0], contents = node.markdown?.tokens;
    if (prefix && (!contents?.length || contents.length === 1 && contents[0].type === 'paragraph')) return block(source, from, to, 'quote', from + prefix.length, end, contents[0]?.tokens || [], { prefix });
  }
  return null;
}
function listBlocks(source, from, to, node) {
  const raw = source.slice(from, to), body = withoutEnding(raw), lines = [...body.matchAll(/[^\r\n]*(?:\r\n|\r|\n|$)/g)].filter(match => match[0]);
  const items = node.markdown?.items || [];
  if (lines.length !== items.length || items.some(item => item.loose || item.tokens?.length > 1 || item.tokens?.length === 1 && !['text', 'paragraph'].includes(item.tokens[0].type))) return null;
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i][0], body = withoutEnding(line), item = items[i];
    const match = /^( {0,3})([-+*]|\d+[.)])[ \t]+(?:\[([ xX])\][ \t]+)?/.exec(body);
    if (!match || item.text.includes('\n')) return null;
    const a = from + lines[i].index, tokens = item.tokens[0]?.tokens || [];
    blocks.push(block(source, a, i === lines.length - 1 ? to : a + line.length, match[3] === undefined ? 'list' : 'task', a + match[0].length, a + body.length, tokens,
      { prefix: match[0], ordered: /^\d/.test(match[2]), ...(match[3] === undefined ? {} : { state: match[3] }) }));
  }
  return blocks;
}

/** Ordered blocks cover the exact source. Unsupported blocks are opaque, never reconstructed. */
export function projectSource(source) {
  if (typeof source !== 'string') throw new TypeError('Expected Jot source text.');
  const bom = source.startsWith('\uFEFF') ? 1 : 0, input = source.slice(bom), ast = parse(input);
  const encoded = new TextEncoder().encode(input), decoder = new TextDecoder('utf-8', { ignoreBOM: true });
  let previousByte = 0, previousChar = bom, cursor = 0;
  const position = byte => { previousChar += decoder.decode(encoded.subarray(previousByte, byte)).length; previousByte = byte; return previousChar; };
  const blocks = [];
  for (const node of ast.nodes) {
    const from = position(node.start), to = position(node.end);
    if (from > cursor && !(cursor === 0 && from === bom)) blocks.push(block(source, cursor, from, 'opaque', cursor, from, null, { sourceType: 'metadata' }));
    const simple = simpleBlock(source, from, to, node), list = !simple && node.type === 'list' ? listBlocks(source, from, to, node) : null;
    const projected = simple ? [simple] : list || [block(source, from, to, 'opaque', from, to, null, { sourceType: node.type })];
    if (cursor === 0 && from === bom && bom) { projected[0].from = 0; projected[0].raw = source.slice(0, projected[0].to); }
    blocks.push(...projected); cursor = to;
  }
  if (cursor < source.length) blocks.push(block(source, cursor, source.length, input ? 'opaque' : 'paragraph', bom, source.length, null, input ? { sourceType: ast.metadataRange ? 'metadata' : 'raw' } : {}));
  if (!blocks.length) blocks.push(block(source, 0, source.length, 'paragraph', bom, source.length, []));
  const last = blocks.at(-1);
  if (source && (/\r\n$|[\r\n]$/.test(source) || last.kind === 'opaque')) {
    const eol = source.includes('\r\n') ? '\r\n' : source.includes('\r') && !source.includes('\n') ? '\r' : '\n';
    const ending = source.match(/(?:\r\n|\r|\n)+$/)?.[0] || '';
    const lineBreaks = ending.match(/\r\n|\r|\n/g)?.length || 0;
    const insertPrefix = last.kind === 'opaque' ? eol.repeat(Math.max(0, 2 - lineBreaks)) : '';
    blocks.push(block(source, source.length, source.length, 'paragraph', source.length, source.length, [], { virtual: true, insertPrefix }));
  }
  return blocks;
}

/** Apply only the selected source range; normalize boundaries without rewriting other bytes. */
export function applySourceEdit(source, { from, to = from, text = '' }) {
  if (typeof source !== 'string' || typeof text !== 'string') throw new TypeError('Source and replacement must be text.');
  if (!Number.isFinite(from) || !Number.isFinite(to)) throw new TypeError('Edit boundaries must be finite numbers.');
  from = Math.max(0, Math.min(source.length, Math.trunc(from))); to = Math.max(from, Math.min(source.length, Math.trunc(to)));
  return { source: source.slice(0, from) + text + source.slice(to), from, to, text, selection: { anchor: from + text.length, focus: from + text.length } };
}
