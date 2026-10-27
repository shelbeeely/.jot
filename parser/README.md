# Jot JavaScript parser

The format is **Jot v1**: plain UTF-8 writing in a `.jot` file, or, when a journal has images, scans or strokes, one self-contained ZIP-based `.jotz` package whose writing is `journal.txt` and whose assets are under `assets/`. The parser implementation version is independently 0.1.0. A file can contain one moment, a day, a month or an ongoing journal. The source parser handles the writing itself; `container.mjs` reads/writes the complete document. The web scanner is a separate app; scanning images does not parse handwriting into text.

This is a working **prototype**, version 0.1.0, with a source-preserving block AST and Markdown tokens. It is not a claim of complete conformance with every rule/profile of the larger draft specification.

## Run in Node or a browser

```javascript
import { parse, stringify } from './jot.mjs';

const text = '# October\n\n### 2026-10-25\n\nA **good** small start.\n';
const journal = parse(text);
console.log(journal.entries);
console.log(journal.nodes);
console.log(journal.diagnostics);
console.assert(stringify(journal) === text);
```

For a browser, use the same import from a `<script type="module">` on HTTP(S), with the `vendor/` directory beside `jot.mjs`. For Node, run `node --test test.mjs` (tested on Node 24). The package is self-contained and does not fetch dependencies at runtime.

## Markdown support and conflicts

Markdown parsing uses vendored Marked 17.0.5, with GFM enabled: headings, paragraphs, nested ordered/unordered lists, task lists, links/images, emphasis, blockquotes, fenced/indented code, tables and strikethrough. Raw HTML is retained as tokens, not rendered or executed. A future HTML renderer must disable raw HTML or sanitize its output with a maintained sanitizer; do not insert untrusted generated HTML directly into the DOM.

Use `parse(text, {journal:false})` for ordinary Markdown without journal extensions. In Jot mode, optional records, presentation directives, bare task markers, idea/question/event markers, explicit voice cues and scenes are recognized outside fenced/indented code. `- note` follows Markdown list syntax rather than creating a separate note-node type. `- [x] task` is a Markdown task-list item; `[x] task` is a Jot task node. Underscores follow Markdown emphasis rules, not the previous draft's underline meaning. `~~text~~` is GFM strikethrough; `~text~` remains text. Setext headings take precedence over `===` immediately under writing. A standalone `===` after a blank line is a Jot page break.

This package's `README.md` and tests are the implementation contract for version 0.1; the larger specification describes a broader design. It does not claim full CommonMark/GFM test-suite certification, and Jot extension boundaries may differ from plain Markdown. Named styles do not require magic section names.

## Mermaid and other diagrams

Use a Markdown fenced code block with one of these language names: `mermaid`, `dot`/`graphviz`, `plantuml`/`puml`, `d2`, `vega` or `vega-lite`/`vegalite`. The code node gains `diagram: {engine, language, source}`. Vega/Vega-Lite additionally expose `config` for valid JSON objects. Invalid JSON is diagnosed and preserved. Extend recognition with `parse(text, {diagramLanguages: {'my-chart':'custom-engine'}})`.

Diagram rendering is separate. This package does not include those engines, validate their grammars, or send source to a remote service. An editor can provide local rendering adapters or show the preserved code. Adapters must restrict external resources and sanitize SVG/HTML. Unknown fenced languages remain ordinary code. Links, renderer directives and chart data URLs are not fetched by this parser.

## Charts and the page preview

`charts.mjs` reads the numbers a journal holds (`measurement` records, and plain-number fields of any other record) and draws the
charts that `:::record chart` asks for (spec §5.2.1): `collectNumbers(ast)`, `chartModel(ast, node)`, `charts(ast)`, and
`chartConfig(model, series, theme)`, the [Chart.js](https://www.chartjs.org) configuration for one metric (its own value axis, gaps for
empty days, the average dashed), plus `summaryText()` (each chart's accessible name) and `CHART_CSS` (light and dark). Pure, so it runs
in Node.

`preview.mjs` draws a parsed journal into a DOM element: `renderPreview(ast, element, { asset, sample })`, and `drawChart(element, model)`
for one chart on its own. Charts are drawn by Chart.js 4.6.1, vendored as one ES module (`vendor/chart.mjs`: line and bar charts only,
built with esbuild; its header says how), with a text summary on each canvas and the numbers as a table. Markdown becomes elements
built one by one (never `innerHTML`), raw HTML is never rendered, links are only `http(s)`, `mailto` and `#`, and images come only from
attachments the caller lends through `asset(path)`. The workspace, the template editor and the VS Code extension all use it.

`include.mjs` handles includes: `![label](other.jot#id)` on a line of its own shows that part of another local journal in place,
framed and labelled with its source (a record by ID, every entry with a date, or the whole file). View-only: the source keeps its one
line. Paths are relative `.jot` paths that stay inside the root the host names; schemes, absolute paths and climbs above the root are
refused, and nothing is ever fetched from a network. The host reads the files and lends their text through `renderPreview`'s
`include(path)` (with `from`, the document's own path); `gather()` finds what to lend. Includes nest 3 deep; loops, missing files and
unknown fragments show a notice on the page instead of a blank. `flatten()` writes a copy with includes expanded, as an explicit
operation (`jot flatten`). Tests: `node --test include-test.mjs`.

```javascript
import { parse } from './jot.mjs';
import { renderPreview, addChartStyles } from './preview.mjs';
addChartStyles(document);
renderPreview(parse(text), document.querySelector('#page'));
```

Tests: `node --test charts-test.mjs`.

## Page styles and export

`styles.mjs`: `STYLES` (journal, notes, plain), `styleCSS()` (each scoped to `.jot-style-<id>`, system fonts only, nothing fetched) and
`pageCSS(style, [wMm, hMm])` (the `@page` box: paper, book margins, page numbers). `renderPreview(ast, el, { style: 'journal' })` applies
one to a typed page. `export.mjs`: `exportHTML(page, { title, pageCss })` makes one standalone HTML file from a rendered page (its
styles copied in, charts as PNG pictures, attachments and the hand in use embedded as data: URLs, no scripts). The preview also writes
Jot's marks as a reader expects: dates in words (`dateWords`), task states, event, question and idea signs, tags and contexts, margin
notes, time labels. Tests: `node --test styles-test.mjs`.

## Fuller formatting

Beyond GFM, the lexer understands `==highlight==` (`mark` tokens), `++underline++` (`ins`), `^superscript^` (`sup`), footnotes
(`footnoteRef` inline, `footnote` blocks), centred lines (`center` blocks) and GitHub callouts (a blockquote node gains
`callout: 'note' | 'tip' | 'important' | 'warning' | 'caution'`). Spec 4.2.1. `markdownEngine.extensions` lists them. Tests:
`node --test formatting-test.mjs`.

## Handwritten pages

`handwriting.mjs` makes a rendered page look written by hand on a dot grid: `handwrite(page, {hand, ink, seed})`, then
`alignToGrid(page, {pitchMm, dots, pageRows})` once the font has loaded; `pageGeometry(paperMm, pitchMm)` gives the `@page` box whose
writing area is whole rows of dots. `renderPreview(ast, el, { hand: {…} })` does all three and resolves `el.jotReady` when the page is
aligned. On a handwritten page, task boxes are hand-drawn SVG in the ink colour (`boxSVG`: a wobbly square, and for a done task a
scribbled tick that draws itself; `BOX_CSS`). The hands are open fonts in `fonts/` (SIL OFL 1.1, each with its licence): Caveat (Pen), Playpen Sans (Neat print) and
Shantell Sans (Marker), Latin and Latin Extended, regular and bold. Tests: `node --test handwriting-test.mjs` (the browser side is in
`site/test-editor-ui.cjs` and `vscode/test-preview.cjs`).

## Handwriting

Handwritten writing can be preserved as editable strokes plus a PNG attachment, linked through an ordinary Jot record. Stroke files are assets inside the same document, not prose in disguise. A separate, user-reviewed transcription may link to them using `derived-from`; it must never replace the original handwriting. The scanner includes browser pen input and stroke export. This parser does not perform handwriting recognition.

## AST and preservation

`source` contains the original string. Nodes include `type`, `raw`, `start` and `end`; offsets count UTF-8 bytes. Markdown nodes carry the original Marked token in `markdown`. Record fields are ordered `{name,value}` pairs. Date headings generate an `entries` index without splitting the source into files. Repeated dates remain separate entries. Link targets (a record's ID, a dated heading's date) carry `anchor`, and `links` lists every internal link (`href`, `target`, byte `start`/`end`, the `node` holding it, `to` when it resolves, `file` for another document, `field` for a record field); a missing target is an `unresolved-reference` warning. Unicode and original newline sequences are preserved in source slices, even though Markdown token text normalizes newlines.

`stringify(ast)` returns the unmodified original source. It does not serialize edits made to derived tokens. The page renderer is `preview.mjs` (above); there is no profile validator, OCR engine, date-time scheduler, attachment loader or remote include processor (local, view-only includes are `include.mjs`, which reads nothing itself). Diagnostics cover malformed metadata/records, unclosed fences/comments, invalid dates, duplicate record IDs, and links within the journal whose target is missing (`unresolved-reference`) or a repeated date (`ambiguous-reference`). The parser never executes content or fetches linked files.

## Dependency notice

`vendor/chart.mjs` is Chart.js 4.6.1 with @kurkle/color 0.3.4, both MIT (`vendor/chart-LICENSE.md`). `vendor/marked.mjs` is Marked 17.0.5, distributed under its MIT license in `vendor/marked-LICENSE.md`. It is included to keep Markdown behavior grounded in an established parser rather than an ad hoc collection of replacement expressions. Jot's wrapper is original project code.


## Optional spelling and grammar hints

```javascript
import { proofread } from './proofread.mjs';
const hints = proofread(parse(text), {
  grammar: true,
  dictionary: null, // or a Set of lowercase words supplied by the host
  language: 'en'
});
```

These are non-destructive prose-only English pattern hints, separate from syntax diagnostics. They do not constitute a full grammar or spelling engine. The browser workspace additionally uses native browser spellcheck. Run both test files with `npm test` or `node --test test.mjs proofread-test.mjs`.


See CONTAINER.md for the single-file document contract and pack/unpack/readDocument APIs. Plain Markdown export contains only writing; it does not contain attached binary files. Container support uses vendored JSZip and a hash.js SHA-256 fallback with included license notices.
