// Reads the .jot documents a book prints (Jot v1: plain UTF-8 or ZIP-packaged, see ../parser/). Node only; jotpage.mjs does the pages.
//   KW_JOTS=dir[,dir|file...]   where to look (default: private/jots/, which git ignores: your writing never gets committed)
// Folders are read recursively, so an InkDeck SD card (or a copy of its files) can be pointed at directly. Only *.jot files are read.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../parser/jot.mjs';
import { readDocument } from '../parser/container.mjs';
import { jotEntries } from './jotpage.mjs';

const here = (p) => new URL(p, import.meta.url).pathname;
export const jotSources = () => (process.env.KW_JOTS ? process.env.KW_JOTS.split(',').map((s) => s.trim()).filter(Boolean) : [here('./private/jots')]);

function filesUnder(p, out = []) {
  if (!fs.existsSync(p)) return out;
  const st = fs.statSync(p);
  if (st.isFile()) { if (/\.jot$/i.test(p)) out.push(p); return out; }
  for (const f of fs.readdirSync(p).sort()) if (!f.startsWith('.')) filesUnder(path.join(p, f), out);
  return out;
}

// Every entry of every document: { date|null, title, tags, nodes, file }, oldest first (undated last, in file order).
// A document that cannot be read is reported (warnings) and left out; it never stops the build.
export async function loadJots(sources = jotSources()) {
  const entries = [], warnings = [];
  for (const file of [...new Set(sources.flatMap((s) => filesUnder(s)))]) {
    try {
      const doc = await readDocument(new Uint8Array(fs.readFileSync(file)));
      const ast = parse(doc.source);
      for (const d of ast.diagnostics) if (d.severity === 'error') warnings.push(`${path.basename(file)}: ${d.message}`);
      entries.push(...jotEntries(ast, file));
    } catch (e) { warnings.push(`${path.basename(file)}: ${e.message}`); }
  }
  entries.forEach((e, i) => (e.seq = i));
  entries.sort((a, b) => (a.date === b.date ? a.seq - b.seq : !a.date ? 1 : !b.date ? -1 : a.date < b.date ? -1 : 1));
  return { entries, warnings };
}
