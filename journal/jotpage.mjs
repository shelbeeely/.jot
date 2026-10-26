// Jot pages: writing kept in .jot documents (Jot v1, ../parser/jot.mjs), printed into the book after the week it belongs to.
// Pure (no fs): jots.mjs reads the files, this file turns parsed documents into entries and entries into finished page HTML.
// A .jot document can hold one moment, a day, a month or an ongoing journal. Each dated heading (`### 2026-10-25 | Sunday`) starts an
// entry; a document with no dated heading is one entry dated by its `Date:` metadata or a YYYY-MM-DD file name, else it is undated.
// Nothing is executed or fetched: raw HTML prints as text, links print their words, images print as "[image: alt]".
import { headerZone } from './daypage.mjs';
import { lexer } from '../parser/vendor/marked.mjs';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const meta = (ast, k) => { const m = ast.metadata.find((x) => x.name.toLowerCase() === k); return m ? m.value : ''; };
const tagList = (s) => s.split(/[,\s]+/).map((t) => t.replace(/^#/, '')).filter(Boolean);

// The entries of one parsed document: [{ date|null, title, tags, nodes, file }] in the order they were written.
export function jotEntries(ast, file = '') {
  const base = file.replace(/^.*[\\/]/, '').replace(/\.jot$/i, '');
  const docTitle = meta(ast, 'title'), docTags = tagList(meta(ast, 'tags'));
  const body = (from, to) => ast.nodes.slice(from, to).filter((n) => n.type !== 'blank');
  if (!ast.entries.length) {
    const d = meta(ast, 'date').slice(0, 10), fd = /^\d{4}-\d{2}-\d{2}/.exec(base);
    const date = DATE_RE.test(d) ? d : fd ? fd[0] : null;
    return [{ date, title: docTitle || base, tags: docTags, nodes: body(0), file }];
  }
  const out = [];
  const lead = body(0, ast.entries[0].startNode); // writing before the first dated heading belongs to the document, not a day
  if (lead.some((n) => n.type !== 'heading' && n.type !== 'directive' && n.type !== 'comment')) out.push({ date: null, title: docTitle || base, tags: docTags, nodes: lead, file });
  for (const e of ast.entries) {
    const nodes = body(e.startNode + 1, e.endNode);
    const sub = String(e.heading).split('|').slice(1).join('|').trim(); // "2026-10-25 | Sunday" -> "Sunday"
    out.push({ date: e.date, title: docTitle || sub || base, tags: docTags, nodes, file });
  }
  return out;
}

// ---- inline Markdown (Marked tokens) to safe HTML ----
function inline(tokens) {
  return (tokens || []).map((t) => {
    switch (t.type) {
      case 'strong': return `<b>${inline(t.tokens)}</b>`;
      case 'em': return `<i>${inline(t.tokens)}</i>`;
      case 'del': return `<s>${inline(t.tokens)}</s>`;
      case 'codespan': return `<code>${esc(t.text)}</code>`;
      case 'br': return '<br>';
      case 'link': return inline(t.tokens);
      case 'image': return `<span class="jimg">[image${t.text ? `: ${esc(t.text)}` : ''}]</span>`;
      case 'text': return t.tokens ? inline(t.tokens) : esc(t.text);
      default: return esc(t.raw || t.text || ''); // escape, html and anything new: printed as written
    }
  }).join('');
}
const box = (done) => `<span class="jbx${done ? ' on' : ''}"></span>`;
function block(t) {
  switch (t.type) {
    case 'heading': return `<div class="jh jh${Math.min(t.depth, 4)}">${inline(t.tokens)}</div>`;
    case 'paragraph': return `<p>${inline(t.tokens)}</p>`;
    case 'text': return `<p>${t.tokens ? inline(t.tokens) : esc(t.text)}</p>`;
    case 'blockquote': return `<blockquote>${(t.tokens || []).map(block).join('')}</blockquote>`;
    case 'code': return `<pre>${esc(t.text)}</pre>`;
    case 'hr': return '<hr>';
    case 'list': {
      const tag = t.ordered ? 'ol' : 'ul';
      return `<${tag}${t.ordered && typeof t.start === 'number' && t.start !== 1 ? ` start="${t.start}"` : ''}>${t.items.map((it) => `<li${it.task ? ' class="jt"' : ''}>${it.task ? box(it.checked) : ''}${it.tokens.filter((x) => x.type !== 'checkbox').map((x) => (x.type === 'text' ? (x.tokens ? inline(x.tokens) : esc(x.text)) : block(x))).join('')}</li>`).join('')}</${tag}>`;
    }
    case 'table': return `<table><tr>${t.header.map((c) => `<th>${inline(c.tokens)}</th>`).join('')}</tr>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c.tokens)}</td>`).join('')}</tr>`).join('')}</table>`;
    case 'space': return '';
    default: return `<p>${esc(t.raw || t.text || '')}</p>`;
  }
}
const MARK = { event: '○', question: '?', idea: '!', synopsis: '=', voice: '»' };
// One AST node to { html, lines }: `lines` is a conservative height estimate in body lines, used to cut entries into pages.
export function nodeBlock(n, cpl) {
  const est = (s, extra = 0) => String(s).split('\n').reduce((a, l) => a + Math.max(1, Math.ceil(l.length / cpl)), 0) + extra;
  switch (n.type) {
    case 'pagebreak': return { html: '', lines: 0, br: true };
    case 'comment': case 'directive': case 'blank': return null; // hidden comments and presentation hints do not print
    case 'task': return { html: `<div class="jtask">${box(n.status === 'completed')}<span class="${n.status === 'cancelled' ? 'jx' : ''}">${esc(n.text)}${n.status === 'migrated' ? ' &gt;' : n.status === 'scheduled' ? ' &lt;' : ''}${n.priority === 'high' ? ' <b>!</b>' : ''}</span></div>`, lines: est(n.text) };
    case 'event': case 'question': case 'idea': case 'synopsis': case 'voice':
      return { html: `<div class="jmark"><b>${MARK[n.type]}</b> ${esc(n.text)}</div>`, lines: est(n.text) };
    case 'scene': return { html: `<div class="jh jh4">${esc(n.text)}</div>`, lines: est(n.text, 0.5) };
    case 'annotation': return { html: `<div class="jnote">${esc(n.text)}</div>`, lines: est(n.text) };
    case 'record': return { html: `<div class="jrec"><div class="jrt">${esc(n.recordType.replace(/-/g, ' '))}</div>${n.fields.map((f) => `<div><b>${esc(f.name.replace(/-/g, ' '))}:</b> ${esc(f.value).replace(/\n/g, '<br>')}</div>`).join('')}</div>`, lines: 1.5 + n.fields.reduce((a, f) => a + est(`${f.name}: ${f.value}`), 0) };
    default: {
      if (!n.markdown) return { html: `<p>${esc(n.raw)}</p>`, lines: est(n.raw, 0.4) };
      const t = n.markdown, html = block(t);
      if (!html) return null;
      const raw = t.raw.replace(/\n+$/, '');
      if (t.type === 'table') return { html, lines: (t.rows.length + 1) * 1.4 };
      if (t.type === 'heading') return { html, lines: 1.6 };
      return { html, lines: est(raw, t.type === 'code' ? 0.6 : 0.4) };
    }
  }
}
// A block taller than a page is cut where it can be: a paragraph between words, code between lines, a list between items, a table between
// rows (the header row repeats). Each piece is drawn by the same code as a whole block, so formatting survives the cut.
function chunk(items, size, room) {
  const out = [[]];
  let used = 0;
  for (const it of items) { const h = size(it); if (used + h > room && out[out.length - 1].length) { out.push([]); used = 0; } out[out.length - 1].push(it); used += h; }
  return out;
}
function splitTall(n, cpl, room) {
  const b = nodeBlock(n, cpl);
  if (!b || b.lines <= room || !n.markdown) return b ? [b] : [];
  const t = n.markdown, cap = room - 1, len = (s) => Math.max(1, Math.ceil(s.length / cpl));
  const piece = (tok) => nodeBlock({ type: tok.type, raw: tok.raw, markdown: tok }, cpl);
  if (t.type === 'paragraph') {
    // whole words, re-read as Markdown so **bold** and the rest stay formatted (a marker cut in two prints as written)
    const words = t.raw.replace(/\n+$/, '').split(/(?<=\s)/);
    return chunk(words, (w) => w.length / cpl, cap).map((ws) => piece(lexer(ws.join(''), { gfm: true })[0])).filter(Boolean);
  }
  if (t.type === 'code') return chunk(t.text.split('\n'), len, cap).map((ls) => ({ html: `<pre>${esc(ls.join('\n'))}</pre>`, lines: ls.reduce((a, l) => a + len(l), 0.6) }));
  if (t.type === 'list') {
    let start = typeof t.start === 'number' ? t.start : 1;
    return chunk(t.items, (it) => String(it.raw).split('\n').reduce((a, l) => a + len(l), 0), cap).map((items) => {
      const html = block({ ...t, items, start }); start += items.length;
      return { html, lines: items.reduce((a, it) => a + String(it.raw).split('\n').reduce((x, l) => x + len(l), 0), 0.4) };
    });
  }
  if (t.type === 'table') return chunk(t.rows, () => 1.4, cap - 1.4).map((rows) => ({ html: block({ ...t, rows }), lines: (rows.length + 1) * 1.4 }));
  return [b];
}

// A page id from what the entry is (its date, its file, which entry of that date in the file), never from where it falls in the book,
// so adding another .jot file does not renumber the pages (and scan codes) of the ones already printed.
export const jotSlug = (file) => (file.replace(/^.*[\\/]/, '').replace(/\.jot$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'jot');
export function entryIds(entries) {
  const seen = new Map();
  return entries.map((e) => {
    const base = `jot.${e.date}.${jotSlug(e.file)}`, k = (seen.get(base) || 0) + 1;
    seen.set(base, k);
    return k === 1 ? base : `${base}.${k}`;
  });
}

// The page geometry the estimate works with (CSS inches are the same on both trims: the letter book is the small layout zoomed).
export const JOT_FIT = { cpl: 52, lines: 32 }; // characters per line, body lines per page; large print: 1.4x the type
export function fitFor(print = {}) { const k = print.large ? 1.4 : 1; return { cpl: Math.floor(JOT_FIT.cpl / k), lines: Math.floor(JOT_FIT.lines / k) }; }

// One entry -> pages: [{ html, part, of }]. Every page carries the fixed header (DATE / TITLE / TAGS) and keeps it identical to every other page.
export function entryPages(entry, print = {}) {
  const { cpl, lines } = fitFor(print), pages = [[]];
  let used = 0;
  for (const n of entry.nodes) {
    for (const b of splitTall(n, cpl, lines)) {
      if (b.br) { if (pages[pages.length - 1].length) { pages.push([]); used = 0; } continue; }
      if (used + b.lines > lines && pages[pages.length - 1].length) { pages.push([]); used = 0; }
      pages[pages.length - 1].push(b.html); used += b.lines;
    }
  }
  const of = pages.length, title = (entry.title || 'Jot').slice(0, 40);
  return pages.map((p, i) => ({
    part: i + 1, of,
    html: `${headerZone(entry.date ? esc(entry.date) : '', esc(of > 1 ? `${title} (${i + 1}/${of})` : title), entry.tags.length ? esc(entry.tags.map((t) => `#${t}`).join(' ')) : '')}<div class="jot${print.large ? ' jlg' : ''}${print.contrast ? ' jhc' : ''}" data-zone="jot">${JOT_CSS}${p.join('') || '<p class="jempty">(empty)</p>'}</div>`,
  }));
}
// Scoped to .jot so nothing else on any page changes (default books stay byte-identical).
const JOT_CSS = '<style>.jot{font-size:9pt;line-height:1.38;margin-top:.12in;overflow-wrap:anywhere}.jot p{margin:0 0 .05in}.jot .jh{font-weight:600;margin:.06in 0 .03in}.jot .jh1,.jot .jh2{font-size:11pt}.jot .jh3{font-size:10pt}.jot .jh4{font-size:9.5pt}.jot ul,.jot ol{margin:0 0 .05in;padding-left:.2in}.jot li.jt{list-style:none;margin-left:-.16in}.jot .jbx{display:inline-block;width:.09in;height:.09in;border:.75pt solid #333;margin-right:.05in;vertical-align:-.01in}.jot .jbx.on{background:#333}.jot .jx{text-decoration:line-through}.jot blockquote{margin:0 0 .05in;padding-left:.1in;border-left:1.5pt solid #999}.jot pre{font-family:inherit;white-space:pre-wrap;font-size:8.5pt;margin:0 0 .05in;padding:.03in .06in;background:#f2f2f2}.jot code{font-size:8.5pt}.jot table{border-collapse:collapse;margin:0 0 .05in;font-size:8.5pt}.jot td,.jot th{border:.5pt solid #999;padding:.01in .05in;text-align:left}.jot .jrec{border:.75pt solid #999;padding:.03in .06in;margin:0 0 .05in}.jot .jrt{font-size:7.5pt;text-transform:uppercase;letter-spacing:.04em;color:#555}.jot .jnote{font-style:italic;color:#444}.jot .jempty{color:#888}.jot hr{border:0;border-top:.75pt solid #999}.jot.jlg{font-size:12.6pt}.jot.jlg pre,.jot.jlg code,.jot.jlg table{font-size:12pt}.jot.jlg .jh1,.jot.jlg .jh2{font-size:14pt}.jot.jlg .jh3,.jot.jlg .jh4{font-size:13pt}.jot.jlg .jrt{font-size:10.5pt}.jot.jlg .jbx{width:.13in;height:.13in}.jot.jhc,.jot.jhc .jnote,.jot.jhc .jrt,.jot.jhc .jempty{color:#000}.jot.jhc blockquote,.jot.jhc td,.jot.jhc th,.jot.jhc .jrec,.jot.jhc hr{border-color:#000}.jot.jhc .jbx{border-color:#000}.jot.jhc pre{background:none;border:1pt solid #000}</style>';
