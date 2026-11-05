/** Jot export, draft 0.1: a rendered page (preview.mjs) as one standalone HTML file, to keep, send or print anywhere. DOM only.
 *
 *   exportHTML(page, { title, lang: 'en', pageCss: '@page {…}' }) -> Promise<string>
 *
 * The file needs nothing else: the styles that drew the page are copied in, charts become pictures (PNG, with their text summary as
 * the alternative), a 3D model turned in 3D becomes a picture of its view (its still otherwise), attached images and the handwriting
 * fonts are embedded as data: URLs, and so are attached sound and video recordings (the browser's own players, which play only
 * when asked), and nothing in it runs or fetches. Links in
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
  // a ticked task box is a property, which the saved markup would drop
  const boxes = [...clone.querySelectorAll('input')];
  [...page.querySelectorAll('input')].forEach((input, i) => { if (input.checked) boxes[i]?.setAttribute('checked', ''); });
  for (const e of clone.querySelectorAll('.hw-page-edge, script, style, [data-jot-live]')) e.remove(); // and live controls, such as a 3D model's buttons
  for (const d of clone.querySelectorAll('details')) d.open = false;
  // attached images and file links: into the file itself
  for (const img of clone.querySelectorAll('img[src^="blob:"]')) { try { img.src = await dataURL(img.src, fetchImpl); } catch { img.replaceWith(doc.createTextNode(`[Image: ${img.alt}]`)); } }
  for (const m of clone.querySelectorAll('audio[src^="blob:"], video[src^="blob:"]')) { try { m.src = await dataURL(m.src, fetchImpl); } catch { m.replaceWith(doc.createTextNode(`[${m.getAttribute('aria-label') || 'Recording'}]`)); } } // recordings travel inside too
  for (const a of clone.querySelectorAll('a[href^="blob:"]')) { try { a.href = await dataURL(a.href, fetchImpl); } catch { a.removeAttribute('href'); } }
  // the styles that drew it, the fonts inside them embedded
  const sheets = await Promise.all(STYLE_IDS.map((id) => doc.getElementById(id)).filter(Boolean).map(async (sheet) => {
    if (sheet.tagName !== 'LINK') return sheet.textContent;
    const response = await fetchImpl(sheet.href);
    if (!response.ok) throw new Error(`Could not read shared page stylesheet: ${response.status}`);
    return (await response.text()).replace(/url\((['"])(.*?)\1\)/g, (match, quote, url) => /^(data:|blob:|#)/.test(url) ? match : `url('${new URL(url, sheet.href).href}')`);
  }));
  let css = sheets.join('\n');
  const faces = [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map(([rule]) => ({
    rule, family: /font-family:\s*['"]([^'"]+)['"]/.exec(rule)?.[1], url: /url\(['"]([^'"]+\.woff2)['"]\)/.exec(rule)?.[1],
  }));
  const registered = new Set(faces.map((face) => face.family)), used = new Set();
  // Inspect the actual paper, including typed pages and mixed-font blocks. Interface fonts outside it are not exported.
  for (const element of [page, ...page.querySelectorAll('*')]) {
    const families = doc.defaultView.getComputedStyle(element).fontFamily.match(/"[^"]*"|'[^']*'|[^,]+/g) || [];
    const family = families.map((name) => name.trim().replace(/^['"]|['"]$/g, '')).find((name) => registered.has(name));
    if (family) used.add(family);
  }
  const embedded = new Map();
  for (const face of faces) {
    if (!used.has(face.family) || !face.url) { css = css.replace(face.rule, ''); continue; }
    if (!embedded.has(face.url)) embedded.set(face.url, await dataURL(face.url, fetchImpl));
    css = css.replace(face.rule, face.rule.replace(face.url, embedded.get(face.url)));
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
