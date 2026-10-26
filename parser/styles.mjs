/** Jot page styles, draft 0.1: how a typed journal looks on screen, on paper and in an exported page. Pure (strings only), so the
 * workspace, the VS Code preview and the exported HTML all use the very same rules.
 *
 *   STYLES                              the styles: journal, notes, plain
 *   styleCSS()                          every style's rules (add once); a page takes one with class="jot-style-<id>"
 *   pageCSS(style, [wMm, hMm])          the @page box for printing: the paper, its margins and (journal, notes) page numbers
 *
 * Fonts are the reader's own (system font stacks), so a page and its export stay small and never fetch anything; each stack names
 * the good book and interface faces that ship with Windows, macOS, iOS, Android and Linux before the generic family.
 */

export const STYLES = {
  journal: { name: 'Journal', blurb: 'A book page: a classic serif, dates in small capitals, a drop cap to open each day, margin notes beside the text.' },
  notes: { name: 'Notes', blurb: 'Clean and modern: a sans serif, dates as a bar, tags as chips, compact lists and tables.' },
  plain: { name: 'Plain', blurb: 'Simple and quiet, as Jot has always looked.' },
};
const SERIF = `'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua','URW Palladio L',P052,Charter,'Bitstream Charter',Georgia,serif`;
const SANS = `Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue','Noto Sans',Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace`;

// Each style's rules are written for ".S" and scoped below to a doubled class, so they win over a page's own typed styles.
const JOURNAL = `.S{--ink:#2b2622;--muted:#776b5f;--accent:#8a3b12;--rule:#ddd2c4;--paper:#fffdf8;--mark:#f6dd8a;color:var(--ink);background:var(--paper);background-image:none;font:17px/1.72 ${SERIF};font-variant-numeric:oldstyle-nums proportional-nums;font-kerning:normal;hyphens:auto;-webkit-hyphens:auto;text-rendering:optimizeLegibility;overflow-wrap:break-word;padding:2.4em 2.6em}
.S::after{content:'';display:table;clear:both}
.S>*:first-child{margin-top:0}
.S p{margin:0 0 .85em}
.S h1{font-size:2.15em;font-weight:400;line-height:1.15;letter-spacing:-.01em;text-align:center;margin:.2em 0 1.1em;font-variant-numeric:lining-nums}
.S h1::after{content:'❦';display:block;font-size:.42em;color:var(--accent);margin-top:.45em;letter-spacing:0}
.S h2{font-size:1.45em;font-weight:400;font-style:italic;line-height:1.25;margin:1.6em 0 .55em}
.S h3{font-size:1.15em;font-weight:600;margin:1.4em 0 .4em}
.S h4,.S h5,.S h6{font-size:1em;font-weight:600;font-style:italic;margin:1.2em 0 .3em}
.S .jot-date{font-size:.8em;font-weight:600;font-style:normal;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);border-top:1px solid var(--rule);padding-top:1.15em;margin:2.3em 0 .9em;font-variant-numeric:lining-nums}
.S>.jot-date:first-child{border-top:0;padding-top:0}
.S .jot-date-note{letter-spacing:.06em;text-transform:none;font-style:italic;font-weight:400;color:var(--muted);font-size:1.05em}
.S .jot-date+p:not(.jot-scene)::first-letter,.S .jot-date+.jot-scene+p::first-letter{float:left;font-size:3.35em;line-height:.82;margin:.06em .09em 0 0;color:var(--accent);font-weight:400}
.S a{color:var(--accent);text-decoration-thickness:.06em;text-underline-offset:.15em}
.S strong{font-weight:650}
.S mark{background:linear-gradient(transparent 52%,var(--mark) 52%,var(--mark) 92%,transparent 92%);padding:0 .08em}
.S blockquote{margin:1.2em 1.6em;padding:0;border:0;font-style:italic;color:var(--muted)}
.S blockquote::before{content:'“';float:left;font-size:2.4em;line-height:.8;margin:-.05em .1em 0 -.55em;color:var(--rule)}
.S ul,.S ol{padding-left:1.4em;margin:0 0 .85em}.S li{margin:.15em 0}.S li::marker{color:var(--accent)}
.S hr{border:0;height:auto;margin:1.6em 0;text-align:center;background:none}.S hr::before{content:'⁂';color:var(--accent);letter-spacing:.3em}
.S code{font:.86em ${MONO};background:#f3ede3;padding:.05em .3em;border-radius:3px}.S pre{font:.82em/1.5 ${MONO};background:#f6f1e8;padding:.9em 1em;border-radius:4px;overflow-x:auto}
.S table{width:100%;border-collapse:collapse;margin:.6em 0 1.1em;font-size:.9em;font-variant-numeric:lining-nums tabular-nums}.S th{text-align:left;font-weight:600;border-bottom:1.5px solid var(--ink);padding:.3em .6em .3em 0}.S td{border-bottom:1px solid var(--rule);padding:.3em .6em .3em 0}.S thead th{border-bottom:1.5px solid var(--ink)}
.S .jot-task{margin:.2em 0}.S .jot-box{color:var(--accent)}
.S .jot-sign .jot-sym{color:var(--accent);opacity:1;font-weight:400}.S .jot-question{font-style:italic}
.S .jot-scene{font:600 .74em/1.4 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:1.4em 0 .5em}
.S .jot-margin{float:right;clear:right;width:32%;margin:.2em -1.2em .6em 1.4em;padding:0 0 0 .8em;border-left:1px solid var(--rule);font-size:.8em;line-height:1.5;color:var(--muted);opacity:1}
.S .jot-tag,.S .jot-context{color:var(--accent);font-style:italic}
.S .jot-record{background:none;border:0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);border-radius:0;padding:.6em 0;margin:1em 0}.S .jot-record strong{font:600 .72em ${SANS};letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.S .jot-record dl{font:inherit;font-size:.92em;display:grid;grid-template-columns:max-content 1fr;gap:.1em 1em;margin:.3em 0 0}.S .jot-record dt{font-style:italic;color:var(--muted);font-weight:400}.S .jot-record dd{margin:0}
.S .jot-measure{border:0;padding:0;margin:.3em 0}.S .jot-measure strong{font:inherit;font-style:italic;letter-spacing:0;text-transform:none;color:var(--muted)}
.S .jot-callout{background:none;border-left:2px solid var(--jot-callout);padding:.1em 0 .1em 1em}
.S .jot-footnotes{border-top:0;font-size:.84em;color:var(--muted);margin-top:2.4em}.S .jot-footnotes::before{content:'';display:block;width:5em;border-top:1px solid var(--rule);margin-bottom:.8em}
.S .jot-chart{--jc-surface:transparent;--jc-grid:var(--rule);--jc-series:var(--accent);--jc-muted:var(--muted);--jc-ink:var(--ink);border:0;padding:0;background:none;font-family:${SANS}}
.S img{max-width:100%;height:auto;border-radius:2px}`;

const NOTES = `.S{--ink:#1f2328;--muted:#5d6670;--accent:#0b6bcb;--rule:#e3e6ea;--soft:#f4f6f8;--paper:#ffffff;--mark:#fff3a3;color:var(--ink);background:var(--paper);background-image:none;font:15.5px/1.62 ${SANS};font-feature-settings:'cv11','ss01';overflow-wrap:break-word;padding:2em 2.2em}
.S>*:first-child{margin-top:0}
.S p{margin:0 0 .7em}
.S h1{font-size:1.85em;font-weight:700;letter-spacing:-.02em;line-height:1.2;margin:.2em 0 .8em;padding-bottom:.35em;border-bottom:1px solid var(--rule)}
.S h2{font-size:1.35em;font-weight:700;letter-spacing:-.01em;margin:1.5em 0 .5em}
.S h3{font-size:1.1em;font-weight:650;margin:1.3em 0 .4em}
.S h4,.S h5,.S h6{font-size:.8em;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:1.3em 0 .35em}
.S .jot-date{font-size:1.02em;font-weight:700;letter-spacing:0;text-transform:none;color:var(--ink);margin:1.8em 0 .7em;padding:.45em .8em;background:var(--soft);border-left:3px solid var(--accent);border-radius:0 6px 6px 0}
.S .jot-date-note{color:var(--muted);font-weight:500;font-size:.85em}
.S a{color:var(--accent);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--accent) 35%,transparent)}
.S strong{font-weight:650}
.S mark{background:var(--mark);border-radius:3px;padding:.02em .2em}
.S blockquote{margin:.8em 0;padding:.2em 0 .2em 1em;border-left:3px solid var(--rule);color:var(--muted)}
.S ul,.S ol{padding-left:1.35em;margin:0 0 .7em}.S li{margin:.12em 0}.S li::marker{color:var(--muted)}
.S hr{border:0;border-top:1px solid var(--rule);margin:1.4em 0;background:none}
.S code{font:.86em ${MONO};background:var(--soft);padding:.1em .35em;border-radius:4px}.S pre{font:.82em/1.5 ${MONO};background:var(--soft);padding:.8em 1em;border-radius:8px;overflow-x:auto}
.S table{width:100%;border-collapse:separate;border-spacing:0;margin:.5em 0 1em;font-size:.92em;border:1px solid var(--rule);border-radius:8px;overflow:hidden;font-variant-numeric:tabular-nums}.S th{text-align:left;background:var(--soft);font-weight:650;padding:.45em .7em;border-bottom:1px solid var(--rule)}.S td{padding:.4em .7em;border-bottom:1px solid var(--rule)}.S tr:last-child td{border-bottom:0}
.S .jot-task{margin:.18em 0}.S .jot-box{display:inline-block;box-sizing:border-box;width:1.05em;height:1.05em;line-height:1;border:1.6px solid #9aa4ae;border-radius:4px;color:transparent;overflow:hidden;position:relative;top:.16em}
.S .jot-task-completed .jot-box{background:var(--accent);border-color:var(--accent)}.S .jot-task-completed .jot-box::after{content:'';position:absolute;left:.3em;top:.1em;width:.25em;height:.5em;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.S .jot-task-migrated .jot-box,.S .jot-task-scheduled .jot-box,.S .jot-task-cancelled .jot-box{border-color:transparent;color:var(--muted);text-align:center;top:0}
.S .jot-task-completed .jot-task-text{text-decoration:line-through;text-decoration-color:color-mix(in srgb,var(--ink) 35%,transparent)}
.S .jot-sign .jot-sym{color:var(--accent);opacity:1}
.S .jot-scene{font:700 .72em/1.4 ${SANS};letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin:1.2em 0 .4em}
.S .jot-margin{font-style:normal;font-size:.86em;background:var(--soft);border:0;border-radius:6px;padding:.45em .7em;color:var(--muted);opacity:1}
.S .jot-tag,.S .jot-context{display:inline-block;font-size:.82em;line-height:1.5;padding:0 .5em;border-radius:999px;vertical-align:.06em}.S .jot-tag{background:#efe8fd;color:#6639ba}.S .jot-context{background:#e4f4e8;color:#1a6b34}
.S .jot-record{background:var(--soft);border:0;border-radius:8px;padding:.6em .9em;margin:.8em 0}.S .jot-record strong{font:700 .7em ${SANS};letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.S .jot-record dl{font:inherit;font-size:.92em;display:grid;grid-template-columns:max-content 1fr;gap:.1em 1em;margin:.3em 0 0}.S .jot-record dt{color:var(--muted);font-weight:500}.S .jot-record dd{margin:0}
.S .jot-measure{display:inline-flex;gap:.4em;padding:.25em .7em;margin:.2em .3em .2em 0;border-radius:999px}.S .jot-measure strong{font:inherit;font-weight:500;letter-spacing:0;text-transform:none;color:var(--muted)}
.S .jot-callout{border-radius:0 8px 8px 0}
.S .jot-footnotes{border-top:1px solid var(--rule);font-size:.85em;color:var(--muted)}
.S .jot-chart{--jc-surface:var(--paper);--jc-grid:var(--rule);--jc-series:var(--accent);border-color:var(--rule)}
.S img{max-width:100%;height:auto;border-radius:8px}`;

const PLAIN = `.S{--ink:#37422e;color:var(--ink);font:15px/1.8 Georgia,'Times New Roman',serif;overflow-wrap:break-word}
.S .jot-date{font-weight:400}.S .jot-tag,.S .jot-context{font-style:italic}`;

// Printed (and exported, then printed): paper-friendly sizes and breaks, no backgrounds the printer would waste ink on.
const PRINT = `@media print{.S{font-size:10.5pt;padding:0;background:none;box-shadow:none;max-height:none;overflow:visible}.S .jot-date,.S h1,.S h2,.S h3{break-after:avoid}.S .jot-record,.S .jot-chart,.S table,.S pre,.S figure,.S img,.S blockquote,.S .jot-callout{break-inside:avoid}.S p{orphans:2;widows:2}.S .pagebreak{break-after:page}}`;

// What every style resets from a host page's own typed rules (the workspace's, the site's): headings in the style's face, tasks,
// signs and records in the body's size, tables without the host's boxes.
const BASE = `.S :is(h1,h2,h3,h4,h5,h6){font-family:inherit}.S :is(.jot-task,.jot-sign,.jot-blank-line){font:inherit;line-height:inherit;padding:0}
.S :is(th,td){border:0;height:auto}.S table{border:0}`;
const scope = (css, id) => css.replace(/\.S\b/g, `.jot-style-${id}.jot-style-${id}`);
/** Every style's rules, scoped: a page shows one by carrying class="jot-style-<id>". */
export function styleCSS() {
  return [['journal', JOURNAL], ['notes', NOTES], ['plain', PLAIN]].map(([id, css]) => scope(`${id === 'plain' ? '' : BASE}\n${css}\n${PRINT}`, id)).join('\n');
}
/** The @page rules for printing in a style: the paper size, book-like margins, and page numbers at the foot (not for plain). */
export function pageCSS(style = 'journal', [wMm, hMm] = [148, 210]) {
  const small = Math.min(wMm, hMm) < 120, m = small ? [12, 11, 15, 11] : style === 'journal' ? [20, 18, 24, 18] : [16, 16, 20, 16];
  const number = style === 'plain' ? '' : ` @bottom-center { content: counter(page); font: 9pt ${style === 'journal' ? SERIF : SANS}; color: #8a8a8a; }`;
  return `@page { size: ${wMm}mm ${hMm}mm; margin: ${m[0]}mm ${m[1]}mm ${m[2]}mm ${m[3]}mm;${number} }`;
}
export const isStyle = (id) => Object.prototype.hasOwnProperty.call(STYLES, id);

export default { STYLES, styleCSS, pageCSS, isStyle };
