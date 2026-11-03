# Jot Writer v1 brief: a first journal

Status: the owner established the primary audience on 30 October 2026. The experience below is a delivery proposal;
onboarding changes and user validation are not implemented or completed.

Writer v1 is a product milestone, separate from the Jot v1 draft format and parser implementation version.

## Audience and promise

Jot is for people who have never journaled and would like help getting a start. They should be able to write something of
their own without knowing a journaling method, Markdown, Jot syntax or file formats.

Working promise: **Start your journal with a few words. Find your own way as you go.**

The reason to choose Jot should be that it makes beginning approachable and returning easy. Attractive pages can make the
writing satisfying to keep; portable files and local processing support trust. These are supporting qualities, rather than
prerequisites someone must understand before writing. Printing is optional.

This is a product direction, not a demonstrated advantage over other journaling products. Validate it with people who have
never journaled. Do not promise improved mental health, productivity or a lasting habit.

## Software-first scope and optional paper use

The owner deferred all dedicated physical hardware and firmware work on 31 October 2026. Writer v1 focuses on the software
experience using existing computers, phones and input devices. There is no selected device, parts list, enclosure,
hardware prototype or firmware port in current scope. Physical hardware and firmware will be explored later, as recorded
in the [roadmap](../../specification/ROADMAP.md#physical-hardware-and-firmware-future-exploration).

Paper writing is already a complete journal entry. Digitizing it is optional and can wait until after writing; never make
someone transcribe an entry twice. Keep original handwriting, drawings and scans when adding reviewed text. Existing
software can support deliberate import, backup, search and optional printing. Beginning a journal must not require
purchasing or assembling a dedicated device.

These are product choices informed by `docs/methods/rocketbook-and-scan-systems.md, line 539` (optional later capture),
`docs/methods/digital-daily-notes.md, line 421` (hybrid handwriting), and `docs/methods/e-ink-templates.md, line 520`
(navigation, lock-in and setup pitfalls). The guide calls reduced distraction **plausible by design**, not tested directly
for journaling (`docs/methods/e-ink-templates.md, line 502`); reduced social-media use is a goal to evaluate, not a proven effect.

## The format and Jot Writer

The beginner-first audience guides **Jot Writer**, the application. **Jot**, the format, remains a general, progressively
structured way to keep journal content. Beginners should not need to know its name, syntax or version to begin writing.

| Layer | Responsibility | Examples |
| --- | --- | --- |
| Format | Define saved content and its meaning across tools | Writing, dates, tasks, links, records, attachment references, optional profile contracts and portable layout intent |
| Parser and renderer | Interpret the file and present supported content | Recognize a dated entry, validate a supported profile, draw a task or lay out a printed page |
| Writer | Help a person create, keep and return to their journal | Beginner guidance, suggested questions, method/template selection, editing controls, browser recovery, file dialogs and save explanations |

For example, the writer offers a starting question. Temporary onboarding instructions stay in the interface. When someone
chooses a prompt to answer, retain its exact wording with their answer so the entry keeps its context, as required for
filled templates in spec §7. Another editor can preserve both without implementing the same onboarding. A dated entry has
a defined representation in the format; a Today button and the decision to offer it belong to the writer.

Some presentation choices cross the boundary deliberately. An author's saved page size or layout hint is portable document
intent, so its representation belongs to the format. The renderer applies it within its declared capabilities. Editor zoom,
open panels, focus mode and onboarding dismissal are local interface preferences. Previewing a handwritten style alone does
not establish that every appearance setting is saved in the journal.

Keep method contracts separate from teaching a method: a versioned record profile belongs to interchange; its explanation,
invitation and template chooser belong to the application. The spec already separates Core Reader, Profile Processor and
Renderer capabilities (§1), treats templates as separate versioned application resources (§7), and describes portable layout
directives (§8). This brief proposes no new syntax or changes to those conformance rules.

Track readiness separately: a stable format needs clear parsing, preservation and interoperability checks; Writer v1 needs
a trustworthy first-entry and return experience. A simple writer can use the format without exposing all its capabilities.

## What the source already supports

- `site/dist/studio.mjs` initializes a fresh writer with an empty source. It does not fill the journal with demo prose.
- `site/dist/live-writer.mjs` offers "Start anywhere. A sentence is enough." Ordinary paragraphs are valid journal content.
- The homepage explains formats, marks, methods and printing. The writer offers a large methods catalogue behind its tools.
- Browser autosave, device saving where supported, downloads and reopening exist. Recovery conflicts, storage exhaustion and
  real-device checks remain stabilization work in `specification/ROADMAP.md`.

These observations come from source inspection, not an observed novice usability session. A blank page with reassurance
still leaves the person to decide what to write. The proposed help addresses that uncertainty without requiring a method.

## First entry

1. The homepage explains in ordinary language that no journaling experience is needed. Its main action invites someone to
   start their first entry. Keep the homepage informational, with no writing form.
2. An empty new journal offers one short, concrete question, for example "What can you hear right now?" Include reassurance
   that a few words are enough, an option to try another question, and a clear way to write freely.
3. The person can type immediately. No setup questionnaire, method selection, account, word target or daily commitment is
   required. They can continue writing after answering; there is no required form to complete.
4. Temporary onboarding instructions and controls stay outside the saved journal. When someone chooses a prompt or template
   to answer, retain the exact question wording with their writing. Do not invent answers or autobiographical content.
   Typing, dismissing or changing help preserves source, selection, composition and undo.
5. Saving explains where the writing is kept. Browser autosave and a device file are distinct. A cancelled or failed save
   must not imply that a portable copy exists. A short entry is complete without points, confetti or a word-count goal.
6. Returning restores existing writing and offers an obvious way to continue or write something new. Do not cover restored
   or opened journals with first-visit onboarding. After a gap, there is no backlog, missed-day count or catch-up request.

The example question comes from the light prompt bank in `docs/methods/prompt-journaling.md, line 479`. Wording and the
number of alternative questions are implementation choices to test, not settled research findings. Keep help accessible
in both live and Source editing, outside print/export, and absent while a journal is locked.

## Introduce more only when useful

Let someone finish an entry before inviting them to explore methods, decorate a page, add trackers, build templates or
learn syntax. Keep existing tools available by choice. Beginner guidance must not erase preferences or force an established
writer into a simplified mode. Deeper reflective and therapy-adjacent methods remain deliberate choices with their own
guidance; they are not default onboarding.

## V1 acceptance

- A fresh visitor can write and retain a short entry without choosing a method or learning syntax.
- They can decline the question and understand that a small, ordinary entry is enough.
- They can tell where their writing is saved, keep a portable copy, reopen it and continue.
- Reloads, storage failure, two open tabs, locked journals and cancelled file dialogs cannot silently discard newer writing.
- The core journey works with keyboard navigation and a screen reader, on narrow screens and with input composition;
  physical mobile typing and save/download behavior are checked separately from browser emulation.
- Someone returning after a gap can resume without being asked to backfill or meet a daily goal.

Observe first-time journalers using their own words to assess the experience. Ask what they expected to write, whether they
felt finished, where they believe their entry is stored, and how they would return. Any research session is voluntary and
does not require them to reveal their journal's content. Do not add journal-content analytics or network requests to measure
these outcomes. No user sessions have been conducted for this proposal.

## Research and limits

- Concrete wording, short answers, choice and no required disclosure: `docs/methods/prompt-journaling.md, line 436`.
- Optional prompts and free-writing space: `docs/methods/prompt-journaling.md, line 430`.
- Prompt-based help with starting is **claimed**, not studied as such:
  `docs/methods/prompt-journaling.md, line 406`. Test the novice experience rather than claiming proven effectiveness.
- Shorter check-ins are a reasonable design choice, not a proven benefit; the specific format has **anecdotal** evidence:
  `docs/methods/low-demand-check-in.md, line 179`. This brief borrows its low-pressure approach, not its three-number form.
- No streaks, catch-up prompts or missed-day counts: `docs/methods/low-demand-check-in.md, line 259`.
- Avoid growing templates and turning setup into the task: `docs/methods/digital-daily-notes.md, line 489`.

The guides do not establish which first-visit layout, action label or saving explanation works best for new journalers.
Those require implementation checks and observation with the intended audience.
