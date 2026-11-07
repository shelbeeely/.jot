// Stickers and stamps placed freely (spec 13.31): the renderer's reading of a sticker record's placement fields.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from './jot.mjs';
import { stickerOf, STICKER_METHOD } from './preview.mjs';

const sticker = (fields) => stickerOf(parse(`:::record attachment #s\nmethod: ${STICKER_METHOD}\npath: assets/stickers/x/bus.png\nmedia-type: image/png\nalt: Bus\nrole: functional\n${fields}:::\n`).nodes.find((n) => n.type === 'record'));

test('a sticker without a place sits where it is written, at the standard size', () => {
  assert.deepEqual(sticker(''), { path: 'assets/stickers/x/bus.png', alt: 'Bus', role: 'functional', finish: 'sticker', width: 4, rotate: 0, x: null, y: null, layer: 0, problems: [], placed: false });
});
test('x, y, width, rotate, finish and layer place it freely', () => {
  const s = sticker('x: 72.5%\ny: -3em\nwidth: 6em\nrotate: -12deg\nfinish: stamp\nlayer: 2\n');
  assert.deepEqual([s.placed, s.x, s.y, s.width, s.rotate, s.finish, s.layer, s.problems], [true, 72.5, -3, 6, -12, 'stamp', 2, []]);
});
test('a value outside its range is named and not used; one of x and y alone is not a place', () => {
  const s = sticker('x: 140%\ny: 2em\nwidth: 0.5em\nrotate: 10\nfinish: glitter\nlayer: top\n');
  assert.equal(s.placed, false); assert.equal(s.width, 4); assert.equal(s.rotate, 0); assert.equal(s.finish, 'sticker');
  assert.deepEqual(s.problems, ['x must be 0% to 100%', 'width must be 1em to 20em', 'rotate must be -180deg to 180deg', 'finish must be sticker or stamp', 'layer must be a whole number from -99 to 99']);
  assert.deepEqual(sticker('y: 2em\n').problems, ['a free place needs both x and y']);
});
test('other attachment records are not stickers; the source is kept byte for byte', () => {
  assert.equal(stickerOf(parse(':::record attachment\npath: assets/a.png\n:::\n').nodes[0]), null);
  const src = `# 2026-11-07\n\n:::record attachment #s\nmethod: ${STICKER_METHOD}\npath: assets/a.png\nmedia-type: image/png\nalt: A\nrole: decorative\nx: 10%\ny: 0em\n:::\n`;
  assert.equal(parse(src).nodes.map((n) => n.raw).join(''), src);
});
