/** Locked Jot documents (.jotlock): an ordinary .jot or .jotz, encrypted with a passphrase, using only the platform's built-in
 * Web Crypto (PBKDF2-SHA-256 and AES-256-GCM; Node 18+ and every current browser). Unlocking returns the original bytes exactly,
 * so the journal format is unchanged. The format is specified in LOCK.md (specification/Jot-Lock-v1.md).
 *
 *   JOTLOCK 1\n
 *   {"kdf":"PBKDF2-SHA-256","iterations":600000,"salt":"…","cipher":"AES-256-GCM","iv":"…"}\n
 *   ciphertext, then the 16-byte GCM tag
 *
 * Both header lines are the GCM additional data, so a changed header fails like a changed body. There is no recovery: without the
 * passphrase the writing cannot be read, by anyone, including this code.
 */

const MAGIC = 'JOTLOCK 1\n', enc = new TextEncoder(), dec = new TextDecoder('utf-8', { fatal: true });
export const LOCK_EXTENSION = '.jotlock';
export const DEFAULT_ITERATIONS = 600000; // OWASP's 2023 figure for PBKDF2-HMAC-SHA256
export const LIMITS = { minIterations: 100000, maxIterations: 10000000, maxHeader: 1024, maxPayload: 64 * 1024 * 1024 };

export class LockError extends Error {
  constructor(code, message) { super(message); this.name = 'LockError'; this.code = code; }
}

const subtle = () => {
  const s = globalThis.crypto && globalThis.crypto.subtle;
  if (!s) throw new LockError('no-crypto', 'This browser or runtime has no built-in Web Crypto, so it cannot lock or unlock.');
  return s;
};
const bytesOf = (input) => (typeof input === 'string' ? enc.encode(input) : input instanceof Uint8Array ? input : new Uint8Array(input));
const b64 = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const unb64 = (s) => { if (typeof s !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4) return null; const t = atob(s); return Uint8Array.from(t, (c) => c.charCodeAt(0)); };

/** A passphrase as bytes: Unicode NFC, then UTF-8, so the same words typed on another keyboard or system give the same key. */
function passBytes(passphrase) {
  if (typeof passphrase !== 'string' || passphrase === '') throw new LockError('no-passphrase', 'A passphrase is needed.');
  return enc.encode(passphrase.normalize('NFC'));
}

async function keyFor(passphrase, salt, iterations) {
  const base = await subtle().importKey('raw', passBytes(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const checkIterations = (n) => { if (!Number.isInteger(n) || n < LIMITS.minIterations || n > LIMITS.maxIterations) throw new LockError('bad-options', 'Iterations must be a whole number from 100,000 to 10,000,000.'); };

/** A key for one session: derived once (the slow part), then reused for every save with a fresh nonce each time. The CryptoKey
 * cannot be exported and the passphrase is not kept. Pass `salt` and `iterations` from a header to match an existing lock. */
export async function makeKey(passphrase, { iterations = DEFAULT_ITERATIONS, salt } = {}) {
  checkIterations(iterations); passBytes(passphrase);
  const s = salt ? new Uint8Array(salt) : globalThis.crypto.getRandomValues(new Uint8Array(16));
  if (s.length < 16 || s.length > 64) throw new LockError('bad-options', 'A salt is 16 to 64 bytes.');
  return Object.freeze({ key: await keyFor(passphrase, s, iterations), salt: s, iterations });
}
const isKey = (k) => k && typeof k === 'object' && k.salt instanceof Uint8Array && Number.isInteger(k.iterations) && k.key;
const sameSalt = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/** True when the bytes start like a locked document (whatever the file is called). */
export function isLocked(input) {
  const b = bytesOf(input);
  if (b.length < MAGIC.length) return false;
  for (let i = 0; i < MAGIC.length; i++) if (b[i] !== MAGIC.charCodeAt(i)) return false;
  return true;
}

/** The header of a locked document, checked against the format's rules (no passphrase needed; it holds nothing secret). */
export function readHeader(input) {
  const b = bytesOf(input);
  if (!isLocked(b)) throw new LockError('not-locked', 'This is not a locked Jot document.');
  const end = b.indexOf(0x0a, MAGIC.length);
  if (end < 0 || end - MAGIC.length > LIMITS.maxHeader) throw new LockError('bad-header', 'The lock header is missing or too long.');
  let h;
  try { h = JSON.parse(dec.decode(b.subarray(MAGIC.length, end))); } catch { throw new LockError('bad-header', 'The lock header is not readable.'); }
  const keys = ['kdf', 'iterations', 'salt', 'cipher', 'iv'];
  if (!h || typeof h !== 'object' || Array.isArray(h) || Object.keys(h).sort().join() !== [...keys].sort().join()) throw new LockError('bad-header', 'The lock header has unexpected fields.');
  if (h.kdf !== 'PBKDF2-SHA-256' || h.cipher !== 'AES-256-GCM') throw new LockError('unsupported', `Unsupported lock: ${h.kdf} with ${h.cipher}.`);
  if (!Number.isInteger(h.iterations) || h.iterations < LIMITS.minIterations || h.iterations > LIMITS.maxIterations) throw new LockError('bad-header', 'The lock header asks for an iteration count outside the allowed range.');
  const salt = unb64(h.salt), iv = unb64(h.iv);
  if (!salt || salt.length < 16 || salt.length > 64) throw new LockError('bad-header', 'The lock header has an unusable salt.');
  if (!iv || iv.length !== 12) throw new LockError('bad-header', 'The lock header has an unusable nonce.');
  const body = b.subarray(end + 1);
  if (body.length < 16) throw new LockError('bad-header', 'The locked document is cut short.');
  if (body.length - 16 > LIMITS.maxPayload) throw new LockError('too-large', 'The locked document is larger than 64 MiB.');
  return { iterations: h.iterations, salt, iv, headerBytes: b.subarray(0, end + 1), body };
}

/** Lock a journal (text or bytes of a .jot or .jotz) with a passphrase, or with a key from makeKey (no slow derivation; a fresh
 * nonce). The result is checked by unlocking it before it is returned. */
export async function lock(input, secret, { iterations = DEFAULT_ITERATIONS } = {}) {
  const plain = bytesOf(input);
  if (plain.length > LIMITS.maxPayload) throw new LockError('too-large', 'A document over 64 MiB cannot be locked.');
  if (isLocked(plain)) throw new LockError('already-locked', 'This document is already locked.');
  const k = isKey(secret) ? secret : await makeKey(secret, { iterations });
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const header = enc.encode(MAGIC + JSON.stringify({ kdf: 'PBKDF2-SHA-256', iterations: k.iterations, salt: b64(k.salt), cipher: 'AES-256-GCM', iv: b64(iv) }) + '\n');
  const sealed = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: header, tagLength: 128 }, k.key, plain));
  const out = new Uint8Array(header.length + sealed.length); out.set(header); out.set(sealed, header.length);
  const back = await unlock(out, k);
  if (back.length !== plain.length || back.some((x, i) => x !== plain[i])) throw new LockError('self-check', 'The locked copy did not unlock to the same writing, so it was not made.');
  return out;
}

/** Unlock a locked document: the original bytes, exactly. A wrong passphrase and a changed file fail the same way (GCM cannot tell).
 * `secret` is the passphrase, or a key from makeKey/unlockWithKey made for this lock's salt and iterations. */
export async function unlock(input, secret) {
  const { iterations, salt, iv, headerBytes, body } = readHeader(input);
  let key;
  if (isKey(secret)) {
    if (secret.iterations !== iterations || !sameSalt(secret.salt, salt)) throw new LockError('other-key', 'This document was locked with another key; its passphrase is needed.');
    key = secret.key;
  } else key = await keyFor(secret, salt, iterations);
  try { return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv, additionalData: headerBytes, tagLength: 128 }, key, body)); }
  catch { throw new LockError('cannot-unlock', 'Could not unlock: the passphrase is wrong, or the file was changed.'); }
}

/** Unlock with a passphrase and keep the key, so later saves of the same journal need no new derivation: { bytes, key }. */
export async function unlockWithKey(input, passphrase) {
  const { iterations, salt } = readHeader(input);
  const key = await makeKey(passphrase, { iterations, salt });
  return { bytes: await unlock(input, key), key };
}

/** What an unlocked document is, by content (as for .jotz): 'jotz' for a ZIP package, otherwise 'jot'. */
export const kindOf = (bytes) => (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04 ? 'jotz' : 'jot');

export default { lock, unlock, unlockWithKey, makeKey, isLocked, readHeader, kindOf, LockError, LOCK_EXTENSION, DEFAULT_ITERATIONS, LIMITS };
