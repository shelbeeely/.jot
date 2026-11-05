// The scribe's rules: commands, sentences and where words go. Run: node --test site/test-scribe.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCommand, splitSentences, entryEnd, planWrite, SCRIBE_QUESTIONS } from './dist/scribe-core.mjs';

test('spoken commands are whole sentences; anything else is written as said', () => {
  assert.deepEqual(readCommand('New paragraph.'), { kind: 'paragraph' });
  assert.deepEqual(readCommand('new line'), { kind: 'line' });
  assert.deepEqual(readCommand('Scratch that.'), { kind: 'scratch' });
  assert.deepEqual(readCommand('Undo.'), { kind: 'scratch' });
  assert.deepEqual(readCommand('Stop listening.'), { kind: 'stop' });
  assert.deepEqual(readCommand('Skip.'), { kind: 'skip' });
  assert.deepEqual(readCommand('Another question.'), { kind: 'another' });
  assert.deepEqual(readCommand('New task, call Sam.'), { kind: 'task', text: 'Call Sam' });
  assert.deepEqual(readCommand('Add a to-do buy milk'), { kind: 'task', text: 'Buy milk' });
  assert.deepEqual(readCommand('New note: the bus was late.'), { kind: 'note', text: 'The bus was late.' });
  assert.deepEqual(readCommand('New heading Evening.'), { kind: 'heading', text: 'Evening' });
  assert.deepEqual(readCommand('New task.'), { kind: 'task', text: '' }, 'the next sentence becomes the task');
  assert.deepEqual(readCommand('Tag work and family.'), { kind: 'tag', text: '#work #family' });
  assert.deepEqual(readCommand('Tag garden party.'), { kind: 'tag', text: '#garden-party' });
  assert.equal(readCommand('I said stop to the dog.').kind, 'text');
  assert.equal(readCommand('The new task at work was hard.').kind, 'text');
  assert.equal(readCommand('Tag along with us to the shops tomorrow.').kind, 'text', 'a long tag sentence is ordinary speech');
  assert.equal(readCommand('  '), null);
});

test('whole sentences are written; the unfinished rest waits', () => {
  assert.deepEqual(splitSentences('I went out. It rained! Did I'), { complete: ['I went out.', 'It rained!'], rest: 'Did I' });
  assert.deepEqual(splitSentences('No end yet'), { complete: [], rest: 'No end yet' });
  assert.deepEqual(splitSentences('“Hi.” she said. Then'), { complete: ['“Hi.”', 'she said.'], rest: 'Then' });
});

test('words go at the end of today\'s entry, never into another entry', () => {
  const src = '### 2026-11-03 | Tue\n\nOld.\n\n### 2026-11-04 | Wed\n\nMorning.\n\n### 2026-11-05 | Thu\n\nPlan.\n';
  const end = entryEnd(src, '2026-11-04');
  assert.equal(src.slice(0, end).endsWith('Morning.'), true);
  assert.equal(entryEnd(src, '2026-11-09'), -1);
  const apply = (source, plan) => source.slice(0, plan.start) + plan.text + source.slice(plan.start);
  let state = { lastEnd: -1, lastKind: '', separator: null };
  const write = (source, item, question) => { const plan = planWrite(source, '2026-11-04', state, item, question); const out = apply(source, plan); state = { lastEnd: plan.start + plan.text.length, lastKind: item.kind, separator: null }; return out; };
  let out = write(src, { kind: 'text', text: 'I went out.' });
  out = write(out, { kind: 'text', text: 'It rained.' });
  out = write(out, { kind: 'task', text: 'Call Sam' });
  out = write(out, { kind: 'task', text: 'Buy milk' });
  out = write(out, { kind: 'tag', text: '#walk' });
  state.separator = 'paragraph';
  out = write(out, { kind: 'text', text: 'Evening now.' }, 'What helped today, even a bit?');
  assert.equal(out, '### 2026-11-03 | Tue\n\nOld.\n\n### 2026-11-04 | Wed\n\nMorning.\n\nI went out. It rained.\n\n[ ] Call Sam\n[ ] Buy milk #walk\n\n> What helped today, even a bit?\n\nEvening now.\n\n### 2026-11-05 | Thu\n\nPlan.\n');
  // If the person typed after our words, the next words start a new paragraph after theirs.
  const typed = out.replace('Evening now.', 'Evening now. Typed.');
  assert.ok(apply(typed, planWrite(typed, '2026-11-04', state, { kind: 'text', text: 'More.' })).includes('Typed.\n\nMore.'));
  assert.equal(planWrite(src, '2026-11-09', state, { kind: 'text', text: 'x' }), null);
});

test('questions are short and open', () => {
  assert.ok(SCRIBE_QUESTIONS.length >= 10);
  for (const q of SCRIBE_QUESTIONS) { assert.ok(q.length < 50, q); assert.ok(!/\b(trauma|wrong with|should you)\b/i.test(q)); }
});

test('media by voice: find commands, picks, and known titles linked around the exact words said', async () => {
  const { readFind, knownTitles, linkKnownTitles } = await import('./dist/scribe-core.mjs');
  assert.deepEqual(readFind('Find film Dune.'), { kind: 'find', mediaKind: 'film', query: 'Dune' });
  assert.deepEqual(readFind('Look up the book The Left Hand of Darkness'), { kind: 'find', mediaKind: 'book', query: 'The Left Hand of Darkness' });
  assert.deepEqual(readFind('find TV show Severance'), { kind: 'find', mediaKind: 'tv', query: 'Severance' });
  assert.deepEqual(readFind('Link it.'), { kind: 'pick', index: 0 }); assert.deepEqual(readFind('second one'), { kind: 'pick', index: 1 });
  assert.equal(readFind('I found a film I liked.'), null); assert.equal(readFind('Find film'), null);
  const titles = knownTitles([
    { title: 'The Matrix (1999)', target: 'imdb:tt0133093', kind: 'film' },
    { title: 'The Matrix Reloaded (2003)', target: 'https://www.wikidata.org/wiki/Q189600', kind: 'game-or-film' },
    { title: 'Up (2009)', target: 'imdb:tt1049413', kind: 'film' },
    { title: 'Severance S1E3: “In Perpetuity”', target: 'https://www.tvmaze.com/episodes/2238340', kind: 'tv' },
    { title: 'IMDb tt0111161', target: 'imdb:tt0111161', kind: 'film' }
  ]);
  assert.deepEqual(titles.map(t => t.key), ['the matrix reloaded', 'the matrix'], 'short words, episodes and fallback names are not matched');
  assert.equal(linkKnownTitles('I watched the matrix reloaded, then The Matrix. Up was fine.', titles),
    'I watched [the matrix reloaded](https://www.wikidata.org/wiki/Q189600), then [The Matrix](imdb:tt0133093). Up was fine.');
  assert.equal(linkKnownTitles('thematrix and the matrixes', titles), 'thematrix and the matrixes', 'whole words only');
  assert.equal(linkKnownTitles('[The Matrix (1999)](imdb:tt0133093)', titles), '[The Matrix (1999)](imdb:tt0133093)', 'never inside an existing link');
});

test('checklist items and media requests, said the ways people say them', async () => {
  const { readCommand, readFind } = await import('./dist/scribe-core.mjs');
  for (const [said, text] of [['Add checklist item milk.', 'Milk'], ['Checklist item milk.', 'Milk'], ['New checklist item: eggs.', 'Eggs'], ['Add milk to my checklist.', 'Milk'], ['To do, call Sam.', 'Call Sam'], ['New to do buy milk.', 'Buy milk'], ['Checklist, eggs.', 'Eggs'], ['Add an item, bread.', 'Bread']]) assert.deepEqual(readCommand(said), { kind: 'task', text }, said);
  assert.deepEqual(readCommand('New checklist item.'), { kind: 'task', text: '' });
  for (const said of ['To do this properly I need time.', 'I need a new item for the house.', 'The task was hard.', 'My checklist is long.', 'Checklist is long.']) assert.equal(readCommand(said).kind, 'text', said);
  assert.deepEqual(readFind('Add the movie Dune.'), { kind: 'find', mediaKind: 'film', query: 'Dune' });
  assert.deepEqual(readFind('Link the film Dune.'), { kind: 'find', mediaKind: 'film', query: 'Dune' });
  assert.deepEqual(readFind('Find a book called Dune.'), { kind: 'find', mediaKind: 'book', query: 'Dune' });
  assert.deepEqual(readFind('Find the book “Dune”.'), { kind: 'find', mediaKind: 'book', query: 'Dune' });
});
