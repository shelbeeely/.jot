# Integrations, saved data and e-paper readers

This catalogue covers the integrations and source tracks named in the current Jot repository, checked 3 November
2026. It distinguishes code that exists in Writer or command-line tools from proposed connections. A service name in
a profile, link, source register or roadmap does not mean the e-paper reader can connect to it.

The base reader is **offline and read-only**: open the chosen `.jot` or `.jotz`, show its saved writing and assets, and
navigate them through [touch or buttons](navigation.md). The [rendering pipeline](epaper.md) produces the page; it does
not sign in, fetch new data, play remote media, run scheduled jobs or publish anything.

## How to read the status

| Status | Meaning in this catalogue |
| --- | --- |
| **Host** | Implemented Writer/browser code; the desktop app reuses the web application, subject to its platform capabilities |
| **CLI / VS Code** | Implemented commands or extension connections; not an implemented e-paper service client |
| **Local** | Implemented parsing, import, export or storage without a remote account connection |
| **Planned** | A proposal or roadmap track; no delivered connection is established by listing it |
| **Unavailable** | A named option explicitly not supported or not verified in the current implementation |

Implemented means the repository contains the stated behavior. It does not mean a live provider account, native share
sheet, microphone, touch controller or physical panel was verified in this documentation task. New provider API access,
terms, account eligibility and platform compatibility still need their own checks before release.

Browser support does not establish Tauri or native-SDK support. In particular, the current
[desktop CSP](../../desktop/src-tauri/tauri.conf.json) does not allow MusicBrainz in `connect-src` and uses
`frame-src 'none'`, which blocks the Spotify embed. Those browser modules need desktop policy/runtime work before
their desktop availability can be claimed; they are not FreeInk service adapters.

The current [automation guide](../guide/automation.md), [browser-tools guide](../guide/browser-tools.md),
[AI guide](../guide/ai-companion.md), [converter guide](../guide/converting.md),
[media proposal](../proposals/media-sources-and-service-actions.md),
[smart-journal proposal](../proposals/smart-journal-and-connected-data.md) and
[roadmap](../../specification/ROADMAP.md) are the source of the inventory below. Planned examples are not additions
to the canonical Jot grammar.

## One rendering and action boundary

The following view routes apply to every row that names them. They are proposed reader behavior, not new firmware
features or service APIs:

| Route | E-paper rendering and offline fallback | Touch | Buttons |
| --- | --- | --- | --- |
| **Read** | Readable title, saved text, source label, time and ordinary reference; retain the URL when offline | Tap a supported link, or open its information through reader controls | Controls → Links on this page → select → Confirm |
| **Numbers** | Saved values with units, aggregation and dates; a labelled chart plus a readable data table | Tap the chart/table action or use controls | Controls → select chart/data view → Confirm |
| **Asset** | Saved image/scan/annotation with caption, Fit and zoom; unsupported types get a filename/type notice | Tap attachment; visible zoom/pan controls, with gestures optional | Controls → Attachments → select → Confirm; image controls and directional pan |
| **Transfer** | Read an already transferred file; preserve current writing if import/open fails | Visible file/transfer controls only in a separately implemented host/device mode | Equivalent labelled list and Confirm path; an SD/file-copy fallback is sufficient |

An external URL can be displayed without contacting its service. If a future device offers an explicit external-open
or companion handoff, label the destination and make the action available through both inputs. A named link is not a
promise that a browser, authenticated player or provider app is installed on the reader.

A future connected mode must be separate from ordinary reading. Show the selected account, action, item, time and
exact outgoing data before a send; allow cancellation. Keep credentials and new delivery receipts outside portable
journal content. Opening, paging, searching, following an internal link or displaying a record never authorises a send.
This is a product interaction requirement, not a request to connect or write to any service now.

## Implemented music and media behavior

| Integration | Current status and project source | What is actually saved | E-paper/offline result and request boundary |
| --- | --- | --- | --- |
| Spotify manual references | **Host + Local**; [music module](../../site/dist/jot/music.mjs), [parser](../../parser/jot.mjs), [guide](../guide/automation.md#albums-playlists-and-spotify-short-links) | Ordinary prose/named links and `spotify:` track, album, playlist, artist, episode or show references | **Read**. Parsing expands a reference to a readable HTTPS link without lookup, playback or account access; music bytes are not packaged |
| Spotify currently playing | **Host**; [music module](../../site/dist/jot/music.mjs), [setup guide](../guide/automation.md#spotify-setup) | Reviewed title, artists, optional album/link and captured listening note; not the access token or playback stream | **Read** the saved note. Sign-in and fetching are explicit host actions; requires configured developer access. Fetch fills a review form; insertion is separate. Journal prose is not sent |
| Spotify writing player | **Host**; [player](../../site/dist/music-player.mjs), [guide](../guide/automation.md#listening-notes) | No music or authenticated player state is made part of the journal merely by loading it | **Read** its saved link; no iframe or autoplay in the offline reader. Explicit Load contacts Spotify; host playback depends on its player/account/platform, separately from capture |
| Last.fm public listening reads | **Host**; [music module](../../site/dist/jot/music.mjs), [scrobbling guide](../guide/automation.md#scrobbling-services) | A reviewed current/recent-track note with source, Captured and available Listened time | **Read**. Explicit request sends username and application API key, not journal prose. Current code reads current/recent public activity; it does not submit a scrobble |
| ListenBrainz public listening reads | **Host**; [music module](../../site/dist/jot/music.mjs), [guide](../guide/automation.md#scrobbling-services) | The same reviewed source/time-labelled note | **Read**. Explicit public request uses a username; no journal text or automatic polling. Extended history import and listen submission remain **Planned** below |
| MusicBrainz lookup | **Host + Local references**; [lookup](../../site/dist/media-lookup.mjs), [guide](../guide/automation.md#find-music-ids-while-typing) | Selected recording, release-group, release, work or artist identity as a readable `musicbrainz:` reference | **Read**. Search starts off and sends only a dedicated query/type when enabled; selected results enter review before insertion. Session cache is not a portable account connection |
| IMDb references | **Host + Local**; [parser](../../parser/jot.mjs), [music insertion](../../site/dist/jot/music.mjs), [guide](../guide/automation.md#imdb-and-youtube-background-media) | `imdb:tt…` title identity or ordinary named HTTPS link | **Read**. No title/ratings/thumbnail fetch or playback. IMDb is identification, not a streaming entitlement |
| YouTube references | **Host + Local**; [parser](../../parser/jot.mjs), [guide](../guide/automation.md#imdb-and-youtube-background-media) | Video/playlist references; full URLs retained when timestamp or combined video/playlist context matters | **Read**. No automatic embed, title lookup or playback; the persistent Writer player is Spotify-only. YouTube Data API search is **Planned** |
| YouTube Music and other music URLs | **Host manual entry**; [listening guide](../guide/automation.md#listening-notes) | Ordinary title/artist notes and HTTPS links | **Read**. No reading of another app's tab, notifications, media sessions or private account |
| Libre.fm | **Unavailable direct fetching**; [guide](../guide/automation.md#scrobbling-services) | Manually entered links/text remain valid | **Read**. Browser fetching was not verified because the public API presented an access challenge; no proxy/password workaround is implemented |
| Android/Pano Scrobbler | **External companion, not a Jot integration**; [guide](../guide/automation.md#scrobbling-services) | Only activity subsequently selected through the supported service reads | **Read** the imported note. The external app owns its own permissions and submissions; Jot does not read Android notifications or media sessions |

Captured time, a service-reported listen time and the journal entry's date are different facts. Do not turn a displayed
"playing now" response into verified playback, infer a listen from a mention, or fabricate timestamps while rendering.
The Spotify embed needs no developer app, unlike currently-playing capture; it may use Spotify cookies/sign-in and
is not part of print/export output. Current capture's client ID is not configured by default. Existing account reads
must not be presented as general Spotify account-write scopes.

## Implemented numbers, health and capture

| Integration/source | Current status and project source | Saved data and interpretation | E-paper/action boundary |
| --- | --- | --- | --- |
| Generic numbers CSV | **Local: Host, CLI, VS Code**; [automation module](../../parser/automation.mjs), [guide](../guide/automation.md#numbers-from-a-fitness-or-health-app) | Date/metric/value/unit measurement records, with source; imports can fill compatible blanks and avoid repeated values | **Numbers**. Read saved values offline; an e-paper reader does not reopen the original CSV or infer a missing reading |
| Apple Health `export.xml` | **Local: Host + CLI**; [health parser](../../parser/health.mjs), [import UI](../../site/dist/health-import.mjs), [guide](../guide/automation.md#health-data) | Selected daily measurements with units, aggregation and source; sleep interval merging and supported per-source totals are importer behavior | **Numbers**. File import and Add are explicit host actions; this is not direct HealthKit/native-store access |
| Health Connect daily CSV | **Local: Host + CLI**; [health parser](../../parser/health.mjs), [guide](../guide/automation.md#health-data) | Recognised selected columns become daily measurements; unknown layouts have a bounded CSV fallback | **Numbers**. No browser connection to the Android health store; a future native adapter remains **Planned** |
| Google Fit, Fitbit, Garmin and Oura CSV exports | **Local: Host + CLI**; [column/preset definitions](../../parser/health.mjs), [guide](../guide/automation.md#health-data) | Recognised daily numeric columns, units and source labels, not a service login or complete device history | **Numbers**. These file presets do not establish live Fitbit/Oura/Google/Garmin API integration |
| Health fields and vendor scores | **Local importer policy with a generic-fallback limit**; [health parser](../../parser/health.mjs), [guide](../guide/automation.md#health-data) | Medication/lab/clinical, reproductive/sexual-health and location columns are excluded. Recognised metric layouts omit unlisted vendor scores, but an unrecognised CSV's generic numeric fallback can import columns such as readiness score | **Numbers** with an honest metric/source label, never clinical reinterpretation. Do not claim every CSV path excludes proprietary scores, reconstruct excluded fields or remove independently authored health details |
| Voice pitch meter | **Host**; [voice module](../../site/dist/jot/voice.mjs), [voice guide](../guide/voice-practice.md) | Only explicitly inserted session notes, optional pitch summary measurements and observation fields | **Numbers + Read**. Microphone starts only after Start and permission. Analysis is local; the meter records no audio and is not an e-paper microphone feature |
| Voice recordings from another app | **Host attachment**; [voice guide](../guide/voice-practice.md#recordings-you-made-elsewhere), [voice module](../../site/dist/jot/voice.mjs) | Chosen recording asset plus ordinary link/`recording` reference in `.jotz` | **Asset** filename/type/caption; audio playback requires a separately supported player. Opening does not record, upload or auto-play |
| Current time capture | **Host**; [capture module](../../site/dist/editor-capture.mjs), [timezone module](../../parser/timezone.mjs) | Explicit timestamp with offset from the selected/declared time context | **Read**. Device clock input is not an online time service; rendering never changes the authored date or zone |
| Current location capture | **Host**; [capture module](../../site/dist/editor-capture.mjs), [reference books](../../site/dist/reference-books-ui.mjs) | Reviewed place fields such as coordinates, accuracy and captured time; saved only through the chosen place workflow | **Read** place details. Explicit browser geolocation/permission precedes review; no automatic location lookup on opening an entry |
| People and Places books | **Host + Local**; [book model](../../site/dist/reference-books.mjs), [UI](../../site/dist/reference-books-ui.mjs) | Chosen separate `.jot` books with stable person/place IDs, labels and optional details; ordinary cross-file links | **Read** references when their target is explicitly available. Optional remembered library is host state, not a phone contacts import or an account sync |
| OpenStreetMap map link | **Host link construction**; [reference-book model](../../site/dist/reference-books.mjs) | An ordinary map URL derived from reviewed coordinates, if inserted/chosen | **Read** coordinates/link; explicitly following a map is separate. No current geocoding/autocomplete or location-history feed is implied |

Keep source units and aggregation visible; a gap is not zero. A saved chart should have a textual table, and a numeric
import must not become a medical interpretation. The platform sources named above are supported file shapes or planned
adapters, not authority to request health-store permissions while reading a journal.

## Implemented automation and calendar boundaries

| Integration | Current status/source | Portable data | E-paper/offline result and execution boundary |
| --- | --- | --- | --- |
| Calendar `.ics` export | **Local: Host, CLI, VS Code**; [automation](../../parser/automation.mjs), [guide](../guide/automation.md#events-and-tasks-on-your-calendar) | Existing events/tasks remain Jot; export creates a separate calendar file with stable exported identities | **Read** plans and times. Export is not Google/Apple/Outlook login, attendance evidence, a subscription or notification job |
| Google Calendar, Apple Calendar, Outlook as `.ics` consumers | **External file consumers**; [guide](../guide/automation.md#events-and-tasks-on-your-calendar) | The separately exported `.ics` | Reader shows the original plans offline. Import/subscription behavior belongs to the chosen calendar app; Google's VTODO limitation is handled by the documented tasks-as-events option, not a provider API |
| Numbers/tasks CSV and JSON/query output | **Local: Host/CLI/VS Code as documented per command**; [automation](../../parser/automation.mjs), [CLI](../../cli/README.md) | Separate CSV/JSON outputs; existing records remain source | **Numbers + Read**. Spreadsheet compatibility is a file interchange path, not an Excel/Google Sheets account connector |
| Today, task rollover and weekly review | **Local: Host, CLI, VS Code**; [automation](../../parser/automation.mjs), [guide](../guide/automation.md#in-the-workspace-the-tools-row) | Explicit source edits: dated entry, migrated markers/copies and review text/chart/questions | Read the saved result. Do not run these when opening a file or treat a past date as a catch-up command |
| Open-Meteo basic daily weather | **CLI / VS Code connector**; [connect](../../parser/connect.mjs), [guide](../guide/automation.md#connecting-to-other-services) | Observation containing supported sky/high/low/rain values and `source: open-meteo.com` | **Numbers + Read**. Request only through chosen command or enabled weather-on-Today setting; sends rounded latitude/longitude and chosen date. No e-paper auto-refresh; broader environment sources remain **Planned** |
| Todoist outbound open tasks | **CLI / VS Code connector**; [connect](../../parser/connect.mjs), [CLI](../../cli/jot.mjs), [extension](../../vscode/extension.js) | Original tasks and legacy `sync` record recording sent keys; no token in journal | **Read** tasks. Only explicit send command writes task text/due date/priority to Todoist; a displayed checkbox is not a remote action. Broader selected task/project imports are **Planned** |
| Webhooks: Zapier, Make, n8n, IFTTT or chosen endpoint | **CLI / VS Code connector**; [connect](../../parser/connect.mjs), [payload](../../parser/automation.mjs), [guide](../guide/automation.md#connecting-to-other-services) | Tasks/events/numbers remain Jot; explicit command produces a bounded-scope JSON payload, including relevant selected fields/file label | **Read** source data only. No general prose POST on open, no execution of a URL written in a record. Destination bridges may perform their own configured actions |
| VS Code export-on-save | **Extension opt-in**; [extension](../../vscode/extension.js), [guide](../guide/automation.md#in-vs-code) | Rewrites the explicitly configured local export file; not the canonical journal format | Reader displays a prepared result. The setting is in VS Code, not an executable schedule carried in `.jotz` |
| iCloud Drive, Dropbox, Google Drive or a web folder | **External folder/subscription examples**; [guide](../guide/automation.md#in-vs-code) | Chosen exported file placed by the host in a synced/subscribed location | **Transfer**. No provider account connector, cloud journal upload or universal sync capability is established by these examples |
| cron, Task Scheduler, Apple Shortcuts | **External orchestration examples**; [guide](../guide/automation.md#ideas), [CLI](../../cli/README.md) | Whatever an explicitly configured CLI command writes or exports | Reader does not install or start these jobs. Date, cadence, warning or reminder fields are descriptive data, not executable recurrence |

The [specification](../../specification/Jot-Complete-Specification.md), sections 5.3–5.3.1, requires this separation.
Preserve an existing `sync` record as source and normally omit it from formatted reading. It is not a credential or
permission to retry a send. Future provider delivery receipts are planned as local adapter state outside portable writing;
that plan does not silently migrate or delete existing sync records.

Current Todoist deduplication uses a key derived from task date and text, not a complete remote-ID reconciliation
protocol. A changed date/text can be a new key; partial batch failure can leave remote successes before a local receipt
is written. Do not claim exactly-once delivery, complete retry reconciliation or two-way sync. A webhook payload can
contain sensitive task/event text, numbers and filename even though it excludes the rest of the diary.

There is no general Jot push-notification, email, SMS or OS-reminder integration established by these tools. A calendar
app, Shortcut or webhook destination may produce notifications under its own explicit configuration. Future optional
cues/read-aloud and OS dictation pathways in the [accessibility roadmap](../../specification/ROADMAP.md) are not background
reader jobs or shipped speech/notification service clients.

## Host files, browser and operating-system interfaces

| Interface | Current status/source | Saved or transferred data | E-paper and request boundary |
| --- | --- | --- | --- |
| Open/download and connected local file | **Host**; [device files](../../site/dist/device-files.mjs), [writing guide](../guide/writing-jot.md) | Explicit `.jot`, `.jotz`, `.jotlock` file bytes; host draft storage is separate | **Transfer**. Picker/save capabilities vary; ordinary download/open remains a fallback. A reader does not acquire filesystem authority from a record |
| Clipboard and text insertion | **Host**; [Writer](../../site/dist/studio.mjs), [live writer](../../site/dist/live-writer.mjs) | Only explicitly pasted/inserted writing; copying creates an external clipboard copy | **Read** the saved text; clipboard access is not needed to render it |
| Standalone HTML and Print/PDF | **Local host/extension export**; [export module](../../parser/export.mjs), [guide](../guide/writing-jot.md) | A separate rendered output, embedding available assets/fonts as supported; source remains Jot | Read a separately prepared raster or supported document. Export is not publication; inspect selected content/attachments. EPUB remains a **Planned** export track |
| Offline installation/service worker | **Host**; [browser session](../../site/dist/browser-session.mjs), [worker](../../site/dist/sw.mjs), [guide](../guide/browser-tools.md#install-and-work-offline) | Public application cache, separate from journal/asset storage | Reader/app can use already available local resources. Journal bytes, provider responses, models and keys do not enter the public offline allowlist |
| Persistent storage request and usage estimate | **Host**; [browser tools](../../site/dist/browser-tools.mjs), [guide](../guide/browser-tools.md#install-and-work-offline) | Browser retention preference, not an extra journal copy or backup | Platform can refuse/clear storage. Keep a file-copy fallback; no e-paper claim of browser storage support |
| Screen Wake Lock | **Host session option**; [browser tools](../../site/dist/browser-tools.mjs), [guide](../guide/browser-tools.md#install-and-work-offline) | No portable journal command | Explicit session choice; visibility/lock/replacement/lifecycle affect it. A source field does not keep an e-paper device awake |
| Outgoing Web Share / system share sheet | **Host**; [browser tools](../../site/dist/browser-tools.mjs), [guide](../guide/browser-tools.md#send-and-receive-writing) | Reviewed whole journal, selection or checked dated sections with chosen assets | **Transfer**. User chooses destination in OS UI, which may send elsewhere. Unsupported sharing falls back to download; opening a file never shares it |
| Incoming Web Share Target | **Host, platform dependent**; [worker](../../site/dist/sw.mjs), [guide](../guide/browser-tools.md#send-and-receive-writing) | Temporary local inbox item; reviewed insertion/opening is separate | Installed controlled worker is required. HTTP POST delivery may reach the host if the worker is unavailable; explicit local file import is the alternative |
| Temporary inbox and reviewed insertion | **Host**; [browser tools](../../site/dist/browser-tools.mjs), [guide](../guide/browser-tools.md#send-and-receive-writing) | Pending copies outside journal passphrase protection; accepted content/assets later persist into the document | **Transfer**. No automatic merge or implied backup. Review ID/metadata conflicts and a fresh insertion target; remove only after successful persistence |
| Nearby WebRTC data channel | **Host**; [nearby](../../site/dist/nearby.mjs), [guide](../guide/browser-tools.md#nearby-laptop-to-phone-transfer) | Reviewed file/excerpt sent to the receiver's inbox with payload verification | **Transfer**. Explicit pairing/code confirmation/send; same-network host candidates only, no STUN/TURN, internet pairing service or relay fallback. Not Bluetooth discovery |
| QR pairing / camera / pairing files | **Host**; [browser tools](../../site/dist/browser-tools.mjs), [guide](../guide/browser-tools.md#nearby-laptop-to-phone-transfer) | Temporary `.jot-pair.json` connection information, not writing | Camera only after Scan; file pairing is equivalent fallback. No microphone, remote journal lookup or automatic content send follows from scanning |
| Handwriting/annotated snapshot capture | **Host**; [annotation](../../site/dist/annotation.mjs), [guide](../guide/browser-tools.md#write-over-a-page) | Composed PNG, immutable background and editable `jot-ink` JSON in `.jotz` | **Asset**. Explicit capture/Done; no OCR or model call. Reader shows the composed image; stroke editing requires a separate editor/input capability |
| Image/scan correction | **Host**; [scanner](../../site/dist/scan/), [roadmap](../../specification/ROADMAP.md) | Original/corrected scan assets with links; recognition is not implied by correction | **Asset**. Use retained image/caption when recognition is absent; no remote OCR action or silent text replacement |
| Passphrase/recovery locking | **Local: Host + CLI**; [lock format](../../specification/Jot-Lock-v1.md), [guide](../guide/automation.md#locking-a-journal-with-a-passphrase) | Encrypted `.jotlock` copy and its supported wrapped-key information | Unlock support is a separate capability from `.jotz` reading. Do not render ciphertext or auto-unlock. Decrypted raster/search caches and an already visible panel need their own privacy treatment |
| WebAuthn PRF passkeys/security keys | **Host, capability dependent**; [lock format](../../specification/Jot-Lock-v1.md), [writing guide](../guide/writing-jot.md#locking-a-journal) | An additional configured way into a lock; private authenticator secrets are not journal text | No assumption of portable e-paper WebAuthn/browser-origin support. Passphrase/recovery are documented alternatives where supported |
| Tauri desktop/native file and archive bridge | **Implemented desktop wrapper, built from source**; [desktop README](../../desktop/README.md) | Same document bytes; native dialogs and bounded streaming archive access | **Transfer** to a separately implemented reader. Native desktop availability does not establish a device firmware port or all browser/OS APIs working in its webview |

Touch interaction uses visible labelled actions; button interaction uses the same actions through a focused list and
Confirm/Back. No camera, microphone, drag, pinch, share sheet or smartphone is a prerequisite for reading already saved
writing. The original X4's missing touch/audio/camera facilities must not be supplied by assumption.

## Data-export converters

These are **local file imports**, implemented in the [browser importer](../../site/dist/import/engine.mjs) and
[archive converter](../../converter/jot-archive.mjs), with the documented desktop streaming path. They are not live
account APIs. The [converter guide](../guide/converting.md#your-life-online) defines options and exclusions.

| Service/export | Current import scope | Saved/e-paper result |
| --- | --- | --- |
| X / Twitter | Selected archive posts/replies; reposts only if chosen | **Read + Asset**: dated own words, provenance/original link and optional packaged photos |
| Mastodon | Selected archive posts; boosts only if chosen | **Read + Asset** with the same explicit options; no federation connection |
| Facebook | Supported JSON posts; comments/places only through chosen options | **Read + Asset**; a place name is not a location-coordinate import |
| Instagram | Supported JSON posts; stories only if chosen | **Read + Asset**; no direct Instagram account or feed access |
| Tumblr | Supported blog export; reblogs only if chosen | **Read + Asset**; publication links stay references |
| Reddit | Supported CSV export and optional comments | **Read** selected own words under readable source dates |
| Google Takeout: Keep | Supported notes/lists | **Read**; lists become tasks where supported, not Google Keep sync |
| Google Takeout: Blogger | Supported blog posts | **Read + Asset** as available; no Blogger publishing API |
| Plain-text diaries / Project Gutenberg files | **Local browser + CLI converter**; [guide](../guide/converting.md), [converter](../../converter/jot-convert.mjs) | **Read** dated prose, preserved original date labels and optional explicit Julian conversion; no fetched document is silently treated as verified history |

All resulting archive journals are marked private. Missing/unreadable dates are skipped and counted, never guessed.
Messages, contacts/friends, login/IP/ad data and location coordinates are excluded; like/share counts are not written.
Images can stay source-location notes or become chosen package assets. Import limits and real-export compatibility are
separate from browser tests using synthetic samples.

The plain-text converter's **From a web address** is an explicit host fetch subject to the source's browser policy;
ordinary file download/import is the fallback. It is not permission for the e-paper reader to fetch every source URL.

**Not supported by the current archive importer:** Bluesky, LinkedIn, WhatsApp/other chats, Google Photos, YouTube history
and location history. The guide discusses MySpace/Internet Archive remnants as context, not a supported export adapter.
Already converted prose/images remain readable through **Read/Asset** regardless of their original service.

## Planned media providers: complete named backlog

Every addition in this table is **Planned** in the [media proposal](../proposals/media-sources-and-service-actions.md)
and [roadmap](../../specification/ROADMAP.md). Existing reads/references above are not upgraded to these new capabilities
by the presence of the same provider name.

For all rows: ordinary saved named links/text already use **Read**, and explicitly saved images use **Asset**. Proposed
new media/activity/provenance records remain generic preserved data until their semantics are specified and implemented.
The offline reader offers no account connection, refresh or outbound send. Any future action requires the separate
reviewed connected mode described above, with touch and button equivalents.

| Planned provider/capability | Proposed lookup/import or saved data | Separate proposed outbound boundary |
| --- | --- | --- |
| TMDB movies/TV/episodes | Disambiguated title, year, kind, season/episode and verified external identities | Lookup/insertion only at first; never invent an IMDb match |
| TMDB watch providers / JustWatch availability | Region/source/retrieval-time availability snapshot | Availability is not viewing, subscription access or a guaranteed playback deep link; Netflix, Disney+ and Prime are filters/brands, not independent connected accounts |
| Trakt | Verified movie/show/episode identity and chosen history/activity | Reviewed single watch first, then separately assessed watchlist/ratings; account/time/item review, rewatches and uncertain-send reconciliation |
| Spotify expansion | Catalog/library/playlist references beyond current capture/embed | Evaluate library saves and playlist additions separately; do not assume current OAuth capture grants these capabilities |
| YouTube Data API / podcast catalogs | Video/channel/playlist or show/episode title and identity | Selected query only; insertion does not start playback or subscribe |
| Open Library | Book/work/edition/author/ISBN references | Selected catalog lookup; editions must not merge by title alone |
| IGDB | Game title, year and platform | Catalog reference capability; not a completion/achievement write |
| ListenBrainz expansion | Selected listening history beyond current public current/recent reads | Explicit confirmed-listen submission; a journal mention is not a listen |
| Last.fm expansion | Selected history beyond current reads | Explicit confirmed scrobble under checked service rules; no shared-secret/password assumption |
| Jellyfin | Selected personal movie/TV-library references | Reviewed watched/favorite action against the selected compatible server |
| Audiobookshelf | Selected audiobook/podcast reference and progress | Reviewed progress/completion; item mention is not playback |
| Raindrop.io | Selected bookmarks/article references | Save chosen URL/tags/excerpt, not surrounding writing |
| Readwise and Reader | Selected highlights and reading references | Selected article/highlight operations through the appropriate separately verified API |
| Zotero account extension | Selected library source and bibliographic reference | Attach only a reviewed note to its selected source item; extend the general bibliographic track below |
| Steam | Game references and available activity/achievement information | Initially read-only; no assumption of general completion or achievement writes |
| AniList | Anime/manga references and chosen list state | Confirmed watching/reading status and supported episode/chapter/volume progress |
| Hardcover | Book/edition reference and selected reading-list state | Evaluate reading-status/progress writes; actual capability remains to be verified |
| SIMKL | Movie/TV/anime references and chosen history | Confirmed watched/watchlist actions subject to access/licensing verification |
| Inoreader | Selected article/feed references | Reviewed read/star/tag actions; no bulk action on open |
| OpenSubsonic-compatible servers | Selected personal music-library reference/favorites | Confirmed favorite/rating/listen only where the selected server supports it |
| gPodder-compatible services | Selected subscriptions and episode activity | Confirmed episode progress/played state with verified server compatibility |
| Supported pasted-media URL resolution | Readable title and verified identity from a known provider handler | No arbitrary remote URL fetcher; unsupported links remain ordinary links |

Priority in the source plan is shared media infrastructure, movie/TV lookup, then reviewed Trakt watch writes;
ListenBrainz, Raindrop.io and Audiobookshelf follow. This is a proposed delivery order, not a release date or live-account
validation. Source item identity and activity identity stay distinct; one film can be watched twice.

## Planned general autocomplete and local-source tracks

These are the ten explicit source tracks in the [roadmap](../../specification/ROADMAP.md), beyond current-journal
suggestions, opened People/Places books and MusicBrainz. Their stored output must be reviewed text/records/references;
on e-paper use **Read/Numbers/Asset**, never the original lookup operation.

| Planned track | Intended source/output | Request and offline boundary |
| --- | --- | --- |
| Jot schema and templates | Applicable types, field names, allowed values, units and prompt snippets | Local suggestions, not invented measurements/answers; choosing a profile does not execute its fields |
| Explicitly opened journal archives | Selected tags, references and entry links, including future books | No background filesystem scan or silently retained vocabulary; current-file reading still works without an index |
| vCard `.vcf` contacts | Reviewed People-book entries, stable IDs and repeated contact fields | Chosen file first; not permission to read an OS/cloud address book |
| Calendar `.ics` import | Selected event title/venue/source with UID, recurrence, zone, all-day/cancellation distinctions | This is a planned inbound track, separate from implemented outbound `.ics` export; attendance is never inferred |
| Open Library | Bibliographic work/edition/author/ISBN identity | Independently enabled catalog search; ordinary links/manual text offline |
| TMDB | Movie/TV/episode identity | Same media provider above, not a duplicate implemented adapter |
| YouTube Data API | Video/channel/playlist identity | Same planned provider above; no player loading from suggestion display |
| Wikidata | Public entity QID/type/multilingual labels | Disambiguate public identities; never merge private People/Places by name alone |
| Photon or Pelias place search | Reviewed named place/address/provider/coordinates | Explicit query through an appropriate service; no silent geolocation or timezone change |
| Zotero/BibTeX/CSL JSON imports and Crossref | Reviewed citation keys, DOI, title/authors/edition/version/provenance | Local import first and optional explicit DOI/title lookup; no copying article text into unsupported journal claims |

The proposals' phrase "existing Zotero track/adapter" describes the planned bibliographic work to extend; it does not
establish a shipped Zotero account connector. The roadmap labels these ten additions planned. Keep current local
reference-book support distinct from vCard, bibliographic or account imports that have not been delivered.

## Planned connected-context catalogue

All rows below remain **Planned** in the [smart-journal proposal](../proposals/smart-journal-and-connected-data.md),
except the narrow existing file/CLI foundations explicitly identified earlier. Each source's lookup, import, insertion
and outbound capabilities require separate verification. Saving context produces a snapshot, not a live-bound dashboard
that changes when the provider changes.

| Planned source/provider group | Proposed selected data | E-paper and request/action boundary |
| --- | --- | --- |
| Home Assistant | Chosen entity state/available history, identity, units and timestamps | **Read/Numbers** saved snapshot. Read-only on demand: no service calls, scenes/scripts, synthetic states or background subscriptions |
| Optional Home Assistant card | Writer launcher with selected read-only context first; embedded editing considered separately | No tokens/journal text in card configuration or URLs. No delivered card or assurance that iframe/auth/network policy works |
| Open-Meteo and regional environmental sources | Current/historical weather, forecasts, air quality, pollen, UV, marine conditions | **Numbers/Read** with observed/forecast/estimated labels and retrieval time; broader than the implemented CLI basic-weather helper |
| Sun/daylight calculations, moon-phase sources, public holidays/regional observances | Chosen place/date astronomy or occasion labels | **Read** saved values. A regional occasion is not personal participation; no midnight job or autonomous clock redraw follows |
| Google Calendar, Microsoft 365, CalDAV | Chosen event references/occasions | **Read** plans, not proof of attendance. Planned account/file imports are separate from current `.ics` export and external calendar consumption |
| Todoist, Microsoft To Do, Notion | Chosen tasks, projects and completed-work references | **Read** saved task state. Existing Todoist outbound command is narrower; no new import/write capability is implied |
| Strava | Chosen workouts/walks/activity | **Numbers/Read** with source/time; no activity inferred from a place or title |
| Fitbit and Oura | Chosen activity/sleep/measurement source records | **Numbers**. Existing CSV support is not live API access or a health interpretation |
| Apple Health / Health Connect native-adapter candidates | Supported selected measurements through a permitted native/file boundary | **Numbers**. Do not claim an ordinary browser can directly read native stores |
| Toggl Track, Clockify, ActivityWatch | Selected time entries/sessions | **Numbers/Read** durations and source; raw activity is not productivity/intent |
| GitHub and GitLab | Selected development references/activity | **Read** provenance and explicit activity; opening a commit reference does not query an account, modify a repository or prove work quality |
| OpenStreetMap-based services, event catalogs, regional transit sources | Chosen places, trails, venues/events and journey references | **Read/Asset** selected maps only if saved. Retain Photon/Pelias track; no location-history inference or automatic remote tile loads |
| Open Food Facts, USDA FoodData Central, recipe managers | Selected food/ingredient/recipe/source nutrition data | **Numbers/Read** with source/units. Lookup is not a record that the food was eaten |
| Public exchange rates, Actual Budget, Firefly III, financial-file imports | Selected rate or financial record | **Numbers/Read**; no default bank connection or transaction upload |
| iNaturalist and eBird | Selected species/observation references | **Read/Asset**; identification lookup is not a confirmed personal sighting or submission |
| Wikidata and museum collections | Selected knowledge/artwork identity and provenance | **Read/Asset** only for saved permitted assets; no public/private identity conflation |
| Chosen journals, contacts, files, RSS, CSV/JSON and supported automation bridges | Explicitly selected local or imported material | **Read/Numbers/Asset**; no background archive scan or arbitrary remote fetch. Existing file/CSV/webhook capabilities remain their documented narrower tools |

The proposed shared picker has favorites, filters, preview and undoable insertion. Favorites alone enable neither
network requests nor prose analysis. Proposed contextual suggestions are a separate setting, **off by default**;
when enabled they analyse only the active entry locally, and a selected suggestion precedes lookup and review.
This setting is not the current dedicated MusicBrainz search or current-file autocomplete, and is not implemented by
this rendering document.

The optional syntax track proposes typed TMDB/Trakt references and media/activity/provenance conventions. Keep existing
Spotify/IMDb/YouTube/MusicBrainz forms working; other providers can use named HTTPS links. Unknown record fields must
remain recoverable, but generic preservation is not implemented semantic interpretation of every proposed type.

## AI, publication and other adjacent tracks

| Integration/track | Current status/source | What can become journal/output data | E-paper and request boundary |
| --- | --- | --- | --- |
| OpenRouter BYOK companion | **Host**; [AI client](../../site/dist/ai-client.mjs), [guide](../guide/ai-companion.md) | Only explicitly reviewed/applied Jot fragments; keys, requests and pending candidates are session state | **Read** applied writing offline. AI and suggestions start off; only instruction and optionally captured selection are sent. No tools, browsing, remote file upload or automatic insertion |
| OpenRouter ZDR/provider policy | **Host request setting**; [AI guide](../guide/ai-companion.md#openrouter-privacy-and-zdr) | No portable credential or ZDR execution directive | `data_collection: deny` and parameter support are requested; separate ZDR toggle starts on. Routing policy is not E2EE or independently verified retention; never silently weaken/retry another provider |
| User-managed loopback OpenAI-compatible server | **Host**; [AI client](../../site/dist/ai-client.mjs), [guide](../guide/ai-companion.md#local-models) | The same reviewed Jot fragment | **Read** after insertion. Explicit request accepts localhost/127.0.0.1/::1, not LAN/arbitrary cloud URLs. Ollama and LM Studio are example server choices, not bundled runtimes; no cloud fallback |
| Bundled llama.cpp / GGUF inference | **Planned desktop exploration**; [proposal](../proposals/editor-and-local-inference.md) | Proposed reviewed generated fragment; model files remain outside journals | No e-paper inference/model-download claim. Explicit model choice/download and controlled helper lifecycle are proposed, not delivered |
| WriteFreely publishing adapter | **Planned**; [proposal](../proposals/writefreely-integration.md) | Reviewed title/body/publication metadata at a chosen account/collection; original Jot stays local | **Read** saved public reference offline. Publication/update/delete are separate reviewed actions; local relative assets do not automatically become public URLs |
| ActivityPub through WriteFreely | **Planned research**; [proposal](../proposals/writefreely-integration.md) | Possible publication/federation identity mappings, separate from portable private writing | Not a Jot federation server, universal social reader, messaging client or delivered interoperability claim; remote deletion cannot promise removal of recipient copies |
| Selective audience copies, anchored notes and collaboration | **Planned extension beyond current excerpt sharing**; [proposal](../proposals/notes-sharing-collaboration.md) | Proposed note/audience/share-log records and explicitly reviewed copies/merges | **Read** supported saved text; no live coediting, invitation, permission enforcement or automatic merge from a record. Current browser sharing does not implement the whole proposal |
| `.jotbook` multi-document books | **Planned**; [proposal](../proposals/jot-books.md) | Proposed ordered chapters and manifests; chapter reading position remains viewer data | Do not advertise current book-file support. Existing `.jot`/`.jotz` and explicitly opened documents remain the fallback |
| CodeMirror 6, Draftly, ProseMirror/Tiptap, Milkdown, editate | **Editor research/probes, not provider connections or a production replacement**; [proposal](../proposals/editor-and-local-inference.md) | Only an eventual source-preserving editing adapter could change writing | No e-paper service action or complete-Jot compatibility follows from an editor library name |
| Browser/OS dictation, optional read-aloud, local recognition/proofreading adapters | **Mixed baseline/planned**; [roadmap](../../specification/ROADMAP.md), [proofreading module](../../parser/proofread.mjs) | Current local writing hints and source; any later reviewed transcript/correction must preserve originals | **Read/Asset**. Do not infer a shipped speech provider, arbitrary language checker, OCR service or automatic transcription; external processing needs a separate explicit boundary |

## Complete rendering and integration acceptance

Use the [shared acceptance checks](README.md#acceptance-checks). For connected actions, additionally verify account, destination, payload, cancellation, partial delivery and duplicate prevention. Offline reading must continue when a service is unavailable. This catalogue is source-reviewed; no live provider connection was tested.

