# Jot site

Product milestones: [Writer roadmap](../WRITER-ROADMAP.md), with web, desktop and mobile tracks. Format dependencies: [Jot format roadmap](../specification/ROADMAP.md).

Primary navigation is **Write, Tools, Guides**. `/tools/` groups templates, imports, conversion, examples, typefaces and technical downloads; existing tool URLs remain valid. `tools/sync-navigation.mjs` owns the menu across source pages and generated guides/examples.

The site: the home page, the writing workspace (`/write/`), the template editor (`/editor/`), the converter (`/convert/`), Your life
online (`/import/`), the guides and the examples. The desktop app (`../desktop/`) loads these same pages. Details of each are below.

## The scanner (`dist/scan/`): unfinished and hidden

The scanner is not linked from any page and its page asks search engines not to index it (`noindex`), with a note that it is unfinished.
Its files stay so it can be finished; `test-core.cjs` still tests its geometry. To bring it back: add its link to the navigation of each page
(`dist/index.html`, `dist/write/index.html`, `dist/editor/index.html`, `dist/convert/index.html`, `build-guides.mjs`, `tools/build-examples.mjs`),
remove the note and the `noindex`, and mark it again in the roadmaps. What it does:

A browser-based document scanner. Images are processed in browser memory; no image upload, analytics, OCR service or account integration is included. Published to GitHub Pages from `main` by `.github/workflows/pages.yml`, only after the privacy check and the tests pass (see below).

## Features

- Device camera and local photo import, plus drag-and-drop.
- Automatic page suggestions from high-contrast light page regions or dark connected borders, with manual correction and keyboard-accessible corner handles.
- Projective (homography) rectification with bilinear sampling.
- Named paper sizes, custom dimensions (10–5,000 mm), portrait/landscape, or estimated photo proportions.
- Color, grayscale and thresholded ink output with brightness adjustment.
- PNG/JPEG download and up to 20 reordered pages in a locally generated PDF. Known physical sizes set the PDF MediaBox; auto mode uses an 11-inch height and estimated aspect ratio.

## Limits

This is a flat-page perspective scanner, not curved-page dewarping or handwriting recognition. Edge detection is heuristic; always check corners. No QR or brand-specific code is required. Camera permission and HTTPS are required for live camera use; file import is the fallback. Photos are capped at 60 MB per file, decoded input at a 2,800 px edge and output at 2,600 px. Browser decoding may still require memory for the original photo. Extremely narrow pages and unreadable/hidden corners require user adjustment and sufficient image detail. Scans are held in memory for this tab session only; download before reload/close. Ink mode uses a global threshold and may discard faint marks; color preserves more detail.

## Source

The root (`index.html`, `home.css`, `home.mjs`) is the home page: why keep a journal in Jot, with a live example chart drawn by `jot/charts.mjs`. The writing workspace is at `/write/` (`write/index.html`, with `studio.mjs` and `studio.css` at the root); examples open there with `/write/?open=examples/…`. `/scan/` (hidden, see above) is a distinct scanner/handwriting tool, and returns to `/write/` after inserting a page.

`dist/` is buildless HTML, CSS and JavaScript. `scanner-core.js` exposes pure geometry/image functions both to browsers and CommonJS tests. `app.js` owns camera lifecycle, image handling and client-side PDF output. No external runtime dependencies are fetched.

Jot's text parser is a separate deliverable; this scanner does not treat a photograph as parsed journal text.

The workspace's **Look** control switches the page to **Handwritten** (`jot/handwriting.mjs`): a hand, an ink and a dot spacing,
**Rewrite ↻** for new wobbles, and `@page` set from `pageGeometry` so the printed writing area is whole rows of dots; the choices are
remembered in this browser (`jot-hand-v1`). The writing workspace uses the separate Jot parser with Marked for Markdown, safe DOM-only previews (`jot/preview.mjs`, shared with the template editor and the VS Code extension) that draw `:::record chart` as charts (`jot/charts.mjs`), browser spellcheck, optional pattern hints, a 62-method catalogue, local text autosave and a visible roadmap. Diagram engine rendering and handwriting OCR are not yet implemented.


## Template editor (`dist/editor/`)

A separate editor just for Jot: build the structure of a journal and download it as a plain-text `.jot` to fill in using a text editor
on a computer or phone. Optional handwritten page layout reserves grid rows per block, gaps and page starts, with paper-size and margin controls. No scan codes or drawing blocks.

- **Five zones:** before the days, each week begins, each day, each week ends, after the days.
- **Blocks:** writing space, prompt (several questions take turns, one a day), checkboxes, task lines, scale, ratings, fill-in blanks,
  numbers (measurements with units), week chart (a chart record for the week or the month), choose words, list, time blocks, table,
  words to keep, record, page title, my manual (why I keep this, what I do, my marks, after a gap). Eight starters (daily check-in, rapid log, morning pages, gratitude, gratitude weekly, day planner,
  weekly dashboard, empty). Past seven blocks in **Each week begins** the zone says so (the "rule of 7"; a note, never a refusal).
- **Text or Page:** the right-hand side shows the file as text, or as a page with its charts drawn (`../jot/preview.mjs`). **Sample
  numbers** fills empty days with stand-in numbers in the Page view only; they never reach the file.
- **Files:** one for the month, or a file a week or a day. The page checks its own output with the Jot parser.
- **The file:** `### YYYY-MM-DD | Weekday` entries, `#### ` headings to write under, `[ ] ` boxes, `[[a · b]]` choices, and ratings as
  `measurement` / `observation` records with empty values, their scales declared once at the top. Typed text never changes the
  structure: line markers are escaped, record field names that collide with reserved Jot fields get `x-`.
- **Undo / Redo** (buttons, or Ctrl+Z / Ctrl+Shift+Z outside a text field; typing in one field is one step).
- **Reorder:** drag a block by its handle (⠿), within a zone or to another one (a red line where it can't go), or use ↑ / ↓ and the
  **Zone** control in its options from the keyboard.
- **Every .jot carries its template**, in a hidden Jot comment at the end (`/*` · `jot-template: {...}` · `*/`), which readers do not
  show. **More → Open a .jot or a template** brings it back from any downloaded file (plain or packaged, filled in or not), or from a
  saved template `.json`. A `.jot` made elsewhere has none, and the editor says so.
- The template stays in this browser (localStorage). **More → Save template** downloads it as JSON. Everything opened is checked field by
  field, never trusted. Nothing is sent anywhere.

`template.mjs` is the model and generator (pure, no DOM); `app.mjs` the page; `editor.css` light and dark, 44 px targets, one column on
phones. Tests:

    node --test test-editor.mjs      # the generator: every block, starters, splits, escaping, the template in a .jot, charts
    node test-editor-ui.cjs          # the page in Chromium: editing, undo, dragging, zones, downloads, reopening a .jot, the Page view and its charts,
                                     # persistence, 390 px, axe (light and dark)

## Guides (`dist/guide/`)

The user guides are written in `../docs/guide/*.md` (readable on GitHub) and built into pages here with the parser's Markdown library:

    node build-guides.mjs            # after editing a guide; the pages are committed
    node --test test-guides.mjs      # pages current, every Jot example valid, every link real, the guide matches the editor

`test-editor-ui.cjs` also opens the guide pages at 390 px in light and dark and runs axe on them.


## Diary converter (`dist/convert/`)

Plain-text diaries (your own, or Project Gutenberg's) to dated `.jot` entries, in the browser: the same converter as
`converter/jot-convert.mjs` (`dist/jot/convert.mjs` is an exact copy of `converter/convert.mjs`), run in a module Web Worker
(`worker.mjs`) so a 6 MB diary doesn't freeze the page. Open a file, drop one, paste text, or fetch a web address (where the site
allows it); every command-line option has a control; download one file, all of them as a zip, or copy the text. Each file is checked
with the Jot parser. Nothing is uploaded or stored.

    node test-convert-ui.cjs         # the page in Chromium: the same files as the command line for every option, the zip, refusals,
                                     # fetch (allowed and not), 390 px, 44 px targets, axe (light and dark)

## Your life online (`dist/import/`)

Social and blog data exports (X/Twitter, Mastodon, Facebook, Instagram, Tumblr, Reddit, Google Keep and Blogger) into one dated
journal, in the browser: `dist/jot/archive.mjs` is an exact copy of `converter/archive.mjs`. `engine.mjs` reads the exports and makes
the journal; in the browser it runs in a module Web Worker (`worker.mjs`), in the desktop app on the page, reading through
`window.jotDesktop` (any size, from disk). ZIPs, ZIPs inside them and unzipped folders; nothing is uploaded or stored. Linked from the
converter page.

    node test-import-ui.cjs          # the page in Chromium: four services at once, choices, a .jot a year, packed photos, 390 px, axe

## Locked journals (`dist/jot/lock.mjs`, `dist/jot/passkey.mjs`)

The writer's **Lock with a passphrase** and **Ways in** use `lock.mjs` (a copy of `parser/lock.mjs`, [Jotz v1
protection](../specification/Jot-Protection-v1.md)) with the browser's built-in Web Crypto, and `passkey.mjs` for passkeys and security keys (WebAuthn
PRF). Protected entries, media and settings are encrypted in the persisted archive; public entries stay public; the page locks again after time away.

    node test-lock-ui.cjs            # lock, unlock, ways in, autosave, Download locked; passkeys on a virtual authenticator

## Examples (`dist/examples/`)

Whole public-domain diaries as Jot (Pepys, *The Diary of a Nobody*, Blunt's *My Diaries*: 5,347 entries in 51 files, each under the
1 MiB the Jot tools open), plus the two small files from `examples/`. Built by `tools/build-examples.mjs` (`index.json`,
`index.html` and `diaries/`); don't edit them by hand. **Read** opens a file in the workspace through `../?open=examples/…`: the
workspace takes only `.jot`/`.jotz` paths under `examples/` on this site, and asks before it replaces writing of your own.

    node test-examples-ui.cjs        # every link answers, Read opens the diary, asks before replacing, refuses other paths, 390 px, axe

## Publishing (GitHub Pages)

`.github/workflows/pages.yml` publishes `dist/` from `main`. Pull requests run the same checks without publishing. Before anything is
uploaded:

- **Privacy check** (`tools/privacy-check.mjs`): reads every file, the files inside `.zip`/`.jotz` and the text of PDFs. It refuses the
  owner's personal name, place and book title, calendar data, keys and tokens, any email address, private paths (`private/`, `.ics`,
  `.env`, a profile), any kind of file the site doesn't publish, and files over the Pages limits. `node --test tools/test-privacy.mjs`
  shows it catching each one, including inside a compressed archive.
- **Current:** the guides, the examples, `MANIFEST.json` and the copies of the parser and converter match their sources.
- **Tests:** the parser, converter, editor generator and guides (the browser tests run locally: `test-*-ui.cjs`).

To turn it on once: the repository's **Settings → Pages → Source: GitHub Actions**. The site is then at
`https://<owner>.github.io/<repository>/`; every link in it is relative, so it works there or on a custom domain.

Template layout browser regression: `node site/test-layout-ui.cjs` from the project root (Playwright with Chromium).

## The logo and icons

Every page header shows the "ιot" wordmark inline (it takes the page's ink, light or dark; its accessible name is "Jot home"), and every page
links `favicon.svg`, `favicon.ico` and `apple-touch-icon.png` at the site's root. All come from the masters in
`docs/brand/` through `node tools/sync-brand.mjs` (the guides and examples through their generators); `--check` runs in CI.

## Shared paper and handwriting styles

All site pages and journal previews load `dist/jot/handwriting.css`. Generate it from the renderer with
`node tools/build-handwriting-css.mjs` at the project root; CI checks it with `--check`. Existing page styles define structure.
The shared sheet supplies the same bundled fonts, cream/charcoal paper, grain, dots and ink palette for the site and preview.
System light/dark mode is supported; print uses light paper. Exports embed the linked sheet and fonts to stay standalone.

The homepage has no editor or form. Its color and formatting gallery uses actual Jot previews with expandable source examples.
Browser regression: `node site/test-paper-ui.cjs` (Chromium, Playwright and axe-core).

Mildliner reference colors live in `dist/jot/palettes.mjs`, shared by the writing palette and homepage swatches. All five groups and 25 hex codes are checked against the reference chart.

## Listening capture

`dist/jot/music.mjs` builds plain-text listening notes and provides optional Spotify PKCE capture. `dist/write/spotify-callback.html`
returns the authorization result to the originating writer window. Set a public Client ID in `dist/jot/spotify-config.json`, or enter
one in the writer. Never put a client secret or account token in the repository. See the automation guide for provider setup and limits.
Tests: `node --test site/test-music.mjs` and `node site/test-music-ui.cjs` (Spotify HTTP responses are stubbed).

Last.fm and ListenBrainz public-profile reads are also in `music.mjs`: explicit now/recent requests, reviewable selection, source and
listen-time provenance, no submissions or journal uploads. Last.fm needs an application API key in page memory; ListenBrainz public
reads need only a username. Libre.fm is documented as manual-only until direct browser API access can be verified.

## BYOK writing companion

`dist/ai-client.mjs` owns the bounded OpenRouter/local Chat Completions request and strict response/Jot validation;
`dist/ai-companion.mjs` owns the opt-in inline review UI. No new runtime dependencies, storage, automatic requests or cloud fallback.
Run `node --test site/test-ai-client.mjs` and `node site/test-ai-ui.cjs` (mocked responses, never real keys).
See [the companion guide](../docs/guide/ai-companion.md). Desktop CSP allows OpenRouter and loopback servers; native webview/CORS
behavior still requires device verification.

Filename variable checks: `node --test parser/formatting-test.mjs` and `node site/test-document-variables-ui.cjs`.
The browser suite checks literal/code boundaries, safe basename rendering, includes, exports and Writer filename changes.


## Offline, sharing, annotations and nearby transfer

Browser modules are `browser-session.mjs`, `browser-tools.mjs`, `capture-core.mjs`, `inbox.mjs`, `nearby.mjs`, `annotation.mjs` and
`ink.mjs`. `sw.mjs` caches only paths in generated `offline-files.mjs`; the basic manifest omits incoming sharing until a worker
controls Writer, then the share-enabled manifest is selected. IndexedDB schema v3 adds a separate unencrypted inbox. No server
or remote signaling infrastructure is added. Dependencies in `dist/vendor/browser/` are locally bundled with pinned versions and
licenses. The existing hidden scanner stays hidden.

After changing published resources or guides, run `node tools/build-offline.mjs` (also copies the existing app icon), then the
manifest generator last. Run `node --test site/test-browser-tools.mjs`, `node site/test-browser-tools-ui.cjs` and
`node site/test-nearby-ui.cjs`; the latter establishes a real local WebRTC connection in Chromium. Native OS sharing and physical
devices remain separate checks. See [Browser tools](../docs/guide/browser-tools.md).


Connected source adapters live in `dist/connected-sources.mjs`, with explicit capabilities and bounded on-demand requests;
`connected-sources-ui.mjs` provides the shared review/insertion UI. Providers: Open-Meteo daily weather and selected read-only Home Assistant states/history. Run
`node --test site/test-connected-sources.mjs site/test-home-assistant-source.mjs`, `node site/test-connected-sources-ui.cjs`
and `node site/test-home-assistant-ui.cjs`; provider responses are mocked.
Native webview/CORS and live account checks remain separate. No contextual prose analysis is enabled.


Writer now saves Jotz v1 archives by default, including text-only journals. `archive-tools.mjs` provides entry privacy/local search;
`jot/archive-*.mjs` and bundled SQLite WASM implement ordered source, independent member encryption, protected media/catalog and
public-only FTS5. All durable workspace content is a single archive in IndexedDB `documents`; localStorage holds only a pointer.
Regenerate canonical modules with `node tools/sync-parser.mjs` and specs with `node tools/sync-archive-specs.mjs`. Run
`node --test parser/archive-test.mjs parser/container-test.mjs parser/lock-test.mjs` and `node site/test-archive-ui.cjs`, plus locking,
file-saving, annotation, sharing and AI regressions. Independent crypto review and real-device/large-file benchmarks remain open.
