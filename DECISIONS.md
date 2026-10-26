# Latest Jot v1 decisions

## Two .jot representations

Jot v1 is intended to support both plain UTF-8 .jot documents and ZIP-packaged .jot documents with the same extension and writing syntax. Neither representation limits a journal to one day. Methods can blend within a document.

Plain-text Jot is directly readable and editable in a text editor. It cannot embed binary attachments. Packaged Jot contains journal.txt, manifest.json and assets/ inside one file, preserving images, corrected scans, editable ink and other assets together. Its ZIP bytes are not plain text; journal.txt is readable after extraction.

This decision supersedes statements in the older PDF and copied container documentation that describe plain .jot as legacy-only or packaged .jot as the only native representation. Those documents are retained as the existing draft snapshot rather than silently presented as fully revised.

## What the current code does

- parse(text) parses writing and preserves its source; stringify(ast) returns that original source, not edits to AST nodes.
- readDocument(input) accepts UTF-8 text or packaged Jot and returns source/assets plus a packaged flag.
- pack(...) writes ZIP-packaged Jot; unpack(...) validates and reads it.
- The web app opens either form. Download .jot currently writes the packaged form. Export writing .md currently writes plain text with a .md extension.
- A dedicated plain-text .jot save choice and reviewed attachment-extraction workflow are pending. To make a plain .jot today, save UTF-8 source with that extension; examples/plain-text.jot demonstrates it. Binary assets must be kept separately in that representation.
- The web app's readDocument detection is a prototype, not a claim that every malformed package can be distinguished perfectly from arbitrary text. Strengthening detection and explicit export choices belongs on the roadmap.

## Packaging and product boundaries

Jot is the journal document and source language. This project ZIP is a development/distribution bundle containing the website and specification; it is not itself a journal .jot file. Packaging does not encrypt content. PDF is inspiration for carrying a document and its assets together; Jot does not use PDF encoding or require a fixed page layout.

The root site covers Jot as a whole. Scanner and handwriting are separate tools at /scan/. Handwritten marks remain original content, with no required OCR or transcription. The roadmap also includes composable content blocks, individualized accessibility preferences, multiple languages and proofing improvements.
