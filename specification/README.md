# Jot v1 proposed specification

Current development stage: **0.1.0 prototype / pre-v1**. These documents describe the target v1 contract, not a finalized standard. See [release policy and v1 completion gates](ROADMAP.md#release-policy-finish-v1-before-moving-beyond-it).

The .jot file holds the writing: one moment, a day, a month or an ongoing journal. Start with `example-month.txt`. Metadata, templates and structured records are optional.

## Contents

- `Jot-Complete-Specification.pdf`: readable specification, 62 method/style profiles, grammar, migration and acceptance criteria.
- `Jot-Complete-Specification.md`: editable source of the PDF.
- `example-month.txt`: writing-first, multiple dates and styles in one file.
- `examples-methods.txt`: optional structured examples for each profile; example asset paths are illustrative.
- `paper-sizes.json`: 27 physical paper presets, a Ledger alias and custom-size rules.
- `profiles.json`: descriptive profile contracts; not an executable clinical validator.
- `jot-ast.schema.json`: JSON Schema for the source-preserving AST envelope.
- `example-ast.json`: minimal structurally valid interchange example.
- `conformance.json`: input/expected-behavior fixtures; file cases run in `tools/test-files.mjs`.
- `source-register.md`: method coverage and review scope.

Status: 1.0.0-draft.3, 26 October 2026. This folder specifies the format; the implementation lives beside it. All examples are fictional.

The JavaScript parser (`../parser/`, version 0.1.0, a working prototype: Markdown and diagram recognition, the page renderer, `.jotz` containers, per-entry archive protection) implements most of this draft, and the site, command line, converters, VS Code extension and desktop app all use it. It does not yet claim full conformance with every rule and profile. [ROADMAP.md](ROADMAP.md) here tracks format implementation and conformance; the separate [Writer roadmap](../WRITER-ROADMAP.md) tracks web, desktop/mobile and integration delivery.

Jotz v1 is the default journal archive, with ordered source entries, media, optional per-entry protection and a public SQLite/FTS5 index. See Jot-Container-v1.md and Jot-Protection-v1.md. Plain `.jot` and the .txt examples are readable source; there is no separate encrypted file type or legacy container migration.

The [document format research](../docs/proposals/document-format-research.md) compares PDF, DOCX, EPUB, OpenDocument and SQLite, with implications for the primary `.jotz` document.
