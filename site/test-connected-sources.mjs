import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCE_CATALOG, calendarDate, weatherRequest, weatherSnapshot, weatherSource, createSourceClient } from './dist/connected-sources.mjs';
import { parse, stringify } from '../parser/jot.mjs';
const instant = Date.parse('2026-11-01T12:00:00Z');
const input = { latitude: '51.5', longitude: '-0.12', date: '2026-10-01', timezone: 'Europe/London' };
const payload = { timezone: 'Europe/London', daily: {time:['2026-10-01'],temperature_2m_max:[15],temperature_2m_min:[null],precipitation_sum:[0]}, daily_units:{temperature_2m_max:'°C',temperature_2m_min:'°C',precipitation_sum:'mm'} };
test('source capabilities stay read-only; dates, coordinates and timezone are explicit', () => {
 assert.deepEqual(SOURCE_CATALOG[0].capabilities,['lookup','snapshot']);
 for(const date of ['2026-02-30','2026-2-01','2026-11-01\n:::'])assert.throws(()=>calendarDate(date));
 for(const patch of [{latitude:''},{longitude:'Infinity'},{latitude:91},{timezone:'auto'},{timezone:'UTC\nfoo'},{date:'1939-01-01'},{date:'2026-11-16'}])assert.throws(()=>weatherRequest({...input,...patch},instant));
 const old=weatherRequest(input,instant),future=weatherRequest({...input,date:'2026-11-02'},instant);
 assert.equal(new URL(old.url).hostname,'archive-api.open-meteo.com');assert.equal(old.dataKind,'estimated');assert.equal(future.dataKind,'forecast');
 const url=new URL(future.url);assert.equal(url.searchParams.get('timezone'),'Europe/London');assert.equal(url.searchParams.get('start_date'),'2026-11-02');assert.equal(url.searchParams.has('query'),false);
});
test('missing weather stays missing, model provenance and attribution survive source round-trip',()=>{
 const snap=weatherSnapshot(payload,weatherRequest(input,instant),new Date(instant).toISOString());const source=weatherSource(snap,'one');
 assert.match(source,/data-kind: estimated/);assert.match(source,/retrieved-at: 2026-11-01T12:00:00.000Z/);assert.match(source,/metric: weather-temperature-low\nmissing: true\nunit: C/);assert.match(source,/metric: weather-precipitation\nvalue: 0/);assert.match(source,/CC BY 4.0/);
 const ast=parse(source);assert.equal(ast.diagnostics.filter(d=>d.severity==='error').length,0);assert.equal(stringify(ast),source);
 assert.throws(()=>weatherSource({...snap,retrievedAt:'2026-11-01\n:::record note'},'one'));
 assert.throws(()=>weatherSource({...snap,latitude:'1\n:::'},'one'));
});
test('wrong dates, units, missing series, injected values and out-of-range readings are rejected',()=>{
 for(const change of [data=>data.daily.time=['2026-10-02'],data=>data.daily_units.temperature_2m_max='°F',data=>data.daily.precipitation_sum=[-1],data=>data.daily.temperature_2m_max=['15\n:::'],data=>delete data.daily.temperature_2m_max,data=>data.daily.temperature_2m_max=[101]]){
  const data=structuredClone(payload);change(data);assert.throws(()=>weatherSnapshot(data,weatherRequest(input,instant),new Date(instant).toISOString()));
 }
});
test('transport bounds the response, omits credentials, forbids redirects and never receives journal source',async()=>{
 const calls=[];const client=createSourceClient({now:()=>instant,fetchImpl:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(payload));}});
 assert.equal(calls.length,0);const signal=new AbortController().signal;await client.lookup('weather',input,{signal});assert.equal(calls.length,1);assert.equal(calls[0].options.credentials,'omit');assert.equal(calls[0].options.referrerPolicy,'no-referrer');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.signal,signal);assert.equal(calls[0].options.body,undefined);
 await assert.rejects(client.lookup('weather',input),/Wait/);await assert.rejects(client.lookup('arbitrary-url',input),/not implemented/);
 for(const response of [new Response('x',{status:429}),new Response('x',{headers:{'content-length':'262145'}}),new Response('x'.repeat(262145)),new Response('<script>')]){
  const other=createSourceClient({now:()=>instant,fetchImpl:async()=>response});await assert.rejects(other.lookup('weather',input));
 }
});
