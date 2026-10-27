# Latest Jot v1 decisions

## Optional music capture, plain-text listening notes (26 October 2026)

The writer's Listening tool can capture title, artist, album, link, capture time and setting notes. Its output is an ordinary
`#### Listening` section with prose and a Markdown link, not a service-dependent document type. Any text editor can create or edit it.
Manual capture accepts Spotify, YouTube Music and other HTTPS song links. This tool does not import media or access the microphone.

Spotify capture uses a registered public Client ID, a static same-origin callback and Authorization Code with PKCE. The only scope
is `user-read-currently-playing`. Sign-in validates the popup/origin or a same-origin return channel, plus random state; the verifier and tokens stay in page memory.
The public ID alone may be remembered locally or configured by a host. No secret is needed in the static site.

Playback is fetched only on request, fills review fields, and changes the journal only when the user chooses Add to this entry.
Empty playback, paused playback, access denial, rate limits, cancellation and disconnect are handled without removing existing
writing. Manual entry remains available without Spotify. This extends the earlier offline browser-tool boundary with explicit playback metadata capture.
Live sign-in requires app registration and Spotify's allowed-user rules;
service HTTP responses are stubbed in automated UI tests, not a claim of testing a real Spotify account.

## Highlighter strokes above ink (26 October 2026)

A highlight now composites a translucent marker, brush or pencil stroke **above** the text with multiply blending, so the visible
result depends on the ink beneath it. The source ink and highlight colors remain separate, unchanged Jot attributes. The stroke
covers letters and their decorations; text selection, links and screen-reader text stay native.

Each word owns a non-interactive overlay, so wrapping and print pagination do not rely on screen coordinates. The original passage
stroke joins the spaces between words. Typed and handwritten previews use the same stroke generator and compositing rules. Dark
mode no longer forces highlighted text to a fixed blue on a cream strip. Print and standalone HTML retain the compositing; pixel
checks verify changed ink pixels, and PDF checks verify the retained multiply operation.

## One paper stylesheet for the site and preview (26 October 2026)

Every site page links to `jot/handwriting.css`, including the workspace that renders journal previews. The sheet is generated from
`handwritingCSS()` in the shared renderer; `tools/build-handwriting-css.mjs --check` prevents drift. Standalone renderer consumers
use the same generator. Page-specific styles retain their layout responsibilities; paper, handwriting fonts, ink and mode colors
come from this sheet.

Light mode uses warm cream paper and blue ink. Dark mode uses charcoal paper, subtle grain/dots and lighter ink. Color hints keep
their original source values: dark previews adapt ink for legibility, while print returns to light paper and the original ink colors.
Standalone HTML export embeds the shared stylesheet and handwriting fonts, including when the site loaded the sheet through a link.

The homepage remains informational, with no editor, form or writing input. Its feature gallery uses real renderer output for multiple
ink/highlight colors, decoration strokes, tasks, tables, callouts, footnotes and measurements; readers can reveal each example's Jot
source. The writing workspace remains at `/write/`.

## Text and checkbox alignment within grid cells (26 October 2026)

Dots now mark cell boundaries. The handwritten renderer measures each font's visible letter height and centres body text within one
row and headings within their line boxes. This replaces the earlier baseline-on-dots alignment. Checkboxes are centred in the first
grid cell; task text starts at the next column. Wrapped tasks keep their checkbox in the first row, and empty task lines use one row.
The shared renderer carries the alignment into Write, VS Code, printing and standalone HTML.

## Optional template grid layout (26 October 2026)

The template editor now previews full-width blocks on physical handwritten pages. This supersedes the earlier template-editor
boundary that excluded page layout. It does not add scanning codes, fixed-position text or responsive columns.

- A block can reserve a **minimum** of 0–200 grid rows including its heading (0 means Auto), leave 0–20 blank rows after it, and start
  on a new page. Content expands beyond the minimum without clipping. Blocks that fit one page move intact to the next page when
  needed; oversized blocks continue in source order. Resizing snaps to rows and has both numeric and keyboard controls.
- Page settings name A5, A4, Letter or Pocket paper, 4–7 mm dot pitch and 4–30 mm minimum margins. `pageGeometry` rounds the writing
  area to whole rows and columns. Preview fitting scales only the display, not the measured print geometry.
- These are optional presentation hints in existing hidden comments: `jot-page: {"paper":"A5","pitchMm":5,"marginMm":8}` and
  `jot-block: {"id":"notes","rows":8,"gap":1,"newPage":false}`, closed by a separate `jot-block-end` comment. Values are validated and
  bounded, never interpreted as HTML or CSS. Block ids link repeated instances to their template block.
- Unchanged Auto-only templates omit the extra layout markers to preserve compact text and InkDeck capacity. The editor generates
  markers separately for its visual preview. Saved template JSON and the hidden template comment round-trip all layout settings.
- The shared handwritten renderer aligns children within each sized block, then allocates its minimum rows and page-start space.
  Write restores a file's paper/grid settings; print and standalone HTML retain block space. Editing outlines and controls stay in
  the template editor. Other text readers can ignore hints and still read the complete journal.
- Browser tests cover row geometry, page starts, drag and keyboard sizing, undo/redo, Auto, oversized blocks, growth beyond the minimum,
  file round trips, Write, HTML export, phone width and accessibility. Physical printer proofs remain a separate check.

## Two representations, two extensions (draft 3, 26 October 2026)

Jot v1 has two representations with the same writing syntax:

- **`.jot`, plain Jot:** UTF-8 text, directly readable and editable in any text editor, on a phone or an e-ink writer. It cannot embed
  binary attachments. This is what most people write and what templates produce.
- **`.jotz`, packaged Jot:** one ZIP-based file with journal.txt, manifest.json and assets/, keeping images, corrected scans, editable
  ink and other assets together with the writing. Its bytes are not plain text; journal.txt is readable after extraction.

Neither limits a journal to one day, and methods can blend within either. Readers decide by content (a ZIP signature at byte zero
means a package), so a mislabelled file still opens, including `.jot` packages written under draft 2. Writers use the right extension
and save plain `.jot` whenever there are no assets. Text-only tools may list only `.jot`.

Why: with one extension, a packaged file opened in a text editor showed as unreadable bytes, and text-only tools had to inspect each
file before refusing it. Plain and packaged files now look different before anyone opens them (precedent: Fountain's plain
`.fountain` beside Highland's zipped `.highland`).

This supersedes draft 2, which used `.jot` for both, and the older statements that called plain `.jot` legacy-only or the package the
only native representation.

## Numbers, charts and the weekly dashboard (26 October 2026)

- **A chart is a record** (`:::record chart`, spec §5.2.1): it names metrics and dates and holds no values, so the file stays plain
  text that says what it charts, and a reader without charts loses nothing. The numbers stay where they were written: `measurement`
  records, and plain-number fields of other records (the template editor's Ratings and Fill-in blanks).
- **One metric, one chart.** Each metric is drawn on its own value axis (a scale's range when it has one), days with nothing written
  are gaps, and two numbers on a day are averaged for display only. No dual axes: sleep hours and steps never share a scale.
- **One renderer, drawn by Chart.js.** `parser/charts.mjs` reads the numbers and builds each chart's Chart.js configuration (pure, tested
  in Node); Chart.js 4.6.1 draws it, bundled as `parser/vendor/chart.mjs` with only line and bar charts, so nothing is fetched at run
  time. Each canvas is named by a text summary and the numbers are also a table. `parser/preview.mjs` (the page, DOM only) is shared by
  the workspace, the template editor's Page view, the home page and the VS Code extension, which carry copies (`site/dist/jot/`,
  `vscode/media/jot/`) checked in CI.
- **The rule of 7 is a nudge.** The template editor says when a week page has more than seven widgets; it never refuses.
- **No book maker.** The print engine (`journal/`, KDP books) and the template editor's print day layout import are removed: Jot is
  written and read as text, and printed from the browser (the workspace's Print / PDF).
- **The site's home page explains Jot;** the writing workspace moved from `/` to `/write/` (examples open there with `?open=`).

## Fuller formatting and handwritten pages (26 October 2026)

- **Six more marks** (spec 4.2.1): `==highlight==`, `++underline++`, `^superscript^`, footnotes (`[^1]`, `[^1]: …`), centred lines
  (`-> … <-`) and callouts (`> [!NOTE]`). Chosen because Obsidian, Typora, iA Writer, markdown-it plugins and GitHub already use them,
  so a `.jot` reads the same elsewhere. They are Marked extensions in `parser/jot.mjs`; each needs a non-space just inside its marks,
  so ordinary prose (`a == b`, `C++`) is untouched. No subscript: `~text~` stays text (4.2).
- **Handwriting is a look, not data** (spec 8.3.1). `parser/handwriting.mjs` writes a rendered page in an open handwriting font
  (Caveat as Pen, with its two full alternate sets chosen per letter; Playpen Sans and Shantell Sans, which bring their own contextual
  alternates), with small seeded wobbles per word. The text in the page stays the text: copying, search and screen readers are
  unaffected. Same text and seed, same page.
- **On the dots.** Lines are one dot pitch apart, the pitch is snapped to Chromium's 1/64 px layout unit, blocks are rounded up to whole
  rows, two-row headings are nudged onto a row, the dots are drawn at the measured baseline, and the printed page's writing area is a
  whole number of rows (`pageGeometry`). Printed, the dots and the letters land together on every page.
- **Hand-drawn boxes belong to the handwritten look.** On a handwritten page a task's box is a pencil square and a done task's a
  scribbled tick (`boxSVG`, SVG paths from a seed), drawn one of four ways each (`BOX_KINDS`, `TICK_KINDS`), never the same pair twice in
  a row, in the ink colour so they print as lines; the tick draws itself with a CSS stroke
  animation (`pathLength` 1, dash offset 1 to 0), finished at once for reduced motion and in print. Typed pages keep plain boxes. No
  extra font for the boxes: the page already writes in Caveat.
- **The home page explains; it takes no input.** No editor or form on it: the writing workspace is at `/write/`.
- **Fonts are bundled** (`parser/fonts/`, SIL OFL 1.1, Latin and Latin Extended, regular and bold), never fetched; the site publishes
  `.woff2` for them.

## Formatted pages and export (26 October 2026)

- **The writing stays plain; the page is formatted.** Styles (Journal, Notes, Plain; `parser/styles.mjs`) are presentation only: the
  `.jot` file is never changed by choosing one. They use the reader's own fonts (system stacks), so pages stay small and offline.
- **Jot's marks read as a page.** A dated heading shows its date in words (the rest of the heading kept when it says more than the
  weekday), tasks show their state, events, questions and ideas their sign, tags and contexts are marked, margin notes sit beside the
  text. Every view (workspace, template editor, VS Code, export) gets this from `preview.mjs`.
- **One file to keep or share.** Download page (and VS Code's Export as HTML) writes one HTML file: the page's own styles, charts as
  PNG pictures with their summaries as alternative text, attachments and the hand in use as data: URLs, no scripts, nothing fetched.
  PDF is the browser's print, with `@page` margins and page numbers.

## Automation and connections (26 October 2026)

- **The file stays the source.** Automation reads what a journal holds (`parser/automation.mjs`: tasks, events, numbers) and writes back
  only as ordinary Jot: a filled `value:`, a measurement with `source:`, `[>]` on a carried task, a review section. Anything a service
  returns is a record naming it in `source:`.
- **Nothing reaches out by itself.** Only `parser/connect.mjs` touches the internet (webhooks, Todoist, Open-Meteo), and only from a
  command someone runs or a setting they turned on; VS Code asks before each webhook or Todoist send and keeps the Todoist token in its
  secret storage. The website's tools are offline. A webhook gets tasks, events and numbers, never the rest of the writing.
- **One implementation.** The workspace's Tools row, the `jot` command line and VS Code call the same functions, so a calendar, a CSV
  or a rollover is the same everywhere.
- **Remembering what was sent** is a `sync` record (`:::record sync #sync-<service>`, one `sent:` key per task) in the journal itself, so
  it travels with the file; formatted pages hide it.
- **Times are only what is written.** An event's time is read only when it is unambiguous (`19:00`, `7pm`, `at 21`); "at 7" is all day.
  A CSV date like `03/04/2026` is left out and counted unless the reader says the day comes first.

## Query views (27 October 2026)

- **A query is a view, like a chart.** `:::record query` (spec §5.2.2) lists or counts the tasks, events, entries or numbers in the
  same journal; the answer is computed when the page is shown and never written back, so the file holds only the question.
- **A fixed vocabulary, not a language.** `show`, `status`, `priority`, `tag`, `context`, `text`, `metric`, `period`/`start`/`end`,
  `stat`, `limit`, `label`: no expressions, no code, nothing fetched. Several tags mean all of them; several statuses any of them.
- **Periods count from the query's own `date:`, else the entry it is in** (`period: week` is that entry's ISO week, as a chart's default), so a query
  copied into a template's daily or weekly page means "this day/week" wherever it lands. With no dates every item counts.
- **Never a silent answer.** Any field the reader can't read (unknown name or value, a blank filter, wrong for the `show`, an unknown metric) replaces
  the result with the problem and an `invalid-query` warning, because quietly ignoring `status: opne` would show every task.
- **One implementation.** `parser/query.mjs` serves the preview, the workspace's checks and `jot query`; `#tag`/`@context` recognition
  moved there (`TAGGED`, `marks`) so the renderer and queries read the same marks. A query and its `limit` are never chart numbers.
- **The command line** runs the query records in each file (`jot query journal.jot`), or one typed as flags, asked of each file on its own
  (`jot query a.jot b.jot --show tasks --tag health`), where `--period` counts from `--date` (default today). A problem exits 1.

## What the current code does

- parse(text) parses writing and preserves its source; stringify(ast) returns that original source, not edits to AST nodes.
- readDocument(input) reads either representation by content and returns source/assets plus a packaged flag.
- pack(...) writes the bytes of a `.jotz`; unpack(...) validates and reads one.
- The workspace (`/write/`) opens `.jot`, `.jotz`, `.md` and `.txt`. Download .jot saves plain `.jot` when the journal has no attachments, and one
  `.jotz` when it has. Export writing .md writes the writing only.
- The template editor writes plain `.jot` and opens either.
- readDocument's detection is a prototype, not a claim that every malformed package can be told apart from arbitrary text.

## Packaging and product boundaries

Jot is the journal document and source language. This project ZIP is a development/distribution bundle containing the website and specification; it is not itself a journal file. Packaging does not encrypt content. PDF is inspiration for carrying a document and its assets together; Jot does not use PDF encoding or require a fixed page layout.

The root site covers Jot as a whole. Scanner and handwriting are separate tools at /scan/, hidden from the site (no links, `noindex`) until they are finished (26 October 2026). Handwritten marks remain original content, with no required OCR or transcription. The roadmap also includes composable content blocks, individualized accessibility preferences, multiple languages and proofing improvements.

## Public scrobbling reads

The writer can read Last.fm and ListenBrainz public listening activity on explicit request and insert the reviewed result as ordinary
prose. Current reports and recent history have distinct labels; historical listen times are separate from capture times. The reader
requires no service connection. No scrobbles are submitted. Last.fm's application key stays in page memory, usernames persist only
after successful reads, and requests use no browser credentials/referrer. Libre.fm is manual-only because live API probing returned
an access challenge; direct browser compatibility was not established. Provider responses are mocked in regression tests.
