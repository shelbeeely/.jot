// The scribe: hands-free, word-for-word writing into today's entry, spoken commands, questions on pauses,
// on-device voices only, and the microphone released on stop, close and "stop listening".
// The speech model is mocked (a queue of phrases); the microphone is a real, silent Chromium stream.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, 'dist');
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.wasm': 'application/wasm' })[path.extname(file)] || 'application/octet-stream'); res.end(data);
  });
});
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [], external = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin)) external.push(r.url()); });
    await page.addInitScript(() => {
      // A silent microphone, so pauses are real pauses; every stream is kept to check it is released.
      window.mics = [];
      navigator.mediaDevices.getUserMedia = async () => { const ctx = new AudioContext(), osc = ctx.createOscillator(), gain = ctx.createGain(), out = ctx.createMediaStreamDestination(); gain.gain.value = 0; osc.connect(gain).connect(out); osc.start(); window.mics.push(out.stream); return out.stream; };
      // On-device and network voices: only the on-device one may be used.
      window.spoken = [];
      class Utterance { constructor(text) { this.text = text; } }
      window.SpeechSynthesisUtterance = Utterance;
      Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [{ name: 'Cloud voice', lang: 'en-US', localService: false, default: true }, { name: 'Device voice', lang: 'en-GB', localService: true, default: false }], speak: (u) => { window.spoken.push({ text: u.text, voice: u.voice?.name }); setTimeout(() => u.onend?.(), 50); }, cancel() {}, speaking: false } });
      window.scribeSay = []; window.scribeTail = '';
    });
    await page.route('**/speech-models.mjs', (route) => route.fulfill({ contentType: 'text/javascript', body: `export const SPEECH_MODELS={whistle:{name:'Whistle',file:'whistle.cact',bytes:4},needle3:{name:'Needle',file:'needle3.cact',bytes:4}};export async function verifySpeechModel(name,bytes){return bytes;}export async function downloadSpeechModel(){throw Error('No automatic downloads in tests');}export async function speechModelCache(action,name,bytes){const key='test-model-'+name;if(action==='put')sessionStorage.setItem(key,'cached');if(action==='get')return sessionStorage.getItem(key)?new Uint8Array(4):undefined;if(action==='clear')sessionStorage.clear();}` }));
    await page.route('**/speech-engine.mjs', (route) => route.fulfill({ contentType: 'text/javascript', body: `export function createSpeechEngine(){return {async call(op){if(op==='load')return 1;if(op==='process'){return {text:globalThis.scribeSay.shift()||'',pending:globalThis.scribeSay.length?'…':''};}if(op==='stop'){const text=globalThis.scribeTail;globalThis.scribeTail='';return {text,pending:''};}throw Error('Unexpected '+op);},close(){}};}` }));
    await page.goto(origin + '/write/');
    await page.waitForFunction(() => !!document.getElementById('writing').jotSetMode);
    const old = '### 2026-11-01 | Sun\n\nOld entry, **kept** as it was.\n';
    await page.evaluate((t) => { const e = document.getElementById('writing'); e.value = t; e.dispatchEvent(new Event('input', { bubbles: true })); }, old);
    const writing = () => page.inputValue('#writing');
    const micsOff = () => page.waitForFunction(() => window.mics.every((s) => s.getTracks().every((t) => t.readyState === 'ended')));

    // Without a saved model: setup first, nothing listens, nothing is downloaded automatically.
    await page.click('#writerVoiceMic');
    await page.waitForFunction(() => !document.getElementById('scribeSetup').hidden);
    assert.equal(await page.evaluate(() => window.mics.length), 0);
    await page.setInputFiles('#scribeFile', { name: 'whistle.cact', mimeType: 'application/octet-stream', buffer: Buffer.alloc(4) });
    await page.waitForFunction(() => document.getElementById('scribeStatus').textContent.includes('Speech model loaded'));
    await page.click('#scribeClose'); await page.waitForFunction(() => document.getElementById('scribe').hidden);

    // One tap on Speak: the saved model loads and it listens.
    await page.click('#writerVoiceMic');
    await page.waitForFunction(() => document.getElementById('scribeStatus').textContent.startsWith('Listening'));
    assert.equal(await page.getAttribute('#writerVoiceMic', 'aria-label'), 'Stop the scribe');
    await page.evaluate(() => window.scribeSay.push('I went for a walk.', 'It was cold.', 'New paragraph.', 'New task, call Sam.', 'Scratch that.', 'Tag walk.'));
    await page.waitForFunction(() => window.scribeSay.length === 0 && document.getElementById('writing').value.includes('#walk'), null, { timeout: 20000 });
    let text = await writing();
    assert.ok(text.startsWith(old.trimEnd()), 'the earlier entry is unchanged');
    assert.match(text, /\n### \d{4}-\d{2}-\d{2}[^\n]*\n\nI went for a walk\. It was cold\. #walk\n*$/, 'verbatim words in today\'s entry; the task was scratched');
    assert.ok(!text.includes('Call Sam'));

    // A pause: one short question, read with the on-device voice only; the answer goes under it as a quote.
    await page.waitForFunction(() => !document.getElementById('scribeQuestion').hidden, null, { timeout: 20000 });
    const question = await page.textContent('#scribeQuestionText');
    assert.ok(question.endsWith('?') || question.endsWith('.'));
    assert.deepEqual(await page.evaluate(() => window.spoken.map((s) => s.voice)), ['Device voice']);
    await page.evaluate(() => window.scribeSay.push('A blackbird singing.'));
    await page.waitForFunction(() => document.getElementById('writing').value.includes('A blackbird'), null, { timeout: 20000 });
    text = await writing();
    assert.ok(text.includes('#walk\n\n> ' + question + '\n\nA blackbird singing.'), text);
    assert.equal(await page.isHidden('#scribeQuestion'), true);

    // Words still being said when the person pauses are finished and written.
    await page.waitForTimeout(2500); // let the pause after the last answer finish first
    await page.evaluate(() => { window.scribeSay.push('And then'); window.scribeTail = 'home.'; });
    await page.waitForFunction(() => document.getElementById('writing').value.includes('And then home.'), null, { timeout: 20000 });

    // Accessibility on a phone, light and dark, while listening.
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.click('#scribe details summary');
      assert.deepEqual(await page.evaluate(async () => (await axe.run(document.getElementById('scribe'))).violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)), []);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.getElementById('scribe').getBoundingClientRect().right <= innerWidth));
      await page.click('#scribe details summary');
    }
    await page.emulateMedia({ colorScheme: 'light' });

    // "Stop listening" turns the microphone off; Undo still works on what it wrote.
    await page.evaluate(() => window.scribeSay.push('Stop listening.'));
    await page.waitForFunction(() => document.getElementById('scribeStatus').textContent.includes('Stopped when you said so'), null, { timeout: 20000 });
    await micsOff();
    assert.equal(await page.getAttribute('#writerVoiceMic', 'aria-label'), 'Speak (scribe)');
    const before = await writing();
    await page.click('#writerUndo');
    assert.notEqual(await writing(), before, 'Undo removes the last words');
    assert.ok((await writing()).startsWith(old.trimEnd()));

    // The Speak button stops it too, and closing releases the microphone and hides the panel.
    await page.click('#scribeStart'); await page.waitForFunction(() => document.getElementById('scribeStatus').textContent.startsWith('Listening'));
    await page.click('#writerVoiceMic'); await page.waitForFunction(() => document.getElementById('scribeStatus').textContent.startsWith('Microphone off'));
    await micsOff();
    await page.click('#scribeStart'); await page.waitForFunction(() => document.getElementById('scribeStatus').textContent.startsWith('Listening'));
    await page.click('#scribeClose'); await micsOff(); assert.equal(await page.isHidden('#scribe'), true);

    // Rough-draft mode: the same words go into today's scratchpad, off the page; Scratch that restores it.
    await page.click('#writerVoiceMic'); await page.waitForFunction(() => document.getElementById('scribeStatus').textContent.startsWith('Listening'));
    await page.click('#scribe details summary'); await page.selectOption('#scribeTarget', 'draft'); await page.click('#scribe details summary');
    const beforeDraft = await writing();
    await page.evaluate(() => window.scribeSay.push('Heron by the canal.', 'New task, look it up.', 'Scratch that.', 'Rain all day.'));
    await page.waitForFunction(() => window.scribeSay.length === 0 && /~~~draft\nHeron by the canal\. Rain all day\.\n~~~/.test(document.getElementById('writing').value), null, { timeout: 20000 });
    assert.equal((await writing()).replace(/~~~draft\n[\s\S]*?\n~~~\n\n/, ''), beforeDraft, 'only the scratchpad changed');
    await page.click('#scribeClose'); await micsOff();
    await page.evaluate(() => { localStorage.removeItem('jot-scribe-v1'); });

    // Voice typing (cleanup and review) is still under Tools, and opening it closes the scribe.
    await page.click('#writerVoiceMic'); await page.waitForFunction(() => document.getElementById('scribeStatus').textContent.startsWith('Listening'));
    await page.evaluate(() => document.getElementById('writerVoiceWritingBtn').click());
    await page.waitForFunction(() => document.getElementById('voiceWriting').open); await micsOff();
    assert.equal(await page.isHidden('#scribe'), true);
    await page.click('#vwClose');

    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log('PASS: scribe: model setup without automatic download, one-tap Speak, verbatim words at the end of today\'s entry (earlier entries unchanged), spoken paragraph/task/tag/scratch/stop commands, a question on a pause read only with an on-device voice and quoted above the answer, unfinished words flushed on a pause, rough-draft mode into today\'s scratchpad, Undo, microphone released on stop/close/voice typing, phone light/dark accessibility, no network requests.');
  } finally { await browser.close(); server.close(); }
})().catch((e) => { console.error(e); server.close(); process.exitCode = 1; });
