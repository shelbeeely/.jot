# Jotz v1 archive decision

Status: implemented prototype. The owner explicitly requested replacing both the old package and separate encrypted-file model,
then confirmed `.jotz` should be the default even for text-only journals. This is a fresh replacement: no migration or compatibility
reader is required. Both `.jotz` and `.jot` belong to Jot v1. `.jotz` is the primary document people keep, open and share; `.jot` is editable source, generally contained within that document and also usable on its own.

The design is now specified in [Jot-Container-v1.md](../../specification/Jot-Container-v1.md) and
[Jot-Protection-v1.md](../../specification/Jot-Protection-v1.md). Ordered source entries have UUIDs independent of dates and preserve
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

## Document model and editor interoperability

The PDF analogy describes one portable document to keep and share, not fixed page layout. Jotz retains editable source and a semantic journal structure. Public entries are `.jot` members; protected entries contain the same source inside encrypted payloads. There is no plaintext duplicate of protected writing.

Writer and integrations should treat opening a `.jotz` as opening the journal, not importing an unrelated backup. Archive-aware editor integrations must preserve source order, assets, metadata and protection when saving. Text-only editors can edit standalone `.jot` or extracted public members; associating ZIP bytes with Markdown does not provide archive support. Direct archive editing is not yet implemented in the VS Code extension.

The supplied format comparison motivates portable media, semantic tracking, local search and deliberate privacy. Its performance and security claims are not guarantees: DOCX and PDF can support strong encryption, Markdown supports metadata and working relative links, and search performance depends on implementation and journal size. The archive itself is binary and not directly diff-friendly; extracted public source is. Any editable unpacked mode needs its own future design, especially for private entries.

See [document format research](document-format-research.md) for primary sources, package inspection and outstanding interoperability decisions.

Implementation stage: **0.1.0 prototype**, targeting Jot v1. The example chronological layout and remaining document requirements are tracked in [D1–D7 of the canonical roadmap](../../specification/ROADMAP.md#primary-document-completion-required-for-v1); they are not deferred to v2 or described as already implemented.
