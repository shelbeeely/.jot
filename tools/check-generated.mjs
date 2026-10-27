// The fast generated-file checks in one command (about a second): extension copies, handwriting CSS, guides, roadmap, MANIFEST.json.
// Run it before committing; it does not replace the full Verification list in AGENTS.md.
//   node tools/check-generated.mjs     exit 1 and name each stale check
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = ['vscode/sync.mjs', 'tools/build-handwriting-css.mjs', 'site/build-guides.mjs', 'tools/sync-roadmap.mjs', 'tools/manifest.cjs'];
const failed = checks.map((c) => [c, spawnSync(process.execPath, [c, '--check'], { cwd: ROOT, encoding: 'utf8' })]).filter(([, r]) => r.status !== 0);
for (const [c, r] of failed) console.error(`node ${c} --check failed:\n${(r.stderr || r.stdout).trim()}\n`);
if (failed.length) { console.error('Regenerate as AGENTS.md "Generated files" describes (manifest last).'); process.exit(1); }
console.log(`Generated files: ${checks.length} checks current`);
