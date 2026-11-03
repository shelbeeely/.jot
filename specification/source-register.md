# Jot source register

## Origin and review scope

The upstream methods library is [shelbeeely/Journaling `docs/journaling/methods`](https://github.com/shelbeeely/Journaling/tree/f67a54dd20c907c6f239a65342f6ca8568f462d2/docs/journaling/methods),
snapshot `f67a54dd20c907c6f239a65342f6ca8568f462d2`, retrieved 25 October 2026. It supplied 46 CC0 guides. The upstream
head was rechecked on 28 October 2026; that historical check is not a claim about today's upstream head.

The initial catalogue adaptation reviewed the first 150 lines of each imported guide, not its entire bibliography.
The copies now include local cross-links, Jot-specific additions, catalogue summaries and targeted corrections. They
must not be described as unchanged upstream files. Original source-check dates and inherited editorial states remain
where no new source review was performed. A `reviewed` state from upstream is not an independent Jot audit.

Primary inspiration: [Fountain repository README](https://github.com/nyousefi/Fountain/blob/master/README.markdown), read
25 October 2026. Its writing-first, readable plain-text approach informs Jot. Jot is a separate journaling format, not a
Fountain-compatible screenplay dialect. No source code was copied. The original attached Jot Complete Specification
v1.0 PDF is the baseline design.

## Method coverage

As of 2 November 2026, all 62 profiles in `specification/profiles.json` have corresponding research guides. A profile
`<id>@1` maps to `docs/methods/<id>.md`. The generated [catalogue](../docs/methods/README.md#catalogue) links every guide
and records its evidence level, editorial state and latest documented source-review date. `node tools/check-methods.mjs`
checks profile coverage, guide structure, numeric citations and local links; it cannot verify scientific claims or live
external sources.

The library contains the 46 imported guides and 16 original Jot guides. Original profiles and adaptations do not imply
an established named method, an inventor, a validated instrument or therapeutic effectiveness.

### Original Jot guides

The six guides already present before this expansion:

- [Voice practice](../docs/methods/voice-practice.md), [task initiation and transitions](../docs/methods/task-initiation-and-transitions.md) and [low-demand check-in](../docs/methods/low-demand-check-in.md): profiles and guides added 27 October 2026.
- [Drawing practice](../docs/methods/drawing-practice.md), [design iteration and critique](../docs/methods/design-iteration-and-critique.md) and [moodboards and palettes](../docs/methods/moodboard-and-palette.md): original guides omitted from the old 49-entry mapping; now included in the complete catalogue.

Ten guides added 2 November 2026 for existing complementary profiles:

- [Free diary](../docs/methods/free-diary.md)
- [Shared and dialogue journals](../docs/methods/shared-journal.md)
- [Travel and field observations](../docs/methods/travel-field-log.md)
- [Reading and media](../docs/methods/reading-media-journal.md)
- [Decision journals](../docs/methods/decision-journal.md)
- [Project and lab notebooks](../docs/methods/project-lab-log.md)
- [Food and cooking](../docs/methods/food-cooking-journal.md)
- [Spiritual reflection](../docs/methods/spiritual-reflection.md)
- [Memory and life stories](../docs/methods/memory-life-story.md)
- [Access needs and scripts](../docs/methods/access-needs-and-scripts.md)

These guides preserve the existing profiles' required and optional fields. Their suggested routines and examples are
adaptations, not tested Jot interventions. All new guides remain drafts pending editorial review.

## Local research pass: 2 November 2026

The full library was checked for numbered-section coverage, local links, numeric source references and profile mapping.
Every guide received a concise catalogue summary. The work below was a targeted source and content review, not an
exhaustive literature search or an all-source recheck of the inherited library. Each changed guide's section 28 gives
the actual access scope, including abstract-only checks and failed requests.

| Guides | Substantive changes and source-check scope |
| --- | --- |
| Low-demand check-in; task initiation; stimming; new access-needs guide | Expanded examples and adaptations. Corrected the EMA burden claim using Wrzus and Neubauer's findings and limitations; distinguished exploratory frequency results from the main analysis and from once-daily diaries. Qualified the body-doubling survey. Checked autistic-led burnout, stimming and masking research, implementation-intention material, NICE, W3C and EEOC guidance as documented per guide. |
| Drawing; design critique; moodboards; study notes | Expanded practical review and learning guidance. Separated logs and worksheets from evidence for drawing, feedback, retrieval and spacing. Added scoped study details and accessibility references. Publisher access failures and indexed-abstract checks remain explicit. |
| Voice practice | Expanded comfort, accessibility and measurement limits; reconciled the guide with the current optional local pitch meter. Checked the 2023 voice review, NIDCD and Praat sources; retained ASHA access limits and unrechecked older references. |
| ADHD; habit tracking; CBT; DBT | Clarified that the strongest evidence concerns related interventions, treatment packages or components, not the exact Jot profile. Targeted primary-abstract checks do not replace the inherited bibliographies' earlier review dates. |
| Gratitude; safety planning; e-ink; scan systems | Removed unsupported low-risk assurances and narrowed platform, power and recognition claims. This is a targeted correction of inference and wording, not a new full bibliography audit. |
| Ten new guides listed above | Added complete 28-section references with setup, routines, invented examples, comparisons, adaptations, privacy, evidence limits and checked sources. Source types include primary studies and official practice, accessibility, field-recording, research-integrity, food-safety and spiritual-care guidance; exact-format efficacy is not inferred. |

Inherited section 25 headings and implementation tables refer to Journalwright Studio or X4. They are source-project
context, not verified Jot features. New guides use "For Jot" and separate proposed design from existing behavior.
Hardware remains deferred. The research does not itself change profiles, the file format or Writer behavior.

Local corrections have not been published back to the upstream library as part of this pass. Upstream contribution and
an independent editorial review of the new drafts remain separate work.

## Device-rendering references: 3 November 2026

`docs/rendering/epaper.md` and `docs/rendering/navigation.md` use FreeInk SDK source snapshot
`0dbf8cc5c32e3d3672365e497d6ee9163ac6b120`, primary X4/panel documentation and the existing Jot implementation.
Their source lists record exact paths and check limits. The browser tutorial was exercised locally; the native C++
example and input mappings were source-reviewed without firmware compilation, flashing or hardware testing.
Navigation policies and cache/index examples are proposed application behavior, not Jot format extensions or SDK
features automatically obtained from a raster image. This work does not change the 62-method research catalogue.

The expanded syntax, media/link and integration references were checked against the canonical parser/preview,
container, data modules, host interfaces, converter registries and current proposals/roadmap. They record current
implementation limits and distinguish planned providers from implemented connections. The generated rendering ledger
covers profiles, standard record names, declared parser extensions and registered archive sources. These are source
and registry checks, not live-provider or physical-device verification.
