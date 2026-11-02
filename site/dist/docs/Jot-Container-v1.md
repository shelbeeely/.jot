# Jotz v1: the default journal archive

Status: implemented Jot v1 prototype, 1 November 2026. Jot's text grammar remains v1; the container is version **1.0**. `.jotz` is the
default for every journal, including text-only journals, with optional per-entry protection. `.jot` is readable source
import/export and `.md` is a writing-only export. There is no separate `.jotlock` format and no migration reader for earlier prototypes.
This is a fresh format replacement requested by the owner. Cryptographic/container review and large-archive benchmarks remain
release validation; implementation tests are not a security audit or a claim of instant ten-year search.

## Offline completeness: v1 completion requirement

A complete `.jotz` MUST be readable offline in a locally available compatible reader. This applies to the entire document, not only text or previously cached thumbnails: all entries, included images/audio/video, ink components, included documents, saved integration snapshots and resources needed for supported presentation must be local. No source-provider account, expiring URL, cloud server, journal-upload service or AI model may be required to reopen or read saved content. Protected members require a supported local passphrase/recovery/key path; being encrypted is not permission to require an online key service.

Selected media MUST finish downloading and pass validation before an importer reports it as attached or the document as complete. Thumbnails/previews cannot stand in for a selected original without an explicit choice and accurate labeling. Missing/unsupported/oversize content must be reported and preserved where possible; a recoverable incomplete draft must not be advertised as a complete offline document. An unsupported format needs a declared local reader capability or an explicitly chosen offline-readable rendition with the original retained, not an assumption that every device can decode every media type.

External links may remain citations or optional links: their labels and saved reference/snapshot must be readable offline, and reading the journal must not require opening the destination. This does not require copying arbitrary websites or downloading licensed streaming catalogs. Any remote embed used as document content needs a permitted bundled representation or a clear incomplete-content warning. Opening a document must not fetch such content automatically.

Reader software must also be available offline: an installed desktop/mobile app or an explicitly prepared offline web app with local parser, renderer, fonts and other runtime resources. The archive is not an executable or a substitute for installing a reader. Exact source/assets must survive an offline open/edit/save/reopen cycle. Search must fall back to local source if its cache is unavailable. Test on a fresh reader profile without provider caches, with network disabled, across public/mixed/protected documents and missing/corrupt-cache cases.

Status: this is a required v1 acceptance contract. The prototype bundles source/assets and an offline web shell, but complete media-format coverage, dependency/completeness validation, fresh-profile native testing and the planned provider connectors are not yet verified. See the format and Writer roadmap gates; this specification update does not claim those implementations exist.

## Structure and losslessness

Ordinary single-volume ZIP, STORE/DEFLATE, without ZIP encryption or ZIP64:

```text
manifest.json                  # FIRST member, STORE, UTF-8 JSON; version 1.0
entries/<uuid>.jot             # public writing, exact UTF-8 bytes
media/<uuid>                   # public attachment bytes
private/<uuid>.enc             # protected entry, attachment or catalog
index.sqlite                   # public-only SQLite database, FTS5 included
```

Public writing is human-readable after extracting the ZIP. Protected writing/media is not. Public entries, their tags and
measurements are deliberately public and indexable. Private entry dates, member counts/UUIDs/sizes and key-slot metadata remain
visible. Fully hiding dates requires a different whole-envelope design; it is not provided here. Do not describe a mixed
public/private archive as fully encrypted.

The first local ZIP member MUST be the uncompressed manifest, without a data descriptor. This lets a reader discover protection
without decompressing the archive. A header is a capability hint, not authentication. Readers validate the central directory,
reject traversal/absolute/backslash/duplicate/symlink paths and extra members, enforce limits before expansion, then verify member
lengths and SHA-256. Empty directories under entries/, media/ and private/ are allowed. Member timestamps are fixed at
2000-01-01T00:00:00Z; actual journal times belong in entry metadata, not ZIP timestamps.

`manifest.json` has `format: "jot"`, `version: "1.0"`, archive UUID `id`, ordered `entries`, ordered `assets`, `index`, and either
`catalogData` (unprotected archive) or `keys` plus encrypted `catalog` (protection enabled). The two catalog forms MUST NOT coexist. The index descriptor is optional for readers; writers generate it. A missing descriptor/payload or unusable cache must leave verified source available for local search. UUIDs are random v4 identifiers,
independent of dates or content. Member descriptors have `id`, `kind` (`entry`, `asset`, `catalog`, `index`), positive `revision`,
`date` (logical entry day or null), `path`, `byteLength` and lowercase SHA-256 of stored member bytes. Public entry descriptors
also contain `timezone`, `createdAt` and `updatedAt`; protected descriptors MUST NOT expose these or plaintext hashes/titles/tags.
`index` additionally has `generation`; protected descriptors additionally have `encryption` (see protection specification).

The prototype's supported container contract is closed: unknown manifest, catalog, member and protected-payload metadata fields are rejected with an unsupported-format error rather than silently lost on resave. Arbitrary JSON document metadata within `catalogData.metadata` (or the encrypted catalog's `metadata`) remains preserved. Unknown fields in `.jot` source are not container fields and remain exact source. Future container extensions require an explicit preservation/capability contract before acceptance.

Catalog entries/assets must have the same count, identity, revision and order as their member lists, entry protection must match descriptors, and available payload metadata must agree with the catalog. Readers validate these before replacing the current journal. Writers validate generated manifests/catalogs and reject duplicate identities/paths before emitting bytes. Unsupported cryptographic descriptors are rejected even for locked public reading; no implicit plaintext downgrade is permitted.

The ordered entries reconstruct the exact original source by concatenation. Every parsed dated heading starts an entry, even
when dates repeat; preamble/frontmatter and undated writing get an undated entry when needed. Source is not normalized: retain
BOM, LF/CRLF, Unicode and trailing whitespace. Entry source is limited to 1 MiB; combined source to 32 MiB. Actual created/updated
UTC timestamps are distinct from logical journal dates and declared IANA timezones. Imported creation times remain null when
unknown. User-authored event/observation timestamps are not replaced with save times. Unknown source fields remain source text.

Asset aliases are safe logical `media/` or `assets/` paths resolved against the **archive root through the catalog**, not the
entry's filesystem directory. New file attachments use UUID media aliases and readable source labels. Public catalog asset
metadata maps UUID to alias, media type and optional display name; protected catalog/asset payloads keep these fields encrypted.
Consumers resolve aliases through the catalog, never arbitrary disk/network paths. Missing media stays visibly missing; unknown
media bytes are preserved without execution or automatic playback. Unused attachments are retained. Editable ink backgrounds
are attachments with the same protection as the drawing; the source image/link conventions are unchanged.

## Protection and privacy changes

See [Jotz protection](Jot-Protection-v1.md). One archive master key has passphrase/recovery/passkey ways in. Each protected member
uses its own random AES-256-GCM content key, authenticated descriptor identity and fresh nonce. Unchanged member ciphertext can
be reused; changes to key-slot lists authenticate a new catalog without necessarily re-encrypting every entry. ZIP saving may
still rewrite the whole file; incremental encryption is not incremental disk I/O.

Writer starts all existing/new entries protected when a passphrase is first set up. **Entries, privacy and search** can explicitly
make individual entries public. New entries default protected thereafter. All attachments and document/workspace metadata are
protected whenever an archive has protection enabled, even if referenced by a public entry. This conservative rule protects
shared media, unused files and annotated page backgrounds. A public reader may therefore see a locked/missing attachment.
It is not silently copied into public media. Removing protection is an explicit operation that makes entries and media public.

Privacy changes construct a fresh public index, never reuse pages with deleted private rows. Browser storage commits a complete
archive in one IndexedDB transaction; device saves use the existing atomic writable-file close/abort checks. Old downloads,
backups, browser/filesystem forensic remnants and snapshots cannot be retroactively erased. If saving privacy choices fails,
Writer says the previous browser copy may remain public. Portable Save/Download updates external copies separately.

## Search index

Writers embed `index.sqlite` as a STORE member. It is a cache, not source of truth or executable journal content. SQLite tables:

- `meta(version INTEGER, generation TEXT)` — one row, schema version 1;
- `entries(id TEXT PRIMARY KEY, date TEXT, timezone TEXT, hash TEXT)` — public entries only;
- `tags(entry_id TEXT, tag TEXT)` with tag index;
- `measurements(entry_id TEXT, metric TEXT, value REAL, unit TEXT)` with metric/value index;
- FTS5 `entry_text(entry_id UNINDEXED, body, tokenize='unicode61')`, with its standard shadow tables.

Generation is SHA-256 of UTF-8 JSON of ordered `[id,date,timezone,sourceSHA256]` public entries. Only explicit public measurements
are indexed; absent values are null, not zero. Index text strips a leading BOM and substitutes U+FFFD for NUL for SQLite's text
bridge; source and source hashes preserve exact original bytes. Tags use readable `#word` tokens. The index contains no private
entry fields or media contents, inferred mood/sentiment, transcripts or thumbnails.

Readers verify schema/generation, entry identities/hashes and indexed public text, deserialize read-only in memory, set
trusted_schema off and query_only on, reject unexpected SQL/schema objects, and use only fixed parameterized queries. No OPFS,
SQLite files, WAL/SHM sidecars, ATTACH, extensions or user-supplied SQL are used. Stale, malformed or missing index payloads fall
back to bounded source search, including tag/date/measurement filters. Private search runs only against unlocked in-memory source,
never in the portable SQLite database. Search results are limited to 100. Loading an index still costs I/O and decompression;
large/archive/mobile performance is not established merely by embedding SQLite.

## Limits

64 MiB input and total expanded member bytes; 32 MiB combined source and per attachment; 1 MiB per entry; 4 MiB manifest;
16 MiB index; at most 10,000 source entries, 1,000 attachments and 12,000 ZIP members. Framed private metadata is bounded to
64 KiB, with ciphertext/frame overhead separately bounded. Oversize or malformed required members reject the archive without
replacing the active document. An index cache error does not discard verified writing. No legacy fallback or silent truncation.

## JavaScript

```javascript
import {pack, readDocument, searchArchive} from './container.mjs';
const bytes = await pack({source: '### 2026-11-01\n\nA short walk. #outside\n'});
const doc = await readDocument(bytes);
const matches = await searchArchive(doc, {tag: 'outside'});
doc.index?.close();
```

`pack` accepts `entries`, `previous` (unlocked document/packed state), optional `secret` (passphrase/session), `privateEntries`
(`"all"` or UUID list), asset bytes, metadata and archive ID. `packedState(bytes)` returns this process's in-memory save state for
subsequent saves/ciphertext reuse. It is not a plaintext sidecar and must not be persisted outside the archive. `readDocument(bytes,
{secret})` returns source, entries, assets, metadata, session and index; without a secret, protected entries have null source and
`partial: true`. A partial document MUST NOT be rewritten or treated as a complete export. `pack` rejects partial `previous`.
`parse` still consumes text, with UTF-8 offsets into the flattened writing, not compressed ZIP offsets.
