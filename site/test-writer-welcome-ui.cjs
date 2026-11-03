// The empty-journal welcome: shown only while the writing is empty, every way in works, nothing is counted.
const {chromium,devices}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch();
 try{
  for(const scheme of ['light','dark']){
   const context=await browser.newContext({...devices['iPhone 13'],colorScheme:scheme});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/write/');await page.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));
   const visible=()=>page.isVisible('.writer-welcome');
   assert.ok(await visible(),'an empty journal shows the welcome');
   assert.ok(await page.evaluate(()=>document.documentElement.hasAttribute('data-writer-empty')));
   assert.equal(await page.textContent('.writer-voice-mic-label'),'Speak');assert.ok(await page.isVisible('.writer-voice-mic-label'),'the mic is labeled while the page is empty');
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   assert.deepEqual(await page.evaluate(async()=>(await axe.run(document.querySelector('.writer-welcome'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)),[]);
   assert.ok(await page.locator('.writer-welcome').evaluate(n=>n.getBoundingClientRect().right<=innerWidth),'no horizontal overflow on a phone');
   if(scheme==='dark'){await context.close();assert.deepEqual(errors,[]);continue;}
   const text=()=>page.inputValue('#writing');
   // Another question swaps the question without touching the journal.
   const first=await page.textContent('#welcomeQuestion .writer-welcome-words span');await page.click('#welcomeAnother');assert.notEqual(await page.textContent('#welcomeQuestion .writer-welcome-words span'),first);assert.equal(await text(),'');
   // Answering adds today's entry and the question as a quote, in live editing.
   const question=(await page.textContent('#welcomeQuestion .writer-welcome-words span')).slice(1,-1);
   await page.click('#welcomeQuestion');await page.waitForFunction(()=>/\S/.test(document.getElementById('writing').value));
   const answered=await text();assert.match(answered,/^### \d{4}-\d{2}-\d{2}/);assert.ok(answered.includes('> '+question),answered);
   assert.equal(await visible(),false,'the welcome steps aside once there is writing');assert.equal(await page.isVisible('.writer-voice-mic-label'),false);
   await page.keyboard.type('Rain all morning.');assert.match(await text(),/Rain all morning\./);
   // Clearing the page brings it back; Write about today adds only the date.
   await page.evaluate(()=>{const e=document.getElementById('writing');e.jotSetMode?.('source');e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForSelector('.writer-welcome',{state:'visible'});
   await page.click('#welcomeToday');await page.waitForFunction(()=>/\S/.test(document.getElementById('writing').value));assert.match(await text(),/^### \d{4}-\d{2}-\d{2}/);assert.equal((await text()).includes('>'),false);
   await page.evaluate(()=>{const e=document.getElementById('writing');e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForSelector('.writer-welcome',{state:'visible'});
   // Speak and methods open their tools.
   await page.click('#welcomeSpeak');await page.waitForFunction(()=>document.getElementById('voiceWriting').open);await page.click('#vwClose');
   await page.click('#welcomeMethods');await page.waitForFunction(()=>document.getElementById('methodsDialog').open);await page.click('#closeMethods');
   // The labeled mic opens voice typing too.
   await page.click('#writerVoiceMic');await page.waitForFunction(()=>document.getElementById('voiceWriting').open);await page.click('#vwClose');
   // Every tool is one tap away: the nav's Tools and the welcome's link open the grouped list.
   await page.click('.writer-nav [data-nav=tools]');await page.waitForFunction(()=>document.getElementById('writerCommandsDialog').open);
   const groups=await page.locator('#writerCommandsList .writer-choice-group').allTextContents();assert.deepEqual(groups.slice(0,3),['Start writing','Find your way','Add to an entry']);
   await page.fill('#writerCommandsSearch','voice typing');assert.equal(await page.locator('#writerCommandsList .writer-choice-group').count(),0,'searching shows a flat list');await page.keyboard.press('Escape');
   await page.click('#welcomeTools');await page.waitForFunction(()=>document.getElementById('writerCommandsDialog').open);await page.keyboard.press('Escape');
   // The formatting strip is visible on a phone and formats in live editing; undo and redo work there and in source editing.
   assert.ok(await page.isVisible('.writer-format [data-write-action=bold]'));assert.ok(await page.isVisible('#writerUndo'));
   await page.click('#welcomeToday');await page.waitForFunction(()=>/\S/.test(document.getElementById('writing').value));await page.keyboard.type('quiet day');
   await page.locator('#writing').evaluate(e=>{const at=e.value.indexOf('quiet');e.setSelectionRange(at,at+5);});await page.evaluate(()=>{const s=document.querySelector('[contenteditable=true]');s&&s.focus();});
   const live=await page.evaluate(()=>document.documentElement.getAttribute('data-editor-mode'));
   await page.click('.writer-format [data-write-action=bold]');await page.waitForFunction(()=>document.getElementById('writing').value.includes('**'));
   const bolded=await text();await page.click('#writerUndo');await page.waitForFunction(b=>document.getElementById('writing').value!==b,bolded);assert.equal((await text()).includes('**'),false,'undo in '+live+' editing');
   await page.click('#writerRedo');await page.waitForFunction(()=>document.getElementById('writing').value.includes('**'));
   await page.evaluate(()=>document.getElementById('writing').jotSetMode?.('source'));await page.locator('#writing').evaluate(e=>{e.focus();e.setSelectionRange(e.value.length,e.value.length);});await page.keyboard.type(' more');
   await page.click('#writerUndo');await page.waitForFunction(()=>!document.getElementById('writing').value.endsWith(' more'));
   await page.evaluate(()=>{const e=document.getElementById('writing');e.jotSetMode?.('live');e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForSelector('.writer-welcome',{state:'visible'});
   // Close hides it for this visit; "Don't show this again" is remembered.
   await page.click('.writer-welcome-close');assert.equal(await visible(),false);await page.reload();await page.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));await page.waitForSelector('.writer-welcome',{state:'visible'});
   await page.getByRole('button',{name:"Don't show this again"}).click();assert.equal(await visible(),false);await page.reload();await page.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));await page.waitForTimeout(1000);assert.equal(await visible(),false);
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: empty-journal welcome in light and dark, all four ways in, grouped tools, formatting strip, undo/redo in live and source editing, dismissal and accessibility.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
