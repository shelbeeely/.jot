SQLite WASM 3.54.1-build1, vendored from @sqlite.org/sqlite-wasm via npm. No runtime download or OPFS is used.
The distribution's browser.mjs (upstream dist/index.mjs), node.mjs and sqlite3.wasm are copied unchanged. SQLite and its JavaScript
APIs are public domain; the Emscripten glue carries MIT/NCSA notices at the top of each JavaScript bundle. The npm wrapper declares
Apache-2.0; these distribution files retain upstream notices. Source: https://github.com/sqlite/sqlite-wasm and https://sqlite.org/wasm/.
Reproduce: npm install --prefix /tmp/jot-sqlite-vendor @sqlite.org/sqlite-wasm@3.54.1-build1, then copy those three dist files.
