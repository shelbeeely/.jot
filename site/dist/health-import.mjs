// The workspace's "Import health data" dialog: a health app's export read on this device (nothing is uploaded or fetched), the numbers
// and dates chosen, the exact records shown, and only then written into the journal through rewrite() so Ctrl+Z takes them out again.
import H from './jot/health.mjs';
import A from './jot/automation.mjs';
import {parse} from './jot/jot.mjs';

const enc=new TextEncoder(),dec=new TextDecoder();
const addDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
/** The records an import adds or fills (with or without an id), as the text that will be in the journal. */
function changedRecords(before,after){
 const raws=src=>{const b=enc.encode(src);return parse(src).nodes.filter(n=>n.type==='record').map(n=>dec.decode(b.subarray(n.start,n.end)).replace(/\s+$/,''));};
 const was=new Map();for(const r of raws(before))was.set(r,(was.get(r)||0)+1);
 return raws(after).filter(r=>{const k=was.get(r)||0;if(k){was.set(r,k-1);return false;}return true;});
}

export function setupHealthImport({editor,rewrite}){
 const $=id=>document.getElementById(id),dialog=$('healthDialog'),list=$('healthMetrics'),since=$('healthSince'),until=$('healthUntil');
 let summary=null,source='',plan=null,reading=0,csv=null;
 const say=(s,error=false)=>{$('healthStatus').textContent=s;$('healthStatus').classList.toggle('error',error);};
 const reset=()=>{summary=null;plan=null;csv=null;list.replaceChildren();for(const id of ['healthChoices','healthReview','healthDayFirstRow'])$(id).hidden=true;$('healthDayFirst').checked=false;$('healthApply').disabled=true;};
 const chosen=()=>[...list.querySelectorAll('input:checked')].map(x=>x.value);
 function review(){
  if(!summary)return;const metrics=chosen(),from=since.value,to=until.value;
  if(from&&to&&from>to){plan=null;$('healthApply').disabled=true;$('healthSummary').textContent='The first date is after the last.';$('healthPreview').textContent='';return;}
  const numbers=summary.numbers({metrics,since:from,until:to}),w=A.addNumbers(editor.value,numbers,{source}),records=changedRecords(editor.value,w.text);
  plan={text:w.text,w,metrics};
  for(const box of list.querySelectorAll('input')){const n=summary.numbers({metrics:[box.value],since:from,until:to}).length;box.closest('label').querySelector('.health-count').textContent=n+(n===1?' day':' days');}
  $('healthSummary').textContent=!numbers.length?'Nothing to add: choose a number and a range with days in it.':`${w.added} ${w.added===1?'record':'records'} to add, ${w.filled} ${w.filled===1?'blank':'blanks'} to fill, ${w.kept} already in the journal (kept as they are)${w.skipped?`, ${w.skipped} ${w.skipped===1?'blank':'blanks'} left empty because ${w.skipped===1?'it uses':'they use'} a different unit`:''}.`;
  $('healthPreview').textContent=records.length?records.join('\n\n'):'(nothing new)';
  $('healthApply').disabled=!(w.added||w.filled);
 }
 async function read(file){
  reset();const mine=++reading;source='';
  try{
   const kind=H.healthKind(file.name,await file.slice(0,512).text());if(kind instanceof Error)throw kind;
   if(kind==='apple'){
    if(file.size>H.LIMITS.xmlBytes)throw new Error(`This export.xml is larger than ${H.LIMITS.xmlBytes/1024**3} GB, more than Jot reads at once.`);
    const sc=H.appleHealthScanner(),reader=file.stream().pipeThrough(new TextDecoderStream()).getReader();let done=0,shown=-1;
    for(;;){const {value,done:end}=await reader.read();if(end)break;if(mine!==reading){reader.cancel();return;}sc.push(value);done+=value.length;const pct=Math.min(99,Math.floor(done/Math.max(1,file.size)*100));if(pct>=shown+5){shown=pct;say(`Reading ${file.name}… ${pct}%`);}}
    summary=sc.end();source=`Apple Health ${file.name}`;
   }else{
    if(file.size>H.LIMITS.csvBytes)throw new Error(`Choose a CSV smaller than ${H.LIMITS.csvBytes/1024**2} MB (export a shorter date range).`);
    csv={name:file.name,text:await file.text()};summary=H.readHealthCSV(csv.text,{dayFirst:$('healthDayFirst').checked||null});source=/^(CSV|Health app)$/.test(summary.name)?file.name:`${summary.name} ${file.name}`;
   }
  }catch(err){if(mine===reading){say('Could not read '+file.name+': '+err.message,true);}return;}
  if(mine!==reading)return;
  show(file.name);
 }
 function show(name){
  list.replaceChildren();$('healthDayFirstRow').hidden=!(summary.ambiguous||$('healthDayFirst').checked);
  if(!summary.metrics.length){plan=null;$('healthChoices').hidden=$('healthReview').hidden=true;$('healthApply').disabled=true;say(`No numbers Jot reads were found in ${name}.${summary.ambiguous?' Its dates could be read either way round: tick “day first” if 03/04 means 3 April.':''}`,true);return;}
  for(const m of summary.metrics){
   const label=document.createElement('label'),box=document.createElement('input'),text=document.createElement('span'),count=document.createElement('span');
   box.type='checkbox';box.value=m.metric;box.checked=!m.optional;box.onchange=review;
   text.textContent=`${m.label} · ${m.metric}${m.unit?` (${m.unit})`:''}, ${m.aggregation==='latest'?'last of the day':m.aggregation==='sum'?'daily total':m.aggregation==='mean'?'daily average':m.aggregation==='minimum'?'lowest of the day':'highest of the day'}`;
   count.className='health-count';label.append(box,text,count);list.append(label);
  }
  for(const x of [since,until]){x.min=summary.first;x.max=summary.last;}
  since.value=summary.first>addDays(summary.last,-29)?summary.first:addDays(summary.last,-29);until.value=summary.last;
  const extra=[summary.used!==undefined?`${summary.used} of ${summary.records} records used`:`${summary.rows} rows`,summary.leftOut?.length?`left out: ${summary.leftOut.join(', ')}`:'',summary.ambiguous?`${summary.ambiguous} rows with dates like 03/04/2026 left out`:''].filter(Boolean).join('; ');
  say(`${summary.name}: numbers from ${summary.first} to ${summary.last} (${extra}). The last 30 days are chosen; change the range or the numbers below.`);
  $('healthChoices').hidden=false;$('healthReview').hidden=false;review();
 }
 $('healthDayFirst').onchange=()=>{if(!csv)return;try{summary=H.readHealthCSV(csv.text,{dayFirst:$('healthDayFirst').checked||null});}catch(err){say('Could not read '+csv.name+': '+err.message,true);return;}show(csv.name);};
 dialog.addEventListener('close',()=>{reading++;}); // Escape, ✕, Cancel or Add: a read still going is dropped
 $('importHealthBtn').onclick=()=>{reading++;reset();say('Choose a file to see what is in it. Nothing changes until you add it.');dialog.showModal();$('healthChoose').focus();};
 $('healthChoose').onclick=()=>$('healthFile').click();
 $('healthFile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)read(f);};
 since.onchange=until.onchange=review;
 const close=()=>dialog.close();
 $('healthClose').onclick=close;$('healthCancel').onclick=close;
 $('healthApply').onclick=()=>{review();if(!plan||!(plan.w.added||plan.w.filled))return;const {w,metrics}=plan;close();rewrite(plan.text,`From ${source}: ${w.filled} blanks filled, ${w.added} numbers added, ${w.kept} already there (${metrics.join(', ')}). Ctrl+Z takes them out again.`);};
}
