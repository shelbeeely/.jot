// The Jot logo on the site, from its masters in docs/brand/ (made by docs/brand/source/build.sh): the "ιot" wordmark
// inline in every page header (so they take the page's ink, light or dark), the favicons beside the pages, and the VS Code
// extension's icon and .jot file icons.
//   node tools/sync-brand.mjs          rewrite the headers and icon links of the hand-written pages, copy the icons
//   node tools/sync-brand.mjs --check  exit 1 and name what differs
// The guides and examples are generated: site/build-guides.mjs and tools/build-examples.mjs use brandLink and iconLinks.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), BRAND = path.join(ROOT, 'docs/brand'), DIST = path.join(ROOT, 'site/dist');
const pathOf = (file) => /<path[^>]* d="([^"]+)"/.exec(fs.readFileSync(path.join(BRAND, file), 'utf8'))[1];
const svg = (cls, box, d) => `<svg class="${cls}" viewBox="${box}" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
// The wordmark "ιot" begins with the symbol, the iota, so the header shows the wordmark alone.
const MARK = svg('brand-word', '0 0 352 256', pathOf('jot-wordmark.svg'));

/** The header's home link: the wordmark, named "Jot home" for screen readers (it is spelled with an iota). */
export const brandLink = (home, { current = false, sub = '' } = {}) =>
  `<a class="brand" href="${home}" aria-label="Jot home"${current ? ' aria-current="page"' : ''}>${MARK}${sub ? `<span class="brand-sub">${sub}</span>` : ''}</a>`;
/** Favicon and touch-icon links; `root` is the path from the page to the site's root ("./" or "../"). */
export const iconLinks = (root) =>
  `<link rel="icon" href="${root}favicon.svg" type="image/svg+xml"><link rel="icon" href="${root}favicon.ico" sizes="16x16 32x32 48x48"><link rel="apple-touch-icon" href="${root}apple-touch-icon.png">`;

// The homepage's link preview (Open Graph): the social preview image and the canonical words (docs/brand/messaging.md). The
// image path is relative: the site's public address carries the owner's name, which the privacy check keeps off every page.
// Most previewers resolve it against the page; set an absolute address here once the site has one without a name in it.
export const socialLinks = (description) => ['<meta property="og:type" content="website">', '<meta property="og:site_name" content="Jot">',
  '<meta property="og:title" content="Jot · Jot things down. Get beautiful pages back.">', `<meta property="og:description" content="${description}">`,
  '<meta property="og:image" content="social-preview.png">',
  '<meta property="og:image:width" content="1280">', '<meta property="og:image:height" content="640">',
  '<meta property="og:image:alt" content="The Jot wordmark, written in ink blue on dot-grid paper">', '<meta name="twitter:card" content="summary_large_image">'].join('');

// Copies of masters, by where they go: the site's icons, the desktop app's document icon (Linux), and the extension's icon
// and file icons.
const COPIES = {
  'site/dist/favicon.svg': 'favicon.svg', 'site/dist/social-preview.png': 'social-preview.png', 'site/dist/favicon.ico': 'favicon.ico', 'site/dist/apple-touch-icon.png': 'apple-touch-icon.png',
  'desktop/src-tauri/linux/jot-document.svg': 'jot-document.svg',
  'vscode/media/icon.png': 'vscode-icon.png', 'vscode/media/jot-file-light.svg': 'jot-file-light.svg', 'vscode/media/jot-file-dark.svg': 'jot-file-dark.svg',
};
const PAGES = { 'index.html': {}, 'write/index.html': {}, 'editor/index.html': {}, 'convert/index.html': {}, 'import/index.html': {}, 'scan/index.html': { sub: '/ SCAN' } };

function page(rel, opts) {
  const text = fs.readFileSync(path.join(DIST, rel), 'utf8'), root = rel.includes('/') ? '../' : './';
  const link = /<a class="brand"[^>]*>[\s\S]*?<\/a>/.exec(text)?.[0];
  if (!link) throw new Error(`${rel}: no brand link in the header`);
  const home = /href="([^"]*)"/.exec(link)[1], current = /aria-current="page"/.test(link);
  return text.replace(link, brandLink(home, { current, ...opts }))
    .replace(/<link rel="(?:icon|apple-touch-icon)"[^>]*>/g, '')
    .replace(/<\/title>/, `</title>${iconLinks(root)}`)
    .replace(/<meta (?:property="og:|name="twitter:)[^>]*>/g, '')
    .replace(/(<meta name="description" content="([^"]*)">)/, (m, tag, d) => rel === 'index.html' ? tag + socialLinks(d) : tag);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check'), stale = [];
  for (const [rel, opts] of Object.entries(PAGES)) {
    const want = page(rel, opts), file = path.join(DIST, rel);
    if (fs.readFileSync(file, 'utf8') !== want) { if (check) stale.push(rel); else fs.writeFileSync(file, want); }
  }
  for (const [to, from] of Object.entries(COPIES)) {
    const want = fs.readFileSync(path.join(BRAND, from)), file = path.join(ROOT, to);
    if (!fs.existsSync(file) || !fs.readFileSync(file).equals(want)) { if (check) stale.push(to); else fs.writeFileSync(file, want); }
  }
  if (stale.length) { console.error(`brand: out of date: ${stale.join(', ')}\nRun: node tools/sync-brand.mjs`); process.exit(1); }
  console.log(check ? 'brand: site headers and icons, extension icons current' : 'brand: site headers and icons, extension icons written');
}
