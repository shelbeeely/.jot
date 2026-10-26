#!/usr/bin/env node
// jot-convert: a plain-text diary (a Project Gutenberg download, or your own) to Jot. See README.md.
//   node jot-convert.mjs pg4200.txt --calendar julian --out-dir pepys/
//   curl -sL https://www.gutenberg.org/cache/epub/1026/pg1026.txt | node jot-convert.mjs - --year 1888 > nobody.jot
import fs from 'node:fs';
import path from 'node:path';
import { convert, checkOptions, decodeText, summary, CHOICES, MAX_FILE_BYTES } from './convert.mjs';

const USAGE = `Usage: jot-convert <file | -> [options]

  <file>              a plain-text diary (UTF-8); "-" reads standard input
  -o, --out <file>    write one .jot file (default: standard output)
  -d, --out-dir <dir> write the files there, named from the title (needed when the diary is split)
  --year <yyyy>       the starting year, for a diary that never states one
  --calendar <c>      as-written (default) or julian: the dates are Old Style; convert them to the Gregorian calendar
  --notes <n>         margin (default): [editor's notes] become margin notes; keep: leave them as text; drop: leave them out
  --per <p>           auto (default): one file, split by year only when it is too big for the Jot tools;
                      none, year or month
  --title, --author, --source <text>   metadata (read from a Project Gutenberg header when there is one)
  --name <stem>       file name stem (default: from the title)
  --force             overwrite files that are already there
  -q, --quiet         no summary on standard error
  -h, --help          this help`;

const fail = (msg) => { process.stderr.write(`jot-convert: ${msg}\n`); process.exit(2); };

export function parseArgs(argv) {
  const a = { options: {}, input: null, out: null, outDir: null, force: false, quiet: false }, raw = {};
  const value = (i, flag) => { if (i >= argv.length || (argv[i].startsWith('-') && argv[i] !== '-')) fail(`${flag} needs a value`); return argv[i]; };
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    if (f === '-h' || f === '--help') a.help = true;
    else if (f === '-o' || f === '--out') a.out = value(++i, f);
    else if (f === '-d' || f === '--out-dir') a.outDir = value(++i, f);
    else if (['--year', '--title', '--author', '--source', '--name', ...Object.keys(CHOICES).map((k) => `--${k}`)].includes(f)) raw[f.slice(2)] = value(++i, f);
    else if (f === '--force') a.force = true;
    else if (f === '-q' || f === '--quiet') a.quiet = true;
    else if (f === '-' || !f.startsWith('-')) { if (a.input !== null) fail(`one input at a time (got ${a.input} and ${f})`); a.input = f; }
    else fail(`unknown option ${f} (see --help)`);
  }
  try { a.options = checkOptions(raw); } catch (e) { fail(e.message); }
  return a;
}

function readInput(input) {
  return decodeText(input === '-' ? fs.readFileSync(0) : fs.readFileSync(input));
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) { process.stdout.write(`${USAGE}\n`); return; }
  if (a.input === null) fail(`no input (a file, or "-" for standard input)\n\n${USAGE}`);
  if (a.out && a.outDir) fail('use --out or --out-dir, not both');
  let text;
  try { text = readInput(a.input); } catch (e) { fail(e.code === 'ENOENT' ? `no such file: ${a.input}` : `${a.input}: ${e.message}`); }

  // without a folder there is one place to write, so the diary stays one file
  if (!a.outDir && a.options.per && a.options.per !== 'none' && a.options.per !== 'auto') fail(`--per ${a.options.per} makes several files: give --out-dir`);
  const r = convert(text, { ...a.options, ...(a.outDir ? {} : { per: 'none' }) });
  const warnings = r.warnings.filter((w) => a.outDir || !/split it with/.test(w));

  const written = [];
  if (a.outDir) {
    fs.mkdirSync(a.outDir, { recursive: true });
    const clash = r.files.map((f) => path.join(a.outDir, f.name)).filter((p) => fs.existsSync(p));
    if (clash.length && !a.force) fail(`already there (use --force to overwrite, or --name for another name): ${clash.join(', ')}`);
    for (const f of r.files) { const p = path.join(a.outDir, f.name); fs.writeFileSync(p, f.text); written.push([p, f]); }
  } else if (a.out) {
    if (fs.existsSync(a.out) && !a.force) fail(`${a.out} is already there (use --force to overwrite)`);
    fs.writeFileSync(a.out, r.files[0].text); written.push([a.out, r.files[0]]);
  } else process.stdout.write(r.files[0].text);

  if (!a.outDir && r.files[0].bytes > MAX_FILE_BYTES) warnings.push(`the file is ${(r.files[0].bytes / 1048576).toFixed(1)} MiB, more than the 1 MiB the Jot tools open: use --out-dir to split it by year`);
  if (!a.quiet) {
    const out = summary(r, a.options);
    for (const [p, f] of written) out.push(`  ${p}  ${f.entries} entries, ${(f.bytes / 1024).toFixed(0)} KB`);
    for (const w of warnings) out.push(`warning: ${w}`);
    process.stderr.write(`${out.join('\n')}\n`);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('jot-convert.mjs')) main();
