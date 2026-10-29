// Same-surface Jot editing in Chromium. Composition is synthetic; this is not physical-device IME verification.
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
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`, browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await context.newPage(), remote = [], errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (!request.url().startsWith(base)) remote.push(request.url()); });
    await page.route('https://**/*', (route) => route.abort());
    await page.goto(base + '/write/');
    await page.waitForFunction(() => document.getElementById('liveWriting')?.isContentEditable);
    const live = page.locator('#liveWriting'), source = () => page.inputValue('#writing');
    const command = async (label) => {
      await page.click('#writerCommandsBtn'); await page.fill('#writerCommandsSearch', label);
      await page.locator('#writerCommandsList button').filter({ has: page.locator('strong').filter({ hasText: new RegExp('^' + label + '$', 'i') }) }).click();
    };
    const load = async (text) => {
      const picker = page.waitForEvent('filechooser');
      await command('Open imported file');
      page.once('dialog', (dialog) => dialog.accept());
      await (await picker).setFiles({ name: 'live-note.jot', mimeType: 'text/plain', buffer: Buffer.from(text) });
      await page.waitForFunction((expected) => document.getElementById('writing').value === expected, text.replace(/\r\n/g, '\n'));
    };
    const selectText = async (text) => {
      await live.evaluate((editor, wanted) => {
        editor.focus();
        const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          const start = node.textContent.indexOf(wanted);
          if (start < 0) continue;
          const range = document.createRange(); range.setStart(node, start); range.setEnd(node, start + wanted.length);
          const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); return;
        }
        throw new Error('Missing editable text: ' + wanted);
      }, text);
    };
    const paste = async (text, html = '') => live.evaluate((editor, content) => {
      const data = new DataTransfer(); data.setData('text/plain', content.text); if (content.html) data.setData('text/html', content.html);
      editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    }, { text, html });

    assert.ok(await live.isVisible()); assert.equal(await page.isVisible('#writing'), false);
    assert.equal(await page.isVisible('.preview-pane'), false, 'editing uses one continuous document');
    assert.equal(await source(), ''); assert.ok((await live.boundingBox()).y < 180);
    await live.focus(); await page.keyboard.type('# A heading');
    await page.waitForFunction(() => !!document.querySelector('#liveWriting h1'));
    assert.equal(await source(), '# A heading');
    await page.keyboard.press('Enter'); await page.keyboard.type('Words with **bold** and _italic_.');
    await page.waitForFunction(() => document.querySelector('#liveWriting strong')?.textContent.includes('bold'));
    assert.ok(await live.locator('em').count());
    assert.match(await source(), /Words with \*\*bold\*\* and _italic_\./);

    const opaque = ':::record future-profile #future\nlabel: A future record\nunknown-key: Keep  2 spaces\n:::\n\n| Name | Value |\n| --- | --- |\n| Tea | 2 |\n\n```jot\n# Literal heading\n**literal bold**\n```\n\n/* Keep this comment exactly. */\n\n<script>window.jotSourceExecuted=true</script>\n';
    const fixture = '\ufeff# Notebook\n\nA quiet morning at café 🌿 &amp; home.\n\n- First item\n- Second item\n\n' + opaque;
    await load(fixture);
    assert.equal(await source(), fixture);
    assert.ok(await live.locator('li, .live-list').count() >= 2);
    assert.equal(await live.locator('h1').count(), 1, 'a fenced heading is never a live heading');
    assert.equal(await page.evaluate(() => !!window.jotSourceExecuted), false);
    const editSource = live.getByRole('button', { name: /edit source/i });
    assert.ok(await editSource.count(), 'complex blocks expose direct source editing');
    await editSource.first().click(); assert.ok(await page.isVisible('#writing'));
    assert.equal(await source(), fixture); await command('Live editing');
    await selectText('quiet'); await command('Bold');
    await page.waitForFunction(() => document.getElementById('writing').value.includes('A **quiet** morning'));
    assert.ok(await live.isVisible(), 'formatting a selection keeps the live surface');
    assert.ok((await source()).endsWith(opaque), 'editing prose leaves opaque Jot blocks unchanged');
    await live.focus(); await page.keyboard.press('Control+z'); assert.equal(await source(), fixture, 'one undo removes the formatting transaction');
    await page.keyboard.press('Control+Shift+z'); assert.match(await source(), /A \*\*quiet\*\* morning/);
    await page.keyboard.press('Control+z');
    await selectText('home'); await page.keyboard.press('Control+b');
    assert.match(await source(), /café 🌿 &amp; \*\*home\*\*/);
    await page.keyboard.press('Control+z'); assert.equal(await source(), fixture, 'source mapping survives entities and surrogate pairs');

    await selectText('quiet');
    await paste('calm <b>plain text</b>', '<img src="https://example.invalid/jot-paste.png" onerror="window.jotPasteExecuted=true"><b>Wrong HTML content</b>');
    await page.waitForFunction(() => document.getElementById('writing').value.includes('calm <b>plain text</b>'));
    assert.equal(await page.evaluate(() => !!window.jotPasteExecuted), false);
    assert.equal(await live.locator('img[src^="https://example.invalid"]').count(), 0);
    assert.ok((await source()).endsWith(opaque));
    await page.keyboard.press('Control+z'); assert.equal(await source(), fixture, 'plain-text paste is one undoable source edit');

    // Composition owns its editable DOM until compositionend; no duplicate committed text.
    await load('IME words.'); await selectText('words');
    const composition = await live.evaluate((editor) => {
      const block = editor.firstChild;
      editor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      document.execCommand('insertText', false, '日本語');
      const stable = editor.firstChild === block;
      editor.dispatchEvent(new CompositionEvent('compositionend', { data: '日本語', bubbles: true }));
      return stable;
    });
    assert.equal(composition, true, 'composition does not replace the active DOM block');
    await page.waitForFunction(() => document.getElementById('writing').value.includes('日本語'));
    assert.equal(await source(), 'IME 日本語.');

    // Advanced Jot can always be edited directly and brought back without a document conversion.
    await load(fixture); const beforeSourceMode = await source();
    await command('Source editing'); assert.ok(await page.isVisible('#writing'));
    assert.equal(await live.isVisible(), false); assert.equal(await source(), beforeSourceMode);
    await page.fill('#writing', fixture + '\n#Work\n\n#wo');
    await page.locator('#writing').evaluate((editor) => { editor.focus(); editor.setSelectionRange(editor.value.length, editor.value.length); });
    await page.locator('#localSuggestions:not([hidden])').waitFor();
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); assert.ok((await source()).endsWith('#Work'));
    const completed = await source(); await command('Live editing');
    assert.ok(await live.isVisible()); assert.equal(await source(), completed);

    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scheme}: no horizontal overflow at ${width}px`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addScriptTag({ path: path.join(__dirname, '../node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document.body)).violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)).map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) })));
      assert.deepEqual(violations, []);
    }
    assert.deepEqual(remote, [], 'rendering and pasting writing never contacts an external host'); assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: one live Jot surface, typed heading/inline formatting, lists, lossless opaque blocks, selection tools, undo/redo, safe plain-text paste, synthetic composition, source editing/autocomplete, mobile light/dark accessibility, no remote requests.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
