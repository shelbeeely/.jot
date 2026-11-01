# Working on the VS Code extension

Rules for `vscode/`, on top of the repository's root `AGENTS.md`.

- `media/jot/` is a copy of `parser/` modules and fonts made by `node vscode/sync.mjs`. Never edit it directly: change `parser/`, then sync. `node vscode/sync.mjs --check` fails CI when a copy is stale.
- `extension.js` builds the preview webview; keep its page's safety rules (checked by `test-extension.mjs`) intact.
- Tests, from `vscode/`: `node --test test-extension.mjs` (no VS Code needed) and `node test-preview.cjs` (the webview in Chromium; needs Playwright). `npm test` runs the sync check and both.

- Format changes must update corresponding Writer support in the same change (root `AGENTS.md`). Also assess this extension's supported source/archive capabilities, preview, exports and generated shared modules; do not silently discard new format content. Direct `.jotz` editing remains planned until implemented and tested. Track normative work in `specification/ROADMAP.md` and editor delivery in `WRITER-ROADMAP.md`.
