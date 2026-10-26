# .jot

**Jot things down. Get beautiful pages back.**

Jot is a plain-text journal format that combines Markdown with simple marks for tasks, events, questions and ideas. Keep a moment,
a day, a month or an ongoing journal in one file, then read it as formatted pages, handwritten notes or a dashboard of your numbers.

Your writing stays in files you can open in a text editor. The browser workspace, command-line tools and VS Code extension share
one parser and page renderer.

- **Write your way:** freeform entries, reusable templates, tasks, prompts and measurements.
- **Make it yours:** handwritten fonts, dot grids, inline colors and Journal, Notes or Plain page styles.
- **Keep and share:** plain-text journals, packaged attachments, printable pages and standalone HTML exports.
- **Use your numbers:** charts, CSV imports, calendar exports and weekly reviews.

[Writing guide](docs/guide/writing-jot.md) · [Template guide](docs/guide/template-editor.md) · [Automation guide](docs/guide/automation.md) · [Specification](specification/) · [Latest decisions](DECISIONS.md)

## A journal in a few lines

Save this as `my-journal.jot`, or paste it into the browser workspace:

```jot
### 2026-10-26 | Monday

A slow morning. Tea, then a walk. Something ==worth remembering==.

[x] Water the plants
[ ] Return the library book
o 18:30 Dinner with a friend
? What would make tomorrow easier
! Keep a notebook by the door
```

A `.jot` file can also be nothing but sentences. Dates, marks and formatting are optional. See the
[writing guide](docs/guide/writing-jot.md) for task states, records, footnotes and more.

## Quick start

### Run the browser workspace

Clone this repository, or download its ZIP from GitHub's **Code → Download ZIP** menu and extract it. From the project root, run:

```sh
git clone https://github.com/shelbeeely/.jot.git
cd .jot
python3 -m http.server 8000 --bind 127.0.0.1 --directory site/dist
```

If you downloaded the ZIP, open a terminal in the extracted project folder and run only the `python3` command.
The static site needs Python 3 to serve it locally; no build or npm install is required to use it.

| Open locally | What you can do |
| --- | --- |
| [Write](http://localhost:8000/write/) | Open a journal, write and preview pages, then download your file |
| [Template editor](http://localhost:8000/editor/) | Design daily, weekly and monthly prompts and download a `.jot` template |
| [Converter](http://localhost:8000/convert/) | Convert a plain-text diary into dated Jot entries |
| [Guides](http://localhost:8000/guide/) | Learn the writing format and tools |
| [Examples](http://localhost:8000/examples/) | Read or download converted public-domain diaries |

The server runs until you press **Ctrl+C**. Download your journal to keep a file outside the browser's local storage.

### Use the command line

With **Node.js 20 or later**, run these from the project root. The CLI needs no npm install:

```sh
node cli/jot.mjs help
node cli/jot.mjs tasks my-journal.jot
node cli/jot.mjs events my-journal.jot
node cli/jot.mjs review my-journal.jot --dry-run
```

Replace `my-journal.jot` with your file's path. See [CLI commands](cli/README.md) for CSV, calendar exports, rollover and connections.
For an editor with a live preview, see [Jot for VS Code](#jot-for-vs-code).

## Files and formats

| Format | Contents | Best for |
| --- | --- | --- |
| `.jot` | Plain UTF-8 text | Writing in any text editor, templates and e-ink devices |
| `.jotz` | A ZIP-based package with writing and assets | Keeping images, scans and editable ink with a journal |
| Exported `.html` | A standalone formatted page with its assets included | Sharing or reading without the workspace |
| Printed PDF | Pages produced through the browser's **Print / PDF** action | Printing and fixed-layout copies |

The workspace opens `.jot`, `.jotz`, `.md` and `.txt`. It downloads plain `.jot` when there are no attachments and `.jotz` when there
are. A repository ZIP contains the project itself; it is a different download from a journal package. Packaging does not encrypt a file.

## Features

The site and journal preview share one handwriting stylesheet, with cream paper in light mode and charcoal paper in dark mode.
The homepage demonstrates ink colors, highlights and other Jot marks without a writing editor; open **Write** to make your own page.


### Numbers, charts and the weekly dashboard

Numbers you write (sleep hours, steps, a 1–5 mood) are `measurement` records; a `:::record chart` asks for them to be drawn, one small
chart per metric (spec §5.2.1). The workspace, the template editor's **Page** view and the VS Code extension draw the same charts with
the same code: `parser/charts.mjs` reads the numbers and makes each chart's configuration, [Chart.js](https://www.chartjs.org) 4.6.1
(`parser/vendor/chart.mjs`, bundled, nothing fetched) draws it, and `parser/preview.mjs` lays out the page. The template editor's
**Weekly dashboard** starter sets up a week page of six widgets (the "rule of 7"). Guide:
[Numbers and charts](docs/guide/template-editor.md#numbers-and-charts).

### Beautiful formatted pages

Jot things down; the workspace (**Write**) shows them as formatted pages: dates in words, task states, signs for events, questions and
ideas, tags and places, margin notes beside the text. **Style** picks **Journal** (a book page), **Notes** (clean and modern) or
**Plain** (`parser/styles.mjs`). **Print / PDF** prints them with book margins and page numbers; **Download page ↓** saves one
standalone `.html` with everything inside (`parser/export.mjs`). VS Code has the same styles and **Jot: Export as HTML**. Guide:
[Beautiful pages](docs/guide/writing-jot.md#beautiful-pages-styles-printing-and-sharing).

### Inline colors

Select words in the workspace and apply text ink, highlight, strikethrough or underline colors, using a palette or custom hex. Colors persist in `.jot` source and appear in handwritten preview, print and standalone HTML export. Handwritten is the default for new workspace preferences. See [Color in handwritten pages](docs/guide/writing-jot.md#color-in-handwritten-pages). Browser regression check: `node site/test-colors-ui.cjs` (Playwright and Chromium).

### Handwritten pages on a dot grid

In the workspace (**Write**), **Look → Handwritten** writes the journal in a handwriting font (Pen, Neat print or Marker; each letter
of the Pen hand comes in three shapes) and puts every line on a row of a dot grid (4 to 7 mm). **Print / PDF** prints the dots and the
writing together, page after page, on A5, A4, Letter, pocket or your own paper. The template editor's Page view and VS Code show it
too. Guide: [Handwritten pages on a dot grid](docs/guide/writing-jot.md#handwritten-pages-on-a-dot-grid). Fuller formatting
(`==highlight==`, `++underline++`, `^sup^`, footnotes, callouts, centred lines): [More ways to mark words](docs/guide/writing-jot.md#more-ways-to-mark-words).

### Automation and connections

`parser/automation.mjs` reads a journal's tasks, events and numbers and writes back to it: calendar (`.ics`) and CSV out, numbers from a
fitness app's CSV in (into their days, blanks filled first, never twice), today's entry, carrying open tasks forward, a week review.
`parser/connect.mjs` is the only code that reaches the internet, and only when asked: webhooks (Zapier, Make, n8n), Todoist and the
weather (Open-Meteo). The workspace's **Tools** row, the `jot` command line (`cli/jot.mjs`, [cli/README.md](cli/README.md)) and
VS Code all use the same code. Guide: [Automation and connections](docs/guide/automation.md).

    node cli/jot.mjs help
    node --test parser/automation-test.mjs cli/test.mjs

## Jot for VS Code

From the project root:

```sh
node vscode/sync.mjs
(cd vscode && npx @vscode/vsce package)
```

In VS Code, choose **Extensions → … → Install from VSIX** and select the generated package.

Details: [vscode/README.md](vscode/README.md).

## Template editor: a journal's shape as a .jot

A separate editor just for Jot, in the site at `/editor/`: put together what each day, week and month asks (writing space, prompts,
checkboxes, scales, blanks, time blocks ...), then download a plain-text `.jot` to fill in by hand, one file for the month or a file a
week for InkDeck. The handwritten Page view shows paper, grid rows and page boundaries. Reserve a minimum number of rows per block,
set gaps and page starts, or drag a block’s bottom handle to resize it. Full-width blocks expand with longer writing. Undo, drag to
reorder, charts, and reopen any downloaded `.jot` to get
its template back. Details: [site/README.md](site/README.md#template-editor-disteditor).

    python3 -m http.server 8000 --bind 127.0.0.1 --directory site/dist      # http://localhost:8000/editor/
    node --test site/test-editor.mjs
    node site/test-editor-ui.cjs

## Converter: old diaries into Jot

`jot-convert` turns a diary kept as plain text into `.jot`: a dated entry for each day, the original date kept after the `|`, Old
Style dates converted (`--calendar julian`), split by year when it is too big. Tested on Pepys, *The Diary of a Nobody* and Blunt's
*My Diaries* from Project Gutenberg. The same converter runs in the browser at `/convert/`, with every option of the command line
and the same files. The converted diaries are the site's examples (`/examples/`): read them in the workspace or download them.
Details: [converter/README.md](converter/README.md).

    node tools/build-examples.mjs --check

    curl -sL https://www.gutenberg.org/cache/epub/1026/pg1026.txt | node converter/jot-convert.mjs - --year 1888 > nobody.jot
    node --test converter/test.mjs && node site/test-convert-ui.cjs

## InkDeck

[InkDeck](https://github.com/shelbeeely/inkdeck), the Bluetooth-keyboard writing firmware for the Xteink X3/X4, saves `.jot` files:
new files start with the Jot metadata block, and ZIP-packaged `.jot` files are refused rather than opened as text. The template editor's
**A file a week** download fits its 16 KB files.

## Repository map

| Path | What is there |
| --- | --- |
| [`specification/`](specification/) | Jot v1 (1.0.0-draft.3): the full specification (Markdown and PDF), AST schema, profiles, paper sizes, conformance fixtures |
| [`DECISIONS.md`](DECISIONS.md) | The latest decisions. Read this before older specification text |
| [`parser/`](parser/) | JavaScript parser (`jot.mjs`, with fuller formatting), container (`container.mjs`: packaged `.jotz`), charts (`charts.mjs`), the page preview (`preview.mjs`), page styles (`styles.mjs`) and the standalone export (`export.mjs`), handwritten pages on a dot grid (`handwriting.mjs`, fonts in `fonts/`), proofreading hints, tests |
| [`site/`](site/) | The site (`site/dist/`, static): the home page (why Jot), the writing workspace (`/write/`), the template editor (`/editor/`), the diary converter (`/convert/`); the scanner (`/scan/`) is unfinished and not linked |
| [`vscode/`](vscode/) | **Jot for VS Code**: `.jot` syntax colours and a live page preview with charts, from the same renderer as the site |
| [`docs/guide/`](docs/guide/) | **User guides**: [Writing in Jot](docs/guide/writing-jot.md), [Using the template editor](docs/guide/template-editor.md) and [Converting an old diary](docs/guide/converting.md) (also pages on the site, `/guide/`) |
| [`cli/`](cli/) | `jot`, the command line: tasks, events, numbers, calendar and CSV out, numbers in, today, rollover, review, webhooks, Todoist |
| [`converter/`](converter/) | `jot-convert`: plain-text diaries (your own, or Project Gutenberg's) to dated `.jot` entries |
| [`docs/methods/`](docs/methods/) | The journaling methods library the spec's profiles cover (46 guides, CC0) |
| [`examples/`](examples/) | A plain `.jot` and a packaged `.jotz`. Whole diaries as Jot (Pepys, *The Diary of a Nobody*, Blunt) are on the site's Examples page, [`site/dist/examples/`](site/dist/examples/) |
| [`references/`](references/) | The historical DotJot document (background only) |
| `tools/` | `privacy-check.mjs` (the gate before the site is published; `test-privacy.mjs` tests it), `build-examples.mjs` (the site's example diaries, converted from Project Gutenberg; `--check` verifies them), `manifest.cjs` (rewrites or checks [`MANIFEST.json`](MANIFEST.json): size and SHA-256 of every file), `build-spec-pdf.cjs` (the spec PDF from its Markdown), `build-parser-zip.py` (the site's parser download) and `test-files.mjs` (plain `.jot` vs packaged `.jotz`, by content) |

## Development and validation

Run commands from the project root. Use Node.js 22 to match CI; Python 3 supports the local server and archive checks.
The publishing privacy check also needs `pdftotext` (provided by Poppler).

```sh
# Parser, automation and CLI tests
node --test parser/*test.mjs cli/test.mjs

# Site, converter, file handling and extension tests
node --test site/test-editor.mjs site/test-guides.mjs converter/test.mjs tools/test-files.mjs tools/test-privacy.mjs vscode/test-extension.mjs
node site/test-core.cjs

# Verify the published site and tracked file manifest
node tools/privacy-check.mjs site/dist
node tools/manifest.cjs --check
node tools/build-handwriting-css.mjs --check
```

Browser regression checks require Playwright, Chromium and the root `axe-core` dependency. With Playwright available, run
`npm install`, then `node site/test-editor-ui.cjs` and `node site/test-colors-ui.cjs`.
Run `node site/test-layout-ui.cjs` for grid sizing, page starts, save/reopen, overflow and HTML export checks.
Run `node site/test-paper-ui.cjs` to check shared styling, paper modes, homepage examples and accessibility across the site.
These browser checks are separate from the Node.js tests above.

Before changing behavior, read [DECISIONS.md](DECISIONS.md) and the relevant component README. Parser code is copied into the site and
VS Code extension; keep those copies in sync when editing shared modules. After changing tracked files, regenerate the manifest with
`node tools/manifest.cjs` and commit it alongside the changes. The complete publishing checks are in
[the Pages workflow](.github/workflows/pages.yml).

## The site (GitHub Pages)

`site/dist/` is published to GitHub Pages from `main` by [`.github/workflows/pages.yml`](.github/workflows/pages.yml), only after
`tools/privacy-check.mjs` (nothing personal, private or secret, including inside archives and PDFs) and the tests pass. Turn it on
once in **Settings → Pages → Source: GitHub Actions**. Details: [site/README.md](site/README.md#publishing-github-pages).

    node tools/privacy-check.mjs        # what the workflow runs before it publishes

## Privacy

The browser writing tools process journals locally. Webhooks, Todoist and weather requests are explicit CLI or VS Code actions;
see [Automation and connections](docs/guide/automation.md) for what they send.

Repository journals are public-domain diaries or fictional examples. Keep personal journals, attachments and service credentials out
of commits. Calendars (`*.ics`) are git-ignored. The publishing privacy check scans site files, archives and PDFs before deployment.

## Status and licences

Jot v1 is a draft (spec 1.0.0-draft.3, parser 0.1.0). See [DECISIONS.md](DECISIONS.md) and the
[roadmap](specification/ROADMAP.md) for current boundaries. The page scanner at `/scan/` is unfinished and hidden from site navigation;
diagram rendering and handwriting OCR are not implemented. The parser's vendored libraries (Marked,
Chart.js, JSZip, hash.js) carry their own notices in `parser/vendor/`; the handwriting fonts (Caveat, Playpen Sans, Shantell Sans) are
under the SIL Open Font License, with their licences in `parser/fonts/`. No project-wide licence is asserted for the Jot specification,
the parser or the VS Code extension yet.

The print engine that made KDP books from `.jot` writing (`journal/`) has been removed from this repository; it lives on in its
history and in the Journaling repository.
