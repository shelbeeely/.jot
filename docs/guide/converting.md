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
Author: George Grossmith and Weedon Grossmith
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

- **The Diary of Samuel Pepys** (ebook 4200): almost every day from January 1660 to May 1669; use `--calendar julian`.
- **The Diary of a Nobody** by George and Weedon Grossmith (ebook 1026): a comic novel written as a diary, first serialised in
  *Punch* in 1888–89. It never says the year; `--year 1888` matches when it appeared.
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

## Your life online

Years of posts are a diary too. **Your life online** (on the **Converter** page, or `converter/jot-archive.mjs` on the command line)
reads the data exports that services let you download and writes one dated journal from all of them: each post under its day, with
its time and where it came from, and nothing retyped. Like the diary converter, it all happens on your device.

### Getting your exports

Each service has its own "download your data" page. Menus move, so look for these words if a step has changed:

| Service | Where | Choose |
| --- | --- | --- |
| **X / Twitter** | Settings → Your account → Download an archive of your data | the whole archive (a .zip; it can take a day to arrive) |
| **Mastodon** | Preferences → Import and export → Data export → Request your archive | the archive (.zip) |
| **Facebook** | Settings → Accounts Centre → Your information and permissions → Download your information | **JSON** format (not HTML), all time; posts are enough |
| **Instagram** | the same, in Accounts Centre | **JSON** format, all time |
| **Tumblr** | your blog's settings → Export | the .zip it emails or offers |
| **Reddit** | reddit.com/settings/data-request | the data request (.zip of CSV files) |
| **Google** (Keep, Blogger) | takeout.google.com | Keep and Blogger (the rest is skipped) |

### What comes in, and what stays out

Your own posts, replies, notes and blog posts come in. Other people's words don't, unless you ask: reposts, retweets, boosts and
reblogs are an option, as are your comments (Facebook, Reddit), Instagram stories and the names of places you checked in at.

**Never read:** messages, contacts, friends lists, logins, IP addresses, ads data and location coordinates. **Never written:** like
and share counts. Every file is marked `Privacy: private`. A post without a readable time is left out and counted, never given a
guessed date.

### What you get

One `.jot` a year (or a month, or one in all), dated in the time zone you choose (where you mostly lived; the files say which in
`Timezone:`). Each post looks like this:

```jot
### 2018-10-10 | Wednesday

#### 21:19 · X / Twitter

First frost on the allotment & the kale survived. https://example.org/frost

[[photo in the X / Twitter archive: data/tweets_media/1050000000000000001-photo.jpg]]

#garden

[Original](https://x.com/sample_writer/status/1050000000000000001)
```

Photos stay in your export, with a margin note saying where; or choose **Inside the journal** and each year becomes a `.jotz`
carrying its photos (up to 60 MB a year; the rest stay notes). Google Keep lists become tasks you can tick.

### On the command line

```
node converter/jot-archive.mjs twitter.zip facebook.zip takeout/ --list
node converter/jot-archive.mjs twitter.zip facebook.zip takeout/ --out-dir my-life/ --time-zone Europe/London
```

`--reposts`, `--comments`, `--stories`, `--places`, `--from`, `--to`, `--per year|month|none` and `--media note|attach|none` match the
page's choices; `--help` lists them all. Exports over 2 GB: unzip them and give the folder.

The Jot desktop app (`desktop/` in the project) runs the same page and reads exports of any size straight from the ZIP, a file
at a time, refusing files that would unpack to more than 1 GiB or point outside the export. It is built from source for now: see
`desktop/README.md`.

### Before you start

Old posts can bring back things you weren't expecting. You choose the dates and what comes in, and nothing is shown to you on its
own: the journal waits until you open it.

Not yet: Bluesky, LinkedIn, WhatsApp and other chat exports, Google Photos, YouTube history and location history. MySpace lost most
of what people posted before 2016 in a server migration and offers no export; public profile pages may survive in the Internet
Archive's Wayback Machine, as web pages rather than an export this can read. If your export looks different from what the importer
expects (services change their formats), it says it found nothing; please tell us what the files are called, never send the export.
