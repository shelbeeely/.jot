// Page view: the formatted pages laid out sheet by sheet with Paged.js (vendor/pagedjs), page numbers and margins included,
// before printing. It shows the same standalone page Download page saves (jot/export.mjs), in a frame (write/pages.html) that
// can make no requests. Nothing is kept: closing, a new layout or locking the journal empties the frame. Download EPUB saves the same
// sheets as a fixed-layout EPUB 3 book (jot/epub.mjs, epub-book.mjs); pages with 3D models carry Jot's own viewer, never journal code.
import { exportHTML } from './jot/export.mjs';
import { fixedLayoutEPUB } from './jot/epub.mjs';
import { bookParts } from './epub-book.mjs';

const FRAME = new URL('write/pages.html', import.meta.url).href;
const plural = (n) => n === 1 ? '1 page' : `${n} pages`;

/** Writer's own paper rules (studio.css: type, spacing, task lists, print breaks), so typed sheets match Print / PDF: rules for
 *  `.paper-preview` outside any media query and inside `@media print`, in order. The page carries the paper's classes too. */
export function writerPaperCSS(doc = document, selector = '.paper-preview') {
  const out = [], take = (rule) => { if (rule.selectorText?.includes(selector)) out.push(rule.cssText); };
  for (const sheet of doc.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      if (rule.selectorText) take(rule);
      else if (rule.media && [...rule.media].every((m) => m.trim() === 'print')) for (const inner of rule.cssRules) take(inner);
    }
  }
  return out.join('\n');
}

/** prepare() brings the preview up to date and returns { paper, title, lang, pageCss, paperCss?, fileName?, assetBytes?(path),
 *  protected? }, or null when it cannot. paperCss defaults to writerPaperCSS(). download(bytes, name, type) saves a file. */
export function setupPageView({ prepare, onStatus = () => {}, download = () => {} } = {}) {
  const make = (tag, props = {}, ...children) => { const e = Object.assign(document.createElement(tag), props); e.append(...children); return e; };
  const heading = make('h2', { id: 'pageViewHeading', textContent: 'Page view' });
  const close = make('button', { id: 'pageViewClose', className: 'icon-button', type: 'button', textContent: '✕' }); close.setAttribute('aria-label', 'Close page view');
  const state = make('p', { id: 'pageViewStatus', className: 'page-view-status' }); state.setAttribute('role', 'status');
  const print = make('button', { id: 'pageViewPrint', className: 'button', type: 'button', textContent: 'Print these pages', disabled: true });
  const epub = make('button', { id: 'pageViewEpub', className: 'button', type: 'button', textContent: 'Download EPUB ↓', disabled: true, title: 'These pages as a fixed-layout EPUB 3 book, for Apple Books and other EPUB readers' });
  const frame = make('iframe', { id: 'pageViewFrame', title: 'The printed pages', src: 'about:blank' });
  const dialog = make('dialog', { id: 'pageViewDialog', className: 'page-view' },
    make('div', { className: 'dialog-header' }, heading, close), make('div', { className: 'page-view-actions' }, state, print, epub), frame);
  dialog.setAttribute('aria-labelledby', 'pageViewHeading');
  document.body.append(dialog);
  let run = 0, current = null;
  const say = (text) => { state.textContent = text; };
  const reset = () => { run++; current = null; print.disabled = epub.disabled = true; frame.src = 'about:blank'; say(''); if (dialog.open) dialog.close(); };
  const loaded = () => new Promise((resolve, reject) => {
    const done = () => { frame.removeEventListener('load', onLoad); clearTimeout(timer); };
    const ready = () => { done(); resolve(frame.contentWindow); };
    const onLoad = () => { const win = frame.contentWindow; if (win?.jotPageReady) ready(); else win?.addEventListener('jot-page-ready', ready, { once: true }); };
    const timer = setTimeout(() => { done(); reject(new Error('the page layout did not load')); }, 30000);
    frame.addEventListener('load', onLoad); frame.src = FRAME;
  });

  async function open() {
    const mine = ++run; print.disabled = epub.disabled = true; current = null;
    const page = await prepare(); if (!page || mine !== run) return;
    if (!dialog.open) dialog.showModal();
    say('Laying out the pages…');
    try {
      const html = await exportHTML(page.paper, { title: page.title, lang: page.lang, pageCss: page.pageCss });
      if (mine !== run) return;
      const win = await loaded(); if (mine !== run) return;
      const count = await win.jotPaginate({ html, paperCss: page.paperCss ?? writerPaperCSS(), paperClasses: [...page.paper.classList], lang: page.lang, title: page.title }); if (mine !== run) return;
      say(`${plural(count)}, as they will print. Print at 100% scale.`); print.disabled = epub.disabled = false; current = page; onStatus(`Page view: ${plural(count)}.`);
      return true;
    } catch (e) { if (mine === run) say('Could not lay out the pages: ' + e.message); }
  }
  // The laid-out sheets as a fixed-layout book. Only Jot's own viewer runs in it, and only on pages with a 3D model.
  async function saveEPUB() {
    const page = current, mine = run; if (!page) return;
    epub.disabled = true; say('Making the EPUB…');
    try {
      const sheets = frame.contentWindow.jotBook(), needs = sheets.pages.some((p) => p.models.length);
      const text = async (path) => { const r = await fetch(new URL(path, import.meta.url)); if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.text(); };
      const [three, viewer] = needs ? await Promise.all([text('jot/vendor/three.mjs'), text('jot/model3d-view.mjs')]) : [];
      const parts = await bookParts(sheets, { modelBytes: (p) => page.assetBytes?.(p) || null, three, viewer });
      const bytes = await fixedLayoutEPUB({ title: page.title, lang: page.lang, width: sheets.width, height: sheets.height, ...parts });
      if (mine !== run) return;
      const name = (page.fileName || 'journal') + '.epub';
      download(bytes, name, 'application/epub+zip');
      const models = parts.models ? ` ${parts.models === 1 ? 'Its 3D model turns' : `Its ${parts.models} 3D models turn`} in readers that run scripts, such as Apple Books; elsewhere ${parts.models === 1 ? 'it shows its' : 'they show their'} still.` : '';
      const missing = parts.missing.length ? ` ${parts.missing.length} model file${parts.missing.length === 1 ? ' is' : 's are'} not attached, so ${parts.missing.length === 1 ? 'it stays' : 'they stay'} still.` : '';
      say(`Saved ${name}: ${plural(sheets.pages.length)} with their layout fixed.${models}${missing}${page.protected ? ' The book is not locked: anyone with the file can read it.' : ''}`);
    } catch (e) { if (mine === run) say('Could not make the EPUB: ' + e.message); }
    finally { if (mine === run) epub.disabled = false; }
  }
  print.onclick = () => frame.contentWindow?.print();
  epub.onclick = () => saveEPUB();
  close.onclick = () => reset();
  dialog.addEventListener('close', () => { if (frame.src !== 'about:blank') { run++; current = null; frame.src = 'about:blank'; print.disabled = epub.disabled = true; say(''); } });
  /** Opens Page view if needed, then saves the EPUB (the Commands entry). */
  const downloadEPUB = async () => { if (current && dialog.open) return saveEPUB(); if (await open()) return saveEPUB(); };
  return { open, reset, dialog, downloadEPUB };
}
export default { setupPageView, writerPaperCSS };
