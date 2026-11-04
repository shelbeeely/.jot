// Offline Writer updates: when a newer version is published, an open Writer offers "Update now", which reloads onto the
// new version in one step (no "close every tab"), keeping the writing. "Later" leaves the current version running.
// The new version is simulated by serving a different offline VERSION (and therefore a changed sw.mjs dependency).
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
let release = 'one';
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    // A "new release" changes the offline version, so the service worker installs a fresh cache and waits.
    if (file === path.join(root, 'offline-files.mjs') && release === 'two') data = Buffer.from(String(data).replace(/export const VERSION = '([^']+)'/, "export const VERSION = '$1-two'"));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await context.newPage(), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(origin + '/write/');
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), null, { timeout: 120000 });
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 60000 });
    const cacheBefore = await page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('jot-app-')));
    assert.equal(await page.$('#jotUpdateBar'), null, 'no update offered when nothing is new');
    await page.waitForFunction(() => !!document.getElementById('writing').jotSetMode);
    await page.evaluate(() => { const e = document.getElementById('writing'); e.value = '### 2026-11-04\n\nKept through the update.\n'; e.dispatchEvent(new Event('input', { bubbles: true })); });

    // Publish a new release; coming back to the page checks for it.
    release = 'two';
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
    await page.waitForSelector('#jotUpdateBar', { timeout: 120000 });
    assert.match(await page.textContent('#jotUpdateBar'), /A new version of Jot is ready/);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    assert.deepEqual(await page.evaluate(async () => (await axe.run(document.getElementById('jotUpdateBar'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)), []);

    // Update now: one tap, the page reloads controlled by the new worker, the old cache is gone, the writing is back.
    await Promise.all([page.waitForEvent('load', { timeout: 60000 }), page.click('#jotUpdateBar >> text=Update now')]);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const cacheAfter = await page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('jot-app-')));
    assert.ok(cacheAfter.some((k) => k.endsWith('-two')), JSON.stringify(cacheAfter));
    assert.ok(!cacheAfter.some((k) => cacheBefore.includes(k)), 'the old version is removed');
    await page.waitForFunction(() => document.getElementById('writing').value.includes('Kept through the update.'), null, { timeout: 30000 });
    assert.equal(await page.$('#jotUpdateBar'), null);
    assert.equal(await page.isVisible('#writerVoiceMic'), true, 'the Speak button is there after updating');
    assert.deepEqual(errors, []);
    console.log('PASS: offline update offered in one tap (no closing every tab), reloads onto the new version, old cache removed, writing kept, accessible bar, nothing offered when nothing is new.');
  } finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); server.close(); process.exitCode = 1; });
