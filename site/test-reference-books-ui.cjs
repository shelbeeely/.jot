// Stubbed Spotify iframe: verify consent, URL handling, persistence and removal without a real account.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + req.url.split('?')[0]);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1100, height: 900 } }), page = await context.newPage(), remote = [], errors = [];
    page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:')) remote.push(request.url()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/write/`);
    await page.waitForFunction(() => document.getElementById('writing').value.length > 0);
    const original = await page.inputValue('#writing');
    await page.click('#referenceBooksBtn'); await page.fill('#referenceBookName', 'places.jot'); await page.click('#referenceBookCreate');
    await page.click('#referenceAddPlace'); await page.fill('#referenceField-label', 'River Café'); await page.fill('#referenceRecordId', 'place-river');
    await page.fill('#referenceField-alias', 'By the water'); await page.fill('#referenceField-address-line1', 'Example Street'); await page.fill('#referenceField-locality', 'London');
    await page.fill('#referenceField-postal-code', 'EX1 1AA'); await page.fill('#referenceField-country-code', 'GB');
    await page.fill('#referenceField-latitude', '91'); await page.fill('#referenceField-longitude', '-0.12');
    await page.fill('#referenceField-timezone', 'Europe/London'); await page.fill('#referenceField-accessibility', 'Step-free entrance');
    await page.click('#referenceSave'); assert.match(await page.textContent('#referenceBooksStatus'), /Latitude/);
    assert.equal(await page.inputValue('#writing'), original);
    await page.fill('#referenceField-latitude', '51.5');
    assert.equal(await page.getAttribute('#referenceMap', 'href'), 'https://www.openstreetmap.org/?mlat=51.5&mlon=-0.12#map=16/51.5/-0.12');
    await page.click('#referenceSave'); await page.getByRole('button', { name: 'River Café · place', exact: true }).waitFor();
    await page.click('#referenceAddPerson'); await page.fill('#referenceField-label', 'Robin'); await page.fill('#referenceRecordId', 'person-robin');
    await page.fill('#referenceField-email', 'robin@example.com\nrobin@work.example'); await page.click('#referenceSave');
    const download = page.waitForEvent('download'); await page.click('#referenceBookDownload');
    const file = await download, bookText = fs.readFileSync(await file.path(), 'utf8');
    assert.equal(file.suggestedFilename(), 'places.jot'); assert.match(bookText, /latitude: 51.5/); assert.match(bookText, /timezone: Europe\/London/);
    assert.match(bookText, /email: robin@example.com\nemail: robin@work.example/);
    await page.check('#referenceBooksRemember'); await page.click('#referenceBooksClose');
    await page.fill('#writing', original + '\n[Meet](#water'); await page.locator('#writing').evaluate((editor) => editor.setSelectionRange(editor.value.length, editor.value.length));
    await page.locator('#localSuggestions:not([hidden])').waitFor();
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.ok((await page.inputValue('#writing')).endsWith('[Meet](places.jot#place-river)'));
    const link = page.locator('#paperPreview a[data-jot-reference="places.jot#place-river"]'); await link.waitFor(); await link.click();
    assert.equal(await page.inputValue('#referenceField-label'), 'River Café'); assert.equal(await page.inputValue('#referenceField-address-line1'), 'Example Street');
    assert.equal(await page.inputValue('#referenceRecordId'), 'place-river'); assert.equal(await page.getAttribute('#referenceRecordId', 'readonly'), '');
    await page.fill('#referenceField-label', 'River Café renamed'); await page.click('#referenceSave');
    await page.click('#referenceBooksClose'); await page.reload();
    await page.click('#referenceBooksBtn'); await page.getByRole('button', {name:'River Café renamed · place', exact:true}).waitFor();
    await page.getByRole('button', {name:'River Café renamed · place', exact:true}).click();
    assert.equal(await page.inputValue('#referenceRecordId'), 'place-river');
    for (const mode of ['light', 'dark']) {
      await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: mode });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.addScriptTag({ path: path.join(__dirname, '../node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.getElementById('referenceBooksDialog'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => ({id:v.id,nodes:v.nodes.map((n) => n.target)})));
      assert.deepEqual(violations, []);
    }
    await page.uncheck('#referenceBooksRemember'); await page.click('#referenceBooksClose');
    const journalDownload = page.waitForEvent('download'); await page.click('#downloadJot'); const journal = fs.readFileSync(await (await journalDownload).path(), 'utf8');
    assert.ok(!journal.includes('Example Street') && !journal.includes('robin@example.com'));
    const exportDownload = page.waitForEvent('download'); await page.click('#exportPage'); const html = fs.readFileSync(await (await exportDownload).path(), 'utf8');
    assert.ok(!html.includes('Example Street') && !html.includes('robin@example.com')); assert.ok(html.includes('places.jot#place-river'));
    await page.reload(); await page.click('#referenceBooksBtn'); assert.equal(await page.locator('#referenceBookSelect option').count(), 0);
    await page.setInputFiles('#referenceBooksFiles', { name: 'places.jot', mimeType:'text/plain', buffer:Buffer.from(bookText) });
    await page.getByRole('button', {name:'River Café · place',exact:true}).waitFor();
    await page.setInputFiles('#referenceBooksFiles', { name: 'places.jot', mimeType:'text/plain', buffer:Buffer.from(bookText) });
    await page.waitForFunction(() => document.getElementById('referenceBooksStatus').textContent.includes('already open'));
    assert.equal(await page.locator('#referenceBookSelect option').count(), 1);
    await page.click('#referenceBooksClose'); assert.deepEqual(remote, []); assert.deepEqual(errors, []);
    const blocked = await browser.newContext();
    await blocked.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw new Error('storage unavailable'); } }));
    const blockedPage = await blocked.newPage();
    await blockedPage.goto(`http://127.0.0.1:${server.address().port}/write/`);
    await blockedPage.click('#referenceBooksBtn'); await blockedPage.fill('#referenceBookName', 'memory.jot'); await blockedPage.click('#referenceBookCreate');
    await blockedPage.waitForFunction(() => document.getElementById('referenceBooksStatus').textContent.includes('Browser storage could not be updated'));
    assert.equal(await blockedPage.locator('#referenceBookSelect option').count(), 1);
    const memoryDownload = blockedPage.waitForEvent('download'); await blockedPage.click('#referenceBookDownload');
    assert.equal((await memoryDownload).suggestedFilename(), 'memory.jot'); await blocked.close();

    console.log('PASS: rich People/Places books, coordinate/timezone validation, stable IDs and multiple contact values, alias completion, resolved local cross-file links, optional persistence, download/reopen/duplicate handling, no private details copied into journal or HTML export, mobile light/dark accessibility and no network requests.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
