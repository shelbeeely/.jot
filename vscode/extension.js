// Jot for VS Code: the .jot language (jot.tmLanguage.json) and a live page preview. The preview runs the Jot parser and the shared page
// renderer (media/jot/, copies of ../parser kept in step by sync.mjs) inside a webview, so a journal looks the same here as in the
// workspace and the template editor, charts included. Nothing leaves the machine: the webview loads only this extension's own files.
'use strict';
const path = require('path');

/** The webview page. Pure (no vscode), so the tests render it in Chromium. */
function webviewHtml({ cspSource, nonce, scriptUri, styleUri, title = 'Jot preview' }) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data: blob:; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; script-src 'nonce-${nonce}' ${cspSource};">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${esc(styleUri)}">
</head>
<body>
<article class="jot-page" id="page" aria-live="polite"><p class="jot-loading">Opening the preview…</p></article>
<p class="jot-status" id="status" role="status"></p>
<script type="module" nonce="${nonce}" src="${esc(scriptUri)}"></script>
</body>
</html>`;
}

function activate(context) {
  const vscode = require('vscode');
  const panels = new Map(); // document uri -> panel
  const nonce = () => require('crypto').randomBytes(16).toString('base64').replace(/[^A-Za-z0-9]/g, '');
  const media = vscode.Uri.file(path.join(context.extensionPath, 'media'));

  // the look the settings ask for: typed, or handwritten on a dot grid (media/jot/handwriting.mjs)
  const look = () => { const c = vscode.workspace.getConfiguration('jot.preview'); return c.get('look') === 'handwritten' ? { hand: c.get('hand'), ink: c.get('ink'), pitchMm: c.get('dotSpacing') } : null; };
  function send(panel, doc) { panel.webview.postMessage({ type: 'update', text: doc.getText(), name: path.basename(doc.fileName), hand: look() }); }

  function open(doc, column) {
    const key = doc.uri.toString();
    if (panels.has(key)) { panels.get(key).reveal(column); return; }
    const panel = vscode.window.createWebviewPanel('jot.preview', `Preview ${path.basename(doc.fileName)}`, column, { enableScripts: true, localResourceRoots: [media] });
    const w = panel.webview;
    w.html = webviewHtml({ cspSource: w.cspSource, nonce: nonce(), scriptUri: w.asWebviewUri(vscode.Uri.joinPath(media, 'preview-main.mjs')), styleUri: w.asWebviewUri(vscode.Uri.joinPath(media, 'preview.css')), title: `Preview ${path.basename(doc.fileName)}` });
    w.onDidReceiveMessage((m) => { if (m && m.type === 'ready') send(panel, doc); });
    panels.set(key, panel);
    panel.onDidDispose(() => panels.delete(key));
  }
  const active = () => { const e = vscode.window.activeTextEditor; return e && e.document.languageId === 'jot' ? e.document : null; };

  let timer;
  context.subscriptions.push(
    vscode.commands.registerCommand('jot.showPreview', () => { const d = active(); if (d) open(d, vscode.ViewColumn.Active); else vscode.window.showInformationMessage('Open a .jot file to preview it.'); }),
    vscode.commands.registerCommand('jot.showPreviewToSide', () => { const d = active(); if (d) open(d, vscode.ViewColumn.Beside); else vscode.window.showInformationMessage('Open a .jot file to preview it.'); }),
    vscode.commands.registerCommand('jot.insertChart', async () => {
      const e = vscode.window.activeTextEditor; if (!e) return;
      const today = new Date(), mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      await e.insertSnippet(new vscode.SnippetString(`:::record chart #\${1:week-${iso(mon)}}\nmetrics: \${2:sleep, steps}\nstart: \${3:${iso(mon)}}\nend: \${4:${iso(sun)}}\nstyle: \${5|line,bars|}\n:::\n`));
    }),
    vscode.commands.registerCommand('jot.toggleHandwriting', async () => {
      const c = vscode.workspace.getConfiguration('jot.preview');
      await c.update('look', c.get('look') === 'handwritten' ? 'typed' : 'handwritten', vscode.ConfigurationTarget.Global);
    }),
    vscode.workspace.onDidChangeConfiguration((ev) => {
      if (!ev.affectsConfiguration('jot.preview')) return;
      for (const [key, panel] of panels) { const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === key); if (doc) send(panel, doc); }
    }),
    vscode.workspace.onDidChangeTextDocument((ev) => {
      const panel = panels.get(ev.document.uri.toString()); if (!panel) return;
      clearTimeout(timer); timer = setTimeout(() => send(panel, ev.document), 200);
    }),
  );
}
function deactivate() {}
module.exports = { activate, deactivate, webviewHtml };
