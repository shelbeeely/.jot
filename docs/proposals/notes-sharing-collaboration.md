# Proposal: notes, selective sharing and collaborative journaling

Status: design draft; nothing in this proposal is implemented. It extends Jot v1 (`.jot`, `.jotz`) and the `.jotbook`
proposal ([jot-books.md](jot-books.md)), and the writer, Jot Writer (`site/dist/write/`).

Research basis: the methods library in `docs/methods/`, copied from
[shelbeeely/Journaling `docs/journaling/methods`](https://github.com/shelbeeely/Journaling/tree/main/docs/journaling/methods)
at snapshot `f67a54dd20c9` (see `specification/source-register.md`). For this proposal the full guides were searched for
sharing, therapists and clinicians, partners, annotation and rereading, not only their first 150 lines. Citations below
are `file, line` in `docs/methods/`.

## 1. What the research asks for

| Need | What the guides say | Source |
| --- | --- | --- |
| Private by default | "The research kept it private. Sharing is a separate decision." | [expressive-writing.md](../methods/expressive-writing.md), 443 and 602 |
| Summaries, chosen, not raw logs | Avoid "sharing raw overload logs automatically via scans or exports. Summaries only, by choice." | [autistic-sensory-journaling.md](../methods/autistic-sensory-journaling.md), 691 |
| Showing a housemate or clinician | The sensory profile is "useful to show a housemate or a clinician." | [autistic-sensory-journaling.md](../methods/autistic-sensory-journaling.md), 198 |
| A therapist reads a weekly record | In DBT "the individual session usually starts with the therapist reading the card." | [dbt-diary-card.md](../methods/dbt-diary-card.md), 215 |
| A one-page hand-over | "Appointment summary: one page: top 3 concerns, counts, changes, questions." | [symptom-tracking.md](../methods/symptom-tracking.md), 138 and 318 |
| Clinician conversations improve | Mood charts improve "conversations with prescribers and therapists." | [mood-tracking-year-in-pixels.md](../methods/mood-tracking-year-in-pixels.md), 586 |
| A record for prescribers | Requested by clinicians (claimed). | [adhd-journaling.md](../methods/adhd-journaling.md), 483 |
| Made together | A safety plan is "meant to be made *together* with a clinician or a trusted person, in your own words"; a friend can help, or "show it to your clinician later." | [safety-planning.md](../methods/safety-planning.md), 52 and 176–177 |
| Partners in a plan | Couples Crisis Response Plan: "a partner is involved in making and using the plan." | [safety-planning.md](../methods/safety-planning.md), 368 |
| Working it out together | CBT's "collaborative empiricism": therapist and client test thoughts "together". The therapist assigns columns week by week. | [cbt-thought-record.md](../methods/cbt-thought-record.md), 136 and 244–250 |
| Code words | "You can use a code word or a symbol you both understand"; "spoons" as a family code word; code words if the book is found. | [dbt-diary-card.md](../methods/dbt-diary-card.md), 684; [spoon-theory-energy-accounting.md](../methods/spoon-theory-energy-accounting.md), 77; [gender-euphoria-and-hrt-log.md](../methods/gender-euphoria-and-hrt-log.md), 497 |
| Accountability partners | Habit contracts "signed with a partner"; a "follow-up buddy". | [habit-tracking.md](../methods/habit-tracking.md), 331; [passion-planner.md](../methods/passion-planner.md), 822 |
| Social sharing has costs | "Social sharing of entries. Privacy rules and performance pressure." | [gratitude-journaling.md](../methods/gratitude-journaling.md), 602 |
| Other people's words | "Use roles. People's comments in a personal journal can still be shared later." | [design-iteration-and-critique.md](../methods/design-iteration-and-critique.md), 178 |
| Later notes on earlier writing | Mark passages, wait one to a few weeks, then transfer what still stands out; add "see also" links. | [commonplace-book.md](../methods/commonplace-book.md), 204 and 268 |
| Rereading has value | People enjoy rereading ordinary records "far more than they predict". | [five-year-diary.md](../methods/five-year-diary.md), 50 |
| Notes move to where they belong | The Period Log is "a feeder": entries move to the section they belong to. | [progoff-intensive-journal.md](../methods/progoff-intensive-journal.md), 152 |
| Annotations not by colour alone | "Annotations do not rely on colour alone." | [design-iteration-and-critique.md](../methods/design-iteration-and-critique.md), 184 |
| Don't invent the record | "Leave them blank. Don't reconstruct." | [symptom-tracking.md](../methods/symptom-tracking.md), 596 |

The guides describe three different things: notes you add to your own writing later, a copy of chosen parts for a named
reader, and writing done with another person. They are designed separately below. All three stay plain text.

## 2. What Jot already has

- **Margin notes** `[[...]]` (spec §4.2): a single-line aside, rendered beside the writing.
- **Hidden comments** `/* ... */` (§4.2): omitted from rendered pages, kept in editable exports, never secret.
- **Privacy labels** `private`, `shared`, `public` on the document and on records (§2.2, §9). They are intent labels, not
  access control; the effective value is the more restrictive.
- **Authors** on the document and on records, and the rule that words are never reassigned to another author (§9).
- **Links** to record IDs and dated headings, a derived "Linked from" line, and `other.jot#id` links (§4.2.1).
- **`response` records** and the `shared-journal@1` profile (§13.48) with `author`, `audience` and `consent`.
- **Sharing rules** (§9): a share command selects content and removes, not hides, what is excluded; default sharing excludes
  private content and hidden comments and strips precise locations.

Missing: a note anchored to a passage, a way to say who a selection is for and repeat it, the share command itself
(the roadmap lists "export-redaction implementation" as next), per-person authorship of prose, and merging copies.

## 3. Notes and annotations

Three layers, from lightest to most structured. The first two exist; the third is new.

1. **Margin note** `[[call the pharmacy]]`: an aside written in the flow, by the writer, at the time.
2. **Hidden comment**: a drafting note to yourself that never prints and is never shared by default.
3. **Note record**: a note written later, or by someone else, about a specific place in the journal.

```jot
:::record note #reread-rain
on: #2026-10-25
quote: the rain on the window
author: writer-a
written: 2026-11-02
body: A week later this still stands out. Copy it to the REST page.
:::
```

- `on` is a link target as already defined (a record ID, a dated heading, or `other.jot#id`). No new link syntax.
- `quote` is optional exact text inside the target, so a note can point at a phrase without adding markers to the
  writing. If the text is not found (it was edited), the note stays attached to the whole target with an
  `unanchored-note` warning; nothing is deleted.
- A note never changes the text it is about. Replies are notes whose `on` is another note: `on: #reread-rain`.
- `privacy`, `author` and `method` work as on any record. A note is an ordinary record, so readers that don't know the
  type still show it.
- Rendering: in the margin beside the target (or after it on narrow screens and in reading order for screen readers),
  labelled with author and date in words, never by colour alone. The phrase named by `quote` gets the existing
  highlight stroke with a text label.
- **Notes in their own file.** Notes can live in a separate `.jot` whose records point at `journal.jot#id`. That is how a
  therapist, partner or friend comments without touching your file, and how you keep a "second reading" layer apart. A
  reader shows them in the margin only when both files are open together (a workspace folder or a `.jotbook`), following
  the existing rule that a reader does not open other files on its own.

Writer: select text, press **Note**, write. The writer adds `on` (the nearest record or dated heading) and `quote`,
proposing an ID for a target that has none. A Notes panel lists notes by date and author and jumps to each target.

## 4. Sharing parts of a journal

Sharing is a **share copy**: a new file containing only what the writer chose, made for a named reader. The source journal
is never changed, uploaded or opened to anyone else. Jot sends nothing; the writer hands the copy over however they
choose (email, print, a shared folder, a USB stick).

### 4.1 Saying who it is for

An `audience` record names a reader and remembers what usually goes to them, so next week's copy is one step:

```jot
:::record audience #therapist
label: Therapist
include-method: dbt-diary-card@1
include-method: cbt-thought-record@1
include-tag: #for-therapy
period: last 7 days
notes: mine
attachments: no
:::
```

- Selection by method, tag, record ID, date range or dated entry. The selection unit is a dated entry, a record, or a
  paragraph or list item containing a chosen tag; a share never cuts a sentence in half.
- `notes`: `none`, `mine` or `all` (other people's notes need their consent, below). Margin notes follow `notes`; hidden
  comments are never included.
- Typical audiences from the guides: a **therapist** (DBT card, thought records, mood chart; dbt-diary-card.md 215),
  a **doctor** (an appointment summary; symptom-tracking.md 318), a **partner** (chosen entries, a shared plan),
  a **friend** (one entry or a gratitude list), a **housemate** (a sensory profile; autistic-sensory-journaling.md 198).
  These are suggestions in the writer, not built-in roles.

### 4.2 Making the copy

1. **Preview.** The writer shows exactly what the reader will get, and separately what is left out and why
   (`private` record, not selected, hidden comment, location, another person's words without consent).
2. **Private stays out.** A `private` record or document is excluded even when it matches the audience. The person can
   include it for this copy only from the preview, with a plain warning; the source label is not changed (§9).
3. **Remove, don't hide.** Excluded content is absent from the text, the PDF, metadata, thumbnails and the package's
   assets and manifest. A link to something not shared becomes its plain label. Author IDs become the display names the
   writer chooses (or roles). Precise places are stripped unless chosen.
4. **No traces of omission.** The copy does not say how many entries were left out or show gaps that reveal them. Counts
   appear only in the writer's preview. (This needs a spec note: §8's omitted-content counts apply to summary
   renderings, not share copies.)
5. **Formats.** `.jot` (or `.jotz` with chosen attachments), standalone HTML, or PDF via print. Summaries, charts and
   queries are rendered into the copy as text and tables, so a reader needs no Jot software
   (mood-tracking-year-in-pixels.md 586; autistic-sensory-journaling.md 691).
6. **Code words stay code words.** The copy never expands abbreviations or code words (dbt-diary-card.md 684).
7. **Optional share log.** If the writer wants to remember what a reader has seen, the writer adds a record like the
   existing `sync` record: `:::record share-log #share-therapist` with `audience:`, `on:` dates and `sent:` IDs. It is
   off by default and never displayed in renders.

### 4.3 Protections

- **Only the writer starts a share.** No "request access", read receipts, "last shared" indicators or reminders to share.
  This guards against pressure from a partner or anyone else (gratitude-journaling.md 602).
- **Not a crisis channel.** A shared journal is not monitored. The share dialog and a shared safety plan say who to
  contact instead, following the plan's own steps (safety-planning.md 207).
- **Files are readable by anyone holding them.** The dialog says so plainly; Jot does not claim encryption (§9).
- **No inference.** Share copies, like the journal, contain no scores, diagnoses or interpretations Jot computed beyond the
  existing charts and queries (symptom-tracking.md 683).

## 5. Collaborative journaling

The guides describe several shapes: a dialogue journal between two people, a plan made with a clinician or partner, a
weekly card a therapist reads, an accountability partner, a household chore list, and a team worklog
([interstitial-journaling.md](../methods/interstitial-journaling.md), 360). Jot supports them without a server.

### 5.1 Who wrote what

In a shared document, an `@author:` directive marks who is writing from that point, in the style of `@layout:`:

```jot
---
Jot: 1.0
Title: Sam and Alex
Person: writer-a Sam
Person: writer-b Alex
Privacy: shared
---

### 2026-10-25 | Sunday

@author: writer-a
The rain on the window kept me in all day.

@author: writer-b
I liked that line about the rain. Walk tomorrow?
```

- `Person:` metadata (repeatable) maps local IDs to display names; the display name is not stored elsewhere.
- Records keep their own `author` field, which wins over the directive. A note's `author` is always explicit.
- A reader shows a name beside each change of author (text, not colour alone).
- Editing someone else's words is a **suggestion**: the writer stores a `correction` record pointing at the passage
  instead of changing it in place. The original author accepts it, which then edits the text. Words are never
  reassigned (§9).

### 5.2 Ways to set it up

- **One shared file, taking turns** (dialogue journal, couple's journal, household chores): a `.jot` both people edit.
  Writing is append-mostly by date, which keeps conflicts rare.
- **Your journal plus their notes file** (therapist, mentor, accountability partner): each person owns one file; the
  other person's file holds `note` records pointing into yours (section 3). Nobody edits anybody else's file.
- **A book with a chapter per person and a shared chapter** (family or group): the `.jotbook` proposal, with chapter
  ownership recorded in the manifest.
- **Made together, in one sitting** (safety plan, thought record with a therapist): one file, one screen, both names in
  `Person:`; the plan's own records carry `author` for each part if wanted.

### 5.3 Copies coming back

People exchange files by their own means, so two copies can diverge. The writer offers **Merge another copy**:

- Matches dated entries, record IDs and author blocks; new material from either side is added.
- When both sides changed the same block, both versions are kept, side by side, with a visible choice (§9). File
  modification times never decide.
- Merging never deletes the other person's words without that choice, and the preview lists every change before saving.

Live, simultaneous editing and synced storage are not part of this proposal. They need accounts or a sync service,
encryption and a threat model (roadmap: "Threat model, encrypted backups"), and would be a separate decision.

### 5.4 Consent for other people's words

A share copy that would include another person's words (their notes, their `@author` blocks, a quoted message) shows this in
the preview. It is excluded by default unless that person's `consent` record in the document allows it:

```jot
:::record consent #alex-ok
author: writer-b
allows: share
audience: #therapist
:::
```

Roles instead of names remain available in every copy (design-iteration-and-critique.md 178).

## 6. Changes this needs

| Area | Change |
| --- | --- |
| Specification | `note` record (`on`, `quote`, `written`), `unanchored-note` warning; `audience` and `share-log` records; `@author:` directive and `Person:` metadata; share-copy rules (section 4.2), including the omission-count exception; merge rules; `consent` fields `allows` and `audience` |
| Parser | Attach notes to targets through the existing link resolver; `selectForAudience(source, audience)` returning a new source built from whole source byte ranges (no AST serialization needed); author spans |
| Tests | Privacy: no excluded bytes, assets or metadata in any share format; quote re-anchoring; merge keeps both sides; consent excludes another author by default; conformance fixtures |
| CLI | `jot share journal.jot --audience therapist -o copy.jot` and `jot merge a.jot b.jot -o merged.jot` with a printed report |
| Jot Writer | Note button and Notes panel; Share dialog with preview and saved audiences; Merge another copy; suggestion mode |
| Agent skill | Generate audiences and summaries on request; never share or send anything itself |

## 7. Delivery order

1. Notes: spec, parser, rendering and the Writer's Note button. Useful to one person on day one.
2. Share copy with preview and audiences, starting with `.jot` and standalone HTML, plus the privacy tests.
3. `@author:` and `Person:` for shared files; suggestion mode.
4. Merge another copy.
5. Notes files and per-person chapters inside `.jotbook`, once books exist.

## 8. Open questions

1. Should notes made by someone else default to a separate notes file (safest), or be allowed inside your journal?
2. Is a share log wanted at all, given that it records what was shared inside the journal itself?
3. Should the Writer offer ready-made audiences (therapist, doctor, partner, friend), or start blank?
4. Is synced or live collaboration ever wanted? If so, it needs its own threat model before any design.
