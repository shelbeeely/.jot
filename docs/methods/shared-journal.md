---
title: "Shared and dialogue journals"
slug: shared-journal
summary: "Attributable entries and replies, with an agreed audience and an explicit choice to share."
category: reflective-writing
evidenceLevel: anecdotal
lastReviewed: 2026-11-02
status: draft
licence: CC0-1.0
contributors:
  - Jot contributors
---

# Shared and dialogue journals

A shared journal holds writing intended for another person, with each contribution attributable. This guide covers Jot's `shared-journal@1` profile and the practical agreements around an exchange [1].

Sources checked 2026-11-02; access details are in section 28. Educational dialogue journals and experimental conversations offer related ideas, but do not establish that a shared journal improves every relationship.

## 1. At a glance

| Item | Detail |
| --- | --- |
| Creator | No single creator of all shared journals; Jot defines this particular profile [1] |
| Year | 2026 for the Jot profile; educational dialogue journals have a separate history [2] |
| Type | Attributable writing and responses |
| Time per day | Whatever participants agree; no response deadline is required |
| Time per week | Optional check that the arrangement still works |
| Cost | Existing paper or a deliberately shared file is enough |
| Formats | Passed notebook, letters kept together, text records, accessible assisted writing |
| Best for | An exchange people freely choose, with a clear audience |
| Not ideal for | Private disclosures kept in the same readable shared file, urgent communication or compulsory reconciliation |
| Learning curve | Agree boundaries before choosing a page layout |
| Supplies | A writing method and an understood way to pass or share it |
| Official site | No official site for the broad practice |
| Evidence level | Anecdotal for this general format; related educational guidance and conversation research have narrower scopes |

## 2. Summary

- Keep each writer's words under their own name or agreed handle.
- Agree who may read, copy, quote and retain the journal.
- Ask whether a response is wanted and what kind would help.
- Treat no response and a request to stop as valid choices.
- Keep writing intended to remain private in separate storage with appropriate access controls.

## 3. History and origin

Shared writing includes many practices rather than one standard method. Classroom dialogue journals are a specific example: Peyton describes an ongoing written conversation between a teacher and learner, focused on meaning rather than routine correction [2].

| Date | Relevant source |
| --- | --- |
| 1997 | Aron and colleagues publish experiments using escalating face-to-face disclosure tasks [3] |
| 2000 | Peyton's revised educational digest describes dialogue journals for adult English-language learners [2] |
| 2018 | The Oral History Association revises its ethics guidance on consent, review and release [4] |
| 2026 | Jot's `shared-journal@1` records authorship, text and optional audience/consent notes [1] |

These sources inform distinct parts of the guide. None is the origin or validation of every kind of shared journal.

## 4. Philosophy and principles

- **Participation is chosen.** Access to a relationship or service should not depend on revealing more than someone wants to write.
- **Authorship stays visible.** A reply does not overwrite the earlier writer's words.
- **Listening can be enough.** Advice, correction or interpretation need not be the default response.
- **Consent has a scope.** Agreeing that one person may read an entry does not imply agreement to publish it.
- **Storage has consequences.** A written audience label cannot prevent an unauthorised reader opening the file.

These are design and ethical choices, informed by [2] and [4], rather than measured outcomes of this profile.

## 5. Core components

Jot uses record type `response` for this profile [1].

| Field | Role |
| --- | --- |
| `author` | Required: the contributor's chosen name or handle |
| `body` | Required: their contribution |
| `relation` | Optional description of the relationship or exchange |
| `audience` | Optional note about intended readers |
| `consent` | Optional record of what was agreed |

The general `responds-to` relation can connect a reply to an earlier record. It is not required. Audience and consent are descriptive fields, not permissions enforced by the file format.

## 6. Setting it up

1. Invite participation without sending private writing as the invitation.
2. Agree the audience, topics that are off limits, and how either person can pause.
3. Choose a notebook or storage arrangement that matches those boundaries.
4. Agree how to identify writers and whether replies are expected.
5. Exchange a small, ordinary entry before considering more personal topics.

For the first week, ask whether the amount and pace feel workable. Change the arrangement, not the other person's entry. Discuss what happens to existing copies if the exchange ends.

## 7. Daily practice

There need not be a daily exchange. When writing:

- Address only what you want this audience to read.
- Say whether you want listening, a question, practical help or no reply.
- Read the other person's words as their account, rather than evidence of what they must feel.
- Write a reply under your own author label.

Use a separate, agreed channel for time-sensitive matters. A journal is not reliable emergency contact or proof that someone has read a message.

## 8. Rhythms

| Rhythm | Optional agreement |
| --- | --- |
| Each exchange | Check the intended audience and whether a reply is welcome |
| Weekly | Adjust pace; allow a pause without explanation |
| Monthly | Review who has access and whether existing retention choices still fit |
| When circumstances change | Revisit consent before involving another reader |

A gap does not create a reply debt. Ending the exchange does not erase copies already received; be honest about what can still be deleted or restricted [4].

## 9. Page anatomy

```text
Author or handle:
Entry:
Response wanted? listening / question / practical help / none

Reply author:
Reply:

Agreement kept separately: audience, copying, retention, pause
```

The response choices are a suggested paper layout, not additional required profile fields. They can be written in the body.

## 10. Worked examples

All people and situations below are invented.

**A day:** two friends choose to exchange one ordinary observation. They agree that neither will forward the file.

```jot
:::record response #window-note
method: shared-journal@1
author: writer-a
audience: The two writers only
consent: Read and reply; ask before quoting elsewhere
body: I saw a small fern growing beside the station. No advice wanted; I wanted to tell you.
:::
```

**A week:** the second person replies when they have time.

```jot
:::record response #fern-reply
method: shared-journal@1
author: writer-b
body: I liked that detail. I noticed the fern on my way home too.
:::
```

There is no requirement to match entry length or reveal something equally personal.

**A month:** one writer wants to show the fern entry to a gardening group. They ask first, show the exact excerpt and omit the reply when permission covers only the first entry. If permission is declined, they do not share it.

## 11. Variations and offshoots

| Variation | Additional consideration |
| --- | --- |
| Classroom dialogue journal | Explain grading, privacy limits and safeguarding duties before writing |
| Friendship notebook | Agree what happens when the notebook is lost or the exchange ends |
| Household reflection | Do not make another person's private emotions a required agenda item |
| Creative correspondence | Credit contributions and agree reuse before publication |
| Group journal | State the full audience and how new members affect existing entries |

A joint account need not merge different memories into one agreed version.

## 12. Community practice

Peyton's educational guidance describes teachers responding to the content of learner writing and modelling language through genuine communication [2]. It should not be generalised into a promise about couples, families or clinical outcomes.

Public exchanges and published letters have often been selected or edited. Private participants do not need to imitate their polish, emotional intensity or frequency.

## 13. Official products and formats

There is no official product required for this general practice. The local Jot profile defines an interoperable record shape [1].

A commercial shared notebook may supply prompts, but its purchase does not establish confidentiality, mutual consent or relationship benefit. No current product prices were needed for this guide.

## 14. Tools and supplies

- A passed notebook needs an agreed storage place.
- A digital exchange needs an understood way to share a copy or control access.
- Neutral author handles can limit unnecessary identifying details.
- Separate private notes from the shared version before sending it.
- Keep a clear way to say "pause" that does not require another journal entry.

If a helper transcribes, include their access in the agreement.

## 15. Digital and hybrid versions

Sharing a `.jot` file reveals its readable bytes [1]. Hiding a section in the interface, writing `audience: private`, or using a spoiler label is not access control.

For selective sharing, create and inspect a separate copy containing only agreed material. Check attachments, metadata, filenames and quoted replies too. A recipient may retain a copy even after access to an original is removed.

Printed pages and screenshots also create copies. Ask again before changing the audience or publishing, following the review-and-release principle in oral-history ethics [4].

## 16. Evidence and research

Evidence level: **anecdotal for a general shared journal and this Jot profile**. Relevant sources support practice descriptions and bounded ethical choices.

| Source | Support | Limit |
| --- | --- | --- |
| Peyton 2000 [2] | Educational dialogue journals as meaningful teacher–learner communication | Practice digest, not a trial of general relationship journaling |
| Aron et al. 1997 [3] | In study 1, escalating face-to-face disclosure tasks produced greater immediate closeness than small talk | A laboratory conversation procedure, not asynchronous journals, durable relationship change or a duty to disclose |
| OHA ethics [4] | Informed consent, review, authorisation and attention to power in recording another person's account | Professional ethical guidance, not outcome evidence for a journal |

The Arons' procedure cannot establish that sharing more private information is always beneficial. Participant choice, setting and the response received matter; no exact-format efficacy trial was identified in this targeted review.

## 17. Benefits

- Contributions and replies remain attributable: a record property.
- Writing can permit an asynchronous exchange: a practical affordance, if both people want it.
- A written agreement can make expectations easier to inspect: an ethical design choice.
- Educational practitioners describe opportunities for meaningful language use [2]; broader relational benefits remain unestablished for this format.

## 18. Pitfalls

| Difficulty | Possible adjustment |
| --- | --- |
| A reply starts to feel compulsory | Remove deadlines or pause the exchange |
| A writer receives unwanted advice | State the response wanted, or choose no reply |
| One person edits the other's account | Keep separate authored contributions |
| A shared file contains private sections | Move private writing into separate appropriately protected storage |
| The exchange becomes a record used to pressure someone | Stop using it for that purpose; consider separate support |
| Consent is vague | Name the exact audience and proposed use before sharing |

Do not use a journal to monitor another person's compliance, honesty or feelings.

## 19. Accessibility and adaptations

- **Writing effort:** allow short replies, typed entries or a reviewed transcript.
- **Processing time:** agree that an immediate response is not required.
- **Language:** allow different languages and ask before translating someone else's words.
- **Vision:** use text that supports enlargement and screen readers rather than image-only exchanges.
- **Cognitive load:** keep the audience stable and the agreement easy to find.
- **Unequal power:** make limits and alternatives explicit, especially in education or care settings [4].

An adaptation should not give a helper broader access than the writer intended.

## 20. Comparison

| Practice | Audience | Main distinction |
| --- | --- | --- |
| Shared journal | Agreed other readers | Attributable contributions and replies |
| [Free diary](free-diary.md) | Usually chosen privately | No response relationship required |
| [Prompt journaling](prompt-journaling.md) | Private or shared by choice | A question starts the writing |
| [Memory writing](memory-life-story.md) | Chosen separately | Different accounts and uncertainty can coexist |

## 21. Combining

A book club can share selected [reading responses](reading-media-journal.md). A family can preserve separate memories without requiring agreement about every detail. A shared creative log can hold critique while leaving personal reflection private.

Adding another method does not expand the audience automatically. An agreement to share a reading response does not cover a nearby symptom record or diary paragraph.

## 22. Ready-to-use bank

- I want to share this with ___ only.
- A response I would welcome is ___; no reply is also fine.
- Please ask before quoting or forwarding this.
- I read this differently; this is my account.
- May I share this exact excerpt with ___?
- I would like to pause the exchange.
- If we stop, our agreement about existing copies is ___ .

These are suggested words to discuss. Recording them does not technically enforce an agreement.

## 23. Glossary

| Term | Meaning here |
| --- | --- |
| Attribution | Identifying whose words a contribution contains |
| Audience | Intended readers, distinct from actual technical access |
| Consent scope | The particular participation or reuse someone agreed to |
| Dialogue journal | An ongoing written exchange; educational versions have specific teaching contexts |
| Retention | Keeping a copy after the original exchange |

## 24. FAQ

**Does `consent` make the file private?** No. It records words about an agreement [1].

**Must I answer every entry?** Only if you freely agree to that arrangement, and the agreement can be revisited.

**Can we disagree about an event?** Yes. Keep each account attributable rather than replacing one with a combined version.

**Can a teacher promise complete confidentiality?** Only within actual policies and duties. Explain limits before requesting personal writing.

**Will this fix a relationship?** No such effect is established for this format. A journal is not a substitute for needed support.

## 25. For Jot

Preserve `author` and `body`; offer optional relation, audience and consent notes without implying enforcement [1]. Keep replies distinct and support the general `responds-to` relation when wanted.

No automatic invitation, message or sharing action follows from creating a record. Sharing must be explicit and reviewable. Do not promise selective privacy inside a shared plain file, invent replies, score emotional openness or pressure a writer to answer.

## 26. Open questions

- Which agreements remain understandable when a journal changes hands or apps?
- How should consent changes be recorded without promising to retract copies already distributed?
- Which educational practices transfer usefully to voluntary peer exchanges?
- What effects and burdens would a study of asynchronous dialogue journals need to measure?

## 27. Further reading

The [free diary](free-diary.md) guide covers writing without an intended reply. The [memory-writing](memory-life-story.md) guide addresses uncertain and differing recollections. OHA's wider ethical guidance offers more detail for projects that collect and publish interviews [4].

## 28. Sources

Checked 2026-11-02. The CAL and OHA pages were read directly. The Aron paper's publisher-deposited abstract and bibliographic record were read through Crossref; its full text was not reviewed.

1. Jot contributors. `shared-journal@1`, [profile catalogue](../../specification/profiles.json), 2026. Local primary definition, checked directly.
2. Peyton JK. "Dialogue Journals: Interactive Writing to Develop Language and Literacy." National Center for ESL Literacy Education, revised December 2000. https://www.cal.org/caela/esl_resources/digests/Dialogue_Journals.html Educational practice digest.
3. Aron A, Melinat E, Aron EN, Vallone RD, Bator RJ. "The Experimental Generation of Interpersonal Closeness: A Procedure and Some Preliminary Findings." *Personality and Social Psychology Bulletin* 23(4):363–377, 1997. https://doi.org/10.1177/0146167297234003 Abstract read at https://api.crossref.org/works/10.1177/0146167297234003
4. Oral History Association. "OHA Statement on Ethics." 2018 revision. https://oralhistory.org/oha-statement-on-ethics/ Professional ethical guidance on consent, review and release.
