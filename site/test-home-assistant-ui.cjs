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
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[],requests=[];let historyEmpty=false,hold=false,release;
  const secret='test-ha-session-credential';
  const row=(entity,patch={})=>({entity_id:entity,state:entity==='sensor.temperature'?'21.4':'unavailable',attributes:{friendly_name:'Chosen entity',unit_of_measurement:'C',private_note:'do not copy this attribute'},last_updated:'2026-10-01T10:00:00Z',last_changed:'2026-10-01T09:00:00Z',...patch});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://ha.example.test/**',async route=>{
   const req=route.request(),url=new URL(req.url());requests.push({url:req.url(),method:req.method(),headers:req.headers(),body:req.postData()});
   if(hold)await new Promise(resolve=>{release=resolve;});
   const history=url.pathname.includes('/history/');const entity=history?url.searchParams.get('filter_entity_id'):url.pathname.split('/').pop();
   await route.fulfill({contentType:'application/json',body:JSON.stringify(history?(historyEmpty?[]:[[row(entity,{last_updated:'2026-10-01T09:00:00Z'}),row(entity)]]):row(entity))}).catch(()=>{});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/write/`);await require('./test-source-workspace.cjs')(page);
  const original='Private journal prose.\n';await page.fill('#writing',original);await page.locator('#writing').evaluate(e=>e.setSelectionRange(e.value.length,e.value.length));
  const open=async()=>{await page.click('#writerSourcesBtn');await page.selectOption('#sourcesProvider','home-assistant');};
  const fields=async()=>{await page.fill('#sourcesInstance','https://ha.example.test');await page.fill('#sourcesToken',secret);await page.fill('#sourcesEntities','sensor.temperature\nsensor.unavailable');};
  await open();await fields();assert.equal(requests.length,0);assert.equal(await page.isVisible('#sourcesWeather'),false);assert.equal(await page.isVisible('#sourcesHistory'),false);
  await page.click('#sourcesLookup');await page.waitForSelector('#sourcesReview:not([hidden])');const source=await page.textContent('#sourcesPreview');assert.match(source,/value: 21.4/);assert.match(source,/missing: true/);assert.match(source,/data-kind: reported/);assert.doesNotMatch(source,/private_note|do not copy|test-ha-session-credential/);assert.equal(await page.inputValue('#writing'),original);
  assert.deepEqual(requests.map(r=>new URL(r.url).pathname),['/api/states/sensor.temperature','/api/states/sensor.unavailable']);
  for(const request of requests){assert.equal(request.method,'GET');assert.equal(request.headers.authorization,'Bearer '+secret);assert.equal(request.body,null);assert.doesNotMatch(request.url,/Private|credential|services|events|websocket/);}
  await page.click('#sourcesInsert');await page.waitForFunction(()=>!document.getElementById('connectedSources').open);assert.equal(await page.inputValue('#sourcesToken'),'');assert.match(await page.inputValue('#writing'),/source-entity: sensor.temperature/);
  await page.locator('#writing').focus();await page.keyboard.press('Control+z');assert.equal(await page.inputValue('#writing'),original);
  await open();await fields();await page.fill('#sourcesInstance','https://other.example.test');assert.equal(await page.inputValue('#sourcesToken'),'');await page.fill('#sourcesInstance','https://ha.example.test');await page.fill('#sourcesToken',secret);
  await page.selectOption('#sourcesMode','history');assert.equal(await page.isVisible('#sourcesHistory'),true);await page.fill('#sourcesStart','2026-10-01T09:30:00Z');await page.fill('#sourcesEnd','2026-10-01T11:00:00Z');await page.waitForTimeout(1150);await page.click('#sourcesLookup');await page.waitForSelector('#sourcesReview:not([hidden])');assert.match(await page.textContent('#sourcesPreview'),/boundary-state: true/);assert.match(await page.textContent('#sourcesPreview'),/interval-start: 2026-10-01T09:30:00Z/);assert.equal(requests.filter(r=>r.url.includes('/api/states/')).length,2);
  const storage=await page.evaluate(()=>Object.values(localStorage).join(' ')+Object.values(sessionStorage).join(' '));assert.doesNotMatch(storage,/test-ha-session-credential|do not copy this attribute/);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('connectedSources').open);assert.equal(await page.inputValue('#sourcesToken'),'');
  historyEmpty=true;await open();await fields();await page.selectOption('#sourcesMode','history');await page.fill('#sourcesStart','2026-10-01T09:30:00Z');await page.fill('#sourcesEnd','2026-10-01T11:00:00Z');await page.waitForTimeout(1150);await page.click('#sourcesLookup');await page.waitForSelector('#sourcesReview:not([hidden])');assert.match(await page.textContent('#sourcesPreview'),/availability: no-history/);assert.doesNotMatch(await page.textContent('#sourcesPreview'),/\nvalue:/);
  for(const scheme of ['light','dark']){await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width:390,height:844});await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const bad=await page.evaluate(async()=>(await axe.run(document.getElementById('connectedSources'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(bad,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.click('#sourcesClose');await open();await fields();await page.selectOption('#sourcesMode','current');hold=true;await page.waitForTimeout(1150);const pending=page.waitForRequest('https://ha.example.test/api/states/sensor.temperature');await page.click('#sourcesLookup');await pending;await page.click('#sourcesClose');release?.();hold=false;assert.equal(await page.inputValue('#sourcesToken'),'');assert.equal(await page.isVisible('#sourcesReview'),false);
  assert.deepEqual(errors,[]);assert.equal(await page.inputValue('#writing'),original);console.log('PASS: selected read-only Home Assistant GETs, session-only token clearing, reviewed current/history/missing states, boundary timestamps, source undo, host-change credential isolation, cancellation and mobile light/dark accessibility.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
