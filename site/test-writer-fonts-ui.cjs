// Real text editing stays source-preserving while the chosen pen and above-ink markers change its appearance.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, 'dist');
const server = http.createServer((request, response) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(request.url.split('?')[0])); }
  catch { response.writeHead(400); response.end(); return; }
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, bytes) => {
    if (error) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    response.end(bytes);
  });
});

async function selectVisible(page, text, end = text.length) {
  await page.locator('#liveWriting').evaluate((surface, selection) => {
    surface.focus();
    const start = surface.textContent.indexOf(selection.text);
    if (start < 0) throw new Error('Missing visible text: ' + selection.text);
    const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT), leaves = [];
    let offset = 0, leaf;
    while ((leaf = walker.nextNode())) { leaves.push({ node: leaf, from: offset, to: offset + leaf.data.length }); offset += leaf.data.length; }
    const point = (value, end) => {
      const found = leaves.find(item => end ? value > item.from && value <= item.to : value >= item.from && value < item.to) || leaves.at(-1);
      if (!found) throw new Error('No text at visible offset ' + value);
      return [found.node, value - found.from];
    };
    const [a, from] = point(start, false), [b, to] = point(start + selection.end, true), range = document.createRange();
    range.setStart(a, from); range.setEnd(b, to);
    const current = getSelection(); current.removeAllRanges(); current.addRange(range);
  }, { text, end });
  await page.waitForTimeout(20);
}

async function checkFontLoads(page, family) {
  const faces = await page.evaluate(async family => Promise.all([400, 700].map(async weight => {
    const loaded = await document.fonts.load(`${weight} 22px "${family}"`);
    return { weight, faces: loaded.map(font => ({ weight: font.weight, status: font.status })) };
  })), family);
  for (const result of faces) {
    assert.ok(result.faces.length > 0 && result.faces.every(font => font.status === 'loaded' && font.weight === String(result.weight)), `${family} has a loaded real ${result.weight} face`);
  }
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.JOT_CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`, errors = [];
    for (const mode of ['light', 'dark']) {
      const context = await browser.newContext({ colorScheme: mode, viewport: { width: 1100, height: 900 } });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/write/');
      const surface = page.locator('#liveWriting'), font = page.getByRole('combobox', { name: 'Writing font', exact: true });
      await surface.waitFor(); await font.waitFor();
      assert.equal(await font.inputValue(), 'script-07');
      await checkFontLoads(page, 'Jot Script 07');
      assert.match(await surface.evaluate(element => getComputedStyle(element).fontFamily), /Jot Script 07/);
      assert.equal(await surface.evaluate(element => getComputedStyle(element).fontSize), '22px');
      assert.equal(await surface.evaluate(element => getComputedStyle(element).fontSynthesis), 'none');
      assert.equal(await font.locator('option').count(), 4);
      assert.ok(await font.evaluate(element => !!element.closest('.writer-file-actions')), 'the font choice is in the visible top bar');
      const originalSize = await page.locator('html').getAttribute('data-pref-size');
      let previous = 0;
      for (const [preference, size] of [['s', 18], ['m', 22], ['l', 26], ['xl', 30]]) {
        await page.locator('html').evaluate((element, value) => { element.dataset.prefSize = value; }, preference);
        const measured = await surface.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        assert.equal(measured, size, `${preference} uses ${size}px live writing`);
        assert.ok(measured > previous, 'each larger writing preference increases text size'); previous = measured;
      }
      await page.locator('html').evaluate((element, value) => { if (value === null) delete element.dataset.prefSize; else element.dataset.prefSize = value; }, originalSize);
      const fixture = 'Before ==café &amp; tea \\* stars== after.';
      await surface.evaluate((element, text) => {
        element.focus(); const transfer = new DataTransfer(); transfer.setData('text/plain', text);
        element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
      }, fixture);
      const source = () => page.inputValue('#writing');
      assert.equal(await source(), fixture);
      assert.equal(await surface.textContent(), 'Before café & tea * stars after.');
      assert.equal(await surface.locator('mark .jot-highlight-word').count(), 5);
      const stroke = await surface.locator('.jot-highlight-word').first().evaluate(element => ({
        blend: getComputedStyle(element, '::after').mixBlendMode,
        image: getComputedStyle(element, '::after').backgroundImage,
        pointer: getComputedStyle(element, '::after').pointerEvents,
        background: getComputedStyle(element.closest('mark')).backgroundColor,
      }));
      assert.equal(stroke.blend, 'multiply'); assert.match(stroke.image, /data:image\/svg\+xml/);
      assert.equal(stroke.pointer, 'none'); assert.equal(stroke.background, 'rgba(0, 0, 0, 0)');
      await selectVisible(page, 'café & tea');
      await page.waitForFunction(({ start, end }) => {
        const editor = document.getElementById('writing'); return editor.selectionStart === start && editor.selectionEnd === end;
      }, { start: fixture.indexOf('café'), end: fixture.indexOf('tea') + 3 });
      await page.keyboard.insertText('coffee');
      assert.equal(await source(), 'Before ==coffee \\* stars== after.', 'a selection spans word wrappers and the complete entity source');
      await page.keyboard.press('Control+z'); assert.equal(await source(), fixture);
      await selectVisible(page, '& tea *'); await page.keyboard.insertText('té & cake');
      assert.equal(await source(), 'Before ==café té & cake stars== after.', 'mapped escapes remain editable across highlight fragments');
      await page.keyboard.press('Control+z'); assert.equal(await source(), fixture);
      await selectVisible(page, 'café', 4); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Backspace');
      assert.equal(await source(), 'Before ==caf &amp; tea \\* stars== after.');
      await page.keyboard.press('Control+z'); assert.equal(await source(), fixture);
      for (const [value, family] of [['script-05', 'Jot Script 05'], ['script-10', 'Jot Script 10'], ['sans', 'Jot Sans']]) {
        await font.selectOption(value);
        await checkFontLoads(page, family);
        assert.ok((await surface.evaluate(element => getComputedStyle(element).fontFamily)).includes(family));
        assert.equal(await source(), fixture, 'font selection leaves journal source untouched');
      }
      await font.selectOption('script-05');
      await page.reload(); await page.locator('#liveWriting').waitFor();
      assert.equal(await font.inputValue(), 'script-05'); assert.equal(await source(), fixture);
      await page.locator('#writing').evaluate(editor => editor.jotSetMode('source'));
      assert.ok(await font.isDisabled());
      assert.match(await page.locator('#writing').evaluate(element => getComputedStyle(element).fontFamily), /monospace/);
      await page.locator('#writing').evaluate(editor => editor.jotSetMode('live'));
      assert.ok(await font.isEnabled()); assert.equal(await font.inputValue(), 'script-05');
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, 'the extra selector fits a mobile top bar');
      await page.addScriptTag({ path: path.join(__dirname, '../node_modules/axe-core/axe.min.js') });
      const issues = await page.evaluate(async () => (await axe.run()).violations.filter(issue => ['serious', 'critical'].includes(issue.impact)).map(issue => issue.id));
      assert.deepEqual(issues, []);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: persistent pen choices, custom-font CSS, source-mode monospace, above-ink marker SVGs, mapped selection/edit/undo across highlighted words, accents and escapes, mobile layout and accessibility in light/dark modes.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
