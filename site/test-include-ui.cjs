// Includes in the workspace: a .jotz carrying two journals, one including the other (an entry by its date), framed and labelled; a
// missing target and a loop say so on the page; attaching a .jot inserts an include line. Mobile light and dark, with axe-core.
//   node site/test-include-ui.cjs [shots-folder]      (Playwright, Chromium; axe-core from ../node_modules when present)
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist'), shots = process.argv[2], AXE = path.join(__dirname, '../node_modules/axe-core/axe.min.js');
const srv = http.createServer((q, r) => {
  let file = path.resolve(root, '.' + decodeURIComponent(q.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) && file !== root) { r.writeHead(403); return r.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (e, b) => {
    if (e) { r.writeHead(404); return r.end(); }
    r.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); r.end(b);
  });
});
const MAIN = '# October\n\n### 2026-10-27 | Tuesday\n\nLooking back at Sunday:\n\n![Sunday walk](assets/week.jot#2026-10-25)\n\n![Missing](assets/gone.jot)\n\n![Loop](assets/loop.jot)\n';
const WEEK = '### 2026-10-25 | Sunday\n\nRain on the window. A long walk anyway.\n\n[x] Walk\n\n### 2026-10-26 | Monday\n\nNot this one.\n';
const LOOP = 'Round again:\n\n![](loop.jot)\n';
(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { pack } = await import('../parser/container.mjs');
  const enc = (s) => new TextEncoder().encode(s), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-inc-ui-')), file = path.join(dir, 'october.jotz');
  fs.writeFileSync(file, await pack({ source: MAIN, assets: [{ path: 'assets/week.jot', mediaType: 'text/plain', data: enc(WEEK) }, { path: 'assets/loop.jot', mediaType: 'text/plain', data: enc(LOOP) }] }));
  const plain = path.join(dir, 'later.jot'); fs.writeFileSync(plain, '### 2026-10-28\n\nLater.\n');
  const browser = await chromium.launch(), errors = [], origin = `http://127.0.0.1:${srv.address().port}`;
  let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok   ' + m); };
  try {
    for (const mode of ['light', 'dark']) {
      const p = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: mode });
      p.on('pageerror', (e) => errors.push(e.message)); p.on('dialog', (d) => d.accept());
      const remote = []; p.on('request', (q) => { if (!q.url().startsWith(origin) && !q.url().startsWith('blob:') && !q.url().startsWith('data:')) remote.push(q.url()); });
      await p.goto(origin + '/write/');
      await p.setInputFiles('#openFile', file);
      await p.waitForSelector('#paperPreview .jot-include[data-source="assets/week.jot#2026-10-25"]');
      const got = await p.evaluate(() => { const box = document.querySelector('#paperPreview .jot-include[data-source]'); return { label: box.getAttribute('aria-label'), text: box.textContent, notes: [...document.querySelectorAll('#paperPreview .jot-include-missing')].map((x) => x.textContent), wide: document.documentElement.scrollWidth - innerWidth }; });
      ok(got.label === 'Included from assets/week.jot#2026-10-25' && /Sunday walk · assets\/week\.jot#2026-10-25/.test(got.text) && /Rain on the window/.test(got.text) && !/Not this one/.test(got.text), `${mode}: the included entry shows in place, framed and labelled with its source`);
      ok(got.notes.some((t) => /not found: assets\/gone\.jot/.test(t)), `${mode}: a missing include says so`);
      ok(got.notes.some((t) => /not repeated: loop\.jot/.test(t)) && await p.locator('#paperPreview [data-source="assets/loop.jot"]').count() === 1, `${mode}: a loop stops after one round, with a notice`);
      ok(/!\[Sunday walk\]\(assets\/week\.jot#2026-10-25\)/.test(await p.inputValue('#writing')), `${mode}: the writing keeps its one include line`);
      ok(got.wide === 0 && remote.length === 0, `${mode}: no sideways scroll at 390px, and nothing fetched from anywhere else`);
      await p.locator('#paperPreview .jot-include').first().scrollIntoViewIfNeeded();
      if (shots) { fs.mkdirSync(shots, { recursive: true }); await p.locator('#paperPreview').screenshot({ path: path.join(shots, `include-${mode}.png`) }); }
      if (fs.existsSync(AXE)) {
        await p.addScriptTag({ path: AXE });
        const v = await p.evaluate(async () => (await window.axe.run('#paperPreview', { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => `${x.id}: ${x.nodes.length}`));
        ok(v.length === 0, `${mode}: axe finds no WCAG A/AA problems in the page${v.length ? ': ' + v.join(', ') : ''}`);
      }
      if (mode === 'light') {
        await p.evaluate(() => { const w = document.getElementById('writing'); w.setSelectionRange(w.value.length, w.value.length); });
        await p.setInputFiles('#attachFile', plain);
        await p.waitForFunction(() => /!\[later\.jot\]\(assets\/later\.jot\)/.test(document.getElementById('writing').value));
        await p.waitForSelector('#paperPreview .jot-include[data-source="assets/later.jot"]');
        ok(/Later\./.test(await p.textContent('#paperPreview [data-source="assets/later.jot"]')), 'attaching a .jot inserts an include line, and it shows');
      }
      await p.close();
    }
    ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    console.log(`\n${n} checks passed`);
  } finally { await browser.close(); srv.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
