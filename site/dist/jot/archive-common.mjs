import {localSha256} from './vendor/sha256.mjs';
const encoder=new TextEncoder();
export const LIMITS={packageBytes:64*1024*1024,totalBytes:64*1024*1024,assetBytes:32*1024*1024,sourceBytes:32*1024*1024,manifestBytes:8*1024*1024,catalogBytes:8*1024*1024,entries:12000,entryBytes:1024*1024,indexBytes:16*1024*1024};
export function safePath(path){return typeof path==='string'&&path.length>0&&path.length<=512&&!/^[\/]|[\\:\u0000-\u001f\u007f]/.test(path)&&path.split('/').every(s=>s&&s!=='.'&&s!=='..');}
export async function dataBytes(data){if(data instanceof Uint8Array)return data;if(data instanceof ArrayBuffer)return new Uint8Array(data);if(typeof data==='string')return encoder.encode(data);if(typeof Blob!=='undefined'&&data instanceof Blob)return new Uint8Array(await data.arrayBuffer());throw new TypeError('Use a string, Uint8Array, ArrayBuffer or Blob');}
export async function sha256(data){const b=await dataBytes(data);if(!globalThis.crypto?.subtle)return localSha256(b);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');}
