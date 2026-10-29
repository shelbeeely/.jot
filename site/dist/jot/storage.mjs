// Local browser storage, shared by the editor and the separate paper tools.
let opening;
function db(){return opening||=(new Promise((resolve,reject)=>{const req=indexedDB.open('jot-documents-v1',2);req.onupgradeneeded=()=>{for(const s of ['assets','handoff','references'])if(!req.result.objectStoreNames.contains(s))req.result.createObjectStore(s);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Local document storage is blocked by another tab.'));}));}
export async function get(store,key){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(store,'readonly'),r=t.objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function put(store,key,value){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(store,'readwrite');t.objectStore(store).put(value,key);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||new Error('Local save aborted.'));});}
export async function remove(store,key){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(store,'readwrite');t.objectStore(store).delete(key);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}
export async function queueCapture(value){return put('handoff','pending',value);}
