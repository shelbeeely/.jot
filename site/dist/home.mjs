// The home page's live pieces, made by the same code as the workspace: a week of numbers drawn by Chart.js, a checklist of reasons with
// hand-drawn boxes (real checkboxes underneath), and a sample page written by hand on a dot grid.
import { parse } from './jot/jot.mjs';
import { charts } from './jot/charts.mjs';
import { drawChart, addChartStyles, addHandwritingStyles, renderPreview } from './jot/preview.mjs';
import { boxSVG, handwrite } from './jot/handwriting.mjs';

addChartStyles(document); addHandwritingStyles(document);

// a week of numbers
const sleep = [7.5, 6, 6.5, 8, 5.5, 8.5, 7], steps = [6200, 8400, 4100, 9800, 7300, 12100, 5600];
const days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
const text = days.map((d, i) => `### ${d}\n\n:::record measurement #sleep-${d}\nmetric: sleep\nunit: h\nvalue: ${sleep[i]}\n:::\n\n:::record measurement #steps-${d}\nmetric: steps\nvalue: ${steps[i]}\n:::\n`).join('\n')
  + '\n:::record chart #week\nmetrics: sleep, steps\nstart: 2026-10-26\nend: 2026-11-01\n:::\n';
const [c] = charts(parse(text));
drawChart(document.getElementById('demo-chart'), c.model);

// the reasons, ticked by hand: a pencil box after each real checkbox, the words in the pen hand
const list = document.getElementById('why-list'), answer = document.getElementById('why-answer');
list.querySelectorAll('.hw-check input').forEach((input, i) => input.after(boxSVG(document, { seed: 31 + i * 7 })));
handwrite(list, { hand: 'pen', ink: 'blue', seed: 3, inputs: false });
const say = () => {
  const n = list.querySelectorAll('input:checked').length;
  answer.textContent = n === 0 ? '' : n < 3 ? `${n} of 6. A good start.` : n < 6 ? `${n} of 6. Jot was made for journals like yours.` : 'All six. Start writing →';
};
list.addEventListener('change', say);

// a page, written by hand on dots: the same renderer and grid as the workspace
const page = `### 2026-10-26 | Monday

The rain made the room feel ==quieter==. I wanted to remember that.

[x] Walk before work
[x] Water the plants
[ ] Call Sam back

-> A small beginning is still a beginning. <-
`;
renderPreview(parse(page), document.getElementById('written-demo'), { hand: { hand: 'pen', ink: 'blue', pitchMm: 5, seed: 2 } });
