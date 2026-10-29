# Proposal: WriteFreely writer and publishing integration

Status: **Planned / research only**, reviewed 28 October 2026. No WriteFreely code has been imported,
no accounts connected, and no publishing or ActivityPub implementation is delivered by this proposal.

## Research baseline

The upstream default branch is `develop`, inspected at commit
[`5d1bc057e86aafb6888bf301376b46ea5e0620e7`][baseline] (28 September 2026).
The latest stable release observed during research is [v0.17.2][release] (10 August 2026).
Findings below describe the pinned development source; deployed releases can differ. A future adapter must
identify and test its supported server versions instead of assuming `develop` behavior everywhere.

## What its writer would bring

WriteFreely has two editor paths. Its main `pad` is a plain `textarea` with automatic direction detection,
vanilla JavaScript and Go templates. It provides local draft saving, word counts, font and theme choices,
draft-versus-blog destination selection, an edited-elsewhere warning, preview and explicit publishing.
Ctrl/Command+Enter publishes. The template is coupled to server-provided accounts, collections and posts;
it is not a standalone editor package. See the [pad template][pad] and [template selection][pad-handler].

The optional `classic` path uses ProseMirror, Markdown parsing and serialization, a formatting menu and
WriteFreely-specific blocks. Its [schema][schema] extends CommonMark with read-more, email-subscription,
comment and raw-HTML nodes. The [editor][prose] serializes the document on each transaction. The
[serializer][serializer] normalizes elements such as emphasis, list markers and line breaks. Its
[build configuration][prose-package] adds a bundled dependency tree and WriteFreely ProseMirror forks.

| Area | Compatibility with Jot |
| --- | --- |
| Main textarea writer | Similar foundation to Jot; small interaction ideas can be implemented independently. |
| Optional rich editor | No modeled Jot records, directives, measurements, task states or package assets. |
| Source fidelity | CommonMark parse/serialize is not a guarantee of unchanged `.jot` source or meaning. |
| Preview | The pad sends writing to `/api/markdown`; Jot must keep its existing local renderer. |
| Mobile and desktop | Useful responsive ideas, but upstream styles are not evidence of physical-device or accessibility verification for Jot. |

The [responsive pad styles][pad-css] prioritize the writing, reduce secondary tools at smaller widths,
and adapt controls for coarse pointers. Jot can adopt these principles while retaining its existing
commands, outline, reference completion, templates, undo, local preview and Chromium interaction tests.
No wholesale HTML/CSS import is proposed.

## Options and recommendation

| Option | Scope and tradeoff | Recommendation |
| --- | --- | --- |
| Independent Jot writing improvements | Apply useful UX ideas to Jot's existing textarea and local data model. | Continue first; preserve native source editing and undo. |
| WriteFreely publishing adapter | Send a reviewed entry or selection to a chosen WriteFreely instance through its API. | First integration to prototype; reuse its publishing and federation backend. |
| Optional rich editing view | Build Jot-aware ProseMirror schema, source mapping and preservation for unsupported syntax. | Separate research spike; require round-trip evidence before adoption. |
| Fork or embed the Go platform | Operate a modified WriteFreely application with Jot editor and renderer integration. | Largest operational and licensing commitment; consider only if a combined hosted platform is wanted. |

The recommended boundary is **Jot authors and validates locally; WriteFreely publishes an explicitly
reviewed excerpt**. Opening a journal, typing, autosaving, previewing or running autocomplete must never
publish it or send its contents to a server.

## Publishing contract to investigate

The [routes][routes] expose account login, account/collection lookup, creation of collection posts,
post retrieval, updates and deletion. The submitted [post fields][post-fields] are title/body and
publication metadata, not a `.jot` document or `.jotz` package. This is an adapter boundary rather than
a native Jot-storage feature.

Before each new publication, show the exact title/body, destination account and collection, visibility,
federation state, outbound links, mentions and attachments. Publish only the selected entry or range.
Existing journal dates and manually captured timestamps remain authored data; no date or timezone
should silently become a publication timestamp.

- Keep `.jot` source authoritative. Convert supported prose to publication Markdown or a reviewed
  rendered representation, with explicit treatment of records, charts, directives, media shortcodes,
  relative links and other custom syntax. Offer literal source or omit unsupported parts only after review.
- Resolve only assets chosen for this publication. Local `assets/` paths and `.jotz` files do not become
  public URLs automatically; attachment hosting, media limits and alt text need their own design.
- Never upload People/Places books, hidden fields, precise locations, unrelated entries or all package
  assets as a side effect. A chosen reference label/link does not authorize publishing its whole record.
- Keep mappings of local document/entry identity to remote instance, collection and post ID separately
  from journal content and credentials. Dates and source offsets are insufficient stable identities:
  Jot permits repeated dates and later edits. Define identity and relinking before automatic updates.
- Updates, moving a publication and deletion require explicit actions and conflict review. Detect stale
  remote/local versions, duplicate submissions and uncertain network outcomes instead of silently overwriting.
- Deleting a local journal must not delete remote posts implicitly. A remote Delete request is not proof
  that recipients have erased their copies.

## Accounts, origins and deployment

The inspected [login implementation][login] has a password-to-access-token API path, and instances may
disable password authentication. [API authentication][api-auth] uses an `Authorization` access token.
WriteFreely's OAuth providers support logging into the instance; this is not evidence of an available
third-party publishing OAuth authorization flow. Do not invent client registration or automatic accounts.

Choose an existing instance and supported authentication method explicitly. Keep credentials and tokens
out of `.jot`, browser local storage, exports and logs. A controlled same-origin server adapter with
appropriate session protection is the preferred deployment candidate; session-memory browser tokens
are a separate option to evaluate, not an implemented guarantee.

[Public read handlers][cors] set an allowed origin, but that does not establish cross-origin authenticated
write or preflight support. Verify CORS, CSRF, authentication expiry, logout/revocation and instance policies
against the chosen deployment. A browser-only GitHub Pages site cannot acquire server-only capabilities
merely by importing this frontend.

## ActivityPub boundary

WriteFreely already supplies server-side federation: each collection/blog has an [actor identity][actors],
posts have stable ActivityPub IDs, and the backend sends Create, Update and Delete activities to followers.
Depending on configuration/content, [published objects][objects] can be Article or Note. It exposes an
outbox and accepts follow-related inbox activities. These capabilities do not imply a general federated
reader, incoming reply timeline or full bidirectional journal synchronization.

An eligible publication can federate automatically after the API saves it. In the inspected code,
**unlisted collections can federate**; private/protected collections are excluded from the outbound path.
Do not equate unlisted with private. The [delivery implementation][delivery] logs delivery failures and
does not prove every recipient received a change or deletion. Publication review must expose this behavior.

Using that backend requires an operated HTTPS service with a stable public origin, actor keys, database,
outbound delivery and inbound endpoints. A native Jot ActivityPub server would instead need all of those
features plus authentication/signatures, safe remote fetching, retry and moderation policies. That is a
separate backend project, not a shortcut or metadata field in the editor.

## Licensing and maintenance

The upstream platform is [AGPL-3.0 licensed][license]. Copying or modifying covered code requires a
licensing review, attribution and appropriate source offers, including its network-use provisions.
The `prose/package.json` license label alone does not settle rights to every imported source or dependency.
Jot currently has no root `LICENSE`; do not assume MIT licensing or automatic compatibility.
An independently written API adapter keeps component boundaries clear but does not by itself settle every
licensing question. No upstream source has been copied for this research proposal.

## Proposed phases and acceptance

1. **Compatibility specification:** pin supported server versions; document entry/selection conversion,
   unsupported syntax, assets, identity mappings, audience review and publication conflicts. Acceptance:
   fixtures preserve the original Jot source and expose all intentionally changed or omitted content.
2. **Adapter prototype:** implement explicit connect, destination lookup, preview and publish/update/delete
   against a disposable staging instance. Acceptance: mocked tests prove consent, credential isolation,
   retry/conflict behavior and no background publication; live staging tests verify actual auth and CORS.
3. **Federation staging:** test with a separate ActivityPub implementation and distinct test accounts.
   Acceptance: verify actor discovery, follows, Create/Update/Delete, unlisted behavior and failure recovery;
   record remote-copy limitations and distinguish verified interoperability from mocked delivery tests.
4. **Writer and deployment decision:** evaluate independent Jot UX improvements alongside an optional
   rich-view spike or Go fork. Acceptance for rich editing: source/semantic round-trip fixtures for all
   Jot constructs, unknown records, Unicode, CRLF/BOM, attachments, undo, IME and mobile keyboard behavior.

All phases remain **Planned**. This investigation read upstream source and documentation; it did not run
the Go service, publish content, connect a live account or verify federation interoperability.

[baseline]: https://github.com/writefreely/writefreely/commit/5d1bc057e86aafb6888bf301376b46ea5e0620e7
[release]: https://github.com/writefreely/writefreely/releases/tag/v0.17.2
[pad]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/templates/pad.tmpl#L22
[pad-handler]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/pad.go#L65
[schema]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/prose/schema.js
[prose]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/prose/prose.js#L43
[serializer]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/prose/markdownSerializer.js#L68
[prose-package]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/prose/package.json
[pad-css]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/less/pad.less#L399
[routes]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/routes.go#L87
[post-fields]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/posts.go#L92
[login]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/account.go#L405
[api-auth]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/handle.go#L251
[cors]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/handle.go#L647
[actors]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/collections.go#L330
[objects]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/posts.go#L1239
[delivery]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/activitypub.go#L904
[license]: https://github.com/writefreely/writefreely/blob/5d1bc057e86aafb6888bf301376b46ea5e0620e7/LICENSE#L540
