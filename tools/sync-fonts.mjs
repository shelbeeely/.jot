// Distribute the original generated fonts without changing the retained legacy families.
// Run after fonts/build.py; --check verifies the site and parser use those exact artifacts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.join(root, 'fonts/generated');
const catalog = JSON.parse(fs.readFileSync(path.join(generated, 'catalog.json'), 'utf8'));
const names = [...new Set(catalog.fonts.map((font) => font.file))];
if (names.length !== 8 || names.some((name) => !/^jot-(sans|script-(05|07|10))-(400|700)\.woff2$/.test(name))) {
  throw new Error('The original font catalog must describe the eight expected Jot faces.');
}
const copies = names.concat('jot-original-OFL.txt').flatMap((name) => ['parser/fonts', 'site/dist/jot/fonts'].map((directory) => [name, `${directory}/${name}`]));
copies.push(['catalog.json', 'site/dist/fonts/catalog.json']);
const check = process.argv.includes('--check'), stale = [];
for (const [name, destination] of copies) {
  const bytes = fs.readFileSync(path.join(generated, name)), target = path.join(root, destination);
  if (check) {
    if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) stale.push(destination);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes);
  }
}
if (stale.length) {
  console.error(`Original font copies are stale: ${stale.join(', ')}. Run node tools/sync-fonts.mjs.`); process.exit(1);
}
console.log(`Original font copies: ${check ? 'current' : 'updated'} (${copies.length} files).`);
