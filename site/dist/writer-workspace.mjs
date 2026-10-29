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
  }
  function showWriting() {
    if (root.getAttribute('data-writer-view') === 'preview') { chosenView = 'write'; view(chosenView); }
  }
  // Chromium cannot focus or natively edit a display:none textarea. Reveal it
  // before an action captures its caret or starts an undoable edit.
  for (const id of ['writerFindBtn', 'todayBtn', 'quickBtn', 'rolloverBtn', 'reviewBtn', 'methodsBtn', 'currentTimeBtn', 'locationCaptureBtn', 'entryTimezoneBtn', 'musicBtn', 'importHealthBtn', 'importCsvBtn', 'voiceBtn']) $(id).addEventListener('click', showWriting, { capture: true });
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
  view('write'); disclosures();

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
    dialog.addEventListener('close', () => { if (!doc.querySelector('dialog[open]')) editor.focus({ preventScroll: true }); });
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

  const commands = chooser('writerCommands', 'Tools', 'Find a writing tool, journal action or setting.', 'Find a tool');
  const formatting = [
    ['Bold', 'bold', 'Control+B · Command+B'], ['Italic', 'italic', 'Control+I · Command+I'], ['Inline code', 'code'],
    ['Link', 'link'], ['Heading', 'heading'], ['Bullet list', 'bullet'], ['Numbered list', 'number'],
    ['Jot task', 'task'], ['Quote', 'quote'], ['Indent', 'indent'], ['Outdent', 'outdent'],
  ].map(([label, action, hint]) => ({ label, detail: hint || 'Format writing', run: () => { showWriting(); tools.run(action); } }));
  const targets = [
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
    ['downloadJot', 'Download journal', '.jot or .jotz'], ['markdownBtn', 'Export Markdown', 'Writing as .md'],
    ['printBtn', 'Print or PDF', 'Formatted pages'], ['exportPage', 'Download page', 'Standalone HTML'],
    ['icsBtn', 'Export calendar', 'Events and tasks as .ics'], ['numbersCsvBtn', 'Export numbers', 'Measurements as CSV'],
    ['tasksCsvBtn', 'Export tasks', 'Tasks as CSV'], ['importCsvBtn', 'Import numbers CSV', 'Review measurements from a file'],
    ['paletteCssBtn', 'Copy palette CSS', 'Colors at the caret'], ['paletteJsonBtn', 'Copy palette JSON', 'Colors at the caret'],
    ['roadmapBtn', 'Roadmap', 'Current features and planned work'],
  ].map(([id, label, detail]) => ({ label, detail, run: () => $(id).click() }));
  const panels = [
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
    for (const item of matches) {
      const button = element('button', undefined, { type: 'button' });
      button.append(element('strong', item.label), element('span', detailOf(item)));
      button.onclick = () => commands.choose(item.run); commands.list.append(button);
    }
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
