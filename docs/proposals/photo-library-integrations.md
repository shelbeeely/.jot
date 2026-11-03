# Photo-library integrations for Jot Writer

Updated 1 November 2026. Status: **planned, not implemented**. The owner requested Immich alongside Google Photos and iCloud Photos, including Apple users despite not using Apple personally. This is Writer integration work within the 0.1.0 → complete-v1 roadmap; existing generic attachments do not constitute dedicated connectors. No account connection, external write or deployment was performed.

## Whole-document offline requirement

The entire saved journal must read offline, not just text or photo thumbnails. Download and validate every selected original/component before confirming attachment or offline completeness; preserve a clear pending/error state on cancellation, expiry, quota or size failure. Save a provider-independent copy and reviewed snapshots. Imported media must remain usable in a fresh compatible reader without its source account or browser cache. Codec/preview limits need declared capabilities or explicit local renditions, not silent data loss. Test local unlock and open/edit/save/reopen with network disabled; external citations are optional references. This extends all providers and document content, not only photo import.

## Shared experience

Choose a source explicitly, select photos/videos, review the result, then attach selected media to an entry as an undoable operation. Album/date/metadata search is available only where the provider permits it. A photo is a possible writing aid, not proof of an event, mood, attendance or relationship. No unsolicited memory prompts, background library scan/backup or journal text sent as a search query. Contextual suggestions retain the independent default-off setting.

The resulting `.jotz` contains the selected bytes, not just a provider URL. It must reopen offline and remain useful if the provider account disappears. Preserve verified source identity/provenance and original content where selected; classify preview/converted files as derivatives. Reuse existing media IDs and readable `.jot` references. Never place credentials, OAuth tokens, temporary signed URLs or delivery receipts in the journal.

A review distinguishes inserting capture time/location into entry source from preserving original EXIF embedded in the file. Omitting a visible location field does not strip GPS from an original. Any metadata stripping, resizing or conversion needs explicit review; unsupported rendering must not silently discard an original. Respect current size/memory limits and protection for imported media and all derived previews. Multi-part Live/Motion Photos need component preservation and a readable fallback, not a misleading flat-image conversion claim.

## Immich: preferred first implementation

Use the user's explicitly selected server and the public API. The repository documents photos/videos, albums, EXIF, metadata search, API keys and original downloads. Inspected OpenAPI endpoints include `GET /albums`, `GET /albums/{id}`, `POST /search/metadata`, `GET /assets/{id}`, `GET /assets/{id}/thumbnail` and `GET /assets/{id}/original`. The schema declares `x-api-key` authentication and endpoint permissions such as `asset.read` and `asset.download`; request only the permissions required by the actual selection flow. Check album permissions separately. POST search does not imply a library mutation.

Pin and test a supported server/API release before implementation. The inspected main-branch schema reports `3.4.0-rc.0`; it establishes available API shapes, not a stable supported-version commitment. No need to deploy or embed Immich, reuse its server code, or make Jot a photo-backup service. No upload, deletion, album edits, account administration or facial-recognition processing in the initial connector.

A self-hosted instance may be local HTTP, private HTTPS or VPN-only. Verify HTTPS/mixed-content, certificates, browser CORS/CSP and native-network access rather than promising all instances work in a hosted web page. Any native bridge must restrict requests and credentials to the chosen origin and handle redirects safely; do not introduce an unrestricted proxy or wildcard network exception. Use session-only credentials under the existing connected-source policy.

## Google Photos: Picker rather than unrestricted library browsing

Google's 2025 API changes removed broad Library API scopes for existing-library reading/sharing; remaining Library API reads focus on app-created content. Use the Google Photos Picker API to select existing user photos. The current scope is `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`.

The planned flow is OAuth → create picker session → user selection → bounded session polling → list selected items → authorized download → review/attach → session cleanup where supported. The media guide says content base URLs last 60 minutes and requests require OAuth authorization. Acquire selected content in time; do not persist those URLs as portable media links. Handle pagination, video readiness, cancellation, expiry and denied/revoked authorization without editing the journal. Verify browser and native OAuth redirect configuration, scopes, quotas and any required Google app verification before release.

Google Takeout is a separate optional local-import adapter: review export media and sidecar metadata before attachment, preserve conflicts/unknown times and apply archive limits. It is not equivalent to a live Picker connection and must not silently ingest a whole library.

## Apple Photos and iCloud Photos: native selection plus cross-platform imports

Apple documents PhotoKit/PhotosUI access to assets managed by Photos, including iCloud Photos and Live Photos. System picker flows can return only selected items without requesting full-library access. Broader PhotoKit operations require the appropriate authorization; do not request full access merely for attaching a photo. Cloud-backed files may need asynchronous downloads, progress, cancellation and failure handling. Returned metadata can differ after transcoding.

Plan native Photos/PhotosUI selection on supported iOS/macOS hosts. The Writer web app cannot call native PhotoKit directly. Exact picker/bridge APIs and support versions need platform evaluation rather than assuming identical APIs on every Apple OS. Verify actual Apple devices and native hosts before advertising support.

For other platforms, retain explicit downloaded-file import: Apple documents downloading selected media through iCloud.com and viewing iCloud Photos in File Explorer/Microsoft Photos using iCloud for Windows. Import only files the writer chooses. Web/Android/Linux remain supported through file imports and shared-file handoff where available; these are not direct iCloud account connections.

The reviewed Apple documentation does not establish a general public browser API for enumerating a user's iCloud Photos library. CloudKit is not a substitute for access to that system library. Do not implement Apple-account password collection, private iCloud API scraping, account-session-cookie extraction or a mandatory Mac/server proxy to claim parity. Apple support means a documented supported route, not pretending every platform has identical capabilities.

## Delivery and acceptance

1. Shared media review, provenance, safe asset insertion and size-limit feedback.
2. Immich read-only connector, pinned server fixture and live-instance verification.
3. Google Picker and separate reviewed Takeout import, with fictional transport fixtures before live-account checks.
4. Apple native picker/bridge, with downloaded-file imports available on other platforms.
5. Cross-platform capability matrix: albums/date search, original/derived content, video/multi-part support, offline reopen and authorization limits.

Acceptance includes malicious filenames/metadata, missing assets, duplicates, provider timezones, absent timestamps, HEIC previews, rotation, large videos, expired downloads, server errors, cancellation, page/app closure or locking, credential revocation, undo, protected-media round trips and archive export without provider access. No live account verification or dedicated photo connector implementation is claimed by this plan.

The format's asset, protection and preview contracts are prerequisites. If implementation needs new normative semantics, update the format roadmap/specification and corresponding Writer behavior together under `AGENTS.md`; do not add a new opaque journal format or provider dependency to source parsing.

## Research and limitations

`docs/methods/digital-daily-notes.md, line 459` summarizes a small self-selected photo-trigger study and explicitly notes limited findings; it supports exploring user-chosen photos, not claiming therapeutic benefits. `docs/methods/expressive-writing.md, line 443` says “Keep it private unless you choose.” `docs/methods/digital-daily-notes.md, line 711` rejects third-party journal-content cloud sync in that guide's context. Importing chosen existing photos is distinct from uploading journals or introducing background sync. Provider authentication, metadata review, API ordering and platform bridges are engineering choices; the guides do not establish their technical feasibility.

Primary technical sources, retrieved 1 November 2026:

- [Immich features](https://github.com/immich-app/immich#features) and [published OpenAPI source](https://github.com/immich-app/immich/blob/main/open-api/immich-openapi-specs.json). Main-branch schemas change; pin an implementation target.
- [Google Photos Picker getting started](https://developers.google.com/photos/picker/guides/get-started-picker), [API changes](https://developers.google.com/photos/support/updates), and [retrieving selected media](https://developers.google.com/photos/picker/guides/media-items).
- [Apple PhotoKit](https://developer.apple.com/documentation/photokit) and [selecting photos/videos in iOS](https://developer.apple.com/documentation/photokit/selecting-photos-and-videos-in-ios).
- [Apple: download iCloud photos and videos](https://support.apple.com/en-us/111762), including iCloud.com and Windows routes.
