// Physical sizing, accessible editing, file round trips and shared-renderer export in Chromium.
// Run from the project root: node site/test-layout-ui.cjs
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const os = require('node:os'), { execFileSync } = require('node:child_process');
const srv = http.createServer((q, r) => {
  let f = path.resolve(root, '.' + decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root + path.sep)) { r.writeHead(403); return r.end(); }
  if (!path.extname(f)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, b) => {
    if (e) { r.writeHead(404); return r.end(); }
    r.setHeader('Content-Type', ({ '.mjs': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2' })[path.extname(f)] || 'application/octet-stream'); r.end(b);
  });
});
(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch(), errors = [];
  try {
    const p = await browser.newPage({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(base + '/editor/');
    await p.waitForFunction(() => document.querySelector('#page').jotGrid);
    assert.equal(await p.getAttribute('#tab-page', 'aria-selected'), 'true');
    assert.match(await p.textContent('#layout-summary'), /38 rows per page/);
    const template = { v: 1, title: 'Grid test', month: '2026-10', per: 'day', layout: { paper: 'A5', pitchMm: 5, marginMm: 8 }, zones: { day: [
      { id: 'notes', type: 'writing', title: 'Notes', minRows: 8, gapAfter: 2 },
      { id: 'tasks', type: 'checks', title: 'Care', labels: ['Read', 'Walk'], minRows: 6, newPage: 'yes' },
    ] } };
    await p.setInputFiles('#open-file', { name: 'grid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(template)) });
    const ready = () => p.waitForFunction(() => { const g = document.querySelector('#page [data-block-id="notes"]'); return g && g.dataset.usedRows && document.querySelector('#page').jotGrid && g.querySelector('.layout-resize'); });
    await ready();
    const metrics = () => p.evaluate(() => {
      const page = document.querySelector('#page'), group = (id) => page.querySelector(`[data-block-id="${id}"]`);
      const scale = Number(document.querySelector('#paper-stage').dataset.scale);
      return { pitch: page.jotGrid.pitch, height: group('notes').getBoundingClientRect().height / scale, rows: +group('notes').dataset.usedRows,
        careStart: +group('tasks').dataset.startRow, text: page.textContent, free: document.querySelector('#layout-summary').textContent };
    });
    let m = await metrics();
    assert.ok(Math.abs(m.height - 8 * m.pitch) < .1, '8 rows reserve exactly 8 pitches');
    assert.equal(m.careStart % 38, 0, 'explicit page start is on the next page');
    assert.match(m.free, /2 pages/);
    await p.locator('#page [data-block-id="notes"]').click({ position: { x: 10, y: 10 } });
    await p.fill('#block-rows', '10'); await p.dispatchEvent('#block-rows', 'change'); await ready();
    assert.equal((await metrics()).rows, 10);
    await p.click('#undo'); await ready(); assert.equal((await metrics()).rows, 8);
    await p.click('#redo'); await ready(); assert.equal((await metrics()).rows, 10);
    await p.locator('#page [data-block-id="notes"] .layout-resize').focus(); await p.keyboard.press('ArrowDown'); await ready();
    assert.equal((await metrics()).rows, 11, 'keyboard sizing adds one grid row');
    const handle = p.locator('#page [data-block-id="notes"] .layout-resize');
    await handle.scrollIntoViewIfNeeded(); const box = await handle.boundingBox();
    const scale = await p.$eval('#paper-stage', (e) => +e.dataset.scale);
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 2 * m.pitch * scale, { steps: 4 }); await p.mouse.up(); await ready();
    assert.equal((await metrics()).rows, 13, 'drag snaps to two additional rows');
    await p.fill('#block-rows', '32'); await p.dispatchEvent('#block-rows', 'change'); await ready();
    assert.equal((await metrics()).careStart, 38, 'a forced page start at an existing boundary does not add a blank page');
    await p.fill('#block-rows', '45'); await p.dispatchEvent('#block-rows', 'change'); await ready();
    assert.equal((await metrics()).rows, 45); assert.match(await p.textContent('#layout-summary'), /oversized blocks continue/);
    await p.fill('#block-rows', '8'); await p.dispatchEvent('#block-rows', 'change'); await ready();
    await p.fill('#block-rows', '0'); await p.dispatchEvent('#block-rows', 'change'); await ready(); assert.equal((await metrics()).rows, 1, 'Auto releases reserved space');
    await p.fill('#block-rows', '8'); await p.dispatchEvent('#block-rows', 'change'); await ready();
    await p.locator('.page-settings summary').click();
    await p.selectOption('#layout-pitch', '6'); await ready();
    assert.match(await p.textContent('#layout-summary'), /32 rows per page/);
    await p.selectOption('#layout-paper', 'Letter'); await ready();
    await p.selectOption('#layout-pitch', '5'); await ready();
    await p.fill('#layout-margin', '12'); await p.dispatchEvent('#layout-margin', 'change'); await ready();
    const jot = await p.textContent('#jot');
    assert.match(jot, /"paper":"Letter","pitchMm":5,"marginMm":12/);
    // Reopening a journal restores layout and sizing without regenerating its writing.
    await p.setInputFiles('#open-file', { name: 'grid.jot', mimeType: 'text/plain', buffer: Buffer.from(jot) }); await ready();
    assert.equal((await metrics()).rows, 8);
    assert.equal(await p.inputValue('#layout-paper'), 'Letter');
    assert.equal(await p.inputValue('#block-rows'), '8');
    // One-day file into Write: the geometry and hints are read from the document itself.
    const w = await browser.newPage({ acceptDownloads: true }); w.on('pageerror', (e) => errors.push(e.message));
    await w.goto(base + '/write/');
    await w.setInputFiles('#openFile', { name: 'grid.jot', mimeType: 'text/plain', buffer: Buffer.from(jot) });
    await w.waitForFunction(() => document.querySelector('#paperPreview [data-block-id="notes"]')?.dataset.usedRows);
    assert.equal(await w.inputValue('#journalPaper'), 'Letter'); assert.equal(await w.inputValue('#pitch'), '5');
    assert.equal(await w.$eval('#paperPreview [data-block-id="notes"]', (e) => +e.dataset.usedRows), 8);
    await w.selectOption('#look', 'typed'); await w.reload();
    await w.waitForFunction(() => document.querySelector('#paperPreview [data-block-id="notes"]')?.dataset.usedRows);
    assert.equal(await w.inputValue('#look'), 'hand', 'saved layout is restored after unrelated typed preferences');
    // Every hand and pitch keeps a checkbox in the first grid cell and visible text between the dot rows.
    for (const hand of ['pen', 'print', 'marker']) for (const pitch of ['4', '5', '6', '7']) {
      await w.selectOption('#hand', hand); await w.selectOption('#pitch', pitch);
      await w.$eval('#paperPreview', async (page) => { await page.jotReady; });
      const alignment = await w.$eval('#paperPreview', (page) => {
        const row = page.querySelector('.jot-task'), box = row.querySelector('.hw-box'), text = row.querySelector('.jot-task-text');
        const r = row.getBoundingClientRect(), b = box.getBoundingClientRect(), p = page.jotGrid.pitch;
        const word = text.querySelector('.hw-w'), probe = document.createElement('span');
        probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; word.append(probe);
        const style = getComputedStyle(word), canvas = document.createElement('canvas'), context = canvas.getContext('2d');
        context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const ink = context.measureText(word.textContent), baseline = probe.getBoundingClientRect().top; probe.remove();
        return { pitch: p, boxX: b.left + b.width / 2 - r.left, boxY: b.top + b.height / 2 - r.top,
          textX: text.getBoundingClientRect().left - r.left, inkY: baseline - (ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2 - r.top,
          phase: parseFloat(page.style.getPropertyValue('--hw-dy')), rowHeight: r.height };
      });
      assert.ok(Math.abs(alignment.boxX - alignment.pitch / 2) < .1, `${hand}/${pitch}: checkbox column centre`);
      assert.ok(Math.abs(alignment.boxY - alignment.pitch / 2) < .1, `${hand}/${pitch}: checkbox row centre`);
      assert.ok(Math.abs(alignment.textX - alignment.pitch) < .1, `${hand}/${pitch}: text begins at the next column`);
      assert.ok(Math.abs(alignment.inkY - alignment.pitch / 2) < 2, `${hand}/${pitch}: visible text centred in the row (${alignment.inkY})`);
      assert.ok(Math.abs(alignment.rowHeight - alignment.pitch) < .1, `${hand}/${pitch}: one row per short task`);
      assert.ok(Math.abs(alignment.phase + alignment.pitch / 2) < .01, `${hand}/${pitch}: dot rows mark cell boundaries`);
    }
    await w.selectOption('#hand', 'pen'); await w.selectOption('#pitch', '5');
    await w.$eval('#paperPreview', async (page) => { await page.jotReady; });
    const emptyAndWrapped = await w.evaluate(async () => {
      const { parse } = await import('/jot/jot.mjs');
      const { renderPreview } = await import('/jot/preview.mjs');
      const page = document.createElement('article'); page.className = 'paper-preview'; page.style.width = '250px'; document.body.append(page);
      renderPreview(parse('[ ] ' + 'A longer task that wraps onto several grid rows. '.repeat(8) + '\n\n[ ] \n[ ] \n'), page, { hand: { hand: 'pen', pitchMm: 5 } });
      await page.jotReady;
      const row = page.querySelector('.jot-task'), r = row.getBoundingClientRect(), box = row.querySelector('.hw-box').getBoundingClientRect();
      const empty = [...page.querySelectorAll('.jot-blank-line')].map((line) => {
        const b = line.querySelector('.hw-box').getBoundingClientRect(), rect = line.getBoundingClientRect();
        return { height: rect.height, x: b.left + b.width / 2 - rect.left, y: b.top + b.height / 2 - rect.top };
      });
      const result = { pitch: page.jotGrid.pitch, wrappedHeight: r.height, wrappedBoxY: box.top + box.height / 2 - r.top, empty }; page.remove(); return result;
    });
    assert.ok(emptyAndWrapped.wrappedHeight > emptyAndWrapped.pitch * 2, 'the task actually wraps');
    assert.ok(Math.abs(emptyAndWrapped.wrappedBoxY - emptyAndWrapped.pitch / 2) < .1, 'wrapped task keeps its checkbox centred in the first row');
    assert.equal(emptyAndWrapped.empty.length, 2);
    for (const row of emptyAndWrapped.empty) {
      assert.ok(Math.abs(row.height - emptyAndWrapped.pitch) < .1, 'an empty task line uses one grid row');
      assert.ok(Math.abs(row.x - emptyAndWrapped.pitch / 2) < .1 && Math.abs(row.y - emptyAndWrapped.pitch / 2) < .1, 'empty checkboxes are centred in their grid cells');
    }
    const download = w.waitForEvent('download'); await w.click('#exportPage'); const d = await download;
    const html = fs.readFileSync(await d.path(), 'utf8');
    assert.match(html, /data-min-rows="8"/); assert.match(html, /@page \{ size: 215.9mm 279.4mm/);
    assert.ok(!html.includes('layout-resize'), 'editing controls never enter the exported page');
    const exported = await browser.newPage(); await exported.setContent(html); await exported.evaluate(() => document.fonts.ready);
    const exportedSize = await exported.$eval('[data-block-id="notes"]', (e) => e.getBoundingClientRect().height);
    assert.ok(Math.abs(exportedSize - 8 * m.pitch) < .1, 'HTML preserves the physical block height');
    const pdfDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-layout-'));
    try {
      const pdfPath = path.join(pdfDir, 'grid.pdf');
      await exported.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
      const pages = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8' }).split('\f').filter((p) => p.trim());
      assert.equal(pages.length, 2, 'the exported physical layout prints as two pages');
      assert.match(pages[0], /Notes/); assert.match(pages[1], /Care/);
      assert.ok(!pages.join('').includes('Resize'), 'editor controls do not print');
    } finally { fs.rmSync(pdfDir, { recursive: true, force: true }); }
    // Content grows beyond its minimum without clipping or dropping following blocks.
    const expanded = jot.replace('#### Notes', '#### Notes\n\n' + Array(45).fill('A full line of writing.').join('\n\n'));
    w.on('dialog', (d) => d.accept());
    await w.setInputFiles('#openFile', { name: 'expanded.jot', mimeType: 'text/plain', buffer: Buffer.from(expanded) });
    await w.waitForFunction(() => +document.querySelector('#paperPreview [data-block-id="notes"]')?.dataset.usedRows > 8);
    assert.equal(await w.locator('#paperPreview [data-block-id="tasks"]').count(), 1);
    // The physical page fits a phone without horizontal document scroll.
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(100);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    const axePath = path.join(__dirname, '../node_modules/axe-core/axe.min.js');
    if (fs.existsSync(axePath)) {
      await p.addScriptTag({ path: axePath });
      const violations = await p.evaluate(async () => (await axe.run()).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id));
      assert.deepEqual(violations, []);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: grid geometry, page starts, Auto, undo/redo, keyboard and drag sizing, overflow, .jot round trips, Write, standalone HTML and PDF, phone width, accessibility and text/checkbox alignment across all hands and grid pitches.');
  } finally { await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); srv.close(); process.exitCode = 1; });
