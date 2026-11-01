// The font catalog is a generated interface: exercise paging, alternate outlines, metrics and feature controls under a Pages subpath.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, 'dist'), prefix = '/.jot';
const outline = 'M0 0L450 0L450 500L0 500Z';
function fixture() {
  const glyphs = Array.from({ length: 80 }, (_, index) => ({ name: index === 65 ? 'a' : `glyph${index}`, unicode: index + 32, path: index ? outline : '', bounds: [0, 0, 450, 500], advanceWidth: 520, lsb: 0, rsb: 70 }));
  glyphs.push({ name: 'f_i.medi', unicode: null, path: 'M0 0L300 0L300 600L0 600Z', bounds: [0, 0, 300, 600], advanceWidth: 390, lsb: 0, rsb: 90, entry: [0, 180], exit: [390, 180] });
  return { fonts: ['sans', 'script05', 'script07', 'script10'].flatMap((id) => [400, 700].map((weight) => ({ id, family: id === 'sans' ? 'Jot Sans' : `Jot Script ${id.slice(-2)}`, profile: id === 'sans' ? 'sans' : { script05: '0.5', script07: '0.7', script10: '1.0' }[id], weight, file: `jot-${id}-${weight}.woff2`, unitsPerEm: 1000, ascent: 950, descent: -250, capHeight: 700, xHeight: 500, glyphs }))) };
}
const server = http.createServer((request, response) => {
  const url = decodeURIComponent(request.url.split('?')[0]);
  if (!url.startsWith(prefix + '/')) { response.writeHead(404); response.end(); return; }
  let file = path.resolve(root, '.' + url.slice(prefix.length));
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream'); response.end(data);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch(fs.existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] } : {});
  const origin = `http://127.0.0.1:${server.address().port}`, errors = [], remote = [];
  try {
    for (const mode of ['light', 'dark']) for (const width of [390, 1280]) {
      const page = await browser.newPage({ colorScheme: mode, viewport: { width, height: 950 } });
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('request', (request) => { if (!request.url().startsWith(origin + prefix + '/')) remote.push(request.url()); });
      await page.route('**/fonts/catalog.json', (route) => route.fulfill({ json: fixture() }));
      await page.goto(origin + prefix + '/fonts/');
      await page.waitForFunction(() => !document.getElementById('fontFamily').disabled);
      assert.equal(await page.inputValue('#fontFamily'), 'script'); assert.equal(await page.inputValue('#fontProfile'), '0.7');
      assert.match(await page.locator('#fontSpecimen').evaluate((element) => getComputedStyle(element).fontFamily), /Jot Script 07/);
      assert.equal(await page.locator('#glyphGrid button').count(), 48, 'the catalog does not put every outline in the page at once');
      await page.click('#glyphNext'); assert.equal(await page.locator('#glyphGrid button').count(), 33); assert.match(await page.textContent('#glyphPageState'), /Page 2 of 2/);
      await page.selectOption('#glyphKind', 'alternates');
      assert.equal(await page.locator('#glyphGrid button').count(), 1);
      await page.getByRole('button', { name: 'f_i.medi, alternate glyph' }).click();
      assert.match(await page.textContent('#glyphMetrics'), /Alternate \(unencoded\)/); assert.match(await page.textContent('#glyphMetrics'), /Entry anchor/);
      assert.equal(await page.locator('#glyphDiagram .glyph-outline').getAttribute('d'), 'M0 0L300 0L300 600L0 600Z');
      assert.equal(await page.locator('#glyphDiagram .glyph-anchor').count(), 2);
      await page.selectOption('#glyphKind', 'all'); await page.fill('#glyphSearch', 'U+0061');
      assert.equal(await page.locator('#glyphGrid button').count(), 1); await page.getByRole('button', { name: 'a, U+0061', exact: true }).click();
      assert.match(await page.textContent('#glyphTitle'), /a/); assert.equal(await page.locator('#glyphGrid button').getAttribute('aria-pressed'), 'true');
      await page.selectOption('#fontProfile', '1.0'); await page.selectOption('#fontWeight', '700');
      assert.match(await page.locator('#fontSpecimen').evaluate((element) => getComputedStyle(element).fontFamily), /Jot Script 10/);
      assert.equal(await page.locator('#fontSpecimen').evaluate((element) => getComputedStyle(element).fontWeight), '700');
      await page.fill('#fontSample', 'office café <img onerror=alert(1)>');
      await page.uncheck('#fontLiga'); await page.uncheck('#fontCalt');
      assert.equal(await page.textContent('#fontSpecimen'), 'office café <img onerror=alert(1)>'); assert.equal(await page.locator('#fontSpecimen img').count(), 0);
      const features = await page.locator('#fontSpecimen').evaluate((element) => getComputedStyle(element).fontFeatureSettings);
      assert.match(features, /"liga" 0/); assert.match(features, /"calt" 0/);
      await page.selectOption('#fontFamily', 'sans');
      await page.check('#fontAlternates');
      assert.match(await page.locator('#fontSpecimen').evaluate((element) => getComputedStyle(element).fontFeatureSettings), /"ss01"(?: 1)?(?:,|$)/);
      assert.equal(await page.locator('#fontProfileWrap').isVisible(), false);
      assert.match(await page.locator('#fontSpecimen').evaluate((element) => getComputedStyle(element).fontFamily), /Jot Sans/);
      await page.fill('#glyphSearch', 'there-is-no-such-glyph'); assert.match(await page.textContent('#glyphCount'), /No glyphs match/); assert.equal(await page.locator('#glyphGrid button').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${mode} ${width}: viewport width`);
      if (fs.existsSync(path.join(root, '../..', 'node_modules/axe-core/axe.min.js'))) {
        await page.addScriptTag({ path: path.join(root, '../..', 'node_modules/axe-core/axe.min.js') });
        const failures = await page.evaluate(async () => (await axe.run()).violations.filter((issue) => ['serious', 'critical'].includes(issue.impact)).map((issue) => `${issue.id}: ${issue.nodes.map((node) => node.target).join(', ')}`));
        assert.deepEqual(failures, [], `${mode} ${width}: accessibility`);
      }
      await page.close();
    }
    const failed = await browser.newPage(); await failed.route('**/fonts/catalog.json', (route) => route.fulfill({ status: 404, body: 'Not found' }));
    await failed.goto(origin + prefix + '/fonts/'); await failed.locator('#fontState[data-error]').waitFor();
    assert.equal(await failed.locator('#fontFamily').isDisabled(), true); await failed.fill('#fontSample', 'My sample remains editable.');
    assert.equal(await failed.textContent('#fontSpecimen'), 'My sample remains editable.'); await failed.close();
    const catalogPath = path.join(root, 'fonts/catalog.json');
    if (fs.existsSync(catalogPath)) {
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8')), actual = await browser.newPage();
      actual.on('pageerror', (error) => errors.push(error.message)); await actual.goto(origin + prefix + '/fonts/');
      await actual.waitForFunction(() => !document.getElementById('fontFamily').disabled);
      for (const font of catalog.fonts) {
        await actual.selectOption('#fontFamily', font.id.startsWith('script') ? 'script' : font.id);
        if (font.id.startsWith('script')) await actual.selectOption('#fontProfile', String(font.profile));
        await actual.selectOption('#fontWeight', String(font.weight));
        const loaded = await actual.evaluate(async ({ family, weight }) => (await document.fonts.load(`${weight} 32px '${family}'`)).length, font);
        assert.ok(loaded > 0, `${font.family} ${font.weight}: generated WOFF2 loads`);
        const glyph = font.glyphs.find((item) => item.unicode === 97);
        await actual.fill('#glyphSearch', 'U+0061'); await actual.getByRole('button', { name: new RegExp(`^${glyph.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, U\\+0061$`) }).click();
        assert.equal(await actual.locator('#glyphDiagram .glyph-outline').getAttribute('d'), glyph.path, 'the inspector uses the generated source outline');
        const viewport = await actual.locator('#glyphDiagram svg').evaluate((svg) => {
          const box = svg.viewBox.baseVal; return [box.x, box.y, box.x + box.width, box.y + box.height];
        });
        assert.ok(glyph.bounds[0] > viewport[0] && glyph.bounds[2] < viewport[2]
          && -glyph.bounds[3] > viewport[1] && -glyph.bounds[1] < viewport[3],
        `${font.family} ${font.weight}: overhanging ink fits completely inside the SVG viewport`);
        assert.match(await actual.textContent('#glyphMetrics'), new RegExp(`${glyph.advanceWidth} units`));
      }
      await actual.emulateMedia({ media: 'print' });
      assert.equal(await actual.locator('#glyphDiagram .glyph-outline').evaluate((element) => getComputedStyle(element).fill), 'rgb(34, 34, 34)', 'printed outlines use dark ink on light paper');
      await actual.close(); console.log('PASS: actual generated catalog and every WOFF2 family/profile/weight.');
    }
    assert.deepEqual(errors, []); assert.deepEqual(remote, []);
    console.log('PASS: font inspector family/profile/weight, outlines and metrics, ligatures/contextual controls, search/pagination, local sample, mobile light/dark and Pages subpaths.');
  } finally { await browser.close(); server.close(); }
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
