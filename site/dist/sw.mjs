import { VERSION, FILES } from './offline-files.mjs';
import { enqueue } from './inbox.mjs';
const scope = new URL('./', import.meta.url), cacheName = 'jot-app-' + VERSION;
const allowed = new Set(FILES.map(path => new URL(path, scope).href));
// Versions that can offer "Update now" leave this mark in their cache. An older install without it can only update once
// every Jot tab is closed, which is hard on a phone or from a home-screen app, so a new version replaces it straight away
// (once); after that, updates wait for the person to choose Update now.
const UPDATE_AWARE = new URL('__jot-update-aware', scope).href;
self.addEventListener('install', event => { event.waitUntil((async () => {
  const cache = await caches.open(cacheName);
  try { await cache.addAll([...allowed]); } catch (error) { await caches.delete(cacheName); throw error; }
  await cache.put(UPDATE_AWARE, new Response('1'));
  const older = (await caches.keys()).filter(name => name.startsWith('jot-app-') && name !== cacheName);
  let aware = false;
  for (const name of older) if (await (await caches.open(name)).match(UPDATE_AWARE)) aware = true;
  if (older.length && !aware) await self.skipWaiting();
})()); });
// No automatic skipWaiting or clients.claim: open tabs keep a consistent application version. The person can choose
// Update now, which asks the waiting worker to take over; that tab then reloads straight away (browser-session.mjs).
self.addEventListener('message', event => { if (event.data === 'jot-update-now') self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil((async () => { for (const name of await caches.keys()) if (name.startsWith('jot-app-') && name !== cacheName) await caches.delete(name); })()); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  if (event.request.method === 'POST' && url.pathname === new URL('share/', scope).pathname) {
    event.respondWith((async () => {
      try {
        const length = Number(event.request.headers.get('Content-Length')); if (length > 65 * 1024 * 1024) throw Error('Share up to 64 MiB.');
        // Bound the request even when the platform omits Content-Length.
        const reader = event.request.body.getReader(); let size = 0; const parts = [];
        try { while (true) { const {done,value} = await reader.read(); if (done) break; size += value.length; if (size > 65 * 1024 * 1024) throw Error('Share up to 64 MiB.'); parts.push(value); } } finally { await reader.cancel().catch(() => {}); }
        const form = await new Response(new Blob(parts), {headers:{'Content-Type':event.request.headers.get('Content-Type')}}).formData();
        const text = ['title','text','url'].map(key => form.get(key)).filter(value => typeof value === 'string' && value).join('\n\n');
        const files = form.getAll('files').filter(value => value instanceof Blob && value.size);
        const id = await enqueue({text,files});
        return Response.redirect(new URL('write/?inbox=' + encodeURIComponent(id), scope).href, 303);
      } catch { return new Response('Jot could not keep this share. The content was not added. Return to the sending app, then open Jot and try a smaller share or download the file.', {status:400,headers:{'Content-Type':'text/plain;charset=utf-8','Cache-Control':'no-store'}}); }
    })()); return;
  }
  if (event.request.method !== 'GET') return;
  const exact = new URL(url.href); exact.search = ''; exact.hash = '';
  // Only known public application paths. Never cache arbitrary same-origin files or query-bearing responses.
  if (!allowed.has(exact.href)) return;
  event.respondWith((async () => { const cache = await caches.open(cacheName); const kept = await cache.match(exact.href); return kept || fetch(event.request); })());
});
