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

Status: 1.0.0-draft.3, 26 October 2026. This package specifies a proposed format; it does not ship a parser or production renderer. No repository changes were made. All examples are fictional.

Additional deliverables: the separate JavaScript parser prototype (with Markdown and diagram recognition), proofread module and maintained ROADMAP.md. See the workspace roadmap for implemented versus planned features.

Draft 3: plain writing is `.jot`; the self-contained document with assets is `.jotz` (see Jot-Container-v1.md and example.jotz). The .txt examples are readable source.
