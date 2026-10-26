// The privacy gate for the published site: nothing personal, private or secret leaves through GitHub Pages.
//   node tools/privacy-check.mjs [site/dist]
// Reads every file (raw bytes, so image text chunks count too), the files inside .zip/.jotz, and the text of PDFs (pdftotext, from
// poppler-utils: required, so a PDF is never waved through unread). Exit 1 lists every finding.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import '../parser/vendor/jszip.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// what the site is made of; anything else (a calendar, a database, an archive of a book build, a key) is not published
const ALLOWED = new Set(['.html', '.css', '.js', '.mjs', '.json', '.md', '.jot', '.jotz', '.zip', '.pdf', '.png', '.svg', '.ico', '.txt', '.webmanifest', '.woff2']); // .woff2: the handwriting fonts (jot/fonts/, SIL OFL)
const BAD_PATH = [/(^|\/)private(\/|$)/i, /(^|\/)\.env/i, /(^|\/)node_modules\//, /\.ics$/i, /(^|\/)id_(rsa|ed25519)/i, /(^|\/)content\/profile\.json$/];
const RULES = [
  // the owner's own book, place and name stay out of the product (as in the Journaling repository's gate)
  [/shelbee/i, 'a personal name'], [/spokane/i, 'a personal place'], [/keeping\s+watch/i, 'the personal book title'],
  // calendars and secrets
  // a calendar is BEGIN:VCALENDAR on a line of its own; code that writes one (jot/automation.mjs: 'BEGIN:VCALENDAR' in quotes) is not one
  [/(?:^|[\r\n])BEGIN:VCALENDAR[ \t]*(?:\r?\n|$)/, 'calendar data'], [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'], [/\bghp_[A-Za-z0-9]{36}\b/, 'a GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{22,}/, 'a GitHub token'], [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS key'], [/\bxox[abposr]-[A-Za-z0-9-]{10,}/, 'a Slack token'],
  [/\bsk-(?:ant-)?[A-Za-z0-9_-]{32,}/, 'an API key'], [/\bICS_URLS\b/, 'the calendar secret’s name'],
  // nobody's email address is published (the site has none; add a deliberate one to EMAIL_OK)
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/, 'an email address'],
];
const EMAIL_OK = new Set([]);
const PAGES_FILE = 100 * 1024 * 1024, PAGES_SITE = 1024 * 1024 * 1024; // GitHub Pages limits

function findings(text, where) {
  const out = [];
  for (const [re, what] of RULES) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    for (const m of text.matchAll(g)) {
      if (what === 'an email address' && EMAIL_OK.has(m[0].toLowerCase())) continue;
      out.push(`${where}: ${what} (“${m[0].slice(0, 40)}”)`); break;
    }
  }
  return out;
}
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));

export async function check(dir) {
  const problems = []; let total = 0;
  for (const file of files(dir)) {
    const rel = path.relative(dir, file).split(path.sep).join('/'), buf = fs.readFileSync(file);
    total += buf.length;
    if (buf.length > PAGES_FILE) problems.push(`${rel}: over the 100 MB GitHub Pages takes for a file`);
    if (!ALLOWED.has(path.extname(rel).toLowerCase())) problems.push(`${rel}: not a kind of file the site publishes`);
    for (const re of BAD_PATH) if (re.test(rel)) problems.push(`${rel}: a private path`);
    problems.push(...findings(rel, `${rel} (its name)`), ...findings(buf.toString('latin1'), rel), ...findings(buf.toString('utf8'), rel));
    if (/\.(zip|jotz)$/i.test(rel)) {
      const zip = await globalThis.JSZip.loadAsync(buf);
      for (const [name, entry] of Object.entries(zip.files)) {
        if (entry.dir) continue;
        const inner = `${rel} › ${name}`;
        for (const re of BAD_PATH) if (re.test(name)) problems.push(`${inner}: a private path`);
        problems.push(...findings(name, `${inner} (its name)`), ...findings(Buffer.from(await entry.async('uint8array')).toString('utf8'), inner));
      }
    }
    if (/\.pdf$/i.test(rel)) {
      let text;
      try { text = execFileSync('pdftotext', ['-q', file, '-'], { maxBuffer: 256 * 1024 * 1024 }).toString(); } catch (e) { problems.push(`${rel}: could not read its text (${e.code === 'ENOENT' ? 'install poppler-utils for pdftotext' : e.message})`); continue; }
      let info = ''; try { info = execFileSync('pdfinfo', [file]).toString(); } catch { /* pdftotext worked; pdfinfo is extra */ }
      problems.push(...findings(text, `${rel} (text)`), ...findings(info, `${rel} (document properties)`));
    }
  }
  if (total > PAGES_SITE) problems.push(`the site is ${(total / 1048576).toFixed(0)} MB, over the 1 GB GitHub Pages publishes`);
  return [...new Set(problems)];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = path.resolve(process.argv[2] || path.join(ROOT, 'site/dist'));
  const problems = await check(dir);
  if (problems.length) { console.error(`privacy check: ${problems.length} problem${problems.length > 1 ? 's' : ''} in ${path.relative(ROOT, dir) || dir}\n  ${problems.join('\n  ')}`); process.exit(1); }
  console.log(`privacy check: ${files(dir).length} files in ${path.relative(ROOT, dir)}, nothing personal, private or secret`);
}
