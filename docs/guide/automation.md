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

| Tool | What it does |
| --- | --- |
| **Listening ♫** | adds a plain-text music note, optionally filled from Spotify after sign-in and review |
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

## The jot command line

`cli/jot.mjs` in the Jot project (Node 20 or later) does the same things from a terminal, so scripts, scheduled jobs and Apple
Shortcuts can use them:

```
jot tasks journal.jot --status open          # today's to-do list, anywhere
jot events journal.jot --since 2026-10-01
jot numbers journal.jot                      # CSV
jot ics journal.jot -o ~/Calendars/jot.ics   # a calendar file
jot import fit.csv --into journal.jot        # numbers in, into their days
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

In **Write**, choose **Listening ♫**. Enter a song or episode title, artist, optional album and a share link from Spotify, YouTube
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

### Spotify setup

Spotify requires a registered developer app. The site has no Client ID configured by default, so the connection needs this one-time
setup before live Spotify capture can work:

1. Open the [Spotify developer dashboard](https://developer.spotify.com/dashboard) and create or select a Web API app.
2. In Jot's **Listening → Spotify connection settings**, copy the displayed redirect URL. Register that **exact URL** in the app.
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
