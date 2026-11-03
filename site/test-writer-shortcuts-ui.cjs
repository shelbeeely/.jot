// Writer keyboard shortcuts and the searchable shortcuts list, in live and source editing.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/write/');await page.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));
  const text=()=>page.inputValue('#writing');
  const set=async(value,from,to,mode)=>{await page.evaluate(([value,mode])=>{const e=document.getElementById('writing');e.jotSetMode?.(mode);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},[value,mode]);
   if(mode==='live'){await page.waitForSelector('#liveWriting');await page.locator('#writing').evaluate((e,[a,b])=>e.setSelectionRange(a,b),[from,to]);await page.evaluate(()=>document.getElementById('liveWriting').focus());await page.locator('#writing').evaluate((e,[a,b])=>{e.jotApplyEdit&&0;},[from,to]);}
   else{await page.locator('#writing').evaluate((e,[a,b])=>{e.focus();e.setSelectionRange(a,b);},[from,to]);}};
  for(const mode of ['source','live']){
   const focus=mode==='live'?'#liveWriting':'#writing';
   const select=async(a,b)=>{await page.locator('#writing').evaluate((e,[a,b])=>e.setSelectionRange(a,b),[a,b]);if(mode==='live'){await page.evaluate(([a,b])=>{const s=document.getElementById('liveWriting');s.focus();},[a,b]);}};
   const apply=async(value,a,b,keys)=>{await set(value,a,b,mode);if(mode==='live'){await page.evaluate(([a,b])=>{const e=document.getElementById('writing');e.jotSetMode('live');},[a,b]);}
     // Place the live selection over the same words through the source mapping.
     if(mode==='live')await page.evaluate(([a,b])=>{const e=document.getElementById('writing');e.jotSetMode('source');e.setSelectionRange(a,b);e.jotSetMode('live');},[a,b]);
     await page.keyboard.press(keys);return text();};
   assert.equal(await apply('a word b',2,6,'Control+u'),'a ++word++ b',mode+' underline');
   assert.equal(await apply('a word b',2,6,'Control+Shift+h'),'a ==word== b',mode+' highlight');
   assert.equal(await apply('a word b',2,6,'Control+Shift+x'),'a ~~word~~ b',mode+' strikethrough');
   assert.equal(await apply('x2 m',1,2,'Control+Shift+p'),'x^2^ m',mode+' superscript');
   assert.equal(await apply('a **word** b',4,8,'Control+Shift+Space'),'a word b',mode+' clear formatting');
   assert.equal(await apply('Title',0,5,'Control+Alt+1'),'# Title',mode+' heading 1');
   assert.equal(await apply('## Title',3,8,'Control+Alt+0'),'Title',mode+' normal text');
   assert.equal(await apply('Title',0,5,'Control+e'),'-> Title <-',mode+' center');
   assert.equal(await apply('-> Title <-',3,8,'Control+l'),'Title',mode+' align left');
   assert.equal(await apply('one',0,3,'Control+Shift+8'),'- one',mode+' bullets');
   assert.equal(await apply('one',0,3,'Control+Shift+9'),'[ ] one',mode+' task');
   // Undo, then redo with Ctrl+Y.
   await apply('a word b',2,6,'Control+u');await page.keyboard.press('Control+z');await page.waitForFunction(()=>document.getElementById('writing').value==='a word b',null,{timeout:5000}).catch(async e=>{throw Error(mode+' undo: '+await text());});
   await page.keyboard.press('Control+y');await page.waitForFunction(()=>document.getElementById('writing').value==='a ++word++ b',null,{timeout:5000}).catch(async e=>{throw Error(mode+' redo: '+await text());});
  }
  // File and finder shortcuts.
  await page.keyboard.press('Control+/');await page.waitForFunction(()=>document.getElementById('writerShortcutsDialog').open);
  await page.fill('#writerShortcutsSearch','underline');const listed=await page.textContent('#writerShortcutsList');assert.match(listed,/Underline/);assert.match(listed,/Double underline/);assert.doesNotMatch(listed,/Bold/);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});assert.deepEqual(await page.evaluate(async()=>(await axe.run(document.getElementById('writerShortcutsDialog'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)),[]);
  await page.click('#writerShortcutsDialog .dialog-header button');
  await page.locator('#writing').evaluate(e=>e.focus());await page.keyboard.press('Control+h');await page.waitForFunction(()=>document.getElementById('writerSearchDialog').open);await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');await page.waitForFunction(()=>document.getElementById('writerCommandsDialog').open);
  await page.fill('#writerCommandsSearch','ctrl+u');assert.match(await page.textContent('#writerCommandsList'),/Underline/);await page.keyboard.press('Escape');
  let opened=false;await page.exposeFunction('markOpen',()=>{opened=true;});await page.evaluate(()=>document.getElementById('openBtn').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.markOpen();},{capture:true}));
  await page.keyboard.press('Control+o');await page.waitForTimeout(200);assert.ok(opened,'Ctrl+O opens a journal');
  assert.deepEqual(errors,[]);console.log('PASS: Writer shortcuts in source and live editing, undo/redo, shortcuts list search and accessibility, find and replace, tool search by key, open.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
