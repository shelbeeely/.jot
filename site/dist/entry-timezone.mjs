import { parse } from './jot/jot.mjs';
import { entryAtCaret, setEntryTimezone, validTimezone } from './jot/timezone.mjs';
export function setupEntryTimezone({ editor, rewrite, status }) {
  const $ = (id) => document.getElementById(id), dialog = $('entryTimezoneDialog');
  let snapshot = '', caret = 0;
  const zones = new Set(['UTC']);
  try { for (const zone of Intl.supportedValuesOf('timeZone')) zones.add(zone); } catch { /* text entry still works */ }
  for (const zone of zones) { const option = document.createElement('option'); option.value = zone; $('entryTimezoneZones').append(option); }
  $('entryTimezoneBtn').onclick = () => {
    caret = editor.selectionStart; snapshot = editor.value;
    const ast = parse(snapshot), entry = entryAtCaret(ast, caret);
    if (!entry) { status('Place your cursor inside a dated entry before setting its timezone.', true); editor.focus(); return; }
    $('entryTimezoneHeading').textContent = 'Timezone for ' + entry.date;
    $('entryTimezoneDefault').textContent = ast.timezoneDeclared ? 'Document default: ' + (ast.timezone || 'unresolved (' + ast.timezoneRaw + ')') : 'No document timezone is declared. Times remain unresolved until you supply one.';
    $('entryTimezoneValue').value = entry.timezoneSource === 'entry' ? entry.timezoneRaw : '';
    $('entryTimezoneStatus').textContent = 'This affects only this entry. Your written date and times stay unchanged.';
    dialog.showModal(); $('entryTimezoneValue').focus();
  };
  const apply = (zone) => {
    if (editor.value !== snapshot) { $('entryTimezoneStatus').textContent = 'The journal changed. Close and reopen this dialog at the entry you want.'; return; }
    try {
      if (zone && !validTimezone(zone)) throw new Error('Use a recognised IANA timezone such as Europe/London, or UTC.');
      const result = setEntryTimezone(parse(snapshot), caret, zone);
      dialog.close(); rewrite(result.source, zone ? 'Set this entry’s timezone to ' + zone + '. Written times are unchanged.' : 'This entry now uses the document timezone default.');
      editor.focus(); editor.setSelectionRange(result.caret, result.caret);
    } catch (error) { $('entryTimezoneStatus').textContent = error.message; }
  };
  $('entryTimezoneForm').onsubmit = (event) => { event.preventDefault(); const zone = $('entryTimezoneValue').value.trim(); if (!zone) { $('entryTimezoneStatus').textContent = 'Choose a timezone, or use the document default button.'; return; } apply(zone); };
  $('entryTimezoneInherit').onclick = () => apply('');
  $('entryTimezoneClose').onclick = () => { dialog.close(); editor.focus(); };
}
