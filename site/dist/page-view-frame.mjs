// The inside of Writer's Page view (write/pages.html): Paged.js lays the formatted pages out one sheet at a time, from the same
// standalone page Download page saves. The frame's CSP allows no requests, and the styles arrive as text, so nothing is fetched.
import { Previewer } from './vendor/pagedjs/paged.mjs';
import { pagedSafeCSS } from './page-view-css.mjs';

// Writer's paper rules (paperCss) come first, as in Writer, where the shared page styles load after them.
// The page's own frame (Download page's wrapper) is dropped; each sheet is the paper. How sheets sit on screen is in
// write/pages.html, because Paged.js leaves out screen-only rules from the styles it reads.
const SHEET = `.jot-export{max-width:none!important;width:auto!important;margin:0!important;padding:0!important;box-shadow:none!important}`;

let busy = null;
/** Lays the page out. Returns the number of sheets. Called once per frame load by ../page-view.mjs. */
window.jotPaginate = async ({ html, paperCss = '', paperClasses = [], lang = 'en', title = 'Journal' }) => {
  if (busy) throw new Error('Already laying out pages.');
  busy = (async () => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const css = pagedSafeCSS(paperCss + '\n' + [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n') + '\n' + SHEET);
    const main = doc.querySelector('main.jot-export');
    if (!main) throw new Error('There is no page to lay out.');
    for (const e of main.querySelectorAll('script, iframe, object, embed')) e.remove();
    main.classList.add(...paperClasses.filter((c) => /^[\w-]+$/.test(c))); // Writer's paper classes, for paperCss
    document.documentElement.lang = lang; document.title = title + ' · Page view';
    const template = document.createElement('template'); template.content.append(document.importNode(main, true));
    const flow = await new Previewer().preview(template.content, [{ [location.href]: css }], document.body);
    fit(); addEventListener('resize', fit);
    return flow.total ?? document.querySelectorAll('.pagedjs_page').length;
  })();
  return busy;
};
/** The laid-out sheets for a fixed-layout EPUB (../page-view.mjs, jot/epub.mjs): each sheet as an XHTML fragment that numbers itself
 *  (Paged.js counts pages across the whole run, so each carries where its count starts), the styles that drew them (not this
 *  frame's screen layout), the dated entries each sheet starts, and the 3D model files it shows. A model gets a hidden Turn in 3D
 *  button, which the book's viewer shows where scripts run. */
window.jotBook = () => {
  const sheets = [...document.querySelectorAll('.pagedjs_page')]; if (!sheets.length) throw new Error('There are no pages yet.');
  const size = getComputedStyle(sheets[0]), css = [...document.styleSheets].filter((s) => s.ownerNode?.id !== 'jot-frame-screen').map((s) => [...s.cssRules].map((r) => r.cssText).join('\n')).join('\n');
  const xml = new XMLSerializer(), total = sheets.length;
  const pages = sheets.map((sheet, i) => {
    const wrap = document.createElement('div'); wrap.className = 'pagedjs_pages';
    wrap.setAttribute('style', `--pagedjs-page-count: ${total}; counter-reset: page ${i} pages ${total}`);
    const copy = sheet.cloneNode(true), models = [];
    for (const fig of copy.querySelectorAll('figure.jot-3d[data-jot3d]')) {
      let file = ''; try { file = JSON.parse(fig.dataset.jot3d).file || ''; } catch { /* kept as a still */ }
      if (!file) continue; models.push(file);
      const turn = document.createElement('button'); turn.type = 'button'; turn.className = 'jot-3d-turn'; turn.hidden = true; turn.textContent = 'Turn in 3D';
      (fig.querySelector('.jot-3d-tools') || fig).prepend(turn);
    }
    wrap.append(copy);
    return { body: xml.serializeToString(wrap), headings: [...sheet.querySelectorAll('.jot-date')].filter((h) => !h.closest('[data-split-from]')).map((h) => h.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean), models };
  });
  return { width: parseFloat(size.width), height: parseFloat(size.height), css, pages };
};
// Phones see the whole sheet, scaled down; printing is always full size.
function fit() {
  const page = document.querySelector('.pagedjs_page'); if (!page) return;
  const width = page.offsetWidth, room = document.documentElement.clientWidth - 24;
  document.documentElement.style.setProperty('--jot-sheet-fit', String(width > room ? Math.max(0.2, room / width) : 1));
}
window.jotPageReady = true;
dispatchEvent(new Event('jot-page-ready'));
