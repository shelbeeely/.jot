#!/bin/sh
# Rebuild parser/vendor/three.mjs from pinned npm packages, in an empty scratch folder (nothing is installed in the repository).
#   sh tools/vendor-three/build.sh /path/to/empty/folder
# Then update the SHA-256 sums in parser/vendor/three-README.md and run node tools/sync-parser.mjs and node vscode/sync.mjs.
set -eu
repo=$(cd "$(dirname "$0")/../.." && pwd); work=${1:?an empty scratch folder}
mkdir -p "$work" && cd "$work"
npm init -y >/dev/null
npm install --no-audit --no-fund three@0.186.0 esbuild@0.24.0 >/dev/null
cp "$repo/tools/vendor-three/entry.mjs" ./entry.mjs
# import.meta.url has no meaning in a classic script: DRACOLoader's default decoder addresses resolve against a placeholder that
# Jot never fetches (the viewer always names its own decoders, and its loading manager refuses every other address).
npx esbuild entry.mjs --bundle --format=iife --minify --target=es2020 --legal-comments=eof --define:import.meta.url='"jot:/vendor/three.mjs"' --outfile="$repo/parser/vendor/three.mjs"
cp node_modules/three/LICENSE "$repo/parser/vendor/three-LICENSE.md"
d="$repo/parser/vendor/three-decoders"; mkdir -p "$d"
cp node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm "$d/"
cp node_modules/three/examples/jsm/libs/basis/basis_transcoder.js node_modules/three/examples/jsm/libs/basis/basis_transcoder.wasm "$d/"
sha256sum "$d"/*
sha256sum "$repo/parser/vendor/three.mjs"
