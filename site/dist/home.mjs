// The home page's pictures, made by the same code as the workspace: a jotted note and the formatted page it becomes, a week of numbers
// drawn by Chart.js, and a sample page written by hand on a dot grid. Nothing on this page takes input.
import { parse } from './jot/jot.mjs';
import { charts } from './jot/charts.mjs';
import { drawChart, addChartStyles, addHandwritingStyles, renderPreview } from './jot/preview.mjs';

addChartStyles(document); addHandwritingStyles(document);

// what you jot, and what you get: the source shown on the left, laid out in the Journal style on the right
renderPreview(parse(document.getElementById('sample-source').textContent), document.getElementById('sample-page'), { style: 'journal' });

// a week of numbers
const sleep = [7.5, 6, 6.5, 8, 5.5, 8.5, 7], steps = [6200, 8400, 4100, 9800, 7300, 12100, 5600];
const days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
const text = days.map((d, i) => `### ${d}\n\n:::record measurement #sleep-${d}\nmetric: sleep\nunit: h\nvalue: ${sleep[i]}\n:::\n\n:::record measurement #steps-${d}\nmetric: steps\nvalue: ${steps[i]}\n:::\n`).join('\n')
  + '\n:::record chart #week\nmetrics: sleep, steps\nstart: 2026-10-26\nend: 2026-11-01\n:::\n';
const [c] = charts(parse(text));
drawChart(document.getElementById('demo-chart'), c.model);

// a page, written by hand on dots: the same renderer and grid as the workspace
const page = `### 2026-10-26 | Monday

The rain made the room feel ==quieter==. I wanted to remember that.

[x] Walk before work
[x] Water the plants
[ ] Call Sam back

-> A small beginning is still a beginning. <-
`;
renderPreview(parse(page), document.getElementById('written-demo'), { hand: { hand: 'pen', ink: 'blue', pitchMm: 5, seed: 2 } });
