// The Media view: gathers every media mention by kind, filters, Open in writing, Add media, the downloadable media
// journal, the phone navigation bar, light/dark accessibility, clearing on lock, and no network requests.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});
const SOURCE = `### 2026-11-01 | Sun

Want to watch [The Matrix (1999)](imdb:tt0133093). Reading [The Left Hand of Darkness by Ursula K. Le Guin (1969)](https://openlibrary.org/works/OL59800W).

### 2026-11-03 | Tue

Watched [The Matrix (1999)](imdb:tt0133093) at last, then [Severance S1E3: “In Perpetuity”](https://www.tvmaze.com/episodes/2238340).

#### Listening

“Yesterday” — The Beatles

[Open in Spotify](spotify:track:3BQHpFgAp4l80e1XslIjNI)

### 2026-11-04 | Wed

Finished [The Left Hand of Darkness by Ursula K. Le Guin (1969)](https://openlibrary.org/works/OL59800W).
`;
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const page = await context.newPage(), errors = [], external = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin)) external.push(r.url()); });
    await page.goto(origin + '/write/'); await require('./test-source-workspace.cjs')(page);
    await page.waitForFunction(() => !!document.getElementById('writing').jotSetMode);
    await page.fill('#writing', SOURCE);

    // The phone navigation bar has Media.
    await page.click('.writer-nav [data-nav="media"]');
    await page.waitForFunction(() => !document.getElementById('writerMedia').hidden);
    assert.equal(await page.getAttribute('.writer-nav [data-nav="media"]', 'aria-current'), 'page');
    assert.match(await page.textContent('#writerMediaSummary'), /4 titles, mentioned 6 times/);
    const groups = await page.$$eval('.writer-media-group h3', (h) => h.map((x) => x.textContent));
    assert.deepEqual(groups, ['Films · 1', 'TV · 1', 'Books · 1', 'Music · 1']);
    assert.match(await page.textContent('.writer-media-group[aria-label="Films"]'), /The Matrix \(1999\)Watched · (?:3 Nov 2026|Nov 3, 2026) · 2 mentions/);
    assert.match(await page.textContent('.writer-media-group[aria-label="Music"]'), /Yesterday by The Beatles/);
    assert.equal(await page.isHidden('#writerVoiceMic'), true);

    // Filters.
    await page.selectOption('#writerMediaStatus', 'doing');
    assert.match(await page.textContent('#writerMediaList'), /Nothing matches/);
    await page.selectOption('#writerMediaStatus', 'done');
    assert.deepEqual(await page.$$eval('.writer-media-item strong', (s) => s.map((x) => x.textContent)), ['The Matrix (1999)', 'The Left Hand of Darkness by Ursula K. Le Guin (1969)']);
    await page.selectOption('#writerMediaStatus', ''); await page.fill('#writerMediaSearch', 'severance');
    await page.waitForFunction(() => document.querySelectorAll('.writer-media-item').length === 1);
    await page.fill('#writerMediaSearch', '');
    await page.waitForFunction(() => document.querySelectorAll('.writer-media-item').length === 4);

    // Accessibility, light and dark.
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.click('.writer-media-group[aria-label="Films"] summary');
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.getElementById('writerMedia'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)), []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.click('.writer-media-group[aria-label="Films"] summary');
    }
    await page.emulateMedia({ colorScheme: 'light' });

    // Open in writing goes to that mention.
    await page.click('.writer-media-group[aria-label="Films"] summary');
    assert.equal(await page.getAttribute('.writer-media-group[aria-label="Films"] .writer-media-link', 'href'), 'https://www.imdb.com/title/tt0133093/');
    await page.locator('.writer-media-group[aria-label="Films"] .writer-media-mentions button').nth(1).click();
    await page.waitForFunction(() => document.documentElement.getAttribute('data-writer-view') === 'write');
    const caret = await page.locator('#writing').evaluate((e) => e.selectionStart);
    assert.ok(SOURCE.slice(caret).startsWith('[The Matrix (1999)](imdb:tt0133093) at last'), SOURCE.slice(caret, caret + 40));

    // Download media journal: a separate .jot; the journal is unchanged.
    await page.click('.writer-nav [data-nav="media"]');
    const downloaded = page.waitForEvent('download'); await page.click('#writerMediaDownload');
    const file = await downloaded; assert.equal(file.suggestedFilename(), 'my-journal-media.jot');
    const text = fs.readFileSync(await file.path(), 'utf8');
    assert.match(text, /^# Media from my-journal/); assert.match(text, /### 2026-11-03 \| Tuesday\n\n- Watched \[The Matrix \(1999\)\]\(imdb:tt0133093\)/);
    assert.equal(await page.inputValue('#writing'), SOURCE);

    // The view follows edits, and Add media opens the picker in the writing.
    await page.locator('#writing').evaluate((e, t) => { e.value = t + '\nPlaying [Hollow Knight](https://www.wikidata.org/wiki/Q22917290).\n'; e.dispatchEvent(new Event('input', { bubbles: true })); }, SOURCE);
    await page.click('.writer-nav [data-nav="media"]');
    await page.waitForFunction(() => /5 titles/.test(document.getElementById('writerMediaSummary').textContent));
    await page.click('#writerMediaAdd');
    await page.waitForFunction(() => document.getElementById('mediaPicker').open);
    await page.click('#mediaClose');

    // Song or album, episode under its show, film under its series, and where in a work, all from the writing.
    const DETAIL = '### 2026-11-05 | Thu\n\nRead [Emma](https://openlibrary.org/works/OL66510W) pp. 40–72, ch. 4.\nWatched [Severance S1E1: Good News About Hell](https://www.tvmaze.com/episodes/2238231) and [Severance S1E2: Half Loop](https://www.tvmaze.com/episodes/2238232) S1E2.\nWatched [The Matrix Reloaded](imdb:tt0234215) (in [The Matrix series](https://www.wikidata.org/wiki/Q1210827)).\nListened to [Come Together](musicbrainz:recording:485bbe7f-d0f7-4ffe-8adb-0f1093dd2dbf) track 1 and [Abbey Road](musicbrainz:release-group:9162580e-5df4-32de-80cc-f45a8d8a9b1d).\n';
    await page.locator('#writing').evaluate((e, t) => { e.value = t; e.dispatchEvent(new Event('input', { bubbles: true })); }, DETAIL);
    await page.click('.writer-nav [data-nav="write"]'); await page.click('.writer-nav [data-nav="media"]');
    await page.waitForFunction(() => document.querySelectorAll('.writer-media-item').length === 6);
    const heads = await page.locator('.writer-media-series > h4').allTextContents();
    assert.deepEqual(heads.sort(), ['Severance · 2', 'The Matrix series · 1']);
    const meta = await page.locator('.writer-media-item summary').allTextContents();
    assert.ok(meta.some((t) => /^Come Together\s*Song · Listened to · track 1/.test(t)), meta.join(' | ')); assert.ok(meta.some((t) => /^Abbey Road\s*Album/.test(t)));
    assert.ok(meta.some((t) => /^Emma\s*Read · pp\. 40–72, ch\. 4/.test(t))); assert.ok(meta.some((t) => /Half Loop\s*Episode · Mentioned · S1E2/.test(t)));
    if (process.env.JOT_SHOTS) await page.locator("#writerMedia").screenshot({ path: path.join(process.env.JOT_SHOTS, "media-detail.png") });
    await page.click('.writer-nav [data-nav="write"]');

    // Empty journal: a plain explanation.
    await page.fill('#writing', 'No media here.');
    await page.click('.writer-nav [data-nav="media"]');
    assert.match(await page.textContent('#writerMediaList'), /No media yet/);
    assert.equal(await page.isDisabled('#writerMediaDownload'), true);

    // Locking clears it.
    await page.locator('#writing').evaluate((e, t) => { e.value = t; e.dispatchEvent(new Event('input', { bubbles: true })); }, SOURCE); await page.click('.writer-nav [data-nav="write"]'); await page.click('.writer-nav [data-nav="media"]');
    await page.waitForFunction(() => document.querySelectorAll('.writer-media-item').length === 4);
    await page.evaluate(() => { document.getElementById('writing').readOnly = true; });
    await page.waitForFunction(() => document.getElementById('writerMedia').hidden && !document.querySelector('.writer-media-item'));

    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log('PASS: Media view on the phone bar, grouped by kind with latest activity and mentions, filters, catalog link, Open in writing at the mention, downloadable media journal (journal unchanged), follows edits, Add media, empty state, clears on lock, light/dark accessibility, no network requests.');
  } finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); server.close(); process.exitCode = 1; });
