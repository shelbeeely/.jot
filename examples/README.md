# Examples

- `manual.jot`: a personal manual, filled in, for the Daily check-in starter (see the guide, `docs/guide/manual.md`).
- `plain-text.jot`: a short journal in plain text, with tasks, events and a record.
- `packaged.jotz`: the same kind of journal packaged with an attachment (a ZIP inside).

Whole diaries as Jot are on the site's **Examples** page, [`site/dist/examples/`](../site/dist/examples/): *The Diary of Samuel Pepys*,
*The Diary of a Nobody* and Wilfrid Scawen Blunt's *My Diaries*, public-domain texts from Project Gutenberg converted with
[`converter/`](../converter/). `tools/build-examples.mjs` rebuilds them (and copies the two files above to the site); `--check`
verifies that every file is valid Jot and that the page matches them.
