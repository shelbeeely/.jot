// The media journal: every film, series, book, anime, podcast, game, song and video an entry mentions, gathered from the
// writing itself. Read-only; nothing is fetched. A mention is a reference in prose (a named link to a known catalog, or a
// short imdb:/youtube:/spotify:/musicbrainz: reference), with the activity words written just before it, if any.
import { parse } from './jot/jot.mjs';

export const SHELF_KINDS = Object.freeze([
  ['film', 'Films'], ['tv', 'TV'], ['book', 'Books'], ['anime', 'Anime and manga'], ['podcast', 'Podcasts'],
  ['game-or-film', 'Films and games (Wikidata)'], ['music', 'Music'], ['video', 'Videos']
]);
const PROSE = new Set(['paragraph', 'list', 'task', 'blockquote', 'heading', 'table']);
// Words that say what the writer did, as Add media writes them (and close variants). Order matters: longest first.
const ACTIVITIES = [
  ['want to listen to', 'want'], ['want to watch', 'want'], ['want to read', 'want'], ['want to play', 'want'],
  ['listening to', 'doing'], ['listened to', 'done'], ['rewatched', 'done'], ['watching', 'doing'], ['watched', 'done'],
  ['reading', 'doing'], ['finished', 'done'], ['read', 'done'], ['playing', 'doing'], ['played', 'done']
];
export const STATUS_LABEL = { want: 'Want to', doing: 'In progress', done: 'Done', mentioned: 'Mentioned' };

/** The kind of media a reference target points to, or null for any other link. */
export function kindOf(target) {
  const t = String(target);
  if (/^imdb:\s*tt\d{7,10}$/.test(t)) return 'film';
  if (/^youtube:/.test(t) || /^https:\/\/(?:www\.)?youtube\.com\/watch/.test(t)) return 'video';
  if (/^spotify:\s*(?:episode|show):/.test(t) || /^https:\/\/open\.spotify\.com\/(?:episode|show)\//.test(t)) return 'podcast';
  if (/^spotify:/.test(t) || /^musicbrainz:/.test(t) || /^https:\/\/(?:open\.spotify\.com|musicbrainz\.org)\//.test(t)) return 'music';
  if (/^https:\/\/(?:www\.)?tvmaze\.com\/(?:shows|episodes)\/\d+/.test(t)) return 'tv';
  if (/^https:\/\/openlibrary\.org\/(?:works\/OL\d+W|books\/OL\d+M)/.test(t)) return 'book';
  if (/^https:\/\/anilist\.co\/(?:anime|manga)\/\d+/.test(t)) return 'anime';
  if (/^https:\/\/podcasts\.apple\.com\/podcast\/id\d+/.test(t)) return 'podcast';
  if (/^https:\/\/(?:www\.)?wikidata\.org\/wiki\/Q\d+$/.test(t)) return 'game-or-film';
  return null;
}
/** What a reference names within its kind, read from the reference alone: a song or an album, an episode or a whole series,
 *  one edition or the book. '' when the reference does not say. */
export const FORM_LABEL = Object.freeze({ song: 'Song', album: 'Album', playlist: 'Playlist', artist: 'Artist', composition: 'Composition', episode: 'Episode',
  series: 'Series', show: 'Show', edition: 'Edition', book: 'Book', film: 'Film or series', video: 'Video', anime: 'Anime', manga: 'Manga' });
export function formOf(target) {
  const t = String(target).replace(/^(spotify|musicbrainz):[ \t]+/, '$1:'); let m;
  const spotify = { track: 'song', album: 'album', playlist: 'playlist', artist: 'artist', episode: 'episode', show: 'show' };
  if ((m = /^spotify:(track|album|playlist|artist|episode|show):/.exec(t)) || (m = /^https:\/\/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\//.exec(t))) return spotify[m[1]];
  const brainz = { recording: 'song', 'release-group': 'album', release: 'album', work: 'composition', artist: 'artist' };
  if ((m = /^musicbrainz:(recording|release-group|release|work|artist):/.exec(t)) || (m = /^https:\/\/musicbrainz\.org\/(recording|release-group|release|work|artist)\//.exec(t))) return brainz[m[1]];
  if (/^https:\/\/(?:www\.)?tvmaze\.com\/episodes\//.test(t)) return 'episode';
  if (/^https:\/\/(?:www\.)?tvmaze\.com\/shows\//.test(t)) return 'series';
  if (/^https:\/\/podcasts\.apple\.com\/podcast\/id\d+\?i=\d+$/.test(t)) return 'episode';
  if (/^https:\/\/podcasts\.apple\.com\/podcast\/id\d+/.test(t)) return 'show';
  if (/^https:\/\/openlibrary\.org\/books\/OL\d+M/.test(t)) return 'edition';
  if (/^https:\/\/openlibrary\.org\/works\/OL\d+W/.test(t)) return 'book';
  if (/^imdb:/.test(t)) return 'film';
  if (/^youtube:|^https:\/\/(?:www\.)?youtube\.com\/watch/.test(t)) return 'video';
  if ((m = /^https:\/\/anilist\.co\/(anime|manga)\//.exec(t))) return m[1];
  return '';
}
// Where in a work, written right after its reference (spec 4.2.9): pages, chapters, an episode code, tracks or a time. Only these
// few shapes are read, exactly as written; anything else stays ordinary words. Nothing is totalled or required.
const LOCATOR = /^[ \t]*(?:,[ \t]*|\([ \t]*)?((?:pp?\.|pages?)[ \t]*\d{1,5}(?:[ \t]*[-–][ \t]*\d{1,5})?|(?:ch\.|chapters?)[ \t]*\d{1,4}(?:[ \t]*[-–][ \t]*\d{1,4})?|S\d{1,2}[ \t]?E\d{1,3}(?:[ \t]*[-–][ \t]*(?:S\d{1,2}[ \t]?)?E?\d{1,3})?|tracks?[ \t]*\d{1,3}(?:[ \t]*[-–][ \t]*\d{1,3})?|(?:at[ \t]+)?\d{1,2}:\d{2}(?::\d{2})?)(?![\w:])[ \t]*\)?/i;
/** The locators written straight after a reference (up to three), and where they end. */
export function locatorsAfter(text) {
  const found = []; let used = 0;
  while (found.length < 3) { const m = LOCATOR.exec(text.slice(used)); if (!m) break; found.push(m[1].replace(/[ \t]+/g, ' ')); used += m[0].length; }
  return { locators: found, used };
}
// The series a work belongs to, written after it as "(in [Series](link))" (spec 4.2.9).
const SERIES = /^[ \t]*\(in[ \t]+\[((?:\\.|[^\]\\\n]){1,300})\]\(([^\s()]+)\)\)/;
const BARE = /(?<![\w(:/])(imdb:[ \t]*tt\d{7,10}|youtube:[ \t]*(?:video:)?[A-Za-z0-9_-]{11}|spotify:[ \t]*(?:track|album|playlist|artist|episode|show):[A-Za-z0-9]{22}|musicbrainz:[ \t]*(?:recording|release|release-group|work|artist):[0-9a-fA-F-]{36})(?![\w-])/g;
const NAMED = /\[((?:\\.|[^\]\\\n]){1,300})\]\(([^\s()]+)\)/g;
const GENERIC = /^(?:open(?: track| in .+)?|imdb title|youtube (?:video|playlist)|spotify \w+|musicbrainz [\w-]+)$/i;
const unescape = text => text.replace(/\\(.)/g, '$1').trim();

/** Every media mention in the journal's prose, in order: { target, kind, title, date, entry, position, activity, status, form, locators,
 *  series }. form says song or album, episode or series (from the reference); locators and series are only what was written. */
export function mediaMentions(source) {
  const ast = parse(source), bytes = new TextEncoder().encode(ast.source), decoder = new TextDecoder();
  const charAt = byte => decoder.decode(bytes.slice(0, byte)).length;
  const mentions = [];
  ast.entries.forEach((entry, index) => {
    let lastTitle = '';
    for (let i = entry.startNode; i < entry.endNode; i++) {
      const node = ast.nodes[i];
      if (!PROSE.has(node.type)) continue;
      const start = charAt(node.start), raw = source.slice(start, charAt(node.end));
      // A listening note's title line (“Title” — Artist) names the generic "Open in Spotify" link after it.
      const quoted = /^“(.+?)”(?:\s+—\s+(.+))?\s*$/m.exec(raw);
      if (quoted && !NAMED.test(raw)) lastTitle = quoted[1] + (quoted[2] ? ' by ' + quoted[2].trim() : '');
      NAMED.lastIndex = 0;
      const covered = [], seriesLinks = new Set();
      for (const m of raw.matchAll(NAMED)) {
        const target = m[2].replace(/^(imdb|youtube|spotify|musicbrainz):[ \t]+/, '$1:'), kind = kindOf(target);
        covered.push([m.index, m.index + m[0].length]);
        if (!kind || seriesLinks.has(m.index)) continue; // a series named after a work is part of that mention, not one of its own
        let title = unescape(m[1]);
        if (GENERIC.test(title) && lastTitle) title = lastTitle;
        const end = m.index + m[0].length, line = raw.slice(end, (raw.indexOf('\n', end) + 1 || raw.length + 1) - 1);
        const { locators, used } = locatorsAfter(line), series = SERIES.exec(line.slice(used));
        if (series) seriesLinks.add(end + used + series[0].indexOf('['));
        mentions.push(mention(raw, m.index, target, kind, title, entry, index, start, { locators, series: series ? { title: unescape(series[1]), target: series[2] } : null }));
      }
      for (const m of raw.matchAll(BARE)) {
        if (covered.some(([a, b]) => m.index >= a && m.index < b)) continue;
        const target = m[1].replace(/:[ \t]+/, ':'), kind = kindOf(target);
        const end = m.index + m[0].length, line = raw.slice(end, (raw.indexOf('\n', end) + 1 || raw.length + 1) - 1);
        if (kind) mentions.push(mention(raw, m.index, target, kind, lastTitle && /^spotify:|^youtube:/.test(target) ? lastTitle : '', entry, index, start, { locators: locatorsAfter(line).locators, series: null }));
      }
    }
  });
  return mentions;
}
function mention(raw, at, target, kind, title, entry, index, start, { locators = [], series = null } = {}) {
  const before = raw.slice(raw.lastIndexOf('\n', at - 1) + 1, at).toLowerCase().replace(/[-*+]\s+|\[[ xX]\]\s+/g, '').trimEnd();
  const found = ACTIVITIES.find(([words]) => before.endsWith(words));
  return { target, kind, title: title || fallbackTitle(target), date: entry.date || '', entry: index, position: start + at,
    activity: found ? found[0][0].toUpperCase() + found[0].slice(1) : '', status: found ? found[1] : 'mentioned', form: formOf(target), locators, series };
}
function fallbackTitle(target) {
  if (target.startsWith('imdb:')) return 'IMDb ' + target.slice(5);
  if (target.startsWith('youtube:')) return 'YouTube video';
  if (target.startsWith('spotify:')) return 'Spotify ' + target.split(':')[1];
  if (target.startsWith('musicbrainz:')) return 'MusicBrainz ' + target.split(':')[1];
  return target.replace(/^https:\/\/(?:www\.)?/, '');
}

/** One shelf item per reference target: its best title, every mention, and the latest activity. */
export function mediaShelf(source) {
  const items = new Map();
  for (const m of mediaMentions(source)) {
    const item = items.get(m.target) || { target: m.target, kind: m.kind, form: m.form, title: m.title, mentions: [] };
    // A real title beats a fallback like "IMDb tt0133093".
    if (/^(IMDb|YouTube|Spotify|MusicBrainz) /.test(item.title) && !/^(IMDb|YouTube|Spotify|MusicBrainz) /.test(m.title)) item.title = m.title;
    item.mentions.push(m); items.set(m.target, item);
  }
  return [...items.values()].map(item => {
    const dated = item.mentions.filter(m => m.date).sort((a, b) => a.date.localeCompare(b.date) || a.position - b.position);
    const withActivity = [...item.mentions].reverse().find(m => m.activity) || null;
    // What it belongs to, from the writing alone: the series named after it, or for an episode the show its title begins with.
    const series = item.mentions.find((m) => m.series)?.series || null, episodeOf = item.form === 'episode' && /^(.+?)\s+S\d{1,2}\s?E\d{1,3}\b/.exec(item.title)?.[1];
    return { ...item, first: dated[0]?.date || '', last: dated.at(-1)?.date || '', status: withActivity?.status || 'mentioned', activity: withActivity?.activity || '',
      series, parent: series ? series.title : episodeOf || '' };
  }).sort((a, b) => b.last.localeCompare(a.last) || a.title.localeCompare(b.title));
}

const escapeLabel = text => String(text).replace(/([\\[\]*_`<>~=^|#])/g, '\\$1');
const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' });
/** A separate plain .jot: one dated entry per day, listing that day's media in the order written. */
export function mediaJournal(source, { name = 'my-journal' } = {}) {
  const byDate = new Map();
  for (const m of mediaMentions(source)) {
    if (!m.date) continue;
    const list = byDate.get(m.date) || [];
    const line = '- ' + (m.activity ? m.activity + ' ' : '') + '[' + escapeLabel(m.title) + '](' + m.target + ')' + (m.locators.length ? ' ' + m.locators.join(', ') : '')
      + (m.series ? ' (in [' + escapeLabel(m.series.title) + '](' + m.series.target + '))' : '');
    if (!list.includes(line)) list.push(line);
    byDate.set(m.date, list);
  }
  const dates = [...byDate.keys()].sort();
  const lines = ['# Media from ' + String(name).replace(/[\r\n#]/g, ' ').trim(), '', 'Films, series, books, anime, podcasts, games and music mentioned in the journal, by day. Made by Writer from the references in the entries; the journal itself is unchanged.', ''];
  for (const date of dates) {
    lines.push('### ' + date + ' | ' + WEEKDAY.format(new Date(date + 'T12:00:00Z')), '', ...byDate.get(date), '');
  }
  return { text: lines.join('\n'), days: dates.length, items: new Set([...byDate.values()].flat()).size };
}
