import test from 'node:test';
import assert from 'node:assert/strict';
import { aiEndpoint, aiRequest, aiCandidates, aiEdit, requestAI, validateJotFragment } from './dist/ai-client.mjs';
const config = { provider: 'openrouter', model: 'example/model', key: 'test-key', instruction: 'Help me start.' };
const result = (jot = 'A quiet moment.', finish_reason = 'stop') => ({ choices: [{ finish_reason, message: { content: JSON.stringify({ candidates: [{ label: 'A beginning', jot }] }) } }] });
test('OpenRouter routing requires ZDR by default; explicit off retains collection denial', () => {
  assert.deepEqual(aiRequest(config).provider, { zdr: true, data_collection: 'deny', require_parameters: true });
  assert.equal(aiRequest({ ...config, zdr: false }).provider.zdr, false);
  assert.equal(aiRequest({ ...config, zdr: false }).provider.data_collection, 'deny');
  assert.equal(aiRequest(config).response_format.json_schema.strict, true);
  assert.equal(aiRequest({ ...config, provider: 'local', key: '', structured: false }).response_format, undefined);
  assert.equal(aiRequest({ ...config, provider: 'local', key: '' }).provider, undefined);
});
test('local transport cannot redirect credentials to cloud or insecure non-loopback endpoints', () => {
  assert.equal(aiEndpoint('local', 'http://localhost:1234/v1/'), 'http://localhost:1234/v1/chat/completions');
  for (const base of ['http://192.168.1.2/v1', 'https://example.com/v1', 'http://localhost.evil/v1', 'http://key@localhost/v1', 'http://localhost/v1?key=oops']) assert.throws(() => aiEndpoint('local', base));
});
test('strict response envelope rejects unfinished, refused, malformed and extra fields', () => {
  assert.equal(aiCandidates(result())[0].jot, 'A quiet moment.');
  assert.throws(() => aiCandidates(result('Incomplete', 'length')));
  for (const content of ['```json\n{}\n```', '{}', '{"candidates":[],"extra":true}', '{"candidates":[{"label":"x","jot":"Hello","tool":"run"}]}']) assert.throws(() => aiCandidates({ choices: [{ finish_reason: 'stop', message: { content } }] }));
  const tool = result(); tool.choices[0].message.tool_calls = [{}]; assert.throws(() => aiCandidates(tool));
});
test('rejects active content, wrappers, malformed records and invalid destinations', () => {
  for (const text of ['<script>go()</script>', '![photo](https://example.com)', '```jot\nhello\n```', ':::record query\nfrom: metric\n:::', ':::record note\nbroken text\n:::']) assert.throws(() => validateJotFragment(text), text);
  assert.throws(() => aiEdit(':::record note\nbody: old\n:::\n', 20, 20, 'Hello'));
  const original = 'First entry.\n\nSecond entry.';
  const change = aiEdit(original, 0, 12, 'Updated entry.');
  assert.equal(change.text, 'Updated entry.\n\nSecond entry.');
  assert.match(aiEdit('É🙂 hello', 9, 9, 'More.').text, /More\./);
});
test('request is scoped, credential-safe, single-shot and bounded', async () => {
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++; assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.equal(options.referrerPolicy, 'no-referrer');
    const body = JSON.parse(options.body); assert.equal(JSON.parse(body.messages[1].content).context, 'Only this selection'); assert.equal(options.headers.Authorization, 'Bearer test-key');
    assert.equal(options.body.includes('test-key'), false);
    return new Response(JSON.stringify(result()));
  };
  await requestAI({ ...config, context: 'Only this selection' }, { fetcher }); assert.equal(calls, 1);
  await assert.rejects(requestAI(config, { fetcher: async () => new Response('private provider error', { status: 400 }) }), /HTTP 400/);
  await assert.rejects(requestAI(config, { fetcher: async () => new Response('x'.repeat(128001)) }), /too large/);
  await assert.rejects(requestAI(config, { fetcher: async () => { throw Error('secret'); } }), error => !error.message.includes('secret'));
});
test('local requests remain local and never include OpenRouter routing or an optional absent key', async () => {
  let called = 0;
  await requestAI({ ...config, provider: 'local', base: 'http://127.0.0.1:1234/v1', key: '' }, { fetcher: async (url, options) => {
    called++; assert.equal(url, 'http://127.0.0.1:1234/v1/chat/completions'); assert.equal(options.headers.Authorization, undefined); assert.equal(JSON.parse(options.body).provider, undefined);
    return new Response(JSON.stringify(result()));
  } });
  assert.equal(called, 1);
  assert.throws(() => aiEdit('---\ntitle: Journal\n---\n\nWriting.', 7, 7, 'Hello'), /frontmatter/);
});
