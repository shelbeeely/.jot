import { sourceJSON } from './source-response.mjs';
import { createHomeAssistantClient } from './home-assistant-source.mjs';
// Shared on-demand source contract. Opening a picker or a document never performs a request.
export const SOURCE_CATALOG = Object.freeze([
  Object.freeze({ id: 'weather', label: 'Weather · Open-Meteo', capabilities: Object.freeze(['lookup', 'snapshot']), network: true, attribution: 'Open-Meteo · CC BY 4.0', credentials: false }),
  Object.freeze({ id: 'home-assistant', label: 'Home Assistant · read-only', capabilities: Object.freeze(['lookup', 'history', 'snapshot']), network: true, credentials: true })
]);
const DAY = 86400000;
export function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Choose a date in YYYY-MM-DD form.');
  const time = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) throw Error('Choose an existing calendar date.');
  return time;
}
export function weatherRequest({ latitude, longitude, date, timezone }, now = Date.now()) {
  const coordinate = (value, max) => {
    if (!String(value ?? '').trim()) throw Error('Enter both latitude and longitude.');
    const number = Number(value); if (!Number.isFinite(number) || Math.abs(number) > max) throw Error('Check the latitude and longitude ranges.');
    return number;
  };
  const lat = coordinate(latitude, 90), lon = coordinate(longitude, 180), day = calendarDate(date);
  if (typeof timezone !== 'string' || !timezone || timezone.length > 100 || /[\s\r\n]/.test(timezone)) throw Error('Choose an explicit IANA timezone, such as Europe/London or UTC.');
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { throw Error('Choose an explicit IANA timezone, such as Europe/London or UTC.'); }
  const today = calendarDate(new Date(now).toISOString().slice(0, 10));
  if (day < Date.UTC(1940, 0, 1) || day > today + 14 * DAY) throw Error('Weather dates must be from 1940 through the next 14 days.');
  const historical = day < today - 5 * DAY;
  const url = new URL(historical ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(lat), longitude: String(lon), start_date: date, end_date: date, timezone, daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', temperature_unit: 'celsius', precipitation_unit: 'mm' });
  return { url: url.href, latitude: lat, longitude: lon, date, timezone, dataKind: historical ? 'estimated' : 'forecast' };
}
export function weatherSnapshot(data, request, retrievedAt) {
  if (!data || data.error || data.daily?.time?.length !== 1 || data.daily.time[0] !== request.date) throw Error('The provider did not return the chosen day. Try another date; no current-day substitute was used.');
  if (!Number.isFinite(Date.parse(retrievedAt)) || typeof data.timezone !== 'string' || !data.timezone) throw Error('The provider response is missing its timezone or retrieval time.');
  const fields = [['temperature_2m_max', 'weather-temperature-high', 'C', '°C'], ['temperature_2m_min', 'weather-temperature-low', 'C', '°C'], ['precipitation_sum', 'weather-precipitation', 'mm', 'mm']];
  const values = fields.map(([field, metric, unit, providerUnit]) => {
    const list = data.daily[field];
    if (!Array.isArray(list) || list.length !== 1 || data.daily_units?.[field] !== providerUnit) throw Error('The provider returned missing fields or unexpected weather units.');
    const value = list[0];
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || (unit === 'mm' && value < 0) || (unit === 'C' && Math.abs(value) > 100))) throw Error('The provider returned an invalid weather value.');
    return { metric, unit, value };
  });
  return { source: 'open-meteo', date: request.date, timezone: request.timezone, providerTimezone: data.timezone, retrievedAt, dataKind: request.dataKind, latitude: request.latitude, longitude: request.longitude, values };
}
export function weatherSource(snapshot, id) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw Error('A safe snapshot ID is required.');
  // Do not serialize arbitrary provider strings as record fields.
  calendarDate(snapshot.date);
  if (!['estimated', 'forecast'].includes(snapshot.dataKind) || typeof snapshot.retrievedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(snapshot.retrievedAt) || !Number.isFinite(Date.parse(snapshot.retrievedAt)) || typeof snapshot.timezone !== 'string' || /[\r\n]/.test(snapshot.timezone)) throw Error('Invalid snapshot provenance.');
  weatherRequest({latitude:snapshot.latitude,longitude:snapshot.longitude,date:snapshot.date,timezone:snapshot.timezone}, Math.max(Date.now(),calendarDate(snapshot.date)));
  const shared = [`date: ${snapshot.date}`, `timezone: ${snapshot.timezone}`, 'source: open-meteo', `retrieved-at: ${snapshot.retrievedAt}`, `data-kind: ${snapshot.dataKind}`];
  const records = [`:::record observation #weather-${id}`, 'label: Weather model snapshot', ...shared, `latitude: ${snapshot.latitude}`, `longitude: ${snapshot.longitude}`, ':::'].join('\n');
  const measurements = snapshot.values.map((item, index) => {
    if (!['weather-temperature-high', 'weather-temperature-low', 'weather-precipitation'].includes(item.metric) || !['C', 'mm'].includes(item.unit) || item.value !== null && !Number.isFinite(item.value)) throw Error('Invalid weather measurement.');
    return [`:::record measurement #weather-${id}-${index + 1}`, `metric: ${item.metric}`, ...(item.value === null ? ['missing: true'] : [`value: ${item.value}`]), `unit: ${item.unit}`, ...shared, ':::'].join('\n');
  });
  return [records, ...measurements, '[Weather data: Open-Meteo](https://open-meteo.com/) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)'].join('\n\n');
}
export function createSourceClient({ fetchImpl = (...args) => fetch(...args), now = () => Date.now() } = {}) {
  let next = 0; const homeAssistant = createHomeAssistantClient({ fetchImpl, now });
  return {
    async lookup(id, input, { signal } = {}) {
      if (id === 'home-assistant') return homeAssistant.lookup(input, { signal });
      if (id !== 'weather') throw Error('This source is not implemented.');
      const request = weatherRequest(input, now());
      if (now() < next) throw Error('Wait a moment before another lookup.');
      next = now() + 1100;
      const response = await fetchImpl(request.url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!response.ok) { if(response.status === 429) next = now() + 10000; throw Error(response.status === 429 ? 'The weather service is busy. Wait before retrying.' : 'Weather is unavailable for that request. You can keep writing.'); }
      return weatherSnapshot(await sourceJSON(response), request, new Date(now()).toISOString());
    }
  };
}
