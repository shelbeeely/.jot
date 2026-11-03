// Structural checks for research guides. No network requests or evidence-quality scoring.
//   node tools/check-methods.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CATEGORIES = new Set(['bujo-family', 'japanese', 'mental-health', 'neurodivergent-and-creative', 'paper-and-hybrid', 'planner', 'productivity', 'reflective-writing']);
const LEVELS = new Set(['strong', 'some', 'anecdotal', 'none']);
const STATES = new Set(['draft', 'reviewed', 'needs-update']);

function prose(text) {
  let fence = '';
  return text.split('\n').map((line) => {
    const mark = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (mark && !fence) { fence = mark; return ''; }
    if (fence) { if (mark?.[0] === fence[0] && mark.length >= fence.length) fence = ''; return ''; }
    return line;
  }).join('\n');
}

export function metadata(text) {
  const front = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
  if (!front) return null;
  return Object.fromEntries([...front[1].matchAll(/^(\w+):\s*(.*?)\s*$/gm)].map(([, key, value]) => [key, value.replace(/^(["'])(.*)\1$/, '$2')]));
}

export function validateMethod(text, filename) {
  const errors = [], meta = metadata(text);
  if (!meta) return ['missing front matter'];
  for (const key of ['title', 'summary', 'slug', 'category', 'evidenceLevel', 'lastReviewed', 'status', 'licence'])
    if (!meta[key]) errors.push(`missing ${key}`);
  if (meta.slug !== path.basename(filename, '.md')) errors.push('slug must match the filename');
  if (!CATEGORIES.has(meta.category)) errors.push(`unknown category ${meta.category}`);
  if (!LEVELS.has(meta.evidenceLevel)) errors.push(`unknown evidenceLevel ${meta.evidenceLevel}`);
  if (!STATES.has(meta.status)) errors.push(`unknown status ${meta.status}`);
  if (meta.licence !== 'CC0-1.0') errors.push('licence must be CC0-1.0');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(meta.lastReviewed || '') ? new Date(`${meta.lastReviewed}T00:00:00Z`) : null;
  if (!date || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== meta.lastReviewed) errors.push('lastReviewed must be a valid YYYY-MM-DD date');
  const plain = prose(text), headings = [...plain.matchAll(/^## (\d+)\.\s+(.+)$/gm)];
  if (headings.map((m) => Number(m[1])).join(',') !== Array.from({ length: 28 }, (_, i) => i + 1).join(','))
    errors.push('expected exactly 28 numbered sections in order');
  for (const [i, heading] of headings.entries()) {
    const body = plain.slice(heading.index + heading[0].length, headings[i + 1]?.index ?? plain.length);
    // A diagram or sample can be the section's entire content; check the original text too.
    if (!body.trim() && !text.slice(text.indexOf(heading[0]) + heading[0].length).split(/^## /m)[0].trim())
      errors.push(`section ${heading[1]} is empty`);
  }
  const sources = plain.slice(headings.find((m) => m[1] === '28')?.index ?? plain.length);
  const refs = [...sources.matchAll(/^(?:(\d+)\.\s+\S|\|\s*(\d+)\s*\|)/gm)].map((m) => m[1] || m[2]);
  if (!refs.length) errors.push('section 28 needs numbered sources');
  if (new Set(refs).size !== refs.length) errors.push('duplicate source numbers');
  const known = new Set(refs);
  const citations = new Set();
  for (const [, group] of plain.matchAll(/(?<!\[)\[(\d+(?:\s*(?:[,;–-])\s*\d+)*)\](?![\[(])/g)) {
    for (const item of group.split(/[,;]/)) {
      const [start, end = start] = item.trim().split(/\s*[–-]\s*/).map(Number);
      if (end < start || end - start > 500) { errors.push(`invalid citation range [${item}]`); continue; }
      for (let id = start; id <= end; id++) citations.add(String(id));
    }
  }
  for (const id of citations)
    if (!known.has(id)) errors.push(`citation [${id}] has no source`);
  return errors;
}

function anchors(text) {
  const counts = new Map(), found = new Set();
  for (const [, heading] of prose(text).matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = heading.toLowerCase().replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{M}\p{N}_\s-]/gu, '').replace(/\s/g, '-');
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    found.add(count ? `${base}-${count}` : base);
  }
  return found;
}

export function validateLinks(text, filename, read = (file) => fs.statSync(file).isDirectory() ? '' : fs.readFileSync(file, 'utf8')) {
  const errors = [];
  // Link syntax in inline code is an example, not an actual Markdown link.
  const visible = prose(text).replace(/(?<!`)(`+)(?!`)[\s\S]*?\1(?!`)/g, '');
  for (const [, link] of visible.matchAll(/\[[^\]\n]*\]\(([^\s)]+)\)/g)) {
    if (/^[a-z][\w+.-]*:/i.test(link)) continue;
    let file, hash;
    try {
      const [target, fragment] = link.split('#');
      file = target ? path.resolve(path.dirname(filename), decodeURIComponent(target)) : filename;
      hash = fragment ? decodeURIComponent(fragment) : '';
    } catch { errors.push(`invalid local link ${link}`); continue; }
    let target;
    try { target = read(file); } catch { errors.push(`missing local target ${link}`); continue; }
    if (hash && file.endsWith('.md') && !anchors(target).has(hash)) errors.push(`missing local heading ${link}`);
  }
  return errors;
}

export function checkLibrary(root = ROOT) {
  const dir = path.join(root, 'docs/methods');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !['README.md', 'TEMPLATE.md'].includes(f)).sort();
  const errors = [];
  for (const file of files) {
    const full = path.join(dir, file), text = fs.readFileSync(full, 'utf8');
    errors.push(...[...validateMethod(text, file), ...validateLinks(text, full)].map((error) => `${file}: ${error}`));
  }
  const readme = path.join(dir, 'README.md');
  errors.push(...validateLinks(fs.readFileSync(readme, 'utf8'), readme).map((error) => `README.md: ${error}`));
  const profiles = JSON.parse(fs.readFileSync(path.join(root, 'specification/profiles.json'), 'utf8')).profiles;
  for (const profile of profiles) if (!files.includes(`${profile.id}.md`)) errors.push(`profile ${profile.id} has no research guide`);
  return { errors, guides: files.length, profiles: profiles.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkLibrary();
  if (result.errors.length) { console.error(result.errors.join('\n')); process.exitCode = 1; }
  else console.log(`Methods research: ${result.guides} guides; all ${result.profiles} profiles covered; structure, citations and local links valid`);
}
