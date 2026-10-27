# Writing in Jot

Jot is a way to keep a journal as plain text. You can write it in any text editor, on a phone, on an e-ink writer like InkDeck, or in
the Jot workspace in your browser. Nothing has to be filled in, and nothing is required except your words.

This guide covers everything you need to write a `.jot` file by hand. It takes about ten minutes to read, and you can stop after the
first section.

## Start with just writing

A `.jot` file can be nothing but sentences. This is a complete journal:

```jot
The rain made the room feel quieter. I wanted to remember that.
```

Everything else in this guide is optional. Add it when it helps, skip it when it doesn't.

## Dates organise your writing

A heading that starts with a date makes an **entry** for that day. Anything after the date, after a `|`, is up to you (a weekday, a
place, a word):

```jot
### 2026-10-25 | Sunday

A slow morning. Tea, then a walk.

### 2026-10-26 | Monday

Back to work. It went better than I expected.
```

- The date is always `YEAR-MONTH-DAY`, like `2026-10-25`.
- Any heading level works (`#`, `##`, `###` …); most people use `###` for days and `#` for the month.
- One file can hold one day, a month, or years. A file is not a day: the dates inside it are what count.
- The same date can appear twice (a morning and an evening entry); both are kept.

## Quick marks at the start of a line

Start a line with one of these and a space:

| Write | It means |
| --- | --- |
| `[ ] Call the pharmacy` | a task to do |
| `[x] Call the pharmacy` | done |
| `[>] Call the pharmacy` | moved to another day |
| `[<] Call the pharmacy` | scheduled for later |
| `[-] Call the pharmacy` | not doing it after all (cancelled) |
| `[!] Call the pharmacy` | important (an open task, marked high priority) |
| `o 4:00p Dentist` | an event |
| `? Why am I so tired on Mondays` | a question to come back to |
| `! A shelf by the door for keys` | an idea |

```jot
### 2026-10-26 | Monday

[x] Water the plants
[ ] Return the library book
[>] Fix the bike light
o 6:30p Soup night with a neighbour
? What would make tomorrow easier
! A shelf by the door for keys
```

A mark needs words after it: `[ ]` on its own is just text until you write the task. That is how the templates work: an empty `[ ] `
line is a box waiting for you.

A line that continues the item above starts with two spaces:

```jot
[ ] Plan the weekend
  Ask Sam about Saturday first.
```

## Ordinary formatting (Markdown)

Jot uses Markdown for everything else, so what you may already know works:

```jot
#### Something worth keeping

**Bold**, *italic*, ~~crossed out~~.

- a list item
- another one

1. first
2. second

> A line someone said that I want to remember.

| Moment | Note |
| --- | --- |
| Morning | Quiet enough to think |
```

`- [ ] task` (with a dash) also works as a checklist; plain `[ ] task` is the Jot way and is quicker to type.

### More ways to mark words

Jot adds a few marks that many Markdown editors (Obsidian, Typora, iA Writer) and GitHub also understand:

```jot
I want to remember ==this part== most.
Something ++underlined++, and E = mc^2^.
A claim that needs its source.[^where]

-> A line in the middle of the page <-

> [!TIP]
> Headphones helped more than pushing through.

[^where]: Overheard on the bus, 26 October.
```

| You write | You get |
| --- | --- |
| `==words==` | a highlight, like a marker pen |
| `++words++` | underlined words |
| `x^2^` | superscript (no spaces inside) |
| `[^name]` and, on a line of its own, `[^name]: the note` | a footnote: a small number in the text and the note at the end of the page. A note can go on over lines indented by two spaces |
| `-> words <-` | a line centred on the page |
| `> [!NOTE]` on the first line of a quote (also `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`) | a callout box, as on GitHub |

Each mark needs a letter just inside it, so ordinary writing like `a == b`, `C++` or `2 ^ 3` stays as you typed it. Inside
`` `code` `` nothing is a mark.

## Notes in the margin, and things only you see

- `[[ like this ]]` on its own line is a **margin note**: a remark beside the writing, not part of it.
- Lines between `/*` and `*/` (each on its own line) are **hidden**: they stay in the file but are not shown when the journal is read.
  Hidden is not secret: anyone who opens the file can read them.

```jot
[[ written on the bus, so it's short ]]

/*
Things to look up later: the name of that song.
*/
```

## Numbers, ratings and other data (records)

When you want something a program can count (sleep hours, energy, a mood), put it in a **record**. A record starts with
`:::record` and a type, has one `name: value` per line, and ends with `:::`:

```jot
:::record observation #sleep-2026-10-26
bed: 11:40p
wake: 7:10a
quality: 3
:::
```

- The part after `#` is an id. It is optional, but it must be unique in the file if you use it.
- Names are lowercase, with dashes instead of spaces (`minutes-outside:`).
- An empty value (`quality:`) means "not filled in", which is fine.
- For several lines, write `name: |` and indent the lines under it by two spaces.

```jot
:::record reflection
body: |
  Today was hard, and I still did the one thing.
  That counts.
:::
```

**Scales.** A rating means more when the scale is written down once. Templates do this for you at the top of the file:

```jot
:::record scale #scale-energy
name: energy
kind: ordinal
minimum: 1
maximum: 5
anchor-low: empty
anchor-high: full
:::

:::record measurement #energy-2026-10-26
metric: energy
scale: #scale-energy
value: 3
:::
```

To fill in a rating, type the number after `value:`. Leaving it empty is always allowed: an empty value never counts as a zero.

**Units.** A measurement can say what its number counts in: `unit: h` for hours, `unit: km`, `unit: ml`.

## Charts of your numbers

Numbers you write day after day can be drawn as a chart, so a week's sleep or steps shows at a glance. Add a `chart` record:

```jot
### 2026-10-26 | Monday

:::record measurement #sleep-2026-10-26
metric: sleep
unit: h
value: 7.5
:::

:::record observation #today-2026-10-26
steps: 8200
:::

### 2026-10-27 | Tuesday

:::record measurement #sleep-2026-10-27
metric: sleep
unit: h
value: 6
:::

:::record chart #week-2026-10-26
metrics: sleep, steps
:::
```

- **What it charts:** `metrics:` names the numbers, by their `metric:` (in a measurement) or their field name (`steps:` in any other
  record). Leave `metrics:` out to chart every number.
- **Which days:** a chart inside a dated entry covers that entry's week, Monday to Sunday. `start:` and `end:` (dates) choose other
  days; a chart outside any entry covers the days that have numbers.
- **How:** `style: line` (the default) or `style: bars`.
- **Each number gets its own small chart,** on its own scale, with the days along the bottom, the week's average as a dashed line and
  a summary (`avg 6.8 h · 6–7.5 h · 2/7 days`). A measurement with a `scale:` is charted from the scale's minimum to its maximum.
  Days with nothing written are gaps, never zeros. Two numbers for one metric on one day are averaged.
- **Where you see it:** the workspace (**Write**), the template editor's **Page** view and the Jot extension for VS Code draw it. Anywhere
  else the record shows as the few lines above, which still say what it charts.

## Lists that find things for you (queries)

A `query` record asks a question of the journal it is in: which tasks are still open, what you tagged `#health` this week, how much
you slept on average this month. The answer is worked out each time the page is shown, so it is never out of date, and the file only
holds the question:

```jot
### 2026-10-26 | Monday

[ ] Call the dentist @phone #health
[x] Walk round the park #health
[!] Post the letter

:::record measurement #sleep-2026-10-26
metric: sleep
unit: h
value: 7.5
:::

:::record query #open-health
label: Still to do for my health
show: tasks
status: open
tag: health
:::

:::record query #sleep-this-week
label: Sleep this week
show: numbers
metric: sleep
period: week
stat: average
:::
```

The page shows each query as one plain sentence ("1 open task tagged #health.") and a table of what it found.

- **What to show:** `show: tasks`, `events`, `entries` (dated sections) or `numbers`. This is the one field a query needs.
- **Which ones:** `status:` (open, completed, migrated, scheduled, cancelled; several with commas mean any of them), `priority: high`,
  `tag:` and `context:` (several with commas mean all of them), `text:` (words it contains) and, for numbers, `metric:`.
- **Which days:** `period: day`, `week` or `month` counts from the entry the query is written in (a week is Monday to Sunday), or
  from its own `date:`;
  `start:` and `end:` choose dates instead. With neither, every date counts, and so do tasks written before the first date.
- **How many:** `stat: count` is the default; numbers can also have `sum`, `average`, `min` or `max`, each metric on its own.
  `limit: 20` shows only the first 20 rows (the sentence still counts them all; 50 is the default).
- **Mistakes are shown, not hidden.** A word the query doesn't know (`status: opne`, a blank `tag:`, a metric the journal doesn't have) shows what is
  wrong where the answer would be, and in the workspace's checks, instead of quietly showing nothing or everything.
- A query never changes your writing and never runs anything. On the command line, `jot query journal.jot` prints the answers, and
  `jot query journal.jot --show tasks --status open --tag health` asks one without writing it down.

## A few other things

- **Page break:** `===` on its own line, after an empty line, starts a new page when the journal is printed.
- **Time labels:** a line like `.0830 - KITCHEN` (a dot, then a label) marks a scene or a moment in the day.
- **Tags and places:** `#walk` (a tag) and `@home` (a context, where or with whom) can go anywhere in a sentence.
- **Metadata:** a block at the very top between two `---` lines describes the whole file. Templates add one; you never need to:

```jot
---
Jot: 1.0
Title: October notebook
---

### 2026-10-01 | Thursday

A new notebook.
```

- **When a mark should just be text,** put a backslash before it: `\[ ] this is not a task` or `\# not a heading`.

## Beautiful pages: styles, printing and sharing

Write quickly; the workspace (**Write**) turns your jottings into formatted pages as you type. Dated headings read as dates
("Monday, 26 October 2026"), tasks show whether they are done, moved, scheduled or cancelled, events, questions and ideas get their
signs, `#tags` and `@places` are marked, `[[margin notes]]` sit beside the text and `.0830 - KITCHEN` reads "08:30 · KITCHEN".

Under the page preview, **Style** chooses the look:

| Style | What it looks like |
| --- | --- |
| **Journal** | a book page: a classic serif, dates in small capitals, a drop cap opening each day, margin notes in the margin |
| **Notes** | clean and modern: a sans serif, each date as a bar, tags as coloured chips, checkboxes, tidy tables |
| **Plain** | simple and quiet |

To keep or share the pages:

- **Print / PDF** prints them on the **Paper** you choose (A5, A4, Letter, pocket or your own), with book margins and page numbers
  (Journal and Notes). Choose "Save as PDF" in the print dialog for a PDF.
- **Download page ↓** saves one `.html` file with the formatted pages inside it, charts as pictures and attached pictures included.
  It opens in any browser, on any device, without the internet, and prints as nicely as the workspace does. Send it to someone, or
  keep it beside the `.jot`.

The `.jot` file never changes: the style is only how it is shown. In VS Code, the `jot.preview.style` setting chooses the same styles,
and **Jot: Export as HTML** saves the same page.

## Handwritten pages on a dot grid

The workspace (**Write**) can show your journal as if you had written it by hand in a dot-grid notebook, and print it that way:

1. Under the page preview, set **Look** to **Handwritten**.
2. Choose a **Hand**: **Pen** (a natural pen hand; each letter comes in three shapes, so two `e`s side by side are never quite the
   same), **Neat print** or **Marker**. Choose an **Ink** colour, and how far apart the dots are (**Dots every** 4 to 7 mm; 5 mm is
   the usual notebook).
3. Pick the **Paper** (A5, A4, Letter, pocket or your own size), then **Print / PDF**. In the print dialog keep the margins at
   **Default** and the scale at **100%**.

Every line of writing sits on a row of dots, page after page: the printed dots and the letters come out together, so the page looks
filled in by hand. Headings take two rows, a blank row separates paragraphs, and charts, tables and pictures are rounded up to whole
rows so nothing after them slips off the grid. Dashed lines in the preview show where each printed page ends.

Task boxes are drawn in pencil, and not all the same way: a square closed with an overlap, one left open at a corner, one gone
over twice, a softer rounded one. A done task gets a tick that runs past the box the way a quick pen does: a plain check, one with a
little hook, a long flick, or two quick strokes. No two boxes in a row are drawn alike. Each word leans and sits a little differently, and the wobbles are worked out from the words themselves, so the same journal always
prints the same. **Rewrite ↻** writes it again with other wobbles and letter shapes; your words never change. Turn **Dots** off to
print the handwriting on plain paper, or on paper that already has a dot grid.

The template editor's **Page** view and the VS Code extension can show the handwritten look too, and **Download page ↓** keeps a
handwritten page with its hand inside the file.

## Plain and packaged files

- **`.jot`** is plain text: what you see is what is in it. This is what you write and what templates make.
- **`.jotz`** is a packaged journal: one file that carries pictures, scans or handwriting together with the writing (it is a ZIP inside).

The Jot workspace opens both and saves whichever fits: plain `.jot` when there are no attachments, `.jotz` when there are. A text
editor or InkDeck works with `.jot`; to get the writing out of a `.jotz`, open it in the workspace (or unzip it and open
`journal.txt`).

## Where to write

- **Any text editor**, on a computer or a phone. Save the file with a `.jot` ending. (For colours, see
  [Colours in your text editor](#colours-in-your-text-editor).)
- **InkDeck**, the e-ink writing firmware for the Xteink X3/X4: it creates `.jot` files for you.
- **The Jot workspace** (**Write**, on this site): a preview beside your writing, with charts, method ideas and attachments.
- **VS Code**, with the Jot extension: colours for Jot's marks and a live page preview with charts. See
  [Colours in your text editor](#colours-in-your-text-editor).
- **The template editor:** design the structure once and get a ready-made file for the month, a dated entry a day, to fill in.
  See [Using the template editor](template-editor.md).

## Colours in your text editor

**VS Code** has a Jot extension (in the `vscode/` folder of the Jot project): dates, tasks, events, records and their numbers in
colour, and **Jot: Open Preview to the Side** (`Ctrl+K V`, `Cmd+K V` on a Mac) for a live page preview that draws your charts.
**Jot: Insert a Week Chart** writes a chart record for this week. Until it is in the Marketplace, install it from the folder: run
`npx @vscode/vsce package` there, then **Extensions → … → Install from VSIX**.

Other editors don't know `.jot` yet, but Jot is Markdown underneath. Tell your editor to treat `.jot` as Markdown and you get
headings, lists, bold and tables in colour. (Jot's own marks, like `o` events and records, show as plain text.)

| Editor | How |
| --- | --- |
| **VS Code** (and VSCodium, Cursor), without the extension | Open a `.jot` file, click the language name at the bottom right ("Plain Text"), choose **Configure File Association for '.jot'…**, then **Markdown** |
| **Sublime Text** | Open a `.jot` file, then **View → Syntax → Open all with current extension as… → Markdown** |
| **JetBrains** (IntelliJ, PyCharm …) | **Settings → Editor → File Types → Markdown**, add `*.jot` |
| **Neovim** | Add `vim.filetype.add({ extension = { jot = 'markdown' } })` to your config |
| **Vim** | Add `autocmd BufRead,BufNewFile *.jot setfiletype markdown` to your `.vimrc` |
| **Emacs** (with markdown-mode) | Add `(add-to-list 'auto-mode-alist '("\\.jot\\'" . markdown-mode))` to your init file |

On a phone, any app that edits plain text files works; colour is a bonus, not a need.

## Real diaries to look at

The [Examples](../../site/dist/examples/) page has whole diaries as Jot: Samuel Pepys's ten years, *The Diary of a Nobody* and Wilfrid
Scawen Blunt's diaries, a dated entry for each day. Open one in the workspace to see how a long journal reads, or download it.

## Small habits that help

- One file a month is easy to find and small enough to type into anywhere. Name it by the month: `2026-10.jot`.
- Write the date heading first, then anything: a word is enough.
- Skipped days need nothing. There is no catching up.
- Keep a copy somewhere else. A `.jot` file is just a file: back it up like a photo.

The full rules are in the [Jot specification](../../site/dist/docs/Jot-Complete-Specification.pdf). You won't need them to write.

## Color in handwritten pages

The workspace opens in **Handwritten** for new users; an existing **Look** preference is kept. The same colors appear in handwritten preview, **Print / PDF**, and **Download page** (standalone HTML).

Select words on one line in **The writing**, choose a palette color or a custom color, choose **Text ink**, **Highlight**, **Strikethrough** or **Underline**, then press **Apply color**. Keep the selection and apply another effect to combine them. To change an effect again, select the same formatted words and apply the new color; the new color replaces that effect in the selected spans. **Clear colors** removes color spans fully included in the selection; select their brackets and attributes too. Ordinary bold, italic, links and writing remain intact. Undo works in the writing field.

Colors are part of the saved journal, rather than browser-only preferences:

```jot
[Rose-colored writing]{ink=#b33951}
[A yellow highlight]{highlight=#ffe680}
[Changed my mind]{strike=#c0392b}
[Keep this thought]{underline=#245ac2}
[All together]{ink=#1f3a8a highlight=#ffe680 strike=#c0392b underline=#245ac2}
```

You can nest spans and use bold or italic inside them. Each color uses six hexadecimal digits; custom CSS is not supported. A color span stays on one source line. Handwriting keeps the chosen hand and grid spacing. Contrast feedback compares ink to light paper, or a highlight to the default blue ink; check the actual preview when combining colors. Choose color printing and enable background graphics if your browser requires it. Physical print and mobile print results still need device checks.

### Highlights with a human hand

For **Highlight**, the **Stroke** control offers **Marker** (a broad translucent pass), **Brush** (overlapping soft passes), and **Pencil** (several loose strokes). Repeated highlights have different edges and coverage, including ordinary `==highlight==` marks. **Rewrite ↻** makes another variation of the handwriting and highlights; it keeps your words and chosen colors. The variation stays consistent on reload, print, and HTML export until you rewrite it again.

```jot
[A broad marker]{highlight=#ffe680 highlight-style=marker}
[A softer brush]{highlight=#ffc7df highlight-style=brush}
[Loose pencil strokes]{highlight=#91bcf0 highlight-style=pencil}
```

### Reference color palettes

The color menu and **Show color swatches** offer 71 colors from the supplied Mildliner, soft-color and pastel references. They are grouped by collection and labeled with their hex values. Lemon yellow (`#fddd13`) is the default highlight, including `==ordinary highlights==`. The palette is available for text ink, highlights, strikethrough and underline; custom colors remain available. Soft colors are often best behind darker ink—check the contrast message when using them as text. Highlight strokes are translucent, so their appearance on paper is softer than the solid color swatch. Existing journal colors are preserved.

### How highlighter and ink combine

Highlighter strokes sit on top of the writing and blend with the ink underneath, like a translucent marker on paper. Changing the
text ink changes the visible result under the same highlight. The source keeps both colors separately; the effect carries through
to Typed and Handwritten preview, print, PDF and standalone HTML. Marker, brush and pencil use the same blending rule.
