---
title: "Task initiation and transitions (AuDHD)"
summary: "Record a small next step, transition cue and optional task support."
slug: task-initiation-and-transitions
category: neurodivergent-and-creative
evidenceLevel: some
lastReviewed: 2026-11-02
status: draft
licence: CC0-1.0
contributors:
  - Jot contributors
---

# Task initiation and transitions (AuDHD)

A small log for getting from one activity to the next: what you are leaving, the next tiny step, the cue that marks the switch, whether someone is body doubling, and how long you guessed it would take beside how long it took. Written for AuDHD people (autistic and ADHD), who often find both starting and stopping hard. The original bibliography was recorded on 2026-10-27. A focused update on 2026-11-02 checked the evidence scope in [3], [4] and [6]; section 28 states what was accessible.

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

- **Both directions can be hard.** Starting and leaving deep focus can be difficult for the same person on the same afternoon. The log treats leaving as a task too; a diagnosis does not determine which difficulty someone has.
- **Look for the barrier.** A smaller step is one option. Missing information, inaccessible tools, pain, overload or lack of time may call for support, a different plan or rest instead.
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
4. For a task that is hard to leave, add a plain note about where to resume: "next stitch is row 8" or "read from the highlighted paragraph". This is a proposed adaptation, not a tested intervention.
5. If you want to time the transition, decide what counts. "From the cue to opening the file" is different from "until the work is finished". Use the same meaning when comparing entries.

## 7. Daily practice

Before the switch: write `next-step` and any useful `from` or `cue`. After: add `started` and, if you timed it, `actual-min`. A short entry is the aim, not a time requirement.

If the cue arrives at a poor moment, you can choose another stopping point. A cue is an invitation to check the plan, not an instruction that overrides hunger, safety or concentration. If you are stuck, ask whether you need a clearer action, help, equipment, a quieter setting or a break.

## 8. Rhythms

- **Weekly:** reread the records for one kind of task and compare each estimate with its actual. If "5 minutes" is usually 15, plan 15.
- **When you miss days:** nothing to fill in. Start again with the next transition.
- **Monthly, optional:** keep one reusable card for a transition that still matters and retire cards that add work. Check whether timing or body doubling feels useful; neither needs to stay.

## 9. Page anatomy

```
from: Drawing  →  next: stand up, fill the water glass
cue: timer song (10 min warning)   body double: Sam on video
guess 5 min · took 15 min · started: yes
```

## 10. Worked examples

All examples in this section are invented. A day with two transitions, with an optional chart:

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

A month: four leaving-home notes include waiting for a lift, while two do not. Instead of averaging all six as a personal speed score, the writer notes "allow waiting time when booking the lift". Their next card can name an accessible departure step. Nothing in the log shows why another unrecorded day was difficult.

## 11. Variations and offshoots

- **Transition card:** a paper card by the door with `from`, `next-step`, `cue` printed.
- **Leaving-the-house list:** a `:::record collection` (or a plain list) of tiny steps in order.
- **Body-double emphasis:** keep the required `next-step`; add `body-double` and `started` if useful.
- **Exit-only card:** name the small action for leaving a task, such as saving the file, and keep a plain-language note about where to resume.

## 12. Community practice

AuDHD and ADHD communities share "tiny first step" lists, transition songs and online body doubling sessions [6]. Focus apps and video coworking rooms are common.

## 13. Official products and formats

Not applicable: there is no official product. Visual timers and visual schedule apps are related tools.

## 14. Tools and supplies

A timer you can see or hear (a visual timer, a phone, a song of known length), sticky notes, and someone to body double with if available.

## 15. Digital and hybrid versions

In Jot the record is plain text. The workspace charts `estimate-min` and `actual-min`. Jot does not send reminders; use a timer or calendar for the cue.

## 16. Evidence and research

**Level: some for related components; no direct test of this combined log in the sources reviewed.** The studies below concern different populations, procedures and outcomes. Their results cannot be added together as evidence that the card works for AuDHD adults.

| Source | Design and finding | Limit for this guide |
| --- | --- | --- |
| Visual activity schedules [3] | Review of 31 studies published 1993–2013; 16 met acceptable-quality criteria. The review judged schedules an evidence-based practice, particularly with systematic instructional procedures | A short self-directed transition note is not the same procedure. The abstract covers students from preschool through adulthood, rather than an AuDHD adult sample |
| Implementation intentions [4] | Meta-analysis of 94 independent tests of if-then planning found a medium-to-large overall effect on goal attainment | The result concerns specific planning interventions across varied settings, not a diagnosis-specific transition log or a promise that any cue will work |
| Time perception [5] | Meta-analysis concerning children and adolescents with ADHD | Group differences on timing tasks cannot explain one adult's delayed start, or validate estimates in this log |
| Body doubling [6] | Survey of 220 adults, 198 identifying as neurodivergent, describing how and why they use other people's presence | Self-selected, predominantly ADHD-influenced accounts; no randomized comparison, and no causal estimate of improved initiation |
| Monotropism [2] | Theory of autistic attention | A possible framing of switching costs, not a tested treatment or a universal explanation |

The body-doubling authors describe variation in preferences and social pressure. Some respondents found company distracting or stressful [6]. A willing partner, quiet company or no company are all possible choices; the survey does not establish which is best for an individual.

The 2026-11-02 update checked the full text of [4] and [6] and the indexed abstract of [3]. It did not conduct a systematic search or re-audit [1], [2] and [5]. The card's field names, optional timing, neutral completion values and stop/resume notes are design choices.

## 17. Benefits

These are intended uses rather than measured outcomes of the combined card:

- Put a first action and a stopping cue somewhere you can refer to them.
- Keep comparable personal estimates beside what happened.
- Describe "not yet" and "chose not to" without a failure score.

Some body-doubling respondents reported easier initiation [6]; this does not show that the log itself reduces stuck starts or shame.

## 18. Pitfalls

- **Steps too big.** Try a smaller concrete action. If the barrier is access, uncertainty or exhaustion, address that rather than repeatedly shrinking the task.
- **Timing unlike things.** Record the same start and end points when comparing estimates. Missing `actual-min` is unknown, not zero. Compare paired records before looking at daily averages.
- **Company becomes surveillance.** Agree what a body double will do, whether cameras are on and when to stop. No one needs to see the journal or a screen. A one-way recording is not permission to record another person.
- **Logging every switch.** Log only the hard ones.
- **Using actual time as a verdict.** It is information for the next estimate.

## 19. Accessibility and adaptations

- **Low energy:** `next-step` only.
- **Writing is hard:** speak the step aloud to a body double instead; log afterwards or never.
- **Sensory load:** choose cues that are not aversive (a song you like, a gentle vibration).
- **Demand sensitivity:** phrase steps as options ("could stand up") if direct instructions feel like pressure.
- **Mobility or pain:** choose an action within reach, such as opening a document by switch control; "stand up" is an example, not a required first step.
- **Vision or hearing:** use a cue you can perceive. Pair an icon with text; offer a visible cue instead of sound or vibration instead of a visual timer.
- **Communication:** a prewritten card or pointing to an option can replace explaining a stuck transition. Nobody has to justify a `chose not to` entry.

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

**What if I never start?** You can write `started: not yet`, ask for support, change the plan or leave it. `chose not to` is a valid answer; making the step smaller is only one option.

**Is this the same as ADHD journaling?** It focuses on the switch between activities, especially leaving one, which matters a lot when autistic focus and ADHD initiation meet.

## 25. For Journalwright Studio

Adopt: a transition card layout, a tiny-steps bank, an estimate-versus-actual chart. Do not adopt: streaks, lateness counts or productivity scores.

## 26. Open questions

- No research tests a transition log for AuDHD adults.
- How monotropism and ADHD attention interact is not well studied **(unconfirmed)**.

## 27. Further reading

- The [ADHD journaling](adhd-journaling.md) and [autistic sensory journaling](autistic-sensory-journaling.md) docs in this library.

## 28. Sources

Original bibliography recorded as checked 2026-10-27. Focused update on 2026-11-02: [4] and [6] were consulted in full text; [3] was checked through its Europe PMC abstract. The linked full-text copy of [3] returned HTTP 403. [1], [2] and [5] were retained without an independent recheck. No systematic search was performed.

1. Rong Y, Yang CJ, Jin Y, Wang Y. "Prevalence of attention-deficit/hyperactivity disorder in individuals with autism spectrum disorder: a meta-analysis". *Research in Autism Spectrum Disorders* 83:101759, 2021. https://pure.ecnu.edu.cn/en/publications/prevalence-of-attention-deficithyperactivity-disorder-in-individu/
2. Murray D, Lesser M, Lawson W. "Attention, monotropism and the diagnostic criteria for autism". *Autism* 9(2):139–156, 2005. doi:10.1177/1362361305051398. https://pubmed.ncbi.nlm.nih.gov/15857859/
3. Knight V, Sartini E, Spriggs AD. "Evaluating visual activity schedules as evidence-based practice for individuals with autism spectrum disorders". *Journal of Autism and Developmental Disorders* 45(1):157–178, 2015. doi:10.1007/s10803-014-2201-z. https://europepmc.org/article/MED/25081593
4. Gollwitzer PM, Sheeran P. "Implementation intentions and goal achievement: a meta-analysis of effects and processes". *Advances in Experimental Social Psychology* 38:69–119, 2006. https://www.socmot.uni-konstanz.de/publications/implementation-intentions-and-goal-achievement-meta-analysis-effects-and-processes
5. Zheng Q, Wang X, Chiu KY, Shum KK. "Time perception deficits in children and adolescents with ADHD: a meta-analysis". *Journal of Attention Disorders*, 2022. doi:10.1177/1087054720978557 (as cited and checked in [adhd-journaling.md](adhd-journaling.md))
6. Eagle T, Baltaxe-Admony LB, Ringland KE. "'It Was Something I Naturally Found Worked and Heard About Later': An Investigation of Body Doubling with Neurodivergent Participants". *ACM Transactions on Accessible Computing*, 2024. https://leyabreanna.com/papers/body_double_taccess.pdf
