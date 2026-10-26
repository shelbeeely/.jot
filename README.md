# .jot

**Jot** is a plain-text journal format: Markdown plus a few journal marks (tasks, events, questions, records, page breaks), one file
for a moment, a day, a month or an ongoing journal. A `.jot` file is plain UTF-8 text; a `.jotz` packages the same writing with
images, scans and handwriting in one file. This repository holds the format, its parser, the web workspace, a template editor, user guides, and a
print engine that turns `.jot` writing into KDP-ready books.

## Map

| Path | What is there |
| --- | --- |
| [`specification/`](specification/) | Jot v1 (1.0.0-draft.3): the full specification (Markdown and PDF), AST schema, profiles, paper sizes, conformance fixtures |
| [`DECISIONS.md`](DECISIONS.md) | The latest decisions. Read this before older specification text |
| [`parser/`](parser/) | JavaScript parser (`jot.mjs`), container (`container.mjs`: packaged `.jotz`), charts (`charts.mjs`) and the page preview (`preview.mjs`), proofreading hints, tests |
| [`site/`](site/) | The site (`site/dist/`, static): the home page (why Jot), the writing workspace (`/write/`), the template editor (`/editor/`), the diary converter (`/convert/`) and the scanner/handwriting tool (`/scan/`) |
| [`vscode/`](vscode/) | **Jot for VS Code**: `.jot` syntax colours and a live page preview with charts, from the same renderer as the site |
| [`docs/guide/`](docs/guide/) | **User guides**: [Writing in Jot](docs/guide/writing-jot.md), [Using the template editor](docs/guide/template-editor.md) and [Converting an old diary](docs/guide/converting.md) (also pages on the site, `/guide/`) |
| [`converter/`](converter/) | `jot-convert`: plain-text diaries (your own, or Project Gutenberg's) to dated `.jot` entries |
| [`docs/methods/`](docs/methods/) | The journaling methods library the spec's profiles cover (46 guides, CC0) |
| [`examples/`](examples/) | A plain `.jot` and a packaged `.jotz`. Whole diaries as Jot (Pepys, *The Diary of a Nobody*, Blunt) are on the site's Examples page, [`site/dist/examples/`](site/dist/examples/) |
| [`references/`](references/) | The historical DotJot document (background only) |
| [`journal/`](journal/) | The print engine: monthly books for Amazon KDP, with `.jot` writing printed in after its week, and `render-jot.mjs`. From Journalwright Studio (the Journaling repository), generic profile and packs only; its print editor is retired |
| `studio/src/` | Five Studio modules the engine's tests use (diff, canonical JSON, snapshots). Not the Studio server |
| `tools/` | `privacy-check.mjs` (the gate before the site is published; `test-privacy.mjs` tests it), `build-examples.mjs` (the site's example diaries, converted from Project Gutenberg; `--check` verifies them), `manifest.cjs` (rewrites or checks [`MANIFEST.json`](MANIFEST.json): size and SHA-256 of every file), `build-spec-pdf.cjs` (the spec PDF from its Markdown), `build-parser-zip.py` (the site's parser download) and `test-files.mjs` (plain `.jot` vs packaged `.jotz`, by content) |

## Start here

New to Jot? Read [Writing in Jot](docs/guide/writing-jot.md) (ten minutes), then [Using the template editor](docs/guide/template-editor.md).

## Jot: parser and workspace

    node --test parser/test.mjs parser/proofread-test.mjs parser/container-test.mjs parser/charts-test.mjs
    node site/test-core.cjs
    python3 -m http.server 8000 --bind 127.0.0.1 --directory site/dist      # http://localhost:8000/ (why Jot), /write/, /editor/, /convert/, /guide/, /examples/ and /scan/

## Numbers, charts and the weekly dashboard

Numbers you write (sleep hours, steps, a 1–5 mood) are `measurement` records; a `:::record chart` asks for them to be drawn, one small
chart per metric (spec §5.2.1). The workspace, the template editor's **Page** view and the VS Code extension draw the same charts with
the same code (`parser/charts.mjs`, `parser/preview.mjs`). The template editor's **Weekly dashboard** starter sets up a week page of six
widgets (the "rule of 7"), and the printed week plan can carry graph grids to plot by hand (`week_right` options `graphs`). Guide:
[Numbers and charts](docs/guide/template-editor.md#numbers-and-charts).

## Jot for VS Code

    cd vscode && node sync.mjs && npx @vscode/vsce package          # then Extensions → … → Install from VSIX
    node vscode/sync.mjs --check && node --test vscode/test-extension.mjs && node vscode/test-preview.cjs

Details: [vscode/README.md](vscode/README.md).

## Template editor: a journal's shape as a .jot

A separate editor just for Jot, in the site at `/editor/`: put together what each day, week and month asks (writing space, prompts,
checkboxes, scales, blanks, time blocks ...), then download a plain-text `.jot` to fill in by hand, one file for the month or a file a
week for InkDeck. No page layout or scanning. Undo, drag to reorder, reopen any downloaded `.jot` to get its template back, and import a
print `daypage.json`. Details: [site/README.md](site/README.md#template-editor-disteditor).

    python3 -m http.server 8000 --bind 127.0.0.1 --directory site/dist      # http://localhost:8000/editor/
    cd site && node --test test-editor.mjs && node test-editor-ui.cjs

## Journal builder: a print book's structure as a .jot

The print editor is retired: the template editor above is where journals are made. From the command line, the print engine can still
write a book's structure (`journal/content/book.json` and `daypage.json`) as a `.jot` to fill in:

    cd journal && npm ci && node render-jot.mjs month 2026-10 [--per week]

Details: [journal/README.md](journal/README.md#jot-files-to-fill-in-the-book-as-a-jot).

## Journal builder: .jot into a book

Needs Node 20+, Chromium (or `CHROMIUM_PATH`), Python 3 with pillow, and poppler-utils for the font check.

    cd journal && npm ci && npx playwright-core install chromium
    KW_JOTS=jots-sample node render.mjs month 2026-10 test.ics      # -> out/m2026-10/, with the sample jots
    node check.mjs m2026-10                                         # every page fits: "[] 0"
    node test-jots.mjs                                              # the Jot pages test

Each dated entry (`### 2026-10-25`, a `Date:` line, or a `YYYY-MM-DD.jot` file name) prints on pages of its own after that week's day
pages, under the fixed DATE / TITLE / TAGS header. Your own writing goes in `journal/private/jots/` (ignored by git) or wherever
`KW_JOTS` points. Details: [journal/README.md](journal/README.md#jot-pages-jot-writing-in-the-book).

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
new files start with the Jot metadata block, and ZIP-packaged `.jot` files are refused rather than opened as text. Point `KW_JOTS` at
the card (or a copy of it) to print those notes into the month's book.

## The site (GitHub Pages)

`site/dist/` is published to GitHub Pages from `main` by [`.github/workflows/pages.yml`](.github/workflows/pages.yml), only after
`tools/privacy-check.mjs` (nothing personal, private or secret, including inside archives and PDFs) and the tests pass. Turn it on
once in **Settings → Pages → Source: GitHub Actions**. Details: [site/README.md](site/README.md#publishing-github-pages).

    node tools/privacy-check.mjs        # what the workflow runs before it publishes

## Privacy

Nothing personal is in this repository: the builder's `content/profile.json` is the generic sample (Northlight, Lakemont, MN), and the
only content packs are `generic` and `puzzles-sample`. Calendars (`*.ics`) and `journal/private/` are git-ignored. Keep it that way:
your profile, calendars and journal writing stay local.

## Status and licences

Jot v1 is a draft (spec 1.0.0-draft.3, parser 0.1.0); see `DECISIONS.md` and the roadmaps. The builder is MIT
([journal/LICENSE](journal/LICENSE)); the parser's vendored libraries carry their own notices in `parser/vendor/`. No project-wide
licence is asserted for the Jot specification and parser yet.
