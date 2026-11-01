# `.jotz`: entries, protected content and a portable search index

Status: design proposal for a future `.jotz` container version, not implemented behavior or a migration. Requested and clarified
1 November 2026. The owner meant `.jotz`, not a new extension. Existing `.jot`, `.jotz` v1 and `.jotlock` keep their contracts. No file is renamed or
converted automatically. The integrations roadmap continues independently and its snapshots remain ordinary Jot records.

The owner wants a human-readable ZIP archive, optional per-entry encryption, portable SQLite FTS5 search, and UUID media links.
A ZIP can contain readable public text and encrypted private payloads; the entire mixed archive cannot honestly be described as
encrypted at rest. Encryption protects only the designated entries/assets. Dates and other deliberately public metadata leak by
choice. A fully private archive still needs whole-document protection, including its dates and index.

## Proposed layout

```text
manifest.json
entries/<entry-uuid>.jot       # public source, exact UTF-8 bytes
entries/<entry-uuid>.enc       # private authenticated payload, never a plaintext twin
media/<asset-uuid>.<extension> # explicitly public assets only
private/<asset-uuid>.enc      # protected media; no revealing original filename
index.sqlite                 # OPTIONAL, public entries only, rebuildable
```

Define a new manifest version so existing `.jotz` readers reject an unknown archive rather than interpreting partial
content as a complete journal. Keep entry order explicit and IDs independent of date: multiple entries may share a date.
Specify exact source boundaries, global frontmatter, cross-entry references and unknown-member preservation before implementing
conversion. Stable semantic links identify entry/asset UUIDs, with readable labels and media types. An image is not proof of an
activity; a provider snapshot is not a new event. Existing `assets/` links need an explicit reversible conversion map.

## Entry protection and incremental edits

Use platform cryptographic primitives and a reviewed format, not ZIP's legacy encryption. Candidate: AES-256-GCM with a fresh
96-bit nonce per encryption and a random content key per private entry/asset. Bind archive ID, member ID, revision, content type
and cipher/version as authenticated additional data. Encrypt before ZIP packaging; do not put plaintext hashes, titles, tags,
moods, provider snapshots, transcripts, thumbnails or original filenames of protected members in the public manifest.

A passphrase-derived wrapping key wraps random content keys; record the KDF, salt, work factor and algorithm versions with
strict resource bounds. Evaluate Argon2id versus the existing `.jotlock` PBKDF2-SHA-256 implementation and migration/recovery
requirements. AES-256 names a cipher/key size, not a complete security design. Reuse existing primitives only with explicit domain
separation and compatibility tests; do not silently repurpose `.jotlock` headers. Recovery and passphrase changes need a stated
key-wrapping model. Nonce uniqueness and wrong-key/tamper behavior require independent review before production claims.

Editing one entry need only re-encrypt that entry and any changed protected assets. Other ciphertext can remain byte-for-byte
unchanged. ZIP central-directory updates and browser save APIs may still rewrite the whole file: incremental encryption is not
a promise of incremental disk I/O. Do not append old plaintext ZIP members or stale indexes into the new archive. Save a complete
validated archive atomically where supported; preserve the last good copy on failure. External backups, filesystem snapshots,
old downloads and browser caches cannot be retroactively erased by marking an entry private.

Assets inherit the strongest required protection. A protected entry's audio, ink, background, preview and attachments must not
remain readable through public media references or content-addressed names. Mixed public/private references require a deliberate
reviewed duplication/declassification decision; no implicit downgrade. New protected assets use random IDs and ciphertext hashes.
No keys or plaintext private buffers enter autosave, temporary files, SQLite, logs, service workers or integration caches.

## Portable search index

`index.sqlite` is an optional acceleration artifact, never the source of truth or an executable extension. Public-only tables
can contain entry UUID, date, language, tags and explicitly written numeric observations, plus an FTS5 table for public source.
Date/tag/metric queries need ordinary typed tables and indexes as well as FTS. Missing mood is not zero and inferred sentiment is
not a mood measurement. Store schema version and a digest/generation bound to exactly the indexed public entries.

Untrusted readers verify schema and source-generation agreement, enforce bounds and read without executing supplied SQL,
triggers, views or extension code. Disable extension loading/attachment and use defensive/read-only SQLite settings. Fall back
to bounded source search if SQLite/FTS5 is unavailable or the index is stale, corrupt, oversized or unexpected. Never execute SQL
stored in journal records. An index provides search compatibility only to apps implementing the archive schema and FTS5 support.

Private entries are excluded, including title/tag/mood/time metadata unless explicitly declared public. After unlocking, search
private source in an in-memory index that is discarded on relock/close; SQLite memory does not make private strings safe to save.
When an entry becomes private, build a fresh public database from the remaining public source. Deleting a row is insufficient:
FTS shadow tables, freelist pages, WAL/journal files and prior ZIP members can retain text. Export only the compact fresh database;
no WAL/SHM/journal sidecars. Tests must inspect every archive member and index byte for unique private markers.

Opening a ZIP still requires directory parsing and possibly decompression of the index. STORE for index.sqlite may make random
access easier, but browser ZIP APIs may still load it into memory. No claim of instant ten-year search until representative
benchmarks cover entry counts, asset sizes, cold/warm opening, mobile memory and malformed/decompression-bomb archives. Current
`.jotz` limits (64 MiB and 256 members) do not accommodate years of individually stored entries; define bounded archive-specific
limits rather than weakening existing import limits globally.

## Time and history

Retain the journal's logical date and explicit IANA timezone separately from actual UTC `created-at` and `updated-at` instants.
Never invent a historical creation timestamp from import time. Record import/retrieval times separately, preserve original UTC
offsets where given, and represent unknown values as unknown. Same-date entries, DST folds/gaps and late-night journal dates
must not merge. Revision identity prevents stale local saves, but rollback protection across hostile file replacements requires
trusted external state and is not provided by an unauthenticated ZIP manifest alone.

## Delivery milestones

1. Define version negotiation/coexistence, entry boundaries, visible metadata and threat model with examples and limits.
2. Specify manifest, UUID references, encryption/key/recovery envelopes, time semantics and index schema; publish golden vectors.
3. Prototype public archive read/write/search and benchmark bounded archives; make unavailable FTS5 a recoverable condition.
4. Prototype protected entry/media changes, fresh-index rebuilding and atomic saves. Test tampering, wrong keys, recovery,
   plaintext leaks, stale source/index generations, interrupted saves, Unicode and old-reader rejection.
5. Independent cryptographic/container review before Writer editing or a stable `.jotz` interoperability claim.
6. Explicit reviewed imports/exports, mixed public/private sharing, portable search and local integrations without credential leaks.

Research boundaries: `docs/methods/expressive-writing.md, line 443` says "Keep it private"; `docs/methods/digital-daily-notes.md,
line 711` rejects cloud sync/accounts for journal content in that guide's context. The owner's optional BYOK features remain
separately chosen. These guides support keeping exposure deliberate, not a particular cipher, KDF or database design. The
archive layout, KDF choice and performance targets are engineering proposals requiring validation.

Technical references: [SQLite secure_delete](https://sqlite.org/pragma.html#pragma_secure_delete),
[FTS5 secure deletion](https://sqlite.org/fts5.html#the_secure_delete_configuration_option),
[SQLite security](https://sqlite.org/security.html), [Web Crypto AES-GCM](https://www.w3.org/TR/WebCryptoAPI/#aes-gcm).
