import {validateJotFragment} from './ai-client.mjs';
export function organizedJot(response){
  if(response && Array.isArray(response.function_calls) && !response.function_calls.length && Array.isArray(response.suppressed_calls)) response={...response,function_calls:response.suppressed_calls};
  if(response?.success===false || !Array.isArray(response?.function_calls) || response.function_calls.length!==1 || response.function_calls[0].name!=='organize_journal')throw Error('Needle did not produce a journal proposal. Keep or edit the transcript instead.');
  const fields=response.function_calls[0].arguments;
  if(!fields||Object.keys(fields).sort().join()!=='notes,tags,tasks')throw Error('Needle returned an unsupported structure.');
  for(const key of ['notes','tasks','tags'])if(!Array.isArray(fields[key])||fields[key].length>80||fields[key].some(t=>typeof t!=='string'||!t.trim()||t.length>12000))throw Error('Needle returned invalid journal fields.');
  const text=[...fields.notes,...fields.tasks.map(t=>'[ ] '+t.replace(/[\r\n]+/g,' ')),fields.tags.map(t=>'#'+t.replace(/^#+/,'').replace(/[^\p{L}\p{N}_-]+/gu,'-')).join(' ')].filter(Boolean).join('\n\n');
  return validateJotFragment(text);
}
export function liveTranscript(previous,result){
  if(typeof result?.text!=='string'||typeof result?.pending!=='string'||result.text.length>12000||result.pending.length>12000)throw Error('The speech engine returned an invalid transcript.');
  const committed=[previous.trim(),result.text.trim()].filter(Boolean).join(' ');
  if(committed.length+result.pending.length>24000)throw Error('This voice draft is full. Stop and insert or discard it before continuing.');
  return {committed,pending:result.pending};
}
