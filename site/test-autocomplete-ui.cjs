// Stubbed Spotify iframe: verify consent, URL handling, persistence and removal without a real account.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + req.url.split('?')[0]);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1100, height: 900 } }), page = await context.newPage(), remote = [], errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:')) remote.push(request.url()); });
    await page.goto(`http://127.0.0.1:${server.address().port}/write/`);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-pref-size'));
    const command = async label => { await page.click('#writerCommandsBtn'); await page.fill('#writerCommandsSearch', label); await page.locator('#writerCommandsList button').filter({ has: page.getByText(label, { exact: true }) }).click(); };
    await command('Writing options');
    const source = "### 2026-10-27 | River walk\n\n#Work @Home #caf\u00e9\n\n:::record observation #reflection\nlabel: River reflection\nbody: Quiet water.\n:::\n\n:::record scale #mood-scale\nname: Mood range\nminimum: 1\nmaximum: 5\n:::\n\n:::record measurement #sleep\nmetric: sleep\nunit: h\nvalue: 7\n:::\n";
    const set = async (text) => { await page.fill('#writing', text); await page.locator('#writing').evaluate((editor) => editor.setSelectionRange(editor.value.length, editor.value.length)); };
    const open = () => page.locator('#localSuggestions:not([hidden])').waitFor();
    const choose = async () => { await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); };
    await set(source + '\n#wo'); await open();
    assert.match(await page.locator('#localSuggestionsList').textContent(), /#Work/);
    assert.equal(await page.inputValue('#writing'), source + '\n#wo', 'suggesting alone changes nothing');
    await choose(); assert.equal(await page.inputValue('#writing'), source + '\n#Work');
    await page.keyboard.press('Control+z'); assert.equal(await page.inputValue('#writing'), source + '\n#wo', 'one-step undo');
    await set(source + '\n@ho'); await open(); await choose(); assert.equal(await page.inputValue('#writing'), source + '\n@Home');
    await set(source + '\n[Read](#reflection'); await open(); await choose();
    assert.equal(await page.inputValue('#writing'), source + '\n[Read](#reflection)');
    await set(source + '\n:::record measurement\nmetric: sl'); await open(); await choose();
    assert.ok((await page.inputValue('#writing')).endsWith('metric: sleep'));
    await page.keyboard.type('\nunit: '); await open(); await choose();
    assert.ok((await page.inputValue('#writing')).endsWith('unit: h'));
    assert.ok(!(await page.inputValue('#writing')).endsWith('value: 7'), 'never fills a measurement value');
    await set(source + '\n#wo'); await open(); await page.keyboard.press('Escape'); assert.equal(await page.isVisible('#localSuggestions'), false);
    await page.keyboard.press('Control+Space'); await open();
    await page.keyboard.press('Enter'); assert.ok((await page.inputValue('#writing')).endsWith('#wo\n'), 'Enter without choosing keeps normal newline');
    await page.uncheck('#localSuggestionsEnabled'); await set(source + '\n#wo'); await page.waitForTimeout(500); assert.equal(await page.isVisible('#localSuggestions'), false);
    await page.reload(); await command('Writing options'); assert.equal(await page.isChecked('#localSuggestionsEnabled'), false); await page.check('#localSuggestionsEnabled');
    await set(source + '\n```\n#wo'); await page.waitForTimeout(500); assert.equal(await page.isVisible('#localSuggestions'), false);
    await set(source + '\n#wo');
    await page.locator('#writing').evaluate((editor) => editor.dispatchEvent(new CompositionEvent('compositionstart')));
    await page.waitForTimeout(500); assert.equal(await page.isVisible('#localSuggestions'), false);
    await page.locator('#writing').evaluate((editor) => editor.dispatchEvent(new CompositionEvent('compositionend'))); await open();
    await page.keyboard.press('Escape'); await command('Focus mode');
    await set(source + '\n#wo'); await open(); await choose();
    assert.equal(await page.isVisible('#localSuggestions'), false); assert.ok((await page.inputValue('#writing')).endsWith('#Work'));
    await page.keyboard.press('Escape');
    for (const mode of ['light', 'dark']) {
      await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: mode });
      await set(source + '\n#wo'); await open();
      const rect = await page.locator('#localSuggestions').boundingBox(); assert.ok(rect.x >= 0 && rect.x + rect.width <= 391 && rect.y >= 0 && rect.y + rect.height <= 845);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.addScriptTag({ path: path.join(__dirname, '../node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run([document.getElementById('localSuggestions'), document.getElementById('writing')])).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })));
      assert.deepEqual(violations, []);
      await page.locator('#localSuggestionsList [role=option]').first().click(); assert.ok((await page.inputValue('#writing')).endsWith('#Work'));
    }
    await set('A new journal\n#wo'); await page.waitForTimeout(600); assert.equal(await page.isVisible('#localSuggestions'), false);
    assert.deepEqual(remote, []); assert.deepEqual(errors, []);
    console.log('PASS: current-document tags/contexts, entry and record links, metric/unit suggestions, keyboard and pointer insertion, one-step undo, dismissal/disable persistence, IME/code exclusion, focus mode, mobile bounds and accessibility, no remote requests or cross-document suggestions.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
