// Margin notes (spec 4.2.8): a short note beside a passage, written as a [[...]] line after it.
import { marginNoteEdit, applyWritingEdit } from './writing-tools.mjs';

export function setupMarginNotes({ editor, status = () => {} }) {
  const doc = editor.ownerDocument;
  const dialog = doc.createElement('dialog');
  dialog.id = 'marginNoteDialog'; dialog.className = 'writer-small-dialog'; dialog.setAttribute('aria-labelledby', 'marginNoteTitle');
  // Static markup only; the note is read from the input's value.
  dialog.innerHTML = `<form id="marginNoteForm" method="dialog"><div class="dialog-header"><h2 id="marginNoteTitle">Margin note</h2><button id="marginNoteClose" class="icon-button" type="button" aria-label="Close margin note">✕</button></div>
<p id="marginNoteFor" class="small"></p>
<label for="marginNoteText">Note</label><input id="marginNoteText" maxlength="500" autocomplete="off" aria-describedby="marginNoteHelp">
<p id="marginNoteHelp" class="small">One line. It sits beside the passage on the page and never changes your words. To draw or write by hand over a page, use Draw on a page.</p>
<p id="marginNoteStatus" role="status" aria-live="polite"></p>
<div class="writer-small-actions"><button class="button primary" type="submit">Add margin note</button><button id="marginNoteDraw" class="quiet" type="button">Draw on a page…</button></div></form>`;
  doc.body.append(dialog);
  const button = doc.createElement('button');
  button.id = 'marginNoteBtn'; button.type = 'button'; button.className = 'quiet'; button.textContent = 'Margin note';
  button.title = 'A short note beside the passage at your cursor';
  doc.querySelector('.tool-row')?.append(button);
  const $ = id => dialog.querySelector('#' + id);
  let caret = 0, snapshot = '';
  function open() {
    if (editor.readOnly) { status('Unlock this journal to add a margin note.'); return; }
    caret = editor.selectionEnd; snapshot = editor.value;
    const line = snapshot.slice(snapshot.lastIndexOf('\n', caret - 1) + 1, (snapshot.indexOf('\n', caret) + 1 || snapshot.length + 1) - 1).trim();
    const chosen = snapshot.slice(editor.selectionStart, editor.selectionEnd).trim();
    $('marginNoteFor').textContent = (chosen || line) ? 'Beside: “' + (chosen || line).slice(0, 90) + ((chosen || line).length > 90 ? '…' : '') + '”' : 'Beside the line at your cursor.';
    $('marginNoteText').value = ''; $('marginNoteStatus').textContent = '';
    dialog.showModal(); $('marginNoteText').focus();
  }
  $('marginNoteForm').onsubmit = event => {
    event.preventDefault();
    if (editor.value !== snapshot) { $('marginNoteStatus').textContent = 'The journal changed. Close this and choose the passage again.'; return; }
    const edit = marginNoteEdit(snapshot, caret, $('marginNoteText').value);
    if (!edit) { $('marginNoteStatus').textContent = 'Write the note first.'; $('marginNoteText').focus(); return; }
    dialog.close();
    applyWritingEdit(editor, edit);
    status('Added a margin note. Undo removes it.');
  };
  $('marginNoteClose').onclick = () => { dialog.close(); editor.focus(); };
  $('marginNoteDraw').onclick = () => { dialog.close(); doc.getElementById('writerAnnotateBtn')?.click(); };
  button.onclick = () => open();
  return { open };
}
