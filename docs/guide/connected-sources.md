# Connected sources

Choose **Tools → Connected sources** in Writer. Choose **Weather · Open-Meteo** or **Home Assistant · read-only**. Additional providers remain on the roadmap. You can keep writing without connecting anything.

Enter latitude, longitude, a day and its timezone, then choose **Look up weather**. UTC starts selected; change it if your weather
day belongs to another timezone. No location permission or place search is requested. Only these lookup fields go to Open-Meteo;
your journal text, passphrase and AI key do not. Opening this tool or typing in your journal makes no weather request.

Choose dates from 1940 through the next 14 days. Older dates use the historical archive; recent dates and future days use the
forecast endpoint. Coverage and availability depend on the provider, and the tool rejects a response for a different day rather
than substituting current weather. Historical output is a **model estimate**, and recent/future output is **forecast model data**.
Daily totals can be incomplete. Neither is proof of the weather you personally experienced.

Review the exact Jot source, then choose **Add reviewed snapshot**. This adds a weather observation record and temperature-high,
temperature-low and precipitation measurement records at the captured caret. They keep the chosen date/timezone, units, source,
retrieval time, model-data kind, coordinates and attribution. A missing temperature or rainfall value stays missing; zero means an
actual reported zero. These snapshot fields use readable existing records; full cross-provider semantic validation remains planned.
Your saved snapshot does not change when provider data changes. No mention of a place automatically creates a record.

If you edit your journal while reviewing, insertion stops. Put the caret where you want the snapshot, choose **Use current caret**,
then add it. Undo removes the insertion. If local saving fails, **Retry save** retries the same insertion; download the journal if
browser storage remains unavailable. Cancel lookup, close the tool or lock the journal to stop pending work. Provider failure does
not change your writing. There is no automatic retry or substitute service.

Coordinates are included in the reviewed source and will travel with the journal when you share it. Pending results and lookup
fields are held in page memory; locking/replacing the journal clears them. They are not written into the offline application cache.
The normal browser draft retains snapshots after you explicitly add them; locked journals use their existing encrypted storage.

[Open-Meteo](https://open-meteo.com/) supplies the weather data, with [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
attribution retained in the inserted source. Its public endpoint is intended for non-commercial use under its
[current terms](https://open-meteo.com/en/terms). Commercial deployments need an appropriate service agreement; this first
adapter does not implement a customer API-key endpoint. Quotas, provider availability, browser CORS and network policies apply.

## Read-only Home Assistant

Choose **Home Assistant · read-only**, enter your instance origin, a session access token and one to five entity IDs, such as
`sensor.living_room_temperature`. Use an access token created in your Home Assistant profile. The origin must be HTTPS with no path, query or credentials; HTTP is allowed only for loopback
(`localhost`, `127.0.0.1`, `[::1]`). This tool does not provide a proxy for insecure local-network instances. Changing the instance
clears the token so it cannot be reused silently on another host. A token may grant broader server permissions than Jot uses.

Choose **Current states** or **History**, then **Read selected entities**. History needs start and end timestamps with seconds and
an explicit UTC offset, such as `2026-10-01T09:00:00Z`. It is limited to a past interval of seven days and 200 returned states in
total. Each entity response is bounded to 512 KiB. Narrow the interval or selection if the server returns too much; Jot does not
silently truncate the history. Only the selected state/history endpoints are requested. There is no whole-house entity scan,
websocket subscription, service call, scene/script trigger or device-state write. Browsers may make a CORS preflight request.

Review before adding. Numeric reported states become measurement records; text, unknown/unavailable states and missing entities
become observations. Records preserve entity identity, units, server update time, optional last-changed time and retrieval time.
They say `data-kind: reported`: a server value is not proof of what you did or a direct physical measurement. A history response
can include a state that predates the selected start so you can see the state at the boundary. That row keeps its original time
and `boundary-state: true`; it is not an event that happened within the interval. Missing/expired history is explicitly marked
`availability: no-history`, without requesting current readings as a substitute.

Only the reviewed state, name, unit and timestamps are retained, not arbitrary entity attributes. The access token is sent only
in the Authorization header to the chosen instance, never in the URL, journal, offline cache or local/session storage. Redirects
are rejected. Closing this tool (including Escape), switching providers, changing the instance, locking/replacing the journal or
leaving the page clears the token. A save retry uses the already reviewed snapshot and does not repeat the network lookup.
Instance addresses and selected entity IDs are included in the preview and saved records; consider them before sharing a journal.

Your server must allow the exact Writer origin under Home Assistant's
[CORS configuration](https://www.home-assistant.io/integrations/http/#cors_allowed_origins). For example, allow the actual HTTPS
origin hosting your Writer; a path such as `/write/` is not part of the origin. Use your own server's trusted HTTPS address and
certificate. Private-network browser permissions, proxies and server/account permissions can still block access. The native
desktop app's existing network policy supports loopback instances; arbitrary HTTPS Home Assistant hosts are not added to its
allowlist by this change. Do not put a token into a dashboard card, launch URL or CORS configuration. The optional Home Assistant
card remains a separate design exploration. See the [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/).

Contextual suggestions remain unimplemented/off; this tool does not analyze surrounding prose. Additional media sources and
confirmed external service actions remain separate milestones. Tests use mocked weather/Home Assistant responses and Chromium;
live instance authentication, real CORS/private-network access and native desktop-webview behavior have not been verified.
