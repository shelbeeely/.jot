// Stateful resampling preserves the phase across hardware input blocks.
export function createResampler(rate,target=16000){
  if(!Number.isFinite(rate)||rate<8000||rate>192000)throw Error('Unsupported microphone sample rate.');
  let previous=new Float32Array(0),position=0;const step=rate/target;
  return input=>{const all=new Float32Array(previous.length+input.length);all.set(previous);all.set(input,previous.length);const out=[];while(position+1<all.length){const i=Math.floor(position),fraction=position-i;out.push(Math.max(-1,Math.min(1,all[i]*(1-fraction)+all[i+1]*fraction)));position+=step;}const consumed=Math.min(Math.floor(position),all.length);previous=all.slice(consumed);position-=consumed;return Float32Array.from(out);};
}
export async function captureSpeech({onSamples,signal,onEnded=()=>{},keepAudio=false}){
  if(!navigator.mediaDevices?.getUserMedia || !globalThis.AudioContext || !globalThis.AudioWorkletNode)throw Error('Live dictation needs a secure browser with microphone and AudioWorklet support.');
  if(keepAudio&&!globalThis.MediaRecorder)throw Error('This browser cannot retain a recording. Turn off audio retention to dictate without recording.');
  let stream,context,source,filter,node,stopped=false,recorder,recorded=[],recordedBytes=0,recordingDone,recordingError,flushResolve;
  const dispose=()=>{node?.disconnect();source?.disconnect();filter?.disconnect();for(const track of stream?.getTracks()||[])track.stop();context?.close().catch(()=>{});signal?.removeEventListener('abort',cancel);};
  const cancel=()=>{if(stopped)return;stopped=true;recorded=[];if(recorder?.state==='recording')recorder.stop();dispose();};
  signal?.addEventListener('abort',cancel,{once:true});
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
    if(stopped||signal?.aborted){for(const t of stream.getTracks())t.stop();throw Error('Microphone start cancelled.');}
    context=new AudioContext();await context.audioWorklet.addModule(new URL('./speech-audio-worklet.mjs',import.meta.url));
    if(stopped||signal?.aborted)throw Error('Microphone start cancelled.');
    const resample=createResampler(context.sampleRate);node=new AudioWorkletNode(context,'jot-speech-input');node.port.onmessage=({data})=>{if(data?.flushed){flushResolve?.();return;}if(!stopped)onSamples(resample(data));};
    if(keepAudio){
      const mimeType=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
      recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
      recordingDone=new Promise(resolve=>recorder.addEventListener('stop',resolve,{once:true}));
      recorder.ondataavailable=event=>{if(stopped||!event.data.size)return;recordedBytes+=event.data.size;if(recordedBytes>24*1024*1024){recordingError=Error('The retained recording reached 24 MiB. Stop and insert this draft before continuing.');onEnded(recordingError);return;}recorded.push(event.data);};
      recorder.onerror=()=>{recordingError=Error('Audio recording failed. The transcript is retained, but the requested recording is incomplete.');onEnded(recordingError);};
      recorder.start(1000);
    }
    for(const track of stream.getTracks())track.addEventListener('ended',()=>{if(!stopped)onEnded();});
    source=context.createMediaStreamSource(stream);filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=7200;filter.Q.value=0.707;source.connect(filter);filter.connect(node);node.connect(context.destination);await context.resume();
    if(stopped||signal?.aborted)throw Error('Microphone start cancelled.');
    return async()=>{
      if(stopped)return null;
      try{
        await new Promise(resolve=>{const timer=setTimeout(resolve,200);flushResolve=()=>{clearTimeout(timer);resolve();};node.port.postMessage('flush');});
        if(recorder?.state==='recording'){recorder.stop();await recordingDone;}
        if(recordingError)throw recordingError;
        return keepAudio?new Blob(recorded,{type:recorder.mimeType}):null;
      }finally{stopped=true;recorded=[];dispose();}
    };
  }catch(e){cancel();if(e.name==='NotAllowedError')throw Error('Microphone permission was not granted. Allow microphone access for Writer in your browser settings to dictate.',{cause:e});if(e.name==='NotFoundError')throw Error('No microphone was found. Connect one and try again.',{cause:e});throw e;}
}
