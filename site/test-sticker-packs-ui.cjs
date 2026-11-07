// Stickers and stamps: Jot's own functional pack placed in the line (an image reference with Undo) or free on the page (a
// record after the paragraph, dragged, nudged with the keyboard, sized, turned and removed in the preview, each one edit
// with Undo); a stamp in a chosen ink; attached once however often it is placed, shown in the preview; a pack made from the person's pictures, its words edited, downloaded as a .jotz and
// opened again; keeping a pack in this browser only when asked; phone light/dark accessibility; and no requests outside.
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
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { readDocument } = await import('./dist/jot/container.mjs');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const page = await context.newPage(), errors = [], outside = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => { outside.push(route.request().url()); return route.abort(); });
    await page.goto(origin + '/write/'); await require('./test-source-workspace.cjs')(page);
    await page.waitForFunction(() => !!document.getElementById('stickersBtn'));
    await page.evaluate(() => { document.getElementById('writerViewSplit')?.click(); const s = document.getElementById('look'); s.value = 'typed'; s.dispatchEvent(new Event('change')); });
    const writing = '# 2026-11-07\n\nBus to work';
    await page.fill('#writing', writing);
    await page.locator('#writing').evaluate((e) => e.setSelectionRange(e.value.length, e.value.length));
    const open = async () => { await page.evaluate(() => document.getElementById('stickersBtn').click()); await page.waitForFunction(() => document.getElementById('stickerPicker').open); };
    const choose = async (words, how = 'line', finish = 'sticker') => { await page.locator('#stickerGrid .sticker-choice', { hasText: words }).click(); await page.check(`[name=stickerHow][value=${how}]`); await page.check(`[name=stickerFinish][value=${finish}]`); };

    // Jot's own pack: every sticker has its words beside it.
    await open();
    assert.equal(await page.inputValue('#stickerPack'), 'jot-functional');
    assert.equal(await page.locator('#stickerGrid .sticker-choice').count(), 23);
    assert.equal(await page.locator('#stickerGrid .sticker-choice svg').count(), 23);
    await choose('Bus or transit');
    assert.equal(await page.inputValue('#stickerAlt'), 'Bus or transit');
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.getElementById('stickerPicker'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)), []);
      assert.ok(await page.evaluate(() => document.getElementById('stickerPicker').getBoundingClientRect().right <= innerWidth));
    }
    await page.emulateMedia({ colorScheme: 'light' }); await page.setViewportSize({ width: 1280, height: 900 });
    await page.click('#stickerInsert');
    const placed = '![Bus or transit](assets/stickers/jot-functional/bus.png)';
    await page.waitForFunction((text) => document.getElementById('writing').value.endsWith(text), placed);
    assert.equal(await page.inputValue('#writing'), writing + ' ' + placed);
    assert.equal(await page.evaluate(() => document.getElementById('stickerPicker').open), false);

    // The preview shows the attached picture at sticker size.
    await page.waitForFunction(() => { const img = document.querySelector('#paperPreview img[alt="Bus or transit"]'); return img && img.complete && img.naturalWidth > 0; });
    assert.equal(await page.evaluate(() => document.querySelector('#paperPreview img[alt="Bus or transit"]').naturalWidth), 96);

    // Undo takes it out of the writing.
    await page.locator('#writing').focus(); await page.keyboard.press('Control+z');
    assert.equal(await page.inputValue('#writing'), writing, 'Undo removes it');

    // Placing it twice, with different words, attaches the picture once.
    await page.locator('#writing').evaluate((e) => e.setSelectionRange(e.value.length, e.value.length));
    await open(); await choose('Bus or transit'); await page.click('#stickerInsert');
    await page.locator('#writing').evaluate((e) => { e.setRangeText('\n\nHome again ', e.value.length, e.value.length, 'end'); e.dispatchEvent(new Event('input', { bubbles: true })); });
    await open(); await choose('Bus or transit'); await page.fill('#stickerAlt', 'Bus home'); await page.click('#stickerInsert');
    await page.waitForFunction(() => document.getElementById('writing').value.endsWith('![Bus home](assets/stickers/jot-functional/bus.png)'));
    await open(); await choose('Done'); await page.click('#stickerInsert');
    await page.waitForFunction(() => document.getElementById('writing').value.endsWith('![Done](assets/stickers/jot-functional/done.png)'));
    const journal = page.waitForEvent('download'); await require('./test-source-workspace.cjs').command(page, 'Download journal');
    const saved = await readDocument(new Uint8Array(fs.readFileSync(await (await journal).path())));
    assert.deepEqual(saved.assets.map((a) => a.path).sort(), ['assets/stickers/jot-functional/bus.png', 'assets/stickers/jot-functional/done.png']);
    assert.ok(saved.assets.every((a) => a.mediaType === 'image/png' && a.data[1] === 0x50));

    // Free on the page: a record after the paragraph at the cursor, chosen in the preview, the cursor left in the writing.
    await page.fill('#writing', '# 2026-11-07\n\nBus to work, then a long shift.\n\nEvening walk.');
    await page.locator('#writing').evaluate((e) => e.setSelectionRange(20, 20));
    await open(); await choose('Payday', 'free', 'stamp');
    assert.equal(await page.isVisible('#stickerInk'), true);
    await page.selectOption('#stickerInk', '#24407a'); await page.click('#stickerInsert');
    const record = ':::record attachment #sticker-payday\nmethod: planner-sticker-and-deco-culture@1\npath: assets/stickers/jot-functional/payday-stamp-24407a.png\nmedia-type: image/png\nalt: Payday\nrole: functional\nfinish: stamp\nx: 78%\ny: -3em\nwidth: 4em\n:::\n';
    await page.waitForFunction((r) => document.getElementById('writing').value.includes(r), record);
    assert.equal(await page.inputValue('#writing'), '# 2026-11-07\n\nBus to work, then a long shift.\n\n' + record + '\nEvening walk.');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'writing', 'the cursor stays in the writing');
    const stamp = page.locator('#paperPreview .jot-sticker.jot-placed.jot-finish-stamp');
    await page.waitForFunction(() => { const i = document.querySelector('#paperPreview .jot-sticker.jot-placed img'); return i && i.complete && i.naturalWidth === 96; });
    assert.equal(await stamp.getAttribute('aria-label'), 'Stamp: Payday');
    assert.deepEqual(await stamp.evaluate((f) => [f.style.left, f.style.top, f.style.width, getComputedStyle(f).position]), ['78%', '-3em', '4em', 'absolute']);
    await page.waitForFunction(() => !document.getElementById('stickerPlaceBar').hidden, null, { timeout: 5000 });
    const fieldsOf = () => page.evaluate(() => { const v = document.getElementById('writing').value, f = {}; for (const k of ['x', 'y', 'width', 'rotate']) { const m = new RegExp('\\n' + k + ': ([^\\n]+)').exec(v); f[k] = m ? m[1] : null; } return f; });

    // Dragging writes one change; Undo puts it back.
    const box = await stamp.boundingBox(), [anchorWidth, em] = await stamp.evaluate((f) => [f.parentElement.clientWidth, parseFloat(getComputedStyle(f.parentElement).fontSize)]);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - anchorWidth * 0.28, box.y + box.height / 2 + 2 * em, { steps: 6 }); await page.mouse.up();
    await page.waitForFunction(() => !/\nx: 78%\n/.test(document.getElementById('writing').value));
    let f = await fieldsOf();
    assert.ok(Math.abs(parseFloat(f.x) - 50) <= 0.6 && Math.abs(parseFloat(f.y) + 1) <= 0.1, JSON.stringify(f));
    await page.locator('#writing').focus(); await page.keyboard.press('Control+z');
    await page.waitForFunction((r) => document.getElementById('writing').value.includes(r), record);

    // The keyboard: arrows move it, + makes it larger, ] and [ turn it (a turn back to 0 leaves no rotate line).
    const key = async (name, pattern) => {
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Stamp: Payday'); // focus is back on the picture
      await page.keyboard.press(name); await page.waitForFunction((p) => new RegExp(p).test(document.getElementById('writing').value), pattern);
    };
    await stamp.focus();
    await key('ArrowLeft', '\\nx: 77%\\n'); await key('Shift+ArrowDown', '\\ny: -2em\\n'); await key('+', '\\nwidth: 4\\.5em\\n'); await key(']', '\\nrotate: 5deg\\n');
    await key('[', '^(?![\\s\\S]*\\nrotate:)');
    assert.match(await page.textContent('#journalNotice'), /Payday: turned 0deg\./);
    // The bar beside it: larger, turn left, remove; Undo brings it back.
    await page.click('#stickerPlaceBar [data-do="larger"]'); await page.waitForFunction(() => /\nwidth: 5em\n/.test(document.getElementById('writing').value));
    await page.click('#stickerPlaceBar [data-do="left"]'); await page.waitForFunction(() => /\nrotate: -5deg\n/.test(document.getElementById('writing').value));
    await page.waitForFunction(() => { const fig = document.querySelector('#paperPreview .jot-placed'); return fig.style.width === '5em' && fig.style.transform === 'rotate(-5deg)'; });
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    assert.deepEqual(await page.evaluate(async () => (await axe.run({ include: [['#stickerPlaceBar'], ['#paperPreview .jot-placed']] })).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)), []);
    await page.click('#stickerPlaceBar [data-do="remove"]');
    await page.waitForFunction(() => !document.getElementById('writing').value.includes(':::record'));
    assert.equal(await page.inputValue('#writing'), '# 2026-11-07\n\nBus to work, then a long shift.\n\nEvening walk.');
    assert.equal(await page.isHidden('#stickerPlaceBar'), true);
    await page.locator('#writing').focus(); await page.keyboard.press('Control+z');
    await page.waitForFunction(() => /#sticker-payday[\s\S]*\nwidth: 5em\nrotate: -5deg\n:::/.test(document.getElementById('writing').value));
    // A read-only (locked) journal can't be changed from the preview.
    const before = await page.inputValue('#writing');
    await page.evaluate(() => { document.getElementById('writing').readOnly = true; });
    await stamp.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
    assert.equal(await page.inputValue('#writing'), before);
    await page.evaluate(() => { document.getElementById('writing').readOnly = false; });

    // A pack from the person's own pictures: scaled to sticker size, words checked before placing, kept in the pack.
    const picture = Buffer.from(await page.evaluate(async () => { const c = new OffscreenCanvas(400, 200), x = c.getContext('2d'); x.fillStyle = '#3366aa'; x.fillRect(0, 0, 400, 200); return [...new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())]; }));
    await page.locator('#writing').evaluate((e) => e.setSelectionRange(e.value.length, e.value.length));
    await open();
    await page.evaluate(() => { document.querySelector('.sticker-more').open = true; });
    await page.setInputFiles('#stickerPictures', [{ name: 'rain-cloud.png', mimeType: 'image/png', buffer: picture }, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a picture') }]);
    await page.waitForFunction(() => document.getElementById('stickerStatus').textContent.includes('Made a pack of 1'));
    assert.match(await page.textContent('#stickerStatus'), /notes\.txt: choose PNG/);
    assert.equal(await page.inputValue('#stickerPack'), 'my-stickers');
    await choose('rain cloud'); await page.fill('#stickerAlt', 'A blue rain cloud'); await page.click('#stickerRename');
    await page.waitForFunction(() => document.querySelector('#stickerGrid .sticker-choice').textContent === 'A blue rain cloud');
    await choose('A blue rain cloud'); await page.click('#stickerInsert');
    await page.waitForFunction(() => document.getElementById('writing').value.endsWith('![A blue rain cloud](assets/stickers/my-stickers/rain-cloud.png)'));
    await page.waitForFunction(() => { const img = document.querySelector('#paperPreview img[alt="A blue rain cloud"]'); return img && img.complete && img.naturalWidth === 96 && img.naturalHeight === 48; });

    // Download the pack, remove it, open the file again.
    await open(); await page.evaluate(() => { document.querySelector('.sticker-more').open = true; });
    const packFile = page.waitForEvent('download'); await page.click('#stickerDownload');
    const packPath = await (await packFile).path();
    const packDoc = await readDocument(new Uint8Array(fs.readFileSync(packPath)));
    assert.match(packDoc.source, /:::record attachment #sticker-rain-cloud\nmethod: planner-sticker-and-deco-culture@1\npath: assets\/stickers\/my-stickers\/rain-cloud\.png\nmedia-type: image\/png\nalt: A blue rain cloud\nrole: decorative\n:::/);
    await page.click('#stickerRemove');
    assert.equal(await page.inputValue('#stickerPack'), 'jot-functional');
    await page.setInputFiles('#stickerFile', packPath);
    await page.waitForFunction(() => document.getElementById('stickerStatus').textContent.startsWith('Opened My stickers: 1 sticker.'));
    assert.equal(await page.textContent('#stickerGrid'), 'A blue rain cloud');

    // Kept only when asked: after a reload the pack is there; Jot's own pack can't be removed.
    assert.equal(await page.isChecked('#stickerKeep'), false);
    await page.check('#stickerKeep');
    await page.waitForFunction(() => document.getElementById('stickerStatus').textContent.startsWith('Kept in this browser'));
    await page.reload(); await page.waitForFunction(() => !!document.getElementById('stickersBtn'));
    await open();
    assert.equal(await page.inputValue('#stickerPack'), 'my-stickers');
    assert.equal(await page.textContent('#stickerGrid'), 'A blue rain cloud');
    await page.selectOption('#stickerPack', 'jot-functional');
    assert.equal(await page.isHidden('#stickerRemove'), true);
    await page.click('#stickerClose');

    // A locked (read-only) journal takes no stickers.
    await page.evaluate(() => { document.getElementById('writing').readOnly = true; document.getElementById('stickersBtn').click(); });
    assert.equal(await page.evaluate(() => document.getElementById('stickerPicker').open), false);

    assert.deepEqual(outside, [], 'nothing is fetched from outside');
    assert.deepEqual(errors, []);
    console.log('PASS: Stickers and stamps: placed in the line or free on the page (dragged, nudged, sized, turned, removed, each with Undo; nothing changes while locked), stamps in a chosen ink, attached once, previewed at sticker size; own pictures made into a pack, words edited, downloaded and reopened; kept only when asked; phone light/dark accessibility; no outside requests.');
  } finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); server.close(); process.exitCode = 1; });
