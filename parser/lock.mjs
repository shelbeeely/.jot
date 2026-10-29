/** Locked Jot documents (.jotlock): an ordinary .jot or .jotz, encrypted with the platform's built-in Web Crypto (Node 18+ and every
 * current browser). Unlocking returns the original bytes exactly, so the journal format is unchanged. Format: LOCK.md
 * (specification/Jot-Lock-v1.md).
 *
 *   JOTLOCK 1\n
 *   {"cipher":"AES-256-GCM","iv":"…","keys":[ …one entry per way in… ]}\n
 *   ciphertext, then the 16-byte GCM tag
 *
 * The writing is encrypted with one random content key (AES-256-GCM, both header lines as additional data). Each way in wraps that
 * content key on its own: a passphrase or a recovery code (PBKDF2-SHA-256), or a passkey or security key (the WebAuthn PRF
 * extension's output, through HKDF-SHA-256). There is always at least one passphrase or recovery code, so a journal can be opened
 * without this site. Files from the first draft, one passphrase and no "keys", still open, and are rewritten in this form on the
 * next save.
 */

const MAGIC = 'JOTLOCK 1\n', enc = new TextEncoder(), dec = new TextDecoder('utf-8', { fatal: true });
export const LOCK_EXTENSION = '.jotlock';
export const DEFAULT_ITERATIONS = 600000; // OWASP's 2023 figure for PBKDF2-HMAC-SHA256
export const RECOVERY_ITERATIONS = 100000; // a recovery code carries 125 random bits, so stretching matters less
export const LIMITS = { minIterations: 100000, maxIterations: 10000000, maxHeader: 8192, maxKeys: 16, maxPayload: 64 * 1024 * 1024 };
const PRF_INFO = enc.encode('JOTLOCK 1 webauthn-prf');
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export class LockError extends Error {
  constructor(code, message) { super(message); this.name = 'LockError'; this.code = code; }
}

const subtle = () => {
  const s = globalThis.crypto && globalThis.crypto.subtle;
  if (!s) throw new LockError('no-crypto', 'This browser or runtime has no built-in Web Crypto, so it cannot lock or unlock.');
  return s;
};
const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));
const bytesOf = (input) => (typeof input === 'string' ? enc.encode(input) : input instanceof Uint8Array ? input : new Uint8Array(input));
const b64 = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const unb64 = (s) => { if (typeof s !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4) return null; const t = atob(s); return Uint8Array.from(t, (c) => c.charCodeAt(0)); };
const unb64url = (s) => (typeof s === 'string' && /^[A-Za-z0-9_-]+$/.test(s) ? unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)) : null);
const fail = (code, message) => { throw new LockError(code, message); };

/** A passphrase as bytes: Unicode NFC, then UTF-8, so the same words typed on another keyboard or system give the same key. */
function passBytes(passphrase) {
  if (typeof passphrase !== 'string' || passphrase === '') fail('no-passphrase', 'A passphrase is needed.');
  return enc.encode(passphrase.normalize('NFC'));
}
const checkIterations = (n) => { if (!Number.isInteger(n) || n < LIMITS.minIterations || n > LIMITS.maxIterations) fail('bad-options', 'Iterations must be a whole number from 100,000 to 10,000,000.'); };

// ---- recovery codes: 25 Crockford base32 characters (125 random bits), shown in five groups of five ----

export function newRecoveryCode() {
  const r = random(25); let s = '';
  for (const x of r) s += CROCKFORD[x & 31];
  return s.match(/.{5}/g).join('-');
}
/** A recovery code as typed (any case, spaces or dashes, O for 0, I or L for 1) in its canonical 25 characters, or null. */
export function normalizeRecoveryCode(text) {
  if (typeof text !== 'string') return null;
  const s = text.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return /^[0-9A-HJKMNP-TV-Z]{25}$/.test(s) ? s : null;
}

// ---- keys ----

async function pbkdf2Key(secretBytes, salt, iterations) {
  const base = await subtle().importKey('raw', secretBytes, 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function prfKey(prf) {
  const p = bytesOf(prf);
  if (p.length < 32) fail('bad-options', 'A passkey answer is at least 32 bytes.');
  const base = await subtle().importKey('raw', p, 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: PRF_INFO }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const contentKeyOf = (dek) => subtle().importKey('raw', dek, 'AES-GCM', false, ['encrypt', 'decrypt']);
const wrapAad = (type) => enc.encode('JOTLOCK 1 ' + type);

async function wrap(dek, kek, type, fields) {
  const iv = random(12);
  const key = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: wrapAad(type), tagLength: 128 }, kek, dek));
  return { type, ...fields, iv: b64(iv), key: b64(key) };
}
async function unwrap(entry, kek) {
  try { return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: unb64(entry.iv), additionalData: wrapAad(entry.type), tagLength: 128 }, kek, unb64(entry.key))); }
  catch { return null; }
}

/** A way in, as a header entry, from the content key (raw) and what the person gives. */
async function makeWay(dek, way) {
  if (way.type === 'passphrase') {
    const iterations = way.iterations ?? DEFAULT_ITERATIONS; checkIterations(iterations);
    const salt = random(16);
    return { entry: await wrap(dek, await pbkdf2Key(passBytes(way.passphrase), salt, iterations), 'passphrase', { kdf: 'PBKDF2-SHA-256', iterations, salt: b64(salt) }) };
  }
  if (way.type === 'recovery-code') {
    const code = newRecoveryCode(), salt = random(16);
    const entry = await wrap(dek, await pbkdf2Key(enc.encode(normalizeRecoveryCode(code)), salt, RECOVERY_ITERATIONS), 'recovery-code', { kdf: 'PBKDF2-SHA-256', iterations: RECOVERY_ITERATIONS, salt: b64(salt) });
    return { entry, recoveryCode: code };
  }
  if (way.type === 'webauthn-prf') {
    const input = bytesOf(way.input);
    if (typeof way.rp !== 'string' || !/^[a-z0-9.-]{1,253}$/.test(way.rp)) fail('bad-options', 'A passkey needs the site it belongs to.');
    if (!unb64url(way.credential) || way.credential.length > 1366) fail('bad-options', 'A passkey needs its credential ID (base64url).');
    if (input.length !== 32) fail('bad-options', 'A passkey needs its 32-byte PRF input.');
    const label = typeof way.label === 'string' && way.label.trim() ? way.label.trim().slice(0, 64) : undefined;
    const entry = await wrap(dek, await prfKey(way.prf), 'webauthn-prf', { rp: way.rp, credential: way.credential, input: b64(input), ...(label ? { label } : {}) });
    return { entry };
  }
  return fail('bad-options', 'Unknown way in: ' + way.type);
}

// ---- the header ----

/** True when the bytes start like a locked document (whatever the file is called). */
export function isLocked(input) {
  const b = bytesOf(input);
  if (b.length < MAGIC.length) return false;
  for (let i = 0; i < MAGIC.length; i++) if (b[i] !== MAGIC.charCodeAt(i)) return false;
  return true;
}

const exact = (o, required, optional = []) => o && typeof o === 'object' && !Array.isArray(o) && required.every((k) => k in o) && Object.keys(o).every((k) => required.includes(k) || optional.includes(k));
function checkEntry(e) {
  const bad = (what) => fail('bad-header', 'The lock header has an unusable way in: ' + what + '.');
  if (!e || typeof e !== 'object') bad('not an object');
  const iv = unb64(e.iv), key = unb64(e.key);
  if (e.type === 'passphrase' || e.type === 'recovery-code') {
    if (!exact(e, ['type', 'kdf', 'iterations', 'salt', 'iv', 'key'])) bad('fields');
    if (e.kdf !== 'PBKDF2-SHA-256') fail('unsupported', 'Unsupported key function: ' + e.kdf + '.');
    if (!Number.isInteger(e.iterations) || e.iterations < LIMITS.minIterations || e.iterations > LIMITS.maxIterations) bad('iteration count');
    const salt = unb64(e.salt); if (!salt || salt.length < 16 || salt.length > 64) bad('salt');
  } else if (e.type === 'webauthn-prf') {
    if (!exact(e, ['type', 'rp', 'credential', 'input', 'iv', 'key'], ['label'])) bad('fields');
    if (typeof e.rp !== 'string' || !/^[a-z0-9.-]{1,253}$/.test(e.rp)) bad('site');
    if (!unb64url(e.credential) || e.credential.length > 1366) bad('credential');
    const input = unb64(e.input); if (!input || input.length !== 32) bad('PRF input');
    if ('label' in e && (typeof e.label !== 'string' || e.label.length > 64)) bad('label');
  } else fail('unsupported', 'Unsupported way in: ' + String(e.type) + '.');
  if (!iv || iv.length !== 12) bad('nonce');
  if (!key || key.length !== 48) bad('wrapped key');
}

/** The header of a locked document, checked against the format's rules (no secret needed; it holds nothing secret). */
export function readHeader(input) {
  const b = bytesOf(input);
  if (!isLocked(b)) fail('not-locked', 'This is not a locked Jot document.');
  const end = b.indexOf(0x0a, MAGIC.length);
  if (end < 0 || end - MAGIC.length > LIMITS.maxHeader) fail('bad-header', 'The lock header is missing or too long.');
  let h;
  try { h = JSON.parse(dec.decode(b.subarray(MAGIC.length, end))); } catch { fail('bad-header', 'The lock header is not readable.'); }
  const body = b.subarray(end + 1), headerBytes = b.subarray(0, end + 1);
  if (body.length < 16) fail('bad-header', 'The locked document is cut short.');
  if (body.length - 16 > LIMITS.maxPayload) fail('too-large', 'The locked document is larger than 64 MiB.');
  if (exact(h, ['cipher', 'iv', 'keys'])) {
    if (h.cipher !== 'AES-256-GCM') fail('unsupported', `Unsupported cipher: ${h.cipher}.`);
    const iv = unb64(h.iv); if (!iv || iv.length !== 12) fail('bad-header', 'The lock header has an unusable nonce.');
    if (!Array.isArray(h.keys) || !h.keys.length || h.keys.length > LIMITS.maxKeys) fail('bad-header', 'The lock header needs 1 to 16 ways in.');
    h.keys.forEach(checkEntry);
    if (!h.keys.some((e) => e.type === 'passphrase' || e.type === 'recovery-code')) fail('bad-header', 'The lock header has no passphrase or recovery code.');
    return { form: 'keys', keys: h.keys, iv, headerBytes, body };
  }
  // The first draft (29 October 2026): one passphrase, the content key derived from it directly.
  if (exact(h, ['kdf', 'iterations', 'salt', 'cipher', 'iv'])) {
    if (h.kdf !== 'PBKDF2-SHA-256' || h.cipher !== 'AES-256-GCM') fail('unsupported', `Unsupported lock: ${h.kdf} with ${h.cipher}.`);
    if (!Number.isInteger(h.iterations) || h.iterations < LIMITS.minIterations || h.iterations > LIMITS.maxIterations) fail('bad-header', 'The lock header asks for an iteration count outside the allowed range.');
    const salt = unb64(h.salt), iv = unb64(h.iv);
    if (!salt || salt.length < 16 || salt.length > 64) fail('bad-header', 'The lock header has an unusable salt.');
    if (!iv || iv.length !== 12) fail('bad-header', 'The lock header has an unusable nonce.');
    return { form: 'single', keys: [{ type: 'passphrase', kdf: 'PBKDF2-SHA-256', iterations: h.iterations, salt: h.salt }], iterations: h.iterations, salt, iv, headerBytes, body };
  }
  return fail('bad-header', 'The lock header has unexpected fields.');
}

/** The ways in to a locked document, without unlocking it: [{ index, type, label?, rp?, credential?, input? }]. For a passkey, rp,
 * credential and input are what a WebAuthn request needs. */
export function waysIn(input) {
  const source = Array.isArray(input) ? input : readHeader(input).keys;
  return source.map((e, index) => ({ index, type: e.type, ...(e.type === 'webauthn-prf' ? { rp: e.rp, credential: e.credential, input: unb64(e.input), ...(e.label ? { label: e.label } : {}) } : {}) }));
}

// ---- sessions: the content key (not exportable) and the header's ways in ----

const session = (contentKey, keys) => Object.freeze({ contentKey, keys: Object.freeze(keys.map((k) => Object.freeze({ ...k }))) });
const isSession = (s) => s && typeof s === 'object' && s.contentKey && Array.isArray(s.keys);

/** A new lock: a random content key, a passphrase, and (if asked) a recovery code, returned once and never stored. */
export async function createLock(passphrase, { iterations = DEFAULT_ITERATIONS, recoveryCode = false } = {}) {
  passBytes(passphrase); checkIterations(iterations);
  const dek = random(32);
  try {
    const keys = [(await makeWay(dek, { type: 'passphrase', passphrase, iterations })).entry];
    let code = null;
    if (recoveryCode) { const r = await makeWay(dek, { type: 'recovery-code' }); keys.push(r.entry); code = r.recoveryCode; }
    return { session: session(await contentKeyOf(dek), keys), recoveryCode: code };
  } finally { dek.fill(0); }
}

/** The raw content key, opened by one way in: a passphrase (string or { passphrase }), { recoveryCode }, or { credential, prf }. */
async function openContent(keys, secret) {
  const s = typeof secret === 'string' ? { passphrase: secret } : secret || {};
  if ('passphrase' in s) {
    const p = passBytes(s.passphrase);
    for (const e of keys.filter((k) => k.type === 'passphrase')) { const d = await unwrap(e, await pbkdf2Key(p, unb64(e.salt), e.iterations)); if (d) return d; }
  } else if ('recoveryCode' in s) {
    const code = normalizeRecoveryCode(s.recoveryCode);
    if (code) for (const e of keys.filter((k) => k.type === 'recovery-code')) { const d = await unwrap(e, await pbkdf2Key(enc.encode(code), unb64(e.salt), e.iterations)); if (d) return d; }
  } else if ('prf' in s) {
    for (const e of keys.filter((k) => k.type === 'webauthn-prf' && k.credential === s.credential)) { const d = await unwrap(e, await prfKey(s.prf)); if (d) return d; }
  } else fail('bad-options', 'Give a passphrase, a recovery code or a passkey answer.');
  return fail('cannot-unlock', 'Could not unlock: that does not open this journal, or the file was changed.');
}

async function decryptBody(h, contentKey) {
  try { return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: h.iv, additionalData: h.headerBytes, tagLength: 128 }, contentKey, h.body)); }
  catch { return fail('cannot-unlock', 'Could not unlock: that does not open this journal, or the file was changed.'); }
}

/** Unlock and keep a session for later saves: { bytes, session }. `secret` is a passphrase, { recoveryCode }, { credential, prf },
 * or a session for this journal. A wrong secret and a changed file fail the same way (GCM cannot tell). */
export async function unlockSession(input, secret) {
  const h = readHeader(input);
  if (isSession(secret)) return { bytes: await decryptBody(h, secret.contentKey), session: secret };
  if (h.form === 'single') {
    if (!(typeof secret === 'string' || (secret && 'passphrase' in secret))) fail('cannot-unlock', 'This journal opens only with its passphrase.');
    const passphrase = typeof secret === 'string' ? secret : secret.passphrase;
    const base = await subtle().importKey('raw', passBytes(passphrase), 'PBKDF2', false, ['deriveBits']);
    const dek = new Uint8Array(await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: h.salt, iterations: h.iterations }, base, 256));
    try {
      const bytes = await decryptBody(h, await contentKeyOf(dek));
      const keys = [(await makeWay(dek, { type: 'passphrase', passphrase, iterations: h.iterations })).entry];
      return { bytes, session: session(await contentKeyOf(dek), keys) };
    } finally { dek.fill(0); }
  }
  const dek = await openContent(h.keys, secret);
  try {
    const contentKey = await contentKeyOf(dek);
    return { bytes: await decryptBody(h, contentKey), session: session(contentKey, h.keys) };
  } finally { dek.fill(0); }
}

/** Unlock a locked document: the original bytes, exactly. */
export async function unlock(input, secret) { return (await unlockSession(input, secret)).bytes; }

/** Lock a journal (text or bytes of a .jot or .jotz) with a session (a fresh nonce; nothing slow), or with a passphrase alone. The
 * result is checked by decrypting it before it is returned. */
export async function lock(input, secret, { iterations = DEFAULT_ITERATIONS } = {}) {
  const plain = bytesOf(input);
  if (plain.length > LIMITS.maxPayload) fail('too-large', 'A document over 64 MiB cannot be locked.');
  if (isLocked(plain)) fail('already-locked', 'This document is already locked.');
  const s = isSession(secret) ? secret : (await createLock(secret, { iterations })).session;
  const iv = random(12);
  const header = enc.encode(MAGIC + JSON.stringify({ cipher: 'AES-256-GCM', iv: b64(iv), keys: s.keys }) + '\n');
  if (header.length - MAGIC.length - 1 > LIMITS.maxHeader) fail('bad-options', 'Too many ways in for one header.');
  const sealed = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: header, tagLength: 128 }, s.contentKey, plain));
  const out = new Uint8Array(header.length + sealed.length); out.set(header); out.set(sealed, header.length);
  const back = await unlock(out, s);
  if (back.length !== plain.length || back.some((x, i) => x !== plain[i])) fail('self-check', 'The locked copy did not unlock to the same writing, so it was not made.');
  return out;
}

/** Add a way in, proving one current way in first (`secret`, as for unlockSession). Returns { session, recoveryCode }: the code only
 * for a new recovery code, shown once. `way` is { type: 'passphrase', passphrase }, { type: 'recovery-code' } (replacing any
 * earlier one), or { type: 'webauthn-prf', rp, credential, input, prf, label? }. */
/** The raw content key behind a session, opened by `secret` and checked against the session's own key. */
async function openChecked(s, secret) {
  if (!isSession(s)) fail('bad-options', 'Unlock the journal first.');
  const dek = await openContent(s.keys, secret);
  const check = await contentKeyOf(dek), probe = random(12), sealed = await subtle().encrypt({ name: 'AES-GCM', iv: probe }, s.contentKey, random(16));
  await subtle().decrypt({ name: 'AES-GCM', iv: probe }, check, sealed).catch(() => { dek.fill(0); fail('cannot-unlock', 'That does not open this journal.'); });
  return dek;
}

/** True when `secret` (as for unlockSession) is a current way in to this session's journal; otherwise a cannot-unlock error. Ask
 * for it before removing a way in or the lock itself. */
export async function verifyWay(s, secret) { (await openChecked(s, secret)).fill(0); return true; }

export async function addWay(s, secret, way) {
  const dek = await openChecked(s, secret);
  try {
    const made = await makeWay(dek, way);
    const kept = way.type === 'recovery-code' ? s.keys.filter((k) => k.type !== 'recovery-code') : s.keys;
    if (kept.length + 1 > LIMITS.maxKeys) fail('bad-options', 'A journal has at most 16 ways in.');
    return { session: session(s.contentKey, [...kept, made.entry]), recoveryCode: made.recoveryCode || null };
  } finally { dek.fill(0); }
}

/** Remove a way in by its index. At least one passphrase or recovery code always stays. */
export function removeWay(s, index) {
  if (!isSession(s)) fail('bad-options', 'Unlock the journal first.');
  if (!Number.isInteger(index) || index < 0 || index >= s.keys.length) fail('bad-options', 'No such way in.');
  const keys = s.keys.filter((_, i) => i !== index);
  if (!keys.some((k) => k.type === 'passphrase' || k.type === 'recovery-code')) fail('last-way', 'A passphrase or recovery code has to stay, so the journal can always be opened without this site.');
  return session(s.contentKey, keys);
}

/** Change the passphrase: the new one is added and every old passphrase removed (recovery codes and passkeys stay). */
export async function changePassphrase(s, secret, passphrase, { iterations = DEFAULT_ITERATIONS } = {}) {
  const added = (await addWay(s, secret, { type: 'passphrase', passphrase, iterations })).session;
  return session(added.contentKey, added.keys.filter((k, i) => k.type !== 'passphrase' || i === added.keys.length - 1));
}

/** What an unlocked document is, by content (as for .jotz): 'jotz' for a ZIP package, otherwise 'jot'. */
export const kindOf = (bytes) => (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04 ? 'jotz' : 'jot');

export default { createLock, lock, unlock, unlockSession, addWay, removeWay, verifyWay, changePassphrase, waysIn, newRecoveryCode, normalizeRecoveryCode, isLocked, readHeader, kindOf, LockError, LOCK_EXTENSION, DEFAULT_ITERATIONS, RECOVERY_ITERATIONS, LIMITS };
