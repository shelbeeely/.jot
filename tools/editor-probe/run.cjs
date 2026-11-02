// Research-only Chromium probe. Dependencies and generated output live in a separate scratch directory.
const { chromium } = require('playwright');
const { createRequire } = require('node:module');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const packages = ['@codemirror/state', '@codemirror/view', '@codemirror/commands', 'draftly', 'prosemirror-markdown', '@milkdown/kit'];
(async () => {
  if (!process.argv[2]) throw Error('Usage: node tools/editor-probe/run.cjs /absolute/path/to/scratch-directory');
  const scratch = path.resolve(process.argv[2]);
  const { build } = createRequire(path.join(scratch, 'package.json'))('esbuild');
  await build({ entryPoints: [path.join(__dirname, 'probe.mjs')], bundle: true, format: 'esm', outfile: path.join(scratch, 'probe.bundle.js'), nodePaths: [path.join(scratch, 'node_modules')], logLevel: 'warning' });
  const server = http.createServer((req, res) => {
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Jot editor probe</title></head><body><script type="module" src="/probe.bundle.js"></script></body></html>'); }
    else if (req.url === '/probe.bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(path.join(scratch, 'probe.bundle.js'))); }
    else { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch(); const page = await browser.newPage(); const errors = [], externalRequests = [];
    const base = `http://127.0.0.1:${server.address().port}`;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => { if (new URL(route.request().url()).origin === base) return route.continue(); externalRequests.push(route.request().url()); return route.abort(); });
    await page.goto(base); await page.waitForFunction(() => !!window.runProbe);
    const results = await page.evaluate(() => window.runProbe());
    if (results.length !== 20) throw Error('The probe did not run all 20 comparisons.');
    if (results.some(row => ['CodeMirror', 'Draftly'].includes(row.library) && (!row.exact || !row.undo || !row.redo))) throw Error('A source-based candidate lost text or failed undo/redo.');
    const versions = Object.fromEntries(packages.map(name => [name, JSON.parse(fs.readFileSync(path.join(scratch, 'node_modules', name, 'package.json'))).version]));
    const output = { versions, results, errors, externalRequests };
    fs.writeFileSync(path.join(scratch, 'results.json'), JSON.stringify(output, null, 2) + '\n');
    console.log(JSON.stringify(output, null, 2));
    if (errors.length || externalRequests.length || results.some(row => row.error)) throw Error('An editor failed to initialize or attempted an external request. Inspect results.json.');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
