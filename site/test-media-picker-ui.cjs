// Add media: offline-first journal matches, online catalogs only after opting in (mocked with saved real responses),
// series and podcast episodes, pasted links, optional activity words, insertion at the cursor with Undo, phone light/dark
// accessibility, and that no journal writing is ever sent.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist'), fixtures = path.join(__dirname, 'fixtures', 'media');
const fixture = (name) => fs.readFileSync(path.join(fixtures, name + '.json'), 'utf8');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [], sent = [], unexpected = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const reply = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
      const request = route.request(), url = request.url();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST' } });
      sent.push(url + ' ' + (request.postData() || ''));
      if (url.startsWith('https://api.tvmaze.com/search/shows')) return reply(route, fixture('tvmaze-search'));
      if (/^https:\/\/api\.tvmaze\.com\/shows\/\d+\/episodes/.test(url)) return reply(route, fixture('tvmaze-episodes'));
      if (url.startsWith('https://openlibrary.org/search.json')) return reply(route, fixture('openlibrary-search'));
      if (url.startsWith('https://graphql.anilist.co')) return reply(route, fixture('anilist-search'));
      if (url.startsWith('https://itunes.apple.com/search')) return reply(route, fixture('itunes-podcasts'));
      if (url.startsWith('https://itunes.apple.com/lookup')) return reply(route, fixture('itunes-episodes'));
      if (url.includes('wikidata.org/w/api.php') && url.includes('list=search')) return reply(route, fixture('wikidata-search'));
      if (url.includes('wikidata.org/w/api.php') && url.includes('wbgetentities')) return reply(route, fixture('wikidata-entities'));
      if (url.startsWith('https://www.youtube.com/oembed')) return reply(route, JSON.stringify({ title: 'A [tricky] *title*', author_name: 'Someone' }));
      unexpected.push(url); return route.abort();
    });
    await page.goto(origin + '/write/'); await require('./test-source-workspace.cjs')(page);
    await page.waitForFunction(() => !!document.getElementById('writing').jotSetMode);
    const writing = 'Private words about my day. I watched [The Matrix (1999)](imdb:tt0133093) once.\n';
    await page.fill('#writing', writing);
    await page.locator('#writing').evaluate((e) => e.setSelectionRange(e.value.length, e.value.length));
    const open = async () => { await page.evaluate(() => document.getElementById('mediaPickerBtn').click()); await page.waitForFunction(() => document.getElementById('mediaPicker').open); };

    // Offline by default: only this journal is searched, nothing is sent.
    await open();
    assert.equal(await page.isChecked('#mediaOnline'), false);
    await page.fill('#mediaQuery', 'matrix'); await page.press('#mediaQuery', 'Enter');
    await page.waitForFunction(() => document.querySelectorAll('#mediaResults .media-result').length === 1);
    assert.match(await page.textContent('#mediaResults'), /The Matrix \(1999\).*This journal/);
    assert.deepEqual(sent, [], 'nothing is sent until online search is on');

    // Online: a film from Wikidata, with an activity; inserted at the cursor, Undo removes it.
    await page.check('#mediaOnline'); await page.press('#mediaQuery', 'Enter');
    await page.waitForFunction(() => document.getElementById('mediaStatus').textContent.includes('from Wikidata'));
    await page.locator('#mediaResults .media-result', { hasText: 'Reloaded' }).click();
    await page.selectOption('#mediaActivity', 'Watched');
    assert.equal(await page.inputValue('#mediaText'), 'Watched [The Matrix Reloaded (2003)](https://www.wikidata.org/wiki/Q189600)');
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.getElementById('mediaPicker'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)), []);
      assert.ok(await page.evaluate(() => document.getElementById('mediaPicker').getBoundingClientRect().right <= innerWidth));
    }
    await page.emulateMedia({ colorScheme: 'light' });
    await page.click('#mediaInsert');
    assert.equal(await page.inputValue('#writing'), writing + 'Watched [The Matrix Reloaded (2003)](https://www.wikidata.org/wiki/Q189600)');
    await page.locator('#writing').focus(); await page.keyboard.press('Control+z');
    assert.equal(await page.inputValue('#writing'), writing, 'Undo removes it');

    // A TV episode: series, then its episodes, filtered.
    await open(); await page.selectOption('#mediaKind', 'tv'); await page.fill('#mediaQuery', 'severance'); await page.press('#mediaQuery', 'Enter');
    await page.waitForFunction(() => document.getElementById('mediaStatus').textContent.includes('from TVmaze'));
    await page.locator('#mediaResults .media-result', { hasText: 'Severance (2022)' }).first().click();
    await page.waitForFunction(() => document.getElementById('mediaStatus').textContent.includes('episodes. Type'));
    await page.fill('#mediaFilter', 'perpetuity');
    await page.waitForFunction(() => document.querySelectorAll('#mediaResults .media-result').length === 1);
    await page.click('#mediaResults .media-result');
    assert.equal(await page.inputValue('#mediaText'), '[Severance S1E3: “In Perpetuity”](https://www.tvmaze.com/episodes/2238340)');
    await page.click('#mediaInsert');
    assert.ok((await page.inputValue('#writing')).endsWith('\n[Severance S1E3: “In Perpetuity”](https://www.tvmaze.com/episodes/2238340)'), JSON.stringify(await page.inputValue('#writing')));

    // A book, an anime and a podcast episode.
    for (const [kind, query, pick, expected] of [
      ['book', 'left hand', 'Ursula', '[The Left Hand of Darkness by Ursula K. Le Guin (1969)](https://openlibrary.org/works/OL59800W)'],
      ['anime', 'frieren', 'Beyond', '[Frieren: Beyond Journey’s End (2023)](https://anilist.co/anime/154587)']
    ]) {
      await open(); await page.selectOption('#mediaKind', kind); await page.fill('#mediaQuery', query); await page.press('#mediaQuery', 'Enter');
      await page.waitForFunction(() => /results? from/.test(document.getElementById('mediaStatus').textContent));
      await page.locator('#mediaResults .media-result', { hasText: pick }).first().click();
      assert.equal(await page.inputValue('#mediaText'), expected); await page.click('#mediaClose');
    }
    await open(); await page.selectOption('#mediaKind', 'podcast'); await page.fill('#mediaQuery', 'radiolab'); await page.press('#mediaQuery', 'Enter');
    await page.waitForFunction(() => document.getElementById('mediaStatus').textContent.includes('from Apple'));
    await page.locator('#mediaResults .media-result', { hasText: 'Radiolab' }).first().click();
    await page.waitForFunction(() => document.querySelectorAll('#mediaResults .media-result').length > 0 && document.getElementById('mediaStatus').textContent.includes('episodes. Type'));
    await page.locator('#mediaResults .media-result').first().click();
    assert.match(await page.inputValue('#mediaText'), /^\[Radiolab: “.+”\]\(https:\/\/podcasts\.apple\.com\/podcast\/id152249110\?i=\d+\)$/);
    await page.click('#mediaClose');

    // A pasted YouTube link becomes a short reference with a safely escaped title.
    await open(); await page.fill('#mediaQuery', 'https://youtu.be/dQw4w9WgXcQ'); await page.press('#mediaQuery', 'Enter');
    await page.locator('#mediaResults .media-result', { hasText: 'tricky' }).click();
    assert.equal(await page.inputValue('#mediaText'), '[A \\[tricky\\] \\*title\\* (Someone)](youtube:dQw4w9WgXcQ)');
    await page.click('#mediaClose');

    // Only the typed words went out, to the chosen catalog; never the journal's writing.
    assert.ok(sent.length >= 6);
    for (const request of sent) assert.ok(!/Private|watched|day/i.test(decodeURIComponent(request)), request);
    assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
    console.log('PASS: Add media: journal matches offline, online catalogs only after opting in, film/series episode/book/anime/podcast episode/pasted link, activity words, insertion at the cursor with Undo, escaped titles, phone light/dark accessibility, only typed words sent.');
  } finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); server.close(); process.exitCode = 1; });
