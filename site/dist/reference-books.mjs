// Reusable, explicitly opened local reference files. Generic person/place records; no network or geocoding.
import { parse } from './jot/jot.mjs';
export const BOOK_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}\.jot$/;
export const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
export const PERSON_FIELDS = ['label', 'alias', 'given-name', 'family-name', 'pronouns', 'organization', 'email', 'phone', 'website', 'address', 'place', 'notes'];
export const PLACE_FIELDS = ['label', 'alias', 'kind', 'address-line1', 'address-line2', 'locality', 'region', 'postal-code', 'country', 'country-code', 'latitude', 'longitude', 'altitude-m', 'accuracy-m', 'timezone', 'captured-at', 'source', 'phone', 'website', 'directions', 'accessibility', 'notes'];
export const REPEATED = new Set(['alias', 'email', 'phone', 'website']);
export const valuesOf = (node) => (node.fields || []).reduce((out, field) => { out[field.name] = REPEATED.has(field.name) && out[field.name] ? out[field.name] + '\n' + field.value : field.value; return out; }, {});
export function locationErrors(values) {
  const errors = [], lat = String(values.latitude ?? '').trim(), lon = String(values.longitude ?? '').trim();
  const decimal = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!!lat !== !!lon) errors.push('Latitude and longitude must be supplied together.');
  if (lat && (!decimal.test(lat) || Number(lat) < -90 || Number(lat) > 90)) errors.push('Latitude must be a decimal between -90 and 90.');
  if (lon && (!decimal.test(lon) || Number(lon) < -180 || Number(lon) > 180)) errors.push('Longitude must be a decimal between -180 and 180.');
  for (const key of ['altitude-m', 'accuracy-m']) if (String(values[key] ?? '').trim() && (!decimal.test(String(values[key]).trim()) || !Number.isFinite(Number(values[key])) || key === 'accuracy-m' && Number(values[key]) < 0)) errors.push(key + ' must be a decimal in metres' + (key === 'accuracy-m' ? ', zero or greater.' : '.'));
  if (values['country-code'] && !/^[A-Za-z]{2}$/.test(values['country-code'].trim())) errors.push('Country code must be two letters (for example GB).');
  if (values.timezone) try { new Intl.DateTimeFormat('en', { timeZone: values.timezone.trim() }); } catch { errors.push('Use a recognised IANA timezone, such as Europe/London.'); }
  return errors;
}
export function recordErrors(type, values) {
  const errors = type === 'place' ? locationErrors(values) : [];
  if (!String(values.label || '').trim()) errors.push('Give the record a display name.');
  if (values.website) {
    try { for (const website of values.website.split('\n').filter(Boolean)) { const url = new URL(website); if (url.protocol !== 'https:' || url.username || url.password) throw Error(); } }
    catch { errors.push('Website must be an HTTPS URL without login details.'); }
  }
  return errors;
}
export function referenceBook(name, source) {
  if (!BOOK_NAME.test(name)) throw new Error('Use a simple filename ending in .jot, such as people.jot or places.jot (letters, numbers, dots, dashes or underscores).');
  if (typeof source !== 'string' || new TextEncoder().encode(source).length > 1024 * 1024) throw new Error('A reference book must be UTF-8 Jot text under 1 MiB.');
  const ast = parse(source);
  if (ast.diagnostics.some((d) => d.severity === 'error' || d.severity === 'warning')) throw new Error('Fix the book’s Jot diagnostics before opening it: ' + ast.diagnostics[0].message);
  const records = ast.nodes.filter((node) => node.type === 'record' && ['person', 'place'].includes(node.recordType));
  for (const node of records) {
    if (!node.id || !ID.test(node.id)) throw new Error('Every person or place needs a valid, unique record ID.');
    const seen = new Set();
    for (const item of node.fields) { if (seen.has(item.name) && !REPEATED.has(item.name) && (node.recordType === 'person' ? PERSON_FIELDS : PLACE_FIELDS).includes(item.name)) throw new Error(node.id + ': duplicate field ' + item.name); seen.add(item.name); }
    const errors = recordErrors(node.recordType, valuesOf(node));
    if (errors.length) throw new Error(node.id + ': ' + errors.join(' '));
  }
  return { name, source, records };
}
export function saveReference(book, { type, id, values }, editingId = '') {
  if (!['person', 'place'].includes(type) || !ID.test(id)) throw new Error('Choose Person or Place and a stable ID containing letters, numbers, dots, underscores or dashes.');
  const checked = referenceBook(book.name, book.source), ast = parse(book.source);
  const existing = editingId ? checked.records.find((node) => node.id === editingId) : null;
  if (editingId && !existing) throw new Error('That record is no longer in the book.');
  if (existing && (id !== editingId || type !== existing.recordType)) throw new Error('Keep the record’s ID and type stable when editing.');
  if (ast.nodes.some((node) => node.type === 'record' && node.id === id && node !== existing && node.id !== editingId)) throw new Error('That ID is already used in this book.');
  const errors = recordErrors(type, values); if (errors.length) throw new Error(errors.join(' '));
  const allowed = type === 'person' ? PERSON_FIELDS : PLACE_FIELDS;
  const lines = [':::record ' + type + ' #' + id];
  for (const key of allowed) {
    const value = String(values[key] ?? '').replace(/\r\n?/g, '\n').trim();
    if (!value) continue;
    if (/\u0000/.test(value)) throw new Error('Fields must not contain NUL characters.');
    if (REPEATED.has(key)) { for (const alias of value.split('\n').map((s) => s.trim()).filter(Boolean)) lines.push(key + ': ' + alias); }
    else if (value.includes('\n')) lines.push(key + ': |', ...value.split('\n').map((line) => '  ' + line));
    else lines.push(key + ': ' + value);
  }
  // Preserve unknown fields when editing an imported record; never silently discard user data.
  if (existing) for (const field of existing.fields.filter((field) => !allowed.includes(field.name))) {
    if (field.value.includes('\n')) lines.push(field.name + ': |', ...field.value.split('\n').map((line) => '  ' + line));
    else lines.push(field.name + ': ' + field.value);
  }
  lines.push(':::');
  let source;
  if (existing) {
    const bytes = new TextEncoder().encode(book.source), decoder = new TextDecoder('utf-8', { ignoreBOM: true });
    const start = decoder.decode(bytes.slice(0, existing.start)).length, end = decoder.decode(bytes.slice(0, existing.end)).length;
    source = book.source.slice(0, start) + lines.join('\n') + (/\r?\n$/.test(existing.raw) ? '\n' : '') + book.source.slice(end);
  } else source = book.source + (book.source && !book.source.endsWith('\n') ? '\n' : '') + '\n' + lines.join('\n') + '\n';
  return referenceBook(book.name, source);
}
export function bookTargets(books) {
  return books.flatMap((book) => book.records.map((node) => {
    const values = valuesOf(node), aliases = node.fields.filter((field) => field.name === 'alias').map((field) => field.value).join(' ');
    return { id: node.id, file: book.name, href: book.name + '#' + node.id, label: values.label, kind: node.recordType, search: [values.label, aliases, node.id, values.locality, values.region, values.country].filter(Boolean).join(' ') };
  }));
}
export function mapURL(values) {
  if (!String(values.latitude ?? '').trim() || !String(values.longitude ?? '').trim() || locationErrors(values).length) return null;
  const lat = Number(values.latitude), lon = Number(values.longitude);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
}
