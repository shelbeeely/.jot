// The example diaries on the site (site/dist/examples/): public-domain diaries from Project Gutenberg, converted with converter/.
//   node tools/build-examples.mjs --from <folder>    convert pg<N>.txt files already downloaded into <folder>
//   node tools/build-examples.mjs                     download them from gutenberg.org first
//   node tools/build-examples.mjs --check             the page and index.json match the files; every file is valid Jot and opens
// Writes site/dist/examples/diaries/<id>/*.jot, site/dist/examples/index.json and site/dist/examples/index.html.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { convert, MAX_FILE_BYTES } from '../converter/convert.mjs';
import { parse } from '../parser/jot.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site/dist/examples');
export const DIARIES = [
  { id: 'pepys', ebooks: [4200], options: { calendar: 'julian', per: 'auto' }, title: 'The Diary of Samuel Pepys', author: 'Samuel Pepys',
    about: 'Ten years of a London civil servant’s days, 1660–1669: the Plague, the Great Fire, the navy, music and gossip. Old Style dates, converted to modern ones.' },
  { id: 'nobody', ebooks: [1026], options: { year: 1888, per: 'auto' }, title: 'The Diary of a Nobody', author: 'George and Weedon Grossmith',
    about: 'A comic diary of a London clerk, April 1888 to July 1889. The diary never says the year, so the conversion starts in 1888.' },
  { id: 'blunt', ebooks: [79491, 79492], options: { per: 'year' }, title: 'My Diaries, 1888–1914', author: 'Wilfrid Scawen Blunt',
    about: 'A poet and anti-imperialist’s diaries, quoted inside his own narrative of the years before the First World War. The years come from the chapter titles.' },
];

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const year = (d) => d.slice(0, 4);

async function source(n, from) {
  if (from) return fs.readFileSync(path.join(from, `pg${n}.txt`), 'utf8');
  const res = await fetch(`https://www.gutenberg.org/cache/epub/${n}/pg${n}.txt`);
  if (!res.ok) throw new Error(`gutenberg.org answered ${res.status} for ebook ${n}`);
  return res.text();
}

async function build(from) {
  const index = { note: 'Built by tools/build-examples.mjs. Public-domain texts from Project Gutenberg, converted with converter/convert.mjs.', diaries: [] };
  for (const d of DIARIES) {
    const dir = path.join(OUT, 'diaries', d.id);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const files = [], sources = [];
    for (const n of d.ebooks) {
      const r = convert(await source(n, from), { ...d.options, name: d.id });
      for (const f of r.files) {
        if (files.some((x) => x.name === f.name)) throw new Error(`${d.id}: two parts make ${f.name}`);
        fs.writeFileSync(path.join(dir, f.name), f.text);
        files.push({ name: f.name, entries: f.entries, from: f.from, to: f.to, bytes: f.bytes, sha256: sha(f.text) });
      }
      sources.push({ ebook: n, url: r.meta.source, title: r.meta.title, entries: r.stats.entries });
    }
    files.sort((a, b) => (a.from || '').localeCompare(b.from || ''));
    index.diaries.push({ id: d.id, title: d.title, author: d.author, about: d.about, options: d.options, sources, files });
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT, 'index.html'), page(index));
  return index;
}

// the command line that makes the same files, one per source text
const command = (d) => d.sources.map((src) => `jot-convert pg${src.ebook}.txt${Object.entries(d.options).filter(([k, v]) => !(k === 'per' && v === 'auto')).map(([k, v]) => ` --${k} ${v}`).join('')} --name ${d.id}`).join('; ');
export function page(index) {
  const cards = index.diaries.map((d) => {
    const entries = d.files.reduce((n, f) => n + f.entries, 0), dated = d.files.filter((f) => f.from);
    const span = `${year(dated[0].from)}–${year(dated[dated.length - 1].to)}`;
    const rows = d.files.map((f) => {
      const href = `diaries/${d.id}/${f.name}`;
      return `<li><span class="f-name">${esc(f.name)}</span><span class="f-meta">${f.entries} ${f.entries === 1 ? 'entry' : 'entries'}${f.from ? ` · ${f.from === f.to ? f.from : `${f.from} to ${f.to}`}` : ''} · ${kb(f.bytes)}</span>`
        + `<span class="f-act"><a class="btn small" href="../?open=examples/${esc(href)}">Read</a><a class="btn small" href="${esc(href)}" download>Download</a></span></li>`;
    }).join('\n        ');
    const src = d.sources.map((s) => `<a href="${esc(s.url)}">ebook #${s.ebook}</a>`).join(' and ');
    return `<section class="diary" aria-labelledby="h-${d.id}">
      <h2 id="h-${d.id}">${esc(d.title)}</h2>
      <p class="by">${esc(d.author)} · ${span} · ${entries.toLocaleString('en')} entries · ${d.files.length} ${d.files.length === 1 ? 'file' : 'files'}</p>
      <p>${esc(d.about)}</p>
      <p class="how">From Project Gutenberg, ${src}, converted with <code>${esc(command(d))}</code>.</p>
      <details${d.files.length === 1 ? ' open' : ''}><summary>The ${d.files.length === 1 ? 'file' : `${d.files.length} files`}</summary>
      <ul class="files">
        ${rows}
      </ul></details>
    </section>`;
  }).join('\n    ');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Jot examples</title>
<meta name="description" content="Real diaries as Jot: public-domain diaries converted to dated .jot entries, to read, download and learn from.">
<link rel="stylesheet" href="../editor/editor.css">
<link rel="stylesheet" href="examples.css">
</head>
<body>
<a class="skip" href="#diaries">Skip to the diaries</a>
<header class="top">
  <a class="brand" href="../"><span class="brand-icon" aria-hidden="true">⌗</span> JOT</a>
  <nav aria-label="Jot tools"><a href="../">Journal</a><a href="../editor/">Template editor</a><a href="../convert/">Converter</a><a href="../guide/">Guides</a><a href="./" aria-current="page">Examples</a><a href="../scan/">Scanner</a></nav>
</header>
<main>
  <section class="intro">
    <p class="eyebrow">EXAMPLES</p>
    <h1>Real diaries, <em>as Jot.</em></h1>
    <p class="lead">Public-domain diaries converted to plain-text <code>.jot</code> files: a dated entry for each day, the date as it was written kept beside it. Read one in the workspace, or download it and open it in any text editor.</p>
  </section>
  <div id="diaries">
    ${cards}
  </div>
  <section class="diary small-ex" aria-labelledby="h-small">
    <h2 id="h-small">Two small files</h2>
    <ul class="files">
      <li><span class="f-name">plain-text.jot</span><span class="f-meta">a short journal in plain text, with tasks, events and a record</span><span class="f-act"><a class="btn small" href="../?open=examples/plain-text.jot">Read</a><a class="btn small" href="plain-text.jot" download>Download</a></span></li>
      <li><span class="f-name">packaged.jotz</span><span class="f-meta">the same kind of journal packaged with an attachment (a ZIP inside)</span><span class="f-act"><a class="btn small" href="../?open=examples/packaged.jotz">Read</a><a class="btn small" href="packaged.jotz" download>Download</a></span></li>
    </ul>
  </section>
  <p class="foot">Reading one replaces the writing in the workspace, after asking: download yours first if you want to keep it. <a href="../guide/converting.html">Convert your own diary</a> · <a href="../guide/writing-jot.html">Writing in Jot</a></p>
</main>
</body>
</html>
`;
}

function check() {
  const problems = [], index = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8'));
  if (fs.readFileSync(path.join(OUT, 'index.html'), 'utf8') !== page(index)) problems.push('index.html is out of date (run without --check)');
  for (const d of index.diaries) {
    const dir = path.join(OUT, 'diaries', d.id), listed = new Set(d.files.map((f) => f.name));
    for (const f of fs.readdirSync(dir)) if (!listed.has(f)) problems.push(`${d.id}/${f} is not in index.json`);
    for (const f of d.files) {
      const p = path.join(dir, f.name);
      if (!fs.existsSync(p)) { problems.push(`${d.id}/${f.name} is missing`); continue; }
      const text = fs.readFileSync(p, 'utf8');
      if (sha(text) !== f.sha256) problems.push(`${d.id}/${f.name} has changed since it was built`);
      if (Buffer.byteLength(text) > MAX_FILE_BYTES) problems.push(`${d.id}/${f.name} is over the 1 MiB the Jot tools open`);
      const ast = parse(text), bad = ast.diagnostics.filter((x) => x.severity !== 'info');
      if (bad.length) problems.push(`${d.id}/${f.name}: ${bad[0].message}`);
      if (ast.entries.length !== f.entries) problems.push(`${d.id}/${f.name}: ${ast.entries.length} entries, index.json says ${f.entries}`);
    }
  }
  for (const f of ['plain-text.jot', 'packaged.jotz']) if (!fs.existsSync(path.join(OUT, f)) || !fs.readFileSync(path.join(OUT, f)).equals(fs.readFileSync(path.join(ROOT, 'examples', f)))) problems.push(`site/dist/examples/${f} is not a copy of examples/${f}`);
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    const problems = check();
    if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
    console.log('examples: current, every file valid Jot');
  } else {
    const i = args.indexOf('--from'), from = i >= 0 ? args[i + 1] : null;
    fs.mkdirSync(OUT, { recursive: true });
    for (const f of ['plain-text.jot', 'packaged.jotz']) fs.copyFileSync(path.join(ROOT, 'examples', f), path.join(OUT, f));
    const index = await build(from);
    for (const d of index.diaries) console.log(`${d.id}: ${d.files.reduce((n, f) => n + f.entries, 0)} entries in ${d.files.length} files`);
  }
}
