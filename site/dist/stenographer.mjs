// The stenographer: talk, and every word goes verbatim into today's entry as you speak.
// Speech runs on this device (pinned Whistle model); no model writes or rewrites the words. When you pause, it can ask
// one short question from a fixed list, read aloud with an on-device voice. Spoken commands edit and add Jot structure.
// The microphone stays on until Stop, "stop listening", closing, five quiet minutes, locking or leaving the page.
import { createVoiceBackend } from './voice-backend.mjs';
import { captureSpeech } from './speech-capture.mjs';
import { SPEECH_MODELS, verifySpeechModel, downloadSpeechModel, speechModelCache } from './speech-models.mjs';
import { readCommand, splitSentences, planWrite, STENO_QUESTIONS } from './stenographer-core.mjs';
import { appendToScratchpad } from './scratchpad-core.mjs';

const QUIET_LEVEL = 0.01;       // RMS below this counts as quiet
const PAUSE_MS = 1200;          // a pause this long finishes the sentence you were saying
const QUESTION_MS = 7000;       // after this much quiet, one optional question
const QUESTION_GAP_MS = 45000;  // and never more often than this
const IDLE_MS = 5 * 60 * 1000;  // the microphone turns itself off after five quiet minutes
const PREF = 'jot-stenographer-v1';

export function setupStenographer({ editor, today, todayEntry, status = () => {}, beforeOpen = () => {} }) {
  const doc = editor.ownerDocument, win = doc.defaultView;
  const el = (tag, attributes = {}, text) => { const node = doc.createElement(tag); for (const [k, v] of Object.entries(attributes)) node.setAttribute(k, v); if (text !== undefined) node.textContent = text; return node; };
  let prefs = { questions: true, aloud: true, remember: true, language: '', target: 'entry' };
  try { prefs = { ...prefs, ...JSON.parse(win.localStorage.getItem(PREF) || '{}') }; } catch { /* defaults */ }
  const savePrefs = () => { try { win.localStorage.setItem(PREF, JSON.stringify({ questions: prefs.questions, aloud: prefs.aloud, remember: prefs.remember, language: prefs.language, target: prefs.target })); } catch { /* this visit only */ } };

  const panel = el('section', { id: 'stenographer', class: 'steno', 'aria-labelledby': 'stenoTitle' });
  panel.hidden = true;
  // Static markup only; transcripts and questions are set with textContent.
  panel.innerHTML = `<div class="steno-head"><h2 id="stenoTitle">Stenographer</h2><span id="stenoState" class="steno-state" aria-hidden="true"></span><button id="stenoClose" class="steno-close" type="button" aria-label="Close the stenographer and turn the microphone off">✕</button></div>
<p id="stenoStatus" class="steno-status" role="status" aria-live="polite">Microphone off.</p>
<div id="stenoSetup" class="steno-setup" hidden><p>The stenographer needs the Whistle speech model once (16.9 MB, public, from Hugging Face). Your voice and writing are never part of the download.</p>
<label class="steno-check"><input id="stenoRemember" type="checkbox"> Keep it on this device, so it starts quickly and works offline</label>
<div class="steno-actions"><button id="stenoDownload" class="steno-primary" type="button">Download speech model · 16.9 MB</button><label class="steno-file">Import whistle.cact<input id="stenoFile" type="file" accept=".cact"></label></div></div>
<p id="stenoHearing" class="steno-hearing" hidden><span class="steno-label">Hearing:</span> <span id="stenoPending"></span></p>
<div id="stenoQuestion" class="steno-question" hidden><p id="stenoQuestionText"></p><div class="steno-actions"><button id="stenoSkip" type="button">Skip</button><button id="stenoAnother" type="button">Another question</button></div></div>
<div class="steno-actions steno-main"><button id="stenoStart" class="steno-primary" type="button">Start listening</button><button id="stenoStop" class="steno-stop" type="button" hidden><span class="steno-dot" aria-hidden="true"></span>Stop <span id="stenoElapsed" aria-hidden="true">0:00</span></button><button id="stenoScratch" type="button" disabled>Scratch that</button></div>
<details class="steno-more"><summary>What you can say, and settings</summary>
<ul class="steno-commands"><li><b>“New paragraph”</b>, <b>“new line”</b></li><li><b>“Scratch that”</b> or <b>“undo”</b> removes the last thing it wrote</li><li><b>“New task</b> call Sam<b>”</b>, <b>“new note</b> …<b>”</b>, <b>“new heading</b> Evening<b>”</b>, <b>“tag</b> work<b>”</b></li><li><b>“Skip”</b>, <b>“another question”</b></li><li><b>“Stop listening”</b></li></ul>
<p class="steno-small">Say a command on its own, with a short pause before and after. Everything else is written exactly as you say it, at the end of today’s entry. Undo works as usual.</p>
<label class="steno-check"><input id="stenoQuestions" type="checkbox"> Ask me a short question when I pause</label>
<label class="steno-check"><input id="stenoAloud" type="checkbox"> Read questions aloud (on-device voices only)</label>
<label>Write into <select id="stenoTarget"><option value="entry">Today’s entry</option><option value="draft">Today’s scratchpad (rough notes, kept off the page)</option></select></label>
<label>Speech language <select id="stenoLanguage"><option value="">Detect automatically</option><option value="en">English</option><option value="de">German</option><option value="fr">French</option><option value="es">Spanish</option><option value="it">Italian</option><option value="nl">Dutch</option><option value="pl">Polish</option></select></label>
<p class="steno-small">Listening and transcription run on this device. Nothing you say is recorded, stored or sent anywhere; only the words go into your journal. The microphone turns off after five quiet minutes.</p>
</details>`;
  (doc.querySelector('.writing-pane') || doc.body).append(panel);
  const root = doc.documentElement;
  if (win.ResizeObserver) new win.ResizeObserver(() => root.style.setProperty('--steno-height', panel.offsetHeight + 'px')).observe(panel);
  const button = el('button', { id: 'stenographerBtn', type: 'button', class: 'quiet', title: 'Talk, and every word goes into today’s entry' }, 'Stenographer');
  doc.querySelector('.tool-row')?.append(button);
  const $ = id => panel.querySelector('#' + id);
  $('stenoQuestions').checked = prefs.questions; $('stenoAloud').checked = prefs.aloud; $('stenoRemember').checked = prefs.remember; $('stenoLanguage').value = prefs.language; $('stenoTarget').value = prefs.target === 'draft' ? 'draft' : 'entry';

  let engine = null, whistle = false, generation = 0, controller = null, stopMic = null, queue = Promise.resolve(), audio = new Float32Array(0), buffered = 0;
  let state = 'idle', buffer = '', heard = false, lastLoud = 0, lastWords = 0, startedAt = 0, ticker = null, question = '', askedAt = 0, spokeSinceQuestion = false, speaking = false, speakingUntil = 0, questionIndex = Math.floor(Math.random() * STENO_QUESTIONS.length);
  let written = { lastEnd: -1, lastKind: '', separator: null }, history = [];
  const say = text => { $('stenoStatus').textContent = text; };

  function controls() {
    const on = ['starting', 'listening'].includes(state);
    $('stenoSetup').hidden = whistle || on;
    $('stenoStart').hidden = on; $('stenoStop').hidden = !on;
    $('stenoStart').disabled = state !== 'idle' || !whistle;
    $('stenoScratch').disabled = !history.length;
    $('stenoHearing').hidden = !on || !$('stenoPending').textContent.trim();
    $('stenoQuestion').hidden = !question;
    $('stenoState').textContent = on ? 'Listening' : '';
    panel.toggleAttribute('data-listening', on);
    // The Speak button doubles as Stop while the stenographer listens.
    const fab = doc.getElementById('writerVoiceMic');
    if (fab) { const label = on ? 'Stop the stenographer' : 'Speak (stenographer)'; fab.classList.toggle('vw-on', on); fab.setAttribute('aria-label', label); fab.title = label; const word = fab.querySelector('.writer-voice-mic-label'); if (word) word.textContent = on ? 'Stop' : 'Speak'; }
    for (const id of ['stenoDownload', 'stenoFile', 'stenoRemember', 'stenoLanguage']) $(id).disabled = state !== 'idle';
  }

  // The words: written at the end of today's entry, through the editor's own edit path, so Undo works.
  function apply(edit) {
    // Your own caret stays where it was, moved along if the words went in before it.
    const { start, end, text } = edit, shift = text.length - (end - start);
    const keep = [editor.selectionStart, editor.selectionEnd].map(at => at >= end ? at + shift : at > start ? start : at);
    if (editor.jotApplyEdit) return editor.jotApplyEdit({ start, end, text, selectionStart: keep[0], selectionEnd: keep[1] }, { focus: false });
    editor.setRangeText(text, start, end, 'preserve');
    editor.dispatchEvent(new win.Event('input', { bubbles: true }));
    editor.setSelectionRange(keep[0], keep[1]);
    return true;
  }
  // Rough-draft mode: the same words, into today's scratchpad instead of the entry (spec 4.2.7).
  function writeDraft(item, date) {
    const asked = question && spokeSinceQuestion ? question : '';
    const block = item.kind === 'task' ? '[ ] ' + item.text : item.kind === 'note' ? '- ' + item.text : item.kind === 'heading' ? '#### ' + item.text : item.text;
    const joiner = asked || written.separator === 'paragraph' || item.kind === 'heading' ? '\n\n' : written.separator === 'line' ? '\n'
      : item.kind === 'tag' || (item.kind === 'text' && written.lastKind === 'text') ? ' ' : (item.kind === 'task' || item.kind === 'note') && written.lastKind === item.kind ? '\n' : '\n\n';
    const piece = (asked ? '> ' + asked + '\n\n' : '') + block;
    let edit = appendToScratchpad(editor.value, date, piece, joiner);
    if (!edit) { addToday(date); edit = appendToScratchpad(editor.value, date, piece, joiner); }
    if (!edit) { say('Could not find today’s entry to write into. Microphone still on.'); return; }
    if (asked) clearQuestion();
    const old = editor.value.slice(edit.start, edit.end);
    apply(edit);
    history.push({ start: edit.start, text: edit.text, old });
    if (history.length > 200) history.shift();
    written = { lastEnd: -1, lastKind: item.kind, separator: null };
    controls();
  }
  function write(item) {
    if (editor.readOnly) { stop('The journal is locked. Microphone off.'); return; }
    const date = today();
    if (prefs.target === 'draft') { writeDraft(item, date); return; }
    let plan = planWrite(editor.value, date, written, item, question && spokeSinceQuestion ? question : '');
    if (!plan) { addToday(date); written.lastEnd = -1; plan = planWrite(editor.value, date, written, item, question && spokeSinceQuestion ? question : ''); }
    if (!plan) { say('Could not find today’s entry to write into. Microphone still on.'); return; }
    if (question && spokeSinceQuestion) clearQuestion();
    apply({ start: plan.start, end: plan.start, text: plan.text });
    history.push({ start: plan.start, text: plan.text });
    // Keep the newest words in view when they are the end of the journal.
    if (!editor.value.slice(plan.start + plan.text.length).trim()) win.scrollTo({ top: doc.documentElement.scrollHeight, behavior: win.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (history.length > 200) history.shift();
    written = { lastEnd: plan.start + plan.text.length, lastKind: item.kind, separator: null };
    controls();
  }
  // Today's dated entry, added the same way as Today ＋, as one small edit.
  function addToday(date) {
    const result = todayEntry(editor.value, date);
    if (!result.added) return;
    const before = editor.value, after = result.text;
    let a = 0; while (a < before.length && a < after.length && before[a] === after[a]) a++;
    let b = 0; while (b < before.length - a && b < after.length - a && before[before.length - 1 - b] === after[after.length - 1 - b]) b++;
    apply({ start: a, end: before.length - b, text: after.slice(a, after.length - b) });
  }
  function scratch() {
    const last = history.pop();
    if (!last) { say('Nothing to scratch yet.'); controls(); return; }
    // Remove exactly what it wrote, if it is still where it was; otherwise the nearest copy before that place.
    let at = editor.value.slice(last.start, last.start + last.text.length) === last.text ? last.start : editor.value.lastIndexOf(last.text, last.start + last.text.length);
    if (at < 0) { say('The last words were changed since, so nothing was removed. Use Undo instead.'); controls(); return; }
    apply({ start: at, end: at + last.text.length, text: last.old ?? '' });
    const previous = history.at(-1);
    written = previous && previous.old === undefined ? { lastEnd: previous.start + previous.text.length, lastKind: 'text', separator: null } : { lastEnd: -1, lastKind: previous ? 'text' : '', separator: null };
    say(last.old === undefined ? 'Removed: “' + last.text.trim().slice(0, 80) + '”' : 'Removed the last words from the scratchpad.'); controls();
  }

  // Spoken sentences: a command, or words to write.
  function act(sentence) {
    const item = readCommand(sentence);
    if (!item) return;
    if (item.kind === 'paragraph' || item.kind === 'line') { written.separator = item.kind; say(item.kind === 'paragraph' ? 'New paragraph.' : 'New line.'); return; }
    if (item.kind === 'scratch') { scratch(); return; }
    if (item.kind === 'stop') { stop('Stopped when you said so. Microphone off.'); return; }
    if (item.kind === 'skip') { clearQuestion(); say('Skipped. Keep talking whenever you like.'); return; }
    if (item.kind === 'another') { ask(true); return; }
    spokeSinceQuestion = true;
    write(item);
    say(item.kind === 'text' ? 'Writing. Pause whenever you like.' : 'Added a ' + item.kind + '.');
  }
  function hear(text) {
    if (!text) return;
    buffer = (buffer + ' ' + text).trim(); lastWords = Date.now(); heard = true;
    const { complete, rest } = splitSentences(buffer);
    buffer = rest;
    for (const sentence of complete) act(sentence);
  }
  function flushRest() { const rest = buffer.trim(); buffer = ''; if (rest) act(rest); }

  // Questions: at most one at a time, only after a pause, only if wanted; the answer goes in under it as a quote.
  function clearQuestion() { question = ''; win.speechSynthesis?.cancel(); speaking = false; controls(); }
  function localVoice() {
    const voices = win.speechSynthesis?.getVoices?.() || [];
    return voices.find(v => v.localService && /^en(-|$)/i.test(v.lang) && v.default) || voices.find(v => v.localService && /^en(-|$)/i.test(v.lang)) || null;
  }
  function ask(force = false) {
    if (!force && (!prefs.questions || question || !spokeSinceQuestion || Date.now() - askedAt < QUESTION_GAP_MS)) return;
    questionIndex = (questionIndex + 1) % STENO_QUESTIONS.length;
    question = STENO_QUESTIONS[questionIndex]; askedAt = Date.now(); spokeSinceQuestion = false;
    $('stenoQuestionText').textContent = question; controls();
    say('A question, if you like. Answer, say “skip”, or just keep talking.');
    const voice = prefs.aloud && win.speechSynthesis && win.SpeechSynthesisUtterance ? localVoice() : null;
    if (voice) {
      // Words spoken by the device are not transcribed: the microphone's audio is ignored while it speaks.
      const utterance = new win.SpeechSynthesisUtterance(question); utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = 0.95;
      speaking = true;
      utterance.onend = utterance.onerror = () => { speaking = false; speakingUntil = Date.now() + 400; };
      win.speechSynthesis.cancel(); win.speechSynthesis.speak(utterance);
    }
  }

  // Audio in: one-second pieces to Whistle, in order. Pauses finish sentences; long quiet asks or stops.
  function enqueue(pcm, ticket) {
    if (!pcm.length) return;
    buffered += pcm.length;
    if (buffered > 16000 * 8) { fail(Error('This device cannot keep up with live transcription.'), ticket); return; }
    const count = pcm.length;
    queue = queue.then(async () => {
      if (ticket !== generation) return;
      try { const result = await engine.transcribe(pcm, { language: prefs.language }); if (ticket === generation) take(result); }
      finally { if (ticket === generation) buffered = Math.max(0, buffered - count); }
    }).catch(error => fail(error, ticket));
  }
  function take(result) {
    if (typeof result?.text !== 'string' || typeof result?.pending !== 'string' || result.text.length > 12000) throw Error('The speech engine returned an invalid transcript.');
    hear(result.text.trim());
    // Words not yet written: the unfinished sentence and what the engine is still unsure of.
    $('stenoPending').textContent = [buffer, result.pending].filter(Boolean).join(' ');
    $('stenoHearing').hidden = state !== 'listening' || !$('stenoPending').textContent.trim();
  }
  function finishPhrase(ticket) {
    // Whistle keeps the last words open until it is told the phrase is over.
    queue = queue.then(async () => { if (ticket !== generation) return; const result = await engine.finish(); if (ticket === generation) { take(result); flushRest(); $('stenoPending').textContent = ''; $('stenoHearing').hidden = true; } }).catch(error => fail(error, ticket));
    return queue;
  }
  function tick(ticket) {
    if (ticket !== generation || state !== 'listening') return;
    const now = Date.now(), seconds = Math.floor((now - startedAt) / 1000);
    $('stenoElapsed').textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    const quiet = now - Math.max(lastLoud, speakingUntil);
    if (heard && quiet > PAUSE_MS && now - lastWords > 600) { heard = false; finishPhrase(ticket); }
    if (quiet > QUESTION_MS && !speaking) ask();
    if (quiet > IDLE_MS) stop('Five quiet minutes, so the microphone turned off. Start listening to carry on.');
  }

  async function ensureWhistle(download) {
    if (whistle) return true;
    let bytes;
    try { bytes = await speechModelCache('get', 'whistle'); } catch { bytes = null; }
    if (!bytes && !download) return false;
    const ticket = generation;
    if (!bytes) {
      bytes = await downloadSpeechModel('whistle', { progress: (n, total) => say('Downloading Whistle · ' + Math.floor(n / total * 100) + '%') });
      if (prefs.remember) { try { await speechModelCache('put', 'whistle', bytes); } catch { /* still loaded for this visit; it just will not start offline next time */ } }
    }
    await load(new Uint8Array(bytes), ticket);
    return whistle;
  }
  async function load(bytes, ticket) {
    await verifySpeechModel('whistle', bytes);
    if (ticket !== generation) return;
    engine ||= createVoiceBackend();
    await engine.load('whistle', bytes);
    if (ticket === generation) whistle = true;
  }

  async function start() {
    if (state !== 'idle') return;
    if (editor.readOnly) { say('Unlock this journal to use the stenographer.'); return; }
    if (!whistle) { say('Loading the speech model…'); try { if (!(await ensureWhistle(false))) { say('Download the speech model once to start. After that it works offline.'); controls(); return; } } catch (e) { say(e.message); controls(); return; } }
    state = 'starting'; const ticket = generation; controller = new AbortController();
    audio = new Float32Array(0); buffered = 0; buffer = ''; heard = false; queue = Promise.resolve(); controls(); say('Starting the microphone…');
    try {
      const stopNow = await captureSpeech({
        signal: controller.signal,
        onEnded: error => { if (ticket === generation && state === 'listening') { if (error) fail(error, ticket); else stop('The microphone stopped. Start listening to carry on.'); } },
        onSamples: chunk => {
          if (ticket !== generation || state !== 'listening') return;
          // Ignore the device's own voice reading a question.
          if (speaking || Date.now() < speakingUntil) return;
          let sum = 0; for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
          if (chunk.length && Math.sqrt(sum / chunk.length) > QUIET_LEVEL) lastLoud = Date.now();
          const all = new Float32Array(audio.length + chunk.length); all.set(audio); all.set(chunk, audio.length); audio = all;
          while (audio.length >= 16000) { const piece = audio.slice(0, 16000); audio = audio.slice(16000); enqueue(piece, ticket); }
        }
      });
      if (ticket !== generation) { await stopNow(); return; }
      stopMic = stopNow; state = 'listening'; startedAt = lastLoud = lastWords = Date.now();
      ticker = win.setInterval(() => tick(ticket), 250);
      say(prefs.target === 'draft' ? 'Listening. Every word goes into today’s scratchpad.' : 'Listening. Talk, and every word goes into today’s entry.'); controls(); $('stenoStop').focus();
    } catch (e) { fail(e, ticket); }
  }
  async function stop(message = 'Microphone off. Everything you said is in today’s entry.') {
    if (!['starting', 'listening'].includes(state)) return;
    const ticket = generation; state = 'stopping'; win.clearInterval(ticker); ticker = null; clearQuestion();
    const end = stopMic; stopMic = null; controls();
    try { await end?.(); if (audio.length) enqueue(audio.slice(), ticket); audio = new Float32Array(0); await finishPhrase(ticket); }
    catch (e) { if (ticket === generation) say(e.message); }
    if (ticket !== generation) return;
    controller = null; state = 'idle'; $('stenoPending').textContent = ''; controls(); say(message);
  }
  function fail(error, ticket) {
    if (ticket !== generation) return;
    generation++; controller?.abort(); stopMic?.(); stopMic = null; win.clearInterval(ticker); ticker = null; clearQuestion();
    flushRest(); state = 'idle'; engine?.close(); engine = null; whistle = false; controls();
    say('Microphone off. ' + error.message + ' What you already said is in the entry.');
  }
  function reset() {
    generation++; controller?.abort(); controller = null; stopMic?.(); stopMic = null; win.clearInterval(ticker); ticker = null;
    win.speechSynthesis?.cancel(); speaking = false; question = ''; buffer = ''; history = []; written = { lastEnd: -1, lastKind: '', separator: null };
    engine?.close(); engine = null; whistle = false; state = 'idle'; panel.hidden = true; root.removeAttribute('data-steno-open'); $('stenoPending').textContent = '';
    say('Microphone off.'); controls();
  }

  function open({ listen = true, target } = {}) {
    if (editor.readOnly) { status('Unlock this journal to use the stenographer.'); return; }
    if (target === 'draft' || target === 'entry') { if (prefs.target !== target) written = { lastEnd: -1, lastKind: '', separator: null }; prefs.target = target; $('stenoTarget').value = target; savePrefs(); }
    beforeOpen();
    panel.hidden = false; root.toggleAttribute('data-steno-open', true); controls();
    panel.scrollIntoView({ block: 'nearest' });
    if (state !== 'idle') return;
    if (listen) start(); else { $('stenoStart').focus(); ensureWhistle(false).then(ok => { controls(); say(ok ? 'Ready. Press Start listening.' : 'Download the speech model once to start. After that it works offline.'); }).catch(e => say(e.message)); }
  }

  button.onclick = () => open();
  $('stenoStart').onclick = () => start();
  $('stenoStop').onclick = () => stop();
  $('stenoScratch').onclick = () => scratch();
  $('stenoSkip').onclick = () => { clearQuestion(); say('Skipped.'); };
  $('stenoAnother').onclick = () => ask(true);
  $('stenoClose').onclick = () => { reset(); editor.focus(); };
  $('stenoQuestions').onchange = () => { prefs.questions = $('stenoQuestions').checked; if (!prefs.questions) clearQuestion(); savePrefs(); };
  $('stenoAloud').onchange = () => { prefs.aloud = $('stenoAloud').checked; if (!prefs.aloud) win.speechSynthesis?.cancel(); savePrefs(); };
  $('stenoRemember').onchange = () => { prefs.remember = $('stenoRemember').checked; savePrefs(); };
  $('stenoLanguage').onchange = () => { prefs.language = $('stenoLanguage').value; savePrefs(); };
  $('stenoTarget').onchange = () => { prefs.target = $('stenoTarget').value; written = { lastEnd: -1, lastKind: '', separator: null }; savePrefs(); say(prefs.target === 'draft' ? 'Writing into today’s scratchpad.' : 'Writing into today’s entry.'); };
  $('stenoDownload').onclick = async () => {
    $('stenoDownload').disabled = true;
    try { if (await ensureWhistle(true)) { controls(); start(); } } catch (e) { say(e.message); } finally { controls(); }
  };
  $('stenoFile').onchange = async event => {
    const file = event.target.files[0]; event.target.value = '';
    if (!file) return;
    try {
      if (file.size !== SPEECH_MODELS.whistle.bytes) throw Error('Choose the pinned ' + SPEECH_MODELS.whistle.file + ' file.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (prefs.remember) { try { await speechModelCache('put', 'whistle', bytes); } catch { /* loaded for now */ } }
      await load(bytes, generation); controls(); say('Speech model loaded. Press Start listening.');
    } catch (e) { say(e.message); }
  };
  win.addEventListener('pagehide', reset);
  doc.addEventListener('visibilitychange', () => { if (doc.hidden && ['starting', 'listening'].includes(state)) stop('Microphone off because the page was hidden. Start listening to carry on.'); });
  controls();
  return { open, reset, stop, get listening() { return state === 'listening'; } };
}
