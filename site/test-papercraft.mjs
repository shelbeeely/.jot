// Papercraft scenes (site/dist/writer-papercraft.mjs): the cut-line tracer, and the hinge timeline's order: opening lands the page
// before any scenery rises; leaving folds every piece flat before the page moves.
import test from 'node:test';
import assert from 'node:assert/strict';

await import('./dist/jot/vendor/three.mjs');
const T = globalThis.JotThree;
const { buildPlace, traceOutlines } = await import('./dist/writer-papercraft.mjs');

const grid = (rows) => ({ cells: Uint8Array.from(rows.join('').split('').map((c) => (c === '#' ? 1 : 0))), w: rows[0].length, h: rows.length });

test('a cut line is traced around paper, with the holes inside it, and specks are dropped', () => {
  const ring = grid(['........', '.######.', '.######.', '.##..##.', '.##..##.', '.######.', '.######.', '........']);
  const outlines = traceOutlines(ring.cells, ring.w, ring.h);
  assert.equal(outlines.length, 1, 'one piece');
  assert.equal(outlines[0].holes.length, 1, 'with its window cut out');
  const xs = outlines[0].points.map((p) => p[0]), ys = outlines[0].points.map((p) => p[1]);
  assert.deepEqual([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], [1, 7, 1, 7]);
  const two = grid(['###.....', '###...##', '###...##', '........']);
  assert.equal(traceOutlines(two.cells, two.w, two.h).length, 2, 'separate pieces stay separate');
  const speck = grid(['......', '..#...', '......']);
  assert.deepEqual(traceOutlines(speck.cells, speck.w, speck.h), [], 'a speck of one cell is not a piece');
});

const place = {
  title: 'A desk', sky: '#dfe6ee', ground: '#cdbfa8', weather: 'clear', time: 'day', atmosphere: 'calm',
  camera: { position: [0, 4, 6], target: [0, 1, 0] },
  objects: [
    { name: 'Floor', position: [0, 0.02, 0], rotation: [0, 0, 0], motion: 'none', moments: [], shapes: [{ type: 'box', position: [0, 0, 0], rotation: [0, 0, 0], size: [4, 0.04, 3], color: '#b08a60', roughness: 1, glow: false }] },
    { name: 'Back wall', position: [0, 1.2, -1.4], rotation: [0, 0, 0], motion: 'none', moments: [], shapes: [{ type: 'box', position: [0, 0, 0], rotation: [0, 0, 0], size: [4, 2.4, 0.1], color: '#e8dccb', roughness: 1, glow: false }] },
    { name: 'Side wall', position: [-2, 1.2, 0], rotation: [0, 0, 0], motion: 'none', moments: [], shapes: [{ type: 'box', position: [0, 0, 0], rotation: [0, 0, 0], size: [0.1, 2.4, 3], color: '#e8dccb', roughness: 1, glow: false }] },
    { name: 'Desk', position: [0.8, 0.4, 0], rotation: [0, 0, 0], motion: 'none', moments: [{ text: 'A desk.' }], shapes: [{ type: 'box', position: [0, 0, 0], rotation: [0, 0, 0], size: [1.2, 0.8, 0.6], color: '#8a6a4a', roughness: 1, glow: false }] },
    { name: 'Mug', position: [0.8, 0.86, 0], rotation: [0, 0, 0], motion: 'steam', moments: [], shapes: [{ type: 'mug', position: [0, 0, 0], rotation: [0, 0, 0], size: [0.12, 0.12, 0.09], color: '#c06040', roughness: 1, glow: false }] },
  ],
};

test('opening lands the page before any scenery rises; every piece then stands', () => {
  const built = buildPlace(T, place, { document: null, enter: 'open' });
  assert.equal(built.objects.length, place.objects.length, 'one group for every thing, so indices hold');
  assert.ok(built.pickables.length >= place.objects.length - 1);
  let steps = 0, sawRise = false;
  while (built.unfolding && steps++ < 400) {
    built.update(0.02, { motion: false });
    const s = built.inspect();
    if (s.hinges.some((h) => h > 0.02)) { sawRise = true; assert.ok(Math.abs(s.left) < 1e-6 && Math.abs(s.right) < 1e-6, 'nothing rises until the page has landed'); }
  }
  assert.ok(sawRise && !built.unfolding);
  assert.ok(built.inspect().hinges.every((h) => Math.abs(h - 1) < 1e-6), 'everything stands');
  built.dispose();
});

test('turning the page folds every piece flat before the page moves, then the page stands', async () => {
  const built = buildPlace(T, place, { document: null, enter: 'open' }); built.settle();
  let done = false; const leaving = built.leave('next').then(() => { done = true; });
  let steps = 0, pageMoved = false;
  while (!done && steps++ < 400) {
    built.update(0.02, { motion: false }); await Promise.resolve();
    const s = built.inspect();
    if (Math.abs(s.right) > 1e-6) { pageMoved = true; assert.ok(s.hinges.every((h) => h < 1e-6), 'every piece lies flat before the page lifts'); }
  }
  await leaving;
  assert.ok(pageMoved && Math.abs(built.inspect().right - Math.PI / 2) < 1e-6, 'the page ends standing at the gutter');
  built.dispose();
});

test('with reduced motion everything simply stands, and leaving does not wait', async () => {
  const built = buildPlace(T, place, { document: null, reduced: true });
  assert.equal(built.unfolding, false); assert.ok(built.inspect().hinges.every((h) => h === 1));
  await built.leave('next'); built.dispose();
});
