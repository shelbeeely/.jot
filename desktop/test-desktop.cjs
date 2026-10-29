// The Jot desktop app (Tauri v2), driven through WebDriver: tauri-driver in front of WebKitWebDriver, the real app window, on a
// virtual display. Parity: every page loads and renders in the app's web view. Enhancements: downloads become saved files, the import
// page reads exports through the app (ZIPs and a folder at once), hostile archives are refused, and the network is locked down.
// Needs: a debug build (cargo build in src-tauri), tauri-driver (cargo install tauri-driver --locked), WebKitWebDriver and Xvfb.
// Run: cd desktop && xvfb-run -a node test-desktop.cjs
const { spawn } = require('node:child_process'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const APP = path.join(__dirname, 'src-tauri/target/debug/jot-desktop'), FIX = path.join(__dirname, '../converter/fixtures/archives');
const DRIVER = process.env.TAURI_DRIVER || path.join(os.homedir(), '.cargo/bin/tauri-driver'), PORT = 4444;
const walk = (d, pre = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), pre + e.name + '/') : [pre + e.name]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wd(method, url, body) {
  const res = await fetch(`http://127.0.0.1:${PORT}${url}`, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${url}: ${JSON.stringify(json.value || json).slice(0, 400)}`);
  return json.value;
}

(async () => {
  for (const [what, p] of [['the app (cargo build in src-tauri)', APP], ['tauri-driver', DRIVER]]) if (!fs.existsSync(p)) throw new Error(`missing ${what}: ${p}`);
  await import('../parser/vendor/jszip.mjs'); const { parse } = await import('../parser/jot.mjs');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-desktop-')), saved = path.join(tmp, 'saved'); fs.mkdirSync(saved);
  const zipOf = async (name, files) => { const z = new globalThis.JSZip(); for (const [p, b] of files) z.file(p, b); const f = path.join(tmp, name); fs.writeFileSync(f, await z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })); return f; };
  const fromFixture = (sub) => walk(path.join(FIX, sub)).map((p) => [p, fs.readFileSync(path.join(FIX, sub, p))]);
  const picks = [
    await zipOf('twitter.zip', fromFixture('twitter')),
    await zipOf('facebook.zip', fromFixture('facebook')),
    path.join(FIX, 'takeout'), // an unzipped folder
    // hostile: a posts file that would unpack to 80 MB of zeros from a few KB, and a name that points outside the archive
    await zipOf('hostile.zip', [['data/tweets.js', Buffer.alloc(80 << 20)], ['../outside.txt', 'escape'], ['outbox.json', JSON.stringify({ orderedItems: [] })]]),
  ];
  const driver = spawn(DRIVER, ['--port', String(PORT)], { env: { ...process.env, JOT_TEST_PICK: picks.join('\n'), JOT_TEST_SAVE_DIR: saved, XDG_DATA_HOME: path.join(tmp, 'data'), XDG_CONFIG_HOME: path.join(tmp, 'config'), XDG_CACHE_HOME: path.join(tmp, 'cache') } /* a fresh profile each run */, stdio: ['ignore', 'ignore', 'pipe'] });
  let session;
  const done = () => { try { driver.kill(); } catch { /* gone */ } fs.rmSync(tmp, { recursive: true, force: true }); };
  try {
    for (let i = 0; i < 50; i++) { try { await wd('GET', '/status'); break; } catch { await sleep(200); } }
    const start = async (args = []) => { session = (await wd('POST', '/session', { capabilities: { alwaysMatch: { 'tauri:options': { application: APP, args } } } })).sessionId; };
    await start();
    const S = { toString: () => `/session/${session}` };
    const run = (script, ...args) => wd('POST', `${S}/execute/sync`, { script, args });
    const runAsync = (body, ...args) => wd('POST', `${S}/execute/async`, { script: `const done = arguments[arguments.length - 1]; (async () => { ${body} })().then(done, (e) => done({ error: String(e && e.message || e) }));`, args });
    const until = async (script, what, ms = 20000) => { for (let t = 0; t < ms; t += 200) { if (await run(script)) return; await sleep(200); } throw new Error('timed out: ' + what); };
    const go = async (page) => { await run(`location.href = new URL(${JSON.stringify(page)}, location.href).href;`); await sleep(300); await until(`return document.readyState === 'complete' && location.pathname.endsWith(${JSON.stringify(page.replace(/^\.\.\//, '/'))})`, 'load ' + page); };
    const checks = [];

    // Parity: every page loads and renders in the app's web view, with the bridge present
    await until(`return document.readyState === 'complete' && !!document.querySelector('#writing')`, 'the writer');
    assert.equal(await run('return typeof window.jotDesktop === "object" && window.jotDesktop.app'), 'tauri');
    await until(`return !!document.querySelector('[contenteditable="true"]') && document.querySelector('#paperPreview') && document.querySelector('#paperPreview').textContent.trim().length > 0`, 'the writer, its live editor and its page preview');
    checks.push('writer renders');
    // What this web view offers the pages: locking needs Web Crypto; passkeys need WebAuthn; voice practice needs a microphone API
    const caps = await run(`return { secure: isSecureContext, subtle: !!(crypto && crypto.subtle), webauthn: typeof PublicKeyCredential !== 'undefined', mic: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), compression: typeof DecompressionStream !== 'undefined' }`);
    assert.ok(caps.secure && caps.subtle, 'Web Crypto for locked journals: ' + JSON.stringify(caps));
    const lock = await runAsync(`const L = await import('../jot/lock.mjs'); const { session } = await L.createLock('a desktop passphrase', { iterations: 100000 }); const b = await L.lock('desktop', session); return new TextDecoder().decode(await L.unlock(b, 'a desktop passphrase'));`);
    assert.equal(lock, 'desktop', 'locking works in the app: ' + JSON.stringify(lock));
    console.log('web view: ' + JSON.stringify(caps));
    checks.push('locking works');
    for (const [page, ready, what] of [
      ['../editor/index.html', `return document.querySelector('#jot') && /### 2026|Jot: 1\\.0/.test(document.querySelector('#jot').textContent)`, 'template editor'],
      ['../convert/index.html', `return !!document.querySelector('#open')`, 'diary converter'],
      ['../guide/index.html', `return document.querySelectorAll('main a').length > 3`, 'guides'],
      ['../import/index.html', `return !!document.querySelector('#add-zip') && document.querySelector('#size-hint').textContent.includes('any size')`, 'importer, in app mode'],
    ]) { await go(page); await until(ready, what); assert.equal(await run('return typeof window.jotDesktop'), 'object', what + ' has the bridge'); checks.push(what + ' renders'); }

    // The network is locked down: a request to anywhere but the listening tool's services is refused by the content security policy
    const net = await runAsync(`let v = 0; document.addEventListener('securitypolicyviolation', () => v++); try { await fetch('https://example.org/'); return { fetched: true, v }; } catch { await new Promise((r) => setTimeout(r, 100)); return { fetched: false, v }; }`);
    assert.equal(net.fetched, false); assert.ok(net.v >= 1, 'blocked by the content security policy, not just by the network');
    // and a link to the web does not load inside the app
    await run(`const a = document.createElement('a'); a.href = 'https://example.org/'; document.body.append(a); a.click();`); await sleep(800);
    assert.match(await run('return location.href'), /\/import\/index\.html$/); checks.push('network locked, web links kept out of the app');

    // The importer, through the app: two ZIPs, a folder and a hostile ZIP, picked at once
    await run(`document.querySelector('#add-zip').click()`);
    await until(`return document.querySelectorAll('#found li').length === 4`, 'four exports listed');
    const found = await run(`return [...document.querySelectorAll('#found li')].map((l) => l.textContent)`);
    assert.deepEqual(found.slice(0, 3), ['twitter.zip: X / Twitter', 'facebook.zip: Facebook', 'takeout: Google Keep, Blogger']);
    assert.match(found[3], /^hostile\.zip: X \/ Twitter, Mastodon \(1 file skipped as unsafe\)$/, 'the escaping name is listed as skipped');
    await run(`document.querySelector('#go').click()`);
    await until(`return /posts and notes/.test(document.querySelector('#check').textContent)`, 'the journal is made', 60000);
    const check = await run(`return document.querySelector('#check').textContent`), warn = await run(`return document.querySelector('#warnings').textContent`);
    assert.match(check, /^8 posts and notes from X \/ Twitter \(4\), Facebook \(2\), Google Keep \(2\), Blogger \(1\)[\s\S]*Every file is valid Jot\./, check);
    assert.match(warn, /hostile\.zip|data\/tweets\.js: not readable/, 'the ZIP bomb was refused and reported: ' + warn);
    checks.push('import through the app, ZIP bomb and escaping name refused');

    // Downloads become saved files (a Save dialog in use; the test folder here)
    await run(`document.querySelector('#dl-one').click()`);
    await until(`return true`, 'tick'); for (let t = 0; t < 50 && !fs.readdirSync(saved).length; t++) await sleep(200);
    const files = fs.readdirSync(saved); assert.deepEqual(files, ['life-online-2009.jot']);
    const text = fs.readFileSync(path.join(saved, files[0]), 'utf8'); assert.match(text, /^---\nJot: 1\.0\nTitle: My life online · 2009/); assert.deepEqual(parse(text).diagnostics, []);
    await go('../write/index.html'); await until(`return !!document.querySelector('#writing')`, 'the writer');
    await run(`const w = document.querySelector('#writing'); w.value = '### 2026-10-29 | Thursday\\n\\nWritten in the desktop app.\\n'; w.dispatchEvent(new Event('input')); document.querySelector('#downloadJot').click();`);
    for (let t = 0; t < 50 && fs.readdirSync(saved).length < 2; t++) await sleep(200);
    assert.equal(fs.readFileSync(path.join(saved, 'my-journal.jot'), 'utf8'), '### 2026-10-29 | Thursday\n\nWritten in the desktop app.\n');
    assert.ok(!fs.readdirSync(saved).some((f) => f.endsWith('.jot-saving')), 'written atomically: no temporary file left');
    checks.push('downloads saved (writer and importer), atomically');

    // A journal double-clicked in the file manager: the app starts with its path (Windows, Linux) and the writer opens it
    await wd('DELETE', `${S}`); session = null;
    const journal = path.join(tmp, 'From the file manager.jot');
    fs.writeFileSync(journal, '### 2026-10-30 | Friday\n\nOpened from the file manager.\n');
    await start([journal]);
    await until(`return document.querySelector('#writing') && document.querySelector('#writing').value.includes('Opened from the file manager.')`, 'the journal opened from the file manager');
    assert.equal(await run(`return document.querySelector('#documentName').value`), 'From the file manager');
    checks.push('a journal passed by the file manager opens in the writer');
    console.log('PASS: ' + checks.join('; ') + '.');
  } finally {
    if (session) await wd('DELETE', `/session/${session}`).catch(() => {});
    done();
  }
})().catch((e) => { console.error(e); process.exitCode = 1; });
