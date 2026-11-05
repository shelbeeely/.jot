# Original demo media

`tools/demo-assets.mjs` creates the fictional October journal's media in memory. Its `demoAssets()` export returns stable UUIDs,
logical `media/` paths, names, media types and bytes. It makes an original rainy-window illustration, the frozen background and
editable pen strokes, three seconds of synthesized rain-like noise, a small garden GLB with a tree, bench and raised bed, an
original one-page PDF, the same miniature book as a fixed-layout EPUB, and two local text attachments. Nothing is downloaded.

`rain.webm` is a three-second animated crop of that illustration. It is synthetic demo media, not a recording of a real day.
Rebuild it with Node.js and FFmpeg:

```sh
node tools/demo-assets.mjs --video-still /tmp/jot-demo-window.png
ffmpeg -hide_banner -loglevel error -y -loop 1 -framerate 12 \
  -i /tmp/jot-demo-window.png -t 3 \
  -vf "zoompan=z='1+0.0006*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=600x400:fps=12" \
  -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 100k -an -map_metadata -1 \
  -fflags +bitexact -flags:v +bitexact examples/demo-assets/rain.webm
```

`garden-poster.png` is an actual screenshot of the generated garden GLB, rendered with Jot's bundled Three.js. Rebuild it with
`node examples/demo-assets/render-garden-poster.cjs` (development-only Playwright and Chromium required). The module also carries
the repository's existing small `draco.glb`, `meshopt.glb` and `ktx2.glb` cube fixtures as named compression studies; they are
separate from the original garden model. Reading the completed journal needs none of these development tools.

The annotation's `.jot-ink.json` names `media/ink-background.png`; both its composite PNG and its editable stroke JSON must be
referenced on separate lines to reopen it in Writer. The garden's tree is centered at `-1, 1.5, -0.3`, its bench at
`1.45, 0.8, 0.35`, and its raised bed at `0.05, 0.3, 1.35`. These are suitable coordinates for model hotspots.

This original sample media is dedicated to the public domain under CC0 1.0. Its content is fictional.
