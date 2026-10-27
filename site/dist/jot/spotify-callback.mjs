// Same-origin, state-bound delivery also works when browser isolation removes the popup's opener.
const params = new URLSearchParams(location.search);
const result = { type: 'jot-spotify-return', code: params.get('code') || '', state: params.get('state') || '', error: params.get('error') || '' };
history.replaceState(null, '', location.pathname);
if (result.state && /^[a-f0-9]{48}$/.test(result.state)) {
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('jot-spotify-' + result.state) : null;
  channel?.postMessage(result);
  try { window.opener?.postMessage(result, location.origin); } catch { /* the same-origin channel is available */ }
  document.getElementById('callbackStatus').textContent = 'Return to your writer to finish. You can close this window.';
  setTimeout(() => { channel?.close(); window.close(); }, 100);
} else document.getElementById('callbackStatus').textContent = 'Open Write and choose Listening → Connect Spotify to start sign-in.';
