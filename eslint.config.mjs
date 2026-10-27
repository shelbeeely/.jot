// ESLint: correctness rules only (eslint:recommended); formatting is left to the surrounding code's style.
//   npm run lint     (after npm ci)
import js from '@eslint/js';
import globals from 'globals';

const COPIES = 'jot,container,proofread,charts,preview,handwriting,styles,palette,export,automation,connect,convert';

export default [
  // Third-party code and generated copies: lint the source in parser/ and converter/ instead.
  // The scanner (/scan/) is an unfinished, unlinked prototype whose classic scripts share globals.
  { ignores: ['**/node_modules/', '**/vendor/', 'vscode/media/jot/', `site/dist/jot/{${COPIES}}.mjs`, 'site/dist/scan/'] },
  js.configs.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    // `catch {}` and `catch (e) {}` deliberately ignore errors (storage, optional features).
    // Control characters in regexes are how untrusted text is cleaned; redundant escapes are left as written.
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-control-regex': 'off',
      'no-useless-escape': 'off',
    },
  },
  // The parser runs in browsers and in Node; the site and the extension's webview run in browsers.
  { files: ['parser/**', 'site/dist/**', 'vscode/media/**'], languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ['cli/**', 'converter/**', 'tools/**', 'site/*.mjs', 'vscode/*.mjs', '.claude/**', 'eslint.config.mjs'], languageOptions: { globals: globals.node } },
  // CommonJS scripts; the browser suites pass functions into the page, so they see browser globals too.
  { files: ['**/*.cjs', 'vscode/extension.js'], languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser, axe: 'readonly' } } },
  { files: ['vscode/media/**'], languageOptions: { globals: { acquireVsCodeApi: 'readonly' } } },
];
