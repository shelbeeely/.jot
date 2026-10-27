---
title: "Moodboards and colour palettes"
slug: moodboard-and-palette
category: neurodivergent-and-creative
evidenceLevel: anecdotal
lastReviewed: 2026-10-27
status: draft
licence: CC0-1.0
contributors:
  - Journalwright Studio contributors
---

# Moodboards and colour palettes

A moodboard gathers images, materials, words and colours that together describe the feel of a project before it is made. A palette is the set of colours chosen from it. This doc covers keeping both in a journal as plain text: a theme, mood words, references with alt text and credits, and named colours written as `#RRGGBB name`. Sources were checked on 2026-10-27. Anything not confirmed from a primary source is marked **(unconfirmed)**.

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
| **Evidence level** | Anecdotal (qualitative studies of designers' practice; no trials) |

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
- **Edit down.** A board with fewer, stronger references directs better than a dump.
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

- Cassidy [1] and Lucero [2] are qualitative studies of designers' practice (observation, think-aloud, interviews). They describe how boards are used; they do not measure outcomes.
- No controlled study was found on whether moodboards improve design results.
- Evidence level: **anecdotal**, supported by qualitative research on professional practice.

## 17. Benefits

- Framing a task and aligning people on a direction (reported by designers in [2]).
- Making implicit taste explicit and shareable (practitioner report).
- Credits make it possible to trace and acknowledge influences later [3].
- Named colours make a palette usable with screen readers and in plain text.

## 18. Pitfalls

- **Endless collecting.** Set a size limit and edit weekly.
- **Copying the board.** A board directs; the work should not reproduce a reference.
- **Uncredited images.** Add credit at the moment of saving; it is hard to find later.
- **Colour-only meaning.** Do not use red for "no" without the word "no". Write the role in the name.
- **Treating hex as truth for print.** Screens and paper differ.

## 19. Accessibility and adaptations

- **Vision**: every asset has alt text [4]; every colour has a name. A swatch is never the only description.
- **Colour vision differences**: colour roles are in words, never colour alone (WCAG 1.4.1 [5]). If a palette is for text, note the contrast ratio.
- **Cognitive**: a board with three mood words and three colours is complete; references are optional.
- **Motor**: digital boards avoid cutting and gluing; voice dictation works for every field.
- **Sensory**: boards can be calm. Fewer references, muted colours and no animation are valid choices.

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
- **Can I use images from the internet?** For a private board, many people do. Always credit them, and check the licence before sharing or publishing.
- **Why must colours have names?** So the palette makes sense without seeing it, and so the role of each colour is clear.

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

All checked 2026-10-27.

1. "The Mood Board Process Modeled and Understood as a Qualitative Design Research Tool". Tracy Cassidy. Fashion Practice 3(2), 2011. https://pure.hud.ac.uk/en/publications/the-mood-board-process-modeled-and-understood-as-a-qualitative-de/
2. "Framing, Aligning, Paradoxing, Abstracting, and Directing: How Design Mood Boards Work". Andrés Lucero. Proceedings of DIS 2012, ACM. https://doi.org/10.1145/2317956.2318021
3. "Recommended practices for attribution". Creative Commons. https://wiki.creativecommons.org/wiki/Best_practices_for_attribution
4. "Understanding Success Criterion 1.1.1: Non-text Content". W3C Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html
5. "Understanding Success Criterion 1.4.1: Use of Color". W3C Web Accessibility Initiative. https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
