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
  // Match each part to its previous entry: first an unused entry with identical date and source, then an unused entry
  // with the same date, both in document order. Lookup tables keep this linear; scanning the whole list for every part
  // made saving a long journal quadratic.
  const used=new Set(),exact=new Map(),byDate=new Map(),take=(list)=>{while(list?.length&&used.has(list[0]))list.shift();const n=list?.length?list.shift():-1;if(n>=0)used.add(n);return n;};
  previous.forEach((e,i)=>{const key=e.date+'\u0000'+e.source;if(!exact.has(key))exact.set(key,[]);exact.get(key).push(i);if(!byDate.has(e.date))byDate.set(e.date,[]);byDate.get(e.date).push(i);});
  const matches=parts.map(part=>take(exact.get(part.date+'\u0000'+part.source)));
  return parts.map((part,i)=>{
    if(encoder.encode(part.source).length>LIMITS.entryBytes)throw Error('One entry exceeds 1 MiB. Split it into dated entries.');
    let at=matches[i];if(at<0)at=take(byDate.get(part.date));
    const old=at>=0?previous[at]:null,changed=!old||old.source!==part.source||old.timezone!==part.timezone;
    return {id:old?.id||uuid(),...part,private:old?!!old.private:privateByDefault,revision:old?(old.revision||1)+(changed?1:0):1,createdAt:old?(old.createdAt??null):now,updatedAt:changed?now:old?.updatedAt||null};
  });
}
