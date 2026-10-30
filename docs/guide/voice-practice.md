# Voice practice

The workspace's **Voice practice** tool is a small practice companion: an optional pitch meter, a session timer and a short form
for how it went. What it adds to your journal is ordinary text, so you can also write the same thing by hand.

**What happens to your voice.** The microphone turns on only when you press **Start pitch meter**, and only after your browser
asks your permission. The sound is analysed inside the page, a few times a second, to estimate its pitch. Nothing is recorded,
saved or sent anywhere: no audio, and no stream of numbers. **Stop**, closing the dialog or leaving the page turns the microphone
off, and the dialog says **Microphone off**. Your journal changes only when you press **Add to this entry**.

## Using the pitch meter

1. In **Write**, choose **Voice practice** in the Tools row.
2. Press **Start pitch meter** and allow the microphone. Speak, hum or sing as you usually practise.
3. The dialog shows the pitch right now, a strip of the last half minute, and the session's **median** (the middle value), **low**
   and **high** (the 10th and 90th percentiles, so a stray squeak or a cough barely moves them) and **voiced time** (how long it
   heard a clear pitch, not breaths or silence).
4. Press **Stop** when you are done. You can start again; the measurements add up until you choose **Clear measurements**.

The meter reads roughly 60 to 500 Hz. It works best in a quiet room with one voice. Browsers' echo cancelling, noise suppression and
automatic volume are turned off for the meter so they do not bend the sound. A screen reader hears the median every few seconds
rather than every change.

**Target range (optional).** If you want one, enter a range in Hz; it is shown as a band behind the strip, and the current reading
is colored while it is inside. There is no default and no score: the range is yours to choose, change or leave empty. It is the
only thing the tool remembers, in this browser only.

**Session timer.** Start and pause it whenever you like; it counts up, never down. The minutes come from it (or from how long the
meter was on), and you can change them.

## What gets added

Fill in what is useful, all optional: minutes, the exercise, resonance on your own 1–5 scale, strain (0 none to 5 a lot), how much
it felt like you (1–5), and a note. Uncheck **Include the measured pitch** to keep the numbers out. **Add to this entry** writes it
at the cursor, inside the day you are writing:

```jot
### 2026-10-27 | Tuesday

#### Voice practice

Pitch, measured on this device: median 182 Hz, most of the time between 160 and 205 Hz, over 2 min 05 s of voiced sound. No audio was recorded.

Easier after humming first.

Recording: [take-1.m4a](assets/take-1.m4a)

:::record measurement
metric: pitch-hz
unit: Hz
value: 182
low: 160
high: 205
:::

:::record measurement
metric: voice-minutes
unit: min
value: 12
:::

:::record observation
method: voice-practice@1
exercise: Sirens
resonance: 4
strain: 1
felt-like-me: 5
recording: assets/take-1.m4a
:::
```

The `observation` uses the field names of the `voice-practice` method, so notes written from its writing invitation line up with
the tool's.

## Charting progress

The numbers belong to the day they are in. A chart record draws them over time; this one shows the last few weeks:

```jot
:::record chart
metrics: pitch-hz, voice-minutes, felt-like-me
start: 2026-10-01
end: 2026-10-31
:::
```

Two notes for the same metric on one day are drawn as their average, so for a day's total minutes, add one note at the end of
the day or change the first one's `value:`. Use **Numbers .csv ↓** in the Tools row to take them to a spreadsheet.

## Recordings you made elsewhere

The tool never records. If you recorded yourself with another app, choose **Attach a recording ＋** in the dialog: the file is
attached to this journal (it travels inside the `.jotz` when you download) and named in the note as `recording:`, with a link to it, when you press Add.
Recordings already attached with **Attach a file ＋** are in the list too.

## Privacy, in short

- No microphone access until you press Start; it ends on Stop, on closing the dialog and on leaving the page.
- Sound is analysed in the page and dropped; no audio or measurements are kept, uploaded or sent.
- Only your target range is remembered, in this browser. The journal holds only what you add.
