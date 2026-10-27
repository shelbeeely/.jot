import { mildlinerPalettes } from './jot/palettes.mjs';
// The home page's pictures, made by the same code as the workspace: a jotted note and the formatted page it becomes, a week of numbers
// drawn by Chart.js, and a sample page written by hand on a dot grid. The homepage stays informational: its examples use the real renderer, with no writing inputs.
import { parse } from './jot/jot.mjs';
import { charts } from './jot/charts.mjs';
import { drawChart, addChartStyles, addHandwritingStyles, renderPreview } from './jot/preview.mjs';

addChartStyles(document); addHandwritingStyles(document);

// what you jot, and what you get: the source shown on the left, laid out in the Journal style on the right
renderPreview(parse(document.getElementById('sample-source').textContent), document.getElementById('sample-page'), { hand: { hand: 'pen', ink: 'blue', pitchMm: 5, seed: 2 } });

// a week of numbers
const sleep = [7.5, 6, 6.5, 8, 5.5, 8.5, 7], steps = [6200, 8400, 4100, 9800, 7300, 12100, 5600];
const days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'];
const text = days.map((d, i) => `### ${d}\n\n:::record measurement #sleep-${d}\nmetric: sleep\nunit: h\nvalue: ${sleep[i]}\n:::\n\n:::record measurement #steps-${d}\nmetric: steps\nvalue: ${steps[i]}\n:::\n`).join('\n')
  + '\n:::record chart #week\nmetrics: sleep, steps\nstart: 2026-10-26\nend: 2026-11-01\n:::\n';
const [c] = charts(parse(text));
drawChart(document.getElementById('demo-chart'), c.model);
document.fonts.ready.then(() => drawChart(document.getElementById('demo-chart'), c.model));

// a page, written by hand on dots: the same renderer and grid as the workspace
const page = `### 2026-10-26 | Monday

The rain made the room feel ==quieter==. I wanted to remember that.

[x] Walk before work
[x] Water the plants
[ ] Call Sam back

-> A small beginning is still a beginning. <-
`;
renderPreview(parse(page), document.getElementById('written-demo'), { hand: { hand: 'pen', ink: 'blue', pitchMm: 5, seed: 2 } });


// Rendered examples, not an editor: each example can reveal the plain Jot that produced it.
const mildColor = (name) => '#' + Object.values(mildlinerPalettes).flat().find(([label]) => label === name)[1];
const examples = [
  ['A little color in the margins', `[Blue for plans]{ink=#245ac2}, [rose for memories]{ink=#b33951}, [green for small wins]{ink=#1d5c3a}.

One thought can hold [more than one color]{ink=#6e4094 highlight=${mildColor('Gold')}}.`],
  ['Keep the good bits', `A [sunshine thought]{highlight=${mildColor('Lemon yellow')} highlight-style=marker}.

A [pink reminder]{highlight=${mildColor('Coral pink')} highlight-style=brush}.

A [quiet green note]{highlight=${mildColor('Green')} highlight-style=pencil}.

[Let this go]{strike=#b33951}. [Keep this close]{underline=#245ac2}.`],
  ['Make a little plan', `[x] Water the plants
[ ] Take a walk
[>] Move this to tomorrow
o 18:30 Dinner with a friend
? What would make today easier?
! Keep a notebook by the door`],
  ['Words, with a little emphasis', `**Something important.** *Something gentle.* ++Something to keep.++

A small x^2^, and a thought with a footnote.[^1]

-> There is room to begin again. <-

[^1]: A little more to say, down here.`],
  ['Room for the everyday', `| Small thing | Today |
| --- | --- |
| A walk | Around the block |
| Something good | A cup of tea |

[[Worth noticing: the light in the kitchen.]]

> [!TIP]
> A sentence is enough.`],
  ['Numbers that stay with your words', `### 2026-10-26 | Monday

:::record measurement #sleep-example
metric: sleep
unit: h
value: 7.5
:::

:::record measurement #steps-example
metric: steps
value: 8200
:::

The numbers can become charts or a CSV. Tasks and events can become calendar entries. The journal stays a plain-text file.`],
];
for (const [i, [title, source]] of examples.entries()) {
  const card = document.createElement('article'); card.className = 'feature-example';
  const heading = document.createElement('h3'); heading.textContent = title;
  const preview = document.createElement('div'); preview.className = 'jot-page'; preview.id = `feature-preview-${i}`; preview.setAttribute('aria-label', title);
  const details = document.createElement('details'), summary = document.createElement('summary'), pre = document.createElement('pre'), code = document.createElement('code');
  summary.textContent = 'See the .jot'; code.textContent = source; pre.tabIndex = 0; pre.append(code); details.append(summary, pre);
  card.append(heading, preview, details); document.getElementById('feature-samples').append(card);
  renderPreview(parse(source), preview, { hand: { hand: 'pen', ink: 'blue', pitchMm: 5, seed: i + 10 } });
}


for (const [groupIndex, [group, colors]] of Object.entries(mildlinerPalettes).entries()) {
  const card = document.createElement('article'); card.className = 'feature-example mildliner-group';
  const title = document.createElement('h3'); title.textContent = group.replace('Mildliner — ', '');
  const list = document.createElement('ul'); list.className = 'mildliner-colors';
  card.append(title, list); document.getElementById('mildliner-groups').append(card);
  for (const [colorIndex, [name, hex]] of colors.entries()) {
    const row = document.createElement('li'); row.dataset.hex = '#' + hex.toLowerCase();
    const dot = document.createElement('span'); dot.className = 'reference-dot'; dot.style.backgroundColor = '#' + hex; dot.setAttribute('aria-hidden', 'true');
    const preview = document.createElement('div'); preview.className = 'palette-preview'; preview.id = `mildliner-${groupIndex}-${colorIndex}`;
    const code = document.createElement('code'); code.textContent = '#' + hex;
    row.append(dot, preview, code); list.append(row);
    renderPreview(parse(`[${name}]{highlight=#${hex}}`), preview, { hand: { hand: 'pen', ink: 'blue', pitchMm: 5, seed: groupIndex * 5 + colorIndex + 1 } });
  }
}
