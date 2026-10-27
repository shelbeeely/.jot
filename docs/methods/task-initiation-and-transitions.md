---
title: "Task initiation and transitions (AuDHD)"
slug: task-initiation-and-transitions
category: neurodivergent-and-creative
evidenceLevel: some
lastReviewed: 2026-10-27
status: draft
licence: CC0-1.0
contributors:
  - Jot contributors
---

# Task initiation and transitions (AuDHD)

A small log for getting from one activity to the next: what you are leaving, the next tiny step, the cue that marks the switch, whether someone is body doubling, and how long you guessed it would take beside how long it took. Written for AuDHD people (autistic and ADHD), who often find both starting and stopping hard. Sources checked 2026-10-27; anything not confirmed from a primary source is marked **(unconfirmed)**.

> This is a planning aid, not a treatment. No diagnosis is needed to use it, and nothing in the log is a measure of effort or worth.

## 1. At a glance

| | |
| --- | --- |
| Creator | No single creator. A Jot profile drawing on [ADHD journaling](adhd-journaling.md), [interstitial journaling](interstitial-journaling.md), monotropism [2] and implementation intentions [4] |
| Year | 2026 (this profile) |
| Type | Transition card / task record |
| Time per day | Seconds per transition; log only the hard ones |
| Time per week | 5 minutes to look at estimate versus actual |
| Cost | Free. Optional: a timer, a body double |
| Formats | Paper card, `.jot` |
| Best for | People who get stuck before starting, or stuck in a task and unable to leave it |
| Not ideal for | Days where any writing is too much (use the [low-demand check-in](low-demand-check-in.md), or nothing) |
| Learning curve | Low |
| Supplies | Notebook or the Jot workspace; a timer or a song as a cue |
| Official site | None |
| Evidence level | **Some** for the parts (visual schedules [3], implementation intentions [4], time perception differences [5]); **anecdotal** for the combined log |

## 2. Summary

- One record per transition you want help with. `next-step` is the only required field.
- The next step is physical and tiny: "stand up", "open the file", not "do taxes".
- A **cue** (a timer song, a kettle, a person) marks the switch, and a **warning** says how long before it helps to know.
- A **body double** is someone present, in person or online, while you start [6].
- `estimate-min` and `actual-min` build a personal sense of time, without grading it.

## 3. History and origin

There is no single origin. The ideas come from several places:

| Date | Event |
| --- | --- |
| 2005 | Murray, Lesser and Lawson describe monotropism: attention gathered into a few deep channels, which makes switching costly [2] |
| 2006 | Gollwitzer and Sheeran's meta-analysis of "if-then" plans (implementation intentions) [4] |
| 2015 | Knight, Sartini and Spriggs review visual activity schedules for autistic people [3] |
| 2021 | Rong et al. estimate that about 4 in 10 autistic people also meet criteria for ADHD [1] |
| 2022 | Zheng et al. meta-analyse time perception differences in children and adolescents with ADHD [5] |
| 2024 | Eagle et al. publish a survey of body doubling with neurodivergent participants [6] |
| 2026 | Jot adds `task-initiation-and-transitions@1` |

"AuDHD" is a community word for being both autistic and ADHD; it is not a diagnostic term.

## 4. Philosophy and principles

- **Both directions are hard.** ADHD-style difficulty starting and autistic-style difficulty leaving a deep focus can happen in the same person on the same afternoon. The log treats leaving as a task too.
- **Make the step smaller, not the person try harder.** If the step did not happen, the next record makes it smaller.
- **Cues outside the head.** A cue you can hear or see does the remembering [3, 4].
- **Time is learnt, not judged.** Estimate and actual sit side by side; no score.
- **No streaks, no debt.** Unlogged transitions are fine.

## 5. Core components

| Field | What it holds |
| --- | --- |
| `next-step` | The smallest physical first action. Required |
| `from` | What you are leaving |
| `cue` | What marks the switch: timer song, alarm, person, kettle |
| `warning` | How far ahead a heads-up helps, e.g. `10 min` |
| `estimate-min` | Your guess in minutes (number) |
| `actual-min` | What it took in minutes (number) |
| `body-double` | Who or what kept you company |
| `started` | `yes`, `partly`, `not yet` or `chose not to` |
| `at`, `body` | Time and anything else |

## 6. Setting it up

1. Pick the one or two transitions that most often go wrong (leaving the house, starting work after lunch, stopping a game for dinner).
2. For each, write a reusable cue and warning once.
3. Keep a short list of "tiny first steps" you can copy (section 22).

## 7. Daily practice

Before the switch: write `from`, `next-step`, `cue`. After: `started` and, if you timed it, `actual-min`. Ten seconds each.

## 8. Rhythms

- **Weekly:** reread the records for one kind of task and compare each estimate with its actual. If "5 minutes" is usually 15, plan 15.
- **When you miss days:** nothing to fill in. Start again with the next transition.

## 9. Page anatomy

```
from: Drawing  →  next: stand up, fill the water glass
cue: timer song (10 min warning)   body double: Sam on video
guess 5 min · took 15 min · started: yes
```

## 10. Worked examples

A day with two transitions, charted:

```jot
### 2026-10-27 | Tuesday

:::record task
method: task-initiation-and-transitions@1
from: Drawing
next-step: Stand up and fill the water glass
cue: Timer song ends
warning: 10 min
estimate-min: 5
actual-min: 15
body-double: Video call with Sam
started: yes
:::

:::record task
method: task-initiation-and-transitions@1
from: Reading about trains
next-step: Put the laptop lid down
cue: Kettle clicks off
estimate-min: 2
started: not yet
body: Will try again after tea. Making the step smaller: close one tab.
:::
```

A week: read estimate and actual side by side in each record; that pairing is the useful comparison. A chart over the two draws each day's average of each number, so it is only a rough picture, and a transition with no `actual-min` still counts toward the day's estimate.

```jot
:::record chart
metrics: estimate-min, actual-min
start: 2026-10-26
end: 2026-11-01
style: bars
:::
```

## 11. Variations and offshoots

- **Transition card:** a paper card by the door with `from`, `next-step`, `cue` printed.
- **Leaving-the-house list:** a `:::record collection` (or a plain list) of tiny steps in order.
- **Body-double only:** log `body-double` and `started`, nothing else.

## 12. Community practice

AuDHD and ADHD communities share "tiny first step" lists, transition songs and online body doubling sessions [6]. Focus apps and video coworking rooms are common.

## 13. Official products and formats

Not applicable: there is no official product. Visual timers and visual schedule apps are related tools.

## 14. Tools and supplies

A timer you can see or hear (a visual timer, a phone, a song of known length), sticky notes, and someone to body double with if available.

## 15. Digital and hybrid versions

In Jot the record is plain text. The workspace charts `estimate-min` and `actual-min`. Jot does not send reminders; use a timer or calendar for the cue.

## 16. Evidence and research

- **Visual activity schedules** meet evidence-based practice criteria for autistic people in single-case research [3].
- **Implementation intentions** ("when X, I will Y") showed a medium-to-large effect on goal attainment across 94 tests [4].
- **Time perception** differs on average in children and adolescents with ADHD [5]; adult and AuDHD-specific evidence is thinner.
- **Body doubling** is supported by survey data only [6].
- **Monotropism** is a theory of autistic attention, not a tested intervention [2].
- No study tests this combined log. Evidence level **some** applies to the parts.

## 17. Benefits

- Fewer stuck starts when the step is tiny and the cue is external (practitioner report, consistent with [3, 4]).
- A personal record of how long things take (practitioner report).
- Less shame: "not yet" and "chose not to" are ordinary values.

## 18. Pitfalls

- **Steps too big.** Halve them until they are physical and under a minute.
- **Logging every switch.** Log only the hard ones.
- **Using actual time as a verdict.** It is information for the next estimate.

## 19. Accessibility and adaptations

- **Low energy:** `next-step` only.
- **Writing is hard:** speak the step aloud to a body double instead; log afterwards or never.
- **Sensory load:** choose cues that are not aversive (a song you like, a gentle vibration).
- **Demand sensitivity:** phrase steps as options ("could stand up") if direct instructions feel like pressure.

## 20. Comparison

| | This log | [ADHD journaling](adhd-journaling.md) | [Interstitial journaling](interstitial-journaling.md) | [Pomodoro log](pomodoro-log.md) |
| --- | --- | --- | --- | --- |
| Unit | One transition | A day's plan | A note between tasks | A focus round |
| Leaving a task | Central | Minor | Noted | By timer |
| Time | Estimate and actual | Estimate and actual | Timestamps | Fixed rounds |

## 21. Combining

- With [ADHD journaling](adhd-journaling.md): the day's plan names tasks; this log handles the switches.
- With the [low-demand check-in](low-demand-check-in.md): on low-capacity days, plan fewer transitions.
- With [spoon accounting](spoon-theory-energy-accounting.md): transitions cost energy too.

## 22. Ready-to-use bank

- Tiny first steps: stand up · put shoes by the door · open the file · write one word · fill the water glass · set the timer · put the phone in another room.
- Cues: a song of known length · kettle · alarm with a kind label · a person's message.
- Prompts: What am I leaving? What is the very first movement? What will tell me it is time?

## 23. Glossary

| Term | Meaning |
| --- | --- |
| AuDHD | Community term for being autistic and ADHD |
| Body doubling | Doing a task with another person present who is not doing it for you [6] |
| Implementation intention | An "if X, then I will Y" plan [4] |
| Monotropism | A theory that autistic attention gathers into a few deep channels [2] |
| Transition cue | A signal outside the head that marks a switch |

## 24. FAQ

**Do I need a diagnosis?** No.

**What if I never start?** Write `started: not yet` and make the next step smaller, or decide not to: `chose not to` is a valid answer.

**Is this the same as ADHD journaling?** It focuses on the switch between activities, especially leaving one, which matters a lot when autistic focus and ADHD initiation meet.

## 25. For Journalwright Studio

Adopt: a transition card layout, a tiny-steps bank, an estimate-versus-actual chart. Do not adopt: streaks, lateness counts or productivity scores.

## 26. Open questions

- No research tests a transition log for AuDHD adults.
- How monotropism and ADHD attention interact is not well studied **(unconfirmed)**.

## 27. Further reading

- The [ADHD journaling](adhd-journaling.md) and [autistic sensory journaling](autistic-sensory-journaling.md) docs in this library.

## 28. Sources

All checked 2026-10-27.

1. Rong Y, Yang CJ, Jin Y, Wang Y. "Prevalence of attention-deficit/hyperactivity disorder in individuals with autism spectrum disorder: a meta-analysis". *Research in Autism Spectrum Disorders* 83:101759, 2021. https://pure.ecnu.edu.cn/en/publications/prevalence-of-attention-deficithyperactivity-disorder-in-individu/
2. Murray D, Lesser M, Lawson W. "Attention, monotropism and the diagnostic criteria for autism". *Autism* 9(2):139–156, 2005. doi:10.1177/1362361305051398. https://pubmed.ncbi.nlm.nih.gov/15857859/
3. Knight V, Sartini E, Spriggs AD. "Evaluating visual activity schedules as evidence-based practice for individuals with autism spectrum disorders". *Journal of Autism and Developmental Disorders* 45(1):157–178, 2015. doi:10.1007/s10803-014-2201-z. https://cbmt.franciscan.edu/wp-content/uploads/sites/32/2021/07/Knight-et-al.-2015_Visual-Schedules.pdf
4. Gollwitzer PM, Sheeran P. "Implementation intentions and goal achievement: a meta-analysis of effects and processes". *Advances in Experimental Social Psychology* 38:69–119, 2006. https://www.socmot.uni-konstanz.de/publications/implementation-intentions-and-goal-achievement-meta-analysis-effects-and-processes
5. Zheng Q, Wang X, Chiu KY, Shum KK. "Time perception deficits in children and adolescents with ADHD: a meta-analysis". *Journal of Attention Disorders*, 2022. doi:10.1177/1087054720978557 (as cited and checked in [adhd-journaling.md](adhd-journaling.md))
6. Eagle T, Baltaxe-Admony LB, Ringland KE. "'It Was Something I Naturally Found Worked and Heard About Later': An Investigation of Body Doubling with Neurodivergent Participants". *ACM Transactions on Accessible Computing*, 2024. https://leyabreanna.com/papers/body_double_taccess.pdf
