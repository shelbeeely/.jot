import { SOURCE_CATALOG, createSourceClient, weatherSource } from './connected-sources.mjs';
export function setupConnectedSources(bridge) {
  const { editor, status } = bridge;
  const button = document.createElement('button'); button.id = 'writerSourcesBtn'; button.type = 'button'; button.className = 'quiet'; button.textContent = 'Connected sources'; document.querySelector('.tool-row').append(button);
  const dialog = document.createElement('dialog'); dialog.id = 'connectedSources'; dialog.className = 'browser-dialog'; dialog.setAttribute('aria-labelledby', 'sourcesHeading');
  dialog.innerHTML = `<h2 id="sourcesHeading">Connected sources</h2><button id="sourcesClose" type="button">Close</button><p>Look up context when you want it. Your journal text is not sent. Nothing runs while you write.</p><label>Source<select id="sourcesProvider"></select></label><p id="sourcesCapabilities"></p><p>Weather lookup sends only the coordinates, chosen day and timezone to Open-Meteo. Daily values come from models, not your own observations. The public endpoint is for non-commercial use under its current terms; commercial deployments need a suitable service agreement.</p><p><a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener noreferrer">Open-Meteo terms</a> · <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo attribution</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p><form id="sourcesForm"><label>Latitude<input id="sourcesLatitude" type="number" min="-90" max="90" step="any" required></label><label>Longitude<input id="sourcesLongitude" type="number" min="-180" max="180" step="any" required></label><label>Day<input id="sourcesDate" type="date" required></label><label>Timezone<input id="sourcesTimezone" value="UTC" placeholder="Europe/London" autocomplete="off" spellcheck="false" required></label><p>UTC is selected initially. Choose the timezone that defines this day's weather. No location permission or place search is requested.</p><button id="sourcesLookup" type="submit">Look up weather</button><button id="sourcesCancel" type="button" disabled>Cancel lookup</button></form><section id="sourcesReview" aria-labelledby="sourcesReviewHeading" hidden><h3 id="sourcesReviewHeading">Review this snapshot</h3><p id="sourcesSummary"></p><pre id="sourcesPreview" tabindex="0" aria-label="Jot source to insert"></pre><button id="sourcesCaret" type="button">Use current caret</button><button id="sourcesInsert" type="button">Add reviewed snapshot</button></section><p id="sourcesStatus" role="status" aria-live="polite"></p>`;
  document.body.append(dialog); const $ = id => dialog.querySelector('#' + id), client = createSourceClient();
  for (const source of SOURCE_CATALOG) { const option = document.createElement('option'); option.value = source.id; option.textContent = source.label; $('sourcesProvider').append(option); }
  $('sourcesCapabilities').textContent = 'On-demand lookup and reviewed snapshots. Read-only; no provider account writes. Home Assistant and other sources are next on the roadmap.';
  let controller, generation = 0, capture = null, busy = false, ignoredCloses = 0;
  const say = text => { $('sourcesStatus').textContent = text; };
  const cancel = () => { generation++; controller?.abort(); controller = null; $('sourcesLookup').disabled = false; $('sourcesCancel').disabled = true; };
  const clear = () => { capture = null; $('sourcesReview').hidden = true; $('sourcesPreview').textContent = ''; $('sourcesSummary').textContent = ''; $('sourcesInsert').textContent = 'Add reviewed snapshot'; };
  const reset = () => { cancel(); clear(); dialog.close(); for (const id of ['sourcesLatitude', 'sourcesLongitude', 'sourcesDate']) $(id).value = ''; $('sourcesTimezone').value = 'UTC'; say(''); };
  const position = () => ({ position: editor.selectionEnd, end: editor.selectionEnd, identity: bridge.identity(), revision: bridge.revision() });
  button.onclick = () => { if (bridge.isLocked()) return; cancel(); clear(); dialog.showModal(); say('Choose coordinates, day and timezone, then look up weather.'); $('sourcesLatitude').focus(); };
  for (const id of ['sourcesProvider', 'sourcesLatitude', 'sourcesLongitude', 'sourcesDate', 'sourcesTimezone']) $(id).addEventListener('input', () => { cancel(); clear(); say('Inputs changed. Look up a fresh snapshot before adding.'); });
  $('sourcesForm').onsubmit = async event => {
    event.preventDefault(); if (busy || bridge.isLocked()) return; cancel(); clear(); const ticket = generation, target = position(); controller = new AbortController(); const request = controller;
    $('sourcesLookup').disabled = true; $('sourcesCancel').disabled = false; say('Looking up the chosen day…');
    const timeout = setTimeout(() => request.abort(), 15000);
    try {
      const result = await client.lookup($('sourcesProvider').value, { latitude: $('sourcesLatitude').value, longitude: $('sourcesLongitude').value, date: $('sourcesDate').value, timezone: $('sourcesTimezone').value }, { signal: request.signal });
      if (ticket !== generation || !dialog.open || bridge.isLocked()) return;
      const id = crypto.randomUUID(); capture = { id, source: weatherSource(result, id), assets: [], ...target };
      $('sourcesPreview').textContent = capture.source; $('sourcesSummary').textContent = `${result.date} · ${result.timezone} · ${result.dataKind === 'estimated' ? 'Historical model estimate' : 'Forecast model (recent past or future; daily totals may be incomplete)'} · retrieved ${result.retrievedAt}. Missing values stay missing. Coordinates will be included in your journal.`;
      $('sourcesReview').hidden = false; say('Review before adding. Nothing has changed in your journal.');
    } catch (error) { if (ticket === generation) say(request.signal.aborted ? 'Lookup cancelled or timed out. Nothing was added.' : error.message); }
    finally { clearTimeout(timeout); if (ticket === generation) { controller = null; $('sourcesLookup').disabled = false; $('sourcesCancel').disabled = true; } }
  };
  $('sourcesCancel').onclick = () => { cancel(); clear(); say('Lookup cancelled. Nothing was added.'); };
  $('sourcesCaret').onclick = () => { if (capture) { Object.assign(capture, position()); say('The snapshot will be added at the current caret.'); } };
  $('sourcesInsert').onclick = async () => {
    if (!capture || busy) return; const ticket = generation, item = capture; busy = true; $('sourcesInsert').disabled = true; ignoredCloses++; dialog.close();
    try { const ok = await bridge.addCapture(item); if (ticket !== generation) return; if (!ok) { dialog.showModal(); $('sourcesInsert').textContent = 'Retry save'; say('The snapshot was inserted but could not be saved completely. Retry save or download the journal.'); return; } bridge.retireCapture(item.id); clear(); status('Added the reviewed weather snapshot. Undo removes the insertion.'); }
    catch (error) { if (ticket === generation && !bridge.isLocked()) { dialog.showModal(); say(error.message); } }
    finally { busy = false; $('sourcesInsert').disabled = false; }
  };
  $('sourcesClose').onclick = () => { reset(); editor.focus(); }; dialog.addEventListener('close', () => { if(ignoredCloses){ignoredCloses--;return;} cancel(); clear(); });
  globalThis.addEventListener('pagehide', reset);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && controller) { cancel(); say('Lookup cancelled while Writer is hidden.'); } });
  return { reset };
}
