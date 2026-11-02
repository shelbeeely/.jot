# Format contract and core Writer finalization pass

Date: 2 November 2026. Scope selected by the owner: format contract and core Writer workflows, with full v1 release gates left open. Current stage remains **0.1.0 prototype**.

## Concrete closures

- Reject unknown structural manifest/catalog/member/protected-payload fields before import can silently lose them on a later save. Arbitrary JSON within the supported document metadata object remains preserved; unknown `.jot` source remains exact text.
- Validate mutually exclusive public/protected catalogs, ordered member identity/revision/privacy, required member fields and supported encryption descriptors. Keep existing content when Writer cannot open an unsupported archive.
- Validate generated member identity/path uniqueness and catalog consistency before emitting archives, instead of producing bytes the reader would reject.
- Treat the embedded search index as a reader cache: missing descriptor or payload keeps source readable/searchable and a later save generates a fresh index.

## Verification

The baseline suite passed 290 tests before edits. Added focused regression cases for unsupported fields, inconsistent catalogs, duplicate output identities, cacheless search/resave and preserved custom metadata; extended Writer's archive browser suite for failed-import preservation and indexless documents. Existing mixed privacy, recovery/key slots, independent Node decryption and offline browser suites remain relevant verification. The full implementation suite passed 295 tests after the reader changes, alongside the archive, lock and device-file browser suites. Versioned archive conformance fixtures were then added and checked separately. These are implementation checks, not an independent security audit.

## Still required for stable v1

Chronological-path contract, safe extension capability/preservation policy beyond this closed reader profile, complete per-attachment/shared-media privacy controls, complete offline dependency/codec verification, independent container/cryptographic review, first-time-journaler validation, physical-device/native builds and direct editor interoperability remain open in the two roadmaps. Provider integrations remain in their existing backlog. The current environment does not provide Cargo/native GTK/WebKit validation. No stable v1 release, publishing or migration commitment follows from this pass.

The owner's additional request to reduce website clutter is handled as a separate information-architecture change: preserve a clear Write entry point and group occasional tasks under Tools. It must not obscure journal save/protection controls or silently remove supported tools.
