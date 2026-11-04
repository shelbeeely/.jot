---
title: "Travel, nature and field observations"
summary: "A personal record of places and observations, with context and uncertain identifications kept distinct."
slug: travel-field-log
category: reflective-writing
evidenceLevel: anecdotal
lastReviewed: 2026-11-02
status: draft
licence: CC0-1.0
contributors:
  - Jot contributors
---

# Travel, nature and field observations

A field log keeps what you noticed, where you were and the conditions around it. It separates a direct observation from an identification or explanation you are still checking. This guide describes Jot's original `travel-field-log@1` profile [1], rather than a single established journaling system. Sources checked 2026-11-02; this is a draft.

## 1. At a glance

| | |
| --- | --- |
| Creator | No single creator of field notebooks; this profile is a Jot adaptation [1] |
| Year | 2026 for the Jot profile; no single origin date claimed for the wider practice |
| Type | Observation log with optional travel reflection |
| Time per entry | A sentence, or a few minutes if useful; suggested effort, not a tested dose |
| Time per week | Optional review of a few entries |
| Cost | Existing paper and a pen, or an ordinary text file |
| Formats | Notebook, sketchbook margin, `.jot`, optional real attachments in `.jotz` |
| Best for | Keeping details of a place, a walk, a journey or an observation worth checking |
| Not ideal for | Substituting for a defined scientific survey, navigation or an emergency plan |
| Learning curve | Low for personal notes; specialist identification takes its own learning |
| Supplies | A way to write; camera, map and field guide are optional |
| Official site | None for this combined method |
| Evidence level | Anecdotal for this exact journal format; standards and project guidance inform recording choices [2–4] |

## 2. Summary

- Write what you actually noticed in `observation`, the only required profile field [1].
- Add `place`, `at` or `weather` when they help interpret the entry.
- Put an uncertain species, cause or explanation in `hypothesis`, with its uncertainty intact.
- A sketch, sound recording or photograph may help; an attachment is optional.
- Precise coordinates are optional and excluded from sharing by default under the profile [1]. Review the actual copy and attachments before sending anything.

## 3. History and origin

Field notebooks belong to several traditions: travel diaries, natural history, surveying and scientific observation. This guide does not assign those traditions a single inventor or date.

Darwin Core supplies a shared vocabulary for biodiversity records, with distinct concepts for an event, location, occurrence, identification and identification uncertainty [2]. eBird supplies its own rules for bird observations and checklists [3]. These are relevant recording practices, not origins of Jot's profile.

In 2026, Jot included `travel-field-log@1` as an original complementary profile [1]. Its small field set is a personal capture format, not an implementation of Darwin Core or an automatic submission to a citizen-science project.

## 4. Philosophy and principles

- **Notice before naming.** "Three small birds on reed stems" can remain useful when the species is unknown.
- **Keep uncertainty.** A later identification should not make an earlier guess look certain.
- **Context earns its place.** Record time, weather or location when they answer a question, rather than filling every box.
- **A personal visit is not a survey.** What you did not notice is not automatically absent.
- **Share deliberately.** A useful private detail may be unsuitable for a public travel note.

These are recording and design choices. This guide does not claim they improve wellbeing or identification accuracy.

## 5. Core components

| Profile field [1] | What to put there |
| --- | --- |
| `observation` | Required. What you saw, heard, smelled, felt or otherwise noticed; name the mode when it matters |
| `place` | Optional. A place name at the precision you choose |
| `at` | Optional. The observation time; distinguish it from when you wrote the note |
| `weather` | Optional. Relevant conditions, with units for a measurement and "estimated" when appropriate |
| `hypothesis` | Optional. An identification or explanation still being considered |
| `asset` | Optional. A real attachment path or reference, with context in the surrounding note |

No coordinates, species name, photo or measurement is required. Extra context can remain ordinary prose; this guide does not add required profile fields.

## 6. Setting it up

1. Choose a notebook page or dated journal entry.
2. Make one place for direct observations and a separate line for guesses.
3. Choose whether a broad place name is enough. You can leave location out.
4. If you want photographs, decide where the originals will stay and how you will match them to notes.
5. Begin with one thing you noticed. You do not need a complete account of the trip.

For a first week, keep the same small format. After a few entries, ask which optional details you used when rereading. Keep those; drop the rest. This is a suggested trial, not a research-established schedule.

## 7. Daily practice

There is no daily requirement. During or after a visit:

1. Record the observation in plain words.
2. Add time and conditions if remembered; leave unknown details unknown.
3. Label an estimate or identification guess as such.
4. Keep a later check or correction beside the original account.

If writing would distract from walking, driving, access needs or attention to the place, stop somewhere suitable or write later. A later entry can say "written that evening from memory."

## 8. Rhythms

- **After a visit:** attach or label only the photos you want to keep with the entry.
- **Weekly, optional:** choose one uncertain identification to check against a suitable guide or qualified person.
- **Monthly, optional:** compare visits with their context visible. Different routes, seasons or effort may explain different observations.
- **After a gap:** start with the next visit. Do not invent missing observations or weather.

## 9. Page anatomy

```text
PLACE / TIME    Riverside path, late afternoon
CONDITIONS      Windy; temperature not measured

OBSERVED        Three small birds clinging to reed stems.
                Heard short repeated calls; saw no clear markings.

POSSIBLE        Species uncertain. Check the call if recorded.
LATER NOTE      No recording was made; leave identification open.
```

The separation is more useful than a large number of headings. A single sentence is also a complete personal entry.

## 10. Worked examples

All people, places and observations below are invented.

A day:

```jot
### 2026-11-02

:::record observation #field-reeds
method: travel-field-log@1
observation: Three small birds on reed stems. Short repeated calls; markings not clear.
place: Riverside path
weather: Windy; temperature not measured
hypothesis: Species uncertain
:::
```

A week: three short visits to the same path. The second entry records no birds noticed during a brief conversation; it does not say that no birds were present. A review keeps the first identification unresolved because there is no photograph or recording to check.

A month: four visits have different routes and lengths. The review says, "I noticed more flowers on the sunny route, but I did not survey either route consistently." That is a recollection, not evidence of a population trend.

A later annotation can remain prose:

```text
2026-11-09, later note about #field-reeds:
The guide suggests two possible species. The original view was too brief
to distinguish them. Leave the observation as unidentified small birds.
```

If you add `asset: assets/reeds.jpg`, replace it with the path of a real attachment before packaging. A plausible filename is not an attached photo [1]. Describe what the attachment contributes in nearby text.

## 11. Variations and offshoots

- **Travel impressions:** sound, textures, signs and details of a place, without biological identification.
- **A familiar-place notebook:** return to a window, street or park and describe changes.
- **Sketch-and-note:** a drawing with labels and uncertainty in words.
- **Citizen-science preparation:** a private capture before entering data in a project's own form; follow that project's rules separately [3].
- **Accessible observation:** a seated, indoor, auditory or tactile encounter where appropriate. Walking distance is not a measure of a complete entry.

## 12. Community practice

Naturalists, travelers and citizen-science participants keep records for different purposes. eBird, for example, distinguishes a complete checklist from incidental observations and documents effort and location [3]. Those rules should not be generalized to every journal.

A writer can keep a private nature note without posting it, identifying everything or joining a project. Shared identifications remain suggestions until the supporting evidence justifies a firmer label.

## 13. Official products and formats

There is no official product for this combined method. Jot supplies a personal profile [1]. Field guides, identification apps and citizen-science services have separate terms, requirements and limitations.

## 14. Tools and supplies

Paper and a pen are enough. Optional tools include a camera, an audio recorder, a map and a suitable reference book. Use only tools that help the question you have.

For measured conditions, keep the unit and measurement method in the note. "About 15 °C from a nearby station" is different from a calibrated reading taken beside the observation.

## 15. Digital and hybrid versions

A paper page can have a date or page number that points to a digital photograph. A `.jot` file keeps the words readable; a `.jotz` can carry real attachments [1]. Neither establishes that a species identification is correct.

Before sharing, review place names, routes, faces, signs and image metadata. Broadening the `place` line alone may leave a precise location visible in the image or attachment. Keep a private original and prepare a deliberate sharing copy when useful; do not assume a journal exporter has removed every identifying detail.

## 16. Evidence and research

Evidence level: **anecdotal** for the exact personal log. The checked sources offer standards and operating guidance, not trials showing that this format improves memory, wellbeing or scientific accuracy.

| Source | What informs this guide | Limit |
| --- | --- | --- |
| Jot profile [1] | The required and optional fields and default sharing intent | A format definition is not effectiveness evidence |
| Darwin Core [2] | Distinct observation, identification, uncertainty and location concepts | Jot is not a Darwin Core dataset or a validated identification tool |
| eBird [3] | Date, location, effort and completeness matter for its bird data | A casual journal is not automatically an eBird checklist or a comparable survey |
| GBIF guidance [4] | Sensitive species locations may need controlled or generalized sharing, with changes documented | Its main scope is biodiversity sensitivity; it does not settle personal-privacy law |

No systematic review of personal field-journal outcomes was undertaken. Absence of a direct trial in these sources is not proof that none exists.

## 17. Benefits

- Keeps the original observation beside a later interpretation: a property of the format.
- Makes context available for rereading when the writer records it.
- Leaves room for an unidentified observation rather than forcing a guess.
- Allows a deliberate sharing copy; GBIF recommends preserving original records when generalizing sensitive biodiversity data [4].

These are practical affordances, not measured health or productivity effects.

## 18. Pitfalls

- **A confident label replaces a weak view:** keep the description and uncertainty.
- **A blank becomes an absence:** "not recorded" is not "not present." Defined survey rules may support narrower interpretations [3].
- **Exact location leaks:** check photographs, filenames, captions and route details as well as coordinates.
- **Visits become a comparison they cannot support:** record differing effort and conditions; avoid causal or population claims from a few casual entries.
- **The form takes over the visit:** return to a sentence or stop logging.

## 19. Accessibility and adaptations

- **Vision:** record sound, texture or a description from a companion; identify who made an observation when that distinction matters.
- **Motor:** dictate a note, use a broad pen, photograph an existing written label or make the record later.
- **Energy:** a window observation or one detail from a familiar place is enough.
- **Cognitive load:** use two headings, "noticed" and "maybe," instead of a full form.
- **Sensory needs:** choose a quieter location or time; there is no requirement to remain in an uncomfortable setting.
- **Color vision:** describe markings in words and patterns; color need not carry the whole identification.

## 20. Comparison

| Method | Main purpose | Typical unit | Difference |
| --- | --- | --- | --- |
| Travel and field log | Keep an observation in context | Visit or noticed detail | Identifications can remain open |
| [Five-year diary](five-year-diary.md) | Compare calendar dates across years | A date | Does not need observation conditions |
| [Project and lab log](project-lab-log.md) | Follow a question and procedure | Trial | Makes the test and configuration central |
| Project-specific survey [3] | Collect data under defined rules | Checklist or sample | Has requirements beyond this personal profile |

## 21. Combining

Use a travel narrative around the observation, a drawing log for a study of the scene, or a commonplace entry for a sourced identification note. Keep your observation distinct from a quotation or another person's report.

## 22. Ready-to-use bank

```text
What did I actually notice here?
What could someone else check from this description?
What am I guessing?
Which conditions matter, and which are unknown?
What would I remove from a sharing copy?
```

Minimal headings: `Noticed / Maybe / Later check`. These are optional prose headings, not additional profile fields.

## 23. Glossary

- **Effort:** the time, distance or attention used in looking; defined more strictly by some surveys.
- **Hypothesis:** a possible identification or explanation, not an established observation.
- **Observation:** what was noticed, with its limits.
- **Precision:** how specifically a location or measurement is stated; precision alone does not establish accuracy.
- **Sharing copy:** a deliberately prepared version for a particular audience.

## 24. FAQ

**Do I need coordinates?** No. They are optional and excluded from sharing by default under the profile; review the actual output and attachments [1].

**Can I leave the species unknown?** Yes. A careful description can be a complete entry.

**Can I submit this to a scientific project?** Only after checking its rules and supplying its required information. This profile does not certify suitability.

**Should I rewrite a wrong identification?** Keep the earlier account and add a dated correction or uncertainty note. Do not make a later conclusion appear to have been known at the time.

## 25. For Jot

For Jot, adopt a small observation-first form with optional context and a visible place for uncertainty. Keep precise coordinates optional and excluded from sharing by default, as the profile specifies [1].

Do not infer an identification, silently attach a location, publish a route, or label casual notes as a scientific survey. A sharing interface should let the writer review the resulting text and attachments. These are design recommendations, not claims about an implemented metadata-scrubbing feature.

## 26. Open questions

- Whether this field set helps a writer notice or remember more has not been evaluated here.
- Appropriate location precision depends on the audience, subject and purpose; there is no universal safe radius.
- Identification confidence needs subject-specific expertise; no universal numerical scale is proposed.

## 27. Further reading

The [drawing practice](drawing-practice.md), [commonplace book](commonplace-book.md) and [project and lab log](project-lab-log.md) guides cover related ways to keep sketches, sources and tests. Consult a local field guide for the organisms and region you are observing.

## 28. Sources

Checked 2026-11-02: [1] was read locally; [2–4] were opened on their issuing organizations' sites. [2] was consulted for definitions of events, occurrences, identification uncertainty and location generalization; [3] for checklist completeness, effort and documentation; [4] for its scope and principles on sensitive data. This is a focused source set, not a systematic outcome review.

1. "Travel, nature and field observations (`travel-field-log@1`)". Jot contributors, 2026. [Profile definition](../../specification/profiles.json).
2. "Darwin Core Quick Reference Guide". Darwin Core Maintenance Group, Biodiversity Information Standards (TDWG), living reference. https://dwc.tdwg.org/terms/
3. "eBird Rules and Best Practices". Cornell Lab of Ornithology, updated 17 February 2026. https://support.ebird.org/en/support/solutions/articles/48000795623-ebird-rules-and-best-practices
4. Chapman AD. "Current Best Practices for Generalizing Sensitive Species Occurrence Data". GBIF Secretariat, version 1.0, 2020. https://docs.gbif.org/sensitive-species-best-practices/master/en/
