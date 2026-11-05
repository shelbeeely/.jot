# three.js (bundled subset)

`three.mjs` is a minified bundle of three.js r186 (npm `three@0.186.0`, published 2026-09-08, git 148ef33ecb6d2502ff796d4554abd1549c95d519) made by esbuild 0.24.0 from
`tools/vendor-three/entry.mjs`: the renderer, scene, cameras, lights, animation mixer, `GLTFLoader`, `OrbitControls`,
`RoomEnvironment`, `DRACOLoader`, `KTX2Loader` and the meshopt decoder, unmodified. It is a classic script that sets
`globalThis.JotThree` and exports nothing, so Writer imports it for its effect and a fixed-layout EPUB page loads it with a plain
`<script>`. Rebuild with `sh tools/vendor-three/build.sh <empty folder>`, which also copies the decoders below.

`three-decoders/` holds the WebAssembly decoders three.js r186 ships, unmodified: the glTF build of Google's Draco decoder
(`draco_wasm_wrapper.js`, `draco_decoder.wasm`, for `KHR_draco_mesh_compression`) and the Basis Universal transcoder
(`basis_transcoder.js`, `basis_transcoder.wasm`, for `KHR_texture_basisu` KTX2 textures). Apache-2.0; see
`three-decoders-LICENSE.md`, which also covers the meshopt (`EXT_meshopt_compression`), zstd and KTX 2.0 code inside `three.mjs`.
three.js itself is MIT; see `three-LICENSE.md`. Upstream: https://github.com/mrdoob/three.js .

SHA-256:
- three.mjs: b92ff889b804b087a759096acac8fee32d0664c183bdc556883435807c2e5996
- three-decoders/draco_wasm_wrapper.js: 8bb2952d2ba7d67e1414f8df819410cb0434a666be53f671fff75f68843d76f6
- three-decoders/draco_decoder.wasm: a680d927bed9cb864ddbd63521868891af2bfbe755092761b4837487618df8ac
- three-decoders/basis_transcoder.js: 8478b5b6d6b74e7d3082b89f6417321d8d1dc0307f2b30d4484bb11b441696a1
- three-decoders/basis_transcoder.wasm: 6cf17dc889352c42e9acf8897107978d127005fe3386c36a0e3845e27967630a

Jot's viewer (`model3d-view.mjs`) only ever calls `GLTFLoader.parse` on bytes already in the journal, with a loading manager that
refuses every outside URL, so the bundle's network code (`FileLoader`) is never used to fetch. The decoders are handed over as
bytes (blob: URLs made from them), only when a model declares the extension; `KTX2Loader`'s default CDN address is never used,
because the manager refuses it. Everything here loads only when someone asks to turn a model in 3D. Recheck the licence, the viewer and the 3D model browser suite (`node site/test-model3d-ui.cjs`) before upgrading.
