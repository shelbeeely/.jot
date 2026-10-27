import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimatePitch, percentile, pitchSummary, duration, voiceNote, recordingPath, isRecording } from './dist/jot/voice.mjs';
import { parse } from '../parser/jot.mjs';
import { collectNumbers } from '../parser/charts.mjs';

const RATE = 48000, N = 4096;
const wave = (hz, shape = 'sine', amp = 0.3, rate = RATE) => Float32Array.from({ length: N }, (_, i) => {
  const phase = (i * hz / rate) % 1;
  return amp * (shape === 'saw' ? 2 * phase - 1 : Math.sin(2 * Math.PI * phase));
});
let seed = 7; const random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);

test('pitch is estimated within 2% for sine and harmonic-rich waves across the practice range', () => {
  for (const [hz, shape, rate] of [[110, 'sine', RATE], [220, 'sine', RATE], [180, 'saw', RATE], [65, 'sine', RATE], [440, 'saw', RATE], [220, 'saw', 44100]]) {
    const r = estimatePitch(wave(hz, shape, 0.3, rate), rate);
    assert.ok(r.hz, `${hz} Hz ${shape} is voiced`);
    assert.ok(Math.abs(r.hz - hz) / hz < 0.02, `${hz} Hz ${shape} estimated as ${r.hz}`);
    assert.ok(r.clarity > 0.8);
  }
});
test('silence, quiet sound and noise are unvoiced', () => {
  assert.equal(estimatePitch(new Float32Array(N), RATE).hz, null);
  assert.equal(estimatePitch(wave(220, 'sine', 0.002), RATE).hz, null, 'below the loudness gate');
  assert.equal(estimatePitch(Float32Array.from({ length: N }, () => (random() * 2 - 1) * 0.3), RATE).hz, null, 'white noise');
  assert.equal(estimatePitch(wave(1200), RATE).hz, null, 'above the range');
  assert.equal(estimatePitch(new Float32Array(0), RATE).hz, null);
});
test('median and percentiles', () => {
  assert.equal(percentile([], 50), null);
  assert.equal(percentile([3, 1, 2], 50), 2);
  assert.equal(percentile([0, 10], 10), 1);
  assert.equal(percentile([1, 2, 3, 4], 50), 2.5);
  const values = Array.from({ length: 101 }, (_, i) => 100 + i);
  assert.deepEqual(pitchSummary(values), { median: 150, low: 110, high: 190, count: 101 });
  assert.equal(pitchSummary([NaN]), null);
  assert.equal(duration(125), '2 min 05 s'); assert.equal(duration(9.6), '10 s');
});
test('the note is plain Jot with chartable numbers and parses cleanly', () => {
  const text = voiceNote({ minutes: '12.5', exercise: 'Sirens', resonance: '4', strain: '1', feltLikeMe: '5', note: 'Easier after humming.', recording: 'assets/take-1.m4a', pitch: { median: 182, low: 160, high: 205 }, voicedSeconds: 125 });
  assert.match(text, /^#### Voice practice\n/);
  assert.match(text, /median 182 Hz, most of the time between 160 and 205 Hz, over 2 min 05 s of voiced sound\. No audio was recorded\./);
  assert.match(text, /\nEasier after humming\.\n\nRecording: \[take-1\.m4a\]\(assets\/take-1\.m4a\)\n/);
  assert.match(text, /:::record measurement\nmetric: pitch-hz\nunit: Hz\nvalue: 182\nlow: 160\nhigh: 205\n:::/);
  assert.match(text, /:::record measurement\nmetric: voice-minutes\nunit: min\nvalue: 12\.5\n:::/);
  assert.match(text, /:::record observation\nmethod: voice-practice@1\nexercise: Sirens\nresonance: 4\nstrain: 1\nfelt-like-me: 5\nrecording: assets\/take-1\.m4a\n:::/);
  const ast = parse('### 2026-10-27 | Tuesday\n\n' + text + '\n:::record chart\nmetrics: pitch-hz, voice-minutes\n:::\n');
  assert.deepEqual(ast.diagnostics, []);
  const { metrics } = collectNumbers(ast);
  assert.equal(metrics.get('pitch-hz').byDate.get('2026-10-27').sum, 182); assert.equal(metrics.get('pitch-hz').unit, 'Hz');
  assert.equal(metrics.get('voice-minutes').byDate.get('2026-10-27').sum, 12.5);
});
test('unmeasured practice leaves pitch out; empty notes are refused', () => {
  const text = voiceNote({ minutes: '5', note: 'Just humming.' });
  assert.ok(!text.includes('pitch-hz')); assert.ok(!text.includes('observation')); assert.deepEqual(parse(text).diagnostics, []);
  assert.throws(() => voiceNote({}), /first/);
  assert.throws(() => voiceNote({ minutes: '-1' })); assert.throws(() => voiceNote({ minutes: 'ten' }));
  assert.throws(() => voiceNote({ feltLikeMe: '6' })); assert.throws(() => voiceNote({ strain: '2.5' }));
});
test('a note keeps its punctuation; only line-start marks are escaped', () => {
  const text = voiceNote({ note: 'Try 3-4 reps (slow): easier.\n- not a list\n1. not numbered\n.0830 - not a time' });
  assert.match(text, /^Try 3-4 reps \(slow\): easier\.$/m);
  assert.match(text, /^\\- not a list$/m); assert.match(text, /^1\\\. not numbered$/m); assert.match(text, /^\\\.0830 - not a time$/m);
  const ast = parse(text); assert.deepEqual(ast.diagnostics, []);
  assert.ok(ast.nodes.slice(1).every((n) => ['paragraph', 'blank'].includes(n.type)), JSON.stringify(ast.nodes.map((n) => n.type)));
});
test('typed text cannot inject Jot structure, and recordings must be attached files', () => {
  const text = voiceNote({ exercise: 'x\n:::\n### 2030-01-01\n:::record evil', note: ':::record surprise\n# heading\n### 2030-01-01\n<script>x</script>', pitch: { median: 200, low: 190, high: 210 } });
  const ast = parse(text);
  assert.deepEqual(ast.diagnostics, []); assert.equal(ast.entries.length, 0);
  assert.deepEqual(ast.nodes.filter((n) => n.type === 'record').map((n) => n.recordType), ['measurement', 'observation']);
  assert.equal(ast.nodes.find((n) => n.recordType === 'observation').fields.find((f) => f.name === 'exercise').value, 'x ::: ### 2030-01-01 :::record evil');
  for (const bad of ['https://example.com/a.m4a', '../secret.wav', 'assets/../x.wav', 'assets/a\nb.wav', 'assets//x.wav', 'javascript:x']) assert.throws(() => recordingPath(bad));
  assert.equal(recordingPath('assets/2-take.m4a'), 'assets/2-take.m4a');
  const spaced = voiceNote({ recording: 'assets/audio/take 1.m4a' });
  assert.match(spaced, /recording: assets\/audio\/take 1\.m4a/); assert.ok(!spaced.includes('Recording: ['), 'paths that would break a link are named, not linked');
  assert.deepEqual(parse(spaced).diagnostics, []);
  assert.ok(isRecording({ path: 'assets/a.bin', mediaType: 'audio/mpeg' })); assert.ok(isRecording({ path: 'assets/a.M4A', mediaType: '' }));
  assert.ok(!isRecording({ path: 'assets/a.png', mediaType: 'image/png' }));
});
