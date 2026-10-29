import test from 'node:test';
import assert from 'node:assert/strict';
import { templateSource, templateInsertion } from './dist/writer-templates.mjs';
import { parse } from './dist/jot/jot.mjs';

test('writing templates are valid undated Jot prompts with no fabricated entries', () => {
  for (const kind of ['daily', 'weekly', 'monthly', 'meeting', 'freewriting']) {
    const source = templateSource(kind), ast = parse(source);
    assert.deepEqual(ast.diagnostics, [], kind);
    assert.equal(ast.entries.length, 0, kind + ' does not create a dated entry');
    assert.equal(ast.nodes.filter(item => item.type === 'record' || item.type === 'event').length, 0);
    assert.doesNotMatch(source, /\d{4}-\d{2}-\d{2}|@timezone:|latitude:|created-at:/);
    assert.match(source, /^#### /);
  }
  assert.throws(() => templateSource('unknown'), /Choose/);
});

test('template insertion preserves existing writing and adds only needed blank boundaries', () => {
  assert.deepEqual(templateInsertion('beforeafter', 6, '\n#### Notes\n'), { text: 'before\n\n#### Notes\n\nafter', insertion: '\n\n#### Notes\n\n', start: 6, end: 6, caret: 20 });
  const source = 'before\n\nafter', at = 'before\n\n'.length;
  assert.equal(templateInsertion(source, at, '#### Notes').text, 'before\n\n#### Notes\n\nafter');
  assert.equal(templateInsertion('before\n\nafter', 6, '#### Notes').text, 'before\n\n#### Notes\n\nafter');
  assert.equal(templateInsertion('', 0, '[ ] ').text, '[ ] \n\n', 'keeps the space after a blank task marker');
  assert.equal(templateInsertion('😀', 2, '#### Notes').text, '😀\n\n#### Notes\n\n');
});

test('template insertion keeps the document BOM and newline convention', () => {
  assert.equal(templateInsertion('\ufefftext\r\n', 0, '\ufeff#### Notes\n\nPrompt\n').text, '\ufeff#### Notes\r\n\r\nPrompt\r\n\r\ntext\r\n');
  const result = templateInsertion('first\r\n\r\nlast', 9, '#### Notes\n\n[ ] ');
  assert.equal(result.text, 'first\r\n\r\n#### Notes\r\n\r\n[ ] \r\n\r\nlast');
  assert.equal(result.text.replace(/\r\n/g, '').includes('\n'), false);
  assert.equal(templateInsertion('\ufeff', 0, '#### Notes').start, 1);
  assert.equal(templateInsertion('a\rb', 2, 'Note').text, 'a\r\rNote\r\rb');
});

test('template insertion rejects empty prompts and invalid insertion points', () => {
  for (const template of ['', ' \n ', '\ufeff\r\n']) assert.throws(() => templateInsertion('abc', 1, template), /prompts/);
  for (const position of [-1, 4, 0.5, NaN]) assert.throws(() => templateInsertion('abc', position, 'Notes'), /insertion point/);
});
