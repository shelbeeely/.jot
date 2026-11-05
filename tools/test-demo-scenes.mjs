// Mocked transport checks for the explicit authoring command. Live demo artifacts are never made from these responses.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateDemoScenes, reusableScene, sceneArguments } from './generate-demo-scenes.mjs';
import { journalDays, placePrompt, PLACE_SCHEMA, readPlaceFile } from '../site/dist/scene-journal-core.mjs';

const SOURCE = '### 2026-10-01 | A small morning\nA mug of tea on the desk.\n';
const SHAPE = { type: 'box', position: [0, 0.5, 0], rotation: [0, 0, 0], size: [1, 1, 1], color: '#aabbcc', roughness: 0.8, glow: false };
const quiet = () => {};

test('authoring uses Writer transport, exact numbered prose and privacy settings, and resumes only unchanged output', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-demo-scenes-')); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let requests = 0;
  const fetcher = async (url, init) => {
    requests++;
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(init.headers.Authorization, 'Bearer test-key');
    const body = JSON.parse(init.body), prompt = placePrompt(journalDays(SOURCE)[0]);
    assert.deepEqual(body.messages, [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }]);
    assert.deepEqual(body.response_format.json_schema.schema, PLACE_SCHEMA);
    assert.deepEqual(body.provider, { zdr: true, data_collection: 'deny', require_parameters: true });
    assert.deepEqual(body.reasoning, { effort: 'low' });
    assert.equal(body.max_tokens, 24000);
    const content = JSON.stringify({ title: 'Test response', objects: [{ name: 'Desk', position: [0, 0, 0], rotation: [0, 0, 0], moments: [1], shapes: [SHAPE] }] });
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content } }] }), { headers: { 'Content-Type': 'application/json' } });
  };
  const options = { source: SOURCE, directory, key: 'test-key', model: 'test/model', report: quiet, fetcher };
  assert.deepEqual(await generateDemoScenes(options), [{ date: '2026-10-01', reused: false }]);
  const filename = path.join(directory, '2026-10-01.json'), text = fs.readFileSync(filename, 'utf8');
  const index = JSON.parse(fs.readFileSync(path.join(directory, 'index.json'), 'utf8'));
  assert.equal(readPlaceFile(text, journalDays(SOURCE)[0]).objects[0].moments[0].text, 'A mug of tea on the desk.');
  assert.ok(!JSON.stringify(index).includes('test-key'));
  assert.deepEqual(await generateDemoScenes(options), [{ date: '2026-10-01', reused: true }]); assert.equal(requests, 1);
  const metadata = index.scenes['2026-10-01'];
  assert.equal(reusableScene(journalDays(SOURCE)[0], metadata, text, { model: 'test/model', zdr: true }), true);
  assert.equal(reusableScene(journalDays(SOURCE.replace('tea', 'coffee'))[0], metadata, text, { model: 'test/model', zdr: true }), false);
  assert.equal(reusableScene(journalDays(SOURCE)[0], metadata, text + ' ', { model: 'test/model', zdr: true }), false);
  assert.equal(reusableScene(journalDays(SOURCE)[0], metadata, text, { model: 'test/model', zdr: false }), false);
});

test('missing credentials and failed requests create no substitute scenes', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'jot-demo-scenes-fail-')); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  await assert.rejects(generateDemoScenes({ source: SOURCE, directory, report: quiet }), /OPENROUTER_API_KEY/);
  assert.deepEqual(fs.readdirSync(directory), []);
  await assert.rejects(generateDemoScenes({ source: SOURCE, directory, key: 'test-key', report: quiet, fetcher: async () => new Response('{}', { status: 401 }) }), /HTTP 401.*remain saved/);
  assert.deepEqual(fs.readdirSync(directory), []);
});

test('privacy relaxation is explicit and CLI parsing never needs to print credentials', () => {
  assert.equal(sceneArguments([], { OPENROUTER_API_KEY: 'test-key' }).zdr, true);
  assert.equal(sceneArguments(['--allow-retention'], { OPENROUTER_API_KEY: 'test-key' }).zdr, false);
  assert.equal(sceneArguments(['--concurrency', '8'], {}).concurrency, 8);
  assert.throws(() => sceneArguments(['--model']), /value is required/);
});
