// Optional capture tools; the result is ordinary Jot/Markdown, with no service dependency in the document.
export const SPOTIFY_SCOPE = 'user-read-currently-playing';
const one = (s, max = 300) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
const prose = (s) => String(s).replace(/[\\`*_{}\[\]()#>!|~+^=<>:.\-]/g, '\\$&');
export function musicURL(value) {
  if (!String(value || '').trim()) return '';
  let url; try { url = new URL(String(value).trim()); } catch { throw new Error('Enter a full HTTPS song link.'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS song link without login details.');
  return url.href.replace(/[()<>\\\[\]]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}
export function serviceName(url) {
  if (!url) return 'track'; const host = new URL(url).hostname;
  return host === 'open.spotify.com' ? 'Spotify' : ['music.youtube.com', 'youtube.com', 'www.youtube.com', 'youtu.be'].includes(host) ? 'YouTube Music' : 'track';
}
export function listeningNote({ title, artist = '', album = '', url = '', notes = '', capturedAt = new Date().toISOString(), paused = false, source = '', playbackState = '', listenedAt = '' }) {
  title = one(title); if (!title) throw new Error('Add a song or episode title first.');
  const link = musicURL(url), at = new Date(capturedAt);
  if (!Number.isFinite(at.getTime())) throw new Error('The capture time is invalid.');
  const lines = ['#### Listening', '', `“${prose(title)}”${one(artist) ? ' — ' + prose(one(artist)) : ''}`, ''];
  if (one(album)) lines.push(`Album / show: ${prose(one(album))}`, '');
  if (link) { const service = serviceName(link); lines.push(`[${service === 'track' ? 'Open track' : 'Open in ' + service}](${link})`, ''); }
  lines.push(`Captured: ${at.toISOString()}${paused ? ' (playback paused)' : ''}`, '');
  if (['Last.fm', 'ListenBrainz'].includes(source)) {
    lines.push(`Source: ${source}${playbackState === 'now' ? ' (reported playing now)' : ' (recently played)'}`, '');
    if (listenedAt && Number.isFinite(new Date(listenedAt).getTime())) lines.push(`Listened: ${new Date(listenedAt).toISOString()}`, '');
  }
  const context = String(notes).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, 2000).trim();
  if (context) lines.push(context.split('\n').map(prose).join('\n'), '');
  return lines.join('\n');
}
export function spotifyTrack(data, capturedAt = new Date().toISOString()) {
  const item = data?.item;
  if (!item || !['track', 'episode'].includes(item.type) || !one(item.name)) return null;
  const url = musicURL(item.external_urls?.spotify || '');
  if (url && new URL(url).hostname !== 'open.spotify.com') throw new Error('Spotify returned an unexpected track link.');
  return { title: one(item.name), artist: item.type === 'episode' ? one(item.show?.publisher || item.show?.name) : (item.artists || []).map((a) => one(a.name)).filter(Boolean).join(', '),
    album: one(item.album?.name || item.show?.name), url, capturedAt, paused: data.is_playing !== true };
}
// Public listening reads only: no scrobble submissions, passwords or account tokens.
export function scrobbledTrack(item, provider, mode, capturedAt = new Date().toISOString()) {
  const lb = provider === 'listenbrainz', metadata = lb ? item?.track_metadata : item;
  if (!metadata || !one(lb ? metadata.track_name : metadata.name)) return null;
  const timestamp = Number(lb ? item.listened_at : item.date?.uts);
  const isNow = lb ? mode === 'now' : item['@attr']?.nowplaying === 'true';
  if (mode === 'now' && !isNow) return null;
  const extra = metadata.additional_info || {};
  let url = lb ? extra.origin_url || '' : metadata.url || '';
  // Broken or unsafe service metadata should not prevent a readable note.
  try { url = musicURL(url); } catch { url = ''; }
  return { title: one(lb ? metadata.track_name : metadata.name),
    artist: one(lb ? metadata.artist_name : typeof metadata.artist === 'string' ? metadata.artist : metadata.artist?.['#text']),
    album: one(lb ? metadata.release_name : metadata.album?.['#text']), url, capturedAt, paused: false,
    source: lb ? 'ListenBrainz' : 'Last.fm', playbackState: isNow ? 'now' : 'recent',
    listenedAt: !isNow && timestamp > 0 && Number.isFinite(new Date(timestamp * 1000).getTime()) ? new Date(timestamp * 1000).toISOString() : '' };
}
export function createScrobbleClient({ fetchImpl = (...a) => fetch(...a), now = () => Date.now() } = {}) {
  let nextRequest = 0;
  return { async read({ provider, username, apiKey = '', mode = 'now' }) {
    if (!['lastfm', 'listenbrainz'].includes(provider) || !['now', 'recent'].includes(mode)) throw new Error('Choose a supported service and listening option.');
    username = String(username || '').trim();
    if (!username || username.length > 100 || /[\s/\\?#\u0000-\u001f]/.test(username)) throw new Error('Enter your service username, rather than a profile URL.');
    if (provider === 'lastfm' && !/^[a-f0-9]{32}$/i.test(apiKey)) throw new Error('Enter your Last.fm application API key. No shared secret is needed.');
    if (now() < nextRequest) throw new Error('Please wait a moment before fetching again.');
    nextRequest = now() + 1100;
    const url = provider === 'lastfm' ? new URL('https://ws.audioscrobbler.com/2.0/') : new URL(`https://api.listenbrainz.org/1/user/${encodeURIComponent(username)}/${mode === 'now' ? 'playing-now' : 'listens'}`);
    if (provider === 'lastfm') url.search = new URLSearchParams({ method: 'user.getrecenttracks', user: username, api_key: apiKey, format: 'json', limit: mode === 'now' ? '1' : '10' });
    else if (mode === 'recent') url.searchParams.set('count', '10');
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetchImpl(url.href, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
      if (response.status === 429) {
        const seconds = Math.max(1, Math.min(3600, Number(response.headers.get('Retry-After') || response.headers.get('X-RateLimit-Reset-In')) || 30));
        nextRequest = now() + seconds * 1000;
        throw new Error('This service is limiting requests. Wait before trying again.');
      }
      if (response.status === 404) throw new Error('That username was not found. Check the selected service and username.');
      if (!response.ok) throw new Error('Could not read listening activity. Check that the profile is public, or enter the song yourself.');
      const data = await response.json();
      if (Number(data.error) === 29) { nextRequest = now() + 30000; throw new Error('Last.fm is limiting requests. Wait before trying again.'); }
      if (data.error) throw new Error(Number(data.error) === 10 || Number(data.error) === 26 ? 'Last.fm rejected this API key. Check your application settings.' : 'Last.fm could not read this profile. Check the username and profile visibility.');
      const raw = provider === 'lastfm' ? data.recenttracks?.track : data.payload?.listens;
      const items = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];
      return items.slice(0, 11).map(item => scrobbledTrack(item, provider, mode, new Date(now()).toISOString())).filter(Boolean);
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The music service took too long. Try again or enter a song yourself.');
      if (error instanceof TypeError) throw new Error('Could not reach the music service from this browser. Check your connection or enter a song yourself.');
      throw error;
    } finally { clearTimeout(timeout); }
  } };
}

export async function pkcePair(cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle) throw new Error('Spotify sign-in needs HTTPS or a secure loopback page.');
  const random = (n) => [...cryptoImpl.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const verifier = random(48), state = random(24);
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, state, challenge };
}
export function spotifyAuthorization({ clientId, redirectUri, state, challenge }) {
  if (!/^[a-z0-9]{32}$/i.test(clientId || '')) throw new Error('Enter the public Client ID from your Spotify developer app.');
  const uri = new URL(redirectUri);
  if (uri.protocol !== 'https:' && !(uri.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(uri.hostname))) throw new Error('Spotify needs HTTPS or an explicit loopback IP; localhost redirects are not supported.');
  const url = new URL('https://accounts.spotify.com/authorize');
  url.search = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: uri.href, scope: SPOTIFY_SCOPE, state, code_challenge_method: 'S256', code_challenge: challenge });
  return url.href;
}
export function createSpotifyClient({ fetchImpl = (...a) => fetch(...a), now = () => Date.now() } = {}) {
  let tokens = null, clientId = '', generation = 0;
  async function tokenRequest(fields, version = generation) {
    const response = await fetchImpl('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields), credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('Spotify sign-in expired or could not finish. Connect again.');
    const data = await response.json();
    if (version !== generation) throw new Error('Spotify connection was cancelled.');
    if (typeof data.access_token !== 'string' || !data.access_token || (data.scope !== undefined && (typeof data.scope !== 'string' || !data.scope.split(' ').includes(SPOTIFY_SCOPE)))) throw new Error('Spotify did not grant access to currently playing information.');
    tokens = { access: data.access_token, refresh: data.refresh_token || tokens?.refresh || '', expires: now() + Math.max(1, Number(data.expires_in) || 3600) * 1000 };
  }
  const disconnect = () => { generation++; tokens = null; clientId = ''; };
  const refresh = async () => {
    if (!tokens?.refresh) { disconnect(); throw new Error('Connect Spotify again to fetch the current song.'); }
    const version = generation;
    try { await tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refresh, client_id: clientId }, version); } catch (e) { if (version === generation) disconnect(); throw e; }
  };
  return {
    connected: () => !!tokens,
    disconnect,
    async connect({ code, verifier, redirectUri, id }) {
      const version = ++generation; tokens = null; clientId = id;
      await tokenRequest({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: redirectUri, client_id: id }, version);
    },
    async current() {
      if (!tokens) throw new Error('Connect Spotify first, or fill in the song yourself.');
      if (tokens.expires <= now() + 10000) await refresh();
      const request = () => fetchImpl('https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode', { headers: { Authorization: 'Bearer ' + tokens.access }, credentials: 'omit', referrerPolicy: 'no-referrer' });
      let response = await request();
      if (response.status === 401) { await refresh(); response = await request(); }
      if (response.status === 401) { disconnect(); throw new Error('Spotify permission expired. Connect Spotify again.'); }
      if (response.status === 204) return null;
      if (response.status === 403) throw new Error('Spotify denied access. Check your app’s allowed users and current developer-mode requirements.');
      if (response.status === 429) throw new Error('Spotify is limiting requests. Try again later.');
      if (!response.ok) throw new Error('Could not read Spotify playback. Try again or enter the song yourself.');
      return spotifyTrack(await response.json(), new Date(now()).toISOString());
    },
  };
}

export function setupMusicCapture({ insert }) {
  const $ = (id) => document.getElementById(id), dialog = $('musicDialog'), client = createSpotifyClient(), scrobbler = createScrobbleClient();
  const redirectUri = new URL('../write/spotify-callback.html', import.meta.url).href;
  $('spotifyRedirect').value = redirectUri;
  try { $('spotifyClient').value = localStorage.getItem('jot-spotify-client-id') || ''; } catch { /* manual capture still works */ }
  let pending = null, fetchVersion = 0, capturedAt = '', paused = false, provenance = {}, results = [];
  try { $('scrobbleUser').value = localStorage.getItem('jot-scrobble-user-' + $('scrobbleService').value) || ''; } catch {}
  const say = (text) => { $('musicStatus').textContent = text; };
  const connectionUI = () => { $('spotifyDisconnect').hidden = !client.connected(); $('spotifyFetch').disabled = !client.connected() || !!pending; $('spotifyConnect').disabled = !!pending; $('spotifyCancel').hidden = !pending; };
  function cancelSignIn() { if (pending) { clearInterval(pending.watch); pending.channel?.close(); try { pending.popup?.close(); } catch {} pending = null; client.disconnect(); } }
  let configLoaded = false;
  $('musicBtn').onclick = async () => {
    dialog.showModal(); connectionUI(); if (!capturedAt) capturedAt = new Date().toISOString();
    if (configLoaded || $('spotifyClient').value) return;
    configLoaded = true; $('spotifyConnect').disabled = true;
    try {
      const response = await fetch(new URL('./spotify-config.json', import.meta.url));
      if (response.ok) { const config = await response.json(); if (/^[a-z0-9]{32}$/i.test(config.clientId || '') && !$('spotifyClient').value) $('spotifyClient').value = config.clientId; }
    } catch { /* optional host configuration; manual notes and individual client ids still work */ }
    finally { $('spotifyConnect').disabled = false; }
  };
  $('musicClose').onclick = () => dialog.close();
  dialog.addEventListener('close', () => { fetchVersion++; $('scrobbleFetch').disabled = false; cancelSignIn(); $('spotifyConnect').disabled = false; $('spotifyFetch').disabled = !client.connected(); });
  $('spotifyConnect').onclick = async () => {
    resetScrobbleResults();
    const id = $('spotifyClient').value.trim();
    if (!/^[a-z0-9]{32}$/i.test(id)) { $('spotifySetup').open = true; say('Enter your Spotify app’s public Client ID in connection settings. You can also enter a song manually.'); $('spotifyClient').focus(); return; }
    fetchVersion++; cancelSignIn();
    const popup = window.open('about:blank', 'jot-spotify-sign-in', 'popup,width=520,height=720');
    if (!popup) { say('Allow the Spotify sign-in window, then try Connect Spotify again.'); return; }
    $('spotifyConnect').disabled = true;
    const ticket = { popup, returned: false }; pending = ticket; connectionUI();
    try {
      const pair = await pkcePair(); if (pending !== ticket) { popup.close(); return; }
      Object.assign(ticket, pair, { id });
      if (typeof BroadcastChannel !== 'undefined') { ticket.channel = new BroadcastChannel('jot-spotify-' + pair.state); ticket.channel.onmessage = (event) => finishSignIn(ticket, event.data); }
      const url = spotifyAuthorization({ clientId: id, redirectUri, state: pair.state, challenge: pair.challenge });
      try { localStorage.setItem('jot-spotify-client-id', id); } catch { /* public id only */ }
      popup.location.href = url; const started = Date.now();
      ticket.watch = setInterval(() => {
        if (pending !== ticket || ticket.returned) return;
        if (Date.now() - started > 300000) { cancelSignIn(); $('spotifyConnect').disabled = false; say('Spotify sign-in timed out. Your journal is unchanged.'); }
      }, 500);
      say('Finish signing in with Spotify in the new window. Your journal is not sent to Spotify.');
    } catch (e) { cancelSignIn(); $('spotifyConnect').disabled = false; say(e.message); }
  };
  async function finishSignIn(p, message) {
    if (!p || pending !== p || message?.type !== 'jot-spotify-return' || message.state !== p.state || p.returned) return;
    p.returned = true; clearInterval(p.watch);
    try {
      if (message.error || typeof message.code !== 'string' || !message.code) throw new Error('Spotify sign-in was not completed. You can still enter a song yourself.');
      await client.connect({ code: message.code, verifier: p.verifier, redirectUri, id: p.id });
      if (pending !== p) return;
      say('Connected for this page session. Choose Fetch currently playing to review a song.');
    } catch (e) { if (pending === p) { client.disconnect(); say(e.message); } }
    finally { if (pending === p) { pending = null; p.channel?.close(); try { p.popup?.close(); } catch {} $('spotifyConnect').disabled = false; connectionUI(); } }
  }
  window.addEventListener('message', (event) => {
    if (event.origin === location.origin && pending && event.source === pending.popup) finishSignIn(pending, event.data);
  });
  $('spotifyCancel').onclick = () => { cancelSignIn(); connectionUI(); say('Sign-in cancelled. Your journal is unchanged.'); };
  $('spotifyDisconnect').onclick = () => { fetchVersion++; cancelSignIn(); client.disconnect(); connectionUI(); say('Disconnected. Existing listening notes stay in your journal.'); };
  $('spotifyFetch').onclick = async () => {
    resetScrobbleResults();
    const version = ++fetchVersion; $('spotifyFetch').disabled = true; say('Reading currently playing information from Spotify…');
    try {
      const song = await client.current(); if (version !== fetchVersion || !dialog.open) return;
      if (!song) { say('No song is currently available. Start playback in Spotify and try again, or enter a song yourself.'); return; }
      $('musicTitle').value = song.title; $('musicArtist').value = song.artist; $('musicAlbum').value = song.album; $('musicURL').value = song.url;
      capturedAt = song.capturedAt; paused = song.paused; provenance = {}; $('scrobbleResults').hidden = true;
      say(paused ? 'Spotify playback is paused. Review the details; the note will say it was paused.' : 'Song fetched. Add setting notes, review the details, then add it to your entry.');
    } catch (e) { if (version === fetchVersion && dialog.open) say(e.message); }
    finally { if (version === fetchVersion) connectionUI(); }
  };
  function resetScrobbleResults() { fetchVersion++; results = []; $('scrobbleResults').hidden = true; $('scrobbleFetch').disabled = false; connectionUI(); }
  $('scrobbleService').onchange = () => {
    resetScrobbleResults(); $('lastfmKeyField').hidden = $('scrobbleService').value !== 'lastfm';
    try { $('scrobbleUser').value = localStorage.getItem('jot-scrobble-user-' + $('scrobbleService').value) || ''; } catch { $('scrobbleUser').value = ''; }
  };
  for (const id of ['scrobbleUser', 'lastfmKey', 'scrobbleMode']) $(id).addEventListener('input', resetScrobbleResults);
  function chooseScrobble() {
    const song = results[Number($('scrobbleTrack').value)]; if (!song) return;
    for (const [id, field] of [['musicTitle','title'], ['musicArtist','artist'], ['musicAlbum','album'], ['musicURL','url']]) $(id).value = song[field];
    capturedAt = song.capturedAt; paused = false; provenance = { source: song.source, playbackState: song.playbackState, listenedAt: song.listenedAt };
    say(song.playbackState === 'now' ? 'Reported playing now. Review the details before adding.' : 'Recently played, not confirmed playing now. Review the details before adding.');
  }
  $('scrobbleTrack').onchange = chooseScrobble;
  $('scrobbleFetch').onclick = async () => {
    const version = ++fetchVersion; $('scrobbleFetch').disabled = true; $('scrobbleResults').hidden = true; connectionUI();
    say('Reading your requested listening activity…');
    const provider = $('scrobbleService').value, username = $('scrobbleUser').value.trim();
    try {
      const songs = await scrobbler.read({ provider, username, apiKey: $('lastfmKey').value.trim(), mode: $('scrobbleMode').value });
      if (version !== fetchVersion || !dialog.open) return;
      try { localStorage.setItem('jot-scrobble-user-' + provider, username); } catch {}
      results = songs;
      if (!songs.length) { say('No matching listening activity was reported. Try Recent tracks, check your scrobbler, or enter a song yourself.'); return; }
      $('scrobbleTrack').replaceChildren(...songs.map((song, i) => { const option = document.createElement('option'); option.value = String(i); option.textContent = `${song.title} — ${song.artist}${song.playbackState === 'now' ? ' · playing now' : song.listenedAt ? ' · ' + new Date(song.listenedAt).toLocaleString() : ' · recently played'}`; return option; }));
      $('scrobbleResults').hidden = false; chooseScrobble();
    } catch (e) { if (version === fetchVersion && dialog.open) say(e.message); }
    finally { if (version === fetchVersion) $('scrobbleFetch').disabled = false; }
  };
  for (const id of ['musicTitle', 'musicArtist', 'musicAlbum', 'musicURL']) $(id).addEventListener('input', () => { resetScrobbleResults(); paused = false; provenance = {}; capturedAt = new Date().toISOString(); });
  $('musicAdd').onclick = () => {
    try {
      const note = listeningNote({ title: $('musicTitle').value, artist: $('musicArtist').value, album: $('musicAlbum').value, url: $('musicURL').value, notes: $('musicNotes').value, capturedAt: capturedAt || new Date().toISOString(), paused, ...provenance });
      dialog.close(); insert(note);
      for (const id of ['musicTitle', 'musicArtist', 'musicAlbum', 'musicURL', 'musicNotes']) $(id).value = '';
      capturedAt = ''; paused = false; provenance = {}; $('scrobbleResults').hidden = true; say('Enter a song yourself, or connect Spotify to fetch currently playing information.');
    } catch (e) { say(e.message); }
  };
  connectionUI();
}
