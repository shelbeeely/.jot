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
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data: blob:; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; connect-src ${cspSource}; script-src 'nonce-${nonce}' ${cspSource};">
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
  const style = () => vscode.workspace.getConfiguration('jot.preview').get('style') || 'plain';
  function send(panel, doc) { panel.webview.postMessage({ type: 'update', text: doc.getText(), name: path.basename(doc.fileName), hand: look(), style: style() }); }
  const ready = new Map(), exports = new Map(); // document uri -> when its preview has said it is ready; -> an export waiting for its page

  function open(doc, column) {
    const key = doc.uri.toString();
    if (panels.has(key)) { panels.get(key).reveal(column); return; }
    const panel = vscode.window.createWebviewPanel('jot.preview', `Preview ${path.basename(doc.fileName)}`, column, { enableScripts: true, localResourceRoots: [media] });
    const w = panel.webview;
    w.html = webviewHtml({ cspSource: w.cspSource, nonce: nonce(), scriptUri: w.asWebviewUri(vscode.Uri.joinPath(media, 'preview-main.mjs')), styleUri: w.asWebviewUri(vscode.Uri.joinPath(media, 'preview.css')), title: `Preview ${path.basename(doc.fileName)}` });
    let isReady; ready.set(key, new Promise((r) => { isReady = r; }));
    w.onDidReceiveMessage((m) => {
      if (m && m.type === 'ready') { send(panel, doc); isReady(); }
      if (m && m.type === 'exported' && typeof m.html === 'string') { const done = exports.get(key); exports.delete(key); if (done) done(m); }
    });
    panels.set(key, panel);
    panel.onDidDispose(() => { panels.delete(key); ready.delete(key); });
  }
  // Export: the preview makes the page (media/jot/export.mjs, the same as the site's Download page), the extension saves it
  async function exportDoc(doc) {
    open(doc, vscode.ViewColumn.Beside);
    const key = doc.uri.toString(); await ready.get(key); send(panels.get(key), doc);
    const got = new Promise((resolve) => exports.set(key, resolve));
    panels.get(key).webview.postMessage({ type: 'export', title: path.basename(doc.fileName, path.extname(doc.fileName)) });
    const m = await got;
    if (m.error) { vscode.window.showErrorMessage(`Jot: could not export the page (${m.error})`); return; }
    const target = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(doc.fileName.replace(/\.jot$/i, '') + '.html'), filters: { 'Web page': ['html'] }, saveLabel: 'Export' });
    if (!target) return;
    await vscode.workspace.fs.writeFile(target, Buffer.from(m.html, 'utf8'));
    const pick = await vscode.window.showInformationMessage(`Exported ${path.basename(target.fsPath)}: open it in a browser to read or print it.`, 'Open');
    if (pick === 'Open') vscode.env.openExternal(target);
  }
  const active = () => { const e = vscode.window.activeTextEditor; return e && e.document.languageId === 'jot' ? e.document : null; };

  // ---- automation (media/jot/automation.mjs, the same as the jot command line and the workspace) ----
  // Every change is one edit to the open document, so Undo takes it back. Only the webhook, Todoist and weather reach the internet,
  // and only when their command runs (or a setting the person turned on asks for it).
  const lib = () => Promise.all([import(vscode.Uri.joinPath(media, 'jot', 'automation.mjs').toString()), import(vscode.Uri.joinPath(media, 'jot', 'connect.mjs').toString()), import(vscode.Uri.joinPath(media, 'jot', 'jot.mjs').toString())]).then(([a, c, j]) => ({ A: a.default, C: c, parse: j.parse }));
  const cfg = () => vscode.workspace.getConfiguration('jot.automation');
  const say = (m) => vscode.window.showInformationMessage(`Jot: ${m}`);
  async function replaceAll(doc, text) {
    if (text === doc.getText()) return false;
    const edit = new vscode.WorkspaceEdit(); edit.replace(doc.uri, new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), text);
    return vscode.workspace.applyEdit(edit);
  }
  const withDoc = (fn) => async () => { const d = active(); if (!d) return say('open a .jot file first'); try { await fn(d, await lib()); } catch (e) { vscode.window.showErrorMessage(`Jot: ${e.message}`); } };
  const location = () => { const v = String(cfg().get('weather.location') || '').split(',').map(Number); return v.length === 2 && v.every(Number.isFinite) ? v : null; };
  async function writeNear(doc, rel, data) { // a path from the settings, beside the journal unless absolute
    const target = path.isAbsolute(rel) ? vscode.Uri.file(rel) : vscode.Uri.file(path.join(path.dirname(doc.fileName), rel));
    await vscode.workspace.fs.writeFile(target, Buffer.from(data, 'utf8')); return target;
  }

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
    vscode.commands.registerCommand('jot.today', withDoc(async (doc, { A, C }) => {
      const day = A.localToday(), loc = cfg().get('weather.onToday') ? location() : null;
      const extra = loc ? (await C.weather(loc[0], loc[1], day)).record : '';
      const r = A.todayEntry(doc.getText(), day, { extra });
      if (r.added) await replaceAll(doc, r.text);
      const e = vscode.window.activeTextEditor, at = doc.getText().indexOf(`### ${day}`);
      if (e && at >= 0) { const pos = doc.positionAt(doc.getText().indexOf('\n', at) + 1); e.selection = new vscode.Selection(pos, pos); e.revealRange(new vscode.Range(pos, pos)); }
      if (!r.added) say(`${day} is already here`);
    })),
    vscode.commands.registerCommand('jot.rollover', withDoc(async (doc, { A }) => {
      const r = A.rollover(doc.getText(), A.localToday());
      if (!r.moved) return say('no open tasks from earlier days');
      await replaceAll(doc, r.text); say(`carried ${r.moved} open ${r.moved === 1 ? 'task' : 'tasks'} to today (marked [>] where they were)`);
    })),
    vscode.commands.registerCommand('jot.weekReview', withDoc(async (doc, { A }) => {
      const r = A.weekReview(doc.getText(), A.localToday()); await replaceAll(doc, r.text);
      say(`review of ${r.week.start} to ${r.week.end}: ${r.week.done} done, ${r.week.open} open`);
    })),
    vscode.commands.registerCommand('jot.exportICS', withDoc(async (doc, { A, parse }) => {
      const t = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(doc.fileName.replace(/\.jot$/i, '') + '.ics'), filters: { Calendar: ['ics'] }, saveLabel: 'Export' }); if (!t) return;
      await vscode.workspace.fs.writeFile(t, Buffer.from(A.toICS(parse(doc.getText()), { name: path.basename(doc.fileName, '.jot'), tasksAsEvents: !!cfg().get('calendar.tasksAsEvents') }), 'utf8'));
      say(`exported ${path.basename(t.fsPath)}: import it into your calendar, or keep it in a synced folder to subscribe to it`);
    })),
    vscode.commands.registerCommand('jot.exportCSV', withDoc(async (doc, { A, parse }) => {
      const which = await vscode.window.showQuickPick([{ label: 'Numbers', description: 'date, metric, value, unit', id: 'numbers' }, { label: 'Tasks', description: 'date, status, priority, task', id: 'tasks' }], { placeHolder: 'Export which as CSV?' }); if (!which) return;
      const t = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file(`${doc.fileName.replace(/\.jot$/i, '')}-${which.id}.csv`), filters: { CSV: ['csv'] }, saveLabel: 'Export' }); if (!t) return;
      const ast = parse(doc.getText()); await vscode.workspace.fs.writeFile(t, Buffer.from(which.id === 'tasks' ? A.tasksCSV(ast) : A.numbersCSV(ast), 'utf8')); say(`exported ${path.basename(t.fsPath)}`);
    })),
    vscode.commands.registerCommand('jot.importCSV', withDoc(async (doc, { A }) => {
      const [f] = (await vscode.window.showOpenDialog({ canSelectMany: false, filters: { CSV: ['csv', 'txt', 'tsv'] }, openLabel: 'Import numbers' })) || []; if (!f) return;
      const combine = await vscode.window.showQuickPick([{ label: 'sum', description: 'several rows on a day are added up (steps by the hour)' }, { label: 'mean', description: 'averaged (heart rate)' }, { label: 'last', description: 'the last one counts' }], { placeHolder: 'When a day has several rows' }); if (!combine) return;
      const r = A.readCSV(Buffer.from(await vscode.workspace.fs.readFile(f)).toString('utf8'), { combine: combine.label });
      const w = A.addNumbers(doc.getText(), r.numbers, { source: path.basename(f.fsPath) }); await replaceAll(doc, w.text);
      say(`${w.filled} blanks filled, ${w.added} numbers added, ${w.kept} already there (${r.metrics.join(', ') || 'no numbers found'})${r.ambiguous ? `; ${r.ambiguous} rows had dates that could be read either way round and were left out` : ''}`);
    })),
    vscode.commands.registerCommand('jot.sendWebhook', withDoc(async (doc, { A, C, parse }) => {
      let url = cfg().get('webhookUrl');
      if (!url) { url = await vscode.window.showInputBox({ prompt: 'Webhook address (Zapier, Make, n8n, IFTTT …). It is saved in the setting jot.automation.webhookUrl.', placeHolder: 'https://hooks.zapier.com/…', ignoreFocusOut: true }); if (!url) return; await cfg().update('webhookUrl', url, vscode.ConfigurationTarget.Global); }
      const body = A.payload(parse(doc.getText()), { file: path.basename(doc.fileName), open: !!cfg().get('webhookOpenOnly') });
      const go = await vscode.window.showWarningMessage(`Send ${body.tasks.length} tasks, ${body.events.length} events and ${body.numbers.length} numbers from this journal to ${new URL(url).host}? (Only these, not your writing.)`, { modal: true }, 'Send'); if (go !== 'Send') return;
      const r = await C.sendWebhook(url, body); say(`sent (${r.status})`);
    })),
    vscode.commands.registerCommand('jot.setTodoistToken', async () => {
      const token = await vscode.window.showInputBox({ prompt: 'Your Todoist API token (Todoist: Settings → Integrations → Developer). It is kept in VS Code\'s secret storage, never in a file.', password: true, ignoreFocusOut: true });
      if (token !== undefined) { await context.secrets.store('jot.todoist', token.trim()); say(token.trim() ? 'Todoist token saved' : 'Todoist token removed'); }
    }),
    vscode.commands.registerCommand('jot.todoist', withDoc(async (doc, { A, C, parse }) => {
      let token = await context.secrets.get('jot.todoist');
      if (!token) { await vscode.commands.executeCommand('jot.setTodoistToken'); token = await context.secrets.get('jot.todoist'); if (!token) return; }
      const todo = A.pendingSync(parse(doc.getText()), 'todoist').map((t) => ({ ...t, key: A.taskKey(t) }));
      if (!todo.length) return say('every open task has been sent to Todoist already');
      const go = await vscode.window.showWarningMessage(`Send ${todo.length} open ${todo.length === 1 ? 'task' : 'tasks'} to Todoist?`, { modal: true, detail: todo.slice(0, 8).map((t) => `• ${t.text}${t.date ? ` (${t.date})` : ''}`).join('\n') + (todo.length > 8 ? `\n… and ${todo.length - 8} more` : '') }, 'Send'); if (go !== 'Send') return;
      const sent = await C.todoistAdd(todo, token);
      await replaceAll(doc, A.markSynced(doc.getText(), 'todoist', todo.filter((t) => sent.some((x) => x.key === t.key)), { at: new Date().toISOString().slice(0, 16) }));
      say(`sent ${sent.length} to Todoist (remembered in the #sync-todoist record, so they are not sent twice)`);
    })),
    vscode.workspace.onDidSaveTextDocument(async (doc) => { // exports on save, when the settings name where to
      if (doc.languageId !== 'jot') return;
      const ics = cfg().get('exportOnSave.ics'), csv = cfg().get('exportOnSave.csv'); if (!ics && !csv) return;
      try { const { A, parse } = await lib(), ast = parse(doc.getText()); if (ics) await writeNear(doc, ics, A.toICS(ast, { name: path.basename(doc.fileName, '.jot'), tasksAsEvents: !!cfg().get('calendar.tasksAsEvents'), stamp: new Date().toISOString().replace(/[-:]|\.\d+/g, '') })); if (csv) await writeNear(doc, csv, A.numbersCSV(ast)); }
      catch (e) { vscode.window.showErrorMessage(`Jot: could not export on save (${e.message})`); }
    }),
    vscode.commands.registerCommand('jot.exportHTML', () => { const d = active(); if (d) return exportDoc(d); vscode.window.showInformationMessage('Open a .jot file to export it.'); }),
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
