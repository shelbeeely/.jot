/** Jotz v2: ordered entries, protected media and a rebuildable public SQLite/FTS5 index. */
import './vendor/jszip.mjs';
import {parse} from './jot.mjs';
import {LIMITS,safePath,dataBytes,sha256} from './archive-common.mjs';
import {directory,readBounded} from './archive-zip.mjs';
import {reconcileEntries,uuid} from './archive-entries.mjs';
import {buildIndex,openIndex} from './archive-index.mjs';
import {createLock,isSession,openKeys,sealMember,openMember,validateKeys} from './archive-crypto.mjs';
export {LIMITS,safePath,sha256,reconcileEntries};
const JSZip=globalThis.JSZip,enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
const check=(ok,message)=>{if(!ok)throw Error(message);};
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH=/^[0-9a-f]{64}$/;
const caches=new WeakMap(),states=new WeakMap(),indexOwners=new WeakSet();
export const packedState=bytes=>states.get(bytes)||null;
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const aad=(archive,item)=>JSON.stringify(['JOTZ',2,archive,item.kind,item.id,item.revision,item.date??null]);
const clone=value=>JSON.parse(JSON.stringify(value));
const memberPath=(kind,id,privateValue)=>privateValue?`private/${id}.enc`:kind==='entry'?`entries/${id}.jot`:`media/${id}`;
function descriptor(item) {
  check(item&&ID.test(item.id)&&['entry','asset','catalog','index'].includes(item.kind)&&safePath(item.path),'Invalid archive member identity.');
  check(Number.isInteger(item.revision)&&item.revision>=1&&item.revision<=1000000000,'Invalid member revision.');
  check(Number.isSafeInteger(item.byteLength)&&item.byteLength>=0&&item.byteLength<=LIMITS.assetBytes+65536&&HASH.test(item.sha256),'Invalid member size or digest.');
  check(item.date===null||item.date===undefined||/^\d{4}-\d{2}-\d{2}$/.test(item.date),'Invalid logical entry date.');
  const expected=memberPath(item.kind,item.id,!!item.encryption);
  check(item.kind==='index'?item.path==='index.sqlite':item.path===expected,'Unexpected member path.');
  check(Object.keys(item).every(key=>['id','kind','revision','date','path','byteLength','sha256','encryption','generation','timezone','createdAt','updatedAt'].includes(key)),'Unexpected public member metadata.');
  if(item.encryption)check(!['timezone','createdAt','updatedAt'].some(k=>k in item),'Protected member metadata must be encrypted.');
  if(item.kind==='index')check(HASH.test(item.generation),'Invalid index generation.');
}
/** The first ZIP member MUST be a bounded, uncompressed manifest. This is a capability hint, not authentication. */
export function readArchiveHeader(input) {
  const b=input instanceof Uint8Array?input:new Uint8Array(input);check(b.length>=30,'Not a Jotz v2 archive.');
  const v=new DataView(b.buffer,b.byteOffset,b.byteLength);check(v.getUint32(0,true)===0x04034b50&&v.getUint16(8,true)===0&&!(v.getUint16(6,true)&9),'The first ZIP member must be the stored manifest.');
  const size=v.getUint32(18,true),nameLength=v.getUint16(26,true),extra=v.getUint16(28,true),at=30+nameLength+extra;
  check(size<=LIMITS.manifestBytes&&at+size<=b.length&&dec.decode(b.subarray(30,30+nameLength))==='manifest.json','Missing bounded archive manifest.');
  const m=JSON.parse(dec.decode(b.subarray(at,at+size)));check(m?.format==='jot'&&m.version==='2.0'&&ID.test(m.id),'Unsupported Jotz version.');return m;
}
const frame=(metadata,bytes=new Uint8Array())=>{const h=enc.encode(JSON.stringify(metadata));check(h.length<=65536,'Member metadata is too large.');const out=new Uint8Array(4+h.length+bytes.length);new DataView(out.buffer).setUint32(0,h.length);out.set(h,4);out.set(bytes,4+h.length);return out;};
function unframe(bytes){check(bytes.length>=4,'Truncated member.');const n=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0);check(n<=65536&&n+4<=bytes.length,'Invalid member metadata.');return {metadata:JSON.parse(dec.decode(bytes.subarray(4,4+n))),data:bytes.slice(4+n)};}
export async function pack({source,assets=[],metadata={},entries=null,previous=null,secret=null,privateEntries=null,id=null,now=null}={}) {
  check(!previous?.partial,'Unlock every protected entry before rewriting this archive.');
  check(metadata&&typeof metadata==='object'&&!Array.isArray(metadata),'Document metadata must be an object.');
  check(typeof source==='string','Journal source must be text.');check(Array.isArray(assets)&&assets.length<=1000,'Too many assets.');
  const old=previous?.archive||previous,archiveId=id||old?.id||uuid();check(ID.test(archiveId),'Invalid archive identity.');
  const logical=reconcileEntries(source,entries||previous?.entries||[],{privateByDefault:!!secret,now});
  if(privateEntries==='all')logical.forEach(e=>e.private=true);
  else if(Array.isArray(privateEntries))logical.forEach(e=>e.private=privateEntries.includes(e.id));
  check(!logical.some(e=>e.private)||secret,'Private entries require an unlocked session or passphrase.');
  const session=secret?(isSession(secret)?secret:(await createLock(secret)).session):null;
  const cache=previous&&caches.get(previous),saved=new Map(),files=new Map(),members=[];
  async function put(kind,memberId,revision,date,plain,protect,extra={}) {
    const hash=await sha256(plain),cacheKey=kind+':'+memberId,prior=cache?.get(cacheKey);
    if(prior&&prior.hash===hash&&prior.protect===protect&&prior.archiveId===archiveId&&prior.key===session?.contentKey&&prior.item.date===date&&prior.item.revision===revision){files.set(prior.item.path,prior.bytes);members.push(prior.item);saved.set(cacheKey,prior);return prior.item;}
    const item={id:memberId,kind,revision,date,path:memberPath(kind,memberId,protect),...extra};let bytes=plain;
    if(protect){const sealed=await sealMember(plain,session,aad(archiveId,item));bytes=sealed.bytes;item.encryption=sealed.encryption;}
    Object.assign(item,{byteLength:bytes.length,sha256:await sha256(bytes)});descriptor(item);files.set(item.path,bytes);members.push(item);saved.set(cacheKey,{hash,protect,archiveId,key:session?.contentKey,item,bytes});return item;
  }
  for(const entry of logical){
    const value=entry.private?frame({timezone:entry.timezone,createdAt:entry.createdAt,updatedAt:entry.updatedAt},enc.encode(entry.source)):enc.encode(entry.source);
    await put('entry',entry.id,entry.revision,entry.date,value,entry.private,entry.private?{}:{timezone:entry.timezone,createdAt:entry.createdAt,updatedAt:entry.updatedAt});
  }
  const assetMetadata=[],materializedAssets=[],paths=new Set();
  for(const asset of assets){
    check(safePath(asset.path)&&/^(assets|media)\//.test(asset.path)&&!paths.has(asset.path),'Unsafe or duplicate asset path.');paths.add(asset.path);
    const bytes=await dataBytes(asset.data);check(bytes.length<=LIMITS.assetBytes,'An asset exceeds 32 MiB.');
    const oldAsset=previous?.assets?.find(a=>a.path===asset.path),assetId=asset.id||oldAsset?.id||uuid();check(ID.test(assetId),'Invalid asset UUID.');
    const info={path:asset.path,mediaType:asset.mediaType||'application/octet-stream',...(typeof asset.name==='string'?{name:asset.name.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,240)}:{})};check(typeof info.mediaType==='string'&&info.mediaType.length<160&&!/[\r\n]/.test(info.mediaType),'Invalid asset media type.');
    const revision=oldAsset?(oldAsset.revision||1)+(await sha256(oldAsset.data)!==await sha256(bytes)||oldAsset.name!==info.name?1:0):1;
    const item=await put('asset',assetId,revision,null,session?frame(info,bytes):bytes,!!session);
    assetMetadata.push({id:assetId,revision,...info});materializedAssets.push({id:assetId,revision,...info,data:bytes});check(item.byteLength<=LIMITS.assetBytes+65536,'Encrypted asset exceeds the size limit.');
  }
  const publicEntries=await Promise.all(logical.filter(e=>!e.private).map(async e=>({...e,hash:await sha256(e.source)})));
  const generation=await sha256(JSON.stringify(publicEntries.map(e=>[e.id,e.date,e.timezone,e.hash]))),indexBytes=indexOwners.has(previous)&&previous?.indexBytes&&old?.index?.generation===generation?previous.indexBytes:await buildIndex(publicEntries,generation);
  const index={id:old?.index?.id||uuid(),kind:'index',revision:1,date:null,path:'index.sqlite',byteLength:indexBytes.length,sha256:await sha256(indexBytes),generation};descriptor(index);files.set(index.path,indexBytes);
  const manifest={format:'jot',version:'2.0',id:archiveId,entries:members.filter(m=>m.kind==='entry'),assets:members.filter(m=>m.kind==='asset'),index};
  const catalog={entries:logical.map(entry=>Object.fromEntries(Object.entries(entry).filter(([key])=>key!=='source'))),assets:assetMetadata,metadata};
  if(session){
    manifest.keys=clone(validateKeys(session.keys));
    const binding=await sha256(canonical(manifest));catalog.binding=binding;
    manifest.catalog=await put('catalog',old?.catalog?.id||uuid(),(old?.catalog?.revision||0)+1,null,frame(catalog),true);
  }else manifest.catalogData=catalog;
  const text=enc.encode(JSON.stringify(manifest)+'\n');check(text.length<=LIMITS.manifestBytes,'Manifest exceeds 4 MiB.');
  const zip=new JSZip();zip.file('manifest.json',text,{createFolders:false,compression:'STORE',date:new Date('2000-01-01T00:00:00Z')});let total=text.length;
  for(const [path,bytes] of files){total+=bytes.length;check(total<=LIMITS.totalBytes,'Expanded archive exceeds 64 MiB.');zip.file(path,bytes,{createFolders:false,compression:path==='index.sqlite'?'STORE':'DEFLATE',date:new Date('2000-01-01T00:00:00Z')});}
  const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});check(bytes.length<=LIMITS.packageBytes,'Archive exceeds 64 MiB.');
  const hashes=new Map(publicEntries.map(e=>[e.id,e.hash]));
  const state={source,archive:manifest,manifest,entries:logical.map(e=>({...e,...(hashes.has(e.id)?{hash:hashes.get(e.id)}:{})})),assets:materializedAssets,metadata,session,partial:false,protected:!!session,indexBytes,index:null};
  caches.set(bytes,saved);caches.set(state,saved);states.set(bytes,state);indexOwners.add(state);return bytes;
}
export async function unpack(input,{secret=null}={}) {
  const bytes=await dataBytes(input),listing=directory(bytes),header=readArchiveHeader(bytes),byPath=new Map(listing.map(e=>[e.path,e]));
  check(listing.length<=LIMITS.entries&&Array.isArray(header.entries)&&header.entries.length<=10000&&Array.isArray(header.assets)&&header.assets.length<=1000,'Invalid entry/asset lists.');
  const zip=await JSZip.loadAsync(bytes,{checkCRC32:false,createFolders:false});
  const actualManifest=await readBounded(zip.file('manifest.json'),LIMITS.manifestBytes);check(JSON.stringify(JSON.parse(dec.decode(actualManifest)))===JSON.stringify(header),'Conflicting ZIP manifest.');
  const all=[...header.entries,...header.assets,header.index,...(header.catalog?[header.catalog]:[])],listed=new Set(['manifest.json']),ids=new Set(),saved=new Map();
  for(const item of all){descriptor(item);check(!listed.has(item.path)&&!ids.has(item.id),'Duplicate archive member.');listed.add(item.path);ids.add(item.id);check(item.kind==='index'||byPath.get(item.path)?.expanded===item.byteLength,'Missing member or size mismatch: '+item.path);}
  check(listing.every(e=>listed.has(e.path)),'Archive contains unlisted members.');
  check(header.entries.every(e=>e.kind==='entry')&&header.assets.every(e=>e.kind==='asset')&&header.index.kind==='index','Wrong member type.');
  const protectedArchive=!!header.keys;check(protectedArchive===!!header.catalog,'Missing protection catalog.');if(protectedArchive)validateKeys(header.keys);
  check(header.entries.every(e=>!e.encryption||protectedArchive)&&header.assets.every(e=>!!e.encryption===protectedArchive),'Inconsistent member protection.');
  const session=protectedArchive&&secret?await openKeys(header.keys,secret):null;
  async function get(item){const file=zip.file(item.path);check(file,'Missing member: '+item.path);const raw=await readBounded(file,item.byteLength);check(raw.length===item.byteLength&&await sha256(raw)===item.sha256,'Member integrity check failed: '+item.path);return raw;}
  async function extract(item){const raw=await get(item),plain=item.encryption?await openMember(raw,session,aad(header.id,item),item.encryption):raw;saved.set(item.kind+':'+item.id,{hash:await sha256(plain),protect:!!item.encryption,archiveId:header.id,key:session?.contentKey,item,bytes:raw});return plain;}
  let catalog=header.catalogData;
  if(session){check(header.catalog.kind==='catalog'&&!!header.catalog.encryption,'Invalid protection catalog.');catalog=unframe(await extract(header.catalog)).metadata;const bound={...header};delete bound.catalog;check(catalog.binding===await sha256(canonical(bound)),'Archive catalog authentication failed.');}
  else if(protectedArchive){await get(header.catalog);catalog=null;}
  check(catalog===null||catalog&&Array.isArray(catalog.entries)&&Array.isArray(catalog.assets)&&catalog.metadata&&typeof catalog.metadata==='object'&&!Array.isArray(catalog.metadata),'Missing archive metadata.');
  const entries=[];let sourceTotal=0;
  for(const item of header.entries){
    if(item.encryption&&!session){await get(item);entries.push({id:item.id,date:item.date,private:true,revision:item.revision,source:null});continue;}
    const plain=await extract(item),info=catalog?.entries.find(e=>e.id===item.id);let value;
    if(item.encryption){const framed=unframe(plain);value={...framed.metadata,source:dec.decode(framed.data)};}else value={source:dec.decode(plain),timezone:item.timezone||info?.timezone||null,createdAt:item.createdAt||info?.createdAt||null,updatedAt:item.updatedAt||info?.updatedAt||null};
    check(typeof value.source==='string'&&enc.encode(value.source).length<=LIMITS.entryBytes,'Invalid entry source.');
    const dated=parse(value.source).nodes.filter(node=>node.type==='heading'&&node.date);check(item.date?dated.length===1&&dated[0].start===0&&dated[0].date===item.date:dated.length===0,'Entry source does not match its logical date boundary.');
    sourceTotal+=enc.encode(value.source).length;check(sourceTotal<=LIMITS.sourceBytes,'Journal source exceeds 32 MiB.');
    for(const time of [value.createdAt,value.updatedAt])check(time===null||typeof time==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(time)&&Number.isFinite(Date.parse(time)),'Invalid entry timestamp.');
    check(value.timezone===null||typeof value.timezone==='string'&&value.timezone.length<=100,'Invalid entry timezone.');
    entries.push({source:value.source,timezone:value.timezone,createdAt:value.createdAt,updatedAt:value.updatedAt,id:item.id,date:item.date,private:!!item.encryption,revision:item.revision,hash:await sha256(value.source)});
  }
  const assets=[];
  for(const item of header.assets){if(item.encryption&&!session){await get(item);continue;}const plain=await extract(item);const framed=item.encryption?unframe(plain):{metadata:catalog?.assets.find(a=>a.id===item.id),data:plain},info=framed.metadata;check(info&&safePath(info.path)&&/^(assets|media)\//.test(info.path)&&typeof info.mediaType==='string'&&info.mediaType.length<160&&!/[\r\n]/.test(info.mediaType)&&(info.name===undefined||typeof info.name==='string'&&info.name.length<=240),'Invalid asset metadata.');assets.push({id:item.id,revision:item.revision,path:info.path,mediaType:info.mediaType,...(info.name?{name:info.name}:{}),data:framed.data});}
  check(new Set(assets.map(a=>a.path)).size===assets.length,'Duplicate asset aliases.');
  const publicEntries=entries.filter(e=>!e.private),generation=await sha256(JSON.stringify(publicEntries.map(e=>[e.id,e.date,e.timezone,e.hash])));
  let index=null,indexBytes=null,indexError=null;
  try{indexBytes=await get(header.index);check(header.index.generation===generation,'Stale index generation.');index=await openIndex(indexBytes,publicEntries,generation);}catch(error){indexError=error.message;}
  const doc={source:entries.filter(e=>e.source!==null).map(e=>e.source).join(''),assets,entries,manifest:header,archive:header,metadata:catalog?.metadata||{},session,packaged:true,partial:protectedArchive&&!session,protected:protectedArchive,index,indexBytes,indexError};
  caches.set(doc,saved);return doc;
}
export async function readDocument(input,options={}) {
  const bytes=await dataBytes(input);if(bytes[0]===0x50&&bytes[1]===0x4b&&bytes[2]===3&&bytes[3]===4)return unpack(bytes,options);
  check(bytes.length<=LIMITS.sourceBytes,'Plain source exceeds 32 MiB.');const source=dec.decode(bytes);return {source,assets:[],entries:reconcileEntries(source),manifest:null,archive:null,metadata:{},session:null,packaged:false,partial:false,protected:false,index:null};
}
function sourceMatch(entry,criteria) {
  if(entry.source===null)return false;
  const {query='',tag='',from='',to='',metric='',min=null,max=null}=criteria;
  if(query&&!entry.source.toLocaleLowerCase().includes(query.toLocaleLowerCase()))return false;
  if(tag&&!(entry.source.match(/#[\p{L}\p{N}_-]+/gu)||[]).includes('#'+tag.replace(/^#/,'')))return false;
  if(from&&(!entry.date||entry.date<from)||to&&(!entry.date||entry.date>to))return false;
  if(metric){const values=parse(entry.source).nodes.filter(n=>n.type==='record'&&n.recordType==='measurement').map(n=>Object.fromEntries(n.fields.map(f=>[f.name,f.value]))).filter(f=>f.metric===metric&&f.value!==undefined&&f.value!==''&&f.missing!=='true').map(f=>Number(f.value)).filter(Number.isFinite);if(min===null&&max===null){if(!parse(entry.source).nodes.some(n=>n.type==='record'&&n.recordType==='measurement'&&n.fields.some(f=>f.name==='metric'&&f.value===metric)))return false;}else if(!values.some(value=>(min===null||value>=min)&&(max===null||value<=max)))return false;}
  return true;
}
export async function searchArchive(document,criteria={}) {
  for(const key of ['query','tag','from','to','metric'])if(criteria[key]!==undefined&&(typeof criteria[key]!=='string'||criteria[key].length>300))throw Error('Use bounded search terms.');
  for(const key of ['min','max'])if(criteria[key]!==undefined&&criteria[key]!==null&&!Number.isFinite(criteria[key]))throw Error('Invalid numeric search bound.');
  if(!document.index&&document.indexBytes&&!document.indexError)try{document.index=await openIndex(document.indexBytes,document.entries,document.archive.index.generation);}catch(error){document.indexError=error.message;}
  let publicMatches;
  try{publicMatches=document.index?document.index.search(criteria):document.entries.filter(e=>!e.private&&sourceMatch(e,criteria));}catch{document.index?.close();document.index=null;document.indexError='Search index unavailable; using source search.';publicMatches=document.entries.filter(e=>!e.private&&sourceMatch(e,criteria));}
  const ids=new Set(publicMatches.map(e=>e.id));return document.entries.filter(e=>e.private?sourceMatch(e,criteria):ids.has(e.id)).slice(0,100);
}
