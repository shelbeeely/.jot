import {test} from 'node:test';import assert from 'node:assert/strict';import {pack,unpack,readDocument,sha256,safePath} from './container.mjs';
import {localSha256} from './vendor/sha256.mjs';
test('self-contained Jot round trip preserves Unicode text and exact asset bytes',async()=>{const source='### 2026-10-25\n\nA note 🌙\r\n\n![Drawing](assets/drawing.png)\n';const data=new Uint8Array([0,1,2,253,254,255]);const bytes=await pack({source,assets:[{path:'assets/drawing.png',mediaType:'image/png',data},{path:'assets/ink.jot-ink.json',mediaType:'application/json',data:'{"strokes":[]}'}]});assert.equal(bytes[0],80);const doc=await unpack(bytes);assert.equal(doc.source,source);assert.deepEqual(doc.assets[0].data,data);assert.equal(doc.manifest.version,'1.0');assert.equal((await readDocument(bytes)).packaged,true);});
test('text-only packages and standalone plain-text imports work',async()=>{const bytes=await pack({source:'A quiet day.\n'});assert.equal((await unpack(bytes)).source,'A quiet day.\n');assert.equal((await readDocument('A quiet day.\n')).packaged,false);});
test('unsafe, duplicate and out-of-root assets are rejected',async()=>{for(const p of ['../secret','/etc/passwd','assets/../x','assets\\x','assets//x','assets/C:x'])assert.equal(safePath(p),false,p);await assert.rejects(pack({source:'',assets:[{path:'../x',data:'a'}]}));await assert.rejects(pack({source:'',assets:[{path:'assets/x',data:'a'},{path:'assets/x',data:'b'}]}));});
test('hashes, missing members and extra archive members are checked',async()=>{const bytes=await pack({source:'Original',assets:[{path:'assets/a',data:'one'}]});const zip=await globalThis.JSZip.loadAsync(bytes);zip.file((await unpack(bytes)).manifest.assets[0].path,'two',{createFolders:false});await assert.rejects(unpack(await zip.generateAsync({type:'uint8array'})),/integrity/);const zip2=await globalThis.JSZip.loadAsync(bytes);zip2.remove((await unpack(bytes)).manifest.assets[0].path);await assert.rejects(unpack(await zip2.generateAsync({type:'uint8array'})),/Missing/);const zip3=await globalThis.JSZip.loadAsync(bytes);zip3.file('extra','unexpected');await assert.rejects(unpack(await zip3.generateAsync({type:'uint8array'})),/unlisted/);});
test('known SHA-256 vector',async()=>{assert.equal(await sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');});
test('local SHA-256 fallback matches Web Crypto on padding boundaries',async()=>{for(const n of [0,1,55,56,63,64,65,1000,100000]){const bytes=Uint8Array.from({length:n},(_,i)=>(i*17+3)%256);assert.equal(localSha256(bytes),await sha256(bytes));}});
test('ordinary empty media directory records are accepted',async()=>{const bytes=await pack({source:'Text',assets:[{path:'assets/a',data:'one'}]});const zip=await globalThis.JSZip.loadAsync(bytes);zip.folder('media');assert.equal((await unpack(await zip.generateAsync({type:'uint8array'}))).assets.length,1);});

test('ordinary text beginning with PK is not mistaken for a ZIP signature',async()=>{assert.equal((await readDocument('PK observations.')).source,'PK observations.');});

async function changedManifest(bytes,change){const zip=await globalThis.JSZip.loadAsync(bytes),manifest=JSON.parse(await zip.file('manifest.json').async('string'));change(manifest);zip.file('manifest.json',JSON.stringify(manifest),{compression:'STORE'});return zip.generateAsync({type:'uint8array'});}
test('unsupported manifest or catalog features are refused rather than discarded on a later save',async()=>{
 const bytes=await pack({source:'Keep exact source.',assets:[{path:'media/a',data:'original'}]});
 for(const change of [m=>m.requiredFeatures=['future-layout'],m=>m.catalogData.futureLayout={keep:true},m=>m.catalogData.entries[0].futureField='keep',m=>m.catalogData.assets[0].futureField='keep']){
  await assert.rejects(unpack(await changedManifest(bytes,change)),/Unsupported|Invalid ordered/);
 }
});
test('catalog identity/order and public/protected catalog boundaries are validated before opening',async()=>{
 const bytes=await pack({source:'### 2026-11-01\nFirst\n### 2026-11-01\nSecond',assets:[{path:'media/a',data:'a'}],index:'always'});
 for(const change of [m=>m.catalogData.entries.reverse(),m=>m.catalogData.assets=[],m=>m.catalogData.entries[0].private=true,m=>m.catalogData.entries.push({...m.catalogData.entries[0]}),m=>m.catalog={...m.entries[0]},m=>m.index.encryption={cipher:'future'}]){
  await assert.rejects(unpack(await changedManifest(bytes,change)),/catalog|encryption|index/i);
 }
});
test('an omitted optional index descriptor and payload retain local source search and can be saved again',async()=>{
 const source='### 2026-11-01\n\nAn offline #walk.',bytes=await pack({source,index:'always'}),withoutDescriptor=await changedManifest(bytes,m=>delete m.index),zip=await globalThis.JSZip.loadAsync(withoutDescriptor);zip.remove('index.sqlite');
 const doc=await unpack(await zip.generateAsync({type:'uint8array'}));assert.equal(doc.source,source);assert.equal(doc.index,null);assert.equal(doc.indexError,null,'no descriptor means the writer chose source search');assert.equal((await(await import('./container.mjs')).searchArchive(doc,{tag:'walk'})).length,1);
 const saved=await unpack(await pack({source:doc.source,entries:doc.entries,assets:doc.assets,previous:doc,index:'always'}));try{assert.equal(saved.source,source);assert.equal(saved.indexError,null);assert.ok(saved.index);}finally{saved.index?.close();}
});
test('duplicate member identities are rejected before producing an archive',async()=>{
 const id=crypto.randomUUID();await assert.rejects(pack({source:'Original',assets:[{id,path:'media/a',data:'a'},{id,path:'media/b',data:'b'}]}),/Duplicate archive member/);
});
test('custom document metadata remains lossless within the supported metadata object',async()=>{
 const metadata={custom:{layout:{label:'Keep 🌙',items:[1,null,'two']}},extra:'preserve'},doc=await unpack(await pack({source:'Plain source with an unknown :::literal.',metadata}));
 try{const saved=await unpack(await pack({source:doc.source,assets:doc.assets,metadata:doc.metadata,entries:doc.entries,previous:doc}));try{assert.deepEqual(saved.metadata,metadata);assert.equal(saved.source,doc.source);}finally{saved.index?.close();}}finally{doc.index?.close();}
});

test('versioned archive conformance fixtures reject unsupported features and inconsistent privacy',async()=>{
 const {readFileSync}=await import('node:fs'),fixtures=JSON.parse(readFileSync(new URL('./archive-conformance.json',import.meta.url),'utf8')).cases,bytes=await pack({source:'Exact source.',assets:[{path:'media/a',data:'original'}]});
 for(const fixture of fixtures){const changed=await changedManifest(bytes,manifest=>{for(const change of fixture.changes){let parent=manifest;for(const key of change.path.slice(0,-1))parent=parent[key];parent[change.path.at(-1)]=change.value;}});await assert.rejects(unpack(changed),new RegExp(fixture.expectedError),fixture.id);}
});

test('small archives omit the search index; larger public source or an explicit request includes it',async()=>{
 const {INDEX_MIN_SOURCE_BYTES,searchArchive,readArchiveHeader}=await import('./container.mjs'),enc=text=>new TextEncoder().encode(text).length;
 const small='### 2026-11-01\n\nA short walk. #outside\n',smallBytes=await pack({source:small}),smallZip=await globalThis.JSZip.loadAsync(smallBytes);
 assert.equal(readArchiveHeader(smallBytes).index,undefined);assert.equal(smallZip.file('index.sqlite'),null);
 const doc=await unpack(smallBytes);assert.equal(doc.index,null);assert.equal(doc.indexError,null);assert.equal((await searchArchive(doc,{tag:'outside'})).length,1);
 assert.ok(smallBytes.length<4096,'a two-line journal stays a few KiB, not ~100 KiB');
 const day=(n,text)=>'### 2026-'+String(1+Math.floor(n/28)).padStart(2,'0')+'-'+String(1+n%28).padStart(2,'0')+'\n\n'+text+'\n\n';
 let large='';for(let n=0;enc(large)<INDEX_MIN_SOURCE_BYTES;n++)large+=day(n%300,'A long day of writing about the garden. #garden '.repeat(40));
 const largeBytes=await pack({source:large}),header=readArchiveHeader(largeBytes);assert.equal(header.index.kind,'index');
 const opened=await unpack(largeBytes);try{assert.ok(opened.index);assert.equal(opened.indexError,null);assert.ok((await searchArchive(opened,{tag:'garden'})).length>0);}finally{opened.index?.close();}
 assert.equal(readArchiveHeader(await pack({source:large,index:'never'})).index,undefined);
 assert.equal(readArchiveHeader(await pack({source:small,index:'always'})).index.kind,'index');
 await assert.rejects(pack({source:small,index:'sometimes'}),/Index mode/);
 // A listed index whose payload is gone is still reported, and source search still works.
 const listed=await pack({source:small,index:'always'}),zip=await globalThis.JSZip.loadAsync(listed);zip.remove('index.sqlite');
 const missing=await unpack(await zip.generateAsync({type:'uint8array'}));assert.ok(missing.indexError);assert.equal((await searchArchive(missing,{tag:'outside'})).length,1);
});


test('text search gives the same results with or without an index: case- and accent-insensitive substrings',async()=>{
 const {searchArchive}=await import('./container.mjs');
 const source='### 2026-11-01\n\nWe went walking by the café. #walk\n\n### 2026-11-02\n\nA quiet day.\n';
 const results=[];
 for(const index of ['always','never']){const doc=await unpack(await pack({source,index}));try{const row=[];for(const query of ['walk','WALKING','alk','cafe','café','quiet','nothing here'])row.push((await searchArchive(doc,{query})).length);row.push((await searchArchive(doc,{tag:'walk',query:'CAFE'})).length);results.push(row);}finally{doc.index?.close();}}
 assert.deepEqual(results[0],results[1]);assert.deepEqual(results[0],[1,1,1,1,1,1,0,1]);
});
