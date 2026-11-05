# Writing in Jot

Jot is a way to keep a journal as plain text. You can write it in any text editor, on a computer or phone, or in
the Jot workspace in your browser. Nothing has to be filled in, and nothing is required except your words.

This guide covers everything you need to write a `.jot` file by hand. It takes about ten minutes to read, and you can stop after the
first section.

## Start with just writing

A `.jot` file can be nothing but sentences. This is a complete journal:

```jot
The rain made the room feel quieter. I wanted to remember that.
```

Everything else in this guide is optional. Add it when it helps, skip it when it doesn't.

## Writing in the browser workspace

The **Write** workspace opens with a blank editor on desktop and mobile Chromium browsers. If you have written here before,
your saved writing returns. The top bar keeps the filename, browser and device save status, **Open**, **Save** and **Tools** nearby.

Headings, emphasis, lists and links display as you type on the writing surface. **Tools → Source editing** exposes the complete
plain-text journal; **Live editing** returns without converting or rewriting it. Structured blocks have **Edit source** buttons.
Charts and queries retain their source cards here; **Tools → Page preview** renders them with the whole journal's context.
The Tools menu also offers **Write only** and **Side by side** views for page layout and printing.

In secure desktop Chromium browsers, **Open** connects a selected device file and **Save** writes back on explicit request.
**Save as** chooses another destination. **Ctrl+S / Cmd+S** saves; add Shift for Save as. Device access is separate from browser
autosave. External file changes stop saving so you can keep both versions. Saving imported plain text chooses a new `.jotz` destination. Handles last only for this visit. When file access is unavailable, Save downloads a copy instead.
**Tools → Download journal** always keeps a separate copy. Save and Download both preserve the configured per-entry protection in `.jotz`. Other exports and printing are unencrypted.

Extra controls stay closed until you need them. In **Tools**, choose **Journal tools** for the journal button row,
**Formatting controls** for formatting buttons and **Colors**, or **Writing options** for suggestions and writing hints.
**Attached files** opens the attachment list; it also appears when the journal contains files.
Choose **View** to open a supported image, audio recording, video or PDF locally. Image and attachment links in the preview open the same viewer. Audio and video have playback controls and never autoplay. Closing the viewer stops playback; replacing or locking the journal clears it.

Once Writer is prepared for offline use, attached files need no provider connection. Playback depends on the browser's codecs; PDFs use its built-in viewer, which may be unavailable in some browsers or desktop webviews. **Download original** remains available when display fails or is unsupported. Downloads are separate, unencrypted copies. SVG, HTML and other unsupported files remain downloads; Writer does not execute them. Original attachment bytes remain unchanged in the journal.

- **Bold**, **Italic**, **Code** and **Link** edit the selected source. **Heading**, **Task**, **Bullets**, **Numbers** and **Quote**
  format the selected lines. **Indent** and **Outdent** move those lines by two spaces. The text remains ordinary Jot/Markdown.
- The **Format** menu (the Tt button beside undo and redo) holds every formatting choice and the writing font, with its
  shortcut beside each. **Ctrl+B / Cmd+B** bold, **Ctrl+I** italic, **Ctrl+U** underline (`++text++`), **Ctrl+Shift+H**
  highlight (`==text==`), **Ctrl+Shift+X** strikethrough, **Ctrl+Shift+P** superscript (one word, `^2^`),
  **Ctrl+Shift+Space** clears formatting from the selection. **Clear formatting in this entry**, in the same menu,
  removes bold, italics, underline, highlights, strikethrough, superscript, inline code and colours from the whole dated
  entry at the cursor and leaves every other entry as it was. The words, links, code blocks, records and the entry's
  pen and ink stay; Undo brings the formatting back. **Ctrl+Alt+1** to **3** make a heading and **Ctrl+Alt+0** normal
  text (Ctrl+1 to 3 also work where the browser does not keep them for switching tabs). **Ctrl+E** centres a line
  (`-> text <-`) and **Ctrl+L** removes the centring. **Ctrl+Shift+7**, **8** and **9** make numbered, bulleted and task lines. To tick a task, tap its box in live editing, or press
  **Ctrl+Enter** (**Format → Tick or untick task**) with the cursor on it; Undo unticks it.
  On a Mac, use Cmd for Ctrl.
- **Ctrl+/ / Cmd+/** opens **Keyboard shortcuts**, a searchable list of all of them. It also lists word-processor shortcuts
  Jot leaves out, and why: there is no double underline, subscript, right alignment or justification in a plain-text
  journal, and closing or quitting belongs to the browser or app window.
- **Ctrl+O** opens a journal, **Ctrl+P** prints the formatted pages, **Ctrl+H** opens find and replace, and **Ctrl+Alt+N**
  starts a new journal (Ctrl+N where the browser allows it, such as the desktop app). Tab and Shift+Tab indent lists or
  multiple selected lines; Tab in ordinary prose continues keyboard navigation.
- **Continue lists on Enter** continues bullets, numbering, quotes and tasks. New tasks start unchecked. Enter on an empty item
  leaves the list; Shift+Enter inserts an ordinary newline. Turn the option off for manual line breaks. It is remembered locally.
- **Find & replace** (**Ctrl+F / Cmd+F** while writing) searches literal text in this journal, with match-case and whole-word
  options. Next and Previous wrap around. Replace and Replace all are explicit; replacement text is literal, including `$`.
- **Outline** jumps to a dated entry or heading. Headings inside code and comments stay out of the outline.
- **Map** (on a phone, in the bar at the bottom; on a wider screen, at the top; or **Tools → Journal map**) shows every dated
  entry on a calendar: one row per month, one column per day, with blank rows for months you did not write. Lines join
  entries that link to each other (`[see Friday](#2026-10-30)` or a link to a record in another entry). **Threads** lists your
  `#tags` and the people and places you link to from a People and Places book; choose one to see the entries it runs
  through. Choosing an entry shows its date, length, what it links to and what links to it, but not its writing:
  **Open in writing** takes you there. Drag to move, pinch or Ctrl/Cmd + scroll to zoom, or use the arrow keys to step
  through entries in date order and Enter to choose one. The map is a view only, it never changes your writing, and it
  is cleared when the journal locks.
- **Tools** (**Ctrl+K / Cmd+K**) lists every writing tool and journal workflow in groups, with shortcuts beside them. Type to search, including by key ("ctrl u"), then choose a tool or press Enter.
  Arrow keys move through results and Escape closes the menu. Searching alone does not edit the journal.
- **Entry templates**, available in Tools, offers daily reflections, weekly and monthly recaps, meetings and freewriting.
  Choose a template, edit its blank prompts in the review field, then Insert. It inserts after your selection without replacing
  selected words. These are starting points for your own writing; no experiences, dates, locations or measurements are filled in.

Formatting, replacements and template insertion support the browser's Undo command (**Ctrl+Z / Cmd+Z**). Your writing still
autosaves in this browser, and **Download** keeps a separate `.jot` file (or `.jotz` with attachments). Current-time and location
capture remain manual actions.

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

`- [ ] task` (with a dash) also shows as a checklist, but only plain `[ ] task` lines count as Jot tasks (with states like moved or
cancelled), and they are quicker to type.

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

In Writer, put the cursor in a passage and choose **Format → Margin note…** (or **Tools → Margin note**). Writer adds the note
on its own line straight after that paragraph, list item or quote, and it sits beside it on the page. Your words are not
changed, and Undo removes the note. To draw or write by hand over a page instead, choose **Format → Draw on a page…**
(the same as **Tools → Annotate page**).

### A scratchpad for each entry

Sometimes you want to get it all down roughly first and write the entry afterwards. A **scratchpad** is a block named `draft`
inside the entry. It stays in the file with the entry, but it is not shown on the page or in print:

````jot
### 2026-11-04 | Wednesday

~~~draft
heron, rain, canal. why was it standing so still?
~~~

The heron was back by the canal this morning, standing in the rain.
````

Everything in a scratchpad is kept exactly as written: `[ ]` there is not a task and `#words` are not tags, so rough notes
never turn up in your task lists or charts.

In Writer, put the cursor in an entry and choose **Tools → Scratchpad for this entry**. The scratchpad opens beside the
writing; what you type is saved into the entry as you go.

- **Add to entry** puts the words you selected in the scratchpad (or all of it) at the end of the entry. The scratchpad keeps
  them until you clear it.
- **Clear scratchpad** asks once more, then removes the block. Undo brings it back.
- **Write it up…** turns your rough notes into a draft entry with the optional AI companion (your own local model server or
  OpenRouter key, for this session only). It opens the companion with your notes (or just the ones you selected) as the
  only context and an instruction to keep every fact and add nothing; you can change the instruction. Nothing is sent until
  you choose **Draft writing**, and nothing goes in until you review it and choose **Apply**, which adds the draft after the
  entry's writing. The scratchpad stays as it was. The small on-device cleanup model that voice typing uses only fixes
  punctuation and capitals, so it is not offered here: shaping notes into sentences needs a larger model.
- **Talk into it** (for today's entry) starts the scribe writing into the scratchpad instead of the entry. You can also
  choose **Write into: Today's scratchpad** in the scribe's settings.
- In live editing a scratchpad shows as a small card with its word count and an **Open** button.

A scratchpad is part of the entry, so it is protected when the journal is locked. It is not secret from anyone who opens the
file, and an editable export or a copy of the file includes it. Clear it if you don't want to keep it.

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

## Links between days and records

Every dated heading is a place you can link to: write the date after `#`. A record with an ID (`:::record note #plan`) can be linked by its ID the same way. Links work anywhere you write: in paragraphs, lists, tables, quotes, footnotes, tasks and margin notes.

```jot
### 2026-10-25 | Sunday

Started sketching the garden plan.

### 2026-10-26 | Monday

Back to what I began [yesterday](#2026-10-25), and to [the plan](#plan).

:::record note #plan
body: Beans along the fence.
relation: continues #2026-10-25
:::
```

- **In the preview,** a link jumps to that day or record, and each one shows a short **Linked from** line: the days and records that point at it.
- **A link to something that isn't there** (a typo, or a date with no heading yet) still shows as written, and the checker lists it as an unresolved link. Nothing stops you writing.
- **If two headings share a date,** a link goes to the first.
- **Records link too:** `relation: continues #2026-10-25`, `member: #plan` and `source: #2026-10-25` point at a day or record when the value is just the `#` link (after the kind, for `relation`).
- **Another file:** `[last month](september.jot#2026-09-30)` is kept as written. Jot never opens or fetches the other file to check it.

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

## Palettes and moodboards

For designers and artists: a `palette` record keeps colors as text, one `color:` line each, a hex code then a name.

```jot
:::record palette #autumn-zine
label: Autumn zine
color: #c0392b brick red
color: #f4d03f mustard
color: #234 deep slate
:::
```

- **The page draws swatches** that always print the name and hex code in words, in black or white, whichever reads better on
  that color. Color is never the only clue. Three digits (`#234`) are short for six (`#223344`); transparency is not part of a swatch.
- **A color Jot can't read** (`color: brick`) stays exactly as you wrote it, and the page shows a note in its place, with a warning
  under **Checks**.
- **Copy palette CSS** and **Copy palette JSON** in **Tools** copy the palette your cursor is in (or the nearest
  one before it) as CSS custom properties (`:root { --brick-red: #c0392b; }`) or as JSON. **Add to palette ＋**, beside the color
  menu, writes the chosen color into that palette, or starts one.

A `moodboard` record gathers pictures you've attached, each `image:` a path then a few words saying what it shows. `caption:` and
`credit:` lines after a picture belong to it; `color:` lines add swatches.

```jot
:::record moodboard #rain-study
label: Rain study
image: assets/boots.jpg Wet boots on the bus floor
caption: Tuesday, 8am
credit: my phone
image: assets/ticket.png A crumpled blue bus ticket
color: #1f3a8a ink blue
body: Grey, wet, a little blue.
:::
```

The page lays the pictures out in a grid that fits the screen. A picture that isn't attached shows its path and description
instead; nothing is fetched from the internet. Two or more pictures on their own in one paragraph are laid out the same way.

## 3D models

Attach a 3D model you made or were given, a `.glb` file, and Jot writes a model record for it:

```jot
:::record model #garden-bed
label: The garden bed in October
file: media/1b4e… A clay model of the raised bed, with three seedlings
:::
```

The page shows the model's description (or a still picture, if you add `poster:` and an attached picture), and a **Turn in 3D**
button. Press it to turn the model: drag it, or use the arrow keys, and **+** and **−** to come closer or step back. **Reset view**
puts it back, **Play animation** plays an animation the model has, and **Back to the picture** puts the still back. Nothing moves
until you ask.

Write the description after the file's path: it is what a screen reader, a printed page and any reader without 3D show. These are
optional too:

| Field | What it does |
| --- | --- |
| `poster` | A still picture shown wherever the model isn't turning: print, saved pages, readers without 3D |
| `camera` / `target` | Where the camera starts and what it looks at: three numbers, `2, 1.5, 3` |
| `lighting` | `soft` (the default), `studio` or `dim` |
| `background` | A color like `#f4efe4`; without one, the paper shows through |
| `animation` | Which of the model's animations **Play animation** plays |
| `hotspot` | A place worth looking at: three numbers, then what is there (`hotspot: 0.3, 0.9, 0.2 The first seedling`). Listed under the model; turned in 3D, each is a numbered button that takes you there |
| `caption`, `credit` | Words under the model |

A model is a file, never a program: Jot's own viewer draws it, and it only reads what is in your journal. A `.glb` carries
everything it needs. A `.gltf` works only if its pictures are inside the file; Jot never fetches the rest from the internet, and says
so.

Optimized models work too, and keep a journal small: Draco-compressed meshes, meshopt, and textures in KTX2 (Basis Universal), WebP
or AVIF, as tools such as glTF-Transform, gltfpack and Blender's exporter make them. Jot carries its own decoders and reads one only
when a model needs it, so nothing is downloaded. In an EPUB, a compressed model brings its decoder along; the reader then has to run
WebAssembly in a book, which not every reader does. Where it can't, the still or the description stays.

## Flip cards

A card is a question with its answer behind a tap, for trying to remember before you check:

```jot
:::record card #leaf
label: Biology, week 3
front: What does a leaf make from light, water and air?
back: |
  Sugar, and oxygen it lets go.
:::
```

The page shows the front. Tap it, or press Enter on it, to see the back, and again to hide it. Nothing is scored, counted or
scheduled. Printed, and in a fixed-layout EPUB, a card is a paper fold-over card: the front, then the answer upside down below a
fold line.

## Sound and video recordings

Attach a recording (a voice memo, birdsong, a clip of the sea) and Jot writes `![rain.m4a](media/…)`: the page shows a player for
it. Change the words in the brackets to say what it is; that is what a screen reader reads. A recording plays only when you press
play, never on its own. Printed, a box names the recording; Download page and the EPUB carry the recording inside, with a working
player. A plain link, `[rain.m4a](media/…)`, stays a link.

## Your days as scenes

**Scenes** (beside Map and Media) shows each dated entry as a small 3D place: the cluttered desk, the rainy bus stop, Saturday's
bedroom. A model makes each one from that day's words, using the AI companion's connection: turn on AI for this session there and
choose a model (your OpenRouter key, or a server on your own computer) first.

1. Choose a day from the tabs, then **Make this day's scene**. Jot shows the sentences it will send, and where, before anything
   goes; scratchpads, comments, code and records are never sent.
2. The scene appears as a draft. Drag to turn it, scroll to zoom, and choose a thing (in the scene or from the list under it) to
   read the sentences it holds: your own words, never the model's. **Open journal** shows the whole entry.
3. **Keep it** saves the scene in your journal: an attachment, and one line under the day's date, `@setting: media/…`. Undo takes
   the line back out. **Try again** asks once more; **Discard** forgets the draft.

A kept scene needs no model and no connection: it opens from your journal, offline, and is locked with the rest of a protected
journal. If you change a sentence later, the scene still shows the old one, marked as no longer in the entry. Weather moves only
while you watch, and starts paused if your device asks for less motion.

## A few other things

- **Page break:** `===` on its own line, after an empty line, starts a new page when the journal is printed.
- **Time labels:** a line like `.0830 - KITCHEN` (a dot, then a label) marks a scene or a moment in the day.
- **Tags and places:** `#walk` (a tag) and `@home` (a context, where or with whom) can go anywhere in a sentence. (The
  specification defines them; the tools here keep them as ordinary words for now and don't yet list or search them.)
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

Open **Preview**. Set **Look** to **Typed**, then **Style** chooses the look:

| Style | What it looks like |
| --- | --- |
| **Journal** | a book page: a classic serif, dates in small capitals, a drop cap opening each day, margin notes in the margin |
| **Notes** | clean and modern: a sans serif, each date as a bar, tags as colored chips, checkboxes, tidy tables |
| **Plain** | simple and quiet |

To keep or share the pages:

- **Print / PDF** prints them on the **Paper** you choose (A5, A4, Letter, pocket or your own), with book margins and page numbers
  (Journal and Notes). Choose "Save as PDF" in the print dialog for a PDF.
- **Page view** shows the pages one sheet at a time before you print, with margins and page numbers, as Paged.js lays them out.
  **Print these pages** prints exactly those sheets, in browsers that do not draw page numbers themselves too. Print at 100% scale.
  Nothing is fetched or kept: closing Page view, or locking the journal, empties it.
- **Download page ↓** saves one `.html` file with the formatted pages inside it, charts as pictures and attached pictures included.
  It opens in any browser, on any device, without the internet, and prints as nicely as the workspace does. Send it to someone, or
  keep it beside the `.jot`.
- **EPUB ↓** (also in Page view) saves the same sheets as a fixed-layout EPUB 3 book: every page keeps its layout, the way picture
  books and comics do. A 3D model turns in readers that run a book's scripts (Apple Books is made to); other readers show its
  still or its description. The book carries its pictures, fonts and models inside and never fetches anything. Like Download
  page, it is not locked: anyone with the file can read it.

The `.jot` file never changes: the style is only how it is shown. In VS Code, the `jot.preview.style` setting chooses the same styles,
and **Jot: Export as HTML** saves the same page.

## Handwritten pages on a dot grid

The workspace (**Write**) can show your journal as if you had written it by hand in a dot-grid notebook, and print it that way:

1. Open **Preview**, then set **Look** to **Handwritten**.
2. Choose a **Hand**. **Jot Script** comes in **0.5**, **0.7** and **1.0** stroke styles; new previews use **0.7**. The numbers describe
   the look of the strokes, not a measured pen width. **Pen**, **Neat print** and **Marker** remain available, and existing choices
   are kept. Choose an **Ink** color, and how far apart the dots are (**Dots every** 4 to 7 mm; 5 mm is the usual notebook).
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

Site copy, guides and controls use Jot Sans for reading. Source and code use monospace. Handwriting is the journal's look, so
changing it does not change your words or the site's controls. Font choices stay in this browser; the `.jot` source stays the same.
The [Fonts page](../../site/dist/fonts/) lets you try Jot Sans and Jot Script, compare stroke styles and weights, and inspect
individual letters with their spacing guides. Sample text on that page stays there until you leave or reload it.

## Journal archives and writing exports

**Jot v1 uses `.jotz` as the primary journal document.** Keep, open and share this file as a complete journal. Its `.jot` files are the editable text source inside the archive; standalone `.jot` files also work in ordinary text editors. A `.jotz` needs Jot-aware software or an editor extension, rather than a Markdown file association.

Writer saves **`.jotz` by default**, even for text-only journals. One ZIP-based file keeps ordered entries, media and timestamps,
plus a portable public search index once the public writing passes 256 KiB (smaller journals search their text directly). Public entry source is readable after unzipping; protected entries are not. Plain `.jot` and
Markdown remain writing-only import/export options and omit attachments and encryption. The old separate `.jotlock` file type
is replaced by protection inside `.jotz`; this fresh format has no migration layer.

### Protect selected entries

Encryption is a core v1 requirement. In the current prototype it starts when you choose **Lock with a passphrase**; a journal is not automatically encrypted just because it stays on your device. Whole-document privacy/recovery usability and independent security review remain release work.

**Lock with a passphrase** initially protects every entry and offers a recovery code, shown once. Keep that code apart from the
journal. **Tools → Entries, privacy and search** lets you make individual entries public, save those choices and search words,
tags, dates or measurements. New entries start protected after setup. Word searches ignore case and accents and match
inside words (`walk` finds "walking", `cafe` finds "café"). Journals with more than 256 KiB of public writing keep a portable
SQLite index of public text, tags and measurements; results are the same with or without it. Protected text is searched only in
memory while unlocked. Private entry dates and cryptographic metadata remain visible.
All attachments and settings stay encrypted while protection is enabled, including images referenced by public entries.

Save privacy choices updates the browser copy. Save or Download updates an external archive separately. Earlier downloads and
backups keep their earlier privacy settings. A failed privacy save can leave an earlier public copy, so the tool says so.

**Ways in** supports recovery codes, passphrase changes and passkeys/security keys where the browser supports PRF. Passkeys can be stored in a password manager, but the manager/browser must support PRF encryption unlocking, not only passkey login. Keep a passphrase or recovery code for offline access if that manager, another device or its network is unavailable. At least one
passphrase or recovery code remains. Passkeys work only for their original site. **Remove the lock** makes the current archive
public; it does not change earlier copies. Preferences can relock after time away. Reload/relock hides private writing and keys,
while public writing remains readable in the locked panel. **Search public entries** searches that public index without unlocking. Browser storage is not a backup: keep downloaded archives.

Printing, formatted page downloads, Markdown and Jot source exports can expose content selected after unlocking. Only `.jotz`
keeps the entry protection and attached media. A mixed public/private archive is not fully encrypted. Encryption uses platform
AES-256-GCM with per-member content keys; independent security review and large/mobile archive benchmarks remain release checks.


## Where to write

- **Any text editor**, on a computer or a phone. Save the file with a `.jot` ending. (For colors, see
  [Colors in your text editor](#colors-in-your-text-editor).)
- **The Jot workspace** (**Write**, on this site): a plain editor with optional preview, charts, method ideas and attachments.
- **VS Code**, with the Jot extension: colors for Jot's marks and a live page preview with charts. See
  [Colors in your text editor](#colors-in-your-text-editor).
- **The template editor:** design the structure once and get a ready-made file for the month, a dated entry a day, to fill in.
  See [Using the template editor](template-editor.md).

## Making the workspace comfortable

Everyone writes differently, so the workspace (**Write**) lets you change how it looks, one thing at a time. None of these choices
go into your journal: they are remembered in this browser only, and the page works the same without them.

- **Writing preferences** (in **Tools**): text size, line spacing, line length and how dense the controls are; higher contrast;
  reduced motion (your system's reduce-motion setting is always followed too); and, separately, whether to show the page preview,
  the parser and writing-check tabs, the word and check counts, and decoration like small headings and taglines. **Back to
  standard settings** undoes them. Printing and Download page are not affected.
- **Focus mode** shows only the writing, its name and whether it is saved. Press **Escape** or **Leave focus mode** to see
  everything again.
- **Quick note ＋** adds one line to the end of today's dated entry (making the entry if there is none) and leaves your cursor
  where it was, unless you tick the box to go there. Undo (`Ctrl+Z`) takes it back.
- **Coming back:** your cursor and scroll position return when you reopen the page. If you like, write a short note for next time
  in Preferences, such as "Next: the paragraph about the walk". It is shown when you come back, with **Back to where I was**,
  **Start at the end** and **Dismiss**. Nothing counts days, keeps streaks or asks you to catch up.
- **Your day:** if your day doesn't end at midnight (a night shift, a late bedtime), set **My day starts at** in Preferences.
  Before that hour it is still yesterday for **Today ＋**, **Quick note ＋**, **Carry tasks forward** and **Week review**, so a
  night stays in one entry. **Back to standard settings** keeps it, like your note.

## Colors in your text editor

**VS Code** has a Jot extension (in the `vscode/` folder of the Jot project): dates, tasks, events, records and their numbers in
color, and **Jot: Open Preview to the Side** (`Ctrl+K V`, `Cmd+K V` on a Mac) for a live page preview that draws your charts.
**Jot: Insert a Week Chart** writes a chart record for this week. Until it is in the Marketplace, install it from the folder: run
`npx @vscode/vsce package` there, then **Extensions → … → Install from VSIX**.

Other editors don't know `.jot` yet, but Jot is Markdown underneath. Tell your editor to treat `.jot` as Markdown and you get
headings, lists, bold and tables in color. (Jot's own marks, like `o` events and records, show as plain text.)

| Editor | How |
| --- | --- |
| **VS Code** (and VSCodium, Cursor), without the extension | Open a `.jot` file, click the language name at the bottom right ("Plain Text"), choose **Configure File Association for '.jot'…**, then **Markdown** |
| **Sublime Text** | Open a `.jot` file, then **View → Syntax → Open all with current extension as… → Markdown** |
| **JetBrains** (IntelliJ, PyCharm …) | **Settings → Editor → File Types → Markdown**, add `*.jot` |
| **Neovim** | Add `vim.filetype.add({ extension = { jot = 'markdown' } })` to your config |
| **Vim** | Add `autocmd BufRead,BufNewFile *.jot setfiletype markdown` to your `.vimrc` |
| **Emacs** (with markdown-mode) | Add `(add-to-list 'auto-mode-alist '("\\.jot\\'" . markdown-mode))` to your init file |

On a phone, any app that edits plain text files works; color is a bonus, not a need.

## Real diaries to look at

The [Examples](../../site/dist/examples/) page has whole diaries as Jot: Samuel Pepys's nine and a half years, *The Diary of a Nobody* and Wilfrid
Scawen Blunt's diaries, a dated entry for each day. Open one in the workspace to see how a long journal reads, or download it.

## Small habits that help

- One file a month is easy to find and small enough to type into anywhere. Name it by the month: `2026-10.jot`.
- Write the date heading first, then anything: a word is enough.
- Skipped days need nothing. There is no catching up.
- Write down how you use it: [Write your own manual](manual.md) takes ten minutes and makes the system yours.
- Keep a copy somewhere else. A `.jot` file is just a file: back it up like a photo.

The full rules are in the [Jot specification](../../site/dist/docs/Jot-Complete-Specification.pdf). You won't need them to write.

## Color in handwritten pages

New previews use **Handwritten** with **Jot Script 0.7**; existing **Look** and **Hand** preferences are kept. The same colors appear in handwritten preview,
**Print / PDF**, and **Download page** (standalone HTML).

Choose **Tools → Formatting controls**, then **Colors**. Select words on one line, choose a palette color or a custom color,
choose **Text ink**, **Highlight**, **Strikethrough** or **Underline**, then press **Apply color**. Keep the selection and apply
another effect to combine them. To change an effect again, select the same formatted words and apply the new color; the new color
replaces that effect in the selected spans. **Clear colors** removes color spans fully included in the selection; select their
brackets and attributes too. Ordinary bold, italic, links and writing remain intact. Undo works in the writing field.

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
The live writing surface also uses a translucent stroke over highlighted words. Dark mode uses lighter stroke coverage and
lighter displayed handwriting ink to keep the letters visible. The saved ink and highlight colors stay unchanged; print uses
light paper and the original ink colors.

## Albums, playlists and Spotify short links

An entry can hold any number of music references:

```jot
#### Music for this week

- Album: [An album to return to](spotify:album:4aawyAB9vmqN3uQ7FjRGTy)
- Playlist: [My writing mix](spotify:playlist:37i9dQZF1DXcBWIGoYBM5M)
- spotify: track:11dFghVXANMlKmJXsNCbNl
```

Copy a Spotify URI, or keep the type and ID from a share URL: `https://open.spotify.com/album/ID` becomes `spotify:album:ID`.
The types are `track`, `album`, `playlist`, `artist`, `episode` and `show`. A space after `spotify:` is optional.
Named Markdown links show your label; bare short references show “Spotify album”, “Spotify playlist”, and so on. Each becomes
an ordinary link in the page preview and HTML export. Reading an entry does not contact Spotify or load music automatically.
Paste the same short reference into **Music player ♫** to load it for listening while you write. These are links to collections;
the music itself is not copied into your journal or its `.jotz` package. You can always use a normal HTTPS link for other services.

## IMDb and YouTube background media

An entry can collect films, TV, episodes, videos and playlists alongside music:

```jot
#### Background media

- [Background film](imdb:tt0133093)
- [TV series](imdb:tt0386676)
- [Video](youtube:dQw4w9WgXcQ)
- [Video playlist](youtube:playlist:PL1234567890abcdef)
```

Use an actual provider ID from the link you want to save. IMDb uses `imdb:tt…` for title IDs (films, series and individual
episodes). YouTube uses `youtube:VIDEO_ID`, optionally `youtube:video:VIDEO_ID`, or `youtube:playlist:PLAYLIST_ID`.
A space after the first colon is optional. Bare shortcodes show a provider/type label; Markdown links give them a name.
IMDb identifies the title and does not provide playback. These references do not fetch titles, ratings or thumbnails or embed
videos automatically. The shared preview and HTML export expand them into ordinary HTTPS links.

In **Music & background media**, paste one reference per line, optionally `Name | reference`, and add the mixed list to the entry.
Full IMDb title URLs and simple YouTube video/playlist URLs are shortened on insertion. Video links with timestamps or both a
video and a playlist remain full URLs so their context is preserved. Existing journal writing is never automatically rewritten.
The persistent writing player remains Spotify-only; YouTube references open YouTube when you follow them.

## Find music IDs while typing

Open **Music & background media → Find a song or album ID** and enable **Search MusicBrainz as I type**. Choose song recording,
album (release group), album edition, composition or artist, then type at least three characters in the dedicated search box.
After a short pause, suggestions show names, artists and available dates, versions or durations. Choose a result with the mouse
or Tab and Enter. It goes into the reference review list; **Add to this entry** is still needed to change the journal.

Only the search box text and chosen entity type are sent to MusicBrainz, with no account cookies or journal content. Search is off
by default and turns off when the dialog closes. Requests are debounced/rate-limited, old searches are cancelled, and recent results
are cached only for this page session. Busy/offline services show an error and leave manual entry available. Result names are not
verified matches: check the recording/version or album edition before selecting one.

Database links use `musicbrainz:recording:UUID`, `musicbrainz:release-group:UUID`, `musicbrainz:release:UUID`,
`musicbrainz:work:UUID` or `musicbrainz:artist:UUID`. They identify the music independently of Spotify or YouTube. Existing service
links remain useful for playback; the lookup does not guess a corresponding playback URL. IMDb and YouTube links can be looked up with
**Tools → Add media** (below).

## Add media: films, series, books, anime, podcasts, games and music

Choose **Tools → Add media** to put a film, a TV series or one episode, a book, an anime or manga, a podcast or one episode,
a video game or a song or album into your writing as a reference. Pick the kind, type a title (or paste a link) and choose
a result. Writer shows the exact text before it goes in at your cursor, and Undo removes it.

- **Already in this journal first.** References you have used before are found straight away, with no connection.
- **Online catalogs are off until you turn them on** (**Search online catalogs**, remembered on this device). Then only the
  words in the search box go to the catalog for the kind you chose. Your writing is never sent, and no account is needed:

| Kind | Catalog | The reference |
| --- | --- | --- |
| Film | Wikidata | `[The Matrix (1999)](imdb:tt0133093)` when Wikidata knows the IMDb title, otherwise its Wikidata page |
| TV series or episode | TVmaze | `[Severance S1E3: “In Perpetuity”](https://www.tvmaze.com/episodes/2238340)`; choose a series, then **Episodes →** |
| Book | Open Library | `[The Left Hand of Darkness by Ursula K. Le Guin (1969)](https://openlibrary.org/works/OL59800W)` |
| Anime or manga | AniList | `[Frieren: Beyond Journey’s End (2023)](https://anilist.co/anime/154587)` |
| Podcast or episode | Apple Podcasts directory | the show, or one of its latest episodes |
| Video game | Wikidata | its Wikidata page |
| Music | MusicBrainz | `musicbrainz:` song or album references, as above |

- **Paste a link** from YouTube, Spotify, IMDb, TVmaze, AniList, Open Library, Apple Podcasts, MusicBrainz or Wikidata and Writer
  looks up just that item's title, then writes the short form where Jot has one (`youtube:`, `spotify:`, `imdb:`,
  `musicbrainz:`). Any other link is not fetched; you can insert it as it is.
- **What you did is your choice.** Mentioning a film does not say you watched it. Choose **Watched**, **Reading**,
  **Want to listen to** and so on only when that is what you mean; it goes in as ordinary words before the link.
- References are ordinary links: they read fine in any text editor, open the catalog's page in the preview, and nothing is
  fetched when the journal is opened or printed. Titles come from the catalogs and may be wrong or change; check before
  you insert. Catalogs can be busy or offline; then search again later or paste a link.

### Your media journal

**Media** (in the bar at the bottom on a phone, beside **Map** at the top on a wider screen, or **Tools → Media journal**)
gathers every film, series, episode, book, anime, podcast, game, song and video your entries mention. It finds the
references Add media writes, the short `imdb:`, `youtube:`, `spotify:` and `musicbrainz:` forms, and listening notes.

- Each title appears once, grouped by kind, with what you last did (**Watched**, **Reading**, **Want to watch**…), the date
  and how many times it comes up. Open a title to see every mention; **Open in writing** goes to that spot.
- Find a title, or show one kind, or only what you want to, are in the middle of, or have done. "Done" and "Want to" come
  from the words you wrote before the link; a title you only mentioned shows as **Mentioned**.
- **Download media journal** saves a separate `.jot`: one dated entry per day, listing that day's media with what you did.
  Your journal is not changed. Open the file in Writer like any other journal.
- Nothing is fetched to build the view; the catalog link on a title opens only when you choose it. Scratchpads, code and
  hidden comments are not counted. Locking the journal clears the view.

## Local writing suggestions

The workspace can reuse names already in the open journal. It does not search other journals or contact a service.

- Type `#` or `@` followed by part of a tag/context to find existing names.
- Start a Markdown link such as `[See](#river` to find an existing entry or record by its date, ID or label. Choose a result to
  finish the link. With an empty label (`[](#river`), the result supplies the entry/record name. Ambiguous duplicate targets are
  not offered. Ordinary headings without dates or record IDs do not become link targets.
- Inside a `measurement` record, type `metric:`, `unit:` or `scale:` and part of a value. Metrics come from existing measurement
  records; units come from records for the same metric, and scales come from existing scale records. Different units stay
  separate choices. Selecting a metric does not fill or overwrite units, scales or values.

Suggestions appear after a short pause. Down/Up chooses a suggestion; Enter or Tab inserts the chosen one. Enter without choosing
still adds a newline. Escape dismisses suggestions, and Control/Command+Space shows them again. Pointer selection works too.
Insertion is undoable and replaces only the current tag, link or field value. Suggestions stay off while composing IME text or
writing in code, metadata or hidden comments. Unrecognised writing is left as it is.

Choose **Tools → Writing options**, then uncheck **Local suggestions** to turn them off. Only that preference is remembered;
the suggestion index stays in page memory and is rebuilt from the current journal. Opening another journal does not reuse the
previous document's names.

## People, places and reference books

**People & Places** opens a local reference-book manager. Create a book such as `people.jot` or `places.jot`, or open existing
plain-text `.jot` files. Books stay separate from the current journal. Add a person or place, save the record to the book, then
**Download book** to keep a file. “Remember these books in this browser” is optional; when off, loaded books last only for this
page. Browser copies are not a substitute for downloaded files. Unloading removes a book from suggestions, not from your disk.

People can store display and alternative names, given/family names, pronouns, organization, several emails/phones/websites, a
postal address, a reference to a place, and notes. Places can store alternative names, kind, two address lines, city/locality,
region, postal code, country and two-letter country code, WGS84 latitude/longitude in decimal degrees, optional elevation and
coordinate accuracy in metres, IANA timezone, phone/websites, directions, accessibility notes and general notes. No address,
coordinates or timezone are detected, inferred, geocoded or fetched. Coordinates must be supplied as a valid pair; timezone is
checked against the browser's IANA support. Accuracy is supplied by you, not inferred from the number of decimal places.

Example reference-book content (fictional):

```jot
:::record person #person-robin
label: Robin
alias: Bird
notes: A friend from the writing group.
:::

:::record place #place-river
label: Riverside café
address-line1: Example Street
locality: London
country-code: GB
latitude: 51.5
longitude: -0.12
timezone: Europe/London
accessibility: Step-free entrance
:::
```

With the relevant book open, start `[Meet](#Robin` or `[](#Riverside` in the journal and choose a suggestion. The result is a
normal link such as `[Robin](people.jot#person-robin)` or `[Riverside café](places.jot#place-river)`. Alternative names and a
place's city/region/country can help find it. Existing explicit destinations, for example `[](places.jot#River`, restrict the
search to that book. IDs remain stable when you rename someone or a place, and the book filename is part of the reference.

Clicking such a link in the workspace opens the record in People & Places. A missing book prompts you to open it; no file or
website is fetched. Reference-book contents are not copied into journal downloads, `.jotz` files or HTML exports. Keep/share
referenced files separately when needed; exported HTML retains a relative link, without the book's private details or interactive
manager. Outside the workspace, cross-file navigation depends on the reader. Sharing a reference book shares its data: it is
plain text, not encrypted. An OpenStreetMap link appears for valid coordinates, but contacts the map provider only if clicked.

A place's `timezone` describes that place. It does not change entry times or override the document's `Timezone` metadata.
Person/place numeric fields, such as coordinates or postal codes, are not treated as measurement/chart data.

## A pen and ink for one entry

When the page is handwritten, an entry can have its own pen and ink. Put the cursor in the entry and choose
**Pen and ink for this entry** (under **Tools**, or in the **Format** menu). Writer adds two plain lines under the date:

```jot
### 2026-11-03 | Tuesday

@hand: script10
@ink: green

Today in the broad pen.
```

Pens are `script05`, `script07`, `script10`, `pen`, `print` and `marker`; inks are `blue`, `black`, `green`, `purple`,
`brown` or a colour such as `#8a2d1a`. `default` goes back to your page settings.

- **Earlier entries never change.** The lines style their own entry, its date included, and nothing before it.
- **Only this entry** (the default) keeps the next entry looking as it did: if needed, Writer adds `@hand: default`
  lines there. **This entry and the ones after it** lets later entries follow until one chooses its own.
- In live editing the lines show as small **Pen** and **Ink** chips; **Change** opens the same dialog.
- Pen and ink only change how the handwritten page looks. The typed look, copying, search and screen readers get the
  same text. Choose a dark ink so the writing stays easy to read.

## Entry timezone overrides

Declare a document default in the optional top metadata, then override a particular dated entry with `@timezone:`:

```jot
---
Jot: 1.0
Timezone: America/Los_Angeles
---

### 2026-10-28 | In London
@timezone: Europe/London

o Call at 09:00

### 2026-10-29 | Back to the default

o Another call at 09:00
```

The override applies to the whole entry, ending at the next dated heading, even if that heading has the same date. It does not
carry forward, rewrite a date/time, or use a linked place's timezone. Put the directive below the entry heading. Invalid or blank
zones are warnings and leave that entry unresolved, rather than falling back to the device or document. Duplicate directives
warn; the last applies. A directive in the undated preamble warns; use metadata for a document default. Code and comments stay literal.

In **Write**, place the cursor in an entry and choose **Entry timezone**. Choose an IANA timezone or UTC, or **Use document default**
to remove the override. The page and HTML export show the effective zone beside the dated heading. Edits can be undone.

Calendar export resolves local timed events using their entry/document zone and writes unambiguous UTC instants. Explicit RFC 3339
event timestamps with offsets retain their own instant. Missing timezone information stays floating; an invalid declared zone,
a nonexistent spring-forward time or a repeated fall-back time stops timed export with an explanation. For an ambiguous hour,
use an event record with a complete offset-bearing timestamp, such as `start: 2026-11-01T01:30:00-05:00`. All-day dates and
ordinary date-based queries keep their written calendar dates.

## Current time and location in Chromium

**Insert current time** inserts the actual current date/time as a complete timestamp with an explicit offset. It uses the entry
zone when declared, otherwise the document zone. If neither is declared, this explicit capture action uses the browser's zone
and records the offset in the inserted timestamp; it does not resolve or reinterpret older writing. An invalid declared zone
must be fixed first. The timestamp always uses the actual current date, even when the entry is backdated. One Undo removes it.
No timestamps are automatically inserted while typing or on save.

**Capture location** opens a review dialog. **Get current location** makes one Chromium geolocation request, which requires HTTPS
or localhost and may show the browser's permission prompt. The browser's location service may use network providers according to
its settings. “Prefer a more precise position” is optional; the result's supplied accuracy is shown rather than promising GPS precision.
There is no background watching or geocoding, and no address or physical timezone is inferred from the browser's device timezone.

After reviewing latitude, longitude, available accuracy/elevation and the capture instant, choose **Insert location in entry**
(to insert a plain place record, including its coordinates), or **Save as a place…** (to review/name it in a separate reference
book). Nothing is added on permission grant alone. Denial, unavailable positions, timeouts and results arriving after the dialog
closes leave the journal unchanged. The one-time browser request itself has no cancellation API; closing discards its result.
Location inserted in the journal travels with that file when shared. Buttons are keyboard accessible and tested in Chromium.

## Daily entries and longer recaps

Jot prescribes no word count or duration for an entry, although applications and packages have file-size limits. A dated heading
starts an entry; it can describe a day, an ongoing topic or a longer recap. Daily entries and weekly/monthly recaps can coexist.
The recap's heading date identifies the entry, while a period record explicitly describes what it covers:

```jot
### 2026-11-01 | Sunday

Today's writing.

### 2026-11-01 | Weekly recap

:::record period #week-2026-10-26
label: Week of 26 October
start: 2026-10-26
end: 2026-11-02
:::

What mattered this week?
```

Period ends are exclusive, so this covers 26 October through 1 November. A monthly recap can use `start: 2026-10-01` and
`end: 2026-11-01`. A plain “Weekly recap” heading without a date stays inside the preceding dated entry. These are ordinary
entries with explicit coverage, not new typed week/month navigation modes. A recap timezone describes that recap only; it never
changes the original entries it references. Link to its period record ID when repeated dates would make a date-only link ambiguous.


## Show the document filename

Write `{{document.filename}}` where you want the current filename to appear in a preview or formatted page:

```jot
# Notes from {{document.filename}}
```

For a file called `October.jot`, this displays **Notes from October.jot**. The extension is included; folders are not.
Writer uses a connected/opened file's name, or its proposed download name for a new journal. Renaming an unconnected document
through **Document name** above the writing updates the preview. Click the name to edit it; Enter confirms it and Escape
restores the previous name. You can also choose **Tools → Rename document**. With a connected device file, press Enter or the
heading's **Save as…** button to choose the new file; the original is kept. Cancelling leaves the original connected and the
proposed name available to retry. Its actual name remains in the filename variable until Save as succeeds. The template editor uses the generated file's name; VS Code uses the open document's name.

The source and plain `.jot` source export keep the variable. Source/live editing shows its spelling; Page preview, print and formatted
HTML export show the name. A formatted export captures the name at export time. An included journal displays its own filename.
The name does not supply dates or other journal information.

Use backticks or escape the first brace (`\{{document.filename}}`) to show the variable literally. Code blocks, metadata and
record data stay literal. This is only a filename display variable: there are no expressions, scripts or file lookups.
If a renderer does not know the filename, or does not support variables, it can leave `{{document.filename}}` visible.

The editable name above Writer is a screen control. To show the filename at the top of a printed or exported document, put
`# {{document.filename}}` at the beginning of the writing. Renaming the document does not add or rewrite a heading in its source.
