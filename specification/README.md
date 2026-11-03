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
- `conformance.json`: input/expected-behavior fixtures; file cases run in `tools/test-files.mjs`.
- `source-register.md`: method coverage and review scope.

Status: 1.0.0-draft.3, 26 October 2026. This folder specifies the format; the implementation lives beside it. All examples are fictional.

The [JavaScript parser](../parser/README.md) is a working prototype shared by the site, CLI, converters, VS Code extension and desktop app.
It does not claim full conformance with every rule and profile. [ROADMAP.md](ROADMAP.md) tracks implementation status;
[DECISIONS.md](../DECISIONS.md) records later decisions.

Plain writing uses `.jot`; [`.jotz`](Jot-Container-v1.md) packages it with assets, and [`.jotlock`](Jot-Lock-v1.md) encrypts either format.
The `.txt` examples contain readable Jot source.
