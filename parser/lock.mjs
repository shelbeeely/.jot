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

async function keyFor(passphrase, salt, iterations, usage) {
  const base = await subtle().importKey('raw', passBytes(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, [usage]);
}

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

/** Lock a journal (text or bytes of a .jot or .jotz). The result is checked by unlocking it before it is returned. */
export async function lock(input, passphrase, { iterations = DEFAULT_ITERATIONS } = {}) {
  const plain = bytesOf(input);
  if (plain.length > LIMITS.maxPayload) throw new LockError('too-large', 'A document over 64 MiB cannot be locked.');
  if (isLocked(plain)) throw new LockError('already-locked', 'This document is already locked.');
  if (!Number.isInteger(iterations) || iterations < LIMITS.minIterations || iterations > LIMITS.maxIterations) throw new LockError('bad-options', 'Iterations must be a whole number from 100,000 to 10,000,000.');
  passBytes(passphrase);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16)), iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const header = enc.encode(MAGIC + JSON.stringify({ kdf: 'PBKDF2-SHA-256', iterations, salt: b64(salt), cipher: 'AES-256-GCM', iv: b64(iv) }) + '\n');
  const key = await keyFor(passphrase, salt, iterations, 'encrypt');
  const sealed = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: header, tagLength: 128 }, key, plain));
  const out = new Uint8Array(header.length + sealed.length); out.set(header); out.set(sealed, header.length);
  const back = await unlock(out, passphrase);
  if (back.length !== plain.length || back.some((x, i) => x !== plain[i])) throw new LockError('self-check', 'The locked copy did not unlock to the same writing, so it was not made.');
  return out;
}

/** Unlock a locked document: the original bytes, exactly. A wrong passphrase and a changed file fail the same way (GCM cannot tell). */
export async function unlock(input, passphrase) {
  const { iterations, salt, iv, headerBytes, body } = readHeader(input);
  const key = await keyFor(passphrase, salt, iterations, 'decrypt');
  try { return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv, additionalData: headerBytes, tagLength: 128 }, key, body)); }
  catch { throw new LockError('cannot-unlock', 'Could not unlock: the passphrase is wrong, or the file was changed.'); }
}

/** What an unlocked document is, by content (as for .jotz): 'jotz' for a ZIP package, otherwise 'jot'. */
export const kindOf = (bytes) => (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04 ? 'jotz' : 'jot');

export default { lock, unlock, isLocked, readHeader, kindOf, LockError, LOCK_EXTENSION, DEFAULT_ITERATIONS, LIMITS };
