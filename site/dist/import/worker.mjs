// Reading data exports off the page's thread (a Twitter archive can hold tens of thousands of posts). Uses the same importer as the
// command line (../jot/archive.mjs, from converter/archive.mjs). Files stay in this browser; nothing is sent anywhere.
// In: { id, add: { zips: [File], folder: { name, files: [{ path, file }] } } } adds exports; { id, clear: true } forgets them;
//     { id, make: options } makes the journal.
// Out: { id, ok, found } or { id, ok, files, warnings, summary }, or { id, ok: false, error }.
import '../jot/vendor/jszip.mjs';
import { detect, readArchives, makeJournal, fromZip, SERVICES } from '../jot/archive.mjs';
import { pack } from '../jot/container.mjs';
import { parse } from '../jot/jot.mjs';

let sources = [];
const folderSource = ({ name, files }) => {
  const byPath = new Map(files.map((f) => [f.path, f.file]));
  return { name, list: () => [...byPath.keys()], read: async (p) => new Uint8Array(await byPath.get(p).arrayBuffer()) };
};
const found = () => { const f = detect(sources); return sources.map((s) => ({ name: s.name, services: f.filter((x) => x.source === s.name).map((x) => x.name) })); };

self.onmessage = async ({ data }) => {
  const { id } = data;
  try {
    if (data.clear) { sources = []; self.postMessage({ id, ok: true, found: [] }); return; }
    if (data.add) {
      for (const z of data.add.zips || []) {
        try { sources.push(await fromZip(globalThis.JSZip, z.name, z)); }
        catch { throw new Error(`${z.name} is not a ZIP this can read. Unzip it and add the folder instead.`); }
      }
      if (data.add.folder) sources.push(folderSource(data.add.folder));
      self.postMessage({ id, ok: true, found: found() }); return;
    }
    if (data.make) {
      const r = await readArchives(sources, data.make);
      if (!r.items.length) throw new Error('No posts or notes found with these choices.');
      const made = await makeJournal(r.items, data.make, { pack });
      const files = made.files.map((f) => ({ name: f.name, text: f.text, data: f.data, bytes: f.data ? f.data.length : f.bytes, entries: f.entries, items: f.items, from: f.from, to: f.to, photos: f.photos || 0,
        problems: parse(f.text).diagnostics.filter((d) => d.severity === 'error').length }));
      const left = Object.entries(r.left).filter(([, n]) => n).map(([k, n]) => `${n} ${{ reposts: 'reposts (tick Reposts to include them)', outside: 'outside the dates', empty: 'with nothing written' }[k]}`);
      self.postMessage({ id, ok: true, files, warnings: [...r.warnings, ...made.warnings], summary: { found: r.found.map((f) => `${SERVICES[f.service]} (${f.count})`), items: r.items.length, left, timeZone: made.stats.timeZone } });
    }
  } catch (e) { self.postMessage({ id, ok: false, error: e.message }); }
};
