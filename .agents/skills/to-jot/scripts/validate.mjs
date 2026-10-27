#!/usr/bin/env node
// Strict validation using Jot's canonical CLI; no network or npm dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: node <skill>/scripts/validate.mjs [--repo PATH] [--json] <file.jot|file.jotz>…\nFails on errors and warnings. Files are never changed.');
  process.exit(args.includes('--help') ? 0 : 2);
}
let repo;
const at = args.indexOf('--repo');
if (at !== -1) {
  repo = args[at + 1];
  if (!repo || repo.startsWith('--')) { console.error('--repo needs a repository path.'); process.exit(2); }
  args.splice(at, 2);
}
const candidates = repo ? [path.resolve(repo, 'cli/jot.mjs')] : [path.join(skill, 'runtime/cli/jot.mjs')];
if (!repo) for (const start of [skill, process.cwd()]) {
  let dir = start;
  while (true) {
    candidates.push(path.join(dir, 'cli/jot.mjs'));
    const parent = path.dirname(dir); if (parent === dir) break; dir = parent;
  }
}
const cli = candidates.find((f) => fs.existsSync(f) && fs.existsSync(path.resolve(path.dirname(f), '../parser/jot.mjs')));
if (!cli) { console.error('Jot validator not found. Use the bundled skill download or pass --repo /path/to/.jot. Validation has not run.'); process.exit(2); }
const result = spawnSync(process.execPath, [cli, 'check', '--strict', ...args], { stdio: 'inherit' });
if (result.error) { console.error('Validation could not run: ' + result.error.message); process.exit(2); }
process.exit(result.status ?? 2);
