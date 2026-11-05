import { aiEdit, requestAI, AI_LIMIT } from './ai-client.mjs';

export function setupAICompanion({ editor, getRevision = () => editor.value, status = () => {} }) {
  const button = document.createElement('button'); button.id = 'writerAIBtn'; button.type = 'button'; button.className = 'quiet'; button.textContent = 'AI companion';
  document.querySelector('.tool-row').append(button);
  const panel = document.createElement('section'); panel.id = 'writerAI'; panel.className = 'writer-ai'; panel.hidden = true; panel.setAttribute('aria-labelledby', 'aiHeading');
  // Static UI only. Model output is assigned exclusively to value/textContent.
  panel.innerHTML = `<div class="ai-heading"><h2 id="aiHeading">Writing companion</h2><button type="button" id="aiClose">Close</button></div>
<p>Optional AI, using your own key or local model. Nothing is sent until you request a draft or suggestions. Review every change.</p>
<label><input type="checkbox" id="aiEnabled"> Enable AI for this session</label>
<fieldset id="aiControls" disabled><legend>Connection and writing</legend>
<label>Provider<select id="aiProvider"><option value="openrouter">OpenRouter (cloud)</option><option value="local">Local OpenAI-compatible server</option></select></label>
<label id="aiBaseLabel" hidden>Local base URL<input id="aiBase" type="url" value="http://127.0.0.1:11434/v1" autocomplete="off" spellcheck="false"></label>
<label>Model ID<input id="aiModel" placeholder="Enter the model ID from your provider" autocomplete="off" spellcheck="false" maxlength="200"></label>
<label>API key (session only; optional for local servers)<input id="aiKey" type="password" autocomplete="off" spellcheck="false"></label>
<label id="aiZdrLabel"><input id="aiZdr" type="checkbox" checked> Require Zero Data Retention (ZDR) on OpenRouter</label>
<p id="aiPrivacy" class="small"></p>
<label><input id="aiStructured" type="checkbox" checked> Request structured output from the server</label>
<p class="small">For a local server that rejects JSON schema requests, turn structured output off. Local response validation stays on.</p>
<button id="aiRefresh" type="button">Use current selection and caret</button>
<p id="aiTarget" class="small"></p>
<label><input id="aiContextEnabled" type="checkbox"> Send the captured selection as context</label>
<label>Exact journal context to send<textarea id="aiContext" rows="4" readonly></textarea></label>
<label>What would you like help with?<textarea id="aiInstruction" rows="3" maxlength="4000" placeholder="Help turn these notes into a short entry, keeping my voice."></textarea></label>
<label><input id="aiSuggestionsEnabled" type="checkbox"> Enable on-demand AI suggestions</label>
<div class="ai-actions"><button id="aiDraft" type="button">Draft writing</button><button id="aiSuggest" type="button" disabled>Get suggestions</button></div>
</fieldset>
<button id="aiCancel" type="button" hidden>Cancel request</button><p id="aiMessage" role="status" aria-live="polite"></p>
<div id="aiReview" hidden><label>Choose a draft<select id="aiCandidates"></select></label><label>Review and edit the .jot source<textarea id="aiOutput" rows="7"></textarea></label><p class="small">Syntax validation cannot verify facts or meaning. Only this reviewed fragment is inserted; no actions or links are executed.</p><button id="aiApply" type="button">Apply reviewed writing</button></div>
<button id="aiDisconnect" type="button">Disconnect and forget key</button>`;
  editor.closest('.writing-pane').append(panel);
  const $ = id => panel.querySelector('#' + id);
  let snapshot = '', revision, start = 0, end = 0, controller, generation = 0, candidates = [], validated = false, notes = null;
  const cancel = () => { generation++; controller?.abort(); controller = null; $('aiCancel').hidden = true; $('aiDraft').disabled = false; $('aiSuggest').disabled = !$('aiSuggestionsEnabled').checked; };
  const discard = () => { validated = false; candidates = []; $('aiCandidates').replaceChildren(); $('aiOutput').value = ''; $('aiReview').hidden = true; };
  const message = text => { $('aiMessage').textContent = text; };
  const privacy = () => {
    const remote = $('aiProvider').value === 'openrouter';
    $('aiBaseLabel').hidden = remote; $('aiZdrLabel').hidden = !remote;
    $('aiPrivacy').textContent = remote ? 'Your instruction and chosen context go to OpenRouter and its model provider. BYOK is not local processing. Provider data collection is denied. ZDR restricts eligible endpoints; turning it off cannot override account-level ZDR. Model charges may apply.' : 'Requests go only to your configured loopback server. Check that it runs a local model and does not forward to the cloud. Configure its CORS/allowed origins for this Writer page. Browser or desktop policy may block local access; no proxy or cloud fallback is used.';
  };
  // The context is the captured selection, or the scratchpad notes the writer chose to write up.
  const showContext = () => { $('aiContext').value = $('aiContextEnabled').checked ? (notes ?? snapshot.slice(start, end)) : ''; };
  const capture = () => {
    cancel(); discard(); notes = null; snapshot = editor.value; revision = getRevision(); start = editor.selectionStart; end = editor.selectionEnd;
    $('aiTarget').textContent = start === end ? 'Apply will insert at the captured caret. No journal context is sent.' : `Apply will replace the captured selection (${end - start} characters). Sending that selection as context is optional.`;
    showContext(); message('Describe what you want, then request help. Only the displayed context and your instruction will be sent.');
  };
  const reset = () => { cancel(); discard(); notes = null; snapshot = ''; revision = undefined; start = end = 0; $('aiContext').value = ''; $('aiInstruction').value = ''; $('aiKey').value = ''; $('aiContextEnabled').checked = false; $('aiSuggestionsEnabled').checked = false; $('aiEnabled').checked = false; $('aiControls').disabled = true; $('aiTarget').textContent = ''; message('AI disconnected. The key and companion text were cleared.'); panel.hidden = true; };
  button.onclick = () => { if (editor.readOnly) return; panel.hidden = false; capture(); $('aiEnabled').focus(); };
  $('aiClose').onclick = () => { cancel(); discard(); panel.hidden = true; editor.focus(); };
  $('aiDisconnect').onclick = reset;
  // From a scratchpad: its notes are the only context, the draft goes in at the end of that entry, and nothing is sent
  // until the writer presses Draft writing (and nothing is added until Apply).
  function writeUp({ context, caret, date = '' }) {
    if (editor.readOnly) return;
    panel.hidden = false; cancel(); discard();
    snapshot = editor.value; revision = getRevision(); start = end = Math.min(caret, snapshot.length); notes = String(context).slice(0, AI_LIMIT);
    $('aiContextEnabled').checked = true; showContext();
    if (!$('aiInstruction').value.trim()) $('aiInstruction').value = 'Turn my rough notes into a short journal entry in my own words. Keep every fact, name, number and uncertainty. Do not add anything I did not write.';
    $('aiTarget').textContent = 'Apply will add the draft at the end of ' + (date ? 'the ' + date + ' entry' : 'the entry') + '. Your scratchpad stays as it is.';
    message($('aiEnabled').checked ? 'Check the notes and the instruction, then choose Draft writing. Only these notes and the instruction are sent.' : 'Turn on AI for this session and choose a connection. Only these notes and your instruction will be sent, when you choose Draft writing.');
    panel.scrollIntoView({ block: 'start' });
    ($('aiEnabled').checked ? $('aiDraft') : $('aiEnabled')).focus({ preventScroll: true });
  }
  $('aiEnabled').onchange = () => { cancel(); discard(); $('aiControls').disabled = !$('aiEnabled').checked; if (!$('aiEnabled').checked) { $('aiKey').value = ''; message('AI off. Key cleared.'); } };
  $('aiProvider').onchange = () => { cancel(); discard(); $('aiKey').value = ''; $('aiModel').value = ''; privacy(); };
  for (const id of ['aiBase', 'aiModel', 'aiKey', 'aiZdr', 'aiStructured', 'aiInstruction', 'aiSuggestionsEnabled', 'aiContextEnabled']) $(id).addEventListener('input', () => { cancel(); discard(); showContext(); });
  $('aiContextEnabled').addEventListener('change', showContext);
  $('aiRefresh').onclick = capture;
  $('aiCancel').onclick = () => { cancel(); discard(); message('Request cancelled. Nothing was inserted.'); };
  $('aiCandidates').onchange = () => { $('aiOutput').value = candidates[Number($('aiCandidates').value)].jot; };
  const run = async suggestions => {
    if (!$('aiEnabled').checked || (suggestions && !$('aiSuggestionsEnabled').checked)) return;
    if (editor.value !== snapshot || getRevision() !== revision) { message('The writing changed. Capture the current selection and caret again.'); return; }
    cancel(); discard(); const ticket = generation; const activeController = new AbortController(); controller = activeController;
    const timeout = setTimeout(() => activeController.abort(), 60000);
    $('aiCancel').hidden = false; $('aiDraft').disabled = true; $('aiSuggest').disabled = true; message('Requesting writing. Your journal has not changed.');
    try {
      const result = await requestAI({ provider: $('aiProvider').value, base: $('aiBase').value, model: $('aiModel').value, key: $('aiKey').value, zdr: $('aiZdr').checked, structured: $('aiStructured').checked, instruction: $('aiInstruction').value, context: $('aiContext').value, suggestions }, { signal: activeController.signal });
      if (ticket !== generation || editor.value !== snapshot || getRevision() !== revision) return;
      // Validate every alternative against the destination before exposing Apply.
      for (const item of result) aiEdit(snapshot, start, end, item.jot);
      candidates = result;
      for (const [index, item] of candidates.entries()) { const option = document.createElement('option'); option.value = index; option.textContent = item.label; $('aiCandidates').append(option); }
      $('aiCandidates').value = '0'; $('aiCandidates').onchange(); validated = true; $('aiReview').hidden = false; message('Review the proposed source below. Nothing has been inserted.');
    } catch (error) { if (ticket === generation) message(error.message); }
    finally { clearTimeout(timeout); if (ticket === generation) { controller = null; $('aiCancel').hidden = true; $('aiDraft').disabled = false; $('aiSuggest').disabled = !$('aiSuggestionsEnabled').checked; } }
  };
  $('aiDraft').onclick = () => run(false); $('aiSuggest').onclick = () => run(true);
  $('aiApply').onclick = () => {
    if (!validated || !$('aiEnabled').checked) return;
    if (editor.value !== snapshot || getRevision() !== revision) { discard(); message('The writing changed. Capture the current selection and request help again.'); return; }
    try {
      const change = aiEdit(snapshot, start, end, $('aiOutput').value);
      editor.focus(); editor.setSelectionRange(change.start, change.end);
      if (editor.jotApplyEdit) editor.jotApplyEdit({ start: change.start, end: change.end, text: change.insertion });
      else if (!document.execCommand || !document.execCommand('insertText', false, change.insertion)) { editor.setRangeText(change.insertion, change.start, change.end, 'end'); editor.dispatchEvent(new Event('input', { bubbles: true })); }
      discard(); panel.hidden = true; status('Applied reviewed AI writing. Undo removes this change.');
    } catch (error) { message(error.message); }
  };
  editor.addEventListener('input', () => { if (!panel.hidden) { cancel(); discard(); message('Writing changed. Capture the current selection and caret before requesting help.'); } });
  window.addEventListener('pagehide', reset);
  privacy();
  // Other tools (journal places) use the same connection, only while AI is on for this session; the key never leaves this page's memory.
  const connection = () => ($('aiEnabled').checked && $('aiModel').value.trim() ? { provider: $('aiProvider').value, base: $('aiBase').value, model: $('aiModel').value.trim(), key: $('aiKey').value, zdr: $('aiZdr').checked, structured: $('aiStructured').checked } : null);
  const open = () => { if (editor.readOnly) return; panel.hidden = false; capture(); $('aiEnabled').focus(); };
  return { reset, writeUp, connection, open };
}
