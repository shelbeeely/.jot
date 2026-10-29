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
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } }), errors = [], remote = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:')) remote.push(request.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/write/`); await require('./test-source-workspace.cjs')(page);
    await page.waitForFunction(() => !!document.getElementById('writing').jotSetMode);
    const text = '---\nTimezone: America/Los_Angeles\n---\n### 2026-10-28 | Travel\n\no Call at 09:00\n\n### 2026-10-29 | Home\n\no Another call at 09:00\n';
    await page.fill('#writing', text);
    const point = text.indexOf('o Call');
    await page.locator('#writing').evaluate((editor, caret) => editor.setSelectionRange(caret, caret), point);
    await page.click('#entryTimezoneBtn'); assert.match(await page.textContent('#entryTimezoneDefault'), /America\/Los_Angeles/);
    await page.fill('#entryTimezoneValue', 'PST'); await page.click('#entryTimezoneForm button[type=submit]');
    assert.match(await page.textContent('#entryTimezoneStatus'), /IANA/); assert.equal(await page.inputValue('#writing'), text);
    await page.fill('#entryTimezoneValue', 'Europe/London');
    for (const mode of ['light', 'dark']) {
      await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: mode });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.addScriptTag({ path: path.join(__dirname, '../node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.getElementById('entryTimezoneDialog'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id));
      assert.deepEqual(violations, []);
    }
    await page.click('#entryTimezoneForm button[type=submit]');
    const written = await page.inputValue('#writing'); assert.match(written, /@timezone: Europe\/London/);
    assert.ok(written.endsWith(text.slice(text.indexOf('### 2026-10-29'))));
    assert.match(await page.locator('#paperPreview .jot-timezone').first().textContent(), /Europe\/London/);
    assert.match(await page.locator('#paperPreview .jot-timezone').last().textContent(), /America\/Los_Angeles/);
    const download = page.waitForEvent('download'); await page.click('#icsBtn');
    const calendar = fs.readFileSync(await (await download).path(), 'utf8');
    assert.match(calendar, /DTSTART:20261028T090000Z/); assert.match(calendar, /DTSTART:20261029T160000Z/);
    await page.locator('#writing').evaluate((editor) => editor.setSelectionRange(editor.value.indexOf('o Call'), editor.value.indexOf('o Call')));
    await page.click('#entryTimezoneBtn'); await page.click('#entryTimezoneInherit');
    assert.ok(!(await page.inputValue('#writing')).includes('@timezone:'));
    await page.keyboard.press('Control+z'); assert.equal(await page.inputValue('#writing'), written, 'one-step undo');
    await page.fill('#writing', '### 2026-11-01\n@timezone: America/New_York\no Call at 01:30\n');
    await page.click('#icsBtn'); await page.waitForFunction(() => document.getElementById('journalNotice').textContent.includes('ambiguous'));
    await page.fill('#writing', 'An undated preamble.'); await page.click('#entryTimezoneBtn');
    assert.match(await page.textContent('#journalNotice'), /dated entry/); assert.equal(await page.$eval('#entryTimezoneDialog', (dialog) => dialog.open), false);
    assert.deepEqual(errors, []); assert.deepEqual(remote, []);
    console.log('PASS: per-entry timezone editing/default reset, invalid zone rejection, preserved dates/times/other entries, visible zone labels, correct calendar instants, DST ambiguity errors, one-step undo, no device/network fallback, mobile light/dark accessibility.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
