# three.js (bundled subset)

`three.mjs` is a minified bundle of three.js r186 (npm `three@0.186.0`, published 2026-09-08, git 148ef33ecb6d2502ff796d4554abd1549c95d519) made by esbuild 0.24.0 from
`tools/vendor-three/entry.mjs`: the renderer, scene, cameras, lights, animation mixer, `GLTFLoader`, `OrbitControls` and
`RoomEnvironment`, unmodified. It is a classic script that sets `globalThis.JotThree` and exports nothing, so Writer imports it for
its effect and a fixed-layout EPUB page loads it with a plain `<script>`. Rebuild with `sh tools/vendor-three/build.sh <empty folder>`.
MIT; see `three-LICENSE.md`. Upstream: https://github.com/mrdoob/three.js .

SHA-256:
- three.mjs: 83d43178c19b348ab0c027d281dd26fb68bb78eb8ad49057557eaaab280c3ff7

Jot's viewer (`model3d-view.mjs`) only ever calls `GLTFLoader.parse` on bytes already in the journal, with a loading manager that
refuses every outside URL, so the bundle's network code (`FileLoader`) is never used to fetch. It is loaded only when someone asks
to turn a model in 3D. Recheck the licence, the viewer and the 3D model browser suite (`node site/test-model3d-ui.cjs`) before upgrading.
