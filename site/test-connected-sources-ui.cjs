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
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[],calls=[],remote=[];let held=false,release,fail=false;
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('https://archive-api.open-meteo.com/'))remote.push(r.url());});
  await page.route('https://archive-api.open-meteo.com/v1/archive?*',async route=>{
   calls.push(route.request().url());if(held)await new Promise(resolve=>{release=resolve;});
   await route.fulfill({status:fail?429:200,contentType:'application/json',body:JSON.stringify({timezone:'Europe/London',daily:{time:['2020-10-01'],temperature_2m_max:[15],temperature_2m_min:[null],precipitation_sum:[0]},daily_units:{temperature_2m_max:'°C',temperature_2m_min:'°C',precipitation_sum:'mm'}})}).catch(()=>{});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/write/`);await require('./test-source-workspace.cjs')(page);
  const original='Private entry that must not leave this browser.\n';await page.fill('#writing',original);await page.locator('#writing').evaluate(e=>{e.focus();e.setSelectionRange(e.value.length,e.value.length);});
  await require('./test-source-workspace.cjs').command(page,'Connected sources');assert.equal(await page.isVisible('#connectedSources'),true);assert.equal(calls.length,0);
  async function fields(){await page.fill('#sourcesLatitude','51.5');await page.fill('#sourcesLongitude','-0.12');await page.fill('#sourcesDate','2020-10-01');await page.fill('#sourcesTimezone','Europe/London');}
  await fields();assert.equal(calls.length,0);await page.click('#sourcesLookup');await page.waitForSelector('#sourcesReview:not([hidden])');assert.equal(await page.inputValue('#writing'),original);assert.match(await page.textContent('#sourcesPreview'),/missing: true/);assert.match(await page.textContent('#sourcesSummary'),/Historical model estimate/);
  for(const call of calls){assert.doesNotMatch(call,/Private|entry|journal|passphrase/);assert.equal(new URL(call).searchParams.get('start_date'),'2020-10-01');}
  await page.click('#sourcesInsert');await page.waitForFunction(()=>!document.getElementById('connectedSources').open);const saved=await page.inputValue('#writing');assert.match(saved,/metric: weather-precipitation\nvalue: 0/);assert.match(saved,/data-kind: estimated/);await page.locator('#writing').focus();await page.keyboard.press('Control+z');assert.equal(await page.inputValue('#writing'),original);
  await page.click('#writerSourcesBtn');await fields();await page.waitForTimeout(1150);await page.click('#sourcesLookup');await page.waitForSelector('#sourcesReview:not([hidden])');
  await page.locator('#writing').evaluate(e=>{e.value+='Newer words.\n';e.dispatchEvent(new Event('input',{bubbles:true}));e.setSelectionRange(e.value.length,e.value.length);});
  await page.click('#sourcesInsert');await page.waitForFunction(()=>document.getElementById('sourcesStatus').textContent.includes('writing changed'));assert.equal(await page.inputValue('#writing'),original+'Newer words.\n');
  await page.click('#sourcesCaret');await page.click('#sourcesInsert');await page.waitForFunction(()=>!document.getElementById('connectedSources').open);
  await page.click('#writerSourcesBtn');await fields();await page.waitForTimeout(1150);await page.click('#sourcesLookup');await page.waitForSelector('#sourcesReview:not([hidden])');
  await page.evaluate(()=>{window.savedStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
  await page.click('#sourcesInsert');await page.waitForFunction(()=>document.getElementById('sourcesInsert').textContent==='Retry save');const once=await page.inputValue('#writing');
  await page.evaluate(()=>{Storage.prototype.setItem=window.savedStorageSet;});await page.click('#sourcesInsert');await page.waitForFunction(()=>!document.getElementById('connectedSources').open);assert.equal(await page.inputValue('#writing'),once);
  await require('./test-source-workspace.cjs').command(page,'Live editing');await page.click('#writerSourcesBtn');await fields();await page.waitForTimeout(1150);await page.click('#sourcesLookup');await page.waitForSelector('#sourcesReview:not([hidden])');
  await page.click('#sourcesInsert');await page.waitForFunction(()=>!document.getElementById('connectedSources').open);await page.locator('#liveWriting').focus();await page.keyboard.press('Control+z');assert.equal(await page.inputValue('#writing'),once);
  await require('./test-source-workspace.cjs').command(page,'Source editing');
  await page.click('#writerSourcesBtn');held=true;await fields();await page.waitForTimeout(1150);await page.click('#sourcesLookup');await page.waitForFunction(()=>document.getElementById('sourcesCancel').disabled===false);await page.waitForTimeout(100);await page.click('#sourcesCancel');release?.();held=false;assert.equal(await page.isVisible('#sourcesReview'),false);
  for(const scheme of ['light','dark']){await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width:390,height:844});await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const bad=await page.evaluate(async()=>(await axe.run(document.getElementById('connectedSources'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(bad,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);console.log('PASS: explicit mocked weather lookup, scoped request inputs, review/provenance/missing values, source/live undo, idempotent save retry, stale insertion guard, cancellation, mobile light/dark accessibility and no journal uploads.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
