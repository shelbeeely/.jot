# jot-convert: plain-text diaries to Jot

Turns a diary kept as plain text (a Project Gutenberg download, an old export, your own notes) into `.jot` files: one dated
`### YYYY-MM-DD | …` entry for each day, with the date as it was written kept after the `|`. Nothing of the original text is lost.
Node 20+, no installs.

    node converter/jot-convert.mjs diary.txt > diary.jot
    curl -sL https://www.gutenberg.org/cache/epub/1026/pg1026.txt | node converter/jot-convert.mjs - --year 1888 > nobody.jot
    node converter/jot-convert.mjs pg4200.txt --calendar julian --out-dir pepys/

| Option | What it does |
| --- | --- |
| `-` | read standard input |
| `-o, --out <file>` | write one `.jot` file (default: standard output) |
| `-d, --out-dir <dir>` | write the files into a folder, named from the title; needed when the diary is split |
| `--year <yyyy>` | the starting year, for a diary that never states one (*The Diary of a Nobody*) |
| `--calendar julian` | the dates are Old Style (Pepys, most English diaries before 1752): the entry dates become Gregorian, the original stays after the `\|` |
| `--notes margin\|keep\|drop` | a paragraph that is all `[ … ]` (an editor's note) becomes a margin note `[[ … ]]` (default), stays as text, or is left out |
| `--per auto\|none\|year\|month` | `auto` (default) is one file, split by year (or month) only when it would be over the 1 MiB the Jot tools open |
| `--title`, `--author`, `--source` | metadata; read from a Project Gutenberg header when there is one |
| `--name <stem>` | file name stem (default: the title up to its first comma) |
| `--force` | overwrite files that are already there |
| `-q` | no summary |

The summary on standard error says how many entries were found, between which dates, and whether the weekdays the diary names
(`Lord's day`, `(Sunday)`) agree with the dates. If they fit the Old Style calendar better, it says to try `--calendar julian`.

## What it recognises

At the start of a paragraph (a quote mark or `_italics_` around the date are fine):

- `2026-10-25`, `January 1st, 1888.`, `3 April 1888:`, `Monday, April 3.`, `APRIL 3.—`, `APRIL 8, Sunday.—`, `“_20th Jan._—`,
  `Jan. 1st (Lord’s day).`
- a bare ordinal, `2nd. In the morning…`, once the month is known
- headings: a short all-capitals line with a month or a year (`JANUARY 1659-1660`, `A VISIT TO GREECE IN 1888`), or a centred
  line with a year (`My Paris Diary of 1870`). They set the year and become `##` headings. In `1659-1660` the second year counts.

A date needs an ending (`.`, `—`, `--`, `:` or the end of the line), so `March 18th, 1884, the monument was…` stays text. When
the months go back by more than half a year (December, then January), the year moves on. A date with no year before any year is
known is left as text, and the summary says so.

Everything before the first entry is kept, undated, at the top. Lines that would read as Jot or Markdown marks are escaped with a
backslash, and indentation is dropped (indented text would otherwise become a code block). A Project Gutenberg header and licence
are left out. The metadata at the top records the title, the author, the source and the converter.

## Tested on

| Diary | Gutenberg | Command | Result |
| --- | --- | --- | --- |
| *The Diary of Samuel Pepys* | #4200 | `--calendar julian -d pepys/` | 3,401 entries, 1660-01-11 to 1669-06-10; all 464 named Sundays fit Old Style; 21 files (a year each, 1667 by month) |
| *The Diary of a Nobody* (Grossmith) | #1026 | `--year 1888` | 166 entries, 1888-04-03 to 1889-07-11, one file |
| *My Diaries* part 1 (Blunt) | #79491 | `-d blunt/` | 708 entries, 1888 to 1900, plus the 1870 Paris diary in the appendix |
| *My Diaries* part 2 (Blunt) | #79492 | `-d blunt/` | 1,072 entries, 1901-01-23 to 1914-08-05 |

Every file parses with no problems. A few weekdays still disagree with their dates; those are in the books themselves (*Nobody*'s
November "Sundays" in 1888 fall on Mondays).

## Files

- `convert.mjs`: the converter, pure (no file system), so the web tools can use it later: `convert(text, options)` returns the
  files, statistics and warnings.
- `jot-convert.mjs`: the command line.
- `test.mjs`: `node --test converter/test.mjs`, on the excerpts in `fixtures/` (public domain; see `fixtures/README.md`).

User guide: [Converting an old diary](../docs/guide/converting.md).
