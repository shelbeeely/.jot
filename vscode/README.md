# Jot for VS Code

Write [Jot](../README.md) journals in VS Code: `.jot` files get syntax colours, and a live **page preview** shows them the way the Jot
workspace does, with your tracked numbers drawn as charts.

- **Open Preview to the Side**: the preview button in the editor's title bar, or `Ctrl+K V` (`Cmd+K V` on a Mac). **Open Preview**
  (`Ctrl+Shift+V`) opens it in place. It follows your typing.
- **Charts**: a `:::record chart` draws the numbers your journal holds (`measurement` records, and any record field that is a plain
  number) as one small chart per metric, a column per day. **Jot: Insert a Week Chart** writes one for this week.
- **Handwritten**: **Jot: Toggle Handwritten Preview** (or the `jot.preview.look` setting) shows the journal written by hand on a dot
  grid. `jot.preview.hand` (`pen`, `print`, `marker`), `jot.preview.ink` and `jot.preview.dotSpacing` (4 to 7 mm) choose the hand, the
  ink and the grid. The fonts ship inside the extension (SIL OFL); nothing is downloaded.
- **Colours**: dates, tasks (`[ ]`, `[x]`, `[>]`), events and marks, records and their numbers, highlights (`==…==`), underlines
  (`++…++`), footnotes, callouts and centred lines, hidden comments, metadata.

```jot
### 2026-10-26 | Monday

:::record measurement #sleep-2026-10-26
metric: sleep
unit: h
value: 7.5
:::

:::record chart #week-2026-10-26
metrics: sleep, steps
start: 2026-10-26
end: 2026-11-01
style: line
:::
```

The preview runs the same parser and page renderer as the site (`media/jot/`, copied from `../parser/` by `sync.mjs`). It loads only
the extension's own files: no network, no telemetry, and raw HTML in a journal is never rendered. Packaged `.jotz` files are ZIPs and
are not opened here; their images show as named placeholders in a plain `.jot`.

## Install from this folder

    cd vscode
    node sync.mjs                         # after any change to ../parser
    npx @vscode/vsce package              # -> jot-journal-0.1.0.vsix
    code --install-extension jot-journal-0.1.0.vsix

Or open this folder in VS Code and press F5 to try it in an Extension Development Host.

## Tests

    node sync.mjs --check                 # the copies in media/jot match ../parser
    node --test test-extension.mjs        # manifest, grammar, commands, the webview's content security policy
    node test-preview.cjs                 # the webview in Chromium: text in, page and charts out

## Before publishing

The `publisher` id in `package.json` is a placeholder, and no licence is asserted yet (the same as the Jot parser it carries); set both
before publishing to the Marketplace or Open VSX.
