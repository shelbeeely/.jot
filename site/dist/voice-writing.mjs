import {createVoiceBackend} from './voice-backend.mjs';
import {captureSpeech} from './speech-capture.mjs';
import {SPEECH_MODELS,verifySpeechModel,downloadSpeechModel,speechModelCache} from './speech-models.mjs';
import {organizedJot,liveTranscript} from './voice-writing-core.mjs';
import {aiEdit,aiEndpoint,aiRequest} from './ai-client.mjs';

export function setupVoiceWriting({editor,getRevision=()=>editor.value,getIdentity=()=>'',addCapture,status=()=>{}}){
  const doc=editor.ownerDocument,win=doc.defaultView;
  const MIC='<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6.5-3.5a.75.75 0 0 0-1.5 0 5 5 0 0 1-10 0 .75.75 0 0 0-1.5 0 6.5 6.5 0 0 0 5.75 6.46V20.5H8.5a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-2.75v-2.54a6.5 6.5 0 0 0 5.75-6.46Z"/></svg>';
  const button=doc.createElement('button');button.id='writerVoiceWritingBtn';button.type='button';button.className='quiet';button.textContent='Voice typing';doc.querySelector('.tool-row')?.append(button);
  // Always-visible entry point, including on phones where the tool row is collapsed.
  const fab=doc.createElement('button');fab.id='writerVoiceMic';fab.type='button';fab.className='writer-voice-mic';fab.setAttribute('aria-label','Voice typing');fab.title='Voice typing';fab.innerHTML=MIC;(doc.querySelector('.writing-pane')||doc.body).append(fab);
  const viewport=win.visualViewport;if(viewport){const place=()=>{fab.style.setProperty('--vw-keyboard',Math.max(0,Math.round(win.innerHeight-viewport.height-viewport.offsetTop))+'px');};viewport.addEventListener('resize',place);viewport.addEventListener('scroll',place);place();}
  const dialog=doc.createElement('dialog');dialog.id='voiceWriting';dialog.setAttribute('aria-labelledby','voiceWritingTitle');
  // Static markup only. Audio, model output and filenames never enter innerHTML.
  dialog.innerHTML=`<div class="vw-head"><h2 id="voiceWritingTitle">Voice typing</h2><button id="vwClose" class="vw-close" type="button" aria-label="Close and discard draft">✕</button></div>
<p class="vw-intro">Speak, press Stop, then check the cleaned-up text before it goes into your journal. Listening and cleanup run on this device.</p>
<div id="vwGetStarted" class="vw-card">
<p><strong>One-time setup.</strong> Voice typing needs a 323 MB download of public speech and writing models from Hugging Face. Your voice and your writing are never part of the download.</p>
<label class="vw-check"><input id="vwRemember" type="checkbox" checked> Keep the models on this device, so voice typing opens quickly and works offline</label>
<div class="voice-writing-actions"><button id="vwPackageDownload" class="vw-primary" type="button">Download voice typing · 323 MB</button><button id="vwCancelSetup" type="button">Cancel</button></div>
<p id="vwModels" role="status">Whistle not loaded · Needle not loaded</p>
</div>
<div class="vw-speak">
<button id="vwStart" class="vw-mic-button" type="button">${MIC}<span>Start speaking</span></button>
<button id="vwStop" class="vw-mic-button vw-listening" type="button" disabled><span class="vw-dot" aria-hidden="true"></span><span>Stop</span></button>
<p id="vwStatus" role="status" aria-live="polite">Microphone off.</p>
</div>
<div id="vwHeard"><label>What you said<textarea id="vwTranscript" rows="4" readonly></textarea></label><p class="vw-pending">Still listening: <span id="vwPending"></span></p></div>
<div id="vwReview">
<label>Cleaned-up text (edit it if you like)<textarea id="vwDraft" rows="6" disabled></textarea></label>
<div class="voice-writing-actions"><button id="vwInsert" class="vw-primary" type="button" disabled>Insert into journal</button><button id="vwRetry" type="button" disabled>Clean up again</button><button id="vwCancel" type="button" disabled>Cancel processing</button><button id="vwDiscard" type="button">Discard</button></div>
<details><summary>Needle's proposed organization</summary><pre id="vwOrganization"></pre></details>
</div>
<details id="vwSetup"><summary>Settings and models</summary>
<label>Speech language<select id="vwLanguage"><option value="">Detect automatically</option><option value="en">English</option><option value="de">German</option><option value="fr">French</option><option value="es">Spanish</option><option value="it">Italian</option><option value="nl">Dutch</option><option value="pl">Polish</option></select></label>
<label>Names or phrases to recognize (one per line; stays on this device)<textarea id="vwKeywords" rows="2" maxlength="1000"></textarea></label>
<label class="vw-check"><input id="vwKeepAudio" type="checkbox"> Keep audio and original transcript with the inserted entry</label><p class="small">Off by default. When on, both become attachments in the journal when you insert, using the journal’s attachment protection. Discarding the draft discards the recording.</p>
<h3>Models</h3><p class="small">Whistle (16.9 MB) transcribes live, Needle (35.3 MB) suggests structure and SmolLM2 (271 MB) cleans up English text. These are pinned releases, checked byte for byte before use. Runtime memory is larger than the files.</p>
<div class="voice-model-row"><button id="vwWhistleDownload" type="button">Download Whistle</button><label>Import whistle.cact<input id="vwWhistleFile" type="file" accept=".cact"></label></div>
<div class="voice-model-row"><button id="vwNeedleDownload" type="button">Download Needle</button><label>Import needle3.cact<input id="vwNeedleFile" type="file" accept=".cact"></label></div>
<div id="vwCleanupSetup" class="voice-model-row"><button id="vwCleanupDownload" type="button">Download offline cleanup · 271 MB</button><label>Import cleanup GGUF<input id="vwCleanupFile" type="file" accept=".gguf"></label></div>
<div class="voice-writing-actions"><button id="vwCached" type="button">Load saved models</button><button id="vwForget" type="button">Remove saved models</button></div>
<h3>Cleanup</h3><p class="small">Cleanup always runs after you stop, and there is no automatic cloud fallback. The default runs SmolLM2 (English) on this device. You can choose your own local server or OpenRouter instead.</p>
<label>Cleanup provider<select id="vwProvider"><option value="embedded">On this device · SmolLM2 (English)</option><option value="local">Local OpenAI-compatible server</option><option value="openrouter">OpenRouter (cloud)</option></select></label>
<label id="vwBaseLabel">Local base URL<input id="vwBase" type="url" value="http://127.0.0.1:11434/v1" autocomplete="off"></label>
<label id="vwModelLabel">Cleanup model ID<input id="vwModel" autocomplete="off" maxlength="200"></label>
<label id="vwKeyLabel">API key (session only; optional for local servers)<input id="vwKey" type="password" autocomplete="off"></label>
<label id="vwCloudLabel" class="vw-check" hidden><input id="vwCloud" type="checkbox"> Send this voice transcript and its proposed organization to OpenRouter and its model provider for cleanup</label>
<label id="vwZdrLabel" class="vw-check" hidden><input id="vwZdr" type="checkbox" checked> Require OpenRouter Zero Data Retention</label>
<label id="vwStructuredLabel" class="vw-check"><input id="vwStructured" type="checkbox" checked> Request structured output (local validation always stays on)</label>
<p class="small">Keys and uninserted drafts stay in memory. Inserting writing uses the journal's current protection settings. Model syntax checks cannot verify facts.</p>
</details>`;
  doc.body.append(dialog);const $=id=>dialog.querySelector('#'+id);
  let engine=null,storeFailed=false,loaded=new Set(),generation=0,controller=null,setupController=null,stopMic=null,queue=Promise.resolve(),audio=new Float32Array(0),buffered=0,committed='',pending='',snapshot='',revision,identity,start=0,end=0,state='idle',setupBusy=false,cleanupTimer=null,recording=null,speechLanguage='';
  const message=text=>{$('vwStatus').textContent=text;};
  const modelLabel=()=>{$('vwModels').textContent=(loaded.has('whistle')?'Whistle loaded':'Whistle not loaded')+' · '+(loaded.has('needle3')?'Needle loaded':'Needle not loaded')+' · '+(loaded.has('cleanup')?'Offline cleanup loaded':'Offline cleanup not loaded');};
  const connection=()=>{
    const config={provider:$('vwProvider').value,base:$('vwBase').value,model:$('vwModel').value,key:$('vwKey').value,zdr:$('vwZdr').checked,structured:$('vwStructured').checked};
    if(config.provider==='embedded'){const language=speechLanguage||$('vwLanguage').value;if(language&&language!=='en')throw Error('Bundled cleanup supports English. Choose a local server or OpenRouter model for this speech language.');if(!loaded.has('cleanup'))throw Error('Download, import or load the saved offline cleanup model before speaking.');return config;}
    if(config.provider==='openrouter'&&!$('vwCloud').checked)throw Error('Choose local cleanup or explicitly allow sending the transcript to OpenRouter.');
    aiEndpoint(config.provider,config.base);aiRequest({...config,instruction:'Clean up the supplied transcript.'});return config;
  };
  const current=()=>editor.value===snapshot&&getRevision()===revision&&getIdentity()===identity&&!editor.readOnly;
  function controls(){
    const active=['starting','listening','stopping','processing','inserting'].includes(state);
    for(const id of ['vwPackageDownload','vwWhistleDownload','vwNeedleDownload','vwCleanupDownload','vwWhistleFile','vwNeedleFile','vwCleanupFile','vwCached','vwForget'])$(id).disabled=active||setupBusy;
    $('vwCancelSetup').disabled=!setupBusy;
    for(const id of ['vwProvider','vwBase','vwModel','vwKey','vwCloud','vwZdr','vwStructured','vwLanguage','vwKeywords','vwRemember','vwKeepAudio'])$(id).disabled=active||setupBusy;
    $('vwStart').disabled=active||setupBusy||!loaded.has('whistle')||!loaded.has('needle3')||!!committed;
    $('vwStop').disabled=state!=='listening';$('vwRetry').disabled=active||setupBusy||!committed.trim()||!loaded.has('needle3');$('vwCancel').disabled=!active;
    $('vwDraft').disabled=state!=='review';$('vwInsert').disabled=state!=='review'||!current();
    // Show only what the current step needs; everything else stays under Settings and models.
    const listening=['starting','listening','stopping'].includes(state);
    $('vwGetStarted').hidden=ready();$('vwCancelSetup').hidden=!setupBusy;
    $('vwStart').hidden=listening;$('vwStop').hidden=!listening;
    $('vwHeard').hidden=!(listening||committed||pending);
    $('vwReview').hidden=!(['processing','review','inserting'].includes(state)||(state==='idle'&&committed.trim()));
    $('vwRetry').hidden=$('vwRetry').disabled;$('vwCancel').hidden=$('vwCancel').disabled;
    fab.classList.toggle('vw-on',state==='listening');
  }
  function ready(){return loaded.has('whistle')&&loaded.has('needle3')&&($('vwProvider').value!=='embedded'||loaded.has('cleanup'));}
  function autoLoad(quiet=false){
    // Public weights the person chose to keep load from this device only; nothing is downloaded here.
    setup(async(signal,ticket)=>{
      let found=0;
      for(const name of ['whistle','needle3',...($('vwProvider').value==='embedded'?['cleanup']:[])]){
        if(loaded.has(name))continue;$('vwModels').textContent='Loading saved '+(SPEECH_MODELS[name]?.name||name)+'…';
        let bytes;try{bytes=await speechModelCache('get',name);}catch{bytes=null;}
        if(signal.aborted||ticket!==generation)return;if(!bytes)continue;
        await load(name,new Uint8Array(bytes),signal,ticket,false);found++;
      }
      return quiet?false:ready()?'Ready. Press Start speaking.':found?'Some voice models are saved on this device. Download voice typing to add the rest.':'Download voice typing once to start. After that it works offline.';
    });
  }
  function destroyEngine(){engine?.close();engine=null;loaded.clear();modelLabel();}
  function abandon(){generation++;controller?.abort();controller=null;setupController?.abort();setupController=null;stopMic?.();stopMic=null;recording=null;clearTimeout(cleanupTimer);audio=new Float32Array(0);buffered=0;queue=Promise.resolve();destroyEngine();state='idle';setupBusy=false;committed=pending=speechLanguage='';$('vwTranscript').value=$('vwDraft').value='';$('vwPending').textContent=$('vwOrganization').textContent='';controls();}
  function reset(){abandon();snapshot='';revision=undefined;identity='';$('vwKey').value=$('vwKeywords').value='';$('vwCloud').checked=false;message('Microphone off. Voice draft cleared.');if(dialog.open)dialog.close();}
  function discard(){abandon();snapshot=editor.value;revision=getRevision();identity=getIdentity();start=editor.selectionStart;end=editor.selectionEnd;message('Microphone off. Draft discarded.');controls();if(dialog.open)autoLoad(true);}
  function open(){
    if(dialog.open)return;if(editor.readOnly){status('Unlock this journal to use voice typing.');return;}
    snapshot=editor.value;revision=getRevision();identity=getIdentity();start=editor.selectionStart;end=editor.selectionEnd;
    $('vwSetup').open=false;dialog.showModal();controls();
    if(ready()){message('Ready. Press Start speaking.');$('vwStart').focus();}else{$('vwPackageDownload').focus();autoLoad();}
  }
  button.onclick=open;fab.onclick=open;
  $('vwClose').onclick=reset;dialog.addEventListener('cancel',event=>{event.preventDefault();reset();});dialog.addEventListener('close',()=>{if(!dialog.open&&(state!=='idle'||engine||committed))reset();});$('vwDiscard').onclick=discard;
  async function setup(task){if(setupBusy||state!=='idle')return;setupBusy=true;storeFailed=false;const ticket=generation;const control=new AbortController();setupController=control;controls();try{const result=await task(control.signal,ticket);if(ticket===generation&&result!==false)message((result||(ready()?'Ready. Press Start speaking.':'Model setup updated. Load the models for your selected cleanup option, then start speaking.'))+(storeFailed?' These models are loaded for now, but this browser could not keep them for offline use (storage is full or private browsing is on).':''));}catch(e){if(ticket===generation)message(e.message);}finally{if(ticket===generation){setupBusy=false;setupController=null;modelLabel();controls();if(ready()&&dialog.open&&(!dialog.contains(doc.activeElement)||$('vwGetStarted').contains(doc.activeElement)))$('vwStart').focus();}}}
  async function load(name,bytes,signal,ticket,store=true){await verifySpeechModel(name,bytes);if(signal.aborted||ticket!==generation)return;if(store&&$('vwRemember').checked){try{await navigator.storage?.persist?.().catch(()=>false);await speechModelCache('put',name,bytes);}catch{storeFailed=true;}}if(signal.aborted||ticket!==generation)return;loaded.delete(name);modelLabel();engine ||= createVoiceBackend();await engine.load(name,bytes);if(ticket===generation&&!signal.aborted){loaded.add(name);modelLabel();}}
  for(const [name,prefix] of [['whistle','Whistle'],['needle3','Needle'],['cleanup','Cleanup']]){
    $('vw'+prefix+'Download').onclick=()=>setup(async(signal,ticket)=>{const bytes=await downloadSpeechModel(name,{signal,progress:(n,total)=>{$('vwModels').textContent='Downloading '+SPEECH_MODELS[name].name+' · '+Math.floor(n/total*100)+'%';}});await load(name,bytes,signal,ticket);});
    $('vw'+prefix+'File').onchange=event=>{const file=event.target.files[0];event.target.value='';if(file)setup(async(signal,ticket)=>{if(file.size!==SPEECH_MODELS[name].bytes)throw Error('Choose the pinned '+SPEECH_MODELS[name].file+' file.');await load(name,new Uint8Array(await file.arrayBuffer()),signal,ticket);});};
  }
  $('vwPackageDownload').onclick=()=>setup(async(signal,ticket)=>{for(const name of ['whistle','needle3','cleanup']){if(signal.aborted||ticket!==generation)return;if(loaded.has(name))continue;const bytes=await downloadSpeechModel(name,{signal,progress:(n,total)=>{$('vwModels').textContent='Downloading '+SPEECH_MODELS[name].name+' · '+Math.floor(n/total*100)+'%';}});await load(name,bytes,signal,ticket);}return ready()?'Ready. Press Start speaking.':'';});
  $('vwCancelSetup').onclick=()=>{generation++;setupController?.abort();setupController=null;setupBusy=false;destroyEngine();controls();message('Model loading cancelled. Microphone off.');};
  $('vwCached').onclick=()=>setup(async(signal,ticket)=>{for(const name of ($('vwProvider').value==='embedded'?['whistle','needle3','cleanup']:['whistle','needle3'])){const bytes=await speechModelCache('get',name);if(!bytes)throw Error('No saved '+SPEECH_MODELS[name].name+' model. Download or import it first.');await load(name,new Uint8Array(bytes),signal,ticket);}});
  $('vwForget').onclick=()=>setup(async()=>{await speechModelCache('clear');return 'Saved model weights removed. Currently loaded models remain until this voice session closes.';});
  $('vwProvider').onchange=()=>{const provider=$('vwProvider').value,remote=provider==='openrouter',embedded=provider==='embedded';$('vwBaseLabel').hidden=provider!=='local';for(const id of ['vwModelLabel','vwKeyLabel','vwStructuredLabel'])$(id).hidden=embedded;$('vwCleanupSetup').hidden=!embedded;$('vwCloudLabel').hidden=$('vwZdrLabel').hidden=!remote;$('vwCloud').checked=false;$('vwKey').value='';$('vwDraft').value='';state='idle';controls();};
  for(const id of ['vwBase','vwModel','vwKey','vwCloud','vwZdr','vwStructured'])$(id).addEventListener('input',()=>{if(state==='review'){state='idle';$('vwDraft').value='';controls();message('Cleanup connection changed. Run cleanup again before inserting.');}});
  function showTranscript(result){if(result.language)speechLanguage=result.language;const text=liveTranscript(committed,{pending:'',...result});committed=text.committed;pending=text.pending;$('vwTranscript').value=committed;$('vwPending').textContent=pending;}
  function failCapture(error,ticket){if(ticket!==generation)return;generation++;controller?.abort();stopMic?.();stopMic=null;destroyEngine();state='idle';if(pending.trim()){committed=[committed,pending].filter(Boolean).join(' ');pending='';$('vwTranscript').value=committed;$('vwPending').textContent='';}message('Microphone off. '+error.message+' What you said is kept; nothing was inserted.');controls();if(dialog.open)autoLoad(true);}
  function enqueue(pcm,ticket){if(!pcm.length)return;const count=pcm.length;buffered+=count;if(buffered>16000*8){failCapture(Error('This device cannot keep up with live transcription. Stop and retry with shorter speech.'),ticket);return;}queue=queue.then(async()=>{if(ticket!==generation||controller?.signal.aborted)return;try{const result=await engine.transcribe(pcm,{language:$('vwLanguage').value,keywords:$('vwKeywords').value});if(ticket===generation&&!controller?.signal.aborted)showTranscript(result);}finally{if(ticket===generation)buffered=Math.max(0,buffered-count);}}).catch(error=>failCapture(error,ticket));}
  $('vwStart').onclick=async()=>{
    if(state!=='idle'||setupBusy||!loaded.has('whistle')||!loaded.has('needle3'))return;
    try{connection();if(!current())throw Error('The journal changed. Close voice writing and choose the writing position again.');}catch(e){message(e.message);$('vwSetup').open=true;return;}
    state='starting';const ticket=generation;controller=new AbortController();committed=pending='';audio=new Float32Array(0);buffered=0;queue=Promise.resolve();controls();message('Starting microphone…');
    try{const stop=await captureSpeech({signal:controller.signal,keepAudio:$('vwKeepAudio').checked,onEnded:error=>{if(ticket===generation&&state==='listening'){if(error)failCapture(error,ticket);else finish().catch(e=>failCapture(e,ticket));}},onSamples:chunk=>{if(ticket!==generation||!['starting','listening','stopping'].includes(state))return;const all=new Float32Array(audio.length+chunk.length);all.set(audio);all.set(chunk,audio.length);audio=all;while(audio.length>=16000){const piece=audio.slice(0,16000);audio=audio.slice(16000);enqueue(piece,ticket);}}});
      if(ticket!==generation){await stop();return;}stopMic=stop;state='listening';$('vwSetup').open=false;message('Microphone on · transcribing locally. Stop to organize and clean up.');controls();$('vwStop').focus();
    }catch(e){failCapture(e,ticket);}
  };
  async function processDraft(){
    if(!committed.trim()){state='idle';message('Microphone off. No speech was recognized.');controls();return;}
    const ticket=generation;let config;
    try{if(!current())throw Error('The journal changed. Close voice writing and choose the target again.');config=connection();}catch(e){state='idle';controls();message(e.message);return;}
    state='processing';controller=new AbortController();const activeController=controller;cleanupTimer=setTimeout(()=>activeController.abort(),90000);$('vwDraft').value='';controls();message('Microphone off · organizing locally with Needle…');
    try{
      let organization='';
      try{const result=await engine.organize(committed);if(ticket!==generation||activeController.signal.aborted)return;organization=organizedJot(result);$('vwOrganization').textContent=organization;}
      catch{if(ticket!==generation||activeController.signal.aborted)return;$('vwOrganization').textContent='Needle could not produce a reliable organization. Cleanup will use the original transcript.';}
      message('Microphone off · cleaning up with '+(config.provider==='embedded'?'SmolLM2 on this device':config.provider==='local'?'your local writing model':'OpenRouter (ZDR '+(config.zdr?'on':'off')+')')+'…');
      const candidates=await engine.cleanup(committed,organization,config,{signal:activeController.signal});
      if(ticket!==generation||activeController.signal.aborted||!current())return;aiEdit(snapshot,start,end,candidates[0].jot);$('vwDraft').value=candidates[0].jot;state='review';message('Microphone off. Organization and cleanup complete. Compare the original and review the draft before inserting.');
    }catch(e){if(ticket===generation){state='idle';message('Microphone off. '+e.message+' Original transcript retained. Retry organization and cleanup; nothing was inserted.');}}
    finally{clearTimeout(cleanupTimer);if(ticket===generation){if(state==='processing'){state='idle';message('Microphone off. Processing stopped; retry organization and cleanup.');}controls();}}
  }
  async function finish(){if(!['listening','starting'].includes(state))return;state='stopping';const ticket=generation;controls();message('Stopping microphone and finishing the transcript…');const stop=stopMic;stopMic=null;const recorded=await stop?.();if(ticket!==generation)return;recording=recorded||null;if(audio.length)enqueue(audio.slice(),ticket);audio=new Float32Array(0);await queue;if(ticket!==generation||controller?.signal.aborted)return;try{showTranscript(await engine.finish());if(ticket!==generation)return;await processDraft();}catch(e){failCapture(e,ticket);}}
  $('vwStop').onclick=()=>finish().catch(e=>failCapture(e,generation));$('vwRetry').onclick=()=>processDraft();
  $('vwCancel').onclick=()=>{generation++;controller?.abort();stopMic?.();stopMic=null;clearTimeout(cleanupTimer);destroyEngine();state='idle';$('vwDraft').value='';message('Microphone off. Processing cancelled. What you said is kept; press Clean up again to retry.');controls();if(dialog.open)autoLoad(true);};
  $('vwInsert').onclick=async()=>{
    if(state!=='review'||!current())return;
    state='inserting';controls();
    try{const change=aiEdit(snapshot,start,end,$('vwDraft').value);let text=change.insertion;
      if($('vwKeepAudio').checked){
        if(!recording?.size)throw Error('The requested recording is unavailable. Dictate again, or turn off retention to insert only the cleaned writing.');
        if(!addCapture)throw Error('This reader cannot attach a recording.');
        const id=crypto.randomUUID(),audioPath='media/'+crypto.randomUUID(),transcriptPath='media/'+crypto.randomUUID();
        const type=recording.type.split(';')[0],extension=type==='audio/mp4'?'m4a':type==='audio/ogg'?'ogg':'webm';
        const data=new Uint8Array(await recording.arrayBuffer());if(!current())throw Error('The journal changed before insertion.');
        const capture={id,identity,revision,position:start,end,source:text+'\n\n[Voice recording]('+audioPath+') · [Original transcript]('+transcriptPath+')\n',assets:[{path:audioPath,name:'voice-'+id+'.'+extension,mediaType:recording.type,data},{path:transcriptPath,name:'voice-'+id+'-transcript.txt',mediaType:'text/plain;charset=utf-8',data:new TextEncoder().encode(committed)}]};
        // Preserve a concrete capture through async persistence; the bridge owns archive limits and encryption.
        const saved=await addCapture(capture);reset();status(saved?'Inserted reviewed voice writing, recording and original transcript.':'Voice writing was added but browser saving failed. Download the journal before closing.');
      }else{reset();editor.focus();editor.setSelectionRange(change.start,change.end);if(editor.jotApplyEdit)editor.jotApplyEdit({start:change.start,end:change.end,text});else if(!doc.execCommand('insertText',false,text)){editor.setRangeText(text,change.start,change.end,'end');editor.dispatchEvent(new Event('input',{bubbles:true}));}status('Inserted reviewed voice writing. Undo removes this change.');}}catch(e){if(dialog.open){state='review';controls();message(e.message);}}
  };
  editor.addEventListener('input',()=>{if(dialog.open&&!current())reset();});win.addEventListener('pagehide',reset);doc.addEventListener('visibilitychange',()=>{if(doc.hidden&&['starting','listening'].includes(state)){if(state==='listening')finish().catch(e=>failCapture(e,generation));else reset();}});
  $('vwProvider').onchange();controls();return {reset};
}
