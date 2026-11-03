import { parse } from './jot/jot.mjs';
import { setupWritingTools } from './writing-tools.mjs';
import { setupWriterSearch } from './writer-search.mjs';
import { setupWriterTemplates } from './writer-templates.mjs';

// Only parsed headings belong in the outline: fenced examples, comments and record fields stay out.
export function outlineItems(source) {
  const ast = parse(source), bytes = new TextEncoder().encode(source), decoder = new TextDecoder('utf-8', { ignoreBOM: true });
  let byte = 0, position = 0;
  return ast.nodes.filter(node => node.type === 'heading').map(node => {
    position += decoder.decode(bytes.subarray(byte, node.start)).length; byte = node.start;
    return { label: node.text, level: node.level, date: node.date || '', position };
  });
}

const TOOL_GROUPS = [
  ['Start writing', ['Today', 'Quick note', 'Voice typing', 'Writing invitations', 'Entry templates', 'AI companion']],
  ['Find your way', ['Find and replace', 'Outline', 'Page preview', 'Write only', 'Side by side', 'Focus mode']],
  ['Add to an entry', ['Insert current time', 'Capture location', 'Attach a file', 'People and Places', 'Music and background media', 'Voice practice', 'Carry tasks forward', 'Week review', 'Annotate page', 'Connected sources', 'Import health data', 'Import numbers CSV', 'Entry timezone']],
  ['Save, open and share', ['Save', 'Save as', 'Open a journal', 'New journal', 'Download journal', 'Print or PDF', 'Download page', 'Export Markdown', 'Export Jot source', 'Export calendar', 'Export numbers', 'Export tasks', 'Open imported file', 'Attached files', 'Rename document']],
  ['Privacy', ['Journal lock and ways in', 'Entries, privacy and search', 'Offline, sharing and nearby transfer']],
  ['Look and feel', ['Writing preferences', 'Live editing', 'Source editing', 'Formatting controls', 'Writing options', 'Journal tools', 'Music player', 'Copy palette CSS', 'Copy palette JSON']],
  ['Formatting', ['Bold', 'Italic', 'Heading', 'Jot task', 'Bullet list', 'Numbered list', 'Quote', 'Link', 'Inline code', 'Indent', 'Outdent']],
];

export function setupWriterWorkspace({ editor, status, showPreview }) {
  const doc = editor.ownerDocument, win = doc.defaultView, root = doc.documentElement, $ = id => doc.getElementById(id);
  const tools = setupWritingTools({ editor, status }), search = setupWriterSearch({ editor, status }), templates = setupWriterTemplates({ editor, status });
  const smart = $('writerSmartLists');
  smart.checked = tools.smartLists;
  smart.onchange = () => tools.setSmartLists(smart.checked);
  for (const button of doc.querySelectorAll('[data-write-action]')) button.onclick = () => tools.run(button.dataset.writeAction);
  $('writerFindBtn').onclick = search.open;

  const narrow = win.matchMedia('(max-width: 850px)');
  let chosenView = null, toolsExpanded = false, colorsExpanded = false, previewAllowed = !root.hasAttribute('data-hide-preview');
  function view(value) {
    const active = !previewAllowed || value === 'split' && narrow.matches ? 'write' : value;
    root.setAttribute('data-writer-view', active);
    for (const name of ['write', 'preview', 'split']) $('writerView' + name[0].toUpperCase() + name.slice(1)).setAttribute('aria-pressed', String(name === active));
    $('writerPreviewToggle').setAttribute('aria-pressed', String(active !== 'write'));
    $('writerPreviewToggle').textContent = active === 'preview' ? 'Write' : 'Preview';
    for (const name of ['write', 'preview']) {
      const item = doc.querySelector('.writer-nav [data-nav="' + name + '"]');
      if (item) { if (name === active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current'); }
    }
  }
  function showWriting() {
    if (root.getAttribute('data-writer-view') === 'preview') { chosenView = 'write'; view(chosenView); }
  }
  // Chromium cannot focus or natively edit a display:none textarea. Reveal it
  // before an action captures its caret or starts an undoable edit.
  for (const id of ['writerArchiveBtn', 'writerSourcesBtn', 'writerBrowserBtn', 'writerAnnotateBtn', 'writerAIBtn', 'writerVoiceWritingBtn', 'writerFindBtn', 'todayBtn', 'quickBtn', 'rolloverBtn', 'reviewBtn', 'methodsBtn', 'currentTimeBtn', 'locationCaptureBtn', 'entryTimezoneBtn', 'musicBtn', 'importHealthBtn', 'importCsvBtn', 'voiceBtn']) $(id).addEventListener('click', showWriting, { capture: true });
  function selectView(name) {
    chosenView = name;
    if (name !== 'write') showPreview();
    view(name);
    if (name === 'write') editor.focus({ preventScroll: true });
  }
  for (const name of ['write', 'preview', 'split']) $('writerView' + name[0].toUpperCase() + name.slice(1)).onclick = () => selectView(name);
  $('writerPreviewToggle').onclick = () => selectView(root.getAttribute('data-writer-view') === 'write' ? (narrow.matches ? 'preview' : 'split') : 'write');
  function disclosures() {
    const row = doc.querySelector('.tool-row');
    row.hidden = !toolsExpanded;
    $('writerToolsToggle').setAttribute('aria-expanded', String(toolsExpanded));
    $('writerToolsToggle').textContent = toolsExpanded ? 'Close journal tools' : 'Journal tools';
    doc.querySelector('.format-tools').hidden = !colorsExpanded || doc.querySelector('.writer-format').hidden;
    $('writerColorsToggle').setAttribute('aria-expanded', String(colorsExpanded));
  }
  $('writerToolsToggle').onclick = () => { toolsExpanded = !toolsExpanded; disclosures(); };
  $('writerColorsToggle').onclick = () => { colorsExpanded = !colorsExpanded; disclosures(); };
  narrow.addEventListener('change', () => {
    view(chosenView || 'write');
  });
  bottomNavigation();
  view('write'); disclosures();

  // Phones get a Material 3 style navigation bar; Tools opens the grouped tool list as a bottom sheet.
  function bottomNavigation() {
    const phone = win.matchMedia('(max-width: 700px)');
    const nav = doc.createElement('nav');
    nav.className = 'writer-nav'; nav.setAttribute('aria-label', 'Writer');
    const shape = path => '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
    const items = [
      ['write', 'Write', '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>', () => selectView('write')],
      ['preview', 'Preview', '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>', () => selectView('preview')],
      ['find', 'Find', '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', () => $('writerFindBtn').click()],
      ['tools', 'Tools', '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>', () => $('writerCommandsBtn').click()],
    ];
    for (const [name, label, path, run] of items) {
      const item = doc.createElement('button');
      item.type = 'button'; item.dataset.nav = name;
      // Icons are static markup; the label is text.
      item.innerHTML = '<span class="writer-nav-indicator">' + shape(path) + '</span>';
      const text = doc.createElement('span'); text.className = 'writer-nav-label'; text.textContent = label; item.append(text);
      if (name === 'tools') item.setAttribute('aria-haspopup', 'dialog');
      item.onclick = run; nav.append(item);
    }
    (doc.querySelector('.studio-workspace') || doc.body).append(nav);
    historyButtons();
    formattingStrip(phone);
  }

  // Undo and redo, always in view: in live editing they use its own history, in source editing the browser's.
  function historyButtons() {
    const bar = doc.querySelector('.studio-bar');
    if (!bar || $('writerUndo')) return;
    const group = element('div', undefined, { class: 'writer-history', role: 'group', 'aria-label': 'Undo and redo' });
    const make = (id, label, keys, path, redo) => {
      const button = element('button', undefined, { id, type: 'button', 'aria-label': label, title: label + ' (' + keys + ')', 'aria-keyshortcuts': keys });
      button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
      // Keep the caret where it is: the button must not take focus from the writing.
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.onclick = () => {
        showWriting();
        if (editor.jotUndo) editor.jotUndo(redo);
        else { editor.focus(); doc.execCommand(redo ? 'redo' : 'undo'); }
      };
      group.append(button);
    };
    make('writerUndo', 'Undo', 'Control+Z Meta+Z', '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>', false);
    make('writerRedo', 'Redo', 'Control+Shift+Z Meta+Shift+Z', '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>', true);
    bar.querySelector('.writer-brand')?.after(group);
  }

  // On phones the formatting buttons start visible, as a strip that scrolls sideways above the writing.
  function formattingStrip(phone) {
    const panel = doc.querySelector('.writer-format');
    if (!panel) return;
    for (const button of panel.querySelectorAll('button')) button.addEventListener('pointerdown', event => event.preventDefault());
    if (phone.matches) { panel.hidden = false; disclosures(); }
  }

  function element(tag, text, attributes = {}) {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }
  function chooser(id, title, help, placeholder) {
    const dialog = element('dialog', undefined, { id: id + 'Dialog', class: 'writer-dialog', 'aria-labelledby': id + 'Heading' });
    const header = element('div', undefined, { class: 'dialog-header' });
    const close = element('button', 'Close', { type: 'button', class: 'button', 'aria-label': 'Close ' + title.toLowerCase() });
    close.onclick = () => dialog.close();
    header.append(element('h2', title, { id: id + 'Heading' }), close);
    const input = element('input', undefined, { id: id + 'Search', type: 'search', placeholder, 'aria-label': placeholder, autocomplete: 'off' });
    const list = element('div', undefined, { id: id + 'List', class: 'writer-choice-list' });
    const count = element('p', '', { class: 'small', role: 'status', 'aria-live': 'polite' });
    dialog.append(header, element('p', help, { class: 'small' }), input, count, list); doc.body.append(dialog);
    let selection;
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !event.isComposing && !event.defaultPrevented) { event.preventDefault(); dialog.close(); }
    });
    dialog.addEventListener('close', () => { const active = doc.activeElement; if (!doc.querySelector('dialog[open]') && (dialog.contains(active) || !active?.matches('input,textarea,[contenteditable=true]'))) editor.focus({ preventScroll: true }); });
    input.onkeydown = event => {
      if (!event.isComposing && event.key === 'ArrowDown') { const first = list.querySelector('button'); if (first) { event.preventDefault(); first.focus(); } }
      else if (!event.isComposing && event.key === 'Enter') { const first = list.querySelector('button'); if (first) { event.preventDefault(); first.click(); } }
    };
    list.onkeydown = event => {
      if (event.isComposing || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const buttons = [...list.querySelectorAll('button')], at = buttons.indexOf(doc.activeElement);
      if (at < 0) return;
      event.preventDefault();
      const next = at + (event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) input.focus(); else buttons[next % buttons.length].focus();
    };
    return {
      dialog, input, list, count,
      open() { selection = [editor.selectionStart, editor.selectionEnd, editor.selectionDirection]; input.value = ''; dialog.showModal(); input.focus(); },
      // Actions own their focus. Focusing the editor before opening another
      // dialog makes Chromium restore an older caret when that dialog closes.
      choose(action) { dialog.close(); editor.setSelectionRange(...selection); action(); },
    };
  }

  const commands = chooser('writerCommands', 'Tools', 'Everything Writer can do, in groups. Type to search.', 'Search tools');
  const formatting = [
    ['Bold', 'bold', 'Control+B · Command+B'], ['Italic', 'italic', 'Control+I · Command+I'], ['Inline code', 'code'],
    ['Link', 'link'], ['Heading', 'heading'], ['Bullet list', 'bullet'], ['Numbered list', 'number'],
    ['Jot task', 'task'], ['Quote', 'quote'], ['Indent', 'indent'], ['Outdent', 'outdent'],
  ].map(([label, action, hint]) => ({ label, detail: hint || 'Format writing', run: () => { showWriting(); tools.run(action); } }));
  const targets = [
    ['writerArchiveBtn', 'Entries, privacy and search', 'Choose protected entries and search the local archive'],
    ['writerSourcesBtn', 'Connected sources', 'Look up and review weather; no journal prose sent'],
    ['writerBrowserBtn', 'Offline, sharing and nearby transfer', 'Install, protect storage, share, review incoming items and pair devices'],
    ['writerAnnotateBtn', 'Annotate page', 'Write over a frozen page copy and keep editable strokes'],
    ['writerVoiceWritingBtn', 'Voice typing', 'Speak an entry. It is transcribed and tidied on this device, then you check it (voice writing)'],
    ['writerAIBtn', 'AI companion', 'Optional BYOK drafts and suggestions; OpenRouter or local models'],
    ['lockBtn', 'Journal lock and ways in', 'Encrypt this journal or manage its unlock methods'],
    ['saveDevice', 'Save', 'Save directly to the connected device file'], ['saveDeviceAs', 'Save as', 'Choose a new device file'], ['openImportedBtn', 'Open imported file', 'Use the browser file input without connecting a device file'],
    ['openBtn', 'Open a journal', '.jot, .jotz, Markdown or text'], ['newBtn', 'New journal', 'Start a blank journal'],
    ['writerFindBtn', 'Find and replace', 'Search writing'], ['writerOutlineBtn', 'Outline', 'Jump to an entry or heading'],
    ['todayBtn', 'Today', 'Add or find today’s entry'], ['quickBtn', 'Quick note', 'Add a line to today'],
    ['methodsBtn', 'Writing invitations', 'Templates and journal methods'], ['rolloverBtn', 'Carry tasks forward', 'Move earlier open tasks to today'],
    ['reviewBtn', 'Week review', 'Summarize tasks and numbers'], ['referenceBooksBtn', 'People and Places', 'Address and location books'],
    ['currentTimeBtn', 'Insert current time', 'Manual timestamp'], ['locationCaptureBtn', 'Capture location', 'Request and review location'],
    ['entryTimezoneBtn', 'Entry timezone', 'Override this dated entry'], ['focusBtn', 'Focus mode', 'Keep the writing in view'],
    ['prefsBtn', 'Writing preferences', 'Size, spacing, contrast and layout'], ['musicBtn', 'Music and background media', 'Attach tracks, albums, playlists, IMDb or YouTube references'],
    ['musicPlayerBtn', 'Music player', 'Load a persistent Spotify player'], ['voiceBtn', 'Voice practice', 'Optional pitch tool'],
    ['importHealthBtn', 'Import health data', 'Review daily measurements'], ['attachBtn', 'Attach a file', 'Keep files in a .jotz'],
    ['downloadJot', 'Download journal', 'Jotz v1 archive'], ['sourceJotBtn', 'Export Jot source', 'Unencrypted writing as .jot; attachments omitted'], ['markdownBtn', 'Export Markdown', 'Writing as .md'],
    ['printBtn', 'Print or PDF', 'Formatted pages'], ['exportPage', 'Download page', 'Standalone HTML'],
    ['icsBtn', 'Export calendar', 'Events and tasks as .ics'], ['numbersCsvBtn', 'Export numbers', 'Measurements as CSV'],
    ['tasksCsvBtn', 'Export tasks', 'Tasks as CSV'], ['importCsvBtn', 'Import numbers CSV', 'Review measurements from a file'],
    ['paletteCssBtn', 'Copy palette CSS', 'Colors at the caret'], ['paletteJsonBtn', 'Copy palette JSON', 'Colors at the caret'],
    ['roadmapBtn', 'Roadmap', 'Current features and planned work'],
  ].map(([id, label, detail]) => ({ label, detail, run: () => $(id).click() }));
  const panels = [
    { label: 'Rename document', detail: 'Edit the name above your writing', run: () => { $('documentName').focus(); $('documentName').select(); } },
    { label: 'Source editing', detail: 'Edit the complete plain Jot source', run: () => { showWriting(); editor.jotSetMode?.('source'); } },
    { label: 'Live editing', detail: 'Type directly in the formatted document', run: () => { showWriting(); editor.jotSetMode?.('live'); } },
    { label: 'Journal tools', detail: 'Show or hide journal action buttons', run: () => $('writerToolsToggle').click() },
    { label: 'Formatting controls', detail: 'Show or hide formatting buttons and Colors', run: () => { showWriting(); const panel = doc.querySelector('.writer-format'); panel.hidden = !panel.hidden; disclosures(); if (!panel.hidden) panel.scrollIntoView({ block: 'nearest' }); } },
    { label: 'Writing options', detail: 'Show or hide suggestions, writing hints and word count', run: () => { showWriting(); const footer = doc.querySelector('.writing-footer'); footer.hidden = !footer.hidden; root.toggleAttribute('data-writer-options', !footer.hidden); if (!footer.hidden) footer.scrollIntoView({ block: 'nearest' }); } },
    { label: 'Attached files', detail: 'Review, download or remove files in this journal', run: () => { const shelf = $('writerAssetShelf'); shelf.hidden = false; shelf.scrollIntoView({ block: 'nearest' }); } },
    { label: 'Write only', detail: 'Just the writing', run: () => selectView('write') },
    { label: 'Page preview', detail: 'Read the formatted pages', run: () => selectView('preview') },
    { label: 'Side by side', detail: 'Write beside the preview on a wide screen', run: () => selectView(narrow.matches ? 'preview' : 'split') },
    ...[['localSuggestionsEnabled', 'local suggestions'], ['checkToggle', 'writing hints'], ['writerSmartLists', 'list continuation']].map(([id, label]) => ({ label: 'Toggle ' + label, detail: () => label + ': ' + ($(id).checked ? 'on' : 'off'), run: () => { $(id).checked = !$(id).checked; $(id).dispatchEvent(new win.Event('change', { bubbles: true })); status(label[0].toUpperCase() + label.slice(1) + ($(id).checked ? ' on.' : ' off.')); } })),
    ...[['Template editor', '../editor/'], ['Converter', '../convert/'], ['Writing guides', '../guide/'], ['Example journals', '../examples/']].map(([label, url]) => ({ label, detail: 'Open ' + label.toLowerCase(), run: () => win.location.assign(url) })),
    ...[...doc.querySelectorAll('.resource-links a')].map(link => ({ label: link.textContent.replace(/\s*[↗↓]\s*$/, ''), detail: 'Reference and downloads', run: () => link.click() })),
  ];
  const allCommands = [...formatting, { label: 'Entry templates', detail: 'Review daily, weekly, monthly, meeting or freewriting prompts', run: () => { showWriting(); templates.open(); } }, ...panels, ...targets];
  const detailOf = item => typeof item.detail === 'function' ? item.detail() : item.detail;
  function renderCommands() {
    const query = commands.input.value.trim().toLocaleLowerCase(), terms = query.split(/\s+/).filter(Boolean);
    const rank = item => { const label = item.label.toLocaleLowerCase(); return label === query ? 0 : label.startsWith(query) ? 1 : 2; };
    const matches = allCommands.filter(item => terms.every(term => (item.label + ' ' + detailOf(item)).toLocaleLowerCase().includes(term))).sort((a, b) => rank(a) - rank(b));
    commands.list.replaceChildren(); commands.count.textContent = matches.length + (matches.length === 1 ? ' command' : ' commands');
    const add = item => {
      const button = element('button', undefined, { type: 'button' });
      button.append(element('strong', item.label), element('span', detailOf(item)));
      button.onclick = () => commands.choose(item.run); commands.list.append(button);
    };
    if (query) { for (const item of matches) add(item); return; }
    // Browsing: the same tools, grouped by what they help with, most useful first.
    const placed = new Set();
    for (const [title, labels] of TOOL_GROUPS) {
      const items = labels.map(label => matches.find(item => item.label === label)).filter(Boolean);
      if (!items.length) continue;
      commands.list.append(element('h3', title, { class: 'writer-choice-group' }));
      for (const item of items) { add(item); placed.add(item); }
    }
    const rest = matches.filter(item => !placed.has(item));
    if (rest.length) { commands.list.append(element('h3', 'Everything else', { class: 'writer-choice-group' })); for (const item of rest) add(item); }
  }
  commands.input.oninput = renderCommands;
  $('writerCommandsBtn').onclick = () => { commands.open(); renderCommands(); };
  doc.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'k' || doc.querySelector('dialog[open]')) return;
    if (event.target !== editor && event.target.closest('input,textarea,[contenteditable=true]')) return;
    event.preventDefault(); $('writerCommandsBtn').click();
  });

  const outline = chooser('writerOutline', 'Outline', 'Jump to a dated entry or heading in this journal.', 'Find an entry or heading');
  let headings = [], outlineSource = '';
  function renderOutline() {
    const query = outline.input.value.trim().toLocaleLowerCase(), matches = headings.filter(item => item.label.toLocaleLowerCase().includes(query));
    outline.list.replaceChildren(); outline.count.textContent = matches.length ? `${Math.min(1000, matches.length)} of ${matches.length} headings` : 'No matching headings. Add a heading with # or use Today.';
    for (const item of matches.slice(0, 1000)) {
      const button = element('button', undefined, { type: 'button' });
      button.style.setProperty('--outline-level', String(Math.min(item.level, 4)));
      button.append(element('strong', item.label), element('span', item.date ? 'Dated entry' : 'Heading ' + item.level));
      button.onclick = () => outline.choose(() => {
        if (editor.value !== outlineSource) { status('The writing changed. Open the outline again to refresh it.', true); return; }
        showWriting();
        editor.setSelectionRange(item.position, item.position); editor.focus();
        // A text-only mirror locates wrapped lines without modifying source or the undo stack.
        const style = win.getComputedStyle(editor), mirror = element('div');
        for (const key of ['font', 'lineHeight', 'letterSpacing', 'padding', 'border', 'boxSizing', 'tabSize']) mirror.style[key] = style[key];
        Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', width: editor.getBoundingClientRect().width + 'px' });
        mirror.textContent = editor.value.slice(0, item.position);
        const marker = element('span', '\u200b'); mirror.append(marker); doc.body.append(mirror);
        editor.scrollTop = Math.max(0, marker.offsetTop - 40); mirror.remove();
        status('Moved to ' + item.label + '.');
      });
      outline.list.append(button);
    }
  }
  outline.input.oninput = renderOutline;
  $('writerOutlineBtn').onclick = () => { outlineSource = editor.value; headings = outlineItems(outlineSource); outline.open(); renderOutline(); };
  return { tools, search, templates, syncPreview(enabled) { previewAllowed = !!enabled; view(chosenView || 'write'); } };
}
