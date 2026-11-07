import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from './dist/jot/jot.mjs';
import { FUNCTIONAL, METHOD, attachedCopy, blockEnd, blockInsertion, builtinPack, labelFromName, packSource, placedRecord, placementValues, readPack, setRecordFields, stickerId, stickerPath, stickerReference } from './dist/sticker-packs-core.mjs';
import { stickerOf } from './dist/jot/preview.mjs';

const png = n => new Uint8Array([137, 80, 78, 71, n]);

test('Jot’s own pack is functional, worded and uses distinct shapes', () => {
  const pack = builtinPack();
  assert.equal(pack.stickers.length, FUNCTIONAL.length);
  assert.ok(pack.stickers.every(s => s.role === 'functional' && s.alt && s.mediaType === 'image/png' && s.path.startsWith('assets/stickers/jot-functional/')));
  assert.equal(new Set(pack.stickers.map(s => s.d)).size, pack.stickers.length);
  assert.equal(new Set(pack.stickers.map(s => s.alt)).size, pack.stickers.length);
  assert.ok(pack.stickers.every(s => /^[MmLlHhVvAaCcSsZz0-9 .,-]+$/.test(s.d)));
  assert.ok(!pack.stickers.some(s => /streak|reward|badge/i.test(s.alt)), 'no reward stickers (research guide, section 25e)');
});

test('a placed sticker is a plain image reference with its words as the description', () => {
  assert.equal(stickerReference('Bus or transit', 'assets/stickers/jot-functional/bus.png'), '![Bus or transit](assets/stickers/jot-functional/bus.png)');
  assert.equal(stickerReference(' a [rain]\ncloud\\ ', 'assets/stickers/mine/rain.png'), '![a rain cloud](assets/stickers/mine/rain.png)');
  assert.throws(() => stickerReference('  ', 'assets/stickers/mine/rain.png'), /few words/);
  assert.throws(() => stickerReference('Rain', 'https://example.com/rain.png'), /path/);
  assert.throws(() => stickerReference('Rain', 'assets/../rain.png'), /path/);
  const image = parse(stickerReference('Rain', 'assets/stickers/mine/rain.png') + ' after rain').nodes[0];
  assert.equal(image.type, 'paragraph');
});

test('sticker paths avoid other attachments and labels come from file names', () => {
  assert.equal(stickerPath('My stickers', 'Rain Cloud'), 'assets/stickers/my-stickers/rain-cloud.png');
  assert.equal(stickerPath('mine', 'rain', new Set(['assets/stickers/mine/rain.png'])), 'assets/stickers/mine/rain-2.png');
  assert.equal(stickerPath('../x', '..'), 'assets/stickers/x/sticker.png');
  assert.equal(labelFromName('rain-cloud_2.png'), 'rain cloud 2');
  assert.equal(labelFromName(''), 'Sticker');
});

test('the same bytes are attached once', () => {
  const assets = [{ path: 'media/a', data: png(1) }, { path: 'assets/stickers/x/b.png', data: png(2) }];
  assert.equal(attachedCopy(assets, png(2)).path, 'assets/stickers/x/b.png');
  assert.equal(attachedCopy(assets, png(3)), null);
});

test('a pack writes sticker records and reads back only what it can show', () => {
  const stickers = [
    { name: 'rain', alt: 'Rain cloud', role: 'decorative', path: 'assets/stickers/mine/rain.png', mediaType: 'image/png', data: png(1) },
    { name: 'rain', alt: 'Rain\nagain', role: 'functional', path: 'assets/stickers/mine/rain-2.png', mediaType: 'image/png', data: png(2), license: 'CC0-1.0' }
  ];
  const source = packSource({ title: 'My stickers', stickers, creator: 'Me' });
  assert.match(source, /^# My stickers\n/);
  assert.equal(parse(source).diagnostics.filter(d => d.severity === 'error').length, 0);
  assert.match(source, /:::record attachment #sticker-rain\n/); assert.match(source, /#sticker-rain-2\n/);
  assert.match(source, new RegExp(`method: ${METHOD.replace(/[.@]/g, '\\$&')}`));
  assert.match(source, /alt: Rain again\nrole: functional\nlicense: CC0-1\.0\ncreator: Me/);
  const extra = source + `:::record attachment #missing\nmethod: ${METHOD}\npath: assets/stickers/mine/gone.png\nmedia-type: image/png\nalt: Gone\nrole: decorative\n:::\n\n`
    + `:::record attachment #vector\nmethod: ${METHOD}\npath: assets/stickers/mine/v.svg\nmedia-type: image/svg+xml\nalt: Vector\nrole: decorative\n:::\n\n`
    + ':::record attachment #other\npath: assets/stickers/mine/rain.png\nmedia-type: image/png\n:::\n';
  const assets = [...stickers.map(({ path, mediaType, data }) => ({ path, mediaType, data })), { path: 'assets/stickers/mine/v.svg', mediaType: 'image/svg+xml', data: png(9) }];
  const read = readPack(extra, assets);
  assert.equal(read.title, 'My stickers');
  assert.deepEqual(read.stickers.map(s => [s.alt, s.role, s.path]), [['Rain cloud', 'decorative', 'assets/stickers/mine/rain.png'], ['Rain again', 'functional', 'assets/stickers/mine/rain-2.png']]);
  assert.equal(read.skipped, 2, 'a missing file and an SVG are reported, a record without the method is ignored');
  assert.throws(() => packSource({ title: 'Empty', stickers: [] }), /no stickers/);
});


test('a placed sticker is its own record after the paragraph at the cursor, which the renderer places', () => {
  const source = '# 2026-11-07\n\nBus to work.\nThen a shift.\n\nEvening walk.';
  const record = placedRecord({ id: stickerId(source, 'bus'), path: 'assets/stickers/jot-functional/bus.png', alt: ' Bus\nor transit ', role: 'functional', finish: 'stamp' });
  assert.equal(record, ':::record attachment #sticker-bus\nmethod: planner-sticker-and-deco-culture@1\npath: assets/stickers/jot-functional/bus.png\nmedia-type: image/png\nalt: Bus or transit\nrole: functional\nfinish: stamp\nx: 78%\ny: -3em\nwidth: 4em\n:::');
  const change = blockInsertion(source, blockEnd(source, source.indexOf('work')), record), out = source.slice(0, change.start) + change.text + source.slice(change.end);
  assert.equal(out, `# 2026-11-07\n\nBus to work.\nThen a shift.\n\n${record}\n\nEvening walk.`);
  assert.equal(out.slice(change.recordStart, change.recordStart + 8), ':::recor');
  const node = parse(out).nodes.find((n) => n.type === 'record'), s = stickerOf(node);
  assert.deepEqual([s.placed, s.x, s.y, s.width, s.finish, node.start], [true, 78, -3, 4, 'stamp', change.recordStart]);
  assert.equal(parse(out).diagnostics.filter((d) => d.severity === 'error').length, 0);
  assert.equal(stickerId(out, 'bus'), 'sticker-bus-2');
  for (const [src, at] of [['', 0], ['Bus', 3], ['A\nB', 0]]) { const c = blockInsertion(src, blockEnd(src, at), 'R'); assert.equal(src.slice(0, c.start) + c.text + src.slice(c.end), (src ? src + '\n\n' : '') + 'R\n'); }
  assert.throws(() => placedRecord({ id: 'sticker-x', path: 'assets/x.png', alt: ' ', role: 'decorative' }), /few words/);
});

test('moving, sizing and turning rewrite only those fields, within their ranges', () => {
  assert.deepEqual(placementValues({ x: 104.26, y: -3.333, width: 0.2, rotate: 185 }), { x: '100%', y: '-3.33em', width: '1em', rotate: '-175deg' });
  assert.deepEqual(placementValues({ rotate: -5 }), { rotate: '-5deg' });
  const raw = ':::record attachment #s\r\nmethod: planner-sticker-and-deco-culture@1\r\nx: 78%\r\ny: -3em\r\nwidth: 4em\r\nrotate: 5deg\r\n:::';
  assert.equal(setRecordFields(raw, { x: '50%', layer: '2' }, ['rotate']), ':::record attachment #s\r\nmethod: planner-sticker-and-deco-culture@1\r\nx: 50%\r\ny: -3em\r\nwidth: 4em\r\nlayer: 2\r\n:::');
  assert.throws(() => setRecordFields(':::record attachment', {}), /not complete/);
});
