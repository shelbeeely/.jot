import { parse } from './jot/jot.mjs';

const templates = [
  { id: 'daily', label: 'Daily reflection', text: '#### Daily reflection\n\n##### What happened?\n\n\n##### How am I feeling?\n\n\n##### What would help tomorrow?\n\n[ ] ' },
  { id: 'weekly', label: 'Weekly recap', text: '#### Weekly recap\n\n##### What stood out this week?\n\n\n##### What worked?\n\n\n##### What was difficult?\n\n\n##### What do I want to carry forward?\n\n[ ] ' },
  { id: 'monthly', label: 'Monthly recap', text: '#### Monthly recap\n\n##### What do I want to remember?\n\n\n##### What patterns did I notice?\n\n\n##### What changed?\n\n\n##### What would I like to focus on next month?\n\n[ ] ' },
  { id: 'meeting', label: 'Meeting notes', text: '#### Meeting notes\n\n##### People\n\n\n##### Topics\n\n- \n\n##### Notes\n\n\n##### Decisions\n\n\n##### Next actions\n\n[ ] ' },
  { id: 'freewriting', label: 'Freewriting', text: '#### Freewriting\n\n##### What is on my mind?\n\n\n##### What would I like to explore?\n\n' }
];

export function templateSource(kind) {
  const template = templates.find(item => item.id === kind);
  if (!template) throw new Error('Choose a writing template.');
  return template.text;
}

const newlineCount = text => (text.match(/\r\n|\r|\n/g) || []).length;
export function templateInsertion(source, position, template) {
  if (!Number.isInteger(position) || position < 0 || position > source.length) throw new Error('The insertion point is outside the writing.');
  const eol = source.includes('\r\n') ? '\r\n' : source.includes('\r') && !source.includes('\n') ? '\r' : '\n';
  const body = template.replace(/^\ufeff/, '').replace(/\r\n|\r/g, '\n').replace(/^\n+|\n+$/g, '').replace(/\n/g, eol);
  if (!body.trim()) throw new Error('Write or choose some prompts before inserting.');
  // Keep a document BOM at the beginning even when its caret was positioned at zero.
  const start = source.startsWith('\ufeff') && position === 0 ? 1 : position;
  const left = source.slice(0, start), right = source.slice(start), visibleLeft = left.replace(/^\ufeff/, '');
  const before = visibleLeft ? eol.repeat(Math.max(0, 2 - newlineCount(visibleLeft.match(/[\r\n]*$/)?.[0] || ''))) : '';
  const after = eol.repeat(Math.max(0, 2 - newlineCount(right.match(/^[\r\n]*/)?.[0] || '')));
  const insertion = before + body + after;
  return { text: left + insertion + right, insertion, start, end: start, caret: start + insertion.length };
}

export function setupWriterTemplates({ editor, status = () => {} }) {
  const node = (tag, text, className) => { const result = document.createElement(tag); if (text) result.textContent = text; if (className) result.className = className; return result; };
  const dialog = node('dialog', '', 'writer-dialog writer-templates-dialog'); dialog.id = 'writerTemplatesDialog'; dialog.setAttribute('aria-labelledby', 'writerTemplatesHeading');
  const header = node('div', '', 'dialog-header'), heading = node('h2', 'Writing templates'); heading.id = 'writerTemplatesHeading';
  const close = node('button', '✕', 'icon-button'); close.id = 'writerTemplateClose'; close.type = 'button'; close.setAttribute('aria-label', 'Close writing templates'); header.append(heading, close); dialog.append(header);
  dialog.append(node('p', 'Choose blank prompts, then edit them before inserting. Dates, answers, timestamps and locations are left for you to add.', 'small'));
  const kindLabel = node('label', 'Template'), kind = node('select'); kind.id = 'writerTemplateKind';
  for (const template of templates) { const option = node('option', template.label); option.value = template.id; kind.append(option); }
  kindLabel.append(kind); dialog.append(kindLabel);
  const sourceLabel = node('label', 'Review and edit the Jot source'), source = node('textarea'); source.id = 'writerTemplateSource'; source.rows = 14; source.spellcheck = true; sourceLabel.append(source); dialog.append(sourceLabel);
  const message = node('p', '', 'small'); message.id = 'writerTemplateStatus'; message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite'); dialog.append(message);
  const insert = node('button', 'Insert prompts', 'button primary'); insert.id = 'writerTemplateInsert'; insert.type = 'button'; dialog.append(insert); document.body.append(dialog);
  let snapshot = '', position = 0;
  kind.onchange = () => { source.value = templateSource(kind.value); insert.disabled = false; message.textContent = 'Review the prompts. Insert adds them at the captured caret, after any selected writing.'; };
  source.addEventListener('input', () => { insert.disabled = !source.value.trim(); });
  close.onclick = () => dialog.close(); dialog.addEventListener('close', () => editor.focus());
  insert.onclick = () => {
    if (editor.value !== snapshot) { message.textContent = 'Your writing changed. Close and reopen templates to choose the insertion point again.'; return; }
    if (!source.value.trim()) { message.textContent = 'Write or choose some prompts before inserting.'; return; }
    const diagnostics = parse(source.value).diagnostics;
    if (diagnostics.length) { message.textContent = 'Fix the template before inserting: ' + diagnostics[0].message; return; }
    try {
      const change = templateInsertion(snapshot, position, source.value);
      const combinedDiagnostics = parse(change.text).diagnostics;
      if (!parse(snapshot).diagnostics.length && combinedDiagnostics.length) { message.textContent = 'This insertion point would create a syntax issue. Close templates and choose a position outside structured blocks.'; return; }
      dialog.close(); editor.focus(); editor.setSelectionRange(change.start, change.end);
      if (editor.jotApplyEdit) editor.jotApplyEdit({ start: change.start, end: change.end, text: change.insertion });
      else if (!document.execCommand || !document.execCommand('insertText', false, change.insertion)) { editor.setRangeText(change.insertion, change.start, change.end, 'end'); editor.dispatchEvent(new Event('input', { bubbles: true })); }
      status('Inserted the reviewed prompts. Undo in the writing removes them in one step.');
    } catch (error) { message.textContent = error.message; }
  };
  const open = () => {
    if (dialog.open) return;
    snapshot = editor.value; position = editor.selectionEnd; kind.onchange(); dialog.showModal(); kind.focus();
  };
  return { open, dialog };
}
