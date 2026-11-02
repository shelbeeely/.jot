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
