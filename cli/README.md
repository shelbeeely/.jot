# jot, the command line

A journal's tasks, events and numbers for scripts, scheduled jobs, Apple Shortcuts and automation services. Node 20 or later; no
installing beyond this repository (it uses `../parser`).

    node cli/jot.mjs help

| Command | What it does |
| --- | --- |
| `jot tasks <files…> [--status S] [--since DATE] [--json]` | the tasks, with their state and day |
| `jot events <files…> [--since DATE] [--json]` | the events, with their time when one is written |
| `jot numbers <files…> [--metric M] [--json]` | the numbers as CSV (date, metric, value, unit) |
| `jot ics <files…> [-o FILE] [--name N] [--done] [--tasks-as-events]` | an iCalendar file of events and dated open tasks |
| `jot json <files…>` | tasks, events and numbers as one JSON document |
| `jot check <files…> [--strict] [--json]` | problems as `file:line:col severity code message`; exit 1 on an error (on a warning too with `--strict`); reads `.jotz` |
| `jot import <csv> --into <journal> [--combine sum\|mean\|last] [--day-first] [--source N] [--metric M…]` | numbers from a CSV into their days |
| `jot today <journal> [--date D] [--weather LAT,LON]` | today's entry (and the day's weather from Open-Meteo) |
| `jot rollover <journal> [--date D]` | open tasks from earlier days carried to today |
| `jot review <journal> [--date D]` | a review of the week |
| `jot post <url> <files…> [--open] [--since D]` | the tasks, events and numbers as JSON to a webhook (https) |
| `jot todoist <journal>` | open tasks not sent before, to Todoist (`TODOIST_TOKEN`) |
| `jot lock <journal> [-o FILE] [--iterations N]` | an encrypted `.jotlock` copy (`parser/lock.mjs`, [Jot Lock](../specification/Jot-Lock-v1.md)); the passphrase comes from a hidden prompt, twice, or `JOT_PASSPHRASE`; the journal is left as it is |
| `jot unlock <journal.jotlock> [-o FILE \| -o -]` | the journal back, `.jot` or `.jotz` by content; never over an existing file |
| `jot flatten <journal> [-o FILE] [--root DIR]` | a copy with every `![label](other.jot#id)` include written out (`parser/include.mjs`); never over the journal |

Reading commands never change a file; writing commands say what they changed, and `--dry-run` prints the result instead. Only `post`,
`todoist` and `today --weather` reach the internet. Everything is the same code as the workspace and VS Code
(`parser/automation.mjs`, `parser/connect.mjs`). Guide: [Automation and connections](../docs/guide/automation.md).

    node --test cli/test.mjs
