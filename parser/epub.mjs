/** Jot fixed-layout EPUB, draft 0.1: laid-out pages as one EPUB 3 book whose pages keep their exact layout (pre-paginated).
 * Pure packaging: no DOM, so Node tests read the same book Writer saves. Writer lays the pages out with Paged.js (Page view) and
 * hands them here as XHTML fragments.
 *
 *   fixedLayoutEPUB({ title, lang, id, modified, width, height, css, pages, files }) -> Promise<Uint8Array>
 *     pages   [{ body: '<div …>…</div>' (well-formed XHTML), label?, headings?: ['Thursday, 1 October 2026'], scripts?: ['js/three.js'] }]
 *     files   [{ path: 'media/a.png' | 'js/three.js' | …, mediaType, data: Uint8Array | string }]  (paths inside EPUB/)
 *     width / height   the page size in CSS pixels (every page the same size); css: one stylesheet for every page
 *
 * A page that lists scripts is declared `scripted`. Jot puts only its own viewer scripts there (spec 8.1.6, §9): nothing in a book
 * comes from code in a journal, and nothing in it fetches. The contents list names the dated entries on the page each starts on,
 * and every page is in the page list.
 */
import './vendor/jszip.mjs';

const JSZip = globalThis.JSZip, enc = new TextEncoder();
const xml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SAFE = /^(?!.*\.\.)(?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*$/i; // relative, no climbing, no spaces
const RESERVED = new Set(['package.opf', 'nav.xhtml', 'styles/pages.css']);
const pad = (n) => String(n).padStart(3, '0');
const LANG = /^[a-z]{2,3}(-[a-z0-9]{1,8})*$/i;

export const EPUB_MEDIA_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', js: 'application/javascript', css: 'text/css', mp3: 'audio/mpeg', mp4: 'video/mp4' };

/** Turns the Jot 3D models on a scripted page in a book: Jot's own code, the same in every book. */
export const EPUB_MODELS_JS = `/* Jot: wires the 3D models on this page to the bundled viewer (model3d-view.js). Each model's bytes are in js/models/. */
(function () {
  function bytes(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function go() {
    if (!globalThis.Jot3D) return;
    globalThis.Jot3D.bindAll(document, function (figure) {
      var d = {}; try { d = JSON.parse(figure.getAttribute('data-jot3d') || '{}'); } catch (e) {}
      var b = (globalThis.JotModels || {})[d.file]; return b ? bytes(b) : null;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
`;
/** One model's bytes as a script (no fetching inside a book): js/models/<name>.js */
export const modelScript = (path, base64) => `(globalThis.JotModels || (globalThis.JotModels = {}))[${JSON.stringify(path)}] = ${JSON.stringify(base64)};\n`;

function check({ title, lang, width, height, pages, files }) {
  if (!Array.isArray(pages) || !pages.length) throw new Error('A book needs at least one page.');
  if (!(width > 0 && height > 0 && width <= 20000 && height <= 20000)) throw new Error('Pages need a width and height in pixels.');
  if (!LANG.test(lang)) throw new Error(`Not a language tag: ${lang}`);
  if (!String(title || '').trim()) throw new Error('A book needs a title.');
  const seen = new Set();
  for (const f of files) {
    if (!SAFE.test(f.path) || RESERVED.has(f.path) || f.path.startsWith('pages/')) throw new Error(`Not a safe path inside the book: ${f.path}`);
    if (seen.has(f.path)) throw new Error(`Two files at ${f.path}`); seen.add(f.path);
    if (!/^[a-z]+\/[a-z0-9.+-]+$/i.test(f.mediaType || '')) throw new Error(`No media type for ${f.path}`);
  }
  for (const p of pages) for (const s of p.scripts || []) if (!seen.has(s)) throw new Error(`A page uses a script the book does not carry: ${s}`);
}

function pageXHTML({ body, scripts = [] }, n, { title, lang, width, height }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xml(lang)}" xml:lang="${xml(lang)}">
<head>
<meta charset="UTF-8"/>
<title>${xml(title)}, page ${n}</title>
<meta name="viewport" content="width=${width}, height=${height}"/>
<link rel="stylesheet" type="text/css" href="../styles/pages.css"/>
${scripts.map((s) => `<script src="../${xml(s)}"></script>`).join('\n')}
</head>
<body>
${body}
</body>
</html>
`;
}

function navXHTML(pages, { title, lang }) {
  const entries = [];
  pages.forEach((p, i) => { for (const h of p.headings || []) entries.push([h, i + 1]); });
  if (!entries.length) entries.push([title, 1]);
  const li = ([text, n]) => `      <li><a href="pages/page-${pad(n)}.xhtml">${xml(text)}</a></li>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${xml(lang)}" xml:lang="${xml(lang)}">
<head><meta charset="UTF-8"/><title>${xml(title)}</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
${entries.map(li).join('\n')}
    </ol>
  </nav>
  <nav epub:type="page-list" hidden="hidden">
    <ol>
${pages.map((p, i) => `      <li><a href="pages/page-${pad(i + 1)}.xhtml">${xml(p.label || String(i + 1))}</a></li>`).join('\n')}
    </ol>
  </nav>
</body>
</html>
`;
}

function packageOPF({ title, lang, id, modified, pages, files }) {
  const item = (iid, href, type, props) => `    <item id="${iid}" href="${xml(href)}" media-type="${xml(type)}"${props ? ` properties="${props}"` : ''}/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${xml(lang)}" prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${xml(id)}</dc:identifier>
    <dc:title>${xml(title)}</dc:title>
    <dc:language>${xml(lang)}</dc:language>
    <meta property="dcterms:modified">${xml(modified)}</meta>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">none</meta>
  </metadata>
  <manifest>
${[item('nav', 'nav.xhtml', 'application/xhtml+xml', 'nav'), item('css', 'styles/pages.css', 'text/css'),
    ...pages.map((p, i) => item(`page-${pad(i + 1)}`, `pages/page-${pad(i + 1)}.xhtml`, 'application/xhtml+xml', p.scripts?.length ? 'scripted' : '')),
    ...files.map((f, i) => item(`file-${i + 1}`, f.path, f.mediaType))].join('\n')}
  </manifest>
  <spine>
${pages.map((_, i) => `    <itemref idref="page-${pad(i + 1)}"/>`).join('\n')}
  </spine>
</package>
`;
}

export async function fixedLayoutEPUB({ title = 'Journal', lang = 'en', id, modified, width, height, css = '', pages = [], files = [] } = {}) {
  const book = { title: String(title).trim() || 'Journal', lang, id: id || `urn:uuid:${globalThis.crypto.randomUUID()}`, width: Math.round(width), height: Math.round(height),
    modified: (modified || new Date().toISOString()).replace(/\.\d+Z$/, 'Z'), pages, files };
  check(book);
  const zip = new JSZip(), date = new Date('2000-01-01T00:00:00Z'), add = (path, data, compression = 'DEFLATE') => zip.file(path, data, { createFolders: false, compression, date });
  add('mimetype', 'application/epub+zip', 'STORE'); // first, uncompressed, no extra field: how a reading system knows the file
  add('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`);
  add('EPUB/package.opf', packageOPF(book));
  add('EPUB/nav.xhtml', navXHTML(pages, book));
  add('EPUB/styles/pages.css', `@charset "UTF-8";\n${css}\nhtml,body{margin:0;padding:0;width:${book.width}px;height:${book.height}px;overflow:hidden}\n`);
  pages.forEach((p, i) => add(`EPUB/pages/page-${pad(i + 1)}.xhtml`, pageXHTML(p, i + 1, book)));
  for (const f of files) add(`EPUB/${f.path}`, typeof f.data === 'string' ? enc.encode(f.data) : f.data, /^(image\/(png|jpeg|gif|webp)|font\/woff2?)$/.test(f.mediaType) ? 'STORE' : 'DEFLATE');
  return zip.generateAsync({ type: 'uint8array', mimeType: 'application/epub+zip' });
}

export default { fixedLayoutEPUB, modelScript, EPUB_MODELS_JS, EPUB_MEDIA_TYPES };
