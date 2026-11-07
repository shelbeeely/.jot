// Scenes (writer-scene.mjs, spec 8.1.9): each dated entry as a small 3D place a model designs from its words. The model here is a
// mocked local OpenAI-compatible server (this test's own server); live models are not exercised. Nothing is sent before Make and
// Send; the confirm shows exactly what goes; a draft changes nothing; Keep adds one attachment and one @setting: line, with Undo;
// kept scenes draw with no model; moments are the entry's own sentences; locking clears the view.
const {chromium,devices}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist'),shots=process.env.JOT_SHOTS;
const TYPES={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png'};
const SOURCE=`### 2026-10-01 | Thursday
Papers everywhere on my desk. The tea went cold while I read the same page three times.

~~~draft
a scratch note that must never be sent
~~~

### 2026-10-02 | Friday
Rain at the bus stop. The 42 was late again, so I shared an umbrella with a stranger.

### 2026-10-03 | Saturday
Stayed in bed until noon with the cat. The lamp is still on.

### 2026-10-04 | Sunday
Watched [The Matrix](imdb:tt0133093) on the old TV. Reading [Pride and Prejudice](https://openlibrary.org/works/OL66554W) after.
`;
// What a model might return for each day: data only, shapes and sentence numbers.
const box=(position,size,color,extra={})=>({type:'box',position,rotation:[0,0,0],size,color,roughness:0.8,glow:false,...extra});
const PLACES={
 '2026-10-01':{title:'A cluttered desk',sky:'#d9d2c3',ground:'#7a6a58',weather:'clear',time:'evening',atmosphere:'cosy',camera:{position:[3,2.6,4],target:[0,0.8,0]},objects:[
  {name:'Desk',position:[0,0,0],rotation:[0,0,0],moments:[1],shapes:[box([0,0.75,0],[2,0.08,1],'#8a5a3b'),box([-0.9,0.37,0.4],[0.08,0.74,0.08],'#6d4630'),box([0.9,0.37,0.4],[0.08,0.74,0.08],'#6d4630'),box([-0.9,0.37,-0.4],[0.08,0.74,0.08],'#6d4630'),box([0.9,0.37,-0.4],[0.08,0.74,0.08],'#6d4630')]},
  {name:'Mug of tea',position:[0.5,0.85,0.1],rotation:[0,0,0],motion:'steam',moments:[2],shapes:[{type:'cylinder',position:[0,0,0],rotation:[0,0,0],size:[0.07,0.14,0.07],color:'#e9e4dc',roughness:0.5,glow:false}]},
  {name:'Desk lamp',position:[-0.7,0.8,-0.2],rotation:[0,0,0],moments:[],shapes:[{type:'cone',position:[0,0.35,0],rotation:[0,0,0],size:[0.16,0.2,0.16],color:'#ffd27a',roughness:0.4,glow:true},{type:'cylinder',position:[0,0.15,0],rotation:[0,0,0],size:[0.02,0.3,0.02],color:'#333333',roughness:0.6,glow:false}]}]},
 '2026-10-02':{title:'A rainy bus stop',sky:'#7d8896',ground:'#3d4146',weather:'rain',time:'evening',camera:{position:[4,2.4,5],target:[0,1,0]},objects:[
  {name:'Bus shelter',position:[0,0,0],rotation:[0,0,0],moments:[1],shapes:[box([0,2.2,0],[3,0.1,1.2],'#556270'),box([-1.4,1.1,0],[0.08,2.2,0.08],'#9aa5b1'),box([1.4,1.1,0],[0.08,2.2,0.08],'#9aa5b1'),box([0,1.1,-0.55],[2.8,2,0.04],'#a9c4d6',{roughness:0.1})]},
  {name:'The 42',position:[0,0,2.4],rotation:[0,0,0],moments:[2],shapes:[box([0,1.2,0],[5,2.2,1.6],'#c0392b'),box([0,1.6,0.81],[4.4,0.6,0.02],'#dbe7f0')]},
  {name:'Shared umbrella',position:[0.6,0,0.4],rotation:[0,0,0],moments:[2],shapes:[{type:'cone',position:[0,1.9,0],rotation:[0,0,0],size:[0.6,0.3,0.6],color:'#2c3e50',roughness:0.6,glow:false},{type:'cylinder',position:[0,1.2,0],rotation:[0,0,0],size:[0.015,1.4,0.015],color:'#222222',roughness:0.6,glow:false}]}]},
 '2026-10-04':{title:'A film night',sky:'#2b3350',ground:'#6b5a4a',weather:'clear',time:'night',atmosphere:'cosy',camera:{position:[3,2.4,4],target:[0,0.6,0]},objects:[
  {name:'TV',position:[0,0.45,-0.6],rotation:[0,0,0],motion:'none',moments:[1],shapes:[{type:'tv',position:[0,0,0],rotation:[0,0,0],size:[1.1,0.9,0.25],color:'#2c3350',roughness:0.5,glow:false}]},
  {name:'Book',position:[0.8,0.02,0.4],rotation:[0,0,0],motion:'none',moments:[2],shapes:[{type:'book',position:[0,0,0],rotation:[0,0,0],size:[0.22,0.04,0.3],color:'#3f6e9a',roughness:0.8,glow:false}]}]},
 '2026-10-03':{title:'Saturday’s bedroom',sky:'#f2d8c9',ground:'#a58d7b',weather:'sun',time:'day',camera:{position:[3.5,2.6,4],target:[0,0.5,0]},objects:[
  {name:'Bed',position:[0,0,0],rotation:[0,0,0],moments:[1],shapes:[box([0,0.25,0],[1.6,0.5,2.1],'#7b5e4a'),box([0,0.55,0.1],[1.5,0.15,1.8],'#f4f0e8'),box([0,0.68,-0.75],[1.2,0.15,0.35],'#ffffff')]},
  {name:'The cat',position:[0.3,0.75,0.4],rotation:[0,0,0],moments:[1],shapes:[{type:'sphere',position:[0,0,0],rotation:[0,0,0],size:[0.18,0.12,0.25],color:'#f0a35e',roughness:0.9,glow:false}]},
  {name:'Lamp',position:[1.2,0,-0.9],rotation:[0,0,0],moments:[2],shapes:[box([0,0.3,0],[0.4,0.6,0.4],'#8c7a6b'),{type:'sphere',position:[0,0.8,0],rotation:[0,0,0],size:[0.15,0.15,0.15],color:'#ffe9a8',roughness:0.3,glow:true}]}]},
};
const requests=[];
const server=http.createServer((req,res)=>{const url=decodeURIComponent(req.url.split('?')[0]);
 if(url==='/v1/chat/completions'&&req.method==='POST'){let body='';req.on('data',c=>body+=c);req.on('end',()=>{const b=JSON.parse(body);requests.push(b);const user=JSON.parse(b.messages[1].content);
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(PLACES[user.date])}}]}));});return;}
 let file=path.resolve(root,'.'+url);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',TYPES[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',locale:'en-GB'}),outside=[],errors=[];
  const tmdb=[],TMDB=/^https:\/\/(api\.themoviedb\.org|image\.tmdb\.org)\//,ol=[],OL=/^https:\/\/(openlibrary\.org|covers\.openlibrary\.org)\//;
  context.on('request',r=>{if(TMDB.test(r.url())){tmdb.push({url:r.url(),auth:r.headers().authorization||''});return;}if(OL.test(r.url())){ol.push(r.url());return;}if(!r.url().startsWith(origin)&&!/^(data|blob|about):/.test(r.url()))outside.push(r.url());});
  // TMDb, as saved real replies (site/fixtures/tmdb/); its image host serves a small picture.
  const fixtures=path.join(__dirname,'fixtures','tmdb');
  await context.route(/^https:\/\/api\.themoviedb\.org\//,(route)=>{const u=new URL(route.request().url());const name=u.pathname==='/3/find/tt0133093'?'find-tt0133093.json':u.pathname==='/3/movie/603/images'?'movie-603-images.json':null;
    if(!name)return route.fulfill({status:404,body:'{}'});route.fulfill({status:200,contentType:'application/json',body:fs.readFileSync(path.join(fixtures,name))});});
  await context.route(/^https:\/\/image\.tmdb\.org\//,(route)=>route.fulfill({status:200,contentType:'image/jpeg',body:fs.readFileSync(path.join(fixtures,'still.jpg'))}));
  // Open Library, as a saved real reply for the work; its cover host serves a small cover.
  const covers=path.join(__dirname,'fixtures','covers');
  await context.route(/^https:\/\/openlibrary\.org\//,(route)=>new URL(route.request().url()).pathname==='/works/OL66554W.json'?route.fulfill({status:200,contentType:'application/json',body:fs.readFileSync(path.join(covers,'work-OL66554W.json'))}):route.fulfill({status:404,body:'{}'}));
  await context.route(/^https:\/\/covers\.openlibrary\.org\//,(route)=>route.fulfill({status:200,contentType:'image/jpeg',body:fs.readFileSync(path.join(covers,'cover-small.jpg'))}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/write/');await page.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));
  await page.evaluate((src)=>{const e=document.getElementById('writing');e.jotSetMode?.('source');e.value=src;e.dispatchEvent(new Event('input',{bubbles:true}));},SOURCE);
  const source=()=>page.inputValue('#writing');
  const loaded=()=>page.evaluate(()=>!!globalThis.JotThree);assert.equal(await loaded(),false);
  await page.click('#writerScenesToggle');await page.waitForSelector('#writerScenes:not([hidden]) [role=tab]');
  assert.deepEqual(await page.locator('#writerScenes [role=tab]').allTextContents(),['Thu 1 Oct','Fri 2 Oct','Sat 3 Oct','Sun 4 Oct']);
  assert.equal(await page.textContent('#writerScenesSummary'),'4 days; 0 with a kept scene.');
  // Choosing the day that is already chosen keeps its Make button.
  await page.locator('#writerScenes [role=tab]').nth(0).click();assert.ok(await page.isVisible('#writerScenesMake'));
  // Without the AI companion on, Make points to it and sends nothing.
  await page.click('#writerScenesMake');assert.match(await page.textContent('.writer-scenes-confirm'),/Turn on AI for this session there and choose a model/);assert.equal(requests.length,0);
  await page.evaluate((base)=>{const $=(id)=>document.getElementById(id);$('aiEnabled').checked=true;$('aiEnabled').dispatchEvent(new Event('change',{bubbles:true}));$('aiProvider').value='local';$('aiProvider').dispatchEvent(new Event('change',{bubbles:true}));$('aiBase').value=base;$('aiModel').value='mock-scenes';},origin+'/v1');
  // The confirm shows exactly what goes, and where; the scratchpad is never part of it.
  await page.click('#writerScenesMake');
  const confirmText=await page.textContent('.writer-scenes-confirm');
  assert.match(confirmText,/These 2 sentences from Thu 1 Oct, and nothing else from your journal, go to the server on this computer at http:\/\/127\.0\.0\.1:\d+\/v1 \(mock-scenes\)/);
  assert.deepEqual(await page.locator('.writer-scenes-sent li').allTextContents(),['Papers everywhere on my desk.','The tea went cold while I read the same page three times.']);
  assert.equal(requests.length,0,'nothing is sent before Send');
  await page.click('#writerScenesSend');await page.waitForSelector('#writerScenes .writer-scenes-canvas');
  assert.equal(requests.length,1);const sent=requests[0];
  assert.equal(sent.max_tokens,128000,'Writer asks as the demo does');assert.equal(sent.reasoning,undefined,'a local server never gets the reasoning hint');
  assert.equal(sent.response_format.json_schema.name,'jot_place');assert.equal(sent.messages.length,2);assert.doesNotMatch(JSON.stringify(sent),/scratch note/,'scratchpads are never sent');
  assert.deepEqual(JSON.parse(sent.messages[1].content),{date:'2026-10-01',sentences:[{n:1,text:'Papers everywhere on my desk.'},{n:2,text:'The tea went cold while I read the same page three times.'}]});
  assert.equal(await loaded(),true);
  // A draft: 3D, things that hold moments, and the writer's own sentences.
  assert.ok(await page.isVisible('.writer-scenes-draft'));assert.equal(await source(),SOURCE,'a draft changes nothing');
  assert.deepEqual(await page.locator('.writer-scenes-things button').allTextContents(),['Desk','Mug of tea']);
  await page.click('.writer-scenes-things button:has-text("Mug of tea")');
  assert.equal(await page.textContent('.writer-scenes-moment h3'),'Mug of tea');assert.deepEqual(await page.locator('.writer-scenes-moment li').allTextContents(),['The tea went cold while I read the same page three times.']);
  // Told as an interpretation, with the model's reading of the feel; the moments stay the entry's own words.
  assert.match(await page.textContent('.writer-scenes-about'),/^A cluttered desk\. Imagined by mock-scenes from this entry's words, with a cosy feel: the look is an interpretation; the moments are the entry's own sentences\./);
  // Keyboard: the focused scene turns with the arrow keys and zooms with + and −.
  await page.focus('.writer-scenes-canvas');const shot=await page.locator('.writer-scenes-canvas').screenshot();await page.keyboard.press('ArrowRight');await page.keyboard.press('+');await page.waitForTimeout(150);
  assert.notDeepEqual(await page.locator('.writer-scenes-canvas').screenshot(),shot,'arrow keys and + move the view');
  await page.click('#writerScenesReset');
  // Steam is a motion: with reduced motion everything starts still, and Play motion is offered.
  assert.equal(await page.isVisible('#writerScenesPause'),true);assert.equal(await page.textContent('#writerScenesPause'),'Play motion');
  // The whole entry is always a click away, not only after choosing a thing.
  assert.equal(await page.isVisible('#writerScenesJournal'),true);
  if(shots)await page.locator('#writerScenes').screenshot({path:path.join(shots,'scenes-desk-draft.png')});
  // Discard leaves the journal alone; Keep adds the attachment and one @setting: line, and Undo takes the line back.
  await page.click('#writerScenesDiscard');assert.equal(await page.isVisible('.writer-scenes-canvas'),false);assert.equal(await source(),SOURCE);
  await page.click('#writerScenesMake');await page.click('#writerScenesSend');await page.waitForSelector('.writer-scenes-canvas');
  await page.click('#writerScenesKeep');await page.waitForFunction(()=>/@setting: media\//.test(document.getElementById('writing').value));
  const kept=await source();assert.match(kept,/^### 2026-10-01 \| Thursday\n@setting: media\/[0-9a-f-]+\n\nPapers everywhere/);
  assert.equal(kept.replace(/@setting: media\/[0-9a-f-]+\n\n/,''),SOURCE,'only the one line was added');
  await page.waitForFunction(()=>/1 with a kept scene/.test(document.getElementById('writerScenesSummary').textContent));
  // Undo takes the @setting: line back out (the attachment stays until removed); Redo puts it back.
  await page.click('#writerScenesToggle');await page.evaluate(()=>document.getElementById('writing').focus());
  await page.keyboard.press('Control+z');await page.waitForFunction(()=>!/@setting:/.test(document.getElementById('writing').value));assert.equal(await source(),SOURCE);
  await page.keyboard.press('Control+Shift+z');await page.waitForFunction(()=>/@setting: media\//.test(document.getElementById('writing').value));assert.equal(await source(),kept);
  await page.click('#writerScenesToggle');await page.waitForSelector('#writerScenes:not([hidden]) [role=tab]');
  // The other days, made the same way: the rainy bus stop and Saturday's bedroom.
  for(const [tab,title] of [[1,'A rainy bus stop'],[2,'Saturday’s bedroom']]){
   await page.locator('#writerScenes [role=tab]').nth(tab).click();await page.click('#writerScenesMake');await page.click('#writerScenesSend');
   await page.waitForFunction((t)=>document.querySelector('.writer-scenes-about')?.textContent.startsWith(t),title);
   if(tab===1){assert.equal(await page.isVisible('#writerScenesPause'),true);assert.equal(await page.getAttribute('#writerScenesPause','aria-pressed'),'true','rain starts paused with reduced motion');
    await page.click('.writer-scenes-things button:has-text("The 42")');assert.deepEqual(await page.locator('.writer-scenes-moment li').allTextContents(),['The 42 was late again, so I shared an umbrella with a stranger.']);}
   if(shots)await page.locator('#writerScenes').screenshot({path:path.join(shots,`scenes-${tab}.png`)});
   await page.click('#writerScenesDiscard');
  }
  // A kept scene draws again with no request; arrow keys move between days.
  const before=requests.length;await page.locator('#writerScenes [role=tab]').nth(2).focus();await page.keyboard.press('Home');
  await page.waitForFunction(()=>document.querySelector('.writer-scenes-about')?.textContent.startsWith('A cluttered desk. Imagined by mock-scenes from this entry'));
  assert.equal(requests.length,before,'a kept scene needs no model');assert.equal(await page.getAttribute('#writerScenes [role=tab] >> nth=0','aria-selected'),'true');
  // Open journal shows the whole entry; Go to this entry returns to the writing.
  await page.click('.writer-scenes-things button:has-text("Desk")');await page.click('.writer-scenes-open');
  assert.match(await page.textContent('.writer-scenes-page'),/Papers everywhere on my desk\./);assert.doesNotMatch(await page.textContent('.writer-scenes-page'),/scratch note/);
  assert.equal(await page.evaluate(()=>document.querySelector('.writer-scenes-journal').open),true,'the entry opens in a dialog');
  if(shots)await page.screenshot({path:path.join(shots,'scenes-journal.png')});
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.querySelector('.writer-scenes-journal').open),false,'Escape returns to the scene');
  // Editing the entry: a moment whose sentence is gone says so.
  await page.evaluate(()=>{const e=document.getElementById('writing');e.value=e.value.replace('The tea went cold','The coffee went cold');e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForTimeout(700);await page.click('.writer-scenes-things button:has-text("Mug of tea")');
  assert.match(await page.textContent('.writer-scenes-moment'),/\(no longer in this entry\)/);
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  {const v=await page.evaluate(async()=>(await axe.run(document.getElementById('writerScenes'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target.join(' ')+' '+(n.any[0]?.message||'')).slice(0,4)})));if(v.length)console.log(JSON.stringify(v,null,1));assert.deepEqual(v.map(x=>x.id),[]);}
  // A still from TMDb comes with the scene: offered in the confirm step for a day that watched something, only the film's id goes,
  // the draft shows it with Another still, and Keep saves it with the scene; the writing gets only the @setting: line.
  await page.locator('#writerScenes [role=tab]').nth(3).click();await page.click('#writerScenesMake');
  assert.equal(await page.isChecked('#writerScenesWantStill'),true);assert.equal(await page.isChecked('#writerScenesWantCover'),true);
  assert.match(await page.textContent('.writer-scenes-confirm'),/only its identifier \(https:\/\/openlibrary\.org\/works\/OL66554W\) goes to Open Library/);assert.equal(ol.length,0,'nothing goes to Open Library before Send');assert.match(await page.textContent('.writer-scenes-confirm'),/only its identifier \(imdb:tt0133093\) goes to TMDb/);
  await page.fill('#writerScenesTmdbToken','eyJhbGciOiJIUzI1NiJ9.test.token');assert.equal(tmdb.length,0,'nothing goes to TMDb before Send');
  await page.click('#writerScenesSend');await page.waitForFunction(()=>document.querySelector('.writer-scenes-about')?.textContent.startsWith('A film night'));
  assert.match(await page.textContent('.writer-scenes-about'),/The still on the screen is from TMDB\. The book's cover is from Open Library\./);assert.equal(await page.isVisible('#writerScenesNextStill'),true);
  assert.deepEqual(ol.filter(u=>u.startsWith('https://openlibrary.org')).map(u=>new URL(u).pathname),['/works/OL66554W.json'],'only the work goes to Open Library');
  assert.equal(ol.filter(u=>u.startsWith('https://covers.openlibrary.org')).length,1,'one cover downloaded');assert.equal(await page.isVisible('#writerScenesNextCover'),true);
  await page.click('#writerScenesNextCover');await page.waitForFunction(()=>!document.getElementById('writerScenesNextCover').disabled);
  assert.equal(ol.filter(u=>u.startsWith('https://covers.openlibrary.org')).length,2,'Another cover downloads the next one');
  const api=tmdb.filter(r=>r.url.startsWith('https://api.themoviedb.org'));
  assert.deepEqual(api.map(r=>new URL(r.url).pathname),['/3/find/tt0133093','/3/movie/603/images']);assert.ok(api.every(r=>r.auth==='Bearer eyJhbGciOiJIUzI1NiJ9.test.token'));
  assert.equal(tmdb.filter(r=>r.url.startsWith('https://image.tmdb.org')).length,1,'one still downloaded');
  if(shots)await page.locator('#writerScenes').screenshot({path:path.join(shots,'scenes-still.png')});
  await page.click('#writerScenesNextStill');await page.waitForFunction(()=>!document.getElementById('writerScenesNextStill').disabled);
  assert.equal(tmdb.filter(r=>r.url.startsWith('https://image.tmdb.org')).length,2,'Another still downloads the next one');
  const before4=await source();await page.click('#writerScenesKeep');
  await page.waitForFunction(()=>/### 2026-10-04 \| Sunday\n@setting: media\//.test(document.getElementById('writing').value));
  assert.doesNotMatch(await source(),/!\[Still/,'the writing gets no still line');
  await page.waitForFunction(()=>/The book's cover is from Open Library\./.test(document.querySelector('.writer-scenes-about')?.textContent||''));
  const stillRequests=tmdb.length+ol.length;await page.locator('#writerScenes [role=tab]').nth(0).click();await page.locator('#writerScenes [role=tab]').nth(3).click();
  await page.waitForFunction(()=>/The still on the screen is from TMDB\. The book's cover is from Open Library\./.test(document.querySelector('.writer-scenes-about')?.textContent||''));
  assert.equal(tmdb.length+ol.length,stillRequests,"a kept still draws from the journal, with no request");void before4;
  // Locking clears the view.
  await page.evaluate(()=>{const e=document.getElementById('writing');e.readOnly=true;e.setAttribute('readonly','');});await page.waitForTimeout(100);
  assert.equal(await page.isVisible('#writerScenes'),false);assert.equal(await page.locator('#writerScenes [role=tab]').count(),0);
  // Phone: the view fits.
  const phone=await browser.newContext({...devices['iPhone 13'],locale:'en-GB'});const p2=await phone.newPage();await p2.goto(origin+'/write/');await p2.waitForFunction(()=>document.documentElement.hasAttribute('data-archive-ready'));
  await p2.evaluate((src)=>{const e=document.getElementById('writing');e.jotSetMode?.('source');e.value=src;e.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('writerScenesToggle').click();},SOURCE);
  await p2.waitForSelector('#writerScenes [role=tab]');assert.ok(await p2.locator('#writerScenes').evaluate(n=>n.getBoundingClientRect().right<=innerWidth+1),'no horizontal overflow on a phone');await phone.close();
  assert.deepEqual(outside,[],'nothing fetched from outside');assert.deepEqual(errors,[]);
  console.log('scenes: ok');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
