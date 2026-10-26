# .jot

**Jot** is a plain-text journal format: Markdown plus a few journal marks (tasks, events, questions, records, page breaks), one file
for a moment, a day, a month or an ongoing journal. A `.jot` file is plain UTF-8 text; a `.jotz` packages the same writing with
images, scans and handwriting in one file. This repository holds the format, its parser, the site (a writing workspace, a template
editor, a diary converter), user guides, and Jot for VS Code. (A page scanner, `/scan/`, is in the repository but hidden from the site
until it is finished.)

## Map

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

## Start here

New to Jot? Read [Writing in Jot](docs/guide/writing-jot.md) (ten minutes), then [Using the template editor](docs/guide/template-editor.md).

## Jot: parser and workspace

    node --test parser/test.mjs parser/proofread-test.mjs parser/container-test.mjs parser/charts-test.mjs parser/formatting-test.mjs parser/handwriting-test.mjs parser/styles-test.mjs parser/automation-test.mjs cli/test.mjs
    node site/test-core.cjs
    npm install && node site/test-editor-ui.cjs                    # the browser tests (Playwright; axe-core from the root package.json)
    python3 -m http.server 8000 --bind 127.0.0.1 --directory site/dist      # http://localhost:8000/ (why Jot), /write/, /editor/, /convert/, /guide/ and /examples/ (/scan/ is unfinished and unlinked)

## Numbers, charts and the weekly dashboard

Numbers you write (sleep hours, steps, a 1–5 mood) are `measurement` records; a `:::record chart` asks for them to be drawn, one small
chart per metric (spec §5.2.1). The workspace, the template editor's **Page** view and the VS Code extension draw the same charts with
the same code: `parser/charts.mjs` reads the numbers and makes each chart's configuration, [Chart.js](https://www.chartjs.org) 4.6.1
(`parser/vendor/chart.mjs`, bundled, nothing fetched) draws it, and `parser/preview.mjs` lays out the page. The template editor's
**Weekly dashboard** starter sets up a week page of six widgets (the "rule of 7"). Guide:
[Numbers and charts](docs/guide/template-editor.md#numbers-and-charts).

## Beautiful formatted pages

Jot things down; the workspace (**Write**) shows them as formatted pages: dates in words, task states, signs for events, questions and
ideas, tags and places, margin notes beside the text. **Style** picks **Journal** (a book page), **Notes** (clean and modern) or
**Plain** (`parser/styles.mjs`). **Print / PDF** prints them with book margins and page numbers; **Download page ↓** saves one
standalone `.html` with everything inside (`parser/export.mjs`). VS Code has the same styles and **Jot: Export as HTML**. Guide:
[Beautiful pages](docs/guide/writing-jot.md#beautiful-pages-styles-printing-and-sharing).

## Handwritten pages on a dot grid

In the workspace (**Write**), **Look → Handwritten** writes the journal in a handwriting font (Pen, Neat print or Marker; each letter
of the Pen hand comes in three shapes) and puts every line on a row of a dot grid (4 to 7 mm). **Print / PDF** prints the dots and the
writing together, page after page, on A5, A4, Letter, pocket or your own paper. The template editor's Page view and VS Code show it
too. Guide: [Handwritten pages on a dot grid](docs/guide/writing-jot.md#handwritten-pages-on-a-dot-grid). Fuller formatting
(`==highlight==`, `++underline++`, `^sup^`, footnotes, callouts, centred lines): [More ways to mark words](docs/guide/writing-jot.md#more-ways-to-mark-words).

## Automation and connections

`parser/automation.mjs` reads a journal's tasks, events and numbers and writes back to it: calendar (`.ics`) and CSV out, numbers from a
fitness app's CSV in (into their days, blanks filled first, never twice), today's entry, carrying open tasks forward, a week review.
`parser/connect.mjs` is the only code that reaches the internet, and only when asked: webhooks (Zapier, Make, n8n), Todoist and the
weather (Open-Meteo). The workspace's **Tools** row, the `jot` command line (`cli/jot.mjs`, [cli/README.md](cli/README.md)) and
VS Code all use the same code. Guide: [Automation and connections](docs/guide/automation.md).

    node cli/jot.mjs help
    node --test parser/automation-test.mjs cli/test.mjs

## Jot for VS Code

    cd vscode && node sync.mjs && npx @vscode/vsce package          # then Extensions → … → Install from VSIX
    node vscode/sync.mjs --check && node --test vscode/test-extension.mjs && node vscode/test-preview.cjs

Details: [vscode/README.md](vscode/README.md).

## Template editor: a journal's shape as a .jot

A separate editor just for Jot, in the site at `/editor/`: put together what each day, week and month asks (writing space, prompts,
checkboxes, scales, blanks, time blocks ...), then download a plain-text `.jot` to fill in by hand, one file for the month or a file a
week for InkDeck. No page layout or scanning. Undo, drag to reorder, a Page view with charts, and reopen any downloaded `.jot` to get
its template back. Details: [site/README.md](site/README.md#template-editor-disteditor).

    python3 -m http.server 8000 --bind 127.0.0.1 --directory site/dist      # http://localhost:8000/editor/
    cd site && node --test test-editor.mjs && node test-editor-ui.cjs

## Converter: old diaries into Jot

`jot-convert` turns a diary kept as plain text into `.jot`: a dated entry for each day, the original date kept after the `|`, Old
Style dates converted (`--calendar julian`), split by year when it is too big. Tested on Pepys, *The Diary of a Nobody* and Blunt's
*My Diaries* from Project Gutenberg. The same converter runs in the browser at `/convert/`, with every option of the command line
and the same files. The converted diaries are the site's examples (`/examples/`): read them in the workspace or download them.
Details: [converter/README.md](converter/README.md).

    node tools/build-examples.mjs [--from <folder of pg<N>.txt>]    # rebuild the examples; --check verifies them

    curl -sL https://www.gutenberg.org/cache/epub/1026/pg1026.txt | node converter/jot-convert.mjs - --year 1888 > nobody.jot
    node --test converter/test.mjs && node site/test-convert-ui.cjs

## InkDeck

[InkDeck](https://github.com/shelbeeely/inkdeck), the Bluetooth-keyboard writing firmware for the Xteink X3/X4, saves `.jot` files:
new files start with the Jot metadata block, and ZIP-packaged `.jot` files are refused rather than opened as text. The template editor's
**A file a week** download fits its 16 KB files.

## The site (GitHub Pages)

`site/dist/` is published to GitHub Pages from `main` by [`.github/workflows/pages.yml`](.github/workflows/pages.yml), only after
`tools/privacy-check.mjs` (nothing personal, private or secret, including inside archives and PDFs) and the tests pass. Turn it on
once in **Settings → Pages → Source: GitHub Actions**. Details: [site/README.md](site/README.md#publishing-github-pages).

    node tools/privacy-check.mjs        # what the workflow runs before it publishes

## Privacy

Nothing personal is in this repository: every journal in it is a public-domain diary or a fictional example. Calendars (`*.ics`) are
git-ignored. Keep it that way: your journal writing stays local.

## Status and licences

Jot v1 is a draft (spec 1.0.0-draft.3, parser 0.1.0); see `DECISIONS.md` and the roadmaps. The parser's vendored libraries (Marked,
Chart.js, JSZip, hash.js) carry their own notices in `parser/vendor/`; the handwriting fonts (Caveat, Playpen Sans, Shantell Sans) are
under the SIL Open Font License, with their licences in `parser/fonts/`. No project-wide licence is asserted for the Jot specification,
the parser or the VS Code extension yet.

The print engine that made KDP books from `.jot` writing (`journal/`) has been removed from this repository; it lives on in its
history and in the Journaling repository.
