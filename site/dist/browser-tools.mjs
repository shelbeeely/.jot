import { entriesOf, excerptFile, reviewCapture, captureId } from './capture-core.mjs';
import { enqueue, inboxItems, inboxItem, discardItem } from './inbox.mjs';
import { setupOffline, setupWakeLock } from './browser-session.mjs';
import { NearbySession, validatePair } from './nearby.mjs';
import { QRCode, jsQR } from './vendor/browser/tools.mjs';

export const downloadFile = file => {
  const url = URL.createObjectURL(file), a = document.createElement('a'); a.href = url; a.download = file.name || 'journal.jot'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 15000);
};
export function setupBrowserTools(bridge) {
  const { editor, status } = bridge;
  const button = document.createElement('button'); button.id = 'writerBrowserBtn'; button.className = 'quiet'; button.type = 'button'; button.textContent = 'Offline, sharing & devices'; document.querySelector('.tool-row').append(button);
  const dialog = document.createElement('dialog'); dialog.className = 'writer-dialog browser-dialog'; dialog.id = 'browserTools'; dialog.setAttribute('aria-labelledby','browserToolsTitle');
  dialog.innerHTML = `<div class="dialog-header"><h2 id="browserToolsTitle">Your writing, with you</h2><button id="browserClose" type="button">Close</button></div>
<details open><summary>Offline and this device</summary><p id="offlineStatus" role="status">Preparing offline application files…</p><button id="installJot" type="button">Install Jot</button><p id="installHelp" class="small">If an install button is unavailable, use your browser’s Install app or Add to Home Screen menu. Opening once online prepares offline use.</p><button id="protectStorage" type="button">Protect local storage</button><p id="storageStatus" role="status"></p><label><input id="browserWake" type="checkbox"> Keep screen awake this session</label><p id="wakeStatus" role="status"></p></details>
<details open><summary>Share writing</summary><label>What to share<select id="shareScope"><option value="document">Complete journal, including every attachment</option><option value="selection">Captured text selection</option><option value="entries">Choose dated entries</option></select></label><div id="shareEntries" hidden></div><p class="small">Selected excerpts are plaintext or a plain .jotz, even if this journal is locked. A complete locked journal stays encrypted. Review the writing and attachment names before sharing.</p><button id="prepareShare" type="button">Prepare for review</button><label>Outgoing review<textarea id="shareReview" rows="5" readonly></textarea></label><p id="shareFiles" class="small"></p><div class="browser-actions"><button id="shareNative" type="button" disabled>Share…</button><button id="shareDownload" type="button" disabled>Download copy</button></div></details>
<details open><summary>Incoming shares</summary><p class="small">Pending items are stored on this device without your journal’s passphrase protection. Add or discard them to remove them from this inbox. Nothing is added automatically.</p><button id="refreshInbox" type="button">Refresh inbox</button><button id="importShared" type="button">Import a shared file</button><input id="sharedFile" type="file" multiple hidden><div id="inboxList"></div><section id="inboxReview" hidden><label>Review incoming writing<textarea id="incomingText" rows="7"></textarea></label><p id="incomingFiles" class="small"></p><div class="browser-actions"><button id="incomingCaret" type="button">Use current caret</button><button id="incomingAdd" type="button">Add reviewed content</button><button id="incomingOpen" type="button">Open original separately</button><button id="incomingDownload" type="button">Download original</button></div></section></details>
<details><summary>Nearby transfer</summary><p>Open Jot on both devices on the same Wi-Fi or hotspot. No internet pairing service, STUN or TURN is used. Some networks block local connections; use file sharing if pairing fails.</p><div class="browser-actions"><button id="nearbyInvite" type="button">Create invitation</button><button id="nearbyImport" type="button">Import invitation or response</button><input id="pairFile" type="file" accept=".json,application/json" hidden><button id="pairScan" type="button">Scan pairing QR</button></div><p id="pairStatus" role="status"></p><canvas id="pairQR" aria-label="Pairing QR code" hidden></canvas><button id="pairDownload" type="button" hidden>Download pairing file</button><video id="pairCamera" playsinline muted hidden></video><button id="pairStopCamera" type="button" hidden>Stop camera</button><p id="pairCode" aria-live="polite"></p><button id="pairConfirm" type="button" disabled>Both codes match</button><button id="nearbySend" type="button" disabled>Send reviewed outgoing copy</button><button id="nearbyCancel" type="button">Cancel transfer</button><button id="nearbyDisconnect" type="button">Disconnect devices</button></details><p id="browserMessage" role="status" aria-live="polite"></p>`;
  document.body.append(dialog); const $ = id => dialog.querySelector('#'+id), say = text => { $('browserMessage').textContent = text; };
  let prepared = null, preparedId, preparedRevision, selection = [0,0], caret = 0, revision, documentId, reviewed = null, reviewId = '', pair = null, session = null, camera = null, cameraFrame, cameraGeneration=0, installEvent, epoch = 0;
  const wake = setupWakeLock({ isLocked: bridge.isLocked, changed: text => { $('wakeStatus').textContent = text; } });
  $('browserWake').disabled = !wake.supported; if (!wake.supported) $('wakeStatus').textContent = 'Keeping the screen awake is unavailable here.';
  $('browserWake').onchange = () => wake.enable($('browserWake').checked);
  globalThis.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installEvent = event; });
  $('installJot').onclick = async () => { if (!installEvent) { $('installHelp').textContent = 'Use your browser’s Install app or Add to Home Screen menu where available. Desktop Jot is already packaged for offline use.'; return; } await installEvent.prompt(); installEvent = null; };
  if (globalThis.jotDesktop) $('offlineStatus').textContent = 'The desktop app already includes its application files. Web-app installation is not needed.';
  else setupOffline({ changed: text => { $('offlineStatus').textContent = text; } }).then(reg => { if (!reg) $('offlineStatus').textContent = 'Offline installation is unavailable here. Save or download your journal to keep it.'; }).catch(() => { $('offlineStatus').textContent = 'Offline preparation failed. Stay online or download a journal backup and retry.'; });
  $('protectStorage').onclick = async () => {
    try {
      const kept = await navigator.storage?.persist?.(), estimate = await navigator.storage?.estimate?.();
      $('storageStatus').textContent = (kept ? 'Persistent storage granted. ' : 'Persistent storage was not granted or is unavailable. ') + (estimate ? `${Math.ceil((estimate.usage || 0)/1048576)} MiB used of approximately ${Math.floor((estimate.quota || 0)/1048576)} MiB. ` : '') + 'Browser data can still be removed. Keep downloaded backups.';
    } catch { $('storageStatus').textContent = 'Storage information is unavailable. Download journal backups.'; }
  };
  const clearOutgoing = () => { prepared = null; $('shareReview').value = ''; $('shareFiles').textContent = ''; for (const id of ['shareNative','shareDownload','nearbySend']) $(id).disabled = true; };
  const captureCaret = () => { caret = editor.selectionEnd; revision = bridge.revision(); documentId = bridge.identity(); say('Captured the current caret. Review content, then Add.'); };
  const refreshEntries = () => {
    $('shareEntries').replaceChildren(); const source = editor.value;
    entriesOf(source).forEach((entry,i) => { const label = document.createElement('label'), box = document.createElement('input'); box.type = 'checkbox'; box.value = i; label.append(box, document.createTextNode(entry.label + ' · section ' + (i+1))); $('shareEntries').append(label); });
    $('shareEntries').hidden = $('shareScope').value !== 'entries';
  };
  $('shareScope').onchange = () => { clearOutgoing(); refreshEntries(); };
  $('prepareShare').onclick = async () => {
    clearOutgoing(); const ticket = epoch, snap = bridge.snapshot();
    try {
      if (bridge.isLocked()) throw Error('Unlock the journal first.');
      let file, source = snap.source, attachments = snap.assets;
      if ($('shareScope').value === 'document') file = await bridge.exportDocument(snap);
      else {
        if ($('shareScope').value === 'selection') source = snap.source.slice(...selection);
        else { const entries = entriesOf(snap.source); source = [...$('shareEntries').querySelectorAll('input:checked')].map(box => entries[Number(box.value)]).map(item => snap.source.slice(item.start,item.end)).join('\n\n'); }
        file = await excerptFile(source, snap.assets, 'journal-excerpt'); const doc = await reviewCapture({id:'outgoing',text:'',files:[file]}); attachments = doc.assets;
      }
      if (ticket !== epoch || snap.revision !== bridge.revision() || snap.identity !== bridge.identity()) throw Error('Writing changed. Prepare a new outgoing copy.');
      prepared = file; preparedId = captureId(); preparedRevision = snap.revision;
      $('shareReview').value = snap.locked && $('shareScope').value === 'document' ? 'Encrypted journal copy. The receiving device needs one of its ways in. All current attachments are included.' : source;
      $('shareFiles').textContent = file.name + ' · ' + file.size + ' bytes' + (attachments.length ? '\nAttachments, including retained unused files for a complete journal: ' + attachments.map(a=>a.path).join(', ') : ' · no attachments');
      $('shareNative').disabled = false; $('shareDownload').disabled = false; $('nearbySend').disabled = !(session?.confirmed && session?.peerConfirmed);
      say('Review this copy. Sharing sends it outside this browser; your original is unchanged.');
    } catch(error) { say(error.message); }
  };
  const currentOutgoing = () => { if (!prepared || preparedRevision !== bridge.revision()) throw Error('Prepare and review a fresh outgoing copy first.'); return prepared; };
  $('shareNative').onclick = () => {
    try { const file = currentOutgoing(); if (!navigator.share || !navigator.canShare?.({files:[file]})) { downloadFile(file); say('File sharing is unavailable for this format. Downloaded a copy instead.'); return; } navigator.share({files:[file]}).then(()=>say('Returned from the system share sheet.')).catch(error=>say(error.name==='AbortError'?'Sharing cancelled.':'System sharing failed. Use Download copy.')); } catch(error) { say(error.message); }
  };
  $('shareDownload').onclick = () => { try { downloadFile(currentOutgoing()); } catch(error) { say(error.message); } };
  async function refreshInbox() {
    try {
      const items = (await inboxItems()).sort((a,b)=>a.receivedAt-b.receivedAt); $('inboxList').replaceChildren();
      for (const item of items) {
        const row = document.createElement('div'); row.className='browser-actions'; const label=document.createElement('span'); label.textContent = (item.files.map(f=>f.name || 'Shared file').join(', ') || 'Shared text') + ` · ${item.size} bytes`;
        const review=document.createElement('button'); review.type='button'; review.textContent='Review'; review.onclick=()=>reviewIncoming(item.id);
        const discard=document.createElement('button'); discard.type='button'; discard.textContent='Discard inbox copy'; discard.onclick=async()=>{try{await discardItem(item.id); if(reviewId===item.id) clearIncoming(); await refreshInbox();}catch(error){say(error.message);}}; const download=document.createElement('button');download.type='button';download.textContent='Download originals';download.onclick=()=>{if(item.files.length)item.files.forEach(downloadFile);else downloadFile(new File([item.text],'shared-writing.jot',{type:'text/plain'}));};row.append(label,review,download,discard); $('inboxList').append(row);
      }
      if (!items.length) $('inboxList').textContent='Your incoming inbox is empty.';
    } catch { say('The local inbox is unavailable. Close older Jot tabs, free storage or download the original from the sending device.'); }
  }
  const clearIncoming = () => { reviewed=null; reviewId=''; $('inboxReview').hidden=true; $('incomingText').value=''; $('incomingFiles').textContent=''; };
  async function reviewIncoming(id) {
    const ticket=epoch;
    try {
      const item=await inboxItem(id); if(!item) throw Error('This item is no longer in the inbox.');
      const result=await reviewCapture(item); if(ticket!==epoch)return; reviewed={item,...result}; reviewId=id; captureCaret();
      $('incomingText').value=result.source; $('incomingText').readOnly=!!result.locked;
      $('incomingFiles').textContent=result.locked?'Encrypted journal: open it separately to unlock it.':result.assets.map(a=>a.path).join(', ');
      $('incomingAdd').disabled=!!result.locked; $('incomingOpen').disabled=item.files.length>1; $('inboxReview').hidden=false;
    } catch(error) { clearIncoming(); say(error.message); }
  }
  $('incomingCaret').onclick=captureCaret;
  $('incomingAdd').onclick=async()=>{
    if(!reviewed)return; const ticket=epoch, id=reviewId;
    try {
      if(bridge.isLocked())throw Error('Unlock the journal before adding. Pending shares are separate from its protection.');
      const ok=await bridge.addCapture({id,source:$('incomingText').value,assets:reviewed.assets,position:caret,revision,identity:documentId});
      if(!ok)throw Error('The insertion could not be saved completely. The inbox item is retained; retry after fixing storage.');
      await discardItem(id); bridge.retireCapture(id); if(ticket===epoch){clearIncoming();await refreshInbox();say('Added and saved the reviewed content. Removed it from the inbox.');}
    }catch(error){say(error.message);}
  };
  $('incomingOpen').onclick=async()=>{
    if(!reviewed)return; try {const item=reviewed.item;const file=item.files.length===1?item.files[0]:await excerptFile($('incomingText').value,reviewed.assets,'shared-writing'); await bridge.openFile(file);say('Opened a separate journal. The inbox copy remains until you discard it.');}catch(error){say(error.message);}
  };
  $('incomingDownload').onclick=async()=>{if(!reviewed)return;try{if(reviewed.item.files.length)reviewed.item.files.forEach(downloadFile);else downloadFile(new File([$('incomingText').value],'shared-writing.jot',{type:'text/plain'}));}catch(error){say(error.message);}};
  $('refreshInbox').onclick=refreshInbox; $('importShared').onclick=()=>$('sharedFile').click();
  $('sharedFile').onchange=async()=>{const files=[...$('sharedFile').files];$('sharedFile').value='';try{for(const file of files)await enqueue({id:captureId(),text:'',files:[file],origin:'import'});await refreshInbox();say('Files are waiting for review.');}catch(error){say(error.message);}};
  async function showPair(value) {
    pair=value; $('pairDownload').hidden=false; $('pairQR').hidden=false;
    try {await QRCode.toCanvas($('pairQR'),JSON.stringify(value),{width:320,margin:2,errorCorrectionLevel:'L'});}catch{$('pairQR').hidden=true;say('This connection code is too large for one QR. Use the pairing file instead.');}
    $('pairStatus').textContent=value.role==='offer'?'Scan or import this invitation on the other device. Then import its response here.':'Scan or import this response on the inviting device.';
  }
  const newSession=()=>new NearbySession(event=>{
    $('pairStatus').textContent=event.message;
    if(event.kind==='paired'){$('pairCode').textContent='Comparison code: '+event.code;$('pairConfirm').disabled=false;}
    if(event.kind==='ready')$('nearbySend').disabled=!prepared;
    if(event.kind==='received')refreshInbox();
    if(event.kind==='error'){$('nearbySend').disabled=true;$('pairConfirm').disabled=true;}
  });
  const disconnect=()=>{session?.close();session=null;pair=null;$('pairDownload').hidden=true;$('pairQR').hidden=true;$('pairCode').textContent='';$('pairConfirm').disabled=true;$('nearbySend').disabled=true;$('pairStatus').textContent='Disconnected. No incomplete transfer is kept.';};
  const acceptPair=async value=>{const ticket=epoch;let current;try{stopCamera();if(value?.role==='offer'){disconnect();session=current=newSession();const response=await current.answer(validatePair(value,'offer'));if(ticket===epoch&&session===current)await showPair(response);}else{current=session;if(!current)throw Error('Create an invitation before importing a response.');await current.accept(validatePair(value,'answer'));if(ticket===epoch&&session===current)$('pairStatus').textContent='Connecting locally. Wait for the comparison code.';}}catch(error){if(ticket===epoch&&(!current||session===current)){disconnect();say(error.message);}}};
  $('nearbyInvite').disabled=typeof RTCPeerConnection==='undefined';
  $('nearbyInvite').onclick=async()=>{const ticket=epoch;disconnect();const current=session=newSession();try{const value=await current.invite();if(ticket===epoch&&session===current)await showPair(value);}catch(error){if(ticket===epoch&&session===current){disconnect();say(error.message);}}};
  $('nearbyImport').onclick=()=>$('pairFile').click();$('pairFile').onchange=async()=>{const ticket=epoch,file=$('pairFile').files[0];$('pairFile').value='';try{if(!file||file.size>40000)throw Error('Pairing files must be under 40 KB.');const value=JSON.parse(await file.text());if(ticket===epoch)await acceptPair(value);}catch(error){if(ticket===epoch)say(error.message);}};
  $('pairDownload').onclick=()=>{if(pair)downloadFile(new File([JSON.stringify(pair)],pair.role+'.jot-pair.json',{type:'application/json'}));};
  $('pairConfirm').onclick=()=>{try{session.confirm();$('pairConfirm').disabled=true;}catch(error){say(error.message);}};
  $('nearbySend').onclick=async()=>{try{await session.send(currentOutgoing(),{id:preparedId});}catch(error){say(error.message);}};
  $('nearbyCancel').onclick=()=>session?.cancel();$('nearbyDisconnect').onclick=disconnect;
  const stopCamera=()=>{cameraGeneration++;cancelAnimationFrame(cameraFrame);cameraFrame=null;camera?.getTracks().forEach(track=>track.stop());camera=null;$('pairCamera').srcObject=null;$('pairCamera').hidden=true;$('pairStopCamera').hidden=true;};
  $('pairStopCamera').onclick=stopCamera;
  $('pairScan').onclick=async()=>{
    stopCamera();const ticket=epoch, cameraTicket=cameraGeneration;
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw Error('QR scanning is unavailable. Import a pairing file instead.');
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      if(ticket!==epoch||cameraTicket!==cameraGeneration||!dialog.open||document.visibilityState!=='visible'){stream.getTracks().forEach(track=>track.stop());return;}
      camera=stream;const video=$('pairCamera');video.srcObject=stream;video.hidden=false;$('pairStopCamera').hidden=false;await video.play();
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const context=canvas.getContext('2d',{willReadFrequently:true});
      const scan=()=>{if(!camera)return;if(video.readyState>=2){context.drawImage(video,0,0,640,480);const data=context.getImageData(0,0,640,480),code=jsQR(data.data,640,480);if(code){try{const value=JSON.parse(code.data);if(value?.format==='jot-pair'){acceptPair(value);return;}}catch{}}}cameraFrame=requestAnimationFrame(scan);};scan();
    }catch(error){stopCamera();say(error.message||'Camera unavailable. Import a pairing file.');}
  };
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopCamera();});
  const reset=()=>{epoch++;clearOutgoing();clearIncoming();stopCamera();disconnect();wake.reset();$('browserWake').checked=false;if(dialog.open)dialog.close();};
  button.onclick=()=>{if(bridge.isLocked()){status('Unlock the journal first.');return;}selection=[editor.selectionStart,editor.selectionEnd];captureCaret();refreshEntries();dialog.showModal();refreshInbox();};
  $('browserClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{epoch++;stopCamera();clearOutgoing();clearIncoming();disconnect();editor.focus();});
  editor.addEventListener('input',clearOutgoing); globalThis.addEventListener('pagehide',reset);
  const incoming=new URL(location.href).searchParams.get('inbox');if(incoming){const url=new URL(location.href);url.searchParams.delete('inbox');history.replaceState(null,'',url);status('An incoming share is waiting. Open Offline, sharing & devices to review it.');}
  return {reset};
}
