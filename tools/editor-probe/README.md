# Editor source-preservation probe

Research only; nothing here is imported by Writer. Uses synthetic writing, never a real journal. The browser blocks external
requests. Installation below contacts npm for development tools; dependencies and generated bundles stay outside the repository.
Provide Playwright with Chromium as for the existing browser suites (see `site/AGENTS.md`).

Create a fresh scratch directory and install the versions used by the exploration:

```sh
mkdir -p /tmp/jot-editor-probe
npm install --prefix /tmp/jot-editor-probe --ignore-scripts --no-audit --no-fund esbuild@0.28.2 @codemirror/state@6.7.6 @codemirror/view@6.43.15 @codemirror/commands@6.11.1 draftly@3.0.1 prosemirror-model@1.25.12 prosemirror-state@1.4.4 prosemirror-view@1.42.9 prosemirror-markdown@1.13.9 @milkdown/kit@7.23.0
node tools/editor-probe/run.cjs /tmp/jot-editor-probe
```

Direct versions are recorded; transitive dependencies are not locked by this experiment. The runner writes `probe.bundle.js` and
`results.json` in the supplied scratch directory, and prints results. Use a dedicated directory without files you need to retain.

The probe mounts CodeMirror, Draftly's essential plugins and Milkdown's CommonMark preset in Chromium, and uses ProseMirror's
default Markdown parser/serializer. Five fixtures cover ordinary prose/Jot tasks, unknown record fields and multiline values,
comments/fences, BOM/CRLF/frontmatter and mixed line endings. CodeMirror variants receive an explicit line separator and an
insert/undo/redo transaction. These are default-configuration comparisons, not custom ProseMirror/Milkdown adapters or physical
keyboard, mobile, IME, accessibility, visual-fidelity, large-file or full-application integration tests. Tiptap is assessed from its
architecture, not exercised by this probe. Exact text equality alone does not establish correct line/offset semantics: inspect
`logicalLines`, `physicalLines`, `internalLength` and `sourceLength` too.

See `docs/proposals/editor-and-local-inference.md` for interpretation and the separate llama.cpp feasibility assessment.
