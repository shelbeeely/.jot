// The extension without VS Code: the manifest, the grammar, the commands it registers, and the webview page's safety rules.
//   node --test test-extension.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), Module = require('node:module');
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)));

test('the manifest: the .jot language, its grammar and its commands', () => {
  assert.deepEqual(pkg.contributes.languages[0].extensions, ['.jot']);
  for (const f of [pkg.main, pkg.contributes.languages[0].configuration, pkg.contributes.grammars[0].path]) assert.ok(fs.existsSync(new URL(f, import.meta.url)), f);
  assert.deepEqual(pkg.contributes.commands.map((c) => c.command).sort(), ['jot.insertChart', 'jot.showPreview', 'jot.showPreviewToSide', 'jot.toggleHandwriting']);
  assert.deepEqual(Object.keys(pkg.contributes.configuration.properties).sort(), ['jot.preview.dotSpacing', 'jot.preview.hand', 'jot.preview.ink', 'jot.preview.look']);
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

test('activate registers the four commands (a stand-in vscode module)', () => {
  const registered = [], load = Module._load;
  const fake = { commands: { registerCommand: (id) => (registered.push(id), { dispose() {} }) }, workspace: { onDidChangeTextDocument: () => ({ dispose() {} }), onDidChangeConfiguration: () => ({ dispose() {} }) }, window: {}, Uri: { file: (p) => ({ fsPath: p }), joinPath: () => ({}) }, ViewColumn: { Active: 1, Beside: 2 } };
  Module._load = function (req, ...rest) { return req === 'vscode' ? fake : load.call(this, req, ...rest); };
  try { require('./extension.js').activate({ extensionPath: '/x', subscriptions: [] }); } finally { Module._load = load; }
  assert.deepEqual(registered.sort(), ['jot.insertChart', 'jot.showPreview', 'jot.showPreviewToSide', 'jot.toggleHandwriting']);
});

test('the webview page: a nonce-only script policy, nothing remote, the title escaped', () => {
  const { webviewHtml } = require('./extension.js');
  const html = webviewHtml({ cspSource: 'vscode-resource:', nonce: 'abc123', scriptUri: 'vscode-resource:/media/preview-main.mjs', styleUri: 'vscode-resource:/media/preview.css', title: '<b>x</b>' });
  assert.match(html, /default-src 'none'/);
  assert.match(html, /script-src 'nonce-abc123'/);
  assert.match(html, /font-src vscode-resource:;/, 'the handwriting fonts load from the extension only');
  assert.match(html, /<script type="module" nonce="abc123"/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(html, /<b>x<\/b>/);
});
