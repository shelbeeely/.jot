# Journaling methods research

The guides in this folder are the research behind Jot's profiles, templates, the writer and the format. They come from
[shelbeeely/Journaling `docs/journaling/methods`](https://github.com/shelbeeely/Journaling/tree/main/docs/journaling/methods)
(snapshot and differences: `specification/source-register.md`), plus guides added here. Each is CC0 (`LICENSE`); new guides
follow `TEMPLATE.md`. This README is Jot's own: it is not part of the upstream library.

## Using the research in decisions

Read this index first, then open the guides that bear on the change. Search the full guides
(`rg -n -i '<topic>|<synonym>' docs/methods/*.md`) rather than only their opening sections.

1. **Before deciding**, consult the research for any change to a method profile, template, prompt or invitation, and for
   anything touching privacy, sharing, health or mood data, safety, reminders and motivation, accessibility, or tone.
2. **Cite it.** In `DECISIONS.md` entries and `docs/proposals/`, cite the guides that shaped the decision as
   `docs/methods/<file>.md, line N`, quoting briefly where wording matters.
3. **Say where research is thin or disagrees.** Keep each guide's own evidence wording (evidenced, supported, claimed,
   uncertain, unconfirmed). If no guide covers the question, say so; don't present a design choice as a research finding.
4. **Don't claim effects.** Jot records what people write; it makes no therapeutic or productivity claims of its own
   (spec §13 note, `specification/source-register.md`).
5. **Fix the research where it's wrong.** Record local corrections and their source checks in the
   [source register](../../specification/source-register.md). Contributing a correction upstream is a separate publication step.

## Find a starting point

These are routes into the research, not recommendations that everyone use a particular method.

| Question | Start here | Read alongside it |
| --- | --- | --- |
| How can a first entry ask less? | [Low-demand check-in](low-demand-check-in.md) | [Prompt journaling](prompt-journaling.md), [five-year diary](five-year-diary.md) |
| How can planning work with variable attention or energy? | [ADHD planning](adhd-journaling.md) | [Task initiation](task-initiation-and-transitions.md), [energy accounting](spoon-theory-energy-accounting.md) |
| What should a health or mood log record? | [Symptom tracking](symptom-tracking.md) | [Mood tracking](mood-tracking-year-in-pixels.md), [sensory journaling](autistic-sensory-journaling.md) |
| What belongs in therapy-adjacent writing? | [CBT thought records](cbt-thought-record.md) | [DBT diary cards](dbt-diary-card.md), [expressive writing](expressive-writing.md), [safety planning](safety-planning.md) |
| How can someone learn or practice deliberately? | [Study and note taking](study-and-note-taking.md) | [Drawing practice](drawing-practice.md), [voice practice](voice-practice.md), [design critique](design-iteration-and-critique.md) |
| What can a page layout help with? | [Paper and grids](paper-and-grids.md) | [Bullet Journal](bullet-journal.md), [moodboards](moodboard-and-palette.md), [e-ink templates](e-ink-templates.md) |
| What changes when writing is stored or shared digitally? | [Digital daily notes](digital-daily-notes.md) | [Scan systems](rocketbook-and-scan-systems.md), each method's privacy and accessibility sections |

## Read the evidence labels carefully

The catalogue retains each guide's evidence label. It is a starting point for reading section 16, not a rating of a
product or a promise about a person's results. In particular, evidence for CBT, DBT, retrieval practice or habit formation
does not by itself establish that a particular journal page, tracker or Jot profile is effective.

| Label | What it can mean | What to check in section 16 |
| --- | --- | --- |
| **Strong** | Several trials or systematic reviews support the method or a substantial related intervention | Whether the tested intervention included professional support, other components or a different population |
| **Some** | Limited direct studies, qualitative research, or evidence for a related practice | Which outcomes were measured and how far the journal adaptation extends beyond them |
| **Anecdotal** | Mainly practitioner accounts or community experience | Which suggestions are reports or design choices rather than measured effects |
| **None** | No direct outcome research identified in the guide's search | What is known about individual components; absence of studies is not proof of no benefit |

Do not combine these into scores or compare methods as if their studies measured the same thing. A creator's page can
establish how a method works; a marketing claim cannot establish a health effect. A qualitative interview can describe
people's experience without showing that a method caused an outcome.

`draft`, `reviewed` and `needs-update` are editorial states, separate from evidence strength. Most `reviewed` states were
inherited from the upstream snapshot; they do not mean Jot independently rechecked every source. A targeted update must
say which claims and sources were checked. Keep inaccessible sources and unresolved questions visible, and do not turn a
partial check into an "all sources checked" statement. The [source register](../../specification/source-register.md)
records the scope of local updates.

## Scope of product guidance

Inherited guides use **Journalwright Studio**, **X4** and **Built?** in section 25. These describe the source project's
proposals or implementation, not verified Jot features. Jot currently focuses on its text format and Writer software;
dedicated hardware is deferred. Read that section as design guidance, then check Jot's current guides and decisions for
actual behavior. Privacy, accessibility and low-pressure defaults are design commitments, not clinical findings.

## Maintain a guide

Use [TEMPLATE.md](TEMPLATE.md) for new guides and keep the 28 numbered sections so readers can compare methods. For an
existing guide, improve the relevant sections rather than padding every section. In section 16, distinguish the exact
method from related research, name the population and outcome, and state the limit on applying the finding to Jot.
Use invented examples and keep suggested adaptations separate from the creator's documented method.

Open sources before adding them. Cite the source beside the claim, record the access date and access limits in section
28, and keep draft status when a revision still needs editorial review. Prices, app features, device compatibility and
clinical guidance need dated checks. Preserve the original snapshot attribution when making a local correction.

From the repository root:

```sh
node tools/check-methods.mjs
node tools/build-methods-index.mjs
node tools/manifest.cjs
```

The checker catches structural and local-reference errors. It does not verify external pages, scientific quality or
clinical safety. Those still need a reader's judgment.

## Principles that recur across the guides

These are recurring recommendations and evidence limits relevant to Jot decisions. Each links to the section holding
the detail; they are not all experimentally established findings.

- **Private by default; sharing is a separate, deliberate choice.** See [expressive writing, section 18](expressive-writing.md#18-pitfalls) and [sensory journaling, section 25](autistic-sensory-journaling.md#25-for-journalwright-studio).
- **Plan for the journal being found.** Neutral covers or selective recording may help; do not promise that code words protect sensitive information. See [HRT logs, section 18](gender-euphoria-and-hrt-log.md#18-pitfalls) and [DBT cards, section 25](dbt-diary-card.md#25-for-journalwright-studio).
- **Gaps are data, not failures.** Leave missed days blank; don't reconstruct them as observations. See [symptom tracking, section 18](symptom-tracking.md#18-pitfalls) and [low-demand check-ins, section 8](low-demand-check-in.md#8-rhythms).
- **No streaks, catch-up prompts or shame wording by default.** Broken-streak findings are context-dependent, not a universal effect. See [habit tracking, section 16](habit-tracking.md#16-evidence-and-research).
- **Record; don't diagnose.** A journal alone cannot interpret symptoms or establish causes. See [symptom tracking, section 16](symptom-tracking.md#16-evidence-and-research).
- **Professional support can be part of the method.** Evidence for a clinical intervention does not automatically transfer to an unsupervised worksheet. Read the opening notes and section 16 in [CBT](cbt-thought-record.md#16-evidence-and-research), [DBT](dbt-diary-card.md#16-evidence-and-research) and [safety planning](safety-planning.md#16-evidence-and-research).
- **Crisis-adjacent pages need a short, real pointer to help.** See [safety planning, section 7](safety-planning.md#7-daily-practice).
- **Color is never the only signal.** Use words or symbols too. See [moodboards, section 19](moodboard-and-palette.md#19-accessibility-and-adaptations).
- **Measure only what answers a question you have.** See [symptom tracking, section 4](symptom-tracking.md#4-philosophy-and-principles) and [habit tracking, section 18](habit-tracking.md#18-pitfalls).
- **A small entry is complete.** One word, one number, a skip or no entry are valid design choices; wellbeing benefits of this exact format are untested. See [low-demand check-ins, section 16](low-demand-check-in.md#16-evidence-and-research).
- **Rereading is optional.** See [five-year diaries, section 18](five-year-diary.md#18-pitfalls) and [commonplace books, section 8](commonplace-book.md#8-rhythms).

## Catalogue

<!-- methods-index:start (generated by tools/build-methods-index.mjs; do not edit) -->

62 guides covering all 62 method profiles. Evidence labels describe each guide's research scope, which may be a related intervention rather than the exact journal format. "Health note" marks an opening health, safety or crisis note: read it before designing for that method. Review dates can reflect a targeted source check; see section 28 for its scope.

### Mental health

| Guide | Evidence | Status | Last source review | Health note | What it covers |
| --- | --- | --- | --- | --- | --- |
| [CBT thought record](cbt-thought-record.md) | strong | reviewed | 2026-11-02 | yes | Record situations, thoughts and alternative perspectives within a CBT practice. |
| [DBT diary card](dbt-diary-card.md) | strong | reviewed | 2026-11-02 | yes | Monitor agreed treatment targets and skills within a DBT program. |
| [Gender euphoria journal and HRT log](gender-euphoria-and-hrt-log.md) | some | reviewed | 2026-09-30 | yes | Record personally meaningful experiences, treatment facts and optional health observations. |
| [Mood tracking and Year in Pixels](mood-tracking-year-in-pixels.md) | some | reviewed | 2026-09-30 | yes | Record personal mood ratings and view them across a month or year. |
| [Safety planning](safety-planning.md) | some | reviewed | 2026-09-30 | yes | Develop an accessible, individualized crisis plan with appropriate support. |
| [Symptom tracking](symptom-tracking.md) | some | reviewed | 2026-09-30 | yes | Record observations and context for a specific health question. |

### Neurodivergent and creative

| Guide | Evidence | Status | Last source review | Health note | What it covers |
| --- | --- | --- | --- | --- | --- |
| [Access needs and reusable scripts](access-needs-and-scripts.md) | anecdotal | draft | 2026-11-02 |  | Keep personal access needs and words to request support, with deliberate sharing. |
| [ADHD Journaling and Planning](adhd-journaling.md) | strong | reviewed | 2026-11-02 |  | Externalize plans, time estimates and task support around variable attention. |
| [Art journaling and junk journaling](art-and-junk-journaling.md) | some | reviewed | 2026-09-30 |  | Combine drawing, collage, collected materials and words on a page. |
| [Autistic sensory journaling](autistic-sensory-journaling.md) | some | reviewed | 2026-09-30 | yes | Record sensory experiences, context and supports in a personal log. |
| [Drawing practice log](drawing-practice.md) | some | draft | 2026-11-02 |  | A short record of a drawing session, its skill focus, references and a possible next attempt. |
| [Low-demand check-in (AuDHD)](low-demand-check-in.md) | anecdotal | draft | 2026-11-02 |  | Optionally record personal capacity, sensory load, energy or a need. |
| [Moodboards and colour palettes](moodboard-and-palette.md) | anecdotal | draft | 2026-11-02 |  | A collection of project references, mood words and named colors, with credits and intended color roles. |
| [Spoon theory and energy accounting](spoon-theory-energy-accounting.md) | anecdotal | reviewed | 2026-09-30 | yes | Use a personal energy metaphor to consider activities and available capacity. |
| [Stimming and self-regulation (stim log, stim menu, quiet patterns)](stimming-and-self-regulation.md) | some | draft | 2026-11-02 |  | Record chosen stims, context and supports without treating harmless stimming as a problem. |
| [Task initiation and transitions (AuDHD)](task-initiation-and-transitions.md) | some | draft | 2026-11-02 |  | Record a small next step, transition cue and optional task support. |

### Reflective writing

| Guide | Evidence | Status | Last source review | Health note | What it covers |
| --- | --- | --- | --- | --- | --- |
| [Commonplace book](commonplace-book.md) | some | reviewed | 2026-09-30 |  | Collect attributed quotations and ideas with ways to find them again. |
| [Dream journal](dream-journal.md) | some | reviewed | 2026-09-30 | yes | Record remembered dreams, with optional reflection and clearly bounded clinical uses. |
| [Expressive writing (the Pennebaker paradigm)](expressive-writing.md) | some | reviewed | 2026-09-30 | yes | Use a bounded research writing protocol with attention to its clinical limits. |
| [The Five Minute Journal](five-minute-journal.md) | some | reviewed | 2026-09-30 |  | Use a branded morning and evening set of short gratitude prompts. |
| [Five-Year Diary](five-year-diary.md) | some | reviewed | 2026-09-30 |  | Keep short entries for the same calendar date across several years. |
| [Food, cooking and meal memories](food-cooking-journal.md) | anecdotal | draft | 2026-11-02 | yes | A record of meals, recipe changes, sensory preferences and the memories around food. |
| [Free diary and stream of consciousness](free-diary.md) | anecdotal | draft | 2026-11-02 |  | Open writing in fragments or narrative, with optional dates and no required conclusion. |
| [Gratitude journaling](gratitude-journaling.md) | some | reviewed | 2026-09-30 |  | Record specific things appreciated, with optional reflection on their sources. |
| [Memory, grief and life-story writing](memory-life-story.md) | some | draft | 2026-11-02 | yes | Personal memories and life stories that preserve uncertainty, different accounts and the choice to share. |
| [Morning Pages](morning-pages.md) | anecdotal | reviewed | 2026-09-30 |  | Write three longhand pages in the morning following Julia Cameron’s practice. |
| [Progoff Intensive Journal](progoff-intensive-journal.md) | anecdotal | reviewed | 2026-09-30 |  | Use structured journal sections, written dialogues and guided reflection. |
| [Prompt journaling](prompt-journaling.md) | some | reviewed | 2026-09-30 |  | Begin writing from an optional question or invitation. |
| [Reading and media journals](reading-media-journal.md) | some | draft | 2026-11-02 |  | Responses to books, films, games and other works, with attributable quotations and optional spoiler notes. |
| [Shadow growth journal](shadow-growth-journal.md) | none | reviewed | 2026-09-30 | yes | Explore reflective prompts inspired by shadow concepts, with explicit evidence limits. |
| [Shared and dialogue journals](shared-journal.md) | anecdotal | draft | 2026-11-02 |  | Attributable entries and replies, with an agreed audience and an explicit choice to share. |
| [Spiritual, ritual and meaning journals](spiritual-reflection.md) | anecdotal | draft | 2026-11-02 | yes | Optional reflection on meaning, values, ritual and unanswered questions, in the writer's own language. |
| [Stoic journaling](stoic-journaling.md) | some | reviewed | 2026-09-30 |  | Reflect on judgments and actions using practices drawn from Stoic writers. |
| [Travel, nature and field observations](travel-field-log.md) | anecdotal | draft | 2026-11-02 |  | A personal record of places and observations, with context and uncertain identifications kept distinct. |

### Productivity

| Guide | Evidence | Status | Last source review | Health note | What it covers |
| --- | --- | --- | --- | --- | --- |
| [Decision journals](decision-journal.md) | some | draft | 2026-11-02 |  | Record a choice, its reasons and expectations before reviewing what happened. |
| [Design iteration and critique log](design-iteration-and-critique.md) | some | draft | 2026-11-02 |  | A version-by-version record of design decisions, reasons, critique and possible next changes. |
| [The Eisenhower Matrix](eisenhower-matrix.md) | some | reviewed | 2026-09-30 |  | Sort tasks by urgency and importance to consider what happens next. |
| [Getting Things Done on paper (David Allen)](getting-things-done-paper.md) | some | reviewed | 2026-09-30 |  | Capture, clarify, organize, review and act using paper-based lists. |
| [Habit Tracking](habit-tracking.md) | strong | reviewed | 2026-11-02 |  | Record chosen behaviors while considering context, measurement and gaps. |
| [Interstitial journaling](interstitial-journaling.md) | some | reviewed | 2026-09-30 |  | Write short timestamped notes between tasks about what happened and what follows. |
| [The Ivy Lee Method](ivy-lee-method.md) | anecdotal | reviewed | 2026-09-30 |  | Rank a short task list and work through it one item at a time. |
| [Pomodoro log (the Pomodoro Technique on paper)](pomodoro-log.md) | some | reviewed | 2026-09-30 |  | Record timed work rounds, breaks, estimates and interruptions. |
| [Project and lab notebooks](project-lab-log.md) | anecdotal | draft | 2026-11-02 |  | A personal log of a question, procedure, configuration, actual observations and a next experiment. |
| [Study and note taking (Cornell notes, retrieval practice, spaced review, flash cards)](study-and-note-taking.md) | some | draft | 2026-11-02 |  | Notes, questions, recall attempts and checked answers, with optional spaced review. |
| [Theme System journal](theme-system-journal.md) | anecdotal | reviewed | 2026-09-30 |  | Use a broad seasonal or yearly theme with brief reflection. |
| [Time logging and lifelogging](time-logging-lifelog.md) | some | reviewed | 2026-09-30 |  | Record how time was spent with optional context and review. |
| [Voice practice and voice training log](voice-practice.md) | some | draft | 2026-11-02 | yes | A record of voice practice, personal impressions and optional measurements. |

### Planners

| Guide | Evidence | Status | Last source review | Health note | What it covers |
| --- | --- | --- | --- | --- | --- |
| [Emergent Task Planner](emergent-task-planner.md) | anecdotal | reviewed | 2026-09-30 |  | Plan a few important tasks alongside time estimates and unexpected work. |
| [Full Focus Planner (Michael Hyatt)](full-focus-planner.md) | anecdotal | reviewed | 2026-09-30 |  | Connect goals, weekly reviews and a small daily priority list. |
| [Passion Planner](passion-planner.md) | anecdotal | reviewed | 2026-09-30 |  | Connect longer-term aspirations with dated steps, weekly plans and reflection. |
| [Planner, sticker and deco culture](planner-sticker-and-deco-culture.md) | anecdotal | reviewed | 2026-09-30 |  | Use decorative materials and community planner practices alongside scheduling. |
| [Time-Block Planner](time-block-planner.md) | some | reviewed | 2026-09-30 |  | Allocate time to activities and revise the plan when circumstances change. |

### Bullet Journal family

| Guide | Evidence | Status | Last source review | Health note | What it covers |
| --- | --- | --- | --- | --- | --- |
| [The Alastair Method](alastair-method.md) | none | reviewed | 2026-09-30 |  | Use columns and dots to organize tasks or future events. |
| [The Bullet Journal Method](bullet-journal.md) | anecdotal | reviewed | 2026-09-30 |  | Capture tasks, events and notes, then review and migrate what matters. |
| [Dutch door spread](dutch-door-method.md) | none | reviewed | 2026-09-30 |  | Cut or fold pages to keep part of a spread visible. |

### Japanese planners

| Guide | Evidence | Status | Last source review | Health note | What it covers |
| --- | --- | --- | --- | --- | --- |
| [Hobonichi Techo](hobonichi-techo.md) | anecdotal | reviewed | 2026-09-30 |  | Use a dated Japanese planner for diary writing, schedules and collected memories. |
| [Jibun Techo (KOKUYO)](jibun-techo.md) | anecdotal | reviewed | 2026-09-30 |  | Combine long-term reference, dated planning and grid-note booklets. |

### Paper and hybrid

| Guide | Evidence | Status | Last source review | Health note | What it covers |
| --- | --- | --- | --- | --- | --- |
| [Digital daily notes](digital-daily-notes.md) | some | reviewed | 2026-09-30 |  | Keep dated notes in software while considering storage, search and privacy. |
| [E-ink journaling and templates](e-ink-templates.md) | some | reviewed | 2026-09-30 |  | Adapt journal pages to e-paper devices and their display constraints. |
| [Paper and Grids (page ruling as a method)](paper-and-grids.md) | some | reviewed | 2026-09-30 |  | Choose page ruling and paper properties for the intended writing or drawing. |
| [Rocketbook and scan systems](rocketbook-and-scan-systems.md) | none | reviewed | 2026-09-30 |  | Capture handwritten pages digitally while considering recognition, storage and privacy. |
| [Traveler's Notebook](travelers-notebook.md) | none | reviewed | 2026-09-30 |  | Combine interchangeable notebook inserts in a portable cover. |

<!-- methods-index:end -->
