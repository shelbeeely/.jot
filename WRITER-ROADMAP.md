# Jot Writer roadmap

Updated 2 November 2026. **Current stage: 0.1.0 prototype / pre-v1.** This roadmap owns Jot Writer as a product: the web app, desktop/mobile apps, integrations and companion editor tooling. The [Jot format roadmap](specification/ROADMAP.md) separately owns `.jot`/`.jotz` syntax, container structure, encryption/interchange contracts and conformance.

The primary audience is people who have never journaled: help them make a small first entry, save it safely and return whenever they choose. The beginner path in `docs/proposals/first-journal-v1.md` remains planned until implemented and validated. `.jotz` is the primary document; `.jot` source remains independently usable.

The canonical Writer roadmap is `WRITER-ROADMAP.md`; `node tools/sync-roadmap.mjs` publishes `site/dist/WRITER-ROADMAP.md`. Status reflects source and automated checks, with physical-device and live-provider limits stated separately.

## Writer release policy and format dependencies

Remain at the **0.1.0 prototype** stage while required v1 acceptance remains open. Do not move unfinished work to v2 to declare v1 complete. Keep existing integrations and backlog requirements; any deferral needs an explicit roadmap decision. Dedicated hardware/firmware remains deferred.

Whenever the format changes, update the corresponding Writer behavior in the same change, including shared modules, open/edit/preview/save, media, search, protection, imports/exports and platform file handling. Cross-link format dependencies rather than maintain another normative grammar or container design here. A format feature is not delivered to writers until these paths work and relevant checks pass.

## Encryption is core to the journaling experience

Encryption is a required part of Writer v1 and its primary `.jotz` workflow across web, desktop and mobile. It must be understandable, local and reliable for beginners. Public/source-only use remains a deliberate supported choice; this priority does not silently enable encryption, invent a password or claim current browser data is encrypted before protection is configured.

- [ ] Make protection and recovery discoverable in the normal journal flow, with an accurate persistent status for unprotected content, mixed protection and protected content. Explain remaining visible dates/metadata and what each action saves; a local-only file is not automatically encrypted.
- [ ] Complete coherent controls for private entries, media/attachments and private metadata. Preserve the current all-attachments-protected policy after setup until per-attachment selection is implemented and tested. A public reference must not downgrade a protected/shared asset or expose its thumbnail, original filename or private metadata.
- [ ] Keep offline passphrase/recovery unlock, passphrase changes, relocking and key removal/recovery usable without a provider account. Passkeys are an additional platform-dependent route; retain a portable local recovery path. Clearly explain lost-key consequences without implying the service can reset encryption.
- [ ] Preserve protection across autosave, device save/save-as, imports, integration attachments, outgoing sharing and edits. Make plaintext source/Markdown/HTML/PDF/print exposure clear at the explicit export action; never silently replace a protected archive with a plaintext copy.
- [ ] Verify no private data leaks through cached previews, search databases, provider logs, temporary files or relocked editor/undo state. Cloud/local AI remain optional explicit tools; reading/unlocking must never send journal content for processing.
- [ ] Complete tamper, wrong-key, recovery, failed-save, shared-media, export and offline tests plus independent cryptographic review and actual-device checks before stable v1. Existing automated crypto/browser tests are prototype evidence, not an audit.

## Simple protection with loss-tolerant recovery

The owner wants established cryptography for nontechnical writers, with no journal loss from losing a single unlocking method. The normal experience should offer an everyday passkey (including a PRF-capable password manager) plus a separate independently usable recovery code. These are alternative unlock routes, not a requirement to present both every time. Do not make strict two-key unlocking the default merely to solve accidental loss.

- [ ] Deliver a plain-language setup: choose an everyday unlock method, save an offline recovery code separately, and rehearse recovery before describing the backup as ready. Keep algorithm names, threshold counts and key-slot internals out of the normal product flow.
- [ ] Provide clear lost-passkey, forgotten-passphrase and lost-backup paths: unlock with a remaining method, enroll/replace the missing method, save the updated journal and replace backups deliberately. Never imply a maintainer can reset a journal without a valid secret.
- [ ] Prevent ordinary key-management actions from accidentally leaving a journal with only one usable method; warn clearly when imported archives lack recovery or a backup has not been confirmed. Slots in the same manager/device are not independent backup locations.
- [ ] Keep recovery separate from the journal and preferably from its only device/password-manager vault. Explain that a recovery code is a full unlocking secret in this profile and that losing every usable method still makes recovery impossible without an explicitly designed escrow service, which is not planned here.
- [ ] Keep strict multikey/threshold protection as an explicitly chosen advanced design track within the existing backlog. It must not become a mandatory beginner setup or an accidental recovery bypass. Use established constructions, reviewed code and independent review of Jot's composition before implementation.

Current prototype: alternative passphrase/recovery/passkey slots exist and recovery is checked by default at passphrase setup, but users can opt out and remove ways down to a single portable method. Passkey-first setup, backup confirmation, single-method prevention and guided replacement remain planned. This decision changes no runtime default or file bytes.

## Passkey and security verification delivery

The [security verification plan](docs/security/README.md) records the threat model, repeatable commands and the real-device matrix. The prototype has a PRF-based passkey/security-key flow and Chromium virtual-authenticator coverage. Client checks now validate exact PRF lengths, credential identity, RP scope and malformed/cancelled/unsupported responses. Real Apple/Android/Windows/Linux authenticators, credential-provider sync/migration, native app associations, stable production origin, offline recovery and independent review remain unverified. Support must be reported per browser/device combination, with an available passphrase/recovery fallback; no claim that every passkey works offline or across origins.

## Whole-document offline reading: required for v1

- [ ] Make every saved complete `.jotz` readable offline, including all saved text, selected media/originals, ink components, included documents, supported presentation and integration snapshots. No provider credentials, temporary media URLs, server calls or AI may be needed to read it; protected entries retain local unlocking routes.
- [ ] Finish and validate selected downloads before attaching them or reporting a complete document. Show truthful pending/failed/incomplete/unsupported-content states and archive-limit feedback; never silently replace an original with a preview or omit a failed attachment.
- [ ] Keep parser, rendering/codec dependencies and fonts available locally in installed apps and the prepared offline web app. Document supported media capabilities and explicit local renditions; a generic image/video attachment is not proof of universal playback support.
- [ ] Test a fresh compatible reader with no provider/media cache, offline archive opening, local unlock, all entries/media, index fallback, editing, saving and reopening. Cover web offline preparation plus native desktop/mobile without requiring browser/provider credentials. Source links remain optional references with local readable labels, not reading dependencies.

## Web application track

- [ ] Deliver and validate the first-entry path without required setup, syntax knowledge, method selection or account creation.
- [ ] Stabilize browser archive persistence, local storage/quota handling, reload/relock, cross-tab conflicts, newer-edit protection and recovery from interrupted or failed saves.
- [ ] Implement the finalized format layout and capabilities as they land. Preserve exact source, order, media and privacy through source/visual editing, undo, new/open/save/save-as, sharing and export.
- [ ] Complete accessible entry/media/privacy/search workflows, responsive controls, IME and real mobile-browser verification. Keep unsupported scanner features hidden.
- [ ] Finish the planned autocomplete, connected-source, personalization, multilingual and content-layout tracks below; retain explicit review, offline writing and opt-in external requests.

## Desktop application track

- [ ] Complete native document associations and open/save/save-as for `.jotz` and `.jot`, safe atomic writes, external-file conflicts, multiple document windows and recovery.
- [ ] Validate bundled SQLite/WASM, CSP, offline assets and shared Writer feature parity in native webviews; preserve protection and prevent native plaintext sidecars.
- [ ] Verify passphrase/recovery flows and platform-supported WebAuthn; assess optional OS-keychain support separately and only with explicit user choice.
- [ ] Build, install and test supported Linux, Windows and macOS distributions, file launch, upgrades, accessibility and native dialogs. Historical successful builds do not substitute for checking the current change.
- [ ] Assess embedded local-model support such as llama.cpp, model lifecycle, licensing, resources and platform packaging as a separate BYOK/local-AI delivery task; never silently fall back to cloud models.

## Mobile application track

- [ ] Define the native/wrapper delivery contract for Android and iOS alongside the existing mobile web/PWA route; do not claim native apps exist from browser emulation.
- [ ] Verify document picker/provider access, archive opening and saving, share-sheet/inbox handoff, offline persistence, interruption/background recovery and device storage limits.
- [ ] Verify touch, software keyboards, IME, screen readers, RTL, stylus/ink, print/export and supported passkeys on physical devices. Preserve source and protection across lifecycle changes.
- [ ] Validate platform network/CORS/authentication constraints for optional integrations, microphone/location permissions only on explicit actions, and appropriate cancellation when the app closes or locks.

## Direct editor integrations and presentation

- [ ] Implement archive-aware VS Code open/edit/preview/save and assess VSCodium/Cursor compatibility while retaining standalone `.jot` support. Current extension support is source-only.
- [ ] Assess and implement an Obsidian integration under an explicit support contract: `.md` assumptions, bundled assets, protected entries, lossless saves and conflicts. Direct archive support is not yet implemented.
- [ ] Implement finalized rendering profiles, portable fonts, reflow, accessible reading order, paper pagination and private-safe optional previews. Treat generated PDF/HTML as derived exports.
- [ ] Publish tested editor/platform versions, installation requirements, unsupported capabilities and safe fallbacks. Never treat ZIP bytes as Markdown or imply ordinary editors support archives automatically.

## Writer-v1 acceptance gate

- [ ] Demonstrate the beginner create → write → save → reopen → continue path with first-time journalers.
- [ ] Verify public/mixed/protected journals and current-format fixtures across supported web, desktop/mobile and editor workflows, preserving source, assets and newer edits.
- [ ] Complete storage-failure, conflict, interrupted-write, index-fallback, protection/recovery, sharing and private-preview checks; no silent data loss or exposure.
- [ ] Complete accessibility, physical-device, realistic performance and applicable independent security review. Clearly distinguish mocked provider checks from live interoperability evidence.
- [ ] Close required Writer milestones, synchronize format dependencies and document remaining explicitly approved limitations before publishing stable **1.0.0**. Do not advance beyond v1 with required gates open.

## Core finalization evidence (2 November 2026)

Shared archive validation rejects unsupported/contradictory structure before replacing current writing; absent search-index descriptors use local source and regenerate on save. Regression coverage includes invalid import preservation, cacheless import/search/save, entry protection and existing offline workflows. The finalization pass retains the 0.1.0 status and open required v1 gates. Primary site navigation is now Write / Tools / Guides. The Tools hub groups templates, imports, conversion, examples, typefaces and collapsed technical resources; source and generated pages share one checked menu. Existing tool URLs and Writer commands remain available. This changes information architecture, not document semantics. See `docs/proposals/v1-core-finalization.md`.

## Status meanings

- Implemented: working source exists, with limitations below.
- Tested: automated checks or an observed browser interaction passed.
- Planned: a requirement, not an implemented feature.

| Area | Current state | Next acceptance milestone |
| --- | --- | --- |
| Desktop and mobile writing tools | Implemented: formatting/shortcuts, list continuation, literal find/replace, parsed outline, Commands and reviewed entry templates; Chromium desktop and 320/390px mobile emulation tested | Physical mobile keyboard/device testing, richer personal templates and recovery |
| Autocomplete and reference sources | Partial: current-journal suggestions, explicitly opened People/Places books and opt-in MusicBrainz lookup implemented | General reference tracks, media and broader smart-journal source catalog below; no background archive scan or journal upload |
| Smart journal and context sources | Implemented: shared on-demand source picker, reviewed Open-Meteo daily snapshots and selected read-only Home Assistant states/history; transport/browser tests use mocked responses | Wider providers next; contextual suggestions remain unimplemented/off; wider catalog remains planned |
| Connected-data syntax | Proposed optional references and record conventions, not standardized semantic support | Specification review, parser/renderer work, conformance fixtures and Writer insertion controls; plain prose and old files remain valid |
| WriteFreely editor and ActivityPub exploration | Planned; source-based integration assessment in `docs/proposals/writefreely-integration.md` | Evaluate editor enhancements and a reviewed publication adapter; isolated instance, license review and federation interoperability before release |
| Composable content blocks and layouts | Partial: full-width template blocks reserve handwritten grid rows, gaps and page starts; visual sizing, persistence and shared rendering are browser-tested | Responsive columns, richer mixed-media blocks and physical printer proofs |
| Paper sizes | 27 presets in spec; common/custom sizes in app | Expose complete preset registry and physical print proofs |
| Perspective scanner | Hidden from the site while unfinished (no links, noindex); core geometry/detection tests pass | Real Pixel camera, varied lighting, small pages and long pages |
| PDF export | Generated multi-page PDF validated for page count and physical geometry | Verify download flow across Android browsers |
| Handwriting | Canvas, pressure-aware pen, eraser, undo/redo, stroke import/export implemented | Mouse stroke, undo/redo and image handoff checked; physical stylus/palm testing remains |
| Spelling | Native browser spellcheck plus optional supplied word list | Locale selection, personal dictionary persistence |
| Grammar | Optional English pattern hints implemented/tested | Real grammar-engine adapter; language-specific checks |
| Mermaid and other diagrams | Fenced blocks identified/preserved; tests pass | Install local rendering engines, accessibility labels and sanitized output |
| Formatted pages and export | Journal, Notes and Plain styles; dates, task states, signs, tags and margin notes rendered for reading; one standalone HTML export; print with page numbers; browser-tested | More styles, a style of your own, EPUB |
| Simulated handwriting on a dot grid | Three open handwriting fonts with alternate letter forms, seeded wobbles, every line on a row of dots, printed pages of whole rows; browser-tested | Right-to-left and non-Latin hands, a hand of your own (a font from your writing), print proofs on paper |
| Inline colors and handwritten print | Implemented: text ink, highlight, separate strike and underline colors; 71 reference colors in grouped menus and swatches, custom hex, selection apply/clear, nesting, undo and source persistence. Handwritten is the default for new workspace preferences, template Page previews and VS Code previews. Marker, brush and pencil highlights have seeded per-passage variation; Rewrite changes the strokes while preserving source. Browser tests cover print CSS, generated PDF and standalone HTML export | Physical color-print proofs and mobile print/download checks; underline style/thickness and richer typography remain planned |
| Charts of tracked numbers | `:::record chart` drawn with bundled Chart.js on canvas per metric (gaps for empty days, a text summary and a table) in the workspace, the template editor's Page view and VS Code; tests pass | Month and year views, chosen daily aggregations (spec §5.2), charts printed from filled-in numbers |
| Task migration and reviews | Task capture, calendar/CSV export, today insertion, task rollover and weekly reviews implemented and tested in parser/CLI; workspace controls exist | Durable task links, migration history and cross-document workflows |
| Primary .jotz document and .jot source | Prototype: default ZIP archive saving, exact entry source, bundled media, per-entry protection and public search index; standalone source import/export | Complete D1–D7 in the format roadmap and Writer acceptance above: finalized layout, conformance, direct editor support, safe recovery and release evidence |
| Your life online (data exports) | Implemented and tested on made-up samples: X/Twitter, Mastodon, Facebook, Instagram, Tumblr, Reddit and Google Keep/Blogger exports into one dated journal, on the command line (`converter/jot-archive.mjs`) and in the browser (`/import/`); own words by default, private, no counts | Checks against real exports; Bluesky, LinkedIn, chat exports, Google Photos and YouTube history |
| Desktop and mobile app | First slice (Tauri v2, `desktop/`): the website's pages unchanged in the system web view, plus exports of any size read a file at a time from disk with guards against hostile ZIPs, native Save dialogs with atomic writes, a network locked to the listening services and web links opened in the person's browser; Linux debug build, `.deb` bundle and WebDriver suite pass | Open and save `.jot` source and `.jotz` archives in place with file associations; keychain-held lock passphrases on request; macOS, Windows, Android and iOS builds; passkeys where the web view offers WebAuthn |
| OCR and handwriting transcription | Planned | User-reviewed transcription linked to originals |
| Local-first persistence | Journal text/cursor autosave and IndexedDB assets implemented; browser reload checks pass | Multiple journals, storage exhaustion, cross-tab conflicts and recovery |
| Privacy and security | Jotz v1 per-entry AES-256-GCM, protected attachments/catalog, public-only SQLite FTS5 index, passphrase/recovery/passkey slots and encrypted archive persistence; wrong keys, tampering, privacy transitions and independent Node decryption tested | Independent security review, real-device passkeys, recovery UX and large/mobile archive benchmarks |
| Accessibility | Labels, focus styles and corner keyboard controls implemented; writer reduced-motion (setting and system) and higher-contrast preferences browser-tested | Mobile/screen-reader and stylus accessibility audit |
| Round-trip editing | Original parser input preserved; textarea uses browser line endings | AST edits with lossless serialization and file conflict recovery |
| Neurodivergent-friendly personalization | Partial: the writer's Preferences panel sets text size, line spacing, line length, density, higher contrast and reduced motion, and hides the preview, parser tabs, counts and decoration independently; a focus mode leaves with Escape or its button; choices stay in this browser; browser-tested | Ruling choices, deferred checking, the template editor and other surfaces, and testing with people who have different needs; no diagnosis-based preset forced on users |
| One editor for every method | Partial (proposal: `docs/proposals/editor.md`): E0 done: a "My day starts at" preference used by Today, Quick note, Carry tasks forward and Week review; Morning pages, Day planner and Gratitude starters follow their guides, plus Gratitude, weekly; unit- and browser-tested. The writer and template editor are still separate | E1: a fill view with Skip |
| Low-effort capture and re-entry | Partial: Quick note adds one line under today's entry as one undo step without moving the cursor; caret and scroll come back after a reload; an optional note for next time is offered on return with Back, Start at the end and Dismiss; browser-tested | Sketch or photo quick capture, multiple documents and prior-draft recovery |
| Multilingual writing and interface | Planned; Unicode text already preserved | Separate interface/document/checking locales, RTL/mixed scripts, IME, translated prompts and script-aware tests |


## Near-term order

1. Deliver and test a first-entry path for people new to journaling: one optional concrete starting question, writing freely,
   and no required method, syntax or setup. Follow `docs/proposals/first-journal-v1.md`; the existing writer starts blank.
2. Stabilize saving and returning: clear browser/device save states, recovery under storage failure and cross-tab conflicts,
   and safe reopen/continue behavior. Exercise the core flow on a real phone, including typing and downloads.
3. Reconcile the Jot draft with the JavaScript implementation and expand the conformance suite, including multilingual and input-composition fixtures.
4. Verify existing formatted output with physical color-print proofs and mobile print/PDF checks. Keep the unfinished
   scanner hidden until its own checks pass. Further formatting controls follow the beginner and recovery priorities.
5. Add composable content blocks with stable identity and source order, strengthening attachment bundles and recovery
   before users rely on mixed-media journals.
6. Add local diagram rendering and optional recognition/proofreading adapters without silent network uploads.
7. Expand autocomplete in stages: schema/templates and explicitly selected local sources first, then opt-in public catalogs. Explore WriteFreely publishing separately from private drafting; neither requires replacing the Jot format.

## Physical hardware and firmware: future exploration

Status: **deferred; outside current delivery scope**. Physical hardware and firmware will be explored later. Current work
focuses on the Jot format and Writer software, especially getting started, saving, recovery and returning to a journal.

No dedicated device, component supplier, parts list, enclosure, hardware prototype or firmware target is selected.
Hardware development and firmware ports are not prerequisites for Writer v1 and have no committed delivery date.
When this track resumes, assess beginner-friendly assembly from off-the-shelf parts, affordability, reliable capture,
local storage and interoperability with `.jot`, `.jotz` and Writer before selecting a device or publishing build instructions.

Existing software support for ordinary keyboards/styluses, handwriting assets, printing and files on existing computers
and phones remains part of the software tracks; it does not require a Jot-specific physical product.

## Autocomplete and reference-source expansion

The ten general source tracks below are **planned**, not available integrations. The media expansion and optional outbound
service actions are detailed in the following section. Existing current-journal suggestions, explicitly opened
People/Places books and the optional MusicBrainz search remain the baseline. Imported sources supply suggestions; they do not
establish that an event happened, add observations or change existing writing without selection.

| Priority | Source | Suggestions and next acceptance milestone |
| --- | --- | --- |
| P1 | Jot schema and templates | Suggest applicable record types, canonical field names, allowed values, units and prompt snippets. Scope by record/profile; preserve unknown fields; never invent measurement values or answers. Validate accepted source and retain undo. |
| P1 | Explicitly opened journal archives | Reuse tags, people/place/project references and entry links from selected `.jot` files or a future opened `.jotbook`. Qualify links by file/stable ID, exclude ambiguous targets, and unload/refresh indexes explicitly; never scan other files or silently persist vocabulary. |
| P1 | Contacts imports (`.vcf`) | Preview names, nicknames, organizations and contact fields before importing into a separate People book. Handle encodings, repeated fields, stable IDs and duplicate people without overwriting records. Autocomplete identity references rather than exposing private contact details as generic suggestions. |
| P1 | Calendar imports (`.ics`) | Suggest event titles, venues and source-event links from a chosen calendar file. Preserve UID/recurrence identity, timezone, all-day and cancellation distinctions. Bound recurrence expansion and let the writer choose whether an event is a plan or a journal reference; never infer attendance. |
| P2 | Open Library | Look up books, authors, works, editions and ISBNs. Show edition distinctions, verify identity, and insert a named stable reference only after selection. Assess API terms, rate limits, attribution, caching and offline fallback. |
| P2 | TMDB | Look up films, shows and episodes with year/type context. Retain verified IMDb IDs where supplied; otherwise keep the TMDB reference rather than inventing an IMDb mapping. Resolve credentials, attribution, quota and cross-origin behavior before shipping. |
| P2 | YouTube Data API | Search video, channel and playlist titles, then review a chosen result. Preserve the selected entity type and stable ID; do not auto-load playback. Establish API credential/quota handling and recoverable unavailable/private/deleted-result behavior. |
| P2 | Wikidata | Suggest public people, organizations, landmarks, artworks and other entities, with QID, type and multilingual labels for disambiguation. Keep public identity data separate from private People/Places records; names alone must not merge identities. |
| P2 | Place search through Photon or Pelias | Search named places and addresses through an appropriate hosted or self-hosted service. Show provider, address context and coordinates for review before saving to a Places book. No automatic geolocation query, inferred location history or timezone change; verify provider usage terms and availability. |
| P2 | Zotero/BibTeX imports and Crossref | Preview local bibliographic imports (including CSL JSON where supported) and optional DOI/title lookup. Preserve citation keys, DOI, title/authors and provenance; distinguish editions/versions and duplicates. Extend the same Zotero adapter with chosen library lookup and reviewed attachment of selected notes to source items. Never turn imported article text into unsupported journal claims. |

Shared acceptance: work locally for local sources; make every online provider independently opt-in with a dedicated lookup field
and clear source labels. Send only the requested lookup/type, never surrounding writing or an entire archive. Debounce and bound
requests, cancel stale searches, review attribution/retention requirements, and handle provider failures without blocking writing.
Selecting a match inserts a readable name and stable reference as an undoable edit. Do not fetch remote images or load players
merely to display a suggestion. Test keyboard, touch, IME, ambiguity, Unicode, malicious imported text and blocked browser storage.

Use ordinary named links initially where existing syntax can express an identity. Evaluate new short-reference namespaces
separately; adding a provider does not by itself change Jot v1. Remembering imported libraries stays optional and explicit.

## Media autocomplete and connected service actions

Status: **planned**, beyond existing MusicBrainz lookup and listening capture. Expand Writer to movies, TV series and
episodes, music, streaming availability, podcasts, video, books/audiobooks and games. The source assessment, interaction
contract and acceptance cases are in [media-sources-and-service-actions.md](docs/proposals/media-sources-and-service-actions.md).

1. Build a shared media picker/provider contract; preserve readable references and verified IDs with year, creator,
   edition, platform and episode context. Online lookup sends only the explicit query, not journal prose.
2. Add TMDB movie/TV lookup and optional country-specific streaming availability with required attribution. Availability
   does not establish subscription access, account history or that an item was watched.
3. Add Trakt OAuth connection and **Mark watched on Trakt** for a reviewed movie or episode, with the chosen event time.
   Then evaluate watchlist and rating actions. A title mention or journal autosave never implies a watched event.
4. Support selected history import and optional rules for explicitly confirmed activities. Separate lookup, import and
   writes; preserve rewatches, prevent duplicates and import/export loops, reconcile uncertain sends, and show failures
   without blocking the local journal. Keep tokens and delivery receipts outside portable journal content.
5. Expand through the named integrations below. Each is **planned**, with authentication, API access and compatibility
   verification required before release. Only advertise actions supported by current APIs and application access;
   URL references/file imports remain fallbacks.

| Integration | Bring into Writer | Optional outbound action |
| --- | --- | --- |
| ListenBrainz | Selected listening history and track references | Submit a confirmed listen |
| Last.fm | Selected listening history and track references | Submit a confirmed scrobble under the service's rules |
| Jellyfin | References from the user's movie/TV library | Mark an item watched or favorite |
| Audiobookshelf | Audiobook/podcast references and selected listening progress | Update confirmed progress or completion |
| Raindrop.io | Saved bookmarks and article references | Save a selected link, tags and excerpt |
| Readwise and Reader | Selected highlights and reading references | Save a selected article or highlight using the appropriate API |
| Zotero | Bibliographic references through the existing Zotero track | Attach a selected note to its source item; extend that adapter rather than create a duplicate |
| Steam | Game references and available activity/achievement data | Initially read-only; do not assume completion writes are available |
| AniList | Anime/manga references and selected lists | Confirmed watching/reading status and episode/chapter/volume progress where supported |
| Hardcover | Book/edition references and selected reading lists | Evaluate confirmed reading-status/progress updates against current API capabilities |
| SIMKL | Movie, TV and anime references/history | Confirmed watched or watchlist actions, subject to access and licensing review |
| Inoreader | Selected RSS articles and feeds | Reviewed read, star or tag actions |
| OpenSubsonic-compatible servers | Personal music-library references | Favorite, rate or submit a confirmed listen where supported |
| gPodder-compatible services | Selected subscriptions and episode activity | Confirmed episode progress or played-state submission |
| Media URL resolution | Resolve a supported pasted URL into a readable title and verified media identity | Offer only the resolved provider's supported, separately chosen actions |

Retain TMDB, Trakt, Spotify, YouTube, Open Library and IGDB as planned providers alongside these additions. Resolve pasted
URLs through known provider handlers; unsupported links remain ordinary links, without arbitrary server-side URL fetching.

First implementation slice: movie/TV references, then reviewed Trakt watch-history writes. These require provider app
configuration and live interoperability checks before release; no new service connection or account write is implemented.
Next prioritize ListenBrainz, Raindrop.io and Audiobookshelf; retain the remaining integrations in the backlog. All sends
remain optional and limited to chosen activity or excerpts. Physical hardware and firmware remain deferred.

## Smart journal: connected context and optional syntax

Status: **weather/source picker and read-only Home Assistant implemented**; wider connections, contextual suggestions and the Home Assistant card remain planned. Source catalog, defaults and boundaries are in
[smart-journal-and-connected-data.md](docs/proposals/smart-journal-and-connected-data.md). This is not a claim of
implemented connections, contextual text analysis, a dashboard card or new semantic parser support.

| Source group | Providers or sources to evaluate |
| --- | --- |
| Home context | Home Assistant, explicitly selected entities and available history; read-only |
| Weather/environment | Open-Meteo and regional services; current/historical weather, forecasts, air quality, pollen, UV and marine conditions |
| Astronomy/occasions | Sunrise/sunset, daylight, moon phases, public holidays and regional observances |
| Calendars | Google Calendar, Microsoft 365, CalDAV and the existing chosen ICS-import track |
| Tasks/projects | Todoist, Microsoft To Do, Notion |
| Activity/sleep | Strava, Fitbit, Oura; supported Apple Health/Health Connect imports or native adapters |
| Work/time | Toggl Track, Clockify, ActivityWatch, GitHub, GitLab |
| Places/outings | OpenStreetMap-based services, event catalogs and regional transit sources; retain Photon/Pelias work |
| Food/recipes | Open Food Facts, USDA FoodData Central, recipe managers |
| Money | Public exchange rates, Actual Budget, Firefly III and selected financial-file imports |
| Nature/knowledge | iNaturalist, eBird, Wikidata, museum collections |
| Photo libraries | Immich, Google Photos Picker, Apple Photos/iCloud Photos through supported native selection or explicit downloaded-file import |
| Personal/custom | Chosen journal archives, contacts, files, RSS, CSV/JSON and supported automation bridges |

Each source has independently verified lookup, import, insertion and outbound capabilities. All new providers are candidates
requiring authentication, terms, pricing, attribution and platform checks. Extend existing weather, Todoist, webhook and
health-import foundations rather than duplicate them. Preserve the existing media backlog and priorities.

- Provide one searchable on-demand picker with favorites, filters, preview and undoable insertion. Use explicit query,
  place/date/entity/file inputs without analyzing prose. Keep writing usable offline and retain snapshots with provenance.
- **Contextual suggestions default off**, with a separate locally remembered setting. When enabled, analyze only the
  active entry locally. Selection precedes external lookup and reviewed insertion; no journal prose leaves the device.
  Disabling stops pending analysis and clears suggestions; entry changes/closing/locking cancel stale work.
- **Home Assistant is read-only:** explicitly select an instance, entities and range; retrieve current state or available
  history on demand. Preserve timestamps/units and missing/unavailable states. No service calls, scene/script triggers,
  synthetic/device-state writes or background subscriptions. Verify authentication and actual browser/network reachability.
- Explore an optional Home Assistant card separately: evaluate a Writer launcher with selected read-only context first;
  embedded editing is a separate possibility. Check authentication, iframe/CSP and dashboard exposure before selecting
  an implementation. No tokens or journal content in card configuration or URLs.
- Plan **both concise inline references and structured records**: retain existing references; propose typed TMDB/Trakt
  forms, media identity (`kind`, `title`, repeated `reference`), activity (`kind`, `item`, optional `date`/`at`) and shared
  observation provenance. Reuse `measurement`/`observation`; distinguish observed, forecast, estimated and manual data.
  Activities have identities distinct from their items to preserve rewatches and repeated listens.
- Records are data, not instructions: opening/parsing/rendering never triggers network actions. Preserve partial/unknown
  records and old files without automatic migration. New credentials and Writer delivery receipts stay outside portable
  content; preserve existing `sync` records without treating them as authorization. Reconcile existing spec semantics
  before a normative update. This draft does not bump the released format version or implement new syntax semantics.

Within the context track, prioritize weather and read-only Home Assistant. Then implement the optional local-suggestions
setting and wider catalog. Track canonical specification edits, parser/renderer support, conformance fixtures and Writer
insertion controls as separate format milestones. Evaluate the card independently. Physical hardware and firmware remain
deferred; no account access, live-data query, external write or deployment is performed by this roadmap update.

## Photo libraries: Immich, Google Photos and iCloud Photos

Status: **planned**, part of the complete-v1 integration backlog. Existing general file attachments are not a dedicated photo-library connector. Research, API constraints and acceptance details: [photo-library-integrations.md](docs/proposals/photo-library-integrations.md). Include Apple users even when the maintainer develops on another platform; verify Apple workflows on actual supported devices before claiming parity.

| Provider | Planned supported route | Platform constraints and acceptance |
| --- | --- | --- |
| Immich | Explicit self-hosted server connection; album/date/metadata browsing and selected image/video download through the published API | Verify a pinned supported server/API version, narrowly permitted API key, per-request origin boundaries, CORS/CSP and desktop/mobile reachability; no admin, backup, upload, deletion or library mutation |
| Google Photos | OAuth and Google Photos Picker API sessions; user-selected media copied into the journal | Broad existing-library browsing through the old Library API is not available; verify app registration/scopes, session expiry, cancellation, bounded session polling and expiring authenticated downloads. Takeout import is a separate reviewed local-export route |
| Apple Photos / iCloud Photos | Native Photos/PhotosUI pickers where supported; selected local files downloaded from iCloud.com or exposed by iCloud for Windows elsewhere | No promise of a general public iCloud Photos web-library API. Native access must handle cloud-only items, selected-item/limited permissions, download progress and cancellation; no Apple-password collection or private API scraping |

- [ ] Deliver a shared explicit photo-source → select → review → attach flow, with album/date filters only where supported. No background library sync, journal upload, automatic memories or hidden analysis of writing. Keep provider queries separate from journal text; any later contextual suggestions stay behind the existing default-off toggle.
- [ ] Implement Immich first against a pinned supported release; test selected-server authentication, read-only search/album/media capabilities, pagination, restricted access, revoked keys and safe redirect/origin handling. Search APIs may use POST while remaining read-only; verify actual endpoint permissions rather than treating the HTTP verb as authorization.
- [ ] Implement Google Picker with the current `photospicker.mediaitems.readonly` scope, exact selected-item review and authenticated content retrieval before URLs expire. Cancel/delete sessions where supported and discard late results. Do not silently fall back to removed broad Library API scopes or proxy private media through a third party.
- [ ] Implement Apple native selection on supported iOS/macOS hosts and file-import fallbacks for web, Windows, Linux and Android. The web app cannot call PhotoKit directly. Verify permissions, iCloud download delays, HEIC/HEIF, orientation, video and Live/Motion Photo component handling; retain originals and label unsupported previews without dropping data.
- [ ] Import selected media as actual `.jotz` asset bytes with stable source identity, explicit provenance and readable `.jot` links. Do not depend on expiring provider URLs or login to reopen the saved journal. Keep external source references separate from bundled content; do not export access tokens, credentials, signed URLs or delivery state.
- [ ] Review capture time/timezone, captions, location and EXIF before inserting metadata into source; never infer attendance, mood or a personal event from a photo. Embedded original EXIF can itself contain GPS/private data: disclose that distinction and make stripping/transcoding an explicit reviewed operation rather than claiming that omitting a source field removes embedded metadata.
- [ ] Preserve selected originals, optional derivatives and multi-part assets; deduplicate by verified provider/content identity without merging different photos or repeated journal references. Keep media and previews subject to the journal's protection rules. Preflight the current archive/media size limits, show progress and recover cleanly from cancellation, quotas, missing assets and unsupported files.
- [ ] Test offline reopen, relock/unlock, source/visual edits, archive round trips and export privacy with fictional media; verify live accounts separately. Publish a provider/platform matrix with native/device evidence and graceful manual-import fallbacks.

Format dependency: D3 (bundled media/relationships), D4 (protection), D5 (limits/indexing) and D6 (preview rules) in the format roadmap. This plan does not change syntax or the archive schema. If new media/provenance semantics are required, define conformance fixtures and implement corresponding Writer support in the same change under `AGENTS.md`.

## WriteFreely and ActivityPub exploration

Status: **planned research and prototypes**, not an implemented editor replacement, publishing connection or federation service.
The source-based comparison, pinned upstream revision, license notes and evidence are in
`docs/proposals/writefreely-integration.md`. Upstream: https://github.com/writefreely/writefreely.

1. Compare the main textarea writer and optional ProseMirror editor with Jot's source editing, records, attachments, autocomplete,
   undo, IME, mobile layout and print/export. Independently implement useful workflow ideas; evaluate direct code reuse only after
   license compatibility and source-preservation review. A richer view must preserve unsupported Jot syntax and original assets.
2. Prototype an optional **Publish selected entry/selection to WriteFreely** adapter with a title, destination and exact output
   review. Define Jot-to-Markdown/HTML fallbacks for custom records, media references and assets. Keep drafts local until an explicit
   publication action; autosave must not publish. Private reference books and unselected entries are outside the publication payload.
3. Use a separately deployed WriteFreely instance for accounts, posts and ActivityPub delivery. The current static Jot site cannot
   host an ActivityPub inbox or hold actor signing keys. Verify authentication, browser CORS/session constraints and server/proxy
   deployment before choosing an integration topology; do not place durable secrets in journal files or browser autosave.
4. Test publication, updates and deletion with stable remote post IDs, retries and conflict handling. Review the actual instance's
   federation and visibility settings: unlisted is not a private-draft guarantee, and remote deletion cannot guarantee recall of copies.
   ActivityPub publishing is distinct from private journal backup, collaboration or document synchronization.
5. Run interoperability checks on an isolated instance and a second ActivityPub implementation before offering live federation.
   Evaluate actor identity, content representation, discovery, Follow/Undo, update/delete delivery, moderation, outbound-request
   validation and operational maintenance. Do not assume WriteFreely provides a full reader, private messaging or all protocol features.

First candidate: retain and enhance Jot's writer, then connect it to WriteFreely as an optional publishing service. A ProseMirror
mode or combined Go application remains a separately evaluated option, with explicit Jot schema/round-trip and AGPL obligations.

## Scope boundaries

The web app is a working prototype. It is not a complete implementation of every profile or every clause in the specification. Diagram recognition is not rendering. Handwriting capture is not transcription. Pattern hints are not a full grammar engine. Physical page sizes do not guarantee successful scanning under every camera condition. No clinical effectiveness, diagnostic behavior or brand scanner compatibility is claimed.


## Neurodivergent-friendly design track

These are optional capabilities for varied preferences and access needs, not medical treatments, diagnostic features or a single ADHD/autism mode. Some people prefer more structure, reminders or color; others need less. Offer independent controls and test with people who have different needs. A person's diagnosis must not be required, inferred or attached to shared journal content.

| Priority | Planned improvement | Acceptance criteria |
| --- | --- | --- |
| P1 | Focus and sensory controls | Hide the preview, parser, counters and decoration independently; adjustable font size, line spacing, line length, density and ruling; sufficient contrast and reduced motion; exit focus mode by keyboard; remember choices locally |
| P1 | Quick capture with no setup | One sentence, a fragment, a sketch or a photo can be saved without choosing a method, date hierarchy, mood scale or completing a form; no minimum word count |
| P1 | Gentle return after a gap | Restore the last document and position; optional last-next-step note; offer a blank start without making the user process missed days or an old backlog |
| P1 | Quiet writing assistance | Pause/defer checks until requested, hide counts and suppress visual underlining when desired; suggestions never block save/export; do not correct dialect, identity terms or intentional fragments automatically |
| P1 | Easy recovery and orientation | Clear save state, obvious download, keyboard actions with visible labels, optional entry outline and jump-to-current-section; recover a prior draft without overwriting the current draft |
| P2 | Adjustable scaffolding and method blending | Save a small personal set of prompts; combine sections from different methods; hide/reorder optional fields; preserve all writing if the chosen template changes |
| P2 | Separate planning, doing and capacity | Optional next tiny step, estimate versus actual, done list and energy/context notes; missing data is not failure; no required scores or comparison between people |
| P2 | User-controlled cues | Optional explicit start/stop timer or reminder; no default countdowns, streak penalties, escalating notifications, surprise sounds or automatic backlog migration |
| P2 | Alternative input and reading support | Keyboard, stylus, touch and browser/OS dictation pathways; optional read-aloud only where available and chosen; preserve handwritten originals without requiring recognition |

Delivered so far (partial, browser-tested in `site/test-prefs-ui.cjs`, not yet validated with intended users): the first form of **Focus and sensory controls** (no ruling choice yet), **Quick capture** for one line of text (not sketches or photos), **Gentle return** (position, optional note, Start at the end; one document only) and part of **Quiet writing assistance** (hide counts and the parser/check tabs; Writing hints can already be turned off). **Easy recovery and orientation** is unchanged.

Existing baseline: plain-text capture without a required method; 62 mixable invitations; a handwriting canvas; local text autosave; optional writing hints; a dot-grid toggle; reduced-motion CSS and keyboard-accessible scanner corners. The new track is not marked implemented merely because these related features exist.

Suggested first delivery: a small writing-preferences panel, then quick capture and return-to-position, then recovery and saved blended templates. Validate each feature with its intended users before making it a default. Do not claim that any font, color, timer length or journal routine universally works for neurodivergent people.

## One editor for every method track

The proposal `docs/proposals/editor.md` reads all 52 method guides in `docs/methods/` for what an editor must do and avoid, and plans one editor that fits every method: the writer and the template editor become two modes of it, sharing one block kit, and every guide gets a layout built from that kit. The text stays the only document; the editor adds a fill view of it. No therapeutic or productivity effect is claimed for any of it.

| Phase | Planned improvement | Acceptance criteria |
| --- | --- | --- |
| E0 (done) | Starter fixes and day start | Morning pages starter without prompts; Day planner hours asked or full day; one gratitude line; a "Day starts at" preference used by Today and Quick note |
| E1 | Fill view with Skip | Form controls for the records at the cursor; Skip writes the format's `skipped`; only touched lines change; keyboard and screen-reader checks pass; nothing required |
| E2 | One block kit | One registry for writer and template editor; three-state dots, ordered tasks, prompt pass line and weights, time grid options, sketch slot, plan pointer, silent timer, time stamp |
| E3 | A layout for every guide | Each guide's layout builds from the kit or names its missing piece; layouts for methods with a health note are opt-in; a quiet note above seven blocks or five trackers |
| E4 | Privacy in the editor | Per-block privacy defaults, discreet labels; private blocks absent from default exports; no network requests while editing |
| E5 | Time and rereading | Shift-relative wording, re-plans kept visible, a week strip drawn from the week's source, an opt-in Look back panel that never opens by itself |
| E6 | Useful friction | Carry, schedule or drop per task; a transfer-later list; nothing moves without the writer's action |
| E7 | Groups | Side-by-side groups from the composable blocks track, collapsing to source order |
| E8 | Testing with people | Each track tried with the people it is for; defaults change only on recorded findings |

Never in any view: streaks, scores, missed-day counts, catch-up prompts, reminders or sounds, generated prompts or analysis of writing, risk ratings, automatic sending, colour as the only signal.

## Multilingual and internationalization track

Unicode preservation is a starting point, not complete language support. Keep interface language, journal language, proofreading language and display direction separate. Someone can use an English interface while writing Arabic and Spanish in the same entry. Do not silently translate, normalize, romanize or replace their source.

### L1. Format dependency

Language-neutral source/parser rules are owned by the Jot format roadmap. Implement their Writer effects alongside each format change; the UI, fonts, input, translation and platform acceptance below remain Writer work.

### L2. Editor, direction, fonts and keyboard input

- Support right-to-left and mixed-direction writing with semantic `lang` and `dir` attributes, appropriate paragraph-level direction/isolation, and logical layout properties. Language tags and direction are distinct settings. Provide an override because Markdown headings or syntax characters can precede the first natural-language character.
- Respect IME composition events: parsing, autosave and preview refresh must not interrupt an unfinished composition or move the cursor. Test Japanese/Chinese composition, Arabic input and mobile keyboards.
- Use script-appropriate font fallbacks and test shaping, combining marks, line breaks, wrapping, selection and printing. Do not require Latin handwriting conventions or assume words are space-separated.
- Use locale-aware segmentation where supported for word counts/search, and label fallbacks. Preserve original numerals and punctuation; localized date/calendar views must not change stored ISO dates or timestamps. Week starts and 12/24-hour display should be selectable.

### L3. Interface and journal-method translations

- Extract UI strings into versioned language bundles with a fallback language. Localize menus, validation messages, dates, numbers and accessibility labels without translating the journal itself.
- Translate prompts and method explanations with native-speaker review and cultural adaptation. Retain the exact prompt text, language and template version used in an entry. A language switch must not rewrite past answers or questions.
- Keep the original text available if a user explicitly requests translation; save translations as derived content. No automatic remote translation of private writing.

### L4. Spelling, grammar and handwriting

- Expose proofreading language separately from interface language. Respect regional dictionaries, personal vocabulary, dialects and code-switching. Unknown/unsupported languages should have checking disabled with an explanation, rather than receiving English corrections.
- Integrate real language-specific checking adapters as optional capabilities, with declared coverage. The current English pattern hints are limited; they are not a multilingual grammar engine. Browser spelling capabilities depend on the browser and installed dictionaries.
- Stroke capture is script-agnostic input and requires no transcription. Preserve images/strokes in every language. Any later handwriting recognition needs language-specific evaluation and user-reviewed output; recognition is not a prerequisite for multilingual handwriting.

### L5. Acceptance and release gates

Test English, accented Latin text, Arabic/Hebrew RTL and mixed-direction content, Chinese/Japanese text without spaces, and Devanagari/combining-mark examples. Include mixed-language paragraphs, IME entry, Unicode filenames, clipboard round trips, parser offsets, search/count fallbacks, proofreading exclusions, print output and handwriting asset references. These are coverage fixtures, not claims of completed translations. Prioritize actual translation languages with the user before selecting an initial language pack.

## Design references

These inform the proposed design, not a claim of WCAG certification or clinical effectiveness:

- W3C WAI, Support Adaptation and Personalization: https://www.w3.org/WAI/WCAG2/supplemental/objectives/o8-personalization/
- W3C WAI, Limit Interruptions: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o5p01-minimal-interruptions/
- W3C Internationalization, Structural markup and right-to-left text in HTML: https://www.w3.org/International/questions/qa-html-dir.en.html


## Composable content blocks and layout track

Jot v1 should support multiple kinds of content in the same entry and page. A method is a reusable arrangement of blocks and prompts, not an exclusive document mode. Writers can combine methods without converting all their content into one rigid form. Plain paragraphs remain valid without explicit block markup.

### B1. Format dependency

The block taxonomy and source semantics are owned by the Jot format roadmap. This track implements their insertion, editing, layout, rendering and platform behavior without creating a separate document grammar.

### B2. Layout composition

- Stack blocks in source order by default. Optional groups can present two columns, a sidebar/main area, a full-width block or a reusable section. Each block retains an independent type and identity.
- Allow a short task list beside handwriting, or a photo above a reflection, without changing the meaning of either. A page can mix several journal methods.
- Keep stable block IDs for attachment references, task links and later revisions. IDs should not depend on physical page numbers or current visual position.
- Separate content properties (text, strokes, asset link, measurement) from presentation properties (width, alignment, spacing, grouping, border, background, ruling, page-break and keep-together preference).
- Provide move-up/down and keyboard reordering alongside any drag-and-drop interaction. Show the resulting reading order; do not make color, position or pointer dragging the only way to understand or manipulate blocks.
- Do not replace the readable `.jot` writing with an opaque JSON document. Optional layout hints reference blocks; binary images and stroke files live inside the same .jotz container with readable internal links.
- Treat reusable method layouts as editable starting points. Detaching/changing a method must retain every filled block and handwritten original. Changing one block type requires an explicit non-destructive operation, not automatic conversion or transcription.

### B3. Responsive, multilingual and print behavior

- Columns collapse into an explicitly defined reading order on a narrow screen or in a plain-text view. Screen-reader traversal and keyboard order follow that same order.
- Use logical start/end alignment and direction-aware layouts for mixed-language or RTL writing. Do not infer reading order solely from left/right coordinates.
- Reflow text when paper size changes. Preserve a handwriting/image block's aspect ratio; do not distort strokes, silently crop content, or shrink writing below the chosen minimum to force a fixed page count.
- Allow keep-together, break-before and continuation hints with overflow feedback. Content taller than a page must use an explicit scale, tile, continuation or alternate-page decision that the user can preview.
- Give empty writing/handwriting areas physical dimensions for print templates where requested. A blank placeholder is not a missing observation, an unanswered mandatory form or a demand to fill every space.

### B4. Parser, assets and editing contract

Define optional block/group/layout syntax before making a stable grammar claim. The JavaScript AST needs stable IDs, type, source span, ordered children or references, and a readable fallback while preserving unknown fields. The existing parser's Markdown nodes and generic records are useful primitives; they are not yet a complete block-layout editor.

The editor must support inserting a handwriting block at the writing cursor, displaying its PNG fallback inline, and retaining editable strokes as a linked companion asset. The current integration includes single-file bundling and local asset persistence; broader recovery and visual missing-file handling need further testing. The handwriting canvas now inserts a PNG fallback plus editable stroke data into the journal. Both are packaged inside the same .jotz document. Full visual block manipulation remains planned.

Editing through either source or a visual block view must not silently discard the other view's data. Prototype `stringify` currently returns the unmodified original source; serializing AST/block edits is a separate implementation milestone. Layout files must not change entry dates, task meaning, privacy labels or language metadata.

### B5. Suggested delivery and acceptance

1. Define stable content-block identity, readable source references and a default stacked layout; add a block insertion menu without requiring it for prose.
2. Integrate images/scans and handwriting blocks with asset persistence and portable bundles.
3. Add block grouping, accessible reordering and mixed-method reusable layouts.
4. Add responsive columns/sidebars and predictable print layout with visible overflow.
5. Extend the parser/serializer conformance suite and test source/visual round trips.

Acceptance examples: a single day combining BuJo tasks, gratitude text and untranscribed handwriting; a photo with a caption beside a reflection; a tracker plus freewriting in another language; an unknown block opened without its plugin; a two-column screen layout becoming a one-column pocket print; a missing attachment; a very tall handwriting block; undoing a reorder; and extracting public entry source from .jotz and opening it in a plain-text editor with its reading order and asset labels understandable. All are planned checks until the corresponding implementation exists.


## Default archive decision

Writer now defaults to Jotz v1 for every journal. Plain `.jot` remains a source import/export option. The fresh format replaces the
former container and separate encrypted-file design; there is no migration layer for earlier prototype containers or `.jotlock`. Ordered entry UUIDs
preserve repeated dates, preamble, exact source and explicit time metadata. Public entries are readable/indexable; protected
entries use independent keys and ciphertext. All media/settings are protected whenever a session is configured. Save/Download,
browser persistence, entry privacy controls, public locked reading and local search use this model.

[Container specification](specification/Jot-Container-v1.md) · [Protection specification](specification/Jot-Protection-v1.md). Test coverage includes source/asset
round trips, public-only FTS5, key slots, authenticated descriptor/order binding, ciphertext reuse and privacy changes rebuilding
a clean index. Ciphertext reuse is not incremental ZIP disk I/O. Dates and cryptographic metadata remain visible. Independent
security review, actual-device WebAuthn/native webviews, large archive and ten-year search benchmarks remain release validation.

## Optional BYOK AI companion (2026-11-01)

Implemented in Writer: inline reviewed drafts and on-demand suggestions using OpenRouter or loopback OpenAI-compatible servers.
AI and AI suggestions default off. Context is limited to explicitly chosen selected text; keys remain in session memory. Strict
response-envelope and Jot parsing checks precede explicit undoable insertion. OpenRouter denies provider data collection and has
an independent ZDR toggle, on by default. No silent policy downgrade, tools, containers, remote file uploads or cloud fallback.
See `docs/guide/ai-companion.md`. Automated transport and browser checks use mocked models. Live-provider compatibility, native
webview/CORS and physical-device checks remain release validation; complete profile-semantic validation remains separate work.


## Everyday browser tools and manual nearby transfer

Writer implements an optional offline PWA shell, local storage protection/usage, session wake lock, reviewed outgoing sharing and
a separate local incoming inbox. Manual nearby transfers use WebRTC with local candidates, two-way invitation/response pairing,
comparison codes, integrity verification and inbox review; no Bluetooth, STUN/TURN, internet signaling or automatic merge. Incoming
OS share delivery requires browser support and an active controlling worker; file-picker import remains available.

Inline annotation creates an immutable page snapshot with editable strokes and composed PNG; later text edits do not move its
marks. Source uses existing image/link syntax and self-contained `.jotz` assets. Done/Cancel and source Undo are preserved. The
hidden scanner remains hidden. See `docs/guide/browser-tools.md` for limitations and `specification/Jot-Container-v1.md` for the
optional stroke background member. Automated tests cover Chromium and local browser-to-browser WebRTC. Native share registration,
physical pen/palm behavior, real laptop/phone Wi-Fi or hotspot compatibility and native desktop-webview support remain release
validation. Dedicated hardware/firmware, live text-anchored ink and ongoing synchronization remain deferred.

## Jotz v1 archive delivery

Implemented as the default fresh container, not a migration. The original proposal is superseded by the default archive decision
above and the versioned container/protection specifications. Optional data-source integration snapshots remain ordinary records;
opening an archive never contacts a provider, executes stored SQL or analyzes private content remotely.

## Connected sources: first delivery

Implemented: **Tools → Connected sources** in Writer, an on-demand provider contract/catalog, bounded cancellable Open-Meteo
lookup with explicit coordinates/date/timezone, review, source-preserving undoable insertion, timestamped model provenance, units,
missing-value preservation and attribution. No journal prose analysis, background lookups, geolocation, new account writes or
credential persistence. Daily recent/future forecast output is labelled forecast; historical archive output is estimated, never
a personal observation. Existing generic records preserve the snapshot fields; this does not implement the entire syntax proposal.

Browser/service tests mock Open-Meteo. Live endpoint/CORS/commercial-account compatibility and native desktop-webview access remain
unverified; desktop CSP permits only the two named public weather origins. See [Connected sources](docs/guide/connected-sources.md).
Implemented next slice: Home Assistant read-only entities/history with memory-only credentials. Next: the separate default-off
local contextual suggestions setting. Movie/TV lookup and reviewed Trakt actions remain the next media milestones.


### Read-only Home Assistant delivery

Writer's Connected sources picker supports one to five chosen entity IDs from an explicit HTTPS/loopback instance. It reads
current states or up to seven past days/200 historical states, bounds each response to 512 KiB, and preserves reported values,
units, entity IDs, update times, missing history and boundary states. Tokens clear on close/lock/host change and never enter
journals or browser storage. No service calls, device writes, subscriptions, current-state fallback for missing history or
automatic insertions. Records use existing measurement/observation syntax and reviewed provenance fields. Tests use mocked
provider responses and browser requests; actual instance credentials, CORS/private-network permissions and native webviews still
need verification. Desktop instance access remains loopback-only under the existing CSP; arbitrary host access is not claimed.
The optional Home Assistant card and contextual suggestions remain planned.
