# Working on the Jot website

Rules for `site/`, on top of the repository's root `AGENTS.md`. `site/dist/` is published to GitHub Pages as is, so keep notes like this one outside it.

## Running and testing

Serve the site with `python3 -m http.server 8000 --directory site/dist`; open `/write/` or `/editor/`.

Browser suites are `site/test-*-ui.cjs`. Run `npm ci` at the repository root for axe-core and provide Playwright with Chromium; each suite starts its own local server. Select the suites relevant to the change:

- Music changes: `node site/test-music-ui.cjs`; persistent player: `node site/test-music-player-ui.cjs`.
- Include changes (`parser/include.mjs`, the workspace's `.jotz` includes): `node site/test-include-ui.cjs`.

- Writer preferences, focus mode, quick notes and return to position: `node site/test-prefs-ui.cjs`.

- Voice practice changes: `node site/test-voice-ui.cjs` (Chromium's fake microphone plays a generated tone).

- Health import changes (`health-import.mjs`, `jot/health.mjs`): `node site/test-health-ui.cjs`.
- Styling changes: the relevant paper, color, highlight-blend and layout suites. Check mobile light/dark mode and accessibility.
- Palettes, moodboards and the palette tools: `node site/test-palette-ui.cjs`.

## Conventions

- Keep the homepage informational, with renderer-backed examples. Do not restore an editor or input form there.
- Preserve the reference Mildliner palette in `site/dist/jot/palettes.mjs`. Highlights are translucent strokes above ink, using multiply blending.
- Preserve relative URLs for GitHub Pages subpaths, keyboard access, mobile layouts and accessible labels/status messages.
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

## Persistent music player (`site/dist/music-player.mjs`)

- Load Spotify's embed only after the user's Load action; never send writing, capture tokens or journal metadata to it.
- Keep the iframe outside journal rendering, preserve it through edits, and remove it when the user closes the player.
- The embed handles its own account/session; do not share the listening capture's tokens or add background polling.

## Music database lookup (`site/dist/media-lookup.mjs`)

- Search is off until explicitly enabled. Send only the dedicated search text and entity type; never journal writing or tokens.
- Debounce and rate-limit requests, cancel stale/closed-dialog searches, treat provider results as untrusted text, and require
  selection into the review list. Search or selection alone must never edit journal writing.
- Run `node site/test-media-lookup-ui.cjs` for lookup changes. Responses are mocked; report live-service checks separately.

## Local autocomplete (`site/dist/local-autocomplete.mjs`)

- Build suggestions from the current journal plus explicitly opened People/Places reference books only. Keep indexes in memory; never contact a service or scan other files.
- Preserve normal typing, IME, code and escapes. Only explicit selection inserts text; retain undo and keyboard dismissal.
- Measurements reuse names/units/scales, never values or implicit conversions. Do not suggest ambiguous link targets.
- Run `node --test site/test-autocomplete.mjs` and `node site/test-autocomplete-ui.cjs` for changes.

## Reference books (`site/dist/reference-books*.mjs`)

- Read only files explicitly opened by the user or library copies they explicitly chose to remember. Remembering is opt-in.
- Keep book data separate from journals/exports; only chosen names and qualified IDs become entry links. No auto-attachment.
- Preserve stable IDs, unrelated source, repeatable contact methods and unknown fields on edit. Validate coordinates and supplied
  timezone identifiers without geolocation/geocoding. Clicking a map link is the only map action.
- Run `node --test site/test-reference-books.mjs` and `node site/test-reference-books-ui.cjs` for changes.

## Entry timezone and time/location capture

- `entry-timezone.mjs` edits only the chosen dated entry, with undo; source times/dates must not be converted implicitly.
- `editor-capture.mjs` uses actual current timestamps. Device zone is allowed only as an explicit new capture source when no zone
  is declared, never as a fallback for old entries or an invalid declaration.
- Request Chromium geolocation only on Get current location, once per click, with a review step before inserting or saving a place.
  No background watches, geocoding or inferred place timezone. Ignore late results after closing; handle denial/offline/timeouts.
- Run `node --test site/test-editor-capture.mjs parser/timezone-test.mjs`, `node site/test-entry-timezone-ui.cjs` and
  `node site/test-editor-capture-ui.cjs`. Location browser responses are mocked, not live-device verification.

## Writing tools and responsive workspace

- `writing-tools.mjs`, `writer-search.mjs`, `writer-templates.mjs` and `writer-workspace.mjs` keep edits in plain source, with native
  Chromium undo and an input-event fallback. Register structural keyboard handlers after local autocomplete; respect composition
  and prevented events. Software keyboards may use beforeinput without an Enter keydown.
- Search is literal and local. Command/outline search alone never changes source. Template source must be reviewable and validated
  before explicit insertion; templates must not invent prose, measurements, dates, timestamps or location.
- Keep the preview measurable when hidden so handwritten print/export still works; view switching and collapsed controls are
  screen-only. Keep new controls out of print/export, retain focus-mode exit, and preserve manual capture preferences.
- Run the `site/test-writing-tools.mjs`, `site/test-writer-search.mjs`, `site/test-writer-workspace.mjs` and
  `site/test-writer-templates.mjs` Node tests, `node site/test-writer-ui.cjs`, and relevant preferences, color and autocomplete suites.
  Mobile browser emulation and synthetic software-keyboard events are not physical-device verification.
