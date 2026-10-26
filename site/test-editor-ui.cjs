// The Jot template editor in a real browser (Chromium via Playwright): editing, downloads, keeping the template, phone width, accessibility.
//   node test-editor-ui.cjs [shots-folder]      (axe-core from ../journal/node_modules when present)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, 'dist'), SHOTS = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'jot-editor-'));
const AXE = path.join(__dirname, '../journal/node_modules/axe-core/axe.min.js');
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok   ' + m); };

const srv = http.createServer((q, r) => {
  let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0])));
  if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); });
});

(async () => {
  await new Promise((r) => srv.listen(0, r));
  const URL0 = `http://127.0.0.1:${srv.address().port}/editor/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL0); await p.waitForSelector('#jot:not(:empty)');
  const jot = () => p.textContent('#jot');
  ok(/^---\nJot: 1\.0\nTitle: My journal · /.test(await jot()) && /valid Jot/.test(await p.textContent('#check')), 'opens on a starter, with the .jot text and the check: valid Jot');

  // settings
  await p.fill('#t-title', 'Field notes'); await p.fill('#t-month', '2026-10'); await p.dispatchEvent('#t-month', 'change');
  ok(/Title: Field notes · October 2026/.test(await jot()) && /31 days in this file/.test(await p.textContent('#check')), 'the name and month change the file at once');

  // add a block with the palette, give it a title and labels
  await p.click('[data-act="add"][data-zone="day"]'); await p.waitForSelector('#palette[open]');
  ok(!(await p.$('#palette [data-type="page"]')), 'the day zone does not offer a page title (that is for before or after the days)');
  await p.click('#palette [data-type="checks"]');
  ok(await p.evaluate(() => document.activeElement.matches('.blk-main input')), 'a new block opens with its title focused');
  await p.keyboard.press('Control+a'); await p.keyboard.type('Body care');
  const ta = p.locator('.blk.open textarea[data-list]').first(); await ta.fill('Stretch\nMoisturise');
  ok(/#### Body care\n\n\[ \] Stretch\n\[ \] Moisturise/.test(await jot()), 'typing a title and boxes shows in the file as you type');

  // move, duplicate, remove
  const order = () => p.$$eval('[data-zone="day"] .blk', (els) => els.map((e) => e.querySelector('.blk-main input')?.value || e.querySelector('.blk-summary')?.textContent));
  const before = await order();
  await p.click('[data-zone="day"] .blk:last-child [data-act="up"]');
  const after = await order();
  ok(after[after.length - 2] === 'Body care' && after.length === before.length && await p.evaluate(() => document.activeElement.dataset.act === 'up'), 'Move up moves it and keeps focus on the button');
  ok(/Moved Body care/.test(await p.textContent('#toast')), 'and says so');
  await p.click('[data-zone="day"] .blk:has(input[value="Body care"]) [data-act="dup"]');
  ok((await order()).filter((x) => x === 'Body care').length === 2, 'Duplicate makes a copy below');
  await p.click('[data-zone="day"] .blk:has(input[value="Body care"]) [data-act="del"]');
  ok((await order()).filter((x) => x === 'Body care').length === 1 && await p.evaluate(() => document.activeElement && document.activeElement.tagName === 'BUTTON'), 'Remove takes it out and focus stays in the list');

  // a scale's numbers keep a real range
  await p.click('[data-act="add"][data-zone="day"]'); await p.click('#palette [data-type="scale"]');
  await p.fill('.blk.open input[data-k="min"]', '4'); await p.fill('.blk.open input[data-k="max"]', '2');
  ok(/minimum: 4\nmaximum: 5/.test(await jot()), 'a scale whose top is under its bottom is kept a real range');

  // a file a week
  await p.selectOption('#t-per', 'week');
  ok(!(await p.$eval('#file-pick', (e) => e.hidden)) && (await p.$$eval('#file-sel option', (o) => o.length)) === 5 && /5 files/.test(await p.textContent('#check')), 'a file a week: five files to look at');
  await p.selectOption('#file-sel', '2'); ok(/### 2026-10-12 \| Monday/.test(await jot()) && !/### 2026-10-05/.test(await jot()), 'and each shows its own week');
  const got = []; p.on('download', (d) => got.push(d));
  await p.click('#download'); await p.waitForFunction(() => /Saved 5 \.jot files/.test(document.querySelector('#toast').textContent), null, { timeout: 8000 }); await p.waitForTimeout(400);
  ok(got.length === 5 && got.every((d) => /^field-notes-2026-10-\d\d\.jot$/.test(d.suggestedFilename())), `Download .jot saves five files: ${got.map((d) => d.suggestedFilename()).join(', ')}`);
  const txt = fs.readFileSync(await got[0].path(), 'utf8');
  const { parse } = await import(path.join(ROOT, 'jot/jot.mjs'));
  ok(parse(txt).diagnostics.length === 0 && parse(txt).entries.length === 4, 'the first file is clean Jot with its four days');

  // save and open the template; the browser keeps it
  await p.click('#more'); ok(await p.evaluate(() => document.activeElement.id === 'save-tpl'), 'More opens its menu with focus on the first item');
  const dlT = p.waitForEvent('download'); await p.click('#save-tpl'); const td = await dlT, saved = fs.readFileSync(await td.path(), 'utf8');
  ok(td.suggestedFilename() === 'field-notes.jot-template.json' && JSON.parse(saved).zones.day.length >= 3, 'Save template downloads the template as JSON');
  await p.reload(); await p.waitForSelector('#jot:not(:empty)');
  ok((await p.inputValue('#t-title')) === 'Field notes' && (await p.inputValue('#t-per')) === 'week', 'a reload keeps the template (this browser)');
  await p.click('#starter'); await p.click('#starter-list [data-starter="gratitude"]');
  ok(/#### Small good things\n\n- \n- \n- /.test(await jot()) && (await p.inputValue('#t-title')) === 'Field notes', 'Start from… replaces the blocks and keeps the name');
  const tf = path.join(SHOTS, 'tpl.json'); fs.writeFileSync(tf, saved);
  await p.setInputFiles('#open-file', tf); await p.waitForFunction(() => /Opened Field notes/.test(document.querySelector('#toast').textContent));
  ok(/Body care/.test(await jot()) || (await order()).includes('Body care'), 'Open a template brings it back');
  fs.writeFileSync(tf, '{"nope":1}'); await p.setInputFiles('#open-file', tf); await p.waitForFunction(() => /not a Jot template/.test(document.querySelector('#toast').textContent));
  ok(true, 'a file that is not a template is refused, and the template is untouched');

  // undo and redo
  await p.click('#starter'); await p.click('#starter-list [data-starter="checkin"]');
  const dayTitles = () => p.$$eval('[data-zone="day"] .blk', (els) => els.map((e) => e.querySelector('.blk-main input')?.value || e.querySelector('.blk-summary')?.textContent));
  const t0 = await dayTitles();
  await p.click('[data-zone="day"] .blk:first-child [data-act="del"]');
  ok((await dayTitles()).length === t0.length - 1 && !(await p.$eval('#undo', (b) => b.disabled)), 'a change can be undone (Undo is ready)');
  await p.click('#undo'); ok(JSON.stringify(await dayTitles()) === JSON.stringify(t0) && !(await p.$eval('#redo', (b) => b.disabled)), 'Undo puts the block back; Redo is ready');
  await p.click('#redo'); ok((await dayTitles()).length === t0.length - 1, 'Redo takes it out again');
  await p.focus('#download'); await p.keyboard.press('Control+z'); ok((await dayTitles()).length === t0.length, 'Ctrl+Z undoes outside a text field');
  const ti = p.locator('[data-zone="day"] .blk:first-child .blk-main input'); await ti.fill('Energy level'); await ti.press('End'); await p.keyboard.type(' today');
  await p.click('#undo'); ok((await dayTitles())[0] === t0[0], 'typing in one field undoes as one step');

  // the zone control (the keyboard way across zones)
  await p.click('[data-zone="day"] .blk:first-child [data-act="opts"]');
  await p.selectOption('[data-zone="day"] .blk:first-child select[data-act="zone"]', 'weekEnd');
  ok((await p.$$eval('[data-zone="weekEnd"] .blk-main input', (e) => e.map((x) => x.value))).includes(t0[0]) && await p.evaluate(() => document.activeElement.matches('select[data-act="zone"]')) && /Moved .* to Each week ends/.test(await p.textContent('#toast')), 'Zone moves a block to another zone, keeps focus on the control and says so');
  ok(!(await p.$$eval('[data-zone="weekEnd"] select[data-act="zone"] option', (o) => o.map((x) => x.value))).includes('nope'), 'the control lists only the zones the block can go in');
  await p.click('#undo');

  // dragging (a tall window, so the source and the target are both on screen)
  await p.setViewportSize({ width: 1280, height: 2400 }); await p.evaluate(() => window.scrollTo(0, 0));
  const box = async (sel) => (await p.locator(sel).first().boundingBox());
  const dragTo = async (from, to, below = false) => { const a = await box(from), b = await box(to); await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 12, { steps: 3 }); await p.mouse.move(b.x + 40, b.y + (below ? b.height - 4 : 6), { steps: 10 }); return p; };
  const firstTitle = (await dayTitles())[0], lastSel = '[data-zone="day"] .blk:last-child';
  await dragTo('[data-zone="day"] .blk:first-child .drag', lastSel, true);
  ok(await p.evaluate(() => !!document.querySelector('.blk.dragging') && !document.querySelector('.drop-mark').hidden), 'dragging dims the block and shows where it will land');
  await p.mouse.up(); ok((await dayTitles()).slice(-1)[0] === firstTitle && /Moved .*, 3 of 3/.test(await p.textContent('#toast')), 'dropping below the last block moves it to the end');
  await dragTo(`${lastSel} .drag`, '[data-zone="weekStart"] .blk:first-child'); await p.mouse.up();
  ok((await p.$$eval('[data-zone="weekStart"] .blk-main input', (e) => e.map((x) => x.value)))[0] === firstTitle, 'and across zones');
  await p.click('[data-act="add"][data-zone="front"]'); await p.click('#palette [data-type="page"]');
  await dragTo('[data-zone="front"] .blk:first-child .drag', '[data-zone="day"] .blk:first-child');
  ok(await p.evaluate(() => document.querySelector('.drop-mark').classList.contains('bad')), 'a block that cannot go there shows a warning line');
  await p.mouse.up(); ok((await p.$$eval('[data-zone="front"] .blk', (e) => e.length)) === 1 && /can't go in Each day/.test(await p.textContent('#toast')), 'and stays where it was, saying why');
  // my manual: a block before the days, and the manual on its own
  await p.click('[data-act="add"][data-zone="day"]'); ok(!(await p.$('#palette [data-type="manual"]')), 'the day zone does not offer My manual');
  await p.keyboard.press('Escape');
  await p.click('[data-act="add"][data-zone="front"]'); await p.click('#palette [data-type="manual"]');
  const withManual = await jot();
  ok(/\n## My manual\n\n#### Why I keep this\n/.test(withManual) && /\nEach day:\n\n- /.test(withManual) && /valid Jot/.test(await p.textContent('#check')), 'My manual before the days: its headings, and What I do written from the template; still valid Jot');
  await p.click('#more'); const dlM = p.waitForEvent('download'); await p.click('#dl-manual'); const md = await dlM, mtext = fs.readFileSync(await md.path(), 'utf8');
  ok(md.suggestedFilename() === 'field-notes-manual.jot' && mtext.startsWith('---\nJot: 1.0\nTitle: Field notes · My manual\n') && /Downloaded your manual/.test(await p.textContent('#toast')), 'More → Download my manual gives the manual as its own .jot');

  await p.setViewportSize({ width: 1280, height: 900 });
  // a downloaded .jot brings its template back; a print day layout imports
  await p.selectOption('#t-per', 'month');
  const dl1 = p.waitForEvent('download'); await p.click('#download'); const jd = await dl1, jpath = await jd.path();
  const want = await p.evaluate(() => localStorage.getItem('jot-template-v1'));
  await p.click('#starter'); await p.click('#starter-list [data-starter="blank"]');
  await p.setInputFiles('#open-file', { name: 'field-notes-2026-10.jot', mimeType: 'text/plain', buffer: fs.readFileSync(jpath) });
  await p.waitForFunction(() => /Opened .* from field-notes-2026-10\.jot/.test(document.querySelector('#toast').textContent));
  ok((await p.evaluate(() => localStorage.getItem('jot-template-v1'))) === want, 'opening a downloaded .jot restores its template exactly');
  await p.setInputFiles('#open-file', { name: 'other.jot', mimeType: 'text/plain', buffer: Buffer.from('### 2026-10-01\n\nWritten somewhere else.\n') });
  await p.waitForFunction(() => /no template in it/.test(document.querySelector('#toast').textContent));
  ok((await p.evaluate(() => localStorage.getItem('jot-template-v1'))) === want, 'a .jot made elsewhere is refused, and nothing changes');
  const daypage = { v: 2, blocks: [{ type: 'sky', on: true }, { type: 'scale', title: 'Pain', steps: 6, on: true }, { type: 'checks', title: 'Body care', labels: ['HRT', 'Stretch'], on: true }, { type: 'sudoku', on: true }, { type: 'body', on: true }] };
  await p.click('#more'); ok(await p.isVisible('#import-day'), 'More offers Import a print day layout');
  await p.click('#import-day'); await p.setInputFiles('#open-file', { name: 'daypage.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(daypage)) });
  await p.waitForFunction(() => /Imported 3 blocks into Each day/.test(document.querySelector('#toast').textContent));
  ok(JSON.stringify(await dayTitles()) === JSON.stringify(['Pain', 'Body care', 'Writing']) && /Moon, sun & season, Sudoku/.test(await p.textContent('#toast')), 'daypage.json becomes the Each day blocks, and says what was left out');
  await p.click('#undo'); ok((await p.evaluate(() => localStorage.getItem('jot-template-v1'))) === want, 'and Undo takes the import back');
  await p.selectOption('#t-per', 'month'); await p.screenshot({ path: path.join(SHOTS, 'editor-desktop.png'), fullPage: false });

  // phone width, light and dark, accessibility
  for (const scheme of ['light', 'dark']) {
    const ph = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme }); ph.on('pageerror', (e) => errs.push(e.message));
    await ph.goto(URL0); await ph.waitForSelector('#jot:not(:empty)');
    await ph.click('[data-zone="day"] .blk [data-act="opts"]');
    const wide = await ph.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(wide <= 0, `${scheme}, 390 px: no sideways scroll (${wide})`);
    const small = await ph.$$eval('button, select, input, textarea, a[href], .drag', (els) => els.filter((e) => e.offsetParent && !e.closest('dialog:not([open])')).map((e) => { const r = e.getBoundingClientRect(); return { h: r.height, w: r.width, t: e.id || e.textContent.trim().slice(0, 20) || e.getAttribute('aria-label') }; }).filter((r) => r.h < 40 || r.w < 40).filter((r) => !/^Skip/.test(r.t)));
    ok(small.length === 0, `${scheme}: every control is at least about 44 px` + (small.length ? ': ' + JSON.stringify(small.slice(0, 4)) : ''));
    if (fs.existsSync(AXE)) {
      await ph.addScriptTag({ path: AXE });
      const v = await ph.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => `${x.id}: ${x.nodes.length}`));
      ok(v.length === 0, `${scheme}: axe finds nothing serious` + (v.length ? ': ' + v.join(', ') : ''));
      await ph.click('[data-act="add"][data-zone="front"]'); await ph.waitForSelector('#palette[open]');
      const v2 = await ph.evaluate(async () => (await axe.run(document.querySelector('#palette'), { resultTypes: ['violations'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => x.id));
      ok(v2.length === 0 && await ph.$('#palette [data-type="page"]'), `${scheme}: the block palette passes axe and offers a page title before the days`);
      await ph.keyboard.press('Escape');
    } else console.log('-- axe-core not found (npm ci in journal/): accessibility scan not run');
    await ph.screenshot({ path: path.join(SHOTS, `editor-phone-${scheme}.png`), fullPage: false });
    await ph.close();
  }
  // the workspace (site root): plain .jot without attachments, one .jotz with them (spec draft 3)
  { const w = await b.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); w.on('pageerror', (e) => errs.push(e.message));
    await w.goto(URL0.replace('/editor/', '/')); await w.waitForSelector('#writing');
    await w.evaluate(async () => { try { localStorage.clear(); } catch {} });
    await w.reload(); await w.waitForSelector('#writing'); await w.waitForTimeout(400);
    await w.fill('#writing', '### 2026-10-26 | Monday\n\nA plain day.\n');
    const d1p = w.waitForEvent('download'); await w.click('#downloadJot'); const d1 = await d1p, t1 = fs.readFileSync(await d1.path());
    ok(/\.jot$/.test(d1.suggestedFilename()) && t1[0] !== 0x50 && /A plain day/.test(t1.toString()) && (await w.textContent('#docExt')) === '.jot', `workspace: no attachments, Download .jot saves plain text (${d1.suggestedFilename()})`);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    await w.setInputFiles('#attachFile', { name: 'dot.png', mimeType: 'image/png', buffer: png });
    await w.waitForFunction(() => document.querySelector('#docExt').textContent === '.jotz', null, { timeout: 8000 });
    const d2p = w.waitForEvent('download'); await w.click('#downloadJot'); const d2 = await d2p, t2 = fs.readFileSync(await d2.path());
    ok(/\.jotz$/.test(d2.suggestedFilename()) && t2[0] === 0x50 && t2[1] === 0x4b, `workspace: with an attachment it saves one .jotz package (${d2.suggestedFilename()})`);
    await w.close(); }
  // the guides: readable on a phone and in the dark, nothing serious for axe
  for (const [pg, scheme] of [['guide/', 'light'], ['guide/writing-jot.html', 'dark'], ['guide/template-editor.html', 'light']]) {
    const gp = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme }); gp.on('pageerror', (e) => errs.push(e.message));
    await gp.goto(URL0.replace('/editor/', `/${pg}`)); await gp.waitForSelector('#guide h1');
    ok(await gp.evaluate(() => { const h = document.querySelector('#guide h1').getBoundingClientRect(), t = document.querySelector('.toc'); return !t || h.top < t.getBoundingClientRect().top; }), `${pg}: the title comes before the contents list`);
    const wide = await gp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(wide <= 0, `${pg} (${scheme}, 390 px): no sideways scroll (${wide})`);
    if (fs.existsSync(AXE)) {
      await gp.addScriptTag({ path: AXE });
      const v = await gp.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => `${x.id}: ${x.nodes.length}`));
      ok(v.length === 0, `${pg} (${scheme}): axe finds nothing serious` + (v.length ? ': ' + v.join(', ') : ''));
    }
    await gp.screenshot({ path: path.join(SHOTS, `guide-${pg.replace(/\W+/g, '-')}${scheme}.png`), fullPage: false });
    await gp.close();
  }
  ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close(); srv.close();
  console.log(`\n${n} checks passed · screenshots in ${SHOTS}`);
})().catch((e) => { console.error(e); srv.close(); process.exit(1); });
