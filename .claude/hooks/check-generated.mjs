// Stop hook: tools/check-generated.mjs, so Claude doesn't end a turn with a stale copy or MANIFEST.json.
// Exit 2 sends the failures back to Claude to fix; a second stop in a row (stop_hook_active) is let through.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
if (input.stop_hook_active) process.exit(0);
const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
if (!git('status', '--porcelain') && !git('log', '--oneline', '@{u}..')) process.exit(0);
const r = spawnSync(process.execPath, ['tools/check-generated.mjs'], { cwd: ROOT, encoding: 'utf8' });
if (r.status === 0) process.exit(0);
console.error(r.stderr.trim());
process.exit(2);
