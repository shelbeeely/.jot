// A downloadable skill must read indexed Jotz away from the repository, without npm or a network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { pack } from '../parser/container.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('downloaded skill validates and searches indexed Jotz outside the repository', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-skill-'));
  try {
    const zipPath = path.join(temp, 'skill.zip');
    execFileSync('python3', [path.join(root, 'tools/build-agent-skill.py'), '--output', zipPath]);
    const zip = await globalThis.JSZip.loadAsync(fs.readFileSync(zipPath));
    for (const file of Object.values(zip.files)) {
      if (file.dir) continue;
      const target = path.resolve(temp, file.name);
      assert.ok(target.startsWith(temp + path.sep));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, await file.async('uint8array'));
    }
    const archive = path.join(temp, 'journal.jotz');
    const source = '### 2026-10-01\n\nTea beside the window.\n\n[Local note](media/note.txt)\n';
    fs.writeFileSync(archive, await pack({ source, index: 'always', assets: [{ path: 'media/note.txt', mediaType: 'text/plain', data: 'Bundled note.' }] }));
    const skill = path.join(temp, 'to-jot');
    const output = execFileSync(process.execPath, [path.join(skill, 'scripts/validate.mjs'), '--json', archive], { cwd: temp, encoding: 'utf8' });
    assert.deepEqual(JSON.parse(output), []);
    const code = `const {readDocument}=await import(${JSON.stringify(pathToFileURL(path.join(skill, 'runtime/parser/container.mjs')).href)});
      const {journalDays,validatePlace,placeFile,readPlaceFile}=await import(${JSON.stringify(pathToFileURL(path.join(skill, 'runtime/site/dist/scene-journal-core.mjs')).href)});
      const fs=await import('node:fs');
      const doc=await readDocument(new Uint8Array(fs.readFileSync(${JSON.stringify(archive)})));
      try {
        if(!doc.index || doc.index.search({query:'Tea'}).length!==1 || doc.assets.length!==1) throw Error('Incomplete indexed archive');
        const day=journalDays(doc.source)[0];
        const place=validatePlace({objects:[{name:'Window',moments:[1],shapes:[{type:'box'}]}]},day.sentences);
        const saved=readPlaceFile(placeFile(place,{model:'Source-authored test',at:'2026-10-01T00:00:00Z'}),day);
        if(saved.objects[0].moments[0].missing || saved.objects[0].moments[0].text!==day.sentences[0]) throw Error('Ungrounded saved scene');
      } finally { doc.index?.close(); }`;
    execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: temp, stdio: 'pipe' });
    assert.ok(fs.existsSync(path.join(skill, 'reference/media.md')));
    assert.ok(fs.existsSync(path.join(skill, 'runtime/parser/vendor/sqlite/SQLITE-LICENSE.txt')));
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
