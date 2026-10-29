// Locked documents (.jotlock): exact round trips, every way in (passphrase, recovery code, passkey answer), adding and removing ways
// in, files from the first draft, failures that give nothing away, and independent readers written from LOCK.md with node:crypto.
// Run: node --test parser/lock-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, hkdfSync, pbkdf2Sync, randomBytes } from 'node:crypto';
import L, { lock, unlock, unlockSession, createLock, addWay, removeWay, changePassphrase, waysIn, isLocked, readHeader, kindOf, normalizeRecoveryCode, LockError } from './lock.mjs';

const FAST = { iterations: 100000 }; // the smallest allowed, to keep the suite quick; the default is checked once below
const J = '# October\r\n\r\n### 2026-10-25 | Sunday\n\nThe rain made the room quieter. 雨 · café\n';
const code = (c) => (e) => e instanceof LockError && e.code === c;
const text = (b) => new TextDecoder().decode(b);
const headerOf = (bytes) => JSON.parse(text(bytes.subarray(10, bytes.indexOf(0x0a, 10))));
const b64url = (b) => Buffer.from(b).toString('base64url');
const passkey = () => ({ type: 'webauthn-prf', rp: 'journal.example', credential: b64url(randomBytes(32)), input: new Uint8Array(randomBytes(32)), prf: new Uint8Array(randomBytes(32)), label: 'My phone' });

test('a journal locks and unlocks to exactly the same bytes, text or package', async () => {
  const locked = await lock(J, 'correct horse battery staple', FAST);
  assert.ok(isLocked(locked) && !isLocked(new TextEncoder().encode(J)));
  assert.ok(!text(locked).includes('rain'), 'no writing in the clear');
  assert.equal(text(await unlock(locked, 'correct horse battery staple')), J, 'CRLF and Unicode kept');
  const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0, 255, 1, 2, 3, 0x0a, 0]);
  const back = await unlock(await lock(zip, 'pw', FAST), 'pw');
  assert.deepEqual(back, zip); assert.equal(kindOf(back), 'jotz'); assert.equal(kindOf(new TextEncoder().encode(J)), 'jot');
  assert.equal((await unlock(await lock('', 'pw', FAST), 'pw')).length, 0);
});

test('the header lists the ways in and nothing about the writing; each lock is different', async () => {
  const a = await lock(J, 'pw'), h = headerOf(a);
  assert.equal(text(a.subarray(0, 10)), 'JOTLOCK 1\n');
  assert.deepEqual(Object.keys(h), ['cipher', 'iv', 'keys']); assert.equal(h.cipher, 'AES-256-GCM');
  assert.deepEqual(Object.keys(h.keys[0]), ['type', 'kdf', 'iterations', 'salt', 'iv', 'key']);
  assert.equal(h.keys[0].iterations, L.DEFAULT_ITERATIONS); assert.equal(h.keys[0].type, 'passphrase');
  const b = await lock(J, 'pw', FAST);
  assert.notEqual(headerOf(b).keys[0].salt, h.keys[0].salt, 'a fresh salt for a fresh lock');
  assert.equal(a.length - readHeader(a).headerBytes.length, new TextEncoder().encode(J).length + 16, 'ciphertext plus a 16-byte tag (no padding: the size shows)');
  assert.deepEqual(waysIn(a), [{ index: 0, type: 'passphrase' }]);
});

test('a wrong passphrase and a changed file fail the same way; the same words in another Unicode form unlock', async () => {
  const locked = await lock(J, 'café', FAST);
  await assert.rejects(unlock(locked, 'cafe'), code('cannot-unlock'));
  assert.equal(text(await unlock(locked, 'café')), J, 'NFC: decomposed é is the same passphrase');
  const body = locked.slice(); body[body.length - 20] ^= 1;
  await assert.rejects(unlock(body, 'café'), code('cannot-unlock'));
  const h = headerOf(locked), rest = locked.subarray(readHeader(locked).headerBytes.length);
  const swap = (obj) => { const head = new TextEncoder().encode('JOTLOCK 1\n' + JSON.stringify(obj) + '\n'); const out = new Uint8Array(head.length + rest.length); out.set(head); out.set(rest, head.length); return out; };
  await assert.rejects(unlock(swap({ ...h, iv: Buffer.alloc(12).toString('base64') }), 'café'), code('cannot-unlock'), 'the header is authenticated');
  await assert.rejects(unlock(swap({ ...h, keys: [...h.keys, { ...h.keys[0] }] }), 'café'), code('cannot-unlock'), 'so is the list of ways in');
});

test('a recovery code: made once, typed any way, opens the journal; a new one replaces it', async () => {
  const { session, recoveryCode } = await createLock('pw', { ...FAST, recoveryCode: true });
  assert.match(recoveryCode, /^([0-9A-HJKMNP-TV-Z]{5}-){4}[0-9A-HJKMNP-TV-Z]{5}$/);
  const locked = await lock(J, session);
  assert.deepEqual(waysIn(locked).map((w) => w.type), ['passphrase', 'recovery-code']);
  const typed = ` ${recoveryCode.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l')} `;
  assert.equal(normalizeRecoveryCode(typed), recoveryCode.replace(/-/g, ''));
  assert.equal(text(await unlock(locked, { recoveryCode: typed })), J);
  await assert.rejects(unlock(locked, { recoveryCode: 'AAAAA-AAAAA-AAAAA-AAAAA-AAAAA' }), code('cannot-unlock'));
  await assert.rejects(unlock(locked, recoveryCode), code('cannot-unlock'), 'a code is not a passphrase');
  const next = await addWay(session, { recoveryCode }, { type: 'recovery-code' });
  assert.notEqual(next.recoveryCode, recoveryCode); assert.equal(next.session.keys.filter((k) => k.type === 'recovery-code').length, 1);
  const relocked = await lock(J, next.session);
  await assert.rejects(unlock(relocked, { recoveryCode }), code('cannot-unlock'), 'the old code no longer opens it');
  assert.equal(text(await unlock(relocked, { recoveryCode: next.recoveryCode })), J);
});

test('a session: no slow work per save, a fresh nonce every time, and it opens only its own journal', async () => {
  const { session } = await createLock('pw', FAST), a = await lock(J, session), b = await lock(J, session);
  assert.deepEqual(headerOf(a).keys, headerOf(b).keys); assert.notEqual(headerOf(a).iv, headerOf(b).iv, 'never the same nonce');
  const opened = await unlockSession(b, 'pw'); assert.equal(text(opened.bytes), J);
  assert.equal(text(await unlock(await lock('later', opened.session), 'pw')), 'later');
  await assert.rejects(unlock(await lock(J, 'pw', FAST), session), code('cannot-unlock'), 'another journal');
});

test('a passkey or security key (its PRF answer): added with a current way in, opens the journal, can be removed', async () => {
  const { session } = await createLock('pw', FAST), pk = passkey();
  await assert.rejects(addWay(session, 'wrong', pk), code('cannot-unlock'), 'adding a way in needs one that works');
  assert.equal(await L.verifyWay(session, 'pw'), true); await assert.rejects(L.verifyWay(session, 'nope'), code('cannot-unlock'));
  await assert.rejects(L.verifyWay(session, { recoveryCode: 'AAAAA-AAAAA-AAAAA-AAAAA-AAAAA' }), code('cannot-unlock'));
  const added = (await addWay(session, 'pw', pk)).session, locked = await lock(J, added);
  const ways = waysIn(locked);
  assert.deepEqual(ways.map((w) => [w.type, w.label, w.rp]), [['passphrase', undefined, undefined], ['webauthn-prf', 'My phone', 'journal.example']]);
  assert.equal(ways[1].credential, pk.credential); assert.deepEqual(ways[1].input, pk.input);
  assert.equal(text(await unlock(locked, { credential: pk.credential, prf: pk.prf })), J);
  await assert.rejects(unlock(locked, { credential: pk.credential, prf: new Uint8Array(32) }), code('cannot-unlock'));
  await assert.rejects(unlock(locked, { credential: b64url(randomBytes(16)), prf: pk.prf }), code('cannot-unlock'), 'another credential');
  const second = (await addWay(added, { credential: pk.credential, prf: pk.prf }, passkey())).session;
  assert.equal(second.keys.length, 3, 'a spare key, added by unlocking with the first');
  assert.throws(() => removeWay(removeWay(second, 2), 0), code('last-way'), 'a passphrase or recovery code always stays');
  const noPk = removeWay(second, 1); await assert.rejects(unlock(await lock(J, noPk), { credential: pk.credential, prf: pk.prf }), code('cannot-unlock'));
});

test('changing the passphrase: the old one stops working, other ways in stay', async () => {
  const { session, recoveryCode } = await createLock('old words', { ...FAST, recoveryCode: true });
  const changed = await changePassphrase(session, 'old words', 'new words', FAST), locked = await lock(J, changed);
  assert.deepEqual(waysIn(locked).map((w) => w.type), ['recovery-code', 'passphrase']);
  await assert.rejects(unlock(locked, 'old words'), code('cannot-unlock'));
  assert.equal(text(await unlock(locked, 'new words')), J); assert.equal(text(await unlock(locked, { recoveryCode })), J);
});

test('a file from the first draft (one passphrase, no ways-in list) still opens, and is rewritten in the current form', async () => {
  const salt = randomBytes(16), iv = randomBytes(12), key = pbkdf2Sync(Buffer.from('pw'), salt, 100000, 32, 'sha256');
  const header = Buffer.from('JOTLOCK 1\n' + JSON.stringify({ kdf: 'PBKDF2-SHA-256', iterations: 100000, salt: salt.toString('base64'), cipher: 'AES-256-GCM', iv: iv.toString('base64') }) + '\n');
  const c = createCipheriv('aes-256-gcm', key, iv); c.setAAD(header);
  const old = new Uint8Array(Buffer.concat([header, c.update(J), c.final(), c.getAuthTag()]));
  assert.deepEqual(waysIn(old), [{ index: 0, type: 'passphrase' }]);
  await assert.rejects(unlock(old, 'nope'), code('cannot-unlock'));
  const { bytes, session } = await unlockSession(old, 'pw'); assert.equal(text(bytes), J);
  const rewritten = await lock(J, session); assert.ok('keys' in headerOf(rewritten)); assert.equal(text(await unlock(rewritten, 'pw')), J);
});

test('bad input is refused before any work: not locked, already locked, no passphrase, odd headers, cut short', async () => {
  await assert.rejects(unlock(new TextEncoder().encode(J), 'pw'), code('not-locked'));
  const locked = await lock(J, 'pw', FAST), h = headerOf(locked), pass = h.keys[0];
  await assert.rejects(lock(locked, 'pw', FAST), code('already-locked'));
  await assert.rejects(lock(J, '', FAST), code('no-passphrase'));
  await assert.rejects(lock(J, 'pw', { iterations: 1000 }), code('bad-options'));
  const head = (o) => new TextEncoder().encode('JOTLOCK 1\n' + JSON.stringify(o) + '\n' + 'x'.repeat(32));
  const ok = { cipher: 'AES-256-GCM', iv: h.iv, keys: [pass] };
  assert.doesNotThrow(() => readHeader(head(ok)));
  assert.throws(() => readHeader(head({ ...ok, keys: [{ ...pass, iterations: 2e9 }] })), code('bad-header'), 'no unbounded key stretching');
  assert.throws(() => readHeader(head({ ...ok, extra: 1 })), code('bad-header'));
  assert.throws(() => readHeader(head({ ...ok, keys: [] })), code('bad-header'));
  assert.throws(() => readHeader(head({ ...ok, keys: [{ ...pass, type: 'magic' }] })), code('unsupported'));
  assert.throws(() => readHeader(head({ ...ok, cipher: 'AES-128-CBC' })), code('unsupported'));
  const pk = { type: 'webauthn-prf', rp: 'journal.example', credential: b64url(randomBytes(16)), input: Buffer.alloc(32).toString('base64'), iv: pass.iv, key: pass.key };
  assert.throws(() => readHeader(head({ ...ok, keys: [pk] })), code('bad-header'), 'a passkey alone is not enough');
  assert.throws(() => readHeader(head({ ...ok, keys: Array(17).fill(pass) })), code('bad-header'));
  assert.throws(() => readHeader(locked.subarray(0, readHeader(locked).headerBytes.length + 8)), code('bad-header'), 'cut short');
  assert.throws(() => readHeader(new TextEncoder().encode('JOTLOCK 1\n' + 'x'.repeat(9000))), code('bad-header'));
});

test('independent readers, written from LOCK.md with node:crypto, open a locked file by passphrase and by passkey answer', async () => {
  const pk = passkey(), { session } = await createLock('correct horse battery staple', FAST);
  const locked = Buffer.from(await lock(J, (await addWay(session, 'correct horse battery staple', pk)).session));
  const open = (wrapKey, entry) => {
    const nl = locked.indexOf(10, 10), header = locked.subarray(0, nl + 1), h = JSON.parse(locked.subarray(10, nl).toString('utf8'));
    const w = Buffer.from(entry(h).key, 'base64'), u = createDecipheriv('aes-256-gcm', wrapKey(entry(h)), Buffer.from(entry(h).iv, 'base64'));
    u.setAAD(Buffer.from('JOTLOCK 1 ' + entry(h).type)); u.setAuthTag(w.subarray(32));
    const contentKey = Buffer.concat([u.update(w.subarray(0, 32)), u.final()]);
    const body = locked.subarray(nl + 1), d = createDecipheriv('aes-256-gcm', contentKey, Buffer.from(h.iv, 'base64'));
    d.setAAD(header); d.setAuthTag(body.subarray(body.length - 16));
    return Buffer.concat([d.update(body.subarray(0, body.length - 16)), d.final()]).toString('utf8');
  };
  assert.equal(open((e) => pbkdf2Sync(Buffer.from('correct horse battery staple'.normalize('NFC')), Buffer.from(e.salt, 'base64'), e.iterations, 32, 'sha256'), (h) => h.keys.find((k) => k.type === 'passphrase')), J);
  assert.equal(open(() => Buffer.from(hkdfSync('sha256', pk.prf, Buffer.alloc(0), 'JOTLOCK 1 webauthn-prf', 32)), (h) => h.keys.find((k) => k.type === 'webauthn-prf')), J);
});
