// Pixel checks: highlighter is composited above ink, in both looks, both modes, print and standalone export.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, bytes) => { if (err) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', ({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream'); res.end(bytes); });
});
const proofCSS = '.jot-highlight-word{opacity:1!important;transform:none!important;font-size:60px!important;line-height:1!important;color:rgb(80,120,200)!important}';
async function checkPixels(page) {
  await page.addStyleTag({ content: proofCSS });
  const word = page.locator('.jot-highlight-word').first();
  assert.equal(await word.evaluate((e) => getComputedStyle(e, '::after').mixBlendMode), 'multiply');
  const off = await page.addStyleTag({ content: '.jot-highlight-word::after{display:none!important}' });
  const before = (await word.screenshot()).toString('base64'); await off.evaluate((e) => e.remove());
  const after = (await word.screenshot()).toString('base64');
  const result = await page.evaluate(async ({before, after}) => {
    async function pixels(data) { const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, image.width, image.height).data; }
    const a = await pixels(before), b = await pixels(after); let ink = 0, tinted = 0;
    for (let i=0; i<a.length; i+=4) if (a[i]===80 && a[i+1]===120 && a[i+2]===200 && a[i+3]===255) {
      ink++; if (b[i+2] < 180 && b[i] <= 81 && b[i+1] <= 121) tinted++;
    }
    return {ink, tinted};
  }, {before, after});
  assert.ok(result.ink > 50 && result.tinted > 30, `the stroke changes the actual ink pixels: ${JSON.stringify(result)}`);
}
(async()=>{
  await new Promise((r)=>server.listen(0,'127.0.0.1',r)); const browser=await chromium.launch(); const errors=[];
  try {
    for (const scheme of ['light','dark']) for (const look of ['hand','typed']) {
      const page=await browser.newPage({viewport:{width:1000,height:900},colorScheme:scheme}); page.on('pageerror',e=>errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/write/`);
      await page.selectOption('#look',look);
      await page.fill('#writing','[MMMM]{ink=#5078c8 highlight=#f0b428}');
      await page.waitForSelector('#paperPreview .jot-highlight-word'); await page.$eval('#paperPreview',async e=>{await e.jotReady;});
      await checkPixels(page);
      await page.emulateMedia({media:'print'}); await checkPixels(page); await page.emulateMedia({media:'screen'});
      const html=await page.$eval('#paperPreview',async e=>{const {exportHTML}=await import('/jot/export.mjs');return exportHTML(e);});
      assert.match(html,/mix-blend-mode:multiply/); assert.match(html,/jot-highlight-word/);
      const exported=await browser.newPage({colorScheme:scheme}); await exported.setContent(html); await exported.evaluate(()=>document.fonts.ready);
      await checkPixels(exported); await exported.emulateMedia({media:'print'}); await checkPixels(exported);
      const pdf=await exported.pdf({printBackground:true}); assert.equal(pdf.subarray(0,4).toString(),'%PDF');
      assert.ok(/\/BM\s*\/Multiply/.test(pdf.toString('latin1')), 'PDF retains the multiply compositing operation');
      await exported.close(); await page.close();
    }
    assert.deepEqual(errors,[]); console.log('PASS: stroke above ink changes ink pixels in Typed/Handwritten, light/dark, print, standalone HTML and PDF multiply compositing.');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
