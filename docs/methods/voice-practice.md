---
title: "Voice practice and voice training log"
summary: "A record of voice practice, personal impressions and optional measurements."
slug: voice-practice
category: productivity
evidenceLevel: some
lastReviewed: 2026-11-02
status: draft
licence: CC0-1.0
contributors:
  - Jot contributors
---

# Voice practice and voice training log

A short practice log for anyone working on their voice: gender-affirming voice training (feminizing, masculinizing, androgynous or simply "more like me"), singing, speech after illness, or an accent or presentation goal of the writer's own. It records what was practised, for how long, how the voice felt and, only if the writer wants, a pitch figure and the name of a recording. The original source pass was 2026-10-27. A targeted update on 2026-11-02 checked the review, vocal-care guidance and pitch-analysis documentation; section 28 records its limits. Anything not confirmed from a primary source is marked **(unconfirmed)**.

> **Not medical advice and not an assessment.** This log does not tell anyone what their voice should sound like. Stop practice that hurts or makes the voice hoarse or tired. Recurring discomfort or a change that concerns you is a reason to consult a doctor or voice clinician [9]. This page records practice; it does not prescribe exercises or a safe training dose.

## 1. At a glance

| | |
| --- | --- |
| Creator | No single creator. A Jot profile built from common practice-log habits and the voice section of the [gender euphoria and HRT log](gender-euphoria-and-hrt-log.md) |
| Year | 2026 (this profile) |
| Type | Practice log with optional numbers |
| Time per day | 1 to 2 minutes of writing after practice |
| Time per week | Optional review; a short note is enough, with no listening required |
| Cost | The log is free. Equipment and clinician costs vary |
| Formats | Paper, `.jot`, `.jotz` with clips attached |
| Best for | People practising voice on their own or between clinician sessions who want to see patterns over weeks |
| Not ideal for | Days when listening to your own voice is distressing (skip the numbers and recordings; the log still works) |
| Learning curve | Low |
| Supplies | Notebook or the Jot workspace; optional recorder or phone |
| Official site | None for the log. Clinical context: ASHA's practice portal [3] and WPATH SOC-8 [1] |
| Evidence level | **Some**: voice training has review evidence, rated low quality [5]; the journaling layer itself is untested |

## 2. Summary

- One short record after each practice: `minutes` and `exercise` are enough.
- Optional numbers (`pitch-hz`, `resonance`, `felt-like-me`) can be reviewed over weeks; their meaning depends on the task and the writer's scale.
- `strain` is logged every time it shows up, because strain is the signal to stop.
- Recordings are named, not required. Listen back only if useful; a weekly review is an option, not a tested schedule.
- The writer sets the goal. There is no built-in target voice, "passing" score or comparison with anyone else.

## 3. History and origin

A practice log is a general recording tool rather than a named clinical intervention. Gender-affirming voice work has a clinical literature, and the WPATH Standards of Care added a voice and communication chapter (it appeared in version 7 in 2012 and was expanded in version 8 in 2022 [1]). Clinician questionnaires such as the Transsexual Voice Questionnaire (TVQ<sup>MtF</sup>, 30 items, 4-point scale; Dacakis et al. 2013 [2]) measure how people feel about their voice; a journal does not need a validated instrument and uses a single daily "felt like me" rating instead, as the gender euphoria log already suggests.

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
| `resonance` | Your own ordinal rating | Optional number on a scale you define, e.g. 1 darker to 5 brighter. A felt rating is not an acoustic measurement of resonance |
| `strain` | none / some / a lot | Optional description, not a safety threshold. Stop for pain or strain; do not wait for "a lot" [9] |
| `felt-like-me` | 1 to 5 | Optional personal rating. It does not replace a validated clinical questionnaire |
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

- Use the exercise and duration agreed with your clinician or teacher, if you have one. This log sets no daily practice target.
- Straight after: one record. Under a minute.
- If you used a pitch app, copy its median for the reading or speaking task. Note the app and task in `body:`. Keep reading, sustained-vowel and conversation samples separate: the review found that sample type changed reported pitch gains [5].
- If the voice becomes uncomfortable, stop rather than finishing a timed session [9]. A rest day can be a sentence in the diary; no session record is required.

## 8. Rhythms

- **Weekly, optional:** compare one or two clips made with the same task, if listening feels useful. Or write a sentence without listening. Look at the chart only if you want to.
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

A week, with invented content and no implied training schedule:

| Day | Entry | What the writer keeps from it |
| --- | --- | --- |
| Monday | Reading passage, 6 minutes; no numbers | The exercise name is enough to find the session again |
| Wednesday | Stopped when the throat felt tight; 2 minutes | A short session does not need extending to match Monday |
| Friday | Rest; no session record | A gap is not zero practice entered retrospectively |
| Sunday | "I liked how my greeting felt in a call" | A useful reflection can be about ease or expression rather than pitch |

A month: an optional review note can name what felt comfortable, what the writer wants to keep and what they want to ask a clinician. A chart over the month (`start:` and `end:` covering it) is optional. Neither a rising pitch curve nor more minutes is a universal sign of improvement.

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

- A pen or text editor is enough for the log. If a clinician or teacher has selected straw exercises, use the equipment and instructions they supplied; this guide does not choose straw dimensions, water depth or resistance.
- A recorder: any phone voice memo app.
- An optional pitch analyser: Praat (free, desktop) [8] or a phone app. A tool used in research still needs suitable settings; pitch extraction can produce octave errors and mistaken voiced/unvoiced decisions [10]. A median is a summary, not proof that the estimate is correct.
- Headphones for listen-back.

## 15. Digital and hybrid versions

In Jot the record is plain text, so it opens in any editor. The profile's session records can hold `minutes`, `pitch-hz`, `resonance` and `felt-like-me`; clips can travel inside a `.jotz`.

**Current Jot implementation, checked against the repository on 2026-11-02:** Writer also has an optional local pitch meter. It opens the microphone only after Start and estimates pitch in page memory without recording or sending audio. Add inserts a summary as `pitch-hz` and `voice-minutes` measurement records, plus a `voice-practice@1` observation. These are different record shapes from the hand-written session examples above. The tool's optional 0–5 strain rating is also different from the session example's words; do not silently convert or combine those scales. See [Voice practice](../guide/voice-practice.md) and `site/dist/jot/voice.mjs` for product behavior, not clinical evidence.

A self-entered target band is a preference, not an assessment or a validated training prescription. No study cited here validates Jot's meter. An attached clip is separate from the live meter, which does not make recordings. Before sharing, inspect the exported writing and attachments: a file name, quoted speech or audio can identify the speaker even if pitch figures are removed.

## 16. Evidence and research

**Evidence scope: some for related voice interventions; no direct evidence for this log.** The reviewed intervention is voice training or therapy, not keeping a daily record. The findings below cannot establish that a journal improves outcomes or prevents injury.

| Source and design | What it supports | What it does not establish |
| --- | --- | --- |
| Schwarz et al. 2023 systematic review and meta-analysis [5] | Reported pitch and satisfaction changes after interventions for trans women; the importance of specifying the speaking task | An optimal home-practice dose, effects for every voice goal, or a benefit from logging |
| Titze 2006 physiological modelling/rationale [4] | A rationale for semi-occluded vocal tract exercises | The effect of this log or an individualized exercise prescription |
| NIDCD clinical public guidance [9] | Resting a hoarse or tired voice and seeking assessment for voice problems | A diagnosis from a journal field or a strain score |
| Praat technical documentation [10] | Pitch estimates depend on the analysis method and can contain errors | Accuracy of an unspecified phone app or the Jot meter |

- **Voice training findings have limits.** Schwarz et al. (2023) included 16 studies: six of speech therapy and ten of phonosurgery. Average pitch gains after speech therapy were about 27 Hz for a sustained vowel, 39 Hz for reading and 25 Hz for spontaneous speech. The authors rated the evidence low quality because of small samples, no randomized controlled trials and different collection methods [5]. These are group findings, not targets or predictions for an individual. SOC-8 recommends that voice and communication support be available [1].
- **Semi-occluded vocal tract exercises** (straws, lip trills, humming) have a modelling rationale [4] and are widely used; this doc makes no claim about their size of effect for gender-affirming goals.
- **Applicability is limited.** This 2023 review concerns trans women and pitch-raising interventions [5]. It cannot establish effects for transmasculine or nonbinary goals, singing, accent work or rehabilitation after illness. The transmasculine review cited here dates from 2015 [7]; it does not establish the state of the literature in 2026.
- **Journaling the practice:** none of the sources checked here tests this voice practice journal. This targeted update is not a systematic search for every logging study. Evidence level is **some** because related voice interventions have research; benefits of the log remain untested.

## 17. Benefits

- Earlier exercise names and personal impressions are available to reread. This is a use of the record, not a tested outcome.
- A place to note discomfort and a decision to stop or seek advice. This is a proposed use of the log, consistent with vocal-care guidance [9], not evidence that logging prevents harm.
- A record to bring to a clinician, if wanted.

## 18. Pitfalls

- **Chasing a number.** Pitch alone does not make a voice feel right. Recover: hide `pitch-hz` for a week and rate `felt-like-me` only.
- **Listening becomes distressing.** There is no required listening interval. Skip playback, remove recordings or stop the log if it is making practice harder.
- **Pushing through strain.** Stop, note it, and rest. Persistent strain is a reason to see a clinician.
- **Comparing with others.** Voices and goals differ. This guide proposes personal comparison only, and a number need not be compared at all.
- **Treating app output as ground truth.** A sudden doubling or halving may be a pitch-extraction error [10]. Note uncertainty or leave the number out; do not change vocal effort to chase the display.

## 19. Accessibility and adaptations

- **Dysphoria-heavy days:** skip recordings and numbers; `minutes` and `exercise` are complete.
- **Hearing differences:** a written description or agreed visual cue may be more useful than playback. A pitch chart covers only part of the voice and does not replace accessible feedback from a clinician or teacher.
- **Motor or energy limits:** shorter sessions; `minutes: 3` counts.
- **Screen readers:** charts have a text alternative and a table of numbers.
- **Low energy or limited writing:** keep a reusable exercise name and one word such as "easy" or "stopped". A prose note is valid even when no session fields are filled.
- **Sensory needs:** headphones and playback are optional. Choose a quiet setting if measuring, but comfort takes priority over producing a comparable sample.

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

**Should I keep practicing until the number improves?** No. The number may be uncertain, and pitch is only one aspect of voice. Stop for discomfort; discuss recurring problems with a clinician [9].

**Can a "felt like me" score be used as a clinical result?** It is a personal rating with no validated cutoff. Keep its meaning in your own words; do not substitute it for a clinician's assessment or questionnaire.

## 25. For Journalwright Studio

Adopt: the profile's record, scale records for `resonance` and `felt-like-me`, a weekly chart, and an export option that leaves out `recording` and `pitch-hz`. Do not adopt: gendered target bands, "passing" meters, automatic audio upload, background audio analysis, or streaks. The optional local meter in section 15 is an implementation choice, not a benefit established by the voice-training studies.

## 26. Open questions

- Whether a journal log changes practice consistency or outcomes is untested.
- The accuracy of consumer apps and Jot's meter for different voices, devices and environments is not established by the sources checked here. Praat documents algorithmic error mechanisms [10]; this is not a validation of either tool.
- The best rating for "felt like me" is unknown; a 1–5 scale is a convenience, not a validated measure.

## 27. Further reading

- WPATH SOC-8, chapter "Voice and Communication" [1].
- ASHA practice portal on gender-affirming voice and communication [3].

## 28. Sources

Original source pass: 2026-10-27. Targeted check on 2026-11-02: [5] was read in full at the publisher, [8] on its official site, and new sources [9] and [10] on their official sites. The PMC copy of [5] returned a challenge page, so the publisher copy was used. ASHA [3] returned HTTP 403 and was not reverified. The rest of the original bibliography was not rechecked in this pass. This remains a draft, not an independent clinical review.

1. Coleman E et al. "Standards of Care for the Health of Transgender and Gender Diverse People, Version 8". *International Journal of Transgender Health* 23(S1), 2022. doi:10.1080/26895269.2022.2100644. https://pubmed.ncbi.nlm.nih.gov/36238954/
2. Dacakis G, Davies S, Oates JM, Douglas JM, Johnston JR. "Development and preliminary evaluation of the Transsexual Voice Questionnaire for Male-to-Female Transsexuals". *Journal of Voice* 27(3):312–320, 2013. https://blog.sac-oac.ca/sac-clinical-research-grant-in-action-developing-the-transsexual-voice-questionnaire-male-to-female/
3. "Gender Affirming Voice and Communication" (Practice Portal). American Speech-Language-Hearing Association. https://www.asha.org/practice-portal/professional-issues/gender-affirming-voice-and-communication/
4. Titze IR. "Voice training and therapy with a semi-occluded vocal tract: rationale and scientific underpinnings". *Journal of Speech, Language, and Hearing Research* 49(2):448–459, 2006. doi:10.1044/1092-4388(2006/035). https://pubs.asha.org/doi/10.1044/1092-4388(2006/035)
5. Schwarz K et al. "Speech therapy for transgender women: an updated systematic review and meta-analysis". *Systematic Reviews* 12:128, 2023. doi:10.1186/s13643-023-02267-5. https://link.springer.com/article/10.1186/s13643-023-02267-5
6. Davies S, Johnston JR. "Exploring the validity of the Transsexual Voice Questionnaire for male-to-female transsexuals". *Canadian Journal of Speech-Language Pathology and Audiology* 39(1), 2015. https://cjslpa.ca/files/2015_CJSLPA_Vol_39/No_01/CJSLPA_Spring_2015_Vol_39_No_1_Davies-Johnston.pdf
7. Azul D. "Transmasculine people's vocal situations: a critical review of gender-related discourses and empirical data". *International Journal of Language & Communication Disorders* 50(1):31–47, 2015. doi:10.1111/1460-6984.12121. https://apps.asha.org/EvidenceMaps/Articles/ArticleSummary/235f3784-b01e-4782-88ee-b132a597b2a1
8. Boersma P, Weenink D. "Praat: doing phonetics by computer". University of Amsterdam. https://www.fon.hum.uva.nl/praat/
9. "Taking Care of Your Voice". National Institute on Deafness and Other Communication Disorders, National Institutes of Health. https://www.nidcd.nih.gov/health/taking-care-your-voice
10. Boersma P. "How to choose a pitch analysis method". Praat manual, 2023–2024. https://www.fon.hum.uva.nl/praat/manual/how_to_choose_a_pitch_analysis_method.html
