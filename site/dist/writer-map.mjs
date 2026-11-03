// Journal map: every dated entry on a calendar canvas, with the links between entries and the threads (tags, people
// and places) that run through them. A view of the source only: it never edits writing and never shows entry text
// until the person opens an entry. Gaps stay blank; nothing is counted against the writer.
// Research: docs/methods/README.md, line 47 (rereading on the writer's terms); docs/methods/digital-daily-notes.md,
// lines 112 and 125 (links and backlinks connect days to topics) and line 494 (resurfacing can bring back something painful).
import { parse } from './jot/jot.mjs';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SVG = 'http://www.w3.org/2000/svg';
const TAG = /(^|[^\p{L}\p{N}_&/#-])#([\p{L}\p{N}][\p{L}\p{N}_-]{0,60})/gu;
const LABEL = /^!?\[([^\]\r\n]{1,120})\]/;

/** Entries, links and threads from Jot source. Positions are UTF-16 offsets into the source, for jumping back. */
export function journalGraph(source) {
  const ast = parse(source), bytes = new TextEncoder().encode(source), decoder = new TextDecoder('utf-8', { ignoreBOM: true });
  // Byte offsets to string offsets, in one forward pass over sorted requests.
  const wanted = new Set();
  for (const entry of ast.entries) wanted.add(ast.nodes[entry.startNode].start);
  for (const link of ast.links) { wanted.add(link.start); wanted.add(link.end); }
  const charAt = new Map(); let byte = 0, char = 0;
  for (const at of [...wanted].sort((a, b) => a - b)) { char += decoder.decode(bytes.subarray(byte, at)).length; byte = at; charAt.set(at, char); }
  const entryOfNode = new Array(ast.nodes.length).fill(-1);
  const entries = ast.entries.map((entry, index) => {
    // endNode is exclusive: it is where the next entry starts.
    const last = Math.max(entry.startNode, Math.min(entry.endNode, ast.nodes.length) - 1);
    for (let n = entry.startNode; n <= last; n++) entryOfNode[n] = index;
    const head = ast.nodes[entry.startNode], from = head.start, to = ast.nodes[last].end;
    const text = decoder.decode(bytes.subarray(from, to));
    let title = (head.text || '').replace(/^\d{4}-\d{2}-\d{2}\s*(?:\|\s*)?/, '').trim();
    if (/^(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|nesday|rsday|urday)?\.?$/i.test(title)) title = ''; // the date already names the day
    const tags = new Set();
    for (const line of text.split(/\r?\n/)) {
      if (/^\s*(?::::|```|~~~)/.test(line) || /^\s*#{1,6}\s/.test(line)) continue; // record IDs, fences and headings are not tags
      const plain = line.replace(/`[^`]*`/g, ' ').replace(/\]\([^)\s]*\)/g, '] ').replace(/\{[^}\r\n]*\}/g, ' '); // link targets, code and color attributes are not tags
      for (const match of plain.matchAll(TAG)) tags.add(match[2].toLocaleLowerCase());
    }
    return { index, date: entry.date, title, words: (text.slice(text.indexOf('\n') + 1).match(/\S+/g) || []).length, position: charAt.get(head.start), tags: [...tags], refs: [], to: new Set(), from: new Set() };
  });
  const refs = new Map(), edges = [];
  for (const link of ast.links) {
    const at = entryOfNode[link.node];
    if (at < 0) continue;
    if (link.file) {
      // A person, place or other document: a thread, never opened or fetched.
      const raw = source.slice(charAt.get(link.start), charAt.get(link.end)), label = LABEL.exec(raw)?.[1]?.trim() || link.target || link.file;
      const key = link.href;
      if (!refs.has(key)) refs.set(key, { key, label, file: link.file, entries: new Set() });
      refs.get(key).entries.add(at);
      if (!entries[at].refs.includes(key)) entries[at].refs.push(key);
    } else if (Number.isInteger(link.to)) {
      const target = entryOfNode[link.to];
      if (target >= 0 && target !== at && !entries[at].to.has(target)) { entries[at].to.add(target); entries[target].from.add(at); edges.push({ from: at, to: target }); }
    }
  }
  const tags = new Map();
  for (const entry of entries) for (const tag of entry.tags) { if (!tags.has(tag)) tags.set(tag, new Set()); tags.get(tag).add(entry.index); }
  const threads = [
    ...[...tags].map(([tag, set]) => ({ key: 'tag:' + tag, kind: 'tag', label: '#' + tag, entries: [...set] })),
    ...[...refs.values()].map(ref => ({ key: 'ref:' + ref.key, kind: 'reference', label: ref.label, detail: ref.file, entries: [...ref.entries] })),
  ].filter(thread => thread.entries.length > 0).sort((a, b) => b.entries.length - a.entries.length || a.label.localeCompare(b.label));
  return { entries, edges, threads };
}

/** Month rows from the first to the last dated entry (empty months stay as blank rows), days 1–31 across. */
export function layoutGraph(graph, { cell = 30, row = 44, left = 132, top = 64 } = {}) {
  const radius = Math.max(2.5, Math.min(11, cell * 0.42));
  const dated = graph.entries.filter(entry => entry.date);
  if (!dated.length) return { width: left + 31 * cell + 24, height: top + row + 24, rows: [], points: new Map(), cell, row, left, top, radius };
  const month = date => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
  const first = Math.min(...dated.map(entry => month(entry.date))), last = Math.max(...dated.map(entry => month(entry.date)));
  const rows = [], points = new Map(), stacks = new Map();
  for (let m = first; m <= last; m++) rows.push({ index: m - first, year: Math.floor(m / 12), month: m % 12, y: top + (m - first) * row });
  for (const entry of dated) {
    const r = month(entry.date) - first, day = Number(entry.date.slice(8, 10)), key = r + ':' + day, stack = stacks.get(key) || 0;
    stacks.set(key, stack + 1);
    // Several entries on one day sit side by side in small steps.
    points.set(entry.index, { x: left + (day - 0.5) * cell + Math.min(stack, 3) * Math.min(6, cell / 4) - (stack ? Math.min(3, cell / 8) : 0), y: top + r * row + row / 2 + Math.min(stack, 3) * Math.min(5, row / 8), stacked: stack });
  }
  return { width: left + 31 * cell + 24, height: top + rows.length * row + 24, rows, points, cell, row, left, top, radius };
}

export function setupWriterMap({ editor, status = () => {}, jumpTo }) {
  const doc = editor.ownerDocument, win = doc.defaultView;
  const el = (tag, text, attributes = {}) => { const node = doc.createElement(tag); if (text !== undefined) node.textContent = text; for (const [k, v] of Object.entries(attributes)) node.setAttribute(k, v); return node; };
  const svgEl = (tag, attributes = {}) => { const node = doc.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attributes)) node.setAttribute(k, String(v)); return node; };
  const section = el('section', undefined, { id: 'writerMap', class: 'writer-map', 'aria-labelledby': 'writerMapTitle' });
  section.hidden = true;
  const head = el('div', undefined, { class: 'writer-map-head' });
  const summary = el('p', '', { id: 'writerMapSummary', class: 'writer-map-summary', role: 'status' });
  head.append(el('h2', 'Journal map', { id: 'writerMapTitle' }), summary);
  const controls = el('div', undefined, { class: 'writer-map-controls', role: 'group', 'aria-label': 'Map view' });
  const zoomOut = el('button', '−', { type: 'button', 'aria-label': 'Zoom out' }), zoomIn = el('button', '+', { type: 'button', 'aria-label': 'Zoom in' }), fit = el('button', 'Fit', { type: 'button', 'aria-label': 'Fit the whole journal' });
  controls.append(zoomOut, zoomIn, fit);
  head.append(controls);
  const body = el('div', undefined, { class: 'writer-map-body' });
  const stage = el('div', undefined, { class: 'writer-map-stage' });
  const svg = svgEl('svg', { id: 'writerMapCanvas', role: 'group', 'aria-roledescription': 'map', 'aria-label': 'Entries by date. Arrow keys move between entries; Enter shows one.' });
  const world = svgEl('g', { class: 'writer-map-world' });
  svg.append(world); stage.append(svg);
  const side = el('aside', undefined, { class: 'writer-map-side', 'aria-label': 'Entry and threads' });
  const details = el('div', undefined, { id: 'writerMapDetails', class: 'writer-map-details' });
  const threadsBox = el('div', undefined, { class: 'writer-map-threads' });
  const threadSearch = el('input', undefined, { id: 'writerMapThreadSearch', type: 'search', placeholder: 'Find a tag, person or place', 'aria-label': 'Find a tag, person or place', autocomplete: 'off' });
  const threadList = el('div', undefined, { id: 'writerMapThreads', class: 'writer-map-thread-list' });
  threadsBox.append(el('h3', 'Threads'), el('p', 'Tags and people or places linked from entries. Choose one to see where it runs.', { class: 'writer-map-hint' }), threadSearch, threadList);
  side.append(details, threadsBox);
  body.append(stage, side);
  section.append(head, body);
  (doc.querySelector('.writing-grid') || doc.body).after(section);

  let graph = null, layout = null, scale = 1, panX = 0, panY = 0, selected = -1, focused = -1, thread = null, renderedSource = null;
  const nodes = new Map();
  const order = () => graph.entries.filter(entry => layout.points.has(entry.index)).map(entry => entry.index);
  const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); // one formatter, not one per entry
  const formatDate = date => { const d = new Date(date + 'T12:00:00Z'); return Number.isNaN(+d) ? date : dateFormat.format(d); };
  const entryLabel = entry => entry.date ? formatDate(entry.date) + (entry.title ? ', ' + entry.title : '') : 'Writing before the first date';

  function apply() {
    world.setAttribute('transform', `translate(${panX} ${panY}) scale(${scale})`);
    svg.classList.toggle('writer-map-near', scale >= 1.3);
    svg.classList.toggle('writer-map-far', scale < 0.55);
  }
  function fitAll() {
    const box = stage.getBoundingClientRect(); if (!box.width || !layout) return;
    // Fit the width; a long journal scrolls down rather than shrinking to unreadable dots.
    scale = Math.max(0.15, Math.min(2.5, box.width / layout.width));
    panY = 0; panX = Math.max(0, (box.width - layout.width * scale) / 2); apply();
  }
  function zoomAt(factor, cx, cy) {
    const next = Math.max(0.15, Math.min(4, scale * factor)); if (next === scale) return;
    const box = stage.getBoundingClientRect(), x = cx ?? box.width / 2, y = cy ?? box.height / 2;
    panX = x - (x - panX) * (next / scale); panY = y - (y - panY) * (next / scale); scale = next; apply();
  }
  function reveal(index) {
    const point = layout?.points.get(index); if (!point) return;
    const box = stage.getBoundingClientRect(), x = panX + point.x * scale, y = panY + point.y * scale, margin = 48;
    if (x < margin || x > box.width - margin) panX += box.width / 2 - x;
    if (y < margin || y > box.height - margin) panY += box.height / 2 - y;
    apply();
  }

  function render() {
    renderedSource = editor.value;
    // Narrow screens get narrower day columns, so the calendar reads at its natural size instead of shrinking.
    const width = stage.getBoundingClientRect().width || 900, narrowStage = width < 700;
    graph = journalGraph(editor.value); layout = layoutGraph(graph, narrowStage ? { left: 78, cell: Math.max(9, (width - 78 - 12) / 31), row: 30, top: 40 } : {}); nodes.clear(); world.replaceChildren(); thread = null; selected = -1;
    const dated = graph.entries.filter(entry => entry.date);
    if (!graph.entries.length || !dated.length) {
      summary.textContent = graph.entries.length ? 'No dated entries yet. Add a date heading, like "### 2026-11-03", and entries appear here.' : 'Nothing to map yet. Write an entry and it appears here.';
      details.replaceChildren(); threadList.replaceChildren(); svg.setAttribute('viewBox', '0 0 600 120'); return;
    }
    summary.textContent = `${dated.length} ${dated.length === 1 ? 'entry' : 'entries'} · ${graph.edges.length} ${graph.edges.length === 1 ? 'link' : 'links'} between entries · ${graph.threads.length} ${graph.threads.length === 1 ? 'thread' : 'threads'} · ${formatMonth(dated[0].date)} to ${formatMonth(dated.at(-1).date)}`;
    // Grid: month rows, day columns, a year label where the year changes. Empty months stay as blank rows.
    const grid = svgEl('g', { class: 'writer-map-grid', 'aria-hidden': 'true' });
    for (let day = 1; day <= 31; day += day === 1 ? 4 : 5) grid.append(text(layout.left + (day - 0.5) * layout.cell, layout.top - 24, String(day), 'writer-map-day'));
    let lastYear = null;
    for (const row of layout.rows) {
      grid.append(svgEl('line', { x1: layout.left, x2: layout.width - 24, y1: row.y + layout.row, y2: row.y + layout.row, class: 'writer-map-rule' }));
      grid.append(text(8, row.y + layout.row / 2 + 4, MONTHS[row.month].slice(0, 3) + (row.year !== lastYear ? ' ' + row.year : ''), row.year !== lastYear ? 'writer-map-month writer-map-year' : 'writer-map-month'));
      lastYear = row.year;
    }
    world.append(grid);
    const links = svgEl('g', { class: 'writer-map-links', 'aria-hidden': 'true' });
    for (const edge of graph.edges) {
      const a = layout.points.get(edge.from), b = layout.points.get(edge.to); if (!a || !b) continue;
      const bend = Math.min(80, Math.hypot(b.x - a.x, b.y - a.y) / 3);
      links.append(svgEl('path', { d: `M${a.x} ${a.y} Q${(a.x + b.x) / 2 + bend} ${(a.y + b.y) / 2 - bend} ${b.x} ${b.y}`, class: 'writer-map-link', 'data-from': edge.from, 'data-to': edge.to }));
    }
    world.append(links, svgEl('g', { class: 'writer-map-thread-line', 'aria-hidden': 'true' }));
    const dots = svgEl('g', { class: 'writer-map-entries' });
    for (const entry of dated) {
      const point = layout.points.get(entry.index), radius = Math.max(2.5, Math.min(layout.radius, 3 + Math.log2(entry.words + 1)));
      const group = svgEl('g', { class: 'writer-map-entry', role: 'button', tabindex: '-1', 'data-index': entry.index, transform: `translate(${point.x} ${point.y})`,
        'aria-label': `${entryLabel(entry)}. ${entry.words} ${entry.words === 1 ? 'word' : 'words'}${entry.to.size ? `, links to ${entry.to.size}` : ''}${entry.from.size ? `, linked from ${entry.from.size}` : ''}.` });
      group.append(svgEl('circle', { r: radius + 6, class: 'writer-map-hit' }), svgEl('circle', { r: radius, class: 'writer-map-dot' }));
      if (entry.title) group.append(text(radius + 4, 4, entry.title.slice(0, 28), 'writer-map-label'));
      dots.append(group); nodes.set(entry.index, group);
    }
    world.append(dots);
    svg.setAttribute('viewBox', `0 0 ${stage.getBoundingClientRect().width || layout.width} ${stage.getBoundingClientRect().height || 480}`);
    const first = order()[0]; setFocus(first, false);
    renderThreads(); showDetails(-1); fitAll();
  }
  const formatMonth = date => MONTHS[Number(date.slice(5, 7)) - 1] + ' ' + date.slice(0, 4);
  function text(x, y, value, cls) { const node = svgEl('text', { x, y, class: cls }); node.textContent = value; return node; }

  function setFocus(index, move = true) {
    if (focused >= 0) nodes.get(focused)?.setAttribute('tabindex', '-1');
    focused = index; const node = nodes.get(index); if (!node) return;
    node.setAttribute('tabindex', '0'); if (move) { reveal(index); node.focus({ preventScroll: true }); }
  }
  function select(index) {
    if (selected >= 0) nodes.get(selected)?.classList.remove('is-selected');
    for (const path of world.querySelectorAll('.writer-map-link.is-near')) path.classList.remove('is-near');
    selected = index;
    if (index >= 0) {
      nodes.get(index)?.classList.add('is-selected');
      for (const path of world.querySelectorAll(`.writer-map-link[data-from="${index}"], .writer-map-link[data-to="${index}"]`)) path.classList.add('is-near');
    }
    showDetails(index);
  }
  function entryButton(index) {
    const entry = graph.entries[index], button = el('button', entry.date ? formatDate(entry.date) : 'Before the first date', { type: 'button', class: 'writer-map-chip' });
    button.onclick = () => { select(index); setFocus(index); };
    return button;
  }
  function showDetails(index) {
    details.replaceChildren();
    if (index < 0) { details.append(el('p', 'Choose an entry to see what it links to and what links to it. Its writing stays closed until you open it.', { class: 'writer-map-hint' })); return; }
    const entry = graph.entries[index];
    details.append(el('h3', entry.date ? formatDate(entry.date) : 'Before the first date', { id: 'writerMapEntryTitle' }));
    if (entry.title) details.append(el('p', entry.title, { class: 'writer-map-entry-title' }));
    details.append(el('p', `${entry.words} ${entry.words === 1 ? 'word' : 'words'}`, { class: 'writer-map-hint' }));
    const open = el('button', 'Open in writing', { type: 'button', id: 'writerMapOpen', class: 'writer-map-open' });
    open.onclick = () => { if (editor.value !== renderedSource) { status('The writing changed. The map has been refreshed.'); render(); return; } jumpTo(entry.position, entry.date || 'the start'); };
    details.append(open);
    const list = (title, indexes) => { if (!indexes.length) return; details.append(el('h4', title)); const box = el('div', undefined, { class: 'writer-map-chips' }); for (const i of indexes) box.append(entryButton(i)); details.append(box); };
    list('Links to', [...entry.to]); list('Linked from', [...entry.from]);
    const threads = [...entry.tags.map(tag => 'tag:' + tag), ...entry.refs.map(ref => 'ref:' + ref)].map(key => graph.threads.find(t => t.key === key)).filter(Boolean);
    if (threads.length) { details.append(el('h4', 'Threads')); const box = el('div', undefined, { class: 'writer-map-chips' }); for (const t of threads) box.append(threadButton(t)); details.append(box); }
  }
  function threadButton(item) {
    const button = el('button', item.label, { type: 'button', class: 'writer-map-chip writer-map-thread', 'aria-pressed': String(thread === item.key), 'data-thread': item.key });
    button.append(el('span', ' ' + item.entries.length, { class: 'writer-map-count', 'aria-label': `${item.entries.length} ${item.entries.length === 1 ? 'entry' : 'entries'}` }));
    button.onclick = () => showThread(thread === item.key ? null : item.key);
    return button;
  }
  function renderThreads() {
    const query = threadSearch.value.trim().toLocaleLowerCase(), shown = graph.threads.filter(t => !query || t.label.toLocaleLowerCase().includes(query)).slice(0, 60);
    threadList.replaceChildren(...shown.map(threadButton));
    if (!shown.length) threadList.append(el('p', graph.threads.length ? 'No matching thread.' : 'No tags or people yet. Write #tags or link to a People and Places book.', { class: 'writer-map-hint' }));
  }
  function showThread(key) {
    thread = key; const line = world.querySelector('.writer-map-thread-line'); line.replaceChildren();
    const item = graph.threads.find(t => t.key === key);
    svg.classList.toggle('writer-map-threaded', !!item);
    for (const [index, node] of nodes) node.classList.toggle('in-thread', !!item && item.entries.includes(index));
    for (const button of section.querySelectorAll('[data-thread]')) button.setAttribute('aria-pressed', String(button.dataset.thread === key));
    if (item) {
      const points = item.entries.filter(i => layout.points.has(i)).sort((a, b) => a - b).map(i => layout.points.get(i));
      if (points.length > 1) line.append(svgEl('polyline', { points: points.map(p => p.x + ',' + p.y).join(' '), class: 'writer-map-thread-path' }));
      status(`${item.label}: ${item.entries.length} ${item.entries.length === 1 ? 'entry' : 'entries'}.`);
    }
  }
  threadSearch.oninput = renderThreads;

  // Pointer: drag to move, pinch or Ctrl/⌘ + wheel to zoom, wheel to scroll. Taps choose entries.
  const pointers = new Map(); let pinch = 0, dragged = false;
  svg.addEventListener('pointerdown', event => { pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); dragged = false; if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  svg.addEventListener('pointermove', event => {
    const last = pointers.get(event.pointerId); if (!last) return;
    if (pointers.size === 2) {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const [a, b] = [...pointers.values()], distance = Math.hypot(a.x - b.x, a.y - b.y), box = stage.getBoundingClientRect();
      if (pinch) zoomAt(distance / pinch, (a.x + b.x) / 2 - box.left, (a.y + b.y) / 2 - box.top); pinch = distance; dragged = true; return;
    }
    const dx = event.clientX - last.x, dy = event.clientY - last.y;
    if (!dragged && Math.hypot(dx, dy) < 4) return;
    if (!dragged) svg.setPointerCapture(event.pointerId);
    dragged = true; panX += dx; panY += dy; pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); apply();
  });
  const release = event => { pointers.delete(event.pointerId); if (pointers.size < 2) pinch = 0; };
  svg.addEventListener('pointerup', event => {
    const wasDrag = dragged; release(event);
    if (wasDrag) return;
    const node = event.target.closest?.('.writer-map-entry'); if (!node) return;
    const index = Number(node.dataset.index); select(index); setFocus(index, false);
  });
  svg.addEventListener('pointercancel', release);
  stage.addEventListener('wheel', event => {
    event.preventDefault(); const box = stage.getBoundingClientRect();
    if (event.ctrlKey || event.metaKey) zoomAt(Math.exp(-event.deltaY / 300), event.clientX - box.left, event.clientY - box.top);
    else { panX -= event.deltaX; panY -= event.deltaY; apply(); }
  }, { passive: false });
  zoomIn.onclick = () => zoomAt(1.3); zoomOut.onclick = () => zoomAt(1 / 1.3); fit.onclick = fitAll;
  // Keyboard: one tab stop; arrows walk entries in date order, Enter shows one.
  svg.addEventListener('keydown', event => {
    const list = order(), at = list.indexOf(focused); if (!list.length) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, PageDown: 10, PageUp: -10 }[event.key];
    if (step) { event.preventDefault(); setFocus(list[Math.max(0, Math.min(list.length - 1, at + step))]); return; }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setFocus(list[event.key === 'Home' ? 0 : list.length - 1]); return; }
    if ((event.key === 'Enter' || event.key === ' ') && focused >= 0) { event.preventDefault(); select(focused); details.querySelector('#writerMapOpen')?.focus(); return; }
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomAt(1.3); } else if (event.key === '-') { event.preventDefault(); zoomAt(1 / 1.3); }
  });
  let refresh = 0;
  editor.addEventListener('input', () => { if (section.hidden) return; clearTimeout(refresh); refresh = setTimeout(render, 400); });
  let wide = null;
  win.addEventListener('resize', () => { if (section.hidden) return; const now = stage.getBoundingClientRect().width >= 700; if (wide !== null && now !== wide && graph) render(); else fitAll(); wide = now; });

  return {
    show() { section.hidden = false; if (editor.readOnly) { reset(); summary.textContent = 'Unlock this journal to see its map.'; return; } if (renderedSource !== editor.value) render(); else fitAll(); },
    hide() { section.hidden = true; },
    reset,
    get graph() { return graph; },
  };
  // Locking, opening another journal or clearing it drops everything the map knew.
  function reset() { graph = null; layout = null; renderedSource = null; nodes.clear(); world.replaceChildren(); details.replaceChildren(); threadList.replaceChildren(); summary.textContent = ''; selected = focused = -1; thread = null; }
}
