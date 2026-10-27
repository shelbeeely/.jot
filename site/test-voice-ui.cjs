// The voice practice dialog with Chromium's fake microphone playing a generated 220 Hz tone: no microphone before Start,
// on-device measurement, the microphone released on Stop/close, the writing unchanged until Add, and no network use.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist');
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)&&f!==root){res.writeHead(403);return res.end();}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');res.end(b);});});
function toneWav(file,hz,seconds=3,rate=48000){const n=rate*seconds,data=Buffer.alloc(n*2);for(let i=0;i<n;i++){const t=i/rate,v=0.45*Math.sin(2*Math.PI*hz*t)+0.15*Math.sin(4*Math.PI*hz*t);data.writeInt16LE(Math.round(v*32767),i*2);}
 const h=Buffer.alloc(44);h.write('RIFF',0);h.writeUInt32LE(36+data.length,4);h.write('WAVE',8);h.write('fmt ',12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*2,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);fs.writeFileSync(file,Buffer.concat([h,data]));}
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jot-voice-')),wav=path.join(dir,'tone-220.wav');toneWav(wav,220);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+wav,'--autoplay-policy=no-user-gesture-required']});
 try{
  const context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage(),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))remote.push(r.url());});
  await page.addInitScript(()=>{window.__mic={calls:0,streams:[]};const md=navigator.mediaDevices,orig=md.getUserMedia.bind(md);md.getUserMedia=async c=>{window.__mic.calls++;window.__mic.constraints=c;const s=await orig(c);window.__mic.streams.push(s);return s;};});
  await page.goto(base+'/write/');
  const original='### 2026-10-27 | Tuesday\n\nBefore.\n\nAfter.';await page.fill('#writing',original);
  await page.$eval('#writing',e=>{const p=e.value.indexOf('Before.')+7;e.setSelectionRange(p,p);});
  await page.click('#voiceBtn');assert.equal(await page.evaluate(()=>document.getElementById('voiceDialog').open),true);
  assert.equal(await page.evaluate(()=>window.__mic.calls),0,'opening the dialog does not ask for the microphone');
  assert.match(await page.textContent('#voiceMic'),/Microphone off/);
  // A target range the person chooses is a per-browser preference
  await page.click('#voiceTargetBox summary');await page.fill('#voiceTargetLow','180');await page.fill('#voiceTargetHigh','260');await page.press('#voiceTargetHigh','Tab');
  assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('jot-voice-target-v1'))),{lo:180,hi:260});
  await page.click('#voiceTimer');assert.equal(await page.getAttribute('#voiceTimer','aria-pressed'),'true');
  await page.click('#voiceStart');
  await page.waitForFunction(()=>window.__mic.streams.length===1&&document.getElementById('voiceMic').classList.contains('on'));
  const constraints=await page.evaluate(()=>window.__mic.constraints);assert.deepEqual(constraints.audio,{echoCancellation:false,noiseSuppression:false,autoGainControl:false});
  assert.equal(await page.evaluate(()=>document.activeElement.id),'voiceStop','focus moves to Stop');
  await page.waitForFunction(()=>/Hz/.test(document.getElementById('voiceMedian').textContent),null,{timeout:10000});
  await page.waitForTimeout(1500);
  const median=Number((await page.textContent('#voiceMedian')).replace(/\D+/g,''));assert.ok(Math.abs(median-220)<=5,'median near 220 Hz, got '+median);
  assert.equal(await page.inputValue('#writing'),original,'measuring never changes the writing');
  await page.screenshot({path:path.join(process.env.JOT_SHOTS||dir,'voice-listening.png')});
  await page.click('#voiceTimer');await page.click('#voiceStop');
  assert.match(await page.textContent('#voiceMic'),/Microphone off/);assert.match(await page.textContent('#voiceStatus'),/Microphone off/);
  assert.deepEqual(await page.evaluate(()=>window.__mic.streams.flatMap(s=>s.getTracks().map(t=>t.readyState))),['ended'],'Stop ends every track');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'voiceStart');
  assert.ok(Number(await page.inputValue('#voiceMinutes'))>0,'minutes are prefilled from the session');
  await page.fill('#voiceMinutes','12');await page.fill('#voiceExercise','Sirens');await page.selectOption('#voiceFelt','4');await page.selectOption('#voiceStrain','1');await page.fill('#voiceNote','Easier after humming.');
  // A recording made elsewhere is attached to the document, and linked only on Add
  await page.setInputFiles('#voiceRecordingFile',{name:'take 1.m4a',mimeType:'audio/mp4',buffer:Buffer.from('not really audio')});
  await page.waitForFunction(()=>document.getElementById('voiceRecording').value==='assets/take-1.m4a');
  assert.equal(await page.inputValue('#writing'),original,'attaching a recording does not change the writing');
  assert.match(await page.textContent('#assetList'),/assets\/take-1\.m4a/);
  await page.click('#voiceAdd');
  const writing=await page.inputValue('#writing');
  assert.ok(writing.indexOf('Before.')<writing.indexOf('#### Voice practice')&&writing.indexOf('After.')>writing.indexOf('#### Voice practice'));
  assert.match(writing,/metric: pitch-hz\nunit: Hz\nvalue: 2[12]\d/);assert.match(writing,/metric: voice-minutes\nunit: min\nvalue: 12/);
  assert.match(writing,/method: voice-practice@1\nexercise: Sirens\nstrain: 1\nfelt-like-me: 4\nrecording: assets\/take-1\.m4a/);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'writing');assert.equal(await page.evaluate(()=>document.getElementById('voiceDialog').open),false);
  const diagnostics=await page.evaluate(async()=>{const {parse}=await import('../jot/jot.mjs');return parse(document.getElementById('writing').value).diagnostics;});assert.deepEqual(diagnostics,[]);
  // Closing the dialog while listening also releases the microphone
  await page.click('#voiceBtn');assert.equal(await page.inputValue('#voiceMinutes'),'','the form is cleared after Add');
  await page.click('#voiceStart');await page.waitForFunction(()=>window.__mic.streams.length===2&&document.getElementById('voiceMic').classList.contains('on'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>window.__mic.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended')));
  assert.equal(await page.inputValue('#writing'),writing,'closing without Add leaves the writing as it was');
  const stored=await page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k!=='jot-workspace-v1'));assert.ok(stored.every(([k,v])=>k==='jot-voice-target-v1'||!/voice|Sirens|humming|Hz/i.test(k+v)),'only the target range is remembered by the tool: '+JSON.stringify(stored));
  // Mobile, light and dark, accessibility
  await page.click('#voiceBtn');
  for(const mode of ['light','dark']){await page.emulateMedia({colorScheme:mode,reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);assert.ok(await page.evaluate(()=>{const d=document.getElementById('voiceDialog');return d.scrollWidth<=d.clientWidth;}),'the dialog does not scroll sideways');
   await page.screenshot({path:path.join(process.env.JOT_SHOTS||dir,'voice-390-'+mode+'.png')});
   const axe=path.join(__dirname,'../node_modules/axe-core/axe.min.js');if(fs.existsSync(axe)){if(!await page.evaluate(()=>!!window.axe))await page.addScriptTag({path:axe});const v=await page.evaluate(async()=>(await axe.run(document.querySelector('#voiceDialog'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,reason:n.failureSummary}))})));assert.deepEqual(v,[]);}}
  await page.click('#voiceClose');
  assert.deepEqual(remote,[],'no requests leave this site');assert.deepEqual(errors,[]);
  console.log('PASS: no microphone before Start, raw-audio constraints, ~220 Hz measured on device, Stop/close end every track, minutes prefill, recording attached without changing the writing, Add inserts clean records at the cursor, target preference only, no network, 390px light/dark and accessibility. Screenshots: '+(process.env.JOT_SHOTS||dir));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
