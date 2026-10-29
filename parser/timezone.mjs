// Explicit timezone context and local-time resolution. No device-zone defaults or external service.
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', { ignoreBOM: true });
const formatters = new Map(), validation = new Map();
export function validTimezone(value) {
  if (typeof value !== 'string' || !/^(?:UTC|GMT|[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)+)$/.test(value)) return false;
  if (validation.has(value)) return validation.get(value);
  let valid = true; try { new Intl.DateTimeFormat('en', { timeZone: value }); } catch { valid = false; }
  if (validation.size > 128) validation.clear(); validation.set(value, valid); return valid;
}
export function applyTimezones(ast) {
  const metadata = ast.metadata.filter((field) => field.name.toLowerCase() === 'timezone');
  const declared = metadata.length > 0, raw = declared ? metadata.at(-1).value : null;
  ast.timezone = raw !== null && validTimezone(raw) ? raw : null;
  ast.timezoneRaw = raw; ast.timezoneDeclared = declared;
  const diagnostic = (code, message, node) => ast.diagnostics.push({ severity: 'warning', code, message, start: node?.start || 0, end: node?.end || ast.metadataRange?.end || 0 });
  if (declared && !ast.timezone) diagnostic('invalid-timezone', 'Use a recognised IANA Timezone, such as Europe/London, or UTC. No device timezone was substituted.');
  if (metadata.length > 1) diagnostic('duplicate-timezone', 'Several document Timezone values were supplied; the last one applies.');
  const claimed = new Set();
  for (const entry of ast.entries) {
    const overrides = ast.nodes.slice(entry.startNode + 1, entry.endNode).filter((node) => node.type === 'directive' && node.name === 'timezone');
    for (const node of overrides) {
      claimed.add(node);
      if (!validTimezone(node.value.trim())) diagnostic('invalid-timezone', 'Entry timezone must be a recognised IANA name or UTC. This entry’s timezone is unresolved.', node);
    }
    if (overrides.length > 1) diagnostic('duplicate-timezone', 'Several timezone overrides occur in this entry; the last applies to the whole entry.', overrides.at(-1));
    const override = overrides.at(-1);
    entry.timezone = override ? validTimezone(override.value.trim()) ? override.value.trim() : null : ast.timezone;
    entry.timezoneRaw = override ? override.value.trim() : ast.timezoneRaw;
    entry.timezoneSource = override ? 'entry' : declared ? 'document' : 'none';
    const heading = ast.nodes[entry.startNode];
    if (entry.timezoneSource !== 'none') { heading.timezone = entry.timezone; heading.timezoneSource = entry.timezoneSource; }
  }
  for (const node of ast.nodes) if (node.type === 'directive' && node.name === 'timezone' && !claimed.has(node)) diagnostic('orphan-timezone', 'An @timezone: override needs a preceding dated entry. Use document Timezone metadata for a default.', node);
}
export function entryAtCaret(ast, caret) {
  const byte = encoder.encode(ast.source.slice(0, caret)).length;
  return ast.entries.find((entry) => byte >= ast.nodes[entry.startNode].start && (entry.endNode === ast.nodes.length || byte < ast.nodes[entry.endNode].start)) || null;
}
export function setEntryTimezone(ast, caret, zone = '') {
  if (zone && !validTimezone(zone)) throw new Error('Use an IANA timezone such as Europe/London, or UTC.');
  const entry = entryAtCaret(ast, caret); if (!entry) throw new Error('Place your cursor inside a dated entry first.');
  const bytes = encoder.encode(ast.source), charAt = (byte) => decoder.decode(bytes.slice(0, byte)).length;
  const overrides = ast.nodes.slice(entry.startNode + 1, entry.endNode).filter((node) => node.type === 'directive' && node.name === 'timezone');
  let source = ast.source;
  for (const node of overrides.slice().reverse()) source = source.slice(0, charAt(node.start)) + source.slice(charAt(node.end));
  const heading = ast.nodes[entry.startNode], at = charAt(heading.end);
  if (zone) {
    const newline = heading.raw.includes('\r\n') ? '\r\n' : '\n';
    source = source.slice(0, at) + (heading.raw.endsWith('\n') || heading.raw.endsWith('\r') ? '' : newline) + '@timezone: ' + zone + newline + source.slice(at);
  }
  return { source, date: entry.date, caret: Math.min(source.length, at) };
}
function formatter(zone) {
  if (!formatters.has(zone)) {
    if (formatters.size > 64) formatters.clear();
    formatters.set(zone, new Intl.DateTimeFormat('en-GB-u-ca-gregory-nu-latn', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }));
  }
  return formatters.get(zone);
}
function partsAt(epoch, zone) {
  const parts = Object.fromEntries(formatter(zone).formatToParts(epoch).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}
export function resolveLocalTime(date, time, zone) {
  if (!validTimezone(zone)) return { status: 'unresolved', instants: [] };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)) return { status: 'invalid', instants: [] };
  const wall = date + 'T' + time + (time.length === 5 ? ':00' : ''), epoch = Date.parse(wall + 'Z');
  if (!Number.isFinite(epoch) || new Date(epoch).toISOString().slice(0, 10) !== date) return { status: 'invalid', instants: [] };
  const offsets = new Set();
  for (let hour = -48; hour <= 48; hour += 6) {
    const sample = epoch + hour * 3600000;
    offsets.add(Date.parse(partsAt(sample, zone) + 'Z') - sample);
  }
  const instants = [...offsets].map((offset) => epoch - offset).filter((instant) => partsAt(instant, zone) === wall).sort((a, b) => a - b);
  return { status: instants.length === 1 ? 'unique' : instants.length > 1 ? 'ambiguous' : 'nonexistent', instants };
}
export function explicitInstant(value) {
  if (!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value || '')) return null;
  const date = value.slice(0, 10), day = Date.parse(date + 'T00:00:00Z'), epoch = Date.parse(value);
  return Number.isFinite(day) && new Date(day).toISOString().slice(0, 10) === date && Number.isFinite(epoch) ? epoch : null;
}

/** A known instant formatted with its explicit offset; never guesses a zone for an existing local time. */
export function timestampAt(instant, zone) {
  if (!Number.isFinite(instant) || !validTimezone(zone)) throw new Error('A valid instant and IANA timezone are required.');
  const second = Math.floor(instant / 1000) * 1000, wall = partsAt(second, zone);
  const offset = (Date.parse(wall + 'Z') - second) / 60000;
  // RFC 3339 offsets have minute precision. Preserve rare historical sub-minute offsets as UTC instead.
  if (!Number.isInteger(offset)) return new Date(second).toISOString().replace('.000Z', 'Z');
  if (!offset) return wall + 'Z';
  const absolute = Math.abs(offset);
  return wall + (offset < 0 ? '-' : '+') + String(Math.floor(absolute / 60)).padStart(2, '0') + ':' + String(absolute % 60).padStart(2, '0');
}
