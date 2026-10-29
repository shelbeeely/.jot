// The Jot logo on the site, from its masters in docs/brand/ (made by docs/brand/source/build.sh): the iota and the "jot"
// wordmark inline in every page header (so they take the page's ink, light or dark), and the favicons beside the pages.
//   node tools/sync-brand.mjs          rewrite the headers and icon links of the hand-written pages, copy the icons
//   node tools/sync-brand.mjs --check  exit 1 and name what differs
// The guides and examples are generated: site/build-guides.mjs and tools/build-examples.mjs use brandLink and iconLinks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), BRAND = path.join(ROOT, 'docs/brand'), DIST = path.join(ROOT, 'site/dist');
const pathOf = (file) => /<path[^>]* d="([^"]+)"/.exec(fs.readFileSync(path.join(BRAND, file), 'utf8'))[1];
const svg = (cls, box, d) => `<svg class="${cls}" viewBox="${box}" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
// The symbol master keeps a margin round the ink (36 of 256 each side); the header shows the ink alone, beside the wordmark.
const MARK = svg('brand-icon', '30 30 196 196', pathOf('jot-symbol.svg')) + svg('brand-word', '0 0 336 256', pathOf('jot-wordmark.svg'));

/** The header's home link: the iota and the wordmark, named for screen readers. */
export const brandLink = (home, { current = false, sub = '' } = {}) =>
  `<a class="brand" href="${home}" aria-label="Jot home"${current ? ' aria-current="page"' : ''}>${MARK}${sub ? `<span class="brand-sub">${sub}</span>` : ''}</a>`;
/** Favicon and touch-icon links; `root` is the path from the page to the site's root ("./" or "../"). */
export const iconLinks = (root) =>
  `<link rel="icon" href="${root}favicon.svg" type="image/svg+xml"><link rel="icon" href="${root}favicon.ico" sizes="16x16 32x32 48x48"><link rel="apple-touch-icon" href="${root}apple-touch-icon.png">`;

const ICONS = ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'];
const PAGES = { 'index.html': {}, 'write/index.html': {}, 'editor/index.html': {}, 'convert/index.html': {}, 'import/index.html': {}, 'scan/index.html': { sub: '/ SCAN' } };

function page(rel, opts) {
  const text = fs.readFileSync(path.join(DIST, rel), 'utf8'), root = rel.includes('/') ? '../' : './';
  const link = /<a class="brand"[^>]*>[\s\S]*?<\/a>/.exec(text)?.[0];
  if (!link) throw new Error(`${rel}: no brand link in the header`);
  const home = /href="([^"]*)"/.exec(link)[1], current = /aria-current="page"/.test(link);
  return text.replace(link, brandLink(home, { current, ...opts }))
    .replace(/<link rel="(?:icon|apple-touch-icon)"[^>]*>/g, '')
    .replace(/<\/title>/, `</title>${iconLinks(root)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check'), stale = [];
  for (const [rel, opts] of Object.entries(PAGES)) {
    const want = page(rel, opts), file = path.join(DIST, rel);
    if (fs.readFileSync(file, 'utf8') !== want) { if (check) stale.push(rel); else fs.writeFileSync(file, want); }
  }
  for (const f of ICONS) {
    const want = fs.readFileSync(path.join(BRAND, f)), file = path.join(DIST, f);
    if (!fs.existsSync(file) || !fs.readFileSync(file).equals(want)) { if (check) stale.push(f); else fs.writeFileSync(file, want); }
  }
  if (stale.length) { console.error(`brand: out of date in site/dist: ${stale.join(', ')}\nRun: node tools/sync-brand.mjs`); process.exit(1); }
  console.log(check ? 'brand: site headers and icons current' : 'brand: site headers and icons written');
}
