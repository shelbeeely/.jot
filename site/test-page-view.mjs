// Selectors Paged.js can read: no commas inside :not(), :is() and friends, with the same meaning.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pagedSafeCSS, expandSelector, splitTop } from './dist/page-view-css.mjs';

test('splits only top-level commas', () => {
  assert.deepEqual(splitTop('a:not(.b,.c), d[title="x,y"], e'), ['a:not(.b,.c)', 'd[title="x,y"]', 'e']);
});
test(':not lists become chained :not', () => {
  assert.deepEqual(expandSelector('.S .jot-date+p:not(.jot-scene,.jot-backlinks)::first-letter'), ['.S .jot-date+p:not(.jot-scene):not(.jot-backlinks)::first-letter']);
});
test(':is, :where and :has lists become a selector list, in order', () => {
  assert.deepEqual(expandSelector('.x :is(h1,h2) :where(a,b)'), ['.x :is(h1) :where(a)', '.x :is(h1) :where(b)', '.x :is(h2) :where(a)', '.x :is(h2) :where(b)']);
  assert.deepEqual(expandSelector('li:has(a,b)'), ['li:has(a)', 'li:has(b)']);
});
test('rewrites rule preludes only, inside at-rules too', () => {
  const css = '@media print{.a:is(.b,.c){content:"x,:is(y,z){"}}@page{size:148mm 210mm;@bottom-center{content:counter(page)}}/* :is(a,b){ */.d{background:url(data:image/png;base64,AA==)}';
  assert.equal(pagedSafeCSS(css), '@media print{.a:is(.b),.a:is(.c){content:"x,:is(y,z){"}}@page{size:148mm 210mm;@bottom-center{content:counter(page)}}/* :is(a,b){ */.d{background:url(data:image/png;base64,AA==)}');
});
test('leaves a selector alone rather than growing it without bound', () => {
  const huge = Array.from({ length: 6 }, () => ':is(a,b,c,d)').join(' ');
  assert.equal(expandSelector(huge), null);
  assert.equal(pagedSafeCSS(huge + '{color:red}'), huge + '{color:red}');
});
