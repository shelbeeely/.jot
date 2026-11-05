// Page view: Paged.js lays the formatted pages out sheet by sheet, in a frame that makes no requests; closing empties it.
const {chromium,devices}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist'),shots=process.env.JOT_SHOTS;
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
const days=Array.from({length:14},(_,i)=>`### 2026-10-${String(i+1).padStart(2,'0')}\n\nA walk before work. ${'The light came in low over the roofs and I wrote it down before it went. '.repeat(6)}\n\n- [x] Water the plants\n- [ ] Call the library #errands\n`).join('\n');
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch();
 try{
  for(const [name,options] of [['desktop',{viewport:{width:1280,height:900}}],['phone',{...devices['iPhone 13']}]]){
   const context=await browser.newContext(options);const page=await context.newPage(),errors=[],outside=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(origin)&&!/^(data|blob|about):/.test(r.url()))outside.push(r.url());});
   await page.goto(origin+'/write/');await page.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));
   await page.evaluate(text=>{const e=document.getElementById('writing');e.jotSetMode?.('source');e.value=text;e.dispatchEvent(new Event('input',{bubbles:true}));},days);
   for(const look of ['typed','hand']){
    await page.evaluate(look=>{const s=document.getElementById('look');s.value=look;s.dispatchEvent(new Event('change'));const p=document.getElementById('journalPaper');p.value='A5';p.dispatchEvent(new Event('change'));},look);
    await page.evaluate(()=>document.getElementById('pageViewBtn').click());
    await page.waitForFunction(()=>/^\d+ pages?, as they will print/.test(document.getElementById('pageViewStatus').textContent),null,{timeout:60000});
    assert.ok(await page.evaluate(()=>document.getElementById('pageViewDialog').open));
    const frame=page.frameLocator('#pageViewFrame'),count=await frame.locator('.pagedjs_page').count();
    assert.ok(count>1,`${look}: a fortnight of writing fills more than one A5 page (${count})`);
    assert.match(await page.textContent('#pageViewStatus'),new RegExp('^'+count+' pages'));
    const sheet=await frame.locator('.pagedjs_page').first().evaluate(p=>({w:p.offsetWidth,h:p.offsetHeight}));
    assert.ok(Math.abs(sheet.w/sheet.h-148/210)<0.01,`${look}: sheets are A5 (${sheet.w}×${sheet.h})`);
    assert.ok(await frame.locator('.pagedjs_page').first().textContent().then(t=>t.includes('A walk before work')),'the writing is on the first sheet');
    if(look==='typed'){const second=frame.locator('.pagedjs_page').nth(1).locator('.pagedjs_margin-bottom-center');assert.ok(await second.evaluate(e=>e.classList.contains('hasContent')),'Journal pages carry a page number');assert.equal(await second.locator('.pagedjs_margin-content').evaluate(e=>getComputedStyle(e,'::after').content),'counter(page)');}
    if(look==='typed')assert.equal(await frame.locator('.pagedjs_page input[type=checkbox]').first().isChecked(),true,'ticked tasks stay ticked');
    assert.equal(await page.isEnabled('#pageViewPrint'),true);
    if(name==='phone')assert.ok(await page.locator('#pageViewDialog').evaluate(d=>d.getBoundingClientRect().right<=innerWidth+1),'no horizontal overflow on a phone');
    if(shots)await page.screenshot({path:path.join(shots,`page-view-${name}-${look}.png`)});
    await page.click('#pageViewClose');
    assert.equal(await page.evaluate(()=>document.getElementById('pageViewDialog').open),false);
    assert.equal(await page.getAttribute('#pageViewFrame','src'),'about:blank','closing empties the frame');
   }
   assert.deepEqual(outside,[],'Page view makes no outside requests');assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('page view: ok');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
