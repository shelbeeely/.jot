# Jot v1 self-contained documents

Jot is now a single portable `.jot` file containing all writing and assets, similar to PDF in portability. It uses an ordinary ZIP container, not PDF encoding.

Inside: `journal.txt` (readable Jot/Markdown writing), `manifest.json` (format/version, paths, types, sizes and SHA-256 hashes), and `assets/` (images, scans, editable handwriting strokes and other attached files). These are internal members of one file; users do not manage an external companion folder.

The complete `.jot` is not plain text. Extract `journal.txt` with a ZIP utility or choose Export writing .md in the app to get readable text. Markdown-only export omits binary assets. No handwriting transcription is required.

## JavaScript API

```javascript
import { parse } from './jot.mjs';
import { pack, unpack, readDocument } from './container.mjs';
const bytes = await pack({
  source: '# My journal\n\n![Reflection](assets/reflection.png)\n',
  assets: [{path: 'assets/reflection.png', mediaType: 'image/png', data: imageBytes}]
});
// Save bytes as my-journal.jot.
const document = await unpack(bytes);
const ast = parse(document.source);
```

`readDocument` additionally accepts legacy UTF-8 sources. `parse` remains a text parser; it never treats ZIP bytes as journal prose. The container parser verifies manifest members, hashes, sizes and safe paths. It does not execute payloads, fetch remote assets or automatically recognize handwriting. Preserve unknown asset bytes. Missing referenced assets are visible instead of being replaced with empty images.

## Limits and integrity

Prototype limits: 64 MiB input and expanded size, 32 MiB per asset, 1 MiB source/manifest and 256 ZIP directory entries. Single-volume STORE/DEFLATE only; no ZIP64 or encrypted ZIP. Paths are case-sensitive and slash-separated beneath assets/. No absolute paths, traversal, duplicate names or symlinks. Ordinary empty asset-directory records are allowed. Oversized, corrupt or unlisted contents are rejected before replacing the current document. SHA-256 checks detect corruption and changes, not author authenticity. ZIP packaging is not encryption.

Vendored JSZip 3.10.1 handles ZIP, with its included MIT/GPL notice; hash.js and dependencies provide a local SHA-256 fallback where Web Crypto is absent, with their MIT/ISC notices. No runtime dependency download is required. Run the container tests alongside the parser/proofreading tests.

## Web behavior

Attach files in the Jot editor. Included raster images preview locally; other assets have download links. Writing uses local text autosave and assets use IndexedDB. Failed asset persistence must prompt a portable .jot download. The handwriting canvas can send both image and strokes to the editor; the scanner can send its corrected image. Download .jot includes all current attached assets, including unused ones, so review the asset list before sharing.

This decision supersedes the old plain-text-.jot/companion-folder draft. Format stays Jot v1. Parser implementation versions are independent. Full visual block composition, encrypted storage and recognition remain separate roadmap work.
