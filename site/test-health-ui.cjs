// Import health data in /write/, with a small made-up export.xml and CSV: choose numbers and dates, review, add, undo; no requests leave
// the page; the dialog at phone width in light and dark, checked with axe. Run: node site/test-health-ui.cjs [screenshot folder]
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'dist'),axe=path.join(__dirname,'../node_modules/axe-core/axe.min.js'),shots=process.argv[2]||'';
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!f.startsWith(root+path.sep)&&f!==root){res.writeHead(403);return res.end();}if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');res.end(b);});});
const rec=(type,day,time,value,unit='count',source='Phone')=>`<Record type="HKQuantityTypeIdentifier${type}" sourceName="${source}" unit="${unit}" startDate="${day} ${time} -0700" endDate="${day} ${time} -0700" value="${value}"/>\n`;
const sleep=(s,e,v)=>`<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="${s} -0700" endDate="${e} -0700" value="HKCategoryValueSleepAnalysis${v}"/>\n`;
const XML=`<?xml version="1.0" encoding="UTF-8"?>\n<HealthData locale="en_US">\n${rec('StepCount','2026-10-25','08:00:00',4000)}${rec('StepCount','2026-10-25','18:00:00',2000)}${rec('StepCount','2026-10-26','09:00:00',7000)}${rec('HeartRate','2026-10-25','10:00:00',60,'count/min')}${rec('HeartRate','2026-10-25','14:00:00',80,'count/min')}${sleep('2026-10-25 23:00:00','2026-10-26 06:00:00','AsleepCore')}${sleep('2026-10-25 22:30:00','2026-10-26 06:30:00','InBed')}${rec('BloodGlucose','2026-10-25','08:00:00',95,'mg/dL')}</HealthData>\n`;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jot-health-')),xml=path.join(dir,'export.xml'),csv=path.join(dir,'garmin.csv');
 fs.writeFileSync(xml,XML);fs.writeFileSync(csv,'Calendar Date,Total Steps,Body Battery,Resting Heart Rate\n03/10/2026,5000,70,58\n04/10/2026,6000,60,57\n');
 try{
  for(const scheme of ['light','dark']){
   const context=await browser.newContext({viewport:{width:390,height:844},colorScheme:scheme}),page=await context.newPage(),errors=[],remote=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))remote.push(r.url());});
   await page.goto(base+'/write/');
   const original='# Notebook\n\n### 2026-10-26 | Monday\n\n:::record measurement #sleep-2026-10-26\nmetric: sleep\nunit: h\nvalue:\n:::\n';
   await page.fill('#writing',original);
   await page.click('#importHealthBtn');assert.ok(await page.$eval('#healthDialog',d=>d.open));
   const chooser=page.waitForEvent('filechooser');await page.click('#healthChoose');await (await chooser).setFiles(xml);
   await page.waitForFunction(()=>!document.getElementById('healthChoices').hidden);
   assert.match(await page.textContent('#healthStatus'),/Apple Health: numbers from 2026-10-25 to 2026-10-26/);
   const boxes=await page.$$eval('#healthMetrics input',l=>l.map(b=>[b.value,b.checked]));
   assert.deepEqual(boxes,[['heart-rate',true],['heart-rate-max',false],['heart-rate-min',false],['sleep',true],['steps',true]],'glucose is never offered; lowest/highest off');
   assert.equal(await page.inputValue('#writing'),original,'nothing changes before Add');
   assert.match(await page.textContent('#healthSummary'),/3 records to add, 1 blank to fill, 0 already/);
   await page.uncheck('#healthMetrics input[value="heart-rate"]');
   assert.match(await page.textContent('#healthSummary'),/2 records to add, 1 blank to fill/);
   const preview=await page.textContent('#healthPreview');assert.match(preview,/#steps-2026-10-25\nmetric: steps\nvalue: 6000\naggregation: sum\nsource: Apple Health export\.xml/);assert.match(preview,/#sleep-2026-10-26\nmetric: sleep\nunit: h\nvalue: 7\naggregation: sum/);assert.doesNotMatch(preview,/heart-rate|glucose/i);
   assert.match(await page.textContent('#healthMetrics label:has(input[value="steps"])'),/2 days/);
   await page.fill('#healthSince','2026-10-26');await page.dispatchEvent('#healthSince','change');
   assert.match(await page.textContent('#healthSummary'),/1 record to add, 1 blank to fill/);
   await page.fill('#healthSince','2026-10-25');await page.dispatchEvent('#healthSince','change');
   if(fs.existsSync(axe)){await page.addScriptTag({path:axe});const v=await page.evaluate(async()=>(await axe.run(document.querySelector('#healthDialog'))).violations.filter(x=>['serious','critical'].includes(x.impact)).map(x=>({id:x.id,nodes:x.nodes.map(n=>n.target)})));assert.deepEqual(v,[],JSON.stringify(v));}
   assert.ok(await page.$eval('#healthDialog',d=>d.scrollWidth<=d.clientWidth+1),'no sideways scrolling at 390px');
   if(shots)await page.screenshot({path:path.join(shots,`health-dialog-${scheme}.png`),fullPage:false});
   await page.click('#healthApply');assert.ok(!(await page.$eval('#healthDialog',d=>d.open)));
   const after=await page.inputValue('#writing');
   assert.match(after,/### 2026-10-25 \| Sunday\n\n:::record measurement #steps-2026-10-25/);assert.match(after,/#sleep-2026-10-26\nmetric: sleep\nunit: h\nvalue: 7\naggregation: sum/);assert.match(after,/#steps-2026-10-26\nmetric: steps\nvalue: 7000/);
   assert.match(await page.textContent('#journalNotice'),/1 blanks filled, 2 numbers added/);
   await page.focus('#writing');await page.keyboard.press('Control+z');assert.equal(await page.inputValue('#writing'),original,'Ctrl+Z takes the import out');
   // A Garmin CSV with day-first dates: left out until "day first" is ticked; scores never offered; Escape closes.
   await page.click('#importHealthBtn');const c2=page.waitForEvent('filechooser');await page.click('#healthChoose');await (await c2).setFiles(csv);
   await page.waitForFunction(()=>!document.getElementById('healthDayFirstRow').hidden);assert.match(await page.textContent('#healthStatus'),/No numbers Jot reads were found/);
   await page.check('#healthDayFirst');await page.waitForFunction(()=>!document.getElementById('healthChoices').hidden);
   assert.deepEqual(await page.$$eval('#healthMetrics input',l=>l.map(b=>b.value)),['resting-heart-rate','steps']);assert.match(await page.textContent('#healthStatus'),/Garmin: numbers from 2026-10-03 to 2026-10-04.*left out: Body Battery/);
   await page.keyboard.press('Escape');assert.ok(!(await page.$eval('#healthDialog',d=>d.open)));assert.equal(await page.inputValue('#writing'),original);
   assert.deepEqual(remote,[],'no requests leave the page');assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS: health import from export.xml and a Garmin CSV: metrics and dates chosen, exact records previewed, nothing written before Add, Ctrl+Z undo, glucose and scores never offered, day-first dates, Escape, no requests, 390px light/dark, axe.');
 }finally{await browser.close();server.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
