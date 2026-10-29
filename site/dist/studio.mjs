import { setupMusicCapture } from './jot/music.mjs';
import { setupVoicePractice } from './jot/voice.mjs';

import { setupHealthImport } from './health-import.mjs';
import { referencePalettes } from './jot/palettes.mjs';
import {parse} from './jot/jot.mjs';
import {proofread} from './jot/proofread.mjs';
import {pack,readDocument} from './jot/container.mjs';
import * as Lock from './jot/lock.mjs';
import * as storage from './jot/storage.mjs';
import {renderPreview,addChartStyles} from './jot/preview.mjs';
import {pageGeometry,pageLayoutFromAst} from './jot/handwriting.mjs';
import {pageCSS} from './jot/styles.mjs';
import {exportHTML} from './jot/export.mjs';
import A from './jot/automation.mjs';
import {queryDiagnostics} from './jot/query.mjs';
import {isPaletteRecord,paletteOf,moodboardOf,paletteCSS,paletteJSON,contrast} from './jot/palette.mjs';
addChartStyles(document);
let assets=[],assetUrls=new Map(),assetKey='legacy-active',packageMetadata={},assetsReady=Promise.resolve();
// A locked journal (Jot Lock, ./jot/lock.mjs): lockKey is this visit's non-extractable key (the passphrase is not kept); lockWaiting holds
// the stored, still-locked copy until it is unlocked. While either is set, nothing about the journal is stored unencrypted.
let lockKey=null,lockWaiting=null,sealing=Promise.resolve();
const rasterTypes=new Set(['image/png','image/jpeg','image/webp','image/gif','image/avif']);
const freshKey=()=>globalThis.crypto?.randomUUID?.()||('journal-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const $=id=>document.getElementById(id),editor=$('writing');let ast,hints=[],dictionary=null,profiles=[],timer,dirty=false,resume=null;
const starter=`# October notebook

### 2026-10-25 | Sunday

.0830 - KITCHEN

The rain made the room feel quieter. I wanted to remember that.

#### A small plan

- [ ] Make something with my hands
- [ ] Leave a little space between things

#### Small good things

Someone remembered my favorite tea. That mattered.

> A small beginning is still a beginning.

#### What I noticed

The room was loud. Headphones helped more than pushing through.

### 2026-10-26 | Monday

Another day can stay in the same file. **No required template.**
`;
const status=(s,error=false)=>{$('journalNotice').textContent=s;$('journalNotice').classList.toggle('error',error);};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function download(content,name,type='text/plain'){const u=URL.createObjectURL(new Blob([content],{type})),a=el('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),15000);}
const fileName=()=>($('documentName').value.replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/^\.+/,'')||'my-journal').slice(0,100);
const handPrefs=(()=>{try{return JSON.parse(localStorage.getItem('jot-hand-v1'))||{};}catch{return {};}})();let handSeed=handPrefs.seed||1,geometry=null;
function paperMm(){const v=$('journalPaper').value;return ({A5:[148,210],A4:[210,297],Letter:[215.9,279.4],Pocket:[88.9,139.7]})[v]||[Number($('paperW').value),Number($('paperH').value)];}
const handOn=()=>$('look').value==='hand';
// Includes (![label](assets/week.jot#2026-10-25)): the page shows another journal carried in this .jotz, read from its attachments only
const includedText=p=>{if(!/\.jot$/i.test(p))return null;const a=assets.find(a=>a.path===p);if(!a||a.data.length>1024*1024)return null;try{return new TextDecoder('utf-8',{fatal:true}).decode(a.data instanceof Uint8Array?a.data:new Uint8Array(a.data));}catch{return null;}};
function preview(){const paper=$('paperPreview'),hand=handOn()?{hand:$('hand').value,ink:$('ink').value,pitchMm:Number($('pitch').value),dots:$('dotGrid').checked,seed:handSeed,pageRows:geometry?geometry.rows:0}:null;paper.style.width=hand&&geometry?geometry.width+'px':'';paper.style.boxSizing=hand?'content-box':'';paper.style.padding=hand&&geometry&&pageLayoutFromAst(ast)?geometry.marginY+'px '+geometry.marginX+'px':'';renderPreview(ast,paper,{hand,style:hand?null:$('pageStyle').value,asset:p=>{const a=assets.find(a=>a.path===p);return a?{url:assetUrls.get(p),mediaType:a.mediaType}:null;},include:includedText});paper.classList.toggle('no-dots',!$('dotGrid').checked);}
function checks(){const list=$('checkList');list.replaceChildren();const items=[...ast.diagnostics,...queryDiagnostics(ast),...hints];$('checkCount').textContent=items.length;if(!items.length){list.append(el('p',$('checkToggle').checked?'No syntax issues or pattern hints found. This is not a guarantee of grammatical correctness.':'Writing hints are off. Browser spellcheck remains available.','small'));return;}for(const d of items){const card=el('article',undefined,'check-card');card.append(el('strong',d.rule||d.code),el('p',d.message));if(d.text)card.append(el('code',d.text));const b=el('button','Find in writing','quiet');b.onclick=()=>{const bytes=new TextEncoder().encode(editor.value),decoder=new TextDecoder('utf-8',{ignoreBOM:true}),a=decoder.decode(bytes.slice(0,d.start)).length,z=decoder.decode(bytes.slice(0,d.end)).length;editor.focus();editor.setSelectionRange(a,z);};card.append(b);list.append(card);}}
let appliedLayoutKey = '';
function adoptDocumentLayout(){
 const layout=pageLayoutFromAst(ast),key=layout?JSON.stringify(layout):'';
 if(key===appliedLayoutKey)return;
 appliedLayoutKey=key;
 if(!layout)return;
 $('journalPaper').value=layout.paper;$('pitch').value=String(layout.pitchMm);$('look').value='hand';$('customPaper').hidden=true;$('paperPreview').classList.remove('styled');
 geometry=pageGeometry(paperMm(),layout.pitchMm,layout.marginMm);
 $('printSettings').textContent=geometry.css;$('handTools').hidden=false;$('styleWrap').hidden=true;
}
function update(){try{ast=parse(editor.value);adoptDocumentLayout();hints=$('checkToggle').checked?proofread(ast,{dictionary}):[];preview();checks();$('wordCount').textContent=`${editor.value.trim()?editor.value.trim().split(/\s+/).length:0} words`;const summary=el('p',`${ast.entries.length} dated sections · ${ast.nodes.length} blocks · ${ast.nodes.filter(n=>n.diagram).length} diagrams · ${ast.diagnostics.length} syntax diagnostics`);$('structureSummary').replaceChildren(summary);const json=JSON.stringify(ast,null,2);$('structureOutput').textContent=json.length>18000?json.slice(0,18000)+'\n… Preview shortened. Download AST for all data.':json;}catch(e){status('Unable to parse this document: '+e.message,true);}}
function save(){if(lockWaiting)return;const state={text:editor.value,name:$('documentName').value,assetKey,cursor:editor.selectionStart,scroll:Math.round(editor.scrollTop),metadata:packageMetadata};if(lockKey){sealState(state);return;}try{localStorage.setItem('jot-workspace-v1',JSON.stringify(state));$('saveState').textContent='Saved in this browser';}catch{$('saveState').textContent='Autosave unavailable';status('Browser storage is unavailable or full. Download .jot to keep your writing.',true);}}
editor.addEventListener('input',()=>{dirty=true;$('saveState').textContent='Saving…';clearTimeout(timer);timer=setTimeout(()=>{update();save();},300);});$('documentName').oninput=save;
try{const stored=JSON.parse(localStorage.getItem('jot-workspace-v1'));if(stored&&stored.locked===1&&typeof stored.sealed==='string'){lockWaiting=stored;assetKey=typeof stored.assetKey==='string'?stored.assetKey:'legacy-active';editor.value='';}else if(stored&&typeof stored.text==='string'){editor.value=stored.text;$('documentName').value=stored.name||'my-journal';assetKey=stored.assetKey||'legacy-active';packageMetadata=stored.metadata||{};const cursor=Number.isInteger(stored.cursor)?Math.min(editor.value.length,stored.cursor):editor.value.length;editor.setSelectionRange(cursor,cursor);resume={cursor,scroll:Number.isFinite(stored.scroll)?Math.max(0,stored.scroll):0};$('saveState').textContent='Restored from this browser';}else editor.value=starter;}catch{editor.value=starter;status('Browser autosave is unavailable. Download your writing before closing.',true);}update();if(resume)editor.scrollTop=resume.scroll;
function setTab(id){for(const name of ['preview','structure','checks']){$(name+'View').hidden=name!==id;$(name+'Tab').classList.toggle('active',name===id);$(name+'Tab').setAttribute('aria-selected',name===id);}}for(const name of ['preview','structure','checks'])$(name+'Tab').onclick=()=>{clearTimeout(timer);update();if(dirty)save();setTab(name);};
$('downloadJot').onclick=async()=>{try{await assetsReady;clearTimeout(timer);update();save();$('downloadJot').disabled=true;if(lockKey){const plain=assets.length?await pack({source:editor.value,assets,metadata:{...packageMetadata,title:$('documentName').value}}):editor.value;download(await Lock.lock(plain,lockKey),fileName()+Lock.LOCK_EXTENSION,'application/octet-stream');status('Downloaded a locked .jotlock'+(assets.length?' with the writing and all '+assets.length+' attached files':'')+'. It opens only with your passphrase.');return;}if(!assets.length){download(editor.value,fileName()+'.jot','text/plain;charset=utf-8');status('Downloaded a plain .jot: your writing, readable in any text editor.');return;}/* draft 3: plain writing is .jot; with attachments it is one .jotz package */const data=await pack({source:editor.value,assets,metadata:{...packageMetadata,title:$('documentName').value}});download(data,fileName()+'.jotz','application/zip');status('Downloaded one .jotz document containing the writing and all '+assets.length+' attached files.');}catch(e){status('Document export failed: '+e.message,true);}finally{$('downloadJot').disabled=false;}};$('markdownBtn').onclick=()=>{download(editor.value,fileName()+'.md','text/markdown');status('Exported the writing only. Download .jot keeps attachments too (as a .jotz).');};$('downloadAST').onclick=()=>{update();download(JSON.stringify(ast,null,2),fileName()+'.ast.json','application/json');};$('openBtn').onclick=()=>$('openFile').click();$('openFile').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>64*1024*1024){status('This editor accepts Jot documents up to 64 MiB.',true);return;}if((dirty||lockWaiting||lockKey)&&!confirm(lockWaiting?'Replace the locked journal kept in this browser? It stays in any .jotlock you downloaded.':'Replace the current journal? Download it first if you want a separate copy.'))return;try{await assetsReady;let bytes=new Uint8Array(await file.arrayBuffer()),key=null;if(Lock.isLocked(bytes)){const opened=await askUnlock('Type the passphrase '+file.name+' was locked with.',pass=>Lock.unlockWithKey(bytes,pass),file.name.replace(/\.jotlock$/i,''));if(!opened)return;bytes=opened.bytes;key=opened.key;}const doc=await readDocument(bytes);leaveLockWaiting();lockKey=key;showLock();setAssets(doc.assets);assetKey=freshKey();packageMetadata=doc.manifest?.metadata||{};appliedLayoutKey='';resume=null;$('returnNote').hidden=true;editor.value=doc.source;$('documentName').value=file.name.replace(/\.(jot|jotz|jotlock|md|txt)$/i,'');editor.setSelectionRange(editor.value.length,editor.value.length);dirty=true;update();save();await persistAssets();status(key?'Opened and unlocked '+file.name+'. It stays locked in this browser; Download locked saves a .jotlock.':doc.packaged?'Opened the .jotz document, including all its assets.':'Opened plain text. Download .jot saves it as plain .jot (or one .jotz if you attach files).');}catch(e){status('Could not open this document: '+e.message,true);}};$('newBtn').onclick=async()=>{if((editor.value||assets.length)&&!confirm('Start a new journal? Download the current .jot first to keep it.'))return;await assetsReady;leaveLockWaiting();lockKey=null;showLock();assetKey=freshKey();packageMetadata={};setAssets([]);resume=null;$('returnNote').hidden=true;editor.value='';$('documentName').value='my-journal';dirty=true;update();save();await persistAssets();};$('checkToggle').onchange=update;
$('wordListBtn').onclick=()=>$('wordList').click();$('wordList').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>5*1024*1024){status('Choose a word list smaller than 5 MB.',true);return;}dictionary=new Set((await f.text()).toLowerCase().split(/\s+/).filter(Boolean));update();status(`Loaded ${dictionary.size} words for this session. Dictionary misses are suggestions, not errors.`);};
function pageSettings(){const v=$('journalPaper').value;$('customPaper').hidden=v!=='custom';let w,h;[w,h]=({A5:[148,210],A4:[210,297],Letter:[215.9,279.4],Pocket:[88.9,139.7]})[v]||[Number($('paperW').value),Number($('paperH').value)];if(!Number.isFinite(w)||!Number.isFinite(h)||w<10||h<10||w>5000||h>5000){status('Enter positive dimensions between 10 and 5,000 mm.',true);return false;}geometry=handOn()?pageGeometry([w,h],Number($('pitch').value),pageLayoutFromAst(ast)?.marginMm ?? 8):null;$('printSettings').textContent=geometry?geometry.css:pageCSS($('pageStyle').value,[w,h]);$('handTools').hidden=!handOn();$('styleWrap').hidden=handOn();$('paperPreview').classList.toggle('styled',!handOn()&&$('pageStyle').value!=='plain');try{localStorage.setItem('jot-hand-v1',JSON.stringify({style:$('pageStyle').value,look:$('look').value,hand:$('hand').value,ink:$('ink').value,pitch:$('pitch').value,seed:handSeed}));}catch{}preview();return true;}for(const id of ['journalPaper','paperW','paperH','dotGrid','look','hand','ink','pitch','pageStyle'])$(id).onchange=pageSettings;$('exportPage').onclick=async()=>{clearTimeout(timer);update();if(dirty)save();if(!pageSettings())return;setTab('preview');$('exportPage').disabled=true;try{const paper=$('paperPreview');await paper.jotReady;const html=await exportHTML(paper,{title:$('documentName').value||'Journal',lang:document.documentElement.lang||'en',pageCss:$('printSettings').textContent});download(html,fileName()+'.html','text/html;charset=utf-8');status('Downloaded '+fileName()+'.html: the formatted pages in one file. Open it in any browser, or print it for a PDF.');}catch(e){status('Could not make the page: '+e.message,true);}finally{$('exportPage').disabled=false;}};$('reshuffle').onclick=()=>{handSeed=(handSeed%9973)+1;pageSettings();status('Written again, with different letter shapes and highlight strokes.');};for(const [id,v] of [['pageStyle',handPrefs.style],['look',handPrefs.look],['hand',handPrefs.hand],['ink',handPrefs.ink],['pitch',handPrefs.pitch]])if(v&&[...$(id).options].some(o=>o.value===v))$(id).value=v;$('printBtn').onclick=async()=>{clearTimeout(timer);update();if(dirty)save();if(pageSettings()){setTab('preview');await $('paperPreview').jotReady;window.print();}};if(pageLayoutFromAst(ast)){appliedLayoutKey='';adoptDocumentLayout();}pageSettings();
function insert(text){const p=editor.selectionEnd,lead=p&&editor.value[p-1]!=='\n'?'\n\n':'';editor.setRangeText(lead+text+'\n\n',p,p,'end');dirty=true;update();save();editor.focus();}
fetch(new URL('./jot/profiles.json',import.meta.url)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{profiles=d.profiles;renderMethods();}).catch(()=>status('Method catalogue could not be loaded. Your journal still works.',true));
function renderMethods(){const q=$('methodSearch').value.toLowerCase(),list=$('methodsList');list.replaceChildren();for(const p of profiles.filter(p=>(p.label+' '+p.purpose).toLowerCase().includes(q))){const card=el('article',undefined,'method-card');card.append(el('h3',p.label),el('p',p.purpose));const b=el('button','Add writing invitation ＋','button');b.onclick=()=>{let text=`#### ${p.label}\n\n${p.prompt}\n\n`;if($('includeRecord').checked)text+=`:::record ${p.recordType}\nmethod: ${p.id}@${p.version}\n${p.example}\n:::\n`;insert(text);$('methodsDialog').close();};card.append(b);list.append(card);}if(!list.childNodes.length)list.append(el('p','No matching methods. Try a broader word.','small'));}
$('methodsBtn').onclick=()=>$('methodsDialog').showModal();$('closeMethods').onclick=()=>$('methodsDialog').close();$('methodSearch').oninput=renderMethods;
const roadmap=[['Text, Markdown and journal sections','Implemented / tested','JavaScript parser, original source preservation, one or many dates per file, preview, import and export.'],['Composable content blocks and layouts','Planned','Blend prose, handwriting, images, tasks, prompts, trackers, tables and diagrams. Stable source order, accessible reordering, responsive groups/columns and print overflow rules.'],['62 journaling method profiles','Implemented','Searchable catalogue with writing invitations and optional structured examples. Methods can be mixed.'],['Paper sizes and printable pages','Implemented','Named/custom page geometry and dot grid. Browser print pagination; physical printer proofs still needed.'],['Web scanner','Hidden while unfinished','Image/camera input, corner adjustment, perspective correction and PNG/JPEG/multi-page PDF. Real-phone camera checks remain.'],['Handwriting input','Hidden while unfinished','Stylus/finger/mouse canvas, eraser, undo/redo, normalized strokes and image output. Pressure behavior needs physical stylus testing.'],['Spellcheck and grammar assistance','Partial','Browser-native spelling, optional word lists and English pattern hints. A full grammar engine and multilingual checks remain planned.'],['Formatted pages and export','Implemented / tested','Journal, Notes and Plain styles show quick jottings as finished pages (dates in words, task states, tags, margin notes); Download page saves one standalone HTML, and printing has book margins and page numbers.'],['Handwritten pages on a dot grid','Implemented / tested','Look → Handwritten writes the journal in a handwriting font with alternate letter shapes and puts every line on a row of dots, so printed pages look filled in by hand.'],['Charts of tracked numbers','Implemented / tested','A chart record draws the numbers you write (sleep, steps, mood) as one small chart per metric, with a summary and a table. The same charts appear in the template editor and the VS Code extension.'],['Mermaid and diagram extensions','Parser tested / renderers planned','Fenced Mermaid, Graphviz, PlantUML, D2 and Vega/Vega-Lite source is identified and preserved. Live diagram rendering is not installed.'],['Handwriting recognition and scan-to-entry import','Planned','User-reviewed transcription with original scan/strokes retained; no silent replacement.'],['Plain .jot and packaged .jotz','Implemented / core tested','Plain writing saves as .jot; one ZIP-based .jotz carries journal.txt, manifest.json and all assets, with hashes and import limits. Plain-text import and writing-only Markdown export remain available.'],['Structured profile validation and task migration','Planned','Full profile contracts, typed scale validation, durable links and migration history beyond capture parsing.'],['Recovery, privacy and accessibility','Partial','Local text autosave, no journal uploads, safe preview and keyboard controls. Multi-document recovery, encryption and full accessibility audit remain.'],['Neurodivergent-friendly personalization','Partial','Writing preferences (text size, line spacing and length, density, higher contrast, reduced motion, hiding the preview, parser tabs, counts and decoration), a keyboard-exitable focus mode, a one-line quick note into today, and return to your place with an optional note. Ruling, saved blended prompts and testing with intended users remain; no streaks or diagnostic mode.'],['Multilingual writing and interface','Planned / Unicode baseline','Separate UI, document and checking languages; mixed-language entries, RTL, IME-safe input, script-aware fonts/counts, localized prompts and handwriting without required recognition.'],['Interoperability and stable language release','Planned','Freeze Markdown/Jot precedence, expand conformance fixtures, publish parser API/versioning and validate independent implementations.']];
for(const [title,state,description] of roadmap){const row=el('article',undefined,'roadmap-row');row.append(el('h3',title),el('span',state,'badge '+(state.includes('Planned')||state.includes('Hidden')?'planned':'')),el('p',description));$('roadmapList').append(row);}for(const id of ['roadmapBtn','roadmapFooter'])$(id).onclick=()=>$('roadmapDialog').showModal();$('closeRoadmap').onclick=()=>$('roadmapDialog').close();

window.addEventListener('pagehide',()=>{if(dirty)save();});

function setAssets(next){for(const u of assetUrls.values())URL.revokeObjectURL(u);assetUrls.clear();assets=next;for(const a of assets)assetUrls.set(a.path,URL.createObjectURL(new Blob([a.data],{type:a.mediaType})));renderAssets();}
function renderAssets(){const list=$('assetList');list.replaceChildren();$('docExt').textContent=lockKey?Lock.LOCK_EXTENSION:assets.length?'.jotz':'.jot';$('assetCount').textContent=assets.length+' assets';if(!assets.length)list.append(el('li','No assets attached yet. Writing-only journals still download as one .jot document.'));for(const a of assets){const li=el('li'),label=el('span',a.path+' · '+Math.ceil(a.data.length/1024)+' KB'),get=el('a','Download','quiet');get.href=assetUrls.get(a.path);get.download=a.path.split('/').pop();const remove=el('button','Remove','quiet');remove.onclick=async()=>{if(!confirm('Remove this file from the document? Existing text references will be left visible.'))return;setAssets(assets.filter(x=>x.path!==a.path));dirty=true;update();save();await persistAssets();};li.append(label,get,remove);list.append(li);}}
async function persistAssets(){if(lockWaiting)return;try{if(lockKey){const key=lockKey,k=assetKey,sealed=await Lock.lock(bundleAssets(assets),key);if(key!==lockKey||k!==assetKey)return;await storage.put('assets',k,{sealed});$('assetSaveState').textContent='Attached files saved in this browser, locked. Download locked keeps a portable copy.';return;}await storage.put('assets',assetKey,assets.map(a=>({path:a.path,mediaType:a.mediaType,data:a.data})));$('assetSaveState').textContent='Attached files saved in this browser. Download .jot for a portable copy.';}catch(e){$('assetSaveState').textContent='Attachments could not be autosaved. Download .jot before closing.';status('Local asset storage failed. The files are still in memory; download .jot to keep them.',true);}}
function assetPath(file){let name=file.name.replace(/[^\p{L}\p{N}._-]+/gu,'-').replace(/^\.+/,'')||'attachment';name=name.slice(0,100);let path='assets/'+name,i=2;while(assets.some(a=>a.path===path))path='assets/'+(i++)+'-'+name;return path;}
$('attachBtn').onclick=()=>$('attachFile').click();$('attachFile').onchange=async e=>{const files=[...e.target.files];e.target.value='';try{await attachFiles(files,true);}catch{/* reported */}};
/* Adds files to the document's attachments; link=true also writes a link at the cursor (the voice tool links its recording only on Add). */
async function attachFiles(files,link){await assetsReady;try{const added=[];let total=assets.reduce((sum,a)=>sum+a.data.length,0);for(const file of files){if(file.size>32*1024*1024||total+file.size>62*1024*1024||assets.length>=254)throw Error('Attachments exceed the document limits. Use files under 32 MiB and keep the document under 64 MiB.');const path=assetPath(file),a={path,mediaType:file.type||'application/octet-stream',data:new Uint8Array(await file.arrayBuffer())};assets.push(a);total+=a.data.length;added.push(a);}setAssets([...assets]);let text='';for(const a of added){const label=a.path.split('/').pop();text+=((rasterTypes.has(a.mediaType)||/\.jot$/i.test(a.path))?'!':'')+'['+label+']('+a.path+')\n\n';}if(text&&link)insert(text);await persistAssets();status('Attached '+added.length+' files. They will travel inside the .jotz document when you download.');return added.map(a=>a.path);}catch(e){setAssets([...assets]);await persistAssets();status(e.message,true);throw e;}}
assetsReady=(async()=>{if(lockWaiting){renderAssets();return;}try{const restored=await storage.get('assets',assetKey);if(Array.isArray(restored)){setAssets(restored);update();}else renderAssets();await takeHandoff();}catch(e){renderAssets();$('assetSaveState').textContent='Local asset recovery unavailable. Download .jot to keep attachments.';}})();
/* A handwritten page or scan waiting from the paper tools goes into the journal once it is open (and, if locked, unlocked). */
async function takeHandoff(){const capture=await storage.get('handoff','pending');if(capture&&Array.isArray(capture.assets)&&typeof capture.text==='string'){for(const a of capture.assets){if(!assets.some(x=>x.path===a.path))assets.push(a);}setAssets([...assets]);insert(capture.text);await persistAssets();await storage.remove('handoff','pending');status('Inserted your handwritten page or scan. It will be included inside this .jot.');}}
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});
/* ?open=examples/… (the Read links on the examples page): opens an example from this site, after asking before it replaces writing */
const exampleParam=new URLSearchParams(location.search).get('open');
if(exampleParam!==null)(async()=>{history.replaceState(null,'',location.pathname+location.hash);if(!/^examples\/[\w-]+(\/[\w-]+)*\.jotz?$/.test(exampleParam)){status('That link does not name an example on this site.',true);return;}const name=exampleParam.split('/').pop();if(((editor.value.trim()&&editor.value!==starter)||lockWaiting)&&!confirm('Open the example '+name+'? It replaces the writing kept in this browser. Choose Cancel, then Download .jot, to keep a copy of yours first.'))return;try{await assetsReady;const res=await fetch(new URL(exampleParam,new URL('./',import.meta.url)));if(!res.ok)throw Error('not found ('+res.status+')');const doc=await readDocument(new Uint8Array(await res.arrayBuffer()));leaveLockWaiting();lockKey=null;showLock();setAssets(doc.assets);assetKey=freshKey();packageMetadata=doc.manifest?.metadata||{};appliedLayoutKey='';resume=null;$('returnNote').hidden=true;editor.value=doc.source;$('documentName').value=name.replace(/\.jotz?$/i,'');editor.setSelectionRange(0,0);editor.scrollTop=0;dirty=true;update();save();await persistAssets();status('Opened the example '+name+'. Changes stay in this browser; Download .jot keeps a copy.');}catch(e){status('Could not open the example: '+e.message,true);}})();

// Tools: the same chores as the jot command line and VS Code (jot/automation.mjs). They change the writing as one step (Ctrl+Z takes
// it back) or download a file locally. Optional Spotify capture is handled separately in music.mjs.
function rewrite(text,said){if(text===editor.value){status(said||'Nothing to change.');return;}editor.focus();editor.select();if(!document.execCommand||!document.execCommand('insertText',false,text))editor.value=text;dirty=true;update();save();status(said);}
$('todayBtn').onclick=()=>{const d=today(),r=A.todayEntry(editor.value,d);if(!r.added){status(d+' is already here.');}else rewrite(r.text,'Added '+d+'.');const at=editor.value.indexOf('### '+d);if(at>=0){const p=editor.value.indexOf('\n',at)+1;editor.focus();editor.setSelectionRange(p,p);}};
$('rolloverBtn').onclick=()=>{const r=A.rollover(editor.value,today());if(!r.moved){status('No open tasks from earlier days.');return;}rewrite(r.text,'Carried '+r.moved+' open '+(r.moved===1?'task':'tasks')+' to today; they are marked [>] where they were.');};
$('reviewBtn').onclick=()=>{const r=A.weekReview(editor.value,today());rewrite(r.text,'Added a review of '+r.week.start+' to '+r.week.end+': '+r.week.done+' done, '+r.week.open+' open.');};
$('icsBtn').onclick=()=>{clearTimeout(timer);update();download(A.toICS(ast,{name:$('documentName').value||'Jot journal',stamp:new Date().toISOString().replace(/[-:]|\.\d+/g,'')}),fileName()+'.ics','text/calendar;charset=utf-8');const {tasks,events}=A.extract(ast);status('Downloaded '+fileName()+'.ics: '+events.filter(e=>e.date).length+' events and '+tasks.filter(t=>t.date&&t.status==='open').length+' open tasks. Import it into your calendar app.');};
$('numbersCsvBtn').onclick=()=>{clearTimeout(timer);update();download(A.numbersCSV(ast),fileName()+'-numbers.csv','text/csv;charset=utf-8');status('Downloaded the numbers as CSV.');};
$('tasksCsvBtn').onclick=()=>{clearTimeout(timer);update();download(A.tasksCSV(ast),fileName()+'-tasks.csv','text/csv;charset=utf-8');status('Downloaded the tasks as CSV.');};
$('importCsvBtn').onclick=()=>$('importCsv').click();
setupHealthImport({editor,rewrite});
$('importCsv').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>20*1024*1024){status('Choose a CSV smaller than 20 MB.',true);return;}try{const r=A.readCSV(await f.text(),{combine:'sum'});if(!r.numbers.length){status('No numbers found in '+f.name+' (a column of dates and columns of numbers are needed).',true);return;}const w=A.addNumbers(editor.value,r.numbers,{source:f.name});rewrite(w.text,'From '+f.name+': '+w.filled+' blanks filled, '+w.added+' numbers added, '+w.kept+' already there ('+r.metrics.join(', ')+').'+(r.ambiguous?' '+r.ambiguous+' rows had dates that could be read either way round and were left out.':''));}catch(err){status('Could not read '+f.name+': '+err.message,true);}};

// Formatting edits the source, so the same colors survive saving, handwriting and print.
function formatSelection(clear = false) {
  const start = editor.selectionStart, end = editor.selectionEnd;
  let text = editor.value.slice(start, end);
  if (!text || /[\r\n]/.test(text)) { status('Select words within one line of your writing first.', true); return; }
  const effect = $('formatEffect').value, color = $('formatColor').value;
  if (!clear && (!['ink','highlight','strike','underline'].includes(effect) || !/^#[0-9a-f]{6}$/i.test(color))) return;
  {
    const strip = token => {
      if (!token.tokens) return token.raw;
      let cursor = 0, result = '';
      for (const child of token.tokens) {
        const at = token.raw.indexOf(child.raw, cursor);
        if (at < 0) return token.raw; // preserve source if a future lexer normalizes a token
        result += token.raw.slice(cursor, at) + strip(child);
        cursor = at + child.raw.length;
      }
      result += token.raw.slice(cursor);
      if (token.type !== 'colorSpan') return result;
      const content = result.slice(1, result.lastIndexOf(']{'));
      const attrs = Object.entries(token.colors).filter(([key]) => !clear && key !== effect && !(effect === 'highlight' && key === 'highlight-style')).map(([key,value]) => key+'='+value).join(' ');
      return attrs ? `[${content}]{${attrs}}` : content;
    };
    const parsed = parse(text, {journal:false});
    text = parsed.nodes.map(n => n.markdown ? strip(n.markdown) : n.raw).join('');
  }
  if (!clear) text = `[${text}]{${effect}=${color}${effect === 'highlight' ? ' highlight-style='+$('highlightStyle').value : ''}}`;
  editor.focus(); editor.setSelectionRange(start, end);
  if (!document.execCommand('insertText', false, text)) editor.setRangeText(text, start, end, 'select');
  editor.setSelectionRange(start, start + text.length);
  dirty = true; clearTimeout(timer); update(); save();
  status(clear ? 'Cleared colors from the selected formatting spans.' : 'Applied '+effect+' color. The handwritten page and print use the same color.');
}
$('applyColor').onclick = () => formatSelection();
$('clearColor').onclick = () => formatSelection(true);


const preset = $('formatPreset');
preset.replaceChildren();
for (const [group, colors] of Object.entries(referencePalettes)) {
  const options = el('optgroup'); options.label = group;
  const swatches = el('fieldset'), legend = el('legend', group); swatches.append(legend);
  for (const [name, hex] of colors) {
    const value = '#'+hex.toLowerCase(), option = el('option', name+' · '+value); option.value = value; options.append(option);
    const button = el('button'); button.type = 'button'; button.className = 'color-swatch'; button.style.backgroundColor = value;
    button.title = name+' · '+value; button.setAttribute('aria-label', button.title);
    button.onclick = () => { preset.value = value; $('formatColor').value = value; colorAdvice(); };
    swatches.append(button);
  }
  preset.append(options); $('paletteSwatches').append(swatches);
}
const customColor = el('option', 'Custom'); customColor.value = 'custom'; preset.append(customColor);
preset.value = '#fddd13';
preset.onchange = () => { if (/^#[0-9a-f]{6}$/.test(preset.value)) $('formatColor').value = preset.value; colorAdvice(); };
$('formatColor').oninput = () => { $('formatPreset').value = 'custom'; colorAdvice(); };
$('formatEffect').onchange = colorAdvice;
function colorAdvice() {
  const effect = $('formatEffect').value;
  $('highlightStyleWrap').hidden = effect !== 'highlight';
  const ratio = contrast($('formatColor').value, effect === 'highlight' ? '#1f3a8a' : '#fffffd');
  $('colorAdvice').textContent = ['ink','highlight'].includes(effect) && ratio < 4.5 ? 'Low contrast against '+(effect === 'highlight' ? 'blue handwriting ink' : 'white paper')+'. Try a '+(effect === 'highlight' ? 'lighter' : 'darker')+' color. Combined colors may differ.' : 'Colors carry through to print. Choose color printing to keep them.';
}
colorAdvice();


// Palettes (jot/palette.mjs): copy the one at the caret as CSS custom properties or JSON, or add the chosen color to it.
const byteAt = i => new TextEncoder().encode(editor.value.slice(0, i)).length; // AST offsets count UTF-8 bytes
function paletteAtCaret() { // the palette the caret is in, or the nearest one before it
  const nodes = parse(editor.value).nodes, list = nodes.filter(isPaletteRecord), at = byteAt(editor.selectionStart);
  const record = nodes.find(n => n.type === 'record' && at > n.start && at < n.end), node = list.find(n => at >= n.start && at < n.end) || list.filter(n => n.start <= at).pop();
  return { node, record, inside: !!node && at >= node.start && at < node.end, count: list.length, index: list.indexOf(node) + 1 };
}
async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch { /* try the older way */ }
  const back = document.activeElement, t = el('textarea'); t.value = text; t.setAttribute('readonly', ''); t.setAttribute('aria-hidden', 'true'); t.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.append(t); t.select(); let ok; try { ok = document.execCommand('copy'); } catch { ok = false; }
  t.remove(); if (back && back.focus) back.focus(); return ok;
}
async function copyPalette(kind) {
  const found = paletteAtCaret();
  if (!found.node) { status(found.count ? 'No palette before the caret. Put the caret in the palette you want to copy.' : 'No palette here yet. Write :::record palette with lines like color: #c0392b brick red, or use Add to palette.', true); return; }
  const p = found.node.recordType === 'palette' ? paletteOf(found.node) : moodboardOf(found.node);
  if (!p.swatches.length) { status(`“${p.title}” has no colors to copy yet${p.invalid.length ? ' (some are not written as #RRGGBB name)' : ''}.`, true); return; }
  const text = kind === 'css' ? paletteCSS(p) : paletteJSON(p), which = found.count > 1 ? ` (palette ${found.index} of ${found.count}; put the caret in another to copy that one)` : '';
  const skipped = p.invalid.length ? ` ${p.invalid.length} not a color, left out.` : '';
  if (await copyText(text)) status(`Copied ${p.swatches.length} ${p.swatches.length === 1 ? 'color' : 'colors'} from “${p.title}” as ${kind === 'css' ? 'CSS custom properties' : 'JSON'}${which}.${skipped}`);
  else { download(text, fileName() + '-palette.' + kind, kind === 'css' ? 'text/css;charset=utf-8' : 'application/json'); status('Copying was blocked here, so the palette downloaded as a file instead.' + skipped); }
}
$('paletteCssBtn').onclick = () => copyPalette('css');
$('paletteJsonBtn').onclick = () => copyPalette('json');
$('addSwatch').onclick = () => {
  const hex = $('formatColor').value.toLowerCase(); if (!/^#[0-9a-f]{6}$/.test(hex)) return;
  const option = $('formatPreset').selectedOptions[0], name = option && option.value === hex ? option.textContent.split(' · ')[0] : 'custom';
  const line = `color: ${hex} ${name}`, found = paletteAtCaret();
  if (found && found.inside) { // before the record's closing :::, as text so Ctrl+Z takes it back
    const bytes = new TextEncoder().encode(editor.value), charAt = b => new TextDecoder().decode(bytes.slice(0, b)).length;
    const start = charAt(found.node.start), end = charAt(found.node.end), close = editor.value.lastIndexOf('\n:::', end - 1);
    const closed = close > start && /^\n:::[ \t]*(\r?\n|$)/.test(editor.value.slice(close, end + 1)), at = closed ? close + 1 : end;
    const text = closed ? line + '\n' : (editor.value[at - 1] === '\n' ? '' : '\n') + line + '\n';
    editor.focus(); editor.setSelectionRange(at, at);
    if (!document.execCommand('insertText', false, text)) editor.setRangeText(text, at, at, 'end');
    dirty = true; update(); save(); status(`Added ${hex} ${name} to “${paletteOf(found.node).title}”.`); return;
  }
  if (found.record) { const end = new TextDecoder().decode(new TextEncoder().encode(editor.value).slice(0, found.record.end)).length; editor.setSelectionRange(end, end); } // not inside another record: after it
  insert(`:::record palette\nlabel: My palette\n${line}\n:::`); status(`Started a palette with ${hex} ${name}. Rename it on the label: line.`);
};

setupMusicCapture({ insert });

// Writing preferences, focus mode, quick notes and return to your place. Per-viewer conveniences: kept in this browser only (never in
// the journal), and the page works the same when storage is unavailable. No timers, sounds, streaks or diagnosis-based presets.
const root = document.documentElement, PREFS_KEY = 'jot-prefs-v1';
const prefDefaults = { size: 'm', spacing: 'normal', measure: 'full', density: 'normal', contrast: false, motion: false, preview: true, parser: true, counters: true, decoration: true, note: '', showReturn: true, dayStart: '0', relock: '15' };
const prefSelects = { size: 'prefSize', spacing: 'prefSpacing', measure: 'prefMeasure', density: 'prefDensity', dayStart: 'prefDayStart', relock: 'prefRelock' };
const prefChecks = { contrast: 'prefContrast', motion: 'prefMotion', preview: 'prefPreview', parser: 'prefParser', counters: 'prefCounters', decoration: 'prefDecoration', showReturn: 'prefShowReturn' };
const prefs = { ...prefDefaults };
try {
  const stored = JSON.parse(localStorage.getItem(PREFS_KEY));
  if (stored && typeof stored === 'object') for (const k of Object.keys(prefDefaults)) if (typeof stored[k] === typeof prefDefaults[k]) prefs[k] = stored[k];
} catch { /* no stored preferences: the standard page */ }
for (const [k, id] of Object.entries(prefSelects)) if (![...$(id).options].some(o => o.value === prefs[k])) prefs[k] = prefDefaults[k];
prefs.note = prefs.note.slice(0, 500);
// Today, Quick note, Carry tasks forward and Week review use the writer's own day: before the chosen hour it is still yesterday.
function today() { return A.localToday(new Date(), Number(prefs.dayStart)); }
function applyPrefs() {
  for (const k of Object.keys(prefSelects)) root.setAttribute('data-pref-' + k, prefs[k]);
  root.toggleAttribute('data-pref-contrast', prefs.contrast);
  root.toggleAttribute('data-pref-motion', prefs.motion);
  root.toggleAttribute('data-hide-preview', !prefs.preview);
  root.toggleAttribute('data-hide-parser', !prefs.parser);
  root.toggleAttribute('data-hide-counters', !prefs.counters);
  root.toggleAttribute('data-hide-decoration', !prefs.decoration);
  if (!prefs.parser && $('previewView').hidden) setTab('preview');
}
function savePrefs() {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); $('prefsStatus').textContent = 'Saved in this browser.'; }
  catch { $('prefsStatus').textContent = 'These choices apply now but could not be remembered in this browser.'; }
}
function showPrefControls() {
  for (const [k, id] of Object.entries(prefSelects)) $(id).value = prefs[k];
  for (const [k, id] of Object.entries(prefChecks)) $(id).checked = prefs[k];
  $('prefNote').value = prefs.note;
}
for (const [k, id] of Object.entries(prefSelects)) $(id).onchange = () => { prefs[k] = $(id).value; applyPrefs(); savePrefs(); };
for (const [k, id] of Object.entries(prefChecks)) $(id).onchange = () => { prefs[k] = $(id).checked; applyPrefs(); savePrefs(); };
let noteTimer;
$('prefNote').oninput = () => { prefs.note = $('prefNote').value.slice(0, 500); clearTimeout(noteTimer); noteTimer = setTimeout(savePrefs, 500); };
$('prefNote').onchange = () => { clearTimeout(noteTimer); savePrefs(); };
$('prefsReset').onclick = () => { Object.assign(prefs, prefDefaults, { note: prefs.note, showReturn: prefs.showReturn, dayStart: prefs.dayStart, relock: prefs.relock }); showPrefControls(); applyPrefs(); savePrefs(); $('prefsStatus').textContent += ' Standard look restored; your note, your day and when a locked journal locks again are kept.'; };
$('prefsBtn').onclick = () => { showPrefControls(); $('prefsStatus').textContent = ''; $('prefsDialog').showModal(); };
for (const id of ['prefsClose', 'prefsDone']) $(id).onclick = () => $('prefsDialog').close();
showPrefControls(); applyPrefs();

// Locking (Jot Lock: ./jot/lock.mjs, specification/Jot-Lock-v1.md), with the browser's built-in Web Crypto. The passphrase makes this
// visit's key and is then dropped; the key cannot be exported. While locked, autosave and attachments are stored only encrypted, and
// a reload asks for the passphrase again. Download saves a .jotlock; the lock note says which other exports are not encrypted.
const toB64 = (b) => { let t = ''; for (let i = 0; i < b.length; i += 0x8000) t += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(t); };
const fromB64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
function sealState(state) {
  const key = lockKey;
  sealing = sealing.then(async () => {
    const sealed = await Lock.lock(JSON.stringify(state), key);
    if (key !== lockKey) return;
    localStorage.setItem('jot-workspace-v1', JSON.stringify({ locked: 1, assetKey: state.assetKey, sealed: toB64(sealed) }));
    $('saveState').textContent = 'Saved in this browser, locked';
  }).catch(() => { $('saveState').textContent = 'Autosave unavailable'; status('The locked copy could not be saved in this browser. Download locked to keep your writing.', true); });
  return sealing;
}
// Attachments as one sealed value: a 4-byte length, a JSON list of {path, mediaType, length}, then the files' bytes in order.
function bundleAssets(list) {
  const head = new TextEncoder().encode(JSON.stringify(list.map((a) => ({ path: a.path, mediaType: a.mediaType, length: a.data.length }))));
  const out = new Uint8Array(4 + head.length + list.reduce((n, a) => n + a.data.length, 0));
  new DataView(out.buffer).setUint32(0, head.length); out.set(head, 4);
  let at = 4 + head.length; for (const a of list) { out.set(a.data, at); at += a.data.length; }
  return out;
}
function unbundleAssets(b) {
  const n = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(0), list = JSON.parse(new TextDecoder().decode(b.subarray(4, 4 + n)));
  let at = 4 + n;
  return list.map((d) => { const data = b.slice(at, at + d.length); at += d.length; return { path: d.path, mediaType: d.mediaType, data }; });
}
function showLock() {
  const waiting = !!lockWaiting, locked = !!lockKey;
  $('lockGate').hidden = !waiting; $('lockNote').hidden = !locked;
  editor.readOnly = waiting; document.querySelector('.studio-workspace').inert = waiting;
  for (const id of ['downloadJot', 'attachBtn', 'markdownBtn']) $(id).disabled = waiting;
  $('lockBtn').hidden = waiting; $('lockBtn').textContent = locked ? 'Remove the lock' : 'Lock with a passphrase';
  $('downloadJot').textContent = locked ? 'Download locked ↓' : 'Download .jot ↓';
  $('docExt').textContent = locked ? Lock.LOCK_EXTENSION : assets.length ? '.jotz' : '.jot';
  if (waiting) $('saveState').textContent = 'Locked';
}
function leaveLockWaiting() { lockWaiting = null; showLock(); }
/* Asks for a passphrase until attempt(passphrase) succeeds or the person cancels (null). Wrong passphrases just ask again. */
function askUnlock(message, attempt, name = 'Jot journal') {
  return new Promise((resolve) => {
    const d = $('unlockDialog'); let busy = false; $('unlockUser').value = name;
    $('unlockWhat').textContent = message; $('unlockPass').value = ''; $('unlockStatus').textContent = '';
    const finish = (v) => { $('unlockForm').onsubmit = null; d.onclose = null; if (d.open) d.close(); $('unlockPass').value = ''; resolve(v); };
    $('unlockForm').onsubmit = async (e) => {
      e.preventDefault(); if (busy) return; busy = true; $('unlockGo').disabled = true; $('unlockStatus').textContent = 'Unlocking…';
      try { finish(await attempt($('unlockPass').value)); }
      catch (err) { $('unlockStatus').textContent = err instanceof Lock.LockError && err.code === 'cannot-unlock' ? 'That passphrase does not unlock it (or the file was changed). Try again.' : 'Could not unlock: ' + err.message; $('unlockPass').select(); }
      finally { busy = false; $('unlockGo').disabled = false; }
    };
    d.onclose = () => finish(null); d.showModal(); $('unlockPass').focus();
  });
}
for (const id of ['unlockCancel', 'unlockClose']) $(id).onclick = () => $('unlockDialog').close();
async function unlockStored() {
  const stored = lockWaiting; if (!stored) return;
  const opened = await askUnlock('Type the passphrase this journal was locked with.', async (pass) => {
    const r = await Lock.unlockWithKey(fromB64(stored.sealed), pass);
    return { state: JSON.parse(new TextDecoder().decode(r.bytes)), key: r.key };
  });
  if (!opened || lockWaiting !== stored) return;
  const { state, key } = opened; let kept = [];
  try { const v = await storage.get('assets', stored.assetKey); if (v && v.sealed) kept = unbundleAssets(await Lock.unlock(v.sealed, key)); }
  catch { status('The locked attachments in this browser could not be read. The writing is unlocked.', true); }
  lockWaiting = null; lockKey = key;
  editor.value = typeof state.text === 'string' ? state.text : ''; $('documentName').value = state.name || 'my-journal';
  assetKey = typeof state.assetKey === 'string' ? state.assetKey : stored.assetKey; packageMetadata = state.metadata || {};
  setAssets(kept); showLock();
  const cursor = Number.isInteger(state.cursor) ? Math.min(editor.value.length, state.cursor) : editor.value.length;
  editor.setSelectionRange(cursor, cursor); update(); editor.scrollTop = Number.isFinite(state.scroll) ? Math.max(0, state.scroll) : 0;
  $('saveState').textContent = 'Unlocked · kept locked in this browser'; editor.focus();
  status('Unlocked. It stays locked in this browser; reloading the page asks for the passphrase again.');
  await takeHandoff();
}
$('lockGateUnlock').onclick = unlockStored;
$('lockGateForget').onclick = async () => {
  if (!lockWaiting || !confirm('Remove the locked journal from this browser? Only a .jotlock you downloaded will still have it.')) return;
  const k = lockWaiting.assetKey; lockWaiting = null;
  try { localStorage.removeItem('jot-workspace-v1'); await storage.remove('assets', k); } catch { /* nothing more to remove */ }
  editor.value = ''; showLock(); update(); status('Removed the locked journal from this browser.');
};
let shortOk = false;
$('lockBtn').onclick = async () => {
  if (lockKey) {
    if (!confirm('Remove the lock? This browser will keep the journal unencrypted again, and Download saves a plain .jot. Locked copies you downloaded stay locked.')) return;
    lockKey = null; showLock(); save(); await persistAssets(); status('The lock is removed: this browser keeps this journal unencrypted again.'); return;
  }
  $('lockUser').value = $('documentName').value.trim() || 'Jot journal'; // the name a password manager saves the passphrase under
  $('lockPass').value = $('lockPass2').value = ''; $('lockStatus').textContent = ''; shortOk = false; $('lockDialog').showModal(); $('lockPass').focus();
};
for (const id of ['lockCancel', 'lockClose']) $(id).onclick = () => $('lockDialog').close();
$('lockDialog').addEventListener('close', () => { $('lockPass').value = $('lockPass2').value = ''; });
$('lockForm').onsubmit = async (e) => {
  e.preventDefault();
  const a = $('lockPass').value, b = $('lockPass2').value;
  if (a !== b) { $('lockStatus').textContent = 'The two passphrases differ. Nothing was locked.'; return; }
  if ([...a].length < 8 && !shortOk) { shortOk = true; $('lockStatus').textContent = 'That passphrase is short, so it is easier to guess. Choose Lock this journal again to use it anyway.'; return; }
  $('lockGo').disabled = true; $('lockStatus').textContent = 'Locking…';
  try {
    await assetsReady;
    const key = await Lock.makeKey(a);
    lockKey = key; save(); await sealing; await persistAssets();
    const kept = JSON.parse(localStorage.getItem('jot-workspace-v1') || 'null');
    if (!kept || kept.locked !== 1) throw Error('the encrypted copy could not be saved in this browser');
    showLock(); $('lockDialog').close();
    status('Locked. This browser now keeps only an encrypted copy, and Download locked saves a .jotlock. Copies you downloaded before are not locked.');
  } catch (err) { lockKey = null; showLock(); save(); $('lockStatus').textContent = 'Could not lock: ' + err.message; }
  finally { $('lockGo').disabled = false; }
};
// Lock again after time away (Writing preferences): with no typing, clicking or scrolling here for that long, the writing is saved
// (encrypted), the key is dropped and the page shows the locked panel. Timers slow down in a hidden tab, so coming back checks too.
let lastActive = Date.now();
for (const type of ['keydown', 'pointerdown', 'input', 'wheel']) document.addEventListener(type, () => { lastActive = Date.now(); }, { passive: true, capture: true });
async function relockIfAway() {
  const minutes = Number(prefs.relock), key = lockKey;
  if (!key || !minutes || Date.now() - lastActive < minutes * 60000) return;
  save(); await sealing; if (key !== lockKey) return;
  let stored = null; try { stored = JSON.parse(localStorage.getItem('jot-workspace-v1')); } catch { /* checked below */ }
  if (!stored || stored.locked !== 1) { status('Could not lock again: the encrypted copy is not saved in this browser. Download locked to keep your writing.', true); return; }
  for (const id of ['lockDialog', 'unlockDialog']) if ($(id).open) $(id).close();
  lockKey = null; lockWaiting = stored; resume = null;
  editor.value = ''; setAssets([]); update(); showLock();
  status(`Locked again after ${minutes === 60 ? 'an hour' : minutes + ' minutes'} away. Your writing was saved first; unlock to carry on.`);
}
setInterval(relockIfAway, 30000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') relockIfAway(); });
showLock(); if (lockWaiting) unlockStored();
// The saved scroll was measured with these preferences and the handwriting font, so apply it again once both are in place.
if (resume) { editor.scrollTop = resume.scroll; const set = editor.scrollTop; document.fonts?.ready.then(() => { if (editor.scrollTop === set) editor.scrollTop = resume?.scroll ?? set; }); }

// Focus mode shows only the writing, the file name and save state. Escape or the same button leaves it; focus stays where it was.
function setFocusMode(on) {
  root.toggleAttribute('data-focus', on);
  $('focusBtn').textContent = on ? 'Leave focus mode (Esc)' : 'Focus mode';
  if (on) $('focusBtn').setAttribute('aria-keyshortcuts', 'Escape'); else $('focusBtn').removeAttribute('aria-keyshortcuts');
  status(on ? 'Focus mode: only the writing is shown. Press Escape or Leave focus mode to see everything again.' : 'Left focus mode. All tools are shown again.');
}
$('focusBtn').onclick = () => { const on = !root.hasAttribute('data-focus'); setFocusMode(on); if (on) editor.focus(); };
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing || !root.hasAttribute('data-focus') || document.querySelector('dialog[open]')) return;
  e.preventDefault(); setFocusMode(false);
});

// Quick note: one line at the end of today's entry (made, as Today ＋ does, if there is none). The edit is one undo step, and the
// cursor, selection and scroll stay where they were unless the person asks to move to the note.
function quickNote(line, go) {
  const old = editor.value, date = today(), next = A.addToDay(old, date, line);
  let a = 0, z = 0;
  while (a < old.length && a < next.length && old[a] === next[a]) a++;
  while (z < old.length - a && z < next.length - a && old[old.length - 1 - z] === next[next.length - 1 - z]) z++;
  const end = old.length - z, text = next.slice(a, next.length - z), delta = text.length - (end - a);
  const keep = p => p <= a ? p : p >= end ? p + delta : a;
  const start = keep(editor.selectionStart), stop = keep(editor.selectionEnd), direction = editor.selectionDirection, top = editor.scrollTop;
  editor.focus(); editor.setSelectionRange(a, end);
  if (!document.execCommand || !document.execCommand('insertText', false, text)) editor.setRangeText(text, a, end, 'end');
  if (go) { const at = next.indexOf(line, Math.max(0, a - line.length)) + line.length; editor.setSelectionRange(at, at); editor.blur(); editor.focus(); }
  else { editor.setSelectionRange(start, stop, direction); editor.scrollTop = top; }
  dirty = true; clearTimeout(timer); update(); save();
  status('Added your note to ' + date + '.' + (go ? '' : ' Your cursor is where you left it.'));
}
$('quickBtn').onclick = () => { $('captureText').value = ''; $('captureStatus').textContent = ''; $('captureDialog').showModal(); $('captureText').focus(); };
$('captureClose').onclick = () => $('captureDialog').close();
$('captureForm').onsubmit = e => {
  e.preventDefault();
  // One plain line: a leading heading, fence or record marker is escaped so the note cannot start a new entry or swallow later ones.
  const line = $('captureText').value.replace(/\s*[\r\n]+\s*/g, ' ').trim().replace(/^(#|:::|```|~~~)/, '\\$1');
  if (!line) { $('captureStatus').textContent = 'Type a few words first, or close this.'; return; }
  $('captureDialog').close();
  try { quickNote(line, $('captureGo').checked); } catch (err) { status('Could not add the note: ' + err.message, true); }
};

// Return to your place: the cursor and scroll are restored on load; an optional note from the preferences is offered, never required.
if (prefs.showReturn && prefs.note.trim()) { $('returnNoteText').textContent = prefs.note; $('returnNote').hidden = false; }
const closeReturn = () => { $('returnNote').hidden = true; };
$('returnGo').onclick = () => {
  closeReturn(); const at = resume ? Math.min(resume.cursor, editor.value.length) : editor.selectionStart;
  editor.focus(); editor.setSelectionRange(at, at); if (resume) editor.scrollTop = resume.scroll;
  status('Back where you were.');
};
$('returnEnd').onclick = () => { closeReturn(); editor.focus(); editor.setSelectionRange(editor.value.length, editor.value.length); editor.scrollTop = editor.scrollHeight; status('Your cursor is at the end, ready for something new.'); };
$('returnDismiss').onclick = () => { closeReturn(); editor.focus(); };

setupVoicePractice({ insert, recordings: () => assets, attach: (files) => attachFiles(files, false) });
