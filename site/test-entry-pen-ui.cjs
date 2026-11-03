// Pen and ink for one entry: the dialog, the preview, the live editor's chip, undo, and earlier entries left as they were.
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
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } }), errors = [], remote = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:')) remote.push(request.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/write/`); await require('./test-source-workspace.cjs')(page);
    await page.waitForFunction(() => !!document.getElementById('writing').jotSetMode);
    const text = '### 2026-11-01 | Sun\n\nOne\n\n### 2026-11-02 | Mon\n\nTwo\n\n### 2026-11-03 | Tue\n\nThree\n';
    await page.fill('#writing', text);
    await page.$eval('#look', (s) => { s.value = 'hand'; s.dispatchEvent(new Event('change')); });
    const earlier = text.slice(0, text.indexOf('### 2026-11-02'));
    const style = () => page.$$eval('#paperPreview p', (ps) => ps.map((p) => { const c = getComputedStyle(p); return [p.textContent.trim(), c.fontFamily.split(',')[0].replace(/"/g, ''), c.color]; }));
    await page.waitForFunction(() => document.querySelectorAll('#paperPreview p').length >= 3);
    const before = await style();

    // Undated writing is refused without opening the dialog.
    await page.locator('#writing').evaluate((editor) => editor.setSelectionRange(0, 0));
    await page.fill('#writing', 'Undated.'); await page.click('#entryPenBtn');
    assert.equal(await page.$eval('#entryPenDialog', (d) => d.open), false); assert.match(await page.textContent('#journalNotice'), /dated entry/);
    await page.fill('#writing', text);

    await page.locator('#writing').evaluate((editor, at) => editor.setSelectionRange(at, at), text.indexOf('Two'));
    await page.click('#entryPenBtn');
    assert.match(await page.textContent('#entryPenHeading'), /2026-11-02/); assert.match(await page.textContent('#entryPenNow'), /page settings/);
    await page.selectOption('#entryPenHand', 'script10'); await page.selectOption('#entryPenInk', 'green');
    for (const mode of ['light', 'dark']) {
      await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: mode });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.addScriptTag({ path: path.join(__dirname, '../node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.getElementById('entryPenDialog'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id));
      assert.deepEqual(violations, []);
    }
    await page.setViewportSize({ width: 1100, height: 900 }); await page.emulateMedia({ colorScheme: 'light' });
    await page.click('#entryPenForm button[type=submit]');
    const written = await page.inputValue('#writing');
    assert.ok(written.startsWith(earlier), 'earlier entries are byte for byte the same');
    assert.match(written, /### 2026-11-02 \| Mon\n\n@hand: script10\n@ink: green\n\nTwo/);
    assert.match(written, /### 2026-11-03 \| Tue\n\n@hand: default\n@ink: default\n\nThree/);
    assert.match(await page.textContent('#journalNotice'), /Earlier entries are unchanged/);
    await page.waitForFunction(() => [...document.querySelectorAll('#paperPreview p')].some((p) => p.textContent.trim() === 'Two' && getComputedStyle(p).fontFamily.includes('Jot Script 10')));
    const after = await style();
    assert.deepEqual(after.find((p) => p[0] === 'One'), before.find((p) => p[0] === 'One'), 'the earlier entry looks the same');
    assert.deepEqual(after.find((p) => p[0] === 'Three'), before.find((p) => p[0] === 'Three'), 'the next entry looks as it did');
    assert.equal(after.find((p) => p[0] === 'Two')[2], 'rgb(29, 92, 58)');
    const heading = await page.$eval('#paperPreview h3:nth-of-type(2)', (h) => getComputedStyle(h).fontFamily);
    assert.match(heading, /Jot Script 10/, 'the entry heading uses the entry pen');

    // Reopening shows the entry's own choice; a custom colour; and this entry onwards.
    await page.locator('#writing').evaluate((editor, at) => editor.setSelectionRange(at, at), written.indexOf('Two'));
    await page.click('#entryPenBtn'); assert.match(await page.textContent('#entryPenNow'), /Jot Script · 1\.0 · green\. This entry chooses its own/);
    await page.selectOption('#entryPenInk', 'custom'); assert.equal(await page.isVisible('#entryPenColor'), true);
    await page.fill('#entryPenColor', '#8a2d1a'); await page.check('#entryPenOnward'); await page.click('#entryPenForm button[type=submit]');
    assert.match(await page.inputValue('#writing'), /@ink: #8a2d1a/);
    assert.ok((await page.inputValue('#writing')).startsWith(earlier));
    await page.keyboard.press('Control+z'); assert.equal(await page.inputValue('#writing'), written, 'one-step undo');

    // Live editing shows the lines as labelled chips with a Change button.
    await page.evaluate(() => document.getElementById('writing').jotSetMode('live'));
    await page.waitForSelector('#liveWriting .live-pen');
    const chips = await page.$$eval('#liveWriting .live-pen', (list) => list.map((c) => c.textContent));
    assert.ok(chips.some((c) => /Pen: Jot Script · 1\.0/.test(c))); assert.ok(chips.some((c) => /Ink: page setting/.test(c)));
    await page.click('#liveWriting .live-pen button');
    assert.equal(await page.$eval('#entryPenDialog', (d) => d.open), true); assert.match(await page.textContent('#entryPenHeading'), /2026-11-02/);
    await page.click('#entryPenClose');
    // The Format menu offers it too.
    await page.click('#writerFormatTop'); await page.click('#writerFormatMenu >> text=Pen and ink for this entry…');
    assert.equal(await page.$eval('#entryPenDialog', (d) => d.open), true); await page.click('#entryPenClose');
    assert.equal(await page.inputValue('#writing'), written, 'opening and closing never edits');
    assert.deepEqual(errors, []); assert.deepEqual(remote, []);
    console.log('PASS: per-entry pen and ink: dialog, only-this-entry and onward scopes, earlier entries unchanged in source and preview, custom ink, undo, live chips, Format menu, mobile light/dark accessibility.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
