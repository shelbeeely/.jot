import {validateJotFragment} from './ai-client.mjs';
export const CLEANUP_SYSTEM='Fix punctuation and capitalization. Remove um and uh. Keep the original meaning and words. Return only the corrected text.';
export function validateCleanup(text,original){
  validateJotFragment(text);
  if(text.length>Math.max(1000,original.length*2))throw Error('Cleanup changed too much. The original transcript is retained.');
  const numbers=value=>value.match(/\d+(?:[.,]\d+)*/g)||[];
  if(JSON.stringify(numbers(text))!==JSON.stringify(numbers(original)))throw Error('Cleanup changed a number. The original transcript is retained.');
  const negations=value=>(value.toLowerCase().replace(/n[’']t\b/g,' not').match(/\b(?:not|never|no|cannot)\b/g)||[]).length;
  if(negations(text)!==negations(original))throw Error('Cleanup changed a negation. The original transcript is retained.');
  return text;
}
export function createLocalCleanup({loadRuntime=()=>import('./vendor/wllama/index.mjs')}={}){
  let runtime=null,closed=false,loaded=false,busy=false;const pending=new Set();
  function bounded(operation){return new Promise((resolve,reject)=>{const entry={reject,timer:setTimeout(()=>{close('Local cleanup timed out. The original transcript is retained.');},120000)};pending.add(entry);Promise.resolve().then(operation).then(resolve,reject).finally(()=>{clearTimeout(entry.timer);pending.delete(entry);});});}
  function close(reason='Local cleanup session closed.'){closed=true;loaded=false;runtime?.exit().catch(()=>{});runtime=null;for(const entry of pending){clearTimeout(entry.timer);entry.reject(Error(reason));}pending.clear();}
  return {
    async load(bytes){if(closed)throw Error('Local cleanup session closed.');return bounded(async()=>{const {Wllama}=await loadRuntime();if(closed)throw Error('Local cleanup session closed.');const quiet=()=>{};const model=new Wllama({default:new URL('./vendor/wllama/wllama.wasm',import.meta.url).href},{suppressNativeLog:true,logger:{debug:quiet,log:quiet,warn:quiet,error:quiet}});runtime=model;model.setCompat({worker:new URL('./vendor/wllama/compat/wllama.js',import.meta.url).href,wasm:new URL('./vendor/wllama/compat/wllama.wasm',import.meta.url).href},'firefox_safari');try{await model.loadModel([new Blob([bytes])],{n_ctx:2048,n_batch:128,n_ubatch:128,n_threads:1,n_gpu_layers:0,seed:1,warmup:false,reasoning:false});if(closed)throw Error('Local cleanup session closed.');loaded=true;}catch(error){await model.exit().catch(()=>{});if(runtime===model)runtime=null;throw error;}});},
    async cleanup(text,{signal}={}){
      if(!loaded||closed)throw Error('Load the bundled cleanup model first.');if(busy)throw Error('Local cleanup is already running.');if(typeof text!=='string'||!text.trim()||text.length>12000)throw Error('Clean up a voice draft of 1–12,000 characters.');
      if(signal?.aborted)throw Error('Cleanup cancelled.');busy=true;
      const abort=()=>close();signal?.addEventListener('abort',abort,{once:true});
      try{return await bounded(async()=>{
        // Small conservative chunks fit the fixed context; no document or conversation history is supplied.
        const chunks=text.match(/[\s\S]{1,600}(?:\s|$)|[\s\S]{1,600}/g)||[];const output=[];
        for(const chunk of chunks){if(closed||signal?.aborted)throw Error('Cleanup cancelled.');const response=await runtime.createChatCompletion({messages:[{role:'system',content:CLEANUP_SYSTEM},{role:'user',content:chunk.trim()}],temperature:0,max_tokens:512,cache_prompt:false,abortSignal:signal,response_format:{type:'text'}});const choice=response?.choices?.[0];if(choice?.finish_reason!=='stop'||choice.message?.tool_calls?.length||typeof choice?.message?.content!=='string')throw Error('Local cleanup did not finish. The original transcript is retained.');output.push(validateCleanup(choice.message.content.trim(),chunk));}
        return [{label:'Local cleanup',jot:validateCleanup(output.join('\n\n'),text)}];
      });}finally{busy=false;signal?.removeEventListener('abort',abort);}
    },close
  };
}
