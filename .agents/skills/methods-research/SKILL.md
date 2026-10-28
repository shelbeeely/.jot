---
name: methods-research
description: Consult and cite Jot's journaling methods research (docs/methods/, 52 guides) before deciding. Use when designing or changing a method profile, template, prompt or tracker, or anything about privacy, sharing, collaboration, health, mood or symptom data, safety and crisis wording, therapy-adjacent methods (CBT, DBT, safety plans, expressive writing), reminders, streaks and motivation, accessibility, neurodivergent needs or tone; and when writing DECISIONS.md entries or docs/proposals/.
---

# Methods research

The research behind Jot lives in `docs/methods/`: 52 guides of 300 to 900 lines each. Load only what the question needs.

1. Read `docs/methods/README.md`: how to use the research, the principles that recur across guides, and the catalogue
   (evidence level, health note, one line per guide).
2. Pick the guides that bear on the change:
   - A profile `<id>@1` usually has a guide `docs/methods/<id>.md` (`ls docs/methods/<id>.md`); the source register maps
     the rest (`specification/source-register.md`). Profiles without a guide are original to Jot.
   - For a topic, search every guide, not just their opening sections:
     `grep -n -i -E '<topic>|<synonym>' docs/methods/*.md | cut -c1-200`
3. Read the relevant sections of those guides, around the hits. Read a guide's health or safety note before designing
   anything for that method. Every guide follows `docs/methods/TEMPLATE.md`; the sections that most often decide things
   are 16 "Evidence and research", 18 "Pitfalls", 19 "Accessibility and adaptations" and 25 "For Journalwright Studio"
   (what a journal product should take from the method). Find them with `grep -n '^## ' docs/methods/<file>.md`.
4. Decide, then cite: `docs/methods/<file>.md, line N`, with a short quote where wording matters, in the decision,
   proposal, commit or answer.
5. Keep each guide's evidence wording (evidenced, supported, claimed, uncertain, unconfirmed). If the guides are silent or
   disagree, say so; never present a design choice as a research finding. If a decision goes against a guide's advice,
   name the guide and say why.

Do not copy guide text into the spec, site or profiles beyond short quotes: the guides are CC0 but are maintained
upstream (`specification/source-register.md`). Corrections to a guide belong in the guide, with the difference noted in
the source register.
