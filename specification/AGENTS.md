# Working on the Jot format

Root `AGENTS.md` applies. The current project is a 0.1.0 prototype targeting Jot/Jotz v1; a schema identifier does not certify a stable release.

- `ROADMAP.md` owns syntax, semantics, archive/media/protection/search contracts, conformance and reference implementation. `../WRITER-ROADMAP.md` separately owns Writer web, desktop/mobile and editor/integration delivery. Cross-link dependencies; do not mix the two back into a single roadmap.
- Every implemented format change must include corresponding Writer support in the same change. Update canonical parser/container/renderer modules, source/visual editing, preview, persistence, media, locking/search and affected file/sharing paths. Regenerate shared copies, specifications, fixtures and deliverables; run relevant format and Writer checks. Assess desktop/mobile consumers and report unavailable native validation explicitly.
- Specification-only research/proposals must remain marked planned; do not claim implementation or stable conformance without evidence. Preserve original source, assets and privacy in edits and exports.
- Run `node tools/sync-roadmap.mjs` after roadmap changes. Never hand-edit generated parser/site roadmaps. Update complete-spec PDF copies through `node tools/build-spec-pdf.cjs` when their source changes. Run `node tools/manifest.cjs` last and `node tools/check-generated.mjs` before committing.
