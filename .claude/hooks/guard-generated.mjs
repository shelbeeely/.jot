// PreToolUse hook: refuse Edit/Write on generated files and copies, naming what to change instead (AGENTS.md "Generated files").
// Regenerating through the build commands is unaffected.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const COPIES = 'jot|container|proofread|charts|preview|handwriting|styles|palette|export|automation|connect|include|query|health';
const GENERATED = [
  [new RegExp(`^site/dist/jot/((${COPIES})\\.mjs$|vendor/(chart|marked)\\.mjs$|fonts/)`), 'the module in parser/, then copy it to site/dist/jot/'],
  [/^site\/dist\/jot\/convert\.mjs$/, 'converter/convert.mjs, then copy it to site/dist/jot/'],
  [/^vscode\/media\/jot\//, 'the module in parser/, then run node vscode/sync.mjs'],
  [/^(parser|site\/dist\/jot)\/handwriting\.css$/, 'parser/handwriting.mjs, then run node tools/build-handwriting-css.mjs'],
  [/^(parser|site\/dist)\/ROADMAP\.md$/, 'specification/ROADMAP.md, then run node tools/sync-roadmap.mjs'],
  [/^site\/dist\/guide\/[^/]+\.html$/, 'the guide in docs/guide/, then run node site/build-guides.mjs'],
  [/^site\/dist\/examples\/(diaries\/|index\.(json|html)$)/, 'converter/ or tools/build-examples.mjs, then run node tools/build-examples.mjs'],
  [/^site\/dist\/docs\/jot-parser\.zip$/, 'parser/, then run python3 tools/build-parser-zip.py'],
  [/^(site\/dist\/(favicon\.(svg|ico)|apple-touch-icon\.png)|vscode\/media\/(icon\.png|jot-file-(light|dark)\.svg)|desktop\/src-tauri\/linux\/jot-document\.svg)$/, 'docs/brand/ (docs/brand/source/build.sh), then run node tools/sync-brand.mjs'],
  [/^desktop\/(app-icon\.png|src-tauri\/icons\/)/, 'docs/brand/ (docs/brand/source/build.sh), then copy app-icon.png to desktop/ and run npx tauri icon (desktop/README.md)'],
  [/^MANIFEST\.json$/, 'nothing by hand: run node tools/manifest.cjs'],
];
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const file = input.tool_input?.file_path || input.tool_input?.notebook_path;
if (!file) process.exit(0);
const rel = path.relative(ROOT, path.resolve(input.cwd || ROOT, file)).split(path.sep).join('/');
const hit = GENERATED.find(([re]) => re.test(rel));
if (!hit) process.exit(0);
console.error(`${rel} is generated; don't edit it directly. Change ${hit[1]}.`);
process.exit(2);
