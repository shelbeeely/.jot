// Public model weights only. No microphone audio, transcripts or journal data belong in this database.
export const SPEECH_MODELS = Object.freeze({
  whistle: {name:'Whistle',file:'whistle.cact',bytes:16919407,sha256:'b6e02f048568ac5d01a2042556c658061e699acbc0aa2a1439f52f3d461dffeb',url:'https://huggingface.co/Cactus-Compute/whistle/resolve/741118687e1f008f06d1351a402a731274789790/whistle.cact'},
  needle3: {name:'Needle',file:'needle3.cact',bytes:35335380,sha256:'c9d915eca282ed42d1a09b143b592adb4cc6744ffe2d294adf5cfc5548170c38',url:'https://huggingface.co/Cactus-Compute/needle3/resolve/d6c7d6a2e9655505e0f8e23339356dd1705900eb/needle3.cact'}
});
export async function verifySpeechModel(name, bytes) {
  const model=SPEECH_MODELS[name];
  if(!model || !(bytes instanceof Uint8Array) || bytes.byteLength!==model.bytes)throw Error('This is not the supported '+(model?.name||'speech')+' model. Check the model filename and version.');
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  if([...digest].map(n=>n.toString(16).padStart(2,'0')).join('')!==model.sha256)throw Error('Model integrity check failed. Download or import the pinned model again.');
  return bytes;
}
export async function downloadSpeechModel(name,{signal,progress=()=>{},fetcher=fetch}={}) {
  const model=SPEECH_MODELS[name];if(!model)throw Error('Unknown model.');
  const response=await fetcher(model.url,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
  if(!response.ok)throw Error('Model download failed (HTTP '+response.status+'). You can import the model file instead.');
  const reader=response.body.getReader(),bytes=new Uint8Array(model.bytes);let offset=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;if(offset+value.length>bytes.length)throw Error('Model download exceeds the expected size.');bytes.set(value,offset);offset+=value.length;progress(offset,bytes.length);}}finally{await reader.cancel().catch(()=>{});}
  return verifySpeechModel(name,bytes.subarray(0,offset));
}
export async function speechModelCache(action,name,bytes) {
  if(!globalThis.indexedDB)throw Error('Model storage is unavailable. Use session-only model loading.');
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('jot-public-speech-models',1);request.onupgradeneeded=()=>request.result.createObjectStore('models');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Could not open model storage.'));});
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction('models',action==='get'?'readonly':'readwrite'),store=tx.objectStore('models');let result;
    const req=action==='get'?store.get(name):action==='put'?store.put(bytes,name):store.clear();req.onsuccess=()=>{result=req.result;};
    tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(Error('Could not update model storage. Use session-only loading or free device storage.'));
  });}finally{db.close();}
}
