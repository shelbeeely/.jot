// Generate the fictional demo's kept scenes through Writer's actual OpenRouter transport, prompt, schema and validator.
// This is an explicit, resumable authoring command. Ordinary builds only read its saved results and never contact a model.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { journalDays, placePrompt, PLACE_SCHEMA, validatePlace, placeFile, readPlaceFile, DETAILS } from '../site/dist/scene-journal-core.mjs';

export const EFFORTS = Object.freeze(['max', 'xhigh', 'high', 'medium', 'low', 'minimal', 'none']);
import { requestJSON } from '../site/dist/ai-client.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const atomicWrite = (filename, value) => { const temporary = filename + '.tmp'; fs.writeFileSync(temporary, value); fs.renameSync(temporary, filename); };
const promptHash = (day, detail = 'standard') => sha256(JSON.stringify({ ...placePrompt(day, { detail }), schema: PLACE_SCHEMA }));
const sourceHash = (day) => sha256(JSON.stringify({ date: day.date, sentences: day.sentences }));

/** Check saved output before reusing it: its exact prompt, source sentences, model, effort, privacy policy and bytes must match. */
export function reusableScene(day, item, text, { model, zdr, reasoning = item?.reasoning ?? 'low', detail = item?.detail ?? 'standard' }) {
  if (!item || item.model !== model || item.zdr !== zdr || (item.reasoning ?? 'low') !== reasoning || (item.detail ?? 'standard') !== detail
    || !DETAILS.includes(detail) || item.promptSha256 !== promptHash(day, detail) || item.sourceSha256 !== sourceHash(day) || item.sceneSha256 !== sha256(text)) return false;
  try {
    const place = readPlaceFile(text, day), moments = place.objects.flatMap((o) => o.moments);
    return place.made.model === model && moments.length > 0 && moments.every((m) => !m.missing);
  } catch { return false; }
}

/** Request each missing day from the real pipeline. fetcher exists for transport-boundary tests; CLI always uses global fetch. */
export async function generateDemoScenes({ source, directory, key, model = 'openai/gpt-6.1-sol', zdr = true, concurrency = 2, onlyDay = '',
  reasoning = 'max', detail = 'rich', maxTokens = 128000, fetcher = fetch, report = console.log, timeoutMs = 40 * 60 * 1000 } = {}) {
  if (!String(key || '').trim()) throw Error('OPENROUTER_API_KEY is required. No scenes were generated and no substitute was used.');
  if (typeof model !== 'string' || !model.trim() || model.length > 200) throw Error('Choose an OpenRouter model ID.');
  model = model.trim();
  if (!EFFORTS.includes(reasoning)) throw Error(`Choose a reasoning effort: ${EFFORTS.join(', ')}.`);
  if (!DETAILS.includes(detail)) throw Error(`Choose a scene detail: ${DETAILS.join(', ')}.`);
  if (!Number.isInteger(maxTokens) || maxTokens < 4096 || maxTokens > 128000) throw Error('Max tokens must be between 4096 and 128000.');
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw Error('Concurrency must be between 1 and 8.');
  // Only days whose entry names a scene with an @setting: line are requested; the rest of the journal is never sent.
  const all = journalDays(source);
  if (new Set(all.map((day) => day.date)).size !== all.length) throw Error('The month demo needs one entry per date.');
  const days = all.filter((day) => day.setting && (!onlyDay || day.date === onlyDay));
  if (!days.length) throw Error('No dated entries with an @setting: line match the requested journal/day.');
  if (days.some((day) => !day.sentences.length)) throw Error('Each demo day needs prose before a scene can be requested.');
  fs.mkdirSync(directory, { recursive: true });
  const indexFile = path.join(directory, 'index.json');
  let index = { format: 'jot-demo-scene-provenance', version: 1, scenes: {} };
  if (fs.existsSync(indexFile)) {
    index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
    if (index.format !== 'jot-demo-scene-provenance' || index.version !== 1 || !index.scenes || Array.isArray(index.scenes)) throw Error('Unrecognized demo scene provenance index.');
  }
  const saveIndex = () => atomicWrite(indexFile, JSON.stringify({ ...index, scenes: Object.fromEntries(Object.entries(index.scenes).sort(([a], [b]) => a.localeCompare(b))) }, null, 2) + '\n');
  const pending = [], results = [];
  for (const day of days) {
    const filename = path.join(directory, day.date + '.json');
    if (fs.existsSync(filename) && reusableScene(day, index.scenes[day.date], fs.readFileSync(filename, 'utf8'), { model, zdr, reasoning, detail })) {
      report(`${day.date}: reusing verified ${model} scene`); results.push({ date: day.date, reused: true });
    } else pending.push(day);
  }
  if (pending.length) report(`Requesting ${pending.length} day(s) from ${model} (${reasoning} reasoning, ${detail} detail) through OpenRouter; ZDR ${zdr ? 'required' : 'off by explicit choice'}, data collection denied.`);
  let failure = null;
  async function worker() {
    while (pending.length && !failure) {
      const day = pending.shift(), prompt = placePrompt(day, { detail }), started = Date.now();
      report(`${day.date}: sending ${day.sentences.length} numbered sentences`);
      try {
        const raw = await requestJSON({ provider: 'openrouter', model, key, zdr, structured: true, system: prompt.system, user: prompt.user,
          schema: PLACE_SCHEMA, name: 'jot_place', maxTokens, reasoning: { effort: reasoning, exclude: true } }, { fetcher, signal: AbortSignal.timeout(timeoutMs), limit: 4 * 1024 * 1024 });
        // exclude: the model still thinks at this effort, but its reasoning text is left out of the reply (it can exceed Writer's reply limit).
        const place = validatePlace(raw, day.sentences);
        const moments = place.objects.flatMap((o) => o.moments);
        if (!moments.length || moments.some((text) => !day.sentences.includes(text))) throw Error('The scene has no exact entry-sentence moments.');
        const at = new Date().toISOString(), text = placeFile(place, { model, at });
        // Read the exact saved bytes through the same reader Writer uses for kept @setting: scenes.
        const saved = readPlaceFile(text, day);
        if (saved.objects.some((o) => o.moments.some((m) => m.missing))) throw Error('A kept scene moment no longer matches its source.');
        const metadata = { date: day.date, provider: 'openrouter', model, reasoning, detail, zdr, dataCollection: 'deny', at,
          promptSha256: promptHash(day, detail), sourceSha256: sourceHash(day), sceneSha256: sha256(text),
          objects: place.objects.length, shapes: place.objects.reduce((n, o) => n + o.shapes.length, 0), moments: moments.length };
        atomicWrite(path.join(directory, day.date + '.json'), text);
        index.scenes[day.date] = metadata; saveIndex();
        results.push({ date: day.date, reused: false });
        report(`${day.date}: saved ${metadata.objects} objects, ${metadata.moments} exact sentence links (${Math.round((Date.now() - started) / 1000)}s)`);
      } catch (error) {
        failure ||= Error(`${day.date}: ${error.message} Successful days remain saved; rerun to resume.`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()));
  if (failure) throw failure;
  return results.sort((a, b) => a.date.localeCompare(b.date));
}

const HELP = `Generate the demo's scenes through Writer's OpenRouter pipeline: one for each entry with an @setting: line.

OPENROUTER_API_KEY must be configured in the environment. It is never saved or printed.
NODE_USE_ENV_PROXY=1 enables Node's normal environment proxy handling when required.

  node tools/generate-demo-scenes.mjs [options]

  --source PATH          Journal source (default examples/demo-month.jot)
  --out-dir PATH         Saved scenes (default examples/demo-scenes)
  --model ID             OpenRouter model (or OPENROUTER_MODEL; default openai/gpt-6.1-sol)
  --reasoning EFFORT     max, xhigh, high, medium, low, minimal or none (default max)
  --detail LEVEL         rich or standard scene prompt (default rich)
  --max-tokens N         Output budget including reasoning, 4096..128000 (default 128000)
  --day YYYY-MM-DD       Only generate/recheck this day
  --concurrency 1..8     Concurrent model requests (default 2)
  --allow-retention     Explicitly turn ZDR off; data collection remains denied
  --help                Show this help without making requests

Existing scenes are reused only when model, reasoning effort, detail, privacy policy, exact prompt/source and saved bytes match.
No fallback scenes, models or relaxed privacy settings are used. Review the generated scenes in Writer.
`;

export function sceneArguments(args, env = process.env) {
  const options = { sourcePath: path.join(ROOT, 'examples/demo-month.jot'), directory: path.join(ROOT, 'examples/demo-scenes'),
    key: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL || 'openai/gpt-6.1-sol', zdr: true, concurrency: 2, reasoning: 'max', detail: 'rich', maxTokens: 128000 };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') return { help: true };
    if (arg === '--allow-retention') { options.zdr = false; continue; }
    if (!['--source', '--out-dir', '--model', '--day', '--concurrency', '--reasoning', '--detail', '--max-tokens'].includes(arg)) throw Error(`Unknown option: ${arg}`);
    const value = args[++i]; if (!value || value.startsWith('--')) throw Error(`A value is required for ${arg}.`);
    if (arg === '--source') options.sourcePath = path.resolve(value);
    else if (arg === '--out-dir') options.directory = path.resolve(value);
    else if (arg === '--model') options.model = value;
    else if (arg === '--day') options.onlyDay = value;
    else if (arg === '--reasoning') options.reasoning = value;
    else if (arg === '--detail') options.detail = value;
    else if (arg === '--max-tokens') options.maxTokens = Number(value);
    else options.concurrency = Number(value);
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = sceneArguments(process.argv.slice(2));
    if (options.help) console.log(HELP);
    else {
      if (!options.key?.trim()) throw Error('OPENROUTER_API_KEY is required. No scenes were generated and no substitute was used.');
      const results = await generateDemoScenes({ ...options, source: fs.readFileSync(options.sourcePath, 'utf8') });
      console.log(`${results.length} demo scene(s) ready. Run node tools/build-demo-journal.mjs to package the saved bytes.`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
