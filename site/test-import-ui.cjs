// "Your life online" (/import/): data exports to a Jot journal in the browser (import/app.mjs, worker.mjs, jot/archive.mjs), on the
// made-up exports in converter/fixtures/archives. ZIPs and an unzipped folder; files checked by the parser; nothing leaves the page.
// Run: node site/test-import-ui.cjs
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist'),FIX=path.join(__dirname,'../converter/fixtures/archives'),shots=process.env.JOT_SHOTS||'';
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)&&f!==root){res.writeHead(403);return res.end();}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');res.end(b);});});
const walk=(d,pre='')=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name),pre+e.name+'/'):[pre+e.name]);
(async()=>{
 await import('../parser/vendor/jszip.mjs');const {parse}=await import('../parser/jot.mjs'),{readDocument}=await import('../parser/container.mjs');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jot-import-'));
 const zipOf=async(sub)=>{const z=new globalThis.JSZip();for(const p of walk(path.join(FIX,sub)))z.file(p,fs.readFileSync(path.join(FIX,sub,p)));const f=path.join(tmp,sub+'.zip');fs.writeFileSync(f,await z.generateAsync({type:'nodebuffer'}));return f;};
 const zips=[];for(const s of ['twitter','facebook','instagram','takeout'])zips.push(await zipOf(s));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch();
 const axe=path.join(__dirname,'../node_modules/axe-core/axe.min.js');
 const audit=async(page,sel)=>{if(!fs.existsSync(axe))return;if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({path:axe});const v=await page.evaluate(async s=>(await axe.run(document.querySelector(s))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),sel);assert.deepEqual(v,[],sel);};
 try{
  const ctx=await browser.newContext({viewport:{width:1100,height:900},acceptDownloads:true,timezoneId:'Europe/London'}),page=await ctx.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))remote.push(r.url());});
  await page.goto(base+'/import/');assert.equal(await page.inputValue('#o-timeZone'),'Europe/London','the browser time zone by default');
  assert.ok(await page.isDisabled('#go'));
  await page.setInputFiles('#zips',zips);await page.waitForFunction(()=>document.querySelectorAll('#found li').length===4);
  assert.deepEqual(await page.$$eval('#found li',l=>l.map(x=>x.textContent)),['twitter.zip: X / Twitter','facebook.zip: Facebook','instagram.zip: Instagram','takeout.zip: Google Keep, Blogger']);
  await page.setInputFiles('#dir',path.join(FIX,'mastodon'));await page.waitForFunction(()=>document.querySelectorAll('#found li').length===5);
  assert.match(await page.textContent('#found li:last-child'),/^mastodon: Mastodon$/,'an unzipped folder');
  await page.click('#go');await page.waitForFunction(()=>/posts and notes/.test(document.querySelector('#check').textContent));
  const check=await page.textContent('#check');
  assert.match(check,/12 posts and notes from[\s\S]*X \/ Twitter \(4\)[\s\S]*2009-04-02 to 2023-03-06, dated in Europe\/London: 5 files\.[\s\S]*Left out: 2 reposts[\s\S]*Every file is valid Jot\./);
  assert.match(await page.textContent('#warnings'),/a post without a readable time was left out/);
  const text=await page.textContent('#jot');assert.match(text,/^---\nJot: 1\.0\nTitle: My life online · 2009\nTimezone: Europe\/London\nPrivacy: private/);
  for(const mode of ['light','dark']){await page.emulateMedia({colorScheme:mode});await page.waitForTimeout(300);await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,'no sideways scroll at 390px');await audit(page,'main');if(shots)await page.screenshot({path:path.join(shots,`import-${mode}.png`),fullPage:true});}
  await page.setViewportSize({width:1100,height:900});await page.emulateMedia({colorScheme:'light'});
  await page.selectOption('#file-sel','2');assert.match(await page.textContent('#jot'),/#### 21:19 · X \/ Twitter/);
  let dl=page.waitForEvent('download');await page.click('#dl-one');let d=await dl;assert.equal(d.suggestedFilename(),'life-online-2018.jot');
  assert.deepEqual(parse(fs.readFileSync(await d.path(),'utf8')).diagnostics,[]);
  dl=page.waitForEvent('download');await page.click('#dl-zip');d=await dl;const all=await globalThis.JSZip.loadAsync(fs.readFileSync(await d.path()));
  assert.equal(Object.keys(all.files).length,5);
  // options: one file, photos inside, reposts and stories in
  await page.check('#o-reposts');await page.check('#o-stories');await page.selectOption('#o-per','none');await page.selectOption('#o-media','attach');
  await page.click('#go');await page.waitForFunction(()=>/photos/.test(document.querySelector('#file-sel').textContent));
  assert.match(await page.textContent('#file-sel'),/life-online\.jotz · \d+ items · .* · 6 photos/);
  dl=page.waitForEvent('download');await page.click('#dl-one');d=await dl;assert.equal(d.suggestedFilename(),'life-online.jotz');
  const doc=await readDocument(new Uint8Array(fs.readFileSync(await d.path())));assert.equal(doc.assets.length,6);assert.match(doc.source,/RT @someone_else[\s\S]*Story from the bus/);
  await page.fill('#o-timeZone','Not/AZone');await page.click('#go');await page.waitForFunction(()=>/not a time zone/.test(document.querySelector('#check').textContent));
  await page.click('#clear');await page.waitForFunction(()=>!document.querySelector('#found li'));assert.ok(await page.isDisabled('#go'));
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('PASS: ZIPs and an unzipped folder recognized, one timeline in the chosen time zone, a file a year, every file valid Jot, download one and all, reposts/stories/one file/photos packed in a .jotz, a bad time zone refused, clear; 390px light/dark accessibility; no requests leave the page.');
 }finally{await browser.close();server.close();fs.rmSync(tmp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
