/** A life online, as a Jot journal: the data exports people can download from social and writing services, read into one timeline
 * and written as dated Jot files. Pure (no fs, no network): the command line (jot-archive.mjs) and the converter page in the browser
 * use the same code.
 *
 *   const items = (await readArchives([source, …], options)).items;   // every post, note and photo, from every archive given
 *   const { files } = toJot(items, options);                           // one .jot a year (or one in all), dated entries
 *
 * A source is { name, list(): string[], read(path): Promise<Uint8Array> }: a ZIP (fromZip, below), a folder (the command line) or
 * files picked in a browser. Readers recognize each service by the files it exports, so archives can be given in any number and
 * any order, and are merged into one timeline.
 *
 * What it reads, and what it leaves out by default (the person's own words first; other people's words only when asked):
 *   X / Twitter archive   data/tweets.js (and tweets-part1.js …): posts and replies; reposts only with { reposts: true }
 *   Mastodon              outbox.json: posts and replies (content warnings kept); boosts only with { reposts: true };
 *                         direct messages never
 *   Facebook (JSON)       posts (your_posts…json), and your comments with { comments: true }; Messenger never
 *   Instagram (JSON)      posts (posts_1.json …) and their captions; stories with { stories: true }
 *   Tumblr                posts.xml (the classic export) or one HTML page a post; reblogs only with { reposts: true }
 *   Reddit                posts.csv, and comments.csv with { comments: true }; IP addresses never
 *   Google Takeout        Keep notes (Keep/*.json; lists become tasks), Blogger posts (feed.atom)
 *   Never: messages, contacts, friends lists, logins, IP addresses, ads data, location coordinates. A place's name is kept only with
 *   { places: true }. Counts of likes and shares are never written.
 *
 * Nothing is invented: a post without a readable time is skipped and counted in the warnings, never given a guessed date. Times
 * become dates in options.timeZone (an IANA name; default this computer's), which the files state in their Timezone: metadata.
 * The writing is escaped so it stays writing (a post that starts with "#" or "- " is not a Jot heading or list).
 */
import { escapeLine, MAX_FILE_BYTES } from './convert.mjs';

export const SERVICES = { twitter: 'X / Twitter', mastodon: 'Mastodon', facebook: 'Facebook', instagram: 'Instagram', tumblr: 'Tumblr', reddit: 'Reddit', keep: 'Google Keep', blogger: 'Blogger' };
export const DEFAULTS = { reposts: false, comments: false, stories: false, places: false, media: 'note', from: '', to: '', per: 'year', title: 'My life online', name: 'life-online', timeZone: '' };
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const utf8 = new TextDecoder('utf-8'), strict = new TextDecoder('utf-8', { fatal: true });

// ---- small helpers ----

/** Meta's exports write UTF-8 as if each byte were a character ("â€™" for "’"); undo that when it is what happened. */
export function fixMojibake(s) {
  if (typeof s !== 'string' || !/[\u0080-ÿ]/.test(s) || /[^\u0000-ÿ]/.test(s)) return s;
  try { return strict.decode(Uint8Array.from(s, (c) => c.charCodeAt(0))); } catch { return s; }
}
const deepFix = (v) => (typeof v === 'string' ? fixMojibake(v) : Array.isArray(v) ? v.map(deepFix) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepFix(x)])) : v);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
export const decodeEntities = (s) => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? (() => { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; })() : ENTITIES[e.toLowerCase()] ?? m));
/** HTML (a toot, a Tumblr or Blogger post) as plain lines: paragraphs and line breaks kept, links as [text](href), the rest as text. */
export function htmlToText(html) {
  let s = String(html || '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi, (m, q, h1, h2, inner) => {
    const href = decodeEntities(h1 ?? h2 ?? ''), text = decodeEntities(inner.replace(/<[^>]+>/g, '')).trim();
    if (!/^https?:\/\//i.test(href)) return text;
    return !text || text === href || href.endsWith(text.replace(/…$/, '')) || /^[#@]/.test(text) ? (/^[#@]/.test(text) ? text : href) : `[${text.replace(/[[\]]/g, '')}](${href})`;
  });
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|blockquote|ul|ol)>/gi, '\n\n').replace(/<li\b[^>]*>/gi, '\n- ').replace(/<\/li>/gi, '');
  s = s.replace(/<img\b[^>]*alt\s*=\s*"([^"]*)"[^>]*>/gi, (m, alt) => (alt ? `[image: ${alt}]` : '')).replace(/<[^>]+>/g, '');
  return decodeEntities(s).replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
const json = (bytes) => JSON.parse(utf8.decode(bytes).replace(/^\uFEFF/, ''));
const base = (p) => p.split('/').pop();
const dirOf = (p) => p.slice(0, p.lastIndexOf('/') + 1);
const tags = (list) => [...new Set(list.map((t) => String(t).trim().replace(/^#/, '').replace(/\s+/g, '-')).filter(Boolean))];

/** A small CSV reader (RFC 4180: quotes, doubled quotes, newlines in quotes). Rows as objects keyed by the header. */
export function readCSV(text) {
  const rows = []; let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x !== ''));
  return head ? body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim().replace(/^\uFEFF/, ''), r[i] ?? '']))) : [];
}

// ---- the readers: each recognizes its service's files and returns items ----
// An item: { service, kind ('post' | 'reply' | 'repost' | 'comment' | 'story' | 'note' | 'blog'), at (ms), text, title?, url?,
//            tags?, replyTo?, warning? (a content warning), audience?, place?, media: [{ path, name }], id }

const READERS = [];
const reader = (service, test, read) => READERS.push({ service, test, read });

// X / Twitter: data/tweets.js is "window.YTD.tweets.part0 = [ { tweet: {…} } ]"
const TW_MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const twTime = (s) => { const m = /^\w{3} (\w{3}) (\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2}) (\d{4})$/.exec(s || ''); if (!m || !(m[1] in TW_MONTHS)) return NaN; const off = (m[6] === '-' ? -1 : 1) * (Number(m[7]) * 60 + Number(m[8])); return Date.UTC(Number(m[9]), TW_MONTHS[m[1]], Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])) - off * 60000; };
const ytd = (bytes) => { const t = utf8.decode(bytes), i = t.indexOf('='); return JSON.parse(t.slice(i + 1).trim().replace(/;\s*$/, '')); };
reader('twitter', (paths) => paths.some((p) => /(^|\/)data\/tweets?(-part\d+)?\.js$/.test(p)), async (src, paths, o, warn) => {
  let handle = '';
  const acct = paths.find((p) => /(^|\/)data\/account\.js$/.test(p));
  if (acct) try { handle = ytd(await src.read(acct))[0].account.username || ''; } catch { /* links fall back to i/web */ }
  const media = paths.filter((p) => /(^|\/)data\/tweets?_media\//.test(p)), items = [];
  for (const p of paths.filter((x) => /(^|\/)data\/tweets?(-part\d+)?\.js$/.test(x))) {
    let list; try { list = ytd(await src.read(p)); } catch { warn(`${p}: not readable as a Twitter archive file`); continue; }
    for (const w of list) {
      const t = w.tweet || w; const at = twTime(t.created_at);
      if (!Number.isFinite(at)) { warn('a post without a readable time was left out'); continue; }
      let text = decodeEntities(t.full_text ?? t.text ?? '');
      for (const u of t.entities?.urls || []) if (u.url && u.expanded_url) text = text.split(u.url).join(u.expanded_url);
      for (const m of t.extended_entities?.media || t.entities?.media || []) if (m.url) text = text.split(m.url).join('');
      const repost = /^RT @/.test(text) || !!t.retweeted_status;
      const id = t.id_str || String(t.id || '');
      items.push({ service: 'twitter', id: 'tw-' + id, kind: repost ? 'repost' : t.in_reply_to_status_id_str ? 'reply' : 'post', at, text: text.trim(),
        url: id ? (handle ? `https://x.com/${handle}/status/${id}` : `https://x.com/i/web/status/${id}`) : undefined,
        replyTo: t.in_reply_to_screen_name ? '@' + t.in_reply_to_screen_name : undefined,
        tags: tags((t.entities?.hashtags || []).map((h) => h.text)),
        media: media.filter((m) => id && base(m).startsWith(id + '-')).map((m) => ({ path: m, name: base(m) })) });
    }
  }
  return items;
});

// Mastodon: outbox.json (ActivityStreams). Public, unlisted and followers-only posts are kept; direct messages never.
const PUBLIC = 'https://www.w3.org/ns/activitystreams#Public';
reader('mastodon', (paths) => paths.some((p) => /(^|\/)outbox\.json$/.test(p)), async (src, paths, o, warn) => {
  const items = [];
  for (const p of paths.filter((x) => /(^|\/)outbox\.json$/.test(x))) {
    let box; try { box = json(await src.read(p)); } catch { warn(`${p}: not readable as a Mastodon outbox`); continue; }
    if (!Array.isArray(box.orderedItems)) continue;
    for (const a of box.orderedItems) {
      const at = Date.parse(a.published || a.object?.published);
      if (!Number.isFinite(at)) { warn('a post without a readable time was left out'); continue; }
      if (a.type === 'Announce') { items.push({ service: 'mastodon', id: 'ma-' + a.id, kind: 'repost', at, text: '', url: typeof a.object === 'string' ? a.object : a.object?.id, media: [] }); continue; }
      const n = a.object; if (a.type !== 'Create' || !n || typeof n !== 'object') continue;
      const to = [].concat(n.to || a.to || []), cc = [].concat(n.cc || a.cc || []);
      const audience = to.includes(PUBLIC) ? 'public' : cc.includes(PUBLIC) ? 'unlisted' : to.some((x) => /\/followers$/.test(x)) ? 'followers' : 'direct';
      if (audience === 'direct') continue;
      items.push({ service: 'mastodon', id: 'ma-' + (n.id || a.id), kind: n.inReplyTo ? 'reply' : 'post', at, text: htmlToText(n.content), url: n.url || n.id, audience,
        warning: n.summary ? htmlToText(n.summary) : undefined,
        tags: tags((n.tag || []).filter((t) => t.type === 'Hashtag').map((t) => t.name)),
        media: (n.attachment || []).map((m) => ({ path: dirOf(p) + String(m.url || '').replace(/^https?:\/\/[^/]+\//, '').replace(/^\//, ''), name: base(String(m.url || 'media')), alt: m.name || '' })) });
    }
  }
  return items;
});

// Facebook (JSON export): posts, and the person's own comments when asked. Messenger is never read.
reader('facebook', (paths) => paths.some((p) => /(^|\/)posts\/your_posts[\w-]*_\d+\.json$/.test(p)), async (src, paths, o, warn) => {
  const items = [];
  for (const p of paths.filter((x) => /(^|\/)posts\/your_posts[\w-]*_\d+\.json$/.test(x))) {
    let list; try { list = deepFix(json(await src.read(p))); } catch { warn(`${p}: not readable as Facebook posts`); continue; }
    const root = p.replace(/(your_activity_across_facebook\/)?posts\/[^/]+$/, ''); // media paths are relative to the archive's top
    for (const post of Array.isArray(list) ? list : list.status_updates_v2 || []) {
      const at = Number(post.timestamp) * 1000;
      if (!Number.isFinite(at) || at <= 0) { warn('a post without a readable time was left out'); continue; }
      const text = (post.data || []).map((d) => d.post).filter(Boolean).join('\n\n');
      const media = [], links = []; let place;
      for (const att of post.attachments || []) for (const d of att.data || []) {
        if (d.media?.uri) media.push({ path: root + d.media.uri, name: base(d.media.uri), alt: d.media.description || d.media.title || '' });
        if (d.external_context?.url) links.push(d.external_context.url);
        if (d.place?.name) place = d.place.name;
      }
      if (!text && !media.length && !links.length && !place) continue; // a bare activity line ("X updated their profile picture") holds nothing written
      items.push({ service: 'facebook', id: 'fb-' + at + '-' + items.length, kind: 'post', at, text: [text, ...links.filter((l) => !text.includes(l))].filter(Boolean).join('\n\n'), place, media });
    }
  }
  if (o.comments) for (const p of paths.filter((x) => /(^|\/)comments(_and_reactions)?\/comments(_\d+)?\.json$/.test(x))) {
    let doc; try { doc = deepFix(json(await src.read(p))); } catch { warn(`${p}: not readable as Facebook comments`); continue; }
    for (const c of doc.comments_v2 || doc.comments || []) {
      const at = Number(c.timestamp) * 1000, text = (c.data || []).map((d) => d.comment?.comment).filter(Boolean).join('\n\n');
      if (Number.isFinite(at) && at > 0 && text) items.push({ service: 'facebook', id: 'fbc-' + at + '-' + items.length, kind: 'comment', at, text, media: [] });
    }
  }
  return items;
});

// Instagram (JSON export): posts with their captions; stories when asked.
reader('instagram', (paths) => paths.some((p) => /(^|\/)(content|media)\/posts_\d+\.json$/.test(p)), async (src, paths, o, warn) => {
  const items = [], root = (p) => p.replace(/(your_instagram_activity\/)?(content|media)\/[^/]+$/, '');
  const files = paths.filter((x) => /(^|\/)(content|media)\/posts_\d+\.json$/.test(x)).map((p) => [p, 'post']);
  if (o.stories) files.push(...paths.filter((x) => /(^|\/)(content|media)\/stories\.json$/.test(x)).map((p) => [p, 'story']));
  for (const [p, kind] of files) {
    let list; try { list = deepFix(json(await src.read(p))); } catch { warn(`${p}: not readable as Instagram ${kind}s`); continue; }
    for (const post of Array.isArray(list) ? list : list.ig_stories || []) {
      const media = post.media || [post], at = Number(post.creation_timestamp || media[0]?.creation_timestamp) * 1000;
      if (!Number.isFinite(at) || at <= 0) { warn('a post without a readable time was left out'); continue; }
      items.push({ service: 'instagram', id: 'ig-' + at + '-' + items.length, kind, at, text: post.title || (media.length === 1 ? media[0].title : '') || '',
        media: media.filter((m) => m.uri).map((m) => ({ path: root(p) + m.uri, name: base(m.uri), alt: media.length > 1 ? m.title || '' : '' })) });
    }
  }
  return items;
});

// Tumblr: posts.xml (one <post> each, the classic export), or an HTML page a post (posts/html/*.html).
const attr = (tag, name) => { const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(tag); return m ? decodeEntities(m[1]) : ''; };
const inner = (xml, name) => { const m = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(xml); return m ? m[1] : ''; };
reader('tumblr', (paths) => paths.some((p) => /(^|\/)posts\.xml$/.test(p) || /(^|\/)posts\/html\/[^/]+\.html$/.test(p)), async (src, paths, o, warn) => {
  const items = [];
  for (const p of paths.filter((x) => /(^|\/)posts\.xml$/.test(x))) {
    const xml = utf8.decode(await src.read(p));
    for (const m of xml.matchAll(/<post\b([^>]*)>([\s\S]*?)<\/post>/g)) {
      const head = m[1], body = m[2], at = Number(attr(head, 'unix-timestamp')) * 1000 || Date.parse(attr(head, 'date-gmt').replace(' GMT', 'Z').replace(' ', 'T'));
      if (!Number.isFinite(at) || at <= 0) { warn('a post without a readable time was left out'); continue; }
      const type = attr(head, 'type'), reblog = /\breblogged-from-url\s*=/.test(head);
      const parts = { regular: ['regular-title', 'regular-body'], photo: ['', 'photo-caption'], quote: ['', 'quote-text', 'quote-source'], link: ['link-text', 'link-description', 'link-url'], conversation: ['conversation-title', 'conversation-text'], video: ['', 'video-caption'], audio: ['', 'audio-caption'], answer: ['question', 'answer'] }[type] || ['', 'regular-body'];
      const fieldText = (n) => (n ? htmlToText(decodeEntities(inner(body, n))) : '');
      const title = fieldText(parts[0]);
      const text = type === 'quote' ? [fieldText('quote-text').replace(/^/gm, '> '), fieldText('quote-source') && '— ' + fieldText('quote-source')].filter(Boolean).join('\n\n') : parts.slice(1).map(fieldText).filter(Boolean).join('\n\n');
      items.push({ service: 'tumblr', id: 'tu-' + attr(head, 'id'), kind: reblog ? 'repost' : 'post', at, title: title || undefined, text,
        url: attr(head, 'url-with-slug') || attr(head, 'url') || undefined, tags: tags([...body.matchAll(/<tag>([\s\S]*?)<\/tag>/g)].map((t) => decodeEntities(t[1]))), media: [] });
    }
  }
  for (const p of paths.filter((x) => /(^|\/)posts\/html\/[^/]+\.html$/.test(x))) {
    const html = utf8.decode(await src.read(p));
    const stamp = /id\s*=\s*"timestamp"[^>]*>([\s\S]*?)</.exec(html), at = stamp ? wallClock(decodeEntities(stamp[1]), o.timeZone) : NaN;
    if (!Number.isFinite(at)) { warn(`${p}: no readable time, left out`); continue; }
    const bodyHtml = (/<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html) || [null, html])[1].replace(/<div\s+id\s*=\s*"footer"[\s\S]*$/i, '').replace(/<span\s+id\s*=\s*"timestamp"[\s\S]*?<\/span>/i, '');
    const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(bodyHtml);
    items.push({ service: 'tumblr', id: 'tu-' + base(p), kind: 'post', at, title: h1 ? htmlToText(h1[1]) || undefined : undefined, text: htmlToText(h1 ? bodyHtml.replace(h1[0], '') : bodyHtml), tags: tags([...html.matchAll(/class\s*=\s*"tag"[^>]*>([^<]*)</g)].map((t) => decodeEntities(t[1]))), media: [] });
  }
  return items;
});

// Reddit (the data request's CSV files): posts, and comments when asked. The ip column is never read.
reader('reddit', (paths) => paths.some((p) => /(^|\/)posts\.csv$/.test(p) || /(^|\/)comments\.csv$/.test(p)), async (src, paths, o, warn) => {
  const items = [], take = [['posts', 'post'], ...(o.comments ? [['comments', 'comment']] : [])];
  for (const [file, kind] of take) for (const p of paths.filter((x) => new RegExp(`(^|/)${file}\\.csv$`).test(x))) {
    const rows = readCSV(utf8.decode(await src.read(p)));
    if (rows.length && !('permalink' in rows[0] && 'date' in rows[0])) continue; // a posts.csv from something else
    for (const r of rows) {
      const at = Date.parse(String(r.date).replace(' UTC', 'Z').replace(' ', 'T'));
      if (!Number.isFinite(at)) { warn('a post without a readable time was left out'); continue; }
      const link = r.url && !/reddit\.com\/r\//.test(r.url) ? r.url : '';
      items.push({ service: 'reddit', id: 'rd-' + r.id, kind, at, title: r.title || undefined, text: [r.body === '[deleted]' ? '' : r.body, link].filter(Boolean).join('\n\n'),
        url: r.permalink ? (r.permalink.startsWith('http') ? r.permalink : 'https://www.reddit.com' + r.permalink) : undefined, context: r.subreddit ? 'r/' + r.subreddit : undefined, media: [] });
    }
  }
  return items;
});

// Google Takeout: Keep (one JSON a note) and Blogger (feed.atom).
reader('keep', (paths) => paths.some((p) => /(^|\/)Keep\/[^/]+\.json$/.test(p)), async (src, paths, o, warn) => {
  const items = [];
  for (const p of paths.filter((x) => /(^|\/)Keep\/[^/]+\.json$/.test(x))) {
    let n; try { n = json(await src.read(p)); } catch { warn(`${p}: not readable as a Keep note`); continue; }
    if (n.isTrashed) continue;
    const at = Number(n.createdTimestampUsec || n.userEditedTimestampUsec) / 1000;
    if (!Number.isFinite(at) || at <= 0) { warn('a note without a readable time was left out'); continue; }
    const list = (n.listContent || []).map((li) => ({ task: true, done: !!li.isChecked, text: String(li.text || '').replace(/\s+/g, ' ').trim() }));
    items.push({ service: 'keep', id: 'kp-' + base(p), kind: 'note', at, title: n.title || undefined, text: n.textContent || '', list, tags: tags((n.labels || []).map((l) => l.name)),
      media: (n.attachments || []).map((a) => ({ path: dirOf(p) + a.filePath, name: a.filePath })) });
  }
  return items;
});
reader('blogger', (paths) => paths.some((p) => /(^|\/)Blogger\/.*feed\.atom$/.test(p)), async (src, paths, o, warn) => {
  const items = [];
  for (const p of paths.filter((x) => /(^|\/)Blogger\/.*feed\.atom$/.test(x))) {
    const xml = utf8.decode(await src.read(p));
    for (const m of xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/g)) {
      const e = m[1];
      if (!/<blogger:type>\s*POST\s*<\/blogger:type>/i.test(e) && /<blogger:type>/i.test(e)) continue; // comments, pages, settings
      if (/<blogger:status>\s*(DELETED|SOFT_TRASHED)/i.test(e)) continue;
      const at = Date.parse(inner(e, 'published'));
      if (!Number.isFinite(at)) { warn('a blog post without a readable time was left out'); continue; }
      const link = /<link\b[^>]*rel\s*=\s*"alternate"[^>]*href\s*=\s*"([^"]*)"/.exec(e) || /<blogger:filename>([^<]*)</.exec(e);
      items.push({ service: 'blogger', id: 'bl-' + at + '-' + items.length, kind: 'blog', at, title: decodeEntities(inner(e, 'title')).trim() || undefined, text: htmlToText(decodeEntities(inner(e, 'content').replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, ''))),
        url: link && /^https?:/.test(link[1]) ? decodeEntities(link[1]) : undefined, media: [] });
    }
  }
  return items;
});

/** "November 3rd, 2014 9:18pm" (a wall-clock time with no zone, as Tumblr's pages write it) as an instant in timeZone. */
export function wallClock(text, timeZone) {
  const m = /([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([ap]m)?)?/i.exec(text || '');
  const month = m ? ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[1].slice(0, 3).toLowerCase()) : -1;
  if (month < 0) return NaN;
  let h = Number(m[4] || 0); if (m[6]) h = (h % 12) + (m[6].toLowerCase() === 'pm' ? 12 : 0);
  const wall = Date.UTC(Number(m[3]), month, Number(m[2]), h, Number(m[5] || 0));
  // the zone's offset at that moment: read the wall clock back and correct (twice, for a change of offset in between)
  let at = wall;
  for (let i = 0; i < 2; i++) { const p = localParts(at, timeZone), seen = Date.parse(`${p.date}T${p.time}:00Z`); at += wall - seen; }
  return at;
}

// ---- reading archives ----

/** What each source holds: [{ source, service, name }] — for showing what was found before converting. */
export function detect(sources) {
  const found = [];
  for (const s of sources) { const paths = s.list(); for (const r of READERS) if (r.test(paths)) found.push({ source: s.name, service: r.service, name: SERVICES[r.service] }); }
  return found;
}

/** Every item from every source, oldest first, filtered by the options (kinds, dates). { items, found, warnings, left } */
export async function readArchives(sources, options = {}) {
  const o = { ...DEFAULTS, ...options }, items = [], warnings = new Map(), found = [];
  const warn = (m) => warnings.set(m, (warnings.get(m) || 0) + 1);
  for (const s of sources) {
    const paths = s.list();
    for (const r of READERS) if (r.test(paths)) {
      const got = await r.read(s, paths, o, warn);
      for (const it of got) it.source = s;
      found.push({ source: s.name, service: r.service, name: SERVICES[r.service], count: got.length });
      items.push(...got);
    }
  }
  const left = { reposts: 0, outside: 0, empty: 0 };
  const from = o.from ? Date.parse(o.from + 'T00:00:00Z') : -Infinity, to = o.to ? Date.parse(o.to + 'T23:59:59Z') : Infinity;
  const kept = items.filter((it) => {
    if (it.kind === 'repost' && !o.reposts) { left.reposts++; return false; }
    if (it.at < from || it.at > to) { left.outside++; return false; }
    if (!it.text && !it.title && !(it.list || []).length && !it.media.length && !(o.reposts && it.kind === 'repost')) { left.empty++; return false; }
    return true;
  }).sort((a, b) => a.at - b.at || String(a.id).localeCompare(String(b.id)));
  const seen = new Set(), unique = kept.filter((it) => (seen.has(it.id) ? false : seen.add(it.id))); // the same archive given twice
  return { items: unique, found, warnings: [...warnings].map(([m, n]) => (n > 1 ? `${m} (${n} times)` : m)), left };
}

// ---- writing Jot ----

/** The local date and time of an instant in a time zone: { date: 'YYYY-MM-DD', time: 'HH:MM', weekday } */
export function localParts(ms, timeZone) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, time: `${p.hour}:${p.minute}`, weekday: WEEKDAYS[new Date(date + 'T00:00:00Z').getUTCDay()] };
}

const KIND_WORDS = { reply: 'a reply', repost: 'shared', comment: 'a comment', story: 'a story', blog: 'a blog post', note: 'a note' };
function itemText(it, o, attachments) {
  const parts = [], context = [KIND_WORDS[it.kind] && it.kind !== 'note' ? KIND_WORDS[it.kind] : '', it.replyTo ? `to ${it.replyTo}` : '', it.context ? `in ${it.context}` : '', it.audience && it.audience !== 'public' ? `(${it.audience})` : ''].filter(Boolean).join(' ');
  const head = `#### ${localParts(it.at, o.timeZone).time} · ${SERVICES[it.service]}${context ? ' · ' + context : ''}`;
  if (it.title) parts.push(`**${escapeLine(it.title.replace(/\s+/g, ' ').trim()).replace(/\*/g, '\\*')}**`);
  if (it.warning) parts.push(`**Content warning:** ${escapeLine(it.warning.replace(/\s+/g, ' '))}`);
  if (it.text) parts.push(it.text.split(/\n{2,}/).map((para) => para.split('\n').map((l) => (/^> /.test(l) ? '> ' + escapeLine(l.slice(2)) : escapeLine(l))).filter((l, i, a) => l || a[i - 1]).join('\n')).filter(Boolean).join('\n\n'));
  if ((it.list || []).length) parts.push(it.list.map((li) => `[${li.done ? 'x' : ' '}] ${li.text}`).join('\n'));
  if (it.place && o.places) parts.push(`At ${escapeLine(it.place)}`);
  for (const m of it.media) {
    if (o.media === 'attach' && attachments) { const a = attachments(it, m); if (a) { parts.push(`![${(m.alt || (/\.(mp4|mov|webm|m4v)$/i.test(m.name) ? 'video' : 'photo')).replace(/[[\]\n]/g, ' ')}](${a})`); continue; } }
    if (o.media !== 'none') parts.push(`[[${/\.(mp4|mov|webm|m4v)$/i.test(m.name) ? 'video' : 'photo'} in the ${SERVICES[it.service]} archive: ${m.path.replace(/\]\]/g, '')}${m.alt ? ' · ' + m.alt.replace(/\]\]/g, '').replace(/\s+/g, ' ') : ''}]]`);
  }
  if (it.tags?.length) parts.push(it.tags.map((t) => '#' + t).join(' '));
  if (it.url) parts.push(`[Original](${it.url})`);
  return `${head}\n\n${parts.join('\n\n')}`.trimEnd();
}

/** The items as Jot files: { files: [{ name, text, entries, items, from, to, bytes }], stats, warnings }. options.attach(it, m)
 * returns an asset path when media is being packed (options.media 'attach'); otherwise media become margin notes or are left out. */
export function toJot(items, options = {}) {
  const o = { ...DEFAULTS, ...options }, tz = o.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const days = new Map();
  for (const it of items) { const d = localParts(it.at, tz).date; if (!days.has(d)) days.set(d, []); days.get(d).push(it); }
  const services = [...new Set(items.map((i) => SERVICES[i.service]))].join(', ');
  const header = (sub) => ['---', 'Jot: 1.0', `Title: ${o.title}${sub ? ' · ' + sub : ''}`, `Timezone: ${tz}`, 'Privacy: private', `Source: ${services || 'none'} (data exports)`, 'Converted-with: jot-archive', '---', ''].join('\n');
  const dayText = ([date, list]) => `### ${date} | ${localParts(list[0].at, tz).weekday}\n\n${list.map((it) => itemText(it, { ...o, timeZone: tz }, o.attach)).join('\n\n')}`;
  const groups = new Map();
  for (const entry of days) { const k = o.per === 'none' ? '' : o.per === 'month' ? entry[0].slice(0, 7) : entry[0].slice(0, 4); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(entry); }
  const files = [], warnings = [];
  for (const [k, list] of groups) {
    const text = `${header(k)}\n${list.map(dayText).join('\n\n')}\n`, bytes = new TextEncoder().encode(text).length;
    if (bytes > MAX_FILE_BYTES) warnings.push(`${k || 'The journal'} is ${Math.round(bytes / 1024)} KB, more than the Jot tools open at once (1 MiB): choose one file a ${o.per === 'year' ? 'month' : 'year'}.`);
    files.push({ name: `${o.name}${k ? '-' + k : ''}.jot`, text, entries: list.length, items: list.reduce((n, [, l]) => n + l.length, 0), from: list[0][0], to: list[list.length - 1][0], bytes });
  }
  return { files, warnings, stats: { items: items.length, days: days.size, files: files.length, timeZone: tz, from: files[0]?.from, to: files.at(-1)?.to } };
}

// ---- the whole journal, with photos packed when asked ----

const MEDIA_TYPES = { png: 'image/png', gif: 'image/gif', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', heic: 'image/heic', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' };
export const PHOTO_BUDGET = 60 * 1024 * 1024; // under the .jotz limit (64 MiB), leaving room for the writing

/** toJot, and with options.media 'attach' a .jotz a year (or month) carrying its photos: { files: [{ name, text, data?, … }],
 * warnings, stats }. `pack` is the Jot container's pack ({ source, assets, metadata } -> bytes), passed in so this module stays pure. */
export async function makeJournal(items, options = {}, { pack } = {}) {
  const o = { ...DEFAULTS, ...options };
  if (o.media !== 'attach') return toJot(items, o);
  if (!pack) throw new Error('packing photos needs the Jot container');
  const tz = o.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone, groups = new Map(), files = [], warnings = [];
  for (const it of items) { const d = localParts(it.at, tz).date, k = o.per === 'none' ? '' : o.per === 'month' ? d.slice(0, 7) : d.slice(0, 4); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
  for (const [k, list] of groups) {
    const wanted = [], byKey = new Map();
    const attach = (it, m) => {
      const key = it.service + ':' + m.path; if (byKey.has(key)) return byKey.get(key);
      if (!it.source || !it.source.list().includes(m.path)) return null;
      const clean = m.name.replace(/[^\w.-]+/g, '-').slice(-120); let p = `assets/${it.service}/${clean}`;
      for (let n = 2; wanted.some((x) => x.path === p); n++) p = `assets/${it.service}/${n}-${clean}`;
      byKey.set(key, p); wanted.push({ path: p, from: m.path, src: it.source }); return p;
    };
    const t = toJot(list, { ...o, timeZone: tz, per: 'none', attach, title: `${o.title}${k ? ' · ' + k : ''}`, name: `${o.name}${k ? '-' + k : ''}` });
    warnings.push(...t.warnings);
    const f = t.files[0], assets = []; let total = 0, over = 0;
    for (const x of wanted) {
      const data = await x.src.read(x.from);
      if (total + data.length > PHOTO_BUDGET) { over++; continue; }
      total += data.length; assets.push({ path: x.path, mediaType: MEDIA_TYPES[(x.path.split('.').pop() || '').toLowerCase()] || 'application/octet-stream', data });
    }
    if (over) warnings.push(`${k || 'The journal'}: ${over} photos did not fit in 60 MB and stay out of the .jotz (they are still in your export)`);
    if (!assets.length) { files.push(f); continue; }
    const keep = new Set(assets.map((x) => x.path)), text = f.text.replace(/!\[([^\]]*)\]\((assets\/[^)]+)\)/g, (m, alt, p) => (keep.has(p) ? m : `[[photo not packed: ${alt}]]`));
    files.push({ ...f, text, name: f.name.replace(/\.jot$/, '.jotz'), data: await pack({ source: text, assets, metadata: { title: o.title } }), photos: assets.length });
  }
  return { files, warnings, stats: { items: items.length, files: files.length, timeZone: tz, from: files[0]?.from, to: files.at(-1)?.to } };
}

// ---- ZIP sources (the vendored JSZip, which the site and the parser already carry) ----

/** A source from a ZIP's bytes; ZIPs inside it (Tumblr's posts.zip, a split Takeout) are opened too, one level deep. */
export async function fromZip(JSZip, name, bytes) {
  const zip = await JSZip.loadAsync(bytes), files = new Map();
  for (const f of Object.values(zip.files)) if (!f.dir) files.set(f.name.replace(/\\/g, '/'), f);
  for (const [p, f] of [...files]) if (/\.zip$/i.test(p)) {
    try { const z = await JSZip.loadAsync(await f.async('uint8array')); for (const g of Object.values(z.files)) if (!g.dir) files.set(dirOf(p) + g.name.replace(/\\/g, '/'), g); } catch { /* not a ZIP after all */ }
  }
  return { name, list: () => [...files.keys()], read: (p) => files.get(p).async('uint8array') };
}
