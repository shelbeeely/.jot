import { createHash } from 'node:crypto';
// The privacy gate for the published site: nothing personal, private or secret leaves through GitHub Pages.
//   node tools/privacy-check.mjs [site/dist]
// Reads every file (raw bytes, so image text chunks count too), decoded .zip/.jotz members and metadata, and PDF text (pdftotext, from
// poppler-utils: required, so a PDF is never waved through unread). Exit 1 lists every finding.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { readDocument } from '../parser/container.mjs';
import '../parser/vendor/jszip.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// what the site is made of; anything else (a calendar, a database, an archive of a book build, a key) is not published
const ALLOWED = new Set(['.html', '.css', '.js', '.mjs', '.json', '.md', '.jot', '.jotz', '.zip', '.pdf', '.png', '.svg', '.ico', '.txt', '.webmanifest', '.woff2', '.wasm']); // .woff2: the handwriting fonts (jot/fonts/, SIL OFL)
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
// Preserve public upstream author contacts only in these exact, pinned vendored files (a licence; Paged.js's bundled css-tree package metadata).
const LICENSE_EMAILS = { 'vendor/browser/dijkstrajs-LICENSE.md.txt': { sha256: 'c46324e45a005413535a6fb7a97e9eacd3cc6bf30335b7d5c10b8ee3af9e60c2', emails: ['self@wyattbaldwin.com'] }, 'vendor/pagedjs/paged.mjs': { sha256: '6d7ae76b6f3ae8ccd06cdb2f8ca65acb6be25702e57bf65af89ef5067ad5e9e3', emails: ['rdvornov@gmail.com'] } };
// Deliberately published fictional fixtures only. A different name or a single changed byte closes these exceptions.
// The CSV remains fully scanned. The mixed archive also has to decrypt, match its all-public companion and pass content scans.
const PUBLIC_FIXTURES = {
  'examples/demo-numbers.csv': { sha256: 'b7bb138e8edb7664a0ee6231fe78bc7f2a9d18e29d0d4f5b8ac8132c694cd28d' },
  'examples/demo-month-mixed.jotz': { sha256: 'e34ca2b8396456352141aaee628ba047a218cc1afa693add947d759db2319ecd' },
};
const MIXED_DEMO = 'examples/demo-month-mixed.jotz', PUBLIC_DEMO = 'examples/demo-month.jotz';
const ENCRYPTED_MEMBER = /^private\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.enc$/;
const PAGES_FILE = 100 * 1024 * 1024, PAGES_SITE = 1024 * 1024 * 1024; // GitHub Pages limits

function findings(text, where, allowedEmails = EMAIL_OK) {
  const out = [];
  for (const [re, what] of RULES) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    for (const m of text.matchAll(g)) {
      if (what === 'an email address' && allowedEmails.has(m[0].toLowerCase())) continue;
      out.push(`${where}: ${what} (“${m[0].slice(0, 40)}”)`); break;
    }
  }
  return out;
}
const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));

/** The mixed fixture's plaintext goes through the ordinary gate too; exported so tests exercise hidden-payload scanning. */
export function decryptedFindings(doc, where) {
  const out = findings(doc.source, `${where} (decrypted writing)`);
  out.push(...findings(JSON.stringify(doc.metadata), `${where} (decrypted document metadata)`),
    ...findings(JSON.stringify(doc.entries), `${where} (decrypted entry metadata)`));
  for (const asset of doc.assets) {
    const inner = `${where} (decrypted ${asset.path})`, { data, ...metadata } = asset;
    for (const re of BAD_PATH) if (re.test(asset.path)) out.push(`${inner}: a private path`);
    out.push(...findings(JSON.stringify(metadata), `${inner} (asset metadata)`),
      ...findings(Buffer.from(data).toString('utf8'), inner), ...findings(Buffer.from(data).toString('latin1'), inner));
  }
  return out;
}

async function auditMixedDemo(bytes, dir, where) {
  let mixed, publicDoc;
  try {
    mixed = await readDocument(bytes, { secret: 'jot-demo-only' }); // Public fixture passphrase, printed in its walkthrough.
    const problems = decryptedFindings(mixed, where);
    publicDoc = await readDocument(fs.readFileSync(path.join(dir, PUBLIC_DEMO)));
    const entries = (doc) => doc.entries.map(({ id, date, source, timezone, createdAt, updatedAt, revision }) => ({ id, date, source, timezone, createdAt, updatedAt, revision }));
    const assets = (doc) => doc.assets.map(({ data, ...metadata }) => ({ ...metadata, data: Buffer.from(data) })).sort((a, b) => a.path.localeCompare(b.path));
    const equal = mixed.protected && !mixed.partial && !publicDoc.protected && !publicDoc.partial && mixed.source === publicDoc.source &&
      isDeepStrictEqual(mixed.metadata, publicDoc.metadata) && isDeepStrictEqual(entries(mixed), entries(publicDoc)) && isDeepStrictEqual(assets(mixed), assets(publicDoc));
    if (!equal) problems.push(`${where}: decrypted demo does not match its all-public companion`);
    const members = [...mixed.manifest.entries, ...mixed.manifest.assets, mixed.manifest.catalog].filter((member) => member?.encryption).map((member) => member.path);
    return { problems, encrypted: equal ? new Set(members.filter((name) => ENCRYPTED_MEMBER.test(name))) : new Set() };
  } finally { mixed?.index?.close(); publicDoc?.index?.close(); }
}

export async function check(dir) {
  const problems = []; let total = 0;
  for (const file of files(dir)) {
    const rel = path.relative(dir, file).split(path.sep).join('/'), buf = fs.readFileSync(file);
    const fixture = PUBLIC_FIXTURES[rel], pinned = fixture && createHash('sha256').update(buf).digest('hex') === fixture.sha256;
    total += buf.length;
    if (buf.length > PAGES_FILE) problems.push(`${rel}: over the 100 MB GitHub Pages takes for a file`);
    if (!ALLOWED.has(path.extname(rel).toLowerCase()) && !(pinned && rel === 'examples/demo-numbers.csv')) problems.push(`${rel}: not a kind of file the site publishes`);
    if (fixture && !pinned) problems.push(`${rel}: published fixture does not match its audited SHA-256 pin`);
    for (const re of BAD_PATH) if (re.test(rel)) problems.push(`${rel}: a private path`);
    problems.push(...findings(rel, `${rel} (its name)`));
    const archive = /\.(zip|jotz)$/i.test(rel);
    // Compressed payload bytes are not text and can coincidentally resemble an email or token.
    // Inspect the actual decoded members and comments instead, retaining raw scans for other files.
    if (!archive) { const license = LICENSE_EMAILS[rel], allowedEmails = license && createHash('sha256').update(buf).digest('hex') === license.sha256 ? new Set(license.emails) : EMAIL_OK; problems.push(...findings(buf.toString('latin1'), rel, allowedEmails), ...findings(buf.toString('utf8'), rel, allowedEmails)); }
    if (archive) {
      const zip = await globalThis.JSZip.loadAsync(buf);
      let auditedEncrypted = new Set();
      if (rel === MIXED_DEMO && pinned) {
        try { const audit = await auditMixedDemo(buf, dir, rel); problems.push(...audit.problems); auditedEncrypted = audit.encrypted; }
        catch (error) { problems.push(`${rel}: could not audit the decrypted demo (${error.message})`); }
      }
      problems.push(...findings(zip.comment || '', `${rel} (archive comment)`));
      for (const [name, entry] of Object.entries(zip.files)) {
        const inner = `${rel} › ${name}`;
        const knownCiphertext = auditedEncrypted.has(name);
        for (const re of BAD_PATH) if (re.test(name) && !(knownCiphertext && re === BAD_PATH[0])) problems.push(`${inner}: a private path`);
        problems.push(...findings(name, `${inner} (its name)`), ...findings(entry.unsafeOriginalName || '', `${inner} (original name)`), ...findings(entry.comment || '', `${inner} (comment)`));
        if (entry.dir) continue;
        // Only these exact audited ciphertext members skip text interpretation: their decrypted payload was scanned above.
        if (knownCiphertext) continue;
        const data = Buffer.from(await entry.async('uint8array'));
        problems.push(...findings(data.toString('utf8'), inner), ...findings(data.toString('latin1'), inner));
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
