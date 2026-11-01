// Writer controls, local search/navigation and responsive layouts in Chromium. No external service is used.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0])); }
  catch { res.writeHead(400); res.end(); return; }
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/write/`); await require('./test-source-workspace.cjs')(page);
    const rendered = await page.evaluate(async () => {
      const { parse, stringify } = await import('/jot/jot.mjs');
      const { renderPreview } = await import('/jot/preview.mjs');
      const { exportHTML } = await import('/jot/export.mjs');
      const source = '# {{document.filename}}\n\n**{{document.filename}}**. A note[^root].\n\n`{{document.filename}}` and \\{{document.filename}} and {{document.unknown}}.\n\n:::record note\nbody: {{document.filename}}\n:::\n\n![Excerpt](notes/other.jot)\n\nAfter {{document.filename}}.\n\n[^root]: {{document.filename}}\n';
      const ast = parse(source), target = document.createElement('article'); document.body.append(target);
      renderPreview(ast, target, { filename: '/private/folder/root.jotz', include: () => '# {{document.filename}}\n\nAn included note[^inner].\n\n[^inner]: {{document.filename}}\n' });
      const first = { heading: target.querySelector('h1').textContent, strong: target.querySelector('strong').textContent, code: target.querySelector('code').textContent, include: target.querySelector('.jot-include h1').textContent, includeNote: target.querySelector('.jot-include .jot-footnotes').textContent, note: target.querySelector(':scope > .jot-footnotes').textContent, record: target.querySelector('dd').textContent, text: target.textContent, unchanged: stringify(ast) === source };
      renderPreview(parse('# {{document.filename}}'), target, { filename: 'evil<img src=x onerror=alert(1)>.jot' });
      const safe = !target.querySelector('img') && target.textContent === 'evil<img src=x onerror=alert(1)>.jot';
      renderPreview(parse('{{document.filename}}'), target); const missing = target.textContent;
      renderPreview(parse('{{document.filename}}'), target, {filename:'renamed.jot'}); const html = await exportHTML(target, {title:'Journal'});
      target.remove(); return { first, safe, missing, exported: html.includes('renamed.jot') && !html.includes('{{document.filename}}') };
    });
    assert.equal(rendered.first.heading, 'root.jotz'); assert.equal(rendered.first.strong, 'root.jotz');
    assert.equal(rendered.first.code, '{{document.filename}}'); assert.equal(rendered.first.record, '{{document.filename}}');
    assert.equal(rendered.first.include, 'other.jot'); assert.match(rendered.first.includeNote, /other\.jot/); assert.match(rendered.first.note, /root\.jotz/);
    assert.match(rendered.first.text, /After root\.jotz/); assert.match(rendered.first.text, /{{document.unknown}}/);
    assert.equal(rendered.first.unchanged, true); assert.equal(rendered.safe, true); assert.equal(rendered.missing, '{{document.filename}}'); assert.equal(rendered.exported, true);
    const source = '# {{document.filename}}\n\nFrom {{document.filename}}.\n';
    await page.fill('#writing', source); await page.fill('#documentName', 'travel');
    await page.waitForFunction(() => document.querySelector('#paperPreview h1')?.textContent === 'travel.jot');
    assert.equal(await page.inputValue('#writing'), source);
    page.once('dialog', dialog => dialog.accept());
    await page.setInputFiles('#openFile', { name: 'My notes.jot', mimeType: 'text/plain', buffer: Buffer.from(source) });
    await page.waitForFunction(() => document.querySelector('#paperPreview h1')?.textContent === 'My notes.jot');
    await page.reload(); await page.waitForFunction(() => document.querySelector('#paperPreview h1')?.textContent === 'My notes.jot');
    assert.equal(await page.locator('.writer-document-heading #documentName').count(), 1);
    assert.equal(await page.locator('.studio-bar #documentName').count(), 0);
    await page.fill('#documentName', 'renamed.jot'); await page.press('#documentName', 'Enter');
    assert.equal(await page.inputValue('#documentName'), 'renamed');
    await page.waitForFunction(() => document.querySelector('#paperPreview h1')?.textContent === 'renamed.jot');
    await page.fill('#documentName', 'cancelled'); await page.press('#documentName', 'Escape');
    assert.equal(await page.inputValue('#documentName'), 'renamed');
    await require('./test-source-workspace.cjs').command(page, 'Rename document');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'documentName');
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme }); await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const violations = await page.evaluate(async () => (await axe.run(document.querySelector('.writer-document-heading'))).violations.filter(v => ['serious','critical'].includes(v.impact)).map(v => v.id));
      assert.deepEqual(violations, []);
    }
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.writer-document-heading').isVisible(), false);
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({width:1200,height:900});
    assert.equal(await page.inputValue('#writing'), source);
    const { pack } = await import('../parser/container.mjs');
    const packed = await pack({ source, assets: [] });
    page.once('dialog', dialog => dialog.accept());
    await page.setInputFiles('#openFile', { name: 'Collected notes.jotz', mimeType: 'application/zip', buffer: Buffer.from(packed) });
    await page.waitForFunction(() => document.querySelector('#paperPreview h1')?.textContent === 'Collected notes.jotz');
    await page.goto(`http://127.0.0.1:${server.address().port}/editor/`);
    await page.waitForFunction(() => !!document.getElementById('t-title').value);
    const template = { v: 1, title: 'Filename example', month: '2026-11', per: 'month', zones: { front: [{ id: 'filename', type: 'text', body: 'Document: {{document.filename}}' }], day: [] } };
    await page.setInputFiles('#open-file', { name: 'filename-template.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(template)) });
    if (await page.getAttribute('#tab-page', 'aria-selected') !== 'true') await page.click('#tab-page');
    await page.selectOption('#layout-scope', 'file');
    await page.waitForFunction(() => document.getElementById('page').textContent.includes('Document: filename-example-2026-11.jot')); 
    assert.deepEqual(errors, []);

    console.log('Document filename: safe inline rendering, literals, includes/footnotes, export, Writer rename/open/restore and unchanged source pass.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
