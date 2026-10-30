# Jot brand book

Everything that makes Jot look and sound like Jot, in one place: for anyone writing a page, designing a screen, packaging an app
or posting about it. Read Part 1 first; the rest is reference. Two companions hold the detail: [`voice.md`](voice.md) (how Jot
sounds) and [`messaging.md`](messaging.md) (what Jot says, with the canonical descriptions to paste). The facts behind it all are
in [`.agents/brand-context.md`](../../.agents/brand-context.md); the decisions and their reasons are in
[`DECISIONS.md`](../../DECISIONS.md).

## Part 1: Foundation

**Mission.** Give everyone a journal that is theirs for life: written one thought at a time, in plain text that any editor
opens, laid out as beautiful pages.

**Vision.** A journal format that outlives every app that reads it, with tools good enough that people choose it for the pages,
not just for the principle.

**Values.**
- **Your words are yours.** Plain files, no account, nothing uploaded.
- **Built to last.** The file outlives the tools; the format is written down and readable without them.
- **Permission, not pressure.** No streaks, scores or missed-day counts; one thought at a time, as brief or as detailed as it
  needs to be.
- **Honest about evidence.** No health or productivity claims beyond what the research shows; say where it is thin.
- **Room for every kind of mind.** Many methods, accessible pages, low-demand options.

**Personality.** Warm, handmade, calm, quiet, honest.

**Positioning.** For journal keepers who want their writing to last and to look like a notebook, Jot is a plain-text journal
that gives you beautiful pages back. Unlike journaling apps, it needs no account and keeps every entry in an ordinary file; unlike
plain Markdown notes, it is shaped for journals, with dates, methods, handwriting and charts.

**The name.** "Jot" comes from iota, the smallest letter; a jotting is a quick note. It also reads as *just one thought*: one
thought at a time, as brief or as detailed as it needs to be. The logo's stroke and dot are a 1 and a 0: ten, iota's value, two
in binary.

## Part 2: Visual identity

### The logo

**The idea.** A Greek iota (ι), written quickly with a good pen: it lands to a point, swells, and lifts off into a flick; the
dot comes afterwards and lands a little ahead, as a hand dots an i at the end of a word. "Jot" comes from iota, the smallest
letter, and a jotting is a quick, brief note. The stroke and the dot are also a 1 and a 0: ten, iota's value in Greek numerals,
which is two in binary. Nobody needs to see that to read the mark; it is there for whoever looks.

**Just one thought.** The letters also read as a backronym, *just one thought*: you take what is on your mind one thought at a
time, and each one can be a line or pages. It is about focus, not size, and it is a reading we give the name, not where the word
comes from (that is iota). Say it as an invitation to start and to keep going thought by thought; never as a limit ("keep it
short", "only one") or a target ("one a day", streaks).

**The wordmark** spells the name with that same iota: "ιot", the logo's own stroke and dot as its first letter, then "ot" in
the same hand. The symbol and the name are one mark, so there is no separate symbol-and-wordmark lockup. The name is still
Jot, in text, in speech and for screen readers: wherever the wordmark is shown, its accessible name is "Jot". The brief behind it:
[`docs/proposals/logo.md`](../proposals/logo.md).

### Versions

| File | Use |
| --- | --- |
| `jot-wordmark.svg` | "ιot": the primary logo |
| `jot-symbol.svg` | The iota alone: app icons, avatars, a stamp |
| `jot-symbol-small.svg` | A heavier cut of the iota for 32 px and smaller (favicons) |
| `*-ink.svg` | The same, in ink blue, for placing as images |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` | The site's icons (copied into `site/dist/` by `tools/sync-brand.mjs`) |
| `app-icon.svg`, `app-icon.png` | The app icon: cream paper, ink-blue iota (`desktop/` makes every platform's sizes from it) |
| `jot-wordmark-light.svg` | The wordmark in the light ink, for dark backgrounds (the README shows it in GitHub's dark mode) |
| `vscode-icon.png`, `jot-file-light.svg`, `jot-file-dark.svg` | The VS Code extension's icon, and the iota as the icon of `.jot` files in light and dark themes (copied into `vscode/media/` by `tools/sync-brand.mjs`) |
| `jot-document.svg` | The document icon: a cream page with the iota, for `.jot`, `.jotz` and `.jotlock` in Linux file managers (copied into `desktop/src-tauri/linux/`) |
| `social-preview.svg`, `social-preview.png` | 1280 × 640: the wordmark on dot-grid paper, for link previews (copied into `site/dist/` for the homepage's preview) and the repository's social preview |
| `jot-symbol-written.svg` | Motion: the iota being written (the pen lands, draws down, flicks off) and then dotted, in about 1.4 seconds; with reduced motion it simply shows. For a launch screen, a loading moment or a talk; never on a loop |

The plain masters are filled with `currentColor`, so inline in a page they take the text color: ink blue on cream, the light
ink on charcoal. The site's headers use them that way.

### Clear space and minimum size

Keep clear, on every side, at least the width of the iota's dot. The zone grows and shrinks with the logo.

| Version | Screen | Print |
| --- | --- | --- |
| Wordmark | 40 px wide | 12 mm wide |
| Symbol | 16 px (use `jot-symbol-small.svg` at 32 px and under) | 5 mm |

### Don'ts

Don't redraw the iota or type "jot" in a font in its place; don't stretch, rotate or outline it; don't add shadows, gradients
or effects; don't put the iota beside the wordmark (it already begins with it); don't put a hash sign (⌗) beside it, the old
mark it replaces; don't write "ιot" in running text: there the name is Jot; don't turn "just one thought" into a length limit or a
target ("a day", a streak), or present it as the word's origin.

### Color

| Name | HEX | RGB | CMYK (approximate) | Contrast |
| --- | --- | --- | --- | --- |
| Ink blue (the logo) | `#1f3a8a` | 31 58 138 | 78 58 0 46 | 10.2:1 on cream, 8.5:1 on the page background |
| Cream paper | `#fffdf6` | 255 253 246 | 0 1 4 0 | |
| Page background | `#ede9df` | 237 233 223 | 0 2 6 7 | |
| Light ink (dark mode) | `#cbd5eb` | 203 213 235 | 14 9 0 8 | 10.4:1 on charcoal |
| Charcoal paper | `#242622` | 36 38 34 | 5 0 11 85 | |

These are the site's own paper and ink colors (`parser/handwriting.mjs`). The CMYK values are converted, not proofed: check a
printed proof before a print run. No Pantone match has been chosen.

**Approved pairs:** ink blue on cream or the page background; light ink on charcoal; black on white or cream; white on ink
blue or charcoal. On a photo, use the black or white version over a calm area, or the app-icon tile.

### Typography

Jot's type is its own handwriting and the reader's system fonts: no web fonts are fetched, and the handwriting fonts ship with
Jot (all SIL Open Font License).

| Level | Typeface | Weight | Size | Use |
| --- | --- | --- | --- | --- |
| H1 | The page's hand (Caveat by default) | 700 | 44 to 76 px, fluid; line height 1.1 | One per page: the headline |
| H2 | The same | 700 | 36 px; 1.2 | Sections |
| H3 | The same | 700 | 28 px; 1.25 | Cards, steps |
| Body | The same | 400 | 23 px; 1.5 | Running text on the site |
| Labels, navigation, captions | The same | 400 | 19 to 21 px | Eyebrows, buttons, status lines |
| The logo | Drawn, not set | | | Never typed in any font |

- **Hands.** Pen (Caveat, with three alternate letter shapes), Neat print (Playpen Sans) and Marker (Shantell Sans). The writer
  chooses; the site uses Pen.
- **Typed page styles.** Journal uses a book serif stack (Iowan Old Style, Palatino, Charter, Georgia); Notes uses a sans stack
  (Inter, the system UI font, Roboto, Arial); Plain uses the reader's own. They come from `parser/styles.mjs`.
- **Rules.** Sentence case everywhere; no letter-spacing tricks on the handwriting; line height never below 1.1 for headings or
  1.5 for body. The sizes live in `parser/handwriting.mjs` (generated into the shared stylesheet).

### Imagery

- **Pages, not photos.** Show real Jot pages drawn by Jot's own renderer: the homepage's examples are live previews, not
  screenshots of a mock-up.
- **Paper and ink.** Cream or charcoal paper, the dot grid, ink blue writing, the Mildliner highlight colors where a page uses
  them.
- **Icons** are the iota; interface signs use plain text labels beside any symbol (color and icons are never the only signal).
- **Avoid:** stock photos of people journaling at cafés, laptops on wooden desks, sparkles and confetti, gradients, glossy 3D.

### The system around it

Everything grows from the page and the pen, so the system is mostly what Jot already is:

- **Paper and ink.** Cream paper with a dot grid, ink blue writing; charcoal paper and the light ink in dark mode. The logo
  never sits on anything else (photos aside, below).
- **The ink dot.** The jot itself, the iota's dot, is the one graphic device: a single dot where a bullet, a marker or a pause
  is needed. Draw it as an ink dot (slightly oval, a little tilted, as in the logo), never as a perfect circle or a second logo.
- **Color roles.** Ink blue is the brand: the logo, the writing, the links. The site's purple accent (`#65508f`, light
  `#c3afe7` in dark mode) is for actions and focus only (primary buttons, focus rings, the current tab), never for the logo.
- **The name beside the wordmark.** "ιot" is the logo; the name is Jot. Where people first meet the wordmark, "Jot" is also
  written in words nearby (the homepage's first line, the README's title, page titles "Tool · Jot").
- **The handwriting.** Pages, navigation and headings use the site's handwriting fonts (Caveat, Playpen Sans, Shantell Sans);
  the logo is drawn, not set in them, and nothing else is drawn to look like it.
- **Tools under one name.** Jot is one brand: the tools are named in words beside the wordmark, never with their own marks:
  "ιot / SCAN" in the scanner's header, "Write", "Template editor", "Converter", "Your life online" in the navigation. The app
  icon, the extension icon, the file icon and the favicon are all the same iota.
- **Where it appears.** The site's headers and favicons, the desktop and mobile app icons, `.jot` files in the file manager,
  the VS Code extension and its `.jot` file icon, the top of the README, and the social preview. For GitHub's repository card, upload `social-preview.png`
  in the repository's Settings → General → Social preview (it cannot be set from the repository's files).
- **Motion.** The iota is written, then dotted (`jot-symbol-written.svg`): once, at the pace of a hand, never looping and never
  where it would delay the writer. Respect reduced motion.
- **A stamp.** The one-color symbol works as a rubber stamp or emboss; no stamp has been made or proofed yet.

## Part 3: Verbal identity

**Voice essence:** Jot sounds like a trusted notebook that talks back now and then: calm, warm and plain.

- **Permission, not pressure:** "Start anywhere. A sentence is enough." Never streaks or "you missed".
- **Plain:** everyday words; technical terms only where someone needs them.
- **Honest:** say the limits; never claim an effect the research doesn't show.
- **Quiet:** few words; status messages say what happened, without celebrating.
- **Warm:** the writer at the center; care shows in specifics, not adjectives.
- **Private by default:** say plainly where words go (usually nowhere).

**Style:** short sentences; no exclamation marks; no em dashes in body copy; sentence case; American English; numerals for
counts and sizes; contractions; active voice.

**We say:** jot, journal, your writing, a thought, one thought at a time, page, plain text, file, keep, open, start anywhere,
handwritten, ink, way in, nothing is uploaded, yours.
**We don't say:** user, content, leverage, powerful, seamless, boost, streak, achievement, engagement, AI-powered, revolutionary,
"simply", "Oops".

The full guide, with channels and before-and-after rewrites: [`voice.md`](voice.md).

## Part 4: Messaging

**Core message.** Jot helps journal keepers keep a journal that is theirs for life, by turning plain text, written one thought
at a time, into beautiful pages, with no account and nothing uploaded.

**Tagline.** **Jot things down. Get beautiful pages back.** Second line, where there is room or the moment is about starting:
**Just one thought at a time.**

**Key messages.**
1. **Your journal outlives the app.** A `.jot` file is plain text that any editor opens.
2. **Yours, and only yours.** No account, no server, no analytics; nothing you write is uploaded.
3. **Beautiful pages from plain words.** Dates in words, tasks, margin notes, charts, handwriting on a dot grid.
4. **Every way of journaling, one file.** 62 method profiles, backed by 52 research guides; years of old posts can come in too.

Proof points, audience variations and the canonical descriptions for the repository, the site, the app and the extension:
[`messaging.md`](messaging.md).

## Part 5: The brand in use

**Website.** The wordmark in every header, in the page's ink; "Jot" in words in the first line and in every page title ("Tool ·
Jot"); one primary action per screen in the purple accent; cream paper with the dot grid; the homepage tells, the writer does.
`tools/sync-brand.mjs` keeps the headers, icons and link preview in step.

**Apps and the extension.** The iota is every icon: the desktop and mobile app (cream tile), `.jot` files in the file manager
(a cream page), the VS Code extension and its file icon. Descriptions come from `messaging.md`.

**The repository.** The wordmark at the top of the README (light ink in dark mode), the title "Jot", the tagline, then "Just
one thought" on its own line. GitHub's About and social preview are set by hand from `messaging.md` and `social-preview.png`.

**Posts and link previews.** The social preview (the wordmark on dot-grid paper) and one line: the tagline or "Just one thought
at a time." No hashtag strings, no countdowns.

**Status messages and errors.** What happened, or what to do, in one sentence; never blame, never celebrate.

**Print.** Pages print on light paper with the dot grid; the logo prints in ink blue or black. Proof CMYK before a print run.
There are no business cards or letterhead: Jot has no organization behind it yet. Presentations use cream slides, the
handwriting for headings and one key message per slide.

**Checklist: never**
- [ ] use the wordmark under 40 px wide, or the symbol under 16 px (use the small cut at 32 px and under);
- [ ] use colors outside the palette, or the purple accent for the logo;
- [ ] type the logo in a font, or write "ιot" in running text;
- [ ] use streaks, scores, "you missed" or any pressure wording;
- [ ] claim health, mood or productivity effects;
- [ ] say "secure" or "private" without saying what is protected;
- [ ] put the owner's name or address on the published site (the privacy check refuses it);
- [ ] write in a corporate, hyped or passive voice.

## Part 6: Assets and ownership

**Brand guardian.** The project owner decides; changes to the logo, palette, voice or messaging are recorded in
[`DECISIONS.md`](../../DECISIONS.md).

**Assets.** This folder, `docs/brand/`: the masters and icons, generated by `source/build.sh`. Copies elsewhere (the site, the
desktop app, the VS Code extension) come from here through `tools/sync-brand.mjs`, which CI checks; never edit a copy.

**Questions.** Open an issue on the repository.

### Remaking the marks

The marks are drawn by `source/pen.py`, a simulated pen: a round nib stamped along each stroke's centre line, with pressure (a
width profile) and a slight tremor, seeded so it draws the same every time. The strokes are in `source/iota.json`,
`source/iota-small.json` and `source/wordmark.json`. `source/build.sh` draws them, traces them into smooth curves (potrace),
flattens each into one plain path (`source/flatten.py`), and makes the color versions and icons
(`source/variants.py`), and the written iota (`source/motion.py`). It needs Python 3, librsvg's `rsvg-convert`, ImageMagick and potrace.

    sh docs/brand/source/build.sh                 # the masters and icons in docs/brand/
    node tools/sync-brand.mjs                     # the site's headers and icons; then the guides and examples:
    node site/build-guides.mjs && node tools/build-examples.mjs
    cp docs/brand/app-icon.png desktop/ && (cd desktop && npx tauri icon app-icon.png -o src-tauri/icons --ios-color '#fffdf6')

Then `node tools/manifest.cjs`. The concepts were explored and tested with the
[logo-design skill](https://github.com/kaankiziltug/logo-design-skill) (its audit, test sheets and shelf test against Slack and
the Markdown mark). Trademark clearance has not been searched; other products use the name Jot.
