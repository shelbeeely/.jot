// Interactive blocks without code (spec 8.1.6–8.1.8): flip cards, sound and video players, hotspots on 3D models. They work in
// Writer; print and fixed-layout pages get their paper forms; Download page and the EPUB keep them working with no scripts of the
// journal's own. Nothing plays or reveals itself, and nothing is fetched from outside this server.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist'),shots=process.env.JOT_SHOTS;
const TYPES={'.html':'text/html','.xhtml':'application/xhtml+xml','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav','.webm':'video/webm'};
let book=new Map();
const server=http.createServer((req,res)=>{const url=decodeURIComponent(req.url.split('?')[0]);
 if(url.startsWith('/book/')){const data=book.get(url.slice(6));if(!data){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(url)]||'application/octet-stream');res.end(data);return;}
 let file=path.resolve(root,'.'+url);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(file)]||'application/octet-stream');res.end(data);});});
function wav(){const n=8000,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(6000*Math.sin(i/16000*2*Math.PI*440)),44+i*2);return b;}
const SOURCE='### 2026-10-01\n\nA walk before work.\n\n:::record card #leaf\nlabel: Biology\nfront: What does a leaf make from light, water and air?\nback: |\n  Sugar, and oxygen it lets go.\n:::\n\n';
(async()=>{
 await import('../parser/vendor/jszip.mjs');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true}),outside=[],errors=[];
  context.on('request',r=>{if(!r.url().startsWith(origin)&&!/^(data|blob|about):/.test(r.url()))outside.push(r.url());});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/write/');await page.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));
  await page.evaluate((src)=>{document.getElementById('writerViewSplit')?.click();const s=document.getElementById('look');s.value='typed';s.dispatchEvent(new Event('change'));const e=document.getElementById('writing');e.jotSetMode?.('source');e.value=src;e.dispatchEvent(new Event('input',{bubbles:true}));},SOURCE);
  // A short video, recorded in the page from a canvas, so the suite needs no video file of its own.
  const webm=Buffer.from(await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=160;c.height=90;const x=c.getContext('2d');const rec=new MediaRecorder(c.captureStream(15),{mimeType:'video/webm'}),parts=[];rec.ondataavailable=e=>parts.push(e.data);rec.start();for(let i=0;i<12;i++){x.fillStyle=`hsl(${i*30} 60% 50%)`;x.fillRect(0,0,160,90);await new Promise(r=>setTimeout(r,60));}rec.stop();await new Promise(r=>rec.onstop=r);return [...new Uint8Array(await new Blob(parts).arrayBuffer())];}));
  await page.setInputFiles('#attachFile',[{name:'rain.wav',mimeType:'audio/wav',buffer:wav()},{name:'leaves.webm',mimeType:'video/webm',buffer:webm}]);
  await page.setInputFiles('#attachFile',path.join(__dirname,'fixtures/scene/textured.glb'));
  await page.waitForFunction(()=>/record model/.test(document.getElementById('writing').value));
  const text=await page.inputValue('#writing');
  assert.match(text,/!\[rain\.wav\]\(media\/[0-9a-f-]+\)/,'an attached recording is written as an embedded reference');assert.match(text,/!\[leaves\.webm\]\(media\/[0-9a-f-]+\)/);
  await page.evaluate(()=>{const e=document.getElementById('writing');e.value=e.value.replace(/(file: media\/[0-9a-f-]+\n)/,'$1hotspot: 1, 1, 1 A corner\nhotspot: 0, 1, 0 The top\n');e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForSelector('#paperPreview .jot-3d-spots');await page.waitForTimeout(1500);
  const paper=page.locator('#paperPreview');
  // Flip card: the back waits for the reader; a tap or the keyboard shows it.
  assert.equal(await paper.locator('.jot-card').getAttribute('aria-label'),'Flip card: Biology');
  assert.equal(await paper.locator('.jot-card-flip .jot-card-back').isVisible(),false);
  await paper.locator('.jot-card-flip summary').focus();await page.keyboard.press('Enter');
  assert.equal(await paper.locator('.jot-card-flip .jot-card-back').isVisible(),true,'Enter shows the answer');
  await page.keyboard.press('Enter');assert.equal(await paper.locator('.jot-card-flip .jot-card-back').isVisible(),false,'and hides it again');
  // Players: the browser's own, labelled, and nothing plays by itself.
  assert.deepEqual(await paper.locator('.jot-media').evaluateAll(b=>b.map(x=>x.getAttribute('aria-label'))),['Sound: rain.wav','Video: leaves.webm']);
  assert.deepEqual(await paper.locator('audio, video').evaluateAll(m=>m.map(x=>[x.tagName,x.controls,x.autoplay,x.loop,x.paused])),[['AUDIO',true,false,false,true],['VIDEO',true,false,false,true]]);
  // Hotspots: words everywhere; markers that move the view while turned in 3D.
  assert.deepEqual(await paper.locator('.jot-3d-spots li').allTextContents(),['A corner','The top']);
  await paper.locator('.jot-3d-turn').click();await page.waitForSelector('#paperPreview .jot-3d-canvas');await page.waitForTimeout(300);
  assert.deepEqual(await paper.locator('.jot-3d-spot').evaluateAll(b=>b.map(x=>x.getAttribute('aria-label'))),['Go to 1: A corner','Go to 2: The top']);
  const before=await page.evaluate(()=>globalThis.Jot3D.viewOf(document.querySelector('#paperPreview figure.jot-3d')));
  await paper.locator('.jot-3d-spot').nth(1).click();
  const after=await page.evaluate(()=>globalThis.Jot3D.viewOf(document.querySelector('#paperPreview figure.jot-3d')));
  assert.deepEqual(after.target,[0,1,0]);assert.notDeepEqual(after.camera,before.camera);assert.equal(await paper.locator('.jot-3d-state').textContent(),'2: The top');
  assert.equal(await page.evaluate(()=>{const s=getComputedStyle(document.querySelector('#paperPreview .jot-3d-spot'));return s.color;}),'rgb(255, 255, 255)','markers read white on navy');
  if(shots)await paper.screenshot({path:path.join(shots,'interactive-writer.png')});
  await paper.locator('button:has-text("Back to the picture")').click();
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  assert.deepEqual(await page.evaluate(async()=>(await axe.run({include:[['#paperPreview .jot-card'],['#paperPreview .jot-media'],['#paperPreview .jot-3d']]})).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)),[]);
  // Print: a fold-over card, and a box naming each recording in place of its player.
  await page.emulateMedia({media:'print'});
  assert.equal(await paper.locator('.jot-card-fold').isVisible(),true);assert.match(await paper.locator('.jot-card-fold').evaluate(e=>getComputedStyle(e).transform),/^matrix\(-1, 0, 0, -1/);
  assert.deepEqual(await paper.locator('.jot-media-still').allTextContents(),['♪ Sound: rain.wav','▶ Video: leaves.webm']);assert.equal(await paper.locator('audio').isVisible(),false);
  assert.equal(await paper.locator('.jot-card-hint').isVisible(),false);
  await page.emulateMedia({media:'screen'});
  // Download page: the recordings travel inside, the card still flips, no scripts.
  const html=await page.evaluate(async()=>{const {exportHTML}=await import('/jot/export.mjs');return exportHTML(document.getElementById('paperPreview'),{});});
  assert.match(html,/<audio controls="" preload="none" src="data:audio\/wav;base64,/);assert.match(html,/<video controls="" preload="metadata" src="data:video\/webm;base64,/);
  assert.match(html,/<details class="jot-card-flip"><summary>/);assert.doesNotMatch(html,/<script/);
  // EPUB: the files inside, players in place, a static fold-over card, hotspot markers in the book's viewer.
  const saved=page.waitForEvent('download');await page.evaluate(()=>document.getElementById('epubBtn').click());const download=await saved;
  const zip=await globalThis.JSZip.loadAsync(fs.readFileSync(await download.path()));
  book=new Map();for(const [name,f] of Object.entries(zip.files))if(!f.dir)book.set(name,Buffer.from(await f.async('uint8array')));
  const names=[...book.keys()];assert.ok(names.some(n=>/^EPUB\/media\/[0-9a-f]+\.wav$/.test(n))&&names.some(n=>/^EPUB\/media\/[0-9a-f]+\.webm$/.test(n)),names.join(' '));
  const opf=book.get('EPUB/package.opf').toString();assert.match(opf,/media-type="audio\/wav"/);assert.match(opf,/media-type="video\/webm"/);
  const reader=await context.newPage();reader.on('pageerror',e=>errors.push('book: '+e.message));await reader.setViewportSize({width:600,height:900});
  let sawCard=false,sawPlayers=0,sawSpots=false;
  for(const name of names.filter(n=>/pages\/page-\d+\.xhtml$/.test(n))){
   await reader.goto(`${origin}/book/${name}`);assert.equal(await reader.locator('parsererror').count(),0,name);
   assert.equal(await reader.locator('details').count(),0,'no card opens on a fixed page');
   if(await reader.locator('.jot-card-fold').count()){sawCard=true;assert.equal(await reader.locator('.jot-card-fold').getAttribute('aria-hidden'),null,'the answer is readable to assistive technology');assert.ok(await reader.locator('.jot-card-fold').isVisible());}
   for(const m of await reader.locator('audio, video').all()){assert.ok(await m.isVisible(),'the player takes the box’s place');sawPlayers++;}
   if(await reader.locator('.jot-3d-turn').count()){await reader.click('.jot-3d-turn');await reader.waitForSelector('.jot-3d-canvas');sawSpots=await reader.locator('.jot-3d-spot').count()===2;}
   if(shots)await reader.screenshot({path:path.join(shots,`interactive-${path.basename(name,'.xhtml')}.png`)});
  }
  assert.ok(sawCard);assert.equal(sawPlayers,2);assert.ok(sawSpots,'hotspots in the book');
  // Handwritten pages keep all three.
  await page.evaluate(()=>{const s=document.getElementById('look');s.value='hand';s.dispatchEvent(new Event('change'));});
  await page.waitForFunction(()=>document.getElementById('paperPreview').classList.contains('jot-hand'));await page.evaluate(()=>document.getElementById('paperPreview').jotReady);
  assert.equal(await paper.locator('.jot-card-flip summary').isVisible(),true);assert.equal(await paper.locator('.jot-media').count(),2);assert.equal(await paper.locator('.jot-3d-spots li').count(),2);
  assert.deepEqual(outside,[],'nothing fetched from outside');assert.deepEqual(errors,[]);
  console.log('interactive blocks: ok');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
