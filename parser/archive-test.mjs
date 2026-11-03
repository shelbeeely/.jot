import test from 'node:test';import assert from 'node:assert/strict';
import {pack,unpack,packedState,searchArchive,reconcileEntries,readArchiveHeader} from './container.mjs';
import {createLock,changePassphrase} from './lock.mjs';
const source='\uFEFF---\r\ntimezone: Europe/London\r\n---\r\n### 2026-11-01\r\n\r\nPublic #walk\r\n\r\n### 2026-11-01\r\n\r\nPRIVATE_UNIQUE_MARKER_5d838711e770 #secret\r\n';
const secret=(await createLock('archive-test-password',{iterations:100000,recoveryCode:true}));
const initial=await unpack(await pack({source}));
const mixed=await pack({source,entries:initial.entries,privateEntries:[initial.entries.at(-1).id],secret:secret.session,previous:initial,assets:[{path:'media/recording.wav',mediaType:'audio/wav',data:'PRIVATE_AUDIO_MARKER_96897888335'}]});
test('v1 preserves BOM, CRLF, repeated dates and separate stable identities',async()=>{
 const doc=await unpack(mixed,{secret:secret.session});try{assert.equal(doc.source,source);assert.equal(doc.entries.length,3);assert.equal(new Set(doc.entries.map(e=>e.id)).size,3);assert.equal(doc.archive.version,'1.0');assert.equal(doc.entries[1].date,doc.entries[2].date);assert.equal(doc.entries[1].createdAt,null);assert.equal(doc.indexError,null);}finally{doc.index?.close();}
});
test('every private payload, tag, source hash and asset metadata stays out of all readable ZIP members/index',async()=>{
 const zip=await globalThis.JSZip.loadAsync(mixed);for(const file of Object.values(zip.files)){const bytes=await file.async('uint8array'),text=new TextDecoder().decode(bytes);assert.doesNotMatch(text,/PRIVATE_UNIQUE_MARKER_5d838711e770|PRIVATE_AUDIO_MARKER_96897888335|#secret|recording\.wav/);}
 const header=readArchiveHeader(mixed);assert.match(header.entries.at(-1).path,/^private\//);assert.equal('timezone'in header.entries.at(-1),false);assert.equal(header.assets[0].encryption.cipher,'AES-256-GCM');
 const doc=await unpack(mixed);try{assert.equal(doc.partial,true);assert.equal(doc.assets.length,0);assert.doesNotMatch(doc.source,/PRIVATE_/);assert.equal(doc.indexError,null);assert.equal((await searchArchive(doc,{tag:'walk'})).length,1);assert.equal((await searchArchive(doc,{query:'PRIVATE_UNIQUE'})).length,0);await assert.rejects(pack({source:doc.source,previous:doc}));}finally{doc.index?.close();}
});
test('private search exists only after unlock; wrong secrets, substituted entry dates/order and ciphertext corruption fail',async()=>{
 await assert.rejects(unpack(mixed,{secret:'wrong-password'}));const doc=await unpack(mixed,{secret:secret.session});try{assert.equal((await searchArchive(doc,{tag:'secret'})).length,1);}finally{doc.index?.close();}
 for(const change of [(m)=>m.entries.reverse(),(m)=>m.entries.at(-1).date='2026-11-02']){
  const zip=await globalThis.JSZip.loadAsync(mixed),m=JSON.parse(await zip.file('manifest.json').async('string'));change(m);zip.file('manifest.json',JSON.stringify(m),{compression:'STORE'});await assert.rejects(unpack(await zip.generateAsync({type:'uint8array'}),{secret:secret.session}));
 }
 const zip=await globalThis.JSZip.loadAsync(mixed),m=readArchiveHeader(mixed),path=m.entries.at(-1).path;const b=await zip.file(path).async('uint8array');b[0]^=1;zip.file(path,b);await assert.rejects(unpack(await zip.generateAsync({type:'uint8array'}),{secret:secret.session}));
});
test('unchanged private entries retain ciphertext; public-to-private rebuilds a fresh index without deleted text',async()=>{
 const doc=await unpack(mixed,{secret:secret.session});const edited=source.replace('Public #walk','Public #walk changed');const newer=await pack({source:edited,entries:doc.entries,previous:doc,secret:secret.session});const zip1=await globalThis.JSZip.loadAsync(mixed),zip2=await globalThis.JSZip.loadAsync(newer),path=doc.archive.entries.at(-1).path;
 assert.deepEqual(await zip1.file(path).async('uint8array'),await zip2.file(path).async('uint8array'));doc.index?.close();
 const all=await pack({source,entries:initial.entries,privateEntries:'all',secret:secret.session,previous:initial,index:'always'});const zip=await globalThis.JSZip.loadAsync(all),db=await zip.file('index.sqlite').async('uint8array');assert.doesNotMatch(new TextDecoder().decode(db),/Public|walk|PRIVATE_UNIQUE/);
});
test('recovery and passphrase replacement retain member protection without re-encrypting unchanged entries',async()=>{
 const recovered=await unpack(mixed,{secret:{recoveryCode:secret.recoveryCode}});recovered.index?.close();const session=await changePassphrase(secret.session,'archive-test-password','new-archive-password',{iterations:100000});const doc=await unpack(mixed,{secret:secret.session});const bytes=await pack({source:doc.source,entries:doc.entries,assets:doc.assets,secret:session,previous:doc});doc.index?.close();await assert.rejects(unpack(bytes,{secret:'archive-test-password'}));const opened=await unpack(bytes,{secret:'new-archive-password'});assert.equal(opened.source,source);opened.index?.close();
});
test('date/tag/metric search works, stale SQLite safely falls back, and loaded indexes are read-only',async()=>{
 const text='### 2026-11-01\n\n:::record measurement\nmetric: mood\nvalue: 3\nunit: /5\n:::\n#calm';const bytes=await pack({source:text}),doc=await unpack(bytes);try{assert.equal((await searchArchive(doc,{metric:'mood',min:2,max:4})).length,1);assert.equal((await searchArchive(doc,{metric:'mood',min:4})).length,0);assert.equal((await searchArchive(doc,{from:'2026-11-02'})).length,0);doc.index?.close();doc.index=null;doc.indexError='test fallback';assert.equal((await searchArchive(doc,{tag:'calm',metric:'mood',min:2})).length,1);}finally{doc.index?.close();}
 assert.ok(packedState(bytes));const entries=reconcileEntries(text,packedState(bytes).entries);assert.equal(entries[0].id,packedState(bytes).entries[0].id);
});
test.after(()=>initial.index?.close());

test('missing/corrupt cache payloads retain verified source and source-search filters',async()=>{
 const source='### 2026-11-01\n\nA calm day. #calm\n\n:::record measurement\nmetric: mood\nvalue: 3\n:::\n';const bytes=await pack({source,index:'always'});
 for(const change of [zip=>zip.remove('index.sqlite'),zip=>zip.file('index.sqlite','broken')]){
  const zip=await globalThis.JSZip.loadAsync(bytes);change(zip);const doc=await unpack(await zip.generateAsync({type:'uint8array'}));assert.equal(doc.source,source);assert.ok(doc.indexError);assert.equal((await searchArchive(doc,{tag:'calm',metric:'mood',min:2,max:4})).length,1);assert.equal((await searchArchive(doc,{metric:'mood',min:4})).length,0);
 }
});
test('private entry source is framed data, not limited by the 64 KiB metadata header',async()=>{
 const source='A long private entry. '.repeat(5000),bytes=await pack({source,secret:secret.session,privateEntries:'all'}),doc=await unpack(bytes,{secret:secret.session});try{assert.equal(doc.source,source);assert.equal(doc.indexError,null);}finally{doc.index?.close();}
});
test('an externally supplied index is rebuilt before export so unreachable bytes cannot survive',async()=>{
 const bytes=await pack({source:'Public only.',index:'always'}),zip=await globalThis.JSZip.loadAsync(bytes),manifest=readArchiveHeader(bytes),original=await zip.file('index.sqlite').async('uint8array'),marker=new TextEncoder().encode('OLD_PRIVATE_UNUSED_PAGE_834788ec'),changed=new Uint8Array(original.length+marker.length);changed.set(original);changed.set(marker,original.length);zip.file('index.sqlite',changed);manifest.index.byteLength=changed.length;manifest.index.sha256=await(await import('./container.mjs')).sha256(changed);zip.file('manifest.json',JSON.stringify(manifest),{compression:'STORE'});
 const doc=await unpack(await zip.generateAsync({type:'uint8array'}));const safe=await pack({source:doc.source,entries:doc.entries,previous:doc,index:'always'});doc.index?.close();const clean=await globalThis.JSZip.loadAsync(safe);assert.doesNotMatch(await clean.file('index.sqlite').async('string'),/OLD_PRIVATE_UNUSED_PAGE/);
});

test('a fully protected journal can grow past a few hundred entries, and a public one reaches the 10,000-entry limit',async()=>{
 const journal=n=>{let s='';const d=Date.UTC(2000,0,1);for(let i=0;i<n;i++)s+='### '+new Date(d+i*86400000).toISOString().slice(0,10)+'\n\nA day.\n\n';return s;};
 // The encrypted catalog lists every entry; it used to be capped at 64 KiB, so saving failed at roughly 300 entries.
 const protectedSource=journal(1200),bytes=await pack({source:protectedSource,secret:secret.session,privateEntries:'all',now:'2026-11-03T10:00:00.000Z'});
 const opened=await unpack(bytes,{secret:secret.session});try{assert.equal(opened.source,protectedSource);assert.equal(opened.entries.length,1200);}finally{opened.index?.close();}
 // The manifest describes every entry; at 4 MiB it overflowed below 10,000.
 const big=journal(10000),large=await unpack(await pack({source:big,now:'2026-11-03T10:00:00.000Z'}));try{assert.equal(large.entries.length,10000);assert.equal(large.source,big);}finally{large.index?.close();}
});
