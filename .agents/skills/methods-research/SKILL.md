---
name: methods-research
description: Consult and cite Jot's journaling methods research (docs/methods/) before deciding. Use when designing or changing a method profile, template, prompt or tracker, or anything about privacy, sharing, collaboration, health, mood or symptom data, safety and crisis wording, therapy-adjacent methods (CBT, DBT, safety plans, expressive writing), reminders, streaks and motivation, accessibility, neurodivergent needs or tone; and when writing DECISIONS.md entries or docs/proposals/.
when_to_use: Also whenever a request names a journaling or planning method, by name or nickname, such as Bullet Journal (BuJo, rapid logging, migration), Alastair method, Dutch door, Theme System journal, Hobonichi, Jibun Techo, Traveler's Notebook, Passion Planner, Full Focus Planner, Time-Block Planner, Emergent Task Planner, GTD, Ivy Lee, Eisenhower matrix, Pomodoro, interstitial journaling, time logging, habit tracker, Year in Pixels, mood tracker, spoon theory, energy accounting, stim log, sensory journal, morning pages, five-minute journal, five-year diary, gratitude, Stoic, Progoff, prompts, commonplace book, Cornell notes, dream journal, shadow work, expressive writing, CBT thought record, DBT diary card, safety plan, symptom tracker, HRT log, voice practice, art or junk journal, moodboard, planner stickers, e-ink templates, Rocketbook, dot grid, ADHD or AuDHD planning, low-demand check-in, task initiation, drawing practice, design critique log, digital daily notes, free diary, shared or dialogue journals, travel or field logs, reading or media journals, decision journals, project or lab logs, food or cooking journals, spiritual reflection, memory or life-story writing, access needs and scripts.
---

# Methods research

The research behind Jot lives in `docs/methods/`. Every method profile has a guide; the index gives the current catalogue.
Load only what the question needs. Use the evidence labels with their scope notes: related treatment or component evidence
does not establish effectiveness of an exact journal format.

1. Read `docs/methods/README.md`: how to use the research, the principles that recur across guides, and the catalogue
   (evidence level, health note, one line per guide).
2. Pick the guides that bear on the change:
   - A profile `<id>@1` has a guide `docs/methods/<id>.md`; the source register documents upstream and original Jot guides
     (`specification/source-register.md`). Original adaptations are labelled as such in their guides.
   - For a topic, search every guide, not just their opening sections:
     `rg -n -i '<topic>|<synonym>' docs/methods/*.md`
3. Read the relevant sections of those guides, around the hits. Read a guide's health or safety note before designing
   anything for that method. Every guide follows `docs/methods/TEMPLATE.md`; the sections that most often decide things
   are 16 "Evidence and research", 18 "Pitfalls", 19 "Accessibility and adaptations" and 25 "For Jot" or the inherited
   "For Journalwright Studio" (design guidance, not verified Jot behavior). Find them with `rg -n '^## ' docs/methods/<file>.md`.
4. Decide, then cite: `docs/methods/<file>.md, line N`, with a short quote where wording matters, in the decision,
   proposal, commit or answer.
5. Keep each guide's evidence wording (evidenced, supported, claimed, uncertain, unconfirmed). If the guides are silent or
   disagree, say so; never present a design choice as a research finding. If a decision goes against a guide's advice,
   name the guide and say why.

Do not copy guide text into the spec, site or profiles beyond short quotes. The guides are CC0; some are inherited from
upstream and others are original to Jot (`specification/source-register.md`). Corrections belong in the guide, with the
difference and source-check scope noted in the register. Do not imply a targeted check reviewed the entire bibliography.
After research edits, run `node tools/check-methods.mjs`, regenerate the methods index and regenerate the manifest last.
