// October in scenes (site/dist/examples/scenes.html): the demo journal's kept scenes in the read-only Scenes view. Every day is
// there with its own title, a scene draws, a thing shows the entry's own sentence, the whole entry opens on paper, nothing can be
// made or sent, no request leaves the site, and a phone gets the same page without sideways scrolling.
const { chromium } = require('playwright'), http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist'), shots = process.env.JOT_SHOTS;
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (e, data) => { if (e) { res.writeHead(404); res.end(); return; } res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(data); });
});
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`, browser = await chromium.launch();
  const source = fs.readFileSync(path.join(__dirname, '..', 'examples', 'demo-month.jot'), 'utf8');
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce', locale: 'en-GB' }), outside = [], errors = [];
    context.on('request', (r) => { if (!r.url().startsWith(origin) && !/^(data|blob):/.test(r.url())) outside.push(r.url()); });
    const page = await context.newPage(); page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(origin + '/examples/scenes.html');
    await page.waitForSelector('#writerScenes .writer-scenes-canvas', { state: 'visible', timeout: 30000 });
    assert.equal(await page.locator('#writerScenes [role=tab]').count(), 7, 'only the first week, the days with a kept scene');
    assert.equal(await page.textContent('#writerScenesSummary'), '7 scenes from 31 days.');
    assert.equal(await page.textContent('#writerScenesTitle'), 'Small things in October');
    assert.equal(await page.textContent('.writer-scenes-headline'), 'A window to begin with', 'the day’s own title');
    assert.equal(await page.textContent('.writer-scenes-counter'), '01 / 07');
    assert.equal(await page.locator('#writerScenesMake, #writerScenesSend, #writerScenesKeep:visible').count(), 0, 'nothing is made, sent or kept here');
    const first = page.locator('.writer-scenes-things button').first(); await first.click();
    for (const line of await page.locator('.writer-scenes-moment li').allTextContents()) assert.ok(source.includes(line.trim()), `a moment is the entry’s own sentence: ${line}`);
    if (shots) await page.screenshot({ path: path.join(shots, 'scenes-page.png') });
    await page.click('#writerScenesJournal');
    assert.match(await page.textContent('.writer-scenes-page'), /window/i); assert.equal(await page.evaluate(() => document.querySelector('.writer-scenes-journal').open), true);
    if (shots) await page.screenshot({ path: path.join(shots, 'scenes-page-journal.png') });
    await page.keyboard.press('Escape');
    await page.click('.writer-scenes-step[aria-label="Next day"]');
    await page.waitForFunction(() => document.querySelector('.writer-scenes-counter')?.textContent === '02 / 07');
    assert.equal(await page.textContent('.writer-scenes-headline'), 'After the rain');
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    assert.deepEqual(await page.evaluate(async () => (await axe.run(document.getElementById('writerScenes'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)), []);
    assert.deepEqual(outside, [], 'no request leaves the site'); assert.deepEqual(errors, []);
    await context.close();
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }), p = await phone.newPage();
    await p.goto(origin + '/examples/scenes.html'); await p.waitForSelector('#writerScenes .writer-scenes-canvas', { state: 'visible', timeout: 30000 });
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scrolling on a phone');
    if (shots) await p.screenshot({ path: path.join(shots, 'scenes-page-phone.png'), fullPage: true });
    await phone.close();
    console.log('scenes page: ok');
  } finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
