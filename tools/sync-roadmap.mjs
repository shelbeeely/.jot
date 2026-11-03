// Separate canonical roadmaps. Published peers use local links; unpublished proposals name their repository paths.
import fs from 'node:fs';
const root = new URL('../', import.meta.url), check = process.argv.includes('--check');
const format = fs.readFileSync(new URL('specification/ROADMAP.md', root), 'utf8');
const writer = fs.readFileSync(new URL('WRITER-ROADMAP.md', root), 'utf8');
const publicWriter = writer.replaceAll('(specification/ROADMAP.md)', '(ROADMAP.md)').replaceAll('(docs/security/README.md)', '(docs/security-testing.md)')
  .replace(/\(specification\/(Jot-[^)]+\.md)\)/g, '(docs/$1)')
  .replace(/\(docs\/guide\/([^)]+)\.md\)/g, '(guide/$1.html)')
  .replace(/\[([^\]]+)\]\((docs\/proposals\/[^)]+)\)/g, '$1 (repository source: `$2`)');
for (const [name, text] of [
  ['parser/ROADMAP.md', format],
  ['site/dist/ROADMAP.md', format.replaceAll('(../WRITER-ROADMAP.md)', '(WRITER-ROADMAP.md)').replaceAll('(../docs/security/README.md)', '(docs/security-testing.md)')],
  ['site/dist/WRITER-ROADMAP.md', publicWriter]
]) {
  const target = new URL(name, root);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== text) throw Error(`${name} is stale: run node tools/sync-roadmap.mjs`);
  } else fs.writeFileSync(target, text);
}
console.log(check ? 'Format and Writer roadmaps: current' : 'Format and Writer roadmaps: synchronized');
