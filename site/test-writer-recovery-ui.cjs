// Edits made just before the page closes survive for unprotected journals; protected journals never keep a plain-text draft.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const ready=async()=>{await require('./test-source-workspace.cjs')(page);};
  await page.goto(origin+'/write/');await ready();
  await page.fill('#writing','### 2026-11-03 | Tuesday\n\nFirst draft.\n');await page.waitForFunction(()=>/Saved in this browser/.test(document.getElementById('saveState').textContent));
  // Type and leave at once, before the asynchronous archive save can finish.
  await page.evaluate(()=>{const e=document.getElementById('writing');e.value+='\nTyped right before closing.\n';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.reload();await ready();
  await page.waitForFunction(()=>document.getElementById('writing').value.includes('Typed right before closing.'),null,{timeout:10000});
  assert.match(await page.textContent('#journalNotice'),/Recovered changes made just before the page closed/);
  await page.waitForFunction(()=>/Saved in this browser/.test(document.getElementById('saveState').textContent));
  assert.equal(await page.evaluate(()=>localStorage.getItem('jot-unsaved-draft-v1')),null,'the draft is cleared once the archive catches up');
  await page.reload();await ready();assert.match(await page.inputValue('#writing'),/Typed right before closing\./);assert.doesNotMatch(await page.textContent('#journalNotice'),/Recovered/);
  // Protected: no plain-text draft is ever written.
  await require('./test-source-workspace.cjs').command(page,'Journal lock and ways in');await page.fill('#lockPass','recovery-test-passphrase');await page.fill('#lockPass2','recovery-test-passphrase');await page.uncheck('#lockRecovery');await page.click('#lockGo');await page.waitForFunction(()=>!document.getElementById('lockDialog').open);
  await page.waitForFunction(()=>/protected archive/.test(document.getElementById('saveState').textContent),null,{timeout:20000});
  await page.evaluate(()=>{const e=document.getElementById('writing');e.value+='\nSECRET_AFTER_LOCK\n';e.dispatchEvent(new Event('input',{bubbles:true}));document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'));});
  assert.equal(await page.evaluate(()=>localStorage.getItem('jot-unsaved-draft-v1')),null,'protected writing never enters a plain-text draft');
  assert.doesNotMatch(await page.evaluate(()=>JSON.stringify(localStorage)),/SECRET_AFTER_LOCK/);
  assert.deepEqual(errors,[]);console.log('PASS: last-moment edits recovered after reload for unprotected journals, draft cleared after saving, no plain-text draft for protected journals.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
