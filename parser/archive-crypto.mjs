/** Jotz v1 key slots and independently encrypted members, using Web Crypto AES-256-GCM. */
const enc = new TextEncoder();
export const LOCK_EXTENSION = '.jotz';
export const DEFAULT_ITERATIONS = 600000; // OWASP's 2023 figure for PBKDF2-HMAC-SHA256
export const RECOVERY_ITERATIONS = 100000; // a recovery code carries 125 random bits, so stretching matters less
export const LIMITS = { minIterations: 100000, maxIterations: 2000000, maxHeader: 8192, maxKeys: 16, maxPayload: 64 * 1024 * 1024 };
const PRF_INFO = enc.encode('JOTZ 1 webauthn-prf');
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
const checkIterations = (n) => { if (!Number.isInteger(n) || n < LIMITS.minIterations || n > LIMITS.maxIterations) fail('bad-options', 'Iterations must be a whole number from 100,000 to 2,000,000.'); };

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
const wrapAad = (type) => enc.encode('JOTZ 1 keyslot ' + type);

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

export function waysIn(keys) { validateKeys(keys);return keys.map((e,index)=>({index,type:e.type,...(e.type==='webauthn-prf'?{rp:e.rp,credential:e.credential,input:unb64(e.input),...(e.label?{label:e.label}:{})}:{})})); }

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

// Archive key slots reuse reviewed platform primitives, with a distinct Jotz v1 domain.
export function validateKeys(keys) {
  if (!Array.isArray(keys) || !keys.length || keys.length > LIMITS.maxKeys) fail('bad-header','Invalid archive key slots.');
  keys.forEach(checkEntry);
  if(keys.reduce((n,k)=>n+(k.iterations||0),0)>8000000)fail('bad-header','Archive key derivation exceeds the resource limit.');
  if(!keys.some(k=>['passphrase','recovery-code'].includes(k.type))) fail('bad-header','A passphrase or recovery code is required.');
  return keys;
}
export async function openKeys(keys, secret) {
  validateKeys(keys); if(isSession(secret))return secret;
  const raw = await openContent(keys, secret);
  try { return session(await contentKeyOf(raw),keys); } finally { raw.fill(0); }
}
export { isSession };
export async function sealMember(data, s, aad) {
  if(!isSession(s)) fail('bad-options','Unlock the journal first.');
  const raw=random(32),iv=random(12),keyIv=random(12),auth=enc.encode(aad);
  try {
    const key=await contentKeyOf(raw);
    const bytes=new Uint8Array(await subtle().encrypt({name:'AES-GCM',iv,additionalData:auth,tagLength:128},key,bytesOf(data)));
    const wrapped=new Uint8Array(await subtle().encrypt({name:'AES-GCM',iv:keyIv,additionalData:enc.encode('JOTZ 1 member-key '+aad),tagLength:128},s.contentKey,raw));
    return {bytes,encryption:{cipher:'AES-256-GCM',iv:b64(iv),keyIv:b64(keyIv),key:b64(wrapped)}};
  } finally { raw.fill(0); }
}
export async function openMember(data, s, aad, encryption) {
  const iv=unb64(encryption?.iv),keyIv=unb64(encryption?.keyIv),wrapped=unb64(encryption?.key);
  if(encryption?.cipher!=='AES-256-GCM'||iv?.length!==12||keyIv?.length!==12||wrapped?.length!==48)fail('bad-header','Invalid member encryption.');
  let raw;
  try {
    raw=new Uint8Array(await subtle().decrypt({name:'AES-GCM',iv:keyIv,additionalData:enc.encode('JOTZ 1 member-key '+aad),tagLength:128},s.contentKey,wrapped));
    const key=await contentKeyOf(raw);
    return new Uint8Array(await subtle().decrypt({name:'AES-GCM',iv,additionalData:enc.encode(aad),tagLength:128},key,bytesOf(data)));
  } catch { fail('cannot-unlock','Could not unlock: that does not open this journal, or the file was changed.'); }
  finally { raw?.fill(0); }
}
