# Working on the Jot website

Rules for `site/`, on top of the repository's root `AGENTS.md`. `site/dist/` is published to GitHub Pages as is, so keep notes like this one outside it.

## Running and testing

Serve the site with `python3 -m http.server 8000 --directory site/dist`; open `/write/` or `/editor/`.

Browser suites are `site/test-*-ui.cjs`. Run `npm ci` at the repository root for axe-core and provide Playwright with Chromium; each suite starts its own local server. Select the suites relevant to the change:

- Music changes: `node site/test-music-ui.cjs`.
- Include changes (`parser/include.mjs`, the workspace's `.jotz` includes): `node site/test-include-ui.cjs`.

- Writer preferences, focus mode, quick notes and return to position: `node site/test-prefs-ui.cjs`.
- Your life online (`import/`, `jot/archive.mjs` from `converter/archive.mjs`): `node site/test-import-ui.cjs`; changes to `import/engine.mjs` or `import/app.mjs` also run the desktop suite (`desktop/README.md`) when it can be built.
- Locking (`jot/lock.mjs`, `jot/passkey.mjs`, the writer's lock, unlock, ways in, autosave and Download locked): `node site/test-lock-ui.cjs` (passkeys on Chromium's virtual authenticator).

- Voice practice changes: `node site/test-voice-ui.cjs` (Chromium's fake microphone plays a generated tone).

- Health import changes (`health-import.mjs`, `jot/health.mjs`): `node site/test-health-ui.cjs`.
- Styling changes: the relevant paper, color, highlight-blend and layout suites. Check mobile light/dark mode and accessibility.
- Palettes, moodboards and the palette tools: `node site/test-palette-ui.cjs`.

## Conventions

- Keep the homepage informational, with renderer-backed examples. Do not restore an editor or input form there.
- Preserve the reference Mildliner palette in `site/dist/jot/palettes.mjs`. Highlights are translucent strokes above ink, using multiply blending.
- Preserve relative URLs for GitHub Pages subpaths, keyboard access, mobile layouts and accessible labels/status messages.
- The desktop app (`desktop/`) loads these pages unchanged and adds `window.jotDesktop`. Pages must work fully without it; check for it, never require it.
- `site/dist/jot/` holds copies of `parser/` and `converter/` modules: change the canonical module, then copy it. `site/dist/guide/` is generated from `docs/guide/` by `site/build-guides.mjs`.

## Listening capture (`site/dist/jot/music.mjs`)

- Never upload journal text as part of music capture. No background playback polling, microphone capture or media import belongs in the listening tool.
- Spotify tokens stay in page memory; only public app identifiers and opted-in usernames may persist. Fetching music fills review fields; adding a note requires the user's Add action.
- Label recently played tracks separately from reported current playback. Do not invent timestamps or turn stale history into “playing now.”

## Voice practice (`site/dist/jot/voice.mjs`)

- The microphone is a scoped exception for this tool only: opened after an explicit Start, analysed in the page, never recorded, stored, played back or sent. Stop, closing the dialog and leaving the page release it (stop every track, close the AudioContext) and show "Microphone off".
- Only an optional, user-chosen target range may persist (local storage, wrapped in try/catch). No gendered defaults, scores or judgement words.
- Measuring fills the dialog; the journal changes only on Add, with plain-text records. Recordings are files the person made elsewhere and attached.
- Announce readings through a throttled live region, never every frame.
