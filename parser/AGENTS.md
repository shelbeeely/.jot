# Working on the parser

Rules for `parser/`, on top of the repository's root `AGENTS.md`. This is the canonical code: the site, the VS Code extension and the parser download all carry copies of it.

## Before changing behavior

- Read `DECISIONS.md` (it overrides older specification text), then `parser/README.md`, which with the tests is the implementation contract for version 0.1.
- Keep `parse` → `stringify` source-preserving: the original text must round-trip byte for byte.
- Keep the package self-contained: no runtime fetches or new dependencies. Third-party code lives in `vendor/` with its licence beside it.
- Changes to the format itself belong in `specification/`, with fixtures in `specification/conformance.json`.

## Keep Writer aligned with format changes

A format/parser/container/protection change must include the corresponding Writer support in the same change, as required by root `AGENTS.md`. Check opening, source/visual editing, preview, assets, persistence, search, locking and file import/export/save paths; regenerate shared copies and run relevant format plus Writer tests. Update the format roadmap (`specification/ROADMAP.md`) and its dependent application work (`WRITER-ROADMAP.md`). Do not declare a format feature complete while Writer still cannot handle it.

## After changing a module

1. Copy each changed module to `site/dist/jot/` (CI compares `jot`, `timezone`, `container`, `proofread`, `charts`, `preview`, `handwriting`, `styles`, `palette`, `export`, `automation`, `connect`, `include`, `query`, `health`, `model3d`, `model3d-view`, `epub`, `vendor/chart`, `vendor/marked`, `vendor/three` and `fonts/`). `converter/convert.mjs` is copied there the same way.
2. Run `node vscode/sync.mjs` for the extension's copy.
3. After changing `handwriting.mjs`, run `node tools/build-handwriting-css.mjs`; never edit `handwriting.css` by hand.
4. Run `python3 tools/build-parser-zip.py` for the site's parser download, then `node tools/manifest.cjs` last.

`node tools/check-generated.mjs` confirms the copies, CSS and manifest; the zip has its own `--check`.

## Tests

`node --test parser/*test.mjs` covers this package; also run `node --test tools/test-files.mjs` for the conformance file cases. Rendering changes need the site's paper, color, layout and highlight-blend browser suites (see `site/AGENTS.md`).
