/** Jot handwriting, draft 0.1: a rendered page made to look written by hand, on a dot grid, so it prints like a filled-in notebook.
 * DOM only; used by the page preview (preview.mjs) for the workspace, the template editor and the VS Code extension.
 *
 *   handwrite(page, { hand: 'pen', ink: 'blue', seed: 1 })   letters and words in a handwriting font, each a little different
 *   alignToGrid(page, { pitchMm: 5 })                         every line on a row of dots; returns { pitch, rows, baseline }
 *   handwritingCSS(fontBase)                                  the fonts and the look (add once, with the fonts folder's URL)
 *   pageGeometry(paperMm, pitchMm, marginMm)                  @page size and margins so a printed page holds whole rows of dots
 *
 * The hands are open fonts (SIL OFL 1.1, fonts/): Caveat (pen, two full sets of alternate letters), Playpen Sans (neat print, its own
 * contextual alternates) and Shantell Sans (marker, its own alternates). Alternates and the small wobbles are chosen from the text and
 * the seed, never at random, so the same journal prints the same every time. The words are only drawn differently: the text, its order,
 * selection and copying are unchanged, and screen readers read the words as they are.
 */

export const HANDS = {
  pen: { name: 'Pen', family: 'Jot Caveat', file: 'caveat', alternates: ['', 'ss01', 'ss02'], size: 1.06, wobble: 1 },
  print: { name: 'Neat print', family: 'Jot Playpen', file: 'playpen-sans', alternates: [''], size: 0.86, wobble: 0.6 },
  marker: { name: 'Marker', family: 'Jot Shantell', file: 'shantell-sans', alternates: [''], size: 0.9, wobble: 0.8 },
};
export const INKS = { blue: '#1f3a8a', black: '#22262a', green: '#1d5c3a', purple: '#4c2a85', brown: '#5b3a1e' };
export const PITCHES = [4, 5, 6, 7]; // mm between dots; 5 mm is the usual dot-grid notebook
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

/** px per mm at CSS's 96 dpi, and a length snapped to Chromium's layout unit (1/64 px), so hundreds of lines never drift off the dots. */
export const PX_PER_MM = 96 / 25.4;
export const snap = (px) => Math.round(px * 64) / 64;
export const pitchPx = (mm) => snap(mm * PX_PER_MM);

/** The @page box for a printed page of dot grid: the writing area is a whole number of rows and columns, centred on the sheet. */
export function pageGeometry([wMm, hMm], pitchMm = 5, minMarginMm = 8) {
  const p = pitchPx(pitchMm), W = wMm * PX_PER_MM, H = hMm * PX_PER_MM, m = minMarginMm * PX_PER_MM;
  const cols = Math.max(1, Math.floor((W - 2 * m) / p)), rows = Math.max(1, Math.floor((H - 2 * m) / p));
  const mx = snap((W - cols * p) / 2), my = snap((H - rows * p) / 2);
  return { pitch: p, cols, rows, width: cols * p, height: rows * p, marginX: mx, marginY: my, css: `@page { size: ${wMm}mm ${hMm}mm; margin: ${my}px ${mx}px; }` };
}

/** The fonts and the look. fontBase: the URL of the fonts folder (ends with /). */
export function handwritingCSS(fontBase) {
  const face = (h) => [['latin', LATIN], ['latin-ext', LATIN_EXT]].flatMap(([sub, range]) => [400, 700].map((w) => `@font-face{font-family:'${h.family}';font-style:normal;font-weight:${w};font-display:block;src:url('${fontBase}${h.file}-${sub}-${w}-normal.woff2') format('woff2');unicode-range:${range}}`)).join('\n');
  return `${Object.values(HANDS).map(face).join('\n')}
.jot-hand{position:relative;--hw-pitch:18.890625px;--hw-ink:${INKS.blue};--hw-dot:#9aa0a6;--hw-size:1;color:var(--hw-ink);font-family:var(--hw-family),cursive;font-size:calc(var(--hw-pitch)*var(--hw-size));line-height:var(--hw-pitch);font-weight:400;font-kerning:normal;
  background-color:#fffffd;background-image:var(--hw-dots);background-size:var(--hw-pitch) var(--hw-pitch);background-position:var(--hw-dx,0) var(--hw-dy,0);background-origin:content-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.jot-hand *{line-height:inherit;margin-top:0;margin-bottom:0}
.jot-hand :is(h1,h2,h3,h4,h5,h6,p,ul,ol,li,blockquote,pre,table,figure,dl,dd,dt,section,div,hr){font-family:inherit;font-weight:inherit;color:inherit;letter-spacing:normal}
.jot-hand :is(h1,h2){font-size:1.7em;line-height:calc(var(--hw-pitch)*2);font-weight:700}
.jot-hand h3{font-size:1.35em;line-height:calc(var(--hw-pitch)*2);font-weight:700}
.jot-hand :is(h4,h5,h6){font-size:1em;font-weight:700}
.jot-hand :is(strong,b){font-weight:700}
.jot-hand :is(code,pre,kbd){font-family:inherit;font-size:1em;background:none;padding:0;border:0}
.jot-hand pre{white-space:pre-wrap}
.jot-hand :is(ul,ol){padding-left:calc(var(--hw-pitch)*1.5)}
.jot-hand blockquote{padding-left:calc(var(--hw-pitch) - 2px);border-left:2px solid color-mix(in srgb,var(--hw-ink) 45%,transparent);box-shadow:none;font-style:normal}
.jot-hand hr{border:0;height:var(--hw-pitch);background:linear-gradient(transparent calc(50% - 1px),color-mix(in srgb,var(--hw-ink) 60%,transparent) calc(50% - 1px),color-mix(in srgb,var(--hw-ink) 60%,transparent) calc(50% + 1px),transparent calc(50% + 1px))}
.jot-hand table{border-collapse:collapse;border:0;--hw-rule:color-mix(in srgb,var(--hw-ink) 45%,transparent)}.jot-hand :is(th,td){padding:0 .4em;border:0;box-shadow:none;height:auto;font-weight:inherit;background:linear-gradient(var(--hw-rule),var(--hw-rule)) right/1px 100% no-repeat,linear-gradient(var(--hw-rule),var(--hw-rule)) bottom/100% 1px no-repeat}
.jot-hand th{font-weight:700}
.jot-hand a{color:inherit;text-decoration:underline}
.jot-hand img{display:block;max-width:100%}
.jot-hand .hw-w{display:inline-block;transform:translateY(var(--y,0)) rotate(var(--r,0deg)) skewX(var(--k,0deg));transform-origin:50% 80%;opacity:var(--o,1);white-space:pre}
.jot-hand .hw-c{position:relative;top:var(--cy,0)}
.jot-hand em,.jot-hand i,.jot-hand cite{font-style:normal;--k:-9deg}
.jot-hand :is(ins,u),.jot-hand :is(ins,u) .hw-w{text-decoration:underline;text-decoration-thickness:.08em;text-underline-offset:.18em}
.jot-hand :is(del,s),.jot-hand :is(del,s) .hw-w{text-decoration:line-through;text-decoration-thickness:.08em}
.jot-hand mark{color:inherit;background:linear-gradient(176deg,transparent 18%,rgba(255,226,64,.62) 20%,rgba(255,214,40,.55) 78%,transparent 82%);box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:0 .1em}
.jot-hand sup{font-size:.72em;vertical-align:baseline;position:relative;top:-.55em;line-height:0}
.jot-hand :is(.jot-task,.jot-blank-line,.jot-measure,.jot-record,.jot-record strong,.jot-record dt,.jot-record dd,.jot-chart,.jot-callout,.jot-callout-title,.jot-footnotes,.eyebrow,p,li,td,th,blockquote,figcaption,.jc-sum,.jc-name,.jc-unit,.jc-anchors){font-family:inherit;font-size:inherit;color:inherit;letter-spacing:normal;text-transform:none}
.jot-hand :is(h1,h2,h3,h4,h5,h6){letter-spacing:normal;text-transform:none}
.jot-hand :is(.jot-task,.jot-record,.jot-measure,.jot-blanks,.jot-blank-line,.jot-footnotes,.jot-callout,dl,figure,figcaption,details){padding-top:0;padding-bottom:0;margin:0;border-top:0;border-bottom:0;border-radius:0}
.jot-hand .hw-box{width:.78em;height:.78em;margin-right:.3em;vertical-align:-.08em}
.jot-hand :is(.jot-task,.jot-sign){display:block} /* one line of writing, one row of dots */
.jot-hand .jot-box{display:inline-block;width:auto}.jot-hand .jot-sym{display:inline-block;width:1.1em}
.jot-hand .jot-record,.jot-hand .jot-callout{border:0;border-left:2px solid color-mix(in srgb,var(--hw-ink) 35%,transparent);background:none;padding:0 0 0 calc(var(--hw-pitch) - 2px);box-shadow:none}
.jot-hand .jot-record strong{text-transform:none;letter-spacing:0;font-size:1em}
.jot-hand .jot-record dl{display:block}.jot-hand .jot-record dt{display:inline;font-weight:700}.jot-hand .jot-record dt::after{content:': '}.jot-hand .jot-record dd{display:inline;margin:0}.jot-hand .jot-record dd::after{content:'';display:block}
.jot-hand .jot-chart{font:inherit;border:0;background:transparent;padding:0;margin:0;--jc-surface:transparent;--jc-grid:transparent;--jc-ink:var(--hw-ink);--jc-muted:var(--hw-ink);--jc-series:var(--hw-ink)}
.jot-hand .jc-canvas{height:calc(var(--hw-pitch)*7)}
.jot-hand .jot-chart-table{display:none}
.jot-hand .jot-footnotes{border-top:0;font-size:.9em}
.jot-hand .diagram-note,.jot-hand .raw-html{opacity:.6}
.jot-hand .hw-page-edge{position:absolute;left:0;right:0;height:0;border-top:1px dashed #c7a7ff;pointer-events:none}
@media print{.jot-hand .hw-page-edge{display:none}}
${BOX_CSS}`.replace(/\.jot-hand(?![\w-])/g, '.jot-hand.jot-hand'); // doubled: the hand's rules win over a page's own typed styles
}

// ---- hand-drawn checkboxes: a wobbly pencil square and a scribbled tick that draws itself ----
// Inline SVG, so it scales with the writing and prints as lines. Every box is a little different (from its seed); the tick's stroke is
// animated from nothing to whole with stroke-dashoffset (pathLength 1, so no measuring), finished at once in print and for reduced motion.
// Only on handwritten pages, in the hand's ink: a task's box, and a Markdown task list's box.
export const BOX_CSS = `.hw-box{display:inline-block;width:1.1em;height:1.1em;overflow:visible;vertical-align:-.2em;color:inherit;flex:none}
.hw-box .hw-square{fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.hw-box .hw-tick{fill:none;stroke:currentColor;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1}
.hw-box:not(.done) .hw-tick{visibility:hidden} /* a round line end still paints a dot at zero length */
.hw-box.done .hw-tick{stroke-dashoffset:0}
.hw-box.drawn .hw-tick{animation:hw-draw .45s cubic-bezier(.6,.05,.35,1) both}
@keyframes hw-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.hw-box.drawn .hw-tick{animation:none}}
@media print{.hw-box.drawn .hw-tick{animation:none}}`;
const SVGNS = 'http://www.w3.org/2000/svg';
const r1 = (v) => Math.round(v * 10) / 10;
// Like a real hand, the pencil does not draw every box or tick the same way: BOX_KINDS ways to draw the square, TICK_KINDS ways to tick
// it, each with its own wobble. Which ones a box gets comes from its seed (so a reprint matches); handwrite() never gives two boxes in a
// row the same pair.
export const BOX_KINDS = ['closed', 'open', 'twice', 'round'];
export const TICK_KINDS = ['check', 'hook', 'flick', 'two'];
const corners = (j) => [[3 + j(1), 4 + j(1)], [21 + j(1), 3 + j(1)], [21 + j(1), 21 + j(1)], [3 + j(1), 20.5 + j(1)]];
const sides = (c, j, from = 0, n = 4, bow = 1.2) => { let d = ''; for (let k = 1; k <= n; k++) { const a = c[(from + k - 1) % 4], b = c[(from + k) % 4]; d += `Q${r1((a[0] + b[0]) / 2 + j(bow))},${r1((a[1] + b[1]) / 2 + j(bow))} ${r1(b[0])},${r1(b[1])}`; } return d; };
/** The path of a wobbly pencil square on a 24 x 24 box, drawn one of BOX_KINDS ways:
 *  closed: four bowed sides, the pencil overshooting where it began · open: the last side stops short, a gap at the corner
 *  twice: traced round a second time, a little off the first · round: one soft loop, the corners rounded off */
export function squarePath(seed = 1, kind = 'closed') {
  const r = rng(seed * 2654435761), j = (a) => (r() - 0.5) * 2 * a, c = corners(j), m = (p) => `M${r1(p[0])},${r1(p[1])}`;
  if (kind === 'open') { const s0 = Math.floor(r() * 4), a = c[(s0 + 3) % 4], b = c[s0], f = 0.68 + r() * 0.12; return `${m(c[s0])}${sides(c, j, s0, 3)}Q${r1(a[0] + (b[0] - a[0]) * f / 2 + j(1))},${r1(a[1] + (b[1] - a[1]) * f / 2 + j(1))} ${r1(a[0] + (b[0] - a[0]) * f)},${r1(a[1] + (b[1] - a[1]) * f)}`; }
  if (kind === 'twice') { const c2 = c.map(([x, y]) => [Math.min(22.5, Math.max(1.5, x + j(0.9))), Math.min(22.5, Math.max(1.5, y + j(0.9)))]); return `${m(c[0])}${sides(c, j)}Q${r1((c[0][0] + c2[1][0]) / 2 + j(1))},${r1((c[0][1] + c2[1][1]) / 2 + j(1))} ${r1(c2[1][0])},${r1(c2[1][1])}${sides(c2, j, 1, 3, 1)}`; }
  if (kind === 'round') { // each corner cut by a curve: along the side to k before the corner, round it, k into the next side
    const k = 2.6 + r() * 1.2, u = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
    const into = (a, b) => { const [ux, uy] = u(a, b); return [a[0] + ux * k, a[1] + uy * k]; };
    let d = m(into(c[0], c[1]));
    for (let i = 1; i <= 4; i++) { const a = c[i - 1], b = c[i % 4], n = c[(i + 1) % 4], [ux, uy] = u(a, b), end = into(b, n); d += `L${r1(b[0] - ux * k + j(0.4))},${r1(b[1] - uy * k + j(0.4))}Q${r1(b[0])},${r1(b[1])} ${r1(end[0])},${r1(end[1])}`; }
    return d;
  }
  return `${m(c[0])}${sides(c, j)}L${r1(c[0][0] + 2.5 + j(0.8))},${r1(c[0][1] - 0.6 + j(0.6))}`; // the overlap where the pencil comes round
}
/** The path of a scribbled tick, running a little past the box like a quick pen, drawn one of TICK_KINDS ways:
 *  check: down then a long stroke up · hook: a small curl where the pen lands first · flick: a short dip and a long, high flick
 *  two: two strokes, the pen lifted between them */
export function tickPath(seed = 1, kind = 'check') {
  const r = rng(seed * 40503 + 7), j = (a) => (r() - 0.5) * 2 * a, P = (x, y) => `${r1(x)},${r1(y)}`;
  const s = [5.5 + j(1), 12.5 + j(1)], low = [10 + j(0.8), 19 + j(0.8)], top = [24.5 + j(1.2), 1 + j(1.2)];
  if (kind === 'hook') return `M${P(s[0] - 1.6, s[1] + 0.6)}Q${P(s[0] - 0.8, s[1] - 1.6 + j(0.4))} ${P(s[0] + 0.4, s[1] + 0.2)}Q${P(8 + j(1), 15.5 + j(1))} ${P(...low)}Q${P(14 + j(1.5), 9 + j(1.5))} ${P(...top)}`;
  if (kind === 'flick') return `M${P(s[0] + 1.5, s[1] + 2)}Q${P(8.5 + j(0.6), 17 + j(0.6))} ${P(low[0] + 0.5, low[1])}Q${P(13 + j(1.5), 6 + j(1.5))} ${P(top[0] + 1.5, top[1] - 1.5)}`;
  if (kind === 'two') return `M${P(...s)}L${P(low[0] - 0.2, low[1] - 0.4)}M${P(low[0] - 0.8, low[1] + 0.3)}Q${P(14.5 + j(1.5), 9.5 + j(1.5))} ${P(top[0] - 0.5, top[1] + 1)}`;
  return `M${P(...s)}Q${P(8 + j(1), 15 + j(1))} ${P(...low)}Q${P(14 + j(1.5), 9 + j(1.5))} ${P(...top)}`;
}
/** Which box and tick a seed gets; `not` (the previous box's pair) is never repeated. */
export function boxKinds(seed = 1, not = null) {
  const r = rng(seed * 97 + 13); let box = BOX_KINDS[Math.floor(r() * BOX_KINDS.length)], tick = TICK_KINDS[Math.floor(r() * TICK_KINDS.length)];
  if (not && box === not.box) box = BOX_KINDS[(BOX_KINDS.indexOf(box) + 1 + Math.floor(r() * (BOX_KINDS.length - 1))) % BOX_KINDS.length];
  if (not && tick === not.tick) tick = TICK_KINDS[(TICK_KINDS.indexOf(tick) + 1 + Math.floor(r() * (TICK_KINDS.length - 1))) % TICK_KINDS.length];
  return { box, tick };
}
/** A hand-drawn box as an SVG element. done: ticked. label: what a screen reader hears (none: hidden). kinds: { box, tick } (boxKinds). */
export function boxSVG(doc, { done = false, seed = 1, label = '', drawn = false, kinds = boxKinds(seed) } = {}) {
  const svg = doc.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', `hw-box${done ? ' done' : ''}${drawn ? ' drawn' : ''}`); svg.setAttribute('focusable', 'false');
  svg.dataset.box = kinds.box; svg.dataset.tick = kinds.tick;
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  for (const [cls, d] of [['hw-square', squarePath(seed, kinds.box)], ['hw-tick', tickPath(seed, kinds.tick)]]) { const p = doc.createElementNS(SVGNS, 'path'); p.setAttribute('class', cls); p.setAttribute('d', d); p.setAttribute('pathLength', '1'); svg.append(p); }
  return svg;
}

// ---- deterministic "randomness": the same text and seed always wobble the same way ----
function hash(str, seed) { let h = 2166136261 ^ seed; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; }; }

const SKIP = new Set(['SCRIPT', 'STYLE', 'CANVAS', 'SVG', 'svg', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'IMG', 'SUMMARY']);
/** Turns every word on the page into handwriting. Safe to call again after a new render (it starts from the page as rendered). */
export function handwrite(page, { hand = 'pen', ink = 'blue', seed = 1 } = {}) {
  const H = HANDS[hand] || HANDS.pen, doc = page.ownerDocument;
  page.classList.add('jot-hand');
  page.style.setProperty('--hw-family', `'${H.family}'`);
  page.style.setProperty('--hw-size', String(H.size));
  page.style.setProperty('--hw-ink', INKS[ink] || (/^#[0-9a-f]{6}$/i.test(ink) ? ink : INKS.blue));
  // task boxes and empty lines drawn as a pen would
  let boxes = 0, last = null;
  const pencil = (done) => { const sd = seed * 101 + (boxes++), kinds = boxKinds(sd, last); last = kinds; return boxSVG(doc, { done, seed: sd, kinds, label: done ? 'done' : 'to do', drawn: done }); };
  for (const b of page.querySelectorAll('.jot-task .jot-box')) { // open and done tasks get a pencil box; moved, scheduled, cancelled keep their sign
    const st = b.dataset.status; if (st !== 'open' && st !== 'completed') continue;
    b.replaceWith(pencil(st === 'completed'));
  }
  for (const cb of page.querySelectorAll('input[type=checkbox]')) cb.replaceWith(pencil(cb.checked));
  const walker = doc.createTreeWalker(page, 4 /* NodeFilter.SHOW_TEXT */, { acceptNode: (n) => { for (let p = n.parentNode; p && p !== page; p = p.parentNode) if (SKIP.has(p.nodeName) || (p.classList && (p.classList.contains('hw-w') || p.classList.contains('jot-chart-table')))) return 2; return n.nodeValue.trim() ? 1 : 2; } });
  const texts = []; for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n);
  let k = 0;
  for (const node of texts) {
    const frag = doc.createDocumentFragment(), parts = node.nodeValue.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(part); continue; }
      const r = rng(hash(part, seed + (k++) * 7919));
      const w = doc.createElement('span'); w.className = 'hw-w';
      const wob = H.wobble;
      w.style.setProperty('--r', `${((r() - 0.5) * 2.4 * wob).toFixed(2)}deg`);
      w.style.setProperty('--y', `${((r() - 0.5) * 0.06 * wob).toFixed(3)}em`);
      w.style.setProperty('--o', (0.86 + r() * 0.14).toFixed(2));
      if (H.alternates.length > 1) {
        let last = -1, lastCh = '';
        for (const ch of part) {
          let a = Math.floor(r() * H.alternates.length);
          if (ch === lastCh && a === last) a = (a + 1) % H.alternates.length; // never the same shape twice in a row ("ll", "ee")
          const c = doc.createElement('span'); c.className = 'hw-c'; c.textContent = ch;
          if (H.alternates[a]) c.style.fontFeatureSettings = `'${H.alternates[a]}'`;
          const dy = (r() - 0.5) * 0.05 * wob; if (Math.abs(dy) > 0.004) c.style.setProperty('--cy', `${dy.toFixed(3)}em`);
          w.append(c); last = a; lastCh = ch;
        }
      } else w.textContent = part; // fonts with their own contextual alternates keep the word whole, so those alternates work
      frag.append(w);
    }
    node.replaceWith(frag);
  }
  return page;
}

/** Puts every line of the page on a row of the dot grid. The page must be in the document (it is measured) with its fonts loaded.
 *  Block by block: no margins, a blank row between blocks, each block's height rounded up to whole rows, and headings (two rows tall)
 *  nudged so their letters sit on a row. The dots are drawn where the body text's letters sit. */
export function alignToGrid(page, { pitchMm = 5, dots = true, pageRows = 0 } = {}) {
  const doc = page.ownerDocument, p = pitchPx(pitchMm);
  page.style.setProperty('--hw-pitch', `${p}px`);
  page.style.setProperty('--hw-dots', dots ? `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${p}' height='${p}'><circle cx='${p / 2}' cy='${p / 2}' r='${Math.max(0.55, p * 0.032).toFixed(2)}' fill='#9aa0a6'/></svg>`)}")` : 'none');
  for (const e of page.querySelectorAll('.hw-page-edge')) e.remove();
  // where a line of body text puts its letters: a probe line, its baseline measured with a zero-size inline-block
  const baselineOf = (tag) => { const el = doc.createElement(tag), mark = doc.createElement('span'); mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; el.style.cssText = 'margin:0;padding:0;border:0;position:absolute;visibility:hidden;left:0;top:0;'; el.append('Hg', mark); page.append(el); const b = mark.getBoundingClientRect().top - el.getBoundingClientRect().top; el.remove(); return b; }; // fractional: offsetTop rounds to whole pixels
  const base = baselineOf('p');
  page.style.setProperty('--hw-dx', `${-p / 2}px`);
  page.style.setProperty('--hw-dy', `${base - p / 2}px`); // a dot's centre exactly where the letters sit
  for (const tag of ['h1', 'h2', 'h3']) { // a two-row heading: its letters on the second row
    const b = baselineOf(tag), shift = (base + p) - b;
    for (const h of page.querySelectorAll(`:scope > ${tag}, :scope > * > ${tag}`)) { h.style.position = 'relative'; h.style.top = `${shift}px`; }
  }
  const blocks = [...page.children].filter((el) => !el.classList.contains('hw-page-edge'));
  blocks.forEach((el, i) => {
    el.style.marginTop = '0'; el.style.marginBottom = '0'; el.style.paddingBottom = '0';
    const lineish = (x) => x && (x.classList.contains('jot-task') || x.classList.contains('jot-blanks') || x.classList.contains('jot-measure'));
    const gap = i === 0 || (lineish(el) && lineish(blocks[i - 1])) ? 0 : 1; // a blank row between blocks, none between task lines
    el.style.marginTop = `${gap * p}px`;
    if (el.matches('pre,table,figure,section,img,.jot-chart,.jot-record,blockquote')) el.style.breakInside = 'avoid';
  });
  // round each block up to whole rows (images, charts and tables are not made of lines)
  for (const el of blocks) {
    const h = el.getBoundingClientRect().height, rows = Math.max(1, Math.ceil(h / p - 0.01)), extra = rows * p - h;
    if (extra > 0.01) el.style.paddingBottom = `${extra}px`;
  }
  // whole pages: the last one is dotted to its foot, as a notebook page is; on screen, a dashed line where each printed page ends
  page.style.minHeight = '';
  let rows = Math.round(page.scrollHeight / p);
  if (pageRows > 0) {
    const top = parseFloat(doc.defaultView.getComputedStyle(page).paddingTop) || 0, bottom = parseFloat(doc.defaultView.getComputedStyle(page).paddingBottom) || 0;
    rows = Math.max(1, Math.ceil(Math.round((page.scrollHeight - top - bottom) / p * 100) / 100 / pageRows)) * pageRows; // scrollHeight: the screen preview scrolls
    page.style.boxSizing = 'content-box'; page.style.minHeight = `${rows * p}px`;
    for (let r = pageRows; r < rows; r += pageRows) { const e = doc.createElement('div'); e.className = 'hw-page-edge'; e.setAttribute('aria-hidden', 'true'); e.style.top = `${top + r * p}px`; page.append(e); }
  }
  return { pitch: p, rows, baseline: base };
}

export default { HANDS, INKS, PITCHES, BOX_CSS, BOX_KINDS, TICK_KINDS, boxKinds, boxSVG, squarePath, tickPath, handwrite, alignToGrid, handwritingCSS, pageGeometry, pitchPx, snap, PX_PER_MM };
