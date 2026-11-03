---
title: "Moodboards and colour palettes"
summary: "A collection of project references, mood words and named colors, with credits and intended color roles."
slug: moodboard-and-palette
category: neurodivergent-and-creative
evidenceLevel: anecdotal
lastReviewed: 2026-11-02
status: draft
licence: CC0-1.0
contributors:
  - Journalwright Studio contributors
---

# Moodboards and colour palettes

A moodboard gathers images, materials, words and colours that together describe the feel of a project before it is made. A palette is the set of colours chosen from it. This doc covers keeping both in a journal as plain text: a theme, mood words, references with alt text and credits, and named colours written as `#RRGGBB name`. A focused evidence and accessibility update was made on 2026-11-02; section 28 records which sources were rechecked. Anything not confirmed from a primary source is marked **(unconfirmed)**.

## 1. At a glance

| | |
|---|---|
| **Creator** | No single creator. A long-standing studio practice in fashion, textile, interior, graphic and industrial design; studied by Tracy Cassidy (2011) and Andrés Lucero (2012) |
| **Year** | Studio practice for decades; the Jot profile: 2026 |
| **Type** | Visual research / collection |
| **Time per day** | 2–10 minutes to add a reference or colour |
| **Time per week** | 10–20 minutes to edit a board down |
| **Cost** | $0 (magazine cut-outs, photos you take) |
| **Formats** | Pinboard, sketchbook spread, folder of images, `.jot` record with assets in a `.jotz` |
| **Best for** | Starting a creative project; agreeing a direction with others; artists and designers who collect references; people who think in images |
| **Not ideal for** | Work where colour must be specified for print or manufacturing; use a colour standard and proofs for that |
| **Learning curve** | Low |
| **Supplies** | Images and a way to note colours |
| **Official site** | None |
| **Evidence level** | Anecdotal for this journal format; published qualitative studies describe professional use without establishing its effect on design outcomes |

## 2. Summary

- A board has a **theme** (what it is for) and a **palette** of named colours; optional **mood words**, **references** (assets with alt text) and **credits**.
- Each colour is one `color:` line: `#` and six hex digits, a space, then a name, for example `color: #2E3A46 slate night`. Renderers that support it show a swatch beside each name.
- The name is part of the colour. A palette must make sense to someone who cannot see the swatches.
- References made by other people carry a credit. For artists, attribution is part of the work, not an afterthought.

## 3. History and origin

- Moodboards are a long-standing practice in design education and studios; the exact origin is not documented **(unconfirmed)**.
- **2011**: Tracy Cassidy models the moodboard process from observation and think-aloud studies with 13 designers and describes it as a qualitative research tool [1].
- **2012**: Andrés Lucero's study of experienced fashion, textile and industrial designers identifies five roles of moodboards: framing (setting the limits of a task), aligning (getting people on the same wavelength), paradoxing (exploring conflicting ideas), abstracting (juxtaposing concrete and abstract images) and directing (setting a trajectory) [2].
- **2026**: Jot adds a `moodboard-and-palette` profile using the `palette` record type, whose `color: #RRGGBB name` fields can render as labelled swatches.

## 4. Philosophy and principles

- **A board is for a purpose.** The theme says what the board is deciding.
- **Edit for the decision.** Keep references you can explain. A small board is a studio convention, not a proven optimum.
- **Colours have names.** Hex values are for machines; names are for people, including people who do not perceive colour the same way.
- **Credit sources.** Every reference not made by you names its creator and where it was found.
- **Meaning in words.** If a colour has a role (background, accent, warning), the role is written in its name.

## 5. Core components

- **Theme**: what the board is for ("Rainy bookshop poster").
- **Mood word**: an adjective or phrase for the feel. Repeatable.
- **Color**: `#RRGGBB name`. Repeatable, one per line.
- **Asset**: an image or scan reference, usually `assets/…` inside a `.jotz`. Repeatable.
- **Alt**: text alternative for each asset, paired in order. Repeatable.
- **Credit**: creator and source for each asset, paired in order. Repeatable.

## 6. Setting it up

1. Write the theme in one line.
2. Write three to five mood words.
3. In `/write/`, open Methods, search "palette" and insert the invitation with its record.
4. Attach reference images with the Attach button; for each, add `asset`, `alt` and `credit` lines in the record.
5. Pick three to seven colours. For each, write its hex value and a name that describes it ("lamplight", not "colour 2").

The suggested counts are starting points, not requirements. A word-only board or a single reference can be enough. Beside each reference, note what you want to learn from it: its spacing, texture, contrast or composition. This keeps "I like this" separate from "we should copy this".

If the board is for other people, write the intended audience and the decision to be made in the surrounding note. Ask collaborators what each reference means to them before treating a shared board as agreement. This is a suggested working process, not a tested collaboration intervention.

## 7. Daily practice

- When you see something that fits, photograph it or save it and add it with alt text and credit (2 minutes).
- When a colour keeps recurring, add it to the palette with a name.
- No daily requirement.

## 8. Rhythms

- **Weekly, during a project**: remove references that no longer fit; keep at most one per idea.
- **At the start of making**: freeze the board; link the first design iteration to it with `relation: derived-from #board-id`.
- **After the project**: note what the final work kept from the board.

## 9. Page anatomy

```
THEME   Rainy bookshop poster
MOOD    quiet · warm · late
-------------------------------------------
[ref 1: lit shop window]  [ref 2: wet street]
 credit: own photo        credit: A. Example
-------------------------------------------
PALETTE
 ■ #2E3A46  slate night
 ■ #C8A165  lamplight
 ■ #E9E2D3  paper
```

## 10. Worked examples

A board (invented content):

```jot
:::record palette #board-bookshop
method: moodboard-and-palette@1
theme: Rainy bookshop poster
mood-word: quiet
mood-word: warm
mood-word: late evening
color: #2E3A46 slate night (background)
color: #C8A165 lamplight (accent)
color: #E9E2D3 paper (text)
asset: assets/shop-window.jpg
alt: A lit bookshop window at dusk, rain streaks on the glass.
credit: Photo by the writer
asset: assets/wet-street.jpg
alt: Reflections of street lamps on a wet cobbled street.
credit: A. Example, "Wet street", CC BY 4.0, https://example.org/wet-street
:::
```

A week: the board starts with twelve references and nine colours; the weekly edit cuts it to four references and three colours, and adds roles to the colour names.

A month: three boards for three projects; each project's first design iteration links back to its board.

A palette check for the example above, using the WCAG sRGB contrast calculation [6]:

| Text | Background | Calculated ratio | Ordinary web text at WCAG AA |
| --- | --- | --- | --- |
| Paper `#E9E2D3` | Slate night `#2E3A46` | About 9.00:1 | Passes 4.5:1 |
| Lamplight `#C8A165` | Slate night `#2E3A46` | About 4.83:1 | Passes 4.5:1 |
| Lamplight `#C8A165` | Paper `#E9E2D3` | About 1.86:1 | Does not pass 4.5:1 |

The board can keep all three colours. The failed pairing means "do not use lamplight for ordinary text on paper," rather than "discard lamplight." Use it as an accent only where the actual use meets the relevant requirements. Ratios above describe opaque, solid screen colours; opacity, images and gradients need checking in their final context. A passing pair does not establish accessibility of the whole page.

An invented review note:

```text
Keep: the dark background and quiet spacing from reference 1.
Leave: the tiny gold labels; they are hard to read on cream.
Try next: cream body text on slate, with gold as a separate accent.
Open question: does the same direction work on the printed poster?
```

## 11. Variations and offshoots

- **Palette only**: a `palette` record with just colours, for a sketchbook or a brand.
- **Material boards**: references are fabric, paper or paint swatches; `asset` is a scan and alt describes texture.
- **Word boards**: mood words and quotes only, no images.
- **Character or world boards** for illustration and writing.
- **Accessibility-checked palettes**: colour names include text/background pairing and the contrast ratio you measured.

## 12. Community practice

Designers and artists share boards online and in studios; fashion and interior students commonly make them as early assignments [1]. Many artists reuse others' images on boards without credit; this profile treats credit as part of a complete record. No individual practices are described here.

## 13. Official products and formats

Not applicable: no official moodboard product. Many apps offer boards; this profile does not depend on any.

## 14. Tools and supplies

- Paper boards: a pinboard or sketchbook spread, glue stick, scissors, magazines.
- Digital: any image folder. An eyedropper tool in a free image editor gives hex values.
- Paint or fabric swatches can be scanned or photographed; the hex value is an approximation of a physical colour.

## 15. Digital and hybrid versions

- In Jot, the record holds the theme, words, colours and credits as text; images travel inside a `.jotz`.
- A physical board can be photographed once and attached as one asset, with alt text describing the whole board.
- What is lost: texture, scale and the way physical colours change under light. A hex value is a screen colour, not a print specification.

## 16. Evidence and research

The catalogue's **anecdotal** level refers to the outcomes of this journal format. Qualitative research is evidence about practice in its own right; it should not be confused with an informal testimonial or asked to establish a causal effect it did not test.

| Source | What it supports | Limit for this guide |
| --- | --- | --- |
| Cassidy [1] | A qualitative account and model of the moodboard process in design practice | A process model does not establish that a board improves the final design or that a journal implementation works the same way |
| Lucero [2] | Designers use boards to frame, align, explore tensions, abstract and direct | Described roles do not establish that every collaborator reads a reference the same way, or quantify outcome improvement |
| W3C [4], [5], [6] | Accessibility requirements and guidance for alternatives, colour meaning and text contrast | These are standards and implementation guidance, not evidence that moodboards improve creative work |

The original source pass identified no controlled evaluation of this particular format. This update did not conduct a systematic search for all moodboard outcome studies, and access to the full papers [1], [2] was unavailable. It therefore retains the bounded process claims rather than declaring that no controlled research exists anywhere.

Board-size limits, a weekly edit and three to seven colours are suggested workflow choices. They are not findings from these studies. Hex values and colour names make the chosen palette recordable; their presence alone does not demonstrate accessible contrast, successful communication or print accuracy.

## 17. Benefits

- Framing a task and aligning people on a direction (reported by designers in [2]).
- Making implicit taste explicit and shareable (practitioner report).
- Credits make it possible to trace and acknowledge influences later [3].
- Named colours preserve a text description of a palette. Screen-reader access also depends on how the page exposes that text; a name alone does not make every use of a swatch accessible [4], [5].

## 18. Pitfalls

- **Endless collecting.** Set a size limit and edit weekly.
- **Copying the board.** A board directs; the work should not reproduce a reference.
- **Uncredited images.** Add credit at the moment of saving; it is hard to find later.
- **Colour-only meaning.** Do not use red for "no" without the word "no". Write the role in the name.
- **Treating hex as truth for print.** Screens and paper differ.
- **Assuming shared taste means shared understanding.** Ask what each reference contributes. Record a disagreement in words rather than choosing a board by a show of hands.
- **Treating attribution as permission.** A credit helps trace an image; permission or a suitable licence is a separate question. Check it before distributing a board or reusing a reference in finished work.
- **Declaring a palette accessible.** Check the actual text/background pair, text size and use. A list of individually pleasing colours is not an accessibility check [5], [6].

## 19. Accessibility and adaptations

- **Vision**: every asset has alt text [4]; every colour has a name. A swatch is never the only description.
- **Colour vision differences**: colour roles are in words, never colour alone (WCAG 1.4.1 [5]). For ordinary web text, WCAG 1.4.3 requires at least 4.5:1 contrast; large text uses 3:1, with the criterion's definitions and exceptions [6]. Record the pair and role beside the ratio. A descriptive colour name and sufficient contrast solve different problems.
- **Cognitive**: a board with three mood words and three colours is complete; references are optional.
- **Motor**: digital boards avoid cutting and gluing; voice dictation works for every field.
- **Sensory**: boards can be calm. Fewer references, muted colours and no animation are valid choices.
- **Nonvisual review**: describe the relevant relationship, not only the objects: "warm light against a dark surround; generous space around the title." Complex boards may need a short overall description plus descriptions of the references that carry separate meaning [4].

## 20. Comparison

| | Moodboard and palette | Art and junk journal | Commonplace book | Design iteration log |
|---|---|---|---|---|
| Unit | A board for a theme | A day or page | A quote or idea | A version of a design |
| Colours | Named palette | Optional | No | Optional |
| Credits | Required for others' references | Optional | Required for quotes | Optional |
| Purpose | Direction before making | Expression | Remembering ideas | Recording decisions |

## 21. Combining

- **Design iteration and critique**: link iterations to the board with `relation: derived-from #board-id`.
- **Drawing practice**: a colour study can test the palette (`relation: about #board-id`).
- **Art and junk journaling**: a physical collage page can be the board; attach a photo.
- **Commonplace book**: quotes that shaped the theme, with attribution.

## 22. Ready-to-use bank

Prompts:

- What is this board deciding?
- Which three words should someone feel?
- Which reference would I keep if I could keep only one?
- What role does each colour play?

Colour-naming patterns: material ("wet slate"), light ("lamplight"), object ("tram ticket yellow"), role ("background", "accent", "text", "warning").

Credit pattern (after [3]): title, creator, source link, licence. For your own photos: "Photo by the writer".

## 23. Glossary

- **Alt text**: a text alternative for an image.
- **Credit / attribution**: naming who made a work and where it came from.
- **Hex colour**: a colour written as `#` and six hexadecimal digits for red, green and blue.
- **Moodboard**: a collection of references that sets the feel of a project.
- **Palette**: a chosen set of colours.

## 24. FAQ

- **Can I write colours in lowercase hex?** The profile uses `#RRGGBB`; either case is the same colour, but uppercase is the documented form.
- **Do I need images?** No. Theme and colours make a complete board.
- **Can I use images from the internet?** Check the rights or permission for your intended use, and keep a credit. Private use is not a blanket copyright exception, and a credit does not itself grant permission to distribute the board or copy an image into finished work.
- **Why must colours have names?** So the palette makes sense without seeing it, and so the role of each colour is clear.
- **Does a contrast ratio certify my palette?** No. It checks a specific pair under stated conditions. Test the colours where they will actually be used; other accessibility requirements still apply [5], [6].

## 25. For Journalwright Studio

- **Adopt**: the `moodboard-and-palette@1` profile; labelled swatches beside colour names in previews; a printable board page with space for credits.
- **Adopt**: a credit line under every reference slot.
- **Don't adopt**: colour-only legends, or palettes printed without names (print is often black and white).
- **Don't adopt**: generated reference images.

## 26. Open questions

- How large a board works best is not studied; editing to a handful is practitioner advice.
- No standard exists for colour names; this profile leaves naming to the writer.

## 27. Further reading

- Andrés Lucero's doctoral research on supporting moodboard making (TU Eindhoven, 2009).
- W3C "An alt Decision Tree" for writing alt text.

## 28. Sources

Original source pass: 2026-10-27. Focused update on 2026-11-02: W3C guidance [4], [5], [6] was opened and its relevant requirements and intent checked. Publisher/repository access to [1], [2] returned access errors, and [3] could not be reopened; those entries retain the earlier source-pass date. Bibliographic identifiers for [1], [2] were cross-checked through Crossref, which does not substitute for reading their full text. This guide remains a draft.

1. "The Mood Board Process Modeled and Understood as a Qualitative Design Research Tool". Tracy Cassidy. Fashion Practice 3(2), 2011. https://pure.hud.ac.uk/en/publications/the-mood-board-process-modeled-and-understood-as-a-qualitative-de/
2. "Framing, Aligning, Paradoxing, Abstracting, and Directing: How Design Mood Boards Work". Andrés Lucero. Proceedings of DIS 2012, ACM. https://doi.org/10.1145/2317956.2318021
3. "Recommended practices for attribution". Creative Commons. https://wiki.creativecommons.org/wiki/Best_practices_for_attribution
4. "Understanding Success Criterion 1.1.1: Non-text Content". W3C Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html
5. "Understanding Success Criterion 1.4.1: Use of Color". W3C Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
6. "Understanding Success Criterion 1.4.3: Contrast (Minimum)". W3C Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
