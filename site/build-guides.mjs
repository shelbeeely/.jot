// Builds the guides (docs/guide/*.md) into pages on the site (dist/guide/*.html), with the same Markdown library the Jot parser uses.
//   node build-guides.mjs           write the pages
//   node build-guides.mjs --check   exit 1 when a page is out of date (test-guides.mjs runs this)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from './dist/jot/vendor/marked.mjs';
import { brandLink, iconLinks } from '../tools/sync-brand.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), SRC = path.join(HERE, '../docs/guide'), OUT = path.join(HERE, 'dist/guide');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slug = (s) => String(s).toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9 -]/g, '').trim().replace(/\s+/g, '-');
// A link in a guide works on GitHub (relative .md paths) and on the site (rewritten here)
export function siteHref(href) {
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  const [p, hash = ''] = href.split('#'), h = hash ? `#${hash}` : '';
  if (p === 'README.md') return `./${h}`;
  if (/^[\w-]+\.md$/.test(p)) return p.replace(/\.md$/, '.html') + h;
  if (p.startsWith('../../site/dist/')) return `../${p.slice('../../site/dist/'.length)}${h}`;
  if (p === '../../specification/Jot-Complete-Specification.md') return '../docs/Jot-Complete-Specification.pdf';
  throw new Error(`a guide links to ${href}, which is not on the site`);
}
const NAMES = { 'README.md': 'index.html' };
export function buildPage(file, md) {
  const toc = [], md2 = new Marked({ gfm: true, breaks: false });
  md2.use({ renderer: {
    heading({ tokens, depth }) { const text = this.parser.parseInline(tokens), id = slug(text); if (depth === 2) toc.push([id, text]); return `<h${depth} id="${id}">${text}</h${depth}>\n`; },
    link({ href, title, tokens }) { return `<a href="${esc(siteHref(href))}"${title ? ` title="${esc(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`; },
    html({ text }) { return esc(text); }, // the guides hold no HTML; anything that looks like it prints as text
  } });
  // code and tables scroll sideways on a phone: each can take focus, so a keyboard can scroll it too
  const body = md2.parse(md).replace(/<pre>/g, '<pre tabindex="0">').replace(/<table>/g, '<table tabindex="0">'), title = /^# (.+)$/m.exec(md)?.[1] ?? 'Jot guide';
  const h1 = (/<h1[^>]*>[\s\S]*?<\/h1>\n?/.exec(body) || [''])[0], rest = body.replace(h1, ''); // the title goes above the contents list, so a phone reads title first
  const nav = toc.length > 2 ? `<nav class="toc" aria-label="On this page"><p class="eyebrow">ON THIS PAGE</p><ul>${toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ul></nav>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(title)} · Jot</title>${iconLinks('../')}
<link rel="stylesheet" href="../editor/editor.css">
<link rel="stylesheet" href="guide.css">
<link id="jot-hand-css" rel="stylesheet" href="../jot/handwriting.css">
</head>
<body class="jot-site">
<a class="skip" href="#guide">Skip to the guide</a>
<header class="top">
  ${brandLink('../')}
  <nav aria-label="Jot tools"><a href="../write/">Write</a><a href="../editor/">Template editor</a><a href="../convert/">Converter</a><a href="./"${file === 'README.md' ? ' aria-current="page"' : ''}>Guides</a><a href="../examples/">Examples</a></nav>
</header>
<main>
<div class="guide-wrap" id="guide">${h1}${nav}<article class="guide">
${rest}</article></div>
</main>
</body>
</html>
`;
}
const pages = fs.readdirSync(SRC).filter((f) => f.endsWith('.md')).map((f) => [NAMES[f] || f.replace(/\.md$/, '.html'), buildPage(f, fs.readFileSync(path.join(SRC, f), 'utf8'))]);
if (process.argv.includes('--check')) {
  const stale = pages.filter(([n, h]) => !fs.existsSync(path.join(OUT, n)) || fs.readFileSync(path.join(OUT, n), 'utf8') !== h).map(([n]) => n);
  if (stale.length) { console.error(`guides out of date: ${stale.join(', ')} (run node build-guides.mjs)`); process.exit(1); }
  console.log(`guides: ${pages.length} pages current`);
} else if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [n, h] of pages) fs.writeFileSync(path.join(OUT, n), h);
  console.log(`guides: wrote ${pages.map(([n]) => n).join(', ')}`);
}
