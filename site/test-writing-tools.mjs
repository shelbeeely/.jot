import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writingEdit, continueListEdit, applyWritingEdit, setupWritingTools } from './dist/writing-tools.mjs';

function apply(source, replacement) {
  if (!replacement) return source;
  return source.slice(0, replacement.start) + replacement.text + source.slice(replacement.end);
}
test('inline tools wrap and toggle selected Unicode, keep a useful selection, and leave empty markers ready for typing', () => {
  const source = 'Hello 🌻 friend';
  const wrapped = writingEdit(source, 6, 8, 'bold');
  assert.equal(apply(source, wrapped), 'Hello **🌻** friend');
  assert.equal(apply(source, wrapped).slice(wrapped.selectionStart, wrapped.selectionEnd), '🌻');
  const toggled = writingEdit(apply(source, wrapped), wrapped.selectionStart, wrapped.selectionEnd, 'bold');
  assert.equal(apply(apply(source, wrapped), toggled), source);
  assert.equal(apply('**words**', writingEdit('**words**', 0, 9, 'bold')), 'words');
  const blank = writingEdit('', 0, 0, 'italic');
  assert.deepEqual(blank, { start: 0, end: 0, text: '**', selectionStart: 1, selectionEnd: 1 });
  const link = writingEdit('name', 0, 4, 'link');
  assert.equal(apply('name', link), '[name]()'); assert.equal(link.selectionStart, 7);
  const label = 'A [name] \\ suffix';
  assert.equal(apply(label, writingEdit(label, 0, label.length, 'link')), '[A \\[name\\] \\\\ suffix]()');
  assert.equal(writingEdit('one\ntwo', 0, 7, 'link'), null);
  assert.equal(apply('a`b', writingEdit('a`b', 0, 3, 'code')), '``a`b``');
  assert.equal(apply('`one`', writingEdit('`one`', 1, 4, 'code')), 'one');
  assert.equal(apply('``a`b``', writingEdit('``a`b``', 0, 7, 'code')), 'a`b');
  assert.equal(apply('``a`b``', writingEdit('``a`b``', 2, 5, 'code')), 'a`b');
  assert.equal(apply('`` `a` ``', writingEdit('`` `a` ``', 0, 9, 'code')), '`a`');
});
test('block tools preserve BOM, CRLF, blank lines, trailing boundaries, and convert only selected lines', () => {
  const source = '\uFEFFfirst\r\nsecond\r\nthird';
  const result = writingEdit(source, 1, 16, 'bullet');
  assert.equal(apply(source, result), '\uFEFF- first\r\n- second\r\nthird');
  assert.equal(apply(source, result).slice(result.selectionStart, result.selectionEnd), 'first\r\n- second\r\n');
  const all = 'one\n\ntwo';
  assert.equal(apply(all, writingEdit(all, 0, all.length, 'number')), '1. one\n\n2. two');
  assert.equal(apply('- one\n+ two', writingEdit('- one\n+ two', 0, 11, 'bullet')), 'one\ntwo');
  assert.equal(apply('  - [x] Done', writingEdit('  - [x] Done', 8, 8, 'task')), '  Done');
  assert.equal(apply('  > Quote', writingEdit('  > Quote', 6, 6, 'heading')), '  ## Quote');
  assert.equal(apply('\nText', writingEdit('\nText', 0, 0, 'heading')), '## \nText');
  assert.equal(writingEdit('Text', 0, 0, 'unknown'), null);
});
test('indent/outdent changes selected lines without consuming adjacent lines or splitting Unicode', () => {
  const source = '🌻\nline\nnext';
  let result = writingEdit(source, 0, 8, 'indent');
  assert.equal(apply(source, result), '  🌻\n  line\nnext');
  const indented = apply(source, result);
  result = writingEdit(indented, 2, 12, 'outdent');
  assert.equal(apply(indented, result), source);
  assert.equal(apply('\tOne\n Two\n   Three', writingEdit('\tOne\n Two\n   Three', 0, 99, 'outdent')), 'One\nTwo\n Three');
});
test('smart Enter continues Markdown lists and Jot tasks, increments ordered lists, and exits empty items', () => {
  for (const [source, expected] of [
    ['- one', '- one\n- '], ['  + one', '  + one\n  + '],
    ['9) one', '9) one\n10) '], ['009. one', '009. one\n10. '],
    ['[x] Done', '[x] Done\n[ ] '], ['- [!] Task', '- [!] Task\n- [ ] '],
    ['[<] Later', '[<] Later\n[ ] '], ['- [<] Later', '- [<] Later\n- [ ] '],
    ['> Thought', '> Thought\n> '], ['> > Thought', '> > Thought\n> > '],
    ['- ', ''], ['  [ ] ', '  '], ['> ', ''], ['\uFEFF- ', '\uFEFF']
  ]) assert.equal(apply(source, continueListEdit(source, source.length)), expected, source);
  const middle = '- before after';
  assert.equal(apply(middle, continueListEdit(middle, 9)), '- before \n- after');
  const crlf = 'line\r\n- one';
  assert.equal(apply(crlf, continueListEdit(crlf, crlf.length)), 'line\r\n- one\r\n- ');
});
test('smart Enter avoids code fences, escaped lists, prose, selections, unsafe numbering and marker interiors', () => {
  for (const source of ['```jot\n- example', '~~~\n> example', '\\- text', 'ordinary prose', '9007199254740991. item', '[~] unsupported', '[?] unsupported']) {
    assert.equal(continueListEdit(source, source.length), null, source);
  }
  assert.equal(continueListEdit('- text', 0), null);
  assert.equal(continueListEdit('- text', 2, 3), null);
  const closed = '```\n- example\n```\n- outside';
  assert.equal(apply(closed, continueListEdit(closed, closed.length)), closed + '\n- ');
});
test('structural continuation leaves hidden comments, record bodies and metadata literal, including nested-looking openers', () => {
  for (const source of ['/*\n- hidden', ':::record note\nbody: |\n  - literal', '---\n- metadata', '/*\n```\n- hidden', ':::record note\n/*\n- literal']) {
    assert.equal(continueListEdit(source, source.length), null, source);
  }
  for (const source of ['/*\n- hidden\n*/\n- visible', ':::record note\nbody: hidden\n:::\n- visible', '---\nTitle: Draft\n---\n- visible']) {
    assert.equal(apply(source, continueListEdit(source, source.length)), source + '\n- ', source);
  }
});
function fakeEditor(value, native = false) {
  const handlers = new Map(), dispatched = [];
  const editor = {
    value, selectionStart: value.length, selectionEnd: value.length,
    ownerDocument: { defaultView: { Event, localStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } } },
    focus() {}, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
    setRangeText(text, start, end) { this.value = this.value.slice(0, start) + text + this.value.slice(end); },
    dispatchEvent(event) { dispatched.push(event.type); },
    addEventListener(name, handler) { handlers.set(name, handler); }
  };
  if (native) editor.ownerDocument.execCommand = (_command, _show, text) => {
    editor.setRangeText(text, editor.selectionStart, editor.selectionEnd); editor.dispatchEvent(new Event('input')); return true;
  };
  return { editor, handlers, dispatched };
}
test('editing uses native undo when available and emits input on fallback', () => {
  for (const native of [false, true]) {
    const { editor, dispatched } = fakeEditor('Word', native);
    const replacement = writingEdit('Word', 0, 4, 'bold');
    assert.equal(applyWritingEdit(editor, replacement), true);
    assert.equal(editor.value, '**Word**'); assert.deepEqual(dispatched, ['input']);
    assert.equal(editor.selectionStart, 2); assert.equal(editor.selectionEnd, 6);
    assert.equal(applyWritingEdit(editor, null), false);
  }
});
test('keyboard structural automation respects IME, autocomplete precedence, Shift Enter and disabled preference', () => {
  const { editor, handlers } = fakeEditor('- item');
  const tools = setupWritingTools({ editor });
  const keydown = (extra = {}) => {
    const event = { key: 'Enter', preventDefault() { this.defaultPrevented = true; }, ...extra };
    handlers.get('keydown')(event); return event;
  };
  assert.equal(tools.smartLists, true);
  keydown({ defaultPrevented: true }); keydown({ isComposing: true }); keydown({ shiftKey: true });
  handlers.get('compositionstart')(); keydown(); handlers.get('compositionend')();
  assert.equal(editor.value, '- item');
  tools.setSmartLists(false); keydown(); assert.equal(editor.value, '- item');
  tools.setSmartLists(true); assert.equal(keydown().defaultPrevented, true); assert.equal(editor.value, '- item\n- ');
  const prose = fakeEditor('Text'); setupWritingTools({ editor: prose.editor });
  const tab = { key: 'Tab', preventDefault() { this.defaultPrevented = true; } };
  prose.handlers.get('keydown')(tab); assert.equal(tab.defaultPrevented, undefined);
});
test('mobile line-break beforeinput continues lists without intercepting composition, unpreventable events, or Shift Enter', () => {
  const { editor, handlers } = fakeEditor('- mobile'); setupWritingTools({ editor });
  const beforeinput = (extra = {}) => {
    const event = { inputType: 'insertLineBreak', cancelable: true, preventDefault() { this.defaultPrevented = true; }, ...extra };
    handlers.get('beforeinput')(event); return event;
  };
  beforeinput({ isComposing: true }); beforeinput({ cancelable: false }); beforeinput({ defaultPrevented: true });
  assert.equal(editor.value, '- mobile');
  handlers.get('keydown')({ key: 'Enter', shiftKey: true }); beforeinput(); assert.equal(editor.value, '- mobile');
  assert.equal(beforeinput().defaultPrevented, true); assert.equal(editor.value, '- mobile\n- ');
});
