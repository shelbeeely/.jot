// Writes a month of the book as a .jot file to fill in by hand (jotfile.mjs): the structure from content/book.json and the day layout
// (content/daypage.json, or the library book's), with module switches applied. No scan zones, codes or page layout: one flat text file.
//   node render-jot.mjs month 2026-10 [a.ics,b.ics] [--per week|day]
//     -> out/jot/<slug>-2026-10.jot   (a calendar adds its events and routines; --per week: <slug>-2026-09-28.jot ..., one a week)
// InkDeck opens up to 16 KB a file: a bigger month is named in the output, with the --per week that fits.
// KW_OUT: another output folder, as render.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { PROFILE } from './profile.mjs';
import { loadBook, dayContext, readJson } from './context.mjs';
import { normalizeBook } from './book.mjs';
import { chUse } from './chores.mjs';
import { jotFiles, JF_INKDECK_BYTES } from './jotfile.mjs';

const args = process.argv.slice(2), perAt = args.indexOf('--per'), per = perAt >= 0 ? args.splice(perAt, 2)[1] : 'month';
const [mode, month, ics] = args;
if (!['month', 'week', 'day'].includes(per)) { console.error('--per is month, week or day'); process.exit(1); }
if (mode !== 'month' || !/^\d{4}-\d{2}$/.test(month || '')) { console.error('Usage: node render-jot.mjs month <YYYY-MM> [a.ics,b.ics]'); process.exit(1); }
const book = normalizeBook(loadBook());
const { dayLayout, spreadLayout } = dayContext(PROFILE.library.layouts.day || readJson('./content/daypage.json'));
chUse(PROFILE.chores);
let events = null;
if (ics) {
  // the month's calendar, as the books read it (data.mjs): one-off events, and routines for the action items
  const { build } = await import('./data.mjs');
  const { WORDS } = await import('./content/year.mjs');
  const [y, m] = month.split('-').map(Number);
  const D = build(ics, { n: 1, start: [y, m, 1], days: new Date(Date.UTC(y, m, 0)).getUTCDate(), id: month, label: month, short: month }, WORDS);
  events = Object.fromEntries(D.days.map((d) => [d.date, d.events.map((e) => ({ time: e.time || '', title: e.title || e.text || '', allDay: !!e.allDay, routine: !!e.routine }))]));
}
const files = jotFiles({ book, month, day: dayLayout, spread: spreadLayout, title: PROFILE.book.title, slug: PROFILE.book.slug, size: PROFILE.trim, crisis: PROFILE.crisis && PROFILE.crisis.lines, events }, per);
const dir = path.join(process.env.KW_OUT || 'out', 'jot');
fs.mkdirSync(dir, { recursive: true });
for (const { text, file } of files) {
  const bytes = Buffer.byteLength(text);
  fs.writeFileSync(path.join(dir, file), text);
  console.log(`${path.join(dir, file)}: ${text.split('\n').length} lines, ${(bytes / 1024).toFixed(1)} KB${bytes > JF_INKDECK_BYTES ? `; over InkDeck's 16 KB${per === 'day' ? '' : `, use --per ${per === 'month' ? 'week' : 'day'}`}` : ''}`);
}
if (files[0].skipped.length) console.log(`left out (paper only): ${files[0].skipped.join(', ')}`);
