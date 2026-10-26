// The numbers in a journal and the charts drawn from them (charts.mjs). Run: node --test charts-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from './jot.mjs';
import { collectNumbers, chartModel, charts, chartConfig, summaryText, metricKey, mondayOf } from './charts.mjs';

const rec = (type, id, fields) => `:::record ${type} #${id}\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n:::\n`;
const week = `${rec('scale', 'mood', { name: 'mood', kind: 'ordinal', minimum: 1, maximum: 5, 'anchor-low': 'low', 'anchor-high': 'great' })}
### 2026-10-26 | Monday

${rec('measurement', 's1', { metric: 'sleep', unit: 'h', value: 7.5 })}
${rec('measurement', 'm1', { metric: 'mood', scale: '#mood', value: 4 })}
${rec('observation', 'o1', { label: 'Today', steps: 8200, 'x-water': 6, note: 'a walk' })}
### 2026-10-27 | Tuesday

${rec('measurement', 's2', { metric: 'sleep', unit: 'h', value: 6 })}
${rec('measurement', 'e1', { metric: 'energy', value: 2 })}
${rec('measurement', 'e2', { metric: 'energy', value: 4 })}
${rec('measurement', 'late', { metric: 'sleep', unit: 'h', value: 9, date: '2026-10-29' })}
${rec('chart', 'week', { metrics: 'Sleep, mood, steps' })}`;

test('numbers come from measurements and from plain-number fields, dated by their entry or their own date', () => {
  const { metrics, scales } = collectNumbers(parse(week));
  assert.deepEqual([...metrics.keys()].sort(), ['energy', 'mood', 'sleep', 'steps', 'water']);
  assert.deepEqual([...metrics.get('sleep').byDate.keys()], ['2026-10-26', '2026-10-27', '2026-10-29'], 'a record\'s own date wins over its entry');
  assert.equal(metrics.get('sleep').unit, 'h');
  assert.equal(metrics.get('mood').scale, 'mood');
  assert.deepEqual(scales.get('mood'), { min: 1, max: 5, lo: 'low', hi: 'great' });
  assert.ok(!metrics.has('note') && !metrics.has('label'), 'words and record fields about the record are not numbers');
  assert.deepEqual(metrics.get('energy').byDate.get('2026-10-27'), { sum: 6, n: 2 }, 'two on one day are kept to average');
});

test('a chart in an entry covers that entry\'s week, Monday to Sunday, one series per metric asked for', () => {
  const a = parse(week), [{ model }] = charts(a);
  assert.equal(model.start, '2026-10-26'); assert.equal(model.end, '2026-11-01'); assert.equal(model.days.length, 7);
  assert.deepEqual(model.series.map((s) => s.metric), ['sleep', 'mood', 'steps']);
  const sleep = model.series[0];
  assert.deepEqual(sleep.points, [7.5, 6, null, 9, null, null, null]);
  assert.deepEqual(sleep.stats, { n: 3, of: 7, avg: 7.5, low: 6, high: 9 });
  const mood = model.series[1];
  assert.equal(mood.min, 1); assert.equal(mood.max, 5, 'a scale gives the value axis'); assert.deepEqual(mood.anchors, { lo: 'low', hi: 'great' });
  assert.equal(model.series[2].min, 0, 'no scale: the axis starts at zero');
});

test('start, end, style and every metric when none is named', () => {
  const a = parse(`${week}\n${rec('chart', 'two', { start: '2026-10-27', end: '2026-10-26', style: 'bars' })}`);
  const m = chartModel(a, a.nodes.find((n) => n.id === 'two'));
  assert.deepEqual([m.start, m.end, m.style, m.days.length], ['2026-10-26', '2026-10-27', 'bars', 2], 'a backwards range is turned round');
  assert.deepEqual(m.series.map((s) => s.metric).sort(), ['energy', 'mood', 'sleep', 'steps', 'water']);
  assert.equal(m.series.find((s) => s.metric === 'energy').points[1], 3, 'averaged');
});

test('a chart outside any entry, and one with nothing to draw', () => {
  const a = parse(`${rec('chart', 'c', { metrics: 'sleep' })}\n### 2026-10-05\n\n${rec('measurement', 's', { metric: 'sleep', value: 7 })}\n### 2026-10-09\n\n${rec('measurement', 't', { metric: 'sleep', value: 8 })}`);
  const m = chartModel(a, a.nodes[0]);
  assert.deepEqual([m.start, m.end], ['2026-10-05', '2026-10-09'], 'outside an entry: the dates that have numbers');
  const b = parse(rec('chart', 'c', { metrics: 'sleep' }));
  assert.equal(chartModel(b, b.nodes[0]), null);
});

test('a template: metrics with no numbers still draw empty axes; sample numbers fill them, the same every time', () => {
  const t = parse(`### 2026-10-26\n\n${rec('measurement', 's', { metric: 'sleep', unit: 'h', value: '' })}\n${rec('chart', 'c', { metrics: 'sleep', start: '2026-10-26', end: '2026-11-01' })}`);
  const empty = chartModel(t, t.nodes.find((n) => n.id === 'c'));
  assert.deepEqual([empty.series[0].min, empty.series[0].max, empty.series[0].stats.n], [0, 10, 0]);
  assert.match(summaryText(empty, empty.series[0]), /Sleep \(h\), Mon 26 Oct to Sun 1 Nov: no numbers yet/);
  const s1 = chartModel(t, t.nodes.find((n) => n.id === 'c'), { sample: true }), s2 = chartModel(t, t.nodes.find((n) => n.id === 'c'), { sample: true });
  assert.ok(s1.series[0].sample && s1.series[0].points.every((v) => v !== null) && JSON.stringify(s1) === JSON.stringify(s2));
});

test('the Chart.js configuration: one value axis on the metric\'s range, gaps kept, the average dashed, no legend', () => {
  const a = parse(week), [{ model }] = charts(a), [sleep, mood] = model.series;
  const c = chartConfig(model, sleep, { series: '#123456' });
  assert.equal(c.type, 'line');
  assert.deepEqual(c.data.labels, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.deepEqual(c.data.datasets[0].data, [7.5, 6, null, 9, null, null, null]);
  assert.equal(c.data.datasets[0].spanGaps, false, 'an empty day is a gap, never a line through it');
  assert.equal(c.data.datasets[0].borderColor, '#123456');
  assert.deepEqual(c.data.datasets[1].data, Array(7).fill(7.5)); assert.deepEqual(c.data.datasets[1].borderDash, [3, 3]);
  assert.deepEqual([c.options.scales.y.min, c.options.scales.y.max], [sleep.min, sleep.max]);
  assert.ok(!('y1' in c.options.scales) && c.options.plugins.legend.display === false, 'one axis, and no legend: the title names the one series');
  assert.equal(c.options.animation, false);
  assert.deepEqual([chartConfig(model, mood).options.scales.y.min, chartConfig(model, mood).options.scales.y.max], [1, 5], 'a scale gives the axis');
  assert.equal(c.options.plugins.tooltip.callbacks.label({ raw: 7.5 }), 'Sleep: 7.5 h');
  assert.equal(c.options.plugins.tooltip.callbacks.label({ raw: null }), 'nothing written');
  assert.equal(c.options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }]), 'Mon 26 Oct');
  const bars = chartConfig({ ...model, style: 'bars' }, sleep);
  assert.equal(bars.type, 'bar'); assert.equal(bars.data.datasets[1].type, 'line', 'the average stays a line over the bars');
  const one = parse(`### 2026-10-26\n\n${rec('measurement', 'x', { metric: 'a', value: 3 })}\n${rec('chart', 'c', {})}`);
  assert.equal(chartConfig(charts(one)[0].model, charts(one)[0].model.series[0]).data.datasets.length, 1, 'one number: no average line');
  assert.equal(summaryText(model, sleep), 'Sleep (h), Mon 26 Oct to Sun 1 Nov: 3 of 7 days, average 7.5 h, from 6 to 9 h');
});

test('names and weeks', () => {
  assert.equal(metricKey('Sleep hours'), 'sleep-hours'); assert.equal(metricKey('x-body'), 'body');
  assert.equal(mondayOf('2026-11-01'), '2026-10-26'); assert.equal(mondayOf('2026-10-26'), '2026-10-26');
});
