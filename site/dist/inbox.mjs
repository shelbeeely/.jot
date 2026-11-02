// Same local inbox in the page and service worker. Never contains account credentials or journal lock keys.
import * as storage from './jot/storage.mjs';
export const INBOX_LIMIT = 64 * 1024 * 1024;
export async function enqueue({ id = crypto.randomUUID(), text = '', files = [], origin = 'share' }) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id) || typeof text !== 'string' || !Array.isArray(files) || files.length > 254 || files.some(f => !(f instanceof Blob))) throw Error('Invalid incoming item.');
  const size = new TextEncoder().encode(text).length + files.reduce((n, f) => n + f.size, 0);
  if (!size || size > INBOX_LIMIT) throw Error('Share up to 64 MiB at a time.');
  const previous = await storage.get('inbox', id);
  if (previous) {
    const sameFiles = previous.files.length === files.length && previous.files.every((file,i)=>file.name===files[i].name&&file.size===files[i].size&&file.type===files[i].type);
    if (previous.text !== text || !sameFiles) throw Error('This incoming ID already identifies different content.');
    for(let i=0;i<files.length;i++) { const left=new Uint8Array(await previous.files[i].arrayBuffer()),right=new Uint8Array(await files[i].arrayBuffer()); if(!left.every((value,index)=>value===right[index]))throw Error('This incoming ID already identifies different content.'); }
    return id;
  }
  await storage.put('inbox', id, { id, text, files, origin, receivedAt: Date.now(), size });
  return id;
}
export const inboxItems = () => storage.all('inbox');
export const inboxItem = id => storage.get('inbox', id);
export const discardItem = id => storage.remove('inbox', id);
