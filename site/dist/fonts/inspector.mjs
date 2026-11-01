const SVG = 'http://www.w3.org/2000/svg';
const PAGE_SIZE = 48;
const $ = (id) => document.getElementById(id);
const controls = ['fontFamily', 'fontProfile', 'fontWeight', 'glyphSearch', 'glyphKind'];
let fonts = [], activeFont = null, selectedName = 'a', page = 0;

function node(name, text) {
  const result = document.createElement(name);
  if (text !== undefined) result.textContent = text;
  return result;
}

function svgNode(name, attrs = {}) {
  const result = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) result.setAttribute(key, String(value));
  return result;
}

function numeric(value, fallback = 0) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
function format(value) { return Math.round(numeric(value) * 100) / 100; }
function codepoint(glyph) { return Number.isInteger(glyph.unicode) && glyph.unicode >= 0 && glyph.unicode <= 0x10ffff ? `U+${glyph.unicode.toString(16).toUpperCase().padStart(4, '0')}` : ''; }
function character(glyph) { return codepoint(glyph) ? String.fromCodePoint(glyph.unicode) : ''; }
function glyphLabel(glyph) { return codepoint(glyph) ? `${glyph.name}, ${codepoint(glyph)}` : `${glyph.name}, alternate glyph`; }
function validFont(font) { return font && typeof font.family === 'string' && typeof font.id === 'string' && [400, 700].includes(Number(font.weight)) && Array.isArray(font.glyphs); }
function choices(select, options, preferred = select.value) {
  select.replaceChildren(...options.map(([value, label]) => { const option = node('option', label); option.value = value; return option; }));
  select.value = options.some(([value]) => value === preferred) ? preferred : options[0]?.[0] || '';
}

function matchingGlyphs() {
  const query = $('glyphSearch').value.trim().toLocaleLowerCase(), kind = $('glyphKind').value;
  return activeFont.glyphs.filter((glyph) => {
    const encoded = Boolean(codepoint(glyph));
    if (kind === 'characters' && !encoded || kind === 'alternates' && encoded) return false;
    return !query || glyph.name.toLocaleLowerCase().includes(query) || character(glyph).toLocaleLowerCase().includes(query) || codepoint(glyph).toLocaleLowerCase().includes(query);
  });
}

function thumbnail(glyph) {
  if (!glyph.path) {
    const label = node('span', glyph.unicode === 32 || glyph.unicode === 160 ? '␣' : '∅');
    label.className = 'glyph-space'; label.setAttribute('aria-hidden', 'true'); return label;
  }
  const [left, bottom, right, top] = glyph.bounds.map((value) => numeric(value));
  const width = Math.max(1, right - left), height = Math.max(1, top - bottom), padding = Math.max(width, height) * .07;
  const svg = svgNode('svg', { viewBox: `${left - padding} ${-top - padding} ${width + padding * 2} ${height + padding * 2}`, 'aria-hidden': 'true', focusable: 'false' });
  svg.append(svgNode('path', { d: glyph.path, transform: 'scale(1 -1)' })); return svg;
}

function drawGrid({ focusSelected = false } = {}) {
  const matches = matchingGlyphs(), pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  page = Math.max(0, Math.min(page, pages - 1));
  const start = page * PAGE_SIZE, visible = matches.slice(start, start + PAGE_SIZE), list = $('glyphGrid'), fragment = document.createDocumentFragment();
  for (const glyph of visible) {
    const item = node('li'), button = node('button'); button.type = 'button'; button.className = 'glyph-button';
    button.dataset.glyph = glyph.name; button.setAttribute('aria-label', glyphLabel(glyph)); button.setAttribute('aria-pressed', String(glyph.name === selectedName));
    const label = node('span', glyph.name); label.className = 'glyph-name'; label.setAttribute('aria-hidden', 'true');
    button.append(thumbnail(glyph), label); button.addEventListener('click', () => selectGlyph(glyph)); item.append(button); fragment.append(item);
  }
  list.replaceChildren(fragment);
  $('glyphCount').textContent = matches.length ? `${matches.length} glyphs. Showing ${start + 1} to ${start + visible.length}.` : 'No glyphs match. Try another character or name.';
  $('glyphPageState').textContent = `Page ${page + 1} of ${pages}`;
  $('glyphPrevious').disabled = page === 0; $('glyphNext').disabled = page >= pages - 1;
  if (focusSelected) list.querySelector('[aria-pressed=true]')?.focus();
}

function metric(list, label, value) {
  const pair = node('div'); pair.append(node('dt', label), node('dd', value)); list.append(pair);
}

function outline(glyph) {
  const bounds = Array.isArray(glyph.bounds) && glyph.bounds.length === 4 ? glyph.bounds.map((value) => numeric(value)) : [0, 0, 0, 0];
  const [left, bottom, right, top] = bounds, advance = numeric(glyph.advanceWidth), ascent = Math.abs(numeric(activeFont.ascent, 950)), descent = -Math.abs(numeric(activeFont.descent, 250));
  const minX = Math.min(-260, left - 55), maxX = Math.max(advance + 210, right + 55, 650), minY = Math.min(descent - 55, bottom - 55), maxY = Math.max(ascent + 65, top + 65);
  const svg = svgNode('svg', { viewBox: `${minX} ${-maxY} ${maxX - minX} ${maxY - minY}`, role: 'img', 'aria-labelledby': 'glyphSvgTitle glyphSvgDescription' });
  const title = svgNode('title', { id: 'glyphSvgTitle' }); title.textContent = `${glyph.name} outline`;
  const description = svgNode('desc', { id: 'glyphSvgDescription' }); description.textContent = `Original SVG outline with baseline, x-height, cap height and advance guides. Advance ${format(advance)} font units.`;
  svg.append(title, description);
  const guides = svgNode('g', { transform: 'scale(1 -1)' });
  const horizontal = (y, label, extra = '') => {
    guides.append(svgNode('line', { x1: minX, x2: maxX, y1: y, y2: y, class: `glyph-guide ${extra}` }));
    const text = svgNode('text', { x: -20, y: -y - 13, 'text-anchor': 'end', class: 'glyph-guide-label' }); text.textContent = label; svg.append(text);
  };
  horizontal(0, 'Baseline', 'glyph-guide-baseline'); horizontal(numeric(activeFont.xHeight, 500), 'x-height'); horizontal(numeric(activeFont.capHeight, 700), 'Cap height');
  guides.append(svgNode('line', { x1: 0, x2: 0, y1: minY, y2: maxY, class: 'glyph-guide glyph-guide-advance' }));
  guides.append(svgNode('line', { x1: advance, x2: advance, y1: minY, y2: maxY, class: 'glyph-guide glyph-guide-advance' }));
  guides.append(svgNode('rect', { x: left, y: bottom, width: Math.max(0, right - left), height: Math.max(0, top - bottom), class: 'glyph-ink-bounds' }));
  const shape = svgNode('g', { transform: 'scale(1 -1)' });
  if (glyph.path) shape.append(svgNode('path', { d: glyph.path, class: 'glyph-outline' }));
  svg.insertBefore(guides, svg.querySelector('text')); svg.insertBefore(shape, svg.querySelector('text'));
  const advanceLabel = svgNode('text', { x: advance + 12, y: -minY - 14, class: 'glyph-guide-label' }); advanceLabel.textContent = 'Advance'; svg.append(advanceLabel);
  for (const [key, label] of [['entry', 'Entry'], ['exit', 'Exit']]) {
    if (!Array.isArray(glyph[key]) || glyph[key].length !== 2) continue;
    const [x, y] = glyph[key].map((value) => numeric(value));
    svg.append(svgNode('circle', { cx: x, cy: -y, r: 11, class: 'glyph-anchor' }));
    const text = svgNode('text', { x: x + 16, y: -y + (key === 'entry' ? 32 : -18), class: 'glyph-guide-label' }); text.textContent = label; svg.append(text);
  }
  $('glyphDiagram').replaceChildren(svg);
}

function selectGlyph(glyph) {
  selectedName = glyph.name; $('glyphTitle').textContent = codepoint(glyph) ? `${character(glyph) || 'Space'} · ${glyph.name}` : glyph.name;
  for (const button of $('glyphGrid').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.glyph === selectedName));
  const metrics = $('glyphMetrics'); metrics.replaceChildren();
  metric(metrics, 'Unicode', codepoint(glyph) || 'Alternate (unencoded)'); metric(metrics, 'Advance', `${format(glyph.advanceWidth)} units`);
  metric(metrics, 'Left bearing', `${format(glyph.lsb)} units`); metric(metrics, 'Right bearing', `${format(glyph.rsb)} units`);
  if (Number.isFinite(glyph.variation)) metric(metrics, 'Outline variation', `${(glyph.variation * 100).toFixed(1)}%`);
  metric(metrics, 'Bounds', glyph.bounds.map(format).join(', ')); metric(metrics, 'Units per em', String(numeric(activeFont.unitsPerEm, 1000)));
  for (const [key, label] of [['entry', 'Entry anchor'], ['exit', 'Exit anchor']]) if (Array.isArray(glyph[key])) metric(metrics, label, glyph[key].map(format).join(', '));
  outline(glyph);
}

function specimen() {
  const sample = $('fontSpecimen'); sample.textContent = $('fontSample').value;
  if (!activeFont) return;
  sample.style.fontFamily = `'${activeFont.family.replace(/['\\]/g, '')}', ${activeFont.id === 'mono' ? 'monospace' : activeFont.id === 'sans' ? 'sans-serif' : 'cursive'}`;
  sample.style.fontWeight = String(activeFont.weight); sample.style.fontFeatureSettings = `"liga" ${$('fontLiga').checked ? 1 : 0}, "calt" ${$('fontCalt').checked ? 1 : 0}, "kern" 1, "curs" 1, "mark" 1, "ss01" ${$('fontAlternates').checked ? 1 : 0}`;
}

function chooseFont() {
  const family = $('fontFamily').value;
  $('fontAlternates').closest('label').hidden = family === 'script';
  $('fontProfileWrap').hidden = family !== 'script';
  if (family === 'script') {
    const profiles = [...new Set(fonts.filter((font) => font.id.startsWith('script')).map((font) => String(font.profile)))].sort((a, b) => Number(a) - Number(b));
    choices($('fontProfile'), profiles.map((profile) => [profile, profile]));
  }
  const variants = fonts.filter((font) => family !== 'script' ? font.id === family : String(font.profile) === $('fontProfile').value);
  const weights = [...new Set(variants.map((font) => Number(font.weight)))].sort((a, b) => a - b);
  choices($('fontWeight'), weights.map((weight) => [String(weight), weight === 700 ? 'Bold' : 'Regular']));
  activeFont = variants.find((font) => Number(font.weight) === Number($('fontWeight').value)) || variants[0] || fonts[0];
  page = 0;
  const glyph = activeFont.glyphs.find((item) => item.name === selectedName) || activeFont.glyphs.find((item) => item.unicode === 97) || activeFont.glyphs[0];
  if (glyph) selectGlyph(glyph);
  drawGrid(); specimen();
  $('fontState').textContent = `${activeFont.family}${!activeFont.id.startsWith('script') ? '' : ` · ${activeFont.profile} stroke`} · ${Number(activeFont.weight) === 700 ? 'Bold' : 'Regular'}. ${activeFont.glyphs.length} glyphs.`;
}

for (const id of ['fontFamily', 'fontProfile', 'fontWeight']) $(id).addEventListener('change', chooseFont);
for (const id of ['fontLiga', 'fontCalt', 'fontAlternates', 'fontSample']) $(id).addEventListener('input', specimen);
for (const id of ['glyphSearch', 'glyphKind']) $(id).addEventListener(id === 'glyphSearch' ? 'input' : 'change', () => { page = 0; drawGrid(); });
$('glyphPrevious').addEventListener('click', () => { page--; drawGrid(); });
$('glyphNext').addEventListener('click', () => { page++; drawGrid(); });
specimen();

try {
  const response = await fetch(new URL('./catalog.json', import.meta.url));
  if (!response.ok) throw new Error(`Catalog response ${response.status}`);
  const catalog = await response.json(); fonts = Array.isArray(catalog.fonts) ? catalog.fonts.filter(validFont) : [];
  if (!fonts.length || fonts.some((font) => !font.glyphs.length || font.glyphs.some((glyph) => typeof glyph.name !== 'string' || typeof glyph.path !== 'string' || !Array.isArray(glyph.bounds) || glyph.bounds.length !== 4))) throw new Error('No usable font outlines in catalog');
  choices($('fontFamily'), [['script', 'Jot Script'], ['sans', 'Jot Sans'], ['mono', 'Jot Mono']].filter(([id]) => fonts.some((font) => id === 'script' ? font.id.startsWith('script') : font.id === id)));
  for (const id of controls) $(id).disabled = false;
  chooseFont();
} catch {
  $('fontState').textContent = 'The font catalog could not be opened. Reload this page to try again. You can still try a sample above.';
  $('fontState').dataset.error = ''; $('glyphCount').textContent = 'The glyph catalog is unavailable.';
}
