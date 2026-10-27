import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify } from './jot.mjs';
import { parseColor, contrast, labelInk, variableName, isPaletteRecord, paletteOf, moodboardOf, paletteCSS, paletteJSON } from './palette.mjs';

const doc = `:::record palette #autumn
label: Autumn zine
color: #C0392B brick red
color: #f4d03f mustard
color: #234 deep slate
color: #ffffff
color: brick
color: #12345 nearly
:::
`;

test('colors: #RRGGBB or #RGB, then an optional name', () => {
  assert.deepEqual(parseColor('#C0392B brick red'), { hex: '#c0392b', name: 'brick red', raw: '#C0392B brick red' });
  assert.equal(parseColor('#234 deep slate').hex, '#223344');
  assert.equal(parseColor('#abc').name, '');
  for (const bad of ['brick', '#12345', '#c0392bff', '#c0392bname', 'c0392b', '', '#ggg']) assert.equal(parseColor(bad), null, bad);
});

test('label ink is black or white and always reads at 4.5:1 or better', () => {
  assert.equal(labelInk('#ffffff'), '#000000'); assert.equal(labelInk('#000000'), '#ffffff'); assert.equal(labelInk('#1f3a8a'), '#ffffff'); assert.equal(labelInk('#fddd13'), '#000000');
  const hex = (n) => n.toString(16);
  for (let r = 0; r < 16; r++) for (let g = 0; g < 16; g++) for (let b = 0; b < 16; b++) {
    const c = parseColor(`#${hex(r)}${hex(g)}${hex(b)}`).hex;
    assert.ok(contrast(c, labelInk(c)) >= 4.5, c);
  }
  assert.equal(Math.round(contrast('#000000', '#ffffff')), 21);
});

test('a palette record: swatches in order, invalid colors kept and warned about', () => {
  const ast = parse(doc), rec = ast.nodes.find((n) => n.type === 'record');
  assert.equal(stringify(ast), doc);
  assert.ok(isPaletteRecord(rec));
  const p = paletteOf(rec);
  assert.equal(p.title, 'Autumn zine');
  assert.deepEqual(p.swatches.map((s) => [s.hex, s.name, s.variable]), [['#c0392b', 'brick red', '--brick-red'], ['#f4d03f', 'mustard', '--mustard'], ['#223344', 'deep slate', '--deep-slate'], ['#ffffff', '', '--color-4']]);
  assert.deepEqual(p.invalid, ['brick', '#12345 nearly']);
  const warn = ast.diagnostics.filter((d) => d.code === 'invalid-color');
  assert.equal(warn.length, 2); assert.ok(warn.every((d) => d.severity === 'warning'));
  assert.equal(doc.slice(warn[0].start, warn[0].end), 'color: brick\n');
});

test('colors elsewhere are not checked; moodboards and the moodboard profile are', () => {
  assert.equal(parse(':::record observation\ncolor: blue\n:::\n').diagnostics.length, 0);
  assert.equal(parse(':::record moodboard\ncolor: blue\n:::\n').diagnostics[0].code, 'invalid-color');
  const viaMethod = parse(':::record reflection\ncolor: blue\nmethod: moodboard-and-palette@1\n:::\n');
  assert.equal(viaMethod.diagnostics[0].code, 'invalid-color'); assert.ok(isPaletteRecord(viaMethod.nodes[0]));
  assert.equal(parse(':::record palette\ncolor: #abc ok\n:::\n').diagnostics.length, 0);
});

test('CSS variable names: any script, unique, never empty', () => {
  const taken = new Set();
  assert.equal(variableName('Brick Red!', 0, taken), '--brick-red');
  assert.equal(variableName('brick red', 1, taken), '--brick-red-2');
  assert.equal(variableName('藍色', 2, taken), '--藍色');
  assert.equal(variableName('***', 3, taken), '--color-4');
});

test('copy formats: CSS custom properties on :root and JSON', () => {
  const p = paletteOf(parse(doc).nodes[0]);
  assert.equal(paletteCSS(p), '/* Autumn zine: a Jot palette */\n:root {\n  --brick-red: #c0392b; /* brick red */\n  --mustard: #f4d03f; /* mustard */\n  --deep-slate: #223344; /* deep slate */\n  --color-4: #ffffff;\n}\n');
  assert.deepEqual(JSON.parse(paletteJSON(p)).colors[0], { name: 'brick red', hex: '#c0392b', variable: '--brick-red' });
  const sneaky = paletteOf(parse(':::record palette\nlabel: x */ body{} /*\ncolor: #000 a */ b\n:::\n').nodes[0]);
  assert.ok(!/\*\/ body/.test(paletteCSS(sneaky)) && !/a \*\/ b/.test(paletteCSS(sneaky)));
});

test('a moodboard: pictures with their descriptions, captions and credits, in order', () => {
  const m = moodboardOf(parse(`:::record moodboard #rain
label: Rain study
image: assets/boots.jpg Wet boots on the bus
caption: Tuesday
credit: me
asset: assets/ticket.png
alt: A bus ticket
color: #1f3a8a ink blue
body: Grey, wet, blue.
:::
`).nodes[0]);
  assert.equal(m.title, 'Rain study');
  assert.deepEqual(m.images, [{ path: 'assets/boots.jpg', alt: 'Wet boots on the bus', caption: 'Tuesday', credit: 'me' }, { path: 'assets/ticket.png', alt: 'A bus ticket', caption: '', credit: '' }]);
  assert.deepEqual(m.swatches.map((s) => s.hex), ['#1f3a8a']);
  assert.deepEqual(m.rest, [{ name: 'body', value: 'Grey, wet, blue.' }]);
});
