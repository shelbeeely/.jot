# Latest Jot v1 decisions

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
- **One renderer.** `parser/charts.mjs` (numbers and SVG) and `parser/preview.mjs` (the page, DOM only) are shared by the workspace,
  the template editor's Page view and the VS Code extension, which carry copies (`site/dist/jot/`, `vscode/media/jot/`) checked in CI.
- **The rule of 7 is a nudge.** The template editor says when a week page has more than seven widgets; it never refuses.
- **Paper keeps paper's strengths.** The print engine plots nothing for you: the week plan's right page can carry up to two graph grids
  (`week_right` options `graphs`) to fill in by hand. With no option the book is unchanged, byte for byte.
- **The site's home page explains Jot;** the writing workspace moved from `/` to `/write/` (examples open there with `?open=`).

## What the current code does

- parse(text) parses writing and preserves its source; stringify(ast) returns that original source, not edits to AST nodes.
- readDocument(input) reads either representation by content and returns source/assets plus a packaged flag.
- pack(...) writes the bytes of a `.jotz`; unpack(...) validates and reads one.
- The workspace (`/write/`) opens `.jot`, `.jotz`, `.md` and `.txt`. Download .jot saves plain `.jot` when the journal has no attachments, and one
  `.jotz` when it has. Export writing .md writes the writing only.
- The template editor writes plain `.jot` and opens either. The print engine (`journal/`) reads `*.jot` and `*.jotz`.
- readDocument's detection is a prototype, not a claim that every malformed package can be told apart from arbitrary text.

## Packaging and product boundaries

Jot is the journal document and source language. This project ZIP is a development/distribution bundle containing the website and specification; it is not itself a journal file. Packaging does not encrypt content. PDF is inspiration for carrying a document and its assets together; Jot does not use PDF encoding or require a fixed page layout.

The root site covers Jot as a whole. Scanner and handwriting are separate tools at /scan/. Handwritten marks remain original content, with no required OCR or transcription. The roadmap also includes composable content blocks, individualized accessibility preferences, multiple languages and proofing improvements.
