# Working on Jot

Jot is a plain-text journal format with a JavaScript parser, CLI, static website and VS Code extension. Read `README.md`, `DECISIONS.md` and the relevant guide before changing behavior. This file follows https://agents.md/ and applies throughout the repository.

## Project map

- `parser/`: canonical parser, renderer, shared handwriting styles, fonts and export code.
- `site/dist/`: committed, buildless website. Writer: `studio.mjs`, `studio.css`, `write/`; template editor: `editor/`. Site-only listening capture: `jot/music.mjs`.
- `docs/guide/`: guide sources; `site/build-guides.mjs` generates `site/dist/guide/`.
- `converter/`, `cli/`, `vscode/`: converter, command-line tools and extension.
- `.github/workflows/pages.yml`: required checks and publication from `main`.

## Local development

Use Node.js 22 (CI), Python 3 and, for privacy checks, `pdftotext` from Poppler. Serve the site with `python3 -m http.server 8000 --directory site/dist`; open `/write/` or `/editor/`. No build or dependency installation is required to use the site or CLI.

For browser tests, run `npm ci` for axe-core and provide Playwright with Chromium in the execution environment. Browser suites are `site/test-*-ui.cjs`; select suites relevant to the change. They start their own local servers. Never use real account credentials in tests.

## Product and code conventions

- Keep `.jot` readable and editable in ordinary text editors. Optional integrations insert plain text; opening a document must not require an account or network request.
- Keep the homepage informational, with renderer-backed examples. Do not restore an editor or input form there.
- Use the shared renderer stylesheet for site and preview. Maintain paper appearance in light/dark modes, dot-grid alignment and light-paper printing. Change `parser/handwriting.mjs`, then generate CSS; do not patch generated sheets individually.
- Preserve the reference Mildliner palette in `site/dist/jot/palettes.mjs`. Highlights are translucent strokes above ink, using multiply blending.
- Follow nearby vanilla JavaScript/ES module conventions. Avoid new runtime dependencies or externally hosted fonts/scripts. Treat imported documents and service metadata as untrusted; use DOM text APIs and validate URLs.
- External service requests must be explicit. Never upload journal text as part of music capture. No background playback polling, microphone capture or media import belongs in the listening tool.
- Keep secrets and account tokens out of Git, journals, local storage and exports. Spotify tokens stay in page memory; only public app identifiers and opted-in usernames may persist. Fetching music fills review fields; adding a note requires the user's Add action.
- Label recently played tracks separately from reported current playback. Do not invent timestamps or turn stale history into “playing now.”
- Preserve relative URLs for GitHub Pages subpaths, keyboard access, mobile layouts and accessible labels/status messages.

## Generated files

After changing canonical parser modules, copy affected modules to `site/dist/jot/` and run `node vscode/sync.mjs`. Regenerate only affected deliverables:

```sh
node tools/build-handwriting-css.mjs
node site/build-guides.mjs
node tools/sync-roadmap.mjs
python3 tools/build-parser-zip.py
node tools/manifest.cjs
```

Run the manifest command last, including new files. Examples are generated with `tools/build-examples.mjs`; don't hand-edit diary outputs. Avoid unrelated generated changes.

## Verification

Run relevant tests and all checks required by `pages.yml` before publishing. Core checks:

```sh
node --test tools/test-privacy.mjs converter/test.mjs tools/test-files.mjs parser/*test.mjs cli/test.mjs site/test-editor.mjs site/test-guides.mjs site/test-music.mjs vscode/test-extension.mjs
node site/test-core.cjs
node tools/privacy-check.mjs site/dist
node tools/build-handwriting-css.mjs --check
node tools/sync-roadmap.mjs --check
node site/build-guides.mjs --check
node tools/build-examples.mjs --check
node vscode/sync.mjs --check
python3 tools/build-parser-zip.py --check
node tools/manifest.cjs --check
```

The workflow also compares parser/converter copies and font directories. Music changes need `node site/test-music-ui.cjs`; styling changes need the relevant paper/color/layout browser suites. Check mobile light/dark mode and accessibility. Report mocked service tests separately from live account verification.

## Git and publication

Inspect status and the remote head first; preserve unrelated work. Use the GitHub identity requested in the conversation, verify it before writing, and never silently fall back to another account. Do not force-push or rewrite shared history. A connected GitHub API may publish verified Git objects when shell push uses the wrong identity. Confirm the remote commit and a clean local tree after publishing. State any remaining provider registration/setup requirements in the handoff.
