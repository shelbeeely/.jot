// Copies the Jot parser and page renderer into the extension (media/jot/), so the preview runs the very same code as the site.
//   node sync.mjs            # copy
//   node sync.mjs --check    # fail if a copy is out of date (CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), from = path.join(here, '../parser'), to = path.join(here, 'media/jot');
const FILES = ['jot.mjs', 'charts.mjs', 'preview.mjs', 'handwriting.mjs', 'styles.mjs', 'export.mjs', 'automation.mjs', 'connect.mjs', 'vendor/marked.mjs', 'vendor/marked-LICENSE.md', 'vendor/chart.mjs', 'vendor/chart-LICENSE.md', ...fs.readdirSync(path.join(from, 'fonts')).sort().map((f) => `fonts/${f}`)];
const check = process.argv.includes('--check'), stale = [];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(from, f)), dst = path.join(to, f);
  if (check) { if (!fs.existsSync(dst) || !fs.readFileSync(dst).equals(src)) stale.push(f); continue; }
  fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, src);
}
if (check && stale.length) { console.error(`vscode/media/jot is out of date (${stale.join(', ')}): run node vscode/sync.mjs`); process.exit(1); }
console.log(check ? 'vscode/media/jot: current' : `vscode/media/jot: copied ${FILES.length} files`);
