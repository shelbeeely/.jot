// Optional browser capabilities. No journal content enters the application cache.
export function setupWakeLock({ isLocked = () => false, changed = () => {}, navigator: nav = navigator, document: doc = document } = {}) {
  let wanted = false, sentinel = null, pending = false, generation = 0;
  const release = async () => { generation++; const held = sentinel; sentinel = null; if (held) await held.release().catch(() => {}); };
  const acquire = async () => {
    if (!wanted || isLocked() || doc.visibilityState !== 'visible' || sentinel || pending) return;
    const ticket = generation; pending = true;
    try {
      const held = await nav.wakeLock.request('screen');
      if (ticket !== generation || !wanted || isLocked() || doc.visibilityState !== 'visible') { await held.release(); return; }
      sentinel = held; held.addEventListener('release', () => { if (sentinel === held) { sentinel = null; changed('Screen wake lock released by the browser.'); } }); changed('Screen will stay awake while Writer is visible.');
    } catch { changed('The browser could not keep the screen awake. Writing still works.'); } finally { pending = false; if(ticket !== generation && wanted) acquire(); }
  };
  const visibility = () => { if (doc.visibilityState === 'visible') acquire(); else release(); };
  doc.addEventListener('visibilitychange', visibility);
  const reset = () => { wanted = false; release(); };
  globalThis.addEventListener?.('pagehide', reset);
  return { supported: !!nav.wakeLock?.request, async enable(value) { wanted = !!value; if (wanted && nav.wakeLock?.request) await acquire(); else await release(); }, reset };
}
export async function setupOffline({ changed = () => {}, updateReady = () => {} } = {}) {
  if (globalThis.jotDesktop || !globalThis.isSecureContext || !('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.register(new URL('./sw.mjs', import.meta.url), { type: 'module', updateViaCache: 'none', scope: new URL('./', import.meta.url).pathname });
  const shareManifest = () => { if(navigator.serviceWorker.controller) { const link=document.querySelector('link[rel=manifest]'); if(link)link.href=new URL('./manifest-share.webmanifest',import.meta.url).href; } };
  navigator.serviceWorker.addEventListener('controllerchange',shareManifest); shareManifest();
  const report = () => { shareManifest(); if (registration.waiting) changed('An offline update is ready. Save your work, close all Jot tabs and reopen to update.'); else if (registration.active) changed('Offline application files are ready. Keep downloading journal backups.'); };
  const watch = worker => worker?.addEventListener('statechange', report);
  watch(registration.installing); registration.addEventListener('updatefound', () => watch(registration.installing));
  // A newer Writer is waiting: offer it in one step instead of "close every tab", which is hard on a phone or a home-screen app.
  let applying = false, offered = false;
  const apply = () => { if (!registration.waiting) return; applying = true; registration.waiting.postMessage('jot-update-now'); };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (applying) location.reload(); else updateReady(null); });
  const offer = () => { if (registration.waiting && navigator.serviceWorker.controller && !offered) { offered = true; updateReady(apply); } };
  const offerWhenInstalled = worker => worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offer(); });
  offerWhenInstalled(registration.installing); registration.addEventListener('updatefound', () => offerWhenInstalled(registration.installing));
  offer();
  // Check for a newer version when the page comes back into view, not only on a fresh load.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) registration.update().catch(() => {}); });
  report(); return registration;
}
