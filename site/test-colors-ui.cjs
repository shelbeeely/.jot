// Shared color rendering, handwriting defaults, editing, persistence, export and print.
// Run from the repository root: node site/test-colors-ui.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const root = path.join(__dirname, 'dist'), output = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-colors-'));
async function command(page, label) {
  await page.click('#writerCommandsBtn'); await page.fill('#writerCommandsSearch', label);
  await page.locator('#writerCommandsList strong').filter({ hasText: new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).locator('..').click();
}
async function openColorTools(page) {
  if (!await page.locator('.writer-format').isVisible()) await command(page, 'Formatting controls');
  if (!await page.locator('#writerColorTools').isVisible()) await page.click('#writerColorsToggle');
}
async function openPreview(page) {
  if (await page.locator('html').getAttribute('data-writer-view') === 'write') await command(page, 'Side by side');
}
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end(); }
  if (file.endsWith(path.sep) || fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', ({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch();
    const page = await browser.newPage({viewport:{width:1440,height:1100}}), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const url = `http://127.0.0.1:${server.address().port}/write/`;
    await page.goto(url); await require('./test-source-workspace.cjs')(page);
    assert.equal(await page.inputValue('#writing'), '');
    await openPreview(page); await openColorTools(page);
    assert.equal(await page.inputValue('#look'), 'hand');
    assert.equal(await page.inputValue('#formatColor'), '#fddd13');
    assert.equal(await page.locator('#formatPreset optgroup option').count(), 71);
    await page.locator('.palette-picker summary').click();
    await page.getByRole('button',{name:'Lemon sunshine · #ffdc74',exact:true}).click();
    assert.equal(await page.inputValue('#formatColor'),'#ffdc74');
    assert.equal(await page.inputValue('#formatPreset'),'#ffdc74');
    await page.locator('.palette-picker summary').click();
    await page.waitForFunction(() => document.querySelector('#paperPreview').classList.contains('jot-hand'));
    await page.fill('#writing', '### 2026-10-26\n\nColorful handwriting');
    await page.waitForTimeout(400);
    const selectAllWords = () => page.$eval('#writing', e => { const start = e.value.indexOf('\n\n') + 2; e.focus(); e.setSelectionRange(start,e.value.length); });
    for (const [effect,color] of [['ink','#b33951'],['highlight','#ffe680'],['strike','#c0392b'],['underline','#245ac2']]) {
      await selectAllWords();
      await page.selectOption('#formatEffect', effect);
      if (effect === 'highlight') await page.selectOption('#highlightStyle','brush');
      await page.locator('#formatColor').fill(color);
      await page.click('#applyColor');
    }
    // Reapplying the same effect replaces the old selected color, rather than nesting an ineffective override.
    await selectAllWords(); await page.selectOption('#formatEffect','ink');
    await page.locator('#formatColor').fill('#1d5c3a'); await page.click('#applyColor');
    assert.ok(!(await page.inputValue('#writing')).includes('ink=#b33951'));
    assert.equal(await page.locator('#paperPreview .hw-w').last().evaluate(e=>getComputedStyle(e).color),'rgb(29, 92, 58)');
    await selectAllWords(); await page.locator('#formatColor').fill('#b33951'); await page.click('#applyColor');
    await page.evaluate(() => document.querySelector('#paperPreview').jotReady);
    const source = await page.inputValue('#writing');
    assert.ok(source.includes('ink=#b33951') && source.includes('highlight=#ffe680') && source.includes('strike=#c0392b') && source.includes('underline=#245ac2'));
    const appearance = () => page.locator('#paperPreview .jot-colors .hw-w').first().evaluate(e => {
      const s = getComputedStyle(e); return {ink:s.color,background:s.backgroundImage,font:s.fontFamily,adjust:s.printColorAdjust};
    });
    const screen = await appearance();
    assert.equal(screen.ink, 'rgb(179, 57, 81)');
    assert.ok(screen.background.includes('192, 57, 43') && screen.background.includes('36, 90, 194'));
    assert.ok(screen.font.includes('Jot Caveat'));
    assert.equal(await page.locator('#paperPreview .jot-highlight').evaluate(e=>getComputedStyle(e).getPropertyValue('--jot-highlight')).then(s=>s.trim()), '#ffe680');
    await page.emulateMedia({media:'print'});
    assert.deepEqual(await appearance(), screen);
    assert.equal(await page.locator('.format-tools').evaluate(e=>getComputedStyle(e).display), 'none');
    await page.pdf({path:path.join(output,'handwritten-colors.pdf'),printBackground:true,preferCSSPageSize:true});
    await page.emulateMedia({media:'screen'});
    await page.locator('#paperPreview').screenshot({path:path.join(output,'handwritten-colors.png')});
    const download = page.waitForEvent('download'); await page.click('#exportPage');
    const exported = await download;
    const html = fs.readFileSync(await exported.path(),'utf8');
    assert.ok(html.includes('data:font/woff2;base64,') && html.includes('--jot-strike') && html.includes('--jot-underline'));
    assert.ok(!/<script\b/i.test(html));
    await page.reload(); await require('./test-source-workspace.cjs')(page);
    await openPreview(page); await openColorTools(page);
    assert.equal(await page.inputValue('#writing'), source);
    assert.equal(await page.inputValue('#look'), 'hand');
    await selectAllWords(); await page.click('#clearColor');
    assert.equal(await page.inputValue('#writing'), '### 2026-10-26\n\nColorful handwriting');
    await page.locator('#writing').press('Control+z');
    assert.equal(await page.inputValue('#writing'), source);
    await page.selectOption('#look','typed'); await page.reload(); await require('./test-source-workspace.cjs')(page);
    await openPreview(page);
    assert.equal(await page.inputValue('#look'), 'typed', 'preserve an existing explicit Typed preference');
    assert.equal(await page.locator('#paperPreview .jot-colors del').first().evaluate(e=>getComputedStyle(e).textDecorationColor),'rgb(192, 57, 43)');
    assert.equal(await page.locator('#paperPreview .jot-colors ins').first().evaluate(e=>getComputedStyle(e).textDecorationColor),'rgb(36, 90, 194)');
    await page.selectOption('#look','hand');
    const gallery = '### 2026-10-26 | A little color\n\n[Mildliner ink, with a thought to keep.]{ink=#717271}\n\n[A broad marker highlight]{highlight=#fddd13 highlight-style=marker}\n\n[A softer brush highlight]{highlight=#f3a6c8 highlight-style=brush}\n\n[Pencil strokes in the margin]{highlight=#95c8f3 highlight-style=pencil}\n\n[Changed my mind]{strike=#de556f} — [keep this part]{underline=#7474c1}\n\n==The same words== and ==The same words==';
    await page.fill('#writing',gallery); await page.waitForTimeout(450);
    await page.evaluate(()=>document.querySelector('#paperPreview').jotReady);
    const strokes = () => page.locator('#paperPreview mark, #paperPreview .jot-highlight').evaluateAll(es=>es.map(e=>e.style.backgroundImage));
    const firstStrokes = await strokes();
    assert.equal(firstStrokes.length,5);
    assert.notEqual(firstStrokes[3],firstStrokes[4], 'repeated words receive different strokes');
    await page.click('#reshuffle');
    const rewritten = await strokes();
    assert.notDeepEqual(rewritten,firstStrokes);
    assert.equal(await page.inputValue('#writing'), gallery, 'Rewrite does not alter the source');
    await page.reload(); await require('./test-source-workspace.cjs')(page); await openPreview(page); await page.evaluate(()=>document.querySelector('#paperPreview').jotReady);
    assert.deepEqual(await strokes(),rewritten, 'saved seed restores the same strokes');
    await page.emulateMedia({media:'print'});
    assert.deepEqual(await strokes(),rewritten, 'print uses the exact same highlight paths');
    await page.pdf({path:path.join(output,'highlight-alternatives.pdf'),printBackground:true,preferCSSPageSize:true});
    await page.emulateMedia({media:'screen'});
    await page.locator('#paperPreview').screenshot({path:path.join(output,'highlight-alternatives.png')});
    await page.fill('#writing','[~~changed~~ and ++remember++]{ink=#123456}');
    await page.waitForTimeout(450);
    for (const kind of ['del','ins']) {
      assert.ok(await page.locator('#paperPreview '+kind+' .hw-w').evaluate(e=>getComputedStyle(e).backgroundImage.includes('currentcolor') || getComputedStyle(e).backgroundImage.includes('18, 52, 86')), 'ordinary Markdown decorations survive applying ink color');
    }
    // Reject unsafe externally supplied AST colors as well as invalid source syntax.
    await page.evaluate(async()=>{
      const {parse} = await import('../jot/jot.mjs');
      const {renderPreview} = await import('../jot/preview.mjs');
      const ast = parse('[safe]{ink=#123456}');
      ast.nodes[0].markdown.tokens[0].colors = {ink:'url(https://evil.invalid)', 'highlight-style':'evil'};
      const target = document.createElement('div'); renderPreview(ast,target);
      if (target.querySelector('span').getAttribute('style') || target.querySelector('[data-highlight-style]')) throw Error('Unsafe AST color accepted');
    });
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1), 'no sideways page scroll');
    assert.deepEqual(errors, []);
    console.log('PASS: handwritten default, four combined colors, print parity, PDF, embedded-font export, persistence, clear/undo, Typed preference mobile layout, three highlight styles, per-occurrence variation and Rewrite/print stability.');
    console.log('Artifacts: '+output);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
