# Smart journal: connected sources and optional structured syntax

Updated 1 November 2026. Status: **weather and read-only Home Assistant implemented**. Other connections, contextual settings,
Home Assistant card and complete semantic parser support remain planned.
The owner wants many optional data sources at a journal writer's fingertips, on-demand lookup, contextual suggestions
behind a setting that defaults off, read-only Home Assistant, and both concise references and structured `.jot` records.
This proposal extends the [media plan](media-sources-and-service-actions.md); it does not replace its provider backlog.
Physical hardware and firmware remain deferred.

## Source catalog

Each adapter declares lookup, import, insertion and outbound-action capabilities independently. A catalog entry is a
research/implementation target, not evidence of available account access, a public API or permission to redistribute data.
Verify authentication, terms, pricing, attribution, coverage, browser access and platform requirements before release.

| Group | Providers or sources to evaluate | Useful context and boundaries |
| --- | --- | --- |
| Home context | Home Assistant | Explicitly selected entities, current states and available history; read-only |
| Weather and environment | Open-Meteo and regional services | Current/historical weather, forecasts, air quality, pollen, UV and marine conditions; label estimates and geographic coverage |
| Astronomy and occasions | Sun/daylight calculations, moon-phase sources, public-holiday and regional-observance datasets | Chosen place/date; distinguish astronomical facts from interpretations and regional observance from personal participation |
| Calendars | Google Calendar, Microsoft 365, CalDAV; existing chosen ICS-import track | Selected events and occasions; a calendar item is a plan, not proof of attendance |
| Tasks and projects | Todoist, Microsoft To Do, Notion | Chosen tasks, completed work and project references; existing outbound actions remain separately chosen |
| Activity and sleep | Strava, Fitbit, Oura; supported Apple Health/Health Connect imports or native adapters | Selected workouts, walks, sleep and measurements; no claim that a website can directly read native health stores |
| Work and time | Toggl Track, Clockify, ActivityWatch, GitHub, GitLab | Selected time entries, sessions and development activity; raw activity does not establish productivity or intent |
| Places and outings | OpenStreetMap-based services, event catalogs, regional transit sources | Places, venues, trails, events and journey references; preserve the existing Photon/Pelias track and verify autocomplete policies |
| Food and recipes | Open Food Facts, USDA FoodData Central, recipe managers | Foods, ingredients, recipes and source nutrition data; do not infer what was eaten from a lookup |
| Money | Public exchange-rate sources, Actual Budget, Firefly III, selected financial-file imports | Rates and selected records; no bank connection or transaction upload by default |
| Nature and knowledge | iNaturalist, eBird, Wikidata, museum collections | Species, observations, artworks and references; a species lookup is not a confirmed sighting |
| Photo libraries | Immich, Google Photos Picker, Apple Photos/iCloud Photos native pickers and downloaded-file imports | Explicit selection and reviewed bundled assets; read-only access, no background library backup or journal upload |
| Personal and custom data | Chosen journals, contacts, files, RSS, CSV/JSON, supported automation bridges | Explicitly selected local material first; no background archive scan or unrestricted remote URL fetching |

Retain every planned media provider: TMDB, Trakt, Spotify, YouTube, Open Library, IGDB, ListenBrainz, Last.fm, Jellyfin,
Audiobookshelf, Raindrop.io, Readwise/Reader, Zotero and read-only Steam, plus **AniList, Hardcover, SIMKL, Inoreader,
OpenSubsonic and gPodder**. Supported pasted-URL resolution remains shared infrastructure. Specific media capabilities
and their constraints are recorded in the media proposal rather than duplicated as separate adapters here.

## One picker, explicit insertion

Offer a searchable source picker with favorites, quick actions, source-specific filters, a preview and undoable insertion.
Use chosen date, place, entity, query or file as inputs. Public catalog lookup need not imply an account connection.
Display connection requirements and provider attribution at the relevant source. Keep normal writing usable offline or
when a provider fails. Choosing favorites does not enable network requests or journal analysis.

On-demand lookup uses explicit inputs and does not analyze surrounding prose. Preview imported data before inserting it.
Preserve readable labels and stable identities, source, units, observation time and retrieval time. Never silently replace
the user's observations with provider values. A saved snapshot does not change merely because the provider later changes.
Manual input and ordinary links remain fallbacks for unsupported sources and missing data.

## Contextual suggestions: off by default

Provide a separate, clearly explained **Contextual suggestions** toggle, initially off and remembered locally. This is
distinct from existing autocomplete in a dedicated lookup box or suggestions from explicitly opened reference books.

When off, do not run the new contextual prose analysis. When enabled, analyze only the active entry locally; do not scan
other journals or send journal prose to a provider. Suggest an action such as looking up weather or resolving a media
reference. The user selects the suggestion before an external lookup, then reviews its result before insertion.
Do not infer that mentioning a title means watching it, or mentioning a place means being there.

Turning the setting off stops pending analysis and clears suggestions. Cancel stale work when the active entry changes,
closes or locks. Suggestions do not silently add data, trigger provider writes or enable account-history collection.

## Read-only Home Assistant

The user explicitly chooses an instance, entities and date range. Fetch selected current states or available history
on demand. Preserve timestamps, units and entity identity; show unknown/unavailable states and missing or expired history
accurately. Do not substitute a current reading when historical data is unavailable or treat a sensor state as an account
of what the person did. Keep retrieved data bounded to the chosen entities and interval.

No service calls, scene/script triggers, device-state writes, synthetic sensor states or background event subscriptions.
The read-only restriction concerns Jot's operations; do not imply the Home Assistant credential itself has a narrower
scope than the server actually grants. Keep credentials outside journal files, exports, card configuration and URLs.
Assess supported app authentication, instance reachability, HTTPS/mixed-content restrictions, CORS/private-network rules
and the desktop network allowlist before implementation. A hosted page cannot be assumed to reach every local instance.

### Optional Home Assistant dashboard card

Record this as a separate exploration, not an implemented or selected card design. First evaluate a **Writer launcher
with selected read-only context**. Embedded Writer editing remains a separately evaluated possibility; it does not imply
permission to control Home Assistant devices. Check authentication, iframe/CSP restrictions, dashboard visibility and
browser connectivity before choosing a card implementation. Do not display private journal content on a shared dashboard
or serialize tokens/full journal content into dashboard configuration, launch URLs or query strings.

## Optional `.jot` syntax proposal

Use concise inline references for ordinary writing and structured records for interoperable data. Writer should generate
records through lookup/capture controls; beginners can continue writing prose. The existing parser already preserves
generic records, but preservation does not establish semantic validation of the proposed types and fields below.

### References and identity

Retain existing Spotify, IMDb, YouTube and MusicBrainz forms. Propose typed TMDB references such as `tmdb:movie:603` and
`tmdb:tv:1396`, and typed Trakt movie/show/episode references using verified provider IDs. Specify exact ID validation,
canonical URL expansion, code/escape behavior and unsupported-reader fallback in a later normative specification change
with conformance fixtures. Other providers initially use ordinary named HTTPS links. Cross-provider identities must be
verified; a title match is insufficient. References perform no automatic metadata fetch or playback.

### Media, activity and observations

Proposed complete media records standardize `kind`, `title` and repeatable `reference` fields, with a stable record ID
when reused. A work, edition, recording and episode remain distinct. Repeated references identify the same selected item
only when the provider mapping is verified.

Proposed activity records standardize `kind`, `item` and optional `date` or `at`. The item is a media record link, supported
provider reference or ordinary HTTPS URL. Use an activity ID distinct from the item identity, so rewatches and repeated
listens remain possible. Logical date, event instant and capture time remain distinct; never invent a watched timestamp
from the journal save time. Core partial records remain preservable, even before an activity is complete or confirmed.

Illustrative proposal, not a currently standardized activity profile:

```jot
Watched [The Matrix](imdb:tt0133093). Loved the atmosphere.

:::record activity #watch-20261101-a
kind: watched
item: imdb:tt0133093
date: 2026-11-01
:::
```

Reuse `measurement` for individual numeric values and `observation` for descriptive context. Standardize the proposed
shared provenance fields `source`, `retrieved-at` and `data-kind`; retain existing `metric`, `value`, `unit`, `date` and `at`
meanings. Distinguish observed, forecast, estimated and manually entered data; model-derived historical weather must not
be represented as a direct personal observation. Entity/instance identifiers are optional source context, not credentials.

Illustrative sensor snapshot; the extra provenance fields remain proposed conventions:

```jot
:::record measurement #room-temperature-20261101-a
metric: room-temperature
value: 21.4
unit: C
at: 2026-11-01T18:00:00Z
source: home-assistant
source-entity: sensor.living_room_temperature
retrieved-at: 2026-11-01T18:00:05Z
data-kind: observed
:::
```

### Compatibility and non-execution

Records express saved data, not executable instructions. Opening, parsing or rendering a journal never initiates lookup,
synchronization or device control. Preserve unknown record types, fields and reference text. Do not automatically migrate
existing prose, listening notes, observation blocks or provider references, and do not bump the released format version
merely because this proposal exists. Exact grammar/semantic additions require their own specification and parser work.

Credentials and Writer's new delivery receipts stay outside portable journal content. Existing `sync` records described
in spec section 5.3.1 remain preservable and do not authorize a request. A future normative update must reconcile the new
private receipt store with that existing optional interchange representation without deleting old records or replaying them.
No API, parser, renderer or semantic-profile support is implemented by this proposal.

## Delivery and acceptance

1. Publish the source catalog, capability boundaries, suggestion defaults, read-only Home Assistant scope and syntax draft.
2. Build shared source-picker/provider infrastructure using the existing media plan; extend existing weather, Todoist,
   webhook and health-import foundations rather than introduce duplicate implementations.
3. Prioritize weather and read-only Home Assistant within the context track. Preserve movie/TV lookup then Trakt history
   as the media track's first slice. Check each new source's real access and supported operations before claiming support.
4. Separately implement the contextual-suggestions setting and local active-entry processing, retaining off by default.
5. Propose canonical specification edits, parser/renderer support and conformance fixtures for optional syntax additions,
   then Writer insertion controls. Confirm readable fallback and exact source preservation in older/basic readers.
6. Evaluate the optional Home Assistant card independently; do not make it a prerequisite for Writer or source access.

Future acceptance covers explicit query boundaries, disabled/enabled suggestions, cancellation on entry change/lock,
offlining and revoked credentials, unavailable entities, missing history, stale results, units and timezone handling,
forecast versus observation, snapshot preservation and undo. Home Assistant tests must assert the absence of service calls,
state writes and event subscriptions. Card checks cover shared-dashboard exposure, token-free configuration/URLs and
embedding/network failures. Syntax fixtures cover media/activity identity, rewatches, repeated fields, partial/unknown
records, code/escapes, no network side effects and byte-preserving round trips. Mocked tests and live checks are distinct.

## Evidence and design basis

- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/),
  [authentication](https://developers.home-assistant.io/docs/auth_api/) and
  [history](https://www.home-assistant.io/integrations/history/): source capabilities; actual server retention/access vary.
- [Open-Meteo historical weather](https://open-meteo.com/en/docs/historical-weather-api),
  [air quality](https://open-meteo.com/en/docs/air-quality-api) and [pricing](https://open-meteo.com/en/pricing):
  distinguish estimated data, coverage, attribution and commercial-use terms.
- `docs/methods/digital-daily-notes.md, line 711` rejects third-party journal-content sync; the plan keeps prose local.
  Its objection to activity-based suggestions at line 712 is deliberately narrowed by the owner's explicit request for
  an optional setting: active-entry analysis is local, off by default and does not initiate provider requests.
- `docs/methods/expressive-writing.md, line 443` supports private writing unless sharing is chosen.
- `docs/methods/symptom-tracking.md, line 686` rejects cloud symptom-data sync; optional chosen data imports must not become
  journal uploads, diagnostic inference or automatic clinical-data collection.

These are product boundaries informed by the guides and the owner's instructions, not evidence that connected sources
improve journaling outcomes. No account was connected, sensor queried, external write performed or card deployed.


## First delivery: on-demand weather

Writer now has a shared Connected sources picker and provider capability catalog, initially Open-Meteo daily weather. Requests
contain only explicitly entered coordinates, date and timezone; source text is not an adapter input. Historical archive output
is labelled estimated and recent/future forecast output forecast. Null values stay missing rather than zero. Review shows exact
Jot records, model provenance, retrieval time, units, coordinates and attribution before one undoable insertion. Source changes
require a newly captured caret; closing/locking cancels pending lookup. Tests use mocked provider responses. Live provider terms,
CORS and native platform compatibility require deployment checks; no unrestricted network proxy or embedded credentials exist.

This first slice does not add prose analysis or enable contextual suggestions. Home Assistant now follows this flow with explicitly selected current states or bounded history; the optional card remains planned. Existing
`measurement` and generic `observation` records carry snapshot provenance; no new short-reference namespace or automatic action
semantics were added. Research: `docs/methods/digital-daily-notes.md, line 711` rejects cloud sync for journal content in that guide;
explicitly sending lookup coordinates while retaining journal prose locally is an engineering choice, not a research finding.


## Second delivery: read-only Home Assistant

Implemented in the shared picker: explicit HTTPS/loopback instance, memory-only token, one to five selected entities, current state
or a chosen past history interval (seven days/200 states/512 KiB per entity). Only state/history GET requests are issued; no device
control, subscriptions or broad discovery. Preserve server timestamps/units, missing/unavailable data and a labelled boundary state
before the history start. Missing history never falls back to current readings. Readable snapshot records retain only reviewed
fields, `data-kind: reported`, instance and entity identity, and retrieval time. No account credential is included. Token clearing,
redirect rejection, endpoint scoping, response limits and reviewed undoable insertion are covered by mocked tests. Live HA/CORS
and native webview access remain unverified. Desktop support remains constrained by its existing loopback-only instance policy;
no wildcard HTTPS permission was added. Contextual suggestions and the optional dashboard card remain separate milestones.

Photo-library delivery is specified in [photo-library-integrations.md](photo-library-integrations.md) and the separate Writer roadmap. All three dedicated connectors remain planned; the format roadmap owns portable assets/protection rather than provider authentication.
