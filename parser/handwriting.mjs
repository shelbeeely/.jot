/** Jot handwriting, draft 0.1: a rendered page made to look written by hand, on a dot grid, so it prints like a filled-in notebook.
 * DOM only; used by the page preview (preview.mjs) for the workspace, the template editor and the VS Code extension.
 *
 *   handwrite(page, { hand: 'pen', ink: 'blue', seed: 1 })   letters and words in a handwriting font, each a little different
 *   alignToGrid(page, { pitchMm: 5 })                         every line centred between rows of dots; returns { pitch, rows, baseline }
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

/** Layout comments are optional presentation hints, never executable styles or HTML. */
export const PAPERS = { A5: [148, 210], A4: [210, 297], Letter: [215.9, 279.4], Pocket: [88.9, 139.7] };
export function normalizePageLayout(raw = {}) {
  const x = raw && typeof raw === 'object' ? raw : {};
  const numeric = (v) => typeof v === 'number' || typeof v === 'string' ? Number(v) : NaN;
  const margin = numeric(x.marginMm), pitch = numeric(x.pitchMm);
  return { paper: typeof x.paper === 'string' && Object.hasOwn(PAPERS, x.paper) ? x.paper : 'A5', pitchMm: PITCHES.includes(pitch) ? pitch : 5,
    marginMm: Number.isFinite(margin) ? Math.min(30, Math.max(4, Math.round(margin))) : 8 };
}
export function pageLayoutFromAst(ast) {
  for (const n of ast?.nodes || []) {
    if (n.type !== 'comment') continue;
    const m = /^\/\*\r?\njot-page: (\{[^\n]*\})\r?\n\*\//.exec(n.raw);
    if (m) { try { return normalizePageLayout(JSON.parse(m[1])); } catch { /* ignore malformed hints */ } }
  }
  return null;
}
export function blockLayoutFromComment(raw) {
  const m = /^\/\*\r?\njot-block: (\{[^\n]*\})\r?\n\*\//.exec(raw || '');
  if (!m) return null;
  try {
    const x = JSON.parse(m[1]);
    if (!x || !/^[\w-]{1,40}$/.test(x.id)) return null;
    const bounded = (v, hi, def) => Number.isFinite(Number(v)) ? Math.min(hi, Math.max(0, Math.round(Number(v)))) : def;
    return { id: x.id, rows: bounded(x.rows, 200, 0), gap: bounded(x.gap, 20, 1), newPage: x.newPage === true };
  } catch { return null; }
}

/** The @page box for a printed page of dot grid: the writing area is a whole number of rows and columns, centred on the sheet. */
export function pageGeometry([wMm, hMm], pitchMm = 5, minMarginMm = 8) {
  const p = pitchPx(pitchMm), W = wMm * PX_PER_MM, H = hMm * PX_PER_MM, m = minMarginMm * PX_PER_MM;
  const cols = Math.max(1, Math.floor((W - 2 * m) / p)), rows = Math.max(1, Math.floor((H - 2 * m) / p));
  const mx = snap((W - cols * p) / 2), my = snap((H - rows * p) / 2);
  return { pitch: p, cols, rows, width: cols * p, height: rows * p, marginX: mx, marginY: my, css: `@page { size: ${wMm}mm ${hMm}mm; margin: ${my}px ${mx}px; }` };
}

/** The site and rendered pages share the same paper, ink, fonts and grid stylesheet. */
export function dotGridImage(p) {
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${p}' height='${p}'><circle cx='${p / 2}' cy='${p / 2}' r='${Math.max(0.55, p * 0.032).toFixed(2)}' fill='#87917c' fill-opacity='.55'/></svg>`)}")`;
}
function paperCSS() {
  return `
:root{--jot-paper:#fffdf6;--jot-tag-ink:#8250df;--jot-context-ink:#1a7f37;--jot-back:#ede9df;--jot-ink:${INKS.blue};--jot-muted:#56617a;--jot-edge:#d2cbbc;--jot-accent:#65508f;--jot-accent-ink:#fffdf6;--jot-soft:#eeE8f2;--jot-ink-ratio:100%;--jot-grid:${dotGridImage(pitchPx(5))};--jot-texture:repeating-linear-gradient(0deg,#8d795405 0 1px,transparent 1px 3px)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--jot-paper:#242622;--jot-back:#191c18;--jot-ink:#cbd5eb;--jot-tag-ink:#c2a6fa;--jot-context-ink:#91c9a0;--jot-muted:#aeb9b0;--jot-edge:#505649;--jot-accent:#c3afe7;--jot-accent-ink:#241f2e;--jot-soft:#37323f;--jot-ink-ratio:42%;--jot-texture:repeating-linear-gradient(0deg,#e6dbb704 0 1px,transparent 1px 3px);color-scheme:dark}}
:root[data-theme=dark]{--jot-paper:#242622;--jot-back:#191c18;--jot-ink:#cbd5eb;--jot-tag-ink:#c2a6fa;--jot-context-ink:#91c9a0;--jot-muted:#aeb9b0;--jot-edge:#505649;--jot-accent:#c3afe7;--jot-accent-ink:#241f2e;--jot-soft:#37323f;--jot-ink-ratio:42%;--jot-texture:repeating-linear-gradient(0deg,#e6dbb704 0 1px,transparent 1px 3px);color-scheme:dark}
body.jot-site{--hw-family:'${HANDS.pen.family}';--hw-pitch:${pitchPx(5)}px;--sans:var(--hw-family),cursive;--serif:var(--hw-family),cursive;--mono:var(--hw-family),cursive;--bg:var(--jot-back);--surface:var(--jot-paper);--sunk:var(--jot-back);--ink:var(--jot-ink);--muted:var(--jot-muted);--line:var(--jot-edge);--line-2:var(--jot-edge);--accent:var(--jot-accent);--accent-ink:var(--jot-accent-ink);--accent-soft:var(--jot-soft);--focus:var(--jot-accent);margin:0;color:var(--jot-ink);font:23px/1.5 var(--hw-family),cursive;background-color:var(--jot-back);background-image:var(--jot-grid),var(--jot-texture);background-size:var(--hw-pitch) var(--hw-pitch),3px 3px;color-scheme:light dark}
.jot-site :is(button,input,select,textarea,code,pre){font-family:var(--hw-family),cursive}
.jot-site :is(button,input,select,textarea){color:var(--jot-ink);accent-color:var(--jot-accent)}
.jot-site :is(h1,h2,h3,h4,h5,h6){font-family:var(--hw-family),cursive;letter-spacing:normal;font-weight:700}
.jot-site h1{font-size:clamp(44px,6vw,76px);line-height:1.1}.jot-site h2{font-size:36px;line-height:1.2}.jot-site h3{font-size:28px;line-height:1.25}
.jot-site :is(.lead,.subtitle){font-size:25px;line-height:1.5;color:var(--jot-muted)}
.jot-site :is(header,.top){height:auto;min-height:80px;flex-wrap:wrap;background:var(--jot-paper);border-color:var(--jot-edge)}
.jot-site :is(nav a,nav button,.brand,.privacy,.btn,.button,.quiet){font-family:var(--hw-family),cursive;font-size:21px;min-height:44px}
.jot-site header nav{display:flex;flex-wrap:wrap;min-width:0}
.jot-site :is(#docExt,#saveState,#wordCount,#assetCount,#assetSaveState){font-size:18px;color:var(--jot-muted)}
.jot-site .preview-note,.jot-site .asset-shelf p{font-size:18px;line-height:1.5;color:var(--jot-muted)}
.jot-site .method-card p{font-size:20px;color:var(--jot-ink)}
.jot-site #documentName{font-size:22px}.jot-site #saveState{font-size:18px}.jot-site .studio-bar>div>span{font-size:18px}
.jot-site :is(nav a,.brand){color:var(--jot-ink)}
.jot-site :is(.btn,.button,.icon-btn,select,textarea){background-color:var(--jot-paper);border-color:var(--jot-edge);border-radius:5px 9px 6px 8px}
.jot-site input:not([type=checkbox]):not([type=radio]):not([type=color]){background-color:var(--jot-paper);border-color:var(--jot-edge)}
.jot-site :is(.btn.primary,.button.primary){background:var(--jot-accent);color:var(--jot-accent-ink);border-color:var(--jot-accent)}
.jot-site :is(.studio-workspace,.preview-pane,.settings,.zone,.preview,.diary,dialog,.sample-file,.written-page,.dash-chart,.card,.toc,.asset-shelf){background-color:var(--jot-paper);border-color:var(--jot-edge);box-shadow:1px 2px 0 color-mix(in srgb,var(--jot-edge) 40%,transparent)}
.jot-site :is(.eyebrow,.tab,.pane-title,.pane-tabs button,.paper-tools,.tool-row,.format-tools,.format-tools select,.format-tools button,.writing-footer,.studio-bar,.studio-bar input,.check,.hint,.note,.small,.f-meta,.foot,footer,.resource-links a){font-family:var(--hw-family),cursive;font-size:19px;letter-spacing:normal;color:var(--jot-muted)}
.jot-site :is(.paper-tools select,.paper-tools input,.format-tools input,.format-tools select,.format-tools button){font-size:19px}
.jot-site #writing{font:23px/1.6 var(--hw-family),cursive;color:var(--jot-ink);background:var(--jot-paper);tab-size:2}
.jot-site :is(.jot,.sample-file pre,.guide pre,.guide code){background-color:var(--jot-back);color:var(--jot-ink)}
.jot-site :is(.studio-bar,.pane-tabs,.writing-footer,.format-tools,.tool-row){height:auto;min-height:54px;flex-wrap:wrap;border-color:var(--jot-edge)}
.jot-site :is(.pane-tabs button,.studio-bar input,.paper-tools select){height:auto;min-height:44px}
.jot-site .privacy{white-space:normal}.jot-site .studio-bar>div{min-width:0}.jot-site .studio-bar input{max-width:150px}
.jot-site :is(.jot-record,.method-card,.check-card){background:var(--jot-paper);border-color:var(--jot-edge)}
.jot-site :is(.feature-grid p,.reasons p,.card p,.dash-copy p,.written p,.compare td,.compare th){font-size:22px;color:var(--jot-ink)}
.jot-site .tab span{font-size:17px}.jot-site .sample-file pre{font-size:19px}
.jot-site :is(.table-wrap,.jc-scroll){max-width:100%;overflow:auto}
@media(max-width:600px){.jot-site :is(header,.top){padding:12px 16px;gap:10px}.jot-site nav{flex-wrap:wrap;gap:8px;flex-basis:100%}.jot-site nav a{padding:6px 8px}.jot-site :is(.format-tools,.paper-tools){gap:10px}.jot-site .format-tools label{flex-wrap:wrap;max-width:100%}.jot-site select{max-width:100%}.jot-site .pane-tabs{gap:12px}.jot-site .pane-tabs button{font-size:18px}}
@media print{:root:not([data-theme]),:root[data-theme]{--jot-paper:#fff;--jot-tag-ink:#8250df;--jot-context-ink:#1a7f37;--jot-ink-ratio:100%;--jot-texture:none}.jot-site{background:none}}
`;
}

/** The fonts and the look. fontBase: the URL of the fonts folder (ends with /). */
export function handwritingCSS(fontBase) {
  const face = (h) => [['latin', LATIN], ['latin-ext', LATIN_EXT]].flatMap(([sub, range]) => [400, 700].map((w) => `@font-face{font-family:'${h.family}';font-style:normal;font-weight:${w};font-display:block;src:url('${fontBase}${h.file}-${sub}-${w}-normal.woff2') format('woff2');unicode-range:${range}}`)).join('\n');
  return `${Object.values(HANDS).map(face).join('\n')}
${paperCSS()}
.jot-hand{position:relative;--hw-pitch:18.890625px;--hw-ink:${INKS.blue};--hw-dot:#9aa0a6;--hw-size:1;color:var(--hw-ink);font-family:var(--hw-family),cursive;font-size:calc(var(--hw-pitch)*var(--hw-size));line-height:var(--hw-pitch);font-weight:400;font-kerning:normal;
  background-color:var(--jot-paper,#fffffd);background-image:var(--hw-dots),var(--jot-texture);background-size:var(--hw-pitch) var(--hw-pitch),3px 3px;background-position:var(--hw-dx,0) var(--hw-dy,0),0 0;background-origin:content-box,border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.jot-hand *{line-height:inherit;margin-top:0;margin-bottom:0}
.jot-hand :is(h1,h2,h3,h4,h5,h6,p,ul,ol,li,blockquote,pre,table,figure,dl,dd,dt,section,div,hr){font-family:inherit;font-weight:inherit;color:inherit;letter-spacing:normal}
.jot-hand :is(h1,h2){font-size:1.7em;line-height:calc(var(--hw-pitch)*2);font-weight:700}
.jot-hand h3{font-size:1.35em;line-height:calc(var(--hw-pitch)*2);font-weight:700}
.jot-hand :is(h4,h5,h6){font-size:1em;font-weight:700}
.jot-hand :is(strong,b){font-weight:700}
.jot-hand :is(code,pre,kbd){font-family:inherit;font-size:1em;background:none;padding:0;border:0}
.jot-hand pre{white-space:pre-wrap}
.jot-hand :is(ul,ol){padding-left:calc(var(--hw-pitch)*1.5)}
.jot-hand blockquote{padding-left:calc(var(--hw-pitch) - 2px);border-left:2px solid color-mix(in srgb,currentColor 45%,transparent);box-shadow:none;font-style:normal}
.jot-hand hr{border:0;height:var(--hw-pitch);background:linear-gradient(transparent calc(50% - 1px),color-mix(in srgb,currentColor 60%,transparent) calc(50% - 1px),color-mix(in srgb,currentColor 60%,transparent) calc(50% + 1px),transparent calc(50% + 1px))}
.jot-hand table{border-collapse:collapse;border:0;--hw-rule:color-mix(in srgb,currentColor 45%,transparent)}.jot-hand :is(th,td){padding:0 .4em;border:0;box-shadow:none;height:auto;font-weight:inherit;background:linear-gradient(var(--hw-rule),var(--hw-rule)) right/1px 100% no-repeat,linear-gradient(var(--hw-rule),var(--hw-rule)) bottom/100% 1px no-repeat}
.jot-hand th{font-weight:700}
.jot-hand a{color:inherit;text-decoration:underline}
.jot-hand img{display:block;max-width:100%}
.jot-hand .hw-w{display:inline-block;transform:translateY(calc(var(--hw-text-shift,0px) + var(--y,0em))) rotate(var(--r,0deg)) skewX(var(--k,0deg));transform-origin:50% 80%;opacity:var(--o,1);white-space:pre}
.jot-hand .hw-c{position:relative;top:var(--cy,0)}
.jot-hand em,.jot-hand i,.jot-hand cite{font-style:normal;--k:-9deg}
.jot-hand :is(ins,u),.jot-hand :is(ins,u) .hw-w{text-decoration:underline;text-decoration-thickness:.08em;text-underline-offset:.18em}
.jot-hand :is(del,s),.jot-hand :is(del,s) .hw-w{text-decoration:line-through;text-decoration-thickness:.08em}
.jot-hand mark{color:inherit;background:linear-gradient(176deg,transparent 18%,rgba(255,226,64,.62) 20%,rgba(255,214,40,.55) 78%,transparent 82%);box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:0 .1em}
.jot-hand .jot-highlight{background:linear-gradient(176deg,transparent 18%,var(--jot-highlight) 20%,var(--jot-highlight) 78%,transparent 82%);box-decoration-break:clone;-webkit-box-decoration-break:clone}
.jot-hand .jot-colors :is(del,ins){text-decoration:none}
.jot-hand .jot-colors .hw-w{text-decoration:none;background-image:linear-gradient(var(--jot-strike,transparent),var(--jot-strike,transparent)),linear-gradient(var(--jot-underline,transparent),var(--jot-underline,transparent));background-size:100% .08em;background-position:0 55%,0 90%;background-repeat:no-repeat}
.jot-hand sup{font-size:.72em;vertical-align:baseline;position:relative;top:-.55em;line-height:0}
.jot-hand :is(.jot-task,.jot-blank-line,.jot-measure,.jot-record,.jot-record strong,.jot-record dt,.jot-record dd,.jot-chart,.jot-callout,.jot-callout-title,.jot-footnotes,.eyebrow,p,li,td,th,blockquote,figcaption,.jc-sum,.jc-name,.jc-unit,.jc-anchors){font-family:inherit;font-size:inherit;color:inherit;letter-spacing:normal;text-transform:none}
.jot-hand :is(h1,h2,h3,h4,h5,h6){letter-spacing:normal;text-transform:none}
.jot-hand :is(.jot-task,.jot-record,.jot-measure,.jot-blanks,.jot-blank-line,.jot-footnotes,.jot-callout,dl,figure,figcaption,details){padding-top:0;padding-bottom:0;margin:0;border-top:0;border-bottom:0;border-radius:0}
.jot-hand .hw-box{width:.78em;height:.78em;margin-right:.3em;vertical-align:-.08em}
.jot-hand .jot-task{display:flex;align-items:baseline;gap:0;min-height:var(--hw-pitch)}
.jot-hand .jot-sign{display:block}
.jot-hand .jot-box{display:block;flex:0 0 var(--hw-pitch);width:var(--hw-pitch);text-align:center}
.jot-hand .jot-sym{display:inline-block;width:var(--hw-pitch);text-align:center}
.jot-hand .jot-task-text{flex:1;min-width:0}
.jot-hand .jot-task>.hw-box{flex:none;align-self:flex-start;width:calc(var(--hw-pitch)*.78);height:calc(var(--hw-pitch)*.78);margin:calc(var(--hw-pitch)*.11) calc(var(--hw-pitch)*.11) 0}
.jot-hand .jot-blank-line{gap:0;min-height:var(--hw-pitch);align-items:baseline}
.jot-hand .jot-mark{display:inline-flex;justify-content:center;flex:0 0 var(--hw-pitch);min-width:var(--hw-pitch);height:var(--hw-pitch)}
.jot-hand .hw-check-mark{align-items:flex-start}
.jot-hand .hw-check-mark .hw-box{width:calc(var(--hw-pitch)*.78);height:calc(var(--hw-pitch)*.78);margin:calc(var(--hw-pitch)*.11) 0 0}
.jot-hand .jot-record,.jot-hand .jot-callout{border:0;border-left:2px solid color-mix(in srgb,currentColor 35%,transparent);background:none;padding:0 0 0 calc(var(--hw-pitch) - 2px);box-shadow:none}
.jot-hand .jot-record strong{text-transform:none;letter-spacing:0;font-size:1em}
.jot-hand .jot-record dl{display:block}.jot-hand .jot-record dt{display:inline;font-weight:700}.jot-hand .jot-record dt::after{content:': '}.jot-hand .jot-record dd{display:inline;margin:0}.jot-hand .jot-record dd::after{content:'';display:block}
.jot-hand .jot-chart{font:inherit;border:0;background:transparent;padding:0;margin:0;--jc-surface:transparent;--jc-grid:transparent;--jc-ink:var(--hw-ink);--jc-muted:var(--hw-ink);--jc-series:var(--hw-ink)}
.jot-hand .jc-canvas{height:calc(var(--hw-pitch)*7)}
.jot-hand .jot-chart-table{display:none}
.jot-hand .jot-footnotes{border-top:0;font-size:.9em}
.jot-hand .diagram-note,.jot-hand .raw-html{opacity:.6}
.jot-hand .jot-layout-block{position:relative;display:flow-root;box-sizing:border-box;break-inside:auto}
.jot-hand .jot-layout-block>*{box-sizing:border-box}
.jot-hand .hw-page-edge{position:absolute;left:0;right:0;height:0;border-top:1px dashed #c7a7ff;pointer-events:none}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .jot-hand{color:color-mix(in srgb,var(--hw-ink) var(--jot-ink-ratio),#e1e5fa)}:root:not([data-theme=light]) .jot-hand .jot-colors[data-ink]{color:color-mix(in srgb,var(--jot-source-ink) var(--jot-ink-ratio),#e1e5fa)!important}}
:root[data-theme=dark] .jot-hand{color:color-mix(in srgb,var(--hw-ink) var(--jot-ink-ratio),#e1e5fa)}
:root[data-theme=dark] .jot-hand .jot-colors[data-ink]{color:color-mix(in srgb,var(--jot-source-ink) var(--jot-ink-ratio),#e1e5fa)!important}

@media print{.jot-hand{color:var(--hw-ink)!important}.jot-hand .hw-page-edge{display:none}.jot-hand .jot-colors[data-ink]{color:var(--jot-source-ink)!important}}
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

/** A locally generated ink stroke; stable for a seed and different for each highlighted passage. */
export function highlightSVG(color = '#fddd13', style = 'marker', seed = 1) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) color = '#fddd13';
  if (!['marker','brush','pencil'].includes(style)) style = 'marker';
  const random = rng(seed), n = (base, spread) => (base + (random() - .5) * spread).toFixed(1);
  const band = (top, bottom, opacity) => {
    const upper = Array.from({length:9}, (_, i) => `${n(i*125, i===0||i===8 ? 12 : 24)},${n(top,10)}`);
    const lower = Array.from({length:9}, (_, i) => `${n((8-i)*125, i===0||i===8 ? 12 : 24)},${n(bottom,10)}`);
    return `<polygon points="${upper.concat(lower).join(' ')}" fill="${color}" opacity="${opacity}"/>`;
  };
  let strokes;
  if (style === 'pencil') {
    strokes = Array.from({length:9}, (_, i) => `<path d="M${n(8,18)},${n(25+i*6,8)} Q${n(480,80)},${n(18+i*6,10)} ${n(990,18)},${n(25+i*6,10)}" fill="none" stroke="${color}" stroke-width="${n(2.4,1)}" opacity="${n(.6,.2)}" stroke-linecap="round"/>`).join('');
  } else if (style === 'brush') strokes = band(27,65,.38) + band(38,79,.48) + band(31,73,.24);
  else strokes = band(24,77,.65) + band(31,73,.12);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" preserveAspectRatio="none">${strokes}</svg>`;
}

/** A translucent stroke is painted above ink with multiply blending, rather than only behind it.
 * Each word owns its overlay so wrapping, selection and print pagination remain native text layout. */
export function paintHighlights(page, { seed = 1 } = {}) {
  const doc = page.ownerDocument;
  let index = 0;
  for (const mark of page.querySelectorAll('mark, .jot-highlight')) {
    const color = doc.defaultView.getComputedStyle(mark).getPropertyValue('--jot-highlight').trim() || '#fddd13';
    const svg = highlightSVG(color, mark.dataset.highlightStyle || 'marker', hash(mark.textContent, seed + index++ * 7919));
    const image = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    mark.style.setProperty('--jot-highlight-stroke', image);
    // Keep the seed image as metadata; fragments paint it above ink without masking the paper or grid beneath.
    mark.classList.add('jot-highlighter-active');
    mark.style.backgroundColor = 'transparent'; mark.style.backgroundImage = image;
    const walker = doc.createTreeWalker(mark, 4), nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeValue && !n.parentElement.closest('.hw-w,.jot-highlight-word,.jot-highlight-space,script,style,svg')) nodes.push(n);
    }
    for (const node of nodes) {
      const fragment = doc.createDocumentFragment();
      for (const part of node.nodeValue.split(/(\s+)/)) {
        if (!part) continue;
        const span = doc.createElement('span');
        span.className = /^\s+$/.test(part) ? 'jot-highlight-space' : 'jot-highlight-word';
        span.textContent = part; fragment.append(span);
      }
      node.replaceWith(fragment);
    }
    for (const word of mark.querySelectorAll('.hw-w')) word.classList.add('jot-highlight-word');
  }
}

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
  for (const mark of page.querySelectorAll('.jot-mark')) {
    if (!['☐', '☑'].includes(mark.textContent.trim())) continue;
    const done = mark.textContent.trim() === '☑'; mark.classList.add('hw-check-mark'); mark.replaceChildren(pencil(done));
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
  paintHighlights(page, { seed });
  return page;
}

/** Puts every line of the page on a row of the dot grid. The page must be in the document (it is measured) with its fonts loaded.
 *  Block by block: no margins, a blank row between blocks, each block's height rounded up to whole rows, and headings (two rows tall)
 *  centred within their line boxes. Dots mark cell boundaries; checkboxes occupy the first cell. */
export function alignToGrid(page, { pitchMm = 5, dots = true, pageRows = 0 } = {}) {
  const doc = page.ownerDocument, p = pitchPx(pitchMm);
  page.style.setProperty('--hw-pitch', `${p}px`);
  page.style.setProperty('--hw-dots', dots ? dotGridImage(p) : 'none');
  for (const e of page.querySelectorAll('.hw-page-edge')) e.remove();
  // Measure the font's visible ink, rather than centring its em box (the handwriting fonts have different ascenders).
  const canvas = doc.createElement('canvas'), context = canvas.getContext('2d');
  const metricsOf = (tag) => {
    const probe = doc.createElement(tag), mark = doc.createElement('span');
    mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    probe.style.cssText = 'margin:0;padding:0;border:0;position:absolute;visibility:hidden;left:0;top:0;';
    probe.append('Hx', mark); page.append(probe);
    const baseline = mark.getBoundingClientRect().top - probe.getBoundingClientRect().top;
    const style = doc.defaultView.getComputedStyle(probe);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ink = context.measureText('Hx');
    const ascent = ink.actualBoundingBoxAscent, descent = ink.actualBoundingBoxDescent;
    const shift = snap(parseFloat(style.lineHeight) / 2 - baseline + (ascent - descent) / 2);
    probe.remove(); return { baseline, shift };
  };
  const body = metricsOf('p'), base = body.baseline;
  page.style.setProperty('--hw-text-shift', `${body.shift}px`);
  page.style.setProperty('--hw-dx', `${-p / 2}px`);
  page.style.setProperty('--hw-dy', `${-p / 2}px`); // dots at the cell boundaries, text in the space between them
  for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    const { shift } = metricsOf(tag);
    for (const h of page.querySelectorAll(tag)) { h.style.top = ''; h.style.setProperty('--hw-text-shift', `${shift}px`); }
  }
  const groups = [...page.querySelectorAll(':scope > .jot-layout-block')];
  for (const group of groups) {
    group.style.minHeight = ''; group.style.paddingBottom = '0';
    group.style.breakBefore = group.dataset.newPage === 'true' ? 'page' : 'auto';
  }
  function alignBlocks(blocks) {
    blocks.forEach((el, i) => {
      el.style.marginTop = '0'; el.style.marginBottom = '0'; el.style.paddingBottom = '0';
      const lineish = (x) => x && (x.classList.contains('jot-task') || x.classList.contains('jot-blanks') || x.classList.contains('jot-measure'));
      const previous = blocks[i - 1];
      const gap = i === 0 ? 0 : previous?.classList.contains('jot-layout-block') ? Number(previous.dataset.gap) : (lineish(el) && lineish(previous)) ? 0 : 1;
      el.style.marginTop = `${gap * p}px`;
      if (!el.classList.contains('jot-layout-block') && el.matches('pre,table,figure,section,img,.jot-chart,.jot-record,blockquote')) el.style.breakInside = 'avoid';
    });
    for (const el of blocks) {
      const h = el.getBoundingClientRect().height, rows = Math.max(1, Math.ceil(h / p - 0.01)), extra = rows * p - h;
      if (extra > 0.01) el.style.paddingBottom = `${extra}px`;
    }
  }
  for (const group of groups) {
    alignBlocks([...group.children]);
    const natural = Math.max(1, Math.ceil(group.getBoundingClientRect().height / p - .01));
    group.dataset.naturalRows = String(natural);
    group.style.minHeight = `${Math.max(natural, Number(group.dataset.minRows)) * p}px`;
  }
  const blocks = [...page.children].filter((el) => !el.classList.contains('hw-page-edge'));
  alignBlocks(blocks);
  // Screen and print use the same blank space for page starts. Oversized blocks flow over page boundaries.
  let cursor = 0;
  for (const el of blocks) {
    let gap = Math.round(parseFloat(el.style.marginTop) / p) || 0;
    const heightRows = Math.max(1, Math.round(el.getBoundingClientRect().height / p));
    let start = cursor + gap;
    if (pageRows > 0 && el.classList.contains('jot-layout-block')) {
      const forced = el.dataset.newPage === 'true';
      const remain = pageRows - (start % pageRows);
      if (forced) {
        start = Math.ceil(cursor / pageRows) * pageRows; gap = start - cursor;
      } else if (heightRows <= pageRows && heightRows > remain) {
        start += remain; gap = start - cursor;
      }
      // Space in normal flow makes the preview, print and standalone HTML agree.
      el.style.breakBefore = 'auto';
    }
    el.style.marginTop = `${gap * p}px`;
    el.dataset.startRow = String(start);
    el.dataset.usedRows = String(heightRows);
    cursor = start + heightRows;
  }
  // whole pages: the last one is dotted to its foot, as a notebook page is; on screen, a dashed line where each printed page ends
  page.style.minHeight = '';
  let rows = cursor;
  if (pageRows > 0) {
    const top = parseFloat(doc.defaultView.getComputedStyle(page).paddingTop) || 0;
    rows = Math.max(1, Math.ceil(cursor / pageRows)) * pageRows;
    page.style.boxSizing = 'content-box'; page.style.minHeight = `${rows * p}px`;
    for (let r = pageRows; r < rows; r += pageRows) { const e = doc.createElement('div'); e.className = 'hw-page-edge'; e.setAttribute('aria-hidden', 'true'); e.style.top = `${top + r * p}px`; page.append(e); }
  }
  return { pitch: p, rows, baseline: base };
}

export default { HANDS, INKS, PITCHES, BOX_CSS, BOX_KINDS, TICK_KINDS, boxKinds, boxSVG, squarePath, tickPath, handwrite, alignToGrid, handwritingCSS, pageGeometry, pitchPx, snap, PX_PER_MM };
