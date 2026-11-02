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
