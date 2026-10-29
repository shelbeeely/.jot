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
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`, browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }), page = await context.newPage();
    const remote = [], errors = [];
    const observe = (target) => {
      target.on('pageerror', (error) => errors.push(error.message));
      target.on('request', (request) => { if (!request.url().startsWith(base)) remote.push(request.url()); });
    };
    observe(page);
    await page.goto(base + '/write/'); await require('./test-source-workspace.cjs')(page);
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-pref-size'));
    const command = async (query, target = page) => {
      await target.click('#writerCommandsBtn'); await target.fill('#writerCommandsSearch', query);
      const label = new RegExp('^' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i');
      await target.locator('#writerCommandsList button').filter({ has: target.locator('strong').filter({ hasText: label }) }).click();
    };
    const set = async (text, start = text.length, end = start) => {
      await page.fill('#writing', text);
      await page.locator('#writing').evaluate((editor, range) => { editor.focus(); editor.setSelectionRange(...range); }, [start, end]);
    };
    const value = () => page.inputValue('#writing');
    const audit = async (target, selector) => {
      await target.addScriptTag({ path: path.join(__dirname, '../node_modules/axe-core/axe.min.js') });
      const violations = await target.evaluate(async (selection) => (await axe.run(document.querySelector(selection))).violations.filter((violation) => ['serious', 'critical'].includes(violation.impact)).map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) })), selector);
      assert.deepEqual(violations, [], `accessibility: ${selector}`);
    };

    // A first visit opens a blank, quiet writing surface with tools available on demand.
    assert.equal(await value(), '');
    assert.equal(await page.locator('html').getAttribute('data-writer-view'), 'write');
    await command('Journal tools');
    for (const selector of ['body>header', '.studio-intro', '.tool-row', '.writer-format', '.writing-footer', '.preview-pane', '.jot-foundation', '.asset-shelf']) assert.equal(await page.isVisible(selector), false, selector);
    assert.ok((await page.locator('#writing').boundingBox()).y < 180, 'writing starts near the top on desktop');
    assert.doesNotMatch(await page.locator('#writing').evaluate((editor) => getComputedStyle(editor).fontFamily), /Caveat|cursive/i, 'source uses a standard reading font');
    assert.doesNotMatch(await page.locator('.studio-bar').evaluate((bar) => getComputedStyle(bar).fontFamily), /Caveat|cursive/i, 'editor controls use a standard reading font');
    assert.ok(await page.isVisible('#openBtn') && await page.isVisible('#saveDevice') && await page.isVisible('#writerCommandsBtn'));
    await audit(page, 'body');
    await command('Side by side');
    assert.equal(await page.locator('html').getAttribute('data-writer-view'), 'split');
    assert.ok(await page.isVisible('.preview-pane'));
    assert.match(await page.locator('#paperPreview').evaluate((paper) => getComputedStyle(paper).fontFamily), /Caveat|cursive/i, 'the formatted paper retains its handwriting font');
    await command('Write only');
    assert.equal(await page.locator('html').getAttribute('data-writer-view'), 'write');
    await command('Journal tools'); await command('Formatting controls'); await command('Writing options');

    // Formatting is a reversible source edit, including when a touch-style toolbar button receives focus.
    await set('A quiet café.', 2, 12);
    await page.keyboard.press('Control+b');
    assert.equal(await value(), 'A **quiet café**.');
    await page.keyboard.press('Control+z');
    assert.equal(await value(), 'A quiet café.', 'formatting is one native undo step');
    await set('A quiet café.', 2, 12);
    await page.click('.writer-format [data-write-action="italic"]');
    assert.equal(await value(), 'A *quiet café*.');
    await page.keyboard.press('Control+z'); assert.equal(await value(), 'A quiet café.');
    await set('A quiet café.', 2, 12);
    await command('Page preview');
    assert.equal(await page.isVisible('#writing'), false);
    await page.click('#writerCommandsBtn'); await page.fill('#writerCommandsSearch', 'Bold');
    await page.locator('#writerCommandsList button').first().click();
    assert.equal(await value(), 'A **quiet café**.');
    assert.ok(await page.isVisible('#writing'), 'editing commands reveal the writing from preview');
    await page.keyboard.press('Control+z'); assert.equal(await value(), 'A quiet café.', 'formatting from preview retains native undo');

    // Structural typing preserves an intentional blank line and starts new tasks unchecked.
    await page.check('#writerSmartLists');
    await set('- [x] Make tea'); await page.keyboard.press('Enter');
    assert.equal(await value(), '- [x] Make tea\n- [ ] ');
    await page.keyboard.press('Enter'); assert.equal(await value(), '- [x] Make tea\n');
    await set('7. First'); await page.keyboard.press('Enter'); assert.equal(await value(), '7. First\n8. ');
    await set('Normal prose'); await page.keyboard.press('Tab');
    assert.equal(await value(), 'Normal prose', 'ordinary Tab continues keyboard navigation');
    await set('```\n- code'); await page.keyboard.press('Enter'); assert.equal(await value(), '```\n- code\n');
    await set('- composition');
    const composition = await page.locator('#writing').evaluate((editor) => {
      editor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      const event = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true });
      editor.dispatchEvent(event);
      editor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
      return { value: editor.value, prevented: event.defaultPrevented };
    });
    assert.deepEqual(composition, { value: '- composition', prevented: false }, 'IME owns its Enter key');
    await set('- software keyboard');
    const mobileEnter = await page.locator('#writing').evaluate((editor) => {
      const event = new InputEvent('beforeinput', { inputType: 'insertParagraph', bubbles: true, cancelable: true });
      editor.dispatchEvent(event);
      return { value: editor.value, prevented: event.defaultPrevented };
    });
    assert.deepEqual(mobileEnter, { value: '- software keyboard\n- ', prevented: true }, 'soft-keyboard paragraph input continues a list');
    await page.uncheck('#writerSmartLists');
    await set('- manual'); await page.keyboard.press('Enter'); assert.equal(await value(), '- manual\n');
    await page.reload(); await require('./test-source-workspace.cjs')(page); await page.waitForFunction(() => document.documentElement.hasAttribute('data-pref-size'));
    assert.equal(await page.isChecked('#writerSmartLists'), false, 'list preference is remembered');
    await command('Journal tools'); await command('Formatting controls'); await command('Writing options');
    await page.check('#writerSmartLists');

    // Chosen autocomplete consumes Enter before list continuation.
    await set('#Work\n\n- #wo');
    await page.locator('#localSuggestions:not([hidden])').waitFor();
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    assert.equal(await value(), '#Work\n\n- #Work');

    // Plain-text search does not alter source; replacement treats dollar syntax as literal text.
    await set('Café café caféine\nCafé', 0);
    await page.keyboard.press('Control+f');
    assert.equal(await page.locator('#writerSearchDialog').evaluate((dialog) => dialog.open), true);
    await page.fill('#writerSearchQuery', 'café');
    await page.check('#writerSearchWhole');
    assert.match(await page.textContent('#writerSearchStatus'), /3/);
    assert.equal(await value(), 'Café café caféine\nCafé');
    await page.fill('#writerSearchReplacement', '$& 🌿');
    await page.click('#writerSearchReplaceAll');
    assert.equal(await value(), '$& 🌿 $& 🌿 caféine\n$& 🌿');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'writing');
    await page.keyboard.press('Control+z'); assert.equal(await value(), 'Café café caféine\nCafé', 'replace all is one undo step');
    await command('Find and replace'); await page.fill('#writerSearchQuery', 'Café');
    await page.locator('#writing').evaluate((editor) => { editor.value += '\nAnother Café'; editor.dispatchEvent(new Event('input', { bubbles: true })); });
    const changedSource = await value(); await page.click('#writerSearchReplaceAll');
    assert.equal(await value(), changedSource, 'a changed document must be reviewed before replacement');
    await page.keyboard.press('Escape');
    await set('Preview words. Preview words.', 0);
    await command('Page preview'); await command('Find and replace');
    await page.fill('#writerSearchQuery', 'Preview'); await page.fill('#writerSearchReplacement', 'Reviewed');
    await page.click('#writerSearchReplaceAll'); await page.keyboard.press('Escape');
    assert.equal(await value(), 'Reviewed words. Reviewed words.');
    await page.keyboard.press('Control+z'); assert.equal(await value(), 'Preview words. Preview words.', 'search opened from preview retains native undo');

    // Commands discover existing journal workflows; Escape returns to the original selected writing.
    await set('A place to write.', 2, 7);
    await page.keyboard.press('Control+k');
    assert.equal(await page.locator('#writerCommandsDialog').evaluate((dialog) => dialog.open), true);
    await page.fill('#writerCommandsSearch', 'carry');
    assert.match(await page.textContent('#writerCommandsList'), /Carry tasks/i);
    assert.equal(await value(), 'A place to write.');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'writing');
    assert.deepEqual(await page.locator('#writing').evaluate((editor) => [editor.selectionStart, editor.selectionEnd]), [2, 7]);

    // The outline follows actual parsed headings and never interprets code as a destination.
    const outlined = '# Notebook\n\n### 2026-10-28 | Wednesday\n\nFirst words.\n\n```\n#### Hidden code heading\n```\n\n#### Second section\n\nMore words.';
    await set(outlined, 0); await command('Outline');
    assert.match(await page.textContent('#writerOutlineList'), /Second section/);
    assert.doesNotMatch(await page.textContent('#writerOutlineList'), /Hidden code heading/);
    await page.fill('#writerOutlineSearch', 'Second');
    await page.locator('#writerOutlineList button').first().click();
    assert.equal(await page.locator('#writerOutlineDialog').evaluate((dialog) => dialog.open), false);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'writing');
    assert.ok(await page.locator('#writing').evaluate((editor) => editor.selectionStart >= editor.value.indexOf('#### Second section')));

    // Reviewed templates add blank prompts, preserve selected prose and retain native undo.
    const templateDocument = 'Before.\n\nKeep these words.\n\nAfter.';
    await set(templateDocument, templateDocument.indexOf('Keep'), templateDocument.indexOf('\n\nAfter'));
    const openTemplates = async () => {
      await page.click('#writerCommandsBtn'); await page.fill('#writerCommandsSearch', 'Entry templates');
      await page.locator('#writerCommandsList button').first().click();
    };
    await command('Page preview'); await openTemplates();
    await page.selectOption('#writerTemplateKind', 'monthly');
    assert.match(await page.inputValue('#writerTemplateSource'), /Monthly recap/);
    assert.equal(await value(), templateDocument, 'choosing a template changes no journal content');
    await page.fill('#writerTemplateSource', '#### My recap\n\n##### What changed?\n\n[ ] ');
    await page.click('#writerTemplateInsert');
    assert.equal(await value(), 'Before.\n\nKeep these words.\n\n#### My recap\n\n##### What changed?\n\n[ ] \n\nAfter.');
    await page.keyboard.press('Control+z'); assert.equal(await value(), templateDocument, 'templates opened from preview retain native undo');
    await openTemplates(); await page.fill('#writerTemplateSource', ':::record observation\nlabel: Unclosed');
    await page.click('#writerTemplateInsert');
    assert.equal(await value(), templateDocument, 'invalid template source is rejected');
    assert.match(await page.textContent('#writerTemplateStatus'), /Fix the template/i);
    await page.fill('#writerTemplateSource', '#### A valid prompt\n\nWhat did I notice?');
    await page.locator('#writing').evaluate((editor) => { editor.value += '\nChanged'; editor.dispatchEvent(new Event('input', { bubbles: true })); });
    const templateChanged = await value(); await page.click('#writerTemplateInsert');
    assert.equal(await value(), templateChanged, 'templates guard their captured insertion point');
    assert.match(await page.textContent('#writerTemplateStatus'), /writing changed/i);
    await page.keyboard.press('Escape');

    // The preference and view buttons agree, including a deliberate return to preview.
    await command('Side by side'); await command('Writing preferences');
    await page.uncheck('#prefPreview');
    assert.equal(await page.locator('html').getAttribute('data-writer-view'), 'write');
    assert.equal(await page.locator('#writerViewWrite').getAttribute('aria-pressed'), 'true');
    await page.click('#prefsDone'); assert.ok(await page.isVisible('#writing'));
    assert.equal(await page.isVisible('.preview-pane'), false);
    await command('Page preview');
    assert.equal(await page.locator('html').getAttribute('data-writer-view'), 'preview');
    assert.equal(await page.locator('#writerViewPreview').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.isChecked('#prefPreview'), true, 'choosing preview explicitly reenables its preference');
    assert.ok(await page.isVisible('.preview-pane'));
    await command('Write only');

    // Commands remain available in focus mode; dismissing a chooser does not also leave focus mode.
    await command('Focus mode'); await page.keyboard.press('Control+k');
    await page.fill('#writerCommandsSearch', 'find'); await page.keyboard.press('Escape');
    assert.equal(await page.locator('html').evaluate((element) => element.hasAttribute('data-focus')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('html').evaluate((element) => element.hasAttribute('data-focus')), false);

    // Mobile defaults put writing ahead of the preview and collapse the long secondary tool rows.
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), phone = await mobile.newPage();
    observe(phone); await phone.goto(base + '/write/'); await require('./test-source-workspace.cjs')(phone);
    await phone.waitForFunction(() => document.documentElement.hasAttribute('data-pref-size')); await command('Journal tools', phone);
    assert.equal(await phone.locator('html').getAttribute('data-writer-view'), 'write');
    assert.equal(await phone.inputValue('#writing'), '');
    assert.ok((await phone.locator('#writing').boundingBox()).y < 180, 'writing starts near the top on mobile');
    assert.ok(await phone.isVisible('#writerCommandsBtn'));
    assert.equal(await phone.isVisible('.tool-row'), false, 'secondary tools collapse by default');
    assert.equal(await phone.isVisible('.writer-format'), false, 'formatting controls collapse by default');
    assert.equal(await phone.isVisible('.format-tools'), false, 'color tools collapse by default');
    await command('Journal tools', phone); assert.ok(await phone.isVisible('#voiceBtn'));
    await phone.click('#writerToolsToggle'); assert.equal(await phone.isVisible('.tool-row'), false);
    await command('Formatting controls', phone);
    await phone.click('#writerColorsToggle'); assert.ok(await phone.isVisible('.format-tools'));
    await phone.click('#writerColorsToggle');
    await command('Formatting controls', phone);
    await command('Page preview', phone); assert.ok(await phone.isVisible('.preview-pane'));
    await command('Write only', phone); assert.ok(await phone.isVisible('#writing'));
    await phone.fill('#writing', 'Mobile words.');
    await phone.locator('#writing').evaluate((editor) => editor.setSelectionRange(0, 6));
    await command('Page preview', phone); await phone.click('#writerCommandsBtn');
    await phone.fill('#writerCommandsSearch', 'Bold'); await phone.locator('#writerCommandsList button').first().click();
    assert.equal(await phone.locator('html').getAttribute('data-writer-view'), 'write');
    assert.equal(await phone.inputValue('#writing'), '**Mobile** words.');
    await phone.keyboard.press('Control+z'); assert.equal(await phone.inputValue('#writing'), 'Mobile words.', 'mobile commands from preview retain native undo');
    for (const scheme of ['light', 'dark']) {
      await phone.emulateMedia({ colorScheme: scheme });
      for (const width of [320, 390]) {
        await phone.setViewportSize({ width, height: 844 });
        assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${scheme}: no sideways scroll at ${width}px`);
      }
      await phone.setViewportSize({ width: 390, height: 844 });
      const targets = await phone.locator('.studio-bar button').evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().height).map((element) => ({ name: element.getAttribute('aria-label') || element.textContent, height: element.getBoundingClientRect().height })));
      assert.ok(targets.every((target) => target.height >= 44), JSON.stringify(targets));
      await audit(phone, 'body');
      await phone.click('#writerCommandsBtn'); await audit(phone, '#writerCommandsDialog'); await phone.keyboard.press('Escape');
      await command('find and replace', phone); await audit(phone, '#writerSearchDialog'); await phone.keyboard.press('Escape');
      await command('outline', phone); await audit(phone, '#writerOutlineDialog'); await phone.keyboard.press('Escape');
      await command('Entry templates', phone); await audit(phone, '#writerTemplatesDialog'); await phone.keyboard.press('Escape');
    }
    await mobile.close(); await context.close();

    // The compact file controls retain plain downloads and packaged attachments.
    const files = await browser.newContext({ viewport: { width: 1100, height: 900 } }), filePage = await files.newPage();
    observe(filePage); await filePage.goto(base + '/write/'); await require('./test-source-workspace.cjs')(filePage);
    await filePage.waitForFunction(() => document.documentElement.hasAttribute('data-pref-size'));
    const opened = '# Portable note\n\nKeep these words.\n';
    const openChoice = filePage.waitForEvent('filechooser'); await command('Open imported file', filePage);
    await (await openChoice).setFiles({ name: 'minimal-note.jot', mimeType: 'text/plain', buffer: Buffer.from(opened) });
    await filePage.waitForFunction((expected) => document.getElementById('writing').value === expected, opened);
    const plainDownload = filePage.waitForEvent('download'); await command('Download journal', filePage);
    const plain = await plainDownload;
    assert.equal(plain.suggestedFilename(), 'minimal-note.jot');
    assert.equal(fs.readFileSync(await plain.path(), 'utf8'), opened);
    const attachChoice = filePage.waitForEvent('filechooser');
    await filePage.click('#writerCommandsBtn'); await filePage.fill('#writerCommandsSearch', 'Attach a file');
    assert.equal(await filePage.locator('#writerCommandsList button strong').first().textContent(), 'Attach a file', 'an exact tool name ranks before broader matches');
    await filePage.keyboard.press('Enter');
    await (await attachChoice).setFiles({ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('A local attachment.') });
    await filePage.waitForFunction(() => document.getElementById('docExt').textContent === '.jotz');
    assert.ok(await filePage.isVisible('#writerAssetShelf'));
    assert.match(await filePage.textContent('#assetList'), /note\.txt/);
    const withAttachment = await filePage.inputValue('#writing');
    await filePage.click('#writerAssetsClose'); assert.equal(await filePage.isVisible('#writerAssetShelf'), false);
    await command('Attached files', filePage); assert.ok(await filePage.isVisible('#writerAssetShelf'));
    assert.equal(await filePage.inputValue('#writing'), withAttachment, 'reviewing attached files does not change writing');
    const packageDownload = filePage.waitForEvent('download'); await command('Download journal', filePage);
    const packaged = await packageDownload;
    assert.equal(packaged.suggestedFilename(), 'minimal-note.jotz');
    assert.deepEqual([...fs.readFileSync(await packaged.path()).subarray(0, 2)], [0x50, 0x4b]);
    await files.close();
    assert.deepEqual(remote, [], 'writing tools never make remote requests'); assert.deepEqual(errors, []);
    console.log('PASS: minimal blank editor, on-demand tools, native undo, smart lists/IME/autocomplete, literal search, outline/templates, source guards, focus mode, file controls/attachments, mobile preview, 320/390px light/dark touch targets and accessibility, no remote requests.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
