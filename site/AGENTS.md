# Working on the Jot website

Rules for `site/`, on top of the repository's root `AGENTS.md`. `site/dist/` is published to GitHub Pages as is, so keep notes like this one outside it.

## Keep Writer aligned with the format

Every implemented `.jot`/`.jotz` format change must update Writer in the same change. Consume canonical shared modules and verify affected open/edit/preview/save, media/reference, privacy, search, persistence, sharing and import/export paths; include recovery/conflict behavior where affected. Keep the shared web implementation and desktop/mobile consumers compatible, updating platform bridges, MIME/file associations and CSP when needed. Run relevant browser checks and available native checks; report unsupported/unverified platforms honestly. Documentation-only proposals stay planned.

Whole-document offline reading is required for v1: all saved content and supported rendering must work without provider requests or caches. Keep the offline shell/runtime local, validate imported asset completion, show missing/unsupported/pending content honestly and test network-disabled archive reading plus local unlock. Do not count source-provider URLs or preview-only placeholders as complete media.

Use `WRITER-ROADMAP.md` for web, desktop/mobile, integrations and UI delivery; use `specification/ROADMAP.md` for normative format work. Cross-link dependencies and regenerate both published roadmaps with `node tools/sync-roadmap.mjs`.

## Running and testing

Serve the site with `python3 -m http.server 8000 --directory site/dist`; open `/write/` or `/editor/`.

Browser suites are `site/test-*-ui.cjs`. Run `npm ci` at the repository root for axe-core and provide Playwright with Chromium; each suite starts its own local server. Select the suites relevant to the change:

- Music changes: `node site/test-music-ui.cjs`; persistent player: `node site/test-music-player-ui.cjs`.
- Include changes (`parser/include.mjs`, the workspace's `.jotz` includes): `node site/test-include-ui.cjs`.

- Writer preferences, focus mode, quick notes and return to position: `node site/test-prefs-ui.cjs`.
- The journal map (`writer-map.mjs`): `node --test site/test-writer-map.mjs` and `node site/test-writer-map-ui.cjs`. It is a read-only view: it never edits source, shows no entry text until an entry is opened, and clears when the journal locks.
- Offline updates (`sw.mjs`, `setupOffline` in `browser-session.mjs`): the worker never takes over on its own; only Update now in the update bar asks it to (`jot-update-now`), and that tab saves and reloads. The one exception is an older install whose cache lacks the `__jot-update-aware` mark: it cannot offer Update now, so a new version takes over at once. Run `node site/test-update-ui.cjs`.
- Autosave and the unprotected-journal recovery draft (`jot-unsaved-draft-v1`): `node site/test-writer-recovery-ui.cjs`. Never write a draft for a protected or locked journal.
- The empty-journal welcome (`writer-welcome.mjs`), the phone navigation bar and the voice typing button: `node site/test-writer-welcome-ui.cjs` and `node site/test-writer-ui.cjs`. Keep the welcome optional, shown only while the writing is empty, with no counts, streaks or reminders.
- Per-entry pen and ink (`entry-pen.mjs`, the `@hand:`/`@ink:` lines and the live editor's chips): `node --test site/test-entry-pen.mjs parser/handwriting-test.mjs` and `node site/test-entry-pen-ui.cjs`. It edits only the entry at the cursor and, for "Only this entry", the next entry's heading lines; never an earlier entry.
- Keyboard shortcuts (`SHORTCUTS` in `writer-workspace.mjs`) and the formatting actions in `writing-tools.mjs`: `node site/test-writer-shortcuts-ui.cjs` and `node --test site/test-writing-tools.mjs`. Formatting shortcuts write only syntax the Jot specification defines; list word-processor shortcuts Jot cannot express under "Not in Writer" rather than inventing syntax.
- Your life online (`import/`, `jot/archive.mjs` from `converter/archive.mjs`): `node site/test-import-ui.cjs`; changes to `import/engine.mjs` or `import/app.mjs` also run the desktop suite (`desktop/README.md`) when it can be built.
- Locking (`jot/lock.mjs`, `jot/passkey.mjs`, the writer's lock, unlock, ways in, autosave and Download locked): `node site/test-lock-ui.cjs` (passkeys on Chromium's virtual authenticator).

- Voice practice changes: `node site/test-voice-ui.cjs` (Chromium's fake microphone plays a generated tone).

- Health import changes (`health-import.mjs`, `jot/health.mjs`): `node site/test-health-ui.cjs`.
- Styling changes: the relevant paper, color, highlight-blend and layout suites. Check mobile light/dark mode and accessibility.
- Palettes, moodboards and the palette tools: `node site/test-palette-ui.cjs`.
- 3D models (`jot/model3d*.mjs`, `jot/vendor/three.mjs`) and the fixed-layout EPUB (`jot/epub.mjs`, `epub-book.mjs`, EPUB ↓): `node --test parser/model3d-test.mjs parser/epub-test.mjs site/test-page-view.mjs` and `node site/test-model3d-ui.cjs`. A model is data: never run, generate or include code from a journal; the viewer loads only on Turn in 3D, reads only the journal's bytes and refuses outside URLs; nothing moves until the reader asks. A book's scripts are Jot's own and only on pages with a model; it never fetches. Set `JOT_EPUBCHECK` to EPUBCheck's jar to validate the package.
- Page view (`page-view*.mjs`, `write/pages.html`, vendored Paged.js in `vendor/pagedjs/`): `node --test site/test-page-view.mjs` and `node site/test-page-view-ui.cjs`. It shows only what Download page would save, in a frame that makes no requests, and empties on close and lock. Keep the vendored file unmodified; work around Paged.js limits in `page-view-css.mjs`.

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

## Persistent music player (`site/dist/music-player.mjs`)

- Load Spotify's embed only after the user's Load action; never send writing, capture tokens or journal metadata to it.
- Keep the iframe outside journal rendering, preserve it through edits, and remove it when the user closes the player.
- The embed handles its own account/session; do not share the listening capture's tokens or add background polling.

## Add media (`site/dist/media-catalog.mjs`, `media-picker.mjs`)

- Keyless public catalogs only, through fixed hosts (`HOSTS`); no accounts, keys or scraping. Online search is off until the person turns it on (remembered as a preference). Send only the picker's own search text or pasted link; never journal writing. Matches already in the journal come first and need no connection.
- Results are untrusted text: set with `textContent`, escaped in link labels (`escapeLabel`), and inserted only on the person's Insert, at the cursor, with Undo. Activity words (Watched, Reading…) are the person's choice; a reference alone never implies an event. Unknown links are never fetched.
- Space requests per provider, cache briefly, cancel stale searches, and show busy/offline plainly with a paste fallback. Run `node --test site/test-media-catalog.mjs` and `node site/test-media-picker-ui.cjs` (saved real responses in `site/fixtures/media/`); report live catalog checks separately. Keep the desktop CSP `connect-src` in step with `HOSTS`.

## Media journal (`site/dist/media-shelf-core.mjs`, `writer-media.mjs`)

- A read-only view like the journal map: it reads references in the prose of dated entries (never scratchpads, code or comments), fetches nothing, never edits the writing, and clears when the journal locks. Activity status comes only from the words the writer put before a link; a bare mention is "Mentioned".
- Download media journal writes a separate `.jot` and leaves the journal unchanged. Run `node --test site/test-media-shelf.mjs` and `node site/test-writer-media-ui.cjs`.

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

## Live editing and device files

- `live-model.mjs` projects exact source offsets; `live-writer.mjs` edits source, never serializes rendered HTML. Preserve opaque blocks, composition, selection, undo and plain-text paste. Context-dependent blocks use source cards; full document preview computes their results. Relocking must clear the live DOM and undo history.
- `device-files.mjs` uses explicit user-selected session handles only. Save is explicit and separate from browser autosave; detect changed files, cancel quietly, preserve newer edits and choose a new package destination when attachments are added. Locked journals must never enter its plain serialization path.
- Run `node --test site/test-live-model.mjs site/test-device-files.mjs` and both corresponding `*-ui.cjs` suites. Browser file handles and composition are mocked/synthetic; report native-device limits. Source regression suites explicitly choose Source editing with `test-source-workspace.cjs`.

Passkey changes require `node --test site/test-passkey-client.mjs` for mocked API-boundary failures and `node site/test-lock-ui.cjs` for Chromium virtual-authenticator PRF coverage. Distinguish these from real-device/provider/native-webview evidence. See `docs/security/README.md`; never claim that a passkey removes the need for portable offline recovery.


## Scratchpads and margin notes (`scratchpad*.mjs`, `margin-notes.mjs`)

A scratchpad is the entry's `~~~draft` block (spec 4.2.7): literal, kept in the file, left off formatted pages, print and page exports. The panel edits only that block of the chosen entry (found again by date and position among same-date entries), through the editor's edit path with Undo; Add to entry appends to that entry only. Write it up hands the notes to the AI companion (`writeUp`): those notes are the only context, nothing is sent before Draft writing, the reviewed draft goes after the entry's writing on Apply, and the scratchpad is unchanged. Margin notes (`marginNoteEdit` in `writing-tools.mjs`) add a `[[...]]` line after the block at the cursor and never change the annotated words. Run `node --test site/test-scratchpad.mjs site/test-writing-tools.mjs` and `node site/test-scratchpad-ui.cjs`; scratchpad changes that touch the scribe also run `node site/test-scribe-ui.cjs`.

## Scribe (`scribe*.mjs`)

Hands-free, word-for-word dictation into today's entry, at the owner's request (`DECISIONS.md`, 2026-11-04). It is the one exception to the voice-writing cleanup rule below: it writes only the Whistle transcript, verbatim, through the editor's normal edit path (Undo, autosave and protection apply), at the end of today's dated entry or, when chosen, into its scratchpad, never into an earlier entry and without moving the person's cursor. No model generates or rewrites journal text. Questions come only from `SCRIBE_QUESTIONS` (short, light, skippable; no heavy prompts) and are spoken only with `localService` speech-synthesis voices; microphone audio is ignored while one speaks. Audio is never recorded, stored or sent. The microphone stops on Stop, "stop listening", close, lock/new/open, a hidden page, page exit and five quiet minutes. Spoken commands must be a whole sentence; anything else is written as said. Media: titles already in the journal (`knownTitles`, longest first, no single short words) may be linked around the exact words said (`linkKnownTitles`), never altering them; catalog lookups happen only on a spoken "find <kind> <title>", only with Add media's online search on, send only that title, and insert only after the writer's pick ("link it" or a tap). While a composition (IME/predictive keyboard) is active, heard items wait and are written on compositionend; never drop them. Silent audio between phrases is never sent to the engine, and phrases are finished at pauses or within six seconds (Whistle slows down as an open phrase grows). Run `npm run test:scribe`: `site/test-scribe.mjs`, `site/test-scribe-ui.cjs` (mocked speech engine, a real microphone stream playing a tone, stubbed voices) and `site/test-scribe-real-ui.cjs`, which uses the real Whistle model and synthetic speech when `JOT_SPEECH_MODELS` names a folder (see `docs/security/README.md`) and skips otherwise. Report physical-microphone checks separately.

## Voice writing (`voice-writing*.mjs`, `speech-*`)

This is separate from the non-recording voice-practice tool. Voice writing uses explicit live microphone capture, local pinned Whistle/Needle WASM in a worker, and required prose cleanup before reviewed insertion (default: pinned embedded English SmolLM2 via local wllama; explicit server/BYOK alternatives remain). Optional audio/original-transcript retention starts off and must use the normal size-bounded capture/archive/protection path. Never save drafts/audio/keys in the public model or application caches. Pin and verify model bytes, preserve explicit download/import and offline cache choices, and retain local/default/no-cloud-fallback behavior plus explicit OpenRouter transcript consent/ZDR. No model-produced tool calls execute.

Close/cancel/lock/new/open/page exit must stop tracks, abort provider requests, invalidate late work, terminate the worker and clear temporary transcript/recording/key data. Bound audio queues, recordings, outputs and downloads; do not claim universal device performance or cryptographic memory erasure. Keep cleanup mandatory, raw transcript available during review, source validation and stale-target checks intact. Run `npm run test:voice-writing`, affected locking/media/Writer/offline suites and the optional real-model variant documented in the security guide. Distinguish synthetic audio and mocked cleanup-provider coverage from physical microphone/real writing-model/native-webview evidence. Vendor binaries are pinned dependencies, not independently audited Jot security.

Use `voice-backend.mjs` as the engine boundary. Keep all wllama compatibility assets local, disable native logging/prompt caching, preserve model SHA-256/size checks and English language/resource bounds, and do not interpret guard checks as factual verification. The optional complete real-model/offline suite is `site/test-voice-local-ui.cjs` with the two model-directory environment variables documented in the security guide. No native Rust backend exists until implemented and tested; avoid claiming an entire Python runtime rewrite is needed for voice.
