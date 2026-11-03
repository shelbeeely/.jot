<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/brand/jot-wordmark-light.svg"><img src="docs/brand/jot-wordmark-ink.svg" alt="Jot" width="150"></picture></p>

# Jot

**Jot things down. Get beautiful pages back.**

**Development status: 0.1.0 prototype, working toward Jot v1.** The format and Writer are not finalized. See the
[format roadmap](specification/ROADMAP.md) and separate [Writer roadmap](WRITER-ROADMAP.md) for web, desktop and mobile; required v1 work will be completed before moving beyond v1.

The website keeps **Write, Tools and Guides** in its main menu. Templates, imports, conversion, examples and typefaces live under Tools.

Read the name as *just one thought*: whatever is on your mind, one thought at a time, as brief or as detailed as it needs to be.

Jot Writer is being built first for people who have never journaled and want help getting started. Its v1 goal is to help you write
a small first entry, keep it safely and return whenever you choose. See the [first-journal brief](docs/proposals/first-journal-v1.md)
for the planned beginner experience and its release criteria.

**Encryption is core to Jot’s v1 journaling experience.** Protected `.jotz` documents must keep private writing, media and metadata safe through editing, saving and offline unlocking. The prototype supports protection after setup; independent review and the remaining protection/recovery workflows are required v1 work, not a completed-security claim.

Dedicated physical hardware and firmware are deferred to [future exploration](WRITER-ROADMAP.md#physical-hardware-and-firmware-future-exploration).
Current delivery focuses on the Jot format and Writer software.

Jot is a plain-text journal format that combines Markdown with simple marks for tasks, events, questions and ideas. Keep a moment,
a day, a month or an ongoing journal in one file, then read it as formatted pages, handwritten notes or a dashboard of your numbers.

Jot v1 uses `.jotz` as its primary journal document. It carries `.jot` entry source, media and optional entry protection in one
portable archive. Standalone `.jot` source stays readable and editable in ordinary text editors. The browser workspace,
command-line tools and VS Code extension share one parser and page renderer.

- **Write your way:** mobile and desktop writing, formatting shortcuts, find/replace, an outline, reusable templates, tasks and measurements.
- **Make it yours:** handwritten fonts, dot grids, inline colors and Journal, Notes or Plain page styles.
- **Keep and share:** plain-text journals, packaged attachments, printable pages and standalone HTML exports.
- **Keep it private:** lock a journal with a passphrase, recovery code or passkey; bring in years of posts from your social media exports.
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

### Use it online

Jot runs in your browser at **https://shelbeeely.github.io/.jot/**: open **Write** and start. Writing is local by default; optional connected tools explain what they send before you use them.

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
| [Your life online](http://localhost:8000/import/) | Turn social and blog data exports into one dated journal |
| [Guides](http://localhost:8000/guide/) | Learn the writing format and tools |
| [Examples](http://localhost:8000/examples/) | Read or download converted public-domain diaries |
| [Fonts](http://localhost:8000/fonts/) | Try Jot's original fonts and inspect their glyphs and spacing |

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
| `.jotz` | Primary v1 ZIP document: entries, media, public-only SQLite search and optional per-entry encryption | Every journal, including text-only and protected journals |
| Exported `.html` | A standalone formatted page with its assets included | Sharing or reading without the workspace |
| Printed PDF | Pages produced through the browser's **Print / PDF** action | Printing and fixed-layout copies |

Writer saves and downloads `.jotz` by default. Plain `.jot` and Markdown are source import/export options. Public entries remain readable inside the ZIP; protected entries and attachments use AES-256-GCM. Dates and encryption metadata remain visible. [Container](specification/Jot-Container-v1.md) · [Protection](specification/Jot-Protection-v1.md). There is no separate `.jotlock` format or migration layer.

## Features

Writer supports formatted and handwritten pages, tasks, measurements and charts, reusable templates, print and standalone HTML export.
The detailed instructions live in the guides:

| Use | Guide |
| --- | --- |
| Writing, colors, page styles and locking | [Writing Jot](docs/guide/writing-jot.md) |
| Daily, weekly and monthly templates | [Template editor](docs/guide/template-editor.md) |
| CSV, calendars, service connections and listening capture | [Automation](docs/guide/automation.md) |
| Old diaries and social-data exports | [Converting](docs/guide/converting.md) |
| Optional OpenRouter or local-model drafts | [AI companion](docs/guide/ai-companion.md) |
| Offline use, sharing, nearby transfer and annotations | [Browser tools](docs/guide/browser-tools.md) |
| Syntax, media, integrations and e-paper readers | [Rendering](docs/rendering/README.md) |

### Jot for VS Code

For syntax highlighting, live preview and HTML export, follow [extension setup](vscode/README.md).

### Desktop app (Tauri v2)

The app wraps the site with native file opening, Save dialogs and streamed archive reading. Built from source and tested on Linux;
see [desktop setup and platform limits](desktop/README.md).

## Repository map

| Path | What is there |
| --- | --- |
| [`specification/`](specification/) | Jot v1 (1.0.0-draft.3): the full specification (Markdown and PDF), AST schema, profiles, paper sizes, conformance fixtures |
| [`DECISIONS.md`](DECISIONS.md) | The latest decisions. Read this before older specification text |
| [`parser/`](parser/) | JavaScript parser (`jot.mjs`, with fuller formatting), container (`container.mjs`: packaged `.jotz`), charts (`charts.mjs`), the page preview (`preview.mjs`), page styles (`styles.mjs`) and the standalone export (`export.mjs`), handwritten pages on a dot grid (`handwriting.mjs`, fonts in `fonts/`), archive protection (`lock.mjs`), automation (`automation.mjs`, `connect.mjs`), proofreading hints, tests |
| [`fonts/`](fonts/) | Original Jot Sans, Jot Script and Jot Mono sources, deterministic Python generators, bundled WOFF2 fonts, glyph outlines and catalog |
| [`site/`](site/) | The site (`site/dist/`, static): the home page (why Jot), the writing workspace (`/write/`), the template editor (`/editor/`), the diary converter (`/convert/`), Your life online (`/import/`); the scanner (`/scan/`) is unfinished and not linked |
| [`vscode/`](vscode/) | **Jot for VS Code**: `.jot` syntax colors and a live page preview with charts, from the same renderer as the site |
| [`desktop/`](desktop/) | **The desktop app** (Tauri v2): the site's pages plus large exports, Save dialogs and a locked-down network; its own Rust and npm dependencies |
| [`docs/guide/`](docs/guide/) | **User guides** ([index](docs/guide/README.md)): writing, the template editor, automation, your own manual, voice practice, converting diaries and data exports, turning anything into Jot (also pages on the site, `/guide/`) |
| [`docs/rendering/`](docs/rendering/) | **Rendering contracts**: full syntax, media/links, integrations, all 62 profiles, touch/button navigation, and a FreeInk/X4 browser-to-frame example |
| [`docs/brand/`](docs/brand/) | **The brand book**: the iota and the "ιot" wordmark, colors, type, [voice](docs/brand/voice.md), [messaging](docs/brand/messaging.md), icons and the pen that draws the logo |
| [`docs/proposals/`](docs/proposals/) | Design proposals: one editor for every method, Jot books, sharing and collaboration |
| [`cli/`](cli/) | `jot`, the command line: tasks, events, numbers, calendar and CSV out, numbers in, today, rollover, review, lock and unlock, check, webhooks, Todoist |
| [`converter/`](converter/) | `jot-convert`: plain-text diaries (your own, or Project Gutenberg's) to dated `.jot` entries; `jot-archive`: social and blog data exports to a journal |
| [`docs/methods/`](docs/methods/) | Research for all 62 method profiles: 28 sections per guide, practical examples and scoped evidence (CC0) |
| [`examples/`](examples/) | A plain `.jot` and a packaged `.jotz`. Whole diaries as Jot (Pepys, *The Diary of a Nobody*, Blunt) are on the site's Examples page, [`site/dist/examples/`](site/dist/examples/) |
| [`references/`](references/) | The historical DotJot document (background only) |
| `tools/` | `privacy-check.mjs` (the gate before the site is published; `test-privacy.mjs` tests it), `build-examples.mjs` (the site's example diaries, converted from Project Gutenberg; `--check` verifies them), `manifest.cjs` (rewrites or checks [`MANIFEST.json`](MANIFEST.json): size and SHA-256 of every file), `build-spec-pdf.cjs` (the spec PDF from its Markdown), `build-parser-zip.py` (the site's parser download), `test-files.mjs` (plain `.jot` vs packaged `.jotz`, by content) and `test-profiles.mjs` (the method catalogue and its site copy match, and every profile example parses as a complete record) |

## Development and validation

Use Node.js 22 to match CI. The site and CLI run without npm dependencies; lint and browser tests need `npm ci`.
Browser suites also need Playwright and Chromium. Font regeneration uses Python 3.12 and `fonts/requirements.txt`;
the publishing privacy check needs Poppler's `pdftotext`.

```sh
npm run lint
node --test parser/*test.mjs cli/test.mjs
node tools/check-generated.mjs
```

[AGENTS.md](AGENTS.md) contains contributor rules, generation commands and the full verification list.
Check [DECISIONS.md](DECISIONS.md) before changing behavior. The [Pages workflow](.github/workflows/pages.yml) defines publishing checks.

### Original font sources

[Fonts](fonts/) contains the Jot Sans, Script and Mono sources, generators and SIL OFL 1.1 license.
The site's `/fonts/` page provides samples and a glyph inspector; serving committed files needs no font build.

## The site (GitHub Pages)

`site/dist/` is published to GitHub Pages from `main` by [`.github/workflows/pages.yml`](.github/workflows/pages.yml), only after
`tools/privacy-check.mjs` (nothing personal, private or secret, including inside archives and PDFs) and the tests pass. Turn it on
once in **Settings → Pages → Source: GitHub Actions**. Details: [site/README.md](site/README.md#publishing-github-pages).

    node tools/privacy-check.mjs        # what the workflow runs before it publishes

## Privacy

The browser writing tools process journals locally. Spotify sign-in and playback fetches are explicit actions in Write; journal text stays local.
Locking and Your life online run entirely on your device. Webhooks, Todoist and weather requests are explicit CLI or VS Code actions;
see [Automation and connections](docs/guide/automation.md) for what they send.

Repository journals are public-domain diaries or fictional examples. Keep personal journals, attachments and service credentials out
of commits. Calendars (`*.ics`) are git-ignored. The publishing privacy check scans site files, archives and PDFs before deployment.

## Status and licences

Jot v1 is a draft (spec 1.0.0-draft.3, parser 0.1.0). See [DECISIONS.md](DECISIONS.md) and the
[Writer roadmap](WRITER-ROADMAP.md) and [format roadmap](specification/ROADMAP.md) for current boundaries. The page scanner at `/scan/` is unfinished and hidden from site navigation;
diagram rendering and handwriting OCR are not implemented. The parser's vendored libraries (Marked,
Chart.js, JSZip, hash.js) carry their own notices in `parser/vendor/`; the handwriting fonts (Caveat, Playpen Sans, Shantell Sans) are
under the SIL Open Font License, with their licences in `parser/fonts/`. The original Jot Sans, Jot Script and Jot Mono fonts use SIL OFL 1.1;
their sources and license are in `fonts/`. No project-wide licence is asserted for the Jot specification,
the parser or the VS Code extension yet.

Security verification: [testing plan and current limits](docs/security/README.md). Automated checks are not an independent security audit.
