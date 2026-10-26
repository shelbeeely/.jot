// The printed strings report (i18n/print-strings.md) is current: a printed word added to the print code shows up in the diff that adds it.
//   node test-print-strings.mjs        (after a change: node i18n/print-report.mjs rewrites the file)
import fs from 'node:fs';
import { printReport } from './i18n/print-report.mjs';
const want = fs.readFileSync(new URL('./i18n/print-strings.md', import.meta.url), 'utf8');
if (printReport() !== want) { console.error('FAIL i18n/print-strings.md is out of date: run node i18n/print-report.mjs'); process.exit(1); }
console.log('ok   i18n/print-strings.md is current');
