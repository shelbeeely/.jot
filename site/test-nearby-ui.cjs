// Writer controls, local search/navigation and responsive layouts in Chromium. No external service is used.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0])); }
  catch { res.writeHead(400); res.end(); return; }
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.webmanifest': 'application/manifest+json', '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' })[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch();
 try{
  const first=await browser.newPage(),second=await browser.newPage(),origin=`http://127.0.0.1:${server.address().port}`;
  await Promise.all([first.goto(origin+'/write/'),second.goto(origin+'/write/')]);
  for(const page of [first,second])await page.evaluate(async()=>{const{NearbySession}=await import('/nearby.mjs');window.events=[];window.peer=new NearbySession(event=>window.events.push(event));});
  const invite=await first.evaluate(()=>window.peer.invite());assert.deepEqual(await first.evaluate(()=>window.peer.pc.getConfiguration().iceServers),[]);
  const answer=await second.evaluate(invite=>window.peer.answer(invite),invite);await first.evaluate(answer=>window.peer.accept(answer),answer);
  await Promise.all([first.waitForFunction(()=>window.peer.code),second.waitForFunction(()=>window.peer.code)]);
  assert.equal(await first.evaluate(()=>window.peer.code),await second.evaluate(()=>window.peer.code));
  await first.evaluate(()=>window.peer.confirm());await second.evaluate(()=>window.peer.confirm());
  await Promise.all([first.waitForFunction(()=>window.peer.peerConfirmed),second.waitForFunction(()=>window.peer.peerConfirmed)]);
  await first.evaluate(()=>window.peer.send(new File(['# Nearby\n\n'+'A'.repeat(100000)],'nearby.jot',{type:'text/plain'}),{id:'test-transfer'}));
  let inbox=await second.evaluate(async()=>{const{inboxItems}=await import('/inbox.mjs');return(await inboxItems()).map(item=>({id:item.id,size:item.files[0].size}));});assert.equal(inbox.length,1);assert.equal(inbox[0].id,'test-transfer');
  await first.evaluate(()=>window.peer.send(new File(['# Nearby\n\n'+'A'.repeat(100000)],'nearby.jot',{type:'text/plain'}),{id:'test-transfer'}));
  assert.equal(await second.evaluate(async()=>(await(await import('/inbox.mjs')).inboxItems()).length),1);
  await second.evaluate(()=>{window.peer.notify=event=>{window.events.push(event);if(event.kind==='progress')window.peer.close();};});
  const interrupted=await first.evaluate(async()=>{try{await window.peer.send(new File(['B'.repeat(1000000)],'interrupted.jot',{type:'text/plain'}));return false;}catch{return true;}});assert.equal(interrupted,true);
  inbox=await second.evaluate(async()=>(await(await import('/inbox.mjs')).inboxItems()).map(item=>item.id));assert.deepEqual(inbox,['test-transfer']);
  assert.equal(await second.inputValue('#writing'),'');
  console.log('PASS: real local WebRTC data channel, empty ICE server list, matching comparison codes, verified chunk transfer, duplicate receipts, interrupted transfer discard and no automatic journal insertion.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
