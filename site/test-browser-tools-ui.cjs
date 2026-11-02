// Writer controls, local search/navigation and responsive layouts in Chromium. No external service is used.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0])); }
  catch { res.writeHead(400); res.end(); return; }
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.webmanifest': 'application/manifest+json', '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch(),origin=`http://127.0.0.1:${server.address().port}`;
 try{
  const context=await browser.newContext(),page=await context.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin))remote.push(r.url());});
  await page.addInitScript(()=>{window.wakeRequests=0;window.wakeReleases=0;Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>{window.wakeRequests++;return Object.assign(new EventTarget(),{release:async()=>{window.wakeReleases++;}});}}});});
  await page.goto(origin+'/write/');await require('./test-source-workspace.cjs')(page);
  // waitForFunction predicates are synchronous: a returned Promise is truthy before the worker is ready.
  // Wait for the platform readiness promise before reloading; this app deliberately does not claim existing clients.
  await page.evaluate(()=>{window.offlineWorkerReady=false;navigator.serviceWorker.ready.then(()=>{window.offlineWorkerReady=true;});});
  await page.waitForFunction(()=>window.offlineWorkerReady===true);
  await page.reload();await require('./test-source-workspace.cjs')(page);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.fill('#writing','# Original\n\nKeep this.');await page.locator('#writing').evaluate(e=>e.setSelectionRange(e.value.length,e.value.length));
  await page.click('#writerBrowserBtn');assert.equal(await page.isChecked('#browserWake'),false);assert.equal(await page.evaluate(()=>window.wakeRequests),0);
  await page.check('#browserWake');assert.equal(await page.evaluate(()=>window.wakeRequests),1);
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await page.evaluate(()=>window.wakeReleases),1);
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>window.wakeRequests===2);
  await page.click('#prepareShare');await page.waitForFunction(()=>!document.getElementById('shareDownload').disabled);assert.match(await page.inputValue('#shareReview'),/Keep this/);
  const download=page.waitForEvent('download');await page.click('#shareDownload');assert.match((await download).suggestedFilename(),/\.jotz$/);
  const post=await page.evaluate(async()=>{const form=new FormData();form.append('files',new File(['Shared words.'],'incoming.jot',{type:'text/plain'}));const response=await fetch('../share/',{method:'POST',body:form});return{status:response.status,url:response.url};});assert.equal(post.status,200);assert.equal(await page.evaluate(async()=>(await(await import('/inbox.mjs')).inboxItems()).length),1);
  await page.click('#refreshInbox');await page.locator('#inboxList button').filter({hasText:'Review'}).first().click();await page.fill('#incomingText','Reviewed incoming words.');await page.click('#incomingAdd');
  await page.waitForFunction(()=>document.getElementById('inboxList').textContent.includes('empty'));
  assert.match(await page.inputValue('#writing'),/Reviewed incoming words\./);
  await page.evaluate(async()=>{const{enqueue}=await import('/inbox.mjs');await enqueue({id:'storage-retry',text:'Only once.',files:[]});});await page.click('#refreshInbox');await page.locator('#inboxList button').filter({hasText:'Review'}).first().click();
  await page.evaluate(()=>{window.restoreSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
  await page.click('#incomingAdd');await page.waitForFunction(()=>document.getElementById('browserMessage').textContent.includes('retained'));
  assert.equal((await page.inputValue('#writing')).split('Only once.').length,2);
  await page.evaluate(()=>{Storage.prototype.setItem=window.restoreSetItem;});await page.click('#incomingAdd');await page.waitForFunction(()=>document.getElementById('inboxList').textContent.includes('empty'));
  assert.equal((await page.inputValue('#writing')).split('Only once.').length,2);
  await page.click('#browserClose');await page.click('#writerAnnotateBtn');assert.equal(await page.isVisible('#writerAnnotation'),true);
  await page.click('#annotationCapture');
  await page.waitForFunction(()=>!document.getElementById('annotationDrawing').hidden||!document.getElementById('annotationCapture').disabled).catch(async()=>{throw Error(await page.textContent('#annotationStatus'));});
  if(!await page.isVisible('#annotationDrawing'))throw Error(await page.textContent('#annotationStatus'));
  await page.uncheck('#annotationPenOnly');await page.locator('.annotation-scroll').scrollIntoViewIfNeeded();const box=await page.locator('.annotation-scroll').boundingBox();const x=box.x+box.width/2,y=box.y+Math.min(100,box.height/2);await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+40,y+30,{steps:8});await page.mouse.up();
  await page.click('#annotationUndo');await page.click('#annotationRedo');
  await page.click('#writerAnnotateBtn');assert.match(await page.textContent('#annotationStatus'),/Done or Cancel/);assert.equal(await page.isVisible('#annotationDrawing'),true);
  await page.evaluate(()=>{window.restoreSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
  await page.click('#annotationDone');await page.waitForFunction(()=>document.getElementById('annotationDone').textContent==='Retry save');
  const inserted=await page.inputValue('#writing');
  await page.evaluate(()=>{Storage.prototype.setItem=window.restoreSetItem;});await page.click('#annotationDone');
  assert.equal(await page.inputValue('#writing'),inserted);
  await page.waitForFunction(()=>!document.getElementById('writerAnnotation')||document.getElementById('writerAnnotation').hidden);
  const inkSource=await page.inputValue('#writing');assert.match(inkSource,/media\/[0-9a-f-]+\.png/);assert.match(inkSource,/Editable handwriting strokes/);
  await page.waitForSelector('.annotation-edit');await page.locator('.annotation-edit').first().click();await page.waitForFunction(()=>!document.getElementById('annotationDrawing').hidden);await page.click('#annotationCancel');assert.equal(await page.inputValue('#writing'),inkSource);
  const cache=await page.evaluate(async()=>{const keys=await caches.keys(),result=[];for(const key of keys)for(const request of await(await caches.open(key)).keys())result.push(request.url);return result;});assert.ok(cache.some(url=>url.endsWith('/studio.mjs')));assert.equal(cache.some(url=>/incoming\.jot|inbox=|annotation-/.test(url)),false);
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>!!document.getElementById('writing')?.jotSetMode&&document.documentElement.hasAttribute('data-archive-ready'));assert.equal(await page.inputValue('#writing'),inkSource);
  await page.goto(origin+'/tools/');await page.getByRole('heading',{name:'A few useful tools.'}).waitFor();assert.deepEqual(await page.locator('header nav a').allTextContents(),['Write','Tools','Guides']);
  await page.goto(origin+'/write/');await page.waitForFunction(()=>!!document.getElementById('writing')?.jotSetMode&&document.documentElement.hasAttribute('data-archive-ready'));assert.equal(await page.inputValue('#writing'),inkSource);
  await context.setOffline(false);await page.setViewportSize({width:390,height:844});await require('./test-source-workspace.cjs')(page);await page.click('#writerBrowserBtn');
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=>(await axe.run(document.getElementById('browserTools'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[]);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);console.log('PASS: offline cache/reload, opt-in wake lock, share-target inbox, reviewed/idempotent persistence, outgoing download, inline annotation/edit/cancel, mobile accessibility and no external requests.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
