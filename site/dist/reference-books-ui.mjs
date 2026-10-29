import { referenceBook, saveReference, bookTargets, valuesOf, mapURL, PERSON_FIELDS, PLACE_FIELDS } from './reference-books.mjs';
import * as storage from './jot/storage.mjs';
const NAMES = { label: 'Display name', alias: 'Other names (one per line)', 'given-name': 'Given name', 'family-name': 'Family name', pronouns: 'Pronouns', organization: 'Organization', email: 'Email addresses (one per line)', phone: 'Phone numbers (one per line)', website: 'Websites (HTTPS, one per line)', address: 'Postal address', place: 'Place reference (optional, for example places.jot#home)', kind: 'Kind of place', 'address-line1': 'Address line 1', 'address-line2': 'Address line 2', locality: 'City / locality', region: 'State / region', 'postal-code': 'Postal code', country: 'Country', 'country-code': 'Country code (two letters)', latitude: 'Latitude (decimal degrees)', longitude: 'Longitude (decimal degrees)', 'altitude-m': 'Elevation (metres)', 'accuracy-m': 'Coordinate accuracy (metres)', timezone: 'IANA timezone (for example Europe/London)', directions: 'Directions', accessibility: 'Accessibility notes', notes: 'Notes', 'captured-at': 'Location captured at (timestamp)', source: 'Source' };
export function setupReferenceBooks({ changed = () => {} } = {}) {
  const $ = (id) => document.getElementById(id), dialog = $('referenceBooksDialog'), books = new Map();
  let editing = '', idDirty = false, loading = 0, ready, storageFailed = false, pendingPlace = null;
  $('referenceBookCreate').disabled = $('referenceBooksOpen').disabled = true;
  const say = (text) => { $('referenceBooksStatus').textContent = text + (storageFailed ? ' Browser storage could not be updated. Download the books; previously saved browser copies may remain.' : ''); };
  const current = () => books.get($('referenceBookSelect').value);
  const entries = () => [...books.values()];
  const persist = async () => {
    storageFailed = false;
    try {
      if ($('referenceBooksRemember').checked) await storage.put('references', 'library-v1', entries().map(({ name, source }) => ({ name, source })));
      else await storage.remove('references', 'library-v1');
    } catch { storageFailed = true; }
  };
  const getValues = () => Object.fromEntries([...$('referenceRecordFields').querySelectorAll('[data-reference-field]')].map((input) => [input.dataset.referenceField, input.value]));
  const map = () => { const url = $('referenceRecordType').value === 'place' ? mapURL(getValues()) : null; $('referenceMap').hidden = !url; if (url) $('referenceMap').href = url; };
  function form(type = 'person', node = null, draft = {}) {
    editing = node?.id || ''; idDirty = !!editing;
    $('referenceRecordType').value = type; $('referenceRecordType').disabled = !!editing;
    $('referenceRecordId').value = editing; $('referenceRecordId').readOnly = !!editing;
    const fallbackId = type + '-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
    const data = node ? valuesOf(node) : draft, host = $('referenceRecordFields'); host.replaceChildren();
    const fields = type === 'person' ? PERSON_FIELDS : PLACE_FIELDS;
    for (const key of fields) {
      const wrapper = document.createElement('div'), label = document.createElement('label');
      const multiline = ['alias', 'email', 'phone', 'website', 'address', 'directions', 'accessibility', 'notes'].includes(key);
      const input = document.createElement(multiline ? 'textarea' : 'input');
      input.id = 'referenceField-' + key; input.dataset.referenceField = key; input.value = data[key] || '';
      if (multiline) input.rows = key === 'notes' || key === 'address' ? 3 : 2;
      else input.type = 'text';
      input.maxLength = ['notes', 'directions', 'accessibility'].includes(key) ? 5000 : 1000;
      if (key === 'label') input.required = true;
      label.htmlFor = input.id; label.textContent = NAMES[key] || key; wrapper.append(label, input); host.append(wrapper);
      input.addEventListener('input', () => {
        if (key === 'label' && !editing && !idDirty) {
          const slug = input.value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 110);
          $('referenceRecordId').value = slug ? type + '-' + slug : input.value.trim() ? fallbackId : '';
        }
        map();
      });
    }
    if (!node && data.label) $('referenceField-label').dispatchEvent(new Event('input'));
    map(); $('referenceSave').textContent = editing ? 'Save changes to book' : 'Add to book';
    $('referenceRecordEditor').hidden = !current();
  }
  function list() {
    const book = current(), filter = $('referenceRecordSearch').value.trim().toLowerCase();
    const host = $('referenceRecordList'); host.replaceChildren();
    for (const node of book?.records || []) {
      const values = valuesOf(node);
      if (filter && ![values.label, values.alias, values.locality, node.id].filter(Boolean).join(' ').toLowerCase().includes(filter)) continue;
      const li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.textContent = values.label + ' · ' + node.recordType;
      button.onclick = () => { form(node.recordType, node); $('referenceField-label').focus(); };
      li.append(button); host.append(li);
    }
    if (!host.childElementCount) { const li = document.createElement('li'); li.textContent = book ? 'No matching people or places yet.' : 'Open or create a book to begin.'; host.append(li); }
    for (const id of ['referenceBookDownload', 'referenceBookUnload', 'referenceAddPerson', 'referenceAddPlace']) $(id).disabled = !book;
  }
  function refresh(selected = $('referenceBookSelect').value) {
    const select = $('referenceBookSelect'); select.replaceChildren();
    for (const book of entries()) { const option = document.createElement('option'); option.value = book.name; option.textContent = book.name + ' · ' + book.records.length + ' records'; select.append(option); }
    if (books.has(selected)) select.value = selected;
    list(); if (pendingPlace && current()) { const draft = pendingPlace; pendingPlace = null; form('place', null, draft); } else form(); changed();
  }
  async function put(book) {
    books.set(book.name, { ...book, edited: true }); refresh(book.name); await persist();
  }
  $('referenceBooksBtn').onclick = async () => { dialog.showModal(); await ready; list(); $('referenceBookName').focus(); };
  $('referenceBooksClose').onclick = () => dialog.close();
  $('referenceBookCreate').onclick = async () => {
    try {
      const name = $('referenceBookName').value.trim();
      if (books.has(name)) throw new Error('That book is already open. Choose a different filename.');
      if (books.size >= 20) throw new Error('Open up to 20 reference books at a time.');
      await put(referenceBook(name, '---\nJot: 1.0\nTitle: People and places\n---\n'));
      say('Created ' + name + '. Add a person or place, then download the book to keep a file.');
    } catch (error) { say(error.message); }
  };
  $('referenceBooksOpen').onclick = () => $('referenceBooksFiles').click();
  $('referenceBooksFiles').onchange = async (event) => {
    const files = [...event.target.files]; event.target.value = ''; const version = ++loading;
    try {
      if (books.size + files.length > 20) throw new Error('Open up to 20 reference books at a time.');
      const staged = new Map();
      for (const file of files) {
        if (file.size > 1024 * 1024) throw new Error(file.name + ' is over the 1 MiB reference-book limit.');
        if (books.has(file.name) || staged.has(file.name)) throw new Error(file.name + ' is already open. Unload it first or use a different filename.');
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (bytes[0] === 0x50 && bytes[1] === 0x4b) throw new Error('Open a plain-text .jot reference book, not a packaged archive.');
        staged.set(file.name, referenceBook(file.name, new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)));
      }
      if (version !== loading) return;
      for (const [name, book] of staged) books.set(name, book);
      refresh(staged.keys().next().value); await persist(); say('Opened ' + staged.size + ' books for local suggestions. Their contents are not copied into your journal.');
    } catch (error) { say(error.message); }
  };
  $('referenceBookSelect').onchange = () => { list(); form(); };
  $('referenceRecordSearch').oninput = list;
  $('referenceAddPerson').onclick = () => { form('person'); $('referenceField-label').focus(); };
  $('referenceAddPlace').onclick = () => { form('place'); $('referenceField-label').focus(); };
  $('referenceRecordType').onchange = () => form($('referenceRecordType').value);
  $('referenceRecordId').oninput = () => { idDirty = true; };
  $('referenceRecordForm').onsubmit = async (event) => {
    event.preventDefault();
    try {
      const book = current(); if (!book) return;
      const next = saveReference(book, { type: $('referenceRecordType').value, id: $('referenceRecordId').value.trim(), values: getValues() }, editing);
      await put(next); say('Saved in ' + next.name + '. Download the book to update your file. Journal writing is unchanged.');
    } catch (error) { say(error.message); }
  };
  $('referenceBookDownload').onclick = () => {
    const book = current(); if (!book) return;
    const url = URL.createObjectURL(new Blob([book.source], { type: 'text/plain;charset=utf-8' })), link = document.createElement('a');
    link.href = url; link.download = book.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 15000); book.edited = false;
    say('Downloaded ' + book.name + '. Keep it alongside journals that reference it.');
  };
  $('referenceBookUnload').onclick = async () => {
    const book = current(); if (!book) return;
    if (book.edited && !confirm('Unload ' + book.name + '? Download it first to keep changes outside this browser.')) return;
    books.delete(book.name); refresh(); await persist(); say('Unloaded ' + book.name + '. Existing journal references remain unchanged.');
  };
  $('referenceBooksRemember').onchange = async () => { await persist(); say($('referenceBooksRemember').checked ? 'Books are remembered in this browser. Download files as a separate backup.' : 'Books stay in memory for this page only. Download them before leaving.'); };
  ready = (async () => {
    try {
      const saved = await storage.get('references', 'library-v1');
      if (Array.isArray(saved) && saved.length <= 20) {
        const restored = saved.map((book) => referenceBook(book.name, book.source));
        for (const book of restored) books.set(book.name, book);
        $('referenceBooksRemember').checked = true; refresh();
      }
    } catch { say('Saved reference books could not be restored. Open your .jot files to load them.'); }
    form(); list(); $('referenceBookCreate').disabled = $('referenceBooksOpen').disabled = false;
  })();
  return {
    targets: () => bookTargets(entries()),
    async draftPlace(values) {
      dialog.showModal(); await ready;
      if (current()) { form('place', null, values); say('Review and name this captured place, then save it to the selected book. Journal writing is unchanged.'); }
      else { pendingPlace = values; say('Create or open a book to save this captured place. The draft is kept in memory until you do.'); }
    },
    async open(href) {
      dialog.showModal(); await ready;
      const [name, id] = href.split('#'), book = books.get(name), record = book?.records.find((node) => node.id === id);
      if (record) { $('referenceRecordSearch').value = ''; $('referenceBookSelect').value = name; list(); form(record.recordType, record); say('Viewing ' + valuesOf(record).label + ' in ' + name + '.'); }
      else { $('referenceRecordEditor').hidden = true; say('Open ' + name + ' here to view this reference. No file was fetched.'); }
    }
  };
}
