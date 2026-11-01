# Jot v1 proposed specification

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
- `conformance.json`: input/expected-behavior fixtures for a future parser.
- `source-register.md`: method coverage and review scope.

Status: 1.0.0-draft.3, 26 October 2026. This folder specifies the format; the implementation lives beside it. All examples are fictional.

The JavaScript parser (`../parser/`, version 0.1.0, a working prototype: Markdown and diagram recognition, the page renderer, `.jotz` containers, `.jotlock` locks) implements most of this draft, and the site, command line, converters, VS Code extension and desktop app all use it. It does not yet claim full conformance with every rule and profile. `ROADMAP.md` here tracks what is implemented and what is planned.

Jotz v2 is the default journal archive, with ordered source entries, media, optional per-entry protection and a public SQLite/FTS5 index. See Jot-Container-v2.md and Jot-Protection-v2.md. Plain `.jot` and the .txt examples are readable source; there is no separate encrypted file type or legacy container migration.
