# Cactus Needle / Whistle WebAssembly runtime

Vendored, unmodified runtime from https://huggingface.co/Cactus-Compute/needle3 at revision d6c7d6a2e9655505e0f8e23339356dd1705900eb, `wasm/`. Apache-2.0; see LICENSE.txt. Downloaded November 2, 2026. Header retained as API reference at docs/vendor/needle/needle.h in the repository. Upstream project: https://github.com/cactus-compute/needle . No model weights are bundled.

SHA-256:
- needle.js: a675c66f506a1b6f922d852c0cc0b82a843ce9d0fab6a80a408106f516df126f
- needle.wasm: 7b73d09c17923bf81d6bdb82e19b3c343b8994f83d512ddec52eec9f6b029802
- needle.h: a27dac4b3239eead91d124b7f7dbce5495c13019903fd817b68c16d39b055a99

Optional model downloads/imports are size/SHA-256 pinned in speech-models.mjs. Those public weights have a separate opt-in IndexedDB cache; journal/audio/transcript data must never enter it. Runtime isolation is a dedicated worker terminated on close/lock/reset. Vendor performance/security claims are not an independent Jot review, and this is not ESP32 support. Recheck upstream license, API, bytes, model integrity and live/offline tests together before upgrading.
