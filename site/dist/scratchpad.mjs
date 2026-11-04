// The scratchpad beside an entry: rough notes first, then the entry itself. The notes are a ~~~draft block in the
// entry (spec 4.2.7), saved with the journal and left off the formatted page. Typing here edits that block through
// the editor's normal edit path, so Undo, autosave and protection apply.
import { parse } from './jot/jot.mjs';
import { scratchpadAt, setScratchpad, addToEntry } from './scratchpad-core.mjs';

export function setupScratchpad({ editor, status = () => {}, speakInto = null, today = () => '' }) {
  const doc = editor.ownerDocument, win = doc.defaultView;
  const panel = doc.createElement('section');
  panel.id = 'scratchpad'; panel.className = 'scratch'; panel.setAttribute('aria-labelledby', 'scratchTitle'); panel.hidden = true;
  // Static markup only; the draft is set with value and the date with textContent.
  panel.innerHTML = `<div class="scratch-head"><h2 id="scratchTitle">Scratchpad</h2><span id="scratchDate" class="scratch-date"></span><button id="scratchClose" class="scratch-close" type="button" aria-label="Close the scratchpad">✕</button></div>
<p class="scratch-help">Rough notes for this entry. They are saved with it but stay off the page and out of print. When you are ready, add what you want to keep to the entry.</p>
<label class="sr-only" for="scratchText">Scratchpad</label><textarea id="scratchText" rows="8" spellcheck="true" placeholder="Anything goes: half sentences, lists, reminders."></textarea>
<div class="scratch-actions"><button id="scratchAdd" class="scratch-primary" type="button">Add to entry</button><button id="scratchSpeak" type="button" hidden>Talk into it</button><button id="scratchClear" type="button">Clear scratchpad</button></div>
<p id="scratchStatus" class="scratch-status" role="status" aria-live="polite"></p>`;
  (doc.querySelector('.writing-pane') || doc.body).append(panel);
  const button = doc.createElement('button');
  button.id = 'scratchpadBtn'; button.type = 'button'; button.className = 'quiet'; button.title = 'Rough notes beside this entry, kept off the page'; button.textContent = 'Scratchpad';
  doc.querySelector('.tool-row')?.append(button);
  const $ = id => panel.querySelector('#' + id), text = $('scratchText'), root = doc.documentElement;
  let date = '', nth = 0, timer = 0, ours = false, clearArmed = 0;
  const say = words => { $('scratchStatus').textContent = words; };
  const undoable = () => editor.jotUndo ? ' Undo brings it back.' : '';

  // Which entry: its date and which one of that date, so edits elsewhere in the journal do not lose it.
  function locate() {
    const ast = parse(editor.value), same = ast.entries.filter(e => e.date === date), entry = same[nth] || same[0];
    if (!entry) return -1;
    const heading = ast.nodes[entry.startNode];
    return new TextDecoder().decode(new TextEncoder().encode(ast.source).slice(0, heading.end)).length;
  }
  // Typing in the scratchpad joins one undo step per burst; adding to the entry is always its own step.
  function apply(edit, group = 'scratchpad') {
    if (!edit) return;
    const shift = edit.text.length - (edit.end - edit.start);
    const keep = [editor.selectionStart, editor.selectionEnd].map(at => at >= edit.end ? at + shift : at > edit.start ? edit.start : at);
    ours = true;
    try {
      if (editor.jotApplyEdit) editor.jotApplyEdit({ ...edit, selectionStart: keep[0], selectionEnd: keep[1] }, { focus: false, group });
      else { editor.setRangeText(edit.text, edit.start, edit.end, 'preserve'); editor.setSelectionRange(keep[0], keep[1]); editor.dispatchEvent(new win.Event('input', { bubbles: true })); }
    } finally { ours = false; }
  }
  function save() {
    win.clearTimeout(timer); timer = 0;
    if (editor.readOnly) { say('The journal is locked. Unlock it to keep editing.'); return; }
    const at = locate();
    if (at < 0) { say('This entry is no longer in the journal, so the scratchpad was not saved. Copy anything you need.'); return; }
    try { apply(setScratchpad(editor.value, at, text.value)); say(text.value.trim() ? 'Saved with the entry.' : 'Scratchpad empty.'); }
    catch (e) { say(e.message); }
  }
  function refresh() {
    const at = locate(), current = at < 0 ? null : scratchpadAt(editor.value, at);
    if (current && doc.activeElement !== text && current.text !== text.value) text.value = current.text;
  }

  function open({ focus = true } = {}) {
    if (editor.readOnly) { status('Unlock this journal to use the scratchpad.'); return null; }
    const caret = editor.selectionStart, current = scratchpadAt(editor.value, caret);
    if (!current) { status('Put the cursor in a dated entry to open its scratchpad. Today ＋ adds one for today.'); return null; }
    const ast = parse(editor.value), bytes = new TextEncoder().encode(ast.source).length;
    const here = ast.entries.filter(e => e.date === current.date);
    const byteCaret = new TextEncoder().encode(editor.value.slice(0, caret)).length;
    nth = Math.max(0, here.findIndex(e => byteCaret >= ast.nodes[e.startNode].start && (e.endNode >= ast.nodes.length ? byteCaret <= bytes : byteCaret < ast.nodes[e.endNode].start)));
    date = current.date; text.value = current.text;
    $('scratchDate').textContent = current.date; text.setAttribute('aria-label', 'Scratchpad for ' + current.date);
    // Talking into it works for today's entry, where the scribe writes.
    $('scratchSpeak').hidden = !speakInto || current.date !== today();
    panel.hidden = false; root.toggleAttribute('data-scratch-open', true);
    say(current.exists ? '' : 'Nothing here yet.');
    if (focus) text.focus();
    return current.date;
  }
  function close() { if (timer) save(); panel.hidden = true; root.removeAttribute('data-scratch-open'); disarm(); }
  function reset() { win.clearTimeout(timer); timer = 0; text.value = ''; date = ''; panel.hidden = true; root.removeAttribute('data-scratch-open'); disarm(); say(''); }
  function disarm() { win.clearTimeout(clearArmed); clearArmed = 0; $('scratchClear').textContent = 'Clear scratchpad'; $('scratchClear').classList.remove('scratch-danger'); }

  text.addEventListener('input', () => { win.clearTimeout(timer); timer = win.setTimeout(save, 400); say('Saving…'); });
  text.addEventListener('blur', () => { if (timer) save(); });
  editor.addEventListener('input', () => { if (!ours && !panel.hidden) refresh(); });
  $('scratchAdd').onclick = () => {
    if (timer) save();
    const chosen = text.value.slice(text.selectionStart, text.selectionEnd).trim(), words = chosen || text.value.trim();
    if (!words) { say('Write something in the scratchpad first.'); text.focus(); return; }
    const at = locate();
    if (at < 0) { say('This entry is no longer in the journal.'); return; }
    apply(addToEntry(editor.value, at, words), '');
    say((chosen ? 'Added the selected words' : 'Added the scratchpad') + ' to the end of the entry. The scratchpad keeps them until you clear it.' + (editor.jotUndo ? ' Undo removes them.' : ''));
    status('Added to the ' + date + ' entry from its scratchpad.');
  };
  $('scratchClear').onclick = () => {
    if (!text.value.trim()) { say('The scratchpad is already empty.'); return; }
    if (!clearArmed) { $('scratchClear').textContent = 'Clear it? Press again'; $('scratchClear').classList.add('scratch-danger'); clearArmed = win.setTimeout(disarm, 5000); return; }
    disarm(); text.value = ''; save(); say('Cleared.' + undoable());
  };
  $('scratchSpeak').onclick = () => { if (timer) save(); speakInto?.(date); };
  $('scratchClose').onclick = () => { close(); editor.focus(); };
  button.onclick = () => open();
  return { open, close, reset, refresh, get date() { return panel.hidden ? '' : date; } };
}
