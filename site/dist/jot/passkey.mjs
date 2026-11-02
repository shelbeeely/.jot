// Passkeys and security keys for locked journals (site only; the format is in jot/lock.mjs and specification/Jot-Protection-v1.md).
// WebAuthn's PRF extension gives a secret that only this passkey or key, on this site, can produce, after a touch, a fingerprint, a
// face or a PIN. There is no server and no account: the challenge is random and never checked, because nothing here signs anyone
// in; the PRF answer is what opens the journal. Nothing is sent anywhere by this page.

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
const random = (n) => crypto.getRandomValues(new Uint8Array(n));

export class PasskeyError extends Error {}

/** True when this browser can try: WebAuthn in a secure context. Whether a given passkey supports PRF shows only when it is used. */
export const passkeysPossible = () => !!(globalThis.isSecureContext && globalThis.PublicKeyCredential && typeof navigator.credentials?.create === 'function' && typeof navigator.credentials?.get === 'function');
/** The site a passkey made here belongs to (its WebAuthn relying party). */
export const site = () => location.hostname;

const explain = (e) => {
  if (e instanceof PasskeyError) return e;
  if (e && e.name === 'NotAllowedError') return new PasskeyError('Cancelled, or this device could not use a passkey or security key just now.');
  if (e && e.name === 'InvalidStateError') return new PasskeyError('That passkey or key is already one of the ways in.');
  if (e && e.name === 'SecurityError') return new PasskeyError('Passkeys only work on this site\'s own address, over https.');
  return new PasskeyError('The passkey or security key did not answer: ' + (e && e.message ? e.message : 'unknown error') + '.');
};

const bufferBytes = (value) => {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new PasskeyError('The passkey returned invalid binary data.');
};
const prfBytes = (value) => {
  const bytes = bufferBytes(value);
  if (bytes.length !== 32) throw new PasskeyError('The passkey must return a 32-byte PRF answer to unlock a journal.');
  return bytes.slice();
};
const credentialId = (credential) => {
  if (credential?.type !== 'public-key') throw new PasskeyError('No public-key credential was returned.');
  const bytes = bufferBytes(credential.rawId);
  if (!bytes.length || bytes.length > 1024) throw new PasskeyError('The passkey returned an invalid credential ID.');
  return b64url(bytes);
};

/** Make a new passkey or use a security key for this journal: { credential, input, prf }. `name` is what the passkey list on the
 * device shows (the journal's name); `exclude` lists credential IDs already added. */
export async function registerPasskey({ name = 'Jot journal', exclude = [] } = {}) {
  if (!passkeysPossible()) throw new PasskeyError('This browser cannot use passkeys or security keys here.');
  const input = random(32);
  try {
    const cred = await navigator.credentials.create({ publicKey: {
      rp: { name: 'Jot', id: site() }, user: { id: random(16), name, displayName: name }, challenge: random(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -8 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' }, attestation: 'none', timeout: 120000,
      excludeCredentials: exclude.map((id) => ({ type: 'public-key', id: fromB64url(id) })),
      extensions: { prf: { eval: { first: input } } },
    } });
    const credential = credentialId(cred);
    const prf = cred.getClientExtensionResults().prf;
    if (!prf || !prf.enabled) throw new PasskeyError('This passkey or security key cannot unlock journals (it has no PRF support). Try another, or keep using your passphrase.');
    const first = prf.results?.first !== undefined ? prfBytes(prf.results.first) : (await passkeyAnswer([{ credential, input, rp: site() }])).prf;
    return { credential, input, prf: first };
  } catch (e) { throw explain(e); }
}

/** Ask a passkey or security key that is one of `ways` (entries from waysIn, for this site) for its answer: { credential, prf }. */
export async function passkeyAnswer(ways) {
  if (!passkeysPossible()) throw new PasskeyError('This browser cannot use passkeys or security keys here.');
  if (!Array.isArray(ways) || !ways.length) throw new PasskeyError('No passkey or security key opens this journal on this site.');
  try {
    const ids = new Set();
    for (const way of ways) {
      if (way.rp !== undefined && way.rp !== site()) throw new PasskeyError('That passkey belongs to a different site. Use a passphrase or recovery code here.');
      if (typeof way.credential !== 'string' || !/^[A-Za-z0-9_-]{1,1366}$/.test(way.credential) || ids.has(way.credential) || !fromB64url(way.credential).length) throw new PasskeyError('Invalid or duplicate passkey credential ID.');
      if (bufferBytes(way.input).length !== 32) throw new PasskeyError('A passkey needs a 32-byte PRF input.');
      ids.add(way.credential);
    }
    const evalByCredential = Object.fromEntries(ways.map((w) => [w.credential, { first: bufferBytes(w.input) }]));
    const a = await navigator.credentials.get({ publicKey: {
      challenge: random(32), rpId: site(), userVerification: 'required', timeout: 120000,
      allowCredentials: ways.map((w) => ({ type: 'public-key', id: fromB64url(w.credential) })),
      extensions: { prf: { evalByCredential } },
    } });
    const credential = credentialId(a);
    if (!ids.has(credential)) throw new PasskeyError('The returned passkey is not one of this journal’s ways in.');
    const r = a.getClientExtensionResults().prf;
    if (!r || !r.results || !r.results.first) throw new PasskeyError('That passkey or security key gave no answer it can unlock with.');
    return { credential, prf: prfBytes(r.results.first) };
  } catch (e) { throw explain(e); }
}
