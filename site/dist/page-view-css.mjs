// Paged.js 0.4 splits selector lists on every comma, so `:not(.a,.b)` or `:is(.a,.b)` inside a selector breaks its layout.
// pagedSafeCSS rewrites those selectors into equivalent ones without inner commas before Paged.js reads them:
//   x:not(.a,.b) -> x:not(.a):not(.b)      x:is(.a,.b) y -> x:is(.a) y, x:is(.b) y   (likewise :where, :has, :matches)
// Declarations, at-rules and strings are left as written.
const LIMIT = 256;

// Split at commas outside brackets and strings.
export function splitTop(text) {
  const parts = []; let depth = 0, quote = '', start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '\\') i++;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}
// The first functional pseudo-class whose argument is a list, with where its argument ends.
function firstList(selector) {
  const re = /:(not|is|where|matches|has|-webkit-any)\(/gi; let m;
  while ((m = re.exec(selector))) {
    let depth = 1, quote = '', i = re.lastIndex;
    for (; i < selector.length && depth; i++) {
      const c = selector[i];
      if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
      if (c === '"' || c === "'") quote = c; else if (c === '\\') i++; else if (c === '(') depth++; else if (c === ')') depth--;
    }
    if (depth) return null;
    const args = splitTop(selector.slice(re.lastIndex, i - 1));
    if (args.length > 1) return { name: m[1].toLowerCase(), start: m.index, end: i, args, fn: m[0] };
  }
  return null;
}
/** One selector as a list of selectors without commas inside brackets, or null if it would grow past LIMIT. */
export function expandSelector(selector) {
  const out = [], todo = [selector];
  while (todo.length) {
    const s = todo.pop(), list = firstList(s);
    if (!list) { out.push(s); if (out.length > LIMIT) return null; continue; }
    const before = s.slice(0, list.start), after = s.slice(list.end);
    if (list.name === 'not') todo.push(before + list.args.map((a) => `:not(${a})`).join('') + after);
    else for (const a of list.args.reverse()) todo.push(`${before}${list.fn}${a})${after}`);
    if (todo.length > LIMIT) return null;
  }
  return out;
}
const rewritePrelude = (prelude) => {
  const clean = prelude.replace(/\/\*[\s\S]*?\*\//g, ''), lead = clean.match(/^\s*/)[0], body = clean.trim();
  if (!body || body.startsWith('@') || !/[(]/.test(body) || !firstList(body)) return prelude;
  const all = [];
  for (const s of splitTop(body)) { const e = expandSelector(s); if (!e) return prelude; all.push(...e); }
  return lead + all.join(',');
};
/** The stylesheet text with every rule's selector made safe for Paged.js. */
export function pagedSafeCSS(css) {
  let out = '', from = 0, quote = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '/' && css[i + 1] === '*') { const end = css.indexOf('*/', i + 2); i = end < 0 ? css.length : end + 1; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '\\') i++;
    else if (c === '}' || c === ';') { out += css.slice(from, i + 1); from = i + 1; }
    else if (c === '{') { out += rewritePrelude(css.slice(from, i)) + '{'; from = i + 1; }
  }
  return out + css.slice(from);
}
export default { pagedSafeCSS, expandSelector, splitTop };
