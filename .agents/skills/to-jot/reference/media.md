# Media, interactive blocks and saved scenes

Checked against the current parser and Writer on 5 November 2026. Use runnable code and the latest `DECISIONS.md`
when an older guide disagrees. In particular, audio/video image syntax now creates players, and `.jotz` no longer has
a `journal.txt` member. The examples below name files that must actually be bundled; a path is not a download request.

## Save a self-contained journal

`.jotz` is the primary saved document, including text-only journals. Keep its UTF-8 `.jot` source independently readable.
Use Writer's Attach files and Save/Download, or the canonical container API. An ES module in the repository can use:

```js
import fs from 'node:fs';
import { pack, readDocument } from './parser/container.mjs';

const source = fs.readFileSync('journal.jot', 'utf8');
const assets = [
  { path: 'media/window.png', name: 'window.png', mediaType: 'image/png', data: new Uint8Array(fs.readFileSync('window.png')) },
  { path: 'media/rain.wav', name: 'rain.wav', mediaType: 'audio/wav', data: new Uint8Array(fs.readFileSync('rain.wav')) },
];
const bytes = await pack({ source, assets });
fs.writeFileSync('journal.jotz', bytes);
const opened = await readDocument(bytes);
try {
  if (opened.source !== source || opened.assets.length !== assets.length) throw Error('Incomplete archive');
} finally { opened.index?.close(); }
```

The downloadable skill carries the same API under `runtime/parser/container.mjs`; adjust import paths to the script's
location. Assets accept strings, `Uint8Array`, `ArrayBuffer` or `Blob` as `data`. Paths must be unique, safe relative
`media/…` or `assets/…` paths. Use the exact path and real MIME type in every reference. Writer's generated attachment
paths use `media/`; older `assets/` aliases remain accepted. The container assigns UUID member names, stores ordered
entry source in `entries/`, and keeps public assets in `media/` with alias metadata. Protected members live in
`private/`. Do not construct ZIP members or rewrite the manifest by hand.

`pack({ source, assets, index: 'always' })` includes the public-only SQLite/FTS5 index even for a small demo. The normal
`auto` mode includes it once public writing reaches 256 KiB; `never` omits it. Missing/stale indexes are rebuildable,
not the authoritative writing. Do not pad source to trigger the index. With `secret` protection, all assets and their
catalog are encrypted, including assets used by public entries; `privateEntries` chooses protected entry UUIDs.
Use normal locking APIs/Writer for recovery and passkeys. A `privacy:` field or hidden block is not encryption.

When changing an existing archive, preserve all assets, entry identities, metadata and protection with its opened
state and `previous`; unlock it fully before rewriting. Do not serialize a partial locked document as a new public file.
Current bounds include 32 MiB per attachment and 64 MiB for the archive and expanded contents. Check the canonical
`LIMITS` for the operation rather than assuming arbitrary media fits.

## Images, recordings and files

```jot
![Tea beside a rain-streaked window](media/window.png)

![Rain recording, recorded by the writer](media/rain.wav)

![A short view of the garden](media/garden.webm)

[Reference PDF](media/reading.pdf)
[EPUB to open in a reading app](media/reading.epub)
[Original scan](media/original.tiff)
```

| Bytes and MIME type | Current behavior |
| --- | --- |
| PNG, JPEG, WebP, GIF, AVIF (`image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/avif`) | Inline local raster image. Meaningful alt text is its accessible description. Browser decoding still needs to succeed. |
| MP3/MPEG, MP4/AAC, Ogg/Opus/WebM, WAV, FLAC audio with an accepted `audio/…` type | Image syntax creates an inline audio player with controls. Nothing autoplays or loops. |
| MP4, WebM, Ogg, QuickTime video with an accepted `video/…` type | Image syntax creates an inline video player with controls. Codec support depends on the browser/device. |
| PDF | Keep a named attachment link. Writer offers its separate local PDF viewer when the browser has one; download remains available. |
| EPUB, text, unknown files | Named attachment/download links; preserving bytes does not promise an inline reader. |
| SVG, HEIC/HEIF, TIFF, BMP and other unsupported image MIME types | Preserve originals as attachments; image syntax has an unsupported-image notice. Add an authorized PNG/JPEG derivative when useful. |

An ordinary `[label](media/file)` is an attachment link even for audio/video; it does not request an inline player.
An `attachment` record records provenance/descriptions but does not itself inline the file. Remote image syntax does
not fetch artwork in Writer. Provider references are links, not recordings. Use actual authorized bytes for offline
attachments, with stable local paths; signed/temporary URLs, covers, caches and pending imports are not complete media.
For synthetic demo sound/video, say it is synthetic; do not describe it as a real microphone or camera capture.

Adjacent image-only references make a picture grid. A `moodboard` record uses repeatable `image:`/`asset:` fields,
then `alt:`, `caption:` and `credit:` fields for each image, plus named `color:` swatches. A `palette` record has
repeatable `color: #RRGGBB name` fields. Names, descriptions and credits must carry meaning without color alone.

## Media references and Writer's Media view

Use a named link with the verified/supplied identity and the writer's activity words immediately before it:

```jot
Watched [The Matrix](imdb:tt0133093).
Reading [A book title](https://openlibrary.org/works/OL123W).
Listened to [An album title](spotify:album:0123456789ABCDEFGHIJKL).
Want to play [A game title](https://www.wikidata.org/wiki/Q123).
```

Except for the known film identity, the IDs above illustrate grammar only; replace them with identities verified from
the supplied material or an explicitly authorized lookup. Never invent a catalog identity from a title. Short forms
and identifier rules are in the cheat sheet. Ordinary HTTPS catalog URLs also support TVmaze shows/episodes, Open
Library works, AniList anime/manga, Apple Podcasts, Wikidata games/films, Spotify and MusicBrainz. Preserve edition,
episode, year and creator distinctions when the source supplies them.

Writer's read-only Media view gathers references in dated prose, lists, tasks, quotes, headings and tables, excluding
scratchpads, code, hidden comments and records. It fetches nothing. `Want to watch/read/play/listen to`,
`Watching/Reading/Playing/Listening to`, and `Watched/Read/Finished/Played/Listened to/Rewatched` give explicit activity.
A bare mention stays **Mentioned**; never infer completion from a link. Download media journal creates a separate `.jot`.

Add media searches the current journal first. Its optional keyless online catalogs and the separate MusicBrainz lookup
start off; send only the dedicated title/query when explicitly enabled. Selection must be reviewed before Insert.
Listening capture, a Spotify player, account integrations and microphone tools are separate opt-in Writer actions,
not capabilities activated by a saved link. No journal example should start them or carry account tokens.

## Cards and 3D models

```jot
:::record card #leaf-question
label: Garden notes
front: Which leaf did I bring home?
back: A small yellow maple leaf.
:::

:::record model #garden-model
label: My clay garden
file: media/garden.glb A clay garden with a low wall and three seedlings
poster: media/garden-poster.png A still view of the same garden model
camera: 2, 1.5, 3
target: 0, 0.4, 0
lighting: soft
background: #f4efe4
hotspot: 0.3, 0.9, 0.2 The first seedling
caption: A model of the garden described above.
credit: Original fictional demo model
:::
```

A card requires nonempty `front:` and `back:`. The answer waits behind a tap; printing gives a fold-over card.
A model requires `file:` pointing to bundled glTF bytes (`model/gltf-binary` for `.glb`, `model/gltf+json` for embedded
`.gltf`). Make the model self-contained: the viewer refuses outside URLs. `poster:` is an optional raster fallback,
not a replacement for model bytes. Camera/target/hotspot coordinates are three finite numbers; a hotspot adds a
plain label. Lighting is `soft`, `studio` or `dim`; an optional named `animation:` plays only on request.

Draco, meshopt and KTX2 compression are supported through Jot's bundled viewer/decoders; do not strip those extensions
or claim support for every glTF extension. Test actual bytes. The viewer loads only on **Turn in 3D**, with no code
supplied by the journal. Use these supported data records instead of scripts, arbitrary HTML or executable widgets.

## Editable handwriting and local excerpts

Writer's annotation feature saves a frozen background image, a composite PNG and a `.jot-ink.json` stroke file. To
reopen a drawing, retain all three. The JSON has `format: "jot-ink"`, `version: 1`, normalized coordinates, physical
page width/height, a safe local `background` path and validated pen/eraser strokes with points/pressure. Source needs
two separate nodes, with matching stems:

```jot
![Annotated window sketch](media/window-ink.png)

[Editable strokes](media/window-ink.jot-ink.json)
```

The composite remains readable without a stroke renderer. A stroke file without its frozen background is an older
attachment, not a fully editable annotation. Prefer Writer's annotation tool; verify editing/reopening before claiming
an authored fixture is editable. Do not silently flatten or drop strokes from existing journals.

`![Local excerpt](media/clippings.jot#record-id)` alone on a line includes a host-lent bundled `.jot` excerpt. An
ordinary link downloads the file. Includes are local, bounded and loop-checked; a path does not authorize opening
other files. People/Places reference books are separately chosen Writer context, not automatically attached data.

## Saved day scenes

Scenes is a separate Writer view. A kept scene is validated `application/vnd.jot.place+json` data, referenced directly
under its dated heading:

```jot
### 2026-10-01 | A rainy kitchen
@setting: media/scene-2026-10-01.json

Rain ran down the kitchen window. My blue mug of tea waited on the wooden table.
```

`site/dist/scene-journal-core.mjs` is the shared authoring contract; the downloadable skill carries the same helper at
`runtime/site/dist/scene-journal-core.mjs` with its local parser dependencies:

1. Read `journalDays(source)` to get each entry's actual prose `sentences`. Scratchpads, code, comments and records
   are excluded. Keep final source fixed before building sentence references.
2. Create plain place data using `PLACE_SCHEMA`: short title, hex sky/ground colors, allowed weather/time, camera,
   and objects made from supported shapes. Base objects, weather and time on the entry's words. Do not generate code.
3. Give each object's `moments` the **one-based sentence numbers** it depicts. `validatePlace(raw, day.sentences)`
   converts them to the entry's exact sentence strings. Do not paraphrase or fabricate quoted moments.
4. Save `placeFile(place, { model, at })` as an attachment and set its `@setting:` using `settingEdit`. Use an honest
   provenance label such as `Source-authored fictional demo` for locally authored scenes, not a live-model claim.
5. Reopen the final archive and use `readPlaceFile(json, day)` to confirm that every saved moment still occurs in the
   entry (`missing` must be false). Inspect the rendered scene and its clickable things in Writer with networking off.

Keep `@setting:` paths under `media/` and preserve scenes when editing/saving. Later edits may make a quoted moment
stale; Writer marks that rather than changing the writing. A saved scene needs no model to reopen. **Make this day's
scene** is a separate explicit model action: Writer previews that day's sentences and destination first, shows a draft,
and changes source/assets only on **Keep it**. A request to author local demo scenes does not authorize uploading
someone's journal or pretending a service generated them.

## Export and verification scope

Open the saved `.jotz` in Writer and check the specific image, card, recording, model/hotspots, annotation, local
include and Scenes features used. Test again with networking disabled after the local reader resources are available.
Run strict source and archive validation, but do not call parser success proof of rendering, playable codecs,
attachment completeness, all method profiles or scene grounding. Report those checks separately.

Download page makes standalone HTML with local images/fonts/recordings embedded, chart snapshots and model stills.
Page view/Print shows cards and recordings in their print forms. EPUB export creates a fixed-layout book with assets
and Jot's own viewer scripts on model pages; interactive 3D depends on the reading system's script support. These
exports do not imply that the separate Scenes view is exported as an interactive 3D book. Keep the `.jotz` as the
editable original. Real reading systems, physical microphones/styli and live provider/model quality require their
own checks; do not claim them from a fictional fixture or mocked browser suite.
