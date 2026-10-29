import { parse } from './jot/jot.mjs';
import { entryAtCaret, timestampAt, validTimezone } from './jot/timezone.mjs';
import { locationErrors, ID } from './reference-books.mjs';
const key = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
export function currentTimeText(source, caret, instant = Date.now(), deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const ast = parse(source), entry = entryAtCaret(ast, caret);
  const declared = entry ? entry.timezoneSource !== 'none' : ast.timezoneDeclared;
  const zone = declared ? entry ? entry.timezone : ast.timezone : deviceZone;
  if (!validTimezone(zone)) throw new Error(declared ? 'Fix the declared entry/document timezone before inserting a current timestamp.' : 'The browser timezone is unavailable. Set a document or entry timezone before inserting a current timestamp.');
  return { text: timestampAt(instant, zone), zone, source: declared ? entry?.timezoneSource || 'document' : 'device' };
}
export function capturedPlace(position) {
  const coords = position.coords;
  if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude) || !Number.isFinite(position.timestamp)) throw new Error('The browser returned an incomplete location.');
  const values = { label: 'Captured location', latitude: String(coords.latitude), longitude: String(coords.longitude), 'captured-at': new Date(position.timestamp).toISOString(), source: 'browser-geolocation' };
  if (Number.isFinite(coords.accuracy) && coords.accuracy >= 0) values['accuracy-m'] = String(coords.accuracy);
  if (Number.isFinite(coords.altitude)) values['altitude-m'] = String(coords.altitude);
  const errors = locationErrors(values); if (errors.length) throw new Error(errors.join(' '));
  return values;
}
export function locationNote(values, id = 'place-capture-' + key()) {
  if (!ID.test(id) || !String(values.latitude ?? '').trim() || !String(values.longitude ?? '').trim() || locationErrors(values).length) throw new Error('Valid location coordinates and a stable ID are required.');
  const fields = new Set(['label', 'latitude', 'longitude', 'accuracy-m', 'altitude-m', 'captured-at', 'source']);
  return [':::record place #' + id, ...Object.entries(values).filter(([name]) => fields.has(name)).map(([name, value]) => name + ': ' + String(value).replace(/[\r\n]/g, ' ')), ':::'].join('\n');
}
export function setupEditorCapture({ editor, status, referenceBooks }) {
  const $ = (id) => document.getElementById(id), dialog = $('locationCaptureDialog');
  let generation = 0, values = null, snapshot = '', start = 0, end = 0;
  const insert = (text, a, b) => {
    editor.focus(); editor.setSelectionRange(a, b);
    if (editor.jotApplyEdit) editor.jotApplyEdit({ start: a, end: b, text });
    else if (!document.execCommand || !document.execCommand('insertText', false, text)) { editor.setRangeText(text, a, b, 'end'); editor.dispatchEvent(new Event('input', { bubbles: true })); }
  };
  $('currentTimeBtn').onclick = () => {
    try {
      const current = currentTimeText(editor.value, editor.selectionStart);
      insert(current.text, editor.selectionStart, editor.selectionEnd);
      status('Inserted the actual current date/time in ' + current.zone + ' (' + current.source + ' timezone). No existing times were converted.');
    } catch (error) { status(error.message, true); }
  };
  const say = (text) => { $('locationCaptureStatus').textContent = text; };
  $('locationCaptureBtn').onclick = () => {
    generation++; values = null; snapshot = editor.value; start = editor.selectionStart; end = editor.selectionEnd;
    $('locationCapturePreview').textContent = ''; $('locationCaptureInsert').disabled = $('locationCaptureSave').disabled = true;
    $('locationCaptureGet').disabled = false;
    say('Request your location to review coordinates, or close and enter a place manually.'); dialog.showModal();
  };
  $('locationCaptureGet').onclick = () => {
    if (!window.isSecureContext || !navigator.geolocation) { say('Location needs HTTPS or localhost and a browser with geolocation enabled. You can enter coordinates manually in People & Places.'); return; }
    const request = ++generation; values = null;
    $('locationCaptureGet').disabled = true; $('locationCaptureInsert').disabled = $('locationCaptureSave').disabled = true;
    $('locationCapturePreview').textContent = '';
    say('Waiting for the browser’s location permission and a one-time position…');
    navigator.geolocation.getCurrentPosition((position) => {
      if (request !== generation || !dialog.open) return;
      try {
        values = capturedPlace(position);
        $('locationCapturePreview').textContent = 'Latitude: ' + values.latitude + '\nLongitude: ' + values.longitude + '\nAccuracy: ' + (values['accuracy-m'] ? values['accuracy-m'] + ' metres' : 'not supplied') + (values['altitude-m'] ? '\nElevation: ' + values['altitude-m'] + ' metres' : '') + '\nCaptured: ' + values['captured-at'];
        say('Review the position. No street address or timezone was inferred. Nothing has been added to your journal.');
        $('locationCaptureInsert').disabled = $('locationCaptureSave').disabled = false;
      } catch (error) { say(error.message); }
      $('locationCaptureGet').disabled = false;
    }, (error) => {
      if (request !== generation || !dialog.open) return;
      $('locationCaptureGet').disabled = false;
      say(error.code === 1 ? 'Location permission was denied. You can enter a place manually in People & Places.' : error.code === 3 ? 'Location request timed out. Try again or enter a place manually.' : 'Location is unavailable. Try again or enter a place manually.');
    }, { enableHighAccuracy: $('locationCapturePrecise').checked, timeout: 15000, maximumAge: 0 });
  };
  $('locationCaptureInsert').onclick = () => {
    if (!values) return;
    if (snapshot !== editor.value) { say('Your journal changed. Close and reopen Capture location to choose the insertion point again, or save this location as a place.'); return; }
    const text = locationNote(values), before = start && editor.value[start - 1] !== '\n' ? '\n\n' : '', after = editor.value[end] === '\n' ? '\n' : '\n\n';
    dialog.close(); insert(before + text + after, start, end);
    status('Inserted the reviewed coordinates as a place record. They will be included when you share this journal.');
  };
  $('locationCaptureSave').onclick = () => { if (!values) return; const draft = { ...values }; dialog.close(); referenceBooks.draftPlace(draft); };
  $('locationCaptureClose').onclick = () => { dialog.close(); editor.focus(); };
  dialog.addEventListener('close', () => { generation++; values = null; $('locationCapturePreview').textContent = ''; });
}
