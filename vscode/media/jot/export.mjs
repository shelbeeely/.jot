/** Jot export, draft 0.1: a rendered page (preview.mjs) as one standalone HTML file, to keep, send or print anywhere. DOM only.
 *
 *   exportHTML(page, { title, lang: 'en', pageCss: '@page {…}' }) -> Promise<string>
 *
 * The file needs nothing else: the styles that drew the page are copied in, charts become pictures (PNG, with their text summary as
 * the alternative), attached images and the handwriting fonts are embedded as data: URLs, and nothing in it runs or fetches. Links in
 * the writing stay links. Print it from any browser for a PDF.
 */
const STYLE_IDS = ['jot-chart-css', 'jot-style-css', 'jot-hand-css'];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function dataURL(url, fetchImpl) {
  const res = await fetchImpl(url); if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const type = /\.woff2(?:$|[?#])/.test(url) ? 'font/woff2' : res.headers.get('content-type') || 'application/octet-stream', bytes = new Uint8Array(await res.arrayBuffer()); // a font by its name: not every server knows .woff2
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return `data:${type.split(';')[0]};base64,${btoa(bin)}`;
}

export async function exportHTML(page, { title = 'Journal', lang = 'en', pageCss = '', fetchImpl = (u) => fetch(u) } = {}) {
  const doc = page.ownerDocument;
  if (page.jotReady) await page.jotReady;
  const clone = page.cloneNode(true);
  // charts: the drawing as a picture, named by its summary
  const live = [...page.querySelectorAll('canvas')], copies = [...clone.querySelectorAll('canvas')];
  live.forEach((c, i) => {
    const img = doc.createElement('img'); img.alt = c.getAttribute('aria-label') || 'Chart';
    try { img.src = c.toDataURL('image/png'); } catch { img.alt += ' (could not be copied)'; }
    img.style.cssText = `width:100%;height:${c.getBoundingClientRect().height || 140}px;object-fit:contain;display:block`;
    copies[i].replaceWith(img);
  });
  for (const e of clone.querySelectorAll('.hw-page-edge, script, style')) e.remove();
  for (const d of clone.querySelectorAll('details')) d.open = false;
  // attached images and file links: into the file itself
  for (const img of clone.querySelectorAll('img[src^="blob:"]')) { try { img.src = await dataURL(img.src, fetchImpl); } catch { img.replaceWith(doc.createTextNode(`[Image: ${img.alt}]`)); } }
  for (const a of clone.querySelectorAll('a[href^="blob:"]')) { try { a.href = await dataURL(a.href, fetchImpl); } catch { a.removeAttribute('href'); } }
  // the styles that drew it, the fonts inside them embedded
  let css = STYLE_IDS.map((id) => doc.getElementById(id)).filter(Boolean).map((s) => s.textContent).join('\n');
  const fonts = [...new Set([...css.matchAll(/url\('([^']+\.woff2)'\)/g)].map((m) => m[1]))];
  const used = page.classList.contains('jot-hand') ? (doc.defaultView.getComputedStyle(page).getPropertyValue('--hw-family') || '').replace(/['"\s]/g, '') : '';
  for (const f of fonts) {
    const family = (new RegExp(`font-family:'([^']+)'[^}]*${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).exec(css) || [])[1] || '';
    if (!used || family.replace(/\s/g, '') !== used) { css = css.replace(new RegExp(`@font-face\\{[^}]*${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^}]*\\}`, 'g'), ''); continue; } // only the hand in use
    try { css = css.split(`url('${f}')`).join(`url('${await dataURL(f, fetchImpl)}')`); } catch { /* the hand falls back to cursive */ }
  }
  const cls = [...page.classList].filter((c) => c.startsWith('jot-')).join(' '), vars = page.style.cssText;
  const body = `<main class="jot-export ${esc(cls)}"${vars ? ` style="${esc(vars)}"` : ''}>${clone.innerHTML}</main>`;
  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="Jot">
<title>${esc(title)}</title>
<style>
html{background:#eeece6}body{margin:0;padding:24px 12px}
.jot-export{box-sizing:border-box;max-width:46rem;margin:0 auto;box-shadow:0 2px 18px rgb(0 0 0 / .12)}
.jot-export.jot-hand{max-width:none;width:fit-content}
@media (max-width:600px){body{padding:0}.jot-export{box-shadow:none}}
@media print{html,body{background:none;padding:0;margin:0}.jot-export{box-shadow:none;max-width:none;margin:0}.jot-export.jot-hand{padding:0!important}}
${pageCss}
${css}
</style>
</head>
<body>
${body}
</body>
</html>
`;
}
export default { exportHTML };
