import { sourceJSON } from './source-response.mjs';
export const HA_LIMITS = Object.freeze({ entities: 5, rows: 200, interval: 7 * 86400000, responseBytes: 524288 });
const ENTITY = /^[a-z][a-z0-9_]*\.[a-z0-9_]+$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
function instant(value) {
  if (typeof value !== 'string' || !TIMESTAMP.test(value) || !Number.isFinite(Date.parse(value))) throw Error('Enter timestamps with seconds and an explicit offset, such as 2026-11-01T09:00:00Z.');
  const day = value.slice(0, 10), date = new Date(day + 'T00:00:00Z');
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== day) throw Error('Choose existing calendar dates.');
  return Date.parse(value);
}
export function homeAssistantOrigin(value) {
  if(typeof value !== 'string' || value.length > 500 || /[\s\\]/.test(value)) throw Error('Use an instance origin without whitespace or backslashes.');
  let url; try { url = new URL(value); } catch { throw Error('Enter a Home Assistant instance URL.'); }
  if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname) || !(url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw Error('Use the HTTPS instance origin without a path, query or credentials. HTTP is supported only for loopback addresses.');
  return url.origin;
}
export function homeAssistantRequest(input, now = Date.now()) {
  const origin = homeAssistantOrigin(input.instance);
  const token = input.token;
  if (typeof token !== 'string' || token.length < 8 || token.length > 8192 || !/^[A-Za-z0-9._~+\/-]+=*$/.test(token)) throw Error('Enter an access token for this session.');
  if (typeof input.entities !== 'string' || input.entities.length > 1000) throw Error('Enter up to five entity IDs.');
  const entities = [...new Set(input.entities.split(/[\s,]+/).filter(Boolean))];
  if (!entities.length || entities.length > HA_LIMITS.entities || entities.some(id => id.length > 200 || !ENTITY.test(id))) throw Error('Choose one to five entity IDs, such as sensor.living_room_temperature.');
  if (origin.includes(token) || entities.some(entity => entity.includes(token))) throw Error('Keep the token only in the access token field.');
  if (!['current', 'history'].includes(input.mode)) throw Error('Choose current states or history.');
  const request = { origin, token, entities, mode: input.mode };
  if (input.mode === 'history') {
    const start = instant(input.start), end = instant(input.end);
    if (start >= end || end - start > HA_LIMITS.interval || end > now) throw Error('Choose a past interval of no more than seven days, with end after start.');
    Object.assign(request, { start: input.start, end: input.end });
  }
  return request;
}
const text = (value, max) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').trim().slice(0, max) : '';
function stateRow(value, entity, request) {
  if (JSON.stringify(value)?.includes(request.token)) throw Error('The source response contains unsafe content. Nothing was added.');
  if (!value || value.entity_id !== entity || typeof value.state !== 'string' || !value.state.length || value.state.length > 512) throw Error('Home Assistant returned an unexpected entity or invalid state.');
  instant(value.last_updated);
  if (value.last_changed !== undefined) instant(value.last_changed);
  const unit = text(value.attributes?.unit_of_measurement, 40), label = text(value.attributes?.friendly_name, 200) || entity, state = text(value.state, 512);
  if (!state || [label, state, unit, entity].some(value => value.includes(request.token))) throw Error('The source response contains unsafe content. Nothing was added.');
  const numeric = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(state) ? Number(state) : null;
  if (numeric !== null && !Number.isFinite(numeric)) throw Error('Home Assistant returned a non-finite numeric state.');
  return { entity, label, state, unit, at: value.last_updated, ...(value.last_changed ? { changedAt: value.last_changed } : {}), value: numeric, missing: ['unknown', 'unavailable'].includes(state), ...(request.mode === 'history' && Date.parse(value.last_updated) < Date.parse(request.start) ? { boundary: true } : {}) };
}
export function homeAssistantSnapshot(groups, request, retrievedAt) {
  instant(retrievedAt);
  if (!Array.isArray(groups) || groups.length !== request.entities.length) throw Error('Incomplete Home Assistant response.');
  let count = 0;
  const entities = groups.map((group, i) => {
    const entity = request.entities[i];
    if (!group || !Array.isArray(group.states)) throw Error('Invalid Home Assistant response.');
    const states = group.states.map(value => stateRow(value, entity, request)); count += states.length;
    if (count > HA_LIMITS.rows || request.mode === 'current' && states.length > 1) throw Error('Too many states. Choose fewer entities or a shorter interval.');
    if (request.mode === 'history') {
      let previous = -Infinity;
      for (let index = 0; index < states.length; index++) {
        const at = Date.parse(states[index].at);
        if (at < previous || at > Date.parse(request.end) || states[index].boundary && index > 0) throw Error('The source returned history outside the selected interval or in an unexpected order.');
        previous = at;
      }
    }
    return { entity, status: states.length ? 'available' : request.mode === 'history' ? 'no-history' : 'not-found', states };
  });
  return { source: 'home-assistant', instance: request.origin, mode: request.mode, retrievedAt, ...(request.mode === 'history' ? { start: request.start, end: request.end } : {}), entities };
}
export function homeAssistantSource(snapshot, id) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw Error('A safe snapshot ID is required.');
  const origin = homeAssistantOrigin(snapshot.instance); instant(snapshot.retrievedAt);
  if(!['current','history'].includes(snapshot.mode) || !Array.isArray(snapshot.entities) || snapshot.entities.length > HA_LIMITS.entities) throw Error('Invalid Home Assistant snapshot.');
  const shared = ['source: home-assistant', `source-instance: ${origin}`, `retrieved-at: ${snapshot.retrievedAt}`, 'data-kind: reported', `capture-kind: ${snapshot.mode}`];
  if (snapshot.mode === 'history') { instant(snapshot.start); instant(snapshot.end); shared.push(`interval-start: ${snapshot.start}`, `interval-end: ${snapshot.end}`); }
  let index = 0, total = 0;
  return snapshot.entities.flatMap(group => {
    if (!Array.isArray(group.states) || (total += group.states.length) > HA_LIMITS.rows) throw Error('Too many or invalid states.');
    if (!ENTITY.test(group.entity)) throw Error('Invalid entity ID.');
    if (!group.states.length) return [[`:::record observation #ha-${id}-${++index}`, `source-entity: ${group.entity}`, ...shared, 'missing: true', `availability: ${group.status === 'no-history' ? 'no-history' : 'not-found'}`, ':::'].join('\n')];
    return group.states.map(row => {
      instant(row.at); if (row.changedAt) instant(row.changedAt);
      const numeric = row.value !== null && !row.missing;
      if (numeric && !Number.isFinite(row.value)) throw Error('Invalid numeric state.');
      return [`:::record ${numeric ? 'measurement' : 'observation'} #ha-${id}-${++index}`, `label: ${text(row.label, 200)}`, `source-entity: ${group.entity}`, `state: ${text(row.state, 512)}`, ...(numeric ? [`metric: ${group.entity.replace('.', '-')}`, `value: ${row.value}`] : []), ...(row.unit ? [`unit: ${text(row.unit, 40)}`] : []), `at: ${row.at}`, ...(row.changedAt ? [`source-last-changed-at: ${row.changedAt}`] : []), ...shared, ...(row.boundary ? ['boundary-state: true'] : []), ...(row.missing ? ['missing: true'] : []), ':::'].join('\n');
    });
  }).join('\n\n');
}
export function createHomeAssistantClient({ fetchImpl = (...args) => fetch(...args), now = () => Date.now() } = {}) {
  let next = 0;
  return {
    async lookup(input, { signal } = {}) {
      const request = homeAssistantRequest(input, now());
      if (now() < next) throw Error('Wait a moment before another lookup.');
      next = now() + 1100;
      const groups = [];
      for (const entity of request.entities) {
        signal?.throwIfAborted();
        const url = new URL(request.mode === 'current' ? '/api/states/' + entity : '/api/history/period/' + encodeURIComponent(request.start), request.origin);
        if (request.mode === 'history') url.search = new URLSearchParams({ filter_entity_id: entity, end_time: request.end });
        let response;
        try { response = await fetchImpl(url.href, { method: 'GET', signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json', Authorization: 'Bearer ' + request.token } }); }
        catch { if (signal?.aborted) signal.throwIfAborted(); throw Error('Home Assistant is unreachable. Check the instance, HTTPS, CORS and browser network policy.'); }
        if (request.mode === 'current' && response.status === 404) { groups.push({ states: [] }); continue; }
        if (!response.ok) {
          if (response.status === 429) next = now() + 10000;
          throw Error([401, 403].includes(response.status) ? 'Home Assistant denied access. Check the session token and account permissions.' : 'Home Assistant could not provide the selected data. Nothing was added.');
        }
        const data = await sourceJSON(response, HA_LIMITS.responseBytes);
        if (request.mode === 'current') groups.push({ states: [data] });
        else {
          if (!Array.isArray(data) || data.length > 1 || data.some(group => !Array.isArray(group))) throw Error('Home Assistant returned unexpected history.');
          groups.push({ states: data[0] || [] });
        }
      }
      signal?.throwIfAborted();
      return homeAssistantSnapshot(groups, request, new Date(now()).toISOString());
    }
  };
}
