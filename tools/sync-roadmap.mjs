// specification/ROADMAP.md is canonical; publish identical copies with the parser and site.
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const source = fs.readFileSync(new URL('specification/ROADMAP.md', root));
const copies = ['parser/ROADMAP.md', 'site/dist/ROADMAP.md'];
const check = process.argv.includes('--check');
for (const name of copies) {
  const file = new URL(name, root);
  if (check) {
    if (!fs.readFileSync(file).equals(source)) throw Error(`${name} is stale: run node tools/sync-roadmap.mjs`);
  } else fs.writeFileSync(file, source);
}
console.log(check ? 'roadmaps: current' : 'roadmaps: synchronized');
