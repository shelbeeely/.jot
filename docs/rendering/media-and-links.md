# Media, attachments and links

Jot's current renderer shows **local attached images and ordinary links**. A Spotify, IMDb, YouTube or MusicBrainz
reference becomes a link, not an automatically loaded player, poster or metadata card. Audio, video, PDFs and other
files can travel in a `.jotz`, but the shared page preview exposes their explicit attachment links as downloads.

Writer also has separate offline attachment viewers; see [site documentation](../../site/README.md). The shared preview described here does not supply those viewers.

This is a developer reference checked against the repository on 3 November 2026. **Current** describes the JavaScript
parser, shared preview and Writer. **Reader design** describes a proposed touch/button application; those actions are
not shipped X4 firmware. The [e-paper pipeline](epaper.md) and [navigation reference](navigation.md) cover the surrounding
rendering and reading model. This document adds no syntax or integration to the runnable tutorial.

## Source, bytes, rendering and actions are separate

```text
Writing: a label, an image reference, a link, a record or an include
Package: manifest.json + ordered entries/ + media/ or private/ members + public index.sqlite
Preview: DOM text, supported images, charts, palettes and local excerpts
Action: follow a link, download an attachment, or invoke an explicitly supplied host callback
```

`readDocument()` verifies and returns the source and package assets; `parse()` parses text. Neither fetches a link,
looks up a movie, plays a recording or transcribes handwriting. The manifest describes each asset's path, MIME type,
size and SHA-256. These are integrity/transport data, not an instruction to launch a viewer. Unknown attachment bytes
remain useful even when this renderer cannot display them. [Container implementation](../../parser/container.mjs#L19)

The shared preview receives an `asset(path)` callback. Writer returns only assets already attached to the document,
using Blob URLs; it does not turn arbitrary image URLs into fetches. `include(path)` separately lends local `.jot`
source text. A host must keep these resolvers restricted to the files it intentionally opened. The preview trusts the
URLs returned by `asset()`; its ordinary-link scheme checks do not sanitize a permissive or malicious asset resolver.
[Preview options](../../parser/preview.mjs#L14), [Writer asset URLs](../../site/dist/studio.mjs#L133)

## What appears for each media type

| Source or attachment | Current shared preview / Writer | Reader design for e-paper |
| --- | --- | --- |
| PNG, JPEG, WebP, GIF, AVIF image with an accepted MIME type | A local `<img>` when referenced with image syntax; browser decoding still has to succeed | Fit an intact image, retain its description, and provide an explicit image/detail view |
| Animated GIF or animated content in another accepted image format | Ordinary browser image behavior; the renderer does not choose or freeze a frame | Choose and label a deterministic static frame on the host. Continuous animation needs a separate capability and refresh policy |
| SVG, HEIC/HEIF, BMP, TIFF or another image MIME type outside the accepted set | Image syntax produces a visible image notice, even if a particular browser happens to decode that format. A normal attachment link can still download the original | Show name/type/size and an unsupported-preview explanation; optionally prepare a reviewed PNG/JPEG derivative on the host |
| Scan or composed handwriting PNG/JPEG | The same attached-image path as any other accepted raster | Fit/zoom/pan or paginate an intentionally prepared image; retain the original |
| Editable `.jot-ink.json` | A linked attachment; the general renderer does not reconstruct strokes. Writer's separate annotation tool understands its own saved background/strokes | Show the composed snapshot unless a compatible stroke renderer/editor has actually been implemented |
| Audio, including a voice-practice clip | An explicit attachment link is a download. No `<audio>` player is created by the page renderer | Show attachment information; expose playback only on a verified runtime with an implemented decoder/output path |
| Video | An explicit attachment link is a download. No `<video>` player or thumbnail is created | Show information and an optional host-prepared poster image; playback or handoff is a separate implemented action |
| PDF | An explicit attachment link is a download. No PDF viewer or page rasterizer is installed in the shared preview | Offer information; an implemented viewer or host-generated page images can be an explicit option |
| Other files, including archives and unknown types | Download link when the host lends the asset; attachment shelf also lists and downloads attached files | Information and an explicitly supported open/export action; never execute the payload because it is attached |
| Remote artwork, poster, thumbnail or album-cover URL | A normal URL is a link. Remote image syntax is a notice in the built-in host, not an automatic artwork fetch | Keep a link or explicitly import an authorized local derivative; record its description/credit |
| Provider short reference or external HTTPS link | A named ordinary link; no provider metadata request just to render it | A readable label and URL/action-information view; optional explicit browser/companion handoff when implemented |

The exact raster allowlist is **`image/png`, `image/jpeg`, `image/webp`, `image/gif`, `image/avif`**. The current check is
an exact MIME-string membership test, not an extension test. A `.png` declared as `application/octet-stream` is not
accepted as an inline raster. Unsupported/absent assets get a text notice; an accepted but corrupt or undecodable
image can still fail in the browser. A capture host must await `decode()` and report that failure rather than treating
an empty or broken image as complete. [MIME gate and fallback](../../parser/preview.mjs#L81),
[image creation](../../parser/preview.mjs#L170)

The trusted SVG task boxes generated by Jot's own handwriting renderer are different from arbitrary attached SVG
files. Their presence does not mean that SVG attachments are accepted.

The current X4 tutorial captures a browser image at a moment in time. It does **not** guarantee a GIF's first frame or
any other specific animation frame. Preparing a chosen static frame, poster, transcoded image or PDF page is a host
policy and additional implementation, not a feature supplied by `.jotz` packaging.

## Image and attachment syntax

These examples describe references; the named files must actually exist in the opened package.

```jot
![Window sketch](assets/window.png)

[Download the original scan](assets/window-original.tiff)
[Voice practice clip](assets/practice.m4a)
[Video](assets/session.mp4)
[Reference PDF](assets/reference.pdf)

[![Album artwork](assets/cover.jpg)](https://example.org/album)
```

The exclamation mark asks for an image. An ordinary Markdown link asks for a link action. The last example wraps a
local picture in an external link; the picture does not fetch its destination. A standalone image has no built-in
click-to-zoom handler in `renderPreview()`. An image wrapped in an attachment link downloads that attachment in the
current host. A future reader may instead expose an explicit image viewer, but that must be implemented.

Alt text becomes the image's accessible description. It is not necessarily a visible caption. A single image's
Markdown title is not promoted to a caption by `picture()`; use a moodboard's explicit `caption:` when that distinction
matters. Paths are matched against the caller's assets as written. Do not assume that query strings, fragments or an
included file's folder will automatically be stripped or rebased for an image. Writer creates safe `assets/` paths
when attaching files. [Link/image rendering](../../parser/preview.mjs#L118),
[attachment insertion](../../site/dist/studio.mjs#L136)

If the file is missing, image syntax shows a notice containing the description/path and `not attached`. A non-image
attachment referenced as an image produces an image notice rather than a player or file viewer. An unresolved ordinary
attachment link is less informative: it can become non-clickable label text, so a reader's attachment view should
identify the missing target explicitly.

A plain `.jot` carries writing, not binary files. `assets/photo.png` in that source does not make a browser search the
computer for a photo. A host may explicitly open and lend companion files; the provided package-only tutorial does not.

### Several pictures, moodboards and palettes

A paragraph containing two or more images and only whitespace/line breaks between them becomes a picture grid. Its
image titles can become captions. A `moodboard` record provides explicit descriptions, captions, credits and swatches:

```jot
:::record moodboard #window-board
label: Window study
image: assets/window.png A pencil sketch beside the window
caption: Test the spacing between the frame and the page edge.
credit: Original invented example
asset: assets/paper.jpg Paper texture
alt: Close view of the paper surface
caption: Keep the texture subtle.
color: #2E3A46 slate night (text)
color: #E9E2D3 paper (background)
:::

:::record palette #page-colors
label: Page colors
color: #234 deep slate
color: #E9E2D3 paper
:::
```

Each `image:` or `asset:` starts a picture; following `alt:`, `caption:` and `credit:` describe the preceding picture.
The path is its first whitespace-delimited token. The shared renderer uses the same local asset/MIME rules here.
Other fields remain text. A palette accepts `#RGB` or `#RRGGBB` followed by an optional name, shows the name and hex,
and chooses black/white label ink for contrast. Invalid colors remain visible as notices. This creates no remote image
search, generated artwork or background media retrieval. [Moodboard field interpretation](../../parser/palette.mjs#L64),
[palette parsing](../../parser/palette.mjs#L22), [grid and swatches](../../parser/preview.mjs#L175)

On monochrome output, preserve names, hex values, roles, alt text, captions and credits. Two different colors can map
to the same gray or bit value; the resulting swatches cannot carry those distinctions alone. This follows
`docs/methods/moodboard-and-palette.md, line 214`, which requires descriptions and names, and line 270, which rejects
color-only legends. It is a design basis, not a measured benefit of the e-paper adapter.

## Provider references: exact supported forms

The following grammar placeholders stand for identifiers, not literal strings to paste. Prefixes/types are lowercase.
The examples below use syntactically valid identifiers without making a live provider identity or availability claim.

| Provider | Short forms recognized by `mediaURL()` | Identifier / result |
| --- | --- | --- |
| Spotify | `spotify:track:ID`, `spotify:album:ID`, `spotify:playlist:ID`, `spotify:artist:ID`, `spotify:episode:ID`, `spotify:show:ID` | Exactly 22 ASCII letters/digits; resolves to `https://open.spotify.com/<type>/<id>` |
| IMDb | `imdb:tt1234567` | `tt` plus 7–10 digits; resolves to `https://www.imdb.com/title/<id>/` |
| YouTube video | `youtube:AbCdEfGhI_1` or `youtube:video:AbCdEfGhI_1` | Exactly 11 letters/digits/underscore/dash; resolves to `https://www.youtube.com/watch?v=<id>` |
| YouTube playlist | `youtube:playlist:PLAYLIST_ID` | 10–100 letters/digits/underscore/dash; resolves to `https://www.youtube.com/playlist?list=<id>` |
| MusicBrainz | `musicbrainz:recording:UUID`, `musicbrainz:release:UUID`, `musicbrainz:release-group:UUID`, `musicbrainz:work:UUID`, `musicbrainz:artist:UUID` | A hyphenated UUID-shaped hex identifier; resolves to `https://musicbrainz.org/<type>/<id>` with lowercase hex |

Bare supported references become links with generic labels such as “Spotify album” or “YouTube video”. Supply a
Markdown label when you want the writer's own title:

```jot
[An album I want to remember](spotify:album:0123456789ABCDEFGHIJKL)
[A film reference](imdb:tt1234567)
[A video reference](youtube:video:AbCdEfGhI_1)
[A work reference](musicbrainz:work:00000000-0000-4000-8000-000000000000)

[Timed clip](https://www.youtube.com/watch?v=AbCdEfGhI_1&t=30)
[Channel or another unsupported short-reference type](https://example.org/media)
```

Horizontal space after a provider prefix is accepted by the bare-reference tokenizer and `mediaURL()`; use compact
forms inside Markdown destinations. Unsupported types, malformed IDs, code and escapes are not invented provider
links. Regular HTTP(S) URLs remain possible even when there is no matching short form. The parser never fetches a
title, duration, cover, poster, rating or availability just to recognize these references.
[Provider resolution and tokenizers](../../parser/jot.mjs#L51)

The listening tool's `musicReferences()` has an additional input convenience: one line per `label | reference`, or a
reference alone. It can shorten recognized Spotify/IMDb share URLs and simple YouTube video/playlist URLs into the
forms above. Meaningful YouTube timestamp or video-plus-playlist options stay URLs; do not discard them when
implementing a native adapter. That helper writes reviewed Markdown. Core parsing still preserves the original source.
[Reference-list normalization](../../site/dist/jot/music.mjs#L23)

## Current online and recording integrations

See the [integration catalogue](integrations.md#implemented-music-and-media-behavior) for lookup, listening capture, player and microphone behavior. Rendering an existing reference is separate from those actions.

## Internal, external and cross-document links

| Written form | Current resolution and activation |
| --- | --- |
| `[Entry](#2026-11-03)` | Link to the parser's resolved dated heading in this preview. Repeated dates target the first heading and produce an ambiguity warning |
| `[Record](#window-board)` | Link to a unique record ID. A record ID takes precedence if it has the same spelling as a date target |
| `[Heading](#ordinary-heading)` | Ordinary Markdown heading slugs are not Jot targets; absent a matching record/date, this is unresolved |
| `[Other](other.jot#record-id)` | Parser preserves a cross-file reference. The shared preview can call `reference(href)` for a simple basename `.jot` plus a supported fragment; the host decides what it can open |
| `[Nested](assets/other.jot#record-id)` or `[Package](other.jotz#record-id)` | The parser can retain these in `ast.links`; this is broader than the shared preview's narrow basename-only `.jot` callback rule. Do not promise clickable navigation from parser recognition alone |
| `[Source file](assets/other.jot)` | A download if `asset()` supplies that exact attachment. It does not display the file inline |
| `![Excerpt](assets/other.jot#record-id)` alone | A local include: display the host-lent excerpt in place, not a normal link action |
| `[Website](https://example.org/path)` / an HTTP(S) autolink | An ordinary external anchor with a new-tab target and `noopener noreferrer`; no request simply to render it |
| A `mailto:` link | An ordinary anchor offered to the browser/OS mail handler; no mail is sent by rendering it |
| Missing attachment link or unsupported scheme | Usually plain label text, not an active link; missing internal targets get a dotted unresolved marker |

For unique record IDs and date resolution, use `ast.links`, its `to` target and `ast.diagnostics`. Duplicate record IDs
are unresolved; repeated dates select the first and warn. Resolved same-document references generate “Linked from”
backlinks where the source/entry can be identified. Links to definitions that are intentionally not drawn, such as
scale records, can remain non-clickable text rather than jumping to an invisible target.
[AST link resolution](../../parser/jot.mjs#L218), [preview anchors/backlinks](../../parser/preview.mjs#L274)

Record fields are not a general Markdown renderer. The link-aware fields are `relation`, `member`, `source`, `parent`,
`migrated-to` and `prompt`, and the ordinary record preview only turns the applicable resolved same-document field
reference into a link. An arbitrary `url:`, `recording:` or `source: https://…` value does not automatically become a
player or clickable web card. Put an explicit Markdown link in prose when you need that action.
[Field recognition](../../parser/jot.mjs#L222), [record display](../../parser/preview.mjs#L392)

### People and Places books

Writer supplies the `reference(href)` hook to its separate reference-book tool. A link such as `[Sam](people.jot#sam)`
opens an already chosen book/record or asks the writer to open that book; it does not fetch a file from disk or a network.
The book data stays separate from the journal and is not automatically attached by inserting the link. A place's map
URL is another explicit action, constructed from validated supplied coordinates, not automatic geocoding or location
tracking. A native reader needs its own explicit book-opening flow before promising the same action.
[Reference-book activation](../../site/dist/reference-books-ui.mjs#L145),
[qualified targets and map URL](../../site/dist/reference-books.mjs#L76)

### Includes are view composition

An include paragraph consists only of `.jot` image-style references. A relative include path is resolved against `from`
and kept within the host's chosen root. Schemes, absolute paths, backslashes and climbs above that root are refused;
`..` within the allowed root is not categorically forbidden. Includes support a record fragment, a date
or the whole file. A date excerpt includes **every** matching dated entry, unlike a date link's first-target rule.
The excerpt helper returns the first matching record directly; it is not the same ambiguity-resolving link routine.
A reader should consult source diagnostics rather than treating a valid include path as proof of a unique record ID.

The include system stops at three nested levels and reports loops/missing files/fragments. `gather()` additionally
bounds reading to 64 files and 1 MiB per included source. `renderPreview()` expects a synchronous string-or-null
callback; it does not itself enforce all of `gather()`'s byte/file limits. A host must apply them when lending text.
`.jotz` is not an inline include format here. Mixed photo/include paragraphs should not be used as a substitute for
standalone include paragraphs. Included images still use their written asset path; the renderer does not automatically
rebase it to the included file's folder. [Include rules](../../parser/include.mjs#L18),
[renderer include callback](../../parser/preview.mjs#L306)

The included frame names its source. `{{document.filename}}` inside it uses the included `.jot` basename; the outer
page uses the host-supplied filename. Showing an excerpt leaves the stored include line intact. Flattening into a new
source copy is a separate explicit operation.

Frame-local footnote IDs do not provide a complete subdocument link namespace. The current preview's ordinary-link
resolution closes over the outer document's anchors; included record/date links and backlinks therefore need a
separate adapter review. A native reader should resolve links against their owning source and preserve return context,
rather than assuming every included target already works as a scoped browser anchor.

### Footnotes and disabled/unsafe destinations

`[^note]` and `[^note]: explanation` render as numbered note anchors and a notes section. Numbering follows first
mention; unreferenced definitions follow afterward. Footnotes in included content get a separate frame-local prefix.
A reference with no definition can still produce an anchor with no matching note; the shown renderer path does not
supply a universal broken-footnote diagnostic or automatic repair. A reader should keep that limitation visible.
[Footnote rendering](../../parser/preview.mjs#L160), [notes section](../../parser/preview.mjs#L409)

The ordinary-link branch accepts `http:`, `https:` and `mailto:` after checking exact supplied assets, same-document
targets and the reference hook. It does not activate ordinary `javascript:`, `data:`, `file:`, `ftp:`, protocol-relative
or arbitrary app-scheme destinations. Raw HTML, including `<audio>`, `<video>`, `<iframe>` and custom `<a>` tags,
is preserved as source data and omitted from the preview; it is not an alternate embed API. The preview's ordinary
URL branch is a scheme gate, not the listening tool's stricter HTTPS/no-login-details validator or a guarantee that a
URL is well-formed, reachable or safe to trust. [Exact link branch](../../parser/preview.mjs#L118),
[HTML omission](../../parser/preview.mjs#L249), [listening URL validator](../../site/dist/jot/music.mjs#L6)

## Handwriting, annotations and exports

Writer's annotation tool saves three related assets: a frozen background PNG, a composed PNG, and `.jot-ink.json`
containing normalized strokes plus a background asset reference. Source links display the composed PNG and expose
the editable strokes as an attachment. Pen/eraser tools, widths, colors and points belong to that structured asset;
they are not ordinary Jot prose. The general preview does not reapply them or run OCR. The annotation editor validates
its supported format and background before editing a copy. Other older stroke files may be retained as attachments
without being editable through this particular tool.
[Annotation assets/source insertion](../../site/dist/annotation.mjs#L56),
[ink validation/drawing](../../site/dist/ink.mjs#L1)

| Output | What happens to media and actions |
| --- | --- |
| Plain writing / Markdown export | Keeps source references and labels, not binary attachment bytes |
| `.jotz` package export | Keeps the source and supplied assets, including currently unused attachments; unused does not mean excluded |
| Standalone HTML via `exportHTML()` | Clones the rendered page, embeds Blob image bytes **and linked attachment bytes** as data URLs, embeds used registered fonts, and replaces chart canvases with PNGs |
| Printed PDF | Captures the print presentation; selectable text and links can survive depending on the browser/export path. It is not a packaged media player or a guaranteed accessible/tagged document |
| Browser raster / native `.bin` | Pixels only. A raw frame has no URLs, semantic targets, alt-text channel, attachment bytes or playback controls unless a separate reader data model accompanies it |

HTML export is not necessarily “images only”: a linked recording or PDF can be embedded in the HTML even though it
has no inline player/viewer. Unreferenced assets outside the cloned page are different; the export routine does not
iterate the entire package to add them. Animated image bytes are not normalized to a selected frame by HTML export.
External links remain links. Host callback functions are not preserved by `cloneNode()`; a cross-book anchor may remain
a relative `href` without its original handler. Standalone HTML is not an implementation of the book tool, and an
explicit click can ask the browser to navigate that URL.
[HTML export implementation](../../parser/export.mjs#L19)

`exportHTML()` waits for `jotReady`, not every image decoder or host operation. It closes all `<details>` elements.
A chart's closed numbers table and its interactive tooltip therefore do not become a visible raster data view by
default. Expand/reflow intentionally or expose an accessible numbers/details action in the reader. Measurements also
need an inspect/source route when specialized presentation leaves extra fields out. Raster capture cannot preserve a
hidden control simply because it exists in the DOM.

## Touch and button behavior for a proposed reader

Use the [shared navigation mapping](navigation.md#input-mappings). Both inputs reach link information, attachments, image controls and Back. The media-type table above defines which view is available.

## E-paper policies and runtime boundaries

Apply the [reader rules](README.md#reader-rules). Image frames, posters and grayscale conversion need explicit preparation; playback requires a separately implemented player and suitable hardware.

## Verification and limits

The audit consulted the linked local source paths. A Chromium probe checked the exact raster MIME gate, attachment
download links, narrow cross-book hook, unsafe/missing/plain-text link fallbacks, repeated-date includes, omission of
raw audio/video elements, HTML embedding of linked PDF bytes, and absence of automatic remote requests. Existing
parser formatting/link/include/palette and listening-helper tests were also run. Provider responses in those helper
tests are mocked; no live account, media service or physical e-paper playback was verified.
