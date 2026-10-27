# Turning anything into Jot

Notes in a phone app, a chat with a friend, meeting minutes, a spreadsheet of sleep hours, an Obsidian vault, a photographed page:
most of what you would want in a journal already exists somewhere else. This guide covers two helpers for bringing it into Jot:
an **agent skill** that tells an AI coding agent how to write good Jot, and **`jot check`**, which says whether a file is valid.

## Check any .jot file

`jot check` reads one or more journals and lists anything the Jot rules would trip over, one line each, with where it is:

```
node cli/jot.mjs check october.jot notes.jot
october.jot:41:1 error unclosed-record Record consumes through end of file. Add ::: to close it.
2 files: 1 error, 0 warnings
```

- An **error** (an unclosed `:::record`, the same record id twice) makes it exit with 1, so a script or a CI job can stop.
- A **warning** (a date that does not exist, like `2026-02-30`) is listed but still passes; add `--strict` to fail on warnings
  too.
- `--json` prints the same list as JSON. Packaged `.jotz` journals are read too.

Nothing is changed and nothing leaves your computer.

## The to-jot agent skill

The Jot project includes a skill called **to-jot**: written instructions an AI agent follows when you ask it to turn something
into a journal, generate a new template, or fix an invalid Jot file. It lives in the project at `.agents/skills/to-jot/`, where OpenAI's Codex finds skills, and Claude Code finds the
same folder through `.claude/skills/to-jot`. There is one copy, so both agents work the same way.

Open the Jot project in either agent and ask in your own words:

- "Create an undated daily check-in template and validate the saved file."
- "Turn `chat-export.txt` into a jot."
- "Make a journal from these meeting notes, one entry per meeting."
- "Import `sleep.csv` into `2026-10.jot`."

The skill tells the agent to:

1. **Use Jot's own tools first:** the converter for plain-text diaries ([Converting an old diary](converting.md)) and
   `jot import` for numbers in a CSV ([Automation and connections](automation.md)).
2. **Write the rest by hand in Jot's form:** a `### YYYY-MM-DD | Weekday` heading for each day, tasks, events, questions and
   ideas marked only where the material clearly has them, and numbers in records only where the value is written down.
3. **Escape** any line that would accidentally read as a Jot mark (`o well, never mind` becomes `\o well, never mind`).
4. **Run `jot check --strict`** on the final saved file and fix every error and warning before saying it is validated.

## Describe it, or build it through a conversation

You do not need to know Jot's syntax. Ask for what you want:

- “Make a gentle weekly planner with space for meals and one small priority.”
- “Interview me and create a journal template that fits how I write.”
- “Ask me about my day, then turn my answers into a Jot entry.”

The agent can draft directly from your brief or ask one short question at a time. You can skip questions, change the direction,
or say “make it now”. A template has blank answers; a filled entry uses only the experiences you describe. Once it has enough
information, the agent writes the file, validates it, and lets you revise it without learning the file format.

## What the skill will not do

- **Invent anything.** No guessed dates, years, times, numbers or units. Notes without a date stay undated, at the top
  before the first day (a dated entry runs on until the next date, so anything below it would take its date). A weekday like "Thursday" is turned into a date only when the material itself
  pins it down, and a margin note says so.
- **Rewrite you.** Your words stay as they were: no summarising, tidying or translating unless you ask.
- **Diagnose.** It records what was written or measured, never what it might mean.
- **Send your writing anywhere else.** The skill reaches no service. The agent you use does read the material, so its
  provider's privacy terms apply; keep anything you would not share out of the folder you ask about.

## What comes out

A messy chat, for example:

```
[2026-10-20 09:14] Robin: are we still on for the pottery class thursday?
[2026-10-20 09:16] Me: yes!! 6:30pm right?
[2026-10-20 09:20] Me: TODO buy apron
? what do I do with the wonky bowl
```

becomes:

```jot
## Undated

? what do I do with the wonky bowl

### 2026-10-20 | Tuesday

- **Robin** (09:14): are we still on for the pottery class thursday?
- **Me** (09:16): yes!! 6:30pm right?
- **Me** (09:20): TODO buy apron

[ ] buy apron

### 2026-10-22 | Thursday

o 6:30pm Pottery class

[[ date from "thursday" in the 20 October messages ]]
```

The skill's `reference/` folder has this example in full, a CSV of sleep hours and an undated brain dump, each with the
original beside the result, and a one-page summary of Jot's marks.

## Pictures, photographed pages and PDFs

The agent transcribes only what it can read and marks the rest `[illegible]`. To keep the original picture with the writing, the
journal becomes a packaged `.jotz`, with an attachment record that describes the picture in words:

```jot
:::record attachment #page-2026-10-20
path: assets/page-2026-10-20.jpg
media-type: image/jpeg
alt: A page of handwritten notes with a sketch of a mug
ocr-status: unreviewed
:::
```

Open the `.jot` in the workspace (**Write**) and attach the pictures there, and it saves the `.jotz` for you.

## Validate from any directory

The skill includes a strict validation helper. Replace the skill path with its installed location:

```sh
node /path/to/to-jot/scripts/validate.mjs /path/to/journal.jot
node /path/to/to-jot/scripts/validate.mjs --json /path/to/journal.jot
```

It uses the same parser and package checks as `jot check --strict`, requires Node.js 22 or later, and needs no npm install.
The downloadable skill bundles the validator; a repository installation finds the project automatically. An installed copy without
that runtime can use `--repo /path/to/.jot`. Errors and warnings fail validation. Missing tools are reported as a setup failure.

A successful check proves that the parser/package checks passed. The agent must also review source fidelity, dates, units and
method profile fields; parser success alone does not establish factual correctness or full profile compliance.
