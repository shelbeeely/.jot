# Paged.js

Vendored, unmodified `dist/paged.esm.js` from the npm package `pagedjs@0.4.3` (git 703297df075c6f3ba717e04c1de5315d31c3bd60), renamed `paged.mjs`. MIT; see LICENSE.md. Upstream project: https://github.com/pagedjs/pagedjs . Downloaded November 5, 2026.

SHA-256:
- paged.mjs: 6d7ae76b6f3ae8ccd06cdb2f8ca65acb6be25702e57bf65af89ef5067ad5e9e3

Writer's Page view (`site/dist/page-view.mjs`, `write/pages.html`, `page-view-frame.mjs`) loads it only when the person opens Page view, inside a same-origin frame whose Content-Security-Policy allows no network requests. Stylesheets are passed in as text, so Paged.js never fetches. Recheck the licence, API and the page-view browser suite (`node site/test-page-view-ui.cjs`) together before upgrading.
