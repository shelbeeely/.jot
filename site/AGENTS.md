# Working on the Jot website

Rules for `site/`, on top of the repository's root `AGENTS.md`. `site/dist/` is published to GitHub Pages as is, so keep notes like this one outside it.

## Running and testing

Serve the site with `python3 -m http.server 8000 --directory site/dist`; open `/write/` or `/editor/`.

Browser suites are `site/test-*-ui.cjs`. Run `npm ci` at the repository root for axe-core and provide Playwright with Chromium; each suite starts its own local server. Select the suites relevant to the change:

- Music changes: `node site/test-music-ui.cjs`.
- Include changes (`parser/include.mjs`, the workspace's `.jotz` includes): `node site/test-include-ui.cjs`.
- Styling changes: the relevant paper, color, highlight-blend and layout suites. Check mobile light/dark mode and accessibility.

## Conventions

- Keep the homepage informational, with renderer-backed examples. Do not restore an editor or input form there.
- Preserve the reference Mildliner palette in `site/dist/jot/palettes.mjs`. Highlights are translucent strokes above ink, using multiply blending.
- Preserve relative URLs for GitHub Pages subpaths, keyboard access, mobile layouts and accessible labels/status messages.
- `site/dist/jot/` holds copies of `parser/` and `converter/` modules: change the canonical module, then copy it. `site/dist/guide/` is generated from `docs/guide/` by `site/build-guides.mjs`.

## Listening capture (`site/dist/jot/music.mjs`)

- Never upload journal text as part of music capture. No background playback polling, microphone capture or media import belongs in the listening tool.
- Spotify tokens stay in page memory; only public app identifiers and opted-in usernames may persist. Fetching music fills review fields; adding a note requires the user's Add action.
- Label recently played tracks separately from reported current playback. Do not invent timestamps or turn stale history into “playing now.”
