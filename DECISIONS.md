# Latest Jot v1 decisions

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

## What the current code does

- parse(text) parses writing and preserves its source; stringify(ast) returns that original source, not edits to AST nodes.
- readDocument(input) reads either representation by content and returns source/assets plus a packaged flag.
- pack(...) writes the bytes of a `.jotz`; unpack(...) validates and reads one.
- The workspace opens `.jot`, `.jotz`, `.md` and `.txt`. Download .jot saves plain `.jot` when the journal has no attachments, and one
  `.jotz` when it has. Export writing .md writes the writing only.
- The template editor writes plain `.jot` and opens either. The print engine (`journal/`) reads `*.jot` and `*.jotz`.
- readDocument's detection is a prototype, not a claim that every malformed package can be told apart from arbitrary text.

## Packaging and product boundaries

Jot is the journal document and source language. This project ZIP is a development/distribution bundle containing the website and specification; it is not itself a journal file. Packaging does not encrypt content. PDF is inspiration for carrying a document and its assets together; Jot does not use PDF encoding or require a fixed page layout.

The root site covers Jot as a whole. Scanner and handwriting are separate tools at /scan/. Handwritten marks remain original content, with no required OCR or transcription. The roadmap also includes composable content blocks, individualized accessibility preferences, multiple languages and proofing improvements.
