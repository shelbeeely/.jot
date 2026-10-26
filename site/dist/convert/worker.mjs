// The converter off the page's thread: a diary like Pepys's (6 MB) takes a second or two to convert and check.
// In: { id, bytes } (a file, as UTF-8 bytes) or { id, text }, and { id, options } to convert the same diary again with new options.
// Out: { id, ok, files, summary, warnings, stem } or { id, ok: false, error }.
import { convert, checkOptions, decodeText, summary } from '../jot/convert.mjs';
import { parse } from '../jot/jot.mjs';

let source = null;
self.onmessage = ({ data }) => {
  const { id } = data;
  try {
    if (data.bytes) source = decodeText(new Uint8Array(data.bytes));
    else if (typeof data.text === 'string') source = data.text;
    if (source === null) throw new Error('no diary yet');
    const options = checkOptions(data.options);
    const r = convert(source, options);
    // every file is checked with the Jot parser, as the template editor checks its own output
    const files = r.files.map((f) => ({ ...f, problems: parse(f.text).diagnostics.filter((d) => d.severity !== 'info').map((d) => d.message) }));
    const stem = files[0].name.replace(/(-\d{4}(-\d{2})?)?\.jot$/, '');
    self.postMessage({ id, ok: true, files, summary: summary(r, options), warnings: r.warnings, stem });
  } catch (e) { self.postMessage({ id, ok: false, error: e.message }); }
};
