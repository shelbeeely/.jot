// Rebuilds specification/Jot-Complete-Specification.pdf (and its copy in site/dist/docs/) from the Markdown source, so the PDF never
// says something the source does not.  Needs pandoc and Chromium (Playwright).   node tools/build-spec-pdf.cjs
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'specification/Jot-Complete-Specification.md');
const OUT = [path.join(ROOT, 'specification/Jot-Complete-Specification.pdf'), path.join(ROOT, 'site/dist/docs/Jot-Complete-Specification.pdf')];
const CSS = `
@page { size: Letter; }
body { font: 10.5pt/1.5 Georgia, 'DejaVu Serif', serif; color: #1d211f; max-width: none; margin: 0; padding: 0; hyphens: auto; }
h1 { font-size: 24pt; font-weight: 400; margin: 0 0 4mm; } h2 { font-size: 15pt; margin: 9mm 0 3mm; break-after: avoid; }
h3 { font-size: 12pt; margin: 6mm 0 2mm; break-after: avoid; } h4 { font-size: 10.5pt; margin: 4mm 0 1mm; break-after: avoid; }
p, li { orphans: 3; widows: 3; } a { color: #4b3a7a; text-decoration: none; }
code { font: 8.8pt/1.4 'DejaVu Sans Mono', monospace; background: #f1f1ec; padding: 0 2px; }
pre { font: 8.4pt/1.45 'DejaVu Sans Mono', monospace; background: #f4f4ef; border: 1px solid #ddd; padding: 3mm; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 3mm 0; break-inside: auto; } td, th { border: 1px solid #ccc; padding: 1.5mm 2mm; text-align: left; vertical-align: top; }
th { background: #f1f1ec; } tr { break-inside: avoid; }`;
(async () => {
  const html = execFileSync('pandoc', ['-f', 'gfm', '-t', 'html5', '--standalone', '--metadata', 'title=Jot Complete Specification', '--metadata', 'pagetitle=Jot Complete Specification', SRC]).toString()
    .replace(/<header id="title-block-header">[\s\S]*?<\/header>/, '').replace('</head>', `<style>${CSS}</style></head>`);
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'spec-')), 'spec.html'); fs.writeFileSync(tmp, html);
  const b = await chromium.launch(), p = await b.newPage();
  await p.goto('file://' + tmp);
  const pdf = await p.pdf({ format: 'Letter', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font:8px Georgia,serif;color:#777;width:100%;text-align:center">Jot Complete Specification · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '22mm', bottom: '22mm', left: '20mm', right: '20mm' } });
  await b.close();
  for (const o of OUT) fs.writeFileSync(o, pdf);
  console.log(`${OUT.map((o) => path.relative(ROOT, o)).join(', ')}: ${(pdf.length / 1024).toFixed(0)} KB`);
})();
