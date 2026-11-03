// Generated-file checks in one command: original fonts, extension copies, handwriting CSS, guides, roadmap, methods index, the logo on the site, MANIFEST.json.
// Run it before committing; it does not replace the full Verification list in AGENTS.md.
//   node tools/check-generated.mjs     exit 1 and name each stale check
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  { command: 'python3', args: ['fonts/build.py', '--check'], label: 'python3 fonts/build.py --check' },
  ...['tools/sync-navigation.mjs', 'tools/sync-parser.mjs', 'tools/sync-archive-specs.mjs', 'tools/build-archive-examples.mjs', 'tools/sync-fonts.mjs', 'vscode/sync.mjs', 'tools/build-handwriting-css.mjs', 'site/build-guides.mjs', 'tools/sync-roadmap.mjs', 'tools/build-methods-index.mjs', 'tools/sync-brand.mjs', 'tools/build-offline.mjs', 'tools/manifest.cjs']
    .map((script) => ({ command: process.execPath, args: [script, '--check'], label: `node ${script} --check` }))
];
const failed = checks.map((check) => [check, spawnSync(check.command, check.args, { cwd: ROOT, encoding: 'utf8' })]).filter(([, result]) => result.status !== 0);
for (const [check, result] of failed) console.error(`${check.label} failed:\n${(result.stderr || result.stdout || result.error?.message || 'Command did not complete.').trim()}\n`);
if (failed.length) { console.error('Regenerate as AGENTS.md "Generated files" describes (manifest last).'); process.exit(1); }
console.log(`Generated files: ${checks.length} checks current`);
