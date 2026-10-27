// The webview side of the Jot preview: text arrives from the extension, is parsed and drawn by the same code as the site (jot/).
import { parse } from './jot/jot.mjs';
import { renderPreview, addChartStyles } from './jot/preview.mjs';
import { exportHTML } from './jot/export.mjs';
import { pageCSS } from './jot/styles.mjs';

const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
const page = document.getElementById('page'), status = document.getElementById('status');
addChartStyles(document);

let current = { style: 'plain' };
function show(text, hand = null, style = 'plain') {
  const ast = parse(text); current = { style };
  // images and links to attachments only exist in a packaged .jotz; a plain .jot preview names them instead of loading anything
  renderPreview(ast, page, { empty: 'Nothing written yet.', hand, style: hand ? null : style });
  const charts = ast.nodes.filter((n) => n.type === 'record' && n.recordType === 'chart').length, d = ast.diagnostics.length;
  const links = (ast.links || []).length, broken = ast.diagnostics.filter((x) => x.code === 'unresolved-reference').length; // links within the journal and to other files
  status.textContent = `${ast.entries.length} dated ${ast.entries.length === 1 ? 'entry' : 'entries'}${charts ? ` · ${charts} ${charts === 1 ? 'chart' : 'charts'}` : ''}${links ? ` · ${links} ${links === 1 ? 'link' : 'links'}${broken ? ` (${broken} unresolved)` : ''}` : ''} · ${d ? `${d} ${d === 1 ? 'problem' : 'problems'}` : 'valid Jot'}`;
  if (vscode) vscode.setState({ text, hand, style });
}
window.addEventListener('message', async (e) => {
  const m = e.data;
  if (m && m.type === 'update' && typeof m.text === 'string') show(m.text, m.hand && typeof m.hand === 'object' ? m.hand : null, typeof m.style === 'string' ? m.style : 'plain');
  if (m && m.type === 'export' && vscode) {
    try { vscode.postMessage({ type: 'exported', html: await exportHTML(page, { title: String(m.title || 'Journal'), pageCss: pageCSS(current.style, [210, 297]) }) }); } catch (err) { vscode.postMessage({ type: 'exported', html: '', error: String(err && err.message || err) }); }
  }
});
const saved = vscode && vscode.getState();
if (saved && typeof saved.text === 'string') show(saved.text, saved.hand || null, saved.style || 'plain');
if (vscode) vscode.postMessage({ type: 'ready' });
