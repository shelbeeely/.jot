// Writer controls, local search/navigation and responsive layouts in Chromium. No external service is used.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0])); }
  catch { res.writeHead(400); res.end(); return; }
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch();
 try{
  const {readDocument,searchArchive}=await import('../parser/container.mjs');const page=await browser.newPage({acceptDownloads:true,viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const command=(label)=>require('./test-source-workspace.cjs').command(page,label);
  await page.goto(`http://127.0.0.1:${server.address().port}/write/`);await require('./test-source-workspace.cjs')(page);
  const source='### 2026-11-01\n\nPUBLIC_ARCHIVE_ENTRY #walk\n\n### 2026-11-02\n\nPRIVATE_ARCHIVE_ENTRY_59a118462dfb #secret\n';await page.fill('#writing',source);await page.waitForFunction(()=>document.getElementById('saveState').textContent.includes('Saved'),null,{timeout:30000});
  async function download(){const pending=page.waitForEvent('download');await command('Download journal');const item=await pending;assert.match(item.suggestedFilename(),/\.jotz$/);return new Uint8Array(fs.readFileSync(await item.path()));}
  let bytes=await download(),doc=await readDocument(bytes);assert.equal(doc.source,source);assert.equal(doc.archive.version,'1.0');assert.equal(doc.index,null,'a small journal searches its source; no index file');assert.equal(doc.indexError,null);
  // A failed unsupported-format import must leave the current journal intact.
  const badZip=await globalThis.JSZip.loadAsync(bytes),badManifest=JSON.parse(await badZip.file('manifest.json').async('string'));badManifest.requiredFeatures=['future-layout'];badZip.file('manifest.json',JSON.stringify(badManifest),{compression:'STORE'});const badBytes=await badZip.generateAsync({type:'uint8array'});
  const acceptDialog=dialog=>dialog.accept();page.on('dialog',acceptDialog);await page.setInputFiles('#openFile',{name:'unsupported.jotz',mimeType:'application/zip',buffer:Buffer.from(badBytes)});await page.waitForFunction(()=>document.getElementById('journalNotice').textContent.includes('Unsupported archive manifest fields'));assert.equal(await page.inputValue('#writing'),source);
  // The cache is optional for readers, including Writer's local search and subsequent saves.
  const noIndexZip=await globalThis.JSZip.loadAsync(bytes),noIndexManifest=JSON.parse(await noIndexZip.file('manifest.json').async('string'));delete noIndexManifest.index;noIndexZip.remove('index.sqlite');noIndexZip.file('manifest.json',JSON.stringify(noIndexManifest),{compression:'STORE'});const noIndexBytes=await noIndexZip.generateAsync({type:'uint8array'});
  await page.setInputFiles('#openFile',{name:'source-only-cacheless.jotz',mimeType:'application/zip',buffer:Buffer.from(noIndexBytes)});await page.waitForFunction(()=>document.getElementById('journalNotice').textContent.includes('Opened source-only-cacheless.jotz'));assert.equal(await page.inputValue('#writing'),source);
  await command('Entries, privacy and search');await page.fill('#archiveTag','walk');await page.click('#archiveSearch');await page.waitForFunction(()=>document.getElementById('archiveResults').textContent.includes('PUBLIC_ARCHIVE_ENTRY'));await page.click('#archiveClose');page.off('dialog',acceptDialog);
  await command('Journal lock and ways in');await page.fill('#lockPass','archive-test-passphrase');await page.fill('#lockPass2','archive-test-passphrase');await page.uncheck('#lockRecovery');await page.click('#lockGo');await page.waitForFunction(()=>!document.getElementById('lockDialog').open);
  assert.ok(await page.isVisible('#lockNote'));bytes=await download();doc=await readDocument(bytes);assert.equal(doc.partial,true);assert.equal(doc.source,'');doc.index?.close();
  await command('Entries, privacy and search');assert.equal(await page.locator('#archiveEntryList input:checked').count(),2);await page.locator('#archiveEntryList input').first().uncheck();await page.click('#archiveApply');await page.waitForFunction(()=>document.getElementById('archiveStatus').textContent.startsWith('Saved privacy'));await page.click('#archiveClose');
  bytes=await download();doc=await readDocument(bytes);assert.match(doc.source,/PUBLIC_ARCHIVE_ENTRY/);assert.doesNotMatch(doc.source,/PRIVATE_ARCHIVE_ENTRY/);assert.equal(doc.indexError,null);assert.equal((await searchArchive(doc,{tag:'walk'})).length,1);assert.equal((await searchArchive(doc,{tag:'secret'})).length,0,'a locked entry is not searchable without its key');doc.index?.close();
  const opened=await readDocument(bytes,{secret:'archive-test-passphrase'});assert.equal(opened.source,source);assert.equal(opened.entries[0].private,false);assert.equal(opened.entries[1].private,true);opened.index?.close();
  const pointer=await page.evaluate(()=>JSON.parse(localStorage.getItem('jot-workspace-v1')));assert.equal(pointer.archive,2);assert.equal(pointer.locked,1);assert.doesNotMatch(JSON.stringify(pointer),/PRIVATE_ARCHIVE_ENTRY|PUBLIC_ARCHIVE_ENTRY|passphrase/);
  await page.reload();await page.waitForFunction(()=>document.getElementById('unlockDialog').open);assert.equal(await page.inputValue('#writing'),'');await page.click('#unlockCancel');assert.match(await page.textContent('#archivePublicView'),/PUBLIC_ARCHIVE_ENTRY/);assert.doesNotMatch(await page.textContent('body'),/PRIVATE_ARCHIVE_ENTRY/);
  await page.evaluate(async()=>{await(await import('/jot/storage.mjs')).put('handoff','pending',{id:'handoff-protected-test',text:'HANDOFF_CAPTURE_AFTER_UNLOCK',assets:[]});});
  await page.reload();await page.waitForFunction(()=>document.getElementById('unlockDialog').open);await page.click('#unlockCancel');
  assert.equal(await page.evaluate(async()=>!!(await(await import('/jot/storage.mjs')).get('handoff','pending'))),true);assert.doesNotMatch(await page.textContent('body'),/HANDOFF_CAPTURE_AFTER_UNLOCK/);
  await page.click('#archivePublicSearch');await page.fill('#archiveTag','walk');await page.click('#archiveSearch');await page.waitForFunction(()=>document.getElementById('archiveResults').textContent.includes('PUBLIC_ARCHIVE_ENTRY'));assert.doesNotMatch(await page.textContent('#archiveResults'),/PRIVATE_ARCHIVE_ENTRY/);await page.click('#archiveClose');
  await page.click('#lockGateUnlock');await page.fill('#unlockPass','archive-test-passphrase');await page.click('#unlockGo');await page.waitForFunction(()=>document.getElementById('writing').value.includes('PRIVATE_ARCHIVE_ENTRY'));await require('./test-source-workspace.cjs')(page);await page.waitForFunction(()=>document.getElementById('writing').value.includes('HANDOFF_CAPTURE_AFTER_UNLOCK'));await page.waitForFunction(async()=>!(await(await import('/jot/storage.mjs')).get('handoff','pending')));
  await command('Entries, privacy and search');await page.fill('#archiveTag','secret');await page.click('#archiveSearch');await page.waitForFunction(()=>document.getElementById('archiveResults').textContent.includes('PRIVATE_ARCHIVE_ENTRY'));assert.match(await page.textContent('#archiveStatus'),/1 matching entries/);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const bad=await page.evaluate(async()=>(await axe.run(document.getElementById('archiveTools'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id));assert.deepEqual(bad,[]);
  const desktop=JSON.parse(fs.readFileSync(path.join(__dirname,'../desktop/src-tauri/tauri.conf.json'),'utf8'));assert.deepEqual(desktop.bundle.fileAssociations.flatMap(a=>a.ext),['jotz','jot']);assert.ok(desktop.app.security.csp['script-src'].includes("'wasm-unsafe-eval'"));
  assert.deepEqual(errors,[]);console.log('PASS: Jotz v1 default saving, protected entries, mixed privacy, source search without an index for small journals, encrypted local archive, public locked reading, reload/unlock and local private search.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
