// The examples page and its Read links into the workspace, in Chromium (Playwright).
//   node test-examples-ui.cjs [shots-folder]      (axe-core from ../journal/node_modules when present)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, 'dist'), SHOTS = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'jot-examples-'));
const AXE = path.join(__dirname, '../journal/node_modules/axe-core/axe.min.js');
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jot': 'text/plain; charset=utf-8', '.jotz': 'application/zip' };
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok   ' + m); };

const srv = http.createServer((q, r) => {
  let f = path.normalize(path.join(ROOT, decodeURIComponent(q.url.split('?')[0])));
  if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); });
});

(async () => {
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = `http://127.0.0.1:${srv.address().port}/`;
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples/index.json'), 'utf8'));
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE + 'examples/');
  ok((await p.$$eval('.diary h2', (h) => h.map((x) => x.textContent))).join('|') === [...index.diaries.map((d) => d.title), 'Small files'].join('|'), 'the examples page lists each diary, then the two small files');

  // every link on the page answers
  const hrefs = await p.$$eval('main a[href]', (as) => [...new Set(as.map((a) => a.href))]);
  const local = hrefs.filter((h) => h.startsWith(BASE));
  for (const h of local) { const u = new URL(h); const file = u.searchParams.get('open') || u.pathname.slice(1); const res = await p.request.get(BASE + file); assert.equal(res.status(), 200, h); }
  const files = index.diaries.reduce((k, d) => k + d.files.length, 0);
  ok(local.length >= files * 2 + 4, `every Read and Download link (${local.length}) reaches a file on the site`);
  ok(hrefs.filter((h) => !h.startsWith(BASE)).every((h) => /^https:\/\/www\.gutenberg\.org\/ebooks\/\d+$/.test(h)), 'the only outside links are the Project Gutenberg sources');

  // Read: an empty workspace opens the example without asking
  let asked = 0; p.on('dialog', (d) => { asked++; d.dismiss(); });
  await p.click('a[href="../?open=examples/diaries/nobody/nobody.jot"]');
  await p.waitForFunction(() => /Opened the example/.test(document.getElementById('journalNotice').textContent));
  const text = await p.inputValue('#writing');
  ok(text.startsWith('---\nJot: 1.0\nTitle: The Diary of a Nobody') && asked === 0, 'Read opens the diary in the workspace (an empty workspace is not asked)');
  ok(new URL(p.url()).search === '' && await p.inputValue('#documentName') === 'nobody', 'the address loses ?open= (a reload does not open it again) and the name is the file’s');
  ok(/166 dated sections/.test(await p.textContent('#structureSummary')), 'the workspace reads 166 dated entries');

  // writing of your own: it asks, and Cancel keeps it
  await p.fill('#writing', 'My own words.'); await p.dispatchEvent('#writing', 'input'); await p.waitForTimeout(400);
  await p.goto(BASE + '?open=examples/diaries/pepys/pepys-1660.jot'); await p.waitForTimeout(500);
  ok(asked === 1 && await p.inputValue('#writing') === 'My own words.', 'with writing of your own, it asks first, and Cancel keeps your writing');
  p.removeAllListeners('dialog'); p.on('dialog', (d) => d.accept());
  await p.goto(BASE + '?open=examples/packaged.jotz');
  await p.waitForFunction(() => /Opened the example packaged.jotz/.test(document.getElementById('journalNotice').textContent));
  ok(true, 'a packaged .jotz example opens too, after you agree');

  // only examples from this site
  for (const bad of ['../secret.jot', 'examples/../index.html', 'https://example.org/x.jot', '//example.org/examples/x.jot', 'examples/x.txt']) {
    await p.goto(BASE + '?open=' + encodeURIComponent(bad)); await p.waitForTimeout(150);
    assert.match(await p.textContent('#journalNotice'), /does not name an example/, bad);
  }
  ok(true, 'anything but an examples/ .jot or .jotz on this site is refused');
  ok(errs.length === 0, `no page errors${errs.length ? ': ' + errs.join('; ') : ''}`);

  for (const scheme of ['light', 'dark']) {
    const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.emulateMedia({ colorScheme: scheme });
    await m.goto(BASE + 'examples/'); await m.$$eval('details', (ds) => ds.forEach((d) => { d.open = true; }));
    ok(await m.evaluate(() => document.documentElement.scrollWidth <= 390), `390 px, ${scheme}: no sideways scroll`);
    const small = await m.$$eval('main a.btn, summary, .top a', (els) => els.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim()));
    ok(small.length === 0, `390 px, ${scheme}: every control is at least 44 px tall${small.length ? ' (' + small.slice(0, 5).join(', ') + ')' : ''}`);
    await m.screenshot({ path: path.join(SHOTS, `examples-390-${scheme}.png`) });
    if (fs.existsSync(AXE)) {
      await m.addScriptTag({ path: AXE });
      const v = await m.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => `${x.id}: ${x.nodes.length}`));
      ok(v.length === 0, `axe (${scheme}): no WCAG A/AA problems${v.length ? ' (' + v.join(', ') + ')' : ''}`);
    }
    await m.close();
  }
  await p.setViewportSize({ width: 1280, height: 900 }); await p.goto(BASE + 'examples/');
  await p.screenshot({ path: path.join(SHOTS, 'examples-desktop.png'), fullPage: true });
  await b.close(); srv.close();
  console.log(`\n${n} checks passed · screenshots in ${SHOTS}`);
})().catch((e) => { console.error(e); process.exit(1); });
