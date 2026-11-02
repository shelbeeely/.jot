# Latest Jot v1 decisions

## Smart journal sources and optional syntax (1 November 2026)

The owner approved a broad smart-journal source catalog and both concise references and structured records. The roadmap,
`docs/proposals/smart-journal-and-connected-data.md` and the extended media proposal document this planned work. Add
AniList, Hardcover, SIMKL, Inoreader, OpenSubsonic and gPodder to the existing media backlog. Extend existing weather,
Todoist, webhook and health-import foundations for a shared source picker; physical hardware and firmware remain deferred.

On-demand lookup uses explicit inputs without processing prose. Contextual suggestions are a separate locally remembered
setting, **off by default**. If enabled, analyze only the active entry locally; selection precedes external lookup and
reviewed insertion. Disabling cancels pending analysis and clears suggestions. No private prose is sent to providers.

Home Assistant is **read-only**: chosen instances/entities/ranges, current states and available history, with no service
calls, device/synthetic-state writes, scene/script triggers or background subscriptions. An optional dashboard card is a
separate exploration, beginning with a Writer launcher and selected read-only context; no card implementation is chosen.

The optional syntax draft proposes typed TMDB/Trakt references, media/activity conventions and sourced observations using
the existing record grammar. Generic preservation is not semantic support. Canonical specification changes, conformance
fixtures, parser/renderer behavior and Writer controls are later milestones. No automatic migration or released-version
bump occurs here; existing `sync` records remain preservable and never authorize requests.

Research basis: `docs/methods/digital-daily-notes.md, line 711` rejects journal-content cloud sync. Its objection to
activity-based suggestions at line 712 is narrowed by the owner's explicit optional-setting request, with local analysis
and no unselected external lookup. `docs/methods/expressive-writing.md, line 443` supports private writing unless sharing
is chosen; `docs/methods/symptom-tracking.md, line 686` rejects symptom-data cloud sync. These guide boundaries, not a
claim that integrations improve journaling outcomes. No live connection, provider write, semantic parser change or card
deployment is implemented in this documentation update.

## Media references and optional service actions (31 October 2026)

The owner requested broader media autocomplete and the ability to send chosen activity back to services such as Trakt.
Plan movie/TV/episode lookup first, then reviewed Trakt watched-history actions; expand music, streaming availability,
podcasts, books and games through separate provider capabilities. Existing MusicBrainz lookup remains the implemented
baseline. The roadmap and `docs/proposals/media-sources-and-service-actions.md` distinguish planned work from live support.

A media reference is not evidence of watching/listening. Outbound actions require a chosen account and confirmed activity;
optional future rules are explicitly enabled and do not interpret prose or trigger on autosave. Send selected activity
metadata, not the private entry. Preserve rewatches and prevent duplicate writes, uncertain retries and import/export loops.
Provider credentials and local delivery receipts stay outside portable journal content. No account was connected or write
performed. Research basis: `docs/methods/digital-daily-notes.md, line 711` (avoid third-party journal-content sync) and
`docs/methods/expressive-writing.md, line 443` (sharing is chosen). No format syntax change is established by this plan.

## Physical hardware and firmware deferred (31 October 2026)

The owner removed dedicated physical hardware and firmware from current delivery. Both will be explored later, as recorded
in `specification/ROADMAP.md`. Current work focuses on the Jot format and Writer software, including the beginner's first
entry, saving, recovery and returning to writing. Hardware procurement, parts lists, enclosure design, device prototypes,
firmware ports and device-specific integrations are not current milestones or prerequisites for Writer v1.

This supersedes the 30 October direction to continue firmware work. The five hardware-specific research proposals and
parts lists have been removed from the active repository. No device, component supplier, firmware target, production
plan or hardware price is selected. No firmware implementation was present in this repository.

The physical/digital bridge remains possible through existing software capabilities: ordinary input devices, optional
printing and retaining handwriting originals. Those capabilities do not commit Jot to developing a physical product.

Paper entries count before digitizing; capture can happen later and retains originals (`docs/methods/rocketbook-and-scan-systems.md,
line 538`; `docs/methods/digital-daily-notes.md, line 420`). Keep navigation and setup small (`docs/methods/e-ink-templates.md,
line 519`). Reduced distraction is **plausible by design**, not directly tested for journaling (same guide, line 501);
reduced social-media use remains a product goal, not an established outcome.

## Jot Writer v1 starts with people who have never journaled (30 October 2026)

The owner set the primary audience: people who have never journaled and want help getting started. The v1 promise is a
comfortable start, a small first entry, and an easy return whenever they choose. Attractive pages and portable files support
that experience. This replaces the earlier positioning assumption that paper-journal enthusiasts are the primary audience.

This audience guides **Jot Writer**, the application. The **Jot format** defines saved content and its portable meaning;
the writer owns onboarding, suggestions, method/template selection, editor preferences and recovery. Optional profile
contracts and saved layout intent remain format concerns; implementing them does not require the same interface. The brief
spells out this boundary and distinguishes format conformance from Writer v1 readiness. No format syntax changes are made.

The delivery brief is `docs/proposals/first-journal-v1.md`; its onboarding changes are planned, not implemented. The existing
writer already starts blank and supports ordinary writing. The next slice should offer one optional, concrete starting
question, with a clear way to write freely, before introducing methods, formatting or file-format details. Saving, recovery
and reopening remain release priorities because a beginner must be able to trust the first entry they make.

Research basis: short, concrete prompts with an exit (`docs/methods/prompt-journaling.md, line 435`); avoid template bloat
(`docs/methods/digital-daily-notes.md, line 488`); no catch-up or missed-day counts (`docs/methods/low-demand-check-in.md,
line 236`). These guide the design, not a claim of demonstrated onboarding effectiveness: "Prompts help people start writing"
is explicitly **claimed**, not studied as such (`docs/methods/prompt-journaling.md, line 405`), and the low-demand format's
evidence is **anecdotal** (`docs/methods/low-demand-check-in.md, line 173`). Test the experience with first-time journalers.

## The brand book (30 October 2026)

The brand is written down as a whole: `docs/brand/README.md` (the brand book: foundation, logo, color, type, imagery, the system,
voice, messaging, use, ownership), with `docs/brand/voice.md` (how Jot sounds) and `docs/brand/messaging.md` (what Jot says, with
the canonical descriptions), from the facts in `.agents/brand-context.md`. Made with the brand-context, brand-voice,
brand-messaging and brand-guidelines skills, from what the project already decided, not new research.

- **One tagline.** "Jot things down. Get beautiful pages back.", with "Just one thought at a time." as the second line. The
  homepage, page titles, README, VS Code extension and desktop app use the canonical words.
- **The voice keeps the research's rules.** No streaks, catch-up prompts or shame wording; record, don't diagnose; a real pointer
  to help on crisis-adjacent pages (docs/methods/README.md, "Recurring principles"). American spelling in reader-facing copy;
  the specification, records and code are unchanged.
- **Link previews without the owner's name.** The homepage has Open Graph tags with a relative image path: the site's public
  address contains the owner's name, which the privacy check keeps off every page. Previewers that need an absolute address will
  show no image until the site has an address without a name.
- **Motion.** The iota is written, then dotted, once (`jot-symbol-written.svg`), and simply shown with reduced motion.

## Jot as "just one thought" (29 October 2026)

The owner asked for the name to also mean *just one thought*: you write what is on your mind one thought at a time, and one
thought can be a single line or a detailed entry. It is a backronym beside the real origin (iota, the smallest letter) and the
logo's 1 and 0, used on the homepage's fifth reason, under the README's tagline and in the brand guide.

- **Focus, not size.** It never limits length ("keep it short") or sets a target ("one a day", streaks): Jot entries run from a
  word to pages, and the method guides that track entries avoid streaks and missed-day counts
  (docs/methods/low-demand-check-in.md, line 15).
- **Honest about evidence.** The methods research does not test a framing like this; it is a choice about tone, not a finding.

## The Jot logo: a hand-written iota (29 October 2026)

The hash mark (⌗) is replaced. It said little about journaling and sits close to Slack's mark. The new logo is a Greek iota
written with a fine pen: the stroke lands to a point, swells and lifts into a flick, and the dot comes afterwards, a little
ahead. "Jot" comes from iota, the smallest letter, and a jotting is a quick note; the stroke and the dot are also a 1 and a 0,
ten (iota's value), two in binary. The owner chose it from concepts made against a written brief (`docs/proposals/logo.md`):
warm, handmade, calm and quiet, for journal keepers first, drawable from memory in five seconds.

- **Hand-drawn, reproducibly.** The marks come from a simulated pen (`docs/brand/source/`), seeded, so they can be redrawn
  exactly. They are traced into plain paths with no fonts, filters or images.
- **The site's own colours.** Ink blue `#1f3a8a` on cream, the light ink on charcoal in dark mode: 10.2:1 and 10.4:1. The
  headers carry the marks inline, so they follow the page's theme.
- **One source.** `tools/sync-brand.mjs` puts the masters in every header and the favicons beside the pages, with a `--check` in
  CI; the desktop app's icons for every platform are made from `docs/brand/app-icon.png`.
- **The wordmark is "ιot".** The owner chose to spell the wordmark with the logo's iota, so the symbol and the name are one
  mark. Tested risk, accepted: in the wordmark it can read as "iot" (or "IoT"). The name stays Jot everywhere else: in text,
  file names, commands, and the wordmark's accessible name.
- **Built around it.** One brand with its tools named beside it; the ink dot as the only graphic device; the iota as every
  icon (site, apps, VS Code extension and `.jot` file icon); the wordmark at the top of the README and in a social preview.
  All copies come from `docs/brand/` through `tools/sync-brand.mjs`.
- **The name in words, and colour roles.** A brand audit found the wordmark alone can hide the name, so "Jot" is written near
  it where people first meet it (the homepage's first line, the README's title, page titles "Tool · Jot"). Ink blue is the
  brand; the purple accent is for actions and focus only.
- **Limits.** Trademark clearance has not been searched; other products use the name. CMYK values are converted, not proofed.

## A desktop app with Tauri v2 (29 October 2026)

`desktop/` wraps the website's own pages (`site/dist/`, unchanged) in a Tauri v2 app, chosen over Electron so the same code can
later build for Android and iOS. Pages learn they are in the app from one injected object, `window.jotDesktop`; without it they
behave as on the web, so there is one product, not two.

- **Only what a web page cannot do.** Exports of any size (ZIP64 included) are read a file at a time from disk in Rust, refusing
  entries over 1 GiB unpacked, ratios over 200 to 1 above 64 MiB, names that leave the archive and symbolic links in folders; every
  download goes through a native Save dialog and is written to a temporary file and renamed. The importer's reading and journal
  making moved into `site/dist/import/engine.mjs`, shared by the web worker and the app.
- **Nothing more than asked.** Files are read only after the person picks them and written only where they choose: no file-system,
  shell or HTTP plugin is exposed to pages (`capabilities/default.json`). The content security policy allows only the listening
  tool's services; other links open in the person's own browser. Opening a journal still needs no account or network request.
- **Honest about parity.** WebKitGTK offers no WebAuthn, so on Linux passkeys stay hidden and passphrases and recovery codes work as
  usual; Spotify's pop-up sign-in is not available in the app. Only Linux is built and tested (`cargo test`, `test-desktop.cjs`
  through `tauri-driver`); macOS, Windows, Android and iOS are configured, not checked. Its Rust and Tauri command-line
  dependencies stay inside `desktop/`; the site, parser and CLI still need none.

## Your life online: data exports to a journal (29 October 2026)

`converter/archive.mjs` (pure), `converter/jot-archive.mjs` (command line) and the **Your life online** page (`site/dist/import/`) read
the data exports of X/Twitter, Mastodon, Facebook and Instagram (JSON), Tumblr (posts.xml or HTML pages), Reddit (CSV) and Google
Takeout (Keep, Blogger), any number at once, and write one dated journal: a `.jot` a year by default, each post as
`#### HH:MM · Service` under its day, with its original link; photos as margin notes saying where they are in the export, or packed
into a `.jotz` a year (60 MB budget). Exports leave services' formats for plain text, as the research recommends for data trapped in
an app (docs/methods/digital-daily-notes.md, line 495), and rereading ordinary records has value (docs/methods/five-year-diary.md,
line 50).

- **Your own words by default.** Reposts, comments, stories and place names are opt-in; other people's words in a personal journal
  can be shared later (docs/methods/design-iteration-and-critique.md, line 178). Messages, contacts, friends lists, logins, IP
  addresses, ads data and coordinates are never read.
- **Private and quiet.** Every file says `Privacy: private` (docs/methods/expressive-writing.md, line 443). Like and share counts are
  never written (docs/methods/e-ink-templates.md, line 742). Nothing resurfaces by itself: old posts can hurt
  (docs/methods/digital-daily-notes.md, line 493); people choose dates and categories before converting.
- **Nothing invented.** A post without a readable time is left out and counted, never given a guessed date (as for missing data:
  docs/methods/symptom-tracking.md, line 596). Dates use one chosen IANA time zone, stated in `Timezone:`; Tumblr's wall-clock
  times are read in that zone. Meta's double-encoded text is repaired only when it decodes cleanly.
- **Honest about formats.** The readers follow the services' documented formats as this project knows them and are tested on
  made-up samples (`converter/fixtures/archives/`), not yet on many real exports; an unknown layout shows as "nothing this can read
  yet" rather than a guess. Not yet: Bluesky, LinkedIn, chat exports, Google Photos, YouTube and location history. MySpace offers no
  export.
- **Everything local.** ZIPs (and ZIPs inside them) are read with the vendored JSZip; exports over 2 GB are read as unzipped
  folders, file by file. Tested in `converter/archive-test.mjs` and `site/test-import-ui.cjs`.

## Locked documents with built-in crypto (29 October 2026)

A `.jot` or `.jotz` can be locked with a passphrase as `.jotlock` (`specification/Jot-Lock-v1.md`, `parser/lock.mjs`,
`jot lock` and `jot unlock`). Unlocking gives back the original bytes exactly, so the journal format is unchanged; a lock is a
wrapper, and the one exception to "readable in any text editor".

- **Built-in crypto only:** PBKDF2-SHA-256 (600,000 iterations by default, carried in the header) and AES-256-GCM from Web
  Crypto, with both header lines as authenticated data. No vendored code. The `age` format (scrypt, ChaCha20-Poly1305) was
  considered, for its memory-hard key function and existing tools, and set aside because browsers would need vendored code for
  it. The format is published with short Python and Node recipes, so a locked journal opens without Jot; the tests open Jot's
  output with the Node recipe, and the Python recipe was checked by hand.
- **No recovery, said plainly.** Lost keys make encrypted journals "encrypted and unusable forever"
  (docs/methods/digital-daily-notes.md, line 438); the guide's answer is a hint kept safe and a password manager (line 492).
  Jot never stores or sends a passphrase; `jot lock` asks twice and unlocks the result before writing it.
- **Honest limits.** Exports are usually unencrypted and encryption still exposes metadata (docs/methods/digital-daily-notes.md,
  lines 445–446): a locked file's name, size and dates show, and locking leaves the unlocked original in place. The spec lists
  what a lock does not protect against, including being made to give up the passphrase; the guides' threat is a journal that is
  found (docs/methods/gender-euphoria-and-hrt-log.md, lines 606 and 690–694), which a lock answers only for the file itself.
- **Passphrases** are NFC-normalized UTF-8, never taken as a command-line argument (a hidden prompt, or `JOT_PASSPHRASE` for
  scripts), and never stored.
- **In the workspace** (added the same day): Lock with a passphrase, Download locked, opening `.jotlock`, and Ways in (below). The
  content key is kept for the visit as a key the page cannot export (every save gets a fresh nonce, so autosave does not
  re-derive); no passphrase is kept. While locked, the autosaved writing and the attachments are stored only
  encrypted, and a reload asks for the passphrase before showing anything; the page can also remove the locked copy. A note
  under the actions says which exports are not encrypted. A passphrase under eight characters needs a second confirmation, not
  a refusal. Tested in `site/test-lock-ui.cjs`, including a search of every stored value for the writing.
- **Ways in: passphrase, recovery code, passkey or security key, all within Jot Lock v1** (draft 2, the same day; asked for after
  first deciding against them). One random content key encrypts the journal; each way in wraps it: a passphrase, a recovery code
  (25 Crockford base32 characters, 125 bits, shown once), or a passkey or security key through WebAuthn's PRF extension (HKDF over
  the PRF answer). The format keeps the name v1 because it is still a draft; draft-1 files open and are rewritten on the next
  save. Rules that answer the risks raised: a passphrase or recovery code always stays (a passkey is tied to the site's address,
  and support for PRF varies by browser and key); changes ask for a current way in; the writer offers a recovery code by default,
  because a lost passphrase otherwise loses the journal (docs/methods/digital-daily-notes.md, lines 438 and 492); and the ways-in
  dialog says plainly that a synced passkey is as safe as its account and that a face or finger can be easier to force than a
  passphrase (docs/methods/gender-euphoria-and-hrt-log.md, lines 690–694). Passkey labels and the site show in the header; the
  label is optional. Password managers can save the passphrase under the journal's name, and **Lock again** (Writing
  preferences: never, 5, 15 or 60 minutes; 15 by default) saves the journal encrypted, drops the key and shows the locked panel
  after that long with no typing or clicking. "Remember on this device" is still left out: it would let anyone using the browser
  open the journal. `jot lock --recovery-code`, `jot unlock --recovery` and `jot lock-info` cover the command line; passkeys work
  only in the browser, on their own site. Tested with Chromium's virtual authenticator (PRF on), not with real phones or keys.
- **Not yet:** history snapshots (none exist yet) and the paper tools' hand-off of a scan, which waits in browser storage
  unencrypted until the journal is unlocked. Encrypting only the private parts of a journal was set aside: dates, headings and
  structure would still show.

## The writer's own day, and starters that follow their method (28 October 2026)

First phase (E0) of `docs/proposals/editor.md`.

- **My day starts at** (Writing preferences: midnight, 1 a.m. to noon; default midnight). Before that hour it is still yesterday
  for Today ＋, Quick note ＋, Carry tasks forward and Week review, so a night shift stays one entry. It is a preference in this
  browser, not a document field: dates in the file stay ordinary ISO dates and the format is unchanged. `localToday(now, dayStart)`
  in `parser/automation.mjs` does the arithmetic. Back to standard settings keeps it, as it keeps the note. Guides: "define the
  'day' by sleep, not midnight" (docs/methods/digital-daily-notes.md, line 518); "Date each Daily Log by **your** day, not
  midnight" (docs/methods/bullet-journal.md, line 627). Whether it should also be a document field for shared journals is open.
- **Template starters:** Morning pages has no prompt on the days, since "Prompts defeat the method"
  (docs/methods/morning-pages.md, line 663); a few starters wait after the days for stuck mornings, phrased after the guide's
  own (lines 205–212, 497–503). Day planner's time blocks cover the whole day (narrowed in Plan), since "8:00–22:00 timelines ...
  drop night shifts" (docs/methods/travelers-notebook.md, line 663). Gratitude asks for one okay thing a day plus the best of the
  week, and a new Gratitude, weekly starter asks only once a week: more daily lines are not supported by the evidence and weekly
  gratitude lives on the weekly review (docs/methods/gratitude-journaling.md, lines 589, 593, 599). These are design readings
  of the guides; none of them tested a template editor.

## Links between days and records (27 October 2026)

- **Targets:** a record's `#id`, and a dated heading's date (`#2026-10-25`). The first heading with a date is the target; a record ID
  equal to a date wins. Nothing else (other headings, tags, footnotes) is a target, so links stay stable when wording changes.
- **Repeated dates stay valid.** Spec §2.3 and the `same-day` case keep two headings with one date warning-free; only a link to such a
  date carries `ambiguous-reference`, since it may mean either.
- **Unresolved, never blocking.** A missing `#id`, or one that names a duplicated record ID, is an `unresolved-reference` warning at the
  link; the text stays as written. Links are found in all inline writing (including tasks, events and margin notes) and in the record
  fields `relation` (after the kind), `member`, `source`, `parent`, `migrated-to` and `prompt` when the value is exactly a link.
- **Other files are not opened.** `other.jot#id` is kept as written and not flagged; checking it would need file access a reader
  of one document does not have. The AST gains a derived `links` list and `anchor` on target nodes (schema updated).
- **Preview ids are per page** (`jotln-<page>-<target>`, like footnotes' `jotfn-`), so embedded and side-by-side previews never clash.
  Each target shows a **Linked from** line naming the entries and records that link to it; unresolved links render as text.

## On-device pitch meter for voice practice (27 October 2026)

The writer's Voice practice tool may use the microphone, as a scoped exception to the rule that capture tools do not. The listening
tool still never uses it. The microphone opens only after the person presses Start (`getUserMedia` with echo cancellation, noise
suppression and automatic gain off, so they do not bend the pitch); the sound goes to an `AnalyserNode` that is never connected to
the speakers, and a YIN estimate a few times a second keeps only voiced pitches in page memory. No audio is recorded, stored or sent;
no measurements leave the page. Stop, closing the dialog and leaving the page stop every track and close the audio context, and the
dialog says "Microphone off". The only preference kept is an optional target range, in local storage, with no default: no gendered
presets, scores or judgement words.

The summary is median and 10th/90th percentiles of voiced frames, plus voiced time. The journal changes only on Add, with plain text:
a `#### Voice practice` note, `:::record measurement` records for `pitch-hz` (Hz, with `low`/`high`) and `voice-minutes`, and an
observation with `method: voice-practice@1` (`exercise`, `resonance`, `strain`, `felt-like-me`, `recording`), so existing charts plot
progress. A recording made elsewhere can be attached to the document from the dialog and is linked only on Add; there is no in-app
recording. Browser tests use Chromium's fake microphone with a generated tone; no real device is required.

## Optional music capture, plain-text listening notes (26 October 2026)

The writer's Listening tool can capture title, artist, album, link, capture time and setting notes. Its output is an ordinary
`#### Listening` section with prose and a Markdown link, not a service-dependent document type. Any text editor can create or edit it.
Manual capture accepts Spotify, YouTube Music and other HTTPS song links. This tool does not import media or access the microphone.

Spotify capture uses a registered public Client ID, a static same-origin callback and Authorization Code with PKCE. The only scope
is `user-read-currently-playing`. Sign-in validates the popup/origin or a same-origin return channel, plus random state; the verifier and tokens stay in page memory.
The public ID alone may be remembered locally or configured by a host. No secret is needed in the static site.

Playback is fetched only on request, fills review fields, and changes the journal only when the user chooses Add to this entry.
Empty playback, paused playback, access denial, rate limits, cancellation and disconnect are handled without removing existing
writing. Manual entry remains available without Spotify. This extends the earlier offline browser-tool boundary with explicit playback metadata capture.
Live sign-in requires app registration and Spotify's allowed-user rules;
service HTTP responses are stubbed in automated UI tests, not a claim of testing a real Spotify account.

## Highlighter strokes above ink (26 October 2026)

A highlight now composites a translucent marker, brush or pencil stroke **above** the text with multiply blending, so the visible
result depends on the ink beneath it. The source ink and highlight colors remain separate, unchanged Jot attributes. The stroke
covers letters and their decorations; text selection, links and screen-reader text stay native.

Each word owns a non-interactive overlay, so wrapping and print pagination do not rely on screen coordinates. The original passage
stroke joins the spaces between words. Typed and handwritten previews use the same stroke generator and compositing rules. Dark
mode no longer forces highlighted text to a fixed blue on a cream strip. Print and standalone HTML retain the compositing; pixel
checks verify changed ink pixels, and PDF checks verify the retained multiply operation.

## One paper stylesheet for the site and preview (26 October 2026)

Every site page links to `jot/handwriting.css`, including the workspace that renders journal previews. The sheet is generated from
`handwritingCSS()` in the shared renderer; `tools/build-handwriting-css.mjs --check` prevents drift. Standalone renderer consumers
use the same generator. Page-specific styles retain their layout responsibilities; paper, handwriting fonts, ink and mode colors
come from this sheet.

Light mode uses warm cream paper and blue ink. Dark mode uses charcoal paper, subtle grain/dots and lighter ink. Color hints keep
their original source values: dark previews adapt ink for legibility, while print returns to light paper and the original ink colors.
Standalone HTML export embeds the shared stylesheet and handwriting fonts, including when the site loaded the sheet through a link.

The homepage remains informational, with no editor, form or writing input. Its feature gallery uses real renderer output for multiple
ink/highlight colors, decoration strokes, tasks, tables, callouts, footnotes and measurements; readers can reveal each example's Jot
source. The writing workspace remains at `/write/`.

## Text and checkbox alignment within grid cells (26 October 2026)

Dots now mark cell boundaries. The handwritten renderer measures each font's visible letter height and centres body text within one
row and headings within their line boxes. This replaces the earlier baseline-on-dots alignment. Checkboxes are centred in the first
grid cell; task text starts at the next column. Wrapped tasks keep their checkbox in the first row, and empty task lines use one row.
The shared renderer carries the alignment into Write, VS Code, printing and standalone HTML.

## Optional template grid layout (26 October 2026)

The template editor now previews full-width blocks on physical handwritten pages. This supersedes the earlier template-editor
boundary that excluded page layout. It does not add scanning codes, fixed-position text or responsive columns.

- A block can reserve a **minimum** of 0–200 grid rows including its heading (0 means Auto), leave 0–20 blank rows after it, and start
  on a new page. Content expands beyond the minimum without clipping. Blocks that fit one page move intact to the next page when
  needed; oversized blocks continue in source order. Resizing snaps to rows and has both numeric and keyboard controls.
- Page settings name A5, A4, Letter or Pocket paper, 4–7 mm dot pitch and 4–30 mm minimum margins. `pageGeometry` rounds the writing
  area to whole rows and columns. Preview fitting scales only the display, not the measured print geometry.
- These are optional presentation hints in existing hidden comments: `jot-page: {"paper":"A5","pitchMm":5,"marginMm":8}` and
  `jot-block: {"id":"notes","rows":8,"gap":1,"newPage":false}`, closed by a separate `jot-block-end` comment. Values are validated and
  bounded, never interpreted as HTML or CSS. Block ids link repeated instances to their template block.
- Unchanged Auto-only templates omit the extra layout markers to preserve compact text. The editor generates
  markers separately for its visual preview. Saved template JSON and the hidden template comment round-trip all layout settings.
- The shared handwritten renderer aligns children within each sized block, then allocates its minimum rows and page-start space.
  Write restores a file's paper/grid settings; print and standalone HTML retain block space. Editing outlines and controls stay in
  the template editor. Other text readers can ignore hints and still read the complete journal.
- Browser tests cover row geometry, page starts, drag and keyboard sizing, undo/redo, Auto, oversized blocks, growth beyond the minimum,
  file round trips, Write, HTML export, phone width and accessibility. Physical printer proofs remain a separate check.

## Two representations, two extensions (draft 3, 26 October 2026)

Jot v1 has two representations with the same writing syntax:

- **`.jot`, plain Jot:** UTF-8 text, directly readable and editable in any text editor, on a phone or an e-ink writer. It cannot embed
  binary attachments. This is what most people write and what templates produce.
- **`.jotz`, packaged Jot:** one ZIP-based file with journal.txt, manifest.json and assets/, keeping images, corrected scans, editable
  ink and other assets together with the writing. Its bytes are not plain text; journal.txt is readable after extraction.

Neither limits a journal to one day, and methods can blend within either. Readers decide by content (a ZIP signature at byte zero
means a package), so a mislabelled file still opens, including `.jot` packages written under draft 2. Writers use the right extension
and save plain `.jot` whenever there are no assets. Text-only tools may list only `.jot`.

Why: with one extension, a packaged file opened in a text editor showed as unreadable bytes, and text-only tools had to inspect each
file before refusing it. Plain and packaged files now look different before anyone opens them (precedent: Fountain's plain
`.fountain` beside Highland's zipped `.highland`).

This supersedes draft 2, which used `.jot` for both, and the older statements that called plain `.jot` legacy-only or the package the
only native representation.

## Numbers, charts and the weekly dashboard (26 October 2026)

- **A chart is a record** (`:::record chart`, spec §5.2.1): it names metrics and dates and holds no values, so the file stays plain
  text that says what it charts, and a reader without charts loses nothing. The numbers stay where they were written: `measurement`
  records, and plain-number fields of other records (the template editor's Ratings and Fill-in blanks).
- **One metric, one chart.** Each metric is drawn on its own value axis (a scale's range when it has one), days with nothing written
  are gaps, and two numbers on a day are averaged for display only. No dual axes: sleep hours and steps never share a scale.
- **One renderer, drawn by Chart.js.** `parser/charts.mjs` reads the numbers and builds each chart's Chart.js configuration (pure, tested
  in Node); Chart.js 4.6.1 draws it, bundled as `parser/vendor/chart.mjs` with only line and bar charts, so nothing is fetched at run
  time. Each canvas is named by a text summary and the numbers are also a table. `parser/preview.mjs` (the page, DOM only) is shared by
  the workspace, the template editor's Page view, the home page and the VS Code extension, which carry copies (`site/dist/jot/`,
  `vscode/media/jot/`) checked in CI.
- **The rule of 7 is a nudge.** The template editor says when a week page has more than seven widgets; it never refuses.
- **No book maker.** The print engine (`journal/`, KDP books) and the template editor's print day layout import are removed: Jot is
  written and read as text, and printed from the browser (the workspace's Print / PDF).
- **The site's home page explains Jot;** the writing workspace moved from `/` to `/write/` (examples open there with `?open=`).

## Fuller formatting and handwritten pages (26 October 2026)

- **Six more marks** (spec 4.2.1): `==highlight==`, `++underline++`, `^superscript^`, footnotes (`[^1]`, `[^1]: …`), centred lines
  (`-> … <-`) and callouts (`> [!NOTE]`). Chosen because Obsidian, Typora, iA Writer, markdown-it plugins and GitHub already use them,
  so a `.jot` reads the same elsewhere. They are Marked extensions in `parser/jot.mjs`; each needs a non-space just inside its marks,
  so ordinary prose (`a == b`, `C++`) is untouched. No subscript: `~text~` stays text (4.2).
- **Handwriting is a look, not data** (spec 8.3.1). `parser/handwriting.mjs` writes a rendered page in an open handwriting font
  (Caveat as Pen, with its two full alternate sets chosen per letter; Playpen Sans and Shantell Sans, which bring their own contextual
  alternates), with small seeded wobbles per word. The text in the page stays the text: copying, search and screen readers are
  unaffected. Same text and seed, same page.
- **On the dots.** Lines are one dot pitch apart, the pitch is snapped to Chromium's 1/64 px layout unit, blocks are rounded up to whole
  rows, two-row headings are nudged onto a row, the dots are drawn at the measured baseline, and the printed page's writing area is a
  whole number of rows (`pageGeometry`). Printed, the dots and the letters land together on every page.
- **Hand-drawn boxes belong to the handwritten look.** On a handwritten page a task's box is a pencil square and a done task's a
  scribbled tick (`boxSVG`, SVG paths from a seed), drawn one of four ways each (`BOX_KINDS`, `TICK_KINDS`), never the same pair twice in
  a row, in the ink colour so they print as lines; the tick draws itself with a CSS stroke
  animation (`pathLength` 1, dash offset 1 to 0), finished at once for reduced motion and in print. Typed pages keep plain boxes. No
  extra font for the boxes: the page already writes in Caveat.
- **The home page explains; it takes no input.** No editor or form on it: the writing workspace is at `/write/`.
- **Fonts are bundled** (`parser/fonts/`, SIL OFL 1.1, Latin and Latin Extended, regular and bold), never fetched; the site publishes
  `.woff2` for them.

## Formatted pages and export (26 October 2026)

- **The writing stays plain; the page is formatted.** Styles (Journal, Notes, Plain; `parser/styles.mjs`) are presentation only: the
  `.jot` file is never changed by choosing one. They use the reader's own fonts (system stacks), so pages stay small and offline.
- **Jot's marks read as a page.** A dated heading shows its date in words (the rest of the heading kept when it says more than the
  weekday), tasks show their state, events, questions and ideas their sign, tags and contexts are marked, margin notes sit beside the
  text. Every view (workspace, template editor, VS Code, export) gets this from `preview.mjs`.
- **One file to keep or share.** Download page (and VS Code's Export as HTML) writes one HTML file: the page's own styles, charts as
  PNG pictures with their summaries as alternative text, attachments and the hand in use as data: URLs, no scripts, nothing fetched.
  PDF is the browser's print, with `@page` margins and page numbers.

## Health data import (27 October 2026)

- **From the app's own export, on this device.** `parser/health.mjs` reads Apple Health's `export.xml` and daily CSVs from Health
  Connect, Google Fit, Fitbit, Garmin and Oura; the workspace's **Import health data**, `jot import-health` and the tests share it.
  No service APIs, accounts or network. `export.zip` is not opened: Apple's archives hold directories and members far beyond the
  `.jotz` reader's limits, so people unzip it and choose `export.xml`, which is scanned as a stream (a regular expression over `<Record>`
  tags, never a DOM), keeping only daily totals of the chosen kinds, up to 2 GB.
- **The author chooses, and sees it first.** Metrics and dates are chosen (the last 30 days to begin with), and every record to be
  added or filled is shown before **Add to journal**. Writing goes through `addNumbers`, so imports fill blanks, never repeat a day and
  carry `source:`; each record also says its `aggregation`. `addNumbers` now parses twice per call instead of twice per number.
- **How a day is counted.** Totals (steps, distance, energy, flights, exercise) take the larger source per day, so phone and watch are
  not added together; heart rate, HRV, SpO2 and respiratory rate are means (lowest/highest offered, off by default); body mass and fat
  are the last reading; sleep is time asleep with every source's spans merged, dated on the morning it ends; mindful minutes are merged
  spans. Dates are the export's own local dates.
- **Units as exported.** No conversion; a metric seen in two units becomes two metrics (`body-mass-kg`, `body-mass-lb`), CSV sleep in
  minutes or seconds is `sleep-minutes`/`sleep-seconds`, and `addNumbers` leaves a blank with a different `unit:` empty (`skipped`).
  HealthKit's percent is a fraction in `export.xml`, so 0.97 % is written as the 97 % it means.
- **Left out on purpose.** Medications, lab and clinical records (`export_cda.xml` is refused), reproductive and sexual health, and
  location (routes, latitude/longitude columns) are never read, even by the generic CSV fallback: they are the most sensitive parts of an export and a journal is often
  shared, synced or printed. Vendor scores (readiness, sleep score, body battery, stress) are calculations, not measurements. Nothing
  infers a health state from the numbers.

## Automation and connections (26 October 2026)

- **The file stays the source.** Automation reads what a journal holds (`parser/automation.mjs`: tasks, events, numbers) and writes back
  only as ordinary Jot: a filled `value:`, a measurement with `source:`, `[>]` on a carried task, a review section. Anything a service
  returns is a record naming it in `source:`.
- **Nothing reaches out by itself.** Only `parser/connect.mjs` touches the internet (webhooks, Todoist, Open-Meteo), and only from a
  command someone runs or a setting they turned on; VS Code asks before each webhook or Todoist send and keeps the Todoist token in its
  secret storage. The website's tools are offline. A webhook gets tasks, events and numbers, never the rest of the writing.
- **One implementation.** The workspace's Tools row, the `jot` command line and VS Code call the same functions, so a calendar, a CSV
  or a rollover is the same everywhere.
- **Remembering what was sent** is a `sync` record (`:::record sync #sync-<service>`, one `sent:` key per task) in the journal itself, so
  it travels with the file; formatted pages hide it.
- **Times are only what is written.** An event's time is read only when it is unambiguous (`19:00`, `7pm`, `at 21`); "at 7" is all day.
  A CSV date like `03/04/2026` is left out and counted unless the reader says the day comes first.

## Query views (27 October 2026)

- **A query is a view, like a chart.** `:::record query` (spec §5.2.2) lists or counts the tasks, events, entries or numbers in the
  same journal; the answer is computed when the page is shown and never written back, so the file holds only the question.
- **A fixed vocabulary, not a language.** `show`, `status`, `priority`, `tag`, `context`, `text`, `metric`, `period`/`start`/`end`,
  `stat`, `limit`, `label`: no expressions, no code, nothing fetched. Several tags mean all of them; several statuses any of them.
- **Periods count from the query's own `date:`, else the entry it is in** (`period: week` is that entry's ISO week, as a chart's default), so a query
  copied into a template's daily or weekly page means "this day/week" wherever it lands. With no dates every item counts.
- **Never a silent answer.** Any field the reader can't read (unknown name or value, a blank filter, wrong for the `show`, an unknown metric) replaces
  the result with the problem and an `invalid-query` warning, because quietly ignoring `status: opne` would show every task.
- **One implementation.** `parser/query.mjs` serves the preview, the workspace's checks and `jot query`; `#tag`/`@context` recognition
  moved there (`TAGGED`, `marks`) so the renderer and queries read the same marks. A query and its `limit` are never chart numbers.
- **The command line** runs the query records in each file (`jot query journal.jot`), or one typed as flags, asked of each file on its own
  (`jot query a.jot b.jot --show tasks --tag health`), where `--period` counts from `--date` (default today). A problem exits 1.

## Palettes and moodboards (27 October 2026)

- **Colors are text first.** `:::record palette` holds `color: #RRGGBB name` lines (`parser/palette.mjs`). `#RGB` is accepted as
  shorthand because people write it and it expands without guessing; alpha and color functions are not, because a printed swatch is
  opaque and a hex code is what other design tools paste.
- **Every swatch says its name and hex in words**, in black or white by WCAG contrast (never below 4.5:1). Color alone never carries
  meaning (spec §8.1).
- **Nothing is dropped silently.** A color Jot cannot read stays in the source, shows a note on the page and is an `invalid-color`
  warning. Only `palette`, `moodboard` and `moodboard-and-palette` records are checked; `color:` elsewhere is just a string.
- **Moodboards use attachments only.** `image:` paths resolve through the same asset lookup as Markdown images; nothing is fetched,
  and a missing picture shows the usual "not attached" note. A paragraph of only pictures is drawn as the same grid.
- **Copying is explicit.** The workspace copies the palette at the caret as CSS custom properties or JSON (Clipboard API, then the
  older copy command, then a download), and Add to palette writes plain text into the record.

## Checking files and the to-jot skill (27 October 2026)

- **`jot check`** prints the parser's diagnostics as `file:line:col severity code message` (1-based, columns in characters) and exits 1
  on an error; warnings fail only with `--strict`. It reads `.jotz` through `readDocument`, unlike the other commands.
- **One skill for every agent.** `.agents/skills/to-jot/` (where Codex looks) is the only copy; `.claude/skills/to-jot` is a relative
  symlink, which Claude Code follows (checked by asking it to load a symlinked probe skill). `MANIFEST.json` hashes a symlink as git
  stores it: its target path. The skill never invents dates or values and finishes with `jot check`.

## What the current code does

- parse(text) parses writing and preserves its source; stringify(ast) returns that original source, not edits to AST nodes.
- readDocument(input) reads either representation by content and returns source/assets plus a packaged flag.
- pack(...) writes the bytes of a `.jotz`; unpack(...) validates and reads one.
- The workspace (`/write/`) opens `.jot`, `.jotz`, `.md` and `.txt`. Download .jot saves plain `.jot` when the journal has no attachments, and one
  `.jotz` when it has. Export writing .md writes the writing only.
- The template editor writes plain `.jot` and opens either.
- readDocument's detection is a prototype, not a claim that every malformed package can be told apart from arbitrary text.

## Packaging and product boundaries

Jot is the journal document and source language. This project ZIP is a development/distribution bundle containing the website and specification; it is not itself a journal file. Packaging does not encrypt content. PDF is inspiration for carrying a document and its assets together; Jot does not use PDF encoding or require a fixed page layout.

The root site covers Jot as a whole. Scanner and handwriting are separate tools at /scan/, hidden from the site (no links, `noindex`) until they are finished (26 October 2026). Handwritten marks remain original content, with no required OCR or transcription. The roadmap also includes composable content blocks, individualized accessibility preferences, multiple languages and proofing improvements.

## Public scrobbling reads

The writer can read Last.fm and ListenBrainz public listening activity on explicit request and insert the reviewed result as ordinary
prose. Current reports and recent history have distinct labels; historical listen times are separate from capture times. The reader
requires no service connection. No scrobbles are submitted. Last.fm's application key stays in page memory, usernames persist only
after successful reads, and requests use no browser credentials/referrer. Libre.fm is manual-only because live API probing returned
an access challenge; direct browser compatibility was not established. Provider responses are mocked in regression tests.

## Includes (27 October 2026)

- **View-only, explicit, local.** `![label](other.jot#id)` on a line of its own shows that part of another journal in place (a record
  by ID, every entry with a date, or the whole file), framed and labelled with where it came from. The source keeps its one line;
  `jot flatten` writes a copy with includes expanded, only when run, and never over the journal. This replaces "no includes" in spec
  11.2; remote includes stay forbidden.
- **Paths stay inside.** Only relative `.jot` paths, resolved against the including file and kept within the root the host names (the
  VS Code workspace folder or the document's folder, the `.jotz` package, the CLI journal's folder or `--root`). Schemes, absolute
  paths and climbs above the root are refused, symlinks may not lead out, files over 1 MiB are not read, and nothing reaches a network.
- **Hosts read, the renderer draws.** `parser/include.mjs` is pure; the host lends file text through `renderPreview`'s `include(path)`.
  In VS Code the extension reads the files and posts their text to the webview, whose strict content policy is unchanged; in
  `/write/` includes resolve against `.jot` attachments of the open `.jotz` (attaching a `.jot` inserts an include line).
- **Never a silent blank.** Includes nest 3 deep; a loop, a missing file, an unknown fragment, an unsafe path or the depth limit says
  so in place. Included footnotes stay in the frame with their own ids; page-layout comments in an included file are ignored.

## Voice practice and AuDHD profiles (27 October 2026)

- **Four new method profiles**, in `specification/profiles.json` (and its site copy), spec §13.56–13.59 and, for the first three, a
  guide in `docs/methods/`: `voice-practice@1` (session), `task-initiation-and-transitions@1` (task), `low-demand-check-in@1`
  (observation) and `access-needs-and-scripts@1` (collection). They complement, and link to, the ADHD, sensory, stimming, spoons,
  habit and gender euphoria profiles rather than repeating them.
- **Voice practice is non-medical and sets no target.** Numbers (`minutes`, `pitch-hz`, `resonance`, `felt-like-me`) are plain
  decimals so charts draw them; scale records with anchors fix the rating axes. No gender target, "passing" score, comparison with
  other voices or required dysphoria. `recording` only names a clip (in a `.jotz` or elsewhere); clips and pitch figures can identify
  a person, so exports should leave them out unless selected.
- **AuDHD profiles carry no debt.** `started` has no failure value; estimate versus actual time is for learning, never a score.
  `status: skipped` is a complete check-in, gaps stay gaps, and there are no streaks, catch-up prompts or missed-day counts. The
  check-in names its energy `check-in-energy` so it never merges with other profiles' differently scaled `energy`. No
  diagnosis is required or recorded.
- **One catalogue, tested.** The site copy of `profiles.json` now says `"format": "jot-profiles"` like the canonical file (nothing
  read the old `dotjot-profiles` value), and `tools/test-profiles.mjs` checks the copies are identical, ids are unique kebab-case,
  every example parses with no diagnostics as a complete record of its profile, and §13 catalogues every profile.

## Artist and designer profiles (27 October 2026)

- **Three profiles, each with a method guide.** `drawing-practice@1` (a `session`: subject, medium, focus, optional minutes,
  reference, credit, what worked, next try, asset/alt), `design-iteration-and-critique@1` (a `review`: project, iteration, decision,
  rationale, critique by role, change-next, linked to the previous version with `relation: revises #id`) and
  `moodboard-and-palette@1` (a `palette`: theme, `color: #RRGGBB name` lines, mood words, assets with alt text and credits).
- **Colours always have names.** A palette colour is `#RRGGBB name`; swatches are an optional rendering, and any role a colour plays
  is written in its name, so colour is never the only carrier of meaning (spec §8.1).
- **Credit and roles, not names.** References made by others carry `credit`; critique is recorded by role (`critique-from`), not
  by person, unless they agreed to be named.
- **No streaks or scores.** Drawing progress is seen by comparing drawings of the same focus.
- **No separate creative-session profile.** Time, focus and interruptions are covered by `pomodoro-log`, energy by
  `spoon-theory-energy-accounting`, and experiments by `project-lab-log`; a fourth profile would duplicate them.

## Writing preferences and gentle return (27 October 2026)

The writer has a Preferences panel with independent choices (text size, line spacing, line length, density, higher contrast, reduced
motion, and hiding the preview, parser tabs, counts and decoration), a focus mode left with Escape or its visible button, a one-line
Quick note into today's entry, and return to the saved caret/scroll with an optional note for next time. There are no presets named
after diagnoses, no timers, sounds, streaks or catch-up prompts. Choices and the note are per-viewer conveniences in localStorage
(`jot-prefs-v1`), never in the journal, and every read/write tolerates failing storage. They apply to the screen only: the shared
renderer stylesheet, the handwriting grid and print are unchanged; a hidden preview is moved off screen, not removed, so handwritten
pages are still measured for print and export. Quick note uses `automation.addToDay` (the entry logic behind Today ＋ and rollover,
now exported), escapes a leading heading/fence/record marker so the note stays one plain line, and inserts only the difference, so
it is one undo step and the cursor stays put. The ROADMAP rows are marked partial: not yet validated with intended users.

## Persistent writing music (27 October 2026)

The workspace offers a Spotify embed as a writing companion, loaded only after a user supplies a Spotify share link and presses
Load. The iframe stays outside journal rendering and survives text edits, preview switches and focus mode. Closing it removes the
iframe. It uses no capture tokens or SDK, stores no player preference, and does not reload automatically. The embed may contact
Spotify and use its own cookies/sign-in; availability is controlled by Spotify. The journal is never included in the embed URL,
and exports and print exclude the companion. Listening capture remains a separate reviewed action.

## Spotify short references (27 October 2026)

Entries can link tracks, albums, playlists, artists, episodes and shows with Spotify's `spotify:type:id` URI, optionally spaced
after the first colon. Bare references get a provider/type label; Markdown links supply a name. The parser preserves source,
the shared preview and HTML export expand to fixed-host HTTPS links, and no metadata/player request happens on render. The
persistent player also accepts these references, and still requires its Load action. Unknown or malformed forms remain text.

The entry's music dialog also accepts a multiline collection: one Spotify short reference or HTTPS link per line, with an optional
`Name | reference` label. Add inserts all references together as Markdown links; a title or now-playing fetch is not required.
Spotify share URLs with recognized types/IDs are shortened on this explicit insertion, while existing source is never rewritten.

## IMDb and YouTube references (27 October 2026)

The media list now mixes music, films, TV, episodes and videos, without requiring a now-playing capture. `imdb:tt…`,
`youtube:VIDEO_ID` (or `youtube:video:VIDEO_ID`) and `youtube:playlist:PLAYLIST_ID` expand into fixed-host HTTPS links in
previews and HTML exports. IMDb is identification only. No render-time metadata or video embed request is introduced.
Full title/simple video/playlist URLs can shorten on explicit Add; timestamped video URLs retain their full form. The writing
player remains a separate opt-in Spotify embed. Parser source round-trips and unknown forms remain unchanged.

## Opt-in MusicBrainz suggestions (27 October 2026)

The background-media dialog has a dedicated lookup field, explicitly enabled for online suggestions. After three characters and
at least a 1.1-second pause/request interval, it searches MusicBrainz recording, release group, release, work or artist entities.
Only the search text/type go to the service, never journal writing, reference lists, cookies or capture tokens. Choosing a match
appends a labelled MusicBrainz ID to the review list; only Add changes the journal. Results display available artist/date/version
and duration information, never auto-select, and use DOM text. Closing disables search, aborts pending requests and prevents late
results. Per-page caching, timeouts and busy-service backoff keep failure recoverable with manual references. MusicBrainz shortcodes
are database identities and expand offline in the shared renderer; they do not imply a playback-provider match.

## Local autocomplete in the writer (27 October 2026)

The workspace suggests existing tags/contexts, internal date/record links and measurement names/units/scales from the current
journal only. It uses a page-memory index of parsed writing, excludes code/metadata/comments and URL destinations as tag sources,
and offers no ambiguous duplicate link targets. Units are filtered by the current metric; distinct units remain distinct, and
no numeric values, conversions or other fields are inserted implicitly. A chosen suggestion replaces only its active range,
using native editing for undo where available. Typing or Enter alone never silently accepts the first match: arrow/pointer
selection is required. Escape dismisses, Control/Command+Space invokes, IME composition suspends, and a local-only preference
turns suggestions off. No network, cross-journal indexing, new syntax or persisted vocabulary is introduced.

## Reusable People and Places books (27 October 2026)

The workspace reads explicitly opened plain `.jot` reference books and creates/edits generic `person` and `place` records with
stable IDs and labels. People support repeatable aliases/contact methods; places add postal addresses, WGS84 coordinates,
elevation/accuracy, descriptive IANA timezone and access/directions notes. Coordinate pairs/ranges, finite numeric fields,
country-code syntax, HTTPS websites and timezone identifiers are checked by the reference-book tool. Generic Core parsing does
not claim full address/contact validation. No geolocation, geocoding or map tile service is called automatically.

Autocomplete may combine the current document with these explicitly chosen books, qualifying references with the book filename.
It indexes identity names/aliases and place city/region/country, not contact methods or precise coordinates. Loaded books are
in memory unless the user opts into IndexedDB remembering; storage failures leave downloads available. Downloads preserve
unrelated source and unknown record fields when editing. Duplicate filenames/IDs and malformed imports are rejected rather than
silently replacing data. In-document references retain stable IDs when display names change.

The shared preview has an optional host callback for simple relative `.jot#id` links. The workspace opens a reference record
locally or asks for a missing book, never fetches a filename. Exports keep only the authored relative link and name, with no
library records or contacts injected. Books are not auto-attached to `.jotz`; the user keeps or shares them separately. A place's
timezone is descriptive and never changes a document or entry timezone. Charts exclude person/place records from measurements.

## Entry timezone overrides and explicit capture (28 October 2026)

`@timezone: IANA/Name` uses existing directive syntax and overrides the entire current dated entry, resetting at the next dated
heading. Document Timezone metadata is the default; invalid/blank and duplicate declarations warn, orphan directives warn, and
no device zone silently resolves existing writing. Derived AST context and preview labels expose the effective zone. The entry
editor button adds/removes directives with undo and preserves written dates/times. Place zones remain descriptive only.

Calendar export converts uniquely resolvable local events to UTC and retains explicit-offset instants. DST folds/gaps, invalid
zones and malformed timestamps stop export rather than guessing. All-day dates stay dates; multi-file CLI export preserves each
file's default and entry scope. Complete timestamps win over inherited local-time context. Runtime Intl provides timezone data.

Chromium-targeted buttons capture actual current timestamps with offsets and request geolocation only on an explicit action.
Time uses a declared entry/document zone, or the device zone explicitly for a new captured timestamp when undeclared. Location
is one-shot, reviewable, never watched, and never geocoded or assigned an inferred timezone. It can be inserted as a place record
or reviewed/saved in a separate book. Browser permissions and location services apply; no real-device geolocation verification
is implied by mocked browser tests. No automatic created/modified or inline timestamps are added on save/typing.

## Writing tools and mobile workspace (28 October 2026)

The browser writer adds source-formatting controls and shortcuts, structural list continuation, literal find/replace, parsed
heading navigation, a searchable command menu and editable entry templates. These use existing Jot/Markdown syntax; no format
extension or writing upload is introduced. Native Chromium edits retain undo, with input-event fallbacks. Autocomplete's explicit
selection wins over list continuation, IME is left alone, and software-keyboard line breaks are handled through cancelable
beforeinput. List continuation is locally optional, resets new task states and stops on an empty item; ordinary prose Tab remains
keyboard navigation. Current-time, location and history timestamps retain the previous manual-only decision.

Commands expose writing actions and existing journal workflows together. Search, commands and outline do not mutate source until
an edit action is chosen. Find/replace uses literal text and Unicode-aware word boundaries, with explicit replace-all and a stale
source check. Templates offer blank daily/weekly/monthly/meeting/freewriting prompts, reviewable and validated before insertion
after the saved selection; they infer no experiences or dates. Existing writing invitations remain available separately.

View controls keep the preview measurable for handwriting print/export, and focus/preferences still apply. Browser tests cover
320/390px light/dark Chromium touch emulation, keyboard/native undo, composition/software-input paths, autocomplete precedence,
source-change guards and new-dialog accessibility. Physical mobile keyboards/devices are not verified.

## Autocomplete expansion and WriteFreely research (28 October 2026)

The roadmap now includes all ten proposed sources: Jot schema/templates, explicitly opened journal archives, reviewed vCard
contacts and calendar files, Open Library, TMDB, YouTube Data API, Wikidata, Photon/Pelias place search, and bibliographic imports
with Crossref lookup. These are planned additions, not implemented integrations. Local sources come first; public providers need
explicit lookup, source/identity review, credential/terms evaluation and undoable insertion without sending surrounding writing.

WriteFreely is an exploration of enhancing the writer and adding optional publication. The comparison and pinned upstream
evidence live in `docs/proposals/writefreely-integration.md`. The first recommended prototype preserves Jot's writer and adds a
reviewed selected-entry/selection publishing adapter to a separately deployed WriteFreely instance. Its optional ProseMirror
editor and a combined application remain alternatives to evaluate, with Jot syntax/source preservation and license review.
ActivityPub publication is not private journal synchronization; autosave remains local and publication must be explicit. No
WriteFreely code, server, credentials or federation behavior is added by this roadmap change.

## Minimal writer default (28 October 2026)

The writer opens as a single writing pane at every screen width, with filename, save status, Open, Download, Preview and Tools
in the top bar. A first visit starts blank; existing browser autosaves are restored. Header navigation, introductory copy,
formatting rows and secondary controls stay out of the default writing surface.

Tools is the searchable command menu (Control/Command+K). It retains journal workflows, file actions, navigation and view changes.
Journal tools, Formatting controls and Writing options explicitly reveal their controls; Attached files reveals the attachment
list and appears automatically when files are present. Preview opens beside writing on desktop or on its own on mobile, with
Write returning to the editor. Focus mode, manual capture, local autosave and undo remain available.

The editor shell and source use system fonts. Rendered paper typography, handwriting, printing and exported pages keep their
existing styles. This changes the default presentation without adding format syntax, publication or further editor features.


## Live writing and explicit device saving

Jot Writer defaults to a source-backed live writing surface on desktop and mobile. Supported prose and flat lists project into semantic DOM; source offsets drive edits. Unsupported structures remain source-preserving cards with explicit Source editing. Document-dependent chart/query cards show source rather than an incorrect isolated calculation; the full page preview remains authoritative. Plain-text paste, local completion and bounded undo stay local. Physical IME and native OS picker behavior need device testing; Chromium automation uses synthetic composition and mocked handles.

Secure Chromium File System Access connects only explicitly chosen files, with explicit Save, Save as and download fallback. Handles stay in memory. Exact-byte external-change checks are best effort, not an atomic filesystem transaction. Locked journals retain encrypted download behavior rather than entering the plain device-save path. Autosave remains separate from device saving. Relocking clears live projections and their undo history.


## 2026-11-01: Optional BYOK AI writing companion

The owner explicitly requested OpenRouter and local-model BYOK drafts and suggestions with strict Jot output, then a separate
OpenRouter ZDR toggle. This is a scoped change from `docs/methods/digital-daily-notes.md, line 714` (no generative AI summaries)
and `docs/methods/prompt-journaling.md, line 623` (AI prompts excluded). Those guides do not establish benefits of AI journaling;
this is an owner-requested optional tool, not an evidence-backed default or a replacement for the existing local invitations.
Jot's to-jot guidance shapes the prompt: preserve uncertainty and avoid invented facts, dates or measurements.

AI and AI suggestions are off each session. Requests are explicit and send only the instruction and an optionally chosen selection;
there is no background journal processing. Keys and companion state remain in memory and clear on disconnect/page exit/document
lock or replacement. Existing local autocomplete stays local. OpenRouter denies provider data collection, requires parameter support,
and exposes ZDR on by default as an independent routing toggle. No silent privacy downgrade, model retry or cloud fallback. Local
servers must use loopback; BYOK cloud requests are labelled remote. Containers, tool calls and remote journal files are unnecessary
and excluded. Use JSON schema where supported and always validate the local response envelope, Jot fragment and complete edited
source. Apply requires review, checks the original revision, preserves unrelated source and supports undo. Syntax validation does
not prove accuracy or complete profile semantics. Tests mock services; live provider and native webview behavior remain unverified.


## 2026-11-01: Explicit document filename presentation

The owner requested a built-in filename variable in the Jot Document Format. `{{document.filename}}` is an optional inline
presentation token, supplied by the host and rendered as a plain-text basename with extension. It never changes stored source,
record data, metadata or entry dates, and performs no filesystem, environment or network lookup. Unknown/missing context remains
literal; code and escapes stay literal. Included documents have their own context. Writer uses the opened/connected name or the
proposed name for an unsaved document; template and VS Code previews receive their existing file names. Formatted exports capture
the current display. This preserves the rule that filenames do not establish journal facts. Specification §4.2.6 and conformance
fixtures document the extension; no general expression engine or automatic content migration is introduced.


## 2026-11-01: Rename from the document heading

Writer places its editable document name above the writing in live, source and preview views. The name remains separate from
journal content. Enter confirms a local draft name, Escape restores the name from focus, and Tools can focus/select the heading.
Connected file name changes offer Save as and route explicit Save through the same picker; cancellation or failure never claims
to have renamed the file. Save as keeps the original. The filename variable updates with the actual chosen name on success.
The screen heading stays out of print/export; an explicit filename variable in the writing supplies a printed heading.


## 2026-11-01: Everyday browser tools and explicit local transfers

The owner chose offline installation, local-storage protection, wake lock, outgoing/incoming sharing and handwriting; then chose
manual same-network transfers, QR pairing with file fallback, a temporary local inbox without journal-passphrase protection,
and inline over-page handwriting saved as an annotated snapshot with Done/Cancel. These choices do not restart hardware/firmware
work or select a new editor. No therapeutic or productivity benefit is claimed.

Public application assets alone enter the versioned offline cache. Existing local/encrypted journal storage remains separate.
Incoming content never auto-merges; ID conflicts/metadata require review or opening separately. Capture receipts remain in local
journal state, encrypted with that state when locked, to avoid duplicate insertion after partial persistence. Acknowledged nearby
transfers are in a review inbox, not merged journals. No STUN/TURN/signaling service is used. Pairing is explicit and expires.
Incoming OS share delivery needs a controlling service worker; its manifest is only advertised in that state. If a worker is
removed, browser POST delivery can reach the host; the local file-picker inbox is the alternative for strict local-only intake.

Research basis: `docs/methods/digital-daily-notes.md, line 711` avoids third-party journal-content sync;
`docs/methods/expressive-writing.md, line 443` supports keeping writing private unless sharing is chosen. The locally retained
unencrypted pending inbox is the owner's explicit choice and is labelled separately from a locked journal. Ink retains originals
and editable strokes, without OCR or automatic transcription. Native share sheets, physical pens and cross-device network behavior
remain device validation, not claims established by synthetic Chromium tests.

Locally bundled QR and DOM-to-image libraries support the approved workflow without CDN scripts. The public copyright contact in
one exact, hash-pinned dijkstrajs license is preserved by a file-specific privacy-gate exception; emails elsewhere remain rejected.

## 2026-11-01: Reading fonts, original journal hands and legible highlighter strokes

The owner reported that site text was hard to read and highlights obscured the writing, then chose handwriting for journal pages
only. This supersedes the site-wide handwriting direction in "One paper stylesheet for the site and preview." Site copy, guides,
navigation and controls use the original Jot Sans reading face, with system fallbacks; source and code use monospace. Rendered
journals retain the chosen handwritten or typed look. Jot Script 07 is the default for new handwritten preferences; existing
Pen, Neat print and Marker choices remain valid. Font preferences stay in the browser and do not edit journal source.

Both families use the same rounded gel-pen stroke construction. Jot Sans keeps geometric printed letterforms and spacing, with subtle ink variation; it has regular and bold faces. Jot Script has 05, 07 and 10 stroke styles, each in regular and bold. The requested G2-style
gel-pen appearance is a visual reference: the 0.5, 0.7 and 1.0 labels do not claim a measured physical nib or printed stroke width.
These are original procedural fonts under SIL OFL 1.1; existing bundled fonts retain their own licenses. The deterministic Python
pipeline in `fonts/` emits WOFF2 faces, glyph SVGs and a catalog. Python 3.12, pinned generator dependencies, source/artifact checks
and font tests run before generated-copy checks in CI. The existing buildless JavaScript/CSS site serves committed font artifacts;
font construction adds no runtime dependency. `/fonts/` provides sample text, family/stroke/weight controls, shaping toggles and
glyph geometry. Its sample text stays in page memory.

Highlights remain actual translucent marker, brush or pencil strokes above the ink, with multiply blending. Coverage is lower in
dark mode, and displayed dark-mode handwriting ink is lighter. Highlighted handwriting does not receive the simulated per-word
ink fading. The reference palette and source ink/highlight values stay unchanged; print returns to light paper and original ink.
Live writing uses the shared stroke generator while creating mapped text leaves, preserving selection and source-based editing.

Research supports the reading direction, without establishing these exact font designs or stroke values:
`docs/methods/digital-daily-notes.md, line 511` recommends readable fonts when handwriting is a barrier; line 513 names system text
size and high-contrast themes (its specific VoiceOver details remain uncertain). `docs/methods/moodboard-and-palette.md, line 179`
requires named colors alongside swatches, and line 180 calls for words for color roles and contrast ratios for text palettes.
The precise typography and compositing choices respond to the owner's request and are checked in font, renderer and browser
regressions; they are not claimed as tested therapeutic or productivity benefits.

## G2 stroke reference refinement (1 November 2026)

The owner supplied pen writing photographs and requested stroke refinement only.
Script fine/medium/broad nibs now use 40/52/78 units: stronger separation while
keeping medium familiar. Dot and punctuation widths scale with the nib instead
of hitting a common size cap. Every exposed open-stroke start and ending receives
small rounded pooling; connecting anchors retain even joins. The same stroke
construction applies to Sans. No new pen presets or ink colors are introduced.
The photographs guide appearance rather than calibrated physical widths.

## Upright handprinted Sans lettering (1 November 2026)

The owner selected lettering improvements from the G2 color-label photographs.
Sans now has narrower upright capitals, lightly bowed strokes, a handprinted
single-storey a, a less circular O and a barred I distinguishable from l and 1.
Centerlines are width-fit before round-nib expansion, keeping stroke thickness
and open lowercase counters suitable for interface text. Script faces and ink
palettes retain their existing designs.

## Sans and handwriting fusion (1 November 2026)

The owner confirmed a fusion of clear Sans lettering and the supplied longer
G2 handwriting sample. Lowercase e/o/n/m are rounder and more freely drawn;
capitals remain upright with a little more room. Small deterministic differences
in lean, height, baseline and spacing are built into the centerlines before
nib expansion. The font remains native selectable text with stable print and
export, preserving distinctions between I/l/1 and the chosen gel stroke.

The reported clipped/jittery Script bowls also exposed an entry stroke ending
inside the a/d/g/q counters. Those entries now merge at the outside of closed
bowls; initial connectors follow the first pen movement tangent. Higher precision
curve conversion avoids visible coarse fitting at inspector magnification.
Counter probes across pen profiles and weights guard against the reported nub.

## G2 design contract and Jot Mono (1 November 2026)

The owner requested a font agent file establishing G2 pen strokes as the common
model, plus a monospace family. fonts/AGENTS.md applies to every original Jot
family. Mono regular/bold reuses handprinted centerlines fitted before circular
nib expansion. Visible characters and spaces advance 650 units; combining marks
advance zero; kerning is off and ligatures retain the full source column width.
Mono is available in the inspector and used for source editing and code.


## Sans and Mono alternates and junctions (1 November 2026)

The owner requested G2-style alternate characters with a minimum visible variation.
Sans and Mono provide alternate vectors for all ASCII letters and digits through
ss01, with calt alternating repeated characters. Each alternate preserves its base
advance and round nib. Smooth local centerline changes must produce 8-25% symmetric
ink-outline difference over union area after TrueType conversion; the compiler
targets 9.5-23% for quantization margin. This is a design constraint, not a physical
measurement of G2 handwriting. The inspector exposes alternate forms and their ratio.

Closed bowl movements remove capped internal stubs, and stroke intersections
suppress terminal pooling while exposed endpoints retain the gel-ink treatment.
Mono retains fixed columns with shaping enabled. Regression tests check every
alternate, shaping, junction behavior and deterministic generation.


## Script lowercase i and m refinement (1 November 2026)

The owner found the Script lowercase i awkward and then identified m as another
possible source. The i entry now meets the stem below a round exposed top, replacing the sharp top retrace, and its dot sits
closer to the stem along the same forward lean. Advance and contextual anchors
are unchanged. All Script profiles and weights share the revised movements,
including derived accented forms. Tests protect a connected body, separate dot
and usable dot clearance in fine and broad ink. The m also separates its entry
and stem from two smoother shoulders, avoiding the sharp top reversal while
retaining its advance and joining anchors.


## Steadier Script m construction (1 November 2026)

The owner still found m squiggly after the first refinement. Replace its bowed
downstrokes with straight segments at a consistent forward lean, draw two simple
matching shoulders, and shorten its trailing connector and advance from 785 to
690 units. Keep rounded G2 ink and the shared y=90 cursive anchors. This is a
letterform correction; Sans and Mono drawings and alternate rules are unchanged.

## 2026-11-01: Versioned `.jotz` archive proposal

The owner proposed per-entry encryption, portable SQLite FTS5 search and UUID asset links, then clarified that the extension
is `.jotz`, not `.jotx`. Integrations come first. Record the design in
`docs/proposals/jotz-archive.md` as a future container version without silently changing `.jotz` v1 or claiming an implemented archive. Existing packaging and
whole-document encryption remain supported. A public index must never contain private prose, tags, moods, thumbnails or media;
privacy transitions rebuild it from public source rather than relying on row deletion. Keep private search in memory after
unlock. Encryption mode/key management, safe SQLite reading, archive limits and performance need specification and tests.
`docs/methods/expressive-writing.md, line 443` ("Keep it private") and `docs/methods/digital-daily-notes.md, line 711` (no cloud sync
for journal content in that guide) inform the exposure boundary, not the cryptographic design. This is an engineering proposal,
not a guarantee of secure implementation or instant multi-year search.


## 2026-11-01: First connected-source delivery is explicit weather lookup

Follow the accepted context roadmap with a shared provider capability catalog and review flow, initially Open-Meteo daily
weather. Explicit coordinates/date/timezone are the only request inputs; no prose, geolocation permission, background requests
or provider writes. Label historical model output estimated and recent/future daily model output forecast; keep null distinct
from zero, preserve units and retrieval time, and include attribution. Requests omit credentials/referrer, reject redirects,
bound response bytes, time out and cancel on close/lock. An explicit reviewed insertion is undoable and source-revision guarded.
Public endpoint terms and CC BY attribution are shown; no commercial-account access is claimed. Desktop CSP adds only the two
named weather origins. Transport/browser tests are mocked, not live provider or native webview verification. Read-only Home
Assistant and the separate default-off contextual suggestions setting remain next; no active-entry analyzer is installed.
`docs/methods/digital-daily-notes.md, line 711` rejects cloud content sync in that guide's context; `docs/methods/expressive-writing.md,
line 443` says keep writing private. The provider architecture and forecast labeling are engineering choices, not study findings.


## 2026-11-01: Read-only Home Assistant snapshots in Connected sources

The owner asked to finish the next integration after committing weather. Use explicit instance/token/entity inputs and GET-only
state/history endpoints; no whole-instance state listing, services, events, scripts, scenes, state writes or subscriptions. HTTPS
or loopback is required. Tokens stay in page memory, clear on close/lock/instance changes and never enter portable content or
browser storage. Limit requests to five entity IDs, history to seven past days/200 total states and each response to 512 KiB.
Retain reported state, units, server timestamps, instance/entity identity and retrieval time; missing history remains missing.
A pre-start history boundary row keeps its original timestamp and explicit boundary marker. Server state is labelled reported,
not a claim about the writer's activity. Review precedes insertion, with stale-source guards, source/live undo and save retries.
Reject redirects, unselected entities, malformed timestamps and credential echoes; sanitize provider labels/fields. Actual token
permissions may exceed the adapter's reads. Existing desktop CSP permits loopback instances; no wildcard permission was added
for arbitrary HTTPS hosts. Home Assistant CORS and private-network access remain deployment requirements, not something a local
proxy bypasses. Tests mock providers and browser requests; no live account or native-webview verification is claimed. The card
and contextual suggestions remain planned. `docs/methods/expressive-writing.md, line 443` (keep it private by choice) and
`docs/methods/digital-daily-notes.md, line 711` (no cloud journal-content sync in that guide) inform the boundary. The endpoint,
limit and timestamp decisions are engineering choices; those guides do not establish them as research findings.

Regression checks also exposed unreadable lock/unlock action colors in dark mode. Those dialog buttons now use the same themed
ink and paper colors as their surrounding controls; encryption behavior is unchanged.


## 2026-11-01: Replace storage formats with default Jotz v2, without migration

The owner requested replacing both the old `.jotz` container and separate `.jotlock` encryption, clarified this is a fresh project
with no migration requirement, and explicitly made `.jotz` the default. This supersedes earlier container/lock decisions. Every
journal Save/Download is now a v2 archive. Plain Jot and Markdown are explicit source import/export. Entries retain stable UUIDs,
exact source, logical dates/timezones and known actual creation/update instants. Private member keys and a protected catalog bind
identity, revision, date, ordered manifest and key slots. Passphrase/recovery/passkey slots remain available. All attachments are
protected whenever protection is enabled, including shared/unused assets and annotated backgrounds. Dates and slot metadata are
public; a mixed archive is not fully encrypted. A public-only SQLite/FTS5 cache is rebuilt on privacy transitions, while private
search stays in memory. No OPFS/WAL or plaintext sidecar exists. Browser content persists as the archive in IndexedDB documents;
localStorage is only a pointer. Device saves preserve conflict/atomic-write guards. Old copies cannot be retroactively erased.

New source fixtures, default downloads, entry controls, public locked reading, recovery/passkeys, indexes, stale/corrupt-cache
fallback and ciphertext reuse are tested. An independent Node crypto implementation verifies key-slot and member decryption.
SQLite WASM is vendored with upstream notices/licenses; desktop CSP allows wasm-unsafe-eval for local WASM, not JavaScript eval.
Independent cryptographic review, cross-app/native-device checks and large-journal/mobile benchmarks remain release work.
`docs/methods/expressive-writing.md, line 443` (privacy by choice) and `docs/methods/digital-daily-notes.md, line 711` (no cloud journal
sync in that guide) inform the exposure boundary. The algorithms, container layout and index limits are engineering choices.


## 2026-11-01: Jot v1 uses a primary Jotz document with Jot entry source

The owner clarified that `.jotz` is the primary document, analogous to keeping and sharing a PDF, and `.jot` source generally lives inside it. Both remain Jot v1. Correct the premature v2 archive naming, manifest version and cryptographic version domains to v1; no migration is required for these unreleased prototypes. A public entry is exact `.jot` source; a private entry encrypts that source without a plaintext duplicate. Standalone `.jot` remains useful and editable, but is not the complete document when assets or protection are needed. Writer retains default archive saving.

The PDF analogy does not require fixed layout or imply ordinary text editors can read ZIP files. Editor integrations need archive support and lossless saves; the current VS Code extension still handles standalone source only. Record this limitation rather than claim compatibility. The supplied format comparison informs the document model, but unmeasured search performance, exclusive security advantages and ZIP diffability are not established facts. This is a document/versioning decision, not a change to journaling methods or privacy policy.

Primary-specification research is recorded in `docs/proposals/document-format-research.md`, including inspection of generated DOCX/ODT/EPUB packages. It supports the package model without claiming partial encryption is unique, that PDF is read-only, or that an embedded index proves search speed. Further layout changes remain recommendations pending conformance/interoperability design.


## 2026-11-01: Treat current work as 0.1.0 and finish v1 before moving beyond it

The owner requested adding the proposed document structure and researched format improvements to a complete-v1 roadmap, with no move beyond v1 before finalization. The current project is a 0.1.0 prototype; v1 specification names and archive schema 1.0 designate the intended contract, not a stable-release claim. Keep the existing wire-format identifiers and package versions; this documentation update does not change stored bytes or add migration.

The canonical roadmap now records D1–D7: primary archive/source contract, chronological paths plus independent identity, media relationships, protected members and unlocking metadata, rebuildable public search, rendering/previews and direct editor integrations, and evidence-based release gates. Proposed paths and Obsidian/VS Code archive support remain unchecked. Finalizing v1 requires closing its required gates; unfinished requirements must not silently become v2. Existing integrations and the explicit hardware/firmware deferral remain as recorded. These are release/engineering decisions, not new journaling-method or privacy-policy findings.


## 2026-11-01: Separate format and Writer roadmaps; require coordinated format changes

The owner requested separate roadmaps for the Jot format and Writer web plus desktop/mobile apps, then required agent instructions to keep Writer updated whenever the format changes. `specification/ROADMAP.md` now owns the format, archive, protection, semantics, conformance and reference implementation; `WRITER-ROADMAP.md` owns application/platform/editor delivery and retains the integration backlog. Format dependencies are linked rather than treated as a separate Writer grammar. Both remain 0.1.0 prototypes targeting complete v1, with required gates before any move beyond v1.

Root, parser, site, VS Code and specification AGENTS.md instructions require corresponding Writer support in the same implemented format change, generated-copy updates and relevant format/Writer checks, with available native validation and explicit limits. Proposals stay planned. The existing sync tool publishes two distinct roadmaps and the site links to each. This does not implement chronological archive paths or direct editor support and does not change stored format bytes.


## 2026-11-01: Plan Immich, Google Photos and iCloud Photos without excluding Apple

The owner requested Immich (clarifying “this” with the upstream feature link), Google Photos and iCloud Photos, including the Apple ecosystem even though the owner does not use it. Add dedicated planned Writer tracks and a researched photo-library proposal; do not claim connectors are implemented. Prefer a first read-only Immich connector, current Google Picker selection rather than removed broad Library API access, and Apple native picker access plus selected downloaded-file imports on other platforms. Keep all earlier integrations in the backlog.

The source/asset contract stays provider-independent: selected media is bundled in `.jotz`, with reviewed provenance and private-safe metadata/previews, not temporary URLs or tokens. Format dependencies are cross-linked; any future normative changes require Writer updates in the same change. These are engineering/platform choices informed by primary provider documentation, not claims of live-account interoperability. `docs/methods/digital-daily-notes.md, line 459` reports limited photo-trigger findings; `docs/methods/expressive-writing.md, line 443` supports privacy by choice; `docs/methods/digital-daily-notes.md, line 711` rejects journal-content cloud sync in that guide's context. Chosen photo import does not authorize background library sync, journal upload or unsolicited memory prompts.


## 2026-11-01: Require the entire Jotz document to remain readable offline

The owner explicitly required the entire file to be readable offline. Record this as a complete-v1 format and Writer acceptance contract, covering all saved entries, media/originals, ink components, included documents, integration snapshots and supported presentation, with local unlocking for protected content and no provider-account/cache/server/AI dependency. A local compatible reader remains necessary; fonts/renderers and supported codec paths must be locally available. External citations remain optional references, not a requirement to copy arbitrary websites or licensed streams.

Import completion must follow selected-byte download and validation, not temporary URL or thumbnail receipt. Missing/oversize/unsupported content needs an honest incomplete state and recoverable draft preservation. Both roadmaps include fresh-profile, network-disabled read/edit/save/reopen gates. The prototype already bundles assets and an offline web shell, but full dependency/completeness validation, universal media decoding, native/device evidence and proposed provider connectors are not claimed implemented. Root/site agent instructions enforce the requirement for future changes. This is an explicit user requirement and technical acceptance decision; no new journaling-method or security-effect claim is made.

The existing offline browser check exposed a worker-lifecycle test race: an async waitForFunction predicate returned a truthy Promise before service-worker readiness. Resolve navigator.serviceWorker.ready into a test flag and poll it synchronously before reloading, consistent with the deliberate no-clients.claim update policy. A minimal browser check reproduced async-false returning immediately versus synchronous-false timing out; no runtime worker behavior was changed.


## 2026-11-02: Encryption is core to Jot and Writer v1

The owner explicitly stated encryption is core to the journaling experience. Elevate it in both roadmaps, protection guidance and agent instructions as required v1 capability across private entries, media, ink, included documents, snapshots, private metadata and derivatives, with local unlocking/recovery and protection-preserving edits/exports. Preserve public-content and plain-source choices; this requirement does not authorize inventing a password, changing new-document defaults or claiming all existing browser data is encrypted.

Current all-media protection after setup remains conservative; finer per-attachment controls, shared-asset privacy rules, discoverable status/recovery workflows, independent review and actual-device evidence remain planned/unverified. Dates/IDs/sizes/key-slot metadata remain visible. This is an acceptance/prioritization change with no wire/cipher/version/runtime-default change. `docs/methods/expressive-writing.md, line 443` supports deliberate privacy; `docs/methods/digital-daily-notes.md, lines 434–446` distinguishes plaintext local storage, encrypted sync and metadata/export exposure. Cryptographic/UI decisions are engineering choices, not therapeutic or certified-security findings.
