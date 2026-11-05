// Selectors Paged.js can read: no commas inside :not(), :is() and friends, with the same meaning.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pagedSafeCSS, expandSelector, splitTop } from './dist/page-view-css.mjs';

test('splits only top-level commas', () => {
  assert.deepEqual(splitTop('a:not(.b,.c), d[title="x,y"], e'), ['a:not(.b,.c)', 'd[title="x,y"]', 'e']);
});
test(':not lists become chained :not', () => {
  assert.deepEqual(expandSelector('.S .jot-date+p:not(.jot-scene,.jot-backlinks)::first-letter'), ['.S .jot-date+p:not(.jot-scene):not(.jot-backlinks)::first-letter']);
});
test(':is, :where and :has lists become a selector list, in order', () => {
  assert.deepEqual(expandSelector('.x :is(h1,h2) :where(a,b)'), ['.x :is(h1) :where(a)', '.x :is(h1) :where(b)', '.x :is(h2) :where(a)', '.x :is(h2) :where(b)']);
  assert.deepEqual(expandSelector('li:has(a,b)'), ['li:has(a)', 'li:has(b)']);
});
test('rewrites rule preludes only, inside at-rules too', () => {
  const css = '@media print{.a:is(.b,.c){content:"x,:is(y,z){"}}@page{size:148mm 210mm;@bottom-center{content:counter(page)}}/* :is(a,b){ */.d{background:url(data:image/png;base64,AA==)}';
  assert.equal(pagedSafeCSS(css), '@media print{.a:is(.b),.a:is(.c){content:"x,:is(y,z){"}}@page{size:148mm 210mm;@bottom-center{content:counter(page)}}/* :is(a,b){ */.d{background:url(data:image/png;base64,AA==)}');
});
test('leaves a selector alone rather than growing it without bound', () => {
  const huge = Array.from({ length: 6 }, () => ':is(a,b,c,d)').join(' ');
  assert.equal(expandSelector(huge), null);
  assert.equal(pagedSafeCSS(huge + '{color:red}'), huge + '{color:red}');
});

// A fixed-layout EPUB's files (epub-book.mjs): pictures and fonts out of data: URLs, models as scripts, nothing fetched.
import { bookParts, decodeDataURL, base64 } from './dist/epub-book.mjs';
const SVG = "data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'4'%20height%3D'4'%2F%3E";
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('decodes data: URLs, base64 or percent-encoded', () => {
  assert.equal(new TextDecoder().decode(decodeDataURL(SVG).bytes), "<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'/>");
  assert.equal(decodeDataURL(PNG).type, 'image/png'); assert.equal(decodeDataURL(PNG).bytes[1], 0x50);
  assert.equal(decodeDataURL('data:,%E0%A4%A'), null); assert.equal(base64(new Uint8Array([1, 2, 3])), 'AQID');
});
test('book parts: each picture and font once, as a file; pages point at them', async () => {
  const css = `.a{background:url("${SVG}")}.b{background:url('${PNG}')}@font-face{src:url(data:font/woff2;base64,d09GMg==)}`;
  const body = `<div style="--hw-dots: url(&quot;${SVG.replace(/'/g, '&#39;')}&quot;)"><img src="${PNG}" alt="x"/></div>`;
  const out = await bookParts({ css, pages: [{ body, headings: ['Thursday'], models: [] }] });
  assert.equal(out.files.length, 3, 'one svg, one font, one png, each once');
  assert.doesNotMatch(out.css + out.pages[0].body, /data:/);
  assert.match(out.css, /url\("\.\.\/media\/[0-9a-f]{20}\.svg"\)[\s\S]*url\("\.\.\/media\/[0-9a-f]{20}\.png"\)[\s\S]*url\("\.\.\/fonts\/[0-9a-f]{20}\.woff2"\)/);
  assert.match(out.pages[0].body, /url\(&quot;\.\.\/media\/[0-9a-f]{20}\.svg&quot;\)[\s\S]*src="\.\.\/media\/[0-9a-f]{20}\.png"/);
  assert.equal(out.pages[0].scripts, undefined, 'no model, no scripts');
});
test('book parts: a page with a model carries the viewer and the bytes; a missing model stays still', async () => {
  const pages = [{ body: '<p/>', models: ['media/a'] }, { body: '<p/>', models: ['media/a', 'media/gone'] }, { body: '<p/>', models: ['media/gone'] }];
  const out = await bookParts({ css: '', pages }, { modelBytes: (p) => (p === 'media/a' ? new Uint8Array([103, 108, 84, 70]) : null), three: '/*t*/', viewer: '/*v*/' });
  assert.deepEqual(out.pages.map((p) => p.scripts?.length || 0), [4, 4, 0]);
  assert.equal(out.models, 1); assert.deepEqual(out.missing, ['media/gone']);
  const model = out.files.find((f) => f.path.startsWith('js/models/'));
  assert.match(model.data, /\["media\/a"\] = "Z2xURg=="/);
  assert.deepEqual(out.files.map((f) => f.path).filter((p) => !p.startsWith('js/models/')), ['js/three.js', 'js/model3d-view.js', 'js/models.js']);
  await assert.rejects(bookParts({ css: '', pages }, { modelBytes: () => new Uint8Array([1]) }), /viewer/);
});
test('book parts: a compressed model brings its decoders, once per book, before the models', async () => {
  const enc = (o) => { let t = JSON.stringify(o); while (t.length % 4) t += ' '; const b = new TextEncoder().encode(t), out = new Uint8Array(20 + b.length), v = new DataView(out.buffer);
    v.setUint32(0, 0x46546c67, true); v.setUint32(4, 2, true); v.setUint32(8, out.length, true); v.setUint32(12, b.length, true); v.setUint32(16, 0x4e4f534a, true); out.set(b, 20); return out; };
  const models = { 'media/d': enc({ asset: { version: '2.0' }, extensionsUsed: ['KHR_draco_mesh_compression'] }), 'media/m': enc({ asset: { version: '2.0' }, extensionsUsed: ['EXT_meshopt_compression'] }) };
  const asked = [];
  const out = await bookParts({ css: '', pages: [{ body: '<p/>', models: ['media/d'] }, { body: '<p/>', models: ['media/m', 'media/d'] }, { body: '<p/>', models: ['media/m'] }] },
    { modelBytes: (p) => models[p], three: '/*t*/', viewer: '/*v*/', decoderBytes: (n) => { asked.push(n); return new TextEncoder().encode(n); } });
  assert.deepEqual(asked, ['draco_wasm_wrapper.js', 'draco_decoder.wasm'], 'each decoder read once');
  assert.deepEqual(out.pages[0].scripts.slice(0, 4), ['js/three.js', 'js/model3d-view.js', 'js/decoders/draco_wasm_wrapper-js.js', 'js/decoders/draco_decoder-wasm.js']);
  assert.equal(out.pages[1].scripts.filter((s) => s.startsWith('js/decoders/')).length, 2);
  assert.equal(out.pages[2].scripts.some((s) => s.startsWith('js/decoders/')), false, 'meshopt needs no decoder');
  assert.match(out.files.find((f) => f.path === 'js/decoders/draco_decoder-wasm.js').data, /JotDecoders[\s\S]*\["draco_decoder\.wasm"\] = "ZHJhY29fZGVjb2Rlci53YXNt"/);
  await assert.rejects(bookParts({ css: '', pages: [{ body: '<p/>', models: ['media/d'] }] }, { modelBytes: (p) => models[p], three: '/*t*/', viewer: '/*v*/' }), /decoder could not be read/);
});
