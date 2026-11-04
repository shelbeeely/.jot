---
title: "Low-demand check-in (AuDHD)"
summary: "Optionally record personal capacity, sensory load, energy or a need."
slug: low-demand-check-in
category: neurodivergent-and-creative
evidenceLevel: anecdotal
lastReviewed: 2026-11-02
status: draft
licence: CC0-1.0
contributors:
  - Jot contributors
---

# Low-demand check-in (AuDHD)

A check-in that asks almost nothing: up to three numbers (capacity, sensory load, energy), one word for what would help, and "skipped" as a complete answer. Designed for AuDHD people and anyone for whom a daily form becomes one more demand. There are no streaks, no catch-up and no missed-day counts. The original bibliography was recorded on 2026-10-27. A focused evidence and usability update on 2026-11-02 rechecked sources [2] and [3]; section 28 gives its limits.

> Not a symptom tracker or a screening tool. The numbers mean whatever the writer decides they mean, and nothing is inferred from them.

## 1. At a glance

| | |
| --- | --- |
| Creator | No single creator. A Jot profile drawing on low-demand ideas [4], momentary self-report research [3] and autistic-led burnout work [2] |
| Year | 2026 (this profile) |
| Type | Optional micro check-in |
| Time per day | A few seconds, or none; a design target, not a measured result |
| Time per week | Optional glance at a chart |
| Cost | Free |
| Formats | Paper (circle a number), `.jot` |
| Best for | People who abandon trackers because filling them in becomes a chore or a source of guilt |
| Not ideal for | Detailed sensory or symptom work (see [autistic sensory journaling](autistic-sensory-journaling.md), [symptom tracking](symptom-tracking.md)) |
| Learning curve | None |
| Supplies | None |
| Official site | None |
| Evidence level | **Anecdotal** for this format. Related research describes burnout [2] and momentary assessment [3], but does not test this check-in |

## 2. Summary

- One record, whenever you like. `status` is the only required field: `observed`, `estimated` or `skipped`.
- Numbers are optional: `capacity`, `sensory-load`, `check-in-energy`, each on your own scale (for example 1 to 5).
- `need` is one word: quiet, food, alone, movement, nothing.
- Skipped is complete. A day with nothing written is a gap, never a zero and never a debt.

## 3. History and origin

| Date | Event |
| --- | --- |
| 2020 | Raymaker et al. define autistic burnout with autistic co-researchers, including loss of capacity and sensory tolerance [2] |
| 2021 | Rong et al. estimate about 4 in 10 autistic people also meet criteria for ADHD [1] |
| 2023 | Diekman's *Low-Demand Parenting* popularises dropping demands for "uniquely wired" children [4] |
| 2023 | Wrzus and Neubauer's meta-analysis of momentary assessment studies: average compliance 79% across 477 articles [3] |
| 2026 | Jot adds `low-demand-check-in@1` |

The parenting book [4] is one influence on this design, not evidence that this adult check-in is effective. This guide does not establish the origin of the wider phrase "low-demand". PDA (pathological or "pervasive" demand avoidance) is a contested profile and is not assumed here.

## 4. Philosophy and principles

- **The check-in serves the writer.** If it stops helping, stop.
- **Skipping is information, not failure.** `status: skipped` exists so that "not today" can be written without a number.
- **No debt.** Nothing asks you to fill in yesterday.
- **Your scale.** A 2 means what you decide; it is never compared with anyone else's.
- **Fewer questions.** Three numbers at most, one word at most.

## 5. Core components

| Field | What it holds |
| --- | --- |
| `status` | `observed`, `estimated` or `skipped`. Required |
| `capacity` | How much you can take on (number, your scale) |
| `sensory-load` | How loud the world feels (number, your scale) |
| `check-in-energy` | Physical or mental energy (number, your scale). Named apart from other profiles' `energy` so different scales never merge in a chart |
| `need` | One word for what would help |
| `scale` | One scale record for all three numbers, e.g. `#check-in-scale`. Keep its anchors neutral (low, high): high capacity and high sensory load mean different things |
| `at`, `body` | Time and anything else |

## 6. Setting it up

1. Decide your scale once (1 to 5 is common). Write one scale record and name it with `scale:` if you want labelled chart axes (section 10).
2. Decide where the check-in lives: the top of each day, a sticky note, or nowhere fixed.
3. Try a single field, or leave the card unused. Add another only if you want its information.

For paper, words such as "some room", "too loud" or "unsure" can replace numbers. In a structured Jot record, `status` remains required even when `need` is the only optional field you use. Nothing requires a chart.

## 7. Daily practice

If you want to: write the record, or circle three numbers on paper. If not: write `status: skipped`, or nothing.

## 8. Rhythms

- **Weekly, optional:** glance at the chart. Gaps are drawn as gaps.
- **After a hard stretch:** there is nothing to catch up on. Start from today.
- **Monthly, only if useful:** ask whether the card helped you name a need. You can keep one field, change the wording or stop. A month with two entries does not need a completion percentage.

## 9. Page anatomy

```
capacity  1 2 3 4 5
sensory   1 2 3 4 5
energy    1 2 3 4 5
need: ________        [ ] skipped
```

## 10. Worked examples

All examples in this section are invented. A week with gaps and a skip:

```jot
:::record scale #check-in-scale
name: check-in
kind: ordinal
minimum: 1
maximum: 5
anchor-low: Low
anchor-high: High
:::

### 2026-10-26 | Monday

:::record observation
method: low-demand-check-in@1
status: observed
capacity: 2
sensory-load: 4
check-in-energy: 2
need: quiet
scale: #check-in-scale
:::

### 2026-10-27 | Tuesday

:::record observation
method: low-demand-check-in@1
status: skipped
:::

### 2026-10-29 | Thursday

:::record observation
method: low-demand-check-in@1
status: estimated
capacity: 3
scale: #check-in-scale
:::

:::record chart
metrics: capacity, sensory-load, check-in-energy
start: 2026-10-26
end: 2026-11-01
:::
```

Wednesday has no record, and the chart leaves it blank. Tuesday's skip is a complete record and is not drawn as a low value.

A word-only day can be `status: observed` with `need: quiet`; an uncertain day can use `status: estimated` with no number. At the end of a month, "I kept asking for quiet; I would like ear protection nearby" is a possible personal reflection. It does not show that quiet caused a later change in capacity.

## 11. Variations and offshoots

- **One number only:** `status` and `capacity`.
- **Word only:** `status` and `need`, no numbers.
- **Colour card:** a coloured dot on paper, with a written key (colour is never the only carrier of meaning).

## 12. Community practice

Neurodivergent communities share "spoon" counts, social battery percentages and traffic-light check-ins. This profile keeps the shortest form of those habits.

## 13. Official products and formats

Not applicable: there is no official product.

## 14. Tools and supplies

None. A pen, or the Jot workspace.

## 15. Digital and hybrid versions

In Jot the record is plain text. The workspace charts the numbers, with gaps shown as gaps. Jot sends no reminders and keeps no streak.

## 16. Evidence and research

**Level: anecdotal for the check-in.** The cited studies supply context and cautions. Neither tests this set of fields, a three-question limit or an adult low-demand journaling intervention.

| Claim | What was studied | What can be said here |
| --- | --- | --- |
| Burnout can involve reduced capacity and sensory tolerance [2] | Community-based qualitative research drawing on interviews and public accounts | Participants described chronic exhaustion, loss of skills and reduced tolerance to stimuli. These experiences inform the field choices; the fields are not a burnout screen |
| Fewer prompts improve response rates [3] | Meta-analysis of 477 EMA articles and 496 samples | **Not established by this source.** Average compliance was 79%, but the total number of scheduled assessments did not predict compliance or dropout. Design and sample features generally had small effects; financial incentives were associated with higher compliance |
| Reducing demands can inform a gentler page [4] | A parenting/practitioner book | A design influence. It supplies no trial of this adult check-in |
| This check-in improves wellbeing | No direct evaluation in the sources reviewed | Unknown. Short fields and no catch-up pressure are design choices, not measured effects |

Raymaker et al. [2] describe a small exploratory convenience sample and call for wider representation, including people with higher support needs. Their findings should not be used to infer one person's diagnosis or to define a universal scale.

Wrzus and Neubauer [3] compare study-level features across heterogeneous research settings and excluded once-daily diary studies. An exploratory analysis found a small nonlinear association between daily prompt frequency and compliance; that does not establish the value of this card. Their results do not prove that burden never matters to an individual, or that a one-field card is best. They also do not establish that improved completion, if found, would mean improved health. This corrects the earlier version's claim that prompt number and frequency predicted response rates.

## 17. Benefits

These are intended uses, not demonstrated outcomes of this format:

- Keep a short record when detailed writing feels like too much.
- Name a need without explaining or defending it.
- Leave gaps without a system assigning a failure count.

Whether a writer experiences less guilt or finds the card easier is personal and untested here.

## 18. Pitfalls

- **It grows.** Adding "just one more" field turns it back into a form. Keep three numbers.
- **Reading too much into numbers.** A personal ordinal scale puts experiences in order; the distance between 1 and 2 need not equal the distance between 3 and 4. A rise is not a diagnosis or a measured change in health.
- **Mixing meanings.** High capacity and high sensory load point in different directions. Keep their labels visible and do not add them into a total. If your meaning changes, note when it changed rather than silently treating old and new ratings as equivalent.
- **Treating silence as a signal.** No entry may mean forgetting, choosing privacy or being busy. It cannot establish low capacity.
- **Checking compulsively.** If checking in becomes a loop, stop for a while.

## 19. Accessibility and adaptations

- **Writing is hard:** circle numbers on a printed card; or type `status: skipped` only.
- **Interoception differences:** `estimated` exists for "I am guessing".
- **Screen readers:** charts have a text alternative and a table.
- **Demand sensitivity:** the method needs no prompt or reminder; the writer chooses when, if ever.
- **Numbers do not fit:** write a word, point to an option, or leave the card blank. Do not make naming an internal state a test.
- **Privacy:** a neutral heading or no saved record may suit you better. Choosing to share one need does not require sharing a month of ratings.

## 20. Comparison

| | Low-demand check-in | [Spoon accounting](spoon-theory-energy-accounting.md) | [Autistic sensory journaling](autistic-sensory-journaling.md) | [Habit tracking](habit-tracking.md) |
| --- | --- | --- | --- | --- |
| Effort | Seconds | Minutes | Minutes | Seconds |
| Skipped is valid | Built in | Yes | Yes | Varies |
| Streaks | Never | No | No | Often |

## 21. Combining

- With [task initiation and transitions](task-initiation-and-transitions.md): low capacity, fewer transitions.
- With [spoon accounting](spoon-theory-energy-accounting.md): this profile's `check-in-energy` stays a separate chart from spoons, so the two scales are never mixed.
- With [voice practice](voice-practice.md) on days when practice feels like too much.

## 22. Ready-to-use bank

- Needs: quiet · food · water · alone · company · movement · dark · pressure · nothing.
- Prompts: How much room do I have? How loud is it? Do I want anything?

## 23. Glossary

| Term | Meaning |
| --- | --- |
| AuDHD | Community term for being autistic and ADHD |
| Capacity | How much you can take on right now |
| Low-demand | Reducing expectations and requests to lower stress [4] |
| Sensory load | How much sensory input is reaching you |

## 24. FAQ

**What if I miss a week?** Nothing happens. Start again whenever.

**Why have `skipped` at all?** Some people like to mark that they saw the check-in and chose not to answer. It is optional too.

**Can I compare with a friend?** The scales are personal; comparisons are not meaningful.

## 25. For Journalwright Studio

Adopt: a three-number card with a "skipped" box, charts that show gaps. Do not adopt: streaks, catch-up prompts, missed-day counts or reminders by default.

## 26. Open questions

- Whether this check-in improves wellbeing, feels less demanding or is easier to return to is untested.
- Whether the same scale remains understandable over time, and whose access needs the current field names miss, need evaluation with willing writers.
- How PDA relates to autism and ADHD is disputed **(unconfirmed)**.

## 27. Further reading

- Raymaker et al. 2020 on autistic burnout [2].
- The [spoon theory](spoon-theory-energy-accounting.md) and [autistic sensory journaling](autistic-sensory-journaling.md) docs in this library.

## 28. Sources

Original bibliography recorded as checked 2026-10-27. Focused update on 2026-11-02: the full-text methods, findings and limitations of [2] and [3] were consulted through Europe PMC. [1] and [4] were retained from the earlier bibliography and were not independently rechecked in this update. No new systematic search was performed.

1. Rong Y, Yang CJ, Jin Y, Wang Y. "Prevalence of attention-deficit/hyperactivity disorder in individuals with autism spectrum disorder: a meta-analysis". *Research in Autism Spectrum Disorders* 83:101759, 2021. https://pure.ecnu.edu.cn/en/publications/prevalence-of-attention-deficithyperactivity-disorder-in-individu/
2. Raymaker DM, Teo AR, Steckler NA, et al. "Having All of Your Internal Resources Exhausted Beyond Measure and Being Left with No Clean-Up Crew": Defining Autistic Burnout. *Autism in Adulthood* 2(2):132–143, 2020. https://europepmc.org/articles/PMC7313636
3. Wrzus C, Neubauer AB. "Ecological momentary assessment: a meta-analysis on designs, samples, and compliance across research fields". *Assessment* 30(3), 2023. doi:10.1177/10731911211067538. https://europepmc.org/articles/PMC9999286
4. Diekman A. *Low-Demand Parenting: Dropping Demands, Restoring Calm, and Finding Connection with Your Uniquely Wired Child*. Jessica Kingsley Publishers, 2023. https://www.hachette.co.uk/titles/amanda-diekman/low-demand-parenting/9781399812047/
