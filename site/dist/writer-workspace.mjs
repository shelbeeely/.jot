import { parse } from './jot/jot.mjs';
import { setupWritingTools } from './writing-tools.mjs';
import { setupWriterSearch } from './writer-search.mjs';
import { setupWriterTemplates } from './writer-templates.mjs';
import { setupWriterMap } from './writer-map.mjs';
import { setupWriterMedia } from './writer-media.mjs';

// Only parsed headings belong in the outline: fenced examples, comments and record fields stay out.
export function outlineItems(source) {
  const ast = parse(source), bytes = new TextEncoder().encode(source), decoder = new TextDecoder('utf-8', { ignoreBOM: true });
  let byte = 0, position = 0;
  return ast.nodes.filter(node => node.type === 'heading').map(node => {
    position += decoder.decode(bytes.subarray(byte, node.start)).length; byte = node.start;
    return { label: node.text, level: node.level, date: node.date || '', position };
  });
}

const GRID = '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>';

// Keyboard shortcuts. Ctrl means Command on a Mac. Browsers keep some keys for themselves (new window, close tab,
// switch tab), so those actions also have a Ctrl+Alt form that works everywhere.
export const SHORTCUTS = [
  { group: 'Files', keys: ['Ctrl+Alt+N', 'Ctrl+N'], label: 'New journal', target: 'newBtn', scope: 'any', note: 'Ctrl+N works where the browser allows it, such as the desktop app' },
  { group: 'Files', keys: ['Ctrl+O'], label: 'Open a journal', target: 'openBtn', scope: 'any' },
  { group: 'Files', keys: ['Ctrl+S'], label: 'Save', builtin: true },
  { group: 'Files', keys: ['Ctrl+P'], label: 'Print or PDF', target: 'printBtn', scope: 'any' },
  { group: 'Find and tools', keys: ['Ctrl+K'], label: 'Search all tools', builtin: true },
  { group: 'Find and tools', keys: ['Ctrl+/'], label: 'Keyboard shortcuts', run: 'shortcuts', scope: 'any' },
  { group: 'Find and tools', keys: ['Ctrl+F'], label: 'Find', builtin: true },
  { group: 'Find and tools', keys: ['Ctrl+H'], label: 'Find and replace', run: 'replace', scope: 'any' },
  { group: 'Editing', keys: ['Ctrl+Z'], label: 'Undo', builtin: true },
  { group: 'Editing', keys: ['Ctrl+Y', 'Ctrl+Shift+Z'], label: 'Redo', run: 'redo', scope: 'edit' },
  { group: 'Editing', keys: ['Ctrl+A'], label: 'Select all', builtin: true },
  { group: 'Editing', keys: ['Ctrl+C', 'Ctrl+X', 'Ctrl+V'], label: 'Copy, cut and paste', builtin: true },
  { group: 'Editing', keys: ['Ctrl+Shift+V'], label: 'Paste as plain text', builtin: true, note: 'Live editing always pastes plain text' },
  { group: 'Formatting', keys: ['Ctrl+B'], label: 'Bold', builtin: true, action: 'bold' },
  { group: 'Formatting', keys: ['Ctrl+I'], label: 'Italic', builtin: true, action: 'italic' },
  { group: 'Formatting', keys: ['Ctrl+U'], label: 'Underline', action: 'underline', scope: 'edit' },
  { group: 'Formatting', keys: ['Ctrl+Shift+H'], label: 'Highlight', action: 'highlight', scope: 'edit' },
  { group: 'Formatting', keys: ['Ctrl+Shift+X'], label: 'Strikethrough', action: 'strike', scope: 'edit' },
  { group: 'Formatting', keys: ['Ctrl+Shift+P', 'Ctrl+.'], label: 'Superscript', action: 'superscript', scope: 'edit', note: 'One word at a time' },
  { group: 'Formatting', keys: ['Ctrl+Shift+Space', 'Ctrl+\\'], label: 'Clear formatting', action: 'clear', scope: 'edit' },
  { group: 'Formatting', keys: ['Ctrl+Shift+K'], label: 'Link', action: 'link', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+Alt+0', 'Ctrl+0'], label: 'Normal text', action: 'paragraph', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+Alt+1', 'Ctrl+1'], label: 'Heading 1', action: 'heading1', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+Alt+2', 'Ctrl+2'], label: 'Heading 2', action: 'heading2', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+Alt+3', 'Ctrl+3'], label: 'Heading 3', action: 'heading3', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+E'], label: 'Center the line', action: 'center', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+L'], label: 'Align left (remove centering)', action: 'left', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+Shift+7'], label: 'Numbered list', action: 'number', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+Shift+8'], label: 'Bulleted list', action: 'bullet', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+Shift+9'], label: 'Task', action: 'task', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+Shift+.'], label: 'Quote', action: 'quote', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+]'], label: 'Indent', action: 'indent', scope: 'edit' },
  { group: 'Lines and paragraphs', keys: ['Ctrl+['], label: 'Outdent', action: 'outdent', scope: 'edit' },
];
// Familiar from word processors, but not part of a plain-text journal, or kept by the browser.
export const UNAVAILABLE_SHORTCUTS = [
  ['Ctrl+D', 'Double underline', 'Jot has one underline, ++like this++.'],
  ['Ctrl+Shift+B', 'Subscript', 'Not in the Jot format yet; its syntax is still being settled.'],
  ['Ctrl+R, Ctrl+J', 'Align right or justify', 'Journal pages are left-aligned; a centred line is the one alternative.'],
  ['Ctrl+W, Ctrl+F4, Ctrl+Q', 'Close or quit', 'The browser or the desktop app window handles these. Writing is saved in the browser as you go.'],
];
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export function keyLabel(combo, mac = IS_MAC) {
  if (!mac) return combo;
  return combo.split('+').map(part => ({ Ctrl: '⌘', Shift: '⇧', Alt: '⌥', Space: 'Space' }[part] || part)).join('');
}
// "Ctrl+Shift+7" -> a matcher on a keydown event. Digits and Space use the physical key so Shift and Alt layouts still match.
export function shortcutMatcher(combo) {
  const parts = combo.split('+'), key = parts.at(-1), shift = parts.includes('Shift'), alt = parts.includes('Alt');
  const codes = { Space: 'Space', '.': 'Period', '/': 'Slash', '\\': 'Backslash', '[': 'BracketLeft', ']': 'BracketRight' };
  const code = /^\d$/.test(key) ? 'Digit' + key : codes[key] || (/^[A-Z]$/.test(key) ? 'Key' + key : null);
  return event => (event.ctrlKey || event.metaKey) && event.shiftKey === shift && event.altKey === alt
    && (event.key.toLowerCase() === key.toLowerCase() || (code && event.code === code));
}

const TOOL_GROUPS = [
  ['Start writing', ['Today', 'Quick note', 'Scribe', 'Scratchpad for this entry', 'Voice typing', 'Writing invitations', 'Entry templates', 'AI companion']],
  ['Find your way', ['Find and replace', 'Outline', 'Journal map', 'Media journal', 'Page preview', 'Write only', 'Side by side', 'Focus mode']],
  ['Add to an entry', ['Add media', 'Margin note', 'Annotate page', 'Insert current time', 'Capture location', 'Attach a file', 'People and Places', 'Music and background media', 'Voice practice', 'Carry tasks forward', 'Week review', 'Annotate page', 'Connected sources', 'Import health data', 'Import numbers CSV', 'Entry timezone']],
  ['Save, open and share', ['Save', 'Save as', 'Open a journal', 'New journal', 'Download journal', 'Print or PDF', 'Download page', 'Export Markdown', 'Export Jot source', 'Export calendar', 'Export numbers', 'Export tasks', 'Open imported file', 'Attached files', 'Rename document']],
  ['Privacy', ['Journal lock and ways in', 'Entries, privacy and search', 'Offline, sharing and nearby transfer']],
  ['Look and feel', ['Writing preferences', 'Live editing', 'Source editing', 'Formatting controls', 'Writing options', 'Journal tools', 'Music player', 'Copy palette CSS', 'Copy palette JSON']],
  ['Formatting', ['Bold', 'Italic', 'Underline', 'Highlight', 'Strikethrough', 'Superscript', 'Clear formatting', 'Clear formatting in this entry', 'Pen and ink for this entry', 'Heading', 'Heading 1', 'Heading 2', 'Heading 3', 'Normal text', 'Center the line', 'Jot task', 'Bullet list', 'Numbered list', 'Quote', 'Link', 'Inline code', 'Indent', 'Outdent']],
  ['Help', ['Keyboard shortcuts']],
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
  let map = null, media = null, chosenView = null, toolsExpanded = false, colorsExpanded = false, previewAllowed = !root.hasAttribute('data-hide-preview');
  function view(value) {
    const active = value === 'map' || value === 'media' ? value : !previewAllowed || value === 'split' && narrow.matches ? 'write' : value;
    root.setAttribute('data-writer-view', active);
    if (active === 'map') map?.show(); else map?.hide();
    if (active === 'media') media?.show(); else media?.hide();
    $('writerMapToggle')?.setAttribute('aria-pressed', String(active === 'map'));
    $('writerMediaToggle')?.setAttribute('aria-pressed', String(active === 'media'));
    for (const name of ['write', 'preview', 'split']) $('writerView' + name[0].toUpperCase() + name.slice(1)).setAttribute('aria-pressed', String(name === active));
    $('writerPreviewToggle').setAttribute('aria-pressed', String(active === 'preview' || active === 'split'));
    $('writerPreviewToggle').textContent = active === 'preview' ? 'Write' : 'Preview';
    for (const name of ['write', 'preview', 'map', 'media']) {
      const item = doc.querySelector('.writer-nav [data-nav="' + name + '"]');
      if (item) { if (name === active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current'); }
    }
  }
  function showWriting() {
    if (['preview', 'map', 'media'].includes(root.getAttribute('data-writer-view'))) { chosenView = 'write'; view(chosenView); }
  }
  // Chromium cannot focus or natively edit a display:none textarea. Reveal it
  // before an action captures its caret or starts an undoable edit.
  for (const id of ['writerArchiveBtn', 'writerSourcesBtn', 'writerBrowserBtn', 'writerAnnotateBtn', 'writerAIBtn', 'writerVoiceWritingBtn', 'scribeBtn', 'scratchpadBtn', 'marginNoteBtn', 'mediaPickerBtn', 'writerFindBtn', 'todayBtn', 'quickBtn', 'rolloverBtn', 'reviewBtn', 'methodsBtn', 'currentTimeBtn', 'locationCaptureBtn', 'entryTimezoneBtn', 'entryPenBtn', 'musicBtn', 'importHealthBtn', 'importCsvBtn', 'voiceBtn']) $(id).addEventListener('click', showWriting, { capture: true });
  function selectView(name) {
    chosenView = name;
    if (!['write', 'map', 'media'].includes(name)) showPreview();
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
  // The journal map: a calendar canvas of entries, links and threads. It clears whenever the journal locks.
  map = setupWriterMap({ editor, status, jumpTo: (position, label) => { selectView('write'); jumpTo(position, 'the entry for ' + label); } });
  // The media journal: every film, series, book, anime, podcast, game and song the entries mention. Read-only; clears on lock.
  media = setupWriterMedia({ editor, status, jumpTo: (position, label) => { selectView('write'); jumpTo(position, 'the mention on ' + label); }, documentName: () => $('documentName').value, addMedia: () => { selectView('write'); $('mediaPickerBtn')?.click(); } });
  new MutationObserver(() => { if (editor.readOnly) { map.reset(); media.reset(); } }).observe(editor, { attributes: true, attributeFilter: ['readonly'] });
  {
    const mapToggle = element('button', 'Map', { id: 'writerMapToggle', type: 'button', 'aria-pressed': 'false', title: 'Every entry on a calendar, with the links between them' });
    mapToggle.onclick = () => selectView(root.getAttribute('data-writer-view') === 'map' ? 'write' : 'map');
    $('writerPreviewToggle').after(mapToggle);
    const mediaToggle = element('button', 'Media', { id: 'writerMediaToggle', type: 'button', 'aria-pressed': 'false', title: 'Every film, series, book, podcast, game and song your entries mention' });
    mediaToggle.onclick = () => selectView(root.getAttribute('data-writer-view') === 'media' ? 'write' : 'media');
    mapToggle.after(mediaToggle);
  }
  bottomNavigation();
  view('write'); disclosures();

  // Phones get a Material 3 flexible navigation bar; Tools opens the grouped tool list as a bottom sheet.
  function bottomNavigation() {
    const phone = win.matchMedia('(max-width: 700px)');
    const nav = doc.createElement('nav');
    nav.className = 'writer-nav'; nav.setAttribute('aria-label', 'Writer');
    // Material 3 flexible navigation bar: three destinations, outlined icons when inactive and filled when active.
    const svg = (path, filled) => '<svg class="writer-nav-icon ' + (filled ? 'is-filled' : 'is-outlined') + '" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
    const items = [
      ['write', 'Write', '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>', '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4" stroke="var(--writer-nav-indicator)"/>', 'write'],
      ['preview', 'Preview', '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>', '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3" fill="var(--writer-nav-indicator)" stroke="var(--writer-nav-indicator)"/>', 'preview'],
      ['map', 'Map', '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="7" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.4 6.2 16.5 7M6.3 8.2l4.4 7.6M17.7 9.2l-4.4 6.6"/>', '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="7" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.4 6.2 16.5 7M6.3 8.2l4.4 7.6M17.7 9.2l-4.4 6.6"/>', 'map'],
      ['media', 'Media', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3Z"/>', '<rect x="3" y="5" width="18" height="14" rx="2" fill="currentColor"/><path d="m10 9 5 3-5 3Z" fill="var(--writer-nav-indicator)" stroke="var(--writer-nav-indicator)"/>', 'media'],
    ];
    for (const [name, label, outlined, filled, destination] of items) {
      const item = doc.createElement('button');
      item.type = 'button'; item.dataset.nav = name;
      // Icons are static markup; the label is text.
      item.innerHTML = '<span class="writer-nav-indicator">' + svg(outlined, false) + svg(filled || outlined, true) + '</span>';
      const text = doc.createElement('span'); text.className = 'writer-nav-label'; text.textContent = label; item.append(text);
      if (destination) {
        item.onclick = () => {
          // Choosing the destination you are on returns to the top of it.
          if (item.getAttribute('aria-current') === 'page') { win.scrollTo({ top: 0, behavior: win.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); return; }
          selectView(destination);
        };
      }
      nav.append(item);
    }
    // One Tools button: the header's, which moves into the bar on phones and back on wider screens.
    const toolsButton = $('writerCommandsBtn'), toolsHome = toolsButton.parentElement, toolsNext = toolsButton.nextElementSibling;
    toolsButton.dataset.nav = 'tools'; toolsButton.setAttribute('aria-haspopup', 'dialog');
    toolsButton.innerHTML = '<span class="writer-nav-indicator">' + svg(GRID, false) + '</span>';
    const toolsLabel = doc.createElement('span'); toolsLabel.className = 'writer-nav-label'; toolsLabel.textContent = 'Tools'; toolsButton.append(toolsLabel);
    const placeTools = () => { if (phone.matches) nav.append(toolsButton); else if (toolsButton.parentElement !== toolsHome) toolsHome.insertBefore(toolsButton, toolsNext && toolsNext.parentElement === toolsHome ? toolsNext : null); };
    phone.addEventListener('change', placeTools);
    (doc.querySelector('.studio-workspace') || doc.body).append(nav);
    placeTools();
    historyButtons();
    formatMenu();
    pageSettings();
  }

  // Undo and redo, always in view: in live editing they use its own history, in source editing the browser's.
  function historyButtons() {
    const bar = doc.querySelector('.studio-bar');
    if (!bar || $('writerUndo')) return;
    const group = element('div', undefined, { class: 'writer-history', role: 'group', 'aria-label': 'Editing' });
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
    const find = element('button', undefined, { id: 'writerFindTop', type: 'button', 'aria-label': 'Find and replace', title: 'Find and replace (Ctrl/Cmd F)', 'aria-keyshortcuts': 'Control+f Meta+f' });
    find.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    find.onclick = () => $('writerFindBtn').click();
    group.append(find);
    bar.querySelector('.writer-brand')?.after(group);
  }

  // On phones the paper settings fold behind one button, so the page itself is in view.
  function pageSettings() {
    const tools = doc.querySelector('.paper-tools');
    if (!tools || $('paperSettingsToggle')) return;
    const toggle = element('button', 'Page settings', { id: 'paperSettingsToggle', type: 'button', class: 'quiet paper-settings-toggle', 'aria-expanded': 'false' });
    toggle.onclick = () => { const open = !tools.hasAttribute('data-open'); tools.toggleAttribute('data-open', open); toggle.setAttribute('aria-expanded', String(open)); };
    tools.prepend(toggle);
  }

  // Formatting and the writing font live in one menu beside undo and redo (Material 3 menu pattern).
  function formatMenu() {
    const group = doc.querySelector('.writer-history');
    if (!group || $('writerFormatTop')) return;
    const button = element('button', undefined, { id: 'writerFormatTop', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': 'writerFormatMenu', 'aria-label': 'Format', title: 'Format and font' });
    button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h11v2"/><path d="M9.5 5v14"/><path d="M7 19h5"/><path d="M14 13v-1.5h7V13"/><path d="M17.5 11.5V19"/><path d="M16 19h3"/></svg>';
    group.insertBefore(button, $('writerFindTop'));
    const menu = element('div', undefined, { id: 'writerFormatMenu', class: 'writer-menu', role: 'menu', 'aria-label': 'Format' });
    menu.hidden = true;
    const item = (label, hint, run, role = 'menuitem') => {
      const entry = element('button', undefined, { type: 'button', role, tabindex: '-1' });
      entry.append(element('span', label), ...(hint ? [element('span', hint, { class: 'writer-menu-hint' })] : []));
      // Keep the writing's selection: menu items never take focus on press.
      entry.addEventListener('pointerdown', event => event.preventDefault());
      entry.onclick = () => { close(); run(); };
      menu.append(entry); return entry;
    };
    const format = action => () => { showWriting(); tools.run(action); };
    const hint = action => { const shortcut = SHORTCUTS.find(entry => entry.action === action); return shortcut ? keyLabel(shortcut.keys[0]) : ''; };
    for (const [label, action] of [['Bold', 'bold'], ['Italic', 'italic'], ['Underline', 'underline'], ['Highlight', 'highlight'], ['Strikethrough', 'strike'], ['Superscript', 'superscript'], ['Heading 1', 'heading1'], ['Heading 2', 'heading2'], ['Heading 3', 'heading3'], ['Normal text', 'paragraph'], ['Center the line', 'center'], ['Task', 'task'], ['Bulleted list', 'bullet'], ['Numbered list', 'number'], ['Quote', 'quote'], ['Link', 'link'], ['Code', 'code'], ['Indent', 'indent'], ['Outdent', 'outdent'], ['Clear formatting', 'clear'], ['Clear formatting in this entry', 'clearEntry']]) item(label, hint(action), format(action));
    item('Pen and ink for this entry…', '', () => { showWriting(); $('entryPenBtn').click(); });
    item('Margin note…', '', () => { showWriting(); $('marginNoteBtn').click(); });
    item('Draw on a page…', '', () => { showWriting(); $('writerAnnotateBtn').click(); });
    item('Keyboard shortcuts…', keyLabel('Ctrl+/'), () => openShortcuts());
    item('Colors and highlights…', '', () => { showWriting(); const panel = doc.querySelector('.writer-format'); panel.hidden = false; colorsExpanded = true; disclosures(); panel.scrollIntoView({ block: 'nearest' }); });
    menu.append(element('div', undefined, { role: 'separator', class: 'writer-menu-divider' }));
    menu.append(element('p', 'Writing font (this browser only)', { class: 'writer-menu-heading', 'aria-hidden': 'true' }));
    const fonts = $('writerFont'), radios = [];
    for (const option of fonts ? [...fonts.options] : []) {
      const radio = item(option.textContent, '', () => { fonts.value = option.value; fonts.dispatchEvent(new Event('change', { bubbles: true })); }, 'menuitemradio');
      radio.dataset.font = option.value; radios.push(radio);
    }
    const sync = () => { for (const radio of radios) radio.setAttribute('aria-checked', String(radio.dataset.font === fonts.value)); };
    doc.body.append(menu);
    const entries = () => [...menu.querySelectorAll('[role^=menuitem]')];
    function place() {
      const rect = button.getBoundingClientRect(), width = Math.min(280, win.innerWidth - 16);
      menu.style.width = width + 'px';
      menu.style.left = Math.max(8, Math.min(win.innerWidth - width - 8, rect.right - width)) + 'px';
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.maxHeight = Math.max(160, win.innerHeight - rect.bottom - 16) + 'px';
    }
    function open(focusFirst) {
      sync(); menu.hidden = false; place(); button.setAttribute('aria-expanded', 'true');
      if (focusFirst) entries()[0]?.focus();
    }
    function close(returnFocus) {
      if (menu.hidden) return;
      menu.hidden = true; button.setAttribute('aria-expanded', 'false');
      if (returnFocus) button.focus();
    }
    button.addEventListener('pointerdown', event => event.preventDefault());
    button.onclick = event => { if (menu.hidden) open(event.detail === 0); else close(); };
    button.addEventListener('keydown', event => { if (['ArrowDown', 'Enter', ' '].includes(event.key) && menu.hidden) { event.preventDefault(); open(true); } });
    menu.addEventListener('keydown', event => {
      const list = entries(), at = list.indexOf(doc.activeElement);
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
      else if (event.key === 'Tab') close();
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (at + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
        list[next]?.focus();
      }
    });
    doc.addEventListener('pointerdown', event => { if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) close(); });
    doc.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden && !menu.contains(doc.activeElement)) close(); });
    win.addEventListener('resize', () => { if (!menu.hidden) place(); });
    win.addEventListener('scroll', () => { if (!menu.hidden) place(); }, { passive: true });
  }

  // Live editing shows its own surface while the source textarea is hidden; focus whichever is on screen.
  function returnToWriting() {
    const live = doc.getElementById('liveWriting');
    (live && live.getClientRects().length && root.getAttribute('data-editor-mode') === 'live' ? live : editor).focus({ preventScroll: true });
  }

  // Puts the caret at a source position and scrolls it into view; shared by the outline and the journal map.
  function jumpTo(position, label) {
    editor.setSelectionRange(position, position); editor.focus();
    // A text-only mirror locates wrapped lines without modifying source or the undo stack.
    const style = win.getComputedStyle(editor), mirror = element('div');
    for (const key of ['font', 'lineHeight', 'letterSpacing', 'padding', 'border', 'boxSizing', 'tabSize']) mirror.style[key] = style[key];
    Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', width: editor.getBoundingClientRect().width + 'px' });
    mirror.textContent = editor.value.slice(0, position);
    const marker = element('span', '\u200b'); mirror.append(marker); doc.body.append(mirror);
    editor.scrollTop = Math.max(0, marker.offsetTop - 40); mirror.remove();
    status('Moved to ' + label + '.');
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
    dialog.addEventListener('close', () => { const active = doc.activeElement; if (!doc.querySelector('dialog[open]') && (dialog.contains(active) || !active?.matches('input,textarea,[contenteditable=true]'))) returnToWriting(); });
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
    ['Underline', 'underline'], ['Highlight', 'highlight'], ['Strikethrough', 'strike'], ['Superscript', 'superscript'], ['Clear formatting', 'clear'], ['Clear formatting in this entry', 'clearEntry'],
    ['Heading 1', 'heading1'], ['Heading 2', 'heading2'], ['Heading 3', 'heading3'], ['Normal text', 'paragraph'], ['Center the line', 'center'],
  ].map(([label, action]) => ({ label, detail: 'Format writing', run: () => { showWriting(); tools.run(action); } }));
  const targets = [
    ['writerArchiveBtn', 'Entries, privacy and search', 'Choose protected entries and search the local archive'],
    ['writerSourcesBtn', 'Connected sources', 'Look up and review weather; no journal prose sent'],
    ['writerBrowserBtn', 'Offline, sharing and nearby transfer', 'Install, protect storage, share, review incoming items and pair devices'],
    ['writerAnnotateBtn', 'Annotate page', 'Draw or write by hand over a copy of a page; the strokes stay editable'],
    ['mediaPickerBtn', 'Add media', 'A film, series or episode, book, anime, podcast, game or song, as a reference; paste a link to look it up'],
    ['marginNoteBtn', 'Margin note', 'A short note beside the passage at your cursor, without changing your words'],
    ['scratchpadBtn', 'Scratchpad for this entry', 'Rough notes beside the entry, kept in the file and off the page'],
    ['scribeBtn', 'Scribe', 'Talk hands-free; every word goes into today’s entry as you say it, with optional questions when you pause'],
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
    ['entryTimezoneBtn', 'Entry timezone', 'Override this dated entry'], ['entryPenBtn', 'Pen and ink for this entry', 'Handwriting pen and ink for this dated entry; earlier entries stay as they are'], ['focusBtn', 'Focus mode', 'Keep the writing in view'],
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
    { label: 'Journal map', detail: 'Every entry on a calendar, with the links and threads between them', run: () => selectView('map') },
    { label: 'Media journal', detail: 'Every film, series, book, anime, podcast, game and song your entries mention, and a downloadable media log', run: () => selectView('media') },
    { label: 'Page preview', detail: 'Read the formatted pages', run: () => selectView('preview') },
    { label: 'Side by side', detail: 'Write beside the preview on a wide screen', run: () => selectView(narrow.matches ? 'preview' : 'split') },
    ...[['localSuggestionsEnabled', 'local suggestions'], ['checkToggle', 'writing hints'], ['writerSmartLists', 'list continuation']].map(([id, label]) => ({ label: 'Toggle ' + label, detail: () => label + ': ' + ($(id).checked ? 'on' : 'off'), run: () => { $(id).checked = !$(id).checked; $(id).dispatchEvent(new win.Event('change', { bubbles: true })); status(label[0].toUpperCase() + label.slice(1) + ($(id).checked ? ' on.' : ' off.')); } })),
    ...[['Template editor', '../editor/'], ['Converter', '../convert/'], ['Writing guides', '../guide/'], ['Example journals', '../examples/']].map(([label, url]) => ({ label, detail: 'Open ' + label.toLowerCase(), run: () => win.location.assign(url) })),
    ...[...doc.querySelectorAll('.resource-links a')].map(link => ({ label: link.textContent.replace(/\s*[↗↓]\s*$/, ''), detail: 'Reference and downloads', run: () => link.click() })),
  ];
  const allCommands = [...formatting, { label: 'Entry templates', detail: 'Review daily, weekly, monthly, meeting or freewriting prompts', run: () => { showWriting(); templates.open(); } }, ...panels, ...targets];
  allCommands.push({ label: 'Keyboard shortcuts', detail: 'Every shortcut, searchable (Ctrl/⌘ /)', run: () => openShortcuts() });
  // Show each command's shortcut beside it, and let a search for "ctrl b" find it.
  const aliases = { 'Bullet list': 'Bulleted list', 'Jot task': 'Task', 'Find and replace': 'Find and replace' };
  const ariaKeys = combos => combos.flatMap(combo => { const aria = combo.replace('Ctrl', 'Control').replace('Space', 'Space'); return [aria, aria.replace('Control', 'Meta')]; }).join(' ');
  for (const item of allCommands) {
    const shortcut = SHORTCUTS.find(entry => entry.label === (aliases[item.label] || item.label));
    if (shortcut) { item.keys = keyLabel(shortcut.keys[0]); item.ariaKeys = ariaKeys(shortcut.keys); }
  }

  // A searchable list of every shortcut, opened with Ctrl/⌘ / or from Tools.
  const shortcutsDialog = element('dialog', undefined, { id: 'writerShortcutsDialog', class: 'writer-dialog writer-shortcuts', 'aria-labelledby': 'writerShortcutsHeading' });
  {
    const header = element('div', undefined, { class: 'dialog-header' });
    const close = element('button', 'Close', { type: 'button', class: 'button', 'aria-label': 'Close keyboard shortcuts' });
    close.onclick = () => shortcutsDialog.close();
    header.append(element('h2', 'Keyboard shortcuts', { id: 'writerShortcutsHeading' }), close);
    const search = element('input', undefined, { id: 'writerShortcutsSearch', type: 'search', placeholder: 'Search shortcuts', 'aria-label': 'Search shortcuts', autocomplete: 'off' });
    const body = element('div', undefined, { id: 'writerShortcutsList' });
    shortcutsDialog.append(header, element('p', (IS_MAC ? '⌘ is Command, ⌥ Option, ⇧ Shift. ' : '') + 'Ctrl/⌘ K searches every tool, with or without a shortcut.', { class: 'small' }), search, body);
    const render = () => {
      const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const hit = text => terms.every(term => text.toLocaleLowerCase().includes(term));
      body.replaceChildren();
      const groups = [...new Set(SHORTCUTS.map(entry => entry.group))];
      for (const group of groups) {
        const rows = SHORTCUTS.filter(entry => entry.group === group && hit(entry.label + ' ' + entry.keys.join(' ') + ' ' + entry.keys.map(k => keyLabel(k)).join(' ') + ' ' + group));
        if (!rows.length) continue;
        body.append(element('h3', group, { class: 'writer-choice-group' }));
        const list = element('dl', undefined, { class: 'writer-shortcut-list' });
        for (const entry of rows) {
          const keys = element('dd');
          entry.keys.forEach((combo, index) => { if (index) keys.append(' or '); keys.append(element('kbd', keyLabel(combo))); });
          list.append(element('dt', entry.label + (entry.note ? ' · ' + entry.note : '')), keys);
        }
        body.append(list);
      }
      const missing = UNAVAILABLE_SHORTCUTS.filter(([keys, label, why]) => hit(keys + ' ' + label + ' ' + why));
      if (missing.length) {
        body.append(element('h3', 'Not in Writer', { class: 'writer-choice-group' }));
        const list = element('dl', undefined, { class: 'writer-shortcut-list' });
        for (const [keys, label, why] of missing) list.append(element('dt', label + ' · ' + why), element('dd', keyLabel(keys)));
        body.append(list);
      }
      if (!body.childNodes.length) body.append(element('p', 'No shortcut matches. Try Ctrl/⌘ K to search every tool.', { class: 'small' }));
    };
    search.oninput = render;
    shortcutsDialog.jotRender = render;
    // Closing returns the keyboard to the writing, so the next shortcut works.
    shortcutsDialog.addEventListener('close', () => { const active = doc.activeElement; if (!doc.querySelector('dialog[open]') && (shortcutsDialog.contains(active) || active === doc.body)) returnToWriting(); });
    doc.body.append(shortcutsDialog);
  }
  function openShortcuts() { if (shortcutsDialog.open) return; shortcutsDialog.querySelector('input').value = ''; shortcutsDialog.jotRender(); shortcutsDialog.showModal(); shortcutsDialog.querySelector('input').focus(); }

  // The shortcut handler runs after the editors' own handlers (bold, italic, undo, find), which mark events they used.
  const matchers = SHORTCUTS.filter(entry => !entry.builtin).map(entry => ({ entry, tests: entry.keys.map(shortcutMatcher) }));
  const inWriting = target => target === editor || !!target?.closest?.('#liveWriting');
  doc.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || !(event.ctrlKey || event.metaKey)) return;
    const found = matchers.find(({ tests }) => tests.some(test => test(event)));
    if (!found) return;
    const { entry } = found;
    if (entry.scope === 'edit' && !inWriting(event.target)) return;
    if (entry.scope === 'any' && doc.querySelector('dialog[open]') && !(entry.run === 'shortcuts' && shortcutsDialog.open)) return;
    event.preventDefault();
    if (entry.action) { showWriting(); tools.run(entry.action); }
    else if (entry.target) $(entry.target)?.click();
    else if (entry.run === 'shortcuts') { if (shortcutsDialog.open) shortcutsDialog.close(); else openShortcuts(); }
    else if (entry.run === 'replace') { showWriting(); search.open(); const find = $('writerSearchQuery'); (find?.value ? $('writerSearchReplacement') : find)?.focus(); }
    else if (entry.run === 'redo') { if (editor.jotUndo) editor.jotUndo(true); else { editor.focus(); doc.execCommand('redo'); } }
  });
  const detailOf = item => typeof item.detail === 'function' ? item.detail() : item.detail;
  function renderCommands() {
    const query = commands.input.value.trim().toLocaleLowerCase(), terms = query.split(/\s+/).filter(Boolean);
    const rank = item => { const label = item.label.toLocaleLowerCase(); return label === query ? 0 : label.startsWith(query) ? 1 : 2; };
    const matches = allCommands.filter(item => terms.every(term => (item.label + ' ' + detailOf(item) + ' ' + (item.keys || '')).toLocaleLowerCase().includes(term))).sort((a, b) => rank(a) - rank(b));
    commands.list.replaceChildren(); commands.count.textContent = matches.length + (matches.length === 1 ? ' command' : ' commands');
    const add = item => {
      const button = element('button', undefined, { type: 'button' });
      button.append(element('strong', item.label), element('span', detailOf(item)));
      if (item.keys) { const kbd = element('kbd', item.keys, { class: 'writer-choice-keys' }); button.querySelector('span').append(' ', kbd); button.setAttribute('aria-keyshortcuts', item.ariaKeys); }
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
    if (event.target !== editor && !event.target.closest?.('#liveWriting') && event.target.closest('input,textarea,[contenteditable=true]')) return;
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
        showWriting(); jumpTo(item.position, item.label);
      });
      outline.list.append(button);
    }
  }
  outline.input.oninput = renderOutline;
  $('writerOutlineBtn').onclick = () => { outlineSource = editor.value; headings = outlineItems(outlineSource); outline.open(); renderOutline(); };
  return { tools, search, templates, map, syncPreview(enabled) { previewAllowed = !!enabled; view(chosenView || 'write'); } };
}
