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
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1100, height: 900 } }), page = await context.newPage(), calls = [], errors = [];
    const uuid = '12345678-1234-4234-8234-123456789abc';
    page.on('pageerror', (e) => errors.push(e.message));
    await context.route('https://musicbrainz.org/**', async (route) => {
      const request = route.request(), url = new URL(request.url()), query = url.searchParams.get('query');
      calls.push({ url, query, request });
      assert.equal(request.headers().cookie, undefined); assert.equal(request.headers().referer, undefined);
      if (query === 'Busy') return route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*', 'retry-after': '10' }, json: {} });
      if (query === 'Old') await new Promise((r) => setTimeout(r, 2200));
      await route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*' }, json: { recordings: [{ id: uuid, title: query === 'New' ? 'New result' : '<img src=x onerror=alert(1)> Song', 'artist-credit': [{ name: 'An artist' }], 'first-release-date': '2000', disambiguation: 'live', length: 123000 }] } }).catch(() => {});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/write/`);
    await page.waitForFunction(() => document.getElementById('writing').value.length > 0);
    const original = await page.inputValue('#writing');
    await page.click('#musicBtn'); await page.click('#mediaLookup summary');
    assert.equal(calls.length, 0); assert.equal(await page.isDisabled('#mediaLookupQuery'), true);
    await page.check('#mediaLookupEnabled');
    await page.fill('#mediaLookupQuery', 'So'); await page.waitForTimeout(1200); assert.equal(calls.length, 0);
    await page.fill('#mediaLookupQuery', 'Son'); await page.fill('#mediaLookupQuery', 'Song');
    await page.locator('#mediaLookupResults button').waitFor(); assert.equal(calls.length, 1);
    assert.equal(calls[0].query, 'Song'); assert.ok(!calls[0].url.href.includes('October'));
    assert.equal(await page.locator('#mediaLookupResults img').count(), 0, 'provider text never becomes HTML');
    assert.match(await page.locator('#mediaLookupResults button').textContent(), /An artist.*2000.*live.*2:03/);
    assert.equal(await page.inputValue('#writing'), original);
    await page.locator('#mediaLookupResults button').focus(); await page.keyboard.press('Enter');
    assert.match(await page.inputValue('#musicReferences'), /musicbrainz:recording:12345678/);
    assert.equal(await page.inputValue('#writing'), original);
    await page.click('#musicAdd');
    assert.match(await page.inputValue('#writing'), /musicbrainz:recording:12345678/);
    await page.locator('#paperPreview a[href="https://musicbrainz.org/recording/' + uuid + '"]').waitFor();
    await page.click('#musicBtn'); assert.equal(await page.isChecked('#mediaLookupEnabled'), false, 'closing disables online search');
    await page.check('#mediaLookupEnabled');
    await page.fill('#mediaLookupQuery', 'Old'); await page.waitForFunction(() => document.getElementById('mediaLookupStatus').textContent.includes('Searching'));
    await page.fill('#mediaLookupQuery', 'New'); await page.getByRole('button', { name: 'New result', exact: false }).waitFor();
    await page.waitForTimeout(2300); assert.match(await page.locator('#mediaLookupResults').textContent(), /New result/); assert.ok(!(await page.locator('#mediaLookupResults').textContent()).includes('<img'));
    for (const mode of ['light', 'dark']) {
      await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: mode });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.addScriptTag({ path: path.join(__dirname, '../node_modules/axe-core/axe.min.js') });
      const v = await page.evaluate(async () => (await axe.run(document.getElementById('musicDialog'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id));
      assert.deepEqual(v, []);
    }
    await page.fill('#mediaLookupQuery', 'Busy');
    await page.waitForFunction(() => document.getElementById('mediaLookupStatus').textContent.includes('busy'));
    assert.equal(await page.locator('#mediaLookupResults button').count(), 0);
    const beforeClose = calls.length;
    await page.fill('#mediaLookupQuery', 'Cancel me'); await page.click('#musicClose');
    await page.waitForTimeout(1300); assert.equal(calls.length, beforeClose);
    assert.deepEqual(errors, []);
    console.log('PASS: explicit opt-in, debounce/minimum query, no journal content in search, safe/disambiguated results, keyboard selection into review list only, MusicBrainz shortcode rendering, stale requests cancelled, close disables lookup, busy-service fallback, mobile light/dark accessibility. Provider responses mocked.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
