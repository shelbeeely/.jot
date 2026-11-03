// Journal map: entries on a calendar canvas with links and threads; keyboard use, opening an entry, locking and accessibility.
const {chromium,devices}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
const SOURCE='### 2026-10-30 | Friday\n\nCafé with [Sam](people.jot#person-sam). #walk\n\n:::record reflection #eve-1030\nmood: calm\n:::\n\n### 2026-11-02 | Monday\n\nAgain [Sam](people.jot#person-sam) and [the note](#eve-1030). #walk\n\n### 2026-11-03 | Tuesday\n\nRain. SECRET_LINE_9f3\n';
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch();
 try{
  for(const [name,options] of [['desktop',{viewport:{width:1280,height:900}}],['phone',{...devices['iPhone 13']}],['dark phone',{...devices['iPhone 13'],colorScheme:'dark'}]]){
   const context=await browser.newContext(options),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.goto(origin+'/write/');await page.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));
   await page.evaluate(s=>{const e=document.getElementById('writing');e.value=s;e.dispatchEvent(new Event('input',{bubbles:true}));},SOURCE);
   if(name==='desktop')await page.click('#writerMapToggle');else await page.click('.writer-nav [data-nav=map]');
   await page.waitForSelector('#writerMap:not([hidden])');assert.equal(await page.evaluate(()=>document.documentElement.dataset.writerView),'map');
   assert.match(await page.textContent('#writerMapSummary'),/3 entries · 1 link between entries · 2 threads · October 2026 to November 2026/);
   assert.equal(await page.locator('.writer-map-entry').count(),3);assert.equal(await page.locator('.writer-map-link').count(),1);
   assert.doesNotMatch(await page.textContent('#writerMap'),/SECRET_LINE_9f3|Café with/,'entry writing stays closed in the map');
   assert.ok(await page.locator('#writerMapCanvas').evaluate(n=>n.getBoundingClientRect().right<=innerWidth+1),'no sideways overflow');
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   assert.deepEqual(await page.evaluate(async()=>(await axe.run(document.getElementById('writerMap'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)),[]);
   if(name==='dark phone'){assert.deepEqual(errors,[]);await context.close();continue;}
   // Keyboard: one tab stop, arrows walk in date order, Enter shows the entry and its backlinks.
   assert.equal(await page.locator('.writer-map-entry[tabindex="0"]').count(),1);
   await page.locator('.writer-map-entry[tabindex="0"]').focus();assert.match(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),/30 October 2026|October 30, 2026/);
   await page.keyboard.press('ArrowRight');assert.match(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),/links to 1/);
   await page.keyboard.press('ArrowLeft');await page.keyboard.press('Enter');
   await page.waitForFunction(()=>document.activeElement?.id==='writerMapOpen');assert.match(await page.textContent('#writerMapDetails'),/Linked from/);
   // A backlink chip moves to that entry; a thread highlights where it runs.
   await page.locator('#writerMapDetails .writer-map-chip').first().click();assert.match(await page.textContent('#writerMapDetails'),/Links to/);
   await page.click('#writerMapThreads [data-thread="tag:walk"]');assert.equal(await page.locator('.writer-map-entry.in-thread').count(),2);assert.equal(await page.locator('.writer-map-thread-path').count(),1);
   await page.fill('#writerMapThreadSearch','sam');assert.deepEqual(await page.locator('#writerMapThreads .writer-map-thread').allInnerTexts().then(t=>t.map(x=>x.replace(/\s+\d+$/,''))),['Sam']);
   // Zoom buttons change the scale; Fit returns.
   const before=await page.locator('.writer-map-world').getAttribute('transform');await page.click('[aria-label="Zoom in"]');assert.notEqual(await page.locator('.writer-map-world').getAttribute('transform'),before);await page.click('[aria-label="Fit the whole journal"]');
   // Open in writing: back to the writing, caret at that entry's heading.
   await page.click('#writerMapOpen');await page.waitForFunction(()=>document.documentElement.dataset.writerView==='write');
   const at=await page.locator('#writing').evaluate(e=>e.value.slice(e.selectionStart,e.selectionStart+14));assert.equal(at,'### 2026-11-02');
   // Editing then reopening refreshes the map.
   await page.evaluate(()=>{const e=document.getElementById('writing');e.value+='\n### 2026-11-04\n\nBack to [Tuesday](#2026-11-03).\n';e.dispatchEvent(new Event('input',{bubbles:true}));});
   if(name==='desktop')await page.click('#writerMapToggle');else await page.click('.writer-nav [data-nav=map]');
   await page.waitForFunction(()=>/4 entries · 2 links/.test(document.getElementById('writerMapSummary').textContent));
   // The map from Tools, and nothing kept after locking.
   if(name==='desktop'){
    await require('./test-source-workspace.cjs').command(page,'Write only');await require('./test-source-workspace.cjs').command(page,'Journal map');await page.waitForSelector('#writerMap:not([hidden])');
    await require('./test-source-workspace.cjs').command(page,'Journal lock and ways in');await page.fill('#lockPass','map-test-passphrase');await page.fill('#lockPass2','map-test-passphrase');await page.uncheck('#lockRecovery');await page.click('#lockGo');await page.waitForFunction(()=>!document.getElementById('lockDialog').open);
    await page.waitForFunction(()=>/protected archive/.test(document.getElementById('saveState').textContent),null,{timeout:20000});
    // Locking (after time away, or on reload) makes the writing read-only; the map drops everything it showed.
    assert.ok(await page.locator('.writer-map-entry').count()>0);
    await page.evaluate(()=>{document.getElementById('writing').readOnly=true;});
    await page.waitForFunction(()=>!document.querySelector('.writer-map-entry'));assert.doesNotMatch(await page.textContent('#writerMap'),/2026|Sam|walk/,'locking clears the map');
    await page.reload();await page.waitForFunction(()=>document.getElementById('unlockDialog')?.open||document.getElementById('lockGate')&&!document.getElementById('lockGate').hidden);
    assert.equal(await page.locator('.writer-map-entry').count(),0,'a locked journal has no map until it is unlocked');
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: journal map on desktop and phone (light and dark), links and backlinks, threads, keyboard, zoom, open in writing, refresh, no entry text shown, accessibility.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
