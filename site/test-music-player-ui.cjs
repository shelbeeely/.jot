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
  const { spotifyEmbed } = await import('./dist/music-player.mjs');
  const id = '1234567890abcdefghijkl';
  for (const kind of ['track', 'album', 'playlist', 'artist', 'episode', 'show']) assert.equal(spotifyEmbed(`https://open.spotify.com/intl-en/${kind}/${id}?si=private`), `https://open.spotify.com/embed/${kind}/${id}`);
  for (const url of ['javascript:alert(1)', 'https://evil.test/track/' + id, 'https://open.spotify.com.evil.test/track/' + id, 'http://open.spotify.com/track/' + id, 'https://user@open.spotify.com/track/' + id, 'https://open.spotify.com/track/bad', 'https://open.spotify.com/embed/track/' + id]) assert.equal(spotifyEmbed(url), null, url);
  assert.equal(spotifyEmbed(`spotify: playlist:${id}`), `https://open.spotify.com/embed/playlist/${id}`);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1100, height: 900 } }), page = await context.newPage(), calls = [], errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await context.route('https://open.spotify.com/**', (route) => { calls.push(route.request().url()); return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Mock Spotify</title><button>Play</button>' }); });
    await page.goto(`http://127.0.0.1:${server.address().port}/write/`);
    await page.waitForFunction(() => document.getElementById('writing').value.length > 0);
    const original = await page.inputValue('#writing');
    assert.equal(calls.length, 0);
    await page.click('#musicPlayerBtn'); assert.equal(calls.length, 0);
    await page.fill('#musicPlayerURL', 'https://evil.test/track/' + id); await page.click('#musicPlayerForm button');
    assert.equal(await page.getAttribute('#musicPlayerURL', 'aria-invalid'), 'true'); assert.equal(calls.length, 0);
    await page.fill('#musicPlayerURL', `https://open.spotify.com/playlist/${id}?si=private`); await page.click('#musicPlayerForm button');
    await page.waitForFunction(() => document.querySelector('#musicPlayerFrame iframe')?.contentWindow);
    await page.frameLocator('#musicPlayerFrame iframe').getByRole('button', { name: 'Play', exact: true }).waitFor();
    assert.deepEqual(calls, [`https://open.spotify.com/embed/playlist/${id}`]);
    assert.equal(await page.getAttribute('#musicPlayerFrame iframe', 'referrerpolicy'), 'no-referrer');
    assert.equal(await page.inputValue('#writing'), original);
    await page.evaluate(() => { window.originalMusicFrame = document.querySelector('#musicPlayerFrame iframe'); });
    await page.fill('#writing', original + '\nA new sentence.'); await page.click('#structureTab'); await page.click('#previewTab');
    await page.click('#focusBtn');
    assert.equal(await page.isVisible('#musicPlayer'), true);
    assert.equal(await page.evaluate(() => window.originalMusicFrame === document.querySelector('#musicPlayerFrame iframe')), true);
    assert.equal(calls.length, 1);
    await page.click('#musicPlayerClose'); assert.equal(await page.locator('#musicPlayerFrame iframe').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'writing');
    await page.keyboard.press('Escape');
    await page.click('#musicPlayerBtn');
    await page.fill('#musicPlayerURL', `https://open.spotify.com/track/${id}`); await page.click('#musicPlayerForm button');
    for (const mode of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: mode }); await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
      await page.addScriptTag({ path: path.join(__dirname, '../node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await window.axe.run(document.getElementById('musicPlayer'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id));
      assert.deepEqual(violations, []);
    }
    await page.emulateMedia({ media: 'print' }); assert.equal(await page.isVisible('#musicPlayer'), false);
    await page.emulateMedia({ media: 'screen' });
    const beforeReload = calls.length; await page.reload();
    assert.equal(await page.locator('#musicPlayerFrame iframe').count(), 0); assert.equal(calls.length, beforeReload);
    assert.equal(await page.inputValue('#writing'), original + '\nA new sentence.');
    await page.click('#musicBtn');
    await page.fill('#musicReferences', 'Album | spotify: album:4aawyAB9vmqN3uQ7FjRGTy\nWriting mix | spotify:playlist:37i9dQZF1DXcBWIGoYBM5M\nFilm | imdb:tt0133093\nVideo | youtube:dQw4w9WgXcQ\nVideos | youtube:playlist:PL1234567890abcdef');
    const beforeReferences = await page.inputValue('#writing');
    assert.equal(beforeReferences, original + '\nA new sentence.');
    await page.click('#musicAdd');
    assert.match(await page.inputValue('#writing'), /\[Album\]\(spotify:album:4aawyAB9vmqN3uQ7FjRGTy\)/);
    const album = page.locator('#paperPreview a[href="https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy"]');
    await album.waitFor(); assert.equal(await album.textContent(), 'Album');
    assert.equal(await page.locator('#paperPreview a[href="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"]').count(), 1);
    for (const [href, label] of [['https://www.imdb.com/title/tt0133093/', 'Film'], ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Video'], ['https://www.youtube.com/playlist?list=PL1234567890abcdef', 'Videos']]) {
      const link = page.locator('#paperPreview a').filter({ hasText: label });
      assert.equal(await page.locator('#paperPreview a').evaluateAll((anchors, expected) => anchors.some((a) => a.href === expected), href), true);
      assert.ok(await link.count() >= 1);
    }
    assert.equal(calls.length, beforeReload, 'reading references never fetches Spotify');
    const download = page.waitForEvent('download'); await page.click('#exportPage');
    const html = fs.readFileSync(await (await download).path(), 'utf8');
    assert.ok(html.includes('https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy'));
    assert.ok(html.includes('https://www.imdb.com/title/tt0133093/'));
    assert.ok(html.includes('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    assert.ok(!html.includes('<iframe'));
    assert.deepEqual(errors, []);
    console.log('PASS: approved Spotify URLs only, no remote request before Load, no journal changes or tokens, iframe preserved across edits/views/focus, close removes it, print excluded, reload does not reconnect, mobile light/dark and accessibility. Spotify responses mocked; live playback not verified.');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
