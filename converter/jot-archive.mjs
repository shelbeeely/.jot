#!/usr/bin/env node
// jot-archive: your data exports (X/Twitter, Mastodon, Facebook, Instagram, Tumblr, Reddit, Google Takeout's Keep and Blogger) as one
// dated Jot journal. Everything is read on this computer; nothing is sent anywhere. See README.md and archive.mjs.
//   node converter/jot-archive.mjs twitter-2024.zip facebook.zip takeout/ --list
//   node converter/jot-archive.mjs twitter-2024.zip facebook.zip takeout/ --out-dir my-journal/ --time-zone Europe/London
import fs from 'node:fs';
import path from 'node:path';
import '../parser/vendor/jszip.mjs';
import { pack } from '../parser/container.mjs';
import { readArchives, detect, makeJournal, fromZip, SERVICES } from './archive.mjs';

const USAGE = `Usage: jot-archive <archive.zip | folder> [more archives] [options]

  Each archive is a data export as the service gives it (a .zip), or that .zip unzipped (a folder; better for exports over 2 GB).
  Give as many as you like, in any order: they become one timeline.

  --list                 show what each archive holds, and stop
  -d, --out-dir <dir>    write the journal there (one .jot a year by default)
  --time-zone <zone>     the time zone for dates, e.g. Europe/London (default: this computer's)
  --from <yyyy-mm-dd>    leave out anything earlier;  --to <yyyy-mm-dd>  anything later
  --per <p>              year (default), month or none: how to split the journal into files
  --media <m>            note (default): a margin note says where each photo is in the archive; attach: photos go inside
                         each year's .jotz (up to 60 MB a file; the rest stay notes); none: leave them out
  --reposts              include reposts, retweets, boosts and reblogs (other people's words)
  --comments             include your comments (Facebook, Reddit)
  --stories              include Instagram stories
  --places               keep the names of places you checked in at (never coordinates)
  --title <text>         the journal's title (default "My life online");  --name <stem>  file names (default life-online)
  --force                overwrite files that are already there
  -q, --quiet            no summary
  -h, --help             this help

Never read: messages, contacts, friends lists, logins, IP addresses, ads data, location coordinates. Like and share counts are never
written. Every file is marked Privacy: private.`;

const fail = (msg) => { process.stderr.write(`jot-archive: ${msg}\n`); process.exit(2); };

export function parseArgs(argv) {
  const a = { inputs: [], options: {}, outDir: null, list: false, force: false, quiet: false };
  const value = (i, flag) => { if (i >= argv.length || argv[i].startsWith('--')) fail(`${flag} needs a value`); return argv[i]; };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '-h' || x === '--help') { process.stdout.write(USAGE + '\n'); process.exit(0); }
    else if (x === '--list') a.list = true;
    else if (x === '-d' || x === '--out-dir') a.outDir = value(++i, x);
    else if (x === '--time-zone') a.options.timeZone = value(++i, x);
    else if (x === '--from' || x === '--to') { const v = value(++i, x); if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(`${x} must look like 2014-01-31`); a.options[x.slice(2)] = v; }
    else if (x === '--per') { const v = value(++i, x); if (!['year', 'month', 'none'].includes(v)) fail('--per is year, month or none'); a.options.per = v; }
    else if (x === '--media') { const v = value(++i, x); if (!['note', 'attach', 'none'].includes(v)) fail('--media is note, attach or none'); a.options.media = v; }
    else if (['--reposts', '--comments', '--stories', '--places'].includes(x)) a.options[x.slice(2)] = true;
    else if (x === '--title' || x === '--name') a.options[x.slice(2)] = value(++i, x);
    else if (x === '--force') a.force = true;
    else if (x === '-q' || x === '--quiet') a.quiet = true;
    else if (x.startsWith('-')) fail(`unknown option ${x} (see --help)`);
    else a.inputs.push(x);
  }
  if (!a.inputs.length) fail('which archives? (see --help)');
  if (!a.list && !a.outDir) fail('where should the journal go? (--out-dir DIR, or --list to look first)');
  if (a.options.timeZone) try { new Intl.DateTimeFormat('en', { timeZone: a.options.timeZone }); } catch { fail(`unknown time zone ${a.options.timeZone}`); }
  return a;
}

function folderSource(dir) {
  const list = [];
  const walk = (d, pre) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isSymbolicLink()) continue; if (e.isDirectory()) walk(path.join(d, e.name), pre + e.name + '/'); else if (e.isFile()) list.push(pre + e.name); } };
  walk(dir, '');
  return { name: dir, list: () => list, read: async (p) => new Uint8Array(fs.readFileSync(path.join(dir, p))) };
}
async function openSource(p) {
  if (!fs.existsSync(p)) fail(`no such file or folder: ${p}`);
  if (fs.statSync(p).isDirectory()) return folderSource(p);
  if (fs.statSync(p).size > 2 * 1024 ** 3) fail(`${p} is over 2 GB: unzip it and give the folder instead`);
  try { return await fromZip(globalThis.JSZip, p, fs.readFileSync(p)); } catch { return fail(`${p} is not a ZIP this can read (unzip it and give the folder instead)`); }
}

async function main() {
  const a = parseArgs(process.argv.slice(2)), sources = [];
  for (const p of a.inputs) sources.push(await openSource(p));
  if (a.list) {
    const found = detect(sources);
    for (const s of sources) { const here = found.filter((f) => f.source === s.name).map((f) => f.name); process.stdout.write(`${s.name}: ${here.length ? here.join(', ') : 'nothing this can read yet'}\n`); }
    return;
  }
  const o = a.options, r = await readArchives(sources, o), warnings = [...r.warnings];
  if (!r.items.length) fail('nothing to write: no posts or notes found (try --list to see what each archive holds)');
  const made = await makeJournal(r.items, o, { pack }), files = made.files; warnings.push(...made.warnings);
  fs.mkdirSync(a.outDir, { recursive: true });
  for (const f of files) { const p = path.join(a.outDir, f.name); if (fs.existsSync(p) && !a.force) fail(`${p} is already there (use --force to overwrite)`); }
  for (const f of files) fs.writeFileSync(path.join(a.outDir, f.name), f.data || f.text);
  if (!a.quiet) {
    const say = (s) => process.stderr.write(s + '\n');
    say(`Found: ${r.found.map((f) => `${f.name} (${f.count})`).join(', ')}`);
    say(`Wrote ${files.length} ${files.length === 1 ? 'file' : 'files'} to ${a.outDir}: ${r.items.length} posts and notes, ${files[0].from} to ${files.at(-1).to}${o.timeZone ? ` (${o.timeZone})` : ''}`);
    const left = Object.entries(r.left).filter(([, n]) => n).map(([k, n]) => `${n} ${{ reposts: 'reposts (add --reposts)', outside: 'outside the dates', empty: 'with nothing written' }[k]}`);
    if (left.length) say(`Left out: ${left.join(', ')}`);
    for (const w of warnings) say(`Note: ${w}`);
    say('Every file is marked Privacy: private. Messages, contacts, logins and locations were not read.');
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('jot-archive.mjs')) main().catch((e) => fail(e.message));
export { SERVICES };
