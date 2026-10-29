#!/bin/sh
# Regenerates the logo masters in docs/brand/ from the pen strokes here. Needs Python 3, rsvg-convert (librsvg),
# ImageMagick's convert and potrace. The pen is seeded, so the same specs always draw the same marks.
#   sh docs/brand/source/build.sh
set -e
here=$(cd "$(dirname "$0")" && pwd); out=$(dirname "$here"); tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
trace() { # spec.json -> traced svg: draw with the pen, rasterise at 1024 px, trace into smooth curves
  python3 "$here/pen.py" "$here/$1.json" "$tmp/$1-raw.svg"
  rsvg-convert -w 1024 -b white "$tmp/$1-raw.svg" -o "$tmp/$1.png"
  convert "$tmp/$1.png" -threshold 50% "$tmp/$1.pbm"
  potrace -s -r 72 -a 1.1 -O 0.4 -t 4 "$tmp/$1.pbm" -o "$tmp/$1.svg"
}
trace iota; trace iota-small; trace jot
python3 "$here/flatten.py" "$tmp/iota.svg" "$out/jot-symbol.svg" --box 256 256 --pad 36 --title Jot
python3 "$here/flatten.py" "$tmp/iota-small.svg" "$out/jot-symbol-small.svg" --box 256 256 --pad 22 --title Jot
python3 "$here/flatten.py" "$tmp/jot.svg" "$out/jot-wordmark.svg" --box 336 256 --pad 8 --title Jot
python3 "$here/flatten.py" "$tmp/iota-small.svg" "$tmp/tight.svg" --box 256 256 --pad 6 --title Jot
python3 "$here/lockups.py" "$out" "$tmp/tight.svg"
# Raster icons: favicon.ico (16, 32, 48), the Apple touch icon (cream, full bleed) and the 1024 px app icon source
for n in 16 32 48; do rsvg-convert -w $n -h $n "$out/favicon.svg" -o "$tmp/f$n.png"; done
convert "$tmp/f16.png" "$tmp/f32.png" "$tmp/f48.png" "$out/favicon.ico"
sed 's|<rect x="100" y="100" width="824" height="824" rx="185"|<rect width="1024" height="1024"|; s|translate(166 160) scale(2.7)|translate(102 92) scale(3.2)|' "$out/app-icon.svg" > "$tmp/touch.svg"
rsvg-convert -w 180 -h 180 "$tmp/touch.svg" -o "$out/apple-touch-icon.png"
rsvg-convert -w 1024 -h 1024 "$out/app-icon.svg" -o "$out/app-icon.png"
