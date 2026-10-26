// The Jot template editor in a real browser (Chromium via Playwright): editing, downloads, keeping the template, phone width, accessibility.
//   node test-editor-ui.cjs [shots-folder]      (axe-core from ../node_modules when present: npm install at the root)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, 'dist'), SHOTS = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'jot-editor-'));
const AXE = path.join(__dirname, '../node_modules/axe-core/axe.min.js');
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

  await p.setViewportSize({ width: 1280, height: 900 });
  // a downloaded .jot brings its template back
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
  await p.setInputFiles('#open-file', { name: 'daypage.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ v: 2, blocks: [{ type: 'sky', on: true }] })) });
  await p.waitForFunction(() => /not a Jot template or a \.jot/.test(document.querySelector('#toast').textContent));
  ok((await p.evaluate(() => localStorage.getItem('jot-template-v1'))) === want, 'any other file (an old print day layout, say) is refused, and nothing changes');
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
    } else console.log('-- axe-core not found (npm install at the repository root): accessibility scan not run');
    await ph.screenshot({ path: path.join(SHOTS, `editor-phone-${scheme}.png`), fullPage: false });
    await ph.close();
  }
  // the weekly dashboard: the starter, the Page view, its charts with sample numbers, the rule-of-7 note
  { const d = await b.newPage({ viewport: { width: 1280, height: 900 } }); d.on('pageerror', (e) => errs.push(e.message));
    await d.goto(URL0); await d.evaluate(() => { try { localStorage.clear(); } catch {} }); await d.reload(); await d.waitForSelector('#jot:not(:empty)');
    await d.click('#starter'); await d.click('#starter-list >> text=Weekly dashboard');
    ok((await d.$$eval('[data-zone="weekStart"] .blk', (e) => e.length)) === 6 && /:::record chart #chart-week-2026-\d\d-\d\d\nmetrics: sleep, work, steps, mood\nstart: /.test(await d.textContent('#jot')), 'Weekly dashboard: six widgets for the week, and a chart record naming its numbers and dates');
    ok(await d.$eval('#sample-wrap', (e) => e.hidden), 'the Text view has no sample switch');
    await d.click('#tab-page');
    ok(!(await d.$eval('#page-view', (e) => e.hidden)) && await d.$eval('#jot', (e) => e.hidden) && (await d.textContent('#preview-h')) === 'The page', 'Page shows the file as a journal reader would');
    const charts = await d.$$eval('#page .jot-chart', (c) => c.length);
    // what Chart.js holds for each canvas (the same module instance the page loaded)
    const drawn = (pg, sel) => pg.evaluate(async (s) => { const { Chart } = await import('/jot/vendor/chart.mjs'); return [...document.querySelectorAll(s)].map((c) => { const ch = Chart.getChart(c); return ch ? { type: ch.config.type, data: ch.data.datasets[0].data, w: c.width, label: c.getAttribute('aria-label') } : null; }); }, sel);
    const empty = await drawn(d, '#page .jot-chart canvas');
    ok(charts >= 5 && empty.length === charts * 4 && empty.every((c) => c && c.w > 0 && c.data.every((v) => v === null) && /no numbers yet/.test(c.label)) && /nothing written yet/.test(await d.textContent('#page .jot-chart')), `a chart a week (${charts}), four Chart.js charts each, drawn and named, empty until numbers are written`);
    await d.check('#sample');
    const sampled = await drawn(d, '#page .jot-chart canvas');
    ok(sampled.length === charts * 4 && sampled.every((c) => c.type === 'line' && c.data.every((v) => typeof v === 'number')) && /sample numbers/.test(await d.textContent('#page .jot-chart')), 'Sample numbers fills every chart, and says they are samples');
    if (fs.existsSync(AXE)) {
      await d.addScriptTag({ path: AXE });
      const v = await d.evaluate(async () => (await axe.run(document.querySelector('.preview'), { resultTypes: ['violations'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => `${x.id}: ${x.nodes.length}`));
      ok(v.length === 0, 'the Page view with its charts: axe finds nothing serious' + (v.length ? ': ' + v.join(', ') : ''));
    }
    await d.screenshot({ path: path.join(SHOTS, 'editor-dashboard-page.png'), fullPage: true });
    ok(await d.$$eval('#page .jot-blank-line', (l) => l.length) > 0 && !/:::record scale/.test(await d.textContent('#page')), 'empty task and list lines show as lines to write on; scale definitions are not printed');
    await d.keyboard.press('Escape'); await d.focus('#tab-page'); await d.keyboard.press('ArrowLeft');
    ok(await d.evaluate(() => document.activeElement.id === 'tab-text') && !(await d.$eval('#jot', (e) => e.hidden)), 'the arrow keys move between Text and Page');
    ok(!(await d.$('.warn-note')), 'six widgets: no rule-of-7 note');
    await d.click('[data-act="add"][data-zone="weekStart"]'); await d.click('#palette [data-type="writing"]');
    await d.click('[data-act="add"][data-zone="weekStart"]'); await d.click('#palette [data-type="writing"]');
    ok(/8 widgets on the week page/.test(await d.textContent('[data-zone="weekStart"] .warn-note')), 'eight: the week zone says five to seven is what most people take in at a glance');
    await d.close(); }
  // the home page: why Jot, no editor on it, a live chart, phone width and dark, axe
  for (const scheme of ['light', 'dark']) {
    const h = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme }); h.on('pageerror', (e) => errs.push(e.message));
    await h.goto(URL0.replace('/editor/', '/')); await h.waitForSelector('#demo-chart canvas');
    const demo = await h.evaluate(async () => { const { Chart } = await import('/jot/vendor/chart.mjs'); return [...document.querySelectorAll('#demo-chart canvas')].map((c) => Chart.getChart(c).data.datasets[0].data.length); });
    ok(!(await h.$('#writing, textarea')) && /Why keep a journal in Jot\?/.test(await h.textContent('main')) && demo.join() === '7,7', `home (${scheme}): why Jot, no editor, and the example week drawn by Chart.js`);
    ok(await h.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `home (${scheme}, 390 px): no sideways scroll`);
    const hrefs = await h.$$eval('a[href]', (as) => [...new Set(as.map((a) => a.href))].filter((u) => u.startsWith(location.origin)));
    for (const u of hrefs) { const res = await h.request.get(u.split('#')[0]); assert.equal(res.status(), 200, u); }
    ok(hrefs.length >= 10, `home: every link on the page answers (${hrefs.length})`);
    ok(await h.$$eval('main input, main textarea, main select, main [contenteditable], main form', (e) => e.length) === 0, `home (${scheme}): no editor and nothing to fill in, only reasons and pictures`);
    ok(await h.evaluate(() => { const p = document.querySelector('#written-demo'); return p.classList.contains('jot-hand') && p.querySelectorAll('svg.hw-box[role="img"][aria-label="done"]').length === 2 && p.querySelectorAll('svg.hw-box[aria-label="to do"]').length === 1; }), `home (${scheme}): a sample page written by hand, its tasks in pencil boxes a screen reader can name`);
    if (fs.existsSync(AXE)) {
      await h.addScriptTag({ path: AXE });
      const v = await h.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => `${x.id}: ${x.nodes.length}`));
      ok(v.length === 0, `home (${scheme}): axe finds nothing serious` + (v.length ? ': ' + v.join(', ') : ''));
    }
    await h.screenshot({ path: path.join(SHOTS, `home-${scheme}.png`), fullPage: true });
    await h.close();
  }
  // the workspace (/write/): plain .jot without attachments, one .jotz with them (spec draft 3)
  { const w = await b.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); w.on('pageerror', (e) => errs.push(e.message));
    await w.goto(URL0.replace('/editor/', '/write/')); await w.waitForSelector('#writing');
    await w.evaluate(async () => { try { localStorage.clear(); } catch {} });
    await w.reload(); await w.waitForSelector('#writing'); await w.waitForTimeout(400);
    await w.fill('#writing', '### 2026-10-26 | Monday\n\n:::record measurement #s1\nmetric: sleep\nunit: h\nvalue: 7\n:::\n\n### 2026-10-27\n\n:::record measurement #s2\nmetric: sleep\nunit: h\nvalue: 8\n:::\n\n:::record chart #week\nmetrics: sleep\n:::\n'); await w.dispatchEvent('#writing', 'input');
    await w.waitForSelector('#paperPreview .jot-chart canvas');
    const ws = await w.evaluate(async () => { const { Chart } = await import('/jot/vendor/chart.mjs'); return Chart.getChart(document.querySelector('#paperPreview .jot-chart canvas')).data.datasets[0].data; });
    ok(/avg 7\.5 h/.test(await w.textContent('#paperPreview .jot-chart')) && ws.filter((v) => v !== null).join() === '7,8', 'workspace: a chart record in the writing is drawn in the page preview (its week, from the entry it is in)');
    await w.fill('#writing', '### 2026-10-26 | Monday\n\nA plain day.\n');
    const d1p = w.waitForEvent('download'); await w.click('#downloadJot'); const d1 = await d1p, t1 = fs.readFileSync(await d1.path());
    ok(/\.jot$/.test(d1.suggestedFilename()) && t1[0] !== 0x50 && /A plain day/.test(t1.toString()) && (await w.textContent('#docExt')) === '.jot', `workspace: no attachments, Download .jot saves plain text (${d1.suggestedFilename()})`);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    await w.setInputFiles('#attachFile', { name: 'dot.png', mimeType: 'image/png', buffer: png });
    await w.waitForFunction(() => document.querySelector('#docExt').textContent === '.jotz', null, { timeout: 8000 });
    const d2p = w.waitForEvent('download'); await w.click('#downloadJot'); const d2 = await d2p, t2 = fs.readFileSync(await d2.path());
    ok(/\.jotz$/.test(d2.suggestedFilename()) && t2[0] === 0x50 && t2[1] === 0x4b, `workspace: with an attachment it saves one .jotz package (${d2.suggestedFilename()})`);
    await w.close(); }
  // fuller formatting and the handwritten page on a dot grid (the workspace)
  { const w = await b.newPage({ viewport: { width: 1280, height: 900 } }); w.on('pageerror', (e) => errs.push(e.message));
    await w.goto(URL0.replace('/editor/', '/write/')); await w.waitForSelector('#writing');
    await w.evaluate(() => { try { localStorage.clear(); } catch {} }); await w.reload(); await w.waitForSelector('#writing');
    const journal = '# Notebook\n\n### 2026-10-26 | Monday\n\nThe rain made the room ==quieter== and ++softer++, x^2^.[^1]\n\n[x] Walk\n[ ] Call Sam\n\n> [!TIP]\n> Headphones helped.\n\n-> A small beginning. <-\n\n| What | How much |\n| --- | --- |\n| Tea | 2 |\n\n:::record measurement #s\nmetric: sleep\nunit: h\nvalue: 7.5\n:::\n\n:::record chart #c\nmetrics: sleep\n:::\n\n[^1]: At the kitchen table.\n\n' + Array.from({ length: 40 }, (_, i) => `### 2026-10-${String(i % 28 + 1).padStart(2, '0')}\n\nA long day of writing, line after line, so the journal runs onto several printed pages and every one of them must keep its words on the dots. Day ${i + 1}.\n`).join('\n');
    await w.fill('#writing', journal); await w.dispatchEvent('#writing', 'input'); await w.waitForSelector('#paperPreview .jot-callout');
    ok(await w.$eval('#paperPreview', (p) => !!(p.querySelector('mark') && p.querySelector('ins') && p.querySelector('sup:not(.jot-fn-ref)') && p.querySelector('.jot-fn-ref a[href^="#"]') && p.querySelector('.jot-footnotes li') && p.querySelector('.jot-callout-tip .jot-callout-title') && p.querySelector('p.jot-center'))), 'typed: highlight, underline, superscript, a footnote and its note, a callout and a centred line');
    // page styles and the downloaded page
    ok(await w.$eval('#paperPreview', (p) => p.classList.contains('jot-style-journal') && /Monday, 26 October 2026/.test(p.querySelector('.jot-date').textContent) && !!p.querySelector('.jot-task-completed .jot-box[aria-label="done"]')) && /@bottom-center/.test(await w.textContent('#printSettings')), 'typed pages start in the Journal style: dates in words, task states, page numbers when printed');
    await w.selectOption('#pageStyle', 'notes');
    ok(await w.$eval('#paperPreview', (p) => p.classList.contains('jot-style-notes') && !p.classList.contains('jot-style-journal')), 'Notes swaps the style');
    const getPage = async () => { const dp = w.waitForEvent('download'); await w.click('#exportPage'); const d = await dp; return [d.suggestedFilename(), fs.readFileSync(await d.path(), 'utf8')]; };
    const [name1, html1] = await getPage();
    ok(/\.html$/.test(name1) && /^<!doctype html>/.test(html1) && /jot-style-notes/.test(html1) && /<img[^>]+src="data:image\/png;base64,/.test(html1) && !/<script|<canvas|http:\/\/127/.test(html1), `Download page: one .html with the formatted pages and its chart as a picture (${name1}, ${Math.round(html1.length / 1024)} KB)`);
    { const v = await b.newPage({ viewport: { width: 900, height: 900 } }), reqs = []; await v.route('**/*', (r) => { reqs.push(r.request().url()); r.abort(); });
      await v.setContent(html1, { waitUntil: 'load' });
      ok(reqs.length === 0 && await v.$eval('main.jot-export.jot-style-notes', (m) => getComputedStyle(m.querySelector('.jot-date')).borderLeftStyle === 'solid' && m.querySelector('img').naturalWidth > 0), 'the downloaded page opens on its own, styled, its chart showing, with nothing fetched');
      await v.close(); }
    await w.selectOption('#look', 'hand'); await w.waitForFunction(() => document.querySelector('#paperPreview').jotGrid);
    const g = await w.evaluate(() => { const p = document.querySelector('#paperPreview'), pad = parseFloat(getComputedStyle(p).paddingTop), pitch = p.jotGrid.pitch;
      const blocks = [...p.children].filter((e) => !e.classList.contains('hw-page-edge'));
      const top0 = p.getBoundingClientRect().top + pad, off = blocks.map((e) => (e.getBoundingClientRect().top - top0 - (parseFloat(e.style.top) || 0)) / pitch).filter((r) => Math.abs(r - Math.round(r)) > 0.005);
      const heights = blocks.map((e) => e.getBoundingClientRect().height / pitch).filter((r) => Math.abs(r - Math.round(r)) > 0.005);
      const alts = new Set([...p.querySelectorAll('.hw-c')].map((c) => c.style.fontFeatureSettings || 'none'));
      return { pitch, off, heights, alts: [...alts].sort(), words: p.querySelectorAll('.hw-w').length, fonts: document.fonts.check("16px 'Jot Caveat'"), edges: p.querySelectorAll('.hw-page-edge').length, css: document.getElementById('printSettings').textContent, text: p.textContent.replace(/\s+/g, ' ').slice(0, 60), dy: p.style.getPropertyValue('--hw-dy'), base: p.jotGrid.baseline }; });
    ok(g.fonts && g.words > 400 && g.alts.join() === '"ss01","ss02",none', `handwritten: the pen font is loaded, ${g.words} words written, letters in all three shapes`);
    ok(g.off.length === 0 && g.heights.length === 0, 'every block starts on a row of the grid and is a whole number of rows tall' + (g.off.length ? ` (off: ${g.off.slice(0, 3)})` : '') + (g.heights.length ? ` (heights: ${g.heights.slice(0, 3)})` : ''));
    ok(g.pitch === 18.890625 && Math.abs(parseFloat(g.dy) - (g.base - g.pitch / 2)) < 0.01, 'the dots are drawn where the letters sit (5 mm, snapped to the layout unit)');
    const geo = /@page \{ size: 148mm 210mm; margin: ([\d.]+)px ([\d.]+)px; \}/.exec(g.css);
    ok(geo && Math.abs(210 * 96 / 25.4 - 2 * geo[1] - 38 * g.pitch) < 0.05, 'the printed A5 page holds exactly 38 rows of dots');
    ok(g.edges >= 2 && /Notebook/.test(g.text), `on screen, a dashed line where each printed page ends (${g.edges})`);
    const pdf = await w.pdf({ preferCSSPageSize: true }), pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    ok(pages === g.edges + 1, `printing makes the same pages the screen shows (${pages})`);
    const [, html2] = await getPage();
    ok(/data:font\/woff2;base64,/.test(html2) && (html2.match(/@font-face/g) || []).length === 4 && /jot-hand/.test(html2) && /margin: [\d.]+px [\d.]+px;/.test(html2), 'a handwritten page downloads with its hand embedded (only the hand in use) and its dot-grid page size');
    const before = await w.$eval('#paperPreview', (p) => [p.textContent, [...p.querySelectorAll('.hw-c')].slice(0, 80).map((c) => c.style.fontFeatureSettings).join()]);
    await w.click('#reshuffle'); await w.waitForFunction(() => document.querySelector('#paperPreview').jotGrid);
    const after = await w.$eval('#paperPreview', (p) => [p.textContent, [...p.querySelectorAll('.hw-c')].slice(0, 80).map((c) => c.style.fontFeatureSettings).join()]);
    ok(after[0] === before[0] && after[1] !== before[1], 'Rewrite changes the letter shapes, never the words');
    if (fs.existsSync(AXE)) {
      await w.addScriptTag({ path: AXE });
      const v = await w.evaluate(async () => (await axe.run(document.querySelector('#paperPreview'), { resultTypes: ['violations'] })).violations.filter((x) => ['serious', 'critical'].includes(x.impact)).map((x) => `${x.id}: ${x.nodes.length}`));
      ok(v.length === 0, 'the handwritten page: axe finds nothing serious' + (v.length ? ': ' + v.join(', ') : ''));
    }
    await w.reload(); await w.waitForSelector('#writing');
    ok((await w.$eval('#look', (s) => s.value)) === 'hand' && !(await w.$eval('#handTools', (e) => e.hidden)), 'the look is remembered');
    await w.selectOption('#look', 'typed'); await w.waitForTimeout(400);
    ok(!(await w.$('#paperPreview.jot-hand')) && !(await w.$('#paperPreview .hw-w')) && /@page \{ size: 148mm 210mm; margin: \d+mm [^}]*@bottom-center/.test(await w.textContent('#printSettings')), 'Typed puts the page back as it was');
    await w.screenshot({ path: path.join(SHOTS, 'workspace-typed-formatting.png') });
    await w.close(); }
  // the template editor's Page view, handwritten
  { const d = await b.newPage({ viewport: { width: 1280, height: 900 } }); d.on('pageerror', (e) => errs.push(e.message));
    await d.goto(URL0); await d.waitForSelector('#jot:not(:empty)'); await d.click('#tab-page'); await d.check('#handwritten');
    await d.waitForFunction(() => document.querySelector('#page').jotGrid);
    ok(await d.$eval('#page', (p) => p.classList.contains('jot-hand') && p.querySelectorAll('.hw-w').length > 20), 'the template editor\'s Page view can be handwritten too');
    await d.close(); }
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
