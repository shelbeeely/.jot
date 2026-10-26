# Converting an old diary

Have a diary as plain text: an export from another app, notes you kept in a text file, or a published diary from Project Gutenberg?
The converter turns it into Jot: one dated entry for each day, ready to read in the workspace, print, or keep writing in.

There are two ways to use it, and they give exactly the same files:

- **In your browser:** the **Converter** page of this site. Nothing is uploaded: the diary stays on your device.
- **From the command line** (Node 20 or newer), for scripts and many diaries at once: the `converter/` folder of the Jot project.

## In the browser

1. Open the **Converter** (in the links at the top of the site).
2. Press **Open a text file** and choose the diary, or drop it on the page, or press **Paste text** and paste it.
3. Read the summary: how many entries, from when to when, and any warnings. Change the **Options** if it asks you to (a starting
   year, the Old Style calendar); the result updates at once.
4. Press **Download this file**. A big diary is split into several files: pick one to look at, or **Download all (.zip)**.

**From a web address** fetches a plain-text file straight from another site, but only from sites that allow it. Project Gutenberg
doesn't: download the **Plain Text UTF-8** file first, then open it.

Everything below works the same on the page: each command-line option has a control with the same name.

## On the command line, in three steps

1. Save the diary as a plain-text file (UTF-8). On Project Gutenberg, choose **Plain Text UTF-8**.
2. Run the converter on it:

   ```
   node converter/jot-convert.mjs my-diary.txt > my-diary.jot
   ```

3. Read what it says about the result (how many entries, from when to when), then open `my-diary.jot`.

## What you get

Each day the diary marks becomes an entry. The date as it was written stays after the `|`, so nothing is lost:

```jot
---
Jot: 1.0
Title: The Diary of a Nobody
Author: George Grossmith Weedon Grossmith
Source: https://www.gutenberg.org/ebooks/1026
Converted-with: jot-convert
---

### 1888-04-03 | APRIL 3

Tradesmen called for custom, and I promised Farmerson, the
ironmonger, to give him a turn if I wanted any nails or tools.

### 1888-04-08 | APRIL 8, Sunday

After Church, the Curate came back with us.
```

- Anything before the first dated day (a title page, an introduction) is kept at the top.
- An editor's note in square brackets becomes a **margin note**, `[[ … ]]`.
- A line that would look like a Jot mark (a line starting `o `, `#` or `1660.`) gets a backslash before it, so it stays plain writing.

## Dates it understands

The date has to start a paragraph:

| The diary says | It becomes |
| --- | --- |
| `January 1st, 1888.` or `3 April 1888:` | that day |
| `APRIL 3.—Tradesmen called…` | 3 April, in the year it is in |
| `“_20th Jan._—To London…` | 20 January (quote marks and italics are fine) |
| `Jan. 1st (Lord’s day).` | 1 January, with "Lord's day" kept |
| `2nd. In the morning…` | the 2nd of the month it is in |
| `JANUARY 1659-1660` on a line of its own | a heading: from here on, the year is 1660 |

A date needs something to end it: a full stop, a dash, a colon or the end of the line. So "March 18th, 1884, the monument was
unveiled" in the middle of an introduction stays text.

## When the diary doesn't say the year

Some diaries never write the year (*The Diary of a Nobody* only says "APRIL 3."). The converter then finds no days and tells you to
give one:

```
node converter/jot-convert.mjs nobody.txt --year 1888 > nobody.jot
```

After December comes January of the next year, so one starting year is enough.

## Old Style dates (before 1752)

England used the old Julian calendar until 1752, ten or eleven days behind ours. Jot dates are always the modern (Gregorian) calendar,
so for a diary like Samuel Pepys's, add `--calendar julian`. Each entry then has its modern date, and the date Pepys wrote stays
after the `|`:

```jot
### 1660-01-11 | Jan. 1st (Lord’s day) (1660-01-01 Old Style)

This morning (we living lately in the garret,)
I rose, put on my suit with great skirts, having not lately worn any …
```

You don't have to know: if the diary names its weekdays ("Lord's day", "Sunday") and they fit the Old Style calendar better, the
converter says so and suggests `--calendar julian`.

## Big diaries

The Jot tools open files up to 1 MiB. A long diary is split by year (and a year that is still too big, by month). Give a folder for
the files:

```
node converter/jot-convert.mjs pepys.txt --calendar julian --out-dir pepys/
```

That makes `pepys/the-diary-of-samuel-pepys-1660.jot`, `…-1661.jot` and so on. `--per year` or `--per month` splits a smaller diary
too; `--name pepys` gives shorter file names.

## Straight from the web

The converter reads standard input when you give `-` instead of a file name, so a download can go straight in:

```
curl -sL https://www.gutenberg.org/cache/epub/1026/pg1026.txt | node converter/jot-convert.mjs - --year 1888 > nobody.jot
```

## Other options

| Option | What it does |
| --- | --- |
| `-o file.jot` | write to a file instead of the screen |
| `--notes keep` | leave `[editor's notes]` as they are; `--notes drop` leaves them out |
| `--title`, `--author`, `--source` | set the metadata (read from a Project Gutenberg file without asking) |
| `--force` | replace files that are already there (otherwise it stops rather than overwrite) |
| `-q` | no summary |

## Diaries to try

The three below are already converted on the [Examples](../../site/dist/examples/) page: read them in the workspace or download the
files, and compare them with your own conversion.

Project Gutenberg has hundreds of public-domain diaries and logbooks; search for "diary", "journal" or "logbook" and pick **Plain
Text UTF-8**. Three that convert well:

- **The Diary of Samuel Pepys** (ebook 4200): ten years, every day; use `--calendar julian`.
- **The Diary of a Nobody** by George and Weedon Grossmith (ebook 1026): a comic diary of 1888–89; use `--year 1888`.
- **My Diaries 1888–1914** by Wilfrid Scawen Blunt (ebooks 79491 and 79492): diary entries inside a narrative; the years come from
  the chapter titles.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| "No dated entries found" | The diary never states a year: add `--year`. If it does, its dates may be written in a way the converter doesn't know |
| "fit the Julian (Old Style) calendar" | Run it again with `--calendar julian` |
| "is not UTF-8 text" | Open the file in a text editor and save it as UTF-8 |
| "already there" | Choose another folder or `--name`, or add `--force` to replace the files |
| "more than the 1 MiB" | Use `--out-dir` so it can split the diary |
| A day is in the wrong year | The diary jumped back in time without saying so. Fix the `###` line by hand: it is just text |
