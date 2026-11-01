# Connected sources

Choose **Tools → Connected sources** in Writer. The first source is **Weather · Open-Meteo**. Other sources, including read-only
Home Assistant, are on the roadmap. You can keep writing without connecting anything.

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

Contextual suggestions remain unimplemented/off; this tool does not analyze surrounding prose. Home Assistant, additional media
sources and confirmed external service actions remain separate milestones. Tests use mocked weather responses and Chromium;
live service access and native desktop-webview behavior have not been verified.
