# Jotz v2 archive decision

Status: implemented prototype. The owner explicitly requested replacing both the old package and separate encrypted-file model,
then confirmed `.jotz` should be the default even for text-only journals. This is a fresh replacement: no migration or compatibility
reader is required. Plain `.jot` remains readable source import/export.

The design is now specified in [Jot-Container-v2.md](../../specification/Jot-Container-v2.md) and
[Jot-Protection-v2.md](../../specification/Jot-Protection-v2.md). Ordered source entries have UUIDs independent of dates and preserve
exact text. Private entries use independent AES-GCM content keys, with protected attachments/catalog and passphrase/recovery/passkey
slots. Public-only SQLite FTS5 is rebuilt on privacy transitions; private search uses unlocked source in memory. Writer saves the
same archive in IndexedDB and exports it as the default file. No private database, WAL, plaintext sidecar or remote search exists.

Dates and cryptographic metadata remain visible, and ciphertext reuse does not promise incremental ZIP disk I/O. All attachments
are protected when any archive protection is configured. Source-only/HTML/print exports can expose content chosen after unlock.
Independent security review, interoperability, native-device and ten-year archive performance remain unverified. No instant-search
or complete secure-erasure claim follows from using AES or SQLite.

Research: `docs/methods/expressive-writing.md, line 443` says keep it private unless chosen;
`docs/methods/digital-daily-notes.md, line 711` rejects journal-content cloud sync in that guide. These inform deliberate exposure;
the container, key-wrapping and database design are engineering decisions rather than findings established by those guides.
