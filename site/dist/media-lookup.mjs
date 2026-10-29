// Explicitly enabled, dedicated search only. Never reads the writing textarea or calls a playback service.
const TYPES = new Map([['recording', 'recordings'], ['release-group', 'release-groups'], ['release', 'releases'], ['work', 'works'], ['artist', 'artists']]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (value, max = 300) => String(value ?? '').replace(/[\u0000-\u001f\u007f|]/g, ' ').trim().slice(0, max);
export function lookupResults(data, type) {
  const rows = data?.[TYPES.get(type)]; if (!Array.isArray(rows)) return [];
  return rows.filter((row) => row && UUID.test(row.id || '') && clean(row.title || row.name)).slice(0, 8).map((row) => {
    const title = clean(row.title || row.name);
    const artist = Array.isArray(row['artist-credit']) ? row['artist-credit'].filter(Boolean).map((a) => clean(a.name || a.artist?.name, 100)).filter(Boolean).join(', ') : '';
    const date = clean(row['first-release-date'] || row.date || row['life-span']?.begin || '', 20);
    const info = clean(row.disambiguation, 150);
    const duration = Number.isFinite(row.length) && row.length > 0 ? `${Math.floor(row.length / 60000)}:${String(Math.floor(row.length / 1000) % 60).padStart(2, '0')}` : '';
    const label = [title, artist, date, info, duration].filter(Boolean).join(' — ');
    return { label, reference: `musicbrainz:${type}:${row.id.toLowerCase()}` };
  });
}
export function createMusicLookup({ fetchImpl = (...args) => fetch(...args), now = () => Date.now() } = {}) {
  let next = 0;
  const cache = new Map();
  return {
    wait() { return Math.max(0, next - now()); },
    async search({ query, type, signal }) {
      query = clean(query, 200);
      if (!TYPES.has(type) || query.length < 3) return [];
      const key = type + ':' + query.toLowerCase();
      if (cache.has(key)) return cache.get(key);
      if (now() < next) throw new Error('Please wait a moment before searching again.');
      next = now() + 1100;
      const url = new URL(`https://musicbrainz.org/ws/2/${type}/`);
      // Treat typed titles as text, never as advanced Lucene operators.
      url.search = new URLSearchParams({ query: query.replace(/([+\-!(){}\[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1'), fmt: 'json', limit: '8' });
      const response = await fetchImpl(url.href, { credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' }, signal });
      if (!response.ok) {
        const delay = Number(response.headers.get('retry-after'));
        if (response.status === 429 || response.status === 503) {
          next = now() + Math.max(10000, Math.min(Number.isFinite(delay) ? delay * 1000 : 10000, 300000));
          throw new Error('MusicBrainz is busy. Wait a moment and try again, or paste a reference yourself.');
        }
        throw new Error('MusicBrainz search is unavailable. You can still paste a reference yourself.');
      }
      const results = lookupResults(await response.json(), type);
      if (cache.size >= 30) cache.delete(cache.keys().next().value);
      cache.set(key, results); return results;
    }
  };
}
export function setupMediaLookup(doc = document) {
  const $ = (id) => doc.getElementById(id);
  const enabled = $('mediaLookupEnabled'), query = $('mediaLookupQuery'), type = $('mediaLookupType'), results = $('mediaLookupResults'), status = $('mediaLookupStatus');
  const client = createMusicLookup(); let timer, controller, version = 0, composing = false;
  const cancel = () => { version++; clearTimeout(timer); controller?.abort(); controller = null; results.replaceChildren(); results.removeAttribute('aria-busy'); };
  const reset = () => { cancel(); status.textContent = enabled.checked ? 'Type at least three characters. Search text goes to MusicBrainz.' : 'Online search is off.'; };
  enabled.onchange = () => { query.disabled = type.disabled = !enabled.checked; reset(); if (enabled.checked) query.focus(); };
  const schedule = () => {
    cancel();
    if (!enabled.checked || composing) return;
    const text = query.value.trim(), id = version;
    if (text.length < 3) { status.textContent = 'Type at least three characters.'; return; }
    status.textContent = 'Waiting for you to finish typing…';
    timer = setTimeout(async () => {
      controller = new AbortController(); const request = controller;
      const timeout = setTimeout(() => request.abort(), 12000);
      results.setAttribute('aria-busy', 'true'); status.textContent = 'Searching MusicBrainz…';
      try {
        const items = await client.search({ query: text, type: type.value, signal: request.signal });
        if (id !== version) return;
        status.textContent = items.length ? 'Choose a match to add it to the reference list. Check the artist and version.' : 'No matches. Try a different title or add the artist name.';
        for (const item of items) {
          const li = doc.createElement('li'), button = doc.createElement('button');
          button.type = 'button'; button.textContent = item.label;
          button.onclick = () => {
            const field = $('musicReferences');
            const line = item.label + ' | ' + item.reference;
            if (!field.value.split(/\r?\n/).includes(line)) {
              const value = field.value.trimEnd() + (field.value.trim() ? '\n' : '') + line;
              if (value.length > field.maxLength) { status.textContent = 'The reference list is full. Add it to the entry first.'; return; }
              field.value = value; field.dispatchEvent(new Event('input', { bubbles: true }));
            }
            cancel(); status.textContent = 'Added to the review list. Add to this entry saves it in your journal.'; field.focus();
          };
          li.append(button); results.append(li);
        }
      } catch (error) {
        if (id !== version) return;
        status.textContent = request.signal.aborted ? 'Search cancelled or timed out. Type again to retry.' : error.name === 'TypeError' ? 'Search unavailable. Check your connection or paste a reference instead.' : error.message || 'Search unavailable. Paste a reference instead.';
      } finally { clearTimeout(timeout); if (id === version) results.removeAttribute('aria-busy'); }
    }, Math.max(1100, client.wait()));
  };
  query.oninput = schedule; type.onchange = schedule;
  query.addEventListener('compositionstart', () => { composing = true; cancel(); });
  query.addEventListener('compositionend', () => { composing = false; schedule(); });
  query.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); schedule(); } });
  $('musicDialog').addEventListener('close', () => { enabled.checked = false; query.disabled = type.disabled = true; reset(); });
  doc.defaultView.addEventListener('pagehide', () => { enabled.checked = false; reset(); });
}
