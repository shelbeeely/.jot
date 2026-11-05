# Jot syntax cheat sheet

The full rules: `docs/guide/writing-jot.md` (readable) and `specification/Jot-Complete-Specification.md` (normative).
For current media, packaging, cards, annotations, 3D models and scenes, read `reference/media.md`; the latest
`DECISIONS.md` and runnable parser/Writer take precedence over older guide descriptions.

## Document

```
---
Jot: 1.0
Title: October notebook
Author: (only if the source names one)
Source: notes.txt
---

# October 2026

### 2026-10-25 | Sunday

Writing, as paragraphs.
```

- Metadata is optional, only at the very top, `Key: value` per line (not YAML).
- A heading of any level that starts with `YYYY-MM-DD` is a dated entry. Text after `|` is free (weekday, place, the original
  date as written). The same date may appear twice.
- An entry runs until the next dated heading; other headings do not end it. Undated material therefore goes before the
  first dated entry.
- An impossible date (`2026-02-30`) is an `invalid-date` warning: fix the transcription, never guess.

## Line marks (at the start of a line, then a space and words)

| Mark | Meaning |
| --- | --- |
| `[ ]` `[x]` `[>]` `[<]` `[-]` `[!]` | task: open, done, moved, scheduled, cancelled, important |
| `o 16:00 Dentist`, `o 4pm Dentist` | event (time read only when unambiguous: `19:00`, `7pm`; "at 7" is all day) |
| `? text` | question to come back to |
| `! text` | idea |
| `.0830 - KITCHEN` | time label / scene |
| `[[ text ]]` (own line) | margin note |
| `/*` … `*/` (own lines) | hidden lines (not shown, still in the file: not secret) |
| `===` (own line, after a blank line) | page break |
| two-space indent under an item | continues the item above |

Inline: `#tag`, `@context`, `==highlight==`, `++underline++`, `x^2^`, `[^note]` footnotes, `-> centred <-`,
`> [!NOTE]` callouts, and all ordinary Markdown (bold, italic, lists, tables, quotes, links with `https:`).

## Records

```
:::record measurement #sleep-2026-10-26
metric: sleep
unit: h
value: 7.5
source: sleep.csv
:::
```

- `:::record <type> [#id]`, one `lowercase-name: value` per line, closed by `:::`. A missing `:::` is an error.
- Ids are optional; when used they must be unique in the file (a duplicate is an error).
- Empty value = not filled in. Never write `0` for missing.
- Multi-line value: `body: |` then lines indented by two spaces.
- Common types: `measurement` (metric/unit/value, optional `scale: #scale-id`), `observation` (any named fields),
  `reflection` (`body:`), `attachment` (`path`, `media-type`, `alt`), `chart` (`metrics: sleep, steps`).
- Reserved fields any record may use: `method`, `privacy`, `author`, `created`, `modified`, `date`, `at`, `start`, `end`,
  `body`, `source`, `relation`, `label`.
- A method profile is chosen with `method: <id>@1` (ids in `specification/profiles.json`, or bundled `reference/profiles.json`). Check required fields manually: the parser is not a full profile validator.
- A `privacy:` field is a note, not encryption. Unknown fields/record data are preserved rather than automatically executed.

## Scratchpads and entry appearance

`~~~draft` fences hold literal scratchpad notes, saved in the journal but left off formatted pages, print and page
exports. Hidden comments and scratchpads are not encrypted. Writer can edit a scratchpad or explicitly add its words
to the entry. `[[margin note]]` annotates without replacing prose.

`@hand: script07` and `@ink: #26372d` under a date set handwriting appearance; use the canonical supported hand/ink
values and Writer's per-entry tools rather than inventing fonts or CSS. Appearance directives persist until changed;
restore the prior values at the next entry when a change is meant for only one entry.

## Escaping

A backslash before the first character stops a line being read as structure. Escape a source line that starts with any of:

`[ ] [x] [>] [<] [-] [!]` + space, `o ` `? ` `! ` `= `, `#`, `>`, `:::`, `===`, `---` (whole line), `___`, `/*`, `*/`,
`.` followed by a non-space (`.5 mg`), `- ` `* ` `+ ` (when not meant as a list), `[[`, `|` (when not a table), `` ``` ``,
`~~~`, `<`.

A leading number with `.` or `)` and a space is a numbered list: `1660. The year` becomes `1660\. The year`.
Drop leading indentation from prose: four spaces makes a code block.

## Files

- `.jot`: independently usable UTF-8 source. Never binary or base64.
- `.jotz`: the primary saved journal, including text-only writing. ZIP with `manifest.json`, ordered `entries/…`, UUID
  `media/…` public assets or encrypted `private/…` members, catalog metadata and an optional public-only `index.sqlite`.
  The retired `journal.txt` layout is not supported. Use Writer or `pack({ source, assets })` from
  `parser/container.mjs`; never hand-build the ZIP. `node cli/jot.mjs check --strict` reads source and archives.
- `assets` entries passed to `pack` need `{ path, mediaType, data }`, with optional `id`/`name`. Use safe, unique local
  `media/…` or accepted older `assets/…` aliases and real bytes. `index: 'always'` includes the public index for small
  demos; the normal `auto` threshold is 256 KiB of public writing. Metadata or attachment records do not add files.
- A protected archive encrypts all media/catalog data, including shared media used by public entries; choose protected
  entries through the supported container/Writer APIs. Preserve protection and unknown attachments on edits.

## Inline media and interactive blocks

```jot
![Window sketch](media/window.png)

![Rain recording](media/rain.wav)

![Garden video](media/garden.webm)

[Original PDF](media/reading.pdf)
[EPUB attachment](media/reading.epub)

:::record card #leaf-card
front: What leaf did I find?
back: A yellow maple leaf.
:::

:::record model #garden-model
file: media/garden.glb A model of the garden
poster: media/garden.png A still of the same garden
hotspot: 0.3, 0.9, 0.2 First seedling
:::
```

Image syntax shows supported local PNG/JPEG/WebP/GIF/AVIF images and controls for supported local audio/video bytes.
Nothing autoplays or loops. Ordinary links remain attachments/downloads; PDF viewing is a separate Writer/browser
capability, and EPUB attachment does not mean an inline EPUB reader. Unsupported image types stay attachments.
Cards need both `front:` and `back:`; models need a bundled self-contained glTF file with an appropriate model MIME
type. Draco, meshopt and KTX2 are supported through Jot's own decoders. No journal code or outside model URLs run.

Editable annotations need a composite PNG, linked `.jot-ink.json` strokes and the frozen background referenced by
that JSON. `![Excerpt](media/clippings.jot#record-id)` alone includes an explicitly bundled/lent local `.jot` excerpt.

Saved scenes use `@setting: media/scene.json` directly under a date, with a bundled
`application/vnd.jot.place+json` file. Use `journalDays`, `validatePlace`, `placeFile` and `readPlaceFile` from
`site/dist/scene-journal-core.mjs`: scene objects depict the entry, and moments are exact sentences from it. Read the
media reference before creating one; do not substitute an arbitrary GLB, generated prose or scripts for a scene.

## Catalog references and the Media view

An entry may list multiple songs, albums or playlists. Use `spotify:album:ID` or `spotify: playlist:ID` with a real 22-character
Spotify ID, or `[My mix](spotify:playlist:ID)` for a label. Types: track, album, playlist, artist, episode, show. Replace ID with
the actual ID supplied by the user; do not invent one. These render as links and never automatically fetch/play or attach audio.

For background films/TV/episodes, use `imdb:tt0133093`; for videos, `youtube:dQw4w9WgXcQ` or `youtube:playlist:PLAYLIST_ID`.
Use IDs actually supplied by the user, with optional names such as `[Film](imdb:tt0133093)`. IMDb title IDs have 7–10 digits after
tt; YouTube video IDs have 11 letters/digits/underscore/hyphen, playlist IDs 10–100. Reading these links never loads media.

Music identities can use `musicbrainz:recording:UUID`, `musicbrainz:release-group:UUID`, `musicbrainz:release:UUID`,
`musicbrainz:work:UUID` or `musicbrainz:artist:UUID`. Use a supplied/verified canonical UUID; never invent one or substitute a
composition, recording and album edition. The workspace offers opt-in MusicBrainz search, with explicit choice of result.

Writer's Media view also recognizes named catalog links for TVmaze shows/episodes, Open Library works, AniList
anime/manga, Apple Podcasts and Wikidata games/films. Write the author's supplied `Watched`, `Reading`, `Finished`,
`Want to play` or other supported activity immediately before the link to show that activity. A bare mention remains
Mentioned. The view reads dated prose, not scratchpads, code, comments or records; it fetches nothing. Add media's
online title lookup is off until explicitly enabled and never sends journal writing. A catalog link is not bundled
audio/video, a cover image or an instruction to load a player.

## Timezone and period scope

Document metadata `Timezone: America/Los_Angeles` is the default. `@timezone: Europe/London` inside an entry overrides it until
the next dated heading. Use a real IANA name or UTC; never invent a zone or infer it from a place mention. Explicit-offset RFC 3339
instants retain their meaning. DST repeated/nonexistent hours require an explicit offset for timed calendar export. Weekly/monthly
recaps may be dated entries with a `period` record (`start` inclusive, `end` exclusive); this does not change original daily entries.
