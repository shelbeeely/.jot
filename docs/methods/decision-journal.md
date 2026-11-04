---
title: "Decision journals"
summary: "Record a choice, its reasons and expectations before reviewing what happened."
slug: decision-journal
category: productivity
evidenceLevel: some
lastReviewed: 2026-11-02
status: draft
licence: CC0-1.0
contributors:
  - Jot contributors
---

# Decision journals

A decision journal keeps the reasons and expectations available when a choice was made, then adds a later review.
This guide covers a personal notebook practice and Jot's original `decision-journal@1` adaptation. Research supports
relevant problems in judgment, but the sources checked here do not test this journal format as a remedy.

## 1. At a glance

| | |
| --- | --- |
| Creator | No single verified origin for the general practice; Jot contributors for this profile |
| Year | This Jot adaptation: 2026; related hindsight research: 1975 [1] |
| Type | Decision record with a separate outcome review |
| Time per day | No daily requirement; allow a few minutes for a choice worth recording |
| Time per week | Optional review of decisions whose outcomes are now observable |
| Cost | A notebook or text file; no paid product required |
| Formats | Paper, plain text, Jot, spreadsheet for optional repeated forecasts |
| Best for | Remembering why a choice made sense with the information available then |
| Not ideal for | Recording every small choice, delaying urgent action, replacing professional advice |
| Learning curve | Low for a short record; probability calibration needs repeated comparable forecasts |
| Supplies | Something to write with and a way to find the original entry |
| Official site | None for this general practice |
| Evidence level | **Some**, from related judgment and forecasting studies; direct format efficacy unestablished |

## 2. Summary

- Record a choice before learning its outcome. Describe the question and the alternatives you actually considered.
- Keep reasons, assumptions and predictions separate. A preference is not a forecast.
- Decide what observation would count as an outcome and when a review would be useful.
- Add new information in a dated update. Preserve the original expectation.
- Review the quality of the process and the outcome separately. A disappointing outcome is not a verdict on the writer.

## 3. History and origin

No single inventor or first publication of the generic decision journal was established in this source pass.
Do not attribute it to a well-known investor or author without a primary account.

| Date | Relevant development |
| --- | --- |
| 1975 | Fischhoff reported experiments on how knowing outcomes changes retrospective judgment [1] |
| 1988 | Baron and Hershey studied outcome bias in evaluations of other people's decisions [2] |
| 2014 | Mellers and colleagues reported training, team and selection interventions in a geopolitical forecasting tournament [3] |
| 2026 | Jot includes an original decision-record profile; this is not a replication of those interventions |

These studies explain why preserving an earlier view can be useful to inspect. They do not establish an origin story
for the notebook practice or prove that keeping one removes bias.

## 4. Philosophy and principles

**Keep the earlier view available.** Later knowledge should not silently replace it.
**Describe uncertainty.** Unknown, estimated and not yet observable are useful answers.
**Separate choice from prediction.** You can prefer an option without believing its outcome is certain.
**Review to learn.** A review can end with no change, another small test or an unresolved question.
**Keep the burden proportionate.** A short note can be enough for a reversible choice.

## 5. Core components

| Component | Purpose |
| --- | --- |
| Decision | The actual choice, including deferring or declining it |
| Reasons | Information, constraints and preferences available at that time |
| Alternatives | Options considered, including doing nothing where meaningful |
| Assumptions | Facts being relied on without certainty |
| Prediction | An observable expectation with a deadline or resolution condition |
| Review | What happened, what remains unknown and whether the reasoning should change |

In `decision-journal@1`, `decision` and `reason` are required. Optional fields are `option` (repeatable), `prediction`,
`probability`, `review-on` and `outcome`. A numeric probability is from 0 to 1 and belongs to a specific prediction.
For several forecasts, use separate clearly linked records rather than an ambiguous list of probabilities.

## 6. Setting it up

1. Choose one upcoming, non-urgent decision. Give the entry a date or identifier so you can find it later.
2. Write the choice in one sentence and the strongest reason for it.
3. Add an alternative and one assumption only if they help explain the choice.
4. If you want a forecast, make it observable: what, by when, and how will you check?
5. Pick a review point after useful information is likely to exist. A calendar reminder is optional.

For the first week, try one record rather than building a large decision dashboard. The suggested timings and fields
are practical adaptations, not an experimentally optimized protocol.

## 7. Daily practice

There is no daily quota. Before a choice, spend a few minutes capturing the reasons that would otherwise be hard to
reconstruct. After new information arrives, add a dated update. If action is urgent, act first; mark a later note as
retrospective rather than pretending it was written before the event.

Stop when the note explains the choice. Repeatedly rewriting a record need not make the decision better.

## 8. Rhythms

- **Weekly:** optionally find reviews that are due. Write "not resolved" when the outcome is still unknown.
- **Monthly:** compare a few related decisions. Look for an assumption worth testing, not a personal success score.
- **Quarterly or yearly:** archive old choices and keep a small list of lessons that still apply.
- **After a gap:** start with the next useful decision. Do not reconstruct forecasts from memory as original predictions.

## 9. Page anatomy

```text
BEFORE: date / decision ID
Choice:
Reasons and information available:
Alternative:
Assumption or uncertainty:
Prediction and how it will resolve:
Review after:

LATER: review date / original decision ID
Observed outcome:
What is still unknown:
What would I keep or change about the process?
```

Use a separate review block or another page. On paper, leave room or link by page number instead of squeezing new
information into the original sentence.

## 10. Worked examples

All content below is invented. The probability is the example writer's estimate, not a measured base rate.

**A day: make a small project choice.**

```jot
### 2026-11-02

:::record reflection #case-test
method: decision-journal@1
decision: Test the smaller enclosure first
reason: A cardboard model is available and can reveal the connector clearance.
option: Order the larger enclosure now
option: Test the smaller enclosure with a cardboard model
prediction: By Friday the model will show that the connector fits without bending the cable.
probability: 0.6
review-on: 2026-11-06
:::
```

**A week: add an outcome without replacing the forecast.**

```jot
### 2026-11-06

:::record reflection
method: decision-journal@1
decision: Review the smaller-enclosure test
reason: The model test is complete.
relation: reviews #case-test
outcome: The cable needs more clearance than the model allows.
body: The predicted fit did not occur. The cheap test still answered the question before ordering.
:::
```

**A month: compare processes.** The writer finds three project choices. Two cheap tests exposed problems early; one
choice had no clear resolution condition and remains hard to review. Next month they plan to define outcomes more
clearly. Three cases are not enough to estimate personal forecasting skill.

## 11. Variations and offshoots

- **Two-line record:** choice and reason, with a later note if useful.
- **Forecast notebook:** repeated, clearly resolvable predictions. This needs consistent scoring rules if calibration is studied.
- **Team decision log:** shared rationale and ownership, with permission to include others' contributions.
- **Reversible experiment:** a choice framed as a small test, paired with a [project log](project-lab-log.md).
- **Values record:** reasons include what matters to the writer; an outcome cannot prove a value right or wrong.

## 12. Community practice

Decision logs appear in project work and personal reflection, while forecasting communities use explicit resolution
criteria and repeated estimates. Those are related practices, not interchangeable methods. The sources checked here
do not establish how common personal decision journaling is or which community template works best.

If sharing an example, remove confidential business details, other people's names and information they did not agree
to publish. A fictional case can explain the process without exposing a real one.

## 13. Official products and formats

There is no official notebook for the general practice or this Jot profile. The tournament in [3] was a research
setting, not an endorsement of a commercial journal. No product prices or current app capabilities were surveyed.

## 14. Tools and supplies

A notebook, index card or text editor is enough. Add page numbers or record IDs for later reviews. A spreadsheet may
help with many comparable forecasts, but is unnecessary for ordinary choice notes. Do not buy a scoring system to
make the basic practice legitimate.

## 15. Digital and hybrid versions

Digital search helps find an earlier choice. Paper makes a later marginal note visibly separate. In either format,
keep timestamps honest and label corrections. A personal journal is not an immutable audit log; version history and
record IDs alone do not prove that an entry was unchanged or written before an event.

Scanned pages may contain names, prices or workplace information. Check the file and sharing destination before
export. Keep a separate shareable summary when the original includes private reasoning.

## 16. Evidence and research

**Some related evidence; no direct trial of this Jot journal format identified in this targeted source pass.**

| Source and population | Finding relevant here | Limit |
| --- | --- | --- |
| Fischhoff's historical-event judgment experiments [1] | Outcome knowledge changed likelihood and relevance judgments, often without awareness | Demonstrates a judgment problem; does not test whether a journal prevents it |
| Baron and Hershey's five undergraduate studies [2] | Favorable outcomes improved ratings of others' reasoning in medical and gamble scenarios | Scenario evaluations are not a trial of personal decision logs or real clinical choices |
| Mellers et al.'s geopolitical forecasting tournament [3] | Probability training, collaboration and selection into elite teams improved forecasting measures | Does not isolate keeping a diary; "tracking" here means selecting high performers into teams |

Preserving a forecast makes the original text available for comparison. That is a property of the record, not proof
that bias, wellbeing or decision quality improves. Forecast accuracy, quality of reasoning and satisfaction with a
choice are different outcomes. One prediction cannot establish calibration, and outcomes of choices not taken often
remain unknown.

## 17. Benefits

- **Available by design:** a dated record preserves stated reasons and uncertainties for later inspection.
- **Practical possibility:** a review may reveal a repeated assumption or an unclear success criterion.
- **Not established here:** improved earnings, reduced regret, unbiased thinking or better life decisions from this format.

The latter possibilities should not be sold as outcomes of keeping a notebook.

## 18. Pitfalls

**Outcome grading:** a lucky result does not show the original reasoning was sound, and a bad result does not show it
was careless [2]. Review the information and process as well as what happened.

**False precision:** a number without a clear event and deadline is hard to interpret. Use words when no meaningful
probability can be given. **Hindsight edits:** add a correction instead of silently replacing the forecast.
**Counterfactual certainty:** do not claim the unchosen option would definitely have worked.
**Rumination or delay:** shorten or stop the log if repeated analysis becomes distressing or prevents action.
The journal does not replace medical, legal or financial advice for consequential choices.

## 19. Accessibility and adaptations

- **Low energy:** choice and reason only; leave predictions and review dates blank.
- **Executive function:** keep one visible list of unresolved decisions, with permission to remove stale ones.
- **Vision:** use headings and text status labels instead of colored cells alone.
- **Motor or writing barriers:** dictate a short note using a tool whose storage and sharing behavior you understand.
- **Numeracy:** use an uncertainty sentence; a probability is optional, not a test of competence.
- **Memory differences:** link to the earlier entry rather than asking the writer to recall how they felt then.

## 20. Comparison

| Practice | Main question | Distinction |
| --- | --- | --- |
| Decision journal | Why did I choose this with what I knew? | Keeps choice-time reasons separate from later outcomes |
| [Project log](project-lab-log.md) | What did I try and observe? | Tracks procedures and observations, including after a choice |
| [Design critique log](design-iteration-and-critique.md) | What changed and why? | Connects versions, feedback and design criteria |
| [Free diary](free-diary.md) | What do I want to write? | Does not require a decision or an observable outcome |

## 21. Combining

Link a decision to a project experiment rather than duplicating its procedure. A [weekly planning review](getting-things-done-paper.md)
can hold the optional review date. A free diary can hold feelings about the choice without turning them into evidence
for the forecast. Keep a decision record optional when a method already has enough fields.

## 22. Ready-to-use bank

- I am choosing ___ because ___, with the information available today.
- The strongest alternative I considered was ___.
- I am assuming ___; I have not checked ___.
- I expect ___ by ___; I will resolve it using ___.
- I would reconsider if ___.
- What happened was ___. What remains unknown is ___.
- Given what I knew then, I would keep/change ___ about the process.

## 23. Glossary

| Term | Meaning |
| --- | --- |
| Calibration | Agreement between stated probabilities and event frequencies across many resolved forecasts |
| Hindsight bias | Outcome knowledge changing how predictable the past seems [1] |
| Outcome bias | Evaluating decision quality partly from its result [2] |
| Resolution condition | The observation or rule that tells whether a forecast occurred |
| Review | A later addition that compares the record with available outcomes |

## 24. FAQ

**Must every choice have a probability?** No. Record one only for a specific prediction where the number is meaningful.

**Can I change my mind?** Yes. Add a dated update with the new information. Preserve the earlier record if you want to review it.

**What if I forgot to write beforehand?** Label the note retrospective. It can still be useful without being a forecast.

**What if the outcome never becomes clear?** Mark it unresolved or stop reviewing it. Missing information is not failure.

**Does this prove I make good decisions?** No. A few entries cannot establish skill, and a journal does not remove uncertainty.

## 25. For Jot

Keep the existing profile's two required fields and optional forecasts. Use IDs and separate linked reviews where
helpful, without treating them as tamper-proof. Do not overwrite an original prediction with its outcome, infer a
personal competence score or turn review dates into compulsory reminders. No new profile fields or efficacy claims
are introduced by this guide. A template may offer the short form before optional detail.

## 26. Open questions

- Does this personal record-and-review format improve decisions compared with reflection without a journal?
- What amount of review helps without adding rumination or a disproportionate burden?
- When do lessons transfer across decisions with different stakes, outcomes and available information?
- What is the documented origin of the modern generic notebook practice? Not established in this pass.

## 27. Further reading

Read the [project notebook](project-lab-log.md), [design critique](design-iteration-and-critique.md) and
[time logging](time-logging-lifelog.md) guides for adjacent record-and-review practices. They answer different questions.
The sources below provide research context, not a complete literature review of debiasing interventions.

## 28. Sources

Targeted source check, 2026-11-02: [1] opened as a full primary paper hosted by MIT; [2] checked through its PubMed
abstract; [3] opened as an author-hosted full paper and checked for the meaning of "tracking". The CMU copy of [1]
redirected to a directory, and the eScholarship copy of [3] returned a browser challenge; the working copies below
were used instead. These checks do not constitute an exhaustive search for journal trials.

1. Fischhoff B. "Hindsight is not equal to foresight: The effect of outcome knowledge on judgment under uncertainty." *Journal of Experimental Psychology: Human Perception and Performance* 1(3):288–299, 1975. https://web.mit.edu/curhan/www/docs/Articles/15341_Readings/Behavioral_Decision_Theory/Fischhoff_1975_Hindsight_is_not_equal_to_foresight.pdf
2. Baron J, Hershey JC. "Outcome bias in decision evaluation." *Journal of Personality and Social Psychology* 54(4):569–579, 1988. https://pubmed.ncbi.nlm.nih.gov/3367280/
3. Mellers B, et al. "Psychological Strategies for Winning a Geopolitical Forecasting Tournament." *Psychological Science* 25(5):1106–1115, 2014. https://faculty.wharton.upenn.edu/wp-content/uploads/2015/07/2014---psychological-strategies-for-winning-a-tournament.pdf
