import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referenceBook, saveReference, bookTargets, valuesOf, mapURL, locationErrors } from './dist/reference-books.mjs';
import { localSuggestions, completionIndex } from './dist/local-autocomplete.mjs';
import { parse } from '../parser/jot.mjs';
import { collectNumbers } from '../parser/charts.mjs';
const empty = referenceBook('places.jot', '# My places\n');
test('places preserve addresses, coordinates, timezone and notes, with offline validation', () => {
  const book = saveReference(empty, { type: 'place', id: 'place-river', values: { label: 'River café', alias: 'The café\nRiverside', 'address-line1': 'Example Street', locality: 'London', 'postal-code': 'EX1 1AA', country: 'United Kingdom', 'country-code': 'GB', latitude: '51.5', longitude: '-0.12', 'altitude-m': '-2', 'accuracy-m': '10', timezone: 'Europe/London', website: 'https://example.com', accessibility: 'Step-free entrance\nQuiet corner', notes: 'A favourite place.' } });
  assert.equal(book.records.length, 1); const values = valuesOf(book.records[0]);
  assert.equal(values.locality, 'London'); assert.equal(values.alias, 'The café\nRiverside'); assert.equal(values.accessibility, 'Step-free entrance\nQuiet corner');
  assert.match(mapURL(values), /mlat=51.5&mlon=-0.12/);
  assert.equal(mapURL({ latitude: '0', longitude: '0' }), 'https://www.openstreetmap.org/?mlat=0&mlon=0#map=16/0/0');
  assert.equal(collectNumbers(parse(book.source)).metrics.size, 0, 'coordinates/postcodes are never journal measurements');
  for (const values of [{latitude:'91',longitude:'0'}, {latitude:'0',longitude:'181'}, {latitude:'1'}, {latitude:'NaN',longitude:'1'}, {'accuracy-m':'-1'}, {'altitude-m':'Infinity'}, {timezone:'Mars/Olympus'}, {'country-code':'GBR'}]) assert.ok(locationErrors(values).length, JSON.stringify(values));
});
test('editing preserves stable IDs, unknown fields, other records and Unicode byte boundaries', () => {
  const source = '\uFEFF# 🪴\r\n\r\n:::record person #robin\r\nlabel: Robin\r\nemail: robin@example.com\r\nemail: robin@work.example\r\nx-detail: keep me\r\n:::\r\n\r\n:::record place #park\r\nlabel: Park\r\n:::\r\n';
  const book = referenceBook('people.jot', source);
  const updated = saveReference(book, { type: 'person', id: 'robin', values: { ...valuesOf(book.records[0]), label: 'Robin Smith', notes: ':::record observation\nNot a nested record' } }, 'robin');
  assert.ok(updated.source.startsWith('\uFEFF# 🪴\r\n'));
  assert.ok(updated.source.endsWith(source.slice(source.indexOf('\r\n:::record place'))));
  assert.match(updated.source, /x-detail: keep me/); assert.equal(valuesOf(updated.records[0]).email, 'robin@example.com\nrobin@work.example');
  assert.equal(updated.records.length, 2);
  assert.throws(() => saveReference(book, {type:'person', id:'different', values:{label:'Robin'}}, 'robin'), /stable/);
  assert.throws(() => saveReference(book, {type:'person', id:'park', values:{label:'Robin'}}), /already used/);
  assert.throws(() => referenceBook('../people.jot', source), /filename/);
  assert.throws(() => referenceBook('bad.jot', ':::record place #x\nlabel: Place\nlatitude: 100\nlongitude: 0\n:::\n'), /Latitude/);
});
test('explicit reference targets complete cross-file links without copying contact details', () => {
  const book = saveReference(referenceBook('people.jot', ''), { type: 'person', id: 'robin', values: {label:'Robin', alias:'Bird', email:'private@example.com'} });
  const place = saveReference(empty, { type:'place', id:'robin', values:{label:'Robin café', locality:'London'} });
  const source = '[Meet](#Bird', index = completionIndex(parse(source)); index.targets.push(...bookTargets([book,place]));
  let suggestions = localSuggestions(source, source.length, index);
  assert.equal(suggestions.items[0].value, '[Meet](people.jot#robin)'); assert.ok(!JSON.stringify(suggestions).includes('private@example.com'));
  const explicit = '[](' + 'places.jot#London'; suggestions = localSuggestions(explicit, explicit.length, index);
  assert.equal(suggestions.items[0].value, '[Robin café](places.jot#robin)');
  assert.deepEqual(parse(suggestions.items[0].value).diagnostics, []);
});


test('qualified identity references preserve case-sensitive IDs and filenames', () => {
  const first = referenceBook('People.jot', ':::record person #Robin\nlabel: Robin upper\n:::\n');
  const second = referenceBook('people.jot', ':::record person #robin\nlabel: Robin lower\n:::\n');
  const source = '[Meet](#Robin', index = completionIndex(parse(source)); index.targets.push(...bookTargets([first, second]));
  const suggestions = localSuggestions(source, source.length, index);
  assert.deepEqual(suggestions.items.map((item) => item.value).sort(), ['[Meet](People.jot#Robin)', '[Meet](people.jot#robin)'].sort());
});
