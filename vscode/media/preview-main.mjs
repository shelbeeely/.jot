// The webview side of the Jot preview: text arrives from the extension, is parsed and drawn by the same code as the site (jot/).
import { parse } from './jot/jot.mjs';
import { renderPreview, addChartStyles } from './jot/preview.mjs';

const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
const page = document.getElementById('page'), status = document.getElementById('status');
addChartStyles(document);

function show(text) {
  const ast = parse(text);
  // images and links to attachments only exist in a packaged .jotz; a plain .jot preview names them instead of loading anything
  renderPreview(ast, page, { empty: 'Nothing written yet.' });
  const charts = ast.nodes.filter((n) => n.type === 'record' && n.recordType === 'chart').length, d = ast.diagnostics.length;
  status.textContent = `${ast.entries.length} dated ${ast.entries.length === 1 ? 'entry' : 'entries'}${charts ? ` · ${charts} ${charts === 1 ? 'chart' : 'charts'}` : ''} · ${d ? `${d} ${d === 1 ? 'problem' : 'problems'}` : 'valid Jot'}`;
  if (vscode) vscode.setState({ text });
}
window.addEventListener('message', (e) => { const m = e.data; if (m && m.type === 'update' && typeof m.text === 'string') show(m.text); });
const saved = vscode && vscode.getState();
if (saved && typeof saved.text === 'string') show(saved.text);
if (vscode) vscode.postMessage({ type: 'ready' });
