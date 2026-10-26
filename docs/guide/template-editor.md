# Using the template editor

The template editor builds the **shape** of a journal: what each day, week and month asks of you. It gives you a plain-text `.jot`
file with a dated entry for every day, ready to fill in by hand on any keyboard, a phone or InkDeck.

It runs in your browser. Your template stays in that browser and nothing is sent anywhere.

## In five steps

1. Open the **Template editor** (the second link at the top of the site).
2. Give the journal a **name** and pick the **month**.
3. Choose **Start from…** for a ready-made shape, or keep the one you have.
4. Change the blocks until each day asks what you want it to ask. The right-hand side shows the file as you go.
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
| **Choose words** | `[[calm · tired · hopeful]]` and a line | writing the words that fit on the line |
| **List** | `- ` or `1. ` lines | writing after each one |
| **Time blocks** | `- 08:00 `, `- 10:00 ` … | writing what happens after each hour |
| **Table** | a table with empty rows | typing in the gaps between the bars |
| **Words to keep** | your own text, as you typed it | (nothing: it is a reminder or an instruction) |
| **Record** | a record with named fields | typing after each field name |
| **Page title** | `## Season theme` (before or after the days only) | (nothing: it starts a named page) |

Every block has **options** (the ⚙ button): its title, its labels (one a line), its numbers. A scale always keeps a real range: if
"To" is lower than "From", it is raised to fit.

## Arranging blocks

- **Drag** a block by its handle (⠿) to a new place, in the same zone or another one. A purple line shows where it will land; a red
  line means it can't go there (a page title only goes before or after the days).
- **↑ and ↓** move a block one place, from the keyboard too.
- **Zone**, in a block's options, moves it to another zone.
- **Duplicate** (in the options) makes a copy below; **✕** removes a block.
- **Undo** and **Redo** take back a change (or Ctrl+Z and Ctrl+Shift+Z when you are not typing in a field). Typing in one field is a
  single step.

## The file on the right

The right-hand side is the file you will download, updated as you work. Above it:

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

## Bringing in a print layout

If you have a day layout from the Journalwright print editor (a `daypage.json` file), **More → Import a print day layout** turns it
into your **Each day** blocks. Blocks that only make sense on paper (sketch boxes, photos, puzzles) and the printed data (moon,
holidays, events) are left out, and the message names them. **Undo** takes the import back.

## With InkDeck

InkDeck is writing firmware for the Xteink X3/X4 e-ink readers with a Bluetooth keyboard.

1. In the editor, set **Files** to **A file a week (fits InkDeck)** and download. InkDeck opens files up to 16 KB; a month with many
   blocks a day can go over that, and the editor warns you when it does.
2. Copy the files to the device's SD card.
3. On InkDeck, open this week's file and write: type after `[ ] `, after `value:`, and under the headings.
4. Copy the files back to your computer whenever you like. Opening one in the editor still brings the template back.

New files you make on InkDeck itself are `.jot` too, with the metadata block already at the top. Name them by date (`2026-10-26.jot`),
or start them with a `### 2026-10-26` heading, so they know which day they belong to.

## Printing a book

The print engine in this project (the `journal/` folder) can print your filled-in `.jot` writing into a monthly book, after each
week's pages. It runs from the command line; see its README. You don't need it to keep a Jot journal.

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
