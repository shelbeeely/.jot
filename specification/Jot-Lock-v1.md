# Jot Lock v1 (`.jotlock`)

Draft 2, 29 October 2026. A locked Jot document is an ordinary `.jot` or `.jotz`, encrypted. Unlocking returns the original
bytes exactly, so the journal format, the parser and every other tool are unchanged: a lock is a wrapper, not a new kind of
journal. It uses only primitives built into browsers and Node (Web Crypto: PBKDF2-SHA-256, HKDF-SHA-256 and AES-256-GCM), and
it can be opened without Jot by the short recipes below. Implementation: `parser/lock.mjs`; in the browser, `site/dist/jot/passkey.mjs`
for passkeys; command line: `jot lock`, `jot unlock`, `jot lock-info`.

The writing is encrypted once, with a random **content key**. Each **way in** wraps that content key on its own:

- a **passphrase**;
- a **recovery code**: 25 random characters, shown once when it is made, kept by the writer (a password manager, or paper);
- a **passkey or security key** (a phone's or computer's passkey, a YubiKey and the like), through the WebAuthn PRF extension.

Every locked document has at least one passphrase or recovery code, so it can always be opened anywhere, with or without the site
a passkey belongs to. Adding or removing a way in re-encrypts the file with the same content key; the writing is unchanged.

A locked file is the one exception to "readable in any text editor": it is readable by anyone who has one of its ways in and any
of the tools below, and by no one else.

## What it protects, and what it does not

It protects the writing in a file that is found, copied, synced to a service or stolen: a laptop's downloads folder, a cloud
drive, a backup disk, a shared computer.

It does not protect:

- **An unlocked copy.** Locking makes a new file; the unlocked journal is left where it was until you delete it, and a deleted
  file can stay recoverable on a disk. Any copy you unlock is not encrypted.
- **Someone using your unlocked device or browser**, or software on it that reads what you type.
- **Being made to unlock it.** There is no hidden or decoy journal. A fingerprint, a face or a security key in your pocket can be
  easier to force than a passphrase you remember; people with that worry can keep to a passphrase.
- **Older copies.** A copy made before a way in was removed still opens with it.
- **What the file shows from outside**: its name, size (the writing's length plus a few hundred bytes; there is no padding), its
  dates, which kinds of ways in it has, and any passkey labels and the site they belong to. Give locked files neutral names.
- **A weak passphrase.** Key stretching slows guessing; it does not stop it. Use several random words or a password manager.
- **The account a synced passkey lives in.** A passkey synced through Apple, Google or a password manager is as safe as that
  account and its recovery.

Nobody can reset a lock. Jot never stores, sends or escrows a passphrase, recovery code or passkey answer, and there is no account.
Without one of its ways in, nobody can unlock the file, including its writer and this project.

## Format

```text
JOTLOCK 1\n
{"cipher":"AES-256-GCM","iv":"<base64>","keys":[{"type":"passphrase",…}, …]}\n
<ciphertext><16-byte GCM tag>
```

1. **Line 1** is exactly `JOTLOCK 1` and a line feed (`0x0A`). Readers recognize a locked document by these 10 bytes, not by its
   extension.
2. **Line 2** is one JSON object on one line, at most 8,192 bytes, followed by a line feed, with exactly these members:
   - `cipher`: `"AES-256-GCM"`.
   - `iv`: standard base64 (with padding) of exactly 12 random bytes, fresh for every lock.
   - `keys`: 1 to 16 ways in (below), at least one of them a `passphrase` or `recovery-code`.
3. **The rest** is the AES-256-GCM ciphertext of the original document under the content key (32 random bytes), followed by the
   128-bit tag. The **additional authenticated data is both header lines, byte for byte, including their line feeds**, so a
   changed header (including the list of ways in) fails as a changed body does.
4. **The plaintext** is the complete original file: a `.jot` (UTF-8 text, byte for byte, any line endings) or a `.jotz` (ZIP).
   Readers tell them apart by content, as for `.jotz`: a ZIP local-file signature (`50 4B 03 04`) is a package, anything else is
   plain writing. The original file name is not stored.

### Ways in

Every way in has `type`, `iv` (base64 of 12 random bytes) and `key`: base64 of the 32-byte content key encrypted with AES-256-GCM
under the way in's own wrapping key, with the 16-byte tag appended (48 bytes in all). The additional data for that encryption is
the ASCII text `JOTLOCK 1 ` followed by the type, for example `JOTLOCK 1 passphrase`.

| `type` | Other members | Wrapping key |
| --- | --- | --- |
| `passphrase` | `kdf` (`"PBKDF2-SHA-256"`), `iterations` (100,000 to 10,000,000; writers use 600,000), `salt` (base64 of 16 to 64 random bytes) | PBKDF2-HMAC-SHA-256 of the passphrase (Unicode NFC, then UTF-8), the salt and the iterations, 32 bytes |
| `recovery-code` | as `passphrase` (writers use 100,000 iterations: the code itself carries 125 random bits) | the same, over the code's 25 canonical characters |
| `webauthn-prf` | `rp` (the WebAuthn relying party, a host name), `credential` (base64url of the credential ID), `input` (base64 of the 32 random bytes given to the PRF), optional `label` (at most 64 characters, visible to anyone with the file) | HKDF-SHA-256 with the 32-byte PRF result as input key material, an empty salt and the info `JOTLOCK 1 webauthn-prf`, 32 bytes |

**Recovery codes** are 25 characters of Crockford's base32 (`0-9` and `A-Z` without `I`, `L`, `O` and `U`), 125 random bits, shown
in five groups of five (`7K3QX-…`). Before use a code is made canonical: upper case, spaces and dashes removed, `O` read as `0`,
`I` and `L` as `1`.

**Passkeys and security keys** use WebAuthn's PRF extension: the relying party is `rp`, the credential is `credential`, and the
PRF is evaluated with `input` as its `first` value. Only a passkey or key for that site answers, after the person's touch,
fingerprint, face or PIN, and it gives the same 32 bytes each time. No server, account or signature check is involved: the answer
itself opens the content key. A passkey made on one site cannot be used on another, which is why a passphrase or recovery code
always stays.

### The first draft

Draft 1 (29 October 2026, the same day) had one passphrase and no `keys`: line 2 was
`{"kdf":"PBKDF2-SHA-256","iterations":…,"salt":"…","cipher":"AES-256-GCM","iv":"…"}`, and the PBKDF2 output was the content key
itself. Readers SHOULD still open it with its passphrase. Writers MUST NOT write it; `parser/lock.mjs` rewrites it in the current
form on the next save.

## Reading and writing rules

- Readers MUST check the header (exact members, allowed values and lengths, the iteration range, the number of ways in) before
  deriving any key, and MUST refuse more than 64 MiB of plaintext. Unknown versions, ciphers, key functions or types of way in are
  refused, not guessed.
- Something that does not open the journal and a changed file fail the same way, with no partial output; GCM cannot tell them
  apart and readers MUST NOT try.
- Writers MUST make the content key, every salt, every PRF input and every nonce with a cryptographic random generator, use a
  fresh nonce for every encryption, and keep at least one `passphrase` or `recovery-code`. They SHOULD decrypt the result and
  compare it with the original before writing it (as `jot lock` and `parser/lock.mjs` do).
- Adding or removing a way in SHOULD require one current way in. A new recovery code replaces the old one.
- An application MAY keep the content key (not exportable, where the platform allows) for the rest of a session, so saves do not
  repeat the slow key derivation.
- Writers MUST NOT lock an already locked document, store a passphrase, recovery code or PRF result, or put the original file
  name, title, dates or other metadata in the header.
- Applications that keep working copies (autosave, history, previews) of a locked journal MUST keep them encrypted or say plainly
  that they do not.
- Exporting or sharing from a locked journal produces unlocked files unless the application says otherwise, and it MUST say which.

The extension is `.jotlock`. A future version changes line 1 (`JOTLOCK 2`); version 1 readers refuse it.

## Opening a locked file without Jot

These open a lock with its passphrase. For a recovery code, give the canonical code instead and pick the `recovery-code` entry.

Python, with the `cryptography` package:

```python
import base64, hashlib, json, unicodedata
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def unlock(path, passphrase):
    data = open(path, 'rb').read()
    first = data.index(b'\n'); second = data.index(b'\n', first + 1)
    assert data[:first] == b'JOTLOCK 1'
    h = json.loads(data[first + 1:second]); b = base64.b64decode
    for k in (k for k in h['keys'] if k['type'] == 'passphrase'):
        wrap = hashlib.pbkdf2_hmac('sha256', unicodedata.normalize('NFC', passphrase).encode(), b(k['salt']), k['iterations'], 32)
        try: content = AESGCM(wrap).decrypt(b(k['iv']), b(k['key']), b'JOTLOCK 1 passphrase')
        except Exception: continue
        return AESGCM(content).decrypt(b(h['iv']), data[second + 1:], data[:second + 1])
    raise ValueError('that passphrase does not open it')
```

Node, with no packages (`node:crypto`):

```js
import { readFileSync } from 'node:fs';
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';

const open = (key, iv, sealed, aad) => {
  const d = createDecipheriv('aes-256-gcm', key, iv); d.setAAD(aad); d.setAuthTag(sealed.subarray(sealed.length - 16));
  return Buffer.concat([d.update(sealed.subarray(0, sealed.length - 16)), d.final()]);
};
export function unlock(path, passphrase) {
  const data = readFileSync(path), nl = data.indexOf(10, 10), header = data.subarray(0, nl + 1), b = (s) => Buffer.from(s, 'base64');
  if (data.subarray(0, 10).toString() !== 'JOTLOCK 1\n') throw Error('not a locked Jot document');
  const h = JSON.parse(data.subarray(10, nl).toString('utf8'));
  for (const k of h.keys.filter((k) => k.type === 'passphrase')) {
    const wrap = pbkdf2Sync(Buffer.from(passphrase.normalize('NFC')), b(k.salt), k.iterations, 32, 'sha256');
    let content; try { content = open(wrap, b(k.iv), b(k.key), Buffer.from('JOTLOCK 1 passphrase')); } catch { continue; }
    return open(content, b(h.iv), data.subarray(nl + 1), header);
  }
  throw Error('that passphrase does not open it');
}
```

`parser/lock-test.mjs` opens files made by `parser/lock.mjs` the same way with `node:crypto`, by passphrase and by a passkey's PRF
answer (HKDF as in the table), so the recipes and the implementation stay in step.

## Why these choices

PBKDF2, HKDF and AES-GCM are what every browser's built-in Web Crypto offers, so the site can lock and unlock with no added code.
Memory-hard functions (scrypt, Argon2) resist guessing on special hardware better, but would need code Jot would have to vendor; the
`age` format was considered for that reason and set aside in favour of built-in crypto (`DECISIONS.md`, 29 October 2026). 600,000
iterations is OWASP's 2023 figure for PBKDF2-HMAC-SHA256; each passphrase entry carries its count, so it can rise without a new
version. One content key with several wrapped copies (the pattern disk encryption uses for key slots) lets a journal have a spare
way in, and lets ways in change without touching the writing.
