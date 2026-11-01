import test from 'node:test';
import assert from 'node:assert/strict';
import { entriesOf, dependencies, excerptFile, appendCapture, mergedAssets, reviewCapture } from './dist/capture-core.mjs';
import { validatePair, NearbySession } from './dist/nearby.mjs';
import { validateInk, drawInk } from './dist/ink.mjs';
import { setupWakeLock } from './dist/browser-session.mjs';
const enc=new TextEncoder(),asset=(path,text='data')=>({path,mediaType:'application/octet-stream',data:enc.encode(text)});
test('entry selection preserves repeated dates and Unicode source boundaries',()=>{
 const source='A preface.\r\n\r\n### 2026-11-01\r\n🙂 One.\r\n\r\n### 2026-11-01\r\nTwo.';
 const entries=entriesOf(source);assert.equal(entries.length,2);assert.equal(source.slice(entries[0].start,entries[0].end),'### 2026-11-01\r\n🙂 One.\r\n\r\n');
});
test('selected exports include referenced attachments and ink background, not other writing or assets',async()=>{
 const source='![A](assets/a.png)\n\n[Strokes](assets/a.jot-ink.json)';
 const assets=[asset('assets/a.png'),asset('assets/a.jot-ink.json',JSON.stringify({background:'assets/background.png'})),asset('assets/background.png'),asset('assets/unselected.png')];
 assert.deepEqual(dependencies(source,assets).map(a=>a.path).sort(),['assets/a.jot-ink.json','assets/a.png','assets/background.png']);
 const file=await excerptFile(source,assets);assert.match(file.name,/\.jotz$/);assert.equal((await reviewCapture({id:'sample',text:'',files:[file]})).assets.length,3);
 assert.throws(()=>dependencies('![Missing](assets/no.png)',assets),/missing/);
 assert.deepEqual(dependencies('`![Private](assets/unselected.png)`',assets),[]);
});
test('captures reject duplicate record IDs, metadata insertion and structural-boundary edits',()=>{
 assert.throws(()=>appendCapture(':::record note #x\nbody: old\n:::\n',0,':::record note #x\nbody: new\n:::'),/ID/);
 assert.throws(()=>appendCapture('Writing.',8,'---\ntitle: other\n---\n\nWords.'),/metadata/);
 assert.throws(()=>appendCapture(':::record note\nbody: old\n:::\n',18,'New'),/structured/);
 const source='Old.';assert.equal(appendCapture(source,4,'New.').text,'\n\nNew.\n\n');
});
test('attachment collisions require equal bytes; package merges are bounded',async()=>{
 const a=asset('assets/file.png','one');assert.equal((await mergedAssets([a],[a])).length,1);await assert.rejects(mergedAssets([a],[asset(a.path,'two')]),/conflict/);await assert.rejects(mergedAssets([],[asset('../bad','x')]),/Unsafe/);
});
test('pairing accepts only bounded, unexpired local host candidates',()=>{
 const value={format:'jot-pair',version:1,role:'offer',session:'test-id',expiresAt:Date.now()+60000,description:{type:'offer',sdp:'a=fingerprint:sha-256 FF:AA\r\na=ice-ufrag:abc\r\na=ice-pwd:def\r\na=candidate:1 1 udp 123 192.168.0.2 5000 typ host\r\n'}};
 assert.equal(validatePair(value,'offer'),value);
 for(const sdp of [value.description.sdp.replace('192.168.0.2','8.8.8.8'),value.description.sdp.replace('typ host','typ relay')])assert.throws(()=>validatePair({...value,description:{type:'offer',sdp}},'offer'),/local host/);
 assert.throws(()=>validatePair({...value,expiresAt:0},'offer'),/expired/);assert.throws(()=>validatePair(value,'answer'));
});
test('transfer protocol rejects data before confirmation, oversized chunks and corrupt bytes',async()=>{
 const peer=new NearbySession();peer.expiresAt=Date.now()+60000;
 await assert.rejects(peer.receive(JSON.stringify({type:'manifest'})),/Confirm/);
 peer.confirmed=peer.peerConfirmed=true;
 await assert.rejects(peer.receive(new Uint8Array(32769).buffer),/Unexpected/);
 peer.transfer={id:'bad',bytes:1,received:1,sha256:'0'.repeat(64),name:'bad.jot',mediaType:'text/plain',parts:[new Uint8Array([1]).buffer]};
 await assert.rejects(peer.receive(JSON.stringify({type:'end',id:'bad'})),/integrity/);peer.close();
});
test('ink validation preserves optional background and rejects unsafe coordinates, paths and point counts',()=>{
 const value={format:'jot-ink',version:1,coordinates:'normalized',page:{widthMm:148,heightMm:210},background:'assets/background.png',strokes:[{tool:'pen',color:'#112233',widthMm:.4,points:[{x:.2,y:.3}]}]};
 assert.equal(validateInk(value),value);
 assert.throws(()=>validateInk({...value,background:'../secret'}),/Unsafe/);
 assert.throws(()=>validateInk({...value,strokes:[{...value.strokes[0],points:[{x:2,y:.3}]}]}),/point/);
 const calls=[],ctx=new Proxy({}, {get:(_,key)=>key==='clearRect'?()=>calls.push('clear'):()=>{},set:()=>true});drawInk({width:100,height:100,getContext:()=>ctx},value.strokes,148);assert.deepEqual(calls,['clear']);
});
test('wake lock is opt-in, releases on hiding and rejects a late lock after reset',async()=>{
 const doc=new EventTarget();doc.visibilityState='visible';let releaseCount=0,requests=0,resolve;
 const held=()=>Object.assign(new EventTarget(),{release:async()=>{releaseCount++;}});
 const nav={wakeLock:{request:async()=>{requests++;return held();}}};const wake=setupWakeLock({document:doc,navigator:nav});assert.equal(requests,0);await wake.enable(true);assert.equal(requests,1);
 doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));await Promise.resolve();assert.equal(releaseCount,1);
 const delayed=setupWakeLock({document:Object.assign(new EventTarget(),{visibilityState:'visible'}),navigator:{wakeLock:{request:()=>new Promise(yes=>{resolve=yes;})}}});const pending=delayed.enable(true);delayed.reset();resolve(held());await pending;assert.equal(releaseCount,2);
});
