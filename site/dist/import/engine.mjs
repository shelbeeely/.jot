// The importer behind the page: adding exports, forgetting them, making the journal. Run by worker.mjs on the website; run on the
// page itself in the Jot desktop app, where the app reads the archives (window.jotDesktop) and a worker could not reach it.
// handle({ add: { zips: [File], folder: { name, files: [{ path, file }] }, sources: [source] } } | { clear: true } | { make: options })
// resolves to { ok, found } or { ok, files, warnings, summary } or { ok: false, error }.
import '../jot/vendor/jszip.mjs';
import { detect, readArchives, makeJournal, fromZip, SERVICES } from '../jot/archive.mjs';
import { pack } from '../jot/container.mjs';
import { parse } from '../jot/jot.mjs';

const folderSource = ({ name, files }) => {
  const byPath = new Map(files.map((f) => [f.path, f.file]));
  return { name, list: () => [...byPath.keys()], read: async (p) => new Uint8Array(await byPath.get(p).arrayBuffer()) };
};

export function makeEngine() {
  let sources = [];
  const found = () => { const f = detect(sources); return sources.map((s) => ({ name: s.name, services: f.filter((x) => x.source === s.name).map((x) => x.name), warnings: s.warnings || [] })); };
  return async function handle(data) {
    try {
      if (data.clear) { for (const s of sources) if (s.close) s.close(); sources = []; return { ok: true, found: [] }; }
      if (data.add) {
        for (const z of data.add.zips || []) {
          try { sources.push(await fromZip(globalThis.JSZip, z.name, z)); }
          catch { throw new Error(`${z.name} is not a ZIP this can read. Unzip it and add the folder instead.`); }
        }
        if (data.add.folder) sources.push(folderSource(data.add.folder));
        sources.push(...(data.add.sources || []));
        return { ok: true, found: found() };
      }
      if (data.make) {
        const r = await readArchives(sources, data.make);
        if (!r.items.length) throw new Error('No posts or notes found with these choices.');
        const made = await makeJournal(r.items, data.make, { pack });
        const files = made.files.map((f) => ({ name: f.name, text: f.text, data: f.data, bytes: f.data ? f.data.length : f.bytes, entries: f.entries, items: f.items, from: f.from, to: f.to, photos: f.photos || 0,
          problems: parse(f.text).diagnostics.filter((d) => d.severity === 'error').length }));
        const left = Object.entries(r.left).filter(([, n]) => n).map(([k, n]) => `${n} ${{ reposts: 'reposts (tick Reposts to include them)', outside: 'outside the dates', empty: 'with nothing written' }[k]}`);
        return { ok: true, files, warnings: [...r.warnings, ...made.warnings], summary: { found: r.found.map((f) => `${SERVICES[f.service]} (${f.count})`), items: r.items.length, left, timeZone: made.stats.timeZone } };
      }
      return { ok: false, error: 'unknown request' };
    } catch (e) { return { ok: false, error: e.message }; }
  };
}
