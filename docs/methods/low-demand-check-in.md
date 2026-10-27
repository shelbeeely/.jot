---
title: "Low-demand check-in (AuDHD)"
slug: low-demand-check-in
category: neurodivergent-and-creative
evidenceLevel: anecdotal
lastReviewed: 2026-10-27
status: draft
licence: CC0-1.0
contributors:
  - Jot contributors
---

# Low-demand check-in (AuDHD)

A check-in that asks almost nothing: up to three numbers (capacity, sensory load, energy), one word for what would help, and "skipped" as a complete answer. Designed for AuDHD people and anyone for whom a daily form becomes one more demand. There are no streaks, no catch-up and no missed-day counts. Sources checked 2026-10-27; anything not confirmed from a primary source is marked **(unconfirmed)**.

> Not a symptom tracker or a screening tool. The numbers mean whatever the writer decides they mean, and nothing is inferred from them.

## 1. At a glance

| | |
| --- | --- |
| Creator | No single creator. A Jot profile drawing on low-demand ideas [4], momentary self-report research [3] and autistic-led burnout work [2] |
| Year | 2026 (this profile) |
| Type | Optional micro check-in |
| Time per day | 0 to 20 seconds |
| Time per week | Optional glance at a chart |
| Cost | Free |
| Formats | Paper (circle a number), `.jot` |
| Best for | People who abandon trackers because filling them in becomes a chore or a source of guilt |
| Not ideal for | Detailed sensory or symptom work (see [autistic sensory journaling](autistic-sensory-journaling.md), [symptom tracking](symptom-tracking.md)) |
| Learning curve | None |
| Supplies | None |
| Official site | None |
| Evidence level | **Anecdotal**: no study tests this format; momentary self-report research shows burden affects how often people answer [3] |

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

"Low-demand" began in parenting and PDA (pathological or "pervasive" demand avoidance) communities; PDA itself is a contested profile and is not assumed here.

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
3. That is all.

## 7. Daily practice

If you want to: write the record, or circle three numbers on paper. If not: write `status: skipped`, or nothing.

## 8. Rhythms

- **Weekly, optional:** glance at the chart. Gaps are drawn as gaps.
- **After a hard stretch:** there is nothing to catch up on. Start from today.

## 9. Page anatomy

```
capacity  1 2 3 4 5
sensory   1 2 3 4 5
energy    1 2 3 4 5
need: ________        [ ] skipped
```

## 10. Worked examples

A week with gaps and a skip:

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

## 11. Variations and offshoots

- **One number only:** `capacity`.
- **Word only:** `need`, no numbers.
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

- **Burden matters.** In momentary self-report studies, design features such as the number and frequency of prompts relate to how often people respond [3]; a shorter check-in is a reasonable design choice, not a proven benefit.
- **Autistic burnout** includes reduced capacity and tolerance for stimuli [2], which is why capacity and sensory load are the default numbers.
- **Low-demand approaches** are practitioner and parent accounts [4]; there is no trial of a low-demand journal.
- Evidence level: **anecdotal**.

## 17. Benefits

- A way to keep some record through low-capacity periods (practitioner report).
- Less guilt than trackers that count missed days (practitioner report).

## 18. Pitfalls

- **It grows.** Adding "just one more" field turns it back into a form. Keep three numbers.
- **Reading too much into numbers.** Your scale drifts; that is fine.
- **Checking compulsively.** If checking in becomes a loop, stop for a while.

## 19. Accessibility and adaptations

- **Writing is hard:** circle numbers on a printed card; or type `status: skipped` only.
- **Interoception differences:** `estimated` exists for "I am guessing".
- **Screen readers:** charts have a text alternative and a table.
- **Demand sensitivity:** no prompt or reminder is built in; the writer chooses when, if ever.

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

- Whether a shorter check-in improves wellbeing, not just response rates, is untested.
- How PDA relates to autism and ADHD is disputed **(unconfirmed)**.

## 27. Further reading

- Raymaker et al. 2020 on autistic burnout [2].
- The [spoon theory](spoon-theory-energy-accounting.md) and [autistic sensory journaling](autistic-sensory-journaling.md) docs in this library.

## 28. Sources

All checked 2026-10-27.

1. Rong Y, Yang CJ, Jin Y, Wang Y. "Prevalence of attention-deficit/hyperactivity disorder in individuals with autism spectrum disorder: a meta-analysis". *Research in Autism Spectrum Disorders* 83:101759, 2021. https://pure.ecnu.edu.cn/en/publications/prevalence-of-attention-deficithyperactivity-disorder-in-individu/
2. Raymaker DM, Teo AR, Steckler NA, et al. "Having All of Your Internal Resources Exhausted Beyond Measure and Being Left with No Clean-Up Crew": Defining Autistic Burnout. *Autism in Adulthood* 2(2):132–143, 2020. https://pmc.ncbi.nlm.nih.gov/articles/PMC7313636/
3. Wrzus C, Neubauer AB. "Ecological momentary assessment: a meta-analysis on designs, samples, and compliance across research fields". *Assessment* 30(3), 2023. doi:10.1177/10731911211067538. https://heibib.ub.uni-heidelberg.de/search/Record/1839595345
4. Diekman A. *Low-Demand Parenting: Dropping Demands, Restoring Calm, and Finding Connection with Your Uniquely Wired Child*. Jessica Kingsley Publishers, 2023. https://www.hachette.co.uk/titles/amanda-diekman/low-demand-parenting/9781399812047/
