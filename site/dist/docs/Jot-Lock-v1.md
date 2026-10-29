# Jot Lock v1 (`.jotlock`)

Draft 1, 29 October 2026. A locked Jot document is an ordinary `.jot` or `.jotz`, encrypted with a passphrase. Unlocking returns
the original bytes exactly, so the journal format, the parser and every other tool are unchanged: a lock is a wrapper, not a new
kind of journal. It uses only primitives built into browsers and Node (Web Crypto: PBKDF2-SHA-256 and AES-256-GCM), and it can
be opened without Jot by the short recipes below. Implementation: `parser/lock.mjs`; command line: `jot lock`, `jot unlock`.

A locked file is the one exception to "readable in any text editor": it is readable by anyone who has the passphrase and any of
the tools below, and by no one else.

## What it protects, and what it does not

It protects the writing in a file that is found, copied, synced to a service or stolen: a laptop's downloads folder, a cloud
drive, a backup disk, a shared computer.

It does not protect:

- **An unlocked copy.** Locking makes a new file; the unlocked journal is left where it was until you delete it, and a deleted
  file can stay recoverable on a disk. Any copy you unlock is not encrypted.
- **Someone using your unlocked device or browser**, or software on it that reads what you type.
- **Being made to give up the passphrase.** There is no hidden or decoy journal.
- **What the file shows from outside**: its name, size (the writing's length plus about 150 bytes; there is no padding), and
  its dates. Give locked files neutral names.
- **A weak passphrase.** Key stretching slows guessing; it does not stop it. Use several random words or a password manager.

There is no recovery. Jot never stores, sends or escrows a passphrase, and there is no account to reset. Without the passphrase,
nobody can unlock the file, including its writer and this project.

## Format

```text
JOTLOCK 1\n
{"kdf":"PBKDF2-SHA-256","iterations":600000,"salt":"<base64>","cipher":"AES-256-GCM","iv":"<base64>"}\n
<ciphertext><16-byte GCM tag>
```

1. **Line 1** is exactly `JOTLOCK 1` and a line feed (`0x0A`). Readers recognize a locked document by these 10 bytes, not by its
   extension.
2. **Line 2** is one JSON object on one line, at most 1,024 bytes, followed by a line feed, with exactly these members:
   - `kdf`: `"PBKDF2-SHA-256"`.
   - `iterations`: an integer from 100,000 to 10,000,000. Writers use 600,000 unless asked otherwise.
   - `salt`: standard base64 (with padding) of 16 to 64 random bytes. Writers use 16 fresh random bytes for every lock.
   - `cipher`: `"AES-256-GCM"`.
   - `iv`: standard base64 of exactly 12 random bytes, fresh for every lock.
3. **The rest** is the AES-256-GCM ciphertext of the original document, followed by the 128-bit tag. The **additional
   authenticated data is both header lines, byte for byte, including their line feeds**, so a changed header fails as a changed
   body does.
4. **The key** is PBKDF2 with HMAC-SHA-256 over the passphrase (Unicode NFC, then UTF-8), the salt and the iteration count,
   giving 32 bytes. NFC means the same words typed on another keyboard or system give the same key.
5. **The plaintext** is the complete original file: a `.jot` (UTF-8 text, byte for byte, any line endings) or a `.jotz` (ZIP).
   Readers tell them apart by content, as for `.jotz`: a ZIP local-file signature (`50 4B 03 04`) is a package, anything else is
   plain writing. The original file name is not stored.

## Reading and writing rules

- Readers MUST check the header (exact members, allowed values and lengths, the iteration range) before deriving a key, and
  MUST refuse more than 64 MiB of plaintext. Unknown versions, ciphers or key functions are refused, not guessed.
- A wrong passphrase and a changed file fail the same way, with no partial output; GCM cannot tell them apart and readers MUST NOT
  try.
- Writers MUST use a fresh random nonce for every lock, and a fresh random salt for every new passphrase. An application MAY keep
  one key (and so one salt) for later saves of the same journal under the same passphrase, so the slow derivation runs once per
  session; the nonce is still fresh every time. Writers SHOULD unlock the result and compare it with the original before writing
  it (as `jot lock` and `parser/lock.mjs` do).
- Writers MUST NOT lock an already locked document, store the passphrase, or put the original file name, title, dates or other
  metadata in the header.
- Applications that keep working copies (autosave, history, previews) of a locked journal MUST keep them encrypted or say plainly
  that they do not.
- Exporting or sharing from a locked journal produces unlocked files unless the application says otherwise, and it MUST say which.

The extension is `.jotlock`. A future version changes line 1 (`JOTLOCK 2`); version 1 readers refuse it.

## Opening a locked file without Jot

Python, with the `cryptography` package:

```python
import base64, hashlib, json, unicodedata
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def unlock(path, passphrase):
    data = open(path, 'rb').read()
    first = data.index(b'\n'); second = data.index(b'\n', first + 1)
    assert data[:first] == b'JOTLOCK 1'
    h = json.loads(data[first + 1:second])
    key = hashlib.pbkdf2_hmac('sha256', unicodedata.normalize('NFC', passphrase).encode(),
                              base64.b64decode(h['salt']), h['iterations'], 32)
    return AESGCM(key).decrypt(base64.b64decode(h['iv']), data[second + 1:], data[:second + 1])
```

Node, with no packages (`node:crypto`):

```js
import { readFileSync } from 'node:fs';
import { createDecipheriv, pbkdf2Sync } from 'node:crypto';

export function unlock(path, passphrase) {
  const data = readFileSync(path), nl = data.indexOf(10, 10), header = data.subarray(0, nl + 1);
  if (data.subarray(0, 10).toString() !== 'JOTLOCK 1\n') throw Error('not a locked Jot document');
  const h = JSON.parse(data.subarray(10, nl).toString('utf8')), body = data.subarray(nl + 1);
  const key = pbkdf2Sync(Buffer.from(passphrase.normalize('NFC')), Buffer.from(h.salt, 'base64'), h.iterations, 32, 'sha256');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(h.iv, 'base64'));
  d.setAAD(header); d.setAuthTag(body.subarray(body.length - 16));
  return Buffer.concat([d.update(body.subarray(0, body.length - 16)), d.final()]);
}
```

`parser/lock-test.mjs` opens files made by `parser/lock.mjs` with the Node recipe, so the two stay in step.

## Why these choices

PBKDF2 and AES-GCM are the strongest key-stretching function and authenticated cipher that every browser's built-in Web Crypto
offers, so the site can lock and unlock with no added code. Memory-hard functions (scrypt, Argon2) resist guessing on special
hardware better, but would need code Jot would have to vendor; the `age` format was considered for that reason and set aside in
favour of built-in crypto (`DECISIONS.md`, 29 October 2026). 600,000 iterations is OWASP's 2023 figure for PBKDF2-HMAC-SHA256;
the header carries the count, so it can rise without a new version.
