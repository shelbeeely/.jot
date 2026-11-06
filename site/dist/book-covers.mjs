// Book covers from Open Library (run by the Internet Archive) for a book the journal names: no account or key. Only the book's own
// Open Library identifier goes out (a work, an edition or an ISBN), never journal text. Covers come from Open Library's cover host,
// which hands the picture on to the Internet Archive's storage; they are kept only when the writer keeps the scene.
//
//   COVER_HOSTS                                  where requests go (the cover host redirects to archive.org's storage)
//   coverTarget(reference)                       { work } | { edition } | { isbn } | null for references it cannot look up
//   findCovers(reference, { fetcher })           { title, covers: [{ id, thumb, full }] }
//   downloadCover(cover, { fetcher })            { bytes: Uint8Array, mediaType }

export const COVER_HOSTS = Object.freeze(['https://openlibrary.org', 'https://covers.openlibrary.org', 'https://archive.org']);
export const COVER_CREDIT = 'Open Library';
const OL = 'https://openlibrary.org', COVERS = 'https://covers.openlibrary.org/b/id', MAX_COVERS = 12, MAX_BYTES = 4 * 1024 * 1024;
const INIT = { credentials: 'omit', referrerPolicy: 'no-referrer' };

/** What a book reference can be looked up by: an Open Library work or edition, or an ISBN. */
export function coverTarget(reference) {
  const r = String(reference || '').trim();
  let m = /^https:\/\/openlibrary\.org\/works\/(OL\d{1,12}W)(?:\/[^?#]*)?$/.exec(r); if (m) return { work: m[1] };
  m = /^https:\/\/openlibrary\.org\/books\/(OL\d{1,12}M)(?:\/[^?#]*)?$/.exec(r); if (m) return { edition: m[1] };
  m = /^isbn:\s*((?:97[89])?\d{9}[\dX])$/i.exec(r.replace(/-/g, '')); if (m) return { isbn: m[1].toUpperCase() };
  return null;
}
async function json(fetcher, url, signal) {
  const response = await fetcher(url, { ...INIT, signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Open Library did not answer (HTTP ${response.status}).`);
  return response.json();
}
const cover = (id) => (Number.isInteger(id) && id > 0 && id < 1e10 ? { id, thumb: `${COVERS}/${id}-M.jpg`, full: `${COVERS}/${id}-L.jpg` } : null);
const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** The covers Open Library has for a work (every edition's covers it lists), an edition, or an ISBN's edition. */
export async function findCovers(reference, { fetcher = globalThis.fetch.bind(globalThis), signal } = {}) {
  const target = coverTarget(reference); if (!target) throw new Error('Covers can be found for books linked to Open Library or by ISBN.');
  const path = target.work ? `/works/${target.work}.json` : target.edition ? `/books/${target.edition}.json` : `/isbn/${target.isbn}.json`;
  const record = await json(fetcher, OL + path, signal);
  const seen = new Set(), covers = (Array.isArray(record?.covers) ? record.covers : []).map(cover).filter((c) => c && !seen.has(c.id) && seen.add(c.id)).slice(0, MAX_COVERS);
  return { title: clean(record?.title) || 'This book', covers };
}

/** The chosen cover, large: JPEG or PNG, at most 4 MiB, from Open Library's cover host (and the Internet Archive it redirects to). */
export async function downloadCover(chosen, { fetcher = globalThis.fetch.bind(globalThis), signal } = {}) {
  if (!chosen || !cover(chosen.id)) throw new Error('That is not an Open Library cover.');
  const response = await fetcher(`${COVERS}/${chosen.id}-L.jpg`, { ...INIT, signal });
  if (!response.ok) throw new Error(`The cover did not download (HTTP ${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_BYTES) throw new Error('The cover is too large.');
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8, png = bytes[0] === 0x89 && bytes[1] === 0x50;
  if (!jpeg && !png) throw new Error('The cover is not a JPEG or PNG picture.');
  return { bytes, mediaType: jpeg ? 'image/jpeg' : 'image/png' };
}
export default { findCovers, downloadCover, coverTarget, COVER_HOSTS, COVER_CREDIT };
