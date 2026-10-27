// Stop hook: the fast generated-file checks from AGENTS.md, so Claude doesn't end a turn with a stale copy or MANIFEST.json.
// Exit 2 sends the failures back to Claude to fix; a second stop in a row (stop_hook_active) is let through.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
if (input.stop_hook_active) process.exit(0);
const changed = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const ahead = spawnSync('git', ['log', '--oneline', '@{u}..'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
if (!changed && !ahead) process.exit(0);
const checks = ['vscode/sync.mjs', 'tools/build-handwriting-css.mjs', 'site/build-guides.mjs', 'tools/sync-roadmap.mjs', 'tools/manifest.cjs'];
const failed = checks.map((c) => [c, spawnSync('node', [c, '--check'], { cwd: ROOT, encoding: 'utf8' })]).filter(([, r]) => r.status !== 0);
if (!failed.length) process.exit(0);
console.error(failed.map(([c, r]) => `node ${c} --check failed:\n${(r.stderr || r.stdout).trim()}`).join('\n\n') + '\n\nRegenerate as AGENTS.md "Generated files" describes (manifest last).');
process.exit(2);
