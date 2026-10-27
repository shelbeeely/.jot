# Proposal: Jot documents and books

Status: design draft; no new extension support is implemented by this proposal.

## Proposed family

| Extension | Purpose | Contents |
| --- | --- | --- |
| `.jot` | One readable journal or chapter | Plain UTF-8 Jot text |
| `.jotz` | One journal with its attachments | Existing ZIP-based document package |
| `.jotbook` | One book of multiple journals | ZIP-based book package with an ordered chapter manifest |

The user confirmed keeping the existing `.jotz` format and naming the new book container `.jotbook`.
`.jotz` is already implemented and specified; `.jotbook` remains a proposal.
A book is an ordered collection, not an implication of fixed pages: a chapter can be a day, month, topic, notebook or story.

## Book contents

Use ZIP for inspection and extraction with ordinary tools. Give books a distinct manifest identity (`format: jot-book`,
`version: 1.0`) so readers distinguish a book from a single packaged document by content.

```text
manifest.json
chapters/
  introduction.jot
  october.jot
  november.jotz
```

The manifest contains title, optional author/language/description, and an ordered `chapters` array. Each chapter has a stable ID,
title, relative path, media type, byte length and SHA-256 hash. Array order is reading order; filenames do not determine it.
Plain chapters remain independent `.jot` files; chapters with assets can be self-contained `.jotz` documents. Do not nest books.
Avoid shared assets in the first version so extracting a chapter does not break its attachments.

Optional parts/sections group chapter IDs without changing their identities. Cover and other book-level assets use a separately
listed assets array. Reading position, search indexes and thumbnails are optional viewer data; rebuilding them must not change
chapter writing. Page size, binding margins and numbering belong to optional presentation metadata, not the chapter source.
Rendered PDF/EPUB export is a separate capability and is not implied by the book container.

## Links and editing

Record IDs are unique within each chapter, not across the whole book. Local `#id` links remain local. Cross-chapter links use
relative chapter paths, such as `october.jot#reflection`, with resolution confined to the book. A move or rename must update
manifest paths and affected links. Saving one chapter preserves the other chapters byte for byte and refreshes its descriptor.
Readers should expose a table of contents, open chapters individually, and export chapters without flattening their content.

## Validation contract

Validate the archive structure and manifest before replacing an open book. Reject duplicate IDs/paths, missing or unlisted files,
unsupported versions, unsafe paths and mismatched byte lengths/hashes. Apply decompressed-size, entry-count and compression-ratio
limits across the entire book, including nested document packages; do not apply fresh unlimited allowances to each chapter.

Then validate every chapter with its appropriate reader and strict Jot checks, reporting chapter path plus line/column. Validate
cross-chapter targets and packaged attachment references. Success must mean the entire book passed, rather than only its manifest
or currently open chapter. No chapter may execute code, access files outside the archive, or fetch remote content during validation.

## Compatibility and delivery order

1. Keep `.jot` and `.jotz` unchanged. Recognize document versus book packages by their manifest identity, not extension alone.
2. Specify versioned book manifests, limits and fixtures before adding `.jotbook` to file pickers or marketing supported output.
3. Implement pack/read/validate plus CLI commands, with round-trip and malformed-archive tests.
4. Add book navigation and chapter editing to the workspace, then agent generation of validated books.

The agent skill already supports plain-language briefs and one-question-at-a-time interviews for documents. For a book, the same
conversation can establish purpose and chapter structure, then draft chapters individually. Until the book reader/validator is
implemented, deliver those as separate validated `.jot` files and describe the collection without claiming `.jotbook` support.
