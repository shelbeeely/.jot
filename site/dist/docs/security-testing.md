# Jot security verification and passkeys

Updated 2 November 2026. Stage: **0.1.0 prototype**. Encryption is core to v1; passing tests is evidence of tested properties, not proof of security. No external review, real-account credential sync or physical authenticator/native-device certification is claimed here.

## What we protect and where the boundary ends

| Threat | Required verification | Current boundary |
| --- | --- | --- |
| Someone obtains a protected journal | Secret plaintext/media/metadata markers absent from all readable members, indexes and persisted copies; only a valid local way in opens private content | Public entries, dates/IDs/sizes and key-slot metadata remain intentionally visible; weak passphrases can be guessed offline |
| Modified or substituted private content | Ciphertext/tag/key/identity/revision/date tampering and manifest/catalog substitution fail closed before replacing current writing | Locked public reading cannot authenticate the private catalog until unlock; wholly public archives have no author authentication |
| Malicious archive | Path, duplicate, size, decompression, unsupported-feature, catalog and index-schema limits reject safely | More fuzzing and independent parser/container review remain work |
| Private data moved into/out of public state | Fresh public indexes, protected originals and derivatives, truthful exports, failure/retry and relock/storage/network scans | Existing backups/exports cannot be retroactively erased |
| Lost/stolen passkey or password change | New-copy slot removal/change, current recovery and local offline unlock work | Removing a slot does not revoke old copies or a previously exposed master key; passphrase change is not master-key rotation |
| Compromised unlocked device or application code | CSP, origin isolation, dependency review and no unexpected external requests; independent application review | At-rest encryption cannot stop malicious same-origin code, malware, extensions, OS memory inspection or an attacker using an already-unlocked session |
| Replayed older valid journal | Explicit rollback limitation; investigate trusted freshness state if required | Offline file encryption alone does not detect rollback to a valid older archive |

These boundaries must be communicated before stable v1, including the remaining compromise-recovery and extension policies. Never use real personal journals or production credentials as mutation/fuzz fixtures.

## How passkeys unlock Jot

The prototype requests WebAuthn user verification and its PRF extension. A supported credential produces a 32-byte answer; HKDF derives the wrapping key that opens an encrypted master-key slot. Per-member keys then open private entries/assets. The biometric/PIN stays with the authenticator; PRF answers are not serialized into the journal.

This is local encryption-key unlocking, not a server account sign-in. Any future account authentication needs its own proper WebAuthn challenge/origin/RP/signature verification. The browser mediates the current origin-bound credential ceremony; the client additionally rejects malformed outputs and unexpected credentials.

Passkeys saved in a password manager are a valid integration route when that manager/browser exposes PRF. Saving or syncing a login passkey alone is not proof of that capability; test the actual chosen manager, browser and provider sync path.

A passkey is one independent unlocking method. It does not make a weak alternate passphrase stronger and is not automatically two-factor journal encryption. Maintain at least one passphrase or recovery-code path. Synced/cross-device credentials may need provider/device connectivity; keep a portable local offline recovery route. An authenticator without PRF may support ordinary passkey login but still be unable to unlock this format.

A relying-party domain must remain stable. Repository paths on the same hosting origin do not isolate WebAuthn RP IDs, scripts or browser storage. Decide the production origin and native platform association before promising credential portability. A changed hostname or native webview origin may need a separately enrolled key or recovery; do not bypass origin checks. Journal names/labels shown to credential managers or stored in public slots must also be reviewed for sensitive information.

## Nontechnical recovery and established cryptography

The product goal is simple private journaling that survives losing one unlocking method. Prefer an everyday passkey plus an independently usable offline recovery code for the normal profile; optional passphrases remain supported. These are alternative routes. Requiring both on every unlock is a different threat policy and does not solve accidental loss by itself. Avoid making a 2-of-2 policy the beginner default.

The intended Writer flow saves and confirms a separate backup, provides a recovery rehearsal, prevents accidentally reducing usable access to a single method, and helps replace a lost credential after authenticating with a remaining one. Store recovery outside the journal and avoid keeping every route in one vault/device. The current prototype already supports alternative slots, but recovery opt-out and single-method removal are still possible; those UX safeguards are planned, not claimed delivered. If all usable secrets are lost, the current local-only system cannot restore the journal.

Use platform Web Crypto for the existing AES-256-GCM, PBKDF2-HMAC-SHA-256 and HKDF primitives, and WebAuthn PRF for compatible passkeys. Do not substitute hand-written algorithms or claim the overall Jot protocol is proven/audited because its primitives are established. A full review remains required.

Strict multikey/2-of-3 can remain an advanced candidate when a user explicitly wants it. Any threshold implementation must use a reviewed implementation, authenticated encrypted shares/policy, independent review of the composition and recovery that matches the stated policy. Never use a homemade concatenation/hash recipe and call that a reviewed multikey protocol.

Research identified `privy-io/shamir-secret-sharing` as a browser/Node candidate with published Cure53 and Zellic reports. It is not selected, installed or approved for Jot. The inspected main package reports 0.0.4; the reports cover earlier named revisions, not every future release or Jot integration. The library documents that reconstruction has no built-in integrity verification and JavaScript cannot promise true constant-time execution. Verify versions/fixes and add authenticated reconstruction and policy binding before considering adoption. The plain recovery profile above needs no new secret-sharing dependency.

## Repeatable automated checks

```sh
npm run test:security
npm run test:security:browser
node tools/check-generated.mjs
node tools/privacy-check.mjs site/dist
```

The Node command exercises archive validation/round trips, private-marker scans, index fallback/cleanup, key slots/recovery/tampering, independent node:crypto decryption, PRF byte/credential/origin boundaries and the publication privacy gate. The browser command requires the existing Playwright/Chromium setup; it checks the virtual PRF authenticator, protected browser persistence, media, relock/recovery, failed imports, source search and offline navigation. It does not connect a real account or physical security key.

For a security-focused change, include negative tests: wrong secrets; changed tags/nonces/wrapped keys; substituted identity/order/date; mismatched catalog and privacy flags; unsupported features; absent/corrupt index; malformed PRF outputs; unexpected or duplicate credentials; wrong RP; no PRF; cancelled ceremony; unavailable APIs; and failed/retried saves. Verify existing data remains intact on failure. The current strict PRF contract is exactly 32 bytes at both browser and wrapping boundaries, with no insecure fallback.

Retain independent decrypt/parse test vectors, and add stable cross-implementation vectors and property tests before claiming interoperability. Randomness/nonces should be reviewed in code and sampled in tests; a non-collision test alone cannot prove safe randomness.

## Mutation and fuzzing gate: planned

Build a bounded corpus covering public/mixed/protected, empty/BOM/CRLF/repeated dates, media, ink and optional index cases. Mutate ZIP headers/directories, sizes, compression metadata, JSON types/depth/counts, member descriptors, framed metadata and SQLite bytes. Include traversal, symlinks, duplicate/colliding aliases, local/central-directory disagreements and compression bombs.

Run hostile inputs in an isolated process with time/memory budgets and no account credentials/network. Assert reject or bounded recovery as appropriate, no hang/unbounded allocation, no disk traversal/external fetch, no private plaintext output and no replacement of the previous journal on failed open. Classify expected public data changes separately from authenticated-private tampering; not every random byte mutation must fail. Save minimized reproducible crashes as regression fixtures. This harness/campaign is a release task, not something claimed completed by the existing unit suite.

## ESP32-family interoperability target: unverified on hardware

AES-256-GCM is the preferred common content-encryption primitive: it is already used by Jot through Web Crypto, while ESP-IDF exposes AES/GCM through its supported cryptographic stack. Keep SHA-256/HMAC, PBKDF2 and HKDF compatible at the byte/protocol level. ESP-IDF 6.x documentation describes migration to PSA Crypto; pin the SDK and use its supported public APIs rather than copying obsolete low-level code. Required features may need explicit configuration, and acceleration varies by chip/configuration.

Current passphrase slots normally use 600,000 PBKDF2-HMAC-SHA-256 iterations. Benchmark on the actual chip before committing to acceptable unlock time/power; do not silently lower the work factor. Memory-heavy password derivation is not a baseline assumption for an ESP32. Test UTF-8/NFC and recovery normalization as well as cipher vectors, not just ASCII round trips.

The current JavaScript ZIP/SQLite-WASM implementation and desktop-scale memory limits are not an ESP32 firmware implementation. Plan a bounded reader with suitable storage, optional index/source-search handling and explicit limits. Authenticate an encrypted member before exposing plaintext; many streaming AEAD APIs yield bytes before final verification. Safe staging/two-pass designs and any future chunking need explicit review and tests. Unknown/oversize content must not be silently dropped on save.

A plain ESP-IDF application is not a browser running WebAuthn. Local passphrase/recovery unlock can use the same archive slots; direct passkey use or host-assisted provisioning requires a separately verified integration and trust/key lifecycle. Do not promise all password managers, FIDO2 tokens or native bridges work on a bare ESP32. Secure Boot/flash encryption can add device defenses on supported configurations but are not replacements for portable document encryption.

Required evidence: browser/Node ↔ pinned ESP-IDF known-answer vectors, malformed/tampered-member rejection, authenticated-plaintext release, offline recovery, chip-specific time/RAM/power measurements, interrupted storage operations and round-trip preservation. The current environment has no `idf.py` or ESP32 cross-compiler and no physical-device evidence. This target does not change algorithms/file bytes or begin firmware delivery.

Sources: [Espressif Mbed TLS integration](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/protocols/mbedtls.html) and [ESP-IDF 6.x security/PSA migration](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/migration-guides/release-6.x/6.0/security.html), read 2 November 2026. Compatibility/profile recommendations above are engineering decisions to be measured, not hardware test results.

## Real passkey/device matrix: unverified

| Candidate configuration | Required checks | Evidence |
| --- | --- | --- |
| Windows + supported browsers/Windows Hello | PRF availability, user verification, local offline unlock, cancellation and missing credential | Not tested here |
| Android + supported browsers/credential providers | Same checks, device restore, provider sync and cross-device availability | Not tested here |
| iPhone/iPad + supported browsers/iCloud Keychain | Same checks, synced credentials, selection and native-host behavior | Not tested here |
| macOS + supported browsers/Touch ID | Same checks and credential-provider behavior | Not tested here |
| Linux + supported browsers + compatible FIDO2 security key | PRF support, insertion/touch/PIN, absent key and offline recovery | Not tested here |
| Desktop/mobile native webviews | Secure context, RP/app association, browser/API support and fallback recovery | Not tested here |

These are testing candidates, not a list of supported combinations. Record OS/browser/authenticator/provider versions, PRF capability, steps and outcome. Test both local hardware and provider-synced credentials where offered; virtual tests cannot prove that PRF output survives migration or that cross-device access works offline. Test loss of the only passkey, deleted credentials, domain change and all recovery methods without sacrificing the journal.

## Independent review before stable v1

Have a cryptography/application-security reviewer inspect the specification and implementation together: key hierarchy/KDF parameters, envelope encryption/AAD, nonce lifecycles, key-slot changes/compromise recovery, manifest/catalog binding, index privacy, ZIP/SQLite parsing, app origin/dependency trust and relock/export/storage paths. Provide fake fixtures, executable vectors, current threat model, reproducible build/test instructions and known limitations. Track findings, fix/retest them and publish the actual review scope/results before making an audited-security claim. Review does not grant a universal certificate or remove platform testing requirements.

If a finding needs disclosure, use a maintainer-designated private channel or GitHub private security reporting only if enabled. Do not post real journals, PRF answers, recovery codes, credentials or keys in public issues. No private-reporting service is asserted configured by this document.

## Sources and basis

- [W3C WebAuthn Level 3: PRF extension](https://www.w3.org/TR/webauthn-3/#prf-extension): credential-derived 32-byte PRF outputs and origin/RP-mediated WebAuthn operations.
- [W3C PRF explainer](https://github.com/w3c/webauthn/blob/main/explainers/prf-extension.md): client-side encryption use and why ordinary assertion signatures are not an encryption-secret substitute.
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html): threat modeling, authenticated encryption and key management.

`docs/methods/expressive-writing.md, line 443` supports privacy by deliberate choice. `docs/methods/digital-daily-notes.md, lines 434–446` distinguishes plaintext local files, encrypted sync and export/metadata exposure. These motivate honest privacy disclosure, not a particular cryptographic algorithm or proof of security. The concrete tests and threat boundaries above are engineering requirements.

Multikey research sources (2 November 2026): [Privy library and limitations](https://github.com/privy-io/shamir-secret-sharing), [Cure53 review](https://cure53.de/audit-report_privy-sss-library.pdf), [Zellic review](https://github.com/Zellic/publications/blob/master/Privy_Shamir_Secret_Sharing_-_Zellic_Audit_Report.pdf), and [RFC 5869 HKDF](https://www.rfc-editor.org/rfc/rfc5869). These establish specific primitives/review history, not a reviewed Jot multikey protocol.
