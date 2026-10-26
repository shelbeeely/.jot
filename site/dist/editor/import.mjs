/** Import a day layout from the print editor (Journalwright's content/daypage.json, layout v2: { v: 2, blocks: [...] }) as the
 *  template's "Each day" blocks. Each print block becomes the Jot block that asks the same thing; the day's printed data (moon, holidays,
 *  events) and paper-only blocks (sketch boxes, photos, puzzles, tracing, spacers, the send-to strip) have nothing to fill in and are
 *  left out by name. Pure; the result goes through normalizeTemplate like anything read from a file.
 *    importDayLayout(json) -> { blocks: [jot blocks], skipped: [names], count } */
const NAMES = {
  sky: 'Moon, sun & season', notes: 'Holidays & notes', events: 'Events', fact: 'On this day', sketch: 'Sketch box', photoframe: 'Photo frame',
  photostrip: 'Photo strip', photodaily: 'Photo a day', contactsheet: 'Contact sheet', wordsearch: 'Word search', crossword: 'Crossword', sudoku: 'Sudoku',
  maze: 'Maze', cryptogram: 'Cryptogram', wordladder: 'Word ladder', nonogram: 'Nonogram', kakuro: 'Kakuro', dottodot: 'Dot to dot',
  stimtrace: 'Pattern to trace', chorerota: 'Chore rotation', weekstrip: 'Week at a glance', divider: 'Divider', spacer: 'Space', sendto: 'Send to',
};
const REVIEW = { well: 'Went well', hard: 'Was hard', next: 'Tomorrow' };
const SENSES = { sound: 'Sound', light: 'Light', crowd: 'Crowds', touch: 'Touch', smell: 'Smell', social: 'Social', temp: 'Temperature', move: 'Movement' };
const BODYSIG = { stomach: 'Hungry', water: 'Thirsty', toilet: 'Toilet', temp: 'Hot/cold', tense: 'Tense', heart: 'Heart', tired: 'Tired' };
const THOUGHT = { 3: ['Thought', 'Trap', 'Balanced'], 5: ['Situation', 'Feeling %', 'Thought', 'Balanced', 'Outcome'], 7: ['Situation', 'Mood %', 'Thought', 'For', 'Against', 'Balanced', 'Mood now'] };
const STIM = { touch: 'Touch', move: 'Movement', sound: 'Sound', sight: 'Sight', chew: 'Taste and chew', press: 'Deep pressure' };
// The print editor's defaults, for a block saved without them
const DEF = {
  actions: { count: 3 }, review: { items: { well: true, hard: true, next: true } }, spoons: { count: 12 }, checks: { title: 'Habits', labels: ['Stretch', 'Outside', 'Read'] },
  scale: { title: 'Energy', steps: 5, zero: false, signed: false, lo: 'low', hi: 'high' }, words: { title: 'Feeling', words: ['calm', 'tired', 'anxious', 'content', 'flat'] },
  sensory: { items: { sound: true, light: true, crowd: true, touch: true } }, sleeptimes: { quality: true }, habits: { title: 'Habits', labels: ['Stretch', 'Outside', 'Read', 'Water'] },
  fields: { title: 'Outside', labels: ['Minutes outside', 'Steps'] }, weather: { aqi: true }, feelings: { title: 'Feelings', labels: ['Sad', 'Shame', 'Anger', 'Fear', 'Joy'] },
  skills: { title: 'Skills' }, urge: { title: 'Urges', labels: ['Urge'] }, thought: { cols: 3 }, sites: { title: 'Site', labels: ['L thigh', 'R thigh', 'L belly', 'R belly'] },
  bodysig: { n: 2, items: { stomach: true, water: true, toilet: true, tense: true, tired: true } }, lines: { title: 'Notes' }, bullets: { title: 'Log', n: 5 },
  good: { label: 'Small good things', n: 3 }, split: { left: 'Morning', right: 'Evening' }, top: { title: 'Top 3', n: 3 }, timeline: { from: 8, to: 22, every: 2 },
  money: { n: 4 }, reach: { n: 2 }, tl24: { start: 0, every: 3 }, dump: { title: 'Brain dump' }, later: { title: 'Later' }, done: { title: 'Done', n: 1 },
  wall: { title: 'Wall of Awful', words: ['scary', 'boring', 'too big', 'unclear', 'tired', 'stuck'], ways: ['tiny step', 'ask', '5 minutes', 'not today'] },
  stamps: { title: 'Between tasks', n: 1 }, rounds: { title: 'Focus rounds', n: 1 }, energy: { title: 'Energy left', labels: ['Body', 'Mind', 'People', 'Senses'], steps: 3 },
  accounts: { title: 'Energy account', n: 2 }, keep: { title: 'Words to keep' }, lookback: { period: 'month' }, pixel: { levels: 5 }, range: { title: 'Low and high', steps: 5, lo: 'flat', hi: 'bright' },
  chores: { title: 'Chores', n: 5 }, cornell: { title: 'Cornell notes' }, notearea: { title: 'Notes' }, conceptmap: { title: 'Concept map', branches: 5 },
  questions: { title: 'Questions', n: 4 }, summarybox: { title: 'Summary' }, flashstrip: { title: 'Flash cards', n: 6 },
  reviewtracker: { title: 'Reviews', n: 5, every: { d1: true, d3: true, d7: true, d21: true } }, stimlog: { title: 'Stim log', n: 3, where: true, ba: true },
  stimmenu: { title: 'My stim menu', senses: { touch: true, move: true, sound: true, sight: true, chew: true, press: true }, rows: 2, ideas: 2 },
  care: { rows: [{ id: 'meds', on: true, items: { am: true, pm: true, prn: true } }, { id: 'meals', on: true, meals: 3 }, { id: 'work', on: true, work: true }, { id: 'checkin', on: true, steps: 7 }, { id: 'water', on: true, count: 8 }] },
};
const keys = (o, names) => Object.entries(names).filter(([k]) => o && o[k]).map(([, v]) => v);
const num = (v, d) => (Number.isFinite(+v) ? Math.round(+v) : d);
const half = (steps) => Math.floor(num(steps, 7) / 2);

// One print block -> Jot blocks ([] = nothing to fill in)
function convert(raw) {
  const b = { ...(DEF[raw.type] || {}), ...raw }, t = (x, d) => (typeof x === 'string' && x.trim() ? x : d);
  switch (b.type) {
    case 'body': return [{ type: 'writing', title: 'Writing' }];
    case 'lines': case 'dump': case 'later': case 'notearea': case 'summarybox': case 'cornell': return [{ type: 'writing', title: t(b.title, 'Notes') }];
    case 'keep': return [{ type: 'writing', title: t(b.title, 'Words to keep') }];
    case 'lookback': return [{ type: 'writing', title: b.period === 'year' ? 'A year ago today' : 'A month ago today' }];
    case 'review': return keys(b.items, REVIEW).map((x) => ({ type: 'writing', title: x }));
    case 'split': return [{ type: 'writing', title: t(b.left, 'Morning') }, { type: 'writing', title: t(b.right, 'Evening') }];
    case 'actions': return [{ type: 'tasks', title: 'Action items', n: num(b.count, 3) }];
    case 'top': return [{ type: 'tasks', title: t(b.title, 'Top 3'), n: num(b.n, 3) }];
    case 'reach': return [{ type: 'tasks', title: 'Reach out', n: num(b.n, 2) }];
    case 'rounds': return [{ type: 'tasks', title: t(b.title, 'Focus rounds'), n: num(b.n, 1) }];
    case 'chores': return [{ type: 'tasks', title: t(b.title, 'Chores'), n: num(b.n, 5) }];
    case 'checks': case 'habits': return [{ type: 'checks', title: t(b.title, 'Habits'), labels: b.labels || [] }];
    case 'good': return [{ type: 'list', title: t(b.label, 'Small good things'), n: num(b.n, 3), style: 'bullets' }];
    case 'bullets': case 'done': case 'stamps': return [{ type: 'list', title: t(b.title, 'Log'), n: num(b.n, 3), style: 'bullets' }];
    case 'questions': return [{ type: 'list', title: t(b.title, 'Questions'), n: num(b.n, 4), style: 'numbers' }];
    case 'conceptmap': return [{ type: 'list', title: t(b.title, 'Concept map'), n: num(b.branches, 5), style: 'bullets' }];
    case 'stimmenu': return [{ type: 'list', title: t(b.title, 'My stim menu'), n: keys(b.senses, STIM).length * num(b.rows, 2) + num(b.ideas, 2), style: 'bullets' }];
    case 'scale': { const s = num(b.steps, 5), [min, max] = b.signed ? [-half(s), half(s)] : b.zero ? [0, s - 1] : [1, s]; return [{ type: 'scale', title: t(b.title, 'Energy'), min, max, lo: b.lo || '', hi: b.hi || '' }]; }
    case 'pixel': return [{ type: 'scale', title: 'Day', min: 1, max: num(b.levels, 5), lo: 'hard', hi: 'good' }];
    case 'spoons': return [{ type: 'scale', title: 'Spoons left', min: 0, max: num(b.count, 12), lo: '', hi: '' }];
    case 'skills': return [{ type: 'scale', title: t(b.title, 'Skills'), min: 0, max: 7, lo: 'not thought of', hi: 'used them, they helped' }];
    case 'range': return [{ type: 'ratings', title: t(b.title, 'Low and high'), labels: ['Low', 'High'], min: 1, max: num(b.steps, 5), lo: b.lo || '', hi: b.hi || '' }];
    case 'feelings': return [{ type: 'ratings', title: t(b.title, 'Feelings'), labels: b.labels || [], min: 0, max: 5, lo: 'none', hi: 'strong' }];
    case 'energy': return [{ type: 'ratings', title: t(b.title, 'Energy left'), labels: b.labels || [], min: 0, max: Math.max(1, num(b.steps, 3) - 1), lo: 'none', hi: 'plenty' }];
    case 'sensory': return [{ type: 'ratings', title: 'Sensory load', labels: keys(b.items, SENSES), min: 0, max: 3, lo: 'quiet', hi: 'too much' }];
    case 'urge': return [{ type: 'ratings', title: t(b.title, 'Urges'), labels: b.labels || ['Urge'], min: 0, max: 5, lo: 'none', hi: 'strong' }, { type: 'checks', title: 'Acted on it', labels: (b.labels || ['Urge']).map((l) => `Acted on: ${l}`) }];
    case 'fields': return [{ type: 'blanks', title: t(b.title, 'Today'), labels: b.labels || [] }];
    case 'weather': return [{ type: 'blanks', title: 'Weather', labels: ['Sky', 'High', 'Low', ...(b.aqi ? ['Air quality'] : [])] }];
    case 'sleeptimes': return [{ type: 'blanks', title: 'Sleep', labels: ['Bed', 'Wake', ...(b.quality ? ['Quality'] : [])] }];
    case 'shift': return [{ type: 'blanks', title: 'Work shift', labels: ['In', 'Out', 'Break'] }];
    case 'bus': return [{ type: 'blanks', title: 'Bus plan', labels: ['Route', 'Stop', 'Leave', 'Back'] }];
    case 'accounts': return [{ type: 'blanks', title: t(b.title, 'Energy account'), labels: ['Start', ...Array.from({ length: num(b.n, 2) }, (_, i) => `Cost ${i + 1}`)] }];
    case 'thought': return [{ type: 'blanks', title: 'Thought record', labels: THOUGHT[b.cols] || THOUGHT[3] }];
    case 'words': return [{ type: 'choose', title: t(b.title, 'Feeling'), words: b.words || [] }];
    case 'sites': return [{ type: 'choose', title: t(b.title, 'Site'), words: b.labels || [] }];
    case 'bodysig': return [{ type: 'choose', title: 'Body signals', words: keys(b.items, BODYSIG) }];
    case 'wall': return [{ type: 'choose', title: 'In the way', words: b.words || [] }, { type: 'choose', title: 'A way past', words: b.ways || [] }];
    case 'timeline': return [{ type: 'times', title: 'Time blocks', from: num(b.from, 8), to: num(b.to, 22), every: num(b.every, 2) }];
    case 'tl24': return [{ type: 'times', title: 'Time line', from: num(b.start, 0), to: 24, every: num(b.every, 3) }];
    case 'money': return [{ type: 'table', title: 'Spending', columns: ['What', 'How much'], rows: num(b.n, 4) }];
    case 'flashstrip': return [{ type: 'table', title: t(b.title, 'Flash cards'), columns: ['Term', 'Answer'], rows: num(b.n, 6) }];
    case 'reviewtracker': return [{ type: 'table', title: t(b.title, 'Reviews'), columns: ['Topic', ...Object.entries({ d1: '1 day', d3: '3 days', d7: '7 days', d14: '14 days', d21: '21 days', d30: '30 days' }).filter(([k]) => b.every && b.every[k]).map(([, v]) => v)], rows: num(b.n, 5) }];
    case 'stimlog': return [{ type: 'table', title: t(b.title, 'Stim log'), columns: ['When', 'What felt good', ...(b.where ? ['Where', 'What helped'] : []), ...(b.ba ? ['Settled before', 'Settled after'] : [])], rows: num(b.n, 3) }];
    case 'prompt': return [{ type: 'prompt', questions: ['What do I need today?', 'What is one small thing I can do for myself?', 'What am I looking forward to?', 'What felt good today?'] }];
    case 'care': {
      const out = [], rows = Array.isArray(b.rows) ? b.rows.filter((r) => r && r.on) : [], ticks = [];
      for (const r of rows) {
        if (r.id === 'meds') ticks.push(...keys(r.items || { am: true, pm: true, prn: true }, { am: 'Meds: morning', pm: 'Meds: evening', prn: 'Meds: as needed' }));
        if (r.id === 'meals') { for (let i = 1; i <= num(r.meals, 3); i++) ticks.push(`Meal ${i}`); if (r.snack) ticks.push('Snack'); }
        if (r.id === 'self_care') ticks.push(...keys(r.items || {}, { shower: 'Shower', teeth: 'Teeth', joy: 'Did something I enjoy', text: 'Texted someone' }));
      }
      if (ticks.length) out.push({ type: 'checks', title: 'Care', labels: ticks });
      if (rows.some((r) => r.id === 'checkin')) { const h = half(rows.find((r) => r.id === 'checkin').steps); out.push({ type: 'scale', title: 'Mood', min: -h, max: h, lo: 'low', hi: 'high' }); }
      if (rows.some((r) => r.id === 'anxiety')) out.push({ type: 'scale', title: 'Anxiety', min: 0, max: 3, lo: 'calm', hi: 'high' });
      const blanks = [...(rows.some((r) => r.id === 'work' && r.work !== false) ? ['Work shift'] : []), ...(rows.some((r) => r.id === 'work' && r.sleep) ? ['Sleep hours'] : []), ...(rows.some((r) => r.id === 'water') ? ['Water'] : [])];
      if (blanks.length) out.push({ type: 'blanks', title: 'Care numbers', labels: blanks });
      return out;
    }
    default: return null; // printed data, paper only, or a block this importer does not know
  }
}

export function importDayLayout(json) {
  const L = typeof json === 'string' ? JSON.parse(json) : json;
  if (!L || typeof L !== 'object' || !Array.isArray(L.blocks)) throw new Error('not a day layout');
  const blocks = [], skipped = [];
  for (const raw of L.blocks) {
    if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string' || raw.on === false) continue;
    const out = convert(raw);
    if (out === null) { const n = NAMES[raw.type] || raw.type; if (!skipped.includes(n)) skipped.push(n); continue; }
    blocks.push(...out);
  }
  return { blocks, skipped, count: L.blocks.filter((x) => x && x.on !== false).length };
}
