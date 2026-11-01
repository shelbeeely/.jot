# Media autocomplete and connected service actions

Updated 1 November 2026. Status: planned expansion, not implemented integrations. The owner wants movies, television,
music, streaming services and other media in Writer's autocomplete, plus optional actions back to services such as Trakt.
Current-journal suggestions, explicitly opened reference books, MusicBrainz lookup and existing listening capture remain
the baseline. MusicBrainz lookup currently lives in the listening dialog; it is not general film/TV autocomplete.

The [smart-journal proposal](smart-journal-and-connected-data.md) adds broader sources, contextual suggestions off by
default, read-only Home Assistant and a separate optional syntax track. All additions below remain planned.

## Experience

1. While writing, explicitly open media suggestions and search a title, artist or pasted media URL. Offer local matches
   first; online sources are independently enabled. Do not send surrounding journal prose as the query.
2. Choose a result with enough context: movie versus TV series, year, artist, release edition, season and episode.
   Insert a readable reference as an undoable edit. Ordinary prose and manual links remain sufficient.
3. Optionally record an activity: watched, listening/listened, want to watch, rating or another supported action.
   Mentioning a film, quoting it, planning to watch it and watching it are different things.
4. For a watched movie, offer **Mark watched on Trakt**. Review the exact movie, account and watched date/time, then send
   that activity. The journal text, reflections and unrelated entries stay local. A saved journal remains saved if sending fails.
5. Show pending, confirmed, failed or uncertain delivery with a retry/reconcile path. A local journal save is not a remote
   success receipt. Existing account history can optionally supply suggestions through a separately enabled import.

No connection is necessary to journal. Public service account visibility can expose the activity being sent; explain
the selected destination at the action rather than introducing a general account setup requirement.

## Provider coverage

| Area | Initial source / destination | Scope and limits |
| --- | --- | --- |
| Movies and TV | TMDB catalog; Trakt identity/history | Search movies and series, drill into seasons/episodes, preserve verified external IDs. First outbound target is Trakt watched history; watchlist and ratings follow independently. |
| Streaming availability | TMDB watch providers, powered by JustWatch | Country-specific subscription, rental and purchase availability, with source attribution and lookup time. This is availability metadata, not Netflix/Disney+/Prime account access or proof of viewing. TMDB provides an availability page link, not guaranteed individual playback deep links. |
| Music | Existing MusicBrainz; Spotify candidate | Artists, recordings/tracks, works, albums and editions; pasted service URLs. Evaluate Spotify library saves and playlist additions separately from listening-history reporting. |
| Listening history | Existing chosen listening capture; planned ListenBrainz and Last.fm integrations | Import selected listening history and track references; submit confirmed listens/scrobbles under each service's rules. A journal mention must not fabricate a listen or a playback timestamp. |
| Personal movie/TV library | Planned Jellyfin integration | Find references in the user's library; optionally mark a selected item watched or favorite. Verify the target server's version, authentication and supported actions. |
| Anime and manga | Planned AniList integration | Find titles and selected lists; update confirmed watching/reading status and episode/chapter/volume progress where supported. |
| Additional watch tracking | Planned SIMKL integration | Movie, TV and anime references/history; optional confirmed watched or watchlist actions, subject to access and licensing review. |
| Podcasts and video | YouTube and podcast catalog candidates; Spotify where available | Distinguish show/channel, episode/video and playlist. Search/reference insertion does not start playback or require an embedded player. |
| Books and audiobooks | Existing planned Open Library and bibliographic tracks; planned Audiobookshelf integration | Work versus edition, authors, ISBNs and references. Audiobookshelf adds audiobook/podcast references and selected progress, with optional confirmed progress/completion updates. Do not assume every reading app permits writes. |
| Personal reading | Planned Hardcover integration | Book/edition references and chosen reading lists; evaluate confirmed reading-status/progress updates against the current API. |
| RSS reading | Planned Inoreader integration | Selected articles and feeds; optional reviewed read, star and tag actions. Verify application access before committing support. |
| Personal music library | Planned OpenSubsonic-compatible integration | Library references and selected favorites; optional favorite, rating and confirmed listen submission according to server capabilities. |
| Podcast synchronization | Planned gPodder-compatible integration | Selected subscriptions and episode activity; optional confirmed episode progress or played-state submission. Verify server compatibility and availability. |
| Bookmarks and articles | Planned Raindrop.io integration | Find saved bookmarks; optionally save a chosen link with selected tags or an excerpt. Do not send the surrounding journal entry. |
| Highlights and reading | Planned Readwise and Reader integrations | Import selected highlights and reading references; save a chosen article or highlight through the corresponding API. Verify subscription/access requirements. |
| Research references and notes | Existing Zotero/BibTeX/Crossref track, extended with planned Zotero account actions | Look up chosen bibliographic references; attach a selected note to its source item. Extend the existing Zotero adapter rather than duplicate catalog or import work. |
| Games | Planned IGDB catalog and Steam integrations | Titles, release year and platform; Steam game references and available activity/achievement data. Start Steam read-only and do not assume journal completion can be written back as a game achievement or completion state. |
| Pasted media URLs | Planned shared URL-resolution capability | Resolve supported URLs into readable titles and verified provider identities without requiring the user to choose a source first. Unsupported URLs remain ordinary links; no arbitrary server-side URL fetching. |
| Other services | Provider adapters and supported file imports | Add only capabilities established by the service's API. Restricted services may offer URL references or imports without live account access. No scraping private account pages. |

Every new integration above is planned, with authentication, API access and compatibility verification required before
release. Provider capability evidence is linked below; it does not establish available credentials, approved applications
or completed interoperability. Retain TMDB, Trakt, Spotify, YouTube, Open Library and IGDB alongside the added services.
Streaming brands are availability filters when the catalog supplies them; they are not automatically separate integrations.

## Shared media identity and autocomplete

Use a provider-neutral result model: media kind, readable title, year/date, creator, edition/platform, parent series and
episode coordinates where applicable, verified provider IDs, canonical URL, source and attribution. Keep watch availability
separate, with region and retrieval date. A title match alone cannot merge editions, remakes or similarly named episodes.

Implement catalog lookup, chosen account-history import, availability lookup and outbound actions as separate capabilities
of each provider. The UI exposes only the supported capabilities. Debounce, cancel stale searches, bound caches and
requests, handle quotas and malicious titles/URLs, preserve IME and keyboard navigation, and keep offline writing usable.
Cache retention and attribution follow each provider's terms; do not mirror catalog datasets.

Use existing named links and supported records first. The optional syntax track in the smart-journal proposal covers
new typed references and media/activity/provenance conventions; it does not change the current grammar or establish
semantic parser support. Normative changes require specification review, preservation fixtures and implementation.

Contextual suggestions are separately enabled in settings and default off. Their processing is local to the active
entry; on-demand query autocomplete remains available without analyzing prose. Selecting a contextual suggestion precedes
external lookup, and insertion is separately reviewed. No private prose is sent to providers.

## Outbound actions and optional automation

Begin with per-item send actions. Separately offer opt-in rules such as **send confirmed watched entries to my Trakt
history** after the user chooses that destination and data scope. Rules operate on explicitly confirmed activities,
not prose analysis, autosave, a bare title reference, imported account history or opening an old journal.

Each activity needs an identity distinct from the movie/episode identity: watching the same film twice is valid.
Track destination, action, selected media IDs, chosen event time/timezone, payload version and remote receipt locally,
outside the portable/shared journal. Do not claim event time from the journal's save time. Bound bulk episode actions;
selecting a series must not mark every episode watched.

Deduplicate an operation, not every occurrence of a title. Reconcile existing remote history after uncertain responses
before retrying a non-idempotent add. Handle partial batch success and account changes; do not send an old pending action
under a newly connected identity. Editing/deleting local prose does not silently delete remote history. A reversal is a
separate supported action against the matching remote receipt, never a broad removal of all watches of that title.

Remote history imports retain provenance and must not loop back out as newly watched activity. Prefer field-specific,
reviewed updates to whole-entry or whole-library synchronization. Disconnecting stops queued network writes.

## Authentication and delivery

Trakt requires a registered application and OAuth for account actions. Its current documentation recommends authorization
code with PKCE, without a client secret for user sign-in. Verify registered redirects, state, token exchange, CORS and
the target account before shipping. Use memory-only browser credentials initially; remembering credentials requires a
separate secure-storage design, such as an implemented desktop credential store. Do not place tokens in journal files,
exports, browser localStorage or committed configuration. Do not assume a backend is necessary or unnecessary before
testing the provider's actual flow.

Spotify endpoints and development access changed in 2026; validate the current library/playlist APIs and app eligibility
rather than copying legacy endpoints. Each provider needs an independent capability/access check and connection status.
No accounts were connected, applications registered or external writes performed during this research.

## Delivery order and acceptance

1. Shared media result/provider contract, supported pasted-URL resolution and a Writer media picker beyond the listening
   dialog. Retain MusicBrainz. Validate provider URL hosts and identifiers; use canonical provider lookup endpoints.
2. TMDB movies/TV search, reliable episode selection, named reference insertion and optional regional availability.
3. Trakt connection and reviewed single-movie/single-episode history writes, with recovery and duplicate prevention.
4. Trakt ratings/watchlist, selected history import and carefully scoped opt-in activity rules.
5. Prioritize ListenBrainz, Raindrop.io and Audiobookshelf next, after their individual API/authentication reviews.
6. Keep Last.fm, Jellyfin, Readwise/Reader, the extended Zotero adapter, read-only Steam, AniList, Hardcover, SIMKL,
   Inoreader, OpenSubsonic and gPodder in the planned backlog, alongside the remaining Spotify, YouTube, Open Library,
   IGDB and podcast work. No dates or live support are promised.

Physical hardware and firmware remain deferred. This expansion concerns Writer software and optional service adapters.

Acceptance includes ambiguous titles, remakes, episode identity, manual/offline references, unsupported services, revoked
tokens, rate limits, account switching, rewatches, date/timezone review, partial responses, timeout reconciliation,
offline pending work, cancelled sends and exported journals containing neither credentials nor private delivery receipts.
Include supported and unsupported pasted URLs, spoofed provider hosts, reading/library item identity, progress/completion
review, selected-excerpt boundaries and read-only destinations offering no outbound controls.
Use mocked API tests separately from explicit live-account verification. No integration is shipped merely by listing it here.

## Evidence

- [Trakt developer introduction](https://developer.trakt.tv/): watch history, lists and API concepts.
- [Trakt authentication](https://developer.trakt.tv/docs/authentication-oauth): OAuth and PKCE.
- [Trakt API use policy](https://developer.trakt.tv/docs/api-use-policy): permitted user actions, account limits and data reuse.
- [TMDB movie watch providers](https://developer.themoviedb.org/reference/movie-watch-providers) and
  [TV watch providers](https://developer.themoviedb.org/reference/tv-series-watch-providers): regional availability and attribution.
- [Spotify 2026 migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide):
  changed library/playlist endpoints and development access.
- [ListenBrainz API](https://listenbrainz.readthedocs.io/en/latest/users/api/core.html) and
  [Last.fm scrobbling](https://www.last.fm/api/show/track.scrobble): listen-history submissions.
- [Jellyfin user-data API](https://typescript-sdk.jellyfin.org/classes/generated-client.UserDataApi.html): played and favorite actions.
- [Audiobookshelf API](https://api.audiobookshelf.org/): library and user progress operations.
- [Raindrop.io bookmark API](https://developer.raindrop.io/v1/raindrops/single): bookmark read/write operations.
- [Readwise highlights API](https://readwise.io/api_deets) and [Reader API](https://readwise.io/reader_api):
  selected highlight and document operations.
- [Zotero API write requests](https://www.zotero.org/support/dev/web_api/v3/write_requests): selected library-item/note updates.
- [Steam user stats API](https://partner.steamgames.com/doc/webapi/isteamuserstats?l=english): available achievement/stat reads;
  this is not evidence of a general-purpose game-completion write API.
- [AniList mutations](https://docs.anilist.co/reference/mutation): list-entry and progress operations.
- [Hardcover API](https://docs.hardcover.app/api/getting-started/): book/library access; current write support needs verification.
- [SIMKL API](https://api.simkl.org/): movie/TV/anime tracking; check application access and licensing.
- [Inoreader API](https://www.inoreader.com/features/api): article, feed and tagging operations.
- [OpenSubsonic media annotation](https://opensubsonic.netlify.app/categories/media-annotation/): per-server capabilities.
- [gPodder client/API documentation](https://github.com/gpodder/mygpoclient): episode-action synchronization.

Research basis: `docs/methods/digital-daily-notes.md, line 711` rejects third-party journal-content sync and accounts;
the chosen activity-only export keeps journal content local, while adding the owner's explicitly requested optional
service connection. The same guide's objection to activity-based suggestions is not evidence against a user-requested
lookup: this proposal avoids background collection. `docs/methods/expressive-writing.md, line 443` supports private writing
unless the person chooses sharing. These inform the boundary; neither guide establishes media integration efficacy.
