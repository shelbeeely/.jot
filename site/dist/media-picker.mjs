// The Add media dialog: find a film, series or episode, book, anime or manga, podcast or episode, game or song, and insert
// a readable reference at the cursor. References already in this journal come first and need no connection. Online
// catalogs are off until the person turns them on; then only the words typed here (or a pasted link) are sent.
import { KINDS, SOURCES, createMediaCatalog, journalMatches, mediaReference, recognizeLink } from './media-catalog.mjs';
import { applyWritingEdit } from './writing-tools.mjs';

const ONLINE = 'jot-media-online-v1';
const ACTIVITIES = {
  film: ['Watched', 'Want to watch', 'Rewatched'], tv: ['Watching', 'Finished', 'Want to watch'], episode: ['Watched', 'Rewatched'],
  book: ['Reading', 'Finished', 'Want to read'], anime: ['Watching', 'Finished', 'Want to watch'], manga: ['Reading', 'Finished', 'Want to read'],
  podcast: ['Listening to', 'Want to listen to'], 'podcast-episode': ['Listened to', 'Want to listen to'], game: ['Playing', 'Finished', 'Want to play'],
  music: ['Listened to', 'Listening to'], video: ['Watched'], journal: []
};

export function setupMediaPicker({ editor, status = () => {}, catalog = createMediaCatalog() }) {
  const doc = editor.ownerDocument, win = doc.defaultView;
  const dialog = doc.createElement('dialog');
  dialog.id = 'mediaPicker'; dialog.className = 'writer-small-dialog media-picker'; dialog.setAttribute('aria-labelledby', 'mediaTitle');
  // Static markup only; every catalog string is set with textContent.
  dialog.innerHTML = `<div class="dialog-header"><h2 id="mediaTitle">Add media</h2><button id="mediaClose" class="icon-button" type="button" aria-label="Close Add media">✕</button></div>
<form id="mediaForm" role="search"><div class="media-row"><label>Kind <select id="mediaKind"></select></label></div>
<label for="mediaQuery" id="mediaQueryLabel">Title, name or a link</label><div class="media-row"><input id="mediaQuery" type="search" autocomplete="off" spellcheck="false" maxlength="300" aria-describedby="mediaHelp"><button id="mediaSearch" class="button primary" type="submit">Search</button></div>
<label class="media-check"><input id="mediaOnline" type="checkbox"> Search online catalogs</label>
<p id="mediaHelp" class="small">Only what you type in this box is sent, to the catalog for the kind you chose. Your writing is never sent. Without online search, this finds references already in this journal.</p></form>
<p id="mediaStatus" role="status" aria-live="polite"></p>
<div id="mediaBack" hidden><button id="mediaBackBtn" class="quiet" type="button">← Back to results</button><button id="mediaWhole" class="quiet" type="button"></button><label for="mediaFilter">Find an episode</label><input id="mediaFilter" type="search" autocomplete="off" maxlength="80"></div>
<ul id="mediaResults" class="media-results" aria-label="Results"></ul>
<div id="mediaReview" hidden><h3>Insert</h3><label>What you did (optional) <select id="mediaActivity"></select></label>
<label for="mediaText">This goes in at your cursor</label><input id="mediaText" readonly>
<p id="mediaSource" class="small"></p><div class="writer-small-actions"><button id="mediaInsert" class="button primary" type="button">Insert</button><button id="mediaAgain" class="quiet" type="button">Choose another</button></div></div>`;
  doc.body.append(dialog);
  const button = doc.createElement('button');
  button.id = 'mediaPickerBtn'; button.type = 'button'; button.className = 'quiet'; button.textContent = 'Add media';
  button.title = 'A film, series or episode, book, anime, podcast, game or song, as a reference in your writing';
  doc.querySelector('.tool-row')?.append(button);
  const $ = id => dialog.querySelector('#' + id);
  for (const k of KINDS) { const o = doc.createElement('option'); o.value = k.kind; o.textContent = k.label; $('mediaKind').append(o); }
  try { $('mediaOnline').checked = win.localStorage.getItem(ONLINE) === 'on'; } catch { /* off */ }
  let controller = null, timer = 0, chosen = null, parent = null, children = [], caret = 0, results = [];
  const say = text => { $('mediaStatus').textContent = text; };

  function show(list, { episodes = false } = {}) {
    results = list; $('mediaResults').replaceChildren();
    for (const item of list) {
      const li = doc.createElement('li'), pick = doc.createElement('button');
      pick.type = 'button'; pick.className = 'media-result';
      const title = doc.createElement('strong'); title.textContent = item.label;
      const detail = doc.createElement('span'); detail.textContent = [item.detail, SOURCES[item.source]?.name].filter(Boolean).join(' · ');
      pick.append(title, detail);
      if (item.hasChildren && !episodes) { const more = doc.createElement('span'); more.className = 'media-more'; more.textContent = item.kind === 'tv' ? 'Episodes →' : 'Episodes →'; pick.append(more); }
      pick.onclick = () => item.hasChildren && !episodes ? openChildren(item) : review(item);
      li.append(pick); $('mediaResults').append(li);
    }
  }
  function cancel() { win.clearTimeout(timer); controller?.abort(); controller = null; }
  async function run(query) {
    cancel(); $('mediaReview').hidden = true; $('mediaBack').hidden = true; parent = null;
    const words = query.trim(), local = journalMatches(editor.value, words), link = recognizeLink(words);
    if (!words) { show([]); say(''); return; }
    if (!$('mediaOnline').checked) {
      show(local);
      if (link) { say('That is a link Writer can look up. Turn on online search to fetch its title, or insert it as it is.'); show([...local, { kind: 'journal', source: 'journal', label: words.slice(0, 120), detail: 'Insert the link as it is', reference: words, url: words, plain: true }]); return; }
      say(local.length ? local.length + ' already in this journal. Turn on online search to look further.' : 'Nothing in this journal yet. Turn on online search to look in the catalogs.');
      return;
    }
    if (!link && words.length < 2) { say('Type at least two letters.'); return; }
    controller = new AbortController(); const signal = controller.signal;
    const kind = $('mediaKind').value, name = link ? 'the link' : (SOURCES[KINDS.find(k => k.kind === kind).source].name);
    say('Searching ' + name + '…'); $('mediaResults').setAttribute('aria-busy', 'true');
    try {
      const found = link ? await catalog.resolve({ text: words, signal }) : await catalog.search({ kind, query: words, signal });
      if (signal.aborted) return;
      show([...local, ...(found || [])]);
      say(found?.length ? (found.length + (found.length === 1 ? ' result' : ' results') + ' from ' + SOURCES[found[0].source].name + '.') : link ? 'No title found for that link. You can still insert it as an ordinary link.' : 'No results. Try other words or another kind.');
    } catch (error) { if (error?.name !== 'AbortError') { show(link ? [...local, { kind: 'journal', source: 'journal', label: words.slice(0, 120), detail: 'Insert the link as it is', reference: words, url: words, plain: true }] : local); say(error.message + (link ? ' You can still insert the link as it is.' : '')); } }
    finally { if (!signal.aborted) $('mediaResults').removeAttribute('aria-busy'); }
  }
  async function openChildren(item) {
    cancel(); parent = item; children = []; controller = new AbortController(); const signal = controller.signal;
    $('mediaBack').hidden = false; $('mediaWhole').textContent = 'Use the whole ' + (item.kind === 'tv' ? 'series' : 'podcast'); $('mediaFilter').value = '';
    show([], { episodes: true }); say('Loading episodes of ' + item.title + '…');
    try {
      children = await catalog.children({ item, signal }); if (signal.aborted) return;
      // Anything typed in the episode box while they loaded still applies.
      filterEpisodes(); say(children.length + ' episodes. Type to find one.'); if (doc.activeElement !== $('mediaFilter')) $('mediaFilter').focus();
    }
    catch (error) { if (error?.name !== 'AbortError') say(error.message); }
  }
  function review(item) {
    chosen = item; $('mediaReview').hidden = false;
    const kinds = ACTIVITIES[item.kind] || [];
    $('mediaActivity').replaceChildren(...['', ...kinds].map(v => { const o = doc.createElement('option'); o.value = v; o.textContent = v || 'Just the reference'; return o; }));
    $('mediaActivity').disabled = !kinds.length;
    preview();
    $('mediaSource').textContent = (SOURCES[item.source]?.note || '') + ' Mentioning it does not record that you watched, read or played it unless you choose that above.';
    $('mediaInsert').focus();
  }
  function preview() {
    try { $('mediaText').value = chosen.plain ? chosen.reference : mediaReference(chosen, $('mediaActivity').value); $('mediaInsert').disabled = false; }
    catch (error) { $('mediaText').value = ''; $('mediaInsert').disabled = true; say(error.message); }
  }
  function open() {
    if (editor.readOnly) { status('Unlock this journal to add media.'); return; }
    caret = editor.selectionEnd; chosen = null; parent = null;
    $('mediaReview').hidden = true; $('mediaBack').hidden = true; show([]); say('');
    dialog.showModal(); $('mediaQuery').focus(); $('mediaQuery').select();
  }
  $('mediaForm').onsubmit = event => { event.preventDefault(); run($('mediaQuery').value); };
  $('mediaQuery').addEventListener('input', () => { win.clearTimeout(timer); const words = $('mediaQuery').value; timer = win.setTimeout(() => run(words), $('mediaOnline').checked ? 600 : 150); });
  $('mediaKind').onchange = () => { if ($('mediaQuery').value.trim()) run($('mediaQuery').value); };
  $('mediaOnline').onchange = () => { try { win.localStorage.setItem(ONLINE, $('mediaOnline').checked ? 'on' : 'off'); } catch { /* this visit only */ } if ($('mediaQuery').value.trim()) run($('mediaQuery').value); };
  function filterEpisodes() { const words = $('mediaFilter').value.trim().toLowerCase(); show(words ? children.filter(e => (e.title + ' ' + e.detail).toLowerCase().includes(words)) : children, { episodes: true }); }
  $('mediaFilter').addEventListener('input', filterEpisodes);
  $('mediaBackBtn').onclick = () => run($('mediaQuery').value);
  $('mediaWhole').onclick = () => parent && review(parent);
  $('mediaActivity').onchange = preview;
  $('mediaAgain').onclick = () => { $('mediaReview').hidden = true; $('mediaQuery').focus(); };
  $('mediaInsert').onclick = () => {
    const text = $('mediaText').value; if (!text) return;
    const at = Math.min(caret, editor.value.length), before = editor.value[at - 1];
    const lead = at && before && !/\s/.test(before) ? ' ' : '';
    cancel(); dialog.close();
    applyWritingEdit(editor, { start: at, end: at, text: lead + text, selectionStart: at + lead.length + text.length, selectionEnd: at + lead.length + text.length });
    status('Added ' + (chosen?.title || 'the reference') + '. Undo removes it.');
  };
  $('mediaClose').onclick = () => { cancel(); dialog.close(); editor.focus(); };
  dialog.addEventListener('close', cancel);
  button.onclick = open;
  return { open, results: () => results };
}
