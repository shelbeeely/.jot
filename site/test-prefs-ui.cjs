// Writing preferences, focus mode, quick notes and return to your place in /write/ (studio.mjs). Everything is local; no requests leave the page.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist'),shots=process.env.JOT_SHOTS||'';
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)&&f!==root){res.writeHead(403);return res.end();}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');res.end(b);});});
const today=()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))remote.push(r.url());});
  await page.goto(base+'/write/');await page.waitForFunction(()=>document.documentElement.hasAttribute('data-pref-size'));
  const style=(sel,prop)=>page.$eval(sel,(e,p)=>getComputedStyle(e)[p],prop),shown=sel=>page.isVisible(sel);
  const command=async(query,target=page)=>{await target.click('#writerCommandsBtn');await target.fill('#writerCommandsSearch',query);await target.locator('#writerCommandsList button').filter({has:target.locator('strong').filter({hasText:new RegExp('^'+query+'$','i')})}).click();};
  const before={font:await style('#writing','fontSize'),line:await style('#writing','lineHeight'),width:await page.$eval('#writing',e=>e.getBoundingClientRect().width),muted:await style('#saveState','color'),pad:await style('.studio-bar','paddingTop')};
  assert.equal(await page.inputValue('#writing'),'','first visit starts blank');assert.equal(await page.getAttribute('html','data-writer-view'),'write');assert.ok(await shown('#writing'));assert.equal(await shown('.jot-foundation'),false);
  assert.equal(await shown('#returnNote'),false,'nothing is shown on return without a note');

  // Each preference changes the page on its own and is remembered.
  await command('Writing preferences');assert.equal(await page.$eval('#prefsDialog',d=>d.open),true);
  await page.selectOption('#prefSize','xl');await page.selectOption('#prefSpacing','roomier');await page.selectOption('#prefMeasure','short');await page.selectOption('#prefDensity','spacious');
  await page.check('#prefContrast');await page.check('#prefMotion');
  await page.uncheck('#prefPreview');await page.uncheck('#prefParser');await page.uncheck('#prefCounters');await page.uncheck('#prefDecoration');
  await page.fill('#prefNote','Next: the paragraph about the walk.');
  assert.match(await page.textContent('#prefsStatus'),/Saved in this browser/);
  const after=async()=>{
   assert.ok(parseFloat(await style('#writing','fontSize'))>parseFloat(before.font),'larger text');
   assert.ok(parseFloat(await style('#writing','lineHeight'))/parseFloat(await style('#writing','fontSize'))>2.2,'roomier lines');
   assert.ok(await page.$eval('#writing',e=>e.getBoundingClientRect().width<e.parentElement.getBoundingClientRect().width-20||innerWidth<500),'shorter line length');
   assert.ok(parseFloat(await style('.studio-bar','paddingTop'))>parseFloat(before.pad),'spacious density');
   assert.notEqual(await style('#saveState','color'),before.muted,'higher contrast replaces muted text');
   assert.equal(await style('#writing','transitionDuration'),'1e-05s','reduced motion');
   assert.equal(await shown('.preview-pane'),false);assert.equal(await shown('#structureTab'),false);assert.equal(await shown('#checksTab'),false);
   assert.equal(await shown('#wordCount'),false);assert.equal(await shown('.jot-foundation'),false);assert.equal(await shown('.studio-intro .subtitle'),false);
   assert.ok(await shown('#writing')&&await shown('#documentName'),'the writing and filename stay');
   assert.ok(await page.$eval('#paperPreview',e=>e.getBoundingClientRect().height>100),'a hidden preview is still laid out for print and export');
  };
  await after();
  // Accessibility and mobile layout of the panel, light and dark.
  const axe=path.join(__dirname,'../node_modules/axe-core/axe.min.js'),audit=async sel=>{if(!fs.existsSync(axe))return;if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({path:axe});const v=await page.evaluate(async s=>(await axe.run(document.querySelector(s))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),sel);assert.deepEqual(v,[],sel);};
  for(const mode of ['light','dark']){await page.emulateMedia({colorScheme:mode});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,'no sideways scroll at 390px');await audit('#prefsDialog');if(shots)await page.screenshot({path:path.join(shots,`prefs-${mode}.png`)});}
  await page.keyboard.press('Escape');assert.equal(await page.$eval('#prefsDialog',d=>d.open),false);
  await page.setViewportSize({width:1100,height:900});await page.emulateMedia({colorScheme:'light'});
  // Printing still shows the formatted pages when the preview is hidden on screen.
  await page.emulateMedia({media:'print'});assert.notEqual(await style('.preview-pane','display'),'none');await page.emulateMedia({media:'screen'});

  // Return to your place: caret and scroll after a reload, with the optional note offered gently.
  const long=Array.from({length:120},(_,i)=>'Line '+(i+1)+' of the writing.').join('\n\n');
  await page.fill('#writing','### 2020-01-01 | Wednesday\n\n'+long);const caret=await page.$eval('#writing',e=>{const p=e.value.indexOf('Line 80');e.focus();e.setSelectionRange(p,p);e.scrollTop=1200;return p;});
  const scrollBefore=await page.$eval('#writing',e=>e.scrollTop);await page.waitForTimeout(400);
  await page.reload();await page.waitForFunction(()=>document.documentElement.hasAttribute('data-pref-size'));
  await after();
  assert.equal(await page.$eval('#writing',e=>e.selectionStart),caret,'caret restored');
  assert.ok(Math.abs(await page.$eval('#writing',e=>e.scrollTop)-scrollBefore)<40,'scroll restored');
  assert.equal(await shown('#returnNote'),true);assert.equal(await page.textContent('#returnNoteText'),'Next: the paragraph about the walk.');
  assert.doesNotMatch(await page.textContent('#returnNote'),/missed|streak|behind|overdue|catch up/i,'no guilt or catch-up wording');
  await audit('#returnNote');if(shots)await page.screenshot({path:path.join(shots,'return-note.png')});
  await page.click('#returnGo');assert.equal(await shown('#returnNote'),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'writing');assert.equal(await page.$eval('#writing',e=>e.selectionStart),caret);

  // Focus mode: entered with the keyboard, Escape leaves it, focus stays in the writing, and both changes are announced.
  await page.click('#writerCommandsBtn');await page.fill('#writerCommandsSearch','Focus mode');await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-focus')),true);assert.equal(await page.evaluate(()=>document.activeElement.id),'writing');
  assert.equal(await shown('body>header'),false);assert.equal(await shown('#todayBtn'),false);assert.equal(await shown('.format-tools'),false);assert.ok(await shown('#focusBtn')&&await shown('#saveState'));
  assert.match(await page.textContent('#journalNotice'),/Focus mode/);if(shots)await page.screenshot({path:path.join(shots,'focus-mode.png')});
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-focus')),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'writing');assert.match(await page.textContent('#journalNotice'),/Left focus mode/);assert.ok(await shown('#writerCommandsBtn'));
  await command('Focus mode');await page.click('#focusBtn');assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-focus')),false,'the visible button leaves too');

  // Quick note: one line under today's entry, the rest of the writing and the caret untouched; Ctrl+Z takes it back.
  const d=today(),text=`### ${d} | Today\n\nMorning words.\n\n### 2999-01-01 | Friday\n\nA far future day.`;
  await page.fill('#writing',text);const mid=text.indexOf('Morning')+4;await page.$eval('#writing',(e,p)=>{e.focus();e.setSelectionRange(p,p);},mid);
  await command('Quick note');assert.equal(await page.evaluate(()=>document.activeElement.id),'captureText');
  await page.keyboard.press('Enter');assert.match(await page.textContent('#captureStatus'),/few words/);
  await page.fill('#captureText','Bought the good bread.');await page.keyboard.press('Enter');
  let w=await page.inputValue('#writing');
  assert.equal(w,`### ${d} | Today\n\nMorning words.\n\nBought the good bread.\n\n### 2999-01-01 | Friday\n\nA far future day.`);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'writing');assert.equal(await page.$eval('#writing',e=>e.selectionStart),mid,'cursor stays where it was');
  await page.keyboard.press('Control+z');await page.waitForTimeout(350);assert.equal(await page.inputValue('#writing'),text,'one undo step');
  // With no entry for today, one is made (as Today ＋ does); the cursor can move there on request.
  await page.fill('#writing','Just a thought.');await page.$eval('#writing',e=>e.setSelectionRange(0,0));
  await command('Quick note');await page.fill('#captureText','A fragment');await page.check('#captureGo');await page.click('#captureForm button[type=submit]');
  w=await page.inputValue('#writing');assert.match(w,new RegExp(`^Just a thought\\.\\n\\n### ${d} \\| \\w+\\n\\nA fragment\\n$`));assert.equal(await page.$eval('#writing',e=>e.selectionStart),w.indexOf('A fragment')+10);

  // A note that looks like a heading, fence or record stays one plain line under today.
  await page.fill('#writing',`### ${d} | Today\n\nHi.\n\n### 2999-01-01 | Friday\n`);await command('Quick note');await page.fill('#captureText','### 2030-01-01 dentist');await page.keyboard.press('Enter');
  w=await page.inputValue('#writing');assert.ok(w.includes('Hi.\n\n\\### 2030-01-01 dentist\n\n### 2999-01-01'),w);
  // Back to standard settings keeps the note; reduced motion follows the system setting too.
  await command('Writing preferences');await page.click('#prefsReset');assert.equal(await page.inputValue('#prefNote'),'Next: the paragraph about the walk.');await page.click('#prefsDone');
  assert.equal(await style('#writing','fontSize'),before.font);assert.ok(await shown('#writing'));assert.equal(await page.getAttribute('html','data-writer-view'),'write');assert.equal(await page.$eval('html',e=>e.hasAttribute('data-hide-counters')),false);
  assert.notEqual(await style('#writing','transitionDuration'),'1e-05s');await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await style('#writing','transitionDuration'),'1e-05s');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);

  // Storage that throws: the page still loads, preferences still apply for the visit, and saving says so.
  const broken=await browser.newContext({viewport:{width:390,height:844}}),bp=await broken.newPage(),berrors=[];bp.on('pageerror',e=>berrors.push(e.message));
  await bp.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new Error('quota');};Storage.prototype.getItem=()=>{throw new Error('denied');};});
  await bp.goto(base+'/write/');await bp.waitForFunction(()=>document.documentElement.hasAttribute('data-pref-size'));
  assert.equal(await bp.inputValue('#writing'),'','storage failure still opens a blank editor');assert.match(await bp.textContent('#journalNotice'),/unavailable|Download/i);
  await command('Writing preferences',bp);await bp.selectOption('#prefSize','l');assert.match(await bp.textContent('#prefsStatus'),/could not be remembered/);
  assert.equal(await bp.getAttribute('html','data-pref-size'),'l');await bp.keyboard.press('Escape');
  await command('Quick note',bp);await bp.fill('#captureText','Still works.');await bp.keyboard.press('Enter');assert.match(await bp.inputValue('#writing'),/Still works\./);
  assert.deepEqual(berrors,[]);await broken.close();
  console.log('PASS: text size, spacing, line length, density, contrast, reduced motion (setting and system) and hidden preview/parser/counts/decoration persist; print unaffected; focus mode by keyboard with Escape and announcements; quick note under today with caret kept and one undo step; caret/scroll and optional note restored; throwing storage; 390px light/dark accessibility.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
