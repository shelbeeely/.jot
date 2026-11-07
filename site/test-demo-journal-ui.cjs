// The real month demo, not a replacement fixture: Read, every kept scene and exact moment, offline media,
// save/reopen and mixed protection. Scene authoring uses live OpenRouter separately; this reader test contacts no provider.
// NODE_OPTIONS='-r /workspace/.jot-cloud/system-chromium.cjs' node site/test-demo-journal-ui.cjs
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist'), examples = path.join(__dirname, '../examples');
const shots = process.env.JOT_SHOTS || '/tmp/jot-demo-review';
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jot': 'text/plain', '.jotz': 'application/zip' };
const server = http.createServer((request, response) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(request.url.split('?')[0])); }
  catch { response.writeHead(400); response.end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); response.end(data);
  });
});

(async () => {
  const { readDocument, searchArchive } = await import('../parser/container.mjs');
  const { journalDays, readPlaceFile } = await import('./dist/scene-journal-core.mjs');
  const original = await readDocument(new Uint8Array(fs.readFileSync(path.join(examples, 'demo-month.jotz'))));
  const source = original.source, days = journalDays(source);
  assert.equal(days.length, 31, 'the actual artifact has one dated entry for every October day');
  assert.deepEqual(days.filter(day => day.setting).map(day => day.date), days.slice(1, 7).map(day => day.date), '2 to 7 October keep scenes; the rest is writing only');
  const places = days.map(day => {
    if (!day.setting) return null;
    const asset = original.assets.find(a => a.path === day.setting?.path);
    assert.ok(asset, `${day.date}: its kept scene is attached`);
    const place = readPlaceFile(new TextDecoder().decode(asset.data), day);
    assert.ok(place.objects.some(o => o.moments.length), `${day.date}: the scene holds sentences`);
    assert.ok(place.objects.every(o => o.moments.every(m => !m.missing)), `${day.date}: every moment still matches its entry`);
    return place;
  });
  const mixedBytes = new Uint8Array(fs.readFileSync(path.join(examples, 'demo-month-mixed.jotz')));
  const publicCopy = await readDocument(mixedBytes);
  assert.equal(publicCopy.partial, true);
  assert.doesNotMatch(publicCopy.source, /### 2026-10-31/);
  assert.equal((await searchArchive(publicCopy, { from: '2026-10-31', to: '2026-10-31' })).length, 0);
  publicCopy.index?.close();
  fs.mkdirSync(shots, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`, browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 920 }, acceptDownloads: true, reducedMotion: 'reduce', locale: 'en-GB' });
    const outside = [], errors = [], page = await context.newPage();
    context.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(origin)) outside.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    const command = label => require('./test-source-workspace.cjs').command(page, label);

    await page.goto(origin + '/examples/');
    await page.click('a[href="../write/?open=examples/demo-month.jotz"]');
    await page.waitForFunction(() => /Opened the example demo-month.jotz/.test(document.getElementById('journalNotice').textContent));
    await require('./test-source-workspace.cjs')(page);
    assert.equal(await page.inputValue('#writing'), source, 'Read opens the complete actual source');
    await command('Page preview');
    await page.selectOption('#look', 'typed');
    await page.waitForSelector('#paperPreview .jot-3d-turn');
    // Warm the locally shipped viewers once, as an installed reader does. All later reads have network disabled.
    await page.locator('#paperPreview .jot-3d-turn').first().click();
    await page.waitForSelector('#paperPreview .jot-3d-canvas');
    await page.locator('#paperPreview .jot-3d-tools button').filter({ hasText: 'Back to the picture' }).first().click();
    await page.click('#writerScenesToggle');
    await page.waitForFunction(() => /31 days; 6 with a kept scene/.test(document.getElementById('writerScenesSummary')?.textContent || '')); // it opens on 1 October, which has no scene yet
    assert.equal(await page.locator('#writerScenes [role=tab].has-scene').count(), 6);
    await context.setOffline(true);

    for (let i = 0; i < days.length; i++) {
      const day = days[i], place = places[i];
      await page.locator('#writerScenes [role=tab]').nth(i).click();
      if (!place) { await page.waitForSelector('#writerScenesMake', { state: 'visible' }); assert.equal(await page.isVisible('.writer-scenes-canvas'), false, `${day.date}: no scene is drawn or made without asking`); continue; }
      const held = place.objects.filter(object => object.moments.length);
      await page.waitForFunction(title => document.querySelector('.writer-scenes-about')?.textContent.startsWith(title + '.'), place.title);
      assert.equal(await page.isVisible('#writerScenesMake'), false, `${day.date}: its saved scene needs no model`);
      assert.deepEqual(await page.locator('.writer-scenes-things button').allTextContents(), held.map(object => object.name));
      await page.locator('.writer-scenes-things button').first().click();
      assert.deepEqual(await page.locator('.writer-scenes-moment li').allTextContents(), held[0].moments.map(moment => moment.text), `${day.date}: selecting an object shows exact journal sentences`);
      assert.ok(await page.locator('.writer-scenes-canvas').isVisible(), `${day.date}: the scene renders offline`);
      if ([1, 2, 4, 6].includes(i)) await page.locator('#writerScenes').screenshot({ path: path.join(shots, `scene-${day.date}.png`) });
    }
    await page.locator('#writerScenes [role=tab]').nth(6).click();
    await page.waitForFunction(title => document.querySelector('.writer-scenes-about')?.textContent.startsWith(title + '.'), places[6].title);
    await page.locator('.writer-scenes-things button').first().click();
    await page.locator('.writer-scenes-open').click();
    assert.match(await page.textContent('.writer-scenes-page'), /What a leaf remembers/);
    await page.getByRole('button', { name: 'Close the entry', exact: true }).click();
    await page.click('#writerScenesToggle');

    // Media uses the actual references and activities, with all eight supported kinds represented.
    await command('Media journal');
    assert.deepEqual(await page.locator('#writerMediaKind option').evaluateAll(options => options.map(option => option.value).filter(Boolean)),
      ['film', 'tv', 'book', 'anime', 'podcast', 'game-or-film', 'music', 'video']);
    for (const status of ['want', 'doing', 'done', 'mentioned']) {
      await page.selectOption('#writerMediaStatus', status);
      assert.ok(await page.locator('.writer-media-item').count(), `${status}: the demo has a real matching activity`);
    }
    await page.selectOption('#writerMediaStatus', '');
    await page.locator('#writerMedia').screenshot({ path: path.join(shots, 'media-offline.png') });
    await command('Page preview');
    const paper = page.locator('#paperPreview');
    await paper.locator('img[src^="blob:"]').first().scrollIntoViewIfNeeded();
    await paper.locator('img[src^="blob:"]').first().evaluate(image => image.decode());
    const card = paper.locator('.jot-card-flip');
    assert.equal(await card.getAttribute('open'), null, 'a card answer starts hidden');
    await card.locator('summary').click();
    assert.ok(await card.locator('.jot-card-back').isVisible(), 'the actual card flips offline');
    await card.locator('summary').click();
    const players = await paper.locator('audio, video').evaluateAll(async elements => {
      const result = [];
      for (const media of elements) {
        if (media.autoplay || !media.paused) throw Error('A demo recording played without being asked.');
        media.load();
        await new Promise((resolve, reject) => {
          if (media.readyState >= 2) { resolve(); return; }
          const timer = setTimeout(() => reject(Error('A bundled recording did not decode offline.')), 15000);
          media.addEventListener('loadeddata', () => { clearTimeout(timer); resolve(); }, { once: true });
          media.addEventListener('error', () => { clearTimeout(timer); reject(Error(media.error?.message || 'Media decode failed.')); }, { once: true });
        });
        await media.play(); await new Promise(resolve => setTimeout(resolve, 100)); media.pause();
        result.push({ kind: media.tagName.toLowerCase(), duration: media.duration, position: media.currentTime });
      }
      return result;
    });
    assert.deepEqual(players.map(player => player.kind).sort(), ['audio', 'video']);
    assert.ok(players.every(player => Number.isFinite(player.duration) && player.duration > 0 && player.position > 0), 'bundled audio and video both decode and play offline');
    await paper.locator('.jot-3d-turn').first().click();
    await page.waitForSelector('#paperPreview .jot-3d-canvas');
    assert.equal(await paper.locator('.jot-3d-spot').count(), 3);
    await paper.locator('.jot-3d-spot').last().click();
    assert.match(await paper.locator('.jot-3d-state').first().textContent(), /bench to sit on/);
    await paper.locator('.jot-3d').first().screenshot({ path: path.join(shots, 'garden-offline.png') });
    await paper.locator('.jot-3d-tools button').filter({ hasText: 'Back to the picture' }).first().click();

    // A normal Writer save retains the exact source and every attachment, including the kept scenes.
    const pending = page.waitForEvent('download'); await command('Download journal');
    const download = await pending, bytes = new Uint8Array(fs.readFileSync(await download.path()));
    assert.match(download.suggestedFilename(), /\.jotz$/);
    const saved = await readDocument(bytes);
    assert.equal(saved.source, source);
    assert.equal(saved.assets.length, original.assets.length);
    for (const asset of original.assets) assert.deepEqual(saved.assets.find(other => other.path === asset.path)?.data, asset.data, `${asset.path}: exact bytes survive Writer save`);
    saved.index?.close();
    await page.setInputFiles('#openFile', { name: 'demo-reopened.jotz', mimeType: 'application/zip', buffer: Buffer.from(bytes) });
    await page.waitForFunction(() => /Opened demo-reopened.jotz/.test(document.getElementById('journalNotice').textContent));
    assert.equal(await page.inputValue('#writing'), source);
    // The provided handwriting really reopens with its frozen background and saved strokes; cancel preserves source.
    await command('Live editing'); await command('Write only');
    await page.locator('.annotation-edit').click();
    await page.waitForSelector('#annotationDrawing:not([hidden])');
    assert.match(await page.textContent('#annotationStatus'), /Editing a copy of the stored strokes/);
    assert.ok(await page.locator('#annotationCanvas').evaluate(canvas => canvas.width > 0 && canvas.height > 0));
    await page.uncheck('#annotationPenOnly');
    await page.locator('#annotationCanvas').scrollIntoViewIfNeeded();
    const canvasBox = await page.locator('#annotationCanvas').boundingBox();
    await page.mouse.move(canvasBox.x + canvasBox.width * 0.3, canvasBox.y + canvasBox.height * 0.3);
    await page.mouse.down(); await page.mouse.move(canvasBox.x + canvasBox.width * 0.4, canvasBox.y + canvasBox.height * 0.35, { steps: 5 }); await page.mouse.up();
    await page.click('#annotationUndo'); await page.click('#annotationRedo'); await page.click('#annotationCancel');
    assert.equal(await page.inputValue('#writing'), source, 'cancelled pen edits leave the saved journal unchanged');
    await require('./test-source-workspace.cjs')(page);

    // Unlock the mixed copy without a connection; cancelling first exposes only public source.
    await page.setInputFiles('#openFile', { name: 'demo-month-mixed.jotz', mimeType: 'application/zip', buffer: Buffer.from(mixedBytes) });
    await page.waitForFunction(() => document.getElementById('unlockDialog').open);
    await page.click('#unlockCancel');
    await page.waitForSelector('#lockGate:not([hidden])');
    assert.doesNotMatch(await page.textContent('#archivePublicView'), /### 2026-10-31/);
    assert.equal(await page.inputValue('#writing'), '');
    await page.click('#lockGateUnlock'); await page.fill('#unlockPass', 'jot-demo-only'); await page.click('#unlockGo');
    await page.waitForFunction(() => document.getElementById('writing').value.includes('### 2026-10-31'));
    assert.equal(await page.inputValue('#writing'), source);
    await page.click('#writerScenesToggle');
    await page.locator('#writerScenes [role=tab]').nth(6).click();
    await page.waitForFunction(title => document.querySelector('.writer-scenes-about')?.textContent.startsWith(title + '.'), places[6].title);
    await page.locator('#writerScenes').screenshot({ path: path.join(shots, 'protected-scene-unlocked-offline.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.locator('#writerScenes').evaluate(element => element.getBoundingClientRect().right <= innerWidth + 1), 'the saved scene fits a phone viewport');
    await page.locator('#writerScenes').screenshot({ path: path.join(shots, 'scene-phone-offline.png') });
    await page.setViewportSize({ width: 1280, height: 920 });
    await page.click('#writerScenesToggle');
    // Advance the preference's inactivity timer synthetically; this is not a real-device sleep test.
    await page.clock.install();
    await command('Writing preferences'); await page.selectOption('#prefRelock', '5'); await page.click('#prefsDone');
    await page.clock.fastForward(330001);
    await page.waitForSelector('#lockGate:not([hidden])');
    assert.equal(await page.inputValue('#writing'), '');
    assert.equal(await page.locator('#writerScenes [role=tab]').count(), 0, 'relocking clears the kept scenes view');
    assert.doesNotMatch(await page.textContent('body'), /A month on the table/);
    await page.click('#archivePublicSearch'); await page.fill('#archiveQuery', 'A month on the table'); await page.click('#archiveSearch');
    await page.waitForFunction(() => !document.getElementById('archiveSearch').disabled);
    assert.doesNotMatch(await page.textContent('#archiveResults'), /2026-10-31/);
    await page.click('#archiveClose');
    // The site's link to the protected copy opens it like Open does: the unlock prompt, never public entries taken for the whole journal.
    const linked = await browser.newContext({ locale: 'en-GB' }), viaLink = await linked.newPage();
    viaLink.on('pageerror', error => errors.push('link: ' + error.message)); viaLink.on('dialog', dialog => dialog.accept());
    await viaLink.goto(origin + '/examples/demo.html'); await viaLink.click('a:has-text("Open the protected copy")');
    await viaLink.waitForFunction(() => document.getElementById('unlockDialog')?.open);
    assert.equal(await viaLink.inputValue('#writing'), '', 'nothing shows before a way in');
    await viaLink.click('#unlockCancel'); await viaLink.waitForSelector('#lockGate:not([hidden])');
    assert.doesNotMatch(await viaLink.textContent('#archivePublicView'), /### 2026-10-31/);
    await viaLink.click('#lockGateUnlock'); await viaLink.fill('#unlockPass', 'jot-demo-only'); await viaLink.click('#unlockGo');
    await viaLink.waitForFunction(() => document.getElementById('writing').value.includes('### 2026-10-31'));
    assert.equal(await viaLink.inputValue('#writing'), source);
    await linked.close();
    assert.deepEqual(outside, [], 'reading the complete demo makes no provider request');
    assert.deepEqual(errors, [], 'the real journal opens and renders without page errors');
    console.log(`PASS: real demo Read, the 6 kept scenes and exact moments offline, the other days without one, all eight media kinds, bundled recordings/model/card, save/reopen, offline mixed unlock and relock, the site's protected-copy link. Screenshots: ${shots}`);
    await context.close();
  } finally { original.index?.close(); await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
