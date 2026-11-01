/** Protection is part of Jotz v2, not a separate .jotlock file format. */
import * as Keys from './archive-crypto.mjs';
import {pack,readDocument,readArchiveHeader} from './container.mjs';
export {createLock,addWay,removeWay,verifyWay,changePassphrase,newRecoveryCode,normalizeRecoveryCode,LockError,DEFAULT_ITERATIONS,RECOVERY_ITERATIONS,LIMITS} from './archive-crypto.mjs';
export const LOCK_EXTENSION='.jotz';
export function isLocked(input){try{return Array.isArray(readArchiveHeader(input).keys);}catch{return false;}}
export function readHeader(input){const m=readArchiveHeader(input);Keys.validateKeys(m.keys);return {...m,form:'keys'};}
export function waysIn(input){return Keys.waysIn(Array.isArray(input)?input:readHeader(input).keys);}
export async function lock(input,secret,options={}){
  if(isLocked(input))throw new Keys.LockError('already-locked','This archive already contains protected entries.');
  const doc=await readDocument(input),session=Keys.isSession(secret)?secret:(await Keys.createLock(secret,options)).session;
  try{return await pack({source:doc.source,assets:doc.assets,metadata:doc.metadata,entries:doc.entries,secret:session,privateEntries:'all',previous:doc});}finally{doc.index?.close();}
}
export async function unlockSession(input,secret){
  if(!isLocked(input))throw new Keys.LockError('not-locked','This archive has no protected entries.');
  const document=await readDocument(input,{secret});return {document,session:document.session};
}
/** Explicitly export an unprotected .jotz copy. In-app unlocking need not create this copy. */
export async function unlock(input,secret){const {document}=await unlockSession(input,secret);try{return await pack({source:document.source,assets:document.assets,metadata:document.metadata,entries:document.entries.map(e=>({...e,private:false}))});}finally{document.index?.close();}}
export const kindOf=bytes=>bytes.length>=4&&bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4?'jotz':'jot';
export default {...Keys,lock,unlock,unlockSession,isLocked,readHeader,waysIn,LOCK_EXTENSION};
