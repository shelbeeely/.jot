// The extension without VS Code: the manifest, the grammar, the commands it registers, and the webview page's safety rules.
//   node --test test-extension.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), Module = require('node:module');
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)));
const COMMANDS = ['jot.exportCSV', 'jot.exportHTML', 'jot.exportICS', 'jot.importCSV', 'jot.insertChart', 'jot.rollover', 'jot.sendWebhook', 'jot.setTodoistToken', 'jot.showPreview', 'jot.showPreviewToSide', 'jot.today', 'jot.todoist', 'jot.toggleHandwriting', 'jot.weekReview'];

test('the manifest: the .jot language, its grammar and its commands', () => {
  assert.deepEqual(pkg.contributes.languages[0].extensions, ['.jot']);
  for (const f of [pkg.main, pkg.contributes.languages[0].configuration, pkg.contributes.grammars[0].path]) assert.ok(fs.existsSync(new URL(f, import.meta.url)), f);
  assert.deepEqual(pkg.contributes.commands.map((c) => c.command).sort(), COMMANDS);
  const props = Object.assign({}, ...pkg.contributes.configuration.map((c) => c.properties));
  assert.deepEqual(Object.keys(props).filter((k) => k.startsWith('jot.preview.')).sort(), ['jot.preview.dotSpacing', 'jot.preview.hand', 'jot.preview.ink', 'jot.preview.look', 'jot.preview.style']);
  assert.ok(['jot.automation.webhookUrl', 'jot.automation.weather.onToday', 'jot.automation.exportOnSave.ics'].every((k) => k in props));
  assert.equal(props['jot.automation.weather.onToday'].default, false, 'nothing reaches out until it is turned on');
  assert.equal(props['jot.automation.webhookUrl'].default, '');
});

test('the grammar: valid JSON, every pattern compiles, the Jot marks are named', () => {
  const g = JSON.parse(fs.readFileSync(new URL('./syntaxes/jot.tmLanguage.json', import.meta.url)));
  const walk = (x) => { if (Array.isArray(x)) return x.forEach(walk); if (!x || typeof x !== 'object') return; for (const k of ['match', 'begin', 'end']) if (x[k]) new RegExp(x[k].replace(/\\A/g, '^'), 'u'); Object.values(x).forEach(walk); };
  walk(g);
  const re = (k) => new RegExp(g.repository[k].match || g.repository[k].begin);
  assert.ok(re('entry').test('### 2026-10-26 | Monday'));
  assert.ok(re('record').test(':::record measurement #sleep-2026-10-26'));
  assert.ok(re('record').test(':::record chart #week'));
  assert.ok(new RegExp(g.repository.task.patterns[0].match).test('[x] Walk'));
  const inl = g.repository.inline.patterns.map((p) => new RegExp(p.match));
  assert.ok(inl[0].test('a ==bright== day') && !inl[0].test('a == b') && inl[1].test('++under++') && inl[2].test('x^2^') && inl[3].test('note[^1]'));
  assert.ok(new RegExp(g.repository.callout.match).test('> [!NOTE]') && new RegExp(g.repository.center.match).test('-> middle <-'));
});

test('activate registers every command (a stand-in vscode module)', () => {
  const registered = [], load = Module._load;
  const fake = { commands: { registerCommand: (id) => (registered.push(id), { dispose() {} }) }, workspace: { onDidChangeTextDocument: () => ({ dispose() {} }), onDidChangeConfiguration: () => ({ dispose() {} }), onDidSaveTextDocument: () => ({ dispose() {} }) }, window: {}, Uri: { file: (p) => ({ fsPath: p }), joinPath: () => ({}) }, ViewColumn: { Active: 1, Beside: 2 } };
  Module._load = function (req, ...rest) { return req === 'vscode' ? fake : load.call(this, req, ...rest); };
  try { require('./extension.js').activate({ extensionPath: '/x', subscriptions: [] }); } finally { Module._load = load; }
  assert.deepEqual(registered.sort(), COMMANDS);
});

test('the webview page: a nonce-only script policy, nothing remote, the title escaped', () => {
  const { webviewHtml } = require('./extension.js');
  const html = webviewHtml({ cspSource: 'vscode-resource:', nonce: 'abc123', scriptUri: 'vscode-resource:/media/preview-main.mjs', styleUri: 'vscode-resource:/media/preview.css', title: '<b>x</b>' });
  assert.match(html, /default-src 'none'/);
  assert.match(html, /script-src 'nonce-abc123'/);
  assert.match(html, /font-src vscode-resource:;/, 'the handwriting fonts load from the extension only');
  assert.match(html, /connect-src vscode-resource:;/, 'and an export reads them back from the extension only');
  assert.match(html, /<script type="module" nonce="abc123"/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(html, /<b>x<\/b>/);
});

// A stand-in VS Code good enough to run the automation commands on a document and see what they write
function harness(text, settings = {}, answers = {}) {
  const http = require('node:http'), url = require('node:url'), path = require('node:path'), os = require('node:os');
  const cmds = new Map(), shown = [], secrets = new Map(), writes = new Map();
  const doc = { uri: { toString: () => 'file:///j/journal.jot' }, fileName: '/j/journal.jot', languageId: 'jot', text, getText() { return this.text; },
    positionAt(i) { return i; } };
  const media = path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'media');
  const Uri = { file: (p) => ({ fsPath: p, toString: () => url.pathToFileURL(p).href }), joinPath: (u, ...ps) => Uri.file(path.join(u.fsPath, ...ps)) };
  const fake = {
    Uri, ViewColumn: { Active: 1, Beside: 2 }, ConfigurationTarget: { Global: 1 },
    Range: class { constructor(a, b) { this.a = a; this.b = b; } }, Selection: class { constructor(a, b) { this.a = a; this.b = b; } },
    WorkspaceEdit: class { replace(u, r, t) { this.t = t; } },
    commands: { registerCommand: (id, fn) => (cmds.set(id, fn), { dispose() {} }), executeCommand: (id) => cmds.get(id)() },
    workspace: {
      onDidChangeTextDocument: () => ({}), onDidChangeConfiguration: () => ({}), onDidSaveTextDocument: (fn) => { fake.saveHook = fn; return {}; },
      getConfiguration: (sec) => ({ get: (k) => settings[`${sec}.${k}`], update: async (k, v) => { settings[`${sec}.${k}`] = v; } }),
      applyEdit: async (e) => { doc.text = e.t; return true; },
      fs: { writeFile: async (u, b) => writes.set(u.fsPath, Buffer.from(b).toString('utf8')), readFile: async (u) => require('node:fs').readFileSync(u.fsPath) },
    },
    window: { activeTextEditor: { document: doc, selection: null, revealRange() {} }, showInformationMessage: async (m) => (shown.push(m), undefined), showErrorMessage: async (m) => (shown.push(`ERROR ${m}`), undefined),
      showWarningMessage: async (m) => (shown.push(m), answers.warning), showInputBox: async () => answers.input, showQuickPick: async (items) => items.find((i) => i.label === answers.pick || i.id === answers.pick) || items[0],
      showSaveDialog: async (o) => Uri.file(path.join(os.tmpdir(), path.basename(o.defaultUri.fsPath))), showOpenDialog: async () => (answers.open ? [Uri.file(answers.open)] : undefined) },
    env: { openExternal() {} },
  };
  const Module = require('node:module'), load = Module._load;
  Module._load = function (req, ...rest) { return req === 'vscode' ? fake : load.call(this, req, ...rest); };
  try { delete require.cache[require.resolve('./extension.js')]; require('./extension.js').activate({ extensionPath: path.dirname(media), subscriptions: [], secrets: { get: async (k) => secrets.get(k), store: async (k, v) => secrets.set(k, v) } }); } finally { Module._load = load; }
  return { run: (id) => cmds.get(id)(), doc, shown, writes, fake, settings, http };
}

test('automation commands edit the open journal: today, carry tasks forward, a week review', async () => {
  const today = (await import('./media/jot/automation.mjs')).localToday();
  const h = harness('### 2020-01-06 | Monday\n\n[ ] Call Sam\n[x] Walk\n');
  await h.run('jot.today');
  assert.match(h.doc.text, new RegExp(`### ${today} \\| \\w+day\\n`), "Today's Entry adds today");
  await h.run('jot.rollover');
  assert.match(h.doc.text, /\[>\] Call Sam/); assert.match(h.doc.text.slice(h.doc.text.indexOf(`### ${today}`)), /\[ \] Call Sam/);
  await h.run('jot.weekReview');
  assert.match(h.doc.text, /## Week review · \d{4}-\d{2}-\d{2} to /);
  assert.ok(h.shown.some((m) => /carried 1 open task/.test(m)) && !h.shown.some((m) => /^ERROR/.test(m)), h.shown.join(' | '));
});

test('exports and imports: calendar, CSV, numbers from a CSV into their days, exports on save', async () => {
  const os = require('node:os'), path = require('node:path'), fsx = require('node:fs');
  const csv = path.join(os.tmpdir(), `jot-fit-${process.pid}.csv`); fsx.writeFileSync(csv, 'date,steps\n2026-10-25,8200\n');
  const h = harness('### 2026-10-25 | Sunday\n\no Dinner 19:00\n[ ] Post the letter\n', { 'jot.automation.exportOnSave.ics': 'out/journal.ics' }, { open: csv, pick: 'sum' });
  await h.run('jot.exportICS');
  const ics = [...h.writes.values()].find((t) => /BEGIN:VCALENDAR/.test(t)); assert.match(ics, /DTSTART:20261025T190000/); assert.match(ics, /BEGIN:VTODO/);
  await h.run('jot.importCSV');
  assert.match(h.doc.text, /metric: steps\nvalue: 8200\nsource: jot-fit-\d+\.csv/);
  await h.fake.saveHook(h.doc);
  assert.ok(h.writes.has('/j/out/journal.ics'), 'exported on save, beside the journal');
});

test('the webhook sends only tasks, events and numbers, after asking; nothing goes when the answer is no', async () => {
  const http = require('node:http'); const got = [];
  const srv = http.createServer((q, r) => { let b = ''; q.on('data', (c) => (b += c)); q.on('end', () => { got.push(JSON.parse(b)); r.end('ok'); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}/hook`;
  try {
    const no = harness('### 2026-10-25\n\nA private thought.\n[ ] Call Sam\n', { 'jot.automation.webhookUrl': url }, { warning: undefined });
    await no.run('jot.sendWebhook'); assert.equal(got.length, 0, 'not sent without a yes');
    const yes = harness('### 2026-10-25\n\nA private thought.\n[ ] Call Sam\no Dinner 19:00\n', { 'jot.automation.webhookUrl': url }, { warning: 'Send' });
    await yes.run('jot.sendWebhook');
    assert.equal(got.length, 1); assert.equal(got[0].format, 'jot-automation');
    assert.deepEqual(got[0].tasks.map((t) => t.text), ['Call Sam']); assert.deepEqual(got[0].events.map((e) => e.time), ['19:00']);
    assert.ok(!JSON.stringify(got[0]).includes('private thought'), 'the writing itself is never sent');
  } finally { srv.close(); }
});

test('includes: the extension reads only .jot files inside the folder (no climbing, no links out, no large files); the webview never fetches', async () => {
  const { readInclude } = require('./extension.js'), os = require('node:os'), path = require('node:path'), fsx = require('node:fs');
  const base = fsx.mkdtempSync(path.join(os.tmpdir(), 'jot-inc-')), root = path.join(base, 'root'), outside = path.join(base, 'secret.jot');
  fsx.mkdirSync(path.join(root, 'notes'), { recursive: true }); fsx.writeFileSync(path.join(root, 'notes/week.jot'), 'Week.\n'); fsx.writeFileSync(outside, 'Private.\n');
  fsx.writeFileSync(path.join(root, 'big.jot'), 'x'.repeat(1024 * 1024 + 1)); fsx.writeFileSync(path.join(root, 'note.txt'), 'Not a journal.\n');
  try { fsx.symlinkSync(outside, path.join(root, 'link.jot')); } catch { /* no symlinks here */ }
  assert.equal(await readInclude(root, 'notes/week.jot'), 'Week.\n');
  assert.equal(await readInclude(root, 'notes/week.jot', (abs) => (abs === path.join(root, 'notes/week.jot') ? 'Unsaved.\n' : null)), 'Unsaved.\n', 'an open editor\'s text wins');
  for (const bad of ['../secret.jot', 'notes/../../secret.jot', outside, '/etc/passwd', 'note.txt', 'big.jot', 'missing.jot', 'link.jot', 'C:/x.jot', 'notes//week.jot', null])
    assert.equal(await readInclude(root, bad), null, String(bad));
  const main = fsx.readFileSync(new URL('./media/preview-main.mjs', import.meta.url), 'utf8'), inc = fsx.readFileSync(new URL('./media/jot/include.mjs', import.meta.url), 'utf8');
  for (const src of [main, inc]) assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|WebSocket|import\(/);
  assert.match(main, /include: \(p\) => \(Object\.hasOwn\(files, p\)/, 'the webview only uses the text the extension lent');
});
