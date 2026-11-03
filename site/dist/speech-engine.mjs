export function createSpeechEngine({WorkerClass=globalThis.Worker}={}) {
  if(!WorkerClass)throw Error('This browser cannot run local speech workers.');
  const worker=new WorkerClass(new URL('./speech-worker.js',import.meta.url));let counter=0,closed=false;
  const pending=new Map();
  function fail(message){for(const {reject,timer} of pending.values()){clearTimeout(timer);reject(Error(message));}pending.clear();}
  worker.onmessage=({data})=>{const request=pending.get(data.id);if(!request)return;pending.delete(data.id);clearTimeout(request.timer);if(data.error)request.reject(Error(data.error));else request.resolve(data.result);};
  worker.onerror=()=>{closed=true;worker.terminate();fail('The local speech engine stopped. Close and reopen voice writing to try again.');};
  return {call(op,data={},transfer=[]){if(closed)return Promise.reject(Error('Local speech session closed.'));return new Promise((resolve,reject)=>{const id=++counter,timer=setTimeout(()=>{closed=true;worker.terminate();fail('Local inference took too long. Your reviewed journal has not changed.');},120000);pending.set(id,{resolve,reject,timer});try{worker.postMessage({id,op,...data},transfer);}catch{pending.delete(id);clearTimeout(timer);reject(Error('Could not send data to the local speech worker.'));}});},close(){closed=true;worker.terminate();fail('Local speech session closed.');}};
}
