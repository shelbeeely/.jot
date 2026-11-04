// Optional: the scribe with the REAL pinned Whistle model and synthetic speech as Chromium's microphone.
//   JOT_SPEECH_MODELS=/path/to/dir node site/test-scribe-real-ui.cjs
// The folder holds whistle.cact (the pinned file; see docs/security/README.md) and spoken.wav, the script below
// spoken by a speech synthesizer and followed by ten seconds of silence, for example:
//   espeak-ng -v en-us -s 140 -w raw.wav "I went for a walk by the canal this morning. It was raining and the heron was back. New paragraph. New task, call Sam about Saturday. Tag walk."
//   ffmpeg -i raw.wav -ar 48000 -ac 1 -af apad=pad_dur=10 spoken.wav
// Synthetic speech is not a person: recognition quality here says little about a real voice. What this checks is the
// plumbing with the real engine: it keeps up with live speech, pauses finish phrases, silence is not transcribed,
// commands work, today's entry gets the words, earlier entries do not change and nothing leaves the device.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const models = process.env.JOT_SPEECH_MODELS;
if (!models) { console.log('SKIP: set JOT_SPEECH_MODELS to a folder with whistle.cact and spoken.wav to run the real-model scribe test.'); process.exit(0); }
for (const file of ['whistle.cact', 'spoken.wav']) if (!fs.existsSync(path.join(models, file))) { console.error('Missing ' + path.join(models, file)); process.exit(1); }
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm' })[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-audio-capture=' + path.join(models, 'spoken.wav')] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [], external = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin)) external.push(r.url()); });
    // Time each request to the speech worker, to see whether it keeps up with real time.
    await page.addInitScript(() => { const W = window.Worker; window.workTimes = []; window.Worker = class extends W { constructor(...a) { super(...a); const sent = new Map(), post = this.postMessage.bind(this); this.postMessage = (m, t) => { if (m && m.id !== undefined) sent.set(m.id, [m.op, performance.now()]); return post(m, t); }; this.addEventListener('message', (e) => { const s = sent.get(e.data?.id); if (s) window.workTimes.push([s[0], Math.round(performance.now() - s[1])]); }); } }; });
    await page.goto(origin + '/write/');
    await page.waitForFunction(() => !!document.getElementById('writing').jotSetMode);
    const old = '### 2026-11-01 | Sun\n\nOld entry.\n';
    await page.evaluate((t) => { const e = document.getElementById('writing'); e.value = t; e.dispatchEvent(new Event('input', { bubbles: true })); }, old);
    await page.click('#writerVoiceMic');
    await page.waitForFunction(() => !document.getElementById('scribeSetup').hidden);
    await page.setInputFiles('#scribeFile', path.join(models, 'whistle.cact'));
    await page.waitForFunction(() => /loaded/.test(document.getElementById('scribeStatus').textContent), null, { timeout: 120000 });
    await page.click('#scribeStart');
    const statuses = new Set();
    for (let i = 0; i < 45; i++) { await page.waitForTimeout(1000); statuses.add(await page.textContent('#scribeStatus')); }
    if (await page.isVisible('#scribeStop')) await page.click('#scribeStop');
    await page.waitForFunction(() => document.getElementById('scribeStatus').textContent.startsWith('Microphone off'), null, { timeout: 60000 });
    const text = await page.inputValue('#writing'), times = await page.evaluate(() => window.workTimes);
    const today = text.slice(old.length);
    console.log('Journal after 45 seconds:\n' + text);
    console.log('Slowest second of audio: ' + Math.max(...times.filter((t) => t[0] === 'process').map((t) => t[1])) + ' ms; phrases finished: ' + times.filter((t) => t[0] === 'stop').length);
    assert.ok(![...statuses].some((s) => /cannot keep up/.test(s)), 'it keeps up with live speech');
    assert.ok(text.startsWith(old), 'the earlier entry is unchanged');
    assert.match(today, /### \d{4}-\d{2}-\d{2}/, "today's entry was added");
    assert.ok((today.match(/\b(walk|canal|morning|raining|Saturday)\b/gi) || []).length >= 3, 'the words reached the entry');
    assert.match(today, /^\[ \] \S/m, '"New task" made a task with words');
    assert.match(today, /#\w+/, '"Tag walk" made a tag');
    assert.ok(!/Thank you/i.test(today), 'silence is not transcribed');
    assert.ok(times.some((t) => t[0] === 'stop'), 'pauses finish phrases');
    assert.deepEqual(errors, []); assert.deepEqual(external, [], 'nothing leaves the device');
    console.log('PASS: REAL Whistle model with synthetic speech: keeps up with live speech, pauses and long phrases are finished, silence is skipped, task and tag commands, words in today\'s entry, earlier entry unchanged, no network requests.');
  } finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); server.close(); process.exitCode = 1; });
