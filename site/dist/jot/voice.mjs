// Voice practice: an optional, on-device pitch meter for the writer. The microphone is opened only after Start and is analysed in
// this page; no audio is recorded, stored or sent. The journal changes only when the person presses Add, with plain text.
export const MIN_HZ = 60, MAX_HZ = 500;
const NUMBER = /^-?[0-9]+(\.[0-9]+)?$/;
const one = (s, max = 200) => String(s ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
// The person's own note keeps its punctuation; only a line that could start Jot structure (a heading, record, list, quote, time
// marker or numbered item) gets its first mark escaped, so a note cannot add days or records.
const proseLine = (line) => line.replace(/^(\s*)([^\p{L}\p{N}\s])/u, '$1\\$2').replace(/^(\s*\d+)([.)])(\s|$)/, '$1\\$2$3');

/** The fundamental frequency of one frame of samples (YIN: cumulative mean normalised difference), or hz: null when the frame
 *  is quiet or not clearly periodic (breath, noise, silence). -> { hz, clarity, rms } */
export function estimatePitch(buf, sampleRate, { minHz = MIN_HZ, maxHz = MAX_HZ, minRms = 0.01, threshold = 0.15 } = {}) {
  const n = buf.length; let energy = 0;
  for (let i = 0; i < n; i++) energy += buf[i] * buf[i];
  const rms = Math.sqrt(energy / (n || 1));
  const none = { hz: null, clarity: 0, rms };
  if (!n || !(sampleRate > 0) || rms < minRms) return none;
  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz)), tauMax = Math.min(Math.ceil(sampleRate / minHz), Math.floor(n / 2) - 1);
  if (tauMax <= tauMin + 2) return none;
  const w = n - tauMax - 1, cmnd = new Float32Array(tauMax + 2);
  cmnd[0] = 1; let running = 0;
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    let s = 0;
    for (let i = 0; i < w; i++) { const d = buf[i] - buf[i + tau]; s += d * d; }
    running += s; cmnd[tau] = running > 0 ? s * tau / running : 1;
  }
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmnd[t] < threshold) { while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++; tau = t; break; }
  }
  if (tau < 0) return none;
  // A period that repeats at a fraction of tau means a tone above the range (a whistle), not a low voice
  // (a dip at least as deep as the one at tau; a voice's strong harmonics leave shallower ones)
  for (let k = 2; k <= 6; k++) { const sub = Math.round(tau / k); if (sub >= 2 && sub < tauMin && Math.min(cmnd[sub - 1], cmnd[sub], cmnd[sub + 1]) <= Math.min(threshold, cmnd[tau] + 0.02)) return none; }
  const a = cmnd[tau - 1], b = cmnd[tau], c = cmnd[tau + 1], denom = a - 2 * b + c;
  const exact = tau + (denom > 0 ? Math.max(-1, Math.min(1, (a - c) / (2 * denom))) : 0);
  const hz = sampleRate / exact;
  if (!(hz >= minHz && hz <= maxHz)) return none;
  return { hz, clarity: Math.max(0, Math.min(1, 1 - b)), rms };
}

/** The p-th percentile (0–100) of numbers, linearly interpolated. */
export function percentile(values, p) {
  const v = values.filter(Number.isFinite).sort((x, y) => x - y);
  if (!v.length) return null;
  const at = (Math.min(100, Math.max(0, p)) / 100) * (v.length - 1), lo = Math.floor(at), hi = Math.ceil(at);
  return v[lo] + (v[hi] - v[lo]) * (at - lo);
}

/** A session's pitch summary from its voiced estimates: median and the 10th/90th percentiles, rounded to whole Hz. */
export function pitchSummary(hzValues) {
  const v = hzValues.filter(Number.isFinite).sort((x, y) => x - y);
  if (!v.length) return null;
  const at = (p) => { const i = (p / 100) * (v.length - 1), lo = Math.floor(i), hi = Math.ceil(i); return Math.round(v[lo] + (v[hi] - v[lo]) * (i - lo)); };
  return { median: at(50), low: at(10), high: at(90), count: v.length };
}

/** "2 min 05 s" style durations for people; seconds are whole. */
export function duration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0)), m = Math.floor(s / 60);
  return m ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
}

const rating = (value, lo, hi, label) => {
  const v = String(value ?? '').trim(); if (!v) return '';
  if (!/^[0-9]+$/.test(v) || Number(v) < lo || Number(v) > hi) throw new Error(`${label} is a whole number from ${lo} to ${hi}, or empty.`);
  return v;
};
/** A recording attached to the document: a relative path inside assets/, on one line, with no '..' segments. */
export function recordingPath(value) {
  const v = String(value ?? '').trim(); if (!v) return '';
  if (!/^assets\/[^\u0000-\u001f\u007f\\:*?"<>|]+$/.test(v) || v.split('/').some((part) => part === '..' || part === '.' || part === '')) throw new Error('Choose a recording attached to this journal.');
  return v;
}
const linkable = (path) => /^assets\/[\p{L}\p{N}._/-]+$/u.test(path);

/** The plain-text note the Add button inserts: a short section with prose, a pitch measurement (when measured), a minutes
 *  measurement and a voice-practice observation. Charts read pitch-hz and voice-minutes; any text editor can write the same. */
export function voiceNote({ minutes = '', exercise = '', resonance = '', strain = '', feltLikeMe = '', note = '', recording = '', pitch = null, voicedSeconds = 0 } = {}) {
  const mins = String(minutes ?? '').trim();
  if (mins && (!NUMBER.test(mins) || Number(mins) < 0 || Number(mins) > 1440)) throw new Error('Minutes is a number from 0 to 1440, or empty.');
  const fields = { exercise: one(exercise), resonance: rating(resonance, 1, 5, 'Resonance'), strain: rating(strain, 0, 5, 'Strain'), 'felt-like-me': rating(feltLikeMe, 1, 5, 'Felt like me'), recording: recordingPath(recording) };
  const text = String(note ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, 2000).trim();
  const measured = pitch && [pitch.median, pitch.low, pitch.high].every((x) => Number.isFinite(x) && x > 0);
  if (!mins && !measured && !text && !Object.values(fields).some(Boolean)) throw new Error('Add minutes, a measurement or a note first.');
  const lines = ['#### Voice practice', ''];
  if (measured) lines.push(`Pitch, measured on this device: median ${pitch.median} Hz, most of the time between ${pitch.low} and ${pitch.high} Hz, over ${duration(voicedSeconds)} of voiced sound. No audio was recorded.`, '');
  if (text) lines.push(text.split('\n').map(proseLine).join('\n'), '');
  if (fields.recording && linkable(fields.recording)) lines.push(`Recording: [${fields.recording.split('/').pop()}](${fields.recording})`, '');
  if (measured) lines.push(':::record measurement', 'metric: pitch-hz', 'unit: Hz', `value: ${pitch.median}`, `low: ${pitch.low}`, `high: ${pitch.high}`, ':::', '');
  if (mins) lines.push(':::record measurement', 'metric: voice-minutes', 'unit: min', `value: ${Number(mins)}`, ':::', '');
  const kept = Object.entries(fields).filter(([, v]) => v);
  if (kept.length) lines.push(':::record observation', 'method: voice-practice@1', ...kept.map(([k, v]) => `${k}: ${v}`), ':::', '');
  return lines.join('\n').trimEnd() + '\n';
}

const AUDIO = /\.(m4a|mp3|wav|ogg|oga|opus|flac|aac|webm|mp4|mov|caf|aiff?)$/i;
export const isRecording = (a) => /^(audio|video)\//.test(a?.mediaType || '') || AUDIO.test(a?.path || '');

/** Wires the dialog in /write/. insert(text) adds to the writing; recordings() lists attached files; attach(files) attaches
 *  files to the document (not the writing) and returns their paths. */
export function setupVoicePractice({ insert, recordings = () => [], attach = async () => [] }) {
  const $ = (id) => document.getElementById(id), dialog = $('voiceDialog'), canvas = $('voiceStrip');
  const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let stream = null, ctx = null, analyser = null, buf = null, tick = 0, last = 0, starting = 0, pending = false;
  let hz = [], voiced = 0, micSeconds = 0, history = [], lastStats = 0, lastAnnounce = 0, minutesEdited = false;
  let clock = 0, clockStart = 0, clockTick = 0;
  const say = (text) => { $('voiceStatus').textContent = text; };
  const target = () => { const lo = Number($('voiceTargetLow').value), hi = Number($('voiceTargetHigh').value); return lo > 0 && hi > lo ? { lo, hi } : null; };
  try { const t = JSON.parse(localStorage.getItem('jot-voice-target-v1') || 'null'); if (t && t.lo > 0 && t.hi > t.lo) { $('voiceTargetLow').value = t.lo; $('voiceTargetHigh').value = t.hi; } } catch { /* preferences are optional */ }
  const saveTarget = () => { try { const t = target(); if (t) localStorage.setItem('jot-voice-target-v1', JSON.stringify(t)); else localStorage.removeItem('jot-voice-target-v1'); } catch { /* optional */ } draw(); };
  $('voiceTargetLow').addEventListener('change', saveTarget); $('voiceTargetHigh').addEventListener('change', saveTarget);
  $('voiceTargetClear').onclick = () => { $('voiceTargetLow').value = ''; $('voiceTargetHigh').value = ''; saveTarget(); say('Target range cleared.'); };

  function draw() {
    const g = canvas.getContext?.('2d'); if (!g) return;
    const css = getComputedStyle(canvas), dpr = globalThis.devicePixelRatio || 1, w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const y = (f) => h - (Math.log(f / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ)) * h, t = target(), v = (name) => css.getPropertyValue(name).trim();
    if (t) { g.fillStyle = v('--jot-soft') || '#eee8f2'; const top = y(Math.min(MAX_HZ, t.hi)), bottom = y(Math.max(MIN_HZ, t.lo)); g.fillRect(0, top, w, Math.max(1, bottom - top)); }
    g.strokeStyle = v('--jot-edge') || '#d2cbbc'; g.lineWidth = 1;
    for (const f of [100, 200, 300, 400]) { g.beginPath(); g.moveTo(0, y(f)); g.lineTo(w, y(f)); g.stroke(); }
    g.fillStyle = v('--jot-muted') || '#56617a'; g.font = '11px ui-sans-serif, system-ui, sans-serif';
    for (const f of [100, 200, 300, 400]) g.fillText(String(f), 4, y(f) - 2);
    g.fillStyle = v('--jot-accent') || '#65508f';
    const step = w / 300;
    history.forEach((f, i) => { if (f) g.fillRect(w - (history.length - i) * step, y(f) - 2, Math.max(2, step), 4); });
  }
  const showStats = () => {
    const s = pitchSummary(hz);
    $('voiceMedian').textContent = s ? s.median + ' Hz' : '—'; $('voiceLow').textContent = s ? s.low + ' Hz' : '—'; $('voiceHigh').textContent = s ? s.high + ' Hz' : '—';
    $('voiceVoiced').textContent = duration(voiced);
  };
  const fmtClock = (s) => { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const clockNow = () => clock + (clockStart ? (performance.now() - clockStart) / 1000 : 0);
  const prefillMinutes = () => {
    if (minutesEdited) return;
    const secs = clockNow() >= 1 ? clockNow() : micSeconds; if (secs >= 1) $('voiceMinutes').value = String(Math.max(0.1, Math.round(secs / 6) / 10));
  };
  $('voiceMinutes').addEventListener('input', () => { minutesEdited = true; });

  function analyse() {
    if (!analyser) return;
    const now = performance.now(), dt = Math.min(0.5, (now - last) / 1000); last = now; micSeconds += dt;
    analyser.getFloatTimeDomainData(buf);
    const r = estimatePitch(buf, ctx.sampleRate);
    if (r.hz && hz.length < 72000) { hz.push(r.hz); voiced += dt; } // about two hours of voiced sound; the summary and its time stay matched
    history.push(r.hz); if (history.length > 300) history.shift();
    $('voiceHz').textContent = r.hz ? Math.round(r.hz) + ' Hz' : '—';
    const t = target(); $('voiceHz').dataset.inRange = r.hz && t ? String(r.hz >= t.lo && r.hz <= t.hi) : '';
    if (now - lastStats > (reduced() ? 1000 : 400)) { lastStats = now; showStats(); draw(); }
    if (now - lastAnnounce > 6000) { lastAnnounce = now; const s = pitchSummary(hz); $('voiceAnnounce').textContent = s ? `Median so far ${s.median} Hz.` : 'Listening; no voiced sound yet.'; }
  }
  function stop(message = 'Microphone off.') {
    starting++;
    clearInterval(tick); tick = 0;
    if (stream) for (const track of stream.getTracks()) track.stop();
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
    const wasOn = !!stream || pending; pending = false; stream = null; ctx = null; analyser = null;
    $('voiceStart').disabled = false; $('voiceStop').disabled = true; $('voiceMic').textContent = 'Microphone off'; $('voiceMic').classList.remove('on');
    $('voiceHz').textContent = '—'; $('voiceHz').dataset.inRange = '';
    if (wasOn) { showStats(); draw(); prefillMinutes(); say(message); }
  }
  $('voiceStart').onclick = async () => {
    if (stream) return;
    if (!navigator.mediaDevices?.getUserMedia || !(globalThis.AudioContext || globalThis.webkitAudioContext)) { say('This browser cannot measure pitch here. You can still fill in the notes and add them.'); return; }
    const attempt = ++starting; pending = true; $('voiceStart').disabled = true; say('Asking for the microphone…');
    let s;
    try { s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false }); }
    catch (e) { if (attempt !== starting) return; pending = false; $('voiceStart').disabled = false; say(e?.name === 'NotAllowedError' ? 'Microphone permission was not given. You can still fill in the notes and add them.' : 'No microphone could be opened. You can still fill in the notes and add them.'); return; }
    if (attempt !== starting || !dialog.open) { for (const t of s.getTracks()) t.stop(); return; }
    pending = false;
    try {
      stream = s; ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      analyser = ctx.createAnalyser(); analyser.fftSize = ctx.sampleRate > 100000 ? 8192 : 4096; buf = new Float32Array(analyser.fftSize);
      ctx.createMediaStreamSource(stream).connect(analyser); // never connected to the speakers: nothing is played back
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      for (const t of stream.getTracks()) t.addEventListener('ended', () => { if (stream === s) stop('The microphone was disconnected. Microphone off.'); });
    } catch { stop(); say('The pitch meter could not start. Microphone off.'); return; }
    if (stream !== s) return; // stopped while starting
    last = performance.now(); lastAnnounce = last; tick = setInterval(analyse, 100);
    $('voiceStop').disabled = false; $('voiceMic').textContent = 'Microphone on · analysed here, not recorded'; $('voiceMic').classList.add('on');
    say('Listening. Sound is analysed in this page only. Press Stop when you are done.');
    $('voiceStop').focus();
  };
  $('voiceStop').onclick = () => { stop(); $('voiceStart').focus(); };
  $('voiceReset').onclick = () => { hz = []; voiced = 0; micSeconds = 0; history = []; showStats(); draw(); say(stream ? 'Measurements cleared. Still listening.' : 'Measurements cleared.'); };

  const clockUI = () => { $('voiceClock').textContent = fmtClock(clockNow()); };
  const pauseClock = () => { if (!clockStart) return false; clock = clockNow(); clockStart = 0; clearInterval(clockTick); clockTick = 0; $('voiceTimer').textContent = 'Start timer'; $('voiceTimer').setAttribute('aria-pressed', 'false'); clockUI(); prefillMinutes(); return true; };
  $('voiceTimer').onclick = () => {
    if (pauseClock()) say('Timer paused at ' + fmtClock(clock) + '.');
    else { clockStart = performance.now(); clockTick = setInterval(clockUI, 1000); $('voiceTimer').textContent = 'Pause timer'; $('voiceTimer').setAttribute('aria-pressed', 'true'); say('Timer running.'); }
  };
  const resetClock = () => { clock = 0; clockStart = 0; clearInterval(clockTick); clockTick = 0; $('voiceTimer').textContent = 'Start timer'; $('voiceTimer').setAttribute('aria-pressed', 'false'); clockUI(); };
  $('voiceTimerReset').onclick = () => { resetClock(); say('Timer reset.'); };

  const fillRecordings = (choose) => {
    const select = $('voiceRecording'), keep = choose ?? select.value, none = document.createElement('option');
    none.value = ''; none.textContent = 'None';
    select.replaceChildren(none, ...recordings().filter((a) => isRecording(a) && (() => { try { return !!recordingPath(a.path); } catch { return false; } })()).map((a) => { const o = document.createElement('option'); o.value = a.path; o.textContent = a.path.split('/').pop(); return o; }));
    select.value = [...select.options].some((o) => o.value === keep) ? keep : '';
  };
  $('voiceAttach').onclick = () => $('voiceRecordingFile').click();
  $('voiceRecordingFile').onchange = async (e) => {
    const files = [...e.target.files]; e.target.value = ''; if (!files.length) return;
    try { const paths = await attach(files); fillRecordings(paths[0] || ''); say(paths.length ? 'Attached ' + paths[0].split('/').pop() + ' to this journal. It is linked when you add the note.' : 'Nothing was attached.'); }
    catch (err) { say(err?.message || 'The recording could not be attached.'); }
  };

  $('voiceBtn').onclick = () => { fillRecordings(); dialog.showModal(); draw(); };
  $('voiceClose').onclick = () => dialog.close();
  const redraw = () => { if (dialog.open) draw(); };
  window.addEventListener('resize', redraw); globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', redraw);
  dialog.addEventListener('close', () => { stop(); pauseClock(); });
  window.addEventListener('pagehide', () => { stop(); pauseClock(); });
  $('voiceAdd').onclick = () => {
    try {
      const include = $('voiceIncludePitch').checked;
      const text = voiceNote({ minutes: $('voiceMinutes').value, exercise: $('voiceExercise').value, resonance: $('voiceResonance').value, strain: $('voiceStrain').value,
        feltLikeMe: $('voiceFelt').value, note: $('voiceNote').value, recording: $('voiceRecording').value, pitch: include ? pitchSummary(hz) : null, voicedSeconds: voiced });
      dialog.close(); insert(text);
      for (const id of ['voiceMinutes', 'voiceExercise', 'voiceNote']) $(id).value = '';
      for (const id of ['voiceResonance', 'voiceStrain', 'voiceFelt', 'voiceRecording']) $(id).value = '';
      hz = []; voiced = 0; micSeconds = 0; history = []; minutesEdited = false; resetClock(); showStats();
      say('Microphone off. Press Start pitch meter when you are ready, or just fill in the notes.');
    } catch (e) { say(e.message); }
  };
  showStats();
}
