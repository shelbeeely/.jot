# Jot v1 packaged documents (`.jotz`)

Jot has two representations with the same writing syntax: plain `.jot` (UTF-8 text, editable anywhere) and packaged `.jotz`, one portable file containing the writing and all its assets, similar to PDF in portability. A `.jotz` is an ordinary ZIP container, not PDF encoding. Use `.jotz` only when a journal has images, scans or handwriting; otherwise save plain `.jot`.

Inside a `.jotz`: `journal.txt` (readable Jot/Markdown writing), `manifest.json` (format/version, paths, types, sizes and SHA-256 hashes), and `assets/` (images, scans, editable handwriting strokes and other attached files). These are internal members of one file; users do not manage an external companion folder.

A `.jotz` is not plain text. Extract `journal.txt` with a ZIP utility or choose Export writing in the app to get readable text. Writing-only export omits binary assets. No handwriting transcription is required.

Readers decide by content, not extension: a file starting with the ZIP signature `PK\x03\x04` is a package, anything else is plain source. A mislabelled file is still read correctly.

## JavaScript API

```javascript
import { parse } from './jot.mjs';
import { pack, unpack, readDocument } from './container.mjs';
const bytes = await pack({
  source: '# My journal\n\n![Reflection](assets/reflection.png)\n',
  assets: [{path: 'assets/reflection.png', mediaType: 'image/png', data: imageBytes}]
});
// Save bytes as my-journal.jotz.
const document = await unpack(bytes);
const ast = parse(document.source);
```

`readDocument` reads either representation, deciding by content: plain `.jot` source or a `.jotz` package. `parse` remains a text parser; it never treats ZIP bytes as journal prose. The container parser verifies manifest members, hashes, sizes and safe paths. It does not execute payloads, fetch remote assets or automatically recognize handwriting. Preserve unknown asset bytes. Missing referenced assets are visible instead of being replaced with empty images.

## Limits and integrity

Prototype limits: 64 MiB input and expanded size, 32 MiB per asset, 1 MiB source/manifest and 256 ZIP directory entries. Single-volume STORE/DEFLATE only; no ZIP64 or encrypted ZIP. Paths are case-sensitive and slash-separated beneath assets/. No absolute paths, traversal, duplicate names or symlinks. Ordinary empty asset-directory records are allowed. Oversized, corrupt or unlisted contents are rejected before replacing the current document. SHA-256 checks detect corruption and changes, not author authenticity. ZIP packaging is not encryption.

Vendored JSZip 3.10.1 handles ZIP, with its included MIT/GPL notice; hash.js and dependencies provide a local SHA-256 fallback where Web Crypto is absent, with their MIT/ISC notices. No runtime dependency download is required. Run the container tests alongside the parser/proofreading tests.

## Web behavior

Attach files in the Jot editor. Included raster images preview locally; other assets have download links. Writing uses local text autosave and assets use IndexedDB. Failed asset persistence must prompt a portable `.jotz` download. The handwriting canvas can send both image and strokes to the editor; the scanner can send its corrected image. Downloading a journal with attachments saves a `.jotz` that includes all current attached assets, including unused ones, so review the asset list before sharing.

Draft 3 (26 October 2026) gives the package its own extension, `.jotz`; plain writing stays `.jot`. No companion folder is used. Format stays Jot v1. Parser implementation versions are independent. Full visual block composition, encrypted storage and recognition remain separate roadmap work.
