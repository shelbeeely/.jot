// Fixed-layout EPUB (epub.mjs): the package a reading system expects, scripted pages declared, nothing unsafe inside.
// With JOT_EPUBCHECK naming epubcheck.jar (W3C EPUBCheck 5), the book is also validated by it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fixedLayoutEPUB, modelScript, EPUB_MODELS_JS } from './epub.mjs';

const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
const book = (extra = {}) => fixedLayoutEPUB({
  title: 'October & after', lang: 'en-GB', id: 'urn:uuid:3f0c8a52-6c1e-4b8e-9b51-2b7c0c3d9a10', modified: '2026-11-05T10:00:00.123Z', width: 559, height: 794,
  css: '.pagedjs_page{width:559px;height:794px}',
  pages: [
    { body: '<div class="pagedjs_pages" style="counter-reset: page 0"><div class="pagedjs_page"><h3 class="jot-date">Thursday, 1 October 2026</h3><p>Rain &amp; light.</p><img src="../media/a.png" alt="A leaf"/></div></div>', headings: ['Thursday, 1 October 2026'] },
    { body: '<div class="pagedjs_pages" style="counter-reset: page 1"><figure class="jot-3d" data-jot3d="{&quot;file&quot;:&quot;media/cube.glb&quot;}"><button type="button" class="jot-3d-turn">Turn in 3D</button></figure></div>', scripts: ['js/three.js', 'js/model3d-view.js', 'js/models/m1.js', 'js/models.js'] },
  ],
  files: [{ path: 'media/a.png', mediaType: 'image/png', data: PNG }, { path: 'js/three.js', mediaType: 'application/javascript', data: '/* three */' },
    { path: 'js/model3d-view.js', mediaType: 'application/javascript', data: '/* viewer */' }, { path: 'js/models/m1.js', mediaType: 'application/javascript', data: modelScript('media/cube.glb', 'AAAA') },
    { path: 'js/models.js', mediaType: 'application/javascript', data: EPUB_MODELS_JS }],
  ...extra,
});

test('a fixed-layout EPUB 3 package', async () => {
  const bytes = await book(), zip = await globalThis.JSZip.loadAsync(bytes), names = Object.keys(zip.files);
  assert.equal(names[0], 'mimetype'); assert.equal(Buffer.from(bytes.subarray(30, 38)).toString(), 'mimetype');
  assert.equal(Buffer.from(bytes.subarray(38, 58)).toString(), 'application/epub+zip', 'mimetype is stored, uncompressed, with no extra field');
  const opf = await zip.file('EPUB/package.opf').async('string');
  assert.match(opf, /<meta property="rendition:layout">pre-paginated<\/meta>/);
  assert.match(opf, /<meta property="dcterms:modified">2026-11-05T10:00:00Z<\/meta>/);
  assert.match(opf, /<dc:title>October &amp; after<\/dc:title>/);
  assert.match(opf, /href="pages\/page-002.xhtml" media-type="application\/xhtml\+xml" properties="scripted"/);
  assert.doesNotMatch(opf, /page-001.xhtml"[^>]*scripted/, 'a page without scripts is not scripted');
  const p1 = await zip.file('EPUB/pages/page-001.xhtml').async('string'), p2 = await zip.file('EPUB/pages/page-002.xhtml').async('string');
  assert.match(p1, /<meta name="viewport" content="width=559, height=794"\/>/); assert.doesNotMatch(p1, /<script/);
  assert.match(p2, /<script src="..\/js\/three.js"><\/script>[\s\S]*<script src="..\/js\/models.js"><\/script>/);
  const nav = await zip.file('EPUB/nav.xhtml').async('string');
  assert.match(nav, /<a href="pages\/page-001.xhtml">Thursday, 1 October 2026<\/a>/); assert.match(nav, /epub:type="page-list"/);
});
test('refuses unsafe paths, missing scripts and empty books', async () => {
  for (const p of ['../x.png', '/x.png', 'a b.png', 'package.opf', 'pages/x.xhtml']) await assert.rejects(book({ files: [{ path: p, mediaType: 'image/png', data: PNG }], pages: [{ body: '<p>x</p>' }] }), /safe path/, p);
  await assert.rejects(book({ pages: [{ body: '<p>x</p>', scripts: ['js/none.js'] }] }), /does not carry/);
  await assert.rejects(book({ pages: [] }), /at least one page/);
  await assert.rejects(book({ lang: 'english please' }), /language/);
});
test('model bytes travel as a script, never a fetch', () => {
  assert.equal(modelScript('media/a"b.glb', 'QUJD'), '(globalThis.JotModels || (globalThis.JotModels = {}))["media/a\\"b.glb"] = "QUJD";\n');
  assert.doesNotMatch(EPUB_MODELS_JS, /fetch|XMLHttpRequest|import\(/);
});
test('W3C EPUBCheck accepts it', { skip: !process.env.JOT_EPUBCHECK && 'set JOT_EPUBCHECK to epubcheck.jar' }, async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'jot-epub-')), 'book.epub'); fs.writeFileSync(file, await book());
  let out; try { out = execFileSync('java', ['-jar', process.env.JOT_EPUBCHECK, file, '--json', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { out = e.stdout; }
  const report = JSON.parse(out), bad = report.messages.filter((m) => ['FATAL', 'ERROR'].includes(m.severity));
  assert.deepEqual(bad.map((m) => `${m.ID} ${m.message} ${m.locations?.[0]?.path || ''}`), []);
});
