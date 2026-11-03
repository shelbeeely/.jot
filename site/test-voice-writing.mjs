import test from 'node:test';
import assert from 'node:assert/strict';
import {createResampler} from './dist/speech-capture.mjs';
import {liveTranscript,organizedJot} from './dist/voice-writing-core.mjs';
import {SPEECH_MODELS,verifySpeechModel,downloadSpeechModel} from './dist/speech-models.mjs';
import {createSpeechEngine} from './dist/speech-engine.mjs';
test('hardware resampling preserves phase across irregular blocks and bounds PCM',()=>{
 for(const rate of [16000,44100,48000]){
  const input=Float32Array.from({length:rate},(_,i)=>Math.sin(2*Math.PI*220*i/rate)*0.8),whole=createResampler(rate)(input),stream=createResampler(rate),pieces=[];
  for(let i=0;i<input.length;i+=137)pieces.push(...stream(input.subarray(i,i+137)));
  assert.equal(pieces.length,whole.length);assert.ok(Math.abs(pieces.length-16000)<=1);for(let i=0;i<pieces.length;i++)assert.ok(Math.abs(pieces[i]-whole[i])<0.00001);
 }
 assert.throws(()=>createResampler(0));assert.ok(createResampler(16000)(Float32Array.of(3,3,3)).every(n=>n<=1));
});
test('live speech keeps the unstable tail separate and commits deltas only once',()=>{
 let r=liveTranscript('',{text:'Today',pending:'I walked'});assert.equal(r.committed,'Today');r=liveTranscript(r.committed,{text:'I walked.',pending:''});assert.equal(r.committed,'Today I walked.');assert.throws(()=>liveTranscript('',{text:'x'}));assert.throws(()=>liveTranscript('x'.repeat(24000),{text:'more',pending:''}));
});
test('Needle proposals are passive validated writing, including withheld proposals for review',()=>{
 const call={name:'organize_journal',arguments:{notes:['A quiet walk.'],tasks:['Call Sam'],tags:['outdoors']}};
 assert.equal(organizedJot({function_calls:[call]}),'A quiet walk.\n\n[ ] Call Sam\n\n#outdoors');assert.equal(organizedJot({function_calls:[],suppressed_calls:[call]}),'A quiet walk.\n\n[ ] Call Sam\n\n#outdoors');
 for(const response of [{function_calls:[]},{function_calls:[{name:'delete_file',arguments:{}}]},{function_calls:[{...call,arguments:{...call.arguments,notes:['<script>bad</script>']}}]},{function_calls:[{...call,arguments:{...call.arguments,extra:true}}]}])assert.throws(()=>organizedJot(response));
});
test('models are pinned and invalid or oversized downloads never load',async()=>{
 assert.equal(SPEECH_MODELS.whistle.bytes,16919407);await assert.rejects(verifySpeechModel('unknown',new Uint8Array()),/supported/);await assert.rejects(verifySpeechModel('whistle',new Uint8Array(SPEECH_MODELS.whistle.bytes)),/integrity/);
 await assert.rejects(downloadSpeechModel('whistle',{fetcher:async()=>new Response(new Uint8Array(SPEECH_MODELS.whistle.bytes+1))}),/expected size/);
 await assert.rejects(downloadSpeechModel('whistle',{fetcher:async(url,opts)=>{assert.equal(opts.credentials,'omit');assert.equal(opts.referrerPolicy,'no-referrer');return new Response('',{status:403});}}),/HTTP 403/);
});
test('closing an inference worker rejects pending work and ignores late output',async()=>{
 let worker;class FakeWorker{constructor(){worker=this;}postMessage(data){this.data=data;}terminate(){this.ended=true;}}
 const engine=createSpeechEngine({WorkerClass:FakeWorker}),result=engine.call('process',{pcm:new ArrayBuffer(4)});engine.close();await assert.rejects(result,/closed/);assert.equal(worker.ended,true);worker.onmessage({data:{id:worker.data.id,result:{text:'late'}}});await assert.rejects(engine.call('stop'),/closed/);
});

// The backend boundary owns model-specific calls; document/source validation stays outside it.
const {createVoiceBackend}=await import('./dist/voice-backend.mjs');
const {createLocalCleanup,validateCleanup}=await import('./dist/voice-cleanup.mjs');
test('voice adapter routes live chunks, final flush, organization and embedded cleanup without remote fallback',async()=>{
 const calls=[];let ended=0;const backend=createVoiceBackend({speechFactory:()=>({call:async(op,data)=>{calls.push({op,data});return {text:'hello',pending:''};},close(){ended++;}}),cleanupFactory:()=>({load:async bytes=>calls.push({modelBytes:bytes.length}),cleanup:async text=>[{label:'Local',jot:text}],close(){ended++;}}),remoteCleanup:()=>{throw Error('Unexpected cloud fallback');}});
 await backend.load('whistle',new Uint8Array(4));await backend.load('cleanup',new Uint8Array(8));await backend.transcribe(new Float32Array(16000),{language:'en'});await backend.finish();await backend.organize('hello');assert.deepEqual(await backend.cleanup('Hello.','',{provider:'embedded'}),[{label:'Local',jot:'Hello.'}]);assert.deepEqual(calls.filter(c=>c.op).map(c=>c.op),['load','process','stop','organize']);backend.close();assert.equal(ended,2);await assert.rejects(backend.load('whistle',new Uint8Array()),/closed/);
});
test('the adapter rejects unsupported models and aborts chosen remote cleanup when closed',async()=>{
 let sent;const backend=createVoiceBackend({remoteCleanup:(config,{signal})=>new Promise((resolve,reject)=>{sent=config;signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});})});await assert.rejects(backend.load('other',new Uint8Array()),/Unknown/);const pending=backend.cleanup('Only these words.','[ ] Task',{provider:'local',base:'http://127.0.0.1/v1'});backend.close();await assert.rejects(pending,/aborted/);assert.equal(JSON.parse(sent.context).transcript,'Only these words.');
});
test('cleanup guards changed numbers, lost negations and active content without claiming factual verification',()=>{
 assert.equal(validateCleanup('I did not take 20 mg.','i did not take 20 mg'),'I did not take 20 mg.');assert.equal(validateCleanup("I didn't take 20 mg.",'i did not take 20 mg'),"I didn't take 20 mg.");
 for(const [clean,raw] of [['I took 20 mg.','I did not take 20 mg.'],['I took 10 mg.','I took 20 mg.'],['<script>bad</script>','words']])assert.throws(()=>validateCleanup(clean,raw));
});
test('embedded cleanup uses bounded text output, app validation, local runtime assets and caller-owned text only',async()=>{
 const requests=[];let paths,compat,exits=0;
 class Fake{constructor(p){paths=p;}setCompat(c){compat=c;}async loadModel(blobs,params){assert.equal(blobs[0].size,4);assert.equal(params.n_gpu_layers,0);assert.equal(params.n_threads,1);}async createChatCompletion(request){requests.push(request);return {choices:[{finish_reason:'stop',message:{content:request.messages[1].content.replace(/^um /,'')}}]};}async exit(){exits++;}}
 const cleanup=createLocalCleanup({loadRuntime:async()=>({Wllama:Fake})});await cleanup.load(new Uint8Array(4));assert.match(paths.default,/\/vendor\/wllama\/wllama.wasm$/);assert.match(compat.worker,/\/vendor\/wllama\/compat\/wllama.js$/);assert.equal((await cleanup.cleanup('um I went for a walk.'))[0].jot,'I went for a walk.');assert.equal(requests[0].cache_prompt,false);assert.equal(requests[0].response_format.type,'text');assert.equal(requests[0].messages.length,2);cleanup.close();assert.equal(exits,1);
});
test('cancelling embedded cleanup terminates the model and rejects late generation',async()=>{
 let exits=0;class Fake{setCompat(){}async loadModel(){}createChatCompletion(){return new Promise(()=>{});}async exit(){exits++;}}
 const cleanup=createLocalCleanup({loadRuntime:async()=>({Wllama:Fake})});await cleanup.load(new Uint8Array(4));const controller=new AbortController(),result=cleanup.cleanup('Some words.',{signal:controller.signal});controller.abort();await assert.rejects(result,/closed|cancelled/);assert.equal(exits,1);
});
test('closing during model loading also disposes a runtime that finishes late',async()=>{
 let release,exits=0;class Fake{setCompat(){}loadModel(){return new Promise(resolve=>{release=resolve;});}async exit(){exits++;}}
 const cleanup=createLocalCleanup({loadRuntime:async()=>({Wllama:Fake})}),loading=cleanup.load(new Uint8Array(4));while(!release)await new Promise(resolve=>setImmediate(resolve));cleanup.close();await assert.rejects(loading,/closed/);release();await new Promise(resolve=>setImmediate(resolve));assert.equal(exits,2);
});
