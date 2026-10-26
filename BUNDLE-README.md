# Jot v1 — Complete project bundle

This archive contains the current Jot project: the runnable browser site, specification sources and PDF, JavaScript parser and document container, tests, examples, schemas, method catalogue, paper presets, roadmaps, dependency notices, and supplied reference PDFs.

## Start the site

From this extracted folder, with Python 3 installed:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory site/dist
```

Open http://localhost:8000/ for the journal workspace, or http://localhost:8000/scan/ for scanner and handwriting. Use HTTP rather than opening index.html directly: JavaScript modules need a server. No build or package installation is needed. Localhost normally permits camera access; remote hosting needs HTTPS for camera access. Browser permissions still apply.

The site is static and can be hosted by serving site/dist at a domain root. Hosted access controls are infrastructure settings, not part of these static files. Local copies do not require a ChatGPT sign-in. Vendored runtime dependencies are included. Journal content is processed locally; localStorage and IndexedDB belong to the browser origin. Existing browser journals and private hosting credentials are not included in this source archive. Download journals from the app separately to preserve personal writing.

## Contents

- site/: complete HTML/CSS/JavaScript source, scanner, handwriting, local persistence, bundled parser, docs and scanner tests. dist/ is both editable source and runnable output.
- specification/: complete specification Markdown and PDF, examples, profiles, schemas, paper sizes, conformance fixtures, source register and roadmap.
- parser/: JavaScript modules, vendored dependencies/licenses, parser/proofreading/container tests and API docs.
- DECISIONS.md: latest decisions and implementation status; read this before older specification text.
- examples/: both plain-text and packaged .jot examples.
- references/: user-supplied original PDFs. The historical DotJot document is background only; the project is Jot.
- MANIFEST.json: SHA-256 and byte size for every other file in this archive.

## Run the automated checks

With Node.js installed (previously tested on Node 24), from this folder:

```sh
node --test parser/test.mjs parser/proofread-test.mjs parser/container-test.mjs
node site/test-core.cjs
```

## Status

This is Jot v1 in draft development, not a finished implementation of every specified feature. The specification is 1.0.0-draft.2; the parser implementation is independently 0.1.0. Read DECISIONS.md and the roadmaps for the latest scope. Diagram source recognition is implemented; diagram engines, OCR, full layout composition and complete multilingual support remain roadmap work. Handwriting works without text conversion.

Module tests cover package round trips and validation. Browser attachment insertion and restoration were verified previously, but the final browser file-import/download round trip remains unverified because browser automation stalled. ZIP integrity checks do not replace that browser check.

Original dependency license notices are included. No additional project-wide license is asserted by this bundle.
