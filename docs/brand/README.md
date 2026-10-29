# The Jot logo

**The idea.** A Greek iota (ι), written quickly with a good pen: it lands to a point, swells, and lifts off into a flick; the
dot comes afterwards and lands a little ahead, as a hand dots an i at the end of a word. "Jot" comes from iota, the smallest
letter, and a jotting is a quick, brief note. The stroke and the dot are also a 1 and a 0: ten, iota's value in Greek numerals,
which is two in binary. Nobody needs to see that to read the mark; it is there for whoever looks.

**The wordmark** spells the name with that same iota: "ιot", the logo's own stroke and dot as its first letter, then "ot" in
the same hand. The symbol and the name are one mark, so there is no separate symbol-and-wordmark lockup. The name is still
Jot, in text, in speech and for screen readers: wherever the wordmark is shown, its accessible name is "Jot". The brief behind it:
[`docs/proposals/logo.md`](../proposals/logo.md).

## Versions

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
| `social-preview.svg`, `social-preview.png` | 1280 × 640: the wordmark on dot-grid paper, for link previews and the repository's social preview |

The plain masters are filled with `currentColor`, so inline in a page they take the text colour: ink blue on cream, the light
ink on charcoal. The site's headers use them that way.

## The system around it

Everything grows from the page and the pen, so the system is mostly what Jot already is:

- **Paper and ink.** Cream paper with a dot grid, ink blue writing; charcoal paper and the light ink in dark mode. The logo
  never sits on anything else (photos aside, below).
- **The ink dot.** The jot itself, the iota's dot, is the one graphic device: a single dot where a bullet, a marker or a pause
  is needed. Draw it as an ink dot (slightly oval, a little tilted, as in the logo), never as a perfect circle or a second logo.
- **Colour roles.** Ink blue is the brand: the logo, the writing, the links. The site's purple accent (`#65508f`, light
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
- **Not yet.** Motion (the iota being written, then dotted) and a printed stamp are natural next pieces; neither is made.

## Clear space and minimum size

Keep clear, on every side, at least the width of the iota's dot. The zone grows and shrinks with the logo.

| Version | Screen | Print |
| --- | --- | --- |
| Wordmark | 40 px wide | 12 mm wide |
| Symbol | 16 px (use `jot-symbol-small.svg` at 32 px and under) | 5 mm |

## Colour

| Name | HEX | RGB | CMYK (approximate) | Contrast |
| --- | --- | --- | --- | --- |
| Ink blue (the logo) | `#1f3a8a` | 31 58 138 | 78 58 0 46 | 10.2:1 on cream, 8.5:1 on the page background |
| Cream paper | `#fffdf6` | 255 253 246 | 0 1 4 0 | |
| Page background | `#ede9df` | 237 233 223 | 0 2 6 7 | |
| Light ink (dark mode) | `#cbd5eb` | 203 213 235 | 14 9 0 8 | 10.4:1 on charcoal |
| Charcoal paper | `#242622` | 36 38 34 | 5 0 11 85 | |

These are the site's own paper and ink colours (`parser/handwriting.mjs`). The CMYK values are converted, not proofed: check a
printed proof before a print run. No Pantone match has been chosen.

**Approved pairs:** ink blue on cream or the page background; light ink on charcoal; black on white or cream; white on ink
blue or charcoal. On a photo, use the black or white version over a calm area, or the app-icon tile.

## Don'ts

Don't redraw the iota or type "jot" in a font in its place; don't stretch, rotate or outline it; don't add shadows, gradients
or effects; don't put the iota beside the wordmark (it already begins with it); don't put a hash sign (⌗) beside it, the old
mark it replaces; don't write "ιot" in running text: there the name is Jot.

## Remaking the marks

The marks are drawn by `source/pen.py`, a simulated pen: a round nib stamped along each stroke's centre line, with pressure (a
width profile) and a slight tremor, seeded so it draws the same every time. The strokes are in `source/iota.json`,
`source/iota-small.json` and `source/wordmark.json`. `source/build.sh` draws them, traces them into smooth curves (potrace),
flattens each into one plain path (`source/flatten.py`), and makes the colour versions and icons
(`source/variants.py`). It needs Python 3, librsvg's `rsvg-convert`, ImageMagick and potrace.

    sh docs/brand/source/build.sh                 # the masters and icons in docs/brand/
    node tools/sync-brand.mjs                     # the site's headers and icons; then the guides and examples:
    node site/build-guides.mjs && node tools/build-examples.mjs
    cp docs/brand/app-icon.png desktop/ && (cd desktop && npx tauri icon app-icon.png -o src-tauri/icons --ios-color '#fffdf6')

Then `node tools/manifest.cjs`. The concepts were explored and tested with the
[logo-design skill](https://github.com/kaankiziltug/logo-design-skill) (its audit, test sheets and shelf test against Slack and
the Markdown mark). Trademark clearance has not been searched; other products use the name Jot.
