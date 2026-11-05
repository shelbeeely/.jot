// Compressed 3D models: Draco meshes, meshopt, Basis Universal (KTX2) textures and both together turn in 3D with Jot's own
// decoders, read only when a model needs them; a missing decoder says so and keeps the picture; an EPUB carries the decoders its
// models need, and they turn inside the book. Nothing is fetched from outside this server.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist'),fixtures=path.join(__dirname,'fixtures/scene'),shots=process.env.JOT_SHOTS;
const TYPES={'.html':'text/html','.xhtml':'application/xhtml+xml','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};
let book=new Map();
const server=http.createServer((req,res)=>{const url=decodeURIComponent(req.url.split('?')[0]);
 if(url.startsWith('/book/')){const data=book.get(url.slice(6));if(!data){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(url)]||'application/octet-stream');res.end(data);return;}
 let file=path.resolve(root,'.'+url);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(file)]||'application/octet-stream');res.end(data);});});
// How much of the drawing is the cube's checker texture: terracotta and cream squares.
const checker=(page,selector)=>page.evaluate((sel)=>{const c=document.querySelector(sel);if(!c)return null;const g=document.createElement('canvas');g.width=c.width;g.height=c.height;const x=g.getContext('2d');x.drawImage(c,0,0);const d=x.getImageData(0,0,g.width,g.height).data;let red=0,cream=0;for(let i=0;i<d.length;i+=4){if(d[i]>180&&d[i+1]<140&&d[i+2]<110)red++;if(d[i]>220&&d[i+1]>200&&d[i+2]>160&&d[i+2]<215)cream++;}return {red,cream};},selector);
(async()=>{
 await import('../parser/vendor/jszip.mjs');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch();
 const open=async(context,{block}={})=>{
  const page=await context.newPage(),errors=[],decoders=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&/THREE/.test(m.text()))errors.push(m.text());});
  page.on('request',r=>{const m=/three-decoders\/([a-z_.]+)$/.exec(r.url());if(m)decoders.push(m[1]);});
  if(block)await page.route(`**/three-decoders/${block}`,(r)=>r.fulfill({status:404,body:''}));
  await page.goto(origin+'/write/');await page.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));
  await page.evaluate(()=>{document.getElementById('writerViewSplit')?.click();const s=document.getElementById('look');s.value='typed';s.dispatchEvent(new Event('change'));const e=document.getElementById('writing');e.jotSetMode?.('source');e.value='### 2026-10-01\n\n';e.dispatchEvent(new Event('input',{bubbles:true}));});
  return {page,errors,decoders};
 };
 const turn=async(page,n=0)=>{const fig=page.locator('#paperPreview figure.jot-3d').nth(n);await fig.locator('.jot-3d-turn').click();await page.waitForFunction((i)=>/Turned|Could not/.test(document.querySelectorAll('#paperPreview figure.jot-3d')[i].querySelector('.jot-3d-state').textContent),n,{timeout:20000});return fig.locator('.jot-3d-state').textContent();};
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true}),outside=[];
  context.on('request',r=>{if(!r.url().startsWith(origin)&&!/^(data|blob|about):/.test(r.url()))outside.push(r.url());});
  const NEEDS={'draco.glb':['draco_wasm_wrapper.js','draco_decoder.wasm'],'meshopt.glb':[],'ktx2.glb':['basis_transcoder.js','basis_transcoder.wasm'],'draco-ktx2.glb':['draco_wasm_wrapper.js','draco_decoder.wasm','basis_transcoder.js','basis_transcoder.wasm']};
  for(const [file,needs] of Object.entries(NEEDS)){
   const {page,errors,decoders}=await open(context);
   await page.setInputFiles('#attachFile',path.join(fixtures,file));await page.waitForSelector('#paperPreview .jot-3d-turn');await page.waitForTimeout(1200);
   assert.deepEqual(decoders,[],`${file}: no decoder is read before Turn in 3D`);
   assert.equal(await turn(page),'Turned in 3D. Drag or use the arrow keys to turn it.',file);
   await page.waitForTimeout(300);const px=await checker(page,'#paperPreview .jot-3d-canvas');
   assert.ok(px.red>2000&&px.cream>2000,`${file}: the textured cube is drawn (${JSON.stringify(px)})`);
   assert.deepEqual([...new Set(decoders)].sort(),[...needs].sort(),`${file}: only the decoders it needs`);
   await page.click('#paperPreview button:has-text("Play animation")');await page.waitForTimeout(300);await page.click('#paperPreview button:has-text("Back to the picture")');
   if(shots)await page.locator('#paperPreview figure.jot-3d').screenshot({path:path.join(shots,`compressed-${file}.png`)});
   assert.deepEqual(errors,[],file);await page.close();
  }
  // Without its decoder, a Draco model keeps its picture and says why.
  {const fresh=await browser.newContext({viewport:{width:1280,height:900}});fresh.on('request',r=>{if(!r.url().startsWith(origin)&&!/^(data|blob|about):/.test(r.url()))outside.push(r.url());}); // nothing cached from the pages above
   const {page,errors}=await open(fresh,{block:'draco_decoder.wasm'});
   await page.setInputFiles('#attachFile',path.join(fixtures,'draco.glb'));await page.waitForSelector('#paperPreview .jot-3d-turn');await page.waitForTimeout(1200);
   assert.equal(await turn(page),'Could not turn this model in 3D: it is compressed with Draco and its decoder is not available here. The picture stays.');
   assert.equal(await page.locator('#paperPreview .jot-3d-canvas').count(),0);assert.ok(await page.isVisible('#paperPreview .jot-3d-placeholder'));
   assert.deepEqual(errors.filter(e=>!/DRACO|draco/i.test(e)),[]);await fresh.close();}
  // The EPUB carries the decoders its models need, once, and they turn inside the book.
  {const {page,errors}=await open(context);
   await page.setInputFiles('#attachFile',[path.join(fixtures,'draco-ktx2.glb'),path.join(fixtures,'meshopt.glb')]);
   await page.waitForFunction(()=>document.querySelectorAll('#paperPreview .jot-3d-turn').length===2);await page.waitForTimeout(1200);
   const saved=page.waitForEvent('download');await page.evaluate(()=>document.getElementById('epubBtn').click());const download=await saved;
   assert.match(await page.textContent('#pageViewStatus'),/Its 2 3D models turn in readers that run scripts/);
   const zip=await globalThis.JSZip.loadAsync(fs.readFileSync(await download.path()));
   assert.deepEqual(Object.keys(zip.files).filter(n=>n.startsWith('EPUB/js/decoders/')).sort(),['EPUB/js/decoders/basis_transcoder-js.js','EPUB/js/decoders/basis_transcoder-wasm.js','EPUB/js/decoders/draco_decoder-wasm.js','EPUB/js/decoders/draco_wasm_wrapper-js.js']);
   book=new Map();for(const [name,f] of Object.entries(zip.files))if(!f.dir)book.set(name,Buffer.from(await f.async('uint8array')));
   const opf=book.get('EPUB/package.opf').toString(),scripted=[...opf.matchAll(/href="(pages\/page-\d+\.xhtml)"[^>]*properties="scripted"/g)].map(m=>m[1]);
   const reader=await context.newPage();reader.on('pageerror',e=>errors.push('book: '+e.message));await reader.setViewportSize({width:600,height:900});
   let turned=0;
   for(const name of scripted){await reader.goto(`${origin}/book/EPUB/${name}`);const n=await reader.locator('.jot-3d-turn').count();
    for(let i=0;i<n;i++){await reader.locator('.jot-3d-turn').nth(i).click();await reader.waitForFunction((k)=>/Turned|Could not/.test(document.querySelectorAll('.jot-3d-state')[k].textContent),i,{timeout:20000});
     assert.equal(await reader.locator('.jot-3d-state').nth(i).textContent(),'Turned in 3D. Drag or use the arrow keys to turn it.');turned++;}
    const px=await checker(reader,'.jot-3d-canvas');assert.ok(px.red>1000&&px.cream>1000,`${name}: the book draws the textured cube (${JSON.stringify(px)})`);
    if(shots)await reader.screenshot({path:path.join(shots,`compressed-epub-${path.basename(name,'.xhtml')}.png`)});}
   assert.equal(turned,2,'both models turn inside the book');
   assert.deepEqual(errors,[]);await page.close();}
  assert.deepEqual(outside,[],'nothing fetched from outside');
  console.log('compressed 3D models: ok');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
