// Locking a journal in /write/ with the browser's built-in Web Crypto (studio.mjs, jot/lock.mjs, jot/passkey.mjs): only encrypted
// copies in browser storage, a .jotlock download that Node unlocks, asked again after a reload (passphrase, recovery code, passkey),
// opening a .jotlock, ways in (a passkey on Chromium's virtual authenticator with PRF, a new recovery code, a new passphrase, removing
// them), removing the lock, removing a locked journal from the browser, and locking again after time away. Everything is local; no
// requests leave the page. WebAuthn needs a domain, so the server is localhost. Run: node site/test-lock-ui.cjs
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist'),shots=process.env.JOT_SHOTS||'';
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)&&f!==root){res.writeHead(403);return res.end();}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');res.end(b);});});
const PASS='correct horse battery',SECRET='Secret rain on the window.',MARK='ATTACHED-PLAINTEXT-MARKER';
// Everything this site keeps for the page: localStorage and every IndexedDB value, as one string to search for plain text.
const stored=page=>page.evaluate(async()=>{const parts=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);parts.push(k+'='+localStorage.getItem(k));}
  const db=await new Promise((ok,no)=>{const r=indexedDB.open('jot-documents-v1',1);r.onupgradeneeded=()=>{for(const s of ['assets','handoff'])if(!r.result.objectStoreNames.contains(s))r.result.createObjectStore(s);};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});
  const flat=v=>v instanceof Uint8Array?Array.from(v,c=>String.fromCharCode(c)).join(''):Array.isArray(v)?v.map(flat).join('|'):v&&typeof v==='object'?Object.values(v).map(flat).join('|'):String(v);
  for(const s of ['assets','handoff'])parts.push(await new Promise(ok=>{const r=db.transaction(s).objectStore(s).getAll();r.onsuccess=()=>ok(flat(r.result));}));db.close();return parts.join('\n');});
(async()=>{
 const {unlock,kindOf}=await import('../parser/lock.mjs'),{readDocument}=await import('../parser/container.mjs');
 await new Promise(r=>server.listen(0,'localhost',r));const base=`http://localhost:${server.address().port}`,browser=await chromium.launch();
 const axe=path.join(__dirname,'../node_modules/axe-core/axe.min.js');
 const audit=async(page,sel)=>{if(!fs.existsSync(axe))return;if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({path:axe});const v=await page.evaluate(async s=>(await axe.run(document.querySelector(s))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),sel);assert.deepEqual(v,[],sel);};
 const watch=page=>{const errors=[],remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))remote.push(r.url());});page.on('dialog',d=>d.accept());return ()=>{assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);};};
 try{
  const ctx=await browser.newContext({viewport:{width:1100,height:900},acceptDownloads:true}),page=await ctx.newPage(),done=watch(page);
  await page.goto(base+'/write/');await page.waitForFunction(()=>document.documentElement.hasAttribute('data-pref-size'));
  await page.fill('#writing',`### 2026-10-25 | Sunday\n\n${SECRET}\n`);
  await page.setInputFiles('#attachFile',{name:'note.txt',mimeType:'text/plain',buffer:Buffer.from(MARK)});await page.waitForFunction(()=>/Attached 1 files/.test(document.querySelector('#journalNotice').textContent));
  assert.ok((await stored(page)).includes(SECRET),'unlocked: plain text in this browser, as before');

  // Lock: two different passphrases lock nothing; a short one asks once more; then everything stored is encrypted.
  await page.click('#lockBtn');assert.ok(await page.$eval('#lockDialog',d=>d.open));
  for(const mode of ['light','dark']){await page.emulateMedia({colorScheme:mode});await page.waitForTimeout(300);/* buttons fade their background for 0.15 s */await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,'no sideways scroll at 390px');await audit(page,'#lockDialog');if(shots)await page.screenshot({path:path.join(shots,`lock-${mode}.png`)});}
  await page.setViewportSize({width:1100,height:900});await page.emulateMedia({colorScheme:'light'});
  await page.fill('#lockPass',PASS);await page.fill('#lockPass2','something else');await page.click('#lockGo');
  assert.match(await page.textContent('#lockStatus'),/differ\. Nothing was locked/);assert.ok(await page.$eval('#lockDialog',d=>d.open));
  await page.fill('#lockPass','short');await page.fill('#lockPass2','short');await page.click('#lockGo');assert.match(await page.textContent('#lockStatus'),/short/);
  await page.fill('#lockPass',PASS);await page.fill('#lockPass2',PASS);await page.click('#lockGo');
  await page.waitForFunction(()=>!document.querySelector('#lockDialog').open);
  assert.equal(await page.inputValue('#lockPass'),'','the passphrase is cleared from the form');
  // The recovery code, shown once: Escape does not dismiss it; "I have kept it" does, and the page keeps no copy.
  await page.waitForFunction(()=>document.querySelector('#codeDialog').open);const CODE=(await page.textContent('#codeText')).trim();
  assert.match(CODE,/^([0-9A-HJKMNP-TV-Z]{5}-){4}[0-9A-HJKMNP-TV-Z]{5}$/);await audit(page,'#codeDialog');
  await page.keyboard.press('Escape');assert.ok(await page.$eval('#codeDialog',d=>d.open),'only "I have kept it" closes it');
  await page.click('#codeDone');assert.equal(await page.textContent('#codeText'),'');
  assert.ok(await page.isVisible('#lockNote'));assert.equal((await page.textContent('#downloadJot')).trim(),'Download locked ↓');assert.equal(await page.textContent('#docExt'),'.jotlock');
  let all=await stored(page);assert.ok(!all.includes(SECRET)&&!all.includes(MARK)&&!all.includes('Sunday'),'nothing in the clear: '+all.slice(0,300));
  assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('jot-workspace-v1'))).locked,1);
  await page.$eval('#writing',e=>{e.focus();e.setSelectionRange(e.value.length,e.value.length);});await page.keyboard.type('More rain.');
  await page.waitForFunction(()=>document.querySelector('#saveState').textContent==='Saved in this browser, locked');
  all=await stored(page);assert.ok(!all.includes('More rain'),'later saves are encrypted too');

  // Download locked: a .jotlock that the parser's own unlock opens, with the writing and the attachment.
  const dl=page.waitForEvent('download');await page.click('#downloadJot');const d=await dl;assert.match(d.suggestedFilename(),/\.jotlock$/);
  const bytes=new Uint8Array(fs.readFileSync(await d.path()));assert.equal(Buffer.from(bytes.subarray(0,10)).toString(),'JOTLOCK 1\n');
  const plain=await unlock(bytes,PASS);assert.equal(kindOf(plain),'jotz');const doc=await readDocument(plain);
  assert.match(doc.source,/Secret rain on the window\.\n\[note\.txt\]\(assets\/note\.txt\)[\s\S]*More rain\./);assert.equal(Buffer.from(doc.assets[0].data).toString(),MARK);
  const lockedFile=path.join(path.dirname(await d.path()),'kept.jotlock');fs.writeFileSync(lockedFile,bytes);

  // A reload asks again: nothing shows until the right passphrase; a wrong one just asks again.
  await page.reload();await page.waitForFunction(()=>document.querySelector('#unlockDialog').open);
  assert.equal(await page.inputValue('#writing'),'');assert.ok(await page.isVisible('#lockGate'));assert.ok(await page.$eval('.studio-workspace',e=>e.inert));
  for(const mode of ['light','dark']){await page.emulateMedia({colorScheme:mode});await page.waitForTimeout(300);await audit(page,'#unlockDialog');}await page.emulateMedia({colorScheme:'light'});
  await page.fill('#unlockPass','wrong passphrase');await page.click('#unlockGo');await page.waitForFunction(()=>/does not open it/.test(document.querySelector('#unlockStatus').textContent));
  assert.equal(await page.inputValue('#writing'),'');
  await page.keyboard.press('Escape');assert.ok(await page.isVisible('#lockGate'),'cancel leaves it locked');await audit(page,'#lockGate');
  await page.click('#lockGateUnlock');assert.ok(!(await page.isVisible('#unlockPasskey')),'no passkey yet');
  await page.click('#unlockUseCode');assert.equal(await page.textContent('#unlockPassLabel'),'Recovery code');
  await page.fill('#unlockPass',CODE.toLowerCase().replace(/-/g,' '));await page.click('#unlockGo');
  await page.waitForFunction(()=>/More rain\./.test(document.querySelector('#writing').value));
  assert.ok(!(await page.isVisible('#lockGate'))&&await page.isVisible('#lockNote'));assert.match(await page.textContent('#assetList'),/note\.txt/);
  assert.equal(await page.$eval('.studio-workspace',e=>e.inert),false);
  all=await stored(page);assert.ok(!all.includes(SECRET),'still encrypted in this browser after unlocking');

  // Remove it from this browser, from the locked panel.
  await page.reload();await page.waitForFunction(()=>document.querySelector('#unlockDialog').open);await page.keyboard.press('Escape');
  await page.click('#lockGateForget');await page.waitForFunction(()=>/Removed the locked journal/.test(document.querySelector('#journalNotice').textContent));
  assert.equal(await page.evaluate(()=>localStorage.getItem('jot-workspace-v1')),null);assert.ok(!(await page.isVisible('#lockGate')));
  done();await ctx.close();

  // Opening a .jotlock in another browser profile: asked for the passphrase, opened with its attachment, and kept locked.
  const ctx2=await browser.newContext({viewport:{width:1100,height:900}}),p2=await ctx2.newPage(),done2=watch(p2);
  await p2.goto(base+'/write/');await p2.waitForFunction(()=>document.documentElement.hasAttribute('data-pref-size'));
  await p2.setInputFiles('#openFile',lockedFile);await p2.waitForFunction(()=>document.querySelector('#unlockDialog').open);
  await p2.fill('#unlockPass',PASS);await p2.click('#unlockGo');await p2.waitForFunction(()=>/More rain\./.test(document.querySelector('#writing').value));
  assert.equal(await p2.inputValue('#documentName'),'kept');assert.match(await p2.textContent('#assetList'),/note\.txt/);assert.ok(await p2.isVisible('#lockNote'));
  await p2.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('jot-workspace-v1')).locked===1;}catch{return false;}});
  assert.ok(!(await stored(p2)).includes(SECRET),'an opened .jotlock stays encrypted in this browser');
  // Ways in, with a passkey on Chromium's virtual authenticator (PRF supported, user verified).
  const cdp=await ctx2.newCDPSession(p2);await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',ctap2Version:'ctap2_1',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,hasPrf:true,automaticPresenceSimulation:true}});
  await p2.click('#lockBtn');assert.ok(await p2.$eval('#waysDialog',d=>d.open));assert.equal((await p2.$$('#waysList li')).length,2);
  for(const mode of ['light','dark']){await p2.emulateMedia({colorScheme:mode});await p2.waitForTimeout(300);await audit(p2,'#waysDialog');}await p2.emulateMedia({colorScheme:'light'});
  await p2.fill('#passkeyLabel','Test key');await p2.click('#addPasskey');await p2.waitForFunction(()=>document.querySelector('#unlockDialog').open);
  await p2.fill('#unlockPass',PASS);await p2.click('#unlockGo');await p2.waitForFunction(()=>/^Added\./.test(document.querySelector('#waysStatus').textContent));
  assert.match(await p2.textContent('#waysList'),/Passkey or security key · Test key/);
  await p2.click('#waysDone');await p2.reload();await p2.waitForFunction(()=>document.querySelector('#unlockDialog').open);
  assert.ok(await p2.isVisible('#unlockPasskey'));assert.equal(await p2.evaluate(()=>document.activeElement.id),'unlockPasskey','the passkey is offered first');
  await p2.click('#unlockPasskey');await p2.waitForFunction(()=>/More rain\./.test(document.querySelector('#writing').value));
  assert.ok(!(await stored(p2)).includes(SECRET),'still encrypted after unlocking with a passkey');
  // A new recovery code (confirmed with the passkey), then a new passphrase (confirmed with the old one): the old one stops working.
  await p2.click('#lockBtn');await p2.click('#newCode');await p2.waitForFunction(()=>document.querySelector('#unlockDialog').open);
  await p2.click('#unlockPasskey');await p2.waitForFunction(()=>document.querySelector('#codeDialog').open);await p2.click('#codeDone');
  const NEWPASS='a brand new passphrase';await p2.fill('#newPass',NEWPASS);await p2.fill('#newPass2',NEWPASS);await p2.click('#changePass');
  await p2.waitForFunction(()=>document.querySelector('#unlockDialog').open);await p2.fill('#unlockPass',PASS);await p2.click('#unlockGo');
  await p2.waitForFunction(()=>/passphrase is changed/.test(document.querySelector('#waysStatus').textContent));
  await p2.click('#waysDone');await p2.reload();await p2.waitForFunction(()=>document.querySelector('#unlockDialog').open);
  await p2.fill('#unlockPass',PASS);await p2.click('#unlockGo');await p2.waitForFunction(()=>/does not open it/.test(document.querySelector('#unlockStatus').textContent));
  await p2.fill('#unlockPass',NEWPASS);await p2.click('#unlockGo');await p2.waitForFunction(()=>/More rain\./.test(document.querySelector('#writing').value));
  // Remove the passkey; the last passphrase or code cannot be removed.
  await p2.click('#lockBtn');const rows=await p2.$$eval('#waysList li',ls=>ls.map(l=>[l.textContent,l.querySelector('button').disabled]));
  assert.deepEqual(rows.map(r=>r[0].replace(/Remove$/,'')),['Passkey or security key · Test key','Recovery code','Passphrase']);
  await p2.click('#waysList li:first-child button');await p2.waitForFunction(()=>document.querySelector('#unlockDialog').open);
  await p2.fill('#unlockPass',NEWPASS);await p2.click('#unlockGo');await p2.waitForFunction(()=>/^Removed\./.test(document.querySelector('#waysStatus').textContent));
  assert.equal((await p2.$$('#waysList li')).length,2);
  // Remove the lock (confirmed with the passphrase): back to plain storage and a plain download.
  await p2.click('#removeLock');await p2.waitForFunction(()=>document.querySelector('#unlockDialog').open);await p2.fill('#unlockPass',NEWPASS);await p2.click('#unlockGo');
  await p2.waitForFunction(()=>/lock is removed/.test(document.querySelector('#journalNotice').textContent));
  assert.ok((await stored(p2)).includes(SECRET));assert.equal((await p2.textContent('#downloadJot')).trim(),'Download .jot ↓');assert.ok(!(await p2.isVisible('#lockNote')));
  done2();await ctx2.close();
  // Lock again after time away (default 15 minutes): saved encrypted first, then the locked panel; Never keeps it open.
  const ctx3=await browser.newContext({viewport:{width:1100,height:900}}),p3=await ctx3.newPage(),done3=watch(p3);
  await p3.clock.install();await p3.goto(base+'/write/');await p3.waitForFunction(()=>document.documentElement.hasAttribute('data-pref-size'));
  await p3.fill('#documentName','field-notes');await p3.fill('#writing',`### 2026-10-25 | Sunday\n\n${SECRET}\n`);
  await p3.click('#lockBtn');assert.equal(await p3.inputValue('#lockUser'),'field-notes','a password manager saves it under the journal\'s name');
  await p3.uncheck('#lockRecovery');await p3.fill('#lockPass',PASS);await p3.fill('#lockPass2',PASS);await p3.click('#lockGo');await p3.waitForFunction(()=>!document.querySelector('#lockDialog').open);
  await p3.waitForTimeout(100);assert.ok(!(await p3.$eval('#codeDialog',d=>d.open)),'no recovery code when unticked');
  await p3.click('#prefsBtn');assert.equal(await p3.inputValue('#prefRelock'),'15');await p3.click('#prefsDone');
  await p3.$eval('#writing',e=>{e.focus();e.setSelectionRange(e.value.length,e.value.length);});await p3.keyboard.type('Last words.');
  await p3.clock.runFor(10*60000);assert.match(await p3.inputValue('#writing'),/Last words\./,'still open after 10 minutes');
  await p3.clock.runFor(6*60000);await p3.waitForFunction(()=>/Locked again after 15 minutes away/.test(document.querySelector('#journalNotice').textContent));
  assert.equal(await p3.inputValue('#writing'),'');assert.ok(await p3.isVisible('#lockGate'));assert.ok(!(await p3.isVisible('#lockNote')));
  assert.ok(!(await stored(p3)).includes('Last words'),'still nothing in the clear');
  await p3.click('#lockGateUnlock');await p3.fill('#unlockPass',PASS);await p3.click('#unlockGo');
  await p3.waitForFunction(()=>/Last words\./.test(document.querySelector('#writing').value));
  await p3.click('#prefsBtn');await p3.selectOption('#prefRelock','0');await p3.click('#prefsDone');
  await p3.clock.runFor(3*60*60000);assert.match(await p3.inputValue('#writing'),/Last words\./,'Never: it stays open');assert.ok(!(await p3.isVisible('#lockGate')));
  done3();await ctx3.close();
  console.log('PASS: lock (mismatch and short passphrase checks, a recovery code shown once), nothing stored in the clear (writing, later saves, attachments), .jotlock download unlocked by the parser, reload asks again (wrong passphrase, cancel, recovery code), ways in (passkey with PRF added and used, new recovery code, new passphrase, passkey removed, last passphrase kept), remove from this browser, open a .jotlock (kept locked), remove the lock, lock again after 15 minutes away (and Never), the journal name for password managers; 390px light/dark accessibility; no requests leave the page.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
