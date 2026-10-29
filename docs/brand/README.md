# The Jot logo

**The idea.** A Greek iota (ι), written quickly with a good pen: it lands to a point, swells, and lifts off into a flick; the
dot comes afterwards and lands a little ahead, as a hand dots an i at the end of a word. "Jot" comes from iota, the smallest
letter, and a jotting is a quick, brief note. The stroke and the dot are also a 1 and a 0: ten, iota's value in Greek numerals,
which is two in binary. Nobody needs to see that to read the mark; it is there for whoever looks. The brief behind it:
[`docs/proposals/logo.md`](../proposals/logo.md).

## Versions

| File | Use |
| --- | --- |
| `jot-lockup.svg` | The iota and the "jot" wordmark side by side: the primary logo |
| `jot-lockup-stacked.svg` | The iota above the wordmark, for square spaces |
| `jot-symbol.svg` | The iota alone: app icons, avatars, a stamp |
| `jot-symbol-small.svg` | A heavier cut of the iota for 32 px and smaller (favicons) |
| `jot-wordmark.svg` | "jot" alone, where the symbol already shows nearby |
| `*-ink.svg` | The same, in ink blue, for placing as images |
| `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` | The site's icons (copied into `site/dist/` by `tools/sync-brand.mjs`) |
| `app-icon.svg`, `app-icon.png` | The app icon: cream paper, ink-blue iota (`desktop/` makes every platform's sizes from it) |

The plain masters are filled with `currentColor`, so inline in a page they take the text colour: ink blue on cream, the light
ink on charcoal. The site's headers use them that way.

## Clear space and minimum size

Keep clear, on every side, at least the width of the iota's dot. The zone grows and shrinks with the logo.

| Version | Screen | Print |
| --- | --- | --- |
| Lockup | 72 px wide | 20 mm wide |
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
or effects; don't change the space between the iota and the wordmark; don't put a hash sign (⌗) beside it, the old mark it
replaces; don't spell the name "ιot" (it reads as "IoT" or "lot").

## Remaking the marks

The marks are drawn by `source/pen.py`, a simulated pen: a round nib stamped along each stroke's centre line, with pressure (a
width profile) and a slight tremor, seeded so it draws the same every time. The strokes are in `source/iota.json`,
`source/iota-small.json` and `source/jot.json`. `source/build.sh` draws them, traces them into smooth curves (potrace),
flattens each into one plain path (`source/flatten.py`), and makes the lockups, colour versions and icons
(`source/lockups.py`). It needs Python 3, librsvg's `rsvg-convert`, ImageMagick and potrace.

    sh docs/brand/source/build.sh                 # the masters and icons in docs/brand/
    node tools/sync-brand.mjs                     # the site's headers and icons; then the guides and examples:
    node site/build-guides.mjs && node tools/build-examples.mjs
    cp docs/brand/app-icon.png desktop/ && (cd desktop && npx tauri icon app-icon.png -o src-tauri/icons --ios-color '#fffdf6')

Then `node tools/manifest.cjs`. The concepts were explored and tested with the
[logo-design skill](https://github.com/kaankiziltug/logo-design-skill) (its audit, test sheets and shelf test against Slack and
the Markdown mark). Trademark clearance has not been searched; other products use the name Jot.
