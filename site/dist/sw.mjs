import { VERSION, FILES } from './offline-files.mjs';
import { enqueue } from './inbox.mjs';
const scope = new URL('./', import.meta.url), cacheName = 'jot-app-' + VERSION;
const allowed = new Set(FILES.map(path => new URL(path, scope).href));
self.addEventListener('install', event => { event.waitUntil((async () => { const cache = await caches.open(cacheName); try { await cache.addAll([...allowed]); } catch (error) { await caches.delete(cacheName); throw error; } })()); });
// No skipWaiting or clients.claim: old open tabs keep a consistent application version until closed.
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
