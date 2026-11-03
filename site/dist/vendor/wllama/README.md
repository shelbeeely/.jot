# Local cleanup runtime

Unmodified runtime assets from npm `@wllama/wllama@3.8.1` and `@wllama/wllama-compat@3.8.1`, MIT, downloaded November 3, 2026. `esm/index.js` is served as `index.mjs` without byte changes. Both normal and compatibility worker assets are local; Jot explicitly configures local compatibility URLs and CPU-only/single-thread loading. No automatic CDN fallback is selected. Underlying libllama reports `b11364-46ca246`. See LICENSE.txt and LICENSE-llama.txt.

Package sources: https://github.com/ngxson/wllama and https://github.com/ggml-org/llama.cpp . npm runtime tarball SHA-256: bbe65fcc6d128d7853aed6d1699db7541e51a0363dc0135b8b68153acbf74670 .

Runtime SHA-256:
- index.mjs: e5506753e41a59c11f61f2c52422045be9fc76e32a7e47f037aaad5df4ec723e
- wllama.wasm: 551f13439366eff11e057b1b91fe46a7fdac29d56d67372d4c5f19a549dfe70c
- compat/wllama.js: 2649eeb408988841c372e54805adfa25aed5d02f850c09add78c2f3ac0f3fce1
- compat/wllama.wasm: 2db3f67d0bcc19cdf8f14f129e46cab691bff898954808f8a2dc4c586eb5bb68

Optional model: HuggingFaceTB/SmolLM2-360M-Instruct, English, Apache-2.0 (LICENSE-model.txt), quantized by bartowski. https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct and https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF . Pinned artifact is `SmolLM2-360M-Instruct-Q4_K_M.gguf` at revision 7be6f65f1db715fe5dc5a4634c0d459b4eed42ec, 270590880 bytes, SHA-256 2fa3f013dcdd7b99f9b237717fa0b12d75bbb89984cc1274be1471a465bac9c2. Weights are NOT committed or included in journal archives: explicit download/import plus optional public-model storage is required.

Loading from a Blob bypasses the vendor model downloader/cache. Prompt caching is disabled. Inference and KV state stay in the worker, terminated when the voice backend closes. No journal text, transcripts or audio belong in the model cache, logs or application cache. Integrity pinning does not constitute a binary/source audit or a factual-preservation guarantee. Validate output and require review. Runtime memory is substantially larger than download size; native/mobile/low-memory quality and latency remain release work. Upgrade assets, model pins, offline allowlist, licensing and real-model tests together.
