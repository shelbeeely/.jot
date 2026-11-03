import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journalGraph, layoutGraph } from './dist/writer-map.mjs';

const source = 'Notes before any date.\n\n### 2026-10-30 | Friday\n\nCafé with [Sam](people.jot#person-sam). #walk #outside `#code` [red]{ink=#ff0000}\n\n:::record reflection #eve-1030\nmood: calm\n:::\n\n### 2026-11-02 | Monday\n\nAgain [Sam](people.jot#person-sam), [the note](#eve-1030) and [Friday](#2026-10-30). #walk\n\n### 2026-11-02 | A second entry\n\n[Nowhere](#missing)\n';

test('entries, links between entries, backlinks and threads come from the source', () => {
  const graph = journalGraph(source);
  assert.deepEqual(graph.entries.map(entry => entry.date), ['2026-10-30', '2026-11-02', '2026-11-02']);
  assert.deepEqual(graph.entries.map(entry => entry.title), ['', '', 'A second entry'], 'weekday names are not repeated as titles');
  assert.deepEqual(graph.edges, [{ from: 1, to: 0 }], 'a link to a record or a date joins the two entries once');
  assert.deepEqual([...graph.entries[0].from], [1]);
  assert.deepEqual(graph.entries.map(entry => entry.tags), [['walk', 'outside'], ['walk'], []], 'record IDs, link targets, code and colors are not tags');
  assert.deepEqual(graph.threads.map(thread => [thread.label, thread.entries]), [['#walk', [0, 1]], ['Sam', [0, 1]], ['#outside', [0]]]);
  for (const entry of graph.entries) assert.equal(source.slice(entry.position, entry.position + 14), '### ' + entry.date, 'positions jump to the heading');
  assert.equal(graph.entries[1].words, 7, 'words of the entry, not the next heading');
});

test('positions stay right after non-ASCII text', () => {
  const graph = journalGraph('### 2026-01-01\n\nÉté 🌱 naïve\n\n### 2026-01-02\n\n[back](#2026-01-01)\n');
  assert.equal(graph.entries[1].position, '### 2026-01-01\n\nÉté 🌱 naïve\n\n'.length);
  assert.deepEqual(graph.edges, [{ from: 1, to: 0 }]);
});

test('the calendar keeps empty months as blank rows and stacks same-day entries', () => {
  const graph = journalGraph('### 2026-01-05\n\nA\n\n### 2026-03-05\n\nB\n\n### 2026-03-05\n\nC\n');
  const layout = layoutGraph(graph);
  assert.deepEqual(layout.rows.map(row => row.month), [0, 1, 2], 'February stays as a blank row');
  const [, b, c] = [0, 1, 2].map(i => layout.points.get(i));
  assert.notDeepEqual([b.x, b.y], [c.x, c.y]);
  assert.equal(layoutGraph(journalGraph('No dates here.\n')).points.size, 0);
});
