// MANIFEST.json: the byte size and SHA-256 of every file in the repository (git's list), so a copy can be checked against it.
// A symbolic link (.claude/skills/to-jot) is hashed as git stores it: the path it points to.
//   node tools/manifest.cjs          rewrite MANIFEST.json (after adding or changing files; commit it with them)
//   node tools/manifest.cjs --check  exit 1 and name the files that differ
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'MANIFEST.json');
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT }).toString().split('\0')
  .filter((f) => f && f !== 'MANIFEST.json' && (() => { try { return fs.lstatSync(path.join(ROOT, f)); } catch { return false; } })()).sort();
const manifest = { project: 'Jot', formatVersion: '1.0', files: files.map((f) => { const p = path.join(ROOT, f), b = fs.lstatSync(p).isSymbolicLink() ? Buffer.from(fs.readlinkSync(p)) : fs.readFileSync(p); return { path: f, byteLength: b.length, sha256: crypto.createHash('sha256').update(b).digest('hex') }; }) };
const text = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')).files : [], key = (x) => `${x.path} ${x.sha256}`;
  const a = new Set(old.map(key)), b = new Set(manifest.files.map(key));
  const diff = [...new Set([...old.filter((x) => !b.has(key(x))), ...manifest.files.filter((x) => !a.has(key(x)))].map((x) => x.path))];
  if (diff.length) { console.error(`MANIFEST.json is out of date (${diff.length}): ${diff.slice(0, 20).join(', ')}${diff.length > 20 ? ' ...' : ''}\nRun: node tools/manifest.cjs`); process.exit(1); }
  console.log(`MANIFEST.json: ${manifest.files.length} files match`);
} else { fs.writeFileSync(OUT, text); console.log(`MANIFEST.json: ${manifest.files.length} files`); }
