# Jot format roadmap

Updated 2 November 2026. **Current stage: 0.1.0 prototype / pre-v1.** This roadmap owns the Jot format as a whole: plain `.jot` source, the primary `.jotz` document, syntax, semantic records, assets, protection, search interchange, conformance and parser/serializer contracts. Jot v1 and Jotz v1 are target specifications, not finalized releases.

The separate [Jot Writer roadmap](WRITER-ROADMAP.md) owns the web application and its desktop/mobile delivery, editor experience, integrations, saving/recovery UX and platform verification. Source research: `docs/proposals/document-format-research.md`. The canonical format roadmap is `specification/ROADMAP.md`; `node tools/sync-roadmap.mjs` generates the parser/site copies and the separate published Writer roadmap.

## Release policy: finish v1 before moving beyond it

The current project is a **0.1.0 prototype** targeting **1.0.0**. Existing v1 specification names and archive schema `1.0` designate the target contract, not a stable-release or security certification. No post-v1 format is planned until the required v1 work is finalized. Unfinished requirements must not silently be moved to v2. The fresh prototype has no migration requirement; preserve that decision unless the owner changes it.

Format and Writer have separate completion evidence. A format change must include corresponding Writer support in the same change: parsing, editing, preview, assets, protection, persistence, import/export and applicable web/native file handling. Regenerate shared copies and run relevant format plus Writer checks. Track dependencies in both roadmaps; an updated specification alone is not a completed feature. See root `AGENTS.md` and area instructions.

## Encryption is a core v1 capability

Encryption is fundamental to the journal document and a required v1 format capability. It covers private writing, media/originals, ink components, included documents, saved integration data and private descriptive metadata, with safe derived previews and search behavior. Public content remains an explicit supported choice; this requirement does not force encryption on standalone plain `.jot` or change the prototype's new-document defaults.

- [ ] Finalize protection semantics across entries, attachments, shared assets, metadata, previews and indexes. Keep the current conservative behavior (all media protected after setup) until finer attachment controls can preserve privacy reliably; per-attachment controls remain planned.
- [ ] Define interoperable offline unlocking and recovery without a service account, server-held master key or cloud dependency. Explain the consequences of losing all local recovery methods.
- [ ] Specify visible metadata precisely, including currently exposed dates/IDs/sizes/key-slot parameters. Do not describe every byte of the current archive as encrypted or imply encryption hides all metadata.
- [ ] Require safe preservation of protection when a compatible archive editor saves; readers without the required crypto capability must refuse unsupported protected operations without plaintext conversion, silent downgrade or content loss. Plain-source readers remain useful within their declared capability.
- [ ] Treat privacy transitions, export exposure, independent review and tamper/corruption/recovery fixtures as v1 release gates alongside D4. Synchronize corresponding Writer behavior in the same implemented format change.

## Security verification and passkeys

The [security verification plan](docs/security-testing.md) separates automated evidence, mutation/fuzzing work, real-device compatibility and independent review. Passkey key slots use WebAuthn PRF → HKDF → master-key unwrap; current validation requires exactly 32-byte PRF output. Wrong RP/credential and malformed/unsupported browser responses must fail without exposing content, while passphrase/recovery access remains available. Domain/native-origin portability, actual-device offline behavior, fuzzing evidence and independent review remain required/unverified; virtual-authenticator tests are not a certification. Changing a passphrase is not compromise-recovery master-key rotation.

## Established cryptography and recoverable protection

The ordinary profile uses established Web Crypto primitives and alternative authenticated key slots: one valid everyday credential or a separately retained recovery code can open the master key. The loss of one method must not be a single point of journal loss in the intended Writer setup. This is recoverability, not a claim of mandatory two-factor encryption; weak alternate passphrases remain attackable and a recovery code grants full access.

- [ ] Require maintained standard cryptographic implementations, documented parameters/domain separation, reproducible dependency provenance and independent review of the complete format/application composition. No hand-written ciphers, secret-sharing arithmetic, password hashing or improvised secret-combining protocol.
- [ ] Define recovery and safe key-lifecycle semantics with Writer's plain-language setup/recovery flow. Do not silently remove alternative access or promise restoration after all secrets are lost.
- [ ] Evaluate an optional advanced threshold profile only under an explicit threat/recovery policy. Pin any reviewed secret-sharing dependency and verify audit scope, fixes, integrity requirements and current code; a library audit does not audit Jot. Insufficient keys and unauthorized policy downgrades must fail cryptographically, and recovery must not create an undisclosed single-key bypass.

The existing OR-style slots remain implemented. Threshold protection is not implemented or adopted as the default; no cipher, file version or dependency changes are made by this plan.

## Status meanings

Implemented means code exists, tested means a named check passed, and planned/unverified means acceptance is still open. Current archive/protection code is a prototype; no claim of complete conformance, cross-editor support, instant search or independent security review follows from it.

## Format implementation status

| Area | Current state | Next acceptance milestone |
| --- | --- | --- |
| Plain-text writing and date sections | Implemented; parser tested | Broader malformed-input and large-file fixtures |
| Markdown | Marked/GFM parser integrated; safe DOM preview implemented | Run official compatibility fixtures; improve list rendering |
| JavaScript parser | ES module for Node/browser; parser, formatting, proofreading and container suites pass | Stabilize API; complete semantic/profile validation |
| Journaling methods | 62 profiles and searchable invitations implemented | Human review against all full source guides; refine templates |
| Entry scratchpads and margin notes | `~~~draft` scratchpads (literal, off the page) and marginalia after a block (spec 4.2.7–4.2.8); parser, renderer and conformance cases `scratchpad` and `margin-note-after`; Writer support in `WRITER-ROADMAP.md` | Independent reader check; define how share/export selection treats scratchpads alongside hidden comments (section 9) |
| Fuller formatting | Highlight, underline, superscript, footnotes, callouts and centred lines; tests pass | Definition lists, subscript once its syntax is settled |
| 3D models | `:::record model` (spec 8.1.6): an attached glTF file as data, never code; poster/description fallback; `model-without-file` and `invalid-model-field` warnings; parser tests and conformance cases; compressed models (Draco, meshopt, KTX2, WebP, AVIF) with the reader's own decoders. Writer support: `WRITER-ROADMAP.md` | Fixtures with real-world glTF (skins, morph targets, large scenes); compressed fixtures for Draco, meshopt and KTX2 exist; an independent reader; decide whether `.gltf` with external files belongs in a `.jotz` |
| Structured observations | Generic records and ordered fields implemented | Scales, units, profile constraints, missing-data validation |
| Stable format | Draft specification | Reconcile grammar/Markdown precedences; independent reader; versioned conformance release |

## Primary document completion: required for v1

All unchecked items remain planned or unverified. These are format requirements; Writer implementation and platform acceptance are tracked separately in `WRITER-ROADMAP.md`.

### D1. Finalize the document and source contract

- [ ] Specify `.jotz` as the primary document to create, open, edit, keep and share; `.jot` is exact editable UTF-8 entry source, generally inside the package and also supported independently. Both target v1. Define supported open/edit/preview/save behavior across Writer, CLI and editor integrations, without claiming every application handles every feature.
- [ ] Finalize the manifest schema: document ID, schema version, ordered entries, typed media, reference resolution, time metadata, encryption capabilities and index generation. Specify which statistics are optional/derived and prevent public statistics from disclosing private content.
- [ ] Freeze Markdown/Jot precedence, canonical source rules, required/optional capabilities and conformance fixtures. Unknown required features must produce a clear unsupported/read-only result rather than a destructive save.
- [ ] Define safe preservation of optional metadata/extensions and unknown members. Test lossless edits and refuse saves when required content or protection cannot be preserved.

### D2. Chronological organization with stable identity

- [ ] Design and implement public entry paths such as `entries/2026/11/2026-11-01_<id>.jot`, plus `entries/undated/<id>.jot`. Current UUID-only entry paths remain the prototype implementation until this is specified and tested. Internal entry files use `.jot`, not `.md`.
- [ ] Keep identity independent of date/path and ordering explicit in the manifest. Cover multiple entries on one day, repeated dates, undated preambles, multi-day writing, reordered entries and changed dates without collisions or invented timestamps. Never require one entry or file per day.
- [ ] Decide how chronological grouping applies to multi-day source and private entries. Document visible dates/paths and keep encrypted members opaque; do not introduce plaintext duplicates or disclose private titles through filenames.
- [ ] Validate nested ZIP paths, duplicate names, case/normalization collisions, decompression limits, malformed descriptors and hostile references. Update recovery/extraction tools and conformance examples for the finalized layout.

### D3. Bundled media and relationships

- [ ] Finalize stable media IDs, MIME types, readable source aliases and relative semantic links. Preserve audio, photos, sketches, editable ink and their originals when moving or saving the document.
- [ ] Test missing, corrupt, shared and unused assets, attachment renames, undo and source/visual round trips. Report broken references without silently dropping data or fetching external content.
- [ ] Define explicit source-only export and unpack/repack workflows with clear attachment/protection limits. Public extracted source can be diffed; the ZIP itself is not directly Git-diff-friendly. Private source must not be silently extracted.

### D3a. Whole-document offline completeness

- [ ] Finalize the required contract in `Jot-Container-v1.md`: all saved content and supported presentation must remain readable without network, provider accounts/caches or AI. Include original selected media, ink components, included documents and integration snapshots; no thumbnail-only or URL-only substitutes presented as complete attachments.
- [ ] Define local codec/rendering capability and explicit offline-readable derivative/fallback rules. Keep external citations optional; distinguish a reference from remotely hosted document content. No automatic crawling, streaming downloads or rights bypass is implied.
- [ ] Define completeness/dependency validation and missing/oversize/unsupported-content reporting without destroying source or blocking recoverable draft saves. Add fresh-profile, network-disabled, complete-source/asset and protected local-unlock conformance cases; local source search must work without the cache.

### D4. Entry protection and unlocking

- [ ] Finalize the per-member authenticated-encryption contract and public/private metadata boundary. Independently review key derivation, key wrapping, nonce handling, manifest binding, recovery, passphrase changes and passkey behavior.
- [ ] Keep the parameters and wrapped keys needed to unlock accessible without first decrypting the private catalog. An optional encrypted metadata/key file must have a defined purpose and unlock path; `keys.json.enc` is not an adopted requirement merely because it appeared in an example tree.
- [ ] Verify no private source, attachment name, preview, thumbnail, statistic, search cache or temporary file leaks into public members or browser persistence. Preserve privacy choices when editing and exporting archives; explain intentionally visible dates and cryptographic metadata.
- [ ] Verify recovery and failed-save behavior with users and real devices. Privacy changes must rebuild public caches, and documentation must distinguish removal from the current file from erasure of old copies/backups.

### D5. Portable search without source dependency

- [ ] Finalize the public-only `index.sqlite` schema, FTS5 reader capability, generation/hash validation and rebuild rules. Opening a package must never execute document-supplied SQL.
- [ ] Recover exact source when the index is missing, stale, unsupported or corrupt. Keep private search in unlocked memory, with no plaintext private index, WAL, temporary database or stale deleted pages.
- [ ] Benchmark realistic multi-year journals, large attachments, repeated saves and mobile memory. Publish measured limits and results; do not promise instant ten-year search from SQLite's presence alone. Distinguish unchanged-ciphertext reuse from incremental filesystem writes.

### D6. Presentation and interoperability contract

- [ ] Define source versus generated presentation, rendering profiles, reflow, reading order, font portability, pagination and accessible fallbacks. PDF/HTML exports are derived views, not a second authoritative source.
- [ ] Specify optional previews/thumbnails, staleness and regeneration; protect private content in every derived member.
- [ ] Define conformance capabilities for source readers, archive readers, editors and renderers, including safe handling of unsupported optional/required features and lossless save expectations. Actual editor integrations belong to the Writer/tooling roadmap.

### D7. Format-v1 evidence and release gate

- [ ] Publish versioned source/container/protection specifications, schemas, examples and conformance fixtures. Demonstrate an independent-reader round trip and public source recovery through ordinary ZIP tools.
- [ ] Verify exact UTF-8/BOM/CRLF/unknown-field preservation, malformed archives, IDs/order/dates/timezones, media resolution, index fallback and public/private transitions in reusable fixtures.
- [ ] Obtain independent cryptographic/container review and publish realistic limits and performance measurements.
- [ ] Close required syntax, semantics, serialization, extension and interoperability decisions; record limitations and corresponding Writer support before finalizing **1.0.0**. Do not advance beyond v1 with required gates open.

## Text, semantics and language foundations

- [ ] Reconcile Markdown/Jot precedence and freeze the source-preserving grammar and public parser/serializer API.
- [ ] Complete profile contracts, measurement scales/units/missing-data rules, task identity/migration history, references and optional block/layout semantics without inventing observations.
- [ ] Define readable fallbacks for unknown records, diagrams and optional renderers; preserve source without requiring a network, account or plugin.
- [ ] Specify timezone, logical-date and known actual-time semantics without inferring missing historical timestamps.

### L1. Language-neutral format and parser foundations

- Keep Jot v1 syntax markers and canonical field keys stable; headings, prose, tags and labels may use any supported Unicode text. Translated UI labels map to canonical fields rather than changing the stored language.
- Specify BCP 47 language tags at document level and optional per-block language/direction metadata. Define mixed-language scope and overrides before declaring the grammar stable.
- Test scripts, accents, combining characters, emoji and bidirectional text for exact source preservation. Retain UTF-8 byte offsets for interchange and convert carefully for JavaScript UTF-16 editor selections and user-visible grapheme positions.
- Exclude code, identifiers, measurements and diagram source from natural-language checking. Do not make ASCII-only spelling assumptions about prose or silently discard unknown languages.


## Composable content semantics

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

## Connected-data syntax and provenance

- [ ] Finalize both concise inline references and structured records for media identities, activities and observations. Reuse existing primitives where possible; preserve rewatches/repeated listens as distinct activity identities.
- [ ] Retain provider references, timestamps, units, explicit missing values and provenance. Distinguish observed, forecast, estimated and manual data.
- [ ] Keep records as data, never authority to execute actions or fetch remote content. Credentials and delivery receipts remain outside portable source. Preserve unknown/partial records.
- [ ] Reconcile proposed syntax with current semantics, add conformance fixtures, and deliver parser/renderer and Writer insertion/editing support together. Provider selection, credentials, on-demand lookups, suggestions and outbound actions belong to the Writer roadmap.

## Photo-library interoperability dependency

Immich, Google Photos and Apple Photos/iCloud Photos are planned Writer connectors, tracked in `WRITER-ROADMAP.md` and `docs/proposals/photo-library-integrations.md`. D3, D4 and D6 own the portable media, metadata/provenance, protection and derived-preview requirements. Imported originals must remain usable without their provider account; provider credentials and expiring URLs are not portable asset storage. Review multi-part media and original-versus-derived metadata semantics with conformance fixtures if the existing contract needs expansion. Deliver any resulting format changes and corresponding Writer support together; this roadmap addition does not change syntax/schema or implement connectors.

## Core finalization evidence (2 November 2026)

The reader now refuses unknown structural fields rather than dropping them on resave, validates catalog identities/order/privacy and member encryption descriptors, and accepts an absent index descriptor with source-search fallback. The writer validates generated member identities/catalogs before emitting bytes. Custom JSON document metadata and unknown source fields remain preserved. Writer regression coverage exercises unsupported imports without replacing current writing and cacheless import/search/save. This closes concrete preservation/fallback gaps; it does not finalize the wider v1 schema/extension policy, chronological layout, independent security review or native/editor interoperability. See `docs/proposals/v1-core-finalization.md`.

## ESP32-family cryptographic compatibility target

The owner identified ESP32 as a target. Keep the core protection primitives compatible with supported ESP-IDF cryptography: AES-256-GCM, SHA-256/HMAC, PBKDF2-HMAC-SHA-256 and HKDF-SHA-256. Use maintained ESP-IDF/Mbed TLS or PSA Crypto interfaces appropriate to a pinned SDK/chip; do not implement our own cipher or reduce password work factors merely to make a benchmark faster. Primitive availability is not proof that the current JavaScript container/SQLite reader runs on a microcontroller.

- [ ] Publish and cross-check browser/Node ↔ ESP-IDF vectors for key derivation, Unicode NFC passphrases, recovery-code normalization, exact AAD/framing, member encryption, wrong keys and tampering. Every supported implementation must derive the same keys and authenticate before releasing private content.
- [ ] Benchmark the chosen ESP32 variant/SDK for current KDF settings, AES-GCM operations, RAM/flash/PSRAM, power and realistic entry/media sizes. Declare safe reader limits and refuse unsupported input without truncation or algorithm downgrade.
- [ ] Design a bounded-storage/streaming archive profile with safe authenticated-plaintext release; streaming decryption must not display/act on plaintext before its tag is verified. Verify ZIP and catalog handling rather than loading desktop-sized archives into RAM. Any chunked-AEAD redesign needs its own established construction/review.
- [ ] Keep source recoverable without SQLite/FTS5. Done for small archives: the reference writer omits the index below 256 KiB of public source (Jot-Container-v1, Search index), and readers treat a missing descriptor as normal. Still open: a constrained producer profile that omits the index for larger archives and has Writer rebuild it on return. Specify this before claiming embedded write interoperability.
- [ ] Define local offline unlock via passphrase/recovery on embedded readers. Browser/WebAuthn passkeys require a compatible host/authenticator integration; any trusted-host provisioning path needs authenticated pairing, explicit device trust and a reviewed key lifecycle, not a plaintext master-key transfer.

No ESP-IDF toolchain or physical board was used for this assessment. Firmware/hardware product delivery remains deferred; this target constrains format/cryptography choices now and does not select a board or reopen an assembly project.

## Reference implementation and coordinated delivery

The canonical JavaScript parser/container/protection modules live in `parser/`. Shared browser and editor copies are generated. Writer currently defaults to `.jotz`, preserving ordered source, UUID media and optional per-member protection with a public-only SQLite index. Chronological directories and complete unknown-feature preservation remain planned above. CLI and independent-editor interoperability are release evidence, not consequences of choosing ZIP.

Hardware/firmware is outside the format release scope; its deferral and future exploration are recorded in the Writer roadmap. Existing public source remains editable independently of any dedicated device.
