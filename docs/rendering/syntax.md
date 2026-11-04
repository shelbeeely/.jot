# Render the complete Jot syntax

This is the syntax and data rendering inventory for a Jot reader, checked **3 November 2026** against the local
specification and canonical parser/preview modules. It distinguishes what the browser host does today from what an
e-paper adapter would need to do. It adds no syntax and does not claim a shipped native reader.

Read this with [media and links](media-and-links.md), [integrations](integrations.md),
[method-profile coverage](profile-coverage.md), [touch and button navigation](navigation.md), and the
[FreeInk rendering pipeline](epaper.md). Method profiles reuse these primitives; their individual fields and suggested
presentations belong in the profile reference rather than new delimiter grammars.

## Start with a small syntax

Use paragraphs and ordinary Markdown first. Add dates, tasks and attachments as needed:

```jot
### 2026-11-03

A quiet morning. Something **worth remembering**.

[ ] Return the library book
[x] Water the plants

[Reference](https://example.org/)
![Sketch](assets/sketch.png)
```

Use one generic record form when named fields or stable references help:

```jot
:::record reflection #morning
body: A quiet morning.
:::
```

The image needs a real package asset. Dates, metadata, records and `method:` profiles are optional. Provider references
are conveniences; ordinary links remain valid. A plain source export is `.jot`; `.jotz` is the default archive, including text-only journals.

The full inventory below preserves compatibility. No delimiter, alias or record field is removed by this cleanup.

## Read the status columns correctly

**H** means implemented by the named host module; **P** means preserved; **G** marks a gap or limit.
The tables describe current behavior. Device adaptations follow the shared [reader rules](README.md#reader-rules),
[media handling](media-and-links.md) and [navigation](navigation.md). Native e-paper support remains proposed.

The parser uses Marked 17.0.5/GFM plus Jot extensions. The [parser README](../../parser/README.md) describes its current
contract; the larger specification includes requirements the prototype does not yet implement.

## Document boundaries, metadata and source preservation

Sources: [source parser](../../parser/jot.mjs), especially lines 138–177 and 244–248;
[AST schema](../../specification/jot-ast.schema.json); [container contract](../../specification/Jot-Container-v1.md).

| Construct/source | Current host behavior | Support |
| --- | --- | --- |
| `.jot` UTF-8 source | `parse(text)` consumes writing, not package bytes. Source, Unicode and original newline sequences remain in `ast.source` and node `raw`. | H |
| `.jotz` | The container reader verifies ordered entry members and catalogued assets, returning flattened source; protected entries require local unlocking. The source parser does not unzip. | H |
| BOM, LF/CRLF, missing final newline | Lossless source is retained. Markdown token text may normalize line endings while node spans refer to original UTF-8 bytes. | H |
| Undated prose/preamble | Valid content. The derived `entries` list contains dated entries; a separate preamble entry object is not synthesized. | H/G |
| Opening `---`, ordered `Key: value`, closing `---` | First-line metadata is parsed as trimmed string pairs, not YAML. Metadata is not printed by `renderPreview()`. | H/P |
| Repeated or unknown metadata keys | Pairs survive in order. General singleton-duplicate and unsupported-major-version validation is not supplied by `parse()`; timezone has its own checks. | G |
| `Title`, `Author`, `Language`, `Theme`, `Document-ID`, `Privacy`, `Default Grid` | Stored strings do not by themselves change preview layout, language, author attribution, access or encryption. | P |
| Metadata `Timezone` | `applyTimezones()` derives validated document/entry context. No device-zone substitution is made. | H |
| `stringify(ast)` | Returns the exact original `source`; it does not serialize edits to derived nodes. | H |
| AST schema success | Validates an envelope/structural shapes. It does not establish complete profiles, clinical correctness, layout fit or all semantic requirements. | G |

## Block recognition and the visible page

Jot line markers are recognized outside fenced/indented code. A marker-like line in code remains literal. Source
preservation is stronger than visual completeness: a value or malformed line can survive in the AST while the current
preview omits it. A portable reader needs a readable source/details fallback for such cases.

Sources: [parser block loop](../../parser/jot.mjs), lines 130–214;
[preview block renderer](../../parser/preview.mjs), lines 210–254 and 331–407.

| Construct/source | Current host behavior | Support |
| --- | --- | --- |
| Ordinary paragraphs | Markdown paragraphs and inline children; ordinary source newlines can visually reflow. | H |
| Markdown `text` blocks | Used in nested/list token structures and possible lexer output; preview renders their inline children as a paragraph. | H |
| Blank lines | Preserved as blank nodes; the preview omits those nodes and uses block spacing. | H |
| `#` through `######` headings | Markdown heading nodes render at the corresponding level. Marked also accepts its own heading forms, including setext. | H |
| Dated heading such as `### 2026-11-03` or `## 2026-11-03` | A valid exact date, optionally ` \\| label`, opens a derived entry regardless of level. Repeated dates remain separate. The preview writes the date in words and keeps a label that adds more than the weekday. | H |
| Other period/season/collection headings | Ordinary headings. A word such as October does not itself create a calendar period or dated entry. | H |
| Setext `Title` followed immediately by `===` | Markdown heading, not a Jot page break. A `---` underline follows Markdown handling outside opening metadata. | H |
| Standalone `===` after a blank line/start | Jot `pagebreak`; preview emits a rule carrying a page-break class. Print CSS can break after it. Screenshot capture does not itself create multiple images. | H/G |
| Markdown rule, such as `---` or `***` | `hr` rule after Markdown recognition, subject to metadata/setext precedence. | H |
| `- note`, `* note`, `+ note`, ordered lists | Markdown ordered/unordered lists, including nested lists; no separate Jot note node or hidden task parent is created. | H |
| `- [ ] task`, `- [x] task` | GFM task-list items render as disabled checkboxes. These are not bare Jot `task` nodes and are not extracted as tasks by the current query/automation path. | H/G |
| Nested `list_item`, `checkbox` and `space` tokens | List items are handled by the list renderer; checked state becomes its disabled checkbox. Standalone space/checkbox tokens are not separately drawn. | H |
| Template-only empty markers such as `[ ] `, `- ` or `1. ` | They are not complete rapid tasks. When such rows remain a paragraph matching the preview's blank-row pattern, it draws a marker and writing rule. Other Markdown recognition may instead produce a normal list. | H/G |
| Bare rapid tasks | Dedicated Jot task nodes and state signs; detailed states are listed below. | H |
| `o event` | Event sign `○`, text alternative “Event”, formatted inline text. No calendar request occurs. | H |
| `? question` | Question sign `?` and text alternative. | H |
| `! idea` | Idea sign `!` and text alternative. | H |
| `= synopsis` | Summary sign `≡` and inline text. Multiple lines remain separate nodes in order. | H |
| `::voice ME` | Voice sign `❝` and the cue text. Subsequent paragraphs are ordinary flat nodes; the host does not build the continuing voice scope described by the broader specification. | H/G |
| `.0830 - KITCHEN`, or another `.nonspace` label | Scene node. A four-digit prefix plus a dash is displayed as `08:30 · KITCHEN`; this is visual punctuation, not timestamp validation. Other labels display as written after the leading dot. | H |
| `[[margin note]]` as a complete line | Annotation node rendered as a margin-note aside with inline formatting. Inline occurrences inside other prose are not separately recognized annotations. | H/G |
| `> quoted text` | Markdown blockquote. | H |
| `> [!NOTE]`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION` as first quote line | Case-insensitive recognized callout kind; preview draws a labelled aside. Other labels remain quote text. | H |
| `-> centered text <-` alone on a line | Centered paragraph with inline formatting. | H |
| Fenced code with backticks or tildes | Markdown code; fences take priority over Jot line extensions. Unclosed fences retain source with a diagnostic. | H |
| Four-space/tab-indented code | Markdown code and no Jot command interpretation. | H |
| GFM table | Header/body cells with inline formatting. The shared preview does not apply the token's per-column alignment metadata. | H/G |
| Reference definition `[name]: https://example.org` | Marked produces a `def` node and resolves supported reference links. The current preview has no dedicated `def` case, so its generic Markdown fallback also displays the definition's raw text. | H/G |
| Footnote definition `[^name]: text` | Dedicated `footnote` node is collected rather than displayed in place. Its inline note content appears in the final Notes list. | H |
| Raw HTML block/inline HTML | Source and tokens survive. Preview shows an omission notice, never active HTML. | H |
| Standalone `/*` … `*/` | Hidden comment block, omitted from the visible page. Unclosed comments warn and consume through EOF. Some allowlisted layout comments have presentation meaning, described later. | H |
| `@name: value` | Directive node; arbitrary lowercase names survive. The shared preview omits directive lines. Only named consumers interpret particular directives. | P/G |
| `:::record type #optional-id` … `:::` | Ordered record fields; specific preview special cases are inventoried below. | H/P |
| Unconsumed `raw` node and unknown source/token/node | Parser retains original source; preview generally uses textual fallback for unknown Markdown tokens and nodes, including `raw`. | H/P |

Two-space continuation lines belong to a preceding rapid task/event/question/idea/synopsis/voice node; exactly two
spaces are stripped. This is a capture convention, not a parent-child task relation. The current loop also consumes
two-space-only lines. A backslash before a column-zero punctuation marker prevents that Jot block match and is then
handled as Markdown text/escape. Do not derive hidden relationships from indentation or capitals.

## Every rapid-task state

The bare marker requires a following space and nonempty text. `[x]` alone and uppercase bare `[X] text` are prose in
this parser. GFM list checkboxes have their own Markdown rules and only a checked/unchecked presentation here.

Sources: [task recognition/status mapping](../../parser/jot.mjs), lines 133 and 198–202;
[preview signs](../../parser/preview.mjs), lines 82 and 367–372;
[handwritten boxes](../../parser/handwriting.mjs), lines 315–326.

| Source/state | Current host behavior | Support |
| --- | --- | --- |
| `[ ] text` → `open` | Empty box, “to do” alternative. Handwritten mode uses a generated box. | H |
| `[x] text` → `completed` | Checked box, “done” alternative; handwritten mode can animate a tick. | H |
| `[>] text` → `migrated` | Right arrow, “moved”. It does not mean completed. | H |
| `[<] text` → `scheduled` | Left arrow, “scheduled”. | H |
| `[-] text` → `cancelled` | Cross and struck text. | H |
| `[!] text` → `open`, priority `high` | Open box plus `!`; not a sixth lifecycle state. | H |
| `:::record task` with `status` | Generic record presentation. Broader record states are `open`, `in-progress`, `waiting`, `scheduled`, `completed`, `cancelled`, `migrated`; priority can be `low`, `normal`, `high`. The core parser does not validate all lifecycle rules. | P/G |

Scheduled record tasks require `scheduled-for` for completeness; migrated tasks require `migrated-to`. Forward-copy
migration and displaying the same task in a later view are different operations. Current rapid-task rollover is an
explicit automation feature, not something a renderer may perform while opening a journal. See
[integrations](integrations.md) for action and writeback scope.

## Inline writing and formatting

Sources: [inline extensions](../../parser/jot.mjs), lines 6–120;
[inline DOM renderer](../../parser/preview.mjs), lines 94–168 and 200–209.

| Source/construct | Current host behavior | Support |
| --- | --- | --- |
| `*italic*`, `_italic_`, `**bold**`, combined emphasis | Markdown emphasis/strong nodes. Underscore is not Jot underline. | H |
| `~~struck~~` | GFM deletion; current-color strike. | H |
| `==highlight==` | Highlight token and generated marker-style paint in the preview; it can nest with inline formatting. | H |
| `++underline++` | Underline token, rendered as `ins`. This is presentation, not a tracked source insertion. | H |
| `^superscript^` | Superscript when the interior contains no whitespace, caret or brackets. | H |
| `~text~`, `2 ^ 3`, `C++`, unmatched formatting marks | No Jot subscript, exponent evaluation or general formatting command. Unmatched source remains readable according to Markdown tokenization. | H |
| `[text]{ink=#rrggbb}` and `highlight`, `strike`, `underline` attributes | Balanced/escaped bracket spans with inline children; values are six-digit hex. Separate strike/underline colors are supported. No arbitrary CSS is accepted. | H |
| `highlight-style=marker`, `brush`, `pencil` in a color span | Allowlisted stroke style; deterministic local paint. Attributes are space-separated and duplicates/invalid keys prevent a valid span. | H |
| Nested color/formatting spans | Inline children remain in source order. A color span cannot cross a source newline. | H |
| Backslash punctuation escape | Markdown escape text. Code and escapes suppress the corresponding inline interpretation. | H |
| Inline backtick code | Literal code span; no variables, provider references or emphasis evaluated inside. | H |
| Hard break, two trailing spaces or Markdown backslash break | Markdown `br`; ordinary single paragraph newlines otherwise reflow. | H |
| Character/entity text | Text nodes; the preview decodes a small fixed set (`amp`, `lt`, `gt`, `quot`, numeric apostrophe), not arbitrary active HTML. | H/G |
| `#tag`, `@context` | Unicode letter/digit/underscore names with subsequent letters/digits/underscore/hyphen are visually marked at supported boundaries. Email interiors are not contexts. They do not automatically become clickable filters. | H |
| `[Energy: High]` and similar state text | Ordinary display text, not an implicit numeric measurement. | H |
| `[label](#id)`, date targets, cross-file links | Parser derives supported targets/references; host links only supported resolved/displayed targets. See the media/link guide for exact scope. | H/G |
| Standard Markdown inline/reference links, autolinks and GFM bare URLs | Marked supplies link tokens. The host URL/asset/reference allowlists decide whether they become anchors. GFM can linkify bare web addresses even though older specification prose calls them text. | H/G |
| `![alt](asset)` | Attached supported raster, include notation, or readable image/unsupported notice depending on path and context. | H/G |
| `spotify:…`, `imdb:…`, `youtube:…`, `musicbrainz:…` | Recognized valid forms become fixed-provider links without metadata lookup or playback. Malformed forms stay text. | H |
| `{{document.filename}}` | Exact case-sensitive inline variable. Host-supplied `filename` or `from` becomes a plain-text basename; missing context leaves the token literal. No lookup or date inference. | H |
| Unknown `{{variables}}` | Literal text. No general expression engine. Metadata, field values and URL targets are not rewritten by the inline variable feature. | H |
| `[^label]`, `[^label]: note`, indented note continuation | Footnotes are collected at the end, numbered by first reference; unreferenced definitions follow. Definition content is rendered inline. | H |
| Missing/duplicate footnote definitions | A missing reference remains a visible number but the current host still builds its anchor; duplicate definitions use the map's last value without a dedicated diagnostic. | G |

`[[…]]` is a whole-line marginalia construct in this parser, not a wiki link. The current preview formats its interior
inline, unlike specification prose that describes literal nested annotation/link-label markup. A port must document
which behavior it preserves instead of claiming that all those statements are already identical.

Highlight and underline delimiters need non-whitespace at their inside edges, and the closing doubled marker cannot
be followed by the same marker character. Their extension can cross a single source newline, but not a blank line.
Superscript has the narrower no-whitespace grammar shown above. These are separate from color spans, which cannot
cross any source newline.

## Records: preserve the ordered field model

Sources: [record parser](../../parser/jot.mjs), lines 130–195;
[record presentations](../../parser/preview.mjs), lines 360–401;
specification sections 4.3, 5, 6 and 7.

| Construct/source | Current host behavior | Support |
| --- | --- | --- |
| `:::record lower-name #id` and closing `:::` | Generic record node. Lowercase type/field names use letters, digits and hyphens; optional IDs have the declared ASCII/length restrictions. | H |
| `field: value` | Ordered string pairs; split on first colon, trim surrounding whitespace. `0`, `false`, empty and missing are distinct. | H |
| Repeated fields | Preserved in order. The generic preview shows all fields, while several specialized readers use their first matching field; no universal last-wins singleton validator is applied. | H/G |
| `field: \\|` plus two-space-indented lines | Multiline string, including literal markers. Generic `<dd>` presentation is plain text and does not promise rich body Markdown or all preserved visual whitespace. | H/G |
| Common `method`, `privacy`, `author`, `created`, `modified`, `date`, `at`, `start`, `end`, `body`, `source`, `relation`, `label` | Stored fields. Specific modules interpret a subset for their own view/extraction; there is no universal automatic behavior from each name. | H/P |
| One or several `method: id@version` fields | Preserved. The core parser/preview does not perform the whole 62-profile validation/layout catalogue. | P/G |
| Unknown record type/field, including `x-owner-…` | Valid opaque preservation and generic ordered field rendering, unless a specialized recognizer deliberately matches the record. | H/P |
| Invalid field/nested opener | Retained in record `unparsed` plus diagnostic; the current generic visual list shows parsed fields, not a complete raw reconstruction. | G |
| Unclosed record | Source retained through EOF with an error; not a successful complete record. | H |

## Which record types have a specialized presentation?

The record names below cover the common-type inventory in specification section 5.1. A name is not proof of an
implemented workflow. Records with an unfamiliar type remain valid. See the profile guide for methods that reuse them.

| Type/construct | Current host behavior | Support |
| --- | --- | --- |
| `chart` | Chart model plus one chart per selected metric, summaries and a collapsible numeric table. | H/G |
| `query` | Computed summary/table, or an explicit problem list. | H |
| `measurement` with a `metric` field | Compact metric/value/unit chip. Other fields are not all visible in that chip. | H/G |
| `scale` | Definition is parsed but hidden from normal preview; chart axes can use numeric bounds and anchors. | H/P |
| `sync` | Connection bookkeeping intentionally omitted from ordinary preview. | H/P |
| `palette`, `moodboard`, record using `moodboard-and-palette@…` | Swatches; moodboards can show an attachment grid and remaining fields. | H |
| `task`, `event`, `habit`, `observation`, `session`, `medication` | Generic fields in the shared preview. Some extraction modules separately read event/numeric data. No built-in clinical/treatment or full record-task dashboard is implied. | P/G |
| `reflection`, `prompt`, `response`, `review` | Generic fields, without automatic prompt offering, response scoring or recurring review generation on open. | P |
| `period`, `collection`, `relation`, `quotation` | Generic fields; recognized local reference fields may become links. No automatic page structure or knowledge graph is created. | P |
| `person`, `place` | Generic fields in preview; the workspace has a separate reference-book editor. Their numeric fields are excluded from chart measurements. | H/P |
| `attachment` | Generic record fields; it does not by itself render every asset as an image or player. | P |
| `layout` | Generic record list in the shared preview, not implementation of every detailed layout field. Other host surfaces have their own geometry models. | P/G |
| `consent`, `correction` | Generic fields. Neither creates an access-control system nor automatically replaces a prior fact. | P |

## Local includes, collections and relationships

Sources: specification section 6.2; [include helpers](../../parser/include.mjs);
[preview include frames](../../parser/preview.mjs), lines 308–338. An ordinary link and a view-only include are different
operations. The [media/link reference](media-and-links.md) supplies the activation and attachment details.

| Source/construct | Current host behavior | Support |
| --- | --- | --- |
| `![label](other.jot#fragment)` in a paragraph containing only include-image references | Recognized by `includeLines()`. The host supplies text through the explicit synchronous include callback; included writing is framed and labelled with its origin. | H |
| No fragment, `#record-id`, `#YYYY-MM-DD` | Include the whole body, a matching record, or every entry with that date. This differs from an ordinary date link, which selects the first dated target. | H |
| Relative `.jot` include path | Normalized inside the host-declared root. Unsafe schemes, absolute paths, backslashes and climbs above that root are refused. A `.jotz` target is not a supported text include. The host remains responsible for real filesystem/symlink confinement. | H |
| `.jot` image reference among ordinary inline words | Readable include-information placeholder; not an inline expansion of the whole journal. | H |
| Missing fragment/file, loop or excessive depth | Visible notice, not an empty block. Preview detects loops and depth 3. The `gather()` helper additionally bounds individual source size to 1 MiB and unique files to 64; a direct callback must enforce its own resource limits. | H |
| Included footnotes, filename and layout comments | Footnotes/filename context are scoped to the include frame. Included layout comments do not reconfigure the outer page. Complete per-included-document internal-link anchor navigation is not established by the current root-only anchor setup. | H/G |
| Explicit flattening | `flatten()` returns a copy with source-origin comments and reports problems; rendering alone does not replace the include line or overwrite source. | H |
| `collection` with repeated `member` | Generic ordered fields and recognized links; membership does not move/delete the original. | P |
| `relation: kind target`, `parent`, `migrated-to`, source/prompt/member links | Supported reference fields get parser link metadata. Arbitrary relation kinds remain strings; the core does not implement every parent/migration-cycle or lifecycle validation rule. | H/G |

## Measurements, units, scales and missingness

Sources: specification section 5.2; [number collector](../../parser/charts.mjs), lines 22–81;
[measurement chip](../../parser/preview.mjs), lines 378–383. The format's requirements are broader than the current chip
and number collector. Do not present those limited implementations as a validated measurement engine.

| Construct/source | Current host behavior | Support |
| --- | --- | --- |
| Decimal `-?[0-9]+(\.[0-9]+)?` | Chart collector accepts this plain ASCII shape. Exponents, grouping, NaN and arbitrary unit-bearing strings are not parsed as numeric values. | H |
| `metric`, `value`, `unit` | Measurement chip shows metric label, written value and optional unit. Missing value displays a blank. Chart metric keys are normalized separately. | H/G |
| `status: observed`, `estimated` | Stored; compact preview does not distinguish these statuses. Number collection reads a syntactically numeric value without checking the status. | G |
| `unknown`, `skipped`, `not-applicable` | Stored strings; specification requires omitting `value`. Chip does not show the different statuses. | G |
| Observed `value: 0` | Valid numeric zero; chip and plots can show zero. | H |
| Multiple observations | Records remain separate; same-key same-day chart values are averaged for display. | H/G |
| `scale: #id`, numeric/ordinal bounds and anchors | Collector reads bounds/anchors from an identified scale; a known referenced scale can influence a chart axis. | H/G |
| `kind: categorical`, ordered `option` values | Preserved, but no specialized categorical chart/scale view is implemented by the numeric collector. | P |
| Same metric name with incompatible units/scales | Current collector groups by normalized metric key and retains the first unit/known scale it finds; it does not fully enforce the specification's no-merge rule. | G |
| Scale bounds/invalid numeric values | Core parsing is not comprehensive semantic validation. A chart can abandon its scale bounds when values lie outside them. | G |
| `aggregation`, `precision`, `body`, `source`, `date`, `at`, `created` | Preserved; specialized display/extraction consumes only part of this information. | P/G |
| Numeric fields on other records | Collector can treat unreserved plain-number fields as metrics, excluding scale/chart/query/person/place records. Not every number is therefore an intended health observation. | H/G |

## Chart requests and tables

A chart record is a view over existing numbers, not a place to store synthetic observations. The host template preview
can explicitly request sample numbers; an actual journal view must not enable that option or lose the sample label.

Sources: [chart model](../../parser/charts.mjs), lines 88–178;
[chart DOM](../../parser/preview.mjs), lines 48–77.

| Construct/source | Current host behavior | Support |
| --- | --- | --- |
| `metrics: sleep, steps` | Normalized metric keys; omitted metrics select known metrics. | H |
| `start`, `end` | Inclusive written dates; reversed range is ordered. With neither, a dated chart uses its entry's ISO week; otherwise numeric date bounds are used. | H |
| `style: line` or `bars` | Line default; bars for exact `bars`. Unknown style falls back to line without a full chart-schema validation path. | H/G |
| Same-day values | Daily mean per metric; no source rewrite. | H/G |
| Missing days | Null gaps, not zero; `spanGaps` false. | H |
| Numeric scale axes | Per-metric axis and optional anchors; independent metrics do not share one value axis. | H |
| Text alternative | Canvas accessible name, a visible summary and numbers inside a collapsed details table. | H |
| Animation/tooltips | Chart configuration disables animation, but hover tooltips are browser interaction. | H |
| Long ranges/many metrics | Model currently caps at **62 days and 8 metrics**, without a complete omitted-range/metric notice. | G |
| Unavailable chart engine/model | Preview has explicit empty/no-number messages; a reader without chart support may show the record. | H/P |

## Query vocabulary and computed results

Queries execute no arbitrary code, network request or template expression. They compute a view over the same parsed
document. Included-file queries use that file's data, not an implicit combined library. The current task extractor
uses **bare Jot tasks**, not every task-looking record or GFM checkbox.

Sources: [query parser/model](../../parser/query.mjs), lines 35–200;
[automation extraction](../../parser/automation.mjs), lines 59–77;
[query presentation](../../parser/preview.mjs), lines 256–272.

| Field/construct | Current host behavior | Support |
| --- | --- | --- |
| `show: tasks` | Lists/counts rapid Jot task nodes. | H/G |
| `show: events` | Rapid `o` events and `event` records read by extraction. | H |
| `show: entries` | Derived dated entries; no fabricated daily rows for gaps or undated preamble. | H |
| `show: numbers` | Collected values per metric/day, daily means. | H/G |
| `label` | Optional query title. | H |
| `status` | Tasks only; comma-separated open/completed/migrated/scheduled/cancelled, any match. | H |
| `priority` | Tasks only, high or normal. | H |
| `tag`, `context` | Tasks/events/entries; comma-separated names, case-insensitive, all requested marks required. Entry marking excludes records/comments/code. | H |
| `text` | Case-insensitive contained text. | H |
| `metric` | Numbers only; normalized keys; unknown requested metric is a visible problem. | H |
| `period` | day/week/month anchored to query own date/at or containing dated entry. ISO week starts Monday. | H |
| `start`, `end` | Inclusive bounds, either open-ended; cannot combine with period. | H |
| `stat` | count; numbers also sum/average/min/max, per metric. | H/G |
| `limit` | 1–500 displayed rows, default 50. Summary/statistics cover all matches and state when only first rows are shown. | H |
| Common provenance fields | Allowed by the query reader without becoming filters. | H |
| Unknown/repeated/blank/invalid/inapplicable fields | Most rejected requests produce a visible problem list and separate `queryDiagnostics()` warnings. A shaped but impossible date such as `2026-13-01` can currently throw from date validation instead of returning that model. | H/G |
| Results | Summary sentence and ordinary table, not automatically stored results or clickable navigation rows. | H/G |

## Time, date context and lifecycle language

Sources: specification sections 2.3.1 and 5.3;
[timezone module](../../parser/timezone.mjs); [automation time extraction](../../parser/automation.mjs).

| Construct/source | Current host behavior | Support |
| --- | --- | --- |
| `Timezone: Region/City`, `UTC`, `GMT` | Validated document context through runtime Intl/IANA data. Invalid/blank declared zones remain unresolved. | H |
| `@timezone: Region/City` inside an entry | Overrides the whole entry, even when written later; duplicate overrides warn/use last, next dated heading ends scope. A preamble override warns. Directive itself is hidden; date heading can show a badge. | H |
| Place `timezone` | Descriptive record field; does not change entry context. | H |
| Written `date`, `at`, `created`, `modified` | Stored separately. Core does not infer an observation date from a filename or modification time. | H/P |
| `period` record `start`, `end` | Generic record fields. The specification defines coverage with start inclusive and **end exclusive**; chart/query date bounds are instead **inclusive** at both ends. | P/G |
| RFC 3339 instant with offset; local clock text | Timezone helpers/calendar export can resolve supported exact/unambiguous times. A scene time label is not this data. | H/G |
| `start`, `end`, ongoing intervals, `duration`, `duration-unit` | Preserved record fields; the core parser is not a complete interval/duration consistency validator. | P/G |
| `due`, `scheduled-for`, `completed-at`, migration fields | Durable record lifecycle vocabulary, generic display. | P |
| `cadence`, habit done/partial/not-done/skipped/unknown/not-applicable | Stored method data; no executable Core recurrence or missed-day creation. | P |
| `origin`, `recall`, `confidence`, source/review fields | Stored provenance; not an instruction to regenerate or reinterpret writing. | P |

## Presentation directives, layout records and host hints

The broad specification describes a richer page/layout contract than `renderPreview()` applies by itself. The shared
preview skips directives and normally prints a `layout` record as fields. A host may supply its own paper/editor
configuration; an adapter must not advertise every directive as effective merely because it parses.

Sources: specification section 8; [shared preview](../../parser/preview.mjs), lines 343–360;
[handwriting layout helpers](../../parser/handwriting.mjs), lines 28–76 and 396–449;
[Writer page settings](../../site/dist/studio.mjs), including `adoptDocumentLayout()` and `pageSettings()`.

| Source/construct | Current host behavior | Support |
| --- | --- | --- |
| `@layout: dot-grid-5mm`, `lined`, `blank` | Preserved directive; shared preview omits it. Host handwriting/grid options are separately supplied. | P/G |
| `@spread: single-page`, `two-page` | Preserved, not a shared-preview two-page implementation. | P/G |
| `@grid: normal`, `hidden`, `blackout` | Preserved hint; no universal shared effect. Blackout is visual background, not redaction. | P/G |
| `@paper`, `@orientation`, `@margin`, `@dot-spacing`, `@dot-diameter`, `@dot-color` | Parsed strings. The complete directive geometry/precedence contract is not implemented by the shared preview. | P/G |
| `layout` record `target`, `paper`, `orientation`, `width-mm`, `height-mm`, `font-pt`, `palette`, repeated `panel` | Preserved fields; no automatic complete multi-panel/detailed record layout in the shared preview. | P/G |
| Margins, gutter, binding, mirror-margins, grid-area/grid-anchor | Specification fields and physical-page rules, not all automatic effects of the current generic record display. | P/G |
| Paper presets and physical units | Specification's `paper-sizes.json` is broader than the small handwriting helper's A5/A4/Letter/Pocket set. Other editor surfaces may have broader support. | G |
| `/*` + `jot-page: {…}` + `*/` | Optional host comment extension: `pageLayoutFromAst()` reads the first matching JSON hint and bounds a small paper/pitch/margin model. Writer can adopt it. It is not arbitrary executable JSON. | H/G |
| `/*` + `jot-block: {"id":"…","rows":…,"gap":…,"newPage":…}` + `*/` | Allowlisted comment JSON creates a preview layout section with bounded rows/gap/new-page data. Handwriting alignment can reserve rows and move blocks according to `pageRows`. | H/G |
| `jot-block-end` comment | Ends the host preview's layout section. Layout comments in includes do not reconfigure the outer page. | H |
| `===`, minimum rows and print break CSS | Some host screen/print arrangement exists, but it is not a complete device paginator. | G |
| Unknown directive/layout values | Source survives; shared preview may simply omit the hint. | P/G |

## Named styles, simulated handwriting and color collections

Sources: [styles](../../parser/styles.mjs), [handwriting](../../parser/handwriting.mjs),
[palette models](../../parser/palette.mjs), and [palette/moodboard DOM](../../parser/preview.mjs), lines 175–198 and 384–391.

| Construct/option | Current host behavior | Support |
| --- | --- | --- |
| Host style `journal`, `notes`, `plain` | Typed-page CSS supplied as a render option, not automatic method-specific syntax. Styles differ in headings, spacing, dates, records and print appearance. | H |
| Host `hand` option | Registered handwriting font, ink, seed, pitch, dots and row budget; source text/order remain unchanged. The direct preview's hand-option defaults and the Writer's selected preferences are separate. | H |
| Seeded word/box/highlight variation | Deterministic presentation changes; changing a rendering seed does not rewrite facts or create original pen strokes. | H |
| Dot-grid alignment | Host aligns blocks/line heights to snapped CSS pitch; `jotReady` concerns its alignment/font stage, not every external image being ready. | H/G |
| Original scans/strokes | Assets and records, distinct from a handwriting font. The preview does not perform OCR or infer task completion from ink. | H/P |
| `palette` repeated `color: #RRGGBB name` or `#RGB name` | Named swatches with hex text and contrasting label ink; invalid colors show a note. Names are optional; absent names display “Unnamed.” | H |
| Palette `label`/`name`, CSS/JSON export helpers | Title and optional generated CSS-variable/JSON representations; these are explicit exports, not source commands. | H |
| `moodboard`, repeated `image`/`asset`, following `alt`/`caption`/`credit` | Attachment-only image grid, metadata kept in source order; remaining fields displayed. Two or more standalone Markdown images can form a grid too. | H |
| Highlight/color after monochrome conversion | Host color rendering is real, but the panel conversion can remove pale or thin marks. | G |

## Diagram fences and embedded programs

Sources: [diagram recognition](../../parser/jot.mjs), lines 137 and 160–163;
[preview fallback](../../parser/preview.mjs), line 366; specification section 15.2 supplements sections 1–12 here.

| Fenced language/construct | Current host behavior | Support |
| --- | --- | --- |
| `mermaid` | Diagram metadata on the code node; preview says rendering adapter not installed and shows source. | P |
| `dot`, `graphviz` | Graphviz engine metadata; same code fallback. | P |
| `plantuml`, `puml` | PlantUML metadata; no server call or bundled engine. | P |
| `d2` | D2 metadata; no bundled execution. | P |
| `vega`, `vega-lite`, `vegalite` | Engine metadata; JSON object parse when valid, warning when invalid. This is not full chart grammar or URL validation. | P/G |
| Custom `diagramLanguages` option | Host can register language→engine recognition. Registration alone installs no renderer. | P |
| Unknown fence, JavaScript, shell, SQL or other program | Literal code. No automatic execution, expansion or remote includes. | H |

## Known differences that a completeness claim must address

These are current observed implementation boundaries, not new format rules or fixes delivered by this reference.

| Boundary | Current host observation | Support |
| --- | --- | --- |
| Parser vs entire draft | No complete profile validator or general semantic validation pass is part of `parse()`. Schema success and visible preview do not establish full conformance. | G |
| Invalid dated heading display | Parser flags invalid Gregorian dates and does not create a valid entry. Preview independently uses browser `Date.parse()` in its heading path, which can normalize an invalid written date. | G |
| Annotation/voice model | Whole-line annotations format inline; continuing voice scope/delivery notes are not a structured host model. | G |
| Metadata/field duplicates | Ordered preservation exists, but many derived consumers select first values while broader singleton rules call for validation/effective-value handling. | G |
| Missing note targets | Host footnote anchors can lack a definition. | G |
| Reference-definition display | The current `def` Markdown token falls through to raw-text display even when its reference link resolves. | G |
| Numbers/chart scope | Incompatible-unit merging, status handling and 62-day/8-metric chart caps require care. | G |
| Query invalid-date failure | `runQuery()`/`queries()` can throw for some impossible ISO-shaped dates because validation calls `toISOString()` on an invalid date. A normal problem-list result is not guaranteed for every malformed input. | G |
| Specialized record reduction | Scale/sync records are hidden; measurement chips omit fields; malformed raw lines are not all in the generic field list. | G |
| `parse(..., {journal:false})` | Disables Jot's outer record/rapid-line processing, but the shared Marked instance still has registered inline/full-formatting extensions. | G |
| Layout/print vs device | Broad physical layout hints, print CSS, hand-grid rows and one browser screenshot are not a full device pagination implementation. | G |
| Raster interaction | Pixels carry appearance, not semantic actions, search text or focus order. | G |
| Source preservation vs rendering | Hidden/unsupported content can remain in source even when absent from the page. A screenshot does not prove a complete backup or sanitized export. | G |

## Review a renderer end to end

See the [shared acceptance checks](README.md#acceptance-checks). Test the gaps above as well as normal input.

## Source map

- [Specification](../../specification/Jot-Complete-Specification.md), sections 1–12, with section 15.2 for diagram recognition.
- [Parser README](../../parser/README.md), the prototype implementation contract and declared limits.
- [Parser](../../parser/jot.mjs): inline extensions/media helpers 6–120; blocks/recovery 130–214; references 216–241;
  original-source serialization and engine declaration 244–248.
- [Preview](../../parser/preview.mjs): charts 48–77; inline/media/variables 94–209; Markdown blocks 210–254;
  queries 256–272; link/include scope 274–330; Jot nodes/record rendering 331–407; notes/readiness/styles 409–492.
- [Charts](../../parser/charts.mjs): numeric collection 22–81; ranges/limits/models 88–127; static chart configuration 138–178.
- [Queries](../../parser/query.mjs): field vocabulary/validation 35–106; item scope 109–124; results/diagnostics 147–200.
- [Automation](../../parser/automation.mjs): task/event/number extraction 59–77 and explicit export/rollover operations.
- [Timezone context and resolution](../../parser/timezone.mjs), [local includes](../../parser/include.mjs),
  [palette/moodboard models](../../parser/palette.mjs), [typed styles](../../parser/styles.mjs),
  [handwriting/layout helpers](../../parser/handwriting.mjs), and [AST schema](../../specification/jot-ast.schema.json).

Line numbers describe the inspected revision and can move. Recheck behavior when those modules change rather than
treating a copied table as an independent implementation contract.
