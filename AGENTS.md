# Working on Jot

Jot is a plain-text journal format with a JavaScript parser, CLI, static website and VS Code extension. Read `README.md`, `DECISIONS.md` and the relevant guide before changing behavior. This file follows https://agents.md/ and applies throughout the repository. `parser/`, `site/` and `vscode/` have their own `AGENTS.md` with rules for that area; read it too before changing files there.

## Project map

- `fonts/`: original G2-style Sans, Script and Mono generators (rules: `fonts/AGENTS.md`).
- `parser/`: canonical parser, renderer, shared handwriting styles, fonts and export code (rules: `parser/AGENTS.md`).
- `site/dist/`: committed, buildless website (rules: `site/AGENTS.md`). Writer: `studio.mjs`, `studio.css`, `write/`; template editor: `editor/`. Site-only listening capture: `jot/music.mjs`; voice practice: `jot/voice.mjs`.
- `docs/guide/`: guide sources; `site/build-guides.mjs` generates `site/dist/guide/`.
- `converter/`, `cli/`, `vscode/`: converter, command-line tools and extension (rules: `vscode/AGENTS.md`).
- `desktop/`: the Tauri v2 app around `site/dist/` (Rust in `src-tauri/`, its own `npm install` and Cargo dependencies; see `desktop/README.md`). Its tests: `cargo test` in `desktop/src-tauri` and `xvfb-run -a npm test` in `desktop/`.
- `.github/workflows/pages.yml`: required checks and publication from `main`.
- `docs/methods/`: the journaling methods research behind profiles and design decisions; start from its `README.md` (rules: "Research and decisions" below).
- `docs/rendering/`: syntax, media/link, integration and e-paper rendering contracts; distinguish current host behavior from proposed device support. Regenerate `profile-coverage.md` with `tools/build-rendering-profiles.mjs`.
- `.agents/skills/to-jot/`: the agent skill for generating, converting and validating journals and templates (Codex reads it here; `.claude/skills/to-jot` is a symlink to it). Use it whenever you are asked to make a `.jot` from other material, and validate with `node cli/jot.mjs check --strict`.

## Local development

Use Node.js 22 (CI), Python 3 and, for privacy checks, `pdftotext` from Poppler. No build or dependency installation is required to use the site or CLI. The linter and browser tests need `npm ci` (dev dependencies only; the browser tests also need Playwright with Chromium); never use real account credentials in tests.

## Research and decisions

The guides in `docs/methods/` are evidence for decisions, not background reading. Load them as needed, not all at once: the `methods-research` skill (`.agents/skills/methods-research/`) gives the steps. Read `docs/methods/README.md` (index and recurring principles), then open and search the full guides relevant to the change before deciding anything about method profiles, templates, prompts, privacy, sharing, health or mood data, safety, reminders and motivation, accessibility or tone. Cite the guides that shaped a decision in `DECISIONS.md` entries and `docs/proposals/` as `docs/methods/<file>.md, line N`. Keep each guide's own evidence wording; when the research is thin, conflicting or silent, say so instead of presenting a design choice as a finding. A change that goes against a guide's advice names the guide and says why.

## Product and code conventions

- Keep `.jot` readable and editable in ordinary text editors. Optional integrations insert plain text; opening a document must not require an account or network request.
- Use the shared renderer stylesheet for site and preview. Maintain paper appearance in light/dark modes, dot-grid alignment and light-paper printing. Change `parser/handwriting.mjs`, then generate CSS; do not patch generated sheets individually.
- Follow nearby vanilla JavaScript/ES module conventions. ESLint (`eslint.config.mjs`) checks correctness only, not formatting; fix findings rather than disabling rules inline. Avoid new runtime dependencies or externally hosted fonts/scripts. Treat imported documents and service metadata as untrusted; use DOM text APIs and validate URLs.
- Write reader-facing copy (pages, guides, status messages, descriptions) in the voice of `docs/brand/voice.md`, and use the canonical descriptions in `docs/brand/messaging.md`; the brand book is `docs/brand/README.md`.
- External service requests must be explicit. Keep secrets and account tokens out of Git, journals, local storage and exports.

## Format changes must update Writer

Whenever `.jot` or `.jotz` changes, update Jot Writer to support that change in the same implementation change. This includes syntax/semantics, manifest/schema, member paths, media/reference handling, encryption, metadata, search and rendering contracts. Do not mark a format change complete with only a specification or parser update, or silently defer Writer support.

Trace each affected path: opening, editing, source/visual round trips, preview, assets, privacy/locking, browser persistence, search, device saves, import/export, sharing and recovery. Update shared canonical modules first and regenerate browser/editor copies and distributables. Keep web and desktop/mobile consumers aligned; update native file associations, MIME/CSP rules or file bridges when affected. Preserve unrelated source, assets and protection; clearly reject unsupported capabilities instead of dropping data.

Verify relevant format/conformance tests and affected Writer workflows in the same change. Include public/mixed/protected archive cases when container/protection changes. Run native checks where available; report unavailable platform validation explicitly rather than claiming it passed. A documentation-only proposal must remain marked planned and must not claim Writer support exists.

ESP32-family interoperability is a format/crypto design constraint even while device construction and firmware delivery remain deferred. Prefer primitives available through maintained ESP-IDF cryptography, preserve exact format/KDF/AAD semantics and record resource/SDK limits. Do not claim the JavaScript ZIP/SQLite runtime runs on ESP32 or weaken protection to fit hardware; require cross-implementation vectors and real-chip measurements before support claims.

Use established cryptographic primitives through maintained platform/vendored implementations; do not invent secret-combining or threshold schemes. Audit claims must identify scope/version and must not imply that a dependency review audits the complete Jot protocol. Normal protection should be understandable and recoverable after losing one method; keep a separate recovery route, and treat strict multikey as an explicit advanced policy rather than the default solution to accidental loss. Planned setup/recovery safeguards must not be described as implemented.

Treat encryption as core Jotz/Writer v1 capability across private writing, media, metadata, derivatives, local unlocking and recovery. Preserve protection through edits/saves/imports/sharing; never silently downgrade or label local plaintext as encrypted. Public content remains a supported explicit choice. Track and verify incomplete controls, visible metadata and review/platform gaps honestly.

Treat whole-document offline readability as a v1 requirement. Complete archives must carry their saved content and local presentation dependencies; imports must not report temporary provider URLs, pending media or cached thumbnails as complete attachments. Verify network-disabled reading with a locally available reader and local unlock, and document current completeness/codec gaps rather than claiming universal media support.

Keep two separate canonical roadmaps: `specification/ROADMAP.md` for the format contract and reference/conformance work, and `WRITER-ROADMAP.md` for Writer web, desktop/mobile apps, integrations and companion editor tooling. Cross-link dependencies and update status/evidence in both when affected. Both are at the 0.1.0 prototype stage targeting v1; do not move unfinished required work beyond v1 to declare completion. `node tools/sync-roadmap.mjs` generates their published copies.

## Generated files

Never hand-edit a generated file or copy; change its source and regenerate. After changing canonical parser modules, follow `parser/AGENTS.md`. Regenerate only affected deliverables:

```sh
python3 fonts/build.py
node tools/sync-fonts.mjs
node tools/sync-navigation.mjs
node tools/sync-parser.mjs
node tools/sync-archive-specs.mjs
node tools/build-archive-examples.mjs
node tools/build-handwriting-css.mjs
node site/build-guides.mjs
node tools/sync-roadmap.mjs
node tools/build-methods-index.mjs
node tools/build-rendering-profiles.mjs
node tools/sync-brand.mjs
node tools/build-offline.mjs
python3 tools/build-parser-zip.py
node tools/manifest.cjs
```

Use `node tools/build-examples.mjs --index-only` for examples-page/navigation-only updates; it reuses the committed diary index without re-fetching or replacing diary source.

Run `tools/build-offline.mjs` after changing published Writer resources or guides; it generates the public offline allowlist and app icon copy. Run the manifest command last, including new files. `node tools/check-generated.mjs` runs the generated-file checks, including original font regeneration; run it before every commit. Examples are generated with `tools/build-examples.mjs`; don't hand-edit diary outputs. The logo's masters in `docs/brand/` come from `docs/brand/source/build.sh` (see `docs/brand/README.md`); `tools/sync-brand.mjs` puts them in the site's headers and icons. Avoid unrelated generated changes.

## Verification

Run relevant tests and all checks required by `pages.yml` before publishing. Original font generation needs Python 3.12 and `python3 -m pip install -r fonts/requirements.txt`; serving the committed site does not. Core checks:

```sh
python3 fonts/build.py --check
python3 fonts/test.py
node tools/sync-fonts.mjs --check
npm ci && npm run lint
node --test tools/test-privacy.mjs converter/test.mjs converter/archive-test.mjs tools/test-files.mjs tools/test-profiles.mjs parser/*test.mjs cli/test.mjs site/test-editor.mjs site/test-autocomplete.mjs site/test-device-files.mjs site/test-editor-capture.mjs site/test-live-model.mjs site/test-reference-books.mjs site/test-writer-search.mjs site/test-writer-templates.mjs site/test-writer-workspace.mjs site/test-entry-pen.mjs site/test-scribe.mjs site/test-scratchpad.mjs site/test-writing-tools.mjs site/test-guides.mjs site/test-music.mjs site/test-voice.mjs vscode/test-extension.mjs
node site/test-core.cjs
node tools/privacy-check.mjs site/dist
node tools/build-handwriting-css.mjs --check
node tools/sync-roadmap.mjs --check
node tools/build-methods-index.mjs --check
node tools/build-rendering-profiles.mjs --check
node tools/check-methods.mjs
node --test tools/test-methods.mjs
node tools/sync-brand.mjs --check
node site/build-guides.mjs --check
node tools/build-examples.mjs --check
node vscode/sync.mjs --check
python3 tools/build-parser-zip.py --check
node tools/manifest.cjs --check
```

The workflow also compares parser/converter copies and font directories. Report mocked service tests separately from live account verification.

## Git and publication

Inspect status and the remote head first; preserve unrelated work. Use the GitHub identity requested in the conversation, verify it before writing, and never silently fall back to another account. Do not force-push or rewrite shared history. A connected GitHub API may publish verified Git objects when shell push uses the wrong identity. Confirm the remote commit and a clean local tree after publishing. State any remaining provider registration/setup requirements in the handoff.
