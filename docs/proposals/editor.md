# Proposal: one editor for every method

Status: design draft and roadmap. Phase E0 is implemented (`DECISIONS.md`, 28 October 2026); the rest is not. It covers the writer, Jot Writer
(`site/dist/write/`), and the template editor (`site/dist/editor/`), and builds on the composable blocks track in
`specification/ROADMAP.md` and on [notes-sharing-collaboration.md](notes-sharing-collaboration.md).

Research basis: all 52 guides in `docs/methods/`. For each guide, sections 15 (digital and hybrid versions), 18
(pitfalls), 19 (accessibility and adaptations) and 25 (for Journalwright Studio) were read in full, and the health or
safety note where there is one. Citations are `file, line` in `docs/methods/`.

## 1. The question

The guides describe 52 practices, from a three-number check-in to a Progoff binder. No guide describes an editor that
fits them all. They do agree on how a journal tool should behave, and they disagree about some things a single editor
has to settle. This proposal takes the agreement as requirements, names the disagreements, and settles each one by
leaving the choice to the writer with the lower-demand option as the default.

Most section 25 material is written for a printed book and an e-ink companion (Journalwright Studio), not a screen
editor. It is used here by analogy: a block that a guide proposes for a printed day page becomes a block in Jot's
template editor, and a "don't adopt" for the e-ink device becomes a "don't adopt" for the browser. Where that transfer
is a judgement rather than something the guide says, the text says so.

## 2. What the research asks of an editor

### 2.1 Demand, gaps and return

| Need | What the guides say | Source |
| --- | --- | --- |
| Any amount is a complete entry | A check-in with "skipped" as a complete answer | [low-demand-check-in.md](../methods/low-demand-check-in.md), 15 |
| Nothing to catch up on | "There is nothing to catch up on. Start from today." | [low-demand-check-in.md](../methods/low-demand-check-in.md), 89 |
| No missed-day counts | "No 'missed days' counters, no 'you skipped' messages anywhere." | [adhd-journaling.md](../methods/adhd-journaling.md), 711 |
| Never back-fill | Blank dated pages after a gap lead to quitting; "never back-fill" | [adhd-journaling.md](../methods/adhd-journaling.md), 494 |
| Gaps stay gaps | "Leave them blank. Don't reconstruct." | [symptom-tracking.md](../methods/symptom-tracking.md), 596 |
| No catching up | "Journalwright Studio never asks you to catch up." | [passion-planner.md](../methods/passion-planner.md), 918 |
| No streaks | A broken streak shown prominently can lower engagement | [habit-tracking.md](../methods/habit-tracking.md), 155 |
| Small layouts | "More than 6-7 blocks overwhelms." | [adhd-journaling.md](../methods/adhd-journaling.md), 712 |
| Few trackers | "More than 5 habit slots in the default layout": overtracking is the most common failure | [habit-tracking.md](../methods/habit-tracking.md), 638 |
| Template bloat | "Delete any heading skipped twice in a week." | [digital-daily-notes.md](../methods/digital-daily-notes.md), 488 |
| Set-up is not the task | "Set-up becomes the task"; cap set-up | [adhd-journaling.md](../methods/adhd-journaling.md), 495; [digital-daily-notes.md](../methods/digital-daily-notes.md), 497 |
| Half counts | "half-fill counts; mark at the moment; totals not streaks" | [habit-tracking.md](../methods/habit-tracking.md), 444 |

### 2.2 Structure, choice and predictability

| Need | What the guides say | Source |
| --- | --- | --- |
| Predictable layouts | "predictable, identical layouts every day reduce decision load ... make novelty opt-in" | [adhd-journaling.md](../methods/adhd-journaling.md), 509 |
| Labelled, not blank | "Blank boxes are paralysing for many ND users. Ship labelled, and let people rename." | [theme-system-journal.md](../methods/theme-system-journal.md), 812 |
| Fields added over time | A therapist assigns "the first two or three columns ... for a week before adding evidence and alternatives" | [cbt-thought-record.md](../methods/cbt-thought-record.md), 246–247 |
| Reuse before new types | Build the reuse combination first; add a new block only if it feels clunky | [dream-journal.md](../methods/dream-journal.md), 683; [expressive-writing.md](../methods/expressive-writing.md), 658 |
| Heavy methods opt-in | Expressive writing "must be opt-in"; dream blocks opt-in | [expressive-writing.md](../methods/expressive-writing.md), 676; [dream-journal.md](../methods/dream-journal.md), 704 |
| Prompts can defeat a method | "Prompts defeat the method" (Morning Pages) | [morning-pages.md](../methods/morning-pages.md), 663 |
| A way to pass | A pass line under a prompt; weights that alternate | [prompt-journaling.md](../methods/prompt-journaling.md), 564–565 |
| No must-answer | "365-day 'must answer' books. Guilt when skipped." | [prompt-journaling.md](../methods/prompt-journaling.md), 625 |

### 2.3 Privacy and safety

| Need | What the guides say | Source |
| --- | --- | --- |
| Private by default | "Keep it private unless you choose." | [expressive-writing.md](../methods/expressive-writing.md), 443 |
| Plan for being found | "neutral cover, code words, home storage ... and nothing you'd be harmed by" | [gender-euphoria-and-hrt-log.md](../methods/gender-euphoria-and-hrt-log.md), 606 |
| Neutral names | Not "Trans", "HRT" or "transition" on the cover by default | [gender-euphoria-and-hrt-log.md](../methods/gender-euphoria-and-hrt-log.md), 685 |
| User-named labels | Never print "suicide" or "self-harm" as default labels | [dbt-diary-card.md](../methods/dbt-diary-card.md), 775 |
| Code words | "a code word or a symbol you both understand" | [dbt-diary-card.md](../methods/dbt-diary-card.md), 684 |
| A short pointer to help | Therapy pages carry "Use with a therapist" and a crisis line | [dbt-diary-card.md](../methods/dbt-diary-card.md), 723; [safety-planning.md](../methods/safety-planning.md), 207 |
| Crisis goes to the plan | "Using a thought record in a crisis. Point to the safety plan instead." | [cbt-thought-record.md](../methods/cbt-thought-record.md), 817 |
| No risk scoring | No "risk scores, 'danger levels' or colour-coded risk" | [safety-planning.md](../methods/safety-planning.md), 662 |
| Nothing sent by itself | No automatic messages to contacts; no "Auto-Send" | [safety-planning.md](../methods/safety-planning.md), 663; [rocketbook-and-scan-systems.md](../methods/rocketbook-and-scan-systems.md), 731 |
| Summaries, by choice | "Summaries only, by choice." | [autistic-sensory-journaling.md](../methods/autistic-sensory-journaling.md), 691 |
| No analysis of writing | No "in-editor text analysis of what someone writes ... or any AI feedback" | [expressive-writing.md](../methods/expressive-writing.md), 671 |
| No generated prompts | No "AI-generated or 'personalised' prompts" | [prompt-journaling.md](../methods/prompt-journaling.md), 623 |
| Apps leak | Cloud sync, data sale, lock-screen notifications that out you | [gender-euphoria-and-hrt-log.md](../methods/gender-euphoria-and-hrt-log.md), 453 |

### 2.4 Numbers and what they mean

| Need | What the guides say | Source |
| --- | --- | --- |
| Record, don't interpret | No "scores, diagnoses or 'you may have X' logic" | [symptom-tracking.md](../methods/symptom-tracking.md), 683 |
| No correlations | "leave pattern reading to the person" | [mood-tracking-year-in-pixels.md](../methods/mood-tracking-year-in-pixels.md), 778 |
| Measure what you'll use | "Every item should answer a question you or your clinician actually has" | [symptom-tracking.md](../methods/symptom-tracking.md), 110 |
| Few rows by default | "One mood and one anxiety is the default; the rest are opt-in." | [mood-tracking-year-in-pixels.md](../methods/mood-tracking-year-in-pixels.md), 815 |
| Body numbers opt-in | Weight and calories can harm; food amounts are an eating-disorder risk | [habit-tracking.md](../methods/habit-tracking.md), 636; [time-logging-lifelog.md](../methods/time-logging-lifelog.md), 666 |
| Charts readable without sight | "charts have a text alternative and a table" | [low-demand-check-in.md](../methods/low-demand-check-in.md), 195 |
| No numbers that invite guilt | "Does it add a number that invites comparison or streak guilt? Remove it." | [e-ink-templates.md](../methods/e-ink-templates.md), 742 |

### 2.5 Time

| Need | What the guides say | Source |
| --- | --- | --- |
| The day is the writer's day | "define the 'day' by sleep, not midnight"; "Date each Daily Log by your day" | [digital-daily-notes.md](../methods/digital-daily-notes.md), 518; [bullet-journal.md](../methods/bullet-journal.md), 627 |
| Full-day timelines | "8:00–22:00 timelines: they drop night shifts" | [travelers-notebook.md](../methods/travelers-notebook.md), 663 |
| Wording for shifts | "'today' and 'tonight' confuse; use 'this shift', 'since you woke'" | [prompt-journaling.md](../methods/prompt-journaling.md), 452 |
| Time stamps on demand | "many editors insert the time with a shortcut" | [interstitial-journaling.md](../methods/interstitial-journaling.md), 400 |
| No exact-minute grids | They make "gaps look like failures" | [interstitial-journaling.md](../methods/interstitial-journaling.md), 673 |
| Silent timers | "Ticking or ringing ... sound is a notification in practice"; a silent, visual timer instead | [pomodoro-log.md](../methods/pomodoro-log.md), 773, 567 |
| Re-plans stay visible | Digital loses "the visible history of re-blocks (apps overwrite the old plan)" | [time-block-planner.md](../methods/time-block-planner.md), 400 |
| No reminders | Reminders "supported repetition but hindered habit development" | [adhd-journaling.md](../methods/adhd-journaling.md), 441 |

### 2.6 Rereading

| Need | What the guides say | Source |
| --- | --- | --- |
| Rereading has value | People enjoy rereading ordinary records far more than they predict | [five-year-diary.md](../methods/five-year-diary.md), 50 |
| And can hurt | "seeing that past hard days passed can help, but it can also hurt. Let the person choose." | [five-year-diary.md](../methods/five-year-diary.md), 453 |
| Control resurfacing | Skip, hide, choose periods, never auto-show; exclude entries from On This Day | [digital-daily-notes.md](../methods/digital-daily-notes.md), 493, 509 |
| Not on a bad night | "Reread on neutral days; skip the archive in crisis" | [gratitude-journaling.md](../methods/gratitude-journaling.md), 417 |
| Later, not instant | Wait one to a few weeks, then transfer what still stands out | [commonplace-book.md](../methods/commonplace-book.md), 204, 559 |
| Entries move on | The Period Log is "a feeder": things move to where they belong | [progoff-intensive-journal.md](../methods/progoff-intensive-journal.md), 152 |

### 2.7 Access and tone

| Need | What the guides say | Source |
| --- | --- | --- |
| Colour never alone | "colour roles are in words, never colour alone" | [moodboard-and-palette.md](../methods/moodboard-and-palette.md), 180; [jibun-techo.md](../methods/jibun-techo.md), 701 |
| Icons with labels | "icons with text labels" | [autistic-sensory-journaling.md](../methods/autistic-sensory-journaling.md), 510 |
| Calm screens | "dark mode, reduced motion, no confetti or streak animations" | [digital-daily-notes.md](../methods/digital-daily-notes.md), 503 |
| Typing is fine | No significant difference by mode (handwriting, typing, talking) | [expressive-writing.md](../methods/expressive-writing.md), 343 |
| Kinder to hands | Digital is "kinder to hand pain, dysgraphia" | [morning-pages.md](../methods/morning-pages.md), 397 |
| Few steps to today | "Too many taps to today": friction kills the habit | [e-ink-templates.md](../methods/e-ink-templates.md), 520 |
| Neutral words | "spent", "held", "borrowed", not "wasted"; "Was hard", not "fell short" | [spoon-theory-energy-accounting.md](../methods/spoon-theory-energy-accounting.md), 815; [stoic-journaling.md](../methods/stoic-journaling.md), 762 |
| No pressure framing | Not "high achiever", "win the day", "battle"; not "I am…" affirmations | [full-focus-planner.md](../methods/full-focus-planner.md), 819; [five-minute-journal.md](../methods/five-minute-journal.md), 654 |
| No "behind" | No "behind" wording for missed reviews | [study-and-note-taking.md](../methods/study-and-note-taking.md), 198 |

### 2.8 What paper does that software loses

Several guides list what a digital version loses, and the losses point to features, not just to warnings:

- Copying is free, so migration stops filtering: apps "lose migration friction"; "moving tasks is instant, so it's easy
  to never decide" ([bullet-journal.md](../methods/bullet-journal.md), 514; [eisenhower-matrix.md](../methods/eisenhower-matrix.md), 446).
- Copy-paste "makes hoarding easy" ([commonplace-book.md](../methods/commonplace-book.md), 517).
- Re-plans overwrite the old plan ([time-block-planner.md](../methods/time-block-planner.md), 400).
- A Dutch door strip is written once and seen all week; "digitally you copy or re-read"
  ([dutch-door-method.md](../methods/dutch-door-method.md), 464).

And what it gains: search, undo, changing the ruling per page, zoom for large print
([paper-and-grids.md](../methods/paper-and-grids.md), 559; [digital-daily-notes.md](../methods/digital-daily-notes.md), 431).

## 3. Where the research is thin or disagrees

- **Evidence is mostly not about editors.** Of the 52 guides, the catalogue rates 4 strong; most are "some" or
  "anecdotal", and those ratings are about the methods, not about software for them. None tested an editor design. The
  design choices below are choices, not findings.
- **Section 25 targets print.** Its block proposals assume a black-and-white printed page with scan zones. Jot shows
  colour on screen, so "B&W" becomes "colour is never the only signal", not "no colour".
- **Prompts help and harm.** Prompt journaling is built on them; Morning Pages are defeated by them
  ([morning-pages.md](../methods/morning-pages.md), 663). Settled per method: a layout says whether it has a prompt.
- **Rereading helps and harms** (2.6). Settled by making look-back opt-in, never shown on opening.
- **Reminders** helped repetition and hindered habit formation in one study cited by two guides
  ([adhd-journaling.md](../methods/adhd-journaling.md), 441; [habit-tracking.md](../methods/habit-tracking.md), 382). Jot
  sends none; the spec already says future dates do not imply reminders.
- **Restoring paper's friction** (section 5.8) is a design inference from the "lost digitally" lists, not something any
  guide tested. It stays optional.
- **Handwriting versus typing.** Expressive writing found no mode difference
  ([expressive-writing.md](../methods/expressive-writing.md), 343); study and note-taking warns against claiming
  handwriting beats typing ([study-and-note-taking.md](../methods/study-and-note-taking.md), 198). The editor treats
  typing, handwriting and dictation as equals and claims nothing about them.
- **The guides are silent** on undo models, conflict handling, search design and screen-reader patterns for writing
  tools. Those parts follow the existing roadmap and WCAG, not the research.

## 4. What Jot has, and where it already misses

Jot has two editors over the same plain text. The **writer** edits `.jot` source with a page preview, a Methods dialog
(62 invitations), quick note, week review, carrying tasks forward, focus mode, writing preferences, handwriting,
attachments and the voice, listening and health tools. The **template editor** builds a month from 17 block types in five
zones (before the days, each week begins, each day, each week ends, after the days) and seven starters.

The format already covers most of what the research asks for: habit observations are `done`, `partial`, `not-done`,
`skipped`, `unknown` or `not-applicable`, and missing days do not become `not-done` (spec §6.3); measurements take
`status: skipped` (§5.2); a skipped prompt "MUST NOT infer refusal, failure or a negative mood", and sensitive prompts and
on-this-day resurfacing are opt-in (§6.3); privacy labels exist per record (§9). The gaps are in the editors.

Three starters in the template editor go against a guide today:

| Starter | What it does | Guide | Change |
| --- | --- | --- | --- |
| Morning pages | Puts a rotating prompt ("What am I avoiding?" among them) on every day | Prompts defeat the method ([morning-pages.md](../methods/morning-pages.md), 663) | Drop the prompt; offer starters as a list after the days |
| Day planner | Time blocks from 8 to 20 | Full-day timelines for shift workers ([travelers-notebook.md](../methods/travelers-notebook.md), 663) | Ask for the hours, or default to the full day |
| Gratitude | Three lines every day, no weekly option | Weekly-friendly; more lines aren't supported by evidence ([gratitude-journaling.md](../methods/gratitude-journaling.md), 593, 599) | One line by default ("One okay thing"), with a weekly variant |

And the writer's **Today** button uses the calendar date at midnight, which splits a night shift
([digital-daily-notes.md](../methods/digital-daily-notes.md), 518).

## 5. The design

### 5.1 One editor, three views of one file

The `.jot` text stays the only document. The editor offers three views of it, and all three edit the same source:

1. **Text**: the source, as now. Always available; nothing is only editable elsewhere.
2. **Page**: the paper preview, as now.
3. **Fill** (new): the records and blocks of the entry at the cursor, as form controls: a scale is a row of numbers, a
   checkbox is a checkbox, a habit is a three-state dot, a blank is a field. Every control has **Skip**, which writes the
   format's own `skipped` state. Nothing is required; leaving the view saves whatever was filled.

Fill is what lets one editor fit a three-number check-in and a seven-column thought record: methods supply blocks, the
editor supplies a control for each block type. It is also the low-demand path for people who find writing hard
([low-demand-check-in.md](../methods/low-demand-check-in.md), 193).

The writer and the template editor become two modes of this editor: the writer edits a journal; the template editor
edits the structure that new days are made from. Both use one block registry (5.2), so a block added for one is
available in the other.

### 5.2 One block kit, generic before specific

A method is a layout of generic blocks, not a block type of its own. Today's 17 template blocks already cover most
methods (section 7). The research asks for a small number of additions, each serving several methods:

| Addition | What it is | Serves |
| --- | --- | --- |
| Three-state dots | empty / half / full, plus rest; writes habit observations (`done`, `partial`, `not-done`, `skipped`) | habit tracking, Theme System, Alastair, DBT PLEASE, Morning Pages, Focus rounds |
| Groups | Two or more blocks side by side (the composable blocks track, B2) | Eisenhower 2×2, Stoic control sort, Cornell, Home/Shift, Intersections, Waiting for |
| Time grid options | any start hour, past midnight, plan and actual rows, re-plan columns that keep the old plan | Time-Block, Jibun, Emergent Task Planner, time logging, Hobonichi |
| Ordered tasks | numbered, with an optional cap (6) and a position (end of day) | Ivy Lee, Full Focus Big 3, Top 3 |
| Prompt options | pass line, theme and weight tags, your own list, a gentle-only set | prompt journaling, shadow work (opt-in), Five-Year |
| Sketch slot | room for a drawing, photo or pasted scrap, filled with the canvas or an attachment | art and junk, drawing practice, Traveler's Notebook, moodboards, Passion Planner |
| Plan pointer | one line linking to the writer's safety plan record, with their own help line | DBT, CBT, safety planning, shadow work, expressive writing |
| Silent timer | started by the writer, visual only, no sound; writes the minutes on Stop; optional cap | Focus rounds, expressive writing (20 min), Morning Pages, task initiation |
| Time stamp | inserts the current time as a timestamp line, by key or button | interstitial, time logging, symptom PRN doses |

Rule for anything further: add a block type only when two or more guides need it and options on an existing type can't
express it ([dream-journal.md](../methods/dream-journal.md), 683).

### 5.3 Method layouts

Every guide gets a layout (section 7). A layout is an editable starting point: blocks can be removed, renamed and
reordered, layouts can be blended, and changing or detaching a layout keeps everything already written (composable
blocks track, B2). The editor shows a quiet note when a day has more than seven blocks or five trackers, citing why
([adhd-journaling.md](../methods/adhd-journaling.md), 712; [habit-tracking.md](../methods/habit-tracking.md), 638); it
never blocks.

Layouts for methods with a health note are opt-in, are never in a default starter, and carry the plan pointer:
expressive writing, dream journal, shadow work, DBT diary card, CBT thought record, safety planning, symptom tracking,
gender euphoria and HRT, mood tracking, spoon theory, autistic sensory journaling and voice practice. Inside them,
sensitive rows are off by default (a dysphoria scale, body numbers), and labels for urges are the writer's own.

### 5.4 Demand and return

- No field is required anywhere. An empty entry saves.
- **Skip** on every fill control writes `skipped`; a day with nothing is simply absent.
- Nothing counts days, missed days, streaks or totals-as-score, in any view.
- Opening after a gap goes to today (or where the writer left off, as now), never to a backlog.
- Carrying tasks forward stays a choice the writer makes, task by task (5.8).

### 5.5 Privacy in the editor

- Per-block privacy: a block in a layout can default to `private`; the layouts with a health note do.
- **Discreet labels**: a layout can be applied with neutral names ("E", "✓", "me") and the writer's own code words
  ([gender-euphoria-and-hrt-log.md](../methods/gender-euphoria-and-hrt-log.md), 649). The file name and title suggest
  nothing by default.
- Exports and shares go through the share preview in [notes-sharing-collaboration.md](notes-sharing-collaboration.md);
  private blocks are left out unless chosen. Nothing is sent, synced or uploaded by the editor.
- No analysis of what is written, no generated prompts or summaries, no network request to open or edit.

### 5.6 Time

- **Day starts at**: a writing preference (default midnight, as now). Today, Quick note and the date picker use it, so a
  night shift stays one entry. Dates in the file stay ordinary ISO dates; nothing in the format changes.
- Time grids default to the full day or ask; shift-relative wording ("this shift", "since you woke") is offered in
  layouts.
- Time stamps by key, with no grid of minutes.
- Re-planning adds a column; the earlier plan stays visible.
- **Week strip**: the page view can show the week's events and tracker rows above each day, drawn from the week's own
  source, so the Dutch door's write-once effect comes back without copying.
- Timers are silent and visual, started and stopped by the writer. No reminders, alarms or notifications.

### 5.7 Rereading on the writer's terms

A **Look back** panel shows the same date a month or a year ago, or a chosen period. It is off by default, never opens
by itself, never appears on opening the journal, can skip or hide an entry, and leaves out entries marked private or
tagged by the writer. It reads the current document or the open book only.

### 5.8 Keeping the useful friction (optional)

These restore what the "lost digitally" lists name. They are design inferences (section 3), so each is optional:

- **Migration as a decision**: carrying a task forward asks, per task, carry, schedule or drop; a task carried three
  times offers the same choice once, neutrally ([bullet-journal.md](../methods/bullet-journal.md), 571, 597).
- **Transfer later**: a passage marked "keep" waits in a list for a week before it can be moved to a heading or
  collection ([commonplace-book.md](../methods/commonplace-book.md), 559); the same "move to" action serves the Progoff
  feeder.
- **Caps where a method has one**: Ivy Lee's six, a Big 3.

### 5.9 Access and input

- Keyboard for everything, with visible labels; touch targets sized for motor needs; screen-reader order follows source
  order; every chart has a text summary and a table (already true).
- Typing, the handwriting canvas, photos and the system's own dictation are equal ways in. Read-aloud uses the browser's
  speech where available and chosen.
- Colour is never the only signal; icons carry text labels; no sound; reduced motion respected; predictable layouts with
  no surprise changes.
- The existing preferences (text size, spacing, line length, density, contrast, hiding the preview, counts and
  decoration) apply in all three views.

### 5.10 Wording check for layouts

When someone writes or edits a layout in the template editor, labels can be checked against wording the guides advise
against, with the guide's suggestion beside it: "wasted" → "spent"; "fell short" → "was hard"; "delete" → "let go";
"amazing" → "good"; "I am…" → a values line; "missed", "behind", "streak". This checks layout labels only, is a hint
that never blocks, and never touches anyone's journal writing (the roadmap's quiet writing assistance already forbids
correcting identity terms, dialect or fragments).

## 6. Roadmap

Each phase is useful on its own. Acceptance criteria are checks, not claims of benefit.

| Phase | Work | Acceptance |
| --- | --- | --- |
| E0. Fixes | The three starters in section 4; a "Day starts at" preference used by Today and Quick note | Starter tests show no prompt in Morning pages, a full-day or asked range in Day planner, one gratitude line; a 03:00 entry with day start 05:00 goes under the previous date |
| E1. Fill view and Skip | Fill controls for scales, ratings, checkboxes, blanks, numbers and habit observations in the entry at the cursor; Skip writes `skipped` | Round trip: filling and skipping change only the touched lines; keyboard and screen-reader pass (axe); no required fields; empty save works |
| E2. One block kit | One block registry for the writer and template editor; an insert-block menu in the writer; three-state dots, ordered tasks, prompt options, time grid options, sketch slot | Each addition renders in text, page and fill views; plain-text output stays readable in an ordinary editor; existing templates load unchanged |
| E3. Layouts for every guide | A layout per guide (section 7), blending, detaching without loss, the seven-block note, opt-in for methods with a health note | Every guide's layout builds from the kit or names its missing piece; detaching keeps all writing; opt-in layouts are absent from default starters |
| E4. Privacy in the editor | Per-block privacy defaults, discreet labels, plan pointer, share preview hand-off | Private blocks are absent from default exports (privacy suite); no network requests while editing (privacy check) |
| E5. Time and rereading | Shift-relative wording, time stamps, re-plan history, derived week strip, silent timer, Look back panel | Week strip matches the week's source; timer makes no sound and writes minutes only on Stop; Look back never opens by itself and hides chosen entries |
| E6. Useful friction | Migration decisions, transfer-later list, "move to" | Carrying is per task and reversible by undo; nothing moves without the writer's action |
| E7. Groups and layout | Side-by-side groups from the composable blocks track (B2–B3), used by the 2×2 and two-column layouts | Groups collapse to source order on narrow screens and in plain text; keyboard reordering |
| E8. Testing with people | Each track tried with people it is for, separately: ADHD and autistic writers, people with low vision or hand pain, shift workers, trans writers on privacy, clinicians on the therapy layouts | Findings recorded in `DECISIONS.md`; defaults change only on that evidence |

E0 can ship now. E1 and E2 are the core; E3 depends on E2; E7 depends on the composable blocks track; E4 depends on the
share preview.

## 7. Coverage: every guide

"Kit" names today's template blocks; "needs" names section 5.2 additions or other phases. A layout marked opt-in is
never a default.

| Guide | Layout from the kit | Needs | Defaults and cautions |
| --- | --- | --- | --- |
| [adhd-journaling](../methods/adhd-journaling.md) | tasks (Top 3), writing (brain dump), list (Later, Done), times | ordered tasks, guess/took blanks, silent timer | ≤7 blocks; no counts (711) |
| [alastair-method](../methods/alastair-method.md) | table of items by month or context | three-state dots in table cells | ≤7 columns (581) |
| [art-and-junk-journaling](../methods/art-and-junk-journaling.md) | writing, choose, checks | sketch slot | no "art therapy" claims (631) |
| [autistic-sensory-journaling](../methods/autistic-sensory-journaling.md) | ratings (senses 0–3), scale (masking), checks (supports) | fill view | opt-in; icons with labels; summaries only (691) |
| [bullet-journal](../methods/bullet-journal.md) | rapid log in text, tasks, carry forward | migration decisions | `>` neutral (597) |
| [cbt-thought-record](../methods/cbt-thought-record.md) | writing ×3/5/7, scale 0–100, choose (thinking traps) | plan pointer; 3, 5 or 7 columns | opt-in; "true, and…" (811); crisis → plan (817) |
| [commonplace-book](../methods/commonplace-book.md) | text, list, links | transfer later, Look back | no counts of lines kept (773) |
| [dbt-diary-card](../methods/dbt-diary-card.md) | ratings 0–5 with own labels, checks (acted), scale 0–7 | three-state dots (PLEASE), plan pointer | opt-in; private; no default labels (775) |
| [design-iteration-and-critique](../methods/design-iteration-and-critique.md) | record profile, writing, links | sketch slot | names off by default (238) |
| [digital-daily-notes](../methods/digital-daily-notes.md) | the writer itself | Look back, day start | one template; bloat note (488) |
| [drawing-practice](../methods/drawing-practice.md) | record profile, writing | sketch slot, silent timer | no streaks or ratings (262) |
| [dream-journal](../methods/dream-journal.md) | checks (recalled, nightmare), writing, choose | none | opt-in (704); private |
| [dutch-door-method](../methods/dutch-door-method.md) | week-start zone | derived week strip | strip shows events, not reminders |
| [e-ink-templates](../methods/e-ink-templates.md) | page view, export | a high-contrast print style | calm checklist (737–742) for every view |
| [eisenhower-matrix](../methods/eisenhower-matrix.md) | four writing blocks | groups (2×2) | Now / Plan / Hand off / Let go (723–724) |
| [emergent-task-planner](../methods/emergent-task-planner.md) | tasks, times, writing | time grid with blank hours | estimates optional |
| [expressive-writing](../methods/expressive-writing.md) | scale before/after, writing, checks (aftercare) | silent timer with 20-min cap, plan pointer | opt-in (676); private; no analysis (671) |
| [five-minute-journal](../methods/five-minute-journal.md) | list, writing (values line) | none | "good things", no "I am" (654) |
| [five-year-diary](../methods/five-year-diary.md) | writing (one line) | Look back across years | opt-in look-back; skip pages (454) |
| [full-focus-planner](../methods/full-focus-planner.md) | tasks, checks (rituals), times | ordered tasks | plain labels (819) |
| [gender-euphoria-and-hrt-log](../methods/gender-euphoria-and-hrt-log.md) | writing, checks, scale, numbers, choose (sites) | discreet labels, privacy defaults | opt-in; dysphoria off; no doses (681) |
| [getting-things-done-paper](../methods/getting-things-done-paper.md) | list (In), table (waiting for), tasks | groups by context | short weekly review beside the full one (891) |
| [gratitude-journaling](../methods/gratitude-journaling.md) | list, week-end writing | none | one line; weekly-friendly (593) |
| [habit-tracking](../methods/habit-tracking.md) | checks, numbers | three-state dots with rest | ≤5 habits; body numbers opt-in (636) |
| [hobonichi-techo](../methods/hobonichi-techo.md) | writing, list, checks | ruling per block, Look back | ruling from the roadmap's ruling choices |
| [interstitial-journaling](../methods/interstitial-journaling.md) | writing | time stamp | no minute grid (673) |
| [ivy-lee-method](../methods/ivy-lee-method.md) | tasks at week or day end | ordered tasks, cap 6 | "Tomorrow, in order" (672) |
| [jibun-techo](../methods/jibun-techo.md) | times, numbers | 24-hour grid with plan and actual | patterns, not colour alone (701) |
| [low-demand-check-in](../methods/low-demand-check-in.md) | scale ×3, choose | fill view with Skip | no reminders (236) |
| [mood-tracking-year-in-pixels](../methods/mood-tracking-year-in-pixels.md) | scale −3..+3, chart | year chart view (roadmap) | opt-in; one mood row (815); no correlations (778) |
| [moodboard-and-palette](../methods/moodboard-and-palette.md) | palette tools | sketch slot | names with every swatch (180) |
| [morning-pages](../methods/morning-pages.md) | writing, dots (pages) | silent timer | no prompts (663) |
| [paper-and-grids](../methods/paper-and-grids.md) | page view | ruling and pitch per block | large-print bold lines |
| [passion-planner](../methods/passion-planner.md) | writing (anything), tasks, scale 1–10 monthly | groups (Home / Shift) | plain words (916) |
| [planner-sticker-and-deco-culture](../methods/planner-sticker-and-deco-culture.md) | page view decoration, palettes | icon row with text labels | decoration can be hidden; no rewards (560) |
| [pomodoro-log](../methods/pomodoro-log.md) | numbers, writing (came up) | silent timer, three-state dots | "Focus rounds"; no sound (773) |
| [progoff-intensive-journal](../methods/progoff-intensive-journal.md) | writing, links, `.jotbook` sections | "move to" | dialogues private (801) |
| [prompt-journaling](../methods/prompt-journaling.md) | prompt | pass line, weights, own list | no must-answer (625) |
| [rocketbook-and-scan-systems](../methods/rocketbook-and-scan-systems.md) | attachments, transcription records | scanner (hidden until ready) | no auto-send (731) |
| [safety-planning](../methods/safety-planning.md) | profile record | plan pointer; "My plan" in the menu once a plan exists | opt-in; no scores or auto-messages (662–663) |
| [shadow-growth-journal](../methods/shadow-growth-journal.md) | prompt (gentle set), scale, checks (closer) | prompt weights, plan pointer | opt-in; never pushed (753) |
| [spoon-theory-energy-accounting](../methods/spoon-theory-energy-accounting.md) | numbers, table (costs) | none | neutral words (815); weights opt-in |
| [stimming-and-self-regulation](../methods/stimming-and-self-regulation.md) | record, choose (stim menu) | none | no counts or reduction wording (177) |
| [stoic-journaling](../methods/stoic-journaling.md) | writing, week-end review | groups (mine / not mine) | "Was hard" (762); no memento mori (761) |
| [study-and-note-taking](../methods/study-and-note-taking.md) | writing, list | groups (Cornell) | no "behind" (198) |
| [symptom-tracking](../methods/symptom-tracking.md) | scale 0–10, choose, numbers | time stamp (PRN), appointment summary via share | opt-in; gaps blank (596); no diagnosis (683) |
| [task-initiation-and-transitions](../methods/task-initiation-and-transitions.md) | blanks (estimate, actual), writing, chart | silent timer | no lateness counts (237) |
| [theme-system-journal](../methods/theme-system-journal.md) | writing (theme, where), list | three-state dots | labelled boxes (812) |
| [time-block-planner](../methods/time-block-planner.md) | times, checks (shutdown) | re-plan history | open time allowed (623) |
| [time-logging-lifelog](../methods/time-logging-lifelog.md) | times | 24-hour grid, time stamp | no food amounts (666) |
| [travelers-notebook](../methods/travelers-notebook.md) | `.jotbook` chapters, attachments | sketch slot | full-day timelines (663) |
| [voice-practice](../methods/voice-practice.md) | the voice practice tool | share option without `recording` and `pitch-hz` (280) | opt-in; no gendered targets |

The ten profiles original to Jot (`specification/source-register.md`, line 9) need nothing beyond the kit; they get
layouts in E3 on the same rules.

### 7.1 Don't adopt

Collected from the guides' "don't adopt" lists, applying to every view: streaks, badges, points, scores and
"productivity %"; missed-day counters and catch-up prompts; reminders, alarms, sounds and notifications; generated
prompts, summaries, insights, correlations or any analysis of writing; risk ratings; automatic sending or syncing;
colour as the only signal; default labels that name self-harm, gender or diagnosis; reproducing licensed or trademarked
forms and names (Pomodoro, Stanley–Brown, BRTC cards, Hobonichi quotes).

## 8. Open questions

1. Should Fill be a panel beside the text, or a mode that replaces it? (A panel keeps the source visible; a mode is
   calmer on a phone.)
2. Should "Day starts at" also be a document field, so a shared journal keeps one rule, or stay a personal preference?
3. Which layouts belong in the template editor's starters, and which only behind "More methods"?
4. Does the wording check (5.10) belong in the editor, or only in the tests that check shipped layouts?
5. Which groups of people can test E8 first, and how is their feedback recorded without collecting their journals?
