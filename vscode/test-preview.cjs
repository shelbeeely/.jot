// The preview webview in Chromium: the page extension.js makes, its own media files, a stand-in for the VS Code API.
// Text in -> the page and its charts out, the same as the site. Needs playwright (installed globally, or npm install at the repository root).
//   node test-preview.cjs
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { webviewHtml } = require('./extension.js');
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('../node_modules/playwright-core')); }
const MEDIA = path.join(__dirname, 'media');
const TYPES = { '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.woff2': 'font/woff2' };
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
    await p.waitForSelector('.jot-chart canvas');
    const charts = await p.evaluate(async () => { const { Chart } = await import('/media/jot/vendor/chart.mjs'); return [...document.querySelectorAll('.jot-chart canvas')].map((c) => { const ch = Chart.getChart(c); return { type: ch.config.type, data: ch.data.datasets[0].data, w: c.width }; }); });
    ok(charts.length === 2 && charts.every((c) => c.w > 0), 'the chart record draws one Chart.js chart per metric (sleep, steps)');
    ok(charts.every((c) => c.type === 'bar') && charts.flatMap((c) => c.data).filter((v) => v !== null).length === 3, 'bars for the days that have numbers (two nights of sleep, one day of steps)');
    ok(/avg 6\.8 h/.test(await p.textContent('.jot-chart')), 'the summary line: the average and its unit');
    ok(/2 dated entries · 1 chart · valid Jot/.test(await p.textContent('#status')), 'the status line counts entries and charts');
    ok(await p.$('.jot-blank-line') && /Sleep:\s*7\.5 h/.test(await p.textContent('.jot-page')), 'measurements and empty task lines read as a page');
    ok(await p.evaluate(() => window.bad === undefined) && /omitted from preview/.test(await p.textContent('.jot-page')), 'raw HTML in a journal is never run or rendered');
    await p.evaluate((t) => window.postMessage({ type: 'update', text: t + '\nSome ==bright== and ++underlined++ words[^n].\n\n> [!NOTE]\n> A callout.\n\n[^n]: A note.\n', hand: { hand: 'pen', ink: 'black', pitchMm: 5 } }, '*'), text);
    await p.waitForFunction(() => document.querySelector('#page').jotGrid);
    const hand = await p.evaluate(() => ({ cls: document.querySelector('#page').classList.contains('jot-hand'), words: document.querySelectorAll('#page .hw-w').length, font: document.fonts.check("16px 'Jot Caveat'"), mark: !!document.querySelector('#page mark .hw-w'), note: !!document.querySelector('#page .jot-callout-note'), fn: !!document.querySelector('#page .jot-footnotes li'), ink: getComputedStyle(document.querySelector('#page')).color }));
    ok(hand.cls && hand.words > 10 && hand.font && hand.ink === 'rgb(34, 38, 42)', 'handwritten: the pen font loads from the extension\'s own files, in the ink the settings chose');
    ok(hand.mark && hand.note && hand.fn, 'fuller formatting in the preview: a highlight, a callout and a footnote');
    await p.evaluate((t) => window.postMessage({ type: 'update', text: t + '\n[>] Later\n#home @kitchen\n', style: 'journal' }, '*'), text);
    await p.waitForSelector('#page.jot-style-journal .jot-date time');
    ok(await p.evaluate(() => /Monday, 26 October 2026/.test(document.querySelector('#page .jot-date').textContent) && !!document.querySelector('#page .jot-task-migrated') && !!document.querySelector('#page .jot-tag') && !!document.querySelector('#page .jot-context')), 'the Journal style: dates in words, a moved task, a tag and a context');
    await p.evaluate(() => window.postMessage({ type: 'export', title: 'week' }, '*'));
    await p.waitForFunction(() => window.__sent.some((m) => m.type === 'exported'));
    const ex = await p.evaluate(() => window.__sent.find((m) => m.type === 'exported'));
    ok(!ex.error && /^<!doctype html>/.test(ex.html) && /<title>week<\/title>/.test(ex.html) && /jot-style-journal/.test(ex.html) && /<img[^>]+src="data:image\/png;base64,/.test(ex.html) && !/127\.0\.0\.1|<canvas|<script/.test(ex.html) && /@page \{ size: 210mm 297mm;/.test(ex.html), 'Export as HTML: one standalone page, charts as pictures, nothing to fetch or run, A4 for printing');
    await p.evaluate(() => window.postMessage({ type: 'update', text: '### 2026-10-25 | Sunday\n\nRain.\n\n### 2026-10-26 | Monday\n\nSee [yesterday](#2026-10-25), [the plan](#plan), [gone](#nowhere) and [elsewhere](other.jot#a).\n\n:::record note #plan\nrelation: continues #2026-10-25\n:::\n' + '\n'.repeat(80) + 'End.\n' }, '*'));
    await p.waitForSelector('#page .jot-backlinks');
    const links = await p.evaluate(() => { const a = [...document.querySelectorAll('#page a')].find((x) => x.textContent === 'yesterday'), t = document.querySelector(a.getAttribute('href')); return { href: a.getAttribute('href'), tag: t && t.tagName, rec: !!document.querySelector('#page section.jot-record#jotln-page-plan'), back: [...document.querySelectorAll('#page .jot-backlinks')].map((b) => b.textContent), gone: document.querySelector('#page .jot-link-unresolved')?.textContent, status: document.querySelector('#status').textContent }; });
    ok(links.href === '#jotln-page-2026-10-25' && links.tag === 'H3' && links.rec, 'a link to a date or #id points at the prefixed id of that heading or record');
    ok(links.back.length === 2 && links.back.every((t) => /^Linked from /.test(t)) && /Monday,? 26 October 2026 · note #plan$/.test(links.back[0]), 'targets list where they are linked from (the entry, and the record by its relation)');
    ok(links.gone === 'gone' && /5 links \(1 unresolved\) · 1 problem/.test(links.status), 'a missing target stays visible text, and the status line counts links');
    ok(await p.evaluate(() => document.querySelector('#page .jot-record dd a')?.getAttribute('href') === '#jotln-page-2026-10-25'), 'a record\'s relation field links to its target');
    await p.click('#page .jot-record dd a'); await p.waitForFunction(() => location.hash === '#jotln-page-2026-10-25');
    ok(await p.evaluate(() => document.querySelector(':target')?.tagName === 'H3'), 'following that link targets the dated heading');
    await p.evaluate(() => window.postMessage({ type: 'update', text: '### 2026-10-28\n\nJust words.\n' }, '*'));
    await p.waitForFunction(() => !document.querySelector('.jot-chart'));
    ok(/Just words/.test(await p.textContent('.jot-page')), 'an edit redraws the page');
    const includes = { 'notes/week.jot': '### 2026-10-25\n\nRain on the window[^r].\n\n[^r]: Heavy.\n\n![back](../main.jot)\n\n### 2026-10-26\n\nSun.\n', 'loop/a.jot': '![](b.jot)\n', 'loop/b.jot': '![](a.jot)\n', 'd/1.jot': '![](2.jot)\n', 'd/2.jot': '![](3.jot)\n', 'd/3.jot': '![](4.jot)\n', 'd/4.jot': 'Bottom.\n' };
    await p.evaluate((inc) => window.postMessage({ type: 'update', from: 'main.jot', includes: inc, text: 'Mine[^r].\n\n[^r]: Mine too.\n\n![Sunday](notes/week.jot#2026-10-25)\n\n![gone](gone.jot)\n\n![web](https://example.com/x.jot)\n\n![loop](loop/a.jot)\n\n![deep](d/1.jot)\n\n![x](notes/week.jot#nope)\n' }, '*'), includes);
    await p.waitForSelector('.jot-include[aria-label="Included from notes/week.jot#2026-10-25"]');
    const inc = await p.evaluate(() => { const box = document.querySelector('.jot-include[data-source="notes/week.jot#2026-10-25"]'); return { text: box.textContent, ids: [...document.querySelectorAll('[id]')].map((e) => e.id), notes: [...document.querySelectorAll('.jot-include-missing')].map((e) => e.textContent) }; });
    ok(/Sunday · notes\/week\.jot#2026-10-25/.test(inc.text) && /Rain on the window/.test(inc.text) && !/Sun\./.test(inc.text), 'an include shows the dated entry it names, framed and labelled with its source');
    ok(new Set(inc.ids).size === inc.ids.length && inc.ids.some((i) => /inc\d+-r$/.test(i)), 'included footnotes keep ids of their own (no clash with the page\'s)');
    ok(inc.notes.some((t) => /not repeated: \.\.\/main\.jot/.test(t)) && inc.notes.some((t) => /not repeated: a\.jot|not repeated: b\.jot/.test(t)), 'a loop stops with a notice');
    ok(inc.notes.some((t) => /not found: gone\.jot/.test(t)) && inc.notes.some((t) => /not allowed: https:/.test(t)) && inc.notes.some((t) => /too deep: 4\.jot/.test(t)) && inc.notes.some((t) => /not found: notes\/week\.jot#nope/.test(t)), 'missing, unsafe, too-deep and unknown-fragment includes each say so');
    ok(await p.evaluate(() => /Bottom/.test(document.body.textContent) === false), 'nothing beyond three levels is drawn');
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
    console.log(`\n${n} checks passed`);
  } finally { await b.close(); srv.close(); }
});
