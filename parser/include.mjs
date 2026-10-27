/** Jot includes, draft 0.1: `![label](other.jot#id)` on a line of its own shows that part of another local journal in place.
 * View-only and explicit: the source keeps its one line, and expanding it into a copy (flatten) is a separate operation someone runs.
 * Only relative paths to `.jot` files, resolved against the including document and kept inside the root the host names (the
 * workspace folder, the `.jotz` package); never a scheme, an absolute path or a climb above the root, and nothing is ever fetched
 * from a network. A host reads the files itself (pure functions here, no fs or fetch) and lends the text to the renderer.
 *
 *   includesOf(ast)                       -> [{ node, label, href, path, fragment, error }]  every include line, in order
 *   includeTarget(href, from = '')        -> { path, fragment } | { error: 'unsafe-path' | 'not-jot' }
 *   excerpt(ast, fragment)                -> nodes | null    a record (by id), an entry (by date: every entry with it) or the whole file
 *   gather(source, { from, read, depth })   -> Promise<{ files: { path: text }, problems }>   what a host should lend (read may be async)
 *   flatten(source, { from, read, depth })  -> Promise<{ text, expanded, problems }>          a copy with includes written out
 *
 * A fragment names a record ID (`#sleep-2026-10-25`) or a dated entry (`#2026-10-25`, up to the next dated heading). Includes nest
 * up to MAX_DEPTH (3) deep; a file that includes itself, directly or round a loop, stops with a notice instead of repeating.
 */
import { parse } from './jot.mjs';

export const MAX_DEPTH = 3;
export const MAX_BYTES = 1024 * 1024; // the same as a journal's writing (spec 2.0)
export const MAX_FILES = 64;
const JOT = /\.jot$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Where an include's href points, relative to `from` (the including document's own path inside the root; '' for the root itself). */
export function includeTarget(href, from = '') {
  let raw = String(href || '').trim(), fragment = '';
  const hash = raw.indexOf('#'); if (hash >= 0) { fragment = raw.slice(hash + 1); raw = raw.slice(0, hash); }
  try { raw = decodeURIComponent(raw); fragment = decodeURIComponent(fragment); } catch { return { error: 'unsafe-path' }; }
  // no scheme (https:, file:, data:, C:), no absolute or UNC path, no backslashes, no control characters, no empty name
  if (!raw || /^[a-z][a-z0-9+.-]*:/i.test(raw) || /^[/\\~]/.test(raw) || /[\\\0-\x1f\x7f]/.test(raw) || raw.includes('//')) return { error: 'unsafe-path' };
  if (!JOT.test(raw)) return { error: 'not-jot' };
  const dir = String(from || '').split('/').slice(0, -1), parts = [];
  for (const seg of [...dir, ...raw.split('/')]) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { if (!parts.length) return { error: 'unsafe-path' }; parts.pop(); continue; } // never above the root
    parts.push(seg);
  }
  if (!parts.length || !/^[A-Za-z0-9._-]{0,128}$/.test(fragment)) return { error: 'unsafe-path' };
  return { path: parts.join('/'), fragment };
}

const images = (n) => {
  if (!n || n.type !== 'paragraph' || !n.markdown || !n.markdown.tokens) return null;
  const toks = n.markdown.tokens.filter((t) => !(t.type === 'text' && !t.text.trim()));
  return toks.length && toks.every((t) => t.type === 'image' && JOT.test(String(t.href || '').split('#')[0])) ? toks : null;
};
/** The include lines of one node: a paragraph made only of `![label](file.jot#id)` images, one per line. */
export function includeLines(n, from = '') {
  const toks = images(n); if (!toks) return null;
  return toks.map((t) => ({ node: n, label: t.text || '', href: t.href, raw: t.raw, ...includeTarget(t.href, from) }));
}
export function includesOf(ast, from = '') { return ast.nodes.flatMap((n) => includeLines(n, from) || []); }

/** The nodes a fragment names in a parsed document: a record ID, every entry with a date, or (no fragment) the whole body. */
export function excerpt(ast, fragment = '') {
  if (!fragment) return ast.nodes;
  const rec = ast.nodes.find((n) => n.id === fragment); if (rec) return [rec];
  if (DATE.test(fragment)) { const es = ast.entries.filter((e) => e.date === fragment); if (es.length) return es.flatMap((e) => ast.nodes.slice(e.startNode, e.endNode)); }
  return null;
}

/** What went wrong, in words a page can show (never a silent blank). */
export function notice(kind, href) {
  return { 'unsafe-path': `not allowed: ${href} (only .jot files beside this one, no web addresses or paths outside the folder)`, 'not-jot': `not allowed: ${href} (only .jot files can be included)`,
    'not-found': `not found: ${href}`, 'no-fragment': `not found: ${href} (no record or dated entry with that name)`, 'too-deep': `too deep: ${href} (includes stop ${MAX_DEPTH} levels down)`,
    loop: `not repeated: ${href} (it includes itself, round a loop)`, 'too-large': `too large: ${href} (over 1 MiB)`,
    'too-many': `not read: ${href} (more than ${MAX_FILES} included files)` }[kind] || `not shown: ${href}`;
}

// One reader for gather and flatten: each file is read once; a refusal keeps its reason (too large, too many files, not there).
const reader = (read) => {
  const got = new Map();
  return async (path) => {
    if (!got.has(path)) {
      let r;
      if (got.size >= MAX_FILES) r = { error: 'too-many' };
      else { let text; try { text = await read(path); } catch { text = null; } r = typeof text !== 'string' ? { error: 'not-found' } : new TextEncoder().encode(text).length > MAX_BYTES ? { error: 'too-large' } : { text }; }
      got.set(path, r);
    }
    return got.get(path);
  };
};
/** Walks the includes from a document; `read(path)` returns its text or null (sync or async). A file reached again nearer the top is
 * walked again from there, so what it includes is lent whenever the page would show it (the renderer's own depth and loop rules). */
export async function gather(source, { from = '', read, depth = MAX_DEPTH } = {}) {
  const files = {}, problems = [], one = reader(read), best = new Map(); // path -> the shallowest level it was walked from
  async function walk(text, at, level, stack) {
    for (const inc of includesOf(parse(text), at)) {
      if (inc.error) { problems.push({ kind: inc.error, href: inc.href, from: at }); continue; }
      if (stack.includes(inc.path)) { problems.push({ kind: 'loop', href: inc.href, from: at }); continue; }
      if (level >= depth) { problems.push({ kind: 'too-deep', href: inc.href, from: at }); continue; }
      const r = await one(inc.path);
      if (r.error) { problems.push({ kind: r.error, href: inc.href, from: at }); continue; }
      files[inc.path] = r.text;
      if (best.has(inc.path) && best.get(inc.path) <= level + 1) continue;
      best.set(inc.path, level + 1); await walk(r.text, inc.path, level + 1, [...stack, inc.path]);
    }
  }
  await walk(String(source), from, 0, [from]);
  return { files, problems };
}

/** A copy with every include written out (the part it names, between hidden comments saying where it came from). The original is
 * untouched; an include that cannot be written out keeps its own bytes and is listed. Explicit only: a host runs this when asked. */
export async function flatten(source, { from = '', read, depth = MAX_DEPTH } = {}) {
  const problems = [], one = reader(read), enc = new TextEncoder(), dec = new TextDecoder(); let expanded = 0;
  const slice = (b, s, e) => dec.decode(b.slice(s, e));
  async function expand(text, at, level, stack) {
    const ast = parse(text), bytes = enc.encode(text); let out = '', pos = 0;
    for (const n of ast.nodes) {
      const lines = includeLines(n, at); if (!lines) continue;
      const parts = []; let any = false;
      for (const inc of lines) {
        const keep = (kind) => { problems.push({ kind, href: inc.href, from: at }); parts.push(`${inc.raw}\n`); };
        if (inc.error) { keep(inc.error); continue; }
        if (stack.includes(inc.path)) { keep('loop'); continue; }
        if (level >= depth) { keep('too-deep'); continue; }
        const r = await one(inc.path); if (r.error) { keep(r.error); continue; }
        const sub = parse(r.text), nodes = excerpt(sub, inc.fragment); if (!nodes) { keep('no-fragment'); continue; }
        const sb = enc.encode(r.text); let part = '', run = null; // each run of adjacent nodes is copied as it is; what lies between runs is not
        for (const x of nodes) { if (run && x.start === run[1]) run[1] = x.end; else { if (run) part += slice(sb, run[0], run[1]); run = [x.start, x.end]; } }
        if (run) part += slice(sb, run[0], run[1]);
        const body = await expand(part, inc.path, level + 1, [...stack, inc.path]), where = `${inc.path}${inc.fragment ? '#' + inc.fragment : ''}`;
        parts.push(`/*\nincluded from ${where}\n*/\n${body.replace(/\s*$/, '\n')}/*\nend of ${where}\n*/\n`);
        expanded++; any = true;
      }
      if (!any) continue; // nothing written out: the paragraph stays byte for byte
      out += slice(bytes, pos, n.start) + parts.join('').replace(/\n$/, ''); pos = n.end; // the blank line after it stays
    }
    return out + slice(bytes, pos);
  }
  const text = await expand(String(source), from, 0, [from]);
  return { text, expanded, problems };
}

export default { includeTarget, includeLines, includesOf, excerpt, notice, gather, flatten, MAX_DEPTH, MAX_BYTES, MAX_FILES };
