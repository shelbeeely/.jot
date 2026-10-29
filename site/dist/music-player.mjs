import { spotifyURL } from './jot/jot.mjs';
// A workspace companion: no journal access, tokens, SDK or remote request before Load.
export function spotifyEmbed(value) {
  let url;
  try { url = new URL(spotifyURL(value) || value.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' || url.port || url.username || url.password) return null;
  const match = /^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname);
  return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : null;
}

export function setupMusicPlayer(doc = document) {
  const $ = (id) => doc.getElementById(id);
  const panel = $('musicPlayer'), host = $('musicPlayerFrame'), status = $('musicPlayerStatus');
  const clear = () => { host.replaceChildren(); $('musicPlayerLink').hidden = true; };
  $('musicPlayerBtn').onclick = () => {
    panel.hidden = false;
    if (!host.childElementCount) $('musicPlayerSettings').open = true;
    panel.scrollIntoView({ block: 'nearest' });
    (host.childElementCount ? $('musicPlayerClose') : $('musicPlayerURL')).focus();
  };
  $('musicPlayerForm').onsubmit = (event) => {
    event.preventDefault();
    const embed = spotifyEmbed($('musicPlayerURL').value);
    if (!embed) {
      status.textContent = 'Use a Spotify share link for a track, album, playlist, artist, episode or show.';
      $('musicPlayerURL').setAttribute('aria-invalid', 'true');
      $('musicPlayerURL').focus(); return;
    }
    $('musicPlayerURL').removeAttribute('aria-invalid');
    clear();
    const frame = doc.createElement('iframe');
    frame.title = 'Spotify music player'; frame.src = embed;
    frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    frame.referrerPolicy = 'no-referrer';
    host.append(frame);
    const link = $('musicPlayerLink');
    link.href = embed.replace('/embed/', '/'); link.hidden = false;
    $('musicPlayerSettings').open = false;
    status.textContent = 'Press play in Spotify. If playback is unavailable here, open it in Spotify.';
    $('musicPlayerClose').focus();
  };
  $('musicPlayerURL').oninput = () => $('musicPlayerURL').removeAttribute('aria-invalid');
  $('musicPlayerClose').onclick = () => {
    clear(); panel.hidden = true; status.textContent = 'Player closed.';
    const button = $('musicPlayerBtn');
    (button.getClientRects().length ? button : $('writing')).focus();
  };
  doc.defaultView.addEventListener('pagehide', clear);
}
