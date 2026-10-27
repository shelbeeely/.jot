// Palettes and moodboards: swatch chips (text, contrast, invalid colors), the moodboard grid, handwriting, print, export,
// and the workspace's copy and add tools. Run from the repository root: node site/test-palette-ui.cjs [shots-folder]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const root = path.join(__dirname, 'dist'), shots = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'jot-palette-'));
const AXE = path.join(__dirname, '../node_modules/axe-core/axe.min.js');
fs.mkdirSync(shots, { recursive: true });
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end(); }
  if (file.endsWith(path.sep) || fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', ({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2','.json':'application/json'})[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SOURCE = `### 2026-10-27 | Tuesday

:::record palette #autumn
label: Autumn zine
color: #C0392B brick red
color: #f4d03f mustard
color: #234 deep slate
color: #fffefa paper
color: brick
:::

:::record moodboard #rain
label: Rain study
image: assets/dot.png A single dot of colour
caption: Tuesday
credit: [me](https://example.com)
image: assets/missing.jpg Wet boots
color: #1f3a8a ink blue
body: Grey and wet.
:::

![one](assets/dot.png) ![two](assets/nothing.png)
`;
(async () => {
  let browser;
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch();
    const url = `http://127.0.0.1:${server.address().port}/write/`;
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(url).origin });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url);
    await page.setInputFiles('#attachFile', { name: 'dot.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForFunction(() => /1 asset/.test(document.getElementById('assetCount').textContent));
    await page.fill('#writing', SOURCE); await page.waitForTimeout(450);
    const check = async (label) => {
      const chips = await page.$$eval('#paperPreview .jot-palette .jot-swatch', (els) => els.map((e) => ({ text: e.textContent, bg: getComputedStyle(e).backgroundColor, ink: getComputedStyle(e).color, hex: e.dataset.hex, visible: e.getBoundingClientRect().height > 20 })));
      assert.equal(chips.length, 4, label);
      const lum = (rgb) => { const c = rgb.match(/\d+/g).slice(0, 3).map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722; };
      for (const c of chips) {
        assert.ok(c.visible, `${label}: ${c.hex} visible`);
        assert.ok(c.text.replace(/\s/g, '').includes(c.hex), `${label}: ${c.hex} shows its hex as text`);
        const a = lum(c.bg), b = lum(c.ink), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        assert.ok(ratio >= 4.5, `${label}: ${c.hex} label contrast ${ratio.toFixed(2)}`);
      }
      assert.ok(chips[0].text.replace(/\s/g, '').includes('brickred'), label);
      assert.match(await page.locator('#paperPreview .jot-swatch-invalid').textContent(), /Not a color: “brick”/);
      assert.equal(await page.locator('#paperPreview .jot-moodboard .jot-mood img').getAttribute('alt'), 'A single dot of colour');
      assert.match(await page.locator('#paperPreview .jot-moodboard .jot-mood-missing').textContent(), /assets\/missing\.jpg · not attached/);
      assert.equal(await page.locator('#paperPreview .jot-moodboard .jot-mood-credit a').getAttribute('href'), 'https://example.com');
      assert.equal(await page.locator('#paperPreview div.jot-mood-grid[aria-label="Pictures"] figure').count(), 2);
    };
    // Handwritten (the default look)
    await page.evaluate(() => document.querySelector('#paperPreview').jotReady);
    assert.ok(await page.locator('#paperPreview').evaluate((e) => e.classList.contains('jot-hand')));
    await check('handwritten');
    await page.emulateMedia({ media: 'print' });
    await check('handwritten print');
    assert.equal(await page.locator('#paperPreview .jot-swatch').first().evaluate((e) => getComputedStyle(e).printColorAdjust), 'exact');
    await page.emulateMedia({ media: 'screen' });
    // Typed
    await page.selectOption('#look', 'typed'); await page.waitForTimeout(300);
    await check('typed');
    await page.emulateMedia({ media: 'print' }); await check('typed print'); await page.emulateMedia({ media: 'screen' });
    // Checks list the unreadable color
    await page.click('#checksTab'); assert.match(await page.locator('#checkList').textContent(), /#RRGGBB/); await page.click('#previewTab');
    // Standalone export keeps swatches and their styles
    const html = await page.evaluate(async () => (await import('../jot/export.mjs')).exportHTML(document.querySelector('#paperPreview')));
    assert.ok(html.includes('jot-swatch') && html.includes('.jot-swatches{') && html.includes('background-color: rgb(192, 57, 43)') && html.includes('data:image/png;base64,'));
    assert.ok(!/<script\b/i.test(html));
    // Copy tools: caret inside the moodboard copies its colors; inside the palette, the palette's
    const caret = (needle) => page.$eval('#writing', (e, n) => { const i = e.value.indexOf(n); e.focus(); e.setSelectionRange(i, i); }, needle);
    await caret('color: #f4d03f'); await page.click('#paletteCssBtn');
    const css = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(css, '/* Autumn zine: a Jot palette */\n:root {\n  --brick-red: #c0392b; /* brick red */\n  --mustard: #f4d03f; /* mustard */\n  --deep-slate: #223344; /* deep slate */\n  --paper: #fffefa; /* paper */\n}\n');
    assert.match(await page.locator('#journalNotice').textContent(), /Copied 4 colors from “Autumn zine”.*1 not a color/);
    await caret('body: Grey'); await page.click('#paletteJsonBtn');
    assert.deepEqual(JSON.parse(await page.evaluate(() => navigator.clipboard.readText())), { name: 'Rain study', colors: [{ name: 'ink blue', hex: '#1f3a8a', variable: '--ink-blue' }] });
    // Add to palette: the chosen reference color, before the closing :::
    await caret('color: brick'); await page.selectOption('#formatPreset', '#fddd13'); await page.click('#addSwatch');
    const text = await page.inputValue('#writing');
    assert.ok(/color: brick\ncolor: #fddd13 [^\n]+\n:::\n\n:::record moodboard/.test(text), text.slice(0, 300));
    await page.waitForTimeout(400); assert.equal(await page.locator('#paperPreview .jot-palette .jot-swatch').count(), 5);
    assert.deepEqual(errors, []);
    // Phone width, light and dark
    for (const scheme of ['light', 'dark']) {
      const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.emulateMedia({ colorScheme: scheme });
      await m.goto(url); await m.waitForTimeout(500);
      assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= 390), `390 px ${scheme}: no sideways scroll`);
      await m.locator('#paperPreview .jot-palette').scrollIntoViewIfNeeded();
      await m.locator('#paperPreview .jot-palette').screenshot({ path: path.join(shots, `palette-390-${scheme}.png`) });
      await m.locator('#paperPreview .jot-moodboard').screenshot({ path: path.join(shots, `moodboard-390-${scheme}.png`) });
      await m.selectOption('#look', 'hand'); await m.evaluate(() => document.querySelector('#paperPreview').jotReady);
      await m.locator('#paperPreview .jot-palette').screenshot({ path: path.join(shots, `palette-hand-390-${scheme}.png`) });
      if (fs.existsSync(AXE)) {
        await m.addScriptTag({ path: AXE });
        const v = await m.evaluate(async () => (await window.axe.run('#paperPreview', { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target).join(' ')}`));
        assert.deepEqual(v, [], `axe ${scheme}`);
      }
      await m.close();
    }
    console.log(`palette UI: swatches, contrast, invalid note, moodboard, handwriting, print, export, copy and add tools pass. Shots: ${shots}`);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
