// The inside of Writer's Page view (write/pages.html): Paged.js lays the formatted pages out one sheet at a time, from the same
// standalone page Download page saves. The frame's CSP allows no requests, and the styles arrive as text, so nothing is fetched.
import { Previewer } from './vendor/pagedjs/paged.mjs';
import { pagedSafeCSS } from './page-view-css.mjs';

// The page's own frame (Download page's wrapper) is dropped; each sheet is the paper. How sheets sit on screen is in
// write/pages.html, because Paged.js leaves out screen-only rules from the styles it reads.
const SHEET = `.jot-export{max-width:none!important;width:auto!important;margin:0!important;box-shadow:none!important}.jot-export.jot-hand{padding:0!important}
.jot-export li>p:first-of-type{display:inline}.jot-export li>input[type=checkbox]{margin-right:5px}.jot-export li:has(>input[type=checkbox]){list-style:none;margin-left:-16px}`; // task lists, as Writer prints them (studio.css)

let busy = null;
/** Lays the page out. Returns the number of sheets. Called once per frame load by ../page-view.mjs. */
window.jotPaginate = async ({ html, lang = 'en', title = 'Journal' }) => {
  if (busy) throw new Error('Already laying out pages.');
  busy = (async () => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const css = pagedSafeCSS([...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n') + '\n' + SHEET);
    const main = doc.querySelector('main.jot-export');
    if (!main) throw new Error('There is no page to lay out.');
    for (const e of main.querySelectorAll('script, iframe, object, embed')) e.remove();
    document.documentElement.lang = lang; document.title = title + ' · Page view';
    const template = document.createElement('template'); template.content.append(document.importNode(main, true));
    const flow = await new Previewer().preview(template.content, [{ [location.href]: css }], document.body);
    fit(); addEventListener('resize', fit);
    return flow.total ?? document.querySelectorAll('.pagedjs_page').length;
  })();
  return busy;
};
// Phones see the whole sheet, scaled down; printing is always full size.
function fit() {
  const page = document.querySelector('.pagedjs_page'); if (!page) return;
  const width = page.offsetWidth, room = document.documentElement.clientWidth - 24;
  document.documentElement.style.setProperty('--jot-sheet-fit', String(width > room ? Math.max(0.2, room / width) : 1));
}
window.jotPageReady = true;
dispatchEvent(new Event('jot-page-ready'));
