// The diary converter page in a real browser (Chromium via Playwright). The page must do everything the command line does, with
// the same result: each case converts in the page and with converter/jot-convert.mjs and compares the files byte for byte.
//   node test-convert-ui.cjs [shots-folder]      (axe-core from ../node_modules when present: npm install at the root)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');
const assert = require('node:assert/strict');
const ROOT = path.join(__dirname, 'dist'), SHOTS = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'jot-convert-'));
const FIX = path.join(__dirname, '../converter/fixtures'), CLI = path.join(__dirname, '../converter/jot-convert.mjs');
const AXE = path.join(__dirname, '../node_modules/axe-core/axe.min.js');
const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok   ' + m); };

const serve = (root, cors) => http.createServer((q, r) => {
  let f = path.normalize(path.join(root, decodeURIComponent(q.url.split('?')[0])));
  if (!f.startsWith(root)) { r.writeHead(403); return r.end(); }
  if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', ...(cors ? { 'access-control-allow-origin': '*' } : {}) }); r.end(b); });
});
const site = serve(ROOT), open = serve(FIX, true), closed = serve(FIX, false);
const cli = (args, input) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-cli-')); execFileSync(process.execPath, [CLI, ...args, '-q', '-d', dir], input ? { input } : {}); const out = Object.fromEntries(fs.readdirSync(dir).sort().map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')])); fs.rmSync(dir, { recursive: true }); return out; };

(async () => {
  for (const s of [site, open, closed]) await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const port = (s) => s.address().port, URL0 = `http://127.0.0.1:${port(site)}/convert/`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: `http://127.0.0.1:${port(site)}` });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(URL0);
  ok(/Open a diary to begin/.test(await p.textContent('#check')) && await p.isHidden('#jot'), 'opens empty, asking for a diary');

  const check = () => p.textContent('#check');
  const settle = async () => { await p.waitForFunction(() => !/Converting|Fetching/.test(document.getElementById('check').textContent)); };
  // every file the page has, as the downloads would hold them (the preview is cut at 200,000 characters)
  const pageFiles = async () => {
    const opts = await p.$$eval('#file-sel option', (o) => o.map((x) => x.value));
    const out = {};
    for (const v of opts) {
      if (opts.length > 1) await p.selectOption('#file-sel', v);
      const [d] = await Promise.all([p.waitForEvent('download'), p.click('#dl-one')]);
      out[d.suggestedFilename()] = fs.readFileSync(await d.path(), 'utf8');
    }
    return Object.fromEntries(Object.entries(out).sort());
  };
  const same = async (args, what, input) => { const c = cli(args, input), w = await pageFiles(); assert.deepEqual(Object.keys(w), Object.keys(c)); for (const k of Object.keys(c)) assert.equal(w[k], c[k], k); return w; };

  // a file, then options: the same files as the command line
  await p.setInputFiles('#file', path.join(FIX, 'pepys-1660.txt')); await settle();
  ok(/5 entries from 1660-01-01 to 1660-01-05/.test(await check()) && /valid Jot/.test(await check()) && await p.isHidden('#dl-zip') && await p.isHidden('#file-pick'), 'opening a file converts it and checks the result: valid Jot (one file: no picker, no zip)');
  await same([path.join(FIX, 'pepys-1660.txt')], 'as written');
  ok(true, 'the page and the command line make the same file (dates as written)');
  await p.selectOption('#o-calendar', 'julian'); await settle();
  ok(/1660-01-11 to 1660-01-15/.test(await check()) && /fit the dates as Old Style 1 times/.test(await check()), 'Calendar: Old Style converts again at once, with the weekday check');
  await p.selectOption('#o-notes', 'drop'); await settle();
  await same([path.join(FIX, 'pepys-1660.txt'), '--calendar', 'julian', '--notes', 'drop'], 'julian, drop');
  ok(true, 'Old Style and notes left out: the same file as --calendar julian --notes drop');
  await p.click('summary');
  await p.fill('#o-title', 'Pepys, January'); await p.fill('#o-author', 'Samuel Pepys'); await p.fill('#o-source', 'Gutenberg 4200'); await p.fill('#o-name', 'pepys'); await settle();
  await same([path.join(FIX, 'pepys-1660.txt'), '--calendar', 'julian', '--notes', 'drop', '--title', 'Pepys, January', '--author', 'Samuel Pepys', '--source', 'Gutenberg 4200', '--name', 'pepys'], 'metadata');
  ok(true, 'title, author, source and file name: the same file as the command line');
  await p.fill('#o-name', '../x'); await settle();
  ok(/file name is letters/.test(await check()) && await p.isHidden('#jot'), 'a bad file name is refused with the reason, as on the command line');
  for (const [id, v] of [['o-calendar', 'as-written'], ['o-notes', 'margin']]) await p.selectOption(`#${id}`, v);
  for (const id of ['o-title', 'o-author', 'o-source', 'o-name']) await p.fill(`#${id}`, '');
  await settle();

  // the year, with the page's own words in the warnings
  await p.setInputFiles('#file', path.join(FIX, 'nobody-april.txt')); await settle();
  const warn = await p.textContent('#warnings');
  ok(/0 entries/.test(await check()) && /Starting year, above/.test(warn) && !/--year/.test(warn), 'no year: the warning names the Starting year box, not a command-line flag');
  await p.fill('#o-year', '1888'); await settle();
  ok(/6 entries from 1888-04-03 to 1888-04-08/.test(await check()), 'Starting year 1888: six days');
  await same([path.join(FIX, 'nobody-april.txt'), '--year', '1888'], 'year');
  await p.fill('#o-year', '18x'); await settle();
  ok(/the year is a number/.test(await check()), 'a year that is not a number is refused');
  await p.fill('#o-year', '');

  // pasted text, like standard input
  await p.click('#paste-toggle');
  const nobodyNew = fs.readFileSync(path.join(FIX, 'nobody-new-year.txt'), 'utf8');
  await p.fill('#paste', nobodyNew); await p.fill('#o-year', '1888'); await p.waitForTimeout(400); await settle();
  ok(/Pasted text/.test(await p.textContent('#source-state')) && /1888-12-30 to 1889-01-02/.test(await check()), 'pasted text converts, like standard input (December, then January 1889)');
  await same(['-', '--year', '1888'], 'stdin', nobodyNew);
  ok(true, 'pasted text: the same file as the command line reading standard input');
  await p.click('#paste-toggle'); await p.fill('#o-year', '');

  // splitting: a file a year, the file picker, and all of them in a zip
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  let big = 'JANUARY 1900\n\n'; for (let y = 1900; y <= 1902; y++) for (let m = 0; m < 12; m++) for (let d = 1; d <= 28; d++) big += `${months[m]} ${d}, ${y}.—${'x'.repeat(2000)}\n\n`;
  const bigFile = path.join(SHOTS, 'big.txt'); fs.writeFileSync(bigFile, big);
  await p.setInputFiles('#file', bigFile); await settle();
  ok((await p.$$eval('#file-sel option', (o) => o.length)) === 3 && await p.isVisible('#dl-zip'), 'a diary over 1 MiB is split by year: a file picker and Download all');
  ok((await p.textContent('#jot')).includes('the rest of this file'), 'a big file shows its first part; the download is whole');
  await same([bigFile], 'auto split');
  ok(true, 'split files: the same three files as the command line with --out-dir');
  const [z] = await Promise.all([p.waitForEvent('download'), p.click('#dl-zip')]);
  const zipPath = path.join(SHOTS, z.suggestedFilename()); await z.saveAs(zipPath);
  const listed = execFileSync('python3', ['-c', 'import sys,zipfile; print(" ".join(sorted(zipfile.ZipFile(sys.argv[1]).namelist())))', zipPath]).toString().trim();
  ok(z.suggestedFilename() === 'diary.zip' && listed === 'diary-1900.jot diary-1901.jot diary-1902.jot', 'Download all gives a zip of the files');
  await p.selectOption('#o-per', 'month'); await settle();
  ok((await p.$$eval('#file-sel option', (o) => o.length)) === 36, 'Files: a file a month');
  await p.selectOption('#o-per', 'none'); await settle();
  ok((await p.$$eval('#file-sel option', (o) => o.length)) === 1 && await p.isHidden('#file-pick') && /set Files to a file a year or a month/.test(await p.textContent('#warnings')), 'Always one file: one file, and the warning says how to split it here');
  await p.selectOption('#o-per', 'auto');

  // what is refused
  const latin1 = path.join(SHOTS, 'latin1.txt'); fs.writeFileSync(latin1, Buffer.from('Jan. 1st, 1888.—Caf\xe9\n', 'latin1'));
  await p.setInputFiles('#file', latin1); await settle();
  ok(/not UTF-8 text/.test(await check()), 'a file that is not UTF-8 is refused, as on the command line');

  // a web address: works where the site allows it, and says what to do where it doesn't
  await p.click('#url-toggle');
  await p.fill('#url', `http://127.0.0.1:${port(open)}/blunt-1901.txt`); await p.click('#fetch'); await settle();
  ok(/3 entries from 1901-01-23 to 1901-02-06/.test(await check()), 'From a web address: fetches a plain-text file from a site that allows it');
  await p.fill('#url', `http://127.0.0.1:${port(closed)}/blunt-1901.txt`); await p.click('#fetch'); await settle();
  ok(/does not let other pages read its files/.test(await check()) && /Open a text file/.test(await check()), 'a site that does not allow it: the page says to download the file and open it');
  await p.fill('#url', 'javascript:alert(1)'); await p.click('#fetch');
  ok(/starts with https/.test(await p.textContent('#toast')), 'only http(s) addresses are fetched');
  await p.click('#url-toggle');

  // copy, clear
  await p.setInputFiles('#file', path.join(FIX, 'blunt-1914.txt')); await settle();
  await p.click('#copy');
  ok((await p.evaluate(() => navigator.clipboard.readText())).startsWith('---\nJot: 1.0\n'), 'Copy the text puts the .jot on the clipboard');
  await p.screenshot({ path: path.join(SHOTS, 'convert-desktop.png'), fullPage: true });
  await p.click('#clear');
  ok(/Open a diary to begin/.test(await check()) && await p.isHidden('#jot') && await p.isDisabled('#clear'), 'Clear empties the page');

  // every command-line option has its place on the page
  const flags = [...execFileSync(process.execPath, [CLI, '--help']).toString().matchAll(/(?:^|[\s,])(--[a-z-]+)/g)].map((m) => m[1]);
  const PAGE = { '--year': '#o-year', '--calendar': '#o-calendar', '--notes': '#o-notes', '--per': '#o-per', '--title': '#o-title', '--author': '#o-author', '--source': '#o-source', '--name': '#o-name',
    '--out': '#dl-one', '--out-dir': '#dl-zip', '--help': 'a[href="../guide/converting.html"]' };
  const NOT_NEEDED = { '--force': 'a download never overwrites a file', '--quiet': 'the summary is on the page, not in the way' };
  for (const f of new Set(flags)) assert.ok(PAGE[f] ? await p.$(PAGE[f]) : NOT_NEEDED[f], `${f} has a place on the page`);
  ok(flags.length >= 13, `every command-line option (${new Set(flags).size}) has its control on the page, or no need for one`);
  ok(errs.length === 0, `no page errors${errs.length ? ': ' + errs.join('; ') : ''}`);

  // phone width, light and dark, accessibility
  for (const scheme of ['light', 'dark']) {
    const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.emulateMedia({ colorScheme: scheme });
    await m.goto(URL0); await m.setInputFiles('#file', path.join(FIX, 'pepys-1660.txt'));
    await m.waitForFunction(() => /valid Jot/.test(document.getElementById('check').textContent));
    await m.click('#paste-toggle'); await m.click('#url-toggle'); await m.click('summary');
    ok(await m.evaluate(() => document.documentElement.scrollWidth <= 390), `390 px, ${scheme}: no sideways scroll`);
    const small = await m.$$eval('button, select, input:not([type=file]), summary, .top a', (els) => els.filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.id || e.textContent.trim()));
    ok(small.length === 0, `390 px, ${scheme}: every control is at least 44 px tall${small.length ? ' (' + small.join(', ') + ')' : ''}`);
    await m.screenshot({ path: path.join(SHOTS, `convert-390-${scheme}.png`), fullPage: true });
    if (fs.existsSync(AXE)) {
      await m.addScriptTag({ path: AXE });
      const v = await m.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => `${x.id}: ${x.nodes.length}`));
      ok(v.length === 0, `axe (${scheme}): no WCAG A/AA problems${v.length ? ' (' + v.join(', ') + ')' : ''}`);
    }
    await m.close();
  }
  await b.close(); for (const s of [site, open, closed]) s.close();
  console.log(`\n${n} checks passed · screenshots in ${SHOTS}`);
})().catch((e) => { console.error(e); process.exit(1); });
