# Working on Jot

Jot is a plain-text journal format with a JavaScript parser, CLI, static website and VS Code extension. Read `README.md`, `DECISIONS.md` and the relevant guide before changing behavior. This file follows https://agents.md/ and applies throughout the repository. `parser/`, `site/` and `vscode/` have their own `AGENTS.md` with rules for that area; read it too before changing files there.

## Project map

- `parser/`: canonical parser, renderer, shared handwriting styles, fonts and export code (rules: `parser/AGENTS.md`).
- `site/dist/`: committed, buildless website (rules: `site/AGENTS.md`). Writer: `studio.mjs`, `studio.css`, `write/`; template editor: `editor/`. Site-only listening capture: `jot/music.mjs`; voice practice: `jot/voice.mjs`.
- `docs/guide/`: guide sources; `site/build-guides.mjs` generates `site/dist/guide/`.
- `converter/`, `cli/`, `vscode/`: converter, command-line tools and extension (rules: `vscode/AGENTS.md`).
- `.github/workflows/pages.yml`: required checks and publication from `main`.
- `docs/methods/`: the journaling methods research behind profiles and design decisions; start from its `README.md` (rules: "Research and decisions" below).
- `.agents/skills/to-jot/`: the agent skill for generating, converting and validating journals and templates (Codex reads it here; `.claude/skills/to-jot` is a symlink to it). Use it whenever you are asked to make a `.jot` from other material, and validate with `node cli/jot.mjs check --strict`.

## Local development

Use Node.js 22 (CI), Python 3 and, for privacy checks, `pdftotext` from Poppler. No build or dependency installation is required to use the site or CLI. The linter and browser tests need `npm ci` (dev dependencies only; the browser tests also need Playwright with Chromium); never use real account credentials in tests.

## Research and decisions

The guides in `docs/methods/` are evidence for decisions, not background reading. Load them as needed, not all at once: the `methods-research` skill (`.agents/skills/methods-research/`) gives the steps. Read `docs/methods/README.md` (index and recurring principles), then open and search the full guides relevant to the change before deciding anything about method profiles, templates, prompts, privacy, sharing, health or mood data, safety, reminders and motivation, accessibility or tone. Cite the guides that shaped a decision in `DECISIONS.md` entries and `docs/proposals/` as `docs/methods/<file>.md, line N`. Keep each guide's own evidence wording; when the research is thin, conflicting or silent, say so instead of presenting a design choice as a finding. A change that goes against a guide's advice names the guide and says why.

## Product and code conventions

- Keep `.jot` readable and editable in ordinary text editors. Optional integrations insert plain text; opening a document must not require an account or network request.
- Use the shared renderer stylesheet for site and preview. Maintain paper appearance in light/dark modes, dot-grid alignment and light-paper printing. Change `parser/handwriting.mjs`, then generate CSS; do not patch generated sheets individually.
- Follow nearby vanilla JavaScript/ES module conventions. ESLint (`eslint.config.mjs`) checks correctness only, not formatting; fix findings rather than disabling rules inline. Avoid new runtime dependencies or externally hosted fonts/scripts. Treat imported documents and service metadata as untrusted; use DOM text APIs and validate URLs.
- External service requests must be explicit. Keep secrets and account tokens out of Git, journals, local storage and exports.

## Generated files

Never hand-edit a generated file or copy; change its source and regenerate. After changing canonical parser modules, follow `parser/AGENTS.md`. Regenerate only affected deliverables:

```sh
node tools/build-handwriting-css.mjs
node site/build-guides.mjs
node tools/sync-roadmap.mjs
node tools/build-methods-index.mjs
python3 tools/build-parser-zip.py
node tools/manifest.cjs
```

Run the manifest command last, including new files. `node tools/check-generated.mjs` runs the fast generated-file checks in about a second; run it before every commit. Examples are generated with `tools/build-examples.mjs`; don't hand-edit diary outputs. Avoid unrelated generated changes.

## Verification

Run relevant tests and all checks required by `pages.yml` before publishing. Core checks:

```sh
npm ci && npm run lint
node --test tools/test-privacy.mjs converter/test.mjs tools/test-files.mjs tools/test-profiles.mjs parser/*test.mjs cli/test.mjs site/test-editor.mjs site/test-guides.mjs site/test-music.mjs site/test-voice.mjs vscode/test-extension.mjs
node site/test-core.cjs
node tools/privacy-check.mjs site/dist
node tools/build-handwriting-css.mjs --check
node tools/sync-roadmap.mjs --check
node tools/build-methods-index.mjs --check
node site/build-guides.mjs --check
node tools/build-examples.mjs --check
node vscode/sync.mjs --check
python3 tools/build-parser-zip.py --check
node tools/manifest.cjs --check
```

The workflow also compares parser/converter copies and font directories. Report mocked service tests separately from live account verification.

## Git and publication

Inspect status and the remote head first; preserve unrelated work. Use the GitHub identity requested in the conversation, verify it before writing, and never silently fall back to another account. Do not force-push or rewrite shared history. A connected GitHub API may publish verified Git objects when shell push uses the wrong identity. Confirm the remote commit and a clean local tree after publishing. State any remaining provider registration/setup requirements in the handoff.
