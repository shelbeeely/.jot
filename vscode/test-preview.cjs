// The preview webview in Chromium: the page extension.js makes, its own media files, a stand-in for the VS Code API.
// Text in -> the page and its charts out, the same as the site. Needs playwright (journal/node_modules, or a global install).
//   node test-preview.cjs
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { webviewHtml } = require('./extension.js');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('../journal/node_modules/playwright-core')); }
const MEDIA = path.join(__dirname, 'media');
const TYPES = { '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html' };
const page = webviewHtml({ cspSource: 'http://127.0.0.1:*', nonce: 'testnonce', scriptUri: 'media/preview-main.mjs', styleUri: 'media/preview.css' });
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  if (u === '/') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(page); }
  const f = path.join(MEDIA, u.replace(/^\/media\//, ''));
  if (!f.startsWith(MEDIA) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'text/plain' }); r.end(fs.readFileSync(f));
});
const text = `---\nJot: 1.0\n---\n\n# A week\n\n### 2026-10-26 | Monday\n\n[x] Walk\n[ ] \n\n:::record measurement #s1\nmetric: sleep\nunit: h\nvalue: 7.5\n:::\n\n### 2026-10-27 | Tuesday\n\n:::record measurement #s2\nmetric: sleep\nunit: h\nvalue: 6\n:::\n\n:::record observation #o2\nsteps: 9100\n:::\n\n:::record chart #week\nmetrics: sleep, steps\nstart: 2026-10-26\nend: 2026-11-01\nstyle: bars\n:::\n\n<script>window.bad=1</script>\n`;
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('ok   ' + m); };
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch(), p = await b.newPage(), errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { window.__sent = []; let state; window.acquireVsCodeApi = () => ({ postMessage: (m) => window.__sent.push(m), getState: () => state, setState: (s) => { state = s; } }); });
  try {
    await p.goto(`http://127.0.0.1:${srv.address().port}/`);
    await p.waitForFunction(() => window.__sent.some((m) => m.type === 'ready'));
    ok(true, 'the webview says it is ready (the extension then sends the text)');
    await p.evaluate((t) => window.postMessage({ type: 'update', text: t, name: 'week.jot' }, '*'), text);
    await p.waitForSelector('.jot-chart svg');
    ok(await p.$$eval('.jot-chart svg', (s) => s.length) === 2, 'the chart record draws one chart per metric (sleep, steps)');
    ok(await p.$$eval('.jc-bar', (s) => s.length) === 3, 'bars for the days that have numbers (two nights of sleep, one day of steps)');
    ok(/avg 6\.8 h/.test(await p.textContent('.jot-chart')), 'the summary line: the average and its unit');
    ok(/2 dated entries · 1 chart · valid Jot/.test(await p.textContent('#status')), 'the status line counts entries and charts');
    ok(await p.$('.jot-blank-line') && /Sleep:\s*7\.5 h/.test(await p.textContent('.jot-page')), 'measurements and empty task lines read as a page');
    ok(await p.evaluate(() => window.bad === undefined) && /omitted from preview/.test(await p.textContent('.jot-page')), 'raw HTML in a journal is never run or rendered');
    await p.evaluate(() => window.postMessage({ type: 'update', text: '### 2026-10-28\n\nJust words.\n' }, '*'));
    await p.waitForFunction(() => !document.querySelector('.jot-chart'));
    ok(/Just words/.test(await p.textContent('.jot-page')), 'an edit redraws the page');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
    console.log(`\n${n} checks passed`);
  } finally { await b.close(); srv.close(); }
});
