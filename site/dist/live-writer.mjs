import { projectSource } from './live-model.mjs';
import { parse } from './jot/jot.mjs';
import { renderPreview } from './jot/preview.mjs';
import { writingEdit, continueListEdit } from './writing-tools.mjs';
import { completionIndex, localSuggestions } from './local-autocomplete.mjs';

// The DOM is a projection, never a document serializer. All edits address Jot source.
export function setupLiveWriter({ editor, status, getReferences = () => [], asset = () => null, reference = () => {} }) {
  const doc = editor.ownerDocument, win = doc.defaultView, root = doc.documentElement;
  const surface = doc.createElement('div'); surface.id = 'liveWriting'; surface.className = 'live-writing';
  surface.contentEditable = 'true'; surface.spellcheck = true; surface.lang = editor.lang || 'en';
  surface.setAttribute('role', 'textbox'); surface.setAttribute('aria-label', 'Jot journal writing'); surface.setAttribute('aria-multiline', 'true');
  surface.setAttribute('data-placeholder', 'Start anywhere. A sentence is enough.');
  editor.before(surface);
  const focusSource = editor.focus.bind(editor), selectSource = editor.setSelectionRange.bind(editor);
  let active = true, source = editor.value, blocks = [], textLeaves = [], wrappers = [], internal = false, composing = false, composition = null;
  let history = [{ text: source, start: editor.selectionStart, end: editor.selectionEnd }], at = 0, lastGroup = '', lastTime = 0;
  const node = (tag, text) => { const result = doc.createElement(tag); if (text !== undefined) result.textContent = text; return result; };
  const sourceRange = () => ({ start: editor.selectionStart, end: editor.selectionEnd, direction: editor.selectionDirection });
  function remember(text, start, end, group = '') {
    if (history[at]?.text === text) return;
    const now = Date.now(), coalesce = group && group === lastGroup && now - lastTime < 700 && at === history.length - 1;
    history = history.slice(0, at + 1);
    if (coalesce && at > 0) history[at] = { text, start, end };
    else { history.push({ text, start, end }); at++; }
    if (history.length > 100) { history.shift(); at--; }
    lastGroup = group; lastTime = now;
  }
  function sourceAt(container, offset, affinity = 'start') {
    const leaf = textLeaves.find(item => item.node === container);
    if (leaf) return leaf.map ? leaf.map[Math.min(offset, leaf.map.length - 1)] : Math.min(leaf.to, leaf.from + offset);
    if (container.nodeType === 1) {
      const children = [...container.childNodes];
      const next = children[offset], previous = children[offset - 1];
      const bounds = child => { if (!child) return null; const exact = wrappers.find(item => item.node === child) || textLeaves.find(item => item.node === child); if (exact) return exact; const descendants = textLeaves.filter(item => child.contains?.(item.node)); return descendants.length ? { from: descendants[0].from, to: descendants.at(-1).to } : null; };
      const after = bounds(next), before = bounds(previous);
      if (after && (affinity === 'start' || !before)) return after.from;
      if (before) return before.to;
      const block = wrappers.find(item => item.node === container);
      if (block) return block.contentFrom ?? block.from;
    }
    return editor.selectionEnd;
  }
  function readSelection() {
    const selection = win.getSelection();
    if (!selection?.rangeCount || !surface.contains(selection.anchorNode) || !surface.contains(selection.focusNode)) return sourceRange();
    const a = sourceAt(selection.anchorNode, selection.anchorOffset, 'start'), b = sourceAt(selection.focusNode, selection.focusOffset, 'end');
    return { start: Math.min(a, b), end: Math.max(a, b), direction: a > b ? 'backward' : 'forward' };
  }
  function point(position, affinity) {
    // Prefer the outside of a markup wrapper at its exact source boundary.
    for (const item of wrappers) if (item.inline && (item.from === position || item.to === position)) {
      const parent = item.node.parentNode, index = [...parent.childNodes].indexOf(item.node);
      return [parent, index + (item.to === position ? 1 : 0)];
    }
    for (const item of textLeaves) if (position >= item.from && position <= item.to) {
      let offset = item.map ? item.map.findIndex(value => value >= position) : position - item.from;
      if (offset < 0) offset = item.node.length;
      return [item.node, Math.min(item.node.length, offset)];
    }
    const candidates = wrappers.filter(item => !item.inline && item.editable);
    const block = candidates.find(item => position >= item.from && position <= item.to) || candidates.at(-1);
    if (block) {
      const leaf = textLeaves.find(item => block.node.contains(item.node));
      if (leaf) return [leaf.node, position <= leaf.from ? 0 : leaf.node.length];
      return [block.node, affinity === 'end' ? block.node.childNodes.length : 0];
    }
    return [surface, surface.childNodes.length];
  }
  function select(start, end = start, direction = 'forward') {
    selectSource(Math.min(start, editor.value.length), Math.min(end, editor.value.length), direction);
    if (!active || composing || !surface.isConnected) return;
    const [a, ao] = point(start, 'start'), [b, bo] = point(end, 'end'), selection = win.getSelection();
    if (!selection) return;
    try { selection.setBaseAndExtent(direction === 'backward' ? b : a, direction === 'backward' ? bo : ao, direction === 'backward' ? a : b, direction === 'backward' ? ao : bo); } catch { /* a source-only selection can include an opaque block */ }
  }
  function inline(part, parent) {
    if (part.kind === 'text') {
      const text = doc.createTextNode(part.text || ''); parent.append(text);
      textLeaves.push({ node: text, from: part.contentFrom ?? part.from, to: part.contentTo ?? part.to, map: part.map });
      return;
    }
    const tags = { strong: 'strong', em: 'em', code: 'code', link: 'span', highlight: 'mark', strike: 's', underline: 'u' };
    const span = node(tags[part.kind] || 'span');
    if (part.kind === 'link') { span.className = 'live-link'; if (part.href) span.title = part.href; }
    wrappers.push({ node: span, from: part.from, to: part.to, inline: true }); parent.append(span);
    if (part.text !== undefined) inline({ kind: 'text', text: part.text, from: part.contentFrom, to: part.contentTo, map: part.map }, span);
    else for (const child of part.children || []) inline(child, span);
  }
  function render(keep = sourceRange()) {
    if (composing) return;
    blocks = projectSource(editor.value); textLeaves = []; wrappers = [];
    const fragment = doc.createDocumentFragment(); let currentList = null;
    for (const block of blocks) {
      if (block.kind === 'opaque') {
        currentList = null;
        const card = node('section'); card.className = 'live-opaque'; card.contentEditable = 'false';
        const rendered = node('div'); rendered.className = 'live-block-preview';
        try {
          // These blocks depend on the whole document. A fragment preview would give misleading results.
          if (/^\s*(?:::.*(?:chart|query)|!include|\{\{)/mi.test(block.raw)) rendered.append(node('pre', block.raw));
          else renderPreview(parse(block.raw), rendered, { style: 'plain', asset, reference });
        } catch { rendered.append(node('pre', block.raw)); }
        const edit = node('button', 'Edit source'); edit.type = 'button'; edit.className = 'live-source-button';
        edit.onclick = () => { setMode('source'); focusSource(); selectSource(block.from, block.to); };
        card.append(rendered, edit); fragment.append(card); wrappers.push({ node: card, from: block.from, to: block.to, editable: false }); continue;
      }
      const tag = block.kind === 'heading' ? 'h' + Math.min(6, Math.max(1, block.level || 2)) : block.kind === 'quote' ? 'blockquote' : block.kind === 'list' ? 'li' : 'div';
      const line = node(tag); line.className = 'live-block live-' + block.kind;
      if (block.kind === 'task') line.setAttribute('data-marker', /^\s*\[[xX]\]/.test(block.prefix || '') ? '☑' : '☐');
      wrappers.push({ ...block, node: line, editable: true });
      for (const part of block.parts || []) inline(part, line);
      if (!line.childNodes.length) { const text = doc.createTextNode(''); line.append(text, node('br')); textLeaves.push({ node: text, from: block.contentFrom, to: block.contentFrom }); }
      if (block.kind === 'list') {
        const listTag = block.ordered ? 'OL' : 'UL';
        if (!currentList || currentList.tagName !== listTag) { currentList = node(listTag.toLowerCase()); if (block.ordered) currentList.start = parseInt(block.prefix, 10) || 1; fragment.append(currentList); }
        currentList.append(line);
      } else { currentList = null; fragment.append(line); }
    }
    surface.replaceChildren(fragment); surface.toggleAttribute('data-empty', !editor.value.trim());
    if (active && doc.activeElement === surface) select(keep.start, keep.end, keep.direction);
  }
  function apply(edit, { group = '', focus = true } = {}) {
    if (composing) { status('Finish the current text composition before applying a writing tool.'); return false; }
    const from = Math.max(0, Math.min(editor.value.length, edit.start ?? edit.from)), to = Math.max(from, Math.min(editor.value.length, edit.end ?? edit.to));
    const text = String(edit.text ?? ''), next = editor.value.slice(0, from) + text + editor.value.slice(to);
    const start = edit.selectionStart ?? from + text.length, end = edit.selectionEnd ?? start;
    if (next === editor.value) { if (focus) surface.focus(); select(start, end); return true; }
    const before = readSelection(); history[at] = { text: editor.value, start: before.start, end: before.end };
    internal = true; editor.value = next; source = next; selectSource(start, end); remember(next, start, end, group);
    render({ start, end });
    if (focus && active) { surface.focus({ preventScroll: true }); select(start, end); }
    editor.dispatchEvent(new win.Event('input', { bubbles: true })); internal = false;
    return true;
  }
  function undo(redo = false) {
    const next = at + (redo ? 1 : -1); if (next < 0 || next >= history.length) return;
    at = next; lastGroup = ''; const entry = history[at]; internal = true; editor.value = entry.text; source = entry.text;
    render({ start: entry.start, end: entry.end }); surface.focus(); select(entry.start, entry.end); editor.dispatchEvent(new win.Event('input', { bubbles: true })); internal = false;
  }
  function deletion(selection, backwards, word = false) {
    if (selection.start !== selection.end) return { start: selection.start, end: selection.end, text: '' };
    const p = selection.start, block = blocks.find(item => item.kind !== 'opaque' && !item.blank && p >= item.contentFrom && p <= item.contentTo);
    if (backwards && block && p === block.contentFrom && block.contentFrom > block.from + (block.raw.startsWith('\uFEFF') ? 1 : 0)) return { start: block.from + (block.raw.startsWith('\uFEFF') ? 1 : 0), end: p, text: '' };
    // Join neighboring editable blocks before deleting a visible character in another paragraph.
    if (block) {
      const index = blocks.indexOf(block), direction = backwards ? -1 : 1;
      let n = index + direction; while (blocks[n]?.blank) n += direction;
      const neighbor = blocks[n];
      if (neighbor && neighbor.kind !== 'opaque' && !neighbor.virtual) {
        if (backwards && p === block.contentFrom && neighbor.contentTo < p)
          return { start: neighbor.contentTo, end: p, text: '' };
        if (!backwards && p === block.contentTo && neighbor.contentFrom > p)
          return { start: p, end: neighbor.contentFrom, text: '' };
      }
    }
    const leaf = backwards ? [...textLeaves].reverse().find(item => item.from < p) : textLeaves.find(item => item.to > p);
    if (!leaf) return null;
    const visible = leaf.node.data, map = leaf.map || Array.from({ length: visible.length + 1 }, (_, i) => leaf.from + i);
    let offset = map.findIndex(value => value >= p); if (offset < 0) offset = visible.length;
    if (backwards && p > leaf.to) offset = visible.length;
    if (!backwards && p < leaf.from) offset = 0;
    if (word) {
      const target = backwards ? visible.slice(0, offset).replace(/\s*\S+\s*$/, '').length : offset + (visible.slice(offset).match(/^\s*\S+\s*/)?.[0].length || 1);
      return { start: map[Math.min(target, offset)], end: map[Math.max(target, offset)] ?? leaf.to, text: '' };
    }
    const boundaries = typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(visible)].map(item => item.index).concat(visible.length) : Array.from(visible).reduce((a, item) => [...a, a.at(-1) + item.length], [0]);
    const target = backwards ? boundaries.filter(value => value < offset).at(-1) : boundaries.find(value => value > offset);
    if (target === undefined) return null;
    return { start: map[Math.min(target, offset)], end: map[Math.max(target, offset)], text: '' };
  }
  function type(inputType, data = '') {
    const selection = readSelection(); selectSource(selection.start, selection.end, selection.direction);
    if (inputType === 'historyUndo' || inputType === 'historyRedo') { undo(inputType === 'historyRedo'); return; }
    if (inputType.startsWith('delete')) { const edit = deletion(selection, !inputType.includes('Forward'), inputType.includes('Word')); if (edit) apply(edit, { group: inputType }); return; }
    let text = data;
    if (inputType === 'insertParagraph' || inputType === 'insertLineBreak') {
      const smart = doc.getElementById('writerSmartLists')?.checked;
      const list = inputType === 'insertParagraph' && smart && continueListEdit(editor.value, selection.start, selection.end);
      if (list) { apply(list); return; }
      text = editor.value.includes('\r\n') ? '\r\n' : '\n';
      if (inputType === 'insertParagraph') text += text;
    }
    const virtual = blocks.find(block => block.virtual && block.contentFrom === selection.start);
    if (virtual?.insertPrefix) text = virtual.insertPrefix + text;
    apply({ start: selection.start, end: selection.end, text }, { group: inputType === 'insertText' ? 'typing' : '' });
  }

  // Local completion uses the same source index as source editing, with a DOM caret anchor.
  const suggestions = node('div'); suggestions.className = 'local-suggestions'; suggestions.id = 'liveSuggestions'; suggestions.hidden = true;
  const list = node('div'); list.setAttribute('role', 'listbox'); list.id = 'liveSuggestionsList'; list.setAttribute('aria-label', 'Local suggestions'); suggestions.append(list); doc.body.append(suggestions);
  let result = null, selected = -1, suggestionTimer;
  const closeSuggestions = () => { clearTimeout(suggestionTimer); suggestions.hidden = true; result = null; selected = -1; surface.removeAttribute('aria-activedescendant'); };
  function complete() {
    closeSuggestions(); if (!active || composing || doc.activeElement !== surface || !doc.getElementById('localSuggestionsEnabled')?.checked) return;
    const selection = readSelection(); if (selection.start !== selection.end) return;
    const index = completionIndex(parse(editor.value)); result = localSuggestions(editor.value, selection.end, { ...index, targets: [...index.targets, ...getReferences()] });
    if (!result) return;
    list.replaceChildren(); result.items.forEach((item, i) => { const option = node('div', item.label); option.id = 'liveSuggestion-' + i; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false'); option.onpointerdown = event => event.preventDefault(); option.onclick = () => acceptSuggestion(i); list.append(option); });
    const range = win.getSelection()?.rangeCount ? win.getSelection().getRangeAt(0) : null, rect = range?.getBoundingClientRect() || surface.getBoundingClientRect();
    suggestions.hidden = false; suggestions.style.left = Math.max(8, Math.min(win.innerWidth - Math.min(380, win.innerWidth - 16) - 8, rect.left)) + 'px'; suggestions.style.top = Math.max(8, Math.min(win.innerHeight - suggestions.offsetHeight - 8, rect.bottom + 5)) + 'px';
  }
  function acceptSuggestion(index) { if (!result?.items[index]) return; const edit = { start: result.start, end: result.end, text: result.items[index].value }; closeSuggestions(); apply(edit); }
  function scheduleSuggestions() { clearTimeout(suggestionTimer); suggestionTimer = setTimeout(complete, 350); }
  surface.setAttribute('aria-autocomplete', 'list'); surface.setAttribute('aria-controls', list.id);
  surface.addEventListener('beforeinput', event => {
    if (event.isComposing || composing || !event.cancelable) return;
    if (['insertText', 'insertReplacementText', 'insertParagraph', 'insertLineBreak', 'historyUndo', 'historyRedo'].includes(event.inputType) || event.inputType.startsWith('delete')) { event.preventDefault(); type(event.inputType, event.data || ''); scheduleSuggestions(); }
    else if (event.inputType.startsWith('format')) event.preventDefault();
  });
  surface.addEventListener('keydown', event => {
    if (event.isComposing || composing || event.defaultPrevented) return;
    if (!suggestions.hidden) {
      if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + result.items.length) % result.items.length; [...list.children].forEach((option, i) => option.setAttribute('aria-selected', String(i === selected))); surface.setAttribute('aria-activedescendant', list.children[selected].id); return; }
      if (['Enter', 'Tab'].includes(event.key) && selected >= 0) { event.preventDefault(); acceptSuggestion(selected); return; }
      if (event.key === 'Escape') { event.preventDefault(); closeSuggestions(); return; }
      if (['Enter', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(event.key)) closeSuggestions();
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      if (event.code === 'Space') { event.preventDefault(); complete(); return; }
      if (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y') { event.preventDefault(); undo(event.shiftKey || event.key.toLowerCase() === 'y'); return; }
      if (['b', 'i'].includes(event.key.toLowerCase())) { event.preventDefault(); const range = readSelection(); const edit = writingEdit(editor.value, range.start, range.end, event.key.toLowerCase() === 'b' ? 'bold' : 'italic'); apply(edit); return; }
      if (event.key.toLowerCase() === 'f') { event.preventDefault(); readIntoSource(); doc.getElementById('writerFindBtn').click(); return; }
    }
    if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey) {
      const range = readSelection(), block = blocks.find(item => range.start >= item.from && range.start <= item.to);
      if (block?.kind === 'list' || block?.kind === 'task') { event.preventDefault(); const edit = writingEdit(editor.value, range.start, range.end, event.shiftKey ? 'outdent' : 'indent'); if (edit) apply(edit); }
    }
  });
  surface.addEventListener('paste', event => { event.preventDefault(); if (composing) return; type('insertFromPaste', event.clipboardData?.getData('text/plain') || ''); });
  surface.addEventListener('drop', event => { event.preventDefault(); if (!composing && event.dataTransfer?.getData('text/plain')) type('insertFromDrop', event.dataTransfer.getData('text/plain')); });
  surface.addEventListener('click', event => { if (event.target.closest('a')) event.preventDefault(); scheduleSuggestions(); });
  surface.addEventListener('blur', () => { readIntoSource(); closeSuggestions(); });
  surface.addEventListener('compositionstart', () => {
    closeSuggestions(); const range = readSelection(), block = wrappers.find(item => item.editable && item.node.contains(win.getSelection()?.anchorNode));
    composition = { range, source: editor.value, block, visible: block?.node.textContent || '' }; composing = true;
  });
  surface.addEventListener('compositionend', event => {
    const saved = composition; composing = false; composition = null;
    if (!saved || saved.source !== editor.value) { render(); return; }
    const value = saved.block?.node.textContent || '', old = saved.visible;
    let a = 0, z = 0; while (a < old.length && a < value.length && old[a] === value[a]) a++; while (z < old.length - a && z < value.length - a && old.at(-1 - z) === value.at(-1 - z)) z++;
    if (value !== old && saved.block) {
      const leaves = textLeaves.filter(item => saved.block.node.contains(item.node));
      const map = leaves.flatMap(item => (item.map || Array.from({ length: item.node.data.length + 1 }, (_, i) => item.from + i)).slice(0, -1)); map.push(leaves.at(-1)?.to ?? saved.range.end);
      apply({ start: map[a] ?? saved.range.start, end: map[old.length - z] ?? saved.range.end, text: value.slice(a, value.length - z) });
    } else if (event.data) apply({ start: saved.range.start, end: saved.range.end, text: event.data }); else render();
  });
  function readIntoSource() { const range = readSelection(); selectSource(range.start, range.end, range.direction); return range; }
  doc.addEventListener('selectionchange', () => { if (active && !composing && doc.activeElement === surface) readIntoSource(); });
  editor.addEventListener('input', () => { if (!internal && !composing) syncFromSource(); });
  editor.focus = options => active ? surface.focus(options) : focusSource(options);
  editor.setSelectionRange = (start, end, direction) => { selectSource(start, end, direction); if (active) select(start, end, direction); };
  function setMode(mode) {
    if (composing) return;
    const range = active ? readIntoSource() : sourceRange(); active = mode !== 'source'; closeSuggestions();
    root.setAttribute('data-editor-mode', active ? 'live' : 'source');
    if (active) { editor.jotApplyEdit = apply; render(range); surface.focus(); select(range.start, range.end, range.direction); }
    else { delete editor.jotApplyEdit; focusSource(); selectSource(range.start, range.end, range.direction); }
    editor.dispatchEvent(new win.CustomEvent('jotmodechange', { detail: active ? 'live' : 'source' }));
  }
  function syncFromSource() {
    if (composing || internal || source === editor.value) return;
    source = editor.value; remember(source, editor.selectionStart, editor.selectionEnd); render();
  }
  editor.jotApplyEdit = apply; editor.jotSetMode = setMode; root.setAttribute('data-editor-mode', 'live'); render();
  return { surface, setMode, syncFromSource, get composing() { return composing; }, reset() { composing = false; composition = null; closeSuggestions(); source = editor.value; history = [{ text: source, start: editor.selectionStart, end: editor.selectionEnd }]; at = 0; lastGroup = ''; render(); } };
}
