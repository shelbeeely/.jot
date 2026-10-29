// Mocked Chromium File System Access handles: tests UI integration, not native picker or physical disk permissions.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0])); }
  catch { res.writeHead(400); res.end(); return; }
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

function installFileAccessMock() {
  const encoder = new TextEncoder(), handles = new Map();
  const state = window.jotDeviceMock = {
    records: {
      opened: { name: 'device-note.jot', bytes: [...encoder.encode('# Device note\n\nOriginal.')], modified: 1, permission: 'granted', writes: 0, aborts: 0 },
      saved: { name: 'saved-note.jot', bytes: [], modified: 1, permission: 'granted', writes: 0, aborts: 0 },
      packaged: { name: 'packaged-note.jotz', bytes: [], modified: 1, permission: 'granted', writes: 0, aborts: 0 },
      bad: { name: 'broken.jotz', bytes: [80, 75, 3, 4], modified: 1, permission: 'granted', writes: 0, aborts: 0 },
    },
    openQueue: [], saveQueue: [], openCalls: 0, saveCalls: 0, permissions: 0, pauseWrite: false, waiting: false,
  };
  const pick = (queue, fallback) => {
    const key = queue.shift() || fallback;
    if (key.startsWith('error:')) throw new DOMException('Mock picker did not complete.', key.slice(6));
    return key;
  };
  const handle = (key) => {
    if (handles.has(key)) return handles.get(key);
    const record = state.records[key];
    const result = {
      kind: 'file', get name() { return record.name; },
      async getFile() { return new File([Uint8Array.from(record.bytes)], record.name, { lastModified: record.modified }); },
      async queryPermission() { return record.permission; },
      async requestPermission() { state.permissions++; return record.permissionAfterRequest || record.permission; },
      async isSameEntry(other) { return other === result; },
      async createWritable() {
        if (record.createError) throw new DOMException('Mock write access failed.', record.createError);
        let pending;
        return {
          async write(value) {
            if (record.writeError) throw new DOMException('Mock write failed.', record.writeError);
            if (value?.type === 'write') value = value.data;
            const bytes = typeof value === 'string' ? encoder.encode(value) : value instanceof Blob ? new Uint8Array(await value.arrayBuffer()) : new Uint8Array(value.buffer || value, value.byteOffset || 0, value.byteLength);
            pending = [...bytes];
            if (state.pauseWrite) { state.waiting = true; await new Promise((resolve) => { state.releaseWrite = () => { state.waiting = false; resolve(); }; }); }
          },
          async close() { record.bytes = pending || []; record.modified++; record.writes++; },
          async abort() { pending = undefined; record.aborts++; },
        };
      },
    };
    handles.set(key, result); return result;
  };
  Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: async () => { state.openCalls++; return [handle(pick(state.openQueue, 'opened'))]; } });
  Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: async (options) => { state.saveCalls++; state.lastSaveOptions = options; return handle(pick(state.saveQueue, 'saved')); } });
}

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`, browser = await chromium.launch();
  try {
    const errors = [], remote = [];
    const create = async (mock = true) => {
      const context = await browser.newContext({ viewport: { width: 1100, height: 900 } }), page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('request', (request) => { if (!request.url().startsWith(base)) remote.push(request.url()); });
      if (mock) await page.addInitScript(installFileAccessMock);
      else await page.addInitScript(() => {
        Object.defineProperty(window, 'showOpenFilePicker', { configurable: true, value: undefined });
        Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: undefined });
      });
      await page.goto(base + '/write/'); await page.waitForFunction(() => !!document.getElementById('saveDevice'));
      return { context, page };
    };
    const command = async (page, label) => {
      await page.click('#writerCommandsBtn'); await page.fill('#writerCommandsSearch', label);
      await page.locator('#writerCommandsList button').filter({ has: page.locator('strong').filter({ hasText: new RegExp('^' + label + '$', 'i') }) }).click();
    };
    const text = (page, key) => page.evaluate((name) => new TextDecoder().decode(Uint8Array.from(window.jotDeviceMock.records[name].bytes)), key);
    const waitSource = (page, expected) => page.waitForFunction((value) => document.getElementById('writing').value === value, expected);
    const sourceMode = async (page) => { if (!await page.isVisible('#writing')) await command(page, 'Source editing'); };

    const { context, page } = await create();
    assert.equal(await page.evaluate(() => window.jotDeviceMock.openCalls + window.jotDeviceMock.saveCalls), 0, 'opening the editor never opens or saves a device file');
    await page.click('#openBtn'); await waitSource(page, '# Device note\n\nOriginal.');
    await sourceMode(page); await page.fill('#writing', '# Device note\n\nEdited on this device.');
    assert.equal(await text(page, 'opened'), '# Device note\n\nOriginal.', 'typing does not write a device file');
    await page.click('#saveDevice');
    await page.waitForFunction(() => window.jotDeviceMock.records.opened.writes === 1);
    assert.equal(await text(page, 'opened'), '# Device note\n\nEdited on this device.');
    assert.equal(await page.evaluate(() => window.jotDeviceMock.saveCalls), 0, 'Save reuses the opened file');
    assert.match(await page.textContent('#deviceFileState'), /device-note\.jot/);

    // Cancellation and denied permission retain the connected file and unsaved writing.
    await page.evaluate(() => window.jotDeviceMock.saveQueue.push('error:AbortError'));
    await command(page, 'Save as');
    assert.equal(await page.inputValue('#writing'), '# Device note\n\nEdited on this device.');
    await page.evaluate(() => { window.jotDeviceMock.records.opened.permission = 'prompt'; window.jotDeviceMock.records.opened.permissionAfterRequest = 'denied'; });
    await page.fill('#writing', '# Device note\n\nPermission was denied.'); await page.click('#saveDevice');
    await page.waitForFunction(() => window.jotDeviceMock.permissions > 0);
    assert.equal(await page.evaluate(() => window.jotDeviceMock.records.opened.writes), 1);
    assert.match(await page.textContent('#deviceFileState'), /permission|denied|allow/i);
    await page.evaluate(() => { window.jotDeviceMock.records.opened.permission = 'granted'; delete window.jotDeviceMock.records.opened.permissionAfterRequest; });

    // A file changed elsewhere is never overwritten, even with an unchanged timestamp.
    await page.evaluate(() => { window.jotDeviceMock.records.opened.bytes = [...new TextEncoder().encode('An external edit.')]; });
    await page.click('#saveDevice'); await page.waitForFunction(() => /changed|conflict|elsewhere/i.test(document.getElementById('deviceFileState').textContent));
    assert.equal(await text(page, 'opened'), 'An external edit.');
    assert.equal(await page.evaluate(() => window.jotDeviceMock.records.opened.writes), 1);
    await command(page, 'Save as'); await page.waitForFunction(() => window.jotDeviceMock.records.saved.writes === 1);
    assert.equal(await text(page, 'saved'), '# Device note\n\nPermission was denied.');
    assert.equal(await text(page, 'opened'), 'An external edit.');

    // A failed open does not adopt its handle or replace the current document.
    await page.evaluate(() => window.jotDeviceMock.openQueue.push('bad'));
    page.once('dialog', (dialog) => dialog.accept()); await page.click('#openBtn');
    await page.waitForFunction(() => /could not|failed|invalid|cannot/i.test(document.getElementById('journalNotice').textContent + document.getElementById('deviceFileState').textContent));
    assert.equal(await page.inputValue('#writing'), '# Device note\n\nPermission was denied.');
    await page.fill('#writing', '# Device note\n\nStill connected to the saved file.'); await page.click('#saveDevice');
    await page.waitForFunction(() => window.jotDeviceMock.records.saved.writes === 2);
    assert.equal(await page.evaluate(() => window.jotDeviceMock.records.bad.writes), 0);

    // The submitted snapshot may finish while newer local edits remain unsaved on the device.
    await page.fill('#writing', 'The submitted snapshot.');
    await page.evaluate(() => { window.jotDeviceMock.pauseWrite = true; }); await page.click('#saveDevice');
    await page.waitForFunction(() => window.jotDeviceMock.waiting);
    await page.fill('#writing', 'Newer local writing.');
    await page.evaluate(() => { window.jotDeviceMock.pauseWrite = false; window.jotDeviceMock.releaseWrite(); });
    await page.waitForFunction(() => window.jotDeviceMock.records.saved.writes === 3);
    assert.equal(await text(page, 'saved'), 'The submitted snapshot.');
    assert.equal(await page.inputValue('#writing'), 'Newer local writing.');
    assert.match(await page.textContent('#deviceFileState'), /new|unsaved|changed|save again/i);
    await context.close();

    // Adding an attachment requires a package destination and leaves the original plain file intact.
    const packaged = await create();
    await packaged.page.click('#openBtn'); await waitSource(packaged.page, '# Device note\n\nOriginal.');
    await packaged.page.setInputFiles('#attachFile', { name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('A local attachment.') });
    await packaged.page.waitForFunction(() => document.getElementById('docExt').textContent === '.jotz');
    await packaged.page.evaluate(() => window.jotDeviceMock.saveQueue.push('packaged'));
    await packaged.page.click('#saveDevice'); await packaged.page.waitForFunction(() => window.jotDeviceMock.records.packaged.writes === 1);
    assert.equal(await text(packaged.page, 'opened'), '# Device note\n\nOriginal.');
    assert.deepEqual(await packaged.page.evaluate(() => window.jotDeviceMock.records.packaged.bytes.slice(0, 2)), [80, 75]);
    assert.equal(await packaged.page.evaluate(() => window.jotDeviceMock.records.opened.writes), 0);
    await packaged.context.close();

    // Unsupported browser APIs keep the existing download path usable.
    const fallback = await create(false);
    await sourceMode(fallback.page); await fallback.page.fill('#writing', 'A portable plain journal.');
    const download = fallback.page.waitForEvent('download'); await fallback.page.click('#saveDevice');
    const result = await download;
    assert.match(result.suggestedFilename(), /\.jot$/);
    assert.equal(fs.readFileSync(await result.path(), 'utf8'), 'A portable plain journal.');
    await fallback.context.close();
    assert.deepEqual(errors, []); assert.deepEqual(remote, []);
    console.log('PASS: mocked File System Access open/adopt, explicit direct Save, Save as cancellation, permissions, external-byte conflict, failed-open isolation, saved-snapshot race, package destination, unsupported download fallback; no real native picker or disk permission verification.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
