# Jot rendering reference

Start with [syntax](syntax.md#start-with-a-small-syntax) for writing or the [X4 example](epaper.md#run-the-local-reference-example) for device rendering.
The text syntax is unchanged. These documents describe host rendering and proposed device adapters;
they do not claim a shipped e-paper reader.

| Reference | Use it for |
| --- | --- |
| [Syntax](syntax.md) | Everyday writing, full grammar inventory and known host limits |
| [Media and links](media-and-links.md) | Images, recordings, video, provider references, links and includes |
| [Integrations](integrations.md) | Implemented connections, local imports and the named backlog |
| [Profiles and records](profile-coverage.md) | Generated field reference for all 62 profiles and 27 record types |
| [Navigation](navigation.md) | Touch/buttons, contents, media controls and reading position |
| [E-paper implementation](epaper.md) | Package → page → pixels → FreeInk; runnable browser example |

## Archive and host version

The merged prototype uses [Jotz v1](../../specification/Jot-Container-v1.md) as its default archive, including text-only journals.
It stores ordered `entries/<uuid>.jot`, catalogued media and optional protected members, with a public-only SQLite search index.
[Protection](../../specification/Jot-Protection-v1.md) is inside `.jotz`; there is no separate encrypted extension or migration reader.
A locked public projection is incomplete: explicitly unlock locally or report it as partial. Never render it as the complete journal.

The syntax and provider inventories were reviewed before the latest Writer additions. For newer offline attachment viewers,
voice writing and connected-source adapters, consult [site documentation](../../site/README.md), the
[Writer roadmap](../../WRITER-ROADMAP.md) and canonical modules. Shared page-preview support and Writer viewer support are separate.
Native X4 execution, protected-archive interoperability and full-device navigation remain unverified.

## Reader rules

- Preserve source, unknown fields and original assets. Offer complete fields/source beside compact summaries.
- Reflow text, label statuses, retain captions/credits and provide explicit unsupported-content fallbacks.
- Paginate without clipping. Expand chosen chart details or supply separate data pages before raster capture.
- Keep semantic targets alongside pixels: links, search, field/data views and reading positions need an index.
- Provide visible touch controls and a complete button route. Reading does not edit task state.
- Opening a file does not fetch artwork, play media, connect an account or execute an integration.
- Select static animation frames deliberately. Playback needs a supported player and output hardware.
- Derived caches and sleep images can expose writing; file labels are not access control.

## Acceptance checks

Verify ordinary and malformed syntax, complete record details, missing assets, links/includes, Unicode, long pages,
large text and all touch/button routes. Check offline behavior and explicit network actions separately. Report browser,
provider-mock, live-service and hardware results separately.

The [browser example](examples/x4-preview.html) exports one bounded page. It has no complete paginator, field inspector,
media player or device navigation. Native C++ is source-checked guidance; hardware remains untested.

```sh
node tools/build-rendering-profiles.mjs --check
node tools/check-methods.mjs
node tools/manifest.cjs
node tools/check-generated.mjs
```

The generated ledger checks registry freshness, not complete Markdown compatibility or device support. Review the
integration catalogue when providers change; there is no single project-wide provider registry.
