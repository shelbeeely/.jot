// Shared rendered paper, a plain writer shell, both color schemes, and an informational homepage.
// Run: node site/test-paper-ui.cjs (Playwright, Chromium, axe-core).
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const srv = http.createServer((q, r) => {
  let file = path.resolve(root, '.' + decodeURIComponent(q.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) && file !== root) { r.writeHead(403); return r.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (e, b) => {
    if (e) { r.writeHead(404); return r.end(); }
    r.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); r.end(b);
  });
});
(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch(), errors = [], origin = `http://127.0.0.1:${srv.address().port}`;
  try {
    for (const mode of ['light', 'dark']) for (const route of ['/', '/write/', '/editor/', '/convert/', '/guide/', '/examples/']) {
      const p = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: mode });
      p.on('pageerror', (e) => errors.push(`${route}: ${e.message}`));
      await p.goto(origin + route); await p.evaluate(() => document.fonts.ready);
      assert.equal(await p.$eval('#jot-hand-css', (s) => s.tagName), 'LINK');
      assert.equal(await p.$eval('#jot-hand-css', (s) => new URL(s.href).pathname), '/jot/handwriting.css');
      const style = await p.evaluate(() => ({ font: getComputedStyle(document.body).fontFamily, texture: getComputedStyle(document.body).backgroundImage,
        ink: getComputedStyle(document.body).color, paper: getComputedStyle(document.documentElement).getPropertyValue('--jot-paper').trim(), wide: document.documentElement.scrollWidth - innerWidth }));
      if (route === '/write/') {
        assert.doesNotMatch(style.font, /Caveat|cursive/i, 'the writing workspace uses a standard reading font');
        assert.equal(style.texture, 'none', 'the writing workspace has a plain background');
      } else { assert.match(style.font, /Jot Caveat/); assert.match(style.texture, /svg/); }
      assert.equal(style.paper, mode === 'light' ? '#fffdf6' : '#242622'); assert.equal(style.wide, 0, `${mode} ${route}: mobile width`);
      if (route === '/write/') {
        assert.equal(await p.inputValue('#writing'), '', 'a first visit opens blank writing');
        assert.equal(await p.locator('html').getAttribute('data-writer-view'), 'write');
        assert.equal(await p.locator('.preview-pane').isVisible(), false);
        const picker = await p.locator('#formatPreset optgroup').evaluateAll((groups) => groups.filter((group) => group.label.startsWith('Mildliner')).flatMap((group) => [...group.children].map((option) => option.value)));
        const reference = await p.evaluate(async () => Object.values((await import('/jot/palettes.mjs')).mildlinerPalettes).flat().map(([, hex]) => '#' + hex.toLowerCase()));
        assert.deepEqual(picker, reference);
        await p.fill('#writing', '### 2026-10-26\n\nA page of writing.');
        await p.click('#writerPreviewToggle');
        await p.$eval('#paperPreview', async (paper) => { await paper.jotReady; });
        assert.match(await p.$eval('#paperPreview', (paper) => getComputedStyle(paper).fontFamily), /Jot Caveat/, 'rendered journal paper retains handwriting');
        assert.equal(await p.$eval('#paperPreview', (paper) => getComputedStyle(paper).backgroundColor), mode === 'light' ? 'rgb(255, 253, 246)' : 'rgb(36, 38, 34)');
        await p.click('#writerPreviewToggle');
      }
      if (route === '/') {
        await p.waitForFunction(() => [...document.querySelectorAll('.jot-page')].every((page) => page.jotGrid));
        assert.equal(await p.locator('main textarea, main input, main select, main form, [contenteditable]').count(), 0);
        assert.equal(await p.locator('.feature-gallery .feature-example').count(), 6);
        assert.equal(await p.locator('.mildliner-group').count(), 5);
        assert.equal(await p.locator('.mildliner-colors .jot-highlight').count(), 25);
        const swatches = await p.locator('.mildliner-colors li').evaluateAll((rows) => rows.map((row) => row.dataset.hex));
        const reference = await p.evaluate(async () => Object.values((await import('/jot/palettes.mjs')).mildlinerPalettes).flat().map(([, hex]) => '#' + hex.toLowerCase()));
        assert.deepEqual(swatches, reference); assert.ok(swatches.includes('#fe5b05'));
        assert.ok(await p.locator('.feature-example .jot-colors[data-ink]').count() >= 4);
        assert.ok(await p.locator('.feature-example .jot-highlight').count() >= 4);
        assert.ok(await p.locator('.feature-example .jot-task-completed').count() > 0);
        assert.ok(await p.locator('.feature-example table').count() > 0);
        assert.ok(await p.locator('.feature-example .jot-footnotes').count() > 0);
        assert.ok(await p.locator('.feature-example .jot-measure').count() > 0);
        const preview = await p.$eval('#sample-page', (page) => ({ paper: getComputedStyle(page).backgroundColor, font: getComputedStyle(page).fontFamily }));
        assert.equal(preview.paper, mode === 'light' ? 'rgb(255, 253, 246)' : 'rgb(36, 38, 34)'); assert.match(preview.font, /Jot Caveat/);
        const html = await p.$eval('#feature-preview-0', async (page) => {
          const { exportHTML } = await import('/jot/export.mjs'); return exportHTML(page, { title: 'Paper and ink' });
        });
        assert.match(html, /data:font\/woff2;base64,/); assert.ok(!/<link|<script/.test(html));
        const standalone = await browser.newPage({ colorScheme: mode }); const requests = [];
        standalone.on('request', (r) => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
        await standalone.setContent(html); await standalone.evaluate(() => document.fonts.ready);
        assert.equal(await standalone.$eval('main.jot-hand', (page) => getComputedStyle(page).backgroundColor), preview.paper);
        await standalone.emulateMedia({ media: 'print' });
        assert.equal(await standalone.$eval('main.jot-hand', (page) => getComputedStyle(page).backgroundColor), 'rgb(255, 255, 255)');
        const printedInk = await standalone.$eval('.jot-colors[data-ink]', (span) => {
          const ctx = document.createElement('canvas').getContext('2d'); ctx.fillStyle = getComputedStyle(span).color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data];
        });
        assert.deepEqual(printedInk, [36, 90, 194, 255], 'print keeps the original blue ink, including from dark mode');
        assert.deepEqual(requests, [], 'exported paper and fonts are standalone'); await standalone.close();
        await p.locator('.feature-example details').first().locator('summary').click();
        assert.ok(await p.locator('.feature-example details[open] code').first().isVisible(), 'source is readable without an editor');
        await p.emulateMedia({ media: 'print' });
        assert.equal(await p.$eval('#sample-page', (page) => getComputedStyle(page).backgroundColor), 'rgb(255, 255, 255)', 'print uses light paper in either scheme');
        await p.emulateMedia({ media: 'screen' });
      }
      const axePath = path.join(__dirname, '../node_modules/axe-core/axe.min.js');
      if (fs.existsSync(axePath)) {
        await p.addScriptTag({ path: axePath });
        const issues = await p.evaluate(async () => (await axe.run()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`));
        assert.deepEqual(issues, [], `${mode} ${route}: accessibility`);
      }
      await p.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: shared cream/charcoal handwritten paper, plain writer shell, homepage color and feature examples without an editor, print, mobile width and accessibility across six routes in both modes.');
  } finally { await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); srv.close(); process.exitCode = 1; });
