// Add media: one picker for films, TV and episodes, books, anime and manga, podcasts and episodes, games and music.
// Keyless public catalogs only (no account or key). Each request sends only the words typed into the picker's own search
// box or a link the person pasted there, never journal writing. Results become ordinary readable references: a named link
// to the catalog's page, or Jot's existing imdb:/youtube:/spotify:/musicbrainz: short forms (spec 4.2.3-4.2.5). Nothing
// is fetched when a journal is opened, read or rendered.

const UA = 'JotWriter/0.1 (plain-text journal writer)';
export const KINDS = Object.freeze([
  { kind: 'film', label: 'Film', source: 'wikidata' },
  { kind: 'tv', label: 'TV series and episodes', source: 'tvmaze' },
  { kind: 'book', label: 'Book', source: 'openlibrary' },
  { kind: 'anime', label: 'Anime', source: 'anilist' },
  { kind: 'manga', label: 'Manga', source: 'anilist' },
  { kind: 'podcast', label: 'Podcast and episodes', source: 'apple' },
  { kind: 'game', label: 'Video game', source: 'wikidata' },
  { kind: 'music', label: 'Music (song or album)', source: 'musicbrainz' }
]);
export const SOURCES = Object.freeze({
  wikidata: { name: 'Wikidata', note: 'Data from Wikidata (CC0).' },
  tvmaze: { name: 'TVmaze', note: 'Data from TVmaze (CC BY-SA).' },
  openlibrary: { name: 'Open Library', note: 'Data from Open Library.' },
  anilist: { name: 'AniList', note: 'Data from AniList.' },
  apple: { name: 'Apple Podcasts', note: 'Data from the Apple Podcasts directory.' },
  musicbrainz: { name: 'MusicBrainz', note: 'Data from MusicBrainz (CC0).' },
  youtube: { name: 'YouTube', note: 'Title from YouTube.' },
  spotify: { name: 'Spotify', note: 'Title from Spotify.' },
  journal: { name: 'This journal', note: 'Already in this journal.' }
});
// The only hosts this module ever contacts.
export const HOSTS = Object.freeze(['https://www.wikidata.org', 'https://api.tvmaze.com', 'https://openlibrary.org', 'https://graphql.anilist.co', 'https://itunes.apple.com', 'https://musicbrainz.org', 'https://www.youtube.com', 'https://open.spotify.com']);

const clean = (value, max = 200) => String(value ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const year = value => { const m = /^[+-]?(\d{4})/.exec(String(value ?? '')); return m ? m[1] : ''; };
/** A link label that cannot break out of [ ] or start other formatting. */
export const escapeLabel = text => clean(text, 300).replace(/([\\[\]*_`<>~=^|#])/g, '\\$1');

// Wikidata classes: film (and feature, animated and short films), video game.
const WIKIDATA_CLASSES = { film: ['Q11424', 'Q24869', 'Q202866', 'Q24862', 'Q29168811'], game: ['Q7889'] };

/** The text to insert: an optional activity, then a named link. */
export function mediaReference(item, activity = '') {
  const label = escapeLabel(item.label || item.title);
  const target = item.reference || item.url;
  if (!label || !target || /[\s()]/.test(target)) throw new Error('This result cannot be linked.');
  const verb = clean(activity, 40);
  return (verb ? verb + ' ' : '') + '[' + label + '](' + target + ')';
}

const httpsURL = value => { try { const url = new URL(String(value)); return url.protocol === 'https:' ? url : null; } catch { return null; } };
const stripTracking = url => { const u = httpsURL(url); if (!u) return ''; u.search = ''; u.hash = ''; return u.href; };

// ---- Response parsers (pure, testable with saved responses) ----
export function parseWikidata(search, entities, kind) {
  const ids = (search?.query?.search || []).map(r => r?.title).filter(id => /^Q\d+$/.test(id || ''));
  const all = entities?.entities || {};
  return ids.slice(0, 8).map(id => {
    const e = all[id]; if (!e) return null;
    const title = clean(e.labels?.en?.value); if (!title) return null;
    const claim = p => e.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;
    const y = year(claim('P577')?.time);
    const imdb = typeof claim('P345') === 'string' && /^tt\d{7,10}$/.test(claim('P345')) ? claim('P345') : '';
    const description = clean(e.descriptions?.en?.value, 160);
    return { kind, source: 'wikidata', id, title, year: y, detail: description, label: title + (y ? ' (' + y + ')' : ''),
      // IMDb is the most widely recognised film identity; otherwise the Wikidata item.
      reference: kind === 'film' && imdb ? 'imdb:' + imdb : 'https://www.wikidata.org/wiki/' + id, url: 'https://www.wikidata.org/wiki/' + id };
  }).filter(Boolean);
}
export function parseTVmazeShows(data) {
  return (Array.isArray(data) ? data : []).map(r => r?.show).filter(s => s && Number.isInteger(s.id) && clean(s.name)).slice(0, 8).map(s => {
    const y = year(s.premiered), network = clean(s.network?.name || s.webChannel?.name, 60);
    return { kind: 'tv', source: 'tvmaze', id: String(s.id), title: clean(s.name), year: y, detail: [clean(s.type, 30), network].filter(Boolean).join(' · '),
      label: clean(s.name) + (y ? ' (' + y + ')' : ''), reference: 'https://www.tvmaze.com/shows/' + s.id, url: 'https://www.tvmaze.com/shows/' + s.id, hasChildren: true };
  });
}
export function parseTVmazeEpisodes(data, show) {
  return (Array.isArray(data) ? data : []).filter(e => e && Number.isInteger(e.id) && clean(e.name)).map(e => {
    const code = Number.isInteger(e.season) && Number.isInteger(e.number) ? 'S' + e.season + 'E' + e.number : clean(e.type, 20);
    return { kind: 'episode', source: 'tvmaze', id: String(e.id), title: clean(e.name), year: year(e.airdate), season: e.season, number: e.number, detail: [code, clean(e.airdate, 10)].filter(Boolean).join(' · '),
      label: show.title + ' ' + code + ': “' + clean(e.name) + '”', reference: 'https://www.tvmaze.com/episodes/' + e.id, url: 'https://www.tvmaze.com/episodes/' + e.id };
  });
}
export function parseOpenLibrary(data) {
  return (data?.docs || []).filter(d => /^\/works\/OL\d+W$/.test(d?.key || '') && clean(d.title)).slice(0, 8).map(d => {
    const author = (Array.isArray(d.author_name) ? d.author_name : []).slice(0, 2).map(a => clean(a, 80)).filter(Boolean).join(', ');
    const y = Number.isInteger(d.first_publish_year) ? String(d.first_publish_year) : '';
    const id = d.key.slice(7);
    return { kind: 'book', source: 'openlibrary', id, title: clean(d.title), year: y, creator: author, detail: [author, y && 'first published ' + y].filter(Boolean).join(' · '),
      label: clean(d.title) + (author ? ' by ' + author : '') + (y ? ' (' + y + ')' : ''), reference: 'https://openlibrary.org/works/' + id, url: 'https://openlibrary.org/works/' + id };
  });
}
export function parseAniList(data, kind) {
  return (data?.data?.Page?.media || []).filter(m => m && Number.isInteger(m.id)).slice(0, 8).map(m => {
    const title = clean(m.title?.english || m.title?.romaji || m.title?.native); if (!title) return null;
    const y = Number.isInteger(m.startDate?.year) ? String(m.startDate.year) : '';
    const type = kind === 'manga' ? 'manga' : 'anime';
    const count = type === 'anime' ? (Number.isInteger(m.episodes) ? m.episodes + ' episodes' : '') : (Number.isInteger(m.chapters) ? m.chapters + ' chapters' : '');
    const other = m.title?.romaji && clean(m.title.romaji) !== title ? clean(m.title.romaji) : '';
    return { kind, source: 'anilist', id: String(m.id), title, year: y, detail: [clean(m.format, 20), count, other].filter(Boolean).join(' · '),
      label: title + (y ? ' (' + y + ')' : ''), reference: 'https://anilist.co/' + type + '/' + m.id, url: 'https://anilist.co/' + type + '/' + m.id };
  }).filter(Boolean);
}
export function parseApplePodcasts(data) {
  return (data?.results || []).filter(r => r && r.kind === 'podcast' && Number.isInteger(r.collectionId) && clean(r.collectionName)).slice(0, 8).map(r => ({
    kind: 'podcast', source: 'apple', id: String(r.collectionId), title: clean(r.collectionName), creator: clean(r.artistName, 80), detail: clean(r.artistName, 80),
    label: clean(r.collectionName), reference: 'https://podcasts.apple.com/podcast/id' + r.collectionId, url: 'https://podcasts.apple.com/podcast/id' + r.collectionId, hasChildren: true }));
}
export function parseAppleEpisodes(data, show) {
  return (data?.results || []).filter(r => r && r.wrapperType === 'podcastEpisode' && Number.isInteger(r.trackId) && clean(r.trackName)).map(r => {
    const date = clean(r.releaseDate, 10);
    return { kind: 'podcast-episode', source: 'apple', id: String(r.trackId), title: clean(r.trackName), year: year(date), detail: [date, Number.isFinite(r.trackTimeMillis) ? Math.round(r.trackTimeMillis / 60000) + ' min' : ''].filter(Boolean).join(' · '),
      label: show.title + ': “' + clean(r.trackName) + '”', reference: 'https://podcasts.apple.com/podcast/id' + show.id + '?i=' + r.trackId, url: 'https://podcasts.apple.com/podcast/id' + show.id + '?i=' + r.trackId };
  });
}
const MB = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseMusicBrainz(data, type) {
  const rows = data?.[type === 'release-group' ? 'release-groups' : 'recordings'];
  return (Array.isArray(rows) ? rows : []).filter(r => r && MB.test(r.id || '') && clean(r.title)).slice(0, 8).map(r => {
    const artist = (Array.isArray(r['artist-credit']) ? r['artist-credit'] : []).map(a => clean(a?.name || a?.artist?.name, 80)).filter(Boolean).join(', ');
    const y = year(r['first-release-date']);
    return { kind: 'music', source: 'musicbrainz', id: r.id.toLowerCase(), title: clean(r.title), year: y, creator: artist, detail: [type === 'release-group' ? clean(r['primary-type'] || 'Album', 30) : 'Song', artist, y].filter(Boolean).join(' · '),
      label: clean(r.title) + (artist ? ' by ' + artist : '') + (y ? ' (' + y + ')' : ''), reference: 'musicbrainz:' + type + ':' + r.id.toLowerCase(), url: 'https://musicbrainz.org/' + type + '/' + r.id.toLowerCase() };
  });
}

/** References already in this journal (named links to these catalogs or short media references), matching the query. */
export function journalMatches(source, query, max = 5) {
  const q = clean(query, 100).toLowerCase(); if (q.length < 2) return [];
  const found = new Map();
  const pattern = /\[([^\]\n]{1,300})\]\(((?:https:\/\/(?:www\.)?(?:wikidata\.org|tvmaze\.com|openlibrary\.org|anilist\.co|podcasts\.apple\.com|musicbrainz\.org|youtube\.com|open\.spotify\.com)\/[^\s()]+)|(?:imdb|youtube|spotify|musicbrainz):[^\s()]+)\)/g;
  for (const m of String(source).matchAll(pattern)) {
    const label = m[1].replace(/\\(.)/g, '$1');
    if (!label.toLowerCase().includes(q) || found.has(m[2])) continue;
    found.set(m[2], { kind: 'journal', source: 'journal', title: clean(label), label: clean(label), detail: 'Already in this journal', reference: m[2], url: m[2] });
    if (found.size >= max) break;
  }
  return [...found.values()];
}

/** Recognises a pasted link from a supported catalog or service. Anything else stays an ordinary link. */
export function recognizeLink(text) {
  const url = httpsURL(String(text ?? '').trim()); if (!url) return null;
  const host = url.hostname.replace(/^(www|m|music)\./, ''), path = url.pathname;
  let m;
  if (host === 'youtube.com' && path === '/watch' && /^[A-Za-z0-9_-]{11}$/.test(url.searchParams.get('v') || '')) return { provider: 'youtube', id: url.searchParams.get('v') };
  if (host === 'youtu.be' && (m = /^\/([A-Za-z0-9_-]{11})$/.exec(path))) return { provider: 'youtube', id: m[1] };
  if (host === 'open.spotify.com' && (m = /^\/(?:intl-[a-z-]+\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]{22})$/.exec(path))) return { provider: 'spotify', type: m[1], id: m[2] };
  if (host === 'imdb.com' && (m = /^\/title\/(tt\d{7,10})\/?/.exec(path))) return { provider: 'imdb', id: m[1] };
  if (host === 'musicbrainz.org' && (m = /^\/(recording|release-group|release|work|artist)\/([0-9a-f-]{36})\/?$/i.exec(path)) && MB.test(m[2])) return { provider: 'musicbrainz', type: m[1], id: m[2].toLowerCase() };
  if (host === 'openlibrary.org' && (m = /^\/works\/(OL\d+W)(?:\/|$)/.exec(path))) return { provider: 'openlibrary', id: m[1] };
  if (host === 'tvmaze.com' && (m = /^\/(shows|episodes)\/(\d+)(?:\/|$)/.exec(path))) return { provider: 'tvmaze', type: m[1] === 'shows' ? 'show' : 'episode', id: m[2] };
  if (host === 'anilist.co' && (m = /^\/(anime|manga)\/(\d+)(?:\/|$)/.exec(path))) return { provider: 'anilist', type: m[1], id: m[2] };
  if (host === 'podcasts.apple.com' && (m = /\/id(\d+)\/?$/.exec(path))) return { provider: 'apple', id: m[1], episode: /^\d+$/.test(url.searchParams.get('i') || '') ? url.searchParams.get('i') : '' };
  if (host === 'wikidata.org' && (m = /^\/wiki\/(Q\d+)$/.exec(path))) return { provider: 'wikidata', id: m[1] };
  return null;
}

// ---- The client: rate limits, a small cache, cancellation; only fixed hosts ----
const SPACING = { wikidata: 500, tvmaze: 250, openlibrary: 400, anilist: 700, apple: 400, musicbrainz: 1100, youtube: 300, spotify: 300 };
const ANILIST = 'query($q:String,$t:MediaType){Page(perPage:8){media(search:$q,type:$t,isAdult:false){id type format title{romaji english native} startDate{year} episodes chapters}}}';
const ANILIST_ONE = 'query($id:Int){Media(id:$id){id type format title{romaji english native} startDate{year} episodes chapters}}';

export function createMediaCatalog({ fetchImpl = (...args) => fetch(...args), now = () => Date.now() } = {}) {
  const next = {}, cache = new Map();
  async function get(provider, url, { signal, method = 'GET', body } = {}) {
    if (!HOSTS.some(host => url.startsWith(host + '/'))) throw new Error('That catalog is not supported.');
    const key = method + ' ' + url + (body || '');
    if (cache.has(key)) return cache.get(key);
    const wait = (next[provider] || 0) - now();
    if (wait > 0) await new Promise((resolve, reject) => { const timer = setTimeout(resolve, wait); signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true }); });
    next[provider] = now() + SPACING[provider];
    const headers = { Accept: 'application/json' };
    if (provider === 'wikidata') headers['Api-User-Agent'] = UA;
    if (body) headers['Content-Type'] = 'application/json';
    let response;
    try { response = await fetchImpl(url, { method, body, headers, credentials: 'omit', referrerPolicy: 'no-referrer', signal }); }
    catch (error) { if (error?.name === 'AbortError') throw error; throw new Error(SOURCES[provider].name + ' could not be reached. Check the connection, or paste a link instead.', { cause: error }); }
    if (response.status === 429 || response.status === 503) { next[provider] = now() + 15000; throw new Error(SOURCES[provider].name + ' is busy. Wait a little and try again.'); }
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(SOURCES[provider].name + ' search is unavailable right now (HTTP ' + response.status + ').');
    const data = await response.json().catch(error => { throw new Error(SOURCES[provider].name + ' sent an answer Writer could not read.', { cause: error }); });
    if (cache.size > 100) cache.clear();
    cache.set(key, data);
    return data;
  }
  async function wikidata(query, kind, signal) {
    const classes = WIKIDATA_CLASSES[kind].map(q => 'P31=' + q).join('|');
    const search = await get('wikidata', 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'query', list: 'search', srsearch: query.replace(/["\\]/g, ' ') + ' haswbstatement:' + classes, srlimit: '8', format: 'json', origin: '*' }), { signal });
    const ids = (search?.query?.search || []).map(r => r.title).filter(id => /^Q\d+$/.test(id));
    if (!ids.length) return [];
    const entities = await get('wikidata', 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|descriptions|claims', languages: 'en', format: 'json', origin: '*' }), { signal });
    return parseWikidata(search, entities, kind);
  }
  return {
    /** Search one kind of media by the words typed into the picker. */
    async search({ kind, query, signal }) {
      query = clean(query, 120);
      if (query.length < 2) return [];
      if (kind === 'film' || kind === 'game') return wikidata(query, kind, signal);
      if (kind === 'tv') return parseTVmazeShows(await get('tvmaze', 'https://api.tvmaze.com/search/shows?' + new URLSearchParams({ q: query }), { signal }));
      if (kind === 'book') return parseOpenLibrary(await get('openlibrary', 'https://openlibrary.org/search.json?' + new URLSearchParams({ q: query, limit: '8', fields: 'key,title,author_name,first_publish_year' }), { signal }));
      if (kind === 'anime' || kind === 'manga') return parseAniList(await get('anilist', 'https://graphql.anilist.co/', { signal, method: 'POST', body: JSON.stringify({ query: ANILIST, variables: { q: query, t: kind.toUpperCase() } }) }), kind);
      if (kind === 'podcast') return parseApplePodcasts(await get('apple', 'https://itunes.apple.com/search?' + new URLSearchParams({ media: 'podcast', entity: 'podcast', term: query, limit: '8' }), { signal }));
      if (kind === 'music') {
        const term = query.replace(/([+\-!(){}[\]^"~*?:\\/]|&&|\|\|)/g, '\\$1'), params = { query: term, fmt: 'json', limit: '5' };
        const songs = parseMusicBrainz(await get('musicbrainz', 'https://musicbrainz.org/ws/2/recording/?' + new URLSearchParams(params), { signal }), 'recording');
        const albums = parseMusicBrainz(await get('musicbrainz', 'https://musicbrainz.org/ws/2/release-group/?' + new URLSearchParams(params), { signal }), 'release-group');
        return [...albums.slice(0, 3), ...songs].slice(0, 8);
      }
      throw new Error('Choose what kind of media to look for.');
    },
    /** Episodes of a TV series or podcast, optionally narrowed by words in the title. */
    async children({ item, filter = '', signal }) {
      const words = clean(filter, 80).toLowerCase();
      let list = [];
      if (item.source === 'tvmaze') list = parseTVmazeEpisodes(await get('tvmaze', 'https://api.tvmaze.com/shows/' + encodeURIComponent(item.id) + '/episodes', { signal }), item);
      else if (item.source === 'apple') list = parseAppleEpisodes(await get('apple', 'https://itunes.apple.com/lookup?' + new URLSearchParams({ id: item.id, entity: 'podcastEpisode', limit: '100' }), { signal }), item);
      return words ? list.filter(e => (e.title + ' ' + e.detail).toLowerCase().includes(words)) : list;
    },
    /** Turns a recognised pasted link into a named reference by looking up only that item's title. */
    async resolve({ text, signal }) {
      const link = recognizeLink(text);
      if (!link) return null;
      if (link.provider === 'youtube') {
        const data = await get('youtube', 'https://www.youtube.com/oembed?' + new URLSearchParams({ url: 'https://www.youtube.com/watch?v=' + link.id, format: 'json' }), { signal });
        const title = clean(data?.title), by = clean(data?.author_name, 80);
        return title ? [{ kind: 'video', source: 'youtube', id: link.id, title, detail: by, label: title + (by ? ' (' + by + ')' : ''), reference: 'youtube:' + link.id, url: 'https://www.youtube.com/watch?v=' + link.id }] : [];
      }
      if (link.provider === 'spotify') {
        const data = await get('spotify', 'https://open.spotify.com/oembed?' + new URLSearchParams({ url: 'https://open.spotify.com/' + link.type + '/' + link.id }), { signal });
        const title = clean(data?.title);
        return title ? [{ kind: link.type, source: 'spotify', id: link.id, title, detail: 'Spotify ' + link.type, label: title, reference: 'spotify:' + link.type + ':' + link.id, url: 'https://open.spotify.com/' + link.type + '/' + link.id }] : [];
      }
      if (link.provider === 'imdb') {
        const bare = [{ kind: 'film', source: 'wikidata', id: link.id, title: 'IMDb title', label: 'IMDb title', detail: 'No title found; it will be linked as an IMDb title', reference: 'imdb:' + link.id, url: 'https://www.imdb.com/title/' + link.id + '/' }];
        let search;
        try { search = await get('wikidata', 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'query', list: 'search', srsearch: 'haswbstatement:P345=' + link.id, srlimit: '1', format: 'json', origin: '*' }), { signal }); }
        catch (error) { if (error?.name === 'AbortError') throw error; return bare; }
        const ids = (search?.query?.search || []).map(r => r.title).filter(id => /^Q\d+$/.test(id));
        const entities = ids.length ? await get('wikidata', 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'wbgetentities', ids: ids.join('|'), props: 'labels|descriptions|claims', languages: 'en', format: 'json', origin: '*' }), { signal }) : null;
        const found = parseWikidata(search, entities, 'film').map(item => ({ ...item, reference: 'imdb:' + link.id }));
        return found.length ? found : bare;
      }
      if (link.provider === 'wikidata') {
        const entities = await get('wikidata', 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'wbgetentities', ids: link.id, props: 'labels|descriptions|claims', languages: 'en', format: 'json', origin: '*' }), { signal });
        return parseWikidata({ query: { search: [{ title: link.id }] } }, entities, 'item').map(item => ({ ...item, reference: 'https://www.wikidata.org/wiki/' + link.id }));
      }
      if (link.provider === 'musicbrainz') {
        const data = await get('musicbrainz', 'https://musicbrainz.org/ws/2/' + link.type + '/' + link.id + '?' + new URLSearchParams({ fmt: 'json', inc: link.type === 'recording' || link.type === 'release-group' || link.type === 'release' ? 'artist-credits' : '' }), { signal });
        const title = clean(data?.title || data?.name); if (!title) return [];
        const artist = (data['artist-credit'] || []).map(a => clean(a?.name, 80)).filter(Boolean).join(', ');
        return [{ kind: 'music', source: 'musicbrainz', id: link.id, title, detail: ['MusicBrainz ' + link.type, artist].filter(Boolean).join(' · '), label: title + (artist ? ' by ' + artist : ''), reference: 'musicbrainz:' + link.type + ':' + link.id, url: 'https://musicbrainz.org/' + link.type + '/' + link.id }];
      }
      if (link.provider === 'openlibrary') {
        const data = await get('openlibrary', 'https://openlibrary.org/works/' + link.id + '.json', { signal });
        const title = clean(data?.title);
        return title ? [{ kind: 'book', source: 'openlibrary', id: link.id, title, year: year(data.first_publish_date), detail: 'Open Library work', label: title, reference: 'https://openlibrary.org/works/' + link.id, url: 'https://openlibrary.org/works/' + link.id }] : [];
      }
      if (link.provider === 'tvmaze') {
        if (link.type === 'show') { const s = await get('tvmaze', 'https://api.tvmaze.com/shows/' + link.id, { signal }); return parseTVmazeShows(s ? [{ show: s }] : []); }
        const e = await get('tvmaze', 'https://api.tvmaze.com/episodes/' + link.id + '?embed=show', { signal });
        const show = e?._embedded?.show;
        return e && show ? parseTVmazeEpisodes([e], { title: clean(show.name), id: String(show.id) }) : [];
      }
      if (link.provider === 'anilist') {
        const data = await get('anilist', 'https://graphql.anilist.co/', { signal, method: 'POST', body: JSON.stringify({ query: ANILIST_ONE, variables: { id: Number(link.id) } }) });
        return parseAniList({ data: { Page: { media: data?.data?.Media ? [data.data.Media] : [] } } }, link.type);
      }
      if (link.provider === 'apple') {
        if (link.episode) {
          const data = await get('apple', 'https://itunes.apple.com/lookup?' + new URLSearchParams({ id: link.id, entity: 'podcastEpisode', limit: '200' }), { signal });
          const show = parseApplePodcasts(data)[0];
          const episode = show && parseAppleEpisodes(data, show).find(e => e.id === link.episode);
          if (episode) return [episode];
          return show ? [{ ...show, detail: 'The episode was not among the latest 200; linked to the episode page', label: show.title, reference: stripTracking('https://podcasts.apple.com/podcast/id' + link.id) + '?i=' + link.episode }] : [];
        }
        return parseApplePodcasts(await get('apple', 'https://itunes.apple.com/lookup?' + new URLSearchParams({ id: link.id }), { signal }));
      }
      return null;
    }
  };
}
