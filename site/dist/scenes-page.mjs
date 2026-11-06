// October in scenes (examples/scenes.html): the demo journal's saved scenes in Writer's own Scenes view, read-only. It opens the
// site's demo-month.jotz, keeps its attachments in page memory (blob URLs), and never makes, sends or keeps anything.
import { readDocument } from './jot/container.mjs';
import { parse } from './jot/jot.mjs';
import { renderPreview, addHandwritingStyles } from './jot/preview.mjs';
import { setupWriterScene } from './writer-scene.mjs';

const main = document.getElementById('scenes'), status = document.getElementById('scenesStatus');
try {
  const response = await fetch('demo-month.jotz');
  if (!response.ok) throw new Error(`the journal did not load (HTTP ${response.status})`);
  const journal = await readDocument(new Uint8Array(await response.arrayBuffer()));
  const urls = new Map(journal.assets.map((a) => [a.path, URL.createObjectURL(new Blob([a.data], { type: a.mediaType }))]));
  const asset = (path) => { const a = journal.assets.find((x) => x.path === path); return a ? { url: urls.get(path), mediaType: a.mediaType } : null; };
  const placeText = (path) => { const a = journal.assets.find((x) => x.path === path); return a && a.data.length <= 1024 * 1024 ? new TextDecoder().decode(a.data) : null; };
  addHandwritingStyles(document);
  // The writing, held where the Scenes view reads it; never shown as an editor.
  const editor = document.createElement('textarea'); editor.hidden = true; editor.value = journal.source; editor.setAttribute('aria-hidden', 'true'); main.append(editor);
  const title = /^Title:\s*(.+)$/m.exec(journal.source)?.[1]?.trim() || 'A journal';
  let seed = 0;
  const scenes = setupWriterScene({ editor, mount: main, readOnly: true, heading: title, eyebrow: 'A fictional journal', placeText, asset,
    // The whole entry, written by hand on a dot grid, as Writer's handwritten pages show it.
    renderEntry: (source, into) => renderPreview(parse(source), into, { asset, hand: { hand: 'script07', ink: 'blue', pitchMm: 5, seed: ++seed } }) });
  await scenes.show();
  status.textContent = '';
} catch (error) {
  status.textContent = `The scenes could not open: ${error.message}. The journal is still plain text: demo-month.jot.`;
}
