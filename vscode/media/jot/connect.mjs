/** Jot connections, draft 0.1: the few places a journal can reach out to, each only when someone asks (a command, a button, a setting
 * they turned on). Nothing here runs by itself, and nothing is sent but what each function says. fetch is passed in (fetchImpl), so
 * the command line, VS Code and the tests choose how; no keys are kept here.
 *
 *   sendWebhook(url, body)            POST a JSON summary (automation.mjs payload) to a webhook: Zapier, Make, n8n, IFTTT, your own
 *   todoistAdd(tasks, token)          open tasks as Todoist tasks (content and due date), with your own API token
 *   weather(lat, lon, date)           a day's weather from Open-Meteo (no account, no key) as a record: chartable numbers and a sky
 *
 * What comes back into a journal is an ordinary record with source: naming the service (spec 8.2.1: the file stays the source).
 */
const need = (fetchImpl) => { if (typeof fetchImpl !== 'function') throw new Error('No way to reach the internet here (fetch is missing)'); return fetchImpl; };
async function check(res, what) {
  if (res.ok) return res;
  let detail = ''; try { detail = (await res.text()).slice(0, 200); } catch { /* none */ }
  throw new Error(`${what} answered ${res.status}${detail ? `: ${detail}` : ''}`);
}
/** POSTs body as JSON to url (https only, or http to this machine for testing). -> { status } */
export async function sendWebhook(url, body, { fetchImpl = globalThis.fetch } = {}) {
  let u; try { u = new URL(url); } catch { throw new Error(`Not a web address: ${url}`); }
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname))) throw new Error('A webhook address must start with https://');
  const res = await check(await need(fetchImpl)(u.href, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), 'The webhook');
  return { status: res.status };
}
export const TODOIST_API = 'https://api.todoist.com/api/v1';
/** Each task ({text, date, priority}) as a Todoist task. Todoist's priority 4 is its highest. -> [{ key, id }] in the order given */
export async function todoistAdd(tasks, token, { fetchImpl = globalThis.fetch, base = TODOIST_API } = {}) {
  if (!token) throw new Error('A Todoist API token is needed (Todoist: Settings → Integrations → Developer)');
  const out = [];
  for (const t of tasks) {
    const res = await check(await need(fetchImpl)(`${base.replace(/\/$/, '')}/tasks`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ content: t.text, ...(t.date ? { due_date: t.date } : {}), ...(t.priority === 'high' ? { priority: 4 } : {}) }) }), 'Todoist');
    let id = ''; try { id = String((await res.json()).id || ''); } catch { /* fine */ }
    out.push({ key: t.key, id });
  }
  return out;
}
// WMO weather codes, as Open-Meteo reports them
const SKY = { 0: 'clear', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 56: 'freezing drizzle', 57: 'freezing drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains', 80: 'showers', 81: 'showers', 82: 'heavy showers', 85: 'snow showers', 86: 'snow showers', 95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'thunderstorm with hail' };
export const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
/** A day's weather where you are, as a Jot record (temperatures in °C, rain in mm): -> { record, values } */
export async function weather(lat, lon, date, { fetchImpl = globalThis.fetch, base = OPEN_METEO } = {}) {
  const la = Number(lat), lo = Number(lon);
  if (!(la >= -90 && la <= 90 && lo >= -180 && lo <= 180)) throw new Error('Latitude and longitude are needed for the weather (e.g. 51.5, -0.12)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Not a date: ${date}`);
  const q = `${base}?latitude=${la.toFixed(2)}&longitude=${lo.toFixed(2)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&start_date=${date}&end_date=${date}`;
  const d = (await (await check(await need(fetchImpl)(q), 'Open-Meteo')).json()).daily || {};
  const v = (k) => (Array.isArray(d[k]) && d[k][0] !== null && d[k][0] !== undefined ? Number(d[k][0]) : null);
  const values = { sky: SKY[v('weather_code')] || '', 'temperature-high': v('temperature_2m_max'), 'temperature-low': v('temperature_2m_min'), rain: v('precipitation_sum') };
  const f = (x) => (x === null ? '' : String(Math.round(x * 10) / 10));
  const record = [`:::record observation #weather-${date}`, 'label: weather', ...(values.sky ? [`sky: ${values.sky}`] : []), `temperature-high: ${f(values['temperature-high'])}`, `temperature-low: ${f(values['temperature-low'])}`, `rain: ${f(values.rain)}`, 'source: open-meteo.com', ':::'].join('\n');
  return { record, values };
}
export default { sendWebhook, todoistAdd, weather, TODOIST_API, OPEN_METEO };
