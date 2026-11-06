// The Media view: everything the journal's entries mention, gathered by kind, with what you did and when. Read-only: it
// never edits the writing and fetches nothing; Open in writing goes to the mention, and the catalog link opens only on a
// click. It clears when the journal locks. Download media journal saves a separate .jot made from the same references.
import { mediaShelf, mediaJournal, SHELF_KINDS, STATUS_LABEL, FORM_LABEL } from './media-shelf-core.mjs';
import { mediaURL } from './jot/jot.mjs';

export function setupWriterMedia({ editor, status = () => {}, jumpTo, documentName = () => 'my-journal', addMedia = () => {} }) {
  const doc = editor.ownerDocument, win = doc.defaultView;
  const el = (tag, text, attributes = {}) => { const node = doc.createElement(tag); if (text !== undefined) node.textContent = text; for (const [k, v] of Object.entries(attributes)) node.setAttribute(k, v); return node; };
  const section = el('section', undefined, { id: 'writerMedia', class: 'writer-media', 'aria-labelledby': 'writerMediaTitle' });
  section.hidden = true;
  const head = el('div', undefined, { class: 'writer-media-head' });
  const summary = el('p', '', { id: 'writerMediaSummary', class: 'writer-media-summary', role: 'status' });
  const add = el('button', 'Add media', { type: 'button', id: 'writerMediaAdd' }), download = el('button', 'Download media journal', { type: 'button', id: 'writerMediaDownload', class: 'quiet' });
  head.append(el('h2', 'Media', { id: 'writerMediaTitle' }), summary, el('div', undefined, { class: 'writer-media-actions' }));
  head.lastChild.append(add, download);
  const filters = el('div', undefined, { class: 'writer-media-filters', role: 'group', 'aria-label': 'Show' });
  const search = el('input', undefined, { id: 'writerMediaSearch', type: 'search', placeholder: 'Find a title', 'aria-label': 'Find a title', autocomplete: 'off' });
  const kindSelect = el('select', undefined, { id: 'writerMediaKind', 'aria-label': 'Kind' }), statusSelect = el('select', undefined, { id: 'writerMediaStatus', 'aria-label': 'What you did' });
  for (const [value, label] of [['', 'Any status'], ['want', 'Want to'], ['doing', 'In progress'], ['done', 'Done'], ['mentioned', 'Only mentioned']]) statusSelect.append(new Option(label, value));
  filters.append(search, kindSelect, statusSelect);
  const list = el('div', undefined, { id: 'writerMediaList', class: 'writer-media-list' });
  section.append(head, filters, list);
  (doc.querySelector('.writing-grid') || doc.body).after(section);

  let shelf = [], rendered = null, timer = 0;
  const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const formatDate = date => { const d = new Date(date + 'T12:00:00Z'); return Number.isNaN(+d) ? date : dateFormat.format(d); };
  const catalogURL = target => { const url = /^https:\/\//.test(target) ? target : mediaURL(target); try { return url && new URL(url).protocol === 'https:' ? url : ''; } catch { return ''; } };

  function compute() {
    if (rendered === editor.value) return;
    rendered = editor.value; shelf = mediaShelf(editor.value);
    const present = new Set(shelf.map(i => i.kind)), chosen = kindSelect.value;
    kindSelect.replaceChildren(new Option('All kinds', ''), ...SHELF_KINDS.filter(([k]) => present.has(k)).map(([k, label]) => new Option(label, k)));
    kindSelect.value = present.has(chosen) ? chosen : '';
  }
  // One title: its kind of thing (Song, Album, Episode…), what you did and when, and every mention with where in it you were.
  const SHOWN_FORMS = new Set(['song', 'album', 'playlist', 'artist', 'composition', 'episode', 'series', 'show', 'edition']);
  function itemCard(item) {
    const li = el('li'), card = el('details', undefined, { class: 'writer-media-item' }), top = el('summary');
    const form = SHOWN_FORMS.has(item.form) ? FORM_LABEL[item.form] : '';
    const where = [...new Set(item.mentions.flatMap((m) => m.locators))];
    top.append(el('strong', item.title), el('span', [form, item.activity || STATUS_LABEL[item.status], where.length ? where.join(', ') : '', item.last && formatDate(item.last), item.mentions.length > 1 ? item.mentions.length + ' mentions' : ''].filter(Boolean).join(' · '), { class: 'writer-media-meta' }));
    card.append(top);
    const mentions = el('ol', undefined, { class: 'writer-media-mentions' });
    for (const m of item.mentions) {
      const row = el('li'), go = el('button', 'Open in writing', { type: 'button', class: 'quiet' });
      row.append(el('span', [m.date ? formatDate(m.date) : '', m.activity || 'Mentioned', m.locators.join(', ')].filter(Boolean).join(' · ')), go);
      go.onclick = () => jumpTo(m.position, m.date || 'this mention');
      mentions.append(row);
    }
    card.append(mentions);
    const url = catalogURL(item.target);
    if (url) { const a = el('a', 'Open on ' + new URL(url).hostname.replace(/^www\./, ''), { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'writer-media-link' }); card.append(a); }
    li.append(card); return li;
  }
  function draw() {
    compute();
    const words = search.value.trim().toLowerCase(), kind = kindSelect.value, wanted = statusSelect.value;
    const shown = shelf.filter(i => (!kind || i.kind === kind) && (!wanted || i.status === wanted) && (!words || i.title.toLowerCase().includes(words)));
    const mentions = shelf.reduce((n, i) => n + i.mentions.length, 0);
    summary.textContent = shelf.length ? shelf.length + (shelf.length === 1 ? ' title' : ' titles') + ', mentioned ' + mentions + (mentions === 1 ? ' time' : ' times') + (shown.length !== shelf.length ? ' · showing ' + shown.length : '') : '';
    download.disabled = !shelf.length;
    list.replaceChildren();
    if (!shelf.length) { list.append(el('p', 'No media yet. Use Add media, or write a link to a film, series, book, podcast or song in an entry, and it will show up here.', { class: 'writer-media-empty' })); return; }
    if (!shown.length) { list.append(el('p', 'Nothing matches. Try other words or show all kinds.', { class: 'writer-media-empty' })); return; }
    for (const [k, label] of SHELF_KINDS) {
      const group = shown.filter(i => i.kind === k); if (!group.length) continue;
      const block = el('section', undefined, { class: 'writer-media-group', 'aria-label': label });
      block.append(el('h3', label + ' · ' + group.length));
      // Episodes sit under their show and films under their series, from the writing alone; everything else stands on its own.
      const ul = el('ul'), parents = new Map();
      for (const item of group) { if (item.parent) { if (!parents.has(item.parent)) parents.set(item.parent, []); parents.get(item.parent).push(item); } }
      for (const item of group) {
        if (item.parent) {
          const members = parents.get(item.parent); if (!members) continue; parents.delete(item.parent);
          const li = el('li', undefined, { class: 'writer-media-series' }), inner = el('ul');
          li.append(el('h4', item.parent + ' · ' + members.length));
          for (const member of members) inner.append(itemCard(member));
          li.append(inner); ul.append(li);
        } else ul.append(itemCard(item));
      }
      block.append(ul); list.append(block);
    }
  }
  for (const control of [kindSelect, statusSelect]) control.onchange = draw;
  search.addEventListener('input', () => { win.clearTimeout(timer); timer = win.setTimeout(draw, 150); });
  editor.addEventListener('input', () => { if (section.hidden) return; win.clearTimeout(timer); timer = win.setTimeout(draw, 300); });
  add.onclick = () => addMedia();
  download.onclick = () => {
    const name = String(documentName() || 'my-journal').trim() || 'my-journal', made = mediaJournal(editor.value, { name });
    if (!made.days) { status('No dated entries mention media yet.'); return; }
    const url = URL.createObjectURL(new Blob([made.text], { type: 'text/plain;charset=utf-8' })), a = el('a', undefined, { href: url, download: name.replace(/[\\/:*?"<>|]+/g, '-') + '-media.jot' });
    doc.body.append(a); a.click(); a.remove(); win.setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('Downloaded a media journal: ' + made.items + ' mentions over ' + made.days + (made.days === 1 ? ' day' : ' days') + '. Your journal is unchanged.');
  };
  return {
    show() { if (editor.readOnly) return; section.hidden = false; draw(); },
    hide() { section.hidden = true; },
    // Locking clears everything the view drew.
    reset() { section.hidden = true; shelf = []; rendered = null; list.replaceChildren(); summary.textContent = ''; search.value = ''; }
  };
}
