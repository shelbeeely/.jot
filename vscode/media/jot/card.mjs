/** Jot flip cards, draft 0.1: what a `:::record card` holds, as plain data (spec 8.1.7). No DOM, so the parser's warnings, the preview
 * (preview.mjs) and the tests read a card the same way.
 *
 *   :::record card #photosynthesis
 *   front: What does a leaf make from light, water and air?
 *   back: |
 *     Sugar, and oxygen it lets go.
 *   label: Biology, week 3                 (optional)
 *   :::
 *
 * Try to recall, then check: the front shows and the back waits behind a tap. In print and in fixed-layout books a card is a
 * fold-over card, the back upside down below a fold line. Nothing is scored, counted or scheduled.
 *
 *   cardOf(record)        { front, back, label, rest: [{ name, value }] }
 *   cardProblems(record)  [{ code, message }] for the parser: `card-without-front`, `card-without-back`
 */
const KNOWN = new Set(['front', 'back', 'label']);

export function cardOf(record) {
  const out = { front: '', back: '', label: '', rest: [] };
  for (const { name, value } of record?.fields || []) {
    if (!KNOWN.has(name)) { out.rest.push({ name, value }); continue; }
    if (!out[name]) out[name] = String(value ?? '').trim();
    else out.rest.push({ name, value });
  }
  return out;
}

export function cardProblems(record) {
  const c = cardOf(record), problems = [];
  if (!c.front) problems.push({ code: 'card-without-front', message: 'A card needs front: with the question or prompt.' });
  if (!c.back) problems.push({ code: 'card-without-back', message: 'A card needs back: with the answer.' });
  return problems;
}

export default { cardOf, cardProblems };
