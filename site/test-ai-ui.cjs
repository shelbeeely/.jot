// Writer controls, local search/navigation and responsive layouts in Chromium. No external service is used.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0])); }
  catch { res.writeHead(400); res.end(); return; }
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [], requests = []; page.on('pageerror', error => errors.push(error.message));
    let draft = 'I enjoyed a quiet walk.', finish = 'stop', release;
    let hold = false;
    await page.route('https://openrouter.ai/api/v1/chat/completions', async route => {
      requests.push(route.request().postDataJSON());
      if (hold) await new Promise(resolve => { release = resolve; });
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ choices: [{ finish_reason: finish, message: { content: JSON.stringify({ candidates: [{ label: 'A quiet walk', jot: draft }] }) } }] }) }).catch(() => {});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/write/`);
    await require('./test-source-workspace.cjs')(page);
    const original = 'Private unrelated entry.\n\nWalk notes.';
    await page.fill('#writing', original);
    await page.locator('#writing').evaluate(editor => { editor.focus(); editor.setSelectionRange(26, editor.value.length); });
    await page.click('#writerAIBtn');
    assert.equal(await page.isChecked('#aiEnabled'), false);
    assert.equal(await page.isChecked('#aiSuggestionsEnabled'), false);
    assert.equal(await page.isChecked('#aiZdr'), true);
    assert.equal(requests.length, 0);
    await page.check('#aiEnabled'); await page.fill('#aiModel', 'example/model'); await page.fill('#aiKey', 'test-key'); await page.fill('#aiInstruction', 'Put my notes together.');
    assert.equal(await page.inputValue('#aiContext'), '');
    await page.check('#aiContextEnabled'); assert.equal(await page.inputValue('#aiContext'), 'Walk notes.');
    await page.click('#aiDraft'); await page.waitForFunction(() => !document.getElementById('aiReview').hidden);
    assert.equal(await page.inputValue('#writing'), original);
    assert.equal(requests[0].provider.zdr, true);
    assert.equal(JSON.parse(requests[0].messages[1].content).context, 'Walk notes.');
    assert.equal(JSON.stringify(requests[0]).includes('Private unrelated entry'), false);
    assert.equal(await page.evaluate(() => JSON.stringify(localStorage).includes('test-key')), false);
    await page.click('#aiApply'); assert.equal(await page.inputValue('#writing'), 'Private unrelated entry.\n\nI enjoyed a quiet walk.');
    await page.locator('#writing').focus(); await page.keyboard.press('Control+z'); assert.equal(await page.inputValue('#writing'), original);
    await page.click('#writerAIBtn'); await page.uncheck('#aiZdr'); await page.check('#aiSuggestionsEnabled'); await page.click('#aiSuggest');
    await page.waitForFunction(() => !document.getElementById('aiReview').hidden); assert.equal(requests[1].provider.zdr, false);
    await page.fill('#writing', original + '\nChanged.'); assert.equal(await page.isVisible('#aiReview'), false);
    await page.click('#aiRefresh'); draft = ':::record note\nbroken\n:::'; await page.click('#aiDraft');
    await page.waitForFunction(() => document.getElementById('aiMessage').textContent.includes('syntax diagnostics'));
    assert.equal(await page.isVisible('#aiReview'), false);
    draft = 'A new thought.'; finish = 'length'; await page.click('#aiDraft'); await page.waitForFunction(() => document.getElementById('aiMessage').textContent.includes('did not finish'));
    finish = 'stop';
    // Live mode uses the same reviewed, source-backed undo hook.
    await page.evaluate(() => document.getElementById('writing').jotSetMode('live'));
    await page.click('#writerAIBtn'); await page.click('#aiDraft'); await page.waitForFunction(() => !document.getElementById('aiReview').hidden); await page.click('#aiApply');
    assert.match(await page.inputValue('#writing'), /A new thought\./);
    await page.keyboard.press('Control+z'); assert.equal(await page.inputValue('#writing'), original + '\nChanged.');
    await page.click('#writerAIBtn'); await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await axe.run(document.getElementById('writerAI'))).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id));
    assert.deepEqual(violations, []);
    await page.emulateMedia({ colorScheme: 'dark' });
    const darkViolations = await page.evaluate(async () => (await axe.run(document.getElementById('writerAI'))).violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id));
    assert.deepEqual(darkViolations, []);
    hold = true; const beforeCancel = requests.length;
    await page.click('#aiDraft'); await page.waitForFunction(() => document.getElementById('aiCancel').hidden === false);
    for (let i = 0; requests.length === beforeCancel && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(requests.length, beforeCancel + 1);
    await page.click('#aiCancel'); release?.(); hold = false;
    assert.equal(await page.isVisible('#aiReview'), false);
    await page.click('#aiDisconnect'); assert.equal(await page.inputValue('#aiKey'), ''); assert.equal(await page.isVisible('#writerAI'), false);
    await page.click('#writerAIBtn'); await page.check('#aiEnabled'); await page.fill('#aiKey', 'test-key');
    page.once('dialog', dialog => dialog.accept()); await page.evaluate(() => document.getElementById('newBtn').click());
    await page.waitForFunction(() => document.getElementById('writing').value === '');
    assert.equal(await page.inputValue('#aiKey'), ''); assert.equal(await page.isChecked('#aiEnabled'), false); assert.equal(await page.isVisible('#writerAI'), false);
    assert.deepEqual(errors, []);
    console.log('AI companion: scoped mocked requests, ZDR on/off, opt-in suggestions, validation, source/live undo, stale edits, session keys and mobile accessibility pass.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
