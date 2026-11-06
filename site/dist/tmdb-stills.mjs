// Stills from TMDb (The Movie Database) for a film or show the journal names: backdrops for a film or show, and episode stills.
// TMDb needs the writer's own token (an API read access token, or the short API key); it is held in page memory for this session
// and never saved. Only the reference's own identifier goes out (an IMDb id, or a TVmaze show or episode, which TVmaze turns into
// an IMDb id); never journal text. Images come from TMDb's image host and are kept only when the writer chooses one.
// This product uses the TMDB API but is not endorsed or certified by TMDB.
//
//   TMDB_HOSTS                                   the hosts this module talks to
//   stillsTarget(reference)                      { imdb } | { tvmazeShow } | { tvmazeEpisode } | null for references it cannot look up
//   findStills(reference, { token, fetcher })    { title, kind: 'movie'|'tv'|'episode', stills: [{ path, width, height, thumb, full }] }
//   downloadStill(still, { fetcher })            { bytes: Uint8Array, mediaType }

export const TMDB_HOSTS = Object.freeze(['https://api.themoviedb.org', 'https://image.tmdb.org', 'https://api.tvmaze.com']);
export const TMDB_CREDIT = 'Stills from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.';
const API = 'https://api.themoviedb.org/3', IMAGES = 'https://image.tmdb.org/t/p', TVMAZE = 'https://api.tvmaze.com';
const MAX_STILLS = 24, MAX_BYTES = 4 * 1024 * 1024;
const PATH = /^\/[A-Za-z0-9_-]{4,64}\.(?:jpg|png)$/;

/** What a media reference can be looked up by: an IMDb title, or a TVmaze show or episode. */
export function stillsTarget(reference) {
  const r = String(reference || '').trim();
  let m = /^imdb:\s*(tt\d{7,10})$/.exec(r); if (m) return { imdb: m[1] };
  m = /^https:\/\/(?:www\.)?imdb\.com\/title\/(tt\d{7,10})\/?$/.exec(r); if (m) return { imdb: m[1] };
  m = /^https:\/\/(?:www\.)?tvmaze\.com\/shows\/(\d{1,9})(?:\/[^/?#]*)?$/.exec(r); if (m) return { tvmazeShow: m[1] };
  m = /^https:\/\/(?:www\.)?tvmaze\.com\/episodes\/(\d{1,9})(?:\/[^/?#]*)?$/.exec(r); if (m) return { tvmazeEpisode: m[1] };
  return null;
}

// The writer's token: a read access token goes in the Authorization header; the short API key goes in the query, as TMDb asks.
function request(path, token) {
  const t = String(token || '').trim();
  if (!t) throw new Error('A TMDb token is needed to look for stills.');
  if (!/^[A-Za-z0-9._-]{16,1024}$/.test(t)) throw new Error('That does not look like a TMDb token.');
  const url = new URL(API + path);
  const headers = { Accept: 'application/json' };
  if (t.includes('.')) headers.Authorization = `Bearer ${t}`; else url.searchParams.set('api_key', t);
  return { url: url.href, init: { headers, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' } };
}
async function json(fetcher, url, init = { credentials: 'omit', referrerPolicy: 'no-referrer' }) {
  const response = await fetcher(url, init);
  if (response.status === 401) throw new Error('TMDb did not accept that token.');
  if (response.status === 429) throw new Error('TMDb asks to wait a moment before the next lookup.');
  if (!response.ok) throw new Error(`The lookup did not work (HTTP ${response.status}).`);
  return response.json();
}
const still = (s) => (s && typeof s.file_path === 'string' && PATH.test(s.file_path)
  ? { path: s.file_path, width: Number(s.width) || 0, height: Number(s.height) || 0, thumb: `${IMAGES}/w300${s.file_path}`, full: `${IMAGES}/w780${s.file_path}` } : null);
const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Looks up a reference on TMDb and lists its stills (episode stills first for an episode, then the show's backdrops). */
export async function findStills(reference, { token, fetcher = globalThis.fetch.bind(globalThis), signal } = {}) {
  const target = stillsTarget(reference); if (!target) throw new Error('Stills can be found for films and shows linked to IMDb or TVmaze.');
  const get = (path) => { const { url, init } = request(path, token); return json(fetcher, url, { ...init, signal }); };
  let imdb = target.imdb, episode = null;
  if (target.tvmazeShow) imdb = (await json(fetcher, `${TVMAZE}/shows/${target.tvmazeShow}`, { credentials: 'omit', referrerPolicy: 'no-referrer', signal }))?.externals?.imdb;
  if (target.tvmazeEpisode) {
    const e = await json(fetcher, `${TVMAZE}/episodes/${target.tvmazeEpisode}?embed=show`, { credentials: 'omit', referrerPolicy: 'no-referrer', signal });
    imdb = e?._embedded?.show?.externals?.imdb; episode = Number.isInteger(e?.season) && Number.isInteger(e?.number) ? { season: e.season, number: e.number, name: clean(e.name) } : null;
  }
  if (!/^tt\d{7,10}$/.test(String(imdb || ''))) throw new Error('This title has no IMDb identifier to look up on TMDb.');
  const found = await get(`/find/${imdb}?external_source=imdb_id`);
  const movie = found?.movie_results?.[0], show = found?.tv_results?.[0];
  if (movie && Number.isInteger(movie.id)) {
    const images = await get(`/movie/${movie.id}/images?include_image_language=en,null`);
    return { title: clean(movie.title), kind: 'movie', stills: (images?.backdrops || []).map(still).filter(Boolean).slice(0, MAX_STILLS) };
  }
  if (show && Number.isInteger(show.id)) {
    const list = [];
    if (episode) { const images = await get(`/tv/${show.id}/season/${episode.season}/episode/${episode.number}/images`); list.push(...(images?.stills || [])); }
    const images = await get(`/tv/${show.id}/images?include_image_language=en,null`); list.push(...(images?.backdrops || []));
    const seen = new Set();
    return { title: clean(show.name) + (episode ? ` S${episode.season}E${episode.number}` : ''), kind: episode ? 'episode' : 'tv',
      stills: list.map(still).filter((s) => s && !seen.has(s.path) && seen.add(s.path)).slice(0, MAX_STILLS) };
  }
  throw new Error('TMDb does not know this title.');
}

/** The chosen still, from TMDb's image host only: JPEG or PNG, at most 4 MiB. */
export async function downloadStill(chosen, { fetcher = globalThis.fetch.bind(globalThis), signal } = {}) {
  if (!chosen || !PATH.test(chosen.path)) throw new Error('That is not a TMDb still.');
  const response = await fetcher(`${IMAGES}/w780${chosen.path}`, { credentials: 'omit', referrerPolicy: 'no-referrer', signal });
  if (!response.ok) throw new Error(`The still did not download (HTTP ${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error('The still is too large.');
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8, png = bytes[0] === 0x89 && bytes[1] === 0x50;
  if (!jpeg && !png) throw new Error('The still is not a JPEG or PNG picture.');
  return { bytes, mediaType: jpeg ? 'image/jpeg' : 'image/png' };
}
export default { findStills, downloadStill, stillsTarget, TMDB_HOSTS, TMDB_CREDIT };
