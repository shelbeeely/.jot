import {parse} from './jot.mjs';
import {LIMITS} from './archive-common.mjs';
export const uuid = () => crypto.randomUUID();
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true});
export function reconcileEntries(source, previous=[], {privateByDefault=false, now=null}={}) {
  const bytes=encoder.encode(source);if(bytes.length>LIMITS.sourceBytes)throw Error('Journal source exceeds 32 MiB.');
  const ast=parse(source),heads=ast.nodes.filter(n=>n.type==='heading'&&n.date),parts=[];
  if(!heads.length)parts.push({date:null,timezone:ast.timezone||null,source});
  else {
    if(heads[0].start)parts.push({date:null,timezone:ast.timezone||null,source:decoder.decode(bytes.subarray(0,heads[0].start))});
    for(let i=0;i<heads.length;i++)parts.push({date:heads[i].date,timezone:ast.entries[i]?.timezone||null,source:decoder.decode(bytes.subarray(heads[i].start,heads[i+1]?.start??bytes.length))});
  }
  if(parts.length>10000)throw Error('A journal supports at most 10,000 entries.');
  const used=new Set(),matches=parts.map(part=>{const n=previous.findIndex((e,i)=>!used.has(i)&&e.source===part.source&&e.date===part.date);if(n>=0)used.add(n);return n;});
  return parts.map((part,i)=>{
    if(encoder.encode(part.source).length>LIMITS.entryBytes)throw Error('One entry exceeds 1 MiB. Split it into dated entries.');
    let at=matches[i];if(at<0){at=previous.findIndex((e,j)=>!used.has(j)&&e.date===part.date);if(at>=0)used.add(at);}
    const old=at>=0?previous[at]:null,changed=!old||old.source!==part.source||old.timezone!==part.timezone;
    return {id:old?.id||uuid(),...part,private:old?!!old.private:privateByDefault,revision:old?(old.revision||1)+(changed?1:0):1,createdAt:old?(old.createdAt??null):now,updatedAt:changed?now:old?.updatedAt||null};
  });
}
