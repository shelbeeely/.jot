// Current-document suggestions only. No service calls, profile inference or measurement values.
import { parse } from './jot/jot.mjs';
import { TAGGED } from './jot/query.mjs';
const field = (node, key) => node.fields?.find((f) => f.name === key)?.value.trim() || '';
const safeLabel = (value) => String(value).replace(/[\\[\]]/g, '\\$&').replace(/[\r\n]/g, ' ');
export function completionIndex(ast) {
  const tags = new Set(), contexts = new Set(), targets = new Map(), duplicate = new Set(), metrics = [], scales = [];
  const addMarks = (text) => {
    const plain = String(text || '').replace(/`[^`\n]*`/g, ' ').replace(/\]\([^)\s]*\)/g, '] ');
    for (const match of plain.matchAll(TAGGED)) (match[2][0] === '#' ? tags : contexts).add(match[2]);
  };
  const walk = (token) => {
    if (!token || ['code', 'codespan', 'html', 'image'].includes(token.type)) return;
    if (token.type === 'text' && !token.tokens) addMarks(token.text);
    for (const key of ['tokens', 'items', 'header', 'rows']) for (const item of Array.isArray(token[key]) ? token[key] : []) Array.isArray(item) ? item.forEach(walk) : walk(item);
  };
  for (const node of ast.nodes) {
    if (node.markdown) walk(node.markdown);
    else if (['task', 'event', 'idea', 'question', 'scene', 'margin'].includes(node.type)) addMarks(node.text);
    const id = node.type === 'record' ? node.id : node.type === 'heading' ? /^\d{4}-\d{2}-\d{2}(?=\s|\||$)/.exec(node.text)?.[0] : null;
    if (id) {
      const label = node.type === 'record' ? field(node, 'label') || field(node, 'title') || id : node.text;
      if (targets.has(id)) duplicate.add(id);
      else targets.set(id, { id, label, kind: node.type === 'record' ? node.recordType : 'entry' });
    }
    if (node.type === 'record' && node.recordType === 'measurement' && field(node, 'metric')) metrics.push({ metric: field(node, 'metric'), unit: field(node, 'unit'), scale: field(node, 'scale') });
    if (node.type === 'record' && node.recordType === 'scale' && node.id) scales.push({ id: node.id, label: field(node, 'name') || field(node, 'label') || node.id });
  }
  // Never offer an ambiguous record ID/date, or a scale with a duplicate ID.
  return { tags: [...tags], contexts: [...contexts], targets: [...targets.values()].filter((t) => !duplicate.has(t.id)), metrics, scales: scales.filter((s) => !duplicate.has(s.id)), ast };
}
function context(source, caret) {
  const before = source.slice(0, caret), lines = before.split(/\r?\n/), line = lines.at(-1);
  let fence = null, comment = false, metadata = false, record = null;
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    if (fence) { if (new RegExp('^ {0,3}' + fence[0] + '{' + fence[1] + ',}\\s*$').test(text)) fence = null; continue; }
    if (comment) { if (text === '*/') comment = false; continue; }
    if (metadata) { if (text === '---') metadata = false; continue; }
    if (i === 0 && text.replace(/^\uFEFF/, '') === '---') { metadata = true; continue; }
    if (text === '/*') { comment = true; continue; }
    const code = /^ {0,3}(`{3,}|~{3,})/.exec(text);
    if (code && !record) { fence = [code[1][0], code[1].length]; continue; }
    if (text === ':::') record = null;
    else if (/^:::record\s/.test(text)) record = { type: /^:::record\s+(\S+)/.exec(text)[1], lines: [] };
    else if (record) record.lines.push(text);
  }
  // An unmatched inline backtick, indented code or escaped marker stays literal.
  const ticks = line.match(/(?<!\\)`+/g) || [];
  if (fence || comment || metadata || /^(?: {4}|\t)/.test(line) || ticks.length % 2) return null;
  return { line, record, before };
}
export function localSuggestions(source, caret, index = completionIndex(parse(source))) {
  const ctx = context(source, caret); if (!ctx) return null;
  const { line, record, before } = ctx;
  let query, start, end = caret, items, kind;
  const link = /\[([^\]\n]*)\]\((?:([A-Za-z0-9][A-Za-z0-9._-]*\.jot))?#([^\n)]*)$/.exec(line);
  if (link && (!record || /^(?:source|parent|member|migrated-to|prompt|relation):/.test(line))) {
    query = link[3]; start = caret - link[0].length;
    const rest = /^[^\s)\n]*/.exec(source.slice(caret))[0]; end += rest.length;
    let ending = ')';
    const title = /^[ \t]+(?:"[^"\n]*"|'[^'\n]*'|\([^\n)]*\))\)/.exec(source.slice(end));
    if (title) { ending = title[0]; end += ending.length; }
    else if (source[end] === ')') end++;
    items = index.targets.filter((target) => !link[2] || target.file === link[2]).map((target) => ({ value: `[${link[1] || safeLabel(target.label)}](${target.href || '#' + target.id}${ending}`, label: target.label + ' · ' + (target.file || '') + '#' + target.id, search: target.search || target.label + ' ' + target.id })); kind = 'Links';
  } else if (record?.type === 'measurement') {
    const match = /^(metric|unit|scale):[ \t]*(.*)$/.exec(line); if (!match) return null;
    query = match[2]; start = caret - query.length; end += /^[^\r\n]*/.exec(source.slice(caret))[0].length;
    const metric = record.lines.map((text) => /^metric:[ \t]*(.*)$/.exec(text)?.[1].trim()).find(Boolean);
    if (match[1] === 'metric') items = index.metrics.map((m) => ({ value: m.metric, label: m.metric + (m.unit ? ' · ' + m.unit : '') }));
    else if (match[1] === 'unit') items = index.metrics.filter((m) => metric && m.metric === metric && m.unit).map((m) => ({ value: m.unit, label: m.unit + ' · ' + m.metric }));
    else {
      const associated = new Set(index.metrics.filter((m) => m.metric === metric && m.scale).map((m) => m.scale));
      items = index.scales.filter((s) => !associated.size || associated.has('#' + s.id)).map((s) => ({ value: '#' + s.id, label: s.label + ' · #' + s.id }));
    }
    kind = match[1] === 'metric' ? 'Measurements' : match[1] === 'unit' ? 'Units' : 'Scales';
  } else if (!record) {
    const match = /(?:^|[\s(\[])([#@][\p{L}\p{N}_-]*)$/u.exec(before); if (!match) return null;
    query = match[1]; start = caret - query.length;
    end += /^[\p{L}\p{N}_-]*/u.exec(source.slice(caret))[0].length;
    items = (query[0] === '#' ? index.tags : index.contexts).map((value) => ({ value, label: value })); kind = query[0] === '#' ? 'Tags' : 'Contexts';
  } else return null;
  const needle = query.toLocaleLowerCase(), seen = new Set();
  items = items.filter((item) => {
    const key = kind === 'Tags' || kind === 'Contexts' ? item.value.toLocaleLowerCase() : item.value;
    if (seen.has(key) || item.value === source.slice(start, end) || !(item.search || item.label).toLocaleLowerCase().includes(needle)) return false;
    seen.add(key); return true;
  }).sort((a, b) => a.label.localeCompare(b.label)).slice(0, 8);
  return items.length ? { start, end, kind, items } : null;
}
export function setupLocalAutocomplete({ editor, getAst, getReferences = () => [] }) {
  const doc = editor.ownerDocument, win = doc.defaultView;
  const toggle = doc.getElementById('localSuggestionsEnabled'), box = doc.createElement('div'), list = doc.createElement('div'), announce = doc.getElementById('localSuggestionsStatus');
  box.id = 'localSuggestions'; box.className = 'local-suggestions'; box.hidden = true;
  const heading = doc.createElement('p'); heading.id = 'localSuggestionsHeading';
  list.id = 'localSuggestionsList'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-labelledby', heading.id);
  box.append(heading, list); doc.body.append(box);
  editor.setAttribute('aria-autocomplete', 'list'); editor.setAttribute('aria-controls', list.id);
  let timer, composing = false, result, snapshot, caretSnapshot, selected = -1, index;
  try { toggle.checked = win.localStorage.getItem('jot-local-suggestions-v1') !== 'off'; } catch { /* optional preference */ }
  const close = () => { clearTimeout(timer); box.hidden = true; editor.removeAttribute('aria-activedescendant'); result = null; selected = -1; };
  function position() {
    const rect = editor.getBoundingClientRect(), style = win.getComputedStyle(editor), mirror = doc.createElement('div');
    for (const key of ['font', 'lineHeight', 'letterSpacing', 'padding', 'border', 'boxSizing', 'tabSize']) mirror.style[key] = style[key];
    Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', width: rect.width + 'px', top: '0', left: '0' });
    mirror.textContent = editor.value.slice(0, editor.selectionEnd);
    const marker = doc.createElement('span'); marker.textContent = '\u200b'; mirror.append(marker); doc.body.append(mirror);
    const point = marker.getBoundingClientRect(); mirror.remove();
    const height = box.getBoundingClientRect().height, width = Math.min(380, win.innerWidth - 16);
    box.style.width = width + 'px';
    box.style.left = Math.max(8, Math.min(rect.left + point.left - editor.scrollLeft, win.innerWidth - width - 8)) + 'px';
    const y = rect.top + point.top - editor.scrollTop + (parseFloat(style.lineHeight) || 24);
    box.style.top = Math.max(8, Math.min(y, win.innerHeight - height - 8)) + 'px';
  }
  function highlight() {
    [...list.children].forEach((option, i) => option.setAttribute('aria-selected', String(i === selected)));
    if (selected >= 0) { editor.setAttribute('aria-activedescendant', list.children[selected].id); list.children[selected].scrollIntoView({ block: 'nearest' }); }
    else editor.removeAttribute('aria-activedescendant');
  }
  function accept(i) {
    if (!result || snapshot !== editor.value || editor.selectionStart !== editor.selectionEnd || editor.selectionEnd !== caretSnapshot) { close(); return; }
    const item = result.items[i]; if (!item) return;
    const { start, end } = result;
    editor.focus(); editor.setSelectionRange(start, end);
    if (!doc.execCommand || !doc.execCommand('insertText', false, item.value)) { editor.setRangeText(item.value, start, end, 'end'); editor.dispatchEvent(new Event('input', { bubbles: true })); }
    close(); announce.textContent = 'Inserted ' + item.label;
  }
  function refresh() {
    if (composing || !toggle.checked || doc.activeElement !== editor || editor.selectionStart !== editor.selectionEnd) { close(); return; }
    const ast = getAst();
    if (!index || index.ast.source !== editor.value) index = completionIndex(ast?.source === editor.value ? ast : parse(editor.value));
    result = localSuggestions(editor.value, editor.selectionEnd, { ...index, targets: [...index.targets, ...getReferences()] }); snapshot = editor.value; caretSnapshot = editor.selectionEnd; selected = -1;
    if (!result) { close(); return; }
    heading.textContent = result.kind + ' · this journal'; list.replaceChildren();
    result.items.forEach((item, i) => {
      const option = doc.createElement('div'); option.id = 'localSuggestion-' + i; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false'); option.textContent = item.label;
      option.addEventListener('pointerdown', (event) => event.preventDefault()); option.onclick = () => accept(i); list.append(option);
    });
    box.hidden = false; position();
    announce.textContent = `${result.items.length} suggestions. Down arrow to choose, Enter or Tab to insert, Escape to dismiss.`;
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(refresh, 350); };
  editor.addEventListener('input', () => { close(); schedule(); });
  editor.addEventListener('click', schedule); editor.addEventListener('blur', close);
  editor.addEventListener('scroll', () => { if (!box.hidden) position(); }); win.addEventListener('scroll', (event) => { if (event.target !== editor && !box.contains(event.target) && !box.hidden) close(); }, true); win.addEventListener('resize', () => { if (!box.hidden) position(); });
  editor.addEventListener('compositionstart', () => { composing = true; close(); });
  editor.addEventListener('compositionend', () => { composing = false; schedule(); });
  editor.addEventListener('keydown', (event) => {
    if (event.isComposing || composing) return;
    if ((event.ctrlKey || event.metaKey) && event.code === 'Space') { event.preventDefault(); refresh(); return; }
    if (box.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); selected = selected < 0 ? (event.key === 'ArrowDown' ? 0 : result.items.length - 1) : (selected + (event.key === 'ArrowDown' ? 1 : -1) + result.items.length) % result.items.length; highlight(); }
    else if ((event.key === 'Enter' || event.key === 'Tab') && selected >= 0) { event.preventDefault(); accept(selected); }
    else if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab', 'Enter'].includes(event.key)) close();
  });
  toggle.onchange = () => { close(); try { win.localStorage.setItem('jot-local-suggestions-v1', toggle.checked ? 'on' : 'off'); } catch { /* optional preference */ } };
}
