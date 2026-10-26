// Pay periods for the pay_periods module (off in the generic profile). Empty here: copy your employer's posted sheet into OFFICIAL.
// After the last row the same pattern continues as PROJECTED rows (14-day periods, paid 8 days after they end) until the year's end.
const OFFICIAL = []; // [name, period start, period end, payday], e.g. ['P1 Weeks 1 & 2', '2026-10-06', '2026-10-19', '2026-10-27']
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const addDays = (s, n) => iso(Date.parse(s + 'T00:00:00Z') + n * 864e5);
export function payEvents() {
  const rows = OFFICIAL.map(([name, s, e, p]) => ({ name, start: s, end: e, pay: p, projected: false }));
  if (!rows.length) return {};
  let s = addDays(rows[rows.length - 1].end, 1);
  while (s < '2027-10-10') { const e = addDays(s, 13); rows.push({ name: 'Pay period', start: s, end: e, pay: addDays(e, 8), projected: true }); s = addDays(e, 1); }
  const byDate = {};
  const put = (d, text) => (byDate[d] ||= []).push(text);
  for (const r of rows) {
    const tag = r.projected ? ' (projected)' : '';
    put(r.start, `Pay period starts${r.projected ? '' : ': ' + r.name}${tag}`);
    put(r.end, `Pay period ends${tag}`);
    put(r.pay, `Payday${tag}`);
  }
  return byDate;
}
