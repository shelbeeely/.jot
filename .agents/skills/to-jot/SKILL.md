---
name: to-jot
description: Generate, edit, convert and validate Jot journals and templates (.jot and .jotz). Use for plain-language requests, guided interviews, new journals, planners, prompts, trackers, method records and fixing invalid Jot, as well as turning source material into Jot. Use when asked to convert, import, journal or "make a jot" from text, notes, chat logs, emails, transcripts, meeting notes, calendar exports, CSV or health/fitness exports, Markdown/Obsidian/Day One/Notion exports, or photos, scans and PDFs of pages. Produces canonical, dated plain-text Jot that `node cli/jot.mjs check` accepts, without inventing dates or values.
---

# Generate and validate Jot

Jot is plain text: Markdown plus a few line marks, dated headings and `:::record` blocks. The result must read well in any
text editor, keep the writer's words, and pass strict validation with no errors or warnings. Repository tool paths below are relative to the Jot repository root; the bundled validation script works from any directory. The syntax is in `reference/cheatsheet.md`; worked examples (input, then output) are in `reference/`.

## Choose the conversation

- **Plain-language brief:** “Make a gentle weekly planner with room for meals.” Turn that request directly into a useful first
  draft. Use ordinary language with the user; they do not need to learn Jot syntax, record fields or profile names.
- **Guided interview:** “Interview me and make my journal.” Ask one short question at a time, starting with “What would you like
  this journal to help you with?” Offer a few examples if useful, and let the user skip any question or say “make it now”.
- **Existing material:** use the conversion procedure below. Do not interview the user again about information already supplied.

For an interview, adapt the next question to the answers. Learn only what is needed: the purpose, whether the result is a blank
reusable template or a filled entry, the sections that would help, and any requested dates or cadence. For a filled entry, ask
about actual experiences in the user's own terms. Do not make every question mandatory, demand personal disclosures, infer a
diagnosis, or turn uncertainty into invented facts. For a template, ask about helpful prompts rather than personal history.

Once there is enough information, briefly reflect back the intended structure, create the file and strictly validate it. Do not
require an approval step unless a material ambiguity prevents a useful result. If the user wants to revise it, update the same
draft and validate again. Keep technical validation details in the delivery message rather than in interview questions.

Distinguish supported output formats from proposals: this runtime currently validates `.jot` and `.jotz`. The planned multi-document container is `.jotbook`. Do not rename an archive
to `.jotbook` and claim support or book validation before its container reader and validator exist.

## Create from a brief

When the user asks for a new journal, planner, template or tracker rather than a conversion:

1. Use the requested purpose, dates and fields. Draft prompts and headings freely when authoring is requested; keep sample or
   fictional entries clearly labelled. Never present invented experiences or measurements as the user's facts.
2. If dates are unspecified, make an undated template. For an explicit request for “today”, use the session's user timezone and
   date. Use real ISO dates for a dated template; keep weekday labels optional rather than guessing them.
3. Write UTF-8 `.jot`. Leave answers and measurements blank. Use a `measurement` record for each metric, retain requested units,
   and add chart or query records only when requested and supported by the reference. Prefer simple prose to invented syntax.
4. For a method record, read its actual version, record type and required fields in `specification/profiles.json` (or the bundled
   `reference/profiles.json`). Check these manually: parser success does **not** prove full profile compliance.
   When designing a template or tracker for a method, and inside this repository, skim that method's guide in `docs/methods/`
   (index: `docs/methods/README.md`), especially any health or safety note: it says what to include, what to avoid (streaks,
   missed-day counts, colour-only meaning) and when the method is meant for use with a clinician.
5. Save the file, validate the actual saved bytes, repair diagnostics and rerun. Validate again after every subsequent edit or
   packaging step. Never claim validation from inspecting text, or from a successful run on an earlier draft.

A minimal undated tracker (not a record of real measurements):

```jot
---
Jot: 1.0
Title: Daily check-in template
---

## Check-in

What would make today easier?

[ ] One small task

:::record measurement #sleep
metric: sleep
unit: h
value:
:::
```

## Run validation

Find this skill's absolute directory from the agent's skill listing. Run with Node.js 22 or later; no npm install is needed:

```sh
node /absolute/path/to/to-jot/scripts/validate.mjs /absolute/path/to/journal.jot
node /absolute/path/to/to-jot/scripts/validate.mjs --json /absolute/path/to/journal.jot
```

The script checks one or more `.jot` or `.jotz` files, never edits them, and fails on **errors or warnings**. It uses the bundled
canonical CLI in the downloadable skill, or finds the repository above the installed skill/current directory. If needed, specify
`--repo /absolute/path/to/.jot`. Repository equivalent: `node cli/jot.mjs check --strict journal.jot`.

- Exit 0: parser/package validation passed, no errors or warnings. Report this exact scope.
- Exit 1: invalid input or diagnostics. Fix the cause and rerun; do not deliver it as validated.
- Exit 2 from the wrapper: validator/setup failure. Report that validation did not run; never infer success.
- Review meaning too: dates, wording, units, task states, unique IDs, reference targets and profile requirements. A clean parser
  cannot prove factual accuracy, all attachment references, rendered appearance or every profile constraint.
- Deliver the saved file and state the command, exit status and any remaining limitations. If the runtime is unavailable, label
  the result **unvalidated** rather than claiming it is valid.

## Rules that are never bent

- **Never invent.** No made-up dates, years, times, weekdays, values, units, names, places or tasks. If the source does not say
  it, the journal does not say it. A guess you think is useful goes in a margin note marked as a guess, or is left out.
- **Undated stays undated.** Material without a date goes before the first dated entry, under a plain heading such as
  `## Undated`. Never after one: a dated entry runs until the next dated heading, so anything below it (even under another
  heading) takes its date. Never assign it "today" or the file's modification time unless the user tells you to. A relative date
  ("Thursday", "tomorrow") may be resolved only from an explicit date in the same source, and only when unambiguous; say so in
  a margin note (`[[ date from "thursday" in the 20 October messages ]]`). Otherwise keep it as written.
- **Keep the original wording.** Reorganise into Jot structure, fix nothing silently. Don't summarise, correct spelling, change
  tone or translate unless asked. If you must leave something out (signatures, quoted email history, boilerplate), say so in
  your reply.
- **Private by default.** Journals are personal. Do all work locally. Never upload journal content, paste it into web tools or
  send it to a service. Don't fetch anything the user did not ask for.
- **No diagnosis or inference.** Record what was written or measured; never add interpretations ("seems depressed", "probable
  ADHD", "low mood") or clinical labels the source does not contain.

## Procedure

1. **Look at the input.** Note its kind, its date format (and whether day or month comes first: `03/04/2026` is ambiguous;
   ask, or look for a day above 12 elsewhere in the file), its timezone if times are given, and whether it is one day or many.
2. **Use the existing tools first** when they fit; then review and fix their output by hand:
   - A plain-text diary (dated paragraphs, Project Gutenberg, an old text export):
     `node converter/jot-convert.mjs diary.txt -o diary.jot` (`--year YYYY` only when the user gives the starting year;
     `--calendar julian` for Old Style dates; see `converter/README.md`).
   - A CSV of numbers by date (sleep, steps, weight, a fitness or health app export):
     `node cli/jot.mjs import data.csv --into journal.jot --dry-run`, then without `--dry-run`. It fills days, keeps units from
     headers like `Sleep (h)`, and never overwrites a value. Add `--day-first` only when that is known.
   - If `node cli/jot.mjs help` lists `import-health`, use it for Apple Health / Health Connect exports instead of hand-copying.
3. **Otherwise write the Jot yourself** (the usual case for chats, emails, meetings, notes and Markdown exports):
   - Start with metadata only when it helps:
     ```
     ---
     Jot: 1.0
     Title: <short title from the source, or one the user gives>
     Source: <where it came from: file name, app, URL>
     ---
     ```
   - One heading per day: `### YYYY-MM-DD | Weekday` (compute the weekday from the date; keep a written date that says more,
     such as `### 2026-03-04 | Wednesday, 4 March (the original header)`). Entries in date order unless the user wants the
     source order. Put a month heading (`# March 2026`) above a long run of days if it helps.
   - Inside a day, keep the writing as paragraphs, and convert only what is unambiguously one of these:
     - tasks: `[ ] open`, `[x] done`, `[-] cancelled`, `[>] moved`, `[!] important` (a checkbox, "TODO", "action item")
     - events: `o 14:30 Standup` or `o Dentist at 4pm` (a time only when the source gives it; no time means all day)
     - questions to come back to: `? …`; ideas: `! …`
     - `#tag` for tags the source already uses (Obsidian/Notion tags, hashtags); `@context` for places or people the source
       marks that way. Do not invent tags.
     - `[[ … ]]` on its own line for a margin note: your own remark (for example, where a section came from).
   - Speakers in chats and transcripts: one list item per message, in order: `- **Name** (14:02): text`. A message that is a
     task, event, question or idea keeps its line and also gets its mark below the messages.
   - Numbers go in records only when the value is explicit in the source:
     ```
     :::record measurement #sleep-2026-10-20
     metric: sleep
     unit: h
     value: 7.25
     source: sleep.csv
     :::
     ```
     Metric and field names are lowercase with dashes. One id per record, unique in the file (`#<metric>-<date>` works).
     An empty value means "not recorded"; never write `0` for a missing value.
   - Method profiles (`specification/profiles.json`, e.g. `cbt-thought-record`, `dream-journal`, `symptom-tracking`,
     `gender-euphoria-and-hrt-log`, `habit-tracking`) only when the source clearly is that kind of record. Add
     `method: <id>@1` and the fields that the source fills. Never force writing into a form, and leave profile fields out
     rather than inventing them.
4. **Escape accidental marks.** A source line that begins with something Jot or Markdown would read as structure, and is not
   meant as structure, gets a backslash in front: `\o well, never mind`, `\? is what she wrote`, `\! important`,
   `\[x] in the margin`, `\# not a heading`, `\---`, `\===`, `\:::`, `\.5 mg`, `\> not a quote`, `\- not a list`; a leading number and dot (`2026. was a year`) becomes `2026\. was a year`.
   Remove leading indentation from prose (four spaces makes a code block). The cheat sheet has the full list.
5. **Images, scans, photos, PDFs.** Transcribe only what you can read; mark unreadable parts `[illegible]` rather than guessing.
   Keep the original with the writing as an attachment, which needs a packaged `.jotz`:
   ```
   :::record attachment #page-2026-10-20
   path: assets/page-2026-10-20.jpg
   media-type: image/jpeg
   alt: <what the image shows, in words>
   ocr-status: unreviewed
   :::
   ```
   Write the `.jot` first, then package it with the images: open it in the site's workspace (`/write/`) and attach them, or
   call `pack({ source, assets })` from `parser/container.mjs`. A plain `.jot` must never contain binary data or base64.
6. **Validate and fix.** Run the validation script above (or `node cli/jot.mjs check --strict out.jot`). Fix every error and
   warning, then rerun until exit 0. For invalid dates, check the source; leave an uncertain date as prose rather than guessing.
   Do not suppress warnings to pass. Validate the final `.jotz` too if packaging attachments. Inspect parsed tasks/events when
   relevant with `node cli/jot.mjs tasks out.jot` and `node cli/jot.mjs events out.jot`.
7. **Report.** Tell the user what file you wrote, how many dated entries (first and last date), what stayed undated, anything
   left out or uncertain, and the result of `check`.

## Worked examples (in `reference/`)

- `chat-log.txt` → `chat-log.jot`: timestamped messages by day, a TODO as a task, "thursday" resolved from the dated messages
  with a margin note, the untimestamped last line moved up to `## Undated` before the first day, `o well` left as text inside a message.
- `sleep.csv` → `sleep.jot`: metadata written first, then `node cli/jot.mjs import sleep.csv --into sleep.jot`; the day with
  empty cells gets no entry and no zeros.
- `brain-dump.txt` → `brain-dump.jot`: no dates at all, so no entries; a task, a question and an idea marked; `# of plants`,
  `o no` and `1. sleep` escaped; indentation dropped; the count stays prose because it has no date.

## Inputs and what usually works

| Input | Approach |
| --- | --- |
| Plain-text diary, Gutenberg book | `converter/jot-convert.mjs`, then review |
| Chat log, SMS, Slack/Discord export | One day heading per date; messages in order with speaker and time as written |
| Email | Date from the `Date:` header; subject as a `####` heading; body as written; quoted history left out (say so) |
| Meeting notes, transcript | Date heading; decisions as prose; action items as `[ ]`; next meeting as `o` only if dated |
| Calendar export (CSV, or .ics where your permissions allow reading it) | `o HH:MM Title` under each date; tasks as `[ ]` with the date they are due. This repository's Claude Code settings deny reading `.ics` (personal data): ask the user for a CSV export or pasted events rather than working around it |
| CSV / health / fitness export | `jot import` (or `import-health` if present); otherwise measurement records |
| Markdown, Obsidian, Notion, Day One | Keep Markdown; daily-note file names or `date:` front matter give the date; `- [ ]` may stay or become `[ ]` |
| Photos, scans, PDFs of pages | Transcribe what is legible; attachment record with alt text; package as `.jotz` |
| Brain dump, undated notes | No date heading; tasks, questions and ideas marked; the rest as written |
