# Jotz v1 protection

Protection is part of the `.jotz` v1 container; there is no separate encrypted file extension. This specification describes the
implemented prototype, not an independent cryptographic audit. See [container](CONTAINER.md) for visibility and size limits.

## Core v1 requirement and current scope

Encryption is a core Jotz/Writer v1 capability. A conforming protected-document workflow must preserve private entries, media, ink, included documents, integration snapshots and private descriptive metadata through supported edits and saves, with offline unlocking and a portable recovery path. Public `.jotz` content and standalone unencrypted `.jot` remain supported choices; a declaration of encryption support is not a claim that every new file is automatically encrypted.

The current prototype supports entry privacy choices and conservatively encrypts all attachments and document metadata once protection is configured. Independent per-attachment controls remain planned. Public references must not make a protected asset public implicitly. Previews, search and other derivatives must follow the relevant protection boundary. Current dates/member IDs/sizes and key-slot parameters remain visible, as specified by the container; do not imply all metadata or every archive byte is hidden.

These are core v1 acceptance requirements, with completion tracked in both roadmaps. This clarification changes no cipher, key structure, wire version or runtime default. Independent review, complete shared-asset/editor interoperability and native-device verification remain outstanding.

## Keys and ways in

Generate a random 32-byte master key. Import it as a non-exportable Web Crypto AES-256-GCM CryptoKey for page-session use.
Passphrase slots derive a wrapping key with PBKDF2-HMAC-SHA-256, UTF-8 NFC passphrase, random 16-byte salt, normally 600,000
iterations. Accept 100,000 through 2,000,000 iterations with a combined slot work budget of 8,000,000. Recovery codes contain
125 random bits in 25 Crockford base32 symbols (five groups), normalize case/separators and O/I/L ambiguities, and use
100,000 iterations with an independent random salt. A passkey PRF answer uses HKDF-SHA-256, empty salt and UTF-8 info
`JOTZ 1 webauthn-prf`; keep its random 32-byte PRF input, credential ID and RP identifier with the slot. Passkeys remain bound
to that RP and browser/hardware support. Always retain at least one passphrase or recovery slot; at most 16 slots.

A key slot wraps the master key with AES-256-GCM, random 12-byte IV and 128-bit tag. Additional authenticated data is UTF-8
`JOTZ 1 keyslot ` followed by slot type (`passphrase`, `recovery-code`, `webauthn-prf`). `key` contains wrapped key bytes plus tag;
`iv` and `key` use standard padded base64. Passphrase/recovery slots include `kdf: PBKDF2-SHA-256`, iterations and base64 salt.
Passkey slots include RP, base64url credential ID, base64 PRF input, optional public label, base64 IV and wrapped key.
Passphrases/recovery codes/PRF answers are not stored in the archive. Salt, work factors, key-slot types, RP/credential metadata
and optional labels are public; do not put private journal details in labels.

## Member encryption

Generate an independent random 32-byte content key for each changed protected entry, asset or catalog. Use AES-256-GCM with a
fresh random 12-byte `iv` and 128-bit tag. Wrap that content key under the master key using another random 12-byte `keyIv`.
The `encryption` descriptor is `{cipher:"AES-256-GCM",iv,keyIv,key}`, with padded base64 fields; `key` is the wrapped content key
plus tag (48 bytes). The member file contains ciphertext plus the 16-byte authentication tag. Hash ciphertext, not plaintext.

Payload AAD is UTF-8 JSON of the exact ordered array:
`["JOTZ",1,archiveUUID,memberKind,memberUUID,revision,logicalDateOrNull]`.
Content-key wrapping AAD is UTF-8 `JOTZ 1 member-key ` concatenated with that JSON. This binds identity, kind, archive, revision and
logical date. Do not use the master key directly to encrypt journal source. Nonces/content keys are fresh on member edits.
Unchanged descriptors/ciphertext may be reused only with matching identity, revision, protection, plaintext and master key.

Each decrypted payload is a 4-byte unsigned big-endian JSON metadata length, metadata UTF-8 JSON (at most 64 KiB), then data:

- entry: metadata `{timezone,createdAt,updatedAt}`, data = exact UTF-8 source;
- asset: metadata `{path,mediaType,name?}`, data = original bytes;
- catalog: metadata `{entries,assets,metadata,binding}`, data empty. Entries contain identity/privacy/time metadata without source;
  assets contain identity/revision/alias/type/name. Application document/workspace metadata stays inside this catalog.

The catalog `binding` is SHA-256 of canonical JSON of the entire manifest **without its catalog descriptor**. Canonical JSON
recursively sorts object keys lexically and retains array order; JSON encoding/escaping follows ECMAScript JSON.stringify.
The binding includes ordered entry/asset descriptors, public index descriptor and the complete key-slot list. Authenticate and
check it after opening a key slot, before accepting a private document. This detects reordered entries, altered public descriptors,
privacy downgrade flags, changed ways in and index replacement relative to the encrypted catalog. A locked public reader can
verify hashes but cannot authenticate this binding until unlocking. A fully unprotected archive has no author authentication.

Changing/revoking a way in authenticates a new catalog with the remaining slots. It does not revoke old downloads/backups or an
attacker who already obtained the master key. Changing a passphrase is not a compromise-recovery key rotation. Rollback detection
against a hostile older archive requires trusted external state and is not provided by ZIP alone.

## At-rest and application behavior

No private entry source/tags/mood values/source hashes, asset aliases/names/thumbnails/ink backgrounds or settings belong in the
public manifest or index. All assets are protected whenever protection is enabled. Dates and ciphertext sizes still leak by
choice. Building a fresh public database on privacy transitions prevents private values remaining in FTS shadow/freelist pages.
Never package SQLite WAL/SHM/journal files or earlier ZIP members.

Writer persists the same archive bytes atomically in IndexedDB `documents`. Its localStorage record contains only archive version,
opaque document key and protected flag; no journal content, passphrases or keys. Session keys stay in page memory and are dropped
on relock/reload. Private search is source-only in page memory. JavaScript/browser/OS memory and external backups do not offer
secure erasure guarantees. Browser storage clearing is not a backup strategy. Downloads, images, printing and writing-only exports
chosen after unlock can expose private content; the app labels their scope.

Tests include independent decryption through node:crypto, every key-slot type, wrong keys, tag/ciphertext tampering, metadata/order
binding, public-only index scans, repeated dates, exact source/assets and ciphertext reuse. Independent security review, cross-app
interoperability and mobile/large-archive benchmarks remain unverified.
