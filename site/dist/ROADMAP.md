# Jot roadmap

Updated 26 October 2026. The format remains **Jot v1** (draft 3); the parser implementation is 0.1.0. The name is Jot; `.jot` is plain writing, and `.jotz` packages the writing (`journal.txt`) together with its assets. A single document can span a moment, day, month, multiple years or a topic. The scanner remains a separate tool within the Jot workspace.

The canonical roadmap is `specification/ROADMAP.md`. Run `node tools/sync-roadmap.mjs` after editing it; CI checks that the parser and published-site copies match. Status below is based on source and automated checks, not just the specification.

## Status meanings

- Implemented: working source exists, with limitations below.
- Tested: automated checks or an observed browser interaction passed.
- Planned: a requirement, not an implemented feature.

| Area | Current state | Next acceptance milestone |
| --- | --- | --- |
| Plain-text writing and date sections | Implemented; parser tested | Broader malformed-input and large-file fixtures |
| Markdown | Marked/GFM parser integrated; safe DOM preview implemented | Run official compatibility fixtures; improve list rendering |
| JavaScript parser | ES module for Node/browser; parser, formatting, proofreading and container suites pass | Stabilize API; complete semantic/profile validation |
| Composable content blocks and layouts | Partial: full-width template blocks reserve handwritten grid rows, gaps and page starts; visual sizing, persistence and shared rendering are browser-tested | Responsive columns, richer mixed-media blocks and physical printer proofs |
| Journaling methods | 62 profiles and searchable invitations implemented | Human review against all full source guides; refine templates |
| Paper sizes | 27 presets in spec; common/custom sizes in app | Expose complete preset registry and physical print proofs |
| Perspective scanner | Hidden from the site while unfinished (no links, noindex); core geometry/detection tests pass | Real Pixel camera, varied lighting, small pages and long pages |
| PDF export | Generated multi-page PDF validated for page count and physical geometry | Verify download flow across Android browsers |
| Handwriting | Canvas, pressure-aware pen, eraser, undo/redo, stroke import/export implemented | Mouse stroke, undo/redo and image handoff checked; physical stylus/palm testing remains |
| Spelling | Native browser spellcheck plus optional supplied word list | Locale selection, personal dictionary persistence |
| Grammar | Optional English pattern hints implemented/tested | Real grammar-engine adapter; language-specific checks |
| Mermaid and other diagrams | Fenced blocks identified/preserved; tests pass | Install local rendering engines, accessibility labels and sanitized output |
| Formatted pages and export | Journal, Notes and Plain styles; dates, task states, signs, tags and margin notes rendered for reading; one standalone HTML export; print with page numbers; browser-tested | More styles, a style of your own, EPUB |
| Simulated handwriting on a dot grid | Three open handwriting fonts with alternate letter forms, seeded wobbles, every line on a row of dots, printed pages of whole rows; browser-tested | Right-to-left and non-Latin hands, a hand of your own (a font from your writing), print proofs on paper |
| Fuller formatting | Highlight, underline, superscript, footnotes, callouts and centred lines; tests pass | Definition lists, subscript once its syntax is settled |
| Inline colors and handwritten print | Implemented: text ink, highlight, separate strike and underline colors; 71 reference colors in grouped menus and swatches, custom hex, selection apply/clear, nesting, undo and source persistence. Handwritten is the default for new workspace preferences, template Page previews and VS Code previews. Marker, brush and pencil highlights have seeded per-passage variation; Rewrite changes the strokes while preserving source. Browser tests cover print CSS, generated PDF and standalone HTML export | Physical color-print proofs and mobile print/download checks; underline style/thickness and richer typography remain planned |
| Charts of tracked numbers | `:::record chart` drawn with bundled Chart.js on canvas per metric (gaps for empty days, a text summary and a table) in the workspace, the template editor's Page view and VS Code; tests pass | Month and year views, chosen daily aggregations (spec §5.2), charts printed from filled-in numbers |
| Structured observations | Generic records and ordered fields implemented | Scales, units, profile constraints, missing-data validation |
| Task migration and reviews | Task capture, calendar/CSV export, today insertion, task rollover and weekly reviews implemented and tested in parser/CLI; workspace controls exist | Durable task links, migration history and cross-document workflows |
| Plain .jot and packaged .jotz | Plain .jot save; ZIP-based .jotz import/export, asset hashes/limits and browser asset persistence implemented | More recovery, quotas, corrupted-file and interop fixtures |
| OCR and handwriting transcription | Planned | User-reviewed transcription linked to originals |
| Local-first persistence | Journal text/cursor autosave and IndexedDB assets implemented; browser reload checks pass | Multiple journals, storage exhaustion, cross-tab conflicts and recovery |
| Privacy and security | Client-side processing, safe DOM preview and automated privacy gate; locked documents (`.jotlock`, Jot Lock v1: PBKDF2-SHA-256 and AES-256-GCM from built-in Web Crypto) in the parser and `jot lock`/`jot unlock`, tested including independent Node and Python readers; the workspace cannot open them yet | Threat model, encrypted backups and export-redaction implementation |
| Accessibility | Labels, focus styles and corner keyboard controls implemented; writer reduced-motion (setting and system) and higher-contrast preferences browser-tested | Mobile/screen-reader and stylus accessibility audit |
| Round-trip editing | Original parser input preserved; textarea uses browser line endings | AST edits with lossless serialization and file conflict recovery |
| Neurodivergent-friendly personalization | Partial: the writer's Preferences panel sets text size, line spacing, line length, density, higher contrast and reduced motion, and hides the preview, parser tabs, counts and decoration independently; a focus mode leaves with Escape or its button; choices stay in this browser; browser-tested | Ruling choices, deferred checking, the template editor and other surfaces, and testing with people who have different needs; no diagnosis-based preset forced on users |
| One editor for every method | Partial (proposal: `docs/proposals/editor.md`): E0 done: a "My day starts at" preference used by Today, Quick note, Carry tasks forward and Week review; Morning pages, Day planner and Gratitude starters follow their guides, plus Gratitude, weekly; unit- and browser-tested. The writer and template editor are still separate | E1: a fill view with Skip |
| Low-effort capture and re-entry | Partial: Quick note adds one line under today's entry as one undo step without moving the cursor; caret and scroll come back after a reload; an optional note for next time is offered on return with Back, Start at the end and Dismiss; browser-tested | Sketch or photo quick capture, multiple documents and prior-draft recovery |
| Multilingual writing and interface | Planned; Unicode text already preserved | Separate interface/document/checking locales, RTL/mixed scripts, IME, translated prompts and script-aware tests |
| Stable format | Draft specification | Reconcile grammar/Markdown precedences; independent reader; versioned conformance release |

## Near-term order

1. Complete handwritten formatting polish: physical color-print proofs, mobile print/download checks, then underline styles/thickness. Inline colors and handwritten-by-default workspace are implemented.
2. Exercise the complete writing flow on a real phone, including handwriting and PDF downloads. Keep the unfinished scanner hidden until its own checks pass.
3. Reconcile the Jot draft with the JavaScript implementation and expand the conformance suite, including multilingual and input-composition fixtures.
4. Add composable content blocks with stable identity and source order, then strengthen existing attachment bundles and recovery before users rely on mixed-media journals.
5. Add local diagram rendering and optional recognition/proofreading adapters without silent network uploads.

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

### L1. Language-neutral format and parser foundations

- Keep Jot v1 syntax markers and canonical field keys stable; headings, prose, tags and labels may use any supported Unicode text. Translated UI labels map to canonical fields rather than changing the stored language.
- Specify BCP 47 language tags at document level and optional per-block language/direction metadata. Define mixed-language scope and overrides before declaring the grammar stable.
- Test scripts, accents, combining characters, emoji and bidirectional text for exact source preservation. Retain UTF-8 byte offsets for interchange and convert carefully for JavaScript UTF-16 editor selections and user-visible grapheme positions.
- Exclude code, identifiers, measurements and diagram source from natural-language checking. Do not make ASCII-only spelling assumptions about prose or silently discard unknown languages.

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

### B1. Block types

| Block family | Content | Initial behavior and fallback |
| --- | --- | --- |
| Writing | Paragraphs, headings, lists, quotes and freewriting | Human-readable Markdown; no special form required |
| Tasks and events | Checklists, rapid logs, next actions, appointments and done lists | Preserve explicit statuses and dates; missing values are not failures |
| Prompt and response | A question, optional answer, reflection or gratitude | Keep the actual prompt and its version; allow unanswered/skipped fields |
| Handwriting and sketches | Editable strokes, a canvas region and page-image fallback | Original handwriting is valid content; no transcription requirement |
| Images and scans | Photos, scanned pages, collage and other visual attachments | Relative asset link, readable label/caption, alternative text and original image |
| Trackers and measurements | Habits, mood, energy, symptoms and other observations | Retain units, scale definitions and explicit missing/partial states |
| Tables and structured notes | Tabular logs, reference fields and collection summaries | Markdown table or ordered structured fields; accessible row/column labels |
| Diagrams and charts | Mermaid, Graphviz, PlantUML, D2 and Vega/Vega-Lite source | Source remains readable when a renderer is absent; no automatic remote rendering |
| Callouts and annotations | Marginal notes, reminders, context, side notes and summaries | Keep textual labels and normal reading-order placement; color is optional |
| Layout and spacing | Dividers, grouping, whitespace and deliberate page breaks | Presentation hints do not become observations or separate journal entries |

Audio/video attachments are a later extension under the asset system, not a reason to require media players or network embeds in the first release. Unknown block types must remain preserved and show a readable fallback.

### B2. Layout composition

- Stack blocks in source order by default. Optional groups can present two columns, a sidebar/main area, a full-width block or a reusable section. Each block retains an independent type and identity.
- Allow a short task list beside handwriting, or a photo above a reflection, without changing the meaning of either. A page can mix several journal methods.
- Keep stable block IDs for attachment references, task links and later revisions. IDs should not depend on physical page numbers or current visual position.
- Separate content properties (text, strokes, asset link, measurement) from presentation properties (width, alignment, spacing, grouping, border, background, ruling, page-break and keep-together preference).
- Provide move-up/down and keyboard reordering alongside any drag-and-drop interaction. Show the resulting reading order; do not make color, position or pointer dragging the only way to understand or manipulate blocks.
- Do not replace the readable `.jot` writing with an opaque JSON document. Optional layout hints reference blocks; binary images and stroke files live inside the same .jot container with readable internal links.
- Treat reusable method layouts as editable starting points. Detaching/changing a method must retain every filled block and handwritten original. Changing one block type requires an explicit non-destructive operation, not automatic conversion or transcription.

### B3. Responsive, multilingual and print behavior

- Columns collapse into an explicitly defined reading order on a narrow screen or in a plain-text view. Screen-reader traversal and keyboard order follow that same order.
- Use logical start/end alignment and direction-aware layouts for mixed-language or RTL writing. Do not infer reading order solely from left/right coordinates.
- Reflow text when paper size changes. Preserve a handwriting/image block's aspect ratio; do not distort strokes, silently crop content, or shrink writing below the chosen minimum to force a fixed page count.
- Allow keep-together, break-before and continuation hints with overflow feedback. Content taller than a page must use an explicit scale, tile, continuation or alternate-page decision that the user can preview.
- Give empty writing/handwriting areas physical dimensions for print templates where requested. A blank placeholder is not a missing observation, an unanswered mandatory form or a demand to fill every space.

### B4. Parser, assets and editing contract

Define optional block/group/layout syntax before making a stable grammar claim. The JavaScript AST needs stable IDs, type, source span, ordered children or references, and a readable fallback while preserving unknown fields. The existing parser's Markdown nodes and generic records are useful primitives; they are not yet a complete block-layout editor.

The editor must support inserting a handwriting block at the writing cursor, displaying its PNG fallback inline, and retaining editable strokes as a linked companion asset. The current integration includes single-file bundling and local asset persistence; broader recovery and visual missing-file handling need further testing. The handwriting canvas now inserts a PNG fallback plus editable stroke data into the journal. Both are packaged inside the same .jot document. Full visual block manipulation remains planned.

Editing through either source or a visual block view must not silently discard the other view's data. Prototype `stringify` currently returns the unmodified original source; serializing AST/block edits is a separate implementation milestone. Layout files must not change entry dates, task meaning, privacy labels or language metadata.

### B5. Suggested delivery and acceptance

1. Define stable content-block identity, readable source references and a default stacked layout; add a block insertion menu without requiring it for prose.
2. Integrate images/scans and handwriting blocks with asset persistence and portable bundles.
3. Add block grouping, accessible reordering and mixed-method reusable layouts.
4. Add responsive columns/sidebars and predictable print layout with visible overflow.
5. Extend the parser/serializer conformance suite and test source/visual round trips.

Acceptance examples: a single day combining BuJo tasks, gratitude text and untranscribed handwriting; a photo with a caption beside a reflection; a tracker plus freewriting in another language; an unknown block opened without its plugin; a two-column screen layout becoming a one-column pocket print; a missing attachment; a very tall handwriting block; undoing a reorder; and extracting journal.txt from .jot and opening it in a plain-text editor with its reading order and asset labels understandable. All are planned checks until the corresponding implementation exists.


## Self-contained document decision

Jot v1 has two representations with the same writing (draft 3, 26 October 2026): plain `.jot`, readable and editable in any text editor, and packaged `.jotz`, one ZIP-based document with journal.txt, manifest.json and every included asset. Readers decide by content, so a mislabelled file still opens. Text-only tools (editors, InkDeck) list `.jot` and never save a package as text. The workspace saves plain `.jot` when a journal has no attachments and `.jotz` when it has. Provide writing-only export and keep editable handwriting originals without compulsory transcription.

Implemented: JavaScript pack/unpack/readDocument APIs; safe paths and declared size limits; SHA-256 integrity checks; legacy text import; editor asset attachment/local preview; one-file import/export; IndexedDB asset persistence; handwriting image+stroke insertion; corrected scan insertion. Core tests include text and exact binary round trips, corrupt/missing/extra members, unsafe paths, directory records and hashing. Browser export reports a complete package with two handwriting assets and local reload restores them. The cloud download-event hook did not provide the exported file path and a file-picker import test stalled; browser end-to-end file-import/download verification remains incomplete. Exact byte verification is covered independently by module tests.

Next: real-device download/import checks, storage exhaustion, cross-tab conflict/recovery, asset editing within visual blocks, stronger long-term archive interoperability and optional encryption. ZIP packaging alone is not encryption or PDF compatibility.
