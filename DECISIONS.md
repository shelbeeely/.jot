# Latest Jot v1 decisions

## Jot as "just one thought" (29 October 2026)

The owner asked for the name to also mean *just one thought*. It is used as a backronym beside the real origin (iota, the
smallest letter) and the logo's 1 and 0: on the homepage's fifth reason, under the README's tagline and in the brand guide.

- **Permission, not a target.** It says one line is a whole entry, as the writer's own placeholder does ("A sentence is
  enough."). Small entries have long been a journaling format in their own right: the five-year diary gives each day a few
  lines (docs/methods/five-year-diary.md, line 15), and the low-demand check-in takes one word, or "skipped", as a complete
  answer, with no streaks (docs/methods/low-demand-check-in.md, line 15). So it is never "one thought a day": no streaks or
  counts, which those guides avoid.
- **Honest about evidence.** The research supports small entries as a format people keep; it does not show that a slogan like
  this helps anyone write more. The low-demand approach rests on practitioner accounts, with no trial of a low-demand journal
  (docs/methods/low-demand-check-in.md, line 177).

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
- Unchanged Auto-only templates omit the extra layout markers to preserve compact text and InkDeck capacity. The editor generates
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
