# .jot

**Jot** is a plain-text journal format: Markdown plus a few journal marks (tasks, events, questions, records, page breaks), one file
for a moment, a day, a month or an ongoing journal. A `.jot` file is either plain UTF-8 or a ZIP package that carries images and
handwriting with the writing. This repository holds the format, its parser and web workspace, and a **journal builder** that prints
`.jot` writing into KDP-ready books.

## Map

| Path | What is there |
| --- | --- |
| [`specification/`](specification/) | Jot v1 (1.0.0-draft.2): the full specification (Markdown and PDF), AST schema, profiles, paper sizes, conformance fixtures |
| [`DECISIONS.md`](DECISIONS.md) | The latest decisions. Read this before older specification text |
| [`parser/`](parser/) | JavaScript parser (`jot.mjs`), container (`container.mjs`: packaged .jot), proofreading hints, tests |
| [`site/`](site/) | The browser workspace (`site/dist/`, static), the template editor (`/editor/`) and the scanner/handwriting tool (`/scan/`) |
| [`examples/`](examples/) | A plain-text and a packaged `.jot` |
| [`references/`](references/) | Supplied reference PDFs (background only) |
| [`journal/`](journal/) | The journal builder: monthly books for Amazon KDP, with `.jot` writing printed in after its week. From Journalwright Studio (`shelbeeely/Journaling`), generic profile and packs only |
| `studio/src/` | Five Studio modules the builder's editor and tests use (diff, canonical JSON, snapshots). Not the Studio server |
| [`BUNDLE-README.md`](BUNDLE-README.md), [`MANIFEST.json`](MANIFEST.json) | The Jot-Complete-v1 bundle's own readme and file hashes (`MANIFEST.json`'s `README.md` entry is that readme, now `BUNDLE-README.md`; it describes the bundle as received: `site/dist/index.html` has since gained the editor link) |

## Jot: parser and workspace

    node --test parser/test.mjs parser/proofread-test.mjs parser/container-test.mjs
    node site/test-core.cjs
    python3 -m http.server 8000 --bind 127.0.0.1 --directory site/dist      # http://localhost:8000/  and  /scan/

## Template editor: a journal's shape as a .jot

A separate editor just for Jot, in the site at `/editor/`: put together what each day, week and month asks (writing space, prompts,
checkboxes, scales, blanks, time blocks ...), then download a plain-text `.jot` to fill in by hand, one file for the month or a file a
week for InkDeck. No page layout or scanning. Details: [site/README.md](site/README.md#template-editor-disteditor).

    python3 -m http.server 8000 --bind 127.0.0.1 --directory site/dist      # http://localhost:8000/editor/
    cd site && node --test test-editor.mjs && node test-editor-ui.cjs

## Journal builder: design a journal, get a .jot to fill in

Arrange the book and the day page in the visual editor (blocks: check-ins, scales, writing space, time blocks ...), then download it as a
plain-text `.jot`: one month, a dated entry a day, each block written as Jot to fill in by hand (`[ ] ` ticks, `value:` blanks in
measurement records, headings with room to write). No scan zones, page codes or page layout.

    cd journal && npm ci && node render.mjs month 2026-10 test.ics && node editor/build.mjs   # the editor's page CSS comes from a sample build
    # open editor/dist/site/index.html (serve the folder over HTTP): More → Download .jot
    node render-jot.mjs month 2026-10 [--per week]       # the same file from the command line (a file a week fits InkDeck)

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

## InkDeck

[InkDeck](https://github.com/shelbeeely/inkdeck), the Bluetooth-keyboard writing firmware for the Xteink X3/X4, saves `.jot` files:
new files start with the Jot metadata block, and ZIP-packaged `.jot` files are refused rather than opened as text. Point `KW_JOTS` at
the card (or a copy of it) to print those notes into the month's book.

## Privacy

Nothing personal is in this repository: the builder's `content/profile.json` is the generic sample (Northlight, Lakemont, MN), and the
only content packs are `generic` and `puzzles-sample`. Calendars (`*.ics`) and `journal/private/` are git-ignored. Keep it that way:
your profile, calendars and journal writing stay local.

## Status and licences

Jot v1 is a draft (spec 1.0.0-draft.2, parser 0.1.0); see `DECISIONS.md` and the roadmaps. The builder is MIT
([journal/LICENSE](journal/LICENSE)); the parser's vendored libraries carry their own notices in `parser/vendor/`. No project-wide
licence is asserted for the Jot specification and parser yet.
