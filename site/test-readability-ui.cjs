// Check composited colors, then independently sample real glyph pixels. Antialiased edges are not text-color samples.
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

const pixelCSS = `
.readability-pixel{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;box-sizing:border-box;width:1100px!important;min-width:1100px;max-width:none!important;padding:20px!important;background-image:none!important}
.readability-pixel p{margin:0!important;padding:0!important;min-height:110px!important;line-height:110px!important}
.readability-pixel .jot-highlight-word,#liveWriting .jot-highlight-word{font-size:70px!important;line-height:1.15!important;transform:none!important}
`;

async function renderProof(page, source, id, pixel = false) {
  await page.evaluate(async ({ source, id, pixel }) => {
    const { parse } = await import('/jot/jot.mjs'), { renderPreview } = await import('/jot/preview.mjs');
    document.getElementById(id)?.remove();
    const paper = document.createElement('article'); paper.id = id;
    if (pixel) paper.className = 'readability-pixel';
    document.body.append(paper);
    renderPreview(parse(source), paper, { hand: { hand: 'script07', ink: 'blue', pitchMm: 5, seed: 1, dots: false } });
    await paper.jotReady;
  }, { source, id, pixel });
}

async function colorFacts(page, selector) {
  return page.locator(selector).evaluate(paper => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    const rgba = color => { context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
    const background = rgba(getComputedStyle(paper).backgroundColor);
    return [...paper.querySelectorAll('.jot-highlight-word')].map(word => {
      const overlay = getComputedStyle(word, '::after');
      let opacity = 1;
      for (let ancestor = word; ancestor; ancestor = ancestor.parentElement) opacity *= Number(getComputedStyle(ancestor).opacity);
      return { ink: rgba(getComputedStyle(word).color), paper: background, highlight: rgba(getComputedStyle(word.closest('mark,.jot-highlight')).getPropertyValue('--jot-highlight').trim() || '#fddd13'),
        strength: Number(overlay.opacity), blend: overlay.mixBlendMode, opacity };
    });
  });
}

const luminance = rgb => rgb.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
function conservativeContrast(fact) {
  // An opaque glyph is the backdrop inside the isolated word. Between glyphs,
  // the translucent SVG instead composites onto paper. Alpha=1 covers every
  // possible overlap of the SVG's marker, brush and pencil paths.
  const alpha = fact.strength, opacity = fact.opacity;
  const foreground = fact.ink.slice(0, 3).map((ink, index) => opacity * ink * (1 - alpha + alpha * fact.highlight[index] / 255) + (1 - opacity) * fact.paper[index]);
  const background = fact.paper.slice(0, 3).map((paper, index) => paper * (1 - opacity * alpha) + fact.highlight[index] * opacity * alpha);
  return contrast(foreground, background);
}

async function checkActualPixels(page, selector, label, names) {
  const fixture = page.locator(selector), facts = await colorFacts(page, selector);
  const geometry = await fixture.evaluate(paper => {
    const bounds = paper.getBoundingClientRect();
    return [...paper.querySelectorAll('.jot-highlight-word')].map(word => {
      const box = word.getBoundingClientRect(); return { x: box.x - bounds.x, y: box.y - bounds.y, width: box.width, height: box.height };
    });
  });
  const disabled = await page.addStyleTag({ content: `${selector} .jot-highlight-word::after{display:none!important}` });
  const before = (await fixture.screenshot()).toString('base64'); await disabled.evaluate(element => element.remove());
  const after = (await fixture.screenshot()).toString('base64');
  const hiddenInk = await page.addStyleTag({ content: `${selector} .jot-highlight-word{color:transparent!important}` });
  const background = (await fixture.screenshot()).toString('base64'); await hiddenInk.evaluate(element => element.remove());
  const samples = await page.evaluate(async ({ before, after, background, facts, geometry }) => {
    const decode = async data => {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      return { width: image.width, height: image.height, pixels: context.getImageData(0, 0, image.width, image.height).data };
    };
    const [plain, marked, paper] = await Promise.all([decode(before), decode(after), decode(background)]);
    const luminance = rgb => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
    return geometry.map((box, index) => {
      const ink = facts[index].ink;
      let cores = 0, tinted = 0, minimum = Infinity;
      for (let y = Math.max(0, Math.floor(box.y)); y < Math.min(plain.height, Math.ceil(box.y + box.height)); y++) {
        for (let x = Math.max(0, Math.floor(box.x)); x < Math.min(plain.width, Math.ceil(box.x + box.width)); x++) {
          const offset = (y * plain.width + x) * 4;
          if (plain.pixels[offset + 3] !== 255 || ![0, 1, 2].every(channel => Math.abs(plain.pixels[offset + channel] - ink[channel]) <= 1)) continue;
          cores++;
          const actual = [...marked.pixels.slice(offset, offset + 3)], beneath = [...paper.pixels.slice(offset, offset + 3)];
          if ([0, 1, 2].some(channel => plain.pixels[offset + channel] - actual[channel] >= 2) && [0, 1, 2].every(channel => actual[channel] <= plain.pixels[offset + channel] + 1)) tinted++;
          minimum = Math.min(minimum, contrast(actual, beneath));
        }
      }
      return { cores, tinted, minimum };
    });
  }, { before, after, background, facts, geometry });
  assert.equal(samples.length, names.length);
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index], where = `${label}: ${names[index]}`;
    assert.equal(facts[index].blend, 'multiply', where);
    assert.ok(sample.cores > 50, `${where}: enough opaque glyph pixels (${sample.cores})`);
    assert.ok(sample.tinted > 20, `${where}: the stroke tints actual glyph ink (${sample.tinted})`);
    assert.ok(sample.minimum >= 4.5, `${where}: sampled glyph/paper contrast ${sample.minimum.toFixed(2)}:1`);
  }
  return Math.min(...samples.map(sample => sample.minimum));
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.JOT_CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined) });
  try {
    const origin = `http://127.0.0.1:${server.address().port}`, errors = [];
    let combinations = 0, bound = Infinity, observed = Infinity;
    for (const mode of ['light', 'dark']) {
      const page = await browser.newPage({ colorScheme: mode, viewport: { width: 1300, height: 1000 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin + '/write/');
      const loaded = await page.evaluate(async () => (await document.fonts.load('400 70px "Jot Script 07"')).map(font => font.status));
      assert.ok(loaded.length > 0 && loaded.every(status => status === 'loaded'), 'the generated Script 07 font loads for real glyph tests');
      const catalogue = await page.evaluate(async () => {
        const { INKS } = await import('/jot/handwriting.mjs'), { referencePalettes } = await import('/jot/palettes.mjs');
        return { inks: Object.entries(INKS), colors: Object.values(referencePalettes).flat() };
      });
      assert.equal(catalogue.inks.length, 5); assert.equal(catalogue.colors.length, 71);
      const styles = ['marker', 'brush', 'pencil'];
      const profiles = catalogue.inks.flatMap(([inkName, ink]) => catalogue.colors.flatMap(([colorName, color]) => styles.map(style => ({ inkName, ink, colorName, color, style }))));
      await renderProof(page, profiles.map(profile => `[MMMM]{ink=${profile.ink} highlight=#${profile.color} highlight-style=${profile.style}}`).join('\n\n'), 'contrastProof');
      const facts = await colorFacts(page, '#contrastProof'); assert.equal(facts.length, profiles.length);
      facts.forEach((fact, index) => {
        const profile = profiles[index], where = `${mode}/${profile.inkName}/${profile.colorName}/${profile.style}`;
        assert.equal(fact.opacity, 1, `${where}: highlighted ink is opaque`);
        assert.equal(fact.ink[3], 255); assert.equal(fact.paper[3], 255);
        assert.equal(fact.strength, mode === 'light' ? .6 : .15, `${where}: theme stroke cap`);
        assert.equal(fact.blend, 'multiply');
        const result = conservativeContrast(fact); bound = Math.min(bound, result); combinations++;
        assert.ok(result >= 4.5, `${where}: conservative full-coverage contrast ${result.toFixed(2)}:1`);
      });
      await page.locator('#contrastProof').evaluate(paper => paper.remove());

      await renderProof(page, '[x] ==MMMM==\n[-] ==MMMM==\n\n[[==MMMM==]]', 'fadedProof');
      const faded = await colorFacts(page, '#fadedProof'); assert.equal(faded.length, 3);
      for (const fact of faded) {
        assert.equal(fact.opacity, 1, `${mode}: highlighted completed/cancelled tasks and margin notes must not inherit fading`);
        assert.ok(conservativeContrast(fact) >= 4.5);
      }
      await page.locator('#fadedProof').evaluate(paper => paper.remove());

      const representatives = ['Lemon yellow', 'Lime cream', 'Slate', 'Orange'].flatMap(name => styles.map(style => ({ name, style, color: catalogue.colors.find(([label]) => label === name)[1] })));
      const names = representatives.map(profile => `${profile.name}/${profile.style}`);
      await renderProof(page, representatives.map(profile => `[MMMM]{ink=#1f3a8a highlight=#${profile.color} highlight-style=${profile.style}}`).join('\n\n'), 'pixelProof', true);
      await page.addStyleTag({ content: pixelCSS });
      observed = Math.min(observed, await checkActualPixels(page, '#pixelProof', `${mode}/screen`, names));
      await page.emulateMedia({ media: 'print' });
      for (const fact of await colorFacts(page, '#pixelProof')) assert.equal(fact.strength, .6, 'printing restores the light-paper stroke strength');
      observed = Math.min(observed, await checkActualPixels(page, '#pixelProof', `${mode}/print`, names));
      await page.emulateMedia({ media: 'screen' });
      const html = await page.locator('#pixelProof').evaluate(async paper => (await import('/jot/export.mjs')).exportHTML(paper));
      assert.match(html, /data:font\/woff2;base64,/);
      const exported = await browser.newPage({ colorScheme: mode, viewport: { width: 1300, height: 1000 } }), requests = [];
      exported.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
      await exported.setContent(html); await exported.evaluate(() => document.fonts.ready);
      await exported.locator('main').evaluate(paper => { paper.id = 'pixelProof'; paper.classList.add('readability-pixel'); });
      await exported.addStyleTag({ content: pixelCSS });
      observed = Math.min(observed, await checkActualPixels(exported, '#pixelProof', `${mode}/standalone`, names));
      await exported.emulateMedia({ media: 'print' });
      observed = Math.min(observed, await checkActualPixels(exported, '#pixelProof', `${mode}/standalone-print`, names));
      assert.deepEqual(requests, [], 'standalone font and highlight rendering requires no network');
      await exported.close(); await page.locator('#pixelProof').evaluate(paper => paper.remove());

      await page.locator('#liveWriting').evaluate(surface => {
        surface.focus(); const transfer = new DataTransfer(); transfer.setData('text/plain', '==MMMM==');
        surface.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
      });
      const liveFacts = await colorFacts(page, '#liveWriting'); assert.equal(liveFacts.length, 1);
      assert.ok(conservativeContrast(liveFacts[0]) >= 4.5, `${mode}: live-editor highlights retain readable contrast`);
      observed = Math.min(observed, await checkActualPixels(page, '#liveWriting', `${mode}/live-editor`, ['Lemon yellow/marker']));
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: ${combinations} full-coverage contrast profiles (minimum ${bound.toFixed(2)}:1), opaque highlighted task/margin ink, and real glyph tint/contrast checks (minimum ${observed.toFixed(2)}:1) in light/dark, print, embedded-font standalone HTML and the live editor.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
