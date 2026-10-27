# Jot syntax cheat sheet

The full rules: `docs/guide/writing-jot.md` (readable) and `specification/Jot-Complete-Specification.md` (normative).

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
- A method profile is chosen with `method: <id>@1` (ids in `specification/profiles.json`); missing profile fields only warn.

## Escaping

A backslash before the first character stops a line being read as structure. Escape a source line that starts with any of:

`[ ] [x] [>] [<] [-] [!]` + space, `o ` `? ` `! ` `= `, `#`, `>`, `:::`, `===`, `---` (whole line), `___`, `/*`, `*/`,
`.` followed by a non-space (`.5 mg`), `- ` `* ` `+ ` (when not meant as a list), `[[`, `|` (when not a table), `` ``` ``,
`~~~`, `<`.

A leading number with `.` or `)` and a space is a numbered list: `1660. The year` becomes `1660\. The year`.
Drop leading indentation from prose: four spaces makes a code block.

## Files

- `.jot`: plain UTF-8 text. Never binary, never base64.
- `.jotz`: a ZIP with `manifest.json`, `journal.txt` and `assets/…`, for attachments. Make it with the workspace (`/write/`) or
  `pack({ source, assets })` from `parser/container.mjs`; `node cli/jot.mjs check` reads both.
