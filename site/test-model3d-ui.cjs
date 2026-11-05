// 3D models (spec 8.1.6) in Writer, and the fixed-layout EPUB that carries them: attaching a .glb writes a model record; Turn in 3D
// loads the bundled viewer only then and reads only the journal's bytes; Download page keeps a picture; the EPUB's pages are XHTML
// whose model turns with the book's own viewer. Nothing anywhere is fetched from outside this server.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist'),model=path.join(__dirname,'fixtures/scene/cube.glb'),shots=process.env.JOT_SHOTS;
const TYPES={'.html':'text/html','.xhtml':'application/xhtml+xml','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};
let book=new Map(); // the saved EPUB, served at /book/
const server=http.createServer((req,res)=>{const url=decodeURIComponent(req.url.split('?')[0]);
 if(url.startsWith('/book/')){const data=book.get(url.slice(6));if(!data){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(url)]||'application/octet-stream');res.end(data);return;}
 let file=path.resolve(root,'.'+url);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{
 await import('../parser/vendor/jszip.mjs');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const page=await context.newPage(),errors=[],outside=[];
  page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(!r.url().startsWith(origin)&&!/^(data|blob|about):/.test(r.url()))outside.push(r.url());});
  await page.goto(origin+'/write/');await page.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));
  await page.evaluate(()=>{document.getElementById('writerViewSplit')?.click();const s=document.getElementById('look');s.value='typed';s.dispatchEvent(new Event('change'));const e=document.getElementById('writing');e.jotSetMode?.('source');e.value='### 2026-10-01\n\nA walk before work.\n\n';e.dispatchEvent(new Event('input',{bubbles:true}));});
  const loaded=()=>page.evaluate(()=>!!globalThis.JotThree);
  assert.equal(await loaded(),false,'three.js is not loaded until someone asks');
  // Attaching a .glb writes a model record and shows its description with Turn in 3D.
  await page.setInputFiles('#attachFile',model);
  await page.waitForFunction(()=>/:::record model\nlabel: cube\nfile: media\/[0-9a-f-]+\n:::/.test(document.getElementById('writing').value));
  const figure=page.locator('#paperPreview figure.jot-3d');await figure.waitFor();
  assert.equal(await figure.getAttribute('aria-label'),'3D model: cube');
  assert.equal(await page.textContent('#paperPreview .jot-3d-placeholder strong'),'3D model');
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  assert.deepEqual(await page.evaluate(async()=>(await axe.run(document.querySelector('#paperPreview figure.jot-3d'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)),[]);
  await page.waitForTimeout(1500); // the preview settles after the attachment is stored
  // Turn in 3D: the viewer loads now, draws the model and offers its own controls.
  await page.click('#paperPreview .jot-3d-turn');await page.waitForSelector('#paperPreview .jot-3d-canvas');
  assert.equal(await loaded(),true);
  assert.equal(await page.textContent('#paperPreview .jot-3d-state'),'Turned in 3D. Drag or use the arrow keys to turn it.');
  assert.deepEqual(await page.locator('#paperPreview .jot-3d-tools button:visible').allTextContents(),['Reset view','Play animation','Back to the picture']);
  assert.match(await page.getAttribute('#paperPreview .jot-3d-canvas','aria-label'),/^cube\. Drag or use the arrow keys/);
  const view=()=>page.evaluate(()=>globalThis.Jot3D.viewOf(document.querySelector('#paperPreview figure.jot-3d')));
  const before=await view();await page.focus('#paperPreview .jot-3d-canvas');await page.keyboard.press('ArrowRight');await page.keyboard.press('-');
  const turned=await view();assert.notDeepEqual(turned.camera,before.camera,'the arrow keys turn it');
  const play=page.locator('#paperPreview button',{hasText:'Play animation'});await play.click();assert.equal(await page.getAttribute('#paperPreview .jot-3d-live button[aria-pressed]','aria-pressed'),'true');
  if(shots)await figure.screenshot({path:path.join(shots,'model3d-writer.png')});
  await page.click('#paperPreview button:has-text("Pause animation")');
  // Writing on redraws the page; the model opens again where it was.
  await page.evaluate(()=>{const e=document.getElementById('writing');e.value+='Then rain.\n';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>/Then rain/.test(document.getElementById('paperPreview').textContent));await page.waitForSelector('#paperPreview .jot-3d-canvas');
  assert.deepEqual(await view(),turned,'an edit keeps the view');
  // Download page: a picture of the view; no buttons, no scripts.
  const html=await page.evaluate(async()=>{const {exportHTML}=await import('/jot/export.mjs');return exportHTML(document.getElementById('paperPreview'),{});});
  const fig=/<figure class="jot-record jot-3d[\s\S]*?<\/figure>/.exec(html)[0];
  assert.match(fig,/<img alt="cube\. Drag or use the arrow keys[^"]*" src="data:image\/png;base64,/);assert.doesNotMatch(fig,/<button|<script|<canvas/);
  await page.click('#paperPreview button:has-text("Back to the picture")');
  assert.equal(await page.locator('#paperPreview .jot-3d-canvas').count(),0);assert.ok(await page.isVisible('#paperPreview .jot-3d-turn'));
  // A file that is missing, or not a model, is said so in place; nothing turns.
  await page.evaluate(()=>{const e=document.getElementById('writing');e.value+=`\n:::record model\nfile: media/not-here A boat\ncamera: 1, two, 3\n:::\n`;e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelectorAll('#paperPreview figure.jot-3d').length===2);
  assert.deepEqual(await page.locator('#paperPreview figure.jot-3d').nth(1).locator('.jot-3d-note').allTextContents(),['The model file is not attached: media/not-here','Kept as written: camera: 1, two, 3 (camera is three numbers, x, y, z).']);
  assert.equal(await page.locator('#paperPreview figure.jot-3d').nth(1).locator('.jot-3d-turn').count(),0);
  // The EPUB: fixed layout, the model's page scripted with Jot's viewer, the bytes inside the book.
  const saved=page.waitForEvent('download');await page.evaluate(()=>document.getElementById('epubBtn').click());const download=await saved;
  assert.match(download.suggestedFilename(),/\.epub$/);
  const status=await page.textContent('#pageViewStatus');assert.match(status,/^Saved my-journal\.epub: \d+ pages? with their layout fixed\. Its 3D model turns in readers that run scripts, such as Apple Books; elsewhere it shows its still\. 1 model file is not attached, so it stays still\.$/);
  const zip=await globalThis.JSZip.loadAsync(fs.readFileSync(await download.path()));
  assert.equal(Object.keys(zip.files)[0],'mimetype');
  const opf=await zip.file('EPUB/package.opf').async('string');assert.match(opf,/rendition:layout">pre-paginated/);
  const scripted=[...opf.matchAll(/href="(pages\/page-\d+\.xhtml)"[^>]*properties="scripted"/g)].map(m=>m[1]);assert.equal(scripted.length,1);
  book=new Map();for(const [name,f] of Object.entries(zip.files))if(!f.dir)book.set(name,Buffer.from(await f.async('uint8array')));
  for(const [name,data] of book)if(/\.(xhtml|css)$/.test(name))assert.doesNotMatch(data.toString(),/\bdata:|https?:\/\/(?!www\.(w3|idpf)\.org)/,`${name} carries no data: URLs and no outside links`);
  const reader=await context.newPage();reader.on('pageerror',e=>errors.push('book: '+e.message));
  await reader.setViewportSize({width:600,height:900});
  for(const name of [...book.keys()].filter(n=>/pages\/page-\d+\.xhtml$/.test(n))){
   await reader.goto(`${origin}/book/EPUB/${name.slice(5)}`);
   assert.equal(await reader.locator('parsererror').count(),0,`${name} is well-formed XHTML`);
  }
  await reader.goto(`${origin}/book/EPUB/${scripted[0]}`);await reader.click('.jot-3d-turn');await reader.waitForSelector('.jot-3d-canvas');
  assert.equal(await reader.textContent('.jot-3d-state'),'Turned in 3D. Drag or use the arrow keys to turn it.');
  if(shots)await reader.screenshot({path:path.join(shots,'model3d-epub.png')});
  assert.deepEqual(outside,[],'nothing fetched from outside');assert.deepEqual(errors,[]);
  console.log('3D models and EPUB: ok');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
