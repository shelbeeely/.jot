---
title: "Design iteration and critique log"
summary: "A version-by-version record of design decisions, reasons, critique and possible next changes."
slug: design-iteration-and-critique
category: productivity
evidenceLevel: some
lastReviewed: 2026-11-02
status: draft
licence: CC0-1.0
contributors:
  - Journalwright Studio contributors
---

# Design iteration and critique log

A design iteration log keeps one record per version of a design: what was decided and why, what critique it received, and what changes next. Each version links to the one it revises, so the history of a project can be read in order without overwriting earlier thinking. It suits product, graphic, interaction, type, fashion and architectural design, and personal creative projects. Original source check: 2026-10-27. Focused evidence and practical-guidance update: 2026-11-02 (scope in section 28). Anything not confirmed from a primary source is marked **(unconfirmed)**.

## 1. At a glance

| | |
|---|---|
| **Creator** | No single creator. Draws on studio critique ("crits") in art and design education, Donald Schön's reflective practitioner (1983), architecture decision records (Michael Nygard, 2011) and structured critique (Connor and Irizarry, 2015) |
| **Year** | The log format here: 2026 |
| **Type** | Work journal / decision log |
| **Time per day** | 2–5 minutes per iteration or critique session |
| **Time per week** | 5 minutes to read the chain of iterations for each active project |
| **Cost** | $0 |
| **Formats** | Notebook, `.jot` record, screens attached in a `.jotz` |
| **Best for** | Designers and artists who iterate and want to remember why something changed; freelancers explaining decisions to clients; students preparing for crits |
| **Not ideal for** | Formal regulated design-history files (medical devices, for example), which have their own requirements |
| **Learning curve** | Low |
| **Supplies** | None beyond the work itself |
| **Official site** | None |
| **Evidence level** | Some (studies of iteration and feedback; nothing on this log format) |

## 2. Summary

- One record per iteration: **project**, **iteration** (a version label), **decision** and **rationale**.
- Optional **critique** lines record feedback, each paired with **critique-from**, a role (peer designer, client, usability participant), not a person's name.
- **change-next** lists what the next version will try.
- `relation: revises #id` links each version to the one before it, using the standard relation kinds in the Jot specification (section 6.2).
- Screens or photos attach as assets with alt text that says what changed.

## 3. History and origin

- **Studio critique** has long been the core teaching form in art, architecture and design schools; students present work and receive feedback from tutors and peers.
- **1983**: Donald Schön's *The Reflective Practitioner* describes design as a "reflective conversation with the situation": a designer makes a move, sees what it does, and adjusts [1].
- **2003–2004**: the UK Design Council develops its Double Diamond model after a 2003 review of its practice, then starts sharing it at conferences and in presentations in 2004. Its own history distinguishes those events [7]. The model names discover, define, develop and deliver [2].
- **2010**: Dow and colleagues find that creating several prototypes in parallel and getting feedback on them together led to better, more varied designs than revising one at a time [3].
- **2011**: Michael Nygard proposes short architecture decision records with context, decision, status and consequences; a later decision supersedes an earlier one rather than editing it [4].
- **2015**: Adam Connor and Aaron Irizarry publish *Discussing Design*, a framework for critique that ties feedback to the design's objectives [5].
- **2026**: Jot adds a `design-iteration-and-critique` profile.

## 4. Philosophy and principles

- **Decisions keep their reasons.** A decision without a rationale is hard to defend or revisit.
- **Keep the reason as it was understood then.** A later iteration can revise the decision without making the earlier reasoning look more certain than it was. Correct mistakes explicitly. This is a working log, not a requirement to retain personal or sensitive material forever.
- **Critique is about the work and its goals,** not about the person who made it or gave it.
- **Roles, not names.** Feedback is recorded by role unless the person agreed to be named.
- **Show and say.** A screen shows the change; text says what changed, so the log works without images.

## 5. Core components

- **Project**: the project name.
- **Iteration**: a version label (`v3`, `round 2`, `2026-10-27 draft`).
- **Decision**: what this version decided.
- **Rationale**: why. Evidence, constraints, goals.
- **Critique** and **critique-from**: feedback received and the role of who gave it. Repeatable, paired in order.
- **Change-next**: what the next iteration will change. Repeatable.
- **Asset** and **alt**: screens, photos or exports, each with alt text. Repeatable, paired in order.
- **Relation**: `revises #previous-id` to link versions; `about #id` or `responds-to #id` for other links.

## 6. Setting it up

1. Pick a short project name and use it on every record.
2. Give each iteration record an ID (`#signup-v1`, `#signup-v2`) so later ones can link back.
3. In `/write/`, open Methods, search "design" and insert the invitation with its record.
4. Decide in advance how you label critique roles (section 22) and what you have permission to retain or share.
5. Write the question this version is trying to answer. Put the question and any important constraints in the rationale, using the existing fields.
6. Decide what would count as useful evidence: an observed task attempt, an accessibility check, or feedback about a stated goal. A preference is still useful, but label it as a preference.

## 7. Daily practice

- After making a new version: write project, iteration, decision and rationale (2 minutes). Add `relation: revises #previous-id`.
- After a critique session: add critique and critique-from lines, then change-next (3 minutes). Separate what someone observed, what they preferred, and what you infer from it.
- Before acting: say which feedback you will try and why. Conflicting feedback can stay unresolved until the next test; there is no need to average opinions into a verdict.
- If you export a screen, attach it and write alt text that says what changed.

## 8. Rhythms

- **Weekly**: read each project's chain of iterations. Was a change-next item tried, deliberately declined, or still open? Record the reason once rather than copying an ever-growing revision list.
- **After a test**: compare the observation with the question you wrote before the test. If it did not answer the question, say so. A changed screen is not by itself evidence of improvement.
- **At milestones**: summarise the chain in a review record with `relation: summarizes #id` for each iteration.
- **Missed iterations**: if versions were made without records, add one record covering them and say so in the rationale.

## 9. Page anatomy

```
project: Library app sign-up         iteration: v3
revises: #signup-v2
------------------------------------------------------
DECISION   Move the password rules above the field
WHY        2 of 5 testers missed the rules
------------------------------------------------------
CRITIQUE   peer designer: rules read as a wall of text
------------------------------------------------------
NEXT       group the rules as a checklist
------------------------------------------------------
[ screen: sign-up form, rules above the field ]
```

## 10. Worked examples

An iteration with critique (invented content):

```jot
:::record review #signup-v2
method: design-iteration-and-critique@1
project: Library app sign-up
iteration: v2
decision: Show the password rules only after an error.
rationale: Keep the initial form short, then test whether people can find the rules.
:::

:::record review #signup-v3
method: design-iteration-and-critique@1
project: Library app sign-up
iteration: v3
decision: Move the password rules above the field.
rationale: Two of five testers missed the rules when they appeared only after an error.
critique: The rules read as a wall of text.
critique-from: Peer designer
critique: I found the rules before typing this time.
critique-from: Usability test participant
change-next: Group the rules as a short checklist.
asset: assets/signup-v3.png
alt: Sign-up form with four password rules listed above the password field.
relation: revises #signup-v2
:::
```

The asset path is illustrative: attach a real file at that path before packaging, or omit the asset and alt lines.

A week: v1 (Monday), v2 (Tuesday, `revises #signup-v1`), crit on Wednesday added to v2, v3 (Thursday, `revises #signup-v2`). Reading the chain shows the rules moved twice and why.

A month: three projects, each with four to eight iterations; a review record at month end summarizes each project's last decision.

A follow-up to the invented sign-up example:

| Before the next version | What the log keeps |
| --- | --- |
| Question | Can a person find and use the password rules before submitting? |
| Alternatives | A: short checklist above the field. B: checklist beneath the field. Both use the same wording. |
| Observation | In a small exploratory session, one participant using A still missed a rule. |
| Interpretation | Placement alone may not resolve the problem. This is a lead for another test, not a population failure rate. |
| Next decision | Keep the task comparable while trying a shorter rule list. Record that the content changed, so the result cannot isolate placement alone. |

These notes fit in rationale, critique and change-next; they do not add required profile fields. If two things change together, keep that uncertainty visible rather than attributing the result to one of them.

## 11. Variations and offshoots

- **Parallel prototypes**: several records share an iteration label (`round 2a`, `2b`, `2c`) and the same `revises` target; critique compares them [3].
- **Decision records**: for decisions without a visual (a tool choice, a constraint), the same fields work; see also the `decision-journal` profile.
- **Client feedback rounds**: critique-from `client`; change-next becomes the agreed revision list.
- **Self-critique**: critique-from `self`, written after a break.
- **Art series**: iteration labels each piece in a series.

## 12. Community practice

Design teams commonly hold regular critique sessions; formats vary from open studio crits to structured sessions with a stated goal and timebox [5]. Many teams keep decision logs in wikis or repositories alongside their work [4]. Students keep crit notes in sketchbooks. No individual practices are described here.

## 13. Official products and formats

Not applicable: no official product. Architecture decision record templates are freely published [4].

## 14. Tools and supplies

- A notebook or `.jot` file.
- Screenshot or photo tool for assets.
- For in-person crits, sticky notes can be transcribed into critique lines later.

## 15. Digital and hybrid versions

- Plain text records sit beside design files in a project folder or repository and diff cleanly.
- A `.jotz` package can carry screens with their records.
- Design tools' version histories store states, not reasons; this log adds the reasons.

## 16. Evidence and research

- **Parallel iteration and feedback** [3]: in a controlled study, novice designers who made several prototypes in parallel and received feedback on them together produced ads with higher click-through rates and expert ratings, more variety and more self-efficacy than those who iterated one at a time. One study, novice participants, one task.
- **Reflective practice** [1]: an influential qualitative account of how designers work, not an experiment.
- **Decision records** [4]: practitioner proposal, widely adopted; no controlled studies found.
- Evidence level: **some** for related design practice. No direct evaluation of this log format is identified in the cited sources. This is a scoped bibliography, not an exhaustive search proving that no such study exists.

| Claim | Kind of support | Limit for this method |
| --- | --- | --- |
| Parallel alternatives can help design exploration | Controlled design study [3], as recorded in the earlier source check | It tested a prototyping process, not whether keeping these records improves outcomes; the DOI was inaccessible during the focused 2026-11-02 recheck |
| Preserve context, decision and consequences | Nygard's practitioner proposal [4] | A useful documentation pattern, not a controlled efficacy finding |
| Tie critique to objectives | Practitioner framework [5] | Agreement or detailed notes do not establish usability, access or design quality |
| Do not use color as the only signal | Accessibility guidance [6] | A design requirement; it is not evidence that a critique log improves performance |

The practical review steps here help keep observations and interpretations distinguishable. They are design recommendations, not a tested intervention. A count such as "two of five testers" describes those sessions; it should not become a precise estimate of a whole audience.

## 17. Benefits

- Decisions can be explained later, to a client or to yourself (practitioner report, [4]).
- A visible chain can show which alternatives were considered (a design property of the log). The related finding in [3] concerns making parallel prototypes, not documenting a chain.
- Separating critique from decision helps sort feedback into what will change and what will not (practitioner report, [5]).

## 18. Pitfalls

- **Logging every pixel nudge.** Record versions that involved a decision.
- **Critique as verdict.** Feedback is input; the decision and rationale are yours.
- **Names in critique.** Use roles by default, but do not call that anonymous: a role, date or screenshot can still identify someone. Keep only what is needed, summarize where possible, and review permission before sharing comments or work.
- **Collecting feedback as proof.** A preference, a participant's report and an observed task outcome answer different questions. Keep those distinctions in the rationale.
- **Changing the question after seeing results.** Preserve what you hoped to learn and mark a later interpretation as later. An unexpected result can guide the next version without proving the original idea.
- **Broken chains.** Give every iteration an ID so `revises` has a target. An unresolved reference stays visible and does not block writing.
- **Colour-only annotations.** If screens use colour to mark changes, say in alt text what is marked.

## 19. Accessibility and adaptations

- **Vision**: alt text on every screen says what changed; annotations do not rely on color alone (WCAG 1.4.1 [6]). Keep a plain-text decision and relevant observation so the log is useful without inspecting a screen. If a diagram is complex, add a longer description in the record body.
- **Cognitive / executive function**: the required fields are four short lines; critique can be added later.
- **Social energy**: critique-from `self` or written critique instead of live sessions.
- **Hearing**: written critique lines are the record, so spoken crits can be transcribed or replaced with written feedback.
- **Motor**: voice dictation works for every field.

## 20. Comparison

| | Design iteration log | Decision journal | Project and lab log | Architecture decision record |
|---|---|---|---|---|
| Unit | A version of a design | A decision | An experiment | A technical decision |
| Feedback recorded | Yes, by role | No | No | No |
| Version chain | `revises` | Review links back | Optional | "Superseded by" |
| Assets | Screens with alt text | No | Yes | Rarely |

## 21. Combining

- **Moodboard and palette**: the first iteration can link to the board with `relation: derived-from #board-id`.
- **Drawing practice**: sketches made while exploring can be logged as practice.
- **Decision journal**: record predictions about a design decision and review them later.
- **Focus rounds**: time-box design work separately.

## 22. Ready-to-use bank

Critique roles: self, peer designer, design lead, developer, client, usability participant, accessibility reviewer, tutor, classmate, editor, art director.

Prompts:

- What is this version trying to do?
- What did I decide, and what made me decide it?
- Which critique will I act on, and which will I not, and why?
- What is the smallest change that tests the next idea?

Critique questions (after [5]): What is the objective? Which elements relate to it? Are they effective? Why or why not?

## 23. Glossary

- **Crit**: a critique session in art and design education.
- **Iteration**: one version in a sequence of revisions.
- **Parallel prototyping**: making several alternatives at once before choosing.
- **Rationale**: the reasons for a decision.
- **Supersede**: replace an earlier decision with a later one, keeping the earlier record.

## 24. FAQ

- **Can I name the person who gave feedback?** Only if they agreed. Roles are the default.
- **Do I need images?** No. The text record is complete without them.
- **What if a version goes backwards?** Link it with `revises` to the version it changes, and say so in the rationale.
- **Is this suitable for regulated design-history files?** No; those have their own requirements.

## 25. For Journalwright Studio

- **Adopt**: the `design-iteration-and-critique@1` profile; a printable "iteration card" with decision, why, critique and next.
- **Adopt**: a chain view that lists a project's iterations in `revises` order.
- **Don't adopt**: scoring designs, or naming critics by default.
- **Don't adopt**: colour-coded critique types without text labels.

## 26. Open questions

- Whether recording critique by role changes how people write it is unknown.
- Whether this specific record structure improves later decisions, collaboration or recall has not been established by the sources checked here.
- How to keep a useful decision history while honoring deletion or confidentiality needs depends on the project; this guide does not prescribe an immutable archive.

## 27. Further reading

- Bill Buxton, *Sketching User Experiences* (2007).
- Nigel Cross, *Designerly Ways of Knowing* (2006).

## 28. Sources

Original bibliography check recorded 2026-10-27. Focused recheck on 2026-11-02: Design Council's overview [2] and new official history [7], Nygard's article [4], and W3C's color guidance [6] were opened and read. The DOI for [3] returned HTTP 403; its study summary retains the earlier check date and was not independently reverified in this update. The books in [1] and [5] were not re-audited.

1. "The Reflective Practitioner: How Professionals Think in Action". Donald A. Schön. Basic Books, 1983. https://openlibrary.org/works/OL3466056W
2. "The Double Diamond". Design Council. https://www.designcouncil.org.uk/our-resources/the-double-diamond/
3. "Parallel Prototyping Leads to Better Design Results, More Divergence, and Increased Self-Efficacy". S. P. Dow, A. Glassco, J. Kass, M. Schwarz, D. L. Schwartz, S. R. Klemmer. ACM Transactions on Computer-Human Interaction 17(4), 2010. https://doi.org/10.1145/1879831.1879836
4. "Documenting Architecture Decisions". Michael Nygard. Cognitect, 15 November 2011. https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
5. "Discussing Design: Improving Communication and Collaboration through Critique". Adam Connor, Aaron Irizarry. O'Reilly Media, 2015. https://www.oreilly.com/library/view/discussing-design/9781491902394/
6. "Understanding Success Criterion 1.4.1: Use of Color". W3C Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
7. "History of the Double Diamond". Design Council. Official account distinguishes the 2003 development work from sharing the model in 2004; checked 2026-11-02. https://www.designcouncil.org.uk/our-resources/the-double-diamond/history-of-the-double-diamond/
