# Document container research for Jot v1

Research date: 1 November 2026. Scope: primary specifications and platform documentation, plus inspection of generated example packages. This is an architecture comparison, not a performance benchmark, security audit or independent application interoperability test.

## Recommendation

Use `.jotz` as the primary editable, portable journal document. Its internals should resemble a DOCX/ODT/EPUB package: an explicit manifest, ordered editable content, bundled media and declared metadata. Use PDF as a reference for the experience of keeping and sharing one document and for a separate fixed-layout export, rather than adopting PDF's page-description language as journal source. Both `.jotz` and standalone `.jot` remain Jot v1.

`.jot` is exact UTF-8 source, generally stored as entry members inside `.jotz`, and can also be edited alone. Encrypted entries contain that source inside encrypted payloads, without plaintext duplicates. A ZIP extension does not make a format readable in existing document applications: direct editing needs a Jot-aware application or editor integration.

## PDF: objects and page descriptions, not a ZIP package

ISO 32000-1 sections 7.3, 7.5 and 7.7 describe PDF objects, the file structure and the document catalog/page tree. The basic structure is a version header, an object body, cross-reference information and a trailer. Cross-reference tables or streams allow readers to locate objects without scanning every object. Pages refer to content streams and resources such as fonts and images. Streams can be compressed. A PDF can include forms, annotations, embedded files, metadata and logical structure; it is not inherently read-only or merely a picture of text.

A simplified layout is:

```text
%PDF-1.x
objects: catalog → page tree → pages → content streams/resources
cross-reference table or stream
trailer / root reference
startxref
%%EOF
```

Section 7.5.6 permits incremental updates: new objects and cross-reference information are appended while previous bytes remain. This helps small updates but means deleting visible content or replacing an object does not by itself erase old bytes. Section 7.6 defines encryption and crypt filters, section 7.11.4 embedded file streams, section 14.3 metadata, and section 14.8 Tagged PDF. The cited edition is PDF 1.7 / ISO 32000-1:2008, not a claim that it covers all later PDF 2.0 features.

**For Jot:** stable identities and direct member lookup are useful. PDF's cross-reference table is an object-location index, not a full-text search database. Do not copy append-only revision storage without considering old private content. Keep editable source authoritative; generate fixed-layout PDF separately when someone wants a reproducible printed page.

## DOCX: a graph of typed parts and relationships

An ordinary, unencrypted DOCX is an Office Open XML package based on Open Packaging Conventions (OPC). OPC separates a logical graph of parts and relationships from its physical ZIP representation. Parts have MIME-style content types; relationships may target internal resources or external URLs. ZIP alone is not the specification.

A typical package contains:

```text
[Content_Types].xml
_rels/.rels
word/document.xml
word/_rels/document.xml.rels
word/styles.xml
word/numbering.xml
word/media/...
docProps/core.xml
```

WordprocessingML represents the main story using document → body → paragraphs → runs → text, with tables and other structures alongside it. Headers, footnotes, comments and styles may be separate parts. Resource relationships let content refer to assets without embedding their bytes in each paragraph. Rendered pagination depends on document layout and the reader; it is not simply a fixed-page image.

Password-encrypted Office Open XML documents need separate treatment. Microsoft's MS-OFFCRYPTO describes ECMA-376 Standard, Agile and Extensible encryption. An encrypted package can be carried in an OLE Compound File with `EncryptionInfo` and `EncryptedPackage` streams, rather than remaining a directly inspectable ordinary DOCX ZIP. Thus “DOCX encryption is weak” is not a defensible general statement; mechanism, parameters and implementation matter.

**For Jot:** distinguish entries, assets, relationships, document metadata and generated presentation. Keep references stable and explicit. Do not fetch external relationships merely because a document opens. Avoid adopting WordprocessingML's complexity when plain `.jot` source already expresses the writing.

## EPUB: a manifest plus an explicit reading order

EPUB 3.3 uses the ZIP-based Open Container Format (OCF). A first, uncompressed `mimetype` member identifies `application/epub+zip`; `META-INF/container.xml` points to the package document. The package document declares metadata, a resource manifest and a spine. The spine is an ordered list of manifest references defining the default reading order. ZIP member order and filename sorting do not define that order.

```text
mimetype
META-INF/container.xml
EPUB/package.opf             # actual path is declared by container.xml
EPUB/nav.xhtml
EPUB/text/...
EPUB/styles/...
EPUB/media/...
```

EPUB can be reflowable or fixed-layout. It defines an encryption metadata mechanism in `META-INF/encryption.xml`; that mechanism is not itself a universal, interoperable personal-password journal encryption policy. Section 4.3 defines permitted ZIP features, and section 5.7.1 defines the spine.

**For Jot:** ordered entry IDs in the manifest serve a role similar to a spine. Keep logical order independent of dates, filenames and ZIP placement. A small predictable identification member is useful; the current first, stored Jot manifest already provides one. Adopting an EPUB-style `mimetype` member would be a separate design change, not a requirement, and would change that first-member rule.

## OpenDocument / ODT: a package with per-member protection

OpenDocument 1.3 Part 2 defines ZIP packages, `META-INF/manifest.xml`, file entries, media types, encryption metadata, optional signatures and preview conventions. A typical text document includes `content.xml`, `styles.xml`, `meta.xml` and bundled pictures. A `mimetype` member, when present, is first, uncompressed and has no ZIP extra field.

Sections 3.2–3.4 and 4 describe the manifest, identification and encryption. OpenDocument permits encrypting some or all files within a package, recording the decryption parameters in the unencrypted manifest. Therefore partial package encryption is established prior art, not unique to Jot. Algorithm support varies; historical/default examples are not recommendations for Jot's cryptography.

Section 3.8 addresses thumbnails: content previews should not reveal an encrypted document. Even a convenience thumbnail can disclose private writing without decrypting the main source.

**For Jot:** define each public/private boundary and every derived output, including asset names, dates, search results, thumbnails and previews. Protection is broader than encrypting the main text. A future mixed-document preview must include only explicitly public content, or be generic. Do not embed a full private HTML/PDF preview outside protection.

## SQLite as an alternative outer container

SQLite's documented application-file approach and SQLite Archive (SQLAR) demonstrate that a single database can hold both structured data and file blobs. SQLAR represents files as rows with names, sizes and compressed data. It supports transactional and incremental updates without rewriting a whole ZIP. It does not inherently provide per-entry encryption or guarantee that deleted private content disappears from previous pages or copies.

**For Jot:** a database outer container is a credible alternative if measured write performance requires it. It sacrifices ordinary ZIP extraction and direct access to `.jot` members. Retain ZIP for v1's recovery/interoperability goal; use SQLite as a replaceable public search cache. An embedded FTS index adds build size, index size and reader capabilities. It cannot substantiate “instant search over ten years” without realistic measurements. Readers should recover source if the optional index is absent, stale or corrupt.

## What this means for the current implementation

Already aligned:

- Primary `.jotz` document; standalone `.jot` source; both v1.
- Exact ordered entry source, stable IDs, bundled media and explicit asset aliases.
- Manifest-based versioning and bounded ZIP member validation.
- Per-member authenticated encryption and a protected catalog.
- Public-only SQLite FTS5 with source fallback; private search in unlocked memory.

Still requires design or verification:

- Editor integrations that open and save the archive directly. The current VS Code extension handles standalone `.jot` only; ZIP packaging does not grant support in Word, PDF readers or EPUB readers.
- A conformance policy for required features, optional extensions and unknown members. A writer must preserve supported data and refuse a destructive save when it cannot safely retain required content/protection. This is a recommendation, not a claim that unknown parts currently round-trip.
- Explicit preview/thumbnail rules, rendering profile and font portability if identical visual output matters. A generated view should remain distinguishable from editable source.
- Crash-safe saves, concurrent edits, large journals, mobile memory usage and independent encryption review. Ciphertext reuse is not incremental filesystem saving.
- A documented unpacked workflow if Git-friendly editing is wanted. The ZIP itself is binary; plaintext extraction must never silently expose private entries.

Do not switch the outer format, add a second authoritative HTML/PDF copy, or promise universal editor compatibility based solely on this research. Resolve interoperability and conformance rules before expanding the package further.

## Reproducible package inspection

Used installed Pandoc to generate DOCX, ODT and EPUB from the same fictional dated paragraph and bundled public sample image; inspected members with Python `zipfile`. Observed DOCX: 17 members, first `[Content_Types].xml`, DEFLATE; ODT: 7 members, first `mimetype`, STORE; EPUB: 10 members, first `mimetype`, STORE. Each contained a main content part and the bundled image. These are example producer outputs, not universal mandatory layouts. Temporary files stayed outside the repository in `/tmp/jot-format-research/`.

## Primary sources

1. Adobe / ISO, [PDF 32000-1:2008](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf), especially §§7.3, 7.5–7.7, 7.11.4, 14.3 and 14.8.
2. Microsoft, [Open Packaging Conventions overview](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/opc/open-packaging-conventions-overview): logical graph, parts, content types and relationships. [ECMA-376](https://ecma-international.org/publications-and-standards/standards/ecma-376/), Part 2 is the packaging standard.
3. Microsoft, [Structure of a WordprocessingML document](https://learn.microsoft.com/en-us/office/open-xml/word/structure-of-a-wordprocessingml-document): stories, main document, paragraphs, runs and text.
4. Microsoft, [MS-OFFCRYPTO: Office Document Cryptography Structure](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-offcrypto/3c34d72a-1a61-4b52-a893-196f9157f083), downloaded published PDF revision 17 February 2026, §§1.3.3, 2.3.4.4 and 2.3.4.10–15.
5. W3C, [EPUB 3.3](https://www.w3.org/TR/epub-33/), §§4.2–4.3, 5.6–5.7 and 8.2.
6. OASIS, [OpenDocument 1.3, Part 2: Packages](https://docs.oasis-open.org/office/OpenDocument/v1.3/os/part2-packages/OpenDocument-v1.3-os-part2-packages.html), §§3–4.
7. SQLite, [SQLite Archive Files](https://sqlite.org/sqlar.html), [Database File Format](https://sqlite.org/fileformat.html) and [FTS5](https://sqlite.org/fts5.html).

The user's “Journal Format Comparison” is the motivating brief, not independent evidence for relative security, speed or uniqueness. No live account access or personal journal content was used.
