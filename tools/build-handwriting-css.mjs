// The site and previews load one sheet; standalone consumers use the identical CSS generator.
import fs from 'node:fs';
import { handwritingCSS } from '../parser/handwriting.mjs';
const css = handwritingCSS('./fonts/') + '\n';
for (const name of ['parser/handwriting.css', 'site/dist/jot/handwriting.css']) {
  const url = new URL('../' + name, import.meta.url);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(url) || fs.readFileSync(url, 'utf8') !== css) throw new Error(`${name} is stale: run node tools/build-handwriting-css.mjs`);
  } else fs.writeFileSync(url, css);
}
console.log('Shared handwriting stylesheet: current');
