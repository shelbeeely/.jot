// Entry scratchpads and margin notes in Writer: rough notes beside an entry (kept in the file, off the page), moving them
// into the entry, the live editor's card, margin notes beside a passage, Undo, and phone light/dark accessibility.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [], external = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin)) external.push(r.url()); });
    await page.goto(origin + '/write/');
    await page.waitForFunction(() => !!document.getElementById('writing').jotSetMode);
    const src = '### 2026-11-03 | Tue\n\nOld entry.\n\n### 2026-11-04 | Wed\n\nThe heron was back.\n\n### 2026-11-05 | Thu\n\nLater.\n';
    await page.evaluate((t) => { const e = document.getElementById('writing'); e.value = t; e.dispatchEvent(new Event('input', { bubbles: true })); }, src);
    const writing = () => page.inputValue('#writing');
    const caretAt = (words) => page.locator('#writing').evaluate((e, w) => { const at = e.value.indexOf(w); e.setSelectionRange(at, at); }, words);

    // Outside a dated entry there is no scratchpad.
    await page.evaluate(() => { const e = document.getElementById('writing'); e.setSelectionRange(0, 0); });
    await page.evaluate(() => document.getElementById('scratchpadBtn').click());
    assert.equal(await page.isHidden('#scratchpad'), false, 'the heading line belongs to the entry');
    await page.click('#scratchClose');

    // Typing in the scratchpad writes a draft block under the heading; nothing else changes.
    await caretAt('heron');
    await page.evaluate(() => document.getElementById('scratchpadBtn').click());
    assert.equal(await page.textContent('#scratchDate'), '2026-11-04');
    await page.fill('#scratchText', 'heron, rain, canal\n[ ] look up heron species');
    await page.waitForFunction(() => document.getElementById('writing').value.includes('~~~draft'));
    let text = await writing();
    assert.equal(text, src.replace('### 2026-11-04 | Wed\n\n', '### 2026-11-04 | Wed\n\n~~~draft\nheron, rain, canal\n[ ] look up heron species\n~~~\n\n'));

    // The page leaves it off; the live editor shows a card.
    await page.waitForFunction(() => !!document.querySelector('#liveWriting .live-scratch'));
    assert.match(await page.textContent('#liveWriting .live-scratch'), /Scratchpad · 7 words/);
    const previewText = await page.evaluate(() => document.getElementById('paperPreview').textContent);
    assert.ok(previewText.includes('The heron was back'), previewText.slice(0, 200));
    assert.ok(!previewText.includes('canal') && !previewText.includes('species'), 'the scratchpad is not on the page');
    assert.equal(await page.evaluate(() => document.querySelectorAll('#paperPreview .jot-task').length), 0, 'scratchpad lines are not tasks');

    // Add selected words to the entry; the scratchpad keeps them.
    await page.locator('#scratchText').evaluate((t) => t.setSelectionRange(0, 18));
    await page.click('#scratchAdd');
    text = await writing();
    assert.ok(text.includes('The heron was back.\n\nheron, rain, canal\n\n### 2026-11-05'), text);
    assert.ok(text.includes('~~~draft\nheron, rain, canal\n'));
    await page.click('#writerUndo');
    assert.ok(!(await writing()).includes('back.\n\nheron, rain'), 'Undo removes the added words');

    // Clearing asks twice, removes the block, and Undo brings it back into the panel.
    await page.click('#scratchClear'); assert.match(await page.textContent('#scratchClear'), /Press again/);
    await page.click('#scratchClear');
    await page.waitForFunction(() => !document.getElementById('writing').value.includes('~~~draft'));
    assert.equal(await writing(), src);
    await page.click('#writerUndo');
    await page.waitForFunction(() => document.getElementById('scratchText').value.includes('heron, rain'));

    // Write it up: the AI companion gets only the scratchpad notes; the reviewed draft goes at the end of the entry.
    const sent = [];
    await page.route('http://127.0.0.1:11434/v1/chat/completions', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'content-type' } });
      sent.push(request.postData());
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin }, body: JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ candidates: [{ label: 'Draft', jot: 'The heron stood in the rain by the canal.' }] }) } }] }) });
    });
    const beforeWriteUp = await writing();
    await page.click('#scratchWriteUp');
    await page.waitForFunction(() => !document.getElementById('writerAI').hidden);
    assert.equal(await page.inputValue('#aiContext'), 'heron, rain, canal\n[ ] look up heron species');
    assert.match(await page.textContent('#aiTarget'), /end of the 2026-11-04 entry\. Your scratchpad stays/);
    assert.equal(sent.length, 0, 'nothing is sent on opening');
    await page.check('#aiEnabled'); await page.selectOption('#aiProvider', 'local'); await page.fill('#aiModel', 'test-model');
    assert.equal(await page.isHidden('#scratchpad'), true, 'the scratchpad steps aside');
    assert.equal(await page.inputValue('#aiContext'), 'heron, rain, canal\n[ ] look up heron species');
    await page.click('#aiDraft');
    await page.waitForFunction(() => !document.getElementById('aiReview').hidden);
    assert.equal(sent.length, 1);
    const body = JSON.parse(JSON.parse(sent[0]).messages[1].content);
    assert.equal(body.context, 'heron, rain, canal\n[ ] look up heron species');
    assert.ok(!sent[0].includes('Old entry') && !sent[0].includes('Later') && !sent[0].includes('The heron was back'), 'no other writing is sent');
    await page.click('#aiApply');
    const afterWriteUp = await writing();
    assert.ok(afterWriteUp.includes('The heron was back.\n\nThe heron stood in the rain by the canal.'), afterWriteUp);
    assert.ok(afterWriteUp.includes('~~~draft\nheron, rain, canal\n[ ] look up heron species\n~~~'), 'the scratchpad stays');
    assert.ok(afterWriteUp.startsWith('### 2026-11-03 | Tue\n\nOld entry.'));
    await page.keyboard.press('Control+z'); assert.equal(await writing(), beforeWriteUp, 'Undo removes the draft');
    await page.evaluate(() => document.getElementById('scratchpadBtn').click());

    // Accessibility on a phone, light and dark.
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.getElementById('scratchpad'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)), []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.emulateMedia({ colorScheme: 'light' });
    await page.click('#scratchClose');

    // The card's Open button opens the scratchpad for that entry.
    await page.click('#liveWriting .live-scratch button');
    assert.equal(await page.isHidden('#scratchpad'), false); assert.equal(await page.textContent('#scratchDate'), '2026-11-04');
    await page.click('#scratchClose');

    // A margin note from the Format menu goes after the passage and sits beside it on the page.
    await page.evaluate(() => document.getElementById('writing').jotSetMode('source'));
    await caretAt('Later');
    await page.click('#writerFormatTop'); await page.click('#writerFormatMenu >> text=Margin note…');
    await page.waitForFunction(() => document.getElementById('marginNoteDialog').open);
    assert.match(await page.textContent('#marginNoteFor'), /Later\./);
    await page.fill('#marginNoteText', 'Check the date');
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.getElementById('marginNoteDialog'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)), []);
    }
    await page.emulateMedia({ colorScheme: 'light' });
    await page.click('#marginNoteForm button[type=submit]');
    text = await writing();
    assert.ok(text.endsWith('Later.\n[[Check the date]]\n'), JSON.stringify(text.slice(-60)));
    await page.waitForFunction(() => [...document.querySelectorAll('#paperPreview .jot-margin')].some((a) => a.textContent.includes('Check the date')));
    await page.keyboard.press('Control+z');
    assert.ok(!(await writing()).includes('Check the date'), 'Undo removes the note');

    // Draw on a page is one step away from the margin note.
    await page.click('#writerFormatTop'); await page.click('#writerFormatMenu >> text=Draw on a page…');
    await page.waitForFunction(() => !document.getElementById('writerAnnotation').hidden);

    assert.deepEqual(errors, []); assert.deepEqual(external.filter((u) => !u.startsWith('http://127.0.0.1:11434/')), []);
    console.log('PASS: scratchpad under the entry heading (only that entry changes), literal and off the page, live card and Open, add selected words to the entry, two-step clear, Undo both ways, Write it up through the AI companion with only the notes sent, margin note after the passage and beside it on the page, Draw on a page from the Format menu, phone light/dark accessibility, no network requests.');
  } finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); server.close(); process.exitCode = 1; });
