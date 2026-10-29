// Locked documents (.jotlock): exact round trips, failures that give nothing away, and an independent reader written from LOCK.md
// with node:crypto rather than Web Crypto. Run: node --test parser/lock-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';
import L, { lock, unlock, isLocked, readHeader, kindOf, LockError } from './lock.mjs';

const FAST = { iterations: 100000 }; // the smallest allowed, to keep the suite quick; the default is checked once below
const J = '# October\r\n\r\n### 2026-10-25 | Sunday\n\nThe rain made the room quieter. 雨 · café\n';
const code = (c) => (e) => e instanceof LockError && e.code === c;

test('a journal locks and unlocks to exactly the same bytes, text or package', async () => {
  const locked = await lock(J, 'correct horse battery staple', FAST);
  assert.ok(isLocked(locked) && !isLocked(new TextEncoder().encode(J)));
  assert.ok(!new TextDecoder().decode(locked).includes('rain'), 'no writing in the clear');
  assert.equal(new TextDecoder().decode(await unlock(locked, 'correct horse battery staple')), J, 'CRLF and Unicode kept');
  const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0, 255, 1, 2, 3, 0x0a, 0]);
  const back = await unlock(await lock(zip, 'pw', FAST), 'pw');
  assert.deepEqual(back, zip); assert.equal(kindOf(back), 'jotz'); assert.equal(kindOf(new TextEncoder().encode(J)), 'jot');
  const empty = await unlock(await lock('', 'pw', FAST), 'pw'); assert.equal(empty.length, 0);
});

test('the header says how to unlock and nothing about the writing; each lock is different', async () => {
  const a = await lock(J, 'pw'), b = await lock(J, 'pw', FAST);
  const lines = new TextDecoder().decode(a.subarray(0, a.indexOf(0x0a, 10) + 1)).split('\n');
  assert.equal(lines[0], 'JOTLOCK 1');
  const h = JSON.parse(lines[1]);
  assert.deepEqual(Object.keys(h), ['kdf', 'iterations', 'salt', 'cipher', 'iv']);
  assert.equal(h.iterations, L.DEFAULT_ITERATIONS); assert.equal(h.kdf, 'PBKDF2-SHA-256'); assert.equal(h.cipher, 'AES-256-GCM');
  assert.equal(readHeader(a).salt.length, 16); assert.equal(readHeader(a).iv.length, 12);
  assert.notEqual(readHeader(a).salt.join(), readHeader(b).salt.join(), 'a fresh salt each time');
  assert.equal(a.length - readHeader(a).headerBytes.length, new TextEncoder().encode(J).length + 16, 'ciphertext plus a 16-byte tag (no padding: the size shows)');
});

test('a wrong passphrase and a changed file fail the same way; the same words in another Unicode form unlock', async () => {
  const locked = await lock(J, 'café', FAST);
  await assert.rejects(unlock(locked, 'cafe'), code('cannot-unlock'));
  assert.equal(new TextDecoder().decode(await unlock(locked, 'café')), J, 'NFC: decomposed é is the same passphrase');
  const body = locked.slice(); body[body.length - 20] ^= 1;
  await assert.rejects(unlock(body, 'café'), code('cannot-unlock'));
  const text = new TextDecoder().decode(locked.subarray(0, readHeader(locked).headerBytes.length));
  const swapped = new TextEncoder().encode(text.replace('"iterations":100000', '"iterations":100001'));
  const changed = new Uint8Array(swapped.length + readHeader(locked).body.length); changed.set(swapped); changed.set(readHeader(locked).body, swapped.length);
  await assert.rejects(unlock(changed, 'café'), code('cannot-unlock'), 'the header is authenticated too');
});

test('bad input is refused before any work: not locked, already locked, no passphrase, odd headers, cut short', async () => {
  await assert.rejects(unlock(new TextEncoder().encode(J), 'pw'), code('not-locked'));
  const locked = await lock(J, 'pw', FAST);
  await assert.rejects(lock(locked, 'pw', FAST), code('already-locked'));
  await assert.rejects(lock(J, '', FAST), code('no-passphrase'));
  await assert.rejects(lock(J, 'pw', { iterations: 1000 }), code('bad-options'));
  const head = (o) => new TextEncoder().encode('JOTLOCK 1\n' + JSON.stringify(o) + '\n' + 'x'.repeat(32));
  const ok = { kdf: 'PBKDF2-SHA-256', iterations: 100000, salt: 'AAAAAAAAAAAAAAAAAAAAAA==', cipher: 'AES-256-GCM', iv: 'AAAAAAAAAAAAAAAA' };
  assert.throws(() => readHeader(head({ ...ok, iterations: 2e9 })), code('bad-header'), 'no unbounded key stretching');
  assert.throws(() => readHeader(head({ ...ok, extra: 1 })), code('bad-header'));
  assert.throws(() => readHeader(head({ ...ok, cipher: 'AES-128-CBC' })), code('unsupported'));
  assert.throws(() => readHeader(head({ ...ok, iv: 'AAAA' })), code('bad-header'));
  assert.throws(() => readHeader(locked.subarray(0, readHeader(locked).headerBytes.length + 8)), code('bad-header'), 'cut short');
  assert.throws(() => readHeader(new TextEncoder().encode('JOTLOCK 1\n' + 'x'.repeat(2000))), code('bad-header'));
});

test('an independent reader, written from LOCK.md with node:crypto, opens a locked file', async () => {
  const locked = await lock(J, 'correct horse battery staple', FAST);
  const nl = locked.indexOf(0x0a, 10), header = Buffer.from(locked.subarray(0, nl + 1)), h = JSON.parse(header.subarray(10, nl).toString('utf8'));
  const key = pbkdf2Sync(Buffer.from('correct horse battery staple'.normalize('NFC'), 'utf8'), Buffer.from(h.salt, 'base64'), h.iterations, 32, 'sha256');
  const body = Buffer.from(locked.subarray(nl + 1)), d = createDecipheriv('aes-256-gcm', key, Buffer.from(h.iv, 'base64'));
  d.setAAD(header); d.setAuthTag(body.subarray(body.length - 16));
  assert.equal(Buffer.concat([d.update(body.subarray(0, body.length - 16)), d.final()]).toString('utf8'), J);
});

test('a session key: derived once, a fresh nonce for every save, usable only for its own lock', async () => {
  const k = await L.makeKey('pw', FAST), a = await lock(J, k), b = await lock(J, k);
  assert.deepEqual(readHeader(a).salt, readHeader(b).salt); assert.notDeepEqual(readHeader(a).iv, readHeader(b).iv, 'never the same nonce');
  assert.equal(new TextDecoder().decode(await unlock(b, 'pw')), J, 'the passphrase still unlocks it');
  const { bytes, key } = await L.unlockWithKey(a, 'pw'); assert.equal(new TextDecoder().decode(bytes), J);
  assert.equal(new TextDecoder().decode(await unlock(await lock('later', key), 'pw')), 'later', 'the kept key locks the next save the same way');
  await assert.rejects(unlock(await lock(J, 'pw', FAST), k), code('other-key'));
  await assert.rejects(L.unlockWithKey(a, 'wrong'), code('cannot-unlock'));
  await assert.rejects(L.makeKey('pw', { iterations: 5 }), code('bad-options'));
});
