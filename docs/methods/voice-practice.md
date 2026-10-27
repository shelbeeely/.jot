---
title: "Voice practice and voice training log"
slug: voice-practice
category: productivity
evidenceLevel: some
lastReviewed: 2026-10-27
status: draft
licence: CC0-1.0
contributors:
  - Jot contributors
---

# Voice practice and voice training log

A short practice log for anyone working on their voice: gender-affirming voice training (feminizing, masculinizing, androgynous or simply "more like me"), singing, speech after illness, or an accent or presentation goal of the writer's own. It records what was practised, for how long, how the voice felt and, only if the writer wants, a pitch figure and the name of a recording. Sources checked 2026-10-27; anything not confirmed from a primary source is marked **(unconfirmed)**.

> **Not medical advice and not an assessment.** This log does not tell anyone what their voice should sound like. Pain, hoarseness that lasts, or a voice that tires quickly are reasons to rest and to see a voice clinician (a speech-language pathologist or laryngologist), not to practise harder.

## 1. At a glance

| | |
| --- | --- |
| Creator | No single creator. A Jot profile built from common practice-log habits and the voice section of the [gender euphoria and HRT log](gender-euphoria-and-hrt-log.md) |
| Year | 2026 (this profile) |
| Type | Practice log with optional numbers |
| Time per day | 1 to 2 minutes of writing after practice |
| Time per week | 5 to 10 minutes for a weekly listen-back |
| Cost | Free. Optional: a drinking straw, a pitch app |
| Formats | Paper, `.jot`, `.jotz` with clips attached |
| Best for | People practising voice on their own or between clinician sessions who want to see patterns over weeks |
| Not ideal for | Days when listening to your own voice is distressing (skip the numbers and recordings; the log still works) |
| Learning curve | Low |
| Supplies | Notebook or the Jot workspace; optional recorder or phone |
| Official site | None for the log. Clinical context: ASHA's practice portal [3] and WPATH SOC-8 [1] |
| Evidence level | **Some**: voice training has review evidence, rated low quality [5]; the journaling layer itself is untested |

## 2. Summary

- One short record after each practice: `minutes` and `exercise` are enough.
- Optional numbers (`pitch-hz`, `resonance`, `felt-like-me`) chart over weeks, so slow change becomes visible.
- `strain` is logged every time it shows up, because strain is the signal to stop.
- Recordings are named, not required. Listen back weekly rather than after every session.
- The writer sets the goal. There is no built-in target voice, "passing" score or comparison with anyone else.

## 3. History and origin

Practice logs are as old as music teaching. Gender-affirming voice work became a named clinical area over the last few decades, and the WPATH Standards of Care added a voice and communication chapter (it appeared in version 7 in 2012 and was expanded in version 8 in 2022 [1]). Clinician questionnaires such as the Transsexual Voice Questionnaire (TVQ<sup>MtF</sup>, 30 items, 4-point scale; Dacakis et al. 2013 [2]) measure how people feel about their voice; a journal does not need a validated instrument and uses a single daily "felt like me" rating instead, as the gender euphoria log already suggests.

| Date | Event |
| --- | --- |
| 2006 | Titze sets out the science behind semi-occluded vocal tract exercises such as straw phonation [4] |
| 2012 | WPATH SOC-7 includes voice and communication [1] |
| 2013 | Dacakis et al. publish the TVQ<sup>MtF</sup> [2] |
| 2015 | Davies and Johnston explore its content validity with five trans women [6] |
| 2015 | Azul reviews transmasculine voice research and finds little on voice training [7] |
| 2022 | WPATH SOC-8 voice and communication chapter [1] |
| 2023 | Schwarz et al. update a systematic review of speech therapy for trans women [5] |
| 2026 | Jot adds the `voice-practice@1` profile |

## 4. Philosophy and principles

- **Your voice, your goal.** A goal is written by the writer (`goal:`) or not at all. Many people want a voice that feels like theirs more than one that meets a number.
- **Pitch is one part.** Resonance, intonation, voice quality and how you speak all matter [3]. A log that only tracks Hz misses most of the work.
- **Rest is part of practice.** Strain is recorded so it can be respected.
- **Dysphoria is never required.** Recording joy and ease is as valid as recording difficulty.
- **Your voice is identifying.** Recordings and pitch data stay private unless deliberately shared.

## 5. Core components

| Field | What it holds | Notes |
| --- | --- | --- |
| `minutes` | Practice length | Number. Required |
| `exercise` | What you did | Required. e.g. resonance, pitch glides, reading, straw phonation, humming, conversation |
| `pitch-hz` | Median speaking pitch in hertz | Optional number. Different apps report differently; compare only with the same app and task |
| `resonance` | Your own ordinal rating | Optional number on a scale you define, e.g. 1 darker to 5 brighter |
| `strain` | none / some / a lot | Optional. "A lot" means stop for the day |
| `felt-like-me` | 1 to 5 | Optional number |
| `recording` | Clip name or path | Optional. A clip attached to a `.jotz`, or a file kept elsewhere |
| `goal` | Your words | Optional |
| `at` | Time | Optional |
| `body` | Anything else | Optional |

## 6. Setting it up

1. Decide what you are practising toward, in your own words, or leave it open.
2. If you want ratings on fixed axes, write two scale records once at the top of the journal (see section 10).
3. Pick where recordings live: attached to the journal (the workspace's **Attach** turns `.jot` into `.jotz`) or a folder on your device.
4. First week: log only `minutes`, `exercise` and `strain`. Add numbers later if they help.

## 7. Daily practice

- 5 to 20 minutes of practice, as you or your clinician planned.
- Straight after: one record. Under a minute.
- If you used a pitch app, copy its median for the reading or speaking task. Use the same passage each time if you want the figures to be comparable.

## 8. Rhythms

- **Weekly:** listen to one or two clips from the start and end of the week. Write a sentence. Look at the chart if you keep numbers.
- **Monthly:** reread the `goal:` lines; change them if they no longer fit.
- **Missed days:** nothing to catch up. A gap in the chart is a gap, not a zero.

## 9. Page anatomy

```
#### Voice
[session] 12 min · straw phonation, then reading
          pitch 182 Hz · resonance 3/5 · strain none · felt like me 4/5
          clip: voice-2026-10-27.m4a
          The warm-up made the reading easier.
```

## 10. Worked examples

A day:

```jot
### 2026-10-27 | Tuesday

:::record session
method: voice-practice@1
minutes: 12
exercise: straw phonation, then reading aloud
pitch-hz: 182
resonance: 3
strain: none
felt-like-me: 4
recording: voice-2026-10-27.m4a
body: The warm-up made the reading easier.
:::
```

Scales once, then ratings as measurements that name them, so each chart has fixed, labelled axes:

```jot
:::record scale #resonance-scale
name: resonance
kind: ordinal
minimum: 1
maximum: 5
anchor-low: Darker, heavier
anchor-high: Brighter, lighter
:::

:::record scale #felt-like-me-scale
name: felt like me
kind: ordinal
minimum: 1
maximum: 5
anchor-low: Did not feel like me
anchor-high: Felt like me
:::

### 2026-10-28 | Wednesday

:::record session
method: voice-practice@1
minutes: 8
exercise: pitch glides
pitch-hz: 176
strain: some
body: Throat felt tight after five minutes, so I stopped.
:::

:::record measurement
method: voice-practice@1
metric: felt-like-me
value: 3
scale: #felt-like-me-scale
status: observed
:::

:::record chart
metrics: pitch-hz, felt-like-me, minutes
start: 2026-10-26
end: 2026-11-01
:::
```

A month: four weekly listen-back notes and a chart over the month (`start:` and `end:` covering the month) are usually enough.

## 11. Variations and offshoots

- **No numbers:** `minutes`, `exercise`, one sentence.
- **Clinician homework log:** add the exercise names your clinician uses; bring the chart to sessions if you choose.
- **Singing:** use `exercise: scales` and `goal:` for repertoire.
- **Masculinizing voice:** testosterone often lowers pitch but does not by itself settle resonance or how a voice is heard [7]; the same fields apply.

## 12. Community practice

Trans and nonbinary people share voice exercises, clips and progress in online communities and with community voice coaches. Common habits: a fixed reading passage, weekly recordings, celebrating small wins. Sharing clips publicly is a personal choice with privacy costs.

## 13. Official products and formats

Not applicable: there is no official voice practice journal. Clinic-provided home practice sheets vary.

## 14. Tools and supplies

- A drinking straw (straw phonation) or a cup of water and a straw (water-resistance variant).
- A recorder: any phone voice memo app.
- A pitch analyser: Praat (free, desktop, research-grade) [8] or a phone app. Copy the median, not the momentary reading.
- Headphones for listen-back.

## 15. Digital and hybrid versions

In Jot the record is plain text, so it opens in any editor. The workspace and the VS Code extension draw charts from `minutes`, `pitch-hz`, `resonance` and `felt-like-me`. Clips can travel inside a `.jotz`. Nothing is uploaded: Jot does not analyse audio or send recordings anywhere.

## 16. Evidence and research

- **Voice training works for some outcomes.** Schwarz et al. (2023) pooled studies of speech therapy for trans women and found average gains in fundamental frequency of roughly 25 to 39 Hz depending on the speaking task; the authors rate the evidence as low quality (no randomized trials, small samples) [5]. SOC-8 recommends that voice and communication support be available [1].
- **Semi-occluded vocal tract exercises** (straws, lip trills, humming) have a modelling rationale [4] and are widely used; this doc makes no claim about their size of effect for gender-affirming goals.
- **Transmasculine voice:** research on voice training is thin [7].
- **Journaling the practice:** no study tests a voice practice journal. Evidence level is **some** because the practice being logged has evidence; the log itself is anecdotal.

## 17. Benefits

- Slow change becomes visible over weeks (practitioner report).
- Strain is noticed early and rest is taken (practitioner report; consistent with clinical advice to avoid vocal damage [3]).
- A record to bring to a clinician, if wanted.

## 18. Pitfalls

- **Chasing a number.** Pitch alone does not make a voice feel right. Recover: hide `pitch-hz` for a week and rate `felt-like-me` only.
- **Listening every day.** Daily listen-back can amplify distress. Weekly is enough.
- **Pushing through strain.** Stop, note it, and rest. Persistent strain is a reason to see a clinician.
- **Comparing with others.** Voices differ; the log has no comparison view on purpose.

## 19. Accessibility and adaptations

- **Dysphoria-heavy days:** skip recordings and numbers; `minutes` and `exercise` are complete.
- **Hearing differences:** rely on felt sensations (`body:`) and the chart rather than listen-back.
- **Motor or energy limits:** shorter sessions; `minutes: 3` counts.
- **Screen readers:** charts have a text alternative and a table of numbers.

## 20. Comparison

| | Voice practice (this) | [Gender euphoria log](gender-euphoria-and-hrt-log.md) voice section | [Habit tracking](habit-tracking.md) | [Pomodoro log](pomodoro-log.md) |
| --- | --- | --- | --- | --- |
| Focus | Voice sessions and how they felt | Euphoria, HRT, appointments | Did it / didn't | Focus rounds |
| Numbers | Optional pitch and ratings | Daily 1–5 | Ticks | Rounds |
| Recordings | Named | File name or date | No | No |

## 21. Combining

- With the [gender euphoria log](gender-euphoria-and-hrt-log.md): log a voice euphoria moment as `category: euphoria`.
- With [habit tracking](habit-tracking.md): a tick for "practised" if streak-free ticks help.
- With the [low-demand check-in](low-demand-check-in.md) on hard days.

## 22. Ready-to-use bank

- What did I practise today?
- Where did I feel the sound (chest, mouth, face, head)?
- Was there any strain? What did I do about it?
- One moment my voice felt like me.
- What would I like to try next time?
- Exercise names: straw phonation, humming, lip trills, pitch glides, sirens, resonance contrasts, reading passage, scripted phone call, free conversation.

## 23. Glossary

| Term | Meaning |
| --- | --- |
| Fundamental frequency (F0) | The rate the vocal folds vibrate, heard as pitch, measured in hertz |
| Median pitch | The middle value of pitch across a recording; steadier than a single reading |
| Resonance | How the throat and mouth shape the sound; often described as darker or brighter |
| Semi-occluded vocal tract exercise | Voicing through a narrowed opening, such as a straw [4] |
| Strain | Effort, tightness or discomfort in the throat |
| TVQ / TWVQ | A clinician questionnaire about how a person feels about their voice [2] |

## 24. FAQ

**Do I need a pitch number?** No. `minutes` and `exercise` make a complete record.

**What pitch should I aim for?** This log does not set targets. A voice clinician can help you set your own.

**Where should clips go?** Attach them to the journal (a `.jotz`) or keep them in a folder and write the file name. Either way, think before sharing the journal.

**Is this therapy?** No. It is a log you may keep alongside self-guided practice or clinician sessions.

## 25. For Journalwright Studio

Adopt: the profile's record, scale records for `resonance` and `felt-like-me`, a weekly chart, and an export option that leaves out `recording` and `pitch-hz`. Do not adopt: gendered target bands, "passing" meters, automatic audio upload or analysis, or streaks.

## 26. Open questions

- Whether a journal log changes practice consistency or outcomes is untested.
- Pitch apps disagree with each other; how much is not documented for consumer apps **(unconfirmed)**.
- The best rating for "felt like me" is unknown; a 1–5 scale is a convenience, not a validated measure.

## 27. Further reading

- WPATH SOC-8, chapter "Voice and Communication" [1].
- ASHA practice portal on gender-affirming voice and communication [3].

## 28. Sources

All checked 2026-10-27.

1. Coleman E et al. "Standards of Care for the Health of Transgender and Gender Diverse People, Version 8". *International Journal of Transgender Health* 23(S1), 2022. doi:10.1080/26895269.2022.2100644. https://pubmed.ncbi.nlm.nih.gov/36238954/
2. Dacakis G, Davies S, Oates JM, Douglas JM, Johnston JR. "Development and preliminary evaluation of the Transsexual Voice Questionnaire for Male-to-Female Transsexuals". *Journal of Voice* 27(3):312–320, 2013. https://blog.sac-oac.ca/sac-clinical-research-grant-in-action-developing-the-transsexual-voice-questionnaire-male-to-female/
3. "Gender Affirming Voice and Communication" (Practice Portal). American Speech-Language-Hearing Association. https://www.asha.org/practice-portal/professional-issues/gender-affirming-voice-and-communication/
4. Titze IR. "Voice training and therapy with a semi-occluded vocal tract: rationale and scientific underpinnings". *Journal of Speech, Language, and Hearing Research* 49(2):448–459, 2006. doi:10.1044/1092-4388(2006/035). https://pubs.asha.org/doi/10.1044/1092-4388(2006/035)
5. Schwarz K et al. "Speech therapy for transgender women: an updated systematic review and meta-analysis". *Systematic Reviews* 12:128, 2023. doi:10.1186/s13643-023-02267-5. https://pmc.ncbi.nlm.nih.gov/articles/PMC10363306/
6. Davies S, Johnston JR. "Exploring the validity of the Transsexual Voice Questionnaire for male-to-female transsexuals". *Canadian Journal of Speech-Language Pathology and Audiology* 39(1), 2015. https://cjslpa.ca/files/2015_CJSLPA_Vol_39/No_01/CJSLPA_Spring_2015_Vol_39_No_1_Davies-Johnston.pdf
7. Azul D. "Transmasculine people's vocal situations: a critical review of gender-related discourses and empirical data". *International Journal of Language & Communication Disorders* 50(1):31–47, 2015. doi:10.1111/1460-6984.12121. https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/235f3784-b01e-4782-88ee-b132a597b2a1
8. Boersma P, Weenink D. "Praat: doing phonetics by computer". University of Amsterdam. https://www.fon.hum.uva.nl/praat/
