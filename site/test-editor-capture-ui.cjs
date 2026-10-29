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
    const context = await browser.newContext({ viewport:{width:1100,height:900}, timezoneId:'America/Los_Angeles', geolocation:{latitude:51.5,longitude:-0.12,accuracy:10}, permissions:['geolocation'] }), page = await context.newPage(), errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/write/`); await require('./test-source-workspace.cjs')(page);
    await page.waitForFunction(() => !!document.getElementById('writing').jotSetMode);
    const source = '---\nTimezone: Asia/Tokyo\n---\n### 2026-10-28\n@timezone: Europe/London\nWriting: ';
    await page.fill('#writing', source); await page.click('#currentTimeBtn');
    const written = await page.inputValue('#writing'); assert.match(written, /Writing: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d)$/);
    assert.match(await page.textContent('#journalNotice'), /Europe\/London/);
    await page.keyboard.press('Control+z'); assert.equal(await page.inputValue('#writing'), source);
    await page.click('#locationCaptureBtn');
    assert.equal(await page.isDisabled('#locationCaptureInsert'), true); assert.equal(await page.inputValue('#writing'), source);
    await page.click('#locationCaptureGet'); await page.waitForFunction(() => !document.getElementById('locationCaptureInsert').disabled);
    assert.match(await page.textContent('#locationCapturePreview'), /Latitude: 51.5/); assert.match(await page.textContent('#locationCapturePreview'), /Accuracy: 10 metres/);
    assert.equal(await page.inputValue('#writing'), source);
    for (const mode of ['light', 'dark']) {
      await page.setViewportSize({width:390,height:844}); await page.emulateMedia({colorScheme:mode});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.addScriptTag({path:path.join(__dirname,'../node_modules/axe-core/axe.min.js')});
      const violations = await page.evaluate(async () => (await axe.run(document.getElementById('locationCaptureDialog'))).violations.filter((v) => ['serious','critical'].includes(v.impact)).map((v) => v.id)); assert.deepEqual(violations, []);
    }
    await page.click('#locationCaptureInsert'); assert.match(await page.inputValue('#writing'), /:::record place #place-capture-/); assert.match(await page.inputValue('#writing'), /accuracy-m: 10/);
    assert.ok(!(await page.inputValue('#writing')).includes('timezone: Europe/London\nlatitude'), 'no place timezone inferred');
    await page.keyboard.press('Control+z'); assert.equal(await page.inputValue('#writing'), source);
    await page.click('#locationCaptureBtn'); await page.click('#locationCaptureGet'); await page.waitForFunction(() => !document.getElementById('locationCaptureSave').disabled);
    await page.click('#locationCaptureSave'); await page.fill('#referenceBookName','captures.jot'); await page.click('#referenceBookCreate');
    await page.locator('#referenceField-latitude').waitFor(); assert.equal(await page.inputValue('#referenceField-latitude'),'51.5'); assert.equal(await page.inputValue('#referenceField-timezone'),'');
    await page.fill('#referenceField-label','A place I visited'); await page.click('#referenceSave');
    await page.getByRole('button',{name:'A place I visited · place',exact:true}).waitFor(); assert.equal(await page.inputValue('#writing'),source);
    await page.click('#referenceBooksClose');
    await page.evaluate(() => { navigator.geolocation.getCurrentPosition = (_success, error) => error({code:1}); });
    await page.click('#locationCaptureBtn'); await page.click('#locationCaptureGet'); assert.match(await page.textContent('#locationCaptureStatus'), /denied/); assert.equal(await page.isDisabled('#locationCaptureInsert'),true); await page.click('#locationCaptureClose');
    await page.evaluate(() => { window.pendingLocation = null; navigator.geolocation.getCurrentPosition = (success) => { window.pendingLocation = success; }; });
    await page.click('#locationCaptureBtn'); await page.click('#locationCaptureGet'); await page.click('#locationCaptureClose');
    await page.evaluate(() => window.pendingLocation({coords:{latitude:1,longitude:1,accuracy:10},timestamp:Date.now()}));
    assert.equal(await page.inputValue('#writing'),source); assert.deepEqual(errors,[]);
    console.log('PASS: Chromium timestamp/offset insertion with one-step undo, explicit one-shot geolocation, review before insertion or saving a separate place, no inferred address/timezone, denial and late-result handling, mobile light/dark accessibility. Browser position is mocked, not live-device verified.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode=1; }).finally(() => server.close());
