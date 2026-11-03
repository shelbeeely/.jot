import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, stringify } from '../parser/jot.mjs';
import { homeAssistantOrigin, homeAssistantRequest, homeAssistantSnapshot, homeAssistantSource, createHomeAssistantClient, HA_LIMITS } from './dist/home-assistant-source.mjs';
import { createSourceClient, SOURCE_CATALOG } from './dist/connected-sources.mjs';
const now = Date.parse('2026-11-01T12:00:00Z'), token = 'test-session-credential';
const input = { instance: 'https://ha.example.test', token, mode: 'current', entities: 'sensor.temperature' };
const state = (patch = {}) => ({ entity_id: 'sensor.temperature', state: '0', attributes: {friendly_name:'Room temperature',unit_of_measurement:'C',ignored_private_attribute:'not copied'},last_updated:'2026-11-01T10:00:00.123456+00:00',last_changed:'2026-11-01T09:00:00Z',...patch });
const history = {...input,mode:'history',start:'2026-11-01T09:30:00Z',end:'2026-11-01T11:00:00Z'};
test('only explicit safe origins/entities/modes/times and session tokens can be requested',()=>{
 assert.equal(homeAssistantOrigin('http://127.0.0.1:8123/'),'http://127.0.0.1:8123');
 for(const instance of ['http://192.168.1.2:8123','https://ha.test/api/services','https://user:pass@ha.test','https://ha.test/?token=x','https://ha.test/#x','file:///','https://ha.test\\evil','https://ha.test\n.evil'])assert.throws(()=>homeAssistantOrigin(instance));
 for(const patch of [{token:'unsafe\r\nAuthorization:x'},{entities:'sensor.x/../../services'},{entities:'sensor.a sensor.b sensor.c sensor.d sensor.e sensor.f'},{mode:'services'}])assert.throws(()=>homeAssistantRequest({...input,...patch},now));
 for(const patch of [{start:'2026-02-30T09:00:00Z'},{start:'2026-11-01T09:30:00'},{end:'2026-11-01T13:00:00Z'},{start:'2026-10-01T09:30:00Z'},{end:history.start}])assert.throws(()=>homeAssistantRequest({...history,...patch},now));
 assert.deepEqual(homeAssistantRequest({...input,entities:'sensor.a, sensor.a\nsensor.b'},now).entities,['sensor.a','sensor.b']);
 assert.deepEqual(SOURCE_CATALOG.find(s=>s.id==='home-assistant').capabilities,['lookup','history','snapshot']);
});
test('current reads use only selected state GET endpoints, never cookies, redirects, body or service calls',async()=>{
 const calls=[];const client=createSourceClient({now:()=>now,fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json(state());}});
 assert.equal(calls.length,0);const result=await client.lookup('home-assistant',input);assert.equal(calls.length,1);
 const {url,options}=calls[0];assert.equal(url,'https://ha.example.test/api/states/sensor.temperature');assert.equal(options.method,'GET');assert.equal(options.headers.Authorization,'Bearer '+token);assert.equal(options.body,undefined);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.referrerPolicy,'no-referrer');
 const source=homeAssistantSource(result,'snapshot');assert.match(source,/value: 0/);assert.match(source,/source-entity: sensor.temperature/);assert.match(source,/at: 2026-11-01T10:00:00.123456\+00:00/);assert.match(source,/data-kind: reported/);assert.doesNotMatch(source,/not copied|ignored_private|test-session-credential/);assert.equal(stringify(parse(source)),source);assert.equal(parse(source).diagnostics.filter(d=>d.severity==='error').length,0);
 await assert.rejects(client.lookup('home-assistant',input),/Wait/);
});
test('unknown/unavailable and missing entities are observations, never invented numeric zero',async()=>{
 for(const status of ['unknown','unavailable']){
  const snap=homeAssistantSnapshot([{states:[state({state:status})]}],homeAssistantRequest(input,now),new Date(now).toISOString());const source=homeAssistantSource(snap,'missing');assert.match(source,/record observation/);assert.match(source,/missing: true/);assert.doesNotMatch(source,/\nvalue:/);
 }
 const client=createHomeAssistantClient({now:()=>now,fetchImpl:async()=>new Response('',{status:404})});const missing=await client.lookup(input);assert.match(homeAssistantSource(missing,'notfound'),/availability: not-found/);
});
test('history preserves boundary states, selected interval and missing retention without current fallback',async()=>{
 const calls=[],client=createHomeAssistantClient({now:()=>now,fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json([[state({last_updated:'2026-11-01T09:00:00Z'}),state()]]);}});
 const result=await client.lookup(history);const source=homeAssistantSource(result,'history');assert.match(source,/boundary-state: true/);assert.match(source,/interval-start: 2026-11-01T09:30:00Z/);const url=new URL(calls[0].url);assert.equal(decodeURIComponent(url.pathname),'/api/history/period/'+history.start);assert.equal(url.searchParams.get('filter_entity_id'),'sensor.temperature');assert.equal(url.searchParams.get('end_time'),history.end);assert.equal(calls[0].options.method,'GET');
 const empty=createHomeAssistantClient({now:()=>now,fetchImpl:async()=>Response.json([])});assert.match(homeAssistantSource(await empty.lookup(history),'empty'),/availability: no-history/);
 assert.equal(calls.length,1);assert.equal(calls.some(c=>c.url.includes('/api/states/')),false);
});
test('unsolicited entities, malformed timestamps, out-of-order/out-of-range history and oversize samples are rejected',()=>{
 const request=homeAssistantRequest(history,now),at=new Date(now).toISOString();
 for(const values of [[state({entity_id:'sensor.other'})],[state({last_updated:'not-a-time'})],[state({last_updated:'2026-11-01T11:01:00Z'})],[state(),state({last_updated:'2026-11-01T09:31:00Z'})],[state({last_updated:'2026-11-01T09:00:00Z'}),state({last_updated:'2026-11-01T09:01:00Z'})],Array.from({length:HA_LIMITS.rows+1},()=>state())])assert.throws(()=>homeAssistantSnapshot([{states:values}],request,at));
 const injection=homeAssistantSnapshot([{states:[state({state:'on\n:::record note #injected',attributes:{friendly_name:'name\n:::','unit_of_measurement':'C\n:::'}})]}],homeAssistantRequest(input,now),at);
 const source=homeAssistantSource(injection,'safe');assert.equal(parse(source).nodes.filter(n=>n.type==='record').length,1);
 for(const patch of [{state:token},{attributes:{friendly_name:token+'x'.repeat(500)}},{attributes:{unit_of_measurement:token}}])assert.throws(()=>homeAssistantSnapshot([{states:[state(patch)]}],request,at));
});
test('auth, network, JSON/size failures and cancellation cannot leak tokens or fall back to another host',async()=>{
 for(const response of [new Response('secret '+token,{status:401}),new Response('bad',{status:403}),new Response('bad',{status:500}),new Response('x',{headers:{'content-length':String(HA_LIMITS.responseBytes+1)}}),new Response('x'.repeat(HA_LIMITS.responseBytes+1)),new Response('<html>'),Response.json([[state({entity_id:'sensor.other'})]])]){
  const calls=[];const client=createHomeAssistantClient({now:()=>now,fetchImpl:async(url)=>{calls.push(url);return response;}});await assert.rejects(client.lookup(input),error=>!error.message.includes(token));assert.equal(calls.length,1);
 }
 const controller=new AbortController();controller.abort();let called=false;const client=createHomeAssistantClient({now:()=>now,fetchImpl:async()=>{called=true;throw Error(token);}});await assert.rejects(client.lookup(input,{signal:controller.signal}));assert.equal(called,false);
 const bad=createHomeAssistantClient({now:()=>now,fetchImpl:async()=>{throw Error(token);}});await assert.rejects(bad.lookup(input),e=>e.message.includes('unreachable')&&!e.message.includes(token));
});
