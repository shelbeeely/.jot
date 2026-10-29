// Literal, in-page search. Match offsets always refer to the original UTF-16 textarea source.
const wordCharacter = /[\p{L}\p{N}\p{M}\p{Pc}\u200c\u200d]/u;
const escapePattern = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const previousCharacter = (text, at) => {
  if (!at) return '';
  const last = text.charCodeAt(at - 1);
  return text.slice(at - (last >= 0xdc00 && last <= 0xdfff && at > 1 ? 2 : 1), at);
};
export function findMatches(source, query, { caseSensitive = false, wholeWord = false } = {}) {
  if (!query) return [];
  const pattern = new RegExp(escapePattern(query), caseSensitive ? 'gu' : 'giu'), matches = [];
  for (const match of source.matchAll(pattern)) {
    const start = match.index, end = start + match[0].length;
    if (wholeWord && (wordCharacter.test(previousCharacter(source, start)) || wordCharacter.test(String.fromCodePoint(source.codePointAt(end) ?? 0)))) continue;
    matches.push({ start, end });
  }
  return matches;
}
export function replaceAllMatches(source, query, replacement, options) {
  const matches = findMatches(source, query, options);
  let text = '', previous = 0;
  for (const match of matches) { text += source.slice(previous, match.start) + replacement; previous = match.end; }
  return { text: text + source.slice(previous), count: matches.length };
}

export function setupWriterSearch({ editor, status = () => {} }) {
  const node = (tag, text, className) => { const result = document.createElement(tag); if (text) result.textContent = text; if (className) result.className = className; return result; };
  const dialog = node('dialog', '', 'writer-dialog writer-search-dialog');
  dialog.id = 'writerSearchDialog'; dialog.setAttribute('aria-labelledby', 'writerSearchHeading');
  const header = node('div', '', 'dialog-header'), heading = node('h2', 'Find and replace'); heading.id = 'writerSearchHeading';
  const close = node('button', '✕', 'icon-button'); close.type = 'button'; close.id = 'writerSearchClose'; close.setAttribute('aria-label', 'Close find and replace');
  header.append(heading, close); dialog.append(header);
  const input = (id, label, type = 'text') => {
    const wrapper = node('label', label), field = node('input'); field.id = id; field.type = type; field.autocomplete = 'off'; field.spellcheck = false;
    if (type === 'checkbox') wrapper.prepend(field); else wrapper.append(field);
    dialog.append(wrapper); return field;
  };
  const query = input('writerSearchQuery', 'Find'), replacement = input('writerSearchReplacement', 'Replace with');
  const sensitive = input('writerSearchCase', ' Match case', 'checkbox'), wholeWord = input('writerSearchWhole', ' Whole word', 'checkbox');
  const count = node('p', 'Enter text to find.', 'small'); count.id = 'writerSearchStatus'; count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite'); dialog.append(count);
  const actions = node('div', '', 'writer-dialog-actions');
  const button = (id, label) => { const result = node('button', label, 'button'); result.type = 'button'; result.id = id; actions.append(result); return result; };
  const previous = button('writerSearchPrevious', 'Previous'), next = button('writerSearchNext', 'Next'), replace = button('writerSearchReplace', 'Replace'), replaceAll = button('writerSearchReplaceAll', 'Replace all');
  dialog.append(actions, node('p', 'Search stays in this journal. Enter finds the next match; Shift+Enter finds the previous one. Replacements can be undone in the writing.', 'small')); document.body.append(dialog);
  let matches = [], current = -1, snapshot = editor.value, anchor = 0, original = { start: 0, end: 0 }, changed = false;
  const options = () => ({ caseSensitive: sensitive.checked, wholeWord: wholeWord.checked });
  const announce = extra => {
    count.textContent = extra || (!query.value ? 'Enter text to find.' : !matches.length ? 'No matches.' : `${current + 1} of ${matches.length} ${matches.length === 1 ? 'match' : 'matches'}.`);
    previous.disabled = next.disabled = replace.disabled = replaceAll.disabled = !matches.length;
  };
  const select = () => { if (matches[current]) editor.setSelectionRange(matches[current].start, matches[current].end); announce(); };
  const refresh = (at = anchor) => {
    snapshot = editor.value; matches = findMatches(snapshot, query.value, options()); current = matches.findIndex(match => match.start >= at);
    if (current < 0 && matches.length) current = 0;
    select();
  };
  const move = direction => {
    if (snapshot !== editor.value) refresh(editor.selectionStart);
    if (!matches.length) return;
    current = (current + direction + matches.length) % matches.length; select();
  };
  const write = (text, start, end) => {
    // A modal makes the editor inert. Briefly release it so Chromium's native edit
    // targets the journal, retaining its undo history instead of editing a search field.
    const reopen = dialog.open; if (reopen) dialog.close();
    editor.focus(); editor.setSelectionRange(start, end);
    if (editor.jotApplyEdit) editor.jotApplyEdit({ start, end, text });
    else if (!document.execCommand || !document.execCommand('insertText', false, text)) { editor.setRangeText(text, start, end, 'end'); editor.dispatchEvent(new Event('input', { bubbles: true })); }
    changed = true;
    if (reopen) dialog.showModal();
  };
  const ready = () => {
    if (snapshot !== editor.value) { refresh(editor.selectionStart); announce('Writing changed. Results refreshed; review the match before replacing.'); return false; }
    return Boolean(matches[current]);
  };
  query.addEventListener('input', () => refresh());
  for (const control of [sensitive, wholeWord]) control.addEventListener('change', () => refresh());
  previous.onclick = () => move(-1); next.onclick = () => move(1);
  replace.onclick = () => {
    if (!ready()) return;
    const match = matches[current], text = replacement.value;
    write(text, match.start, match.end); refresh(match.start + text.length); replacement.focus();
    announce(matches.length ? `Replaced one match. ${current + 1} of ${matches.length} remaining matches.` : 'Replaced one match. No matches remain.');
  };
  replaceAll.onclick = () => {
    if (!ready()) return;
    const result = replaceAllMatches(snapshot, query.value, replacement.value, options());
    if (result.text !== snapshot) write(result.text, 0, snapshot.length);
    refresh(0); replacement.focus(); announce(`Replaced ${result.count} ${result.count === 1 ? 'match' : 'matches'}.`);
    status(`Replaced ${result.count} ${result.count === 1 ? 'match' : 'matches'}. Undo in the writing restores the previous text.`);
  };
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.isComposing || event.defaultPrevented || event.target.tagName === 'BUTTON') return;
    event.preventDefault(); move(event.shiftKey ? -1 : 1);
  });
  close.onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    if (dialog.open) return; // Native editing above immediately reopens this dialog.
    // Searching can move the selection; without a result, restore the original range.
    if (!matches[current] && !changed) editor.setSelectionRange(Math.min(original.start, editor.value.length), Math.min(original.end, editor.value.length));
    editor.focus();
  });
  const open = () => {
    if (dialog.open) { query.focus(); return; }
    original = { start: editor.selectionStart, end: editor.selectionEnd }; anchor = original.start; changed = false;
    const selected = editor.value.slice(original.start, original.end);
    if (selected && selected.length <= 200 && !/[\r\n]/.test(selected)) query.value = selected;
    dialog.showModal(); refresh(); query.focus(); query.select();
  };
  editor.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'f') return;
    event.preventDefault(); open();
  });
  return { open, dialog };
}
