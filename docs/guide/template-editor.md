# Using the template editor

The template editor builds the **shape** of a journal: what each day, week and month asks of you. It gives you a plain-text `.jot`
file with a dated entry for every day, ready to fill in by hand on any keyboard, a phone or InkDeck.

It runs in your browser. Your template stays in that browser and nothing is sent anywhere.

## In five steps

1. Open the **Template editor** (the second link at the top of the site).
2. Give the journal a **name** and pick the **month**.
3. Choose **Start from…** for a ready-made shape, or keep the one you have.
4. Change the blocks until each day asks what you want it to ask. The right-hand side shows the handwritten page as you go; **Text** shows the source file.
5. Press **Download .jot**. Open the file in any text editor and start writing.

## The five zones

Everything you add goes in one of five places:

| Zone | Where it appears in the file |
| --- | --- |
| **Before the days** | Once, at the top of the month: a season theme, a plan, contacts |
| **Each week begins** | Under "Week of …", before that week's days: priorities for the week |
| **Each day** | Under every date, for the whole month |
| **Each week ends** | After the week's last day: a review, what to carry forward |
| **After the days** | Once, at the end: looking back, closing the month |

A zone you leave empty adds nothing. If nothing happens weekly, the file has no week headings at all.

## Starters

**Start from…** replaces the blocks with a ready-made shape (the name and month stay):

- **Daily check-in:** energy, a few care boxes, a line for the day, a weekly look back
- **Rapid log:** tasks, events and notes as they come, with a monthly plan
- **Morning pages:** a prompt and room to write, every day
- **Gratitude:** three small good things a day
- **Day planner:** top three, time blocks and a done list
- **Weekly dashboard:** the week at a glance in six widgets (top priorities, tasks, a schedule, a habit table, a chart of your
  numbers and a scratchpad), with sleep, work hours, steps and mood to write in each day. See [Numbers and charts](#numbers-and-charts)
- **Start empty:** just the dates and a place to write

## Blocks

Press **Add a block** in a zone and pick one. Here is what each block puts in the file, and how you fill it in:

| Block | In the file | You fill it in by |
| --- | --- | --- |
| **Writing space** | `#### Notes` | writing under the heading |
| **Prompt** | `#### What do I need today?` | writing under the question. Give it several questions and they take turns, one a day |
| **Checkboxes** | `[ ] Stretch` for each label | changing `[ ]` to `[x]` |
| **Task lines** | empty `[ ] ` lines | typing a task after `[ ] ` |
| **Scale** | a rating with an empty `value:` | typing a number after `value:` |
| **Ratings** | several things on one scale | typing a number after each name |
| **Fill-in blanks** | `sleep-hours:` and the like | typing after each name |
| **Numbers** | a measurement for each number, with its unit and an empty `value:` | typing a number after `value:` |
| **Week chart** | a chart record naming the numbers and the week's dates | (nothing: the page preview draws it from your numbers) |
| **Choose words** | `[[calm · tired · hopeful]]` and a line | writing the words that fit on the line |
| **List** | `- ` or `1. ` lines | writing after each one |
| **Time blocks** | `- 08:00 `, `- 10:00 ` … | writing what happens after each hour |
| **Table** | a table with empty rows | typing in the gaps between the bars |
| **Words to keep** | your own text, as you typed it | (nothing: it is a reminder or an instruction) |
| **Record** | a record with named fields | typing after each field name |
| **Page title** | `## Season theme` (before or after the days only) | (nothing: it starts a named page) |

Every block has **options** (the ⚙ button): its title, its labels (one a line), its numbers. A scale always keeps a real range: if
"To" is lower than "From", it is raised to fit.

## Size blocks on the handwritten grid

The editor opens in **Page** view with one sample day. Open **Paper and grid settings** to choose A5, A4, Letter or Pocket paper,
4–7 mm dots and a minimum margin. Margins are rounded outward so the writing area holds whole grid rows and columns.
Choose **Whole selected file** to include weekly blocks, reviews and the beginning and end of the month.

Select an outlined block on the page, or open its ⚙ options:

| Setting | What it does |
| --- | --- |
| **Minimum rows (0 = Auto)** | Reserves space for the entire block, including its heading. Auto uses the space its content needs. |
| **Blank rows after** | Leaves 0–20 grid rows before the next block. |
| **Start on new page** | Starts the block on the next page when it is not already at a page boundary. |

For example, **8 rows** at **5 mm** reserves **40 mm** vertically. Drag the selected block's bottom handle to change its minimum
in whole rows. You can also focus the handle and use **Up/Down**, or type a number in the labelled field. Undo and redo include sizing.

The page shows each block's actual row count, page boundaries and the space left on the last page. Handwritten text is centred
between the dot rows; checkboxes sit in the first grid cell with task text starting at the next grid column. A block that fits a page moves to
the next page if necessary. A block taller than a page continues across pages; writing beyond a minimum expands the block without
clipping it. These are full-width blocks in reading order; side-by-side columns are not supported.

Layout settings stay in saved templates and downloaded `.jot` files as optional hidden comments. Open a downloaded file in **Write**
to keep its paper, grid and reserved space for handwritten preview, **Print / PDF** and **Download page** HTML export. The outlines,
row badges and resize handles are editor guides and are not exported. Plain-text readers keep the writing and may ignore layout hints.
Use your browser's default print margins and 100% scale; printer-specific physical proofs are still recommended.

Adding layout hints increases file size. The existing 16 KB warning still applies for InkDeck; choose weekly or daily files if needed.

## Numbers and charts

Checkboxes say yes or no. Numbers say how much: hours slept, hours worked, steps, a mood from 1 to 5. Write them as numbers and a
chart shows the week at a glance, so you can see whether sleep is holding steady or where the hours went.

1. Add a **Numbers** block to **Each day**. Put one number a line, with its unit in brackets: `Sleep (h)`, `Work (h)`, `Steps`.
   **Scale**, **Ratings** and **Fill-in blanks** make numbers too.
2. Add a **Week chart** to **Each week begins** (or **Each week ends**). In its options, list the numbers to chart by name (`Sleep`,
   `Steps`), or leave the list empty to chart all of them. Choose a line or bars.
3. Each day, write the number after `value:`. Leave a day blank if you didn't track it: the chart leaves a gap, it doesn't count a
   zero.

Each number gets its own small chart: the days of the week along the bottom, the values up the side, a dashed line at the week's
average and a line of figures above it (`avg 7.2 h · 6–8.5 h · 6/7 days`). A number with a scale (mood 1 to 5) is charted on that
scale. Under the charts, **The numbers** opens the same figures as a table.

A chart in **Before the days** or **After the days** covers the whole month.

The charts are drawn by the **Page** view here, by the workspace (**Write**) and by the Jot extension for VS Code. In the file itself a
chart is a short record that says what it charts, so the file stays plain text:

```jot
:::record chart #chart-week-2026-10-05
metrics: sleep, steps
start: 2026-10-05
end: 2026-10-11
style: line
:::
```

### A weekly dashboard

A week page is easiest to take in with 5 to 7 widgets: about as many things as working memory holds at once (George Miller's "magical
number seven", 1956; later research puts it nearer four, one more reason to keep the page short). The **Weekly dashboard** starter
has six. When **Each week begins** holds more than seven blocks the editor says so, and changes nothing: it is a nudge, not a rule.

## Arranging blocks

- **Drag** a block by its handle (⠿) to a new place, in the same zone or another one. A purple line shows where it will land; a red
  line means it can't go there (a page title only goes before or after the days).
- **↑ and ↓** move a block one place, from the keyboard too.
- **Zone**, in a block's options, moves it to another zone.
- **Duplicate** (in the options) makes a copy below; **✕** removes a block.
- **Undo** and **Redo** take back a change (or Ctrl+Z and Ctrl+Shift+Z when you are not typing in a field). Typing in one field is a
  single step.

## The file on the right

The right-hand side is the file you will download, updated as you work. **Text** shows it as plain text; **Page** shows it the way a
journal reader does, with the charts drawn. When the template has a chart, **Sample numbers** fills the empty days with made-up
numbers so you can see what a filled-in week will look like (they are never written to the file). **Handwritten** shows the page
written by hand on a dot grid (see [Handwritten pages on a dot grid](writing-jot.md#handwritten-pages-on-a-dot-grid)). Above it:

- **valid Jot**, or the problems found, if any (there should not be any: the editor checks its own output);
- how many days the file holds and its size;
- a warning when a file is too big for InkDeck (see below).

## Downloading

**Files** sets how the month is split:

- **One file for the month:** one `.jot` file, named like `my-journal-2026-10.jot`.
- **A file a week (fits InkDeck):** five or six files, one per week, each named by its first day (`my-journal-2026-10-05.jot`).
  The month's opening blocks go in the first file and the closing ones in the last.
- **A file a day.**

Press **Download .jot**. When there are several files your browser may ask once whether this site may download more than one file;
allow it.

## Filling it in

Open the file in any text editor and write. A filled-in day might look like this:

```jot
### 2026-10-05 | Monday

#### Energy

:::record measurement #energy-2026-10-05
metric: energy
scale: #scale-energy
value: 2
:::

#### Care

[x] Meds
[x] Water
[ ] Outside

#### Today

A slow start, then a good walk with Sam.
```

- Leave anything blank that you don't want to answer. Nothing is required.
- Don't worry about breaking the file: if a line looks odd, it is kept as writing. See [Writing in Jot](writing-jot.md) for all the
  marks you can use.

## Changing the template later

Every `.jot` the editor makes carries its template, in a hidden note at the very end of the file (you can ignore it; journal readers
don't show it). To change the shape later, even after you have started writing:

1. **More → Open a .jot or a template…**
2. Choose any file the editor made, filled in or not (a `.jotz` with the writing inside works too).

The template comes back exactly as it was. A `.jot` written anywhere else has no template inside; the editor says so and changes
nothing.

You can also keep the template as its own file: **More → Save template (.json)**, and open it the same way.

## With InkDeck

InkDeck is writing firmware for the Xteink X3/X4 e-ink readers with a Bluetooth keyboard.

1. In the editor, set **Files** to **A file a week (fits InkDeck)** and download. InkDeck opens files up to 16 KB; a month with many
   blocks a day can go over that, and the editor warns you when it does.
2. Copy the files to the device's SD card.
3. On InkDeck, open this week's file and write: type after `[ ] `, after `value:`, and under the headings.
4. Copy the files back to your computer whenever you like. Opening one in the editor still brings the template back.

New files you make on InkDeck itself are `.jot` too, with the metadata block already at the top. Name them by date (`2026-10-26.jot`),
or start them with a `### 2026-10-26` heading, so they know which day they belong to.

## Privacy

- The template is kept in this browser only (if the browser allows it). Clearing the site's data removes it, so save a copy with
  **Save template** or keep a downloaded `.jot`.
- Nothing you type is uploaded. Files you open are read in the browser and checked; nothing in them can run.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| "over the 16 KB InkDeck opens" | Choose **A file a week**, or fewer blocks a day |
| "This .jot has no template in it" | The file was made somewhere else. Build the template again, or open a `.jot` the editor made |
| "That file is not a Jot template, a .jot or a day layout" | Check you picked the right file |
| Only one of several files downloaded | Allow the site to download several files, then press **Download .jot** again |
| The template is gone after a while | The browser cleared its storage. Open one of your downloaded `.jot` files to get it back |
