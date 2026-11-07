# Small things in October

A fictional journal for 1–31 October 2026, with one entry for every day and a saved 3D scene for each day of
the first week (1–7 October). Names, experiences,
measurements and recordings are demonstration material. Nothing here describes a real person's journal.

Open [demo-month.jotz](demo-month.jotz) in **Write → Open**. It carries the writing and attached files together, including
the saved scenes. Reading it does not need an AI connection or a provider account. Prepare Writer for offline use once,
then the saved journal can be opened without a connection. External media references remain links; the songs, films and
books they name are not downloaded.

The readable authoring source is [demo-month.jot](demo-month.jot). Open the `.jotz` for the complete demonstration: the
source file alone does not carry its pictures, recordings, models or scenes.

Both archives include stable entry identities, archive metadata and a portable public SQLite search index. This demo
explicitly includes that index even though its writing is below the normal 256 KiB threshold. A normal Writer save
may omit an unnecessary small-journal index; local search still reads the same source. Attachments retain their
original bytes and readable names, while archive members use UUID identities.

## Look around

1. Open **Scenes**, choose a day from 1–7 October and turn its place. Choose a named thing beside it to read the sentences it holds.
   **Open journal** shows the corresponding entry; **Go to this entry** returns to the writing. Try a rainy day and
   **Pause motion**, or use reduced motion in Writing preferences. [See the first week as scenes](scenes.html) shows the same
   scenes on their own, without Writer.
2. Open **Map** to follow the month, cross-entry links and tag threads. Choose an entry, then **Open in writing**.
3. Open **Media** to browse the book, film, series, anime, podcast, game and music references. Compare a mention with
   an explicit activity such as Reading or Watched. **Download media journal** saves a separate writing-only copy.
4. Choose **Tools → Page preview** to read the finished pages. Compare Typed styles with Handwritten, change paper,
   then try **Page view**, **Download page**, **EPUB ↓** or **Print / PDF**. These page exports are unencrypted.
5. Switch between **Live editing** and **Source editing**. Tick a task, edit a phrase, try Undo, and save a separate
   `.jotz` copy. Browser autosave and a downloaded or device-saved file are separate copies.

## Find a feature

The prose stays a journal; the examples are spread through the month.

| Feature | Entry or place to look |
| --- | --- |
| Dated entries, headings, tasks, events, ideas and questions | 1 October, then throughout the month |
| Open, done, moved, scheduled, cancelled and important task markers | 1 October |
| Markdown emphasis, links, lists, quotes and tables; highlights, underline, superscript and footnotes | 1, 3, 4, 15 and 17 October |
| Inline ink, colored highlights, marker/brush/pencil strokes, colored underline and strikethrough | 11 and 15 October |
| Tags, contexts, links to days and record IDs, backlinks and Map threads | Throughout; 23 and 31 October |
| Record fields, multiline values, named scales and repeated measurements | 1 October onward |
| An attached image and a saved weather observation | 2 October |
| A model with a description, poster and selectable hotspots; Draco, meshopt and KTX2 compressed model studies | 5 October |
| Editable handwriting with its image and frozen page background | 6 October |
| A flip card with an answer behind a tap and a fold-over printed form | 7 October |
| Attached audio and video, explicit playback and print fallbacks | 8 October |
| A document timezone and an entry override | Metadata and 9 October |
| Palette swatches and a moodboard with local pictures, captions and credits | 11 October |
| A line chart with its text summary and data table | 12 October |
| Music references and a practice session | 13, 14 and 27 October |
| All eight media kinds, with wanted, ongoing, completed and mentioned activities | 4, 13, 14 and 27 October |
| Literal code, escaped marks and preserved diagram source | 15 October |
| An attached PDF and an included local `.jot` | 19 October |
| People and place links | 23 October; reference books stay separate from journal data |
| Missing measurements and observed zero kept distinct | 24 October |
| A bar chart | 25 October |
| A scratchpad retained in source and omitted from pages | 26 October |
| Queries over tasks, events, entries and numbers | 28 and 31 October |
| A period record and a monthly recap | 31 October |
| Per-entry pen and ink | 6 and 7 October |
| Margin notes, time labels, page breaks and a document filename variable | 1, 21 and 31 October; the preamble |
| An independently readable saved scene tied to the day's own sentences | 1–7 October in Scenes; the other days show how a day without a scene looks |
| A5 page settings and a bounded block layout hint | Page-settings comment before the first entry; the monthly numbers section |

The scene-generation tool uses Writer's actual scene pipeline: `journalDays` extracts the day's prose, `placePrompt`
numbers its sentences, `requestJSON` asks OpenRouter for scene data, and `validatePlace` replaces sentence numbers with
the entry's exact words. Scratchpads, hidden comments, code and records are excluded. Model-returned text never replaces
the journal's writing. Saved scenes live in [demo-scenes/](demo-scenes/) and carry the model and generation time.
The seven saved scenes were generated through OpenRouter with `openai/gpt-6.1-sol` at `max` reasoning effort, using the
scene prompt's `rich` detail level (40 to 100 objects and up to 600 shapes instead of Writer's usual 8 to 20 objects and 80 shapes), with Zero Data Retention required and
data collection denied. Each scene's object, shape and exact sentence-link counts, generation time and hashes are
recorded in [the provenance index](demo-scenes/index.json).

Choose an object to see its saved sentences. Editing a sentence later leaves its saved scene unchanged, and Writer
marks an old moment as no longer in the entry. To make a fresh scene with your own model, configure the AI companion
for the session, then choose **Make this day's scene** and review what will be sent. A new scene is a draft until
**Keep it**. Reading a saved scene makes no AI request.

## Try protection

[demo-month-mixed.jotz](demo-month-mixed.jotz) is a second copy for exploring public and protected entries. Its demo
passphrase is **`jot-demo-only`**. It is public demonstration material; this published passphrase offers no privacy.

Open the mixed copy and choose **Cancel** in the unlock prompt to read the public entries while locked. The 31 October entry is protected. All attached files,
saved scenes and archive settings are protected too, including attachments referenced by public entries. Unlock with
the demo passphrase to explore the complete journal, then reload Writer, cancel the unlock prompt and try **Search public entries**. Private text is
searchable only while unlocked, and never enters the portable public search index. Dates and encryption metadata
remain visible.

In an unlocked copy, **Tools → Entries, privacy and search** lets you change which entries are public. **Ways in** lets
you explore changing a passphrase, adding a recovery code, or enrolling a PRF-capable passkey where supported. Save a
new copy after changing protection. Earlier copies keep their earlier settings. Keep a recovery code separately from
the journal; real passkeys, password managers and recovery routes must be set up on your own device.

## Tools to try on a copy

Some Writer features are actions or local preferences, rather than content a journal can contain.

| Workflow | Try it in Writer |
| --- | --- |
| Writing and navigation | Find & replace, Outline, Tools search, Keyboard shortcuts, formatting, list continuation and Undo/Redo |
| Starting and continuing | Entry templates, Today, Quick note, Carry tasks forward and Week review; time-sensitive actions use the current day, so they may add entries after October |
| Scratchpad and margin notes | Open 26 October's scratchpad, select notes and Add to entry; add a margin note to any passage |
| Layout and preferences | Focus mode, writing size/spacing/width, high contrast, reduced motion, return-to-position, handwriting, dots, paper and page styles |
| Files and exports | Attached files → View / Download original; Save as, Download journal, plain Jot/Markdown exports, Calendar `.ics`, Numbers/Tasks `.csv`, standalone HTML, fixed-layout EPUB and print |
| Numbers and imports | Import a fictional numbers CSV or a supported sample health export; review before adding. Your life online converts supported data exports separately |
| Drawing | Annotate page; draw on a frozen page copy and reopen its editable strokes |
| Reference books | Open a People or Places book explicitly, try local suggestions, then unload it; books are separate files and are not automatically copied into a journal |
| Connected context and media | Review a weather or read-only Home Assistant snapshot; enable a catalog lookup or listening connection only if you want to contact that service |
| AI and voice | Configure the optional AI companion, review a draft, or make a new scene; Scribe, voice typing and voice practice each require their own explicit microphone action and any model setup |
| Keeping and transferring | Prepare offline use, request persistent storage, review an outgoing journal/excerpt, try system sharing or pair two devices for nearby transfer |
| Protection and recovery | Use the mixed copy above; test reload, unlock, relock, public/private search and a separately saved archive |

For the reference-book workflow, download [people.jot](people.jot) and [places.jot](places.jot), then open them explicitly
in **People & Places**. They match the links on 23 October and remain separate from the journal. For number import,
use [demo-numbers.csv](demo-numbers.csv), which contains fictional sample data.

Provider credentials, microphone recordings, speech-model weights, passkeys, browser preferences, file handles and device
permissions are not embedded in this demo. No service is contacted merely by opening the journal. Browser and device
support varies; an attached recording's codec, a PDF viewer, EPUB scripting and physical microphone/stylus behavior
still depend on the reader.

Jot remains a prototype. The 62 method profiles are a catalog of optional record structures; this month demonstrates
supported content and Writer workflows, rather than claiming 62 specialized clinical or method-specific applications.
Diagram fences and unfamiliar records preserve readable source; a diagram engine or full custom-layout renderer is
not supplied by putting that source in the journal. Planned features are not represented as working controls.

## Rebuild the demo

Packaging reads the saved scenes and does not call a model:

```sh
node tools/build-demo-journal.mjs
node cli/jot.mjs check --strict examples/demo-month.jot examples/demo-month.jotz
```

To generate or refresh scenes, configure `OPENROUTER_API_KEY` in your environment, then run:

```sh
node tools/generate-demo-scenes.mjs
node tools/build-demo-journal.mjs
```

This explicit command sends the extracted prose of each day whose entry has an `@setting:` line to OpenRouter using the model selected with `--model` or
`OPENROUTER_MODEL` (default `openai/gpt-6.1-sol`), at `--reasoning` effort `max` and `--detail rich` by default; `--max-tokens` (default
128000) is the output budget, reasoning included. Zero Data Retention is required by default and data collection is denied. It saves successful days
as it goes; rerunning reuses only scenes whose model, privacy policy, prompt, sentences and saved bytes still match.
The provenance index records those hashes and generation times without credentials. Missing credentials or failed
requests stop generation; no substitute scenes or silent model/privacy fallback is used. Review generated places in
Writer before publishing a rebuilt demo. Validation of the mixed archive also requires unlocking it; a syntax check
of its locked public source cannot establish validity of protected entries.
