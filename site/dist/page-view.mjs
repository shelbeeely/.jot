// Page view: the formatted pages laid out sheet by sheet with Paged.js (vendor/pagedjs), page numbers and margins included,
// before printing. It shows the same standalone page Download page saves (jot/export.mjs), in a frame (write/pages.html) that
// can make no requests. Nothing is kept: closing, a new layout or locking the journal empties the frame.
import { exportHTML } from './jot/export.mjs';

const FRAME = new URL('write/pages.html', import.meta.url).href;
const plural = (n) => n === 1 ? '1 page' : `${n} pages`;

/** prepare() brings the preview up to date and returns { paper, title, lang, pageCss }, or null when it cannot. */
export function setupPageView({ prepare, onStatus = () => {} } = {}) {
  const make = (tag, props = {}, ...children) => { const e = Object.assign(document.createElement(tag), props); e.append(...children); return e; };
  const heading = make('h2', { id: 'pageViewHeading', textContent: 'Page view' });
  const close = make('button', { id: 'pageViewClose', className: 'icon-button', type: 'button', textContent: '✕' }); close.setAttribute('aria-label', 'Close page view');
  const state = make('p', { id: 'pageViewStatus', className: 'page-view-status' }); state.setAttribute('role', 'status');
  const print = make('button', { id: 'pageViewPrint', className: 'button', type: 'button', textContent: 'Print these pages', disabled: true });
  const frame = make('iframe', { id: 'pageViewFrame', title: 'The printed pages', src: 'about:blank' });
  const dialog = make('dialog', { id: 'pageViewDialog', className: 'page-view' },
    make('div', { className: 'dialog-header' }, heading, close), make('div', { className: 'page-view-actions' }, state, print), frame);
  dialog.setAttribute('aria-labelledby', 'pageViewHeading');
  document.body.append(dialog);
  let run = 0;
  const say = (text) => { state.textContent = text; };
  const reset = () => { run++; print.disabled = true; frame.src = 'about:blank'; say(''); if (dialog.open) dialog.close(); };
  const loaded = () => new Promise((resolve, reject) => {
    const done = () => { frame.removeEventListener('load', onLoad); clearTimeout(timer); };
    const ready = () => { done(); resolve(frame.contentWindow); };
    const onLoad = () => { const win = frame.contentWindow; if (win?.jotPageReady) ready(); else win?.addEventListener('jot-page-ready', ready, { once: true }); };
    const timer = setTimeout(() => { done(); reject(new Error('the page layout did not load')); }, 30000);
    frame.addEventListener('load', onLoad); frame.src = FRAME;
  });

  async function open() {
    const mine = ++run; print.disabled = true;
    const page = await prepare(); if (!page || mine !== run) return;
    if (!dialog.open) dialog.showModal();
    say('Laying out the pages…');
    try {
      const html = await exportHTML(page.paper, { title: page.title, lang: page.lang, pageCss: page.pageCss });
      if (mine !== run) return;
      const win = await loaded(); if (mine !== run) return;
      const count = await win.jotPaginate({ html, lang: page.lang, title: page.title }); if (mine !== run) return;
      say(`${plural(count)}, as they will print. Print at 100% scale.`); print.disabled = false; onStatus(`Page view: ${plural(count)}.`);
    } catch (e) { if (mine === run) say('Could not lay out the pages: ' + e.message); }
  }
  print.onclick = () => frame.contentWindow?.print();
  close.onclick = () => reset();
  dialog.addEventListener('close', () => { if (frame.src !== 'about:blank') { run++; frame.src = 'about:blank'; print.disabled = true; say(''); } });
  return { open, reset, dialog };
}
export default { setupPageView };
