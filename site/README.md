# Jot site

The site: the home page, the writing workspace (`/write/`), the template editor (`/editor/`), the converter (`/convert/`), Your life
online (`/import/`), the guides and the examples. The desktop app (`../desktop/`) loads these same pages. See [the user guides](../docs/guide/README.md) for feature instructions and [AGENTS.md](AGENTS.md) for test selection.

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

`dist/` is the committed, buildless site. Serve it from the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory site/dist
```

| Area | Entry point and implementation |
| --- | --- |
| Home | `index.html`, `home.css`, `home.mjs`; renderer-backed examples |
| Writer | `write/index.html`, `studio.mjs`, `studio.css` |
| Template editor | `editor/template.mjs` (pure model/generator), `editor/app.mjs`, `editor/editor.css` |
| Diary converter | `convert/worker.mjs`; shared `converter/convert.mjs` |
| Social-data importer | `import/engine.mjs`, `import/worker.mjs`; shared `converter/archive.mjs` |
| Scanner | `scan/scanner-core.js` (geometry), `scan/app.js` (camera, images and PDF) |

`dist/jot/` contains generated copies of canonical parser/converter modules; edit their sources. No external runtime dependencies
are fetched. Diagram engines and handwriting OCR are not implemented. The scanner handles images, not parsed journal text.
The [desktop app](../desktop/README.md) loads these pages with an optional native bridge.

## Template editor (`dist/editor/`)

The [template guide](../docs/guide/template-editor.md) covers blocks, zones, page layout, starters and save/reopen behavior.
Downloaded journals retain their template in a hidden `jot-template` comment. The generator escapes text markers and prefixes
colliding record fields with `x-`. Sample chart numbers appear only in preview. Imports are validated field by field.

Run `node --test site/test-editor.mjs`, `node site/test-editor-ui.cjs` and `node site/test-layout-ui.cjs` from the repository root.

## Guides (`dist/guide/`)

The user guides are written in `../docs/guide/*.md` (readable on GitHub) and built into pages here with the parser's Markdown library:

    node build-guides.mjs            # after editing a guide; the pages are committed
    node --test test-guides.mjs      # pages current, every Jot example valid, every link real, the guide matches the editor

`test-editor-ui.cjs` also opens the guide pages at 390 px in light and dark and runs axe on them.


## Conversion and locked journals

[Converting](../docs/guide/converting.md) documents diary and social-data import. Browser conversion runs in module Web Workers;
the desktop importer reads from disk through `window.jotDesktop`. Service exports are tested with fictional samples, with limited
verification against real exports. Neither converter uploads source files.

[Locking](../docs/guide/writing-jot.md#locking-a-journal) uses the shared `parser/lock.mjs` implementation and site-only
`dist/jot/passkey.mjs` (WebAuthn PRF). Locked autosave retains encrypted copies; the writer relocks after inactivity.

Relevant browser suites are `site/test-convert-ui.cjs`, `site/test-import-ui.cjs` and `site/test-lock-ui.cjs`.

## Examples (`dist/examples/`)

Whole public-domain diaries as Jot (Pepys, *The Diary of a Nobody*, Blunt's *My Diaries*: 5,347 entries in 51 files, each under the
1 MiB the Jot tools open), plus the two small files from `examples/`. Built by `tools/build-examples.mjs` (`index.json`,
`index.html` and `diaries/`); don't edit them by hand. **Read** opens a file in the workspace through `/write/?open=examples/…`: the
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

## Optional connected tools

| Tool | Source | Setup and behavior | Checks (from repository root) |
| --- | --- | --- | --- |
| Listening capture | `dist/jot/music.mjs`, `dist/write/spotify-callback.html` | [Automation guide](../docs/guide/automation.md); public Spotify Client ID in `dist/jot/spotify-config.json` or Writer | `node --test site/test-music.mjs`; `node site/test-music-ui.cjs` |
| AI companion | `dist/ai-client.mjs`, `dist/ai-companion.mjs` | [Companion guide](../docs/guide/ai-companion.md); explicit bounded requests and reviewed drafts | `node --test site/test-ai-client.mjs`; `node site/test-ai-ui.cjs` |

Provider tests use mocked responses. Keep credentials out of repository files; account tokens and AI keys remain in session memory.
Native webview/CORS and live-model compatibility require separate verification. [Rendering integrations](../docs/rendering/integrations.md)
records host-specific capabilities and limits.

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
