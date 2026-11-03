---
title: "Project and lab notebooks"
slug: project-lab-log
category: productivity
summary: "A personal log of a question, procedure, configuration, actual observations and a next experiment."
evidenceLevel: anecdotal
lastReviewed: 2026-11-02
status: draft
licence: CC0-1.0
contributors:
  - Jot contributors
---

# Project and lab notebooks

A project log records what you tried, under which conditions, and what actually happened. This guide covers Jot's personal `project-lab-log@1` profile: a small record for a workshop project, software experiment, craft process or learning exercise. It is an original format adaptation, not a named research intervention. Sources [1–2] were opened on 2026-11-02; their scope is described in section 16.

## 1. At a glance

| | |
| --- | --- |
| Creator | No single creator of project notebooks; this profile is Jot's adaptation |
| Year | 2026 for the Jot profile, not the origin of laboratory notebooks |
| Type | Personal observation and experiment log |
| Time per session | About 2–5 minutes as a starting allowance, not a measured requirement |
| Review rhythm | Optional review before repeating an experiment or changing a setup |
| Cost | Existing notebook or text editor is enough |
| Formats | Paper, plain text, `.jot`; optional supporting files in `.jotz` |
| Best for | Remembering procedures, comparing attempts and finding earlier artifacts |
| Not ideal for | Replacing an institution's required research record or controlled documentation system |
| Learning curve | Low for a short note; careful comparisons need more detail |
| Supplies | A way to write; measurement tools only when the project needs them |
| Official site | None for the method; the profile is defined in Jot's `specification/profiles.json` |
| Evidence level | Anecdotal for this exact personal log; related sources describe recording practice [1–2] |

## 2. Summary

- Start with a question and an actual observation. These are the only required profile fields.
- Add a procedure so another attempt can follow the same steps.
- Name configuration and units whenever a comparison depends on them.
- Keep source artifacts connected to the attempt that produced them.
- Record a next step if one is useful. An inconclusive result can be a complete entry.

## 3. History and origin

There is no single inventor or start date for keeping records of practical work. This guide does not try to establish a history of laboratory notebooks.

The US Office of Research Integrity's introductory educational material describes records as a way to document what was actually done and the results achieved [1]. Its separate data-protection chapter discusses storage, backups and confidentiality [2]. Those are professional research responsibilities, not trials of a personal journal.

Jot's profile adapts that recording purpose to ordinary projects. Its specification requires a question and observation, allows repeated procedure and asset fields, and calls for explicit configuration and units when comparisons depend on them. The profile's 2026 date describes this local adaptation.

## 4. Philosophy and principles

- **Write what happened.** Keep the observation separate from what you hoped would happen.
- **Keep conditions with the result.** A value without its unit or setup may not be comparable with the next value.
- **Leave uncertainty visible.** "Not measured", "estimated" and "cause unknown" are useful statements.
- **Keep the original nearby.** A summary is easier to inspect when it points to the raw photograph, output or notes.
- **Change a record openly.** Explain a correction rather than silently making an old attempt match a later conclusion.
- **Keep the log proportionate.** A personal note can be brief. More detail is useful only when it answers a real question.

## 5. Core components

| Field | What it contains | Required? |
| --- | --- | --- |
| `question` | What this attempt is trying to find out | Yes |
| `observation` | What actually happened, including an inconclusive outcome | Yes |
| `procedure` | A step that was actually performed; repeat for further steps | No |
| `configuration` | Relevant settings, versions, materials, units and conditions | No |
| `asset` | A supporting file or artifact reference; repeat for further files | No |
| `next-step` | A question or action for a later attempt | No |

These are the profile's fields, not a prescribed scientific method. Predictions, deviations and uncertainty can be written in ordinary sentences within the existing fields or surrounding notes. No extra score or success rating is required.

## 6. Setting it up

1. Choose a project name and a place for its notes and artifacts.
2. Write one question that an observation could help answer. "What changes if I use this setting?" is easier to examine than "Is this better?"
3. Describe the current setup before changing it. Include relevant versions, quantities and units.
4. If comparing two attempts, decide what will stay the same and which change you want to try.
5. Reserve a short label for each attempt, such as `test-01`. Use the same label in artifact filenames.
6. After the attempt, write what happened before deciding what caused it.

For the first week, try this only on attempts you would otherwise struggle to remember. There is no need to reconstruct an entire project's history before starting.

## 7. Daily practice

- **Before:** write the question and configuration while the setup is available to inspect.
- **During:** note the steps you actually take. If they differ from the plan, record the difference.
- **After:** write the observation, including units or the way it was judged. Save the source artifact if it matters.
- **Next:** add one next step, or leave it blank if the project is paused or complete.

A useful minimal entry is two sentences: a question and an observation. Do not invent measurements to fill a field. If you only noticed a visual difference, describe it as a visual observation.

## 8. Rhythms

- **Before repeating:** read the earlier setup and check whether the materials, configuration or measurement method changed.
- **Weekly, optional:** look for one unanswered question or missing artifact that matters to the next attempt.
- **At a milestone:** summarize what the attempts suggest, what remains uncertain, and where the supporting records live.
- **After a gap:** start with the setup you can establish now. Mark anything recalled from memory as retrospective.
- **When a project ends:** decide what is useful to retain, how it will be backed up, and what should be removed under any applicable agreement.

## 9. Page anatomy

```text
Project / attempt label / date
Question: what am I trying to learn?
Configuration: settings, versions, quantities, units
Procedure: what I actually did
Observation: what happened; what was not measured
Artifacts: where the original files are
Next step: optional
```

A paper page can use these headings without a grid. A digital record can keep the same order. Place interpretation after the observation so it remains possible to tell which is which.

## 10. Worked examples

All examples are invented. The print settings illustrate record keeping, not a recommended print recipe.

A day: compare ink drying on two sample sheets while keeping the pen, room and test interval the same.

```jot
:::record observation #paper-test-01
method: project-lab-log@1
question: Does sheet B show less visible smearing than sheet A after a 30 s wait?
configuration: Same black pen; one line per sheet; wait measured by timer; room conditions not measured.
procedure: Write one sample line on sheet A and wait 30 s.
procedure: Drag the same type of clean paper strip once across the line; repeat on sheet B.
observation: Both strips showed transferred ink. The mark from B looked lighter by eye; no amount was measured.
asset: assets/paper-test-01-photo.jpg
next-step: Repeat with fresh samples and note whether pressure or line length varies.
:::
```

The observation does not say that B is objectively better. Pressure, line length and the visual judgment remain possible sources of variation. The `asset` line illustrates a file reference, not an included image: omit it unless you attach a real file at that path before packaging.

A week of attempts:

| Attempt | What changed | Observation | What can be said |
| --- | --- | --- | --- |
| Monday, 01 | First comparison | Both sheets transferred ink | Neither was smear-free in this attempt |
| Wednesday, 02 | Used shorter lines | Transfer looked different | Line length also changed, so this is not a clean comparison with 01 |
| Friday, 03 | Repeated Monday's procedure | Photo was out of focus | The retained image cannot support a close visual comparison |

A month-end note might say: "Three exploratory attempts recorded. We have not established a reliable difference. Keep the original photos and procedure; pause until the comparison is useful again."

A project can end there. A log is still useful when it prevents an uncertain result from becoming a confident claim later.

## 11. Variations and offshoots

- **Software experiment:** record input data, application or package versions, configuration, command or action, and actual output. Keep credentials out of the record.
- **Craft process:** record materials, quantities, tools, sequence and relevant conditions. A photograph can show a result that is hard to describe.
- **Workshop troubleshooting:** record the symptom, one adjustment, and the observation after it. Do not infer a cause solely because two events happened together.
- **Learning exercise:** pair a practice question with the attempt and what to try next; see [drawing practice](drawing-practice.md).
- **Design iteration:** use the [design critique log](design-iteration-and-critique.md) when the main unit is a design decision and feedback rather than an experiment.

## 12. Community practice

Projects may use bound notebooks, shared documents, repositories or electronic laboratory notebooks. Rules about ownership, access, corrections and retention vary with the setting [1–2]. This guide does not make a claim about which tool most communities use.

For a personal project, share a chosen summary rather than assuming the whole notebook should be public. In team or institutional work, establish who may access or copy the materials before moving them into a personal journal.

## 13. Official products and formats

There is no official product for this generic practice. Jot's `project-lab-log@1` is one small record structure, not an electronic laboratory notebook certification.

No product price is needed to follow the guide. Existing paper or a text file is sufficient for a personal record.

## 14. Tools and supplies

- A notebook or an accessible text editor.
- A ruler, timer or other measuring tool only if the question needs it.
- A camera or file-export tool for supporting artifacts.
- A consistent project folder and a backup appropriate to the material.

Record the instrument or method when it matters. A displayed number is not automatically an accurate or calibrated measurement.

## 15. Digital and hybrid versions

A paper notebook can point to an artifact folder using the attempt label. A text file can sit beside source files and outputs. A `.jotz` can package local assets with the journal, subject to Jot's supported asset formats and limits.

A file's modification time is not a complete account of who changed it or when. Version control can preserve selected revisions, but neither an ordinary `.jot` file nor a repository by itself establishes a controlled, tamper-evident laboratory record.

Try reopening a retained artifact after moving or packaging the project. A filename is only a useful reference while the intended file can still be identified and read.

## 16. Evidence and research

**Evidence level: anecdotal for this exact personal log.** No direct evaluation of `project-lab-log@1` was identified in the sources consulted here. The source check was a focused reading of educational recording guidance, not a systematic review of notebook research.

| Topic | What the source supports | Limit |
| --- | --- | --- |
| Record actual work and results | ORI's data-collection chapter describes that purpose and discusses corrections [1] | Professional research guidance, not evidence that this personal format improves outcomes |
| Keep source material usable and protected | ORI discusses safe storage, backups and confidentiality [2] | The older chapter's retention examples are not current policy advice for a particular project |
| Explicit configuration and units | Jot's profile requires them when comparisons depend on them | A recording convention and design choice, not a tested effect of this worksheet |

A detailed record can make a comparison inspectable. It cannot repair a weak procedure, missing controls, unavailable data or an unreliable measurement. Repeating an attempt is also not enough to establish a general result.

The ORI chapters concern accountable professional research. Some of their specific notebook recommendations are stricter than this personal format. This guide borrows the recording purpose; it does not claim that Jot meets those requirements or guarantees reproducibility.

## 17. Benefits

- The question, conditions and observation can be read together later: a property of this record structure.
- Original artifacts can be located through the attempt label: a practical convention.
- Earlier uncertainty can remain visible instead of being replaced by the final story: a design intention.
- Recording and protecting actual work aligns with the purpose described by ORI [1–2].

These are reasons to try the format. They are not measured improvements in research quality, learning or productivity.

## 18. Pitfalls

- **Recording only successful attempts:** an omitted failure can make the surviving history misleading.
- **Changing several things:** record all changes; do not assign the result to one without further evidence.
- **Missing units:** "time: 12" cannot distinguish seconds from minutes. Write the unit with the value.
- **Comparing incompatible measurements:** note when the tool, scale, version or judgment method changed.
- **Overwriting the source:** keep raw output separate from a cleaned or annotated copy when it is useful and permitted.
- **Treating a backup as a test:** check that a needed file can actually be restored and opened.
- **Logging everything:** omit detail that does not serve the question or later interpretation.

## 19. Accessibility and adaptations

- **Vision:** use plain headings and text descriptions of image findings. Do not rely on colored marks alone.
- **Motor:** type or dictate the two required fields; add procedure detail later while it is still known.
- **Memory and attention:** keep the headings beside the workspace. Record one step at a time rather than reconstructing the session.
- **Energy:** use "not measured" or "attempt paused" when accurate. A short observation can close a session.
- **Screen readers:** use a linear entry instead of a wide comparison table; include units in text.
- **Language:** use familiar terms and keep an equipment label or version exactly as printed when it is needed to identify the setup.

## 20. Comparison

| | Project log | [Design critique log](design-iteration-and-critique.md) | [Drawing practice log](drawing-practice.md) | [Time log](time-logging-lifelog.md) |
| --- | --- | --- | --- | --- |
| Main unit | An attempt and observation | A design version and decision | A practice session | Time spent |
| Key question | What happened under these conditions? | Why did this version change? | What did I practice and notice? | What did I spend time on? |
| Artifact role | Supporting evidence | Shows a design state | Shows a practice sample | Usually optional |

## 21. Combining

Keep a project log beside a daily diary if both are useful; the diary does not need every procedure. Link a design record when an observation informs a design decision. Use a separate time log if elapsed time is the question rather than making it a required project field.

A summary can point to earlier attempt IDs. It should preserve their uncertainty rather than presenting every earlier entry as support for a later conclusion.

## 22. Ready-to-use bank

- Question: What am I changing, and what do I want to observe?
- Configuration: Which materials, versions, quantities and units matter?
- Procedure: What did I actually do differently from the plan?
- Observation: What happened? What was estimated or not measured?
- Artifact: Which original file belongs to this attempt?
- Next step: What small comparison would answer the remaining question?

A two-line starting point is enough: "Question: ___" and "Observation: ___".

## 23. Glossary

- **Artifact:** a retained output, photograph, file or other supporting item.
- **Configuration:** the relevant settings, versions, materials and conditions of an attempt.
- **Observation:** what was seen or measured, distinguished from an explanation of why it happened.
- **Procedure:** the steps actually performed.
- **Revision:** a later change to a record or procedure, identified as a change.
- **Unit:** the stated scale of a quantity, such as seconds or millimeters.

## 24. FAQ

**Do I need to measure everything?** No. Measure only what the question needs. Label a visual judgment or estimate as such.

**Can I correct a mistake?** Yes. Note what changed and why. Keep an earlier artifact where useful and permitted; retaining sensitive material forever is not the aim.

**Does a repeat prove the result?** No. It adds another observation under recorded conditions. The procedure and interpretation still need scrutiny.

**Can I use this for formal laboratory work?** Only within your institution's rules. This guide does not establish compliance, authorship, approval, ownership or an audit trail.

## 25. For Jot

Adopt the existing profile fields without expanding the minimum beyond question and observation. Make repeated procedure and asset entries readable, and keep configuration and units visible beside comparisons.

Preserve the writer's words and links between revisions. Treat files and artifacts as supporting material, not automatically verified evidence. Do not add automatic causal conclusions, experiment success scores or claims of regulated record keeping.

## 26. Open questions

- Whether this exact format improves recall of project work or the quality of later decisions has not been tested in the sources consulted.
- How much detail is enough depends on the project and the intended reader.
- Long-term access to proprietary artifact formats remains a practical concern.
- Formal work needs a separate assessment of applicable record, access, retention and approval requirements.

## 27. Further reading

The [digital daily notes guide](digital-daily-notes.md) covers keeping ordinary files over time. The [design iteration guide](design-iteration-and-critique.md) covers feedback and decision history. These are companion guides, not independent studies validating this profile.

## 28. Sources

The two ORI educational chapters below were opened and read on 2026-11-02. They were used for the purpose of recording actual work, protecting source material and distinguishing personal notes from professional record obligations. Their historical policy and retention examples were not audited as current requirements. No efficacy trial of this Jot profile was consulted.

1. "6b. Data collection", *Introduction to the Responsible Conduct of Research*, chapter 6, Data Management Practices. US Office of Research Integrity, educational chapter, undated on the page. https://ori.hhs.gov/education/products/RCRintro/c06/2c6.html
2. "6c. Data protection", *Introduction to the Responsible Conduct of Research*, chapter 6, Data Management Practices. US Office of Research Integrity, educational chapter, undated on the page. https://ori.hhs.gov/education/products/RCRintro/c06/3c6.html
