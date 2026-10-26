// The home page's one live piece: a week of numbers, parsed and drawn by the same code as the workspace (jot/charts.mjs).
import { parse } from './jot/jot.mjs';
import { charts, chartHTML, CHART_CSS } from './jot/charts.mjs';

const sleep = [7.5, 6, 6.5, 8, 5.5, 8.5, 7], steps = [6200, 8400, 4100, 9800, 7300, 12100, 5600];
const days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
const text = days.map((d, i) => `### ${d}\n\n:::record measurement #sleep-${d}\nmetric: sleep\nunit: h\nvalue: ${sleep[i]}\n:::\n\n:::record measurement #steps-${d}\nmetric: steps\nvalue: ${steps[i]}\n:::\n`).join('\n')
  + '\n:::record chart #week\nmetrics: sleep, steps\nstart: 2026-10-26\nend: 2026-11-01\n:::\n';
const style = document.createElement('style'); style.textContent = CHART_CSS; document.head.append(style);
const [c] = charts(parse(text));
document.getElementById('demo-chart').innerHTML = chartHTML(c.model); // generated from the numbers above, every text escaped
