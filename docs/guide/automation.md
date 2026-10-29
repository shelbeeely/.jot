# Automation and connections

A `.jot` is plain text, but the tasks, events and numbers in it can be read by a program. This guide covers what you can do with
them: put your events on your calendar, bring in numbers from a fitness app, carry unfinished tasks forward, and connect to other
services.

**What gets sent, and when.** Nothing in Jot reaches the internet unless you run something that says it will, or turn on a setting
that says it will. Calendar, CSV and journal-writing tools work locally. Spotify sign-in and playback fetches contact Spotify only
when chosen. Service results become ordinary Jot: structured import records or a readable listening note. Your journal text is not
sent to Spotify, and the `.jot` file stays the master copy.

## In the workspace: the Tools row

Above the writing, in **Write**:

**Commands** (Ctrl+K / Cmd+K) searches these tools together with formatting, find/replace, the outline and editable entry templates.
On mobile, use **All tools** to expand the secondary buttons. Each template is reviewed before insertion; its prompts stay blank
until you fill them in. Writing tools, templates, suggestions and search run locally.

| Tool | What it does |
| --- | --- |
| **Music & background media** | adds a plain-text music note, optionally filled from Spotify after sign-in and review |
| **Today ＋** | adds today's dated entry, if there is none, and puts the cursor in it |
| **Carry tasks forward →** | open tasks from earlier days are marked `[>]` (moved) where they were, and written again under today |
| **Week review** | adds a review of this week: how many tasks were done, which are still open, each number's average, a chart and two questions |
| **Calendar .ics ↓** | your events and dated tasks as a calendar file: import it into Google Calendar, Apple Calendar, Outlook … |
| **Numbers .csv ↓** · **Tasks .csv ↓** | the numbers (date, metric, value, unit) or the tasks, for a spreadsheet |
| **Import numbers ↥** | numbers from a CSV (a health or fitness app's export) written into their days |

A tool that changes your writing does it in one step, so **Ctrl+Z** (**Cmd+Z** on a Mac) takes it back.

## Events and tasks on your calendar

The calendar file has:

- **Events** (lines starting `o `). If the line has a time (`19:00`, `7:30pm`, `at 21`) the event is an hour long at that time;
  otherwise it lasts all day. A bare "at 7" is not a time: morning or evening? Write `7pm` or `19:00`.
- **Tasks** that are open (`[ ]`, `[!]`) on a dated day, as to-dos due that day. Done, moved and cancelled tasks are left out.

```jot
### 2026-10-28 | Wednesday

o Dentist 09:30
o Market, all day
[ ] Post the letter
```

Each event and task keeps the same identity in every export, so importing a newer file updates entries instead of adding them twice.
Google Calendar shows events but not to-dos: in VS Code, turn on `jot.automation.calendar.tasksAsEvents` to put tasks in as all-day
events too.

## Numbers from a fitness or health app

Most apps (Google Fit, Garmin, Fitbit, sleep and step counters, a spreadsheet) can export a CSV. Jot needs one column of dates and
columns of numbers; the column names become the metrics, and a unit in brackets is kept (`Sleep (h)` becomes metric `sleep`, unit `h`):

```
Date,Steps,Sleep (h)
2026-10-26,8200,7.5
2026-10-27,6400,6.75
```

- Each number goes into its day. If your template has an empty `value:` for that metric on that day, it is filled in where it is;
  otherwise the number is added at the end of the day as a measurement, with `source:` naming the file.
- A day that already has that number is left alone, so importing the same file twice adds nothing.
- Several rows on one day (steps by the hour) are added up in the workspace. On the command line or in VS Code you can choose to
  average them instead (heart rate), or keep the last.
- Dates like `2026-10-26`, `2026/10/26` and `2026-10-26 07:30` always work. A date like `03/04/2026` could be either way round, so
  it is left out and counted; on the command line, `--day-first` reads it as the 3rd of April.

The numbers then chart like any others: see [Numbers and charts](template-editor.md#numbers-and-charts).

## Health data

**Import health data** in the Tools row reads a health app's own export and writes one number per day for each kind you choose. It
works on this device: nothing is uploaded, no account is needed, and nothing changes until you press **Add to journal** (Ctrl+Z takes
it out again).

- **Apple Health**: in the Health app, tap your picture, then **Export All Health Data**. Unzip `export.zip` and choose
  `apple_health_export/export.xml`. The file can be very large; it is read in pieces, up to 2 GB.
- **Health Connect, Google Fit, Fitbit, Garmin, Oura**: choose the daily CSV the app (or an export app) writes. Known columns are
  read with their units; others are listed as left out. A CSV Jot doesn't recognise is read like any other numbers CSV, still without
  the columns listed under "Never read" below.

You then tick the numbers you want and choose the dates (the last 30 days to begin with); the dialog shows how many days each has and
every record it will add or fill. How a day's readings become one number:

| Number | Metric | A day's number |
| --- | --- | --- |
| Steps, distance, active energy, flights, exercise minutes | `steps`, `distance`, `active-energy`, `flights`, `exercise` | the day's total. When two devices count the same day (a phone and a watch), the larger total is used, not both added |
| Heart rate, resting heart rate, heart rate variability, blood oxygen, respiratory rate | `heart-rate`, `resting-heart-rate`, `hrv`, `spo2`, `respiratory-rate` | the day's average. The lowest and highest (`heart-rate-min`, `heart-rate-max` …) are there to tick if you want them |
| Sleep | `sleep` (h) | hours asleep (not in bed, not awake), every source merged so overlapping apps count once, given to the date you woke up. A nap counts on the day it ends |
| Body mass, body fat | `body-mass`, `body-fat` | the last reading of the day |
| Mindful minutes | `mindful` (min) | the day's total, overlapping sessions counted once |

A reading belongs to the day written in the export, in the time zone it was recorded in. Units stay as the app wrote them (kg or lb,
km or mi); a metric recorded in two units becomes two metrics (`body-mass-kg`, `body-mass-lb`) rather than being converted, and sleep a
CSV counts in minutes or seconds is `sleep-minutes` or `sleep-seconds`, so it never shares an axis with hours. A template blank whose
`unit:` differs from the number's is left empty and counted. The one change is blood oxygen and body fat, which Apple writes as fractions (0.97) and Jot as the percent they mean
(97 %). Each record says how its day was counted and where it came from:

```jot
### 2026-10-26 | Monday

:::record measurement #sleep-2026-10-26
metric: sleep
value: 7.25
unit: h
aggregation: sum
source: Apple Health export.xml
:::
```

Never read, whatever the file holds: medications, lab results and clinical records (including `export_cda.xml`), reproductive and
sexual health, and location (workout routes, latitude and longitude columns). They stay in the export, out of a journal you may share,
sync or print. Readiness, sleep and stress scores are an app's calculations rather than measurements, so they are left out too, and
Jot never turns any number into a statement about your health.

On the command line, `jot import-health export.xml --list` shows what a file holds; then, for example,
`jot import-health export.xml --into journal.jot --metric steps --metric sleep --since 2026-10-01 --dry-run`.

## The jot command line

`cli/jot.mjs` in the Jot project (Node 20 or later) does the same things from a terminal, so scripts, scheduled jobs and Apple
Shortcuts can use them:

```
jot tasks journal.jot --status open          # today's to-do list, anywhere
jot events journal.jot --since 2026-10-01
jot numbers journal.jot                      # CSV
jot ics journal.jot -o ~/Calendars/jot.ics   # a calendar file
jot import fit.csv --into journal.jot        # numbers in, into their days
jot import-health export.xml --into journal.jot --metric steps --since 2026-10-01
jot today journal.jot                        # today's entry
jot rollover journal.jot                     # carry open tasks to today
jot review journal.jot                       # this week's review
jot json journal.jot                         # everything, as JSON
jot query journal.jot                        # the answers to the query records in it
jot query journal.jot --show tasks --tag health --period week   # or ask one here
```

The reading commands never change a file. The writing commands say what they changed, and `--dry-run` prints the result instead of
saving it. `jot help` lists every option.

## In VS Code

The Jot extension has the same commands (press **Ctrl+Shift+P** and type "Jot"): **Today's Entry** (**Ctrl+Alt+T**), **Carry Open
Tasks to Today**, **Add a Week Review**, **Export Calendar (.ics)**, **Export as CSV** and **Import Numbers from CSV**. Each change is
one edit, so Undo takes it back.

To keep your calendar up to date without thinking about it, set `jot.automation.exportOnSave.ics` to a file in a folder that syncs
(iCloud Drive, Dropbox, Google Drive, a web folder). Every time you save, the calendar file is written again, and a calendar app that
subscribes to that file sees your journal's events.

## Connecting to other services

These reach the internet, so each one only runs when you ask:

| Connection | How | What is sent |
| --- | --- | --- |
| **Webhooks** (Zapier, Make, n8n, IFTTT, your own) | `jot post <address> journal.jot`, or **Jot: Send to Webhook** in VS Code (it asks first) | the tasks, events and numbers as JSON: never the rest of your writing |
| **Todoist** | `jot todoist journal.jot` with your API token in `TODOIST_TOKEN`, or **Jot: Send Open Tasks to Todoist** (the token is kept in VS Code's secret storage) | each open task's text, due date and priority |
| **Weather** (Open-Meteo, no account) | `jot today journal.jot --weather 51.5,-0.12`, or turn on `jot.automation.weather.onToday` with your location | your latitude and longitude, rounded to about a kilometre |

A webhook is the widest door: Zapier, Make and n8n turn it into thousands of services (a spreadsheet row per day, a message when a
task is high priority, a note in another app). What arrives looks like this:

```
{ "format": "jot-automation", "version": 1, "file": "journal.jot",
  "tasks": [{ "text": "Post the letter", "status": "open", "priority": "normal", "date": "2026-10-28", "key": "…" }],
  "events": [{ "text": "Dentist 09:30", "date": "2026-10-28", "time": "09:30" }],
  "numbers": [{ "date": "2026-10-28", "metric": "steps", "value": 8200, "unit": "" }] }
```

**Todoist** gets each open task once. Jot remembers which tasks it has sent in a small record at the end of the journal
(`:::record sync #sync-todoist`), so sending again only sends new ones. Formatted pages don't show this record.

**The weather** is written as a record, and its numbers chart like any others:

```jot
:::record observation #weather-2026-10-28
label: weather
sky: light rain
temperature-high: 14.3
temperature-low: 6.1
rain: 2.3
source: open-meteo.com
:::
```

## Ideas

- A scheduled job each morning (`cron`, Task Scheduler, a Shortcuts automation) running `jot rollover` and `jot today`, so the day
  starts with yesterday's open tasks waiting.
- `jot tasks journal.jot --status open --json` in a Shortcut that shows your list on your phone's home screen.
- A webhook to a Zapier zap that adds a spreadsheet row with each day's numbers.
- Export on save to a calendar file your partner subscribes to, for shared plans.

## Listening notes

In **Write**, choose **Music & background media**. Enter a song or episode title, artist, optional album and a share link from Spotify, YouTube
Music or another service. Add a few words about the setting, then choose **Add to this entry**. The note is inserted at your writing
cursor. It is ordinary Jot/Markdown that you can type or edit in any text editor:

```jot
#### Listening

“A small song” — An artist

[Open in Spotify](https://open.spotify.com/track/example)

Captured: 2026-10-26T18:00:00.000Z

On the bus home. Rain against the windows.
```

**Connect Spotify** can fill in the title, artists, album and link for your account's currently playing track or episode. Press
**Fetch currently playing** when you want a snapshot, review the fields, add your setting notes, and insert it. Fetching does not
change the journal. Paused playback is labelled as paused. Playback is not polled in the background.

The manual option works without a connection. YouTube Music links can be entered manually; this website does not read another
browser tab or Android's system media sessions. No microphone or media-file capture is part of this tool.

### Music while you write

In **Write → Music player ♫**, paste a Spotify share link and choose **Load Spotify player**. Tracks, albums, playlists,
artists, episodes and shows are supported. The player stays above the writing as you scroll and keeps the same music while you
edit, switch preview tabs or enter focus mode. **Choose music** lets you replace it. **Close player** removes the embed and ends
its playback; opening or closing the player never changes your journal.

Spotify is contacted only when you load a player. It may use cookies or ask you to sign in inside its player; playback and
availability depend on Spotify, your account, browser and region. No Spotify developer app is needed for this embed, and Jot
never receives the embed's account credentials. This is separate from the optional currently-playing capture connection below.
If playback is unavailable, use **Open in Spotify**. Reloading the workspace does not reload music automatically. The player is
excluded from journal downloads, page exports and print.

### Spotify setup

Spotify requires a registered developer app. The site has no Client ID configured by default, so the connection needs this one-time
setup before live Spotify capture can work:

1. Open the [Spotify developer dashboard](https://developer.spotify.com/dashboard) and create or select a Web API app.
2. In Jot's **Music & background media → Spotify connection settings**, copy the displayed redirect URL. Register that **exact URL** in the app.
   It ends in `/write/spotify-callback.html`. Production must use HTTPS. For local testing, open the site using `127.0.0.1` rather
   than `localhost`, and register its callback URL too.
3. Copy the app's **public Client ID** into Jot. Do not enter a client secret. The public ID is remembered in this browser.
4. Choose **Connect Spotify**, allow the sign-in window, and grant access to your currently playing information. Then fetch a song.

A site owner may set the public `clientId` in `site/dist/jot/spotify-config.json` instead, so visitors do not have to enter it.
Spotify's current development-mode rules require a Premium app owner, allowlisted users, and a limit of five authenticated users.
A public site deployment does not remove Spotify's app-access restrictions. See Spotify's
[quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) for current requirements.

The connection uses Spotify's [Authorization Code with PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
and only the [currently-playing permission](https://developer.spotify.com/documentation/web-api/reference/get-the-users-currently-playing-track).
Access and refresh tokens stay in page memory and are never added to a journal, local storage or an export. Reloading the page ends
the connection; **Disconnect** also clears it. You can revoke the app separately in your Spotify account settings. Existing notes
stay readable and editable after disconnection. Your journal text is not sent to Spotify.

### Scrobbling services

**Listening → Last.fm / ListenBrainz** can read a public profile's currently playing track or its ten most recent tracks. Choose the
service, enter your username, and choose **Fetch listening activity**. Select a track to review, add your setting notes, then choose
**Add to this entry**. Fetching only fills the fields; it does not change your writing or submit a scrobble.

- **ListenBrainz:** public reads need a username, with no app registration or user token. Your player or scrobbler must already send
  listening activity to ListenBrainz. See its [playing-now and recent-listens API](https://listenbrainz.readthedocs.io/en/latest/users/api/core.html).
- **Last.fm:** enter your username and an application API key from [Create an API account](https://www.last.fm/api/account/create).
  Do not enter the shared secret. Public recent-track reads need no account authorization. See
  [user.getRecentTracks](https://www.last.fm/api/show/user.getRecentTracks). The key stays in this page's fields and is not saved.
- **Android:** an optional app such as [Pano Scrobbler](https://github.com/kawaiiDango/pano-scrobbler) can send supported players'
  activity to these services after you grant its permissions. Jot reads the service, not Android's notifications or media sessions.
- **Libre.fm:** manual links remain supported. Direct fetching is not enabled: its public API returned an access challenge during
  integration checks, so browser access could not be verified. Follow its [developer documentation](https://github.com/libre-fm/developer)
  for current API requirements; no unsupported proxy or account-password workaround is used.

A note labels the source and whether the service reported current playback or a recent listen. Available historical timestamps are
stored separately as **Listened**, while **Captured** means when Jot fetched the details. “Playing now” is a service report, not a
guarantee: players may send updates late or leave stale status. If nothing is reported, try recent tracks or enter the song manually.
Editing the song fields clears the fetched provenance so it is not attached to a different song.

Only the requested username and, for Last.fm, application API key are sent to the selected service. The browser remembers a username
after a successful fetch; no journal text is sent. There is no background polling, account write access or scrobble submission.
Service errors leave existing writing and review fields unchanged. Requests are spaced and rate limits respected.

## Albums, playlists and Spotify short links

An entry can hold any number of music references:

```jot
#### Music for this week

- Album: [An album to return to](spotify:album:4aawyAB9vmqN3uQ7FjRGTy)
- Playlist: [My writing mix](spotify:playlist:37i9dQZF1DXcBWIGoYBM5M)
- spotify: track:11dFghVXANMlKmJXsNCbNl
```

Copy a Spotify URI, or keep the type and ID from a share URL: `https://open.spotify.com/album/ID` becomes `spotify:album:ID`.
The types are `track`, `album`, `playlist`, `artist`, `episode` and `show`. A space after `spotify:` is optional.
Named Markdown links show your label; bare short references show “Spotify album”, “Spotify playlist”, and so on. Each becomes
an ordinary link in the page preview and HTML export. Reading an entry does not contact Spotify or load music automatically.
Paste the same short reference into **Music player ♫** to load it for listening while you write. These are links to collections;
the music itself is not copied into your journal or its `.jotz` package. You can always use a normal HTTPS link for other services.

In **Music & background media → Songs, albums, playlists and more**, paste one reference per line. An optional name goes before ` | `,
for example `Writing mix | spotify:playlist:37i9dQZF1DXcBWIGoYBM5M`. **Add to this entry** inserts the whole list at once;
no title, account connection or now-playing fetch is required. You can mix Spotify references and HTTPS music links from other
services. Review the list before adding; an invalid line is reported without inserting a partial note.

## IMDb and YouTube background media

An entry can collect films, TV, episodes, videos and playlists alongside music:

```jot
#### Background media

- [Background film](imdb:tt0133093)
- [TV series](imdb:tt0386676)
- [Video](youtube:dQw4w9WgXcQ)
- [Video playlist](youtube:playlist:PL1234567890abcdef)
```

Use an actual provider ID from the link you want to save. IMDb uses `imdb:tt…` for title IDs (films, series and individual
episodes). YouTube uses `youtube:VIDEO_ID`, optionally `youtube:video:VIDEO_ID`, or `youtube:playlist:PLAYLIST_ID`.
A space after the first colon is optional. Bare shortcodes show a provider/type label; Markdown links give them a name.
IMDb identifies the title and does not provide playback. These references do not fetch titles, ratings or thumbnails or embed
videos automatically. The shared preview and HTML export expand them into ordinary HTTPS links.

In **Music & background media**, paste one reference per line, optionally `Name | reference`, and add the mixed list to the entry.
Full IMDb title URLs and simple YouTube video/playlist URLs are shortened on insertion. Video links with timestamps or both a
video and a playlist remain full URLs so their context is preserved. Existing journal writing is never automatically rewritten.
The persistent writing player remains Spotify-only; YouTube references open YouTube when you follow them.

## Find music IDs while typing

Open **Music & background media → Find a song or album ID** and enable **Search MusicBrainz as I type**. Choose song recording,
album (release group), album edition, composition or artist, then type at least three characters in the dedicated search box.
After a short pause, suggestions show names, artists and available dates, versions or durations. Choose a result with the mouse
or Tab and Enter. It goes into the reference review list; **Add to this entry** is still needed to change the journal.

Only the search box text and chosen entity type are sent to MusicBrainz, with no account cookies or journal content. Search is off
by default and turns off when the dialog closes. Requests are debounced/rate-limited, old searches are cancelled, and recent results
are cached only for this page session. Busy/offline services show an error and leave manual entry available. Result names are not
verified matches: check the recording/version or album edition before selecting one.

Database links use `musicbrainz:recording:UUID`, `musicbrainz:release-group:UUID`, `musicbrainz:release:UUID`,
`musicbrainz:work:UUID` or `musicbrainz:artist:UUID`. They identify the music independently of Spotify or YouTube. Existing service
links remain useful for playback; the lookup does not guess a corresponding playback URL. IMDb and YouTube remain manual links
or shortcodes; their online search is not part of this MusicBrainz lookup.

## Entry timezones and calendar export

Document `Timezone:` metadata supplies a default; `@timezone: Europe/London` inside a dated entry overrides it for that entry only.
The next dated entry resets to the document default. **Entry timezone** in Write can add or remove an override. Entry dates and
written clock times are preserved. Calendar export converts uniquely resolved timed events to UTC. Invalid declared zones,
nonexistent times and repeated daylight-saving hours stop timed export instead of guessing. Use a complete RFC 3339 event
`start`/`at` and, when supplied, `end` with explicit offsets to disambiguate. All-day dates stay dates. Multi-file CLI export keeps
each file's timezone context independent. No declared zone means floating calendar times, not a device-zone assumption.

**Insert current time** is a separate explicit capture action, producing a full timestamp with its offset. **Capture location**
uses Chromium's one-time geolocation permission and a review step; it neither tracks in the background nor infers timezone or
address. See the writing guide for the source format and failure behavior.
