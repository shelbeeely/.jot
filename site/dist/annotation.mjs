import { exportHTML } from './jot/export.mjs';
import { parse } from './jot/jot.mjs';
import { toCanvas } from './vendor/browser/tools.mjs';
import { validateInk, drawInk } from './ink.mjs';

async function snapshotPage(paper, pageNumber, pageMm, signal) {
  await paper.jotReady;
  const bounds=paper.getBoundingClientRect(),width=Math.min(1200,Math.max(320,Math.round(bounds.width))),height=Math.round(width*pageMm[1]/pageMm[0]);
  if(height>4000||!Number.isFinite(height))throw Error('Choose a smaller page size before annotating.');
  const html=await exportHTML(paper,{title:'Page snapshot',fetchImpl:url=>{
    const parsed=new URL(url,location.href);if(!['blob:','data:'].includes(parsed.protocol)&&parsed.origin!==location.origin)throw Error('External resources cannot be included in a page snapshot.');return fetch(url,{credentials:'omit',redirect:'error'});
  }});
  signal.throwIfAborted();
  const frame=document.createElement('iframe');frame.className='annotation-capture';frame.setAttribute('sandbox','allow-same-origin');frame.setAttribute('aria-hidden','true');frame.style.cssText=`position:fixed;left:-20000px;top:0;width:${width}px;height:${height}px;visibility:hidden`;
  try{
    const ready=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Page capture timed out.')),15000);frame.onload=()=>{clearTimeout(timeout);resolve();};signal.addEventListener('abort',()=>{clearTimeout(timeout);frame.remove();reject(signal.reason);},{once:true});});
    frame.srcdoc=html.replace('<head>',`<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:">`);document.body.append(frame);await ready;
    signal.throwIfAborted();const doc=frame.contentDocument;await doc.fonts.ready;signal.throwIfAborted();
    const main=doc.querySelector('main');doc.body.style.cssText='padding:0;margin:0';main.style.setProperty('width',width+'px','important');main.style.setProperty('max-width','none','important');main.style.margin='0';main.style.boxShadow='none';main.style.maxHeight='none';main.style.overflow='visible';
    const total=Math.max(1,Math.ceil(main.scrollHeight/height));if(pageNumber>=total)throw Error(`This preview has ${total} page${total===1?'':'s'}. Choose an available page.`);
    const viewport=doc.createElement('div');viewport.style.cssText=`position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${getComputedStyle(paper).backgroundColor}`;main.before(viewport);viewport.append(main);main.style.position='absolute';main.style.top=-(pageNumber*height)+'px';main.style.left='0';
    const canvas=await toCanvas(viewport,{width,height,pixelRatio:Math.min(2,2048/width),fontEmbedCSS:'',skipAutoScale:false});
    return {blob:await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not capture this page.')),'image/png')),page: {widthMm:pageMm[0],heightMm:pageMm[1]}};
  }finally{frame.remove();}
}
export function setupAnnotations(bridge) {
  const {editor,status}=bridge,button=document.createElement('button');button.id='writerAnnotateBtn';button.type='button';button.className='quiet';button.textContent='Annotate page';document.querySelector('.tool-row').append(button);
  const section=document.createElement('section');section.id='writerAnnotation';section.className='writer-annotation';section.contentEditable='false';section.setAttribute('aria-label','Annotate a page snapshot');section.hidden=true;
  section.innerHTML=`<h2>Write over a page</h2><p class="small">Create a marked-up copy of a preview page. The original text stays editable; later text changes will not move your marks on this copy.</p><label>Preview page number<input id="annotationPage" type="number" min="1" value="1" max="1000"></label><button id="annotationCapture" type="button">Capture page</button><div id="annotationDrawing" hidden><div class="browser-actions"><button id="annotationPen" type="button" aria-pressed="true">Pen</button><button id="annotationEraser" type="button" aria-pressed="false">Eraser</button><label>Ink color<input id="annotationColor" type="color" value="#26372d"></label><label>Ink width (mm)<input id="annotationWidth" type="number" min="0.1" max="3" step="0.1" value="0.4"></label><label><input id="annotationPenOnly" type="checkbox" checked> Pen only (turn off for touch or mouse)</label><label>Zoom<select id="annotationZoom"><option value="100">100%</option><option value="150">150%</option><option value="200">200%</option></select></label><button id="annotationUndo" type="button">Undo stroke</button><button id="annotationRedo" type="button">Redo stroke</button></div><div class="annotation-scroll"><div id="annotationSheet"><img id="annotationBackground" alt="Frozen page background"><canvas id="annotationCanvas" tabindex="0" aria-label="Draw on the frozen page using pen, touch or mouse"></canvas></div></div><label>Page description<input id="annotationDescription" maxlength="200" value="Annotated page"></label><div class="browser-actions"><button id="annotationCaret" type="button">Insert copy at current caret</button><button id="annotationDone" type="button">Done</button></div></div><button id="annotationCancel" type="button">Cancel</button><p id="annotationStatus" role="status" aria-live="polite"></p>`;
  const $=id=>section.querySelector('#'+id);let captureController=null,draft=null,pendingCommit=null,undo=[],active=null,tool='pen',epoch=0,target=null,backgroundURL=null,backgroundBlob=null,description='Annotated page';
  const message=text=>{$('annotationStatus').textContent=text;};
  const mount=()=>{if(!section.hidden)bridge.mountInline(section,target?.position??editor.selectionEnd);bindCards();};
  const render=()=>{if(!draft)return;drawInk($('annotationCanvas'),draft.strokes,draft.page.widthMm);$('annotationUndo').disabled=!draft.strokes.length;$('annotationRedo').disabled=!undo.length;};
  const reset=()=>{epoch++;captureController?.abort();captureController=null;active=null;draft=null;pendingCommit=null;$('annotationDone').textContent='Done';for(const id of ['annotationUndo','annotationRedo','annotationPen','annotationEraser','annotationCaret'])$(id).disabled=false;undo=[];target=null;backgroundBlob=null;if(backgroundURL)URL.revokeObjectURL(backgroundURL);backgroundURL=null;$('annotationBackground').removeAttribute('src');$('annotationCanvas').width=1;$('annotationCanvas').height=1;section.hidden=true;section.remove();$('annotationDrawing').hidden=true;$('annotationCapture').disabled=false;message('');};
  const begin=()=>{if(bridge.isLocked()){status('Unlock the journal before annotating.');return false;}if(bridge.composing()){status('Finish the current text composition first.');return false;}if(!section.hidden){section.scrollIntoView({block:'center'});message('Finish this copy with Done or Cancel before starting another.');return false;}reset();target={position:editor.selectionEnd,end:editor.selectionEnd,revision:bridge.revision(),identity:bridge.identity()};section.hidden=false;bridge.showLive();mount();section.scrollIntoView({block:'center'});$('annotationCapture').focus();return true;};
  button.onclick=begin;
  async function loadBackground(blob,ink,ticket=epoch){
    if(blob.size>32*1024*1024)throw Error('The page snapshot exceeds 32 MiB.');
    if(ticket!==epoch)return;const image=$('annotationBackground');if(backgroundURL)URL.revokeObjectURL(backgroundURL);backgroundURL=URL.createObjectURL(blob);image.src=backgroundURL;await image.decode();if(ticket!==epoch)return;
    if(image.naturalWidth*image.naturalHeight>16000000)throw Error('The background image is too large.');
    backgroundBlob=blob;draft=structuredClone(ink);const canvas=$('annotationCanvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;$('annotationDrawing').hidden=false;$('annotationDescription').value=description;render();
  }
  $('annotationCapture').onclick=async()=>{
    const ticket=epoch;$('annotationCapture').disabled=true;
    try{if(bridge.isLocked())throw Error('Unlock the journal first.');const page=Number($('annotationPage').value);if(!Number.isInteger(page)||page<1||page>1000)throw Error('Choose a page number from 1 to 1000.');message('Preparing the local page snapshot…');captureController=new AbortController();await bridge.preparePage();if(ticket!==epoch)return;const result=await snapshotPage(bridge.paper(),page-1,bridge.pageMm(),captureController.signal);if(ticket!==epoch)return;description='Annotated page '+page;const color=getComputedStyle(bridge.paper()).color.match(/\d+/g)?.slice(0,3);if(color?.length===3)$('annotationColor').value='#'+color.map(value=>Number(value).toString(16).padStart(2,'0')).join('');await loadBackground(result.blob,{format:'jot-ink',version:1,page:result.page,coordinates:'normalized',strokes:[]},ticket);if(ticket!==epoch)return;message('Draw on this frozen copy, then choose Done. Nothing has been added yet.');}
    catch(error){if(ticket===epoch)message(error.message);}finally{if(ticket===epoch)$('annotationCapture').disabled=false;}
  };
  const coords=event=>{const r=$('annotationCanvas').getBoundingClientRect();return{x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height)),...(event.pointerType==='pen'&&event.pressure>0?{pressure:event.pressure}:{})};};
  const canvas=$('annotationCanvas');canvas.addEventListener('pointerdown',event=>{if(!draft||pendingCommit||active||$('annotationPenOnly').checked&&event.pointerType!=='pen')return;const width=Number($('annotationWidth').value);if(!Number.isFinite(width)||width<.1||width>3){message('Choose an ink width from 0.1 to 3 mm.');return;}event.preventDefault();canvas.setPointerCapture(event.pointerId);active={pointerId:event.pointerId,tool,color:$('annotationColor').value,widthMm:width,points:[coords(event)]};});
  canvas.addEventListener('pointermove',event=>{if(!active||event.pointerId!==active.pointerId)return;event.preventDefault();if(draft.strokes.reduce((n,s)=>n+s.points.length,0)+active.points.length>100000){message('This page reached its stroke limit. Finish this copy before adding another.');return;}const coalesced=event.getCoalescedEvents?.();for(const point of coalesced?.length?coalesced:[event])active.points.push(coords(point));drawInk(canvas,[...draft.strokes,active],draft.page.widthMm);});
  const finish=event=>{if(!active||event.pointerId!==active.pointerId)return;const{pointerId,...stroke}=active;draft.strokes.push(stroke);active=null;undo=[];if(canvas.hasPointerCapture(pointerId))canvas.releasePointerCapture(pointerId);render();};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',event=>{if(active?.pointerId===event.pointerId){active=null;render();}});
  $('annotationPen').onclick=()=>{tool='pen';$('annotationPen').setAttribute('aria-pressed','true');$('annotationEraser').setAttribute('aria-pressed','false');};$('annotationEraser').onclick=()=>{tool='eraser';$('annotationPen').setAttribute('aria-pressed','false');$('annotationEraser').setAttribute('aria-pressed','true');};
  $('annotationUndo').onclick=()=>{if(!pendingCommit&&draft?.strokes.length){undo.push(draft.strokes.pop());render();}};$('annotationRedo').onclick=()=>{if(!pendingCommit&&undo.length){draft.strokes.push(undo.pop());render();}};
  $('annotationZoom').onchange=()=>{$('annotationSheet').style.width=$('annotationZoom').value+'%';};
  $('annotationCaret').onclick=()=>{target={position:editor.selectionEnd,end:editor.selectionEnd,revision:bridge.revision(),identity:bridge.identity()};mount();message('This copy will be inserted at the newly captured caret.');};
  $('annotationDone').onclick=async()=>{
    const ticket=epoch;if(!draft||active)return;$('annotationDone').disabled=true;
    try{
      if(pendingCommit){const ok=await bridge.addCapture(pendingCommit);if(!ok)throw Error('The drawing is still not saved completely. Download the journal or retry.');bridge.retireCapture(pendingCommit.id);reset();status('Saved the annotated copy.');return;}
      validateInk(draft);if(bridge.isLocked()||target.revision!==bridge.revision()||target.identity!==bridge.identity())throw Error('The document changed. Choose a new caret and Insert copy at current caret; your drawing is still here.');
      const id=crypto.randomUUID(),base='media/'+id,background=base+'-background.png',png=base+'.png',ink=base+'.jot-ink.json';
      const composed=document.createElement('canvas');composed.width=canvas.width;composed.height=canvas.height;const ctx=composed.getContext('2d');ctx.drawImage($('annotationBackground'),0,0,canvas.width,canvas.height);ctx.drawImage(canvas,0,0);
      const blob=await new Promise(resolve=>composed.toBlob(resolve,'image/png'));if(!blob)throw Error('Could not create this annotated image.');
      const value={...draft,background},label=$('annotationDescription').value.trim()||'Annotated page',safeLabel=label.replace(/[\[\]\\\r\n]/g,' ');
      const assets=[{path:background,mediaType:'image/png',data:new Uint8Array(await backgroundBlob.arrayBuffer())},{path:png,mediaType:'image/png',data:new Uint8Array(await blob.arrayBuffer())},{path:ink,mediaType:'application/json',data:new TextEncoder().encode(JSON.stringify(value))}];
      if(ticket!==epoch)return;
      const commit={id,source:`![${safeLabel}](${png})\n\n[Editable handwriting strokes](${ink})`,assets,position:target.position,end:target.end,revision:target.revision,identity:target.identity};
      const ok=await bridge.addCapture(commit);
      if(ticket!==epoch)return;
      if(!ok){pendingCommit=commit;$('annotationDone').textContent='Retry save';for(const id of ['annotationUndo','annotationRedo','annotationPen','annotationEraser','annotationCaret'])$(id).disabled=true;message('The image is inserted but could not be saved completely. Retry save or download the journal to keep it.');return;}if(ticket===epoch){bridge.retireCapture(id);reset();status('Saved the annotated copy. Undo restores the previous writing; original attachments are retained.');}
    }catch(error){if(ticket===epoch)message(error.message);}finally{$('annotationDone').disabled=false;}
  };
  $('annotationCancel').onclick=()=>{reset();editor.focus();};
  for(const type of ['beforeinput','input','pointerdown','pointerup','keydown'])section.addEventListener(type,event=>{event.stopPropagation();if(type==='keydown'&&event.key==='Escape'&&!event.isComposing){event.preventDefault();reset();editor.focus();}});
  function bindCards(){
    for(const anchor of bridge.surface().querySelectorAll('a[download$=".jot-ink.json"]')){
      if(anchor.nextElementSibling?.classList.contains('annotation-edit'))continue;const asset=bridge.assetFromURL(anchor.href);if(!asset)continue;
      const edit=document.createElement('button');edit.className='annotation-edit';edit.type='button';edit.contentEditable='false';edit.textContent='Edit handwriting';anchor.after(edit);
      edit.onclick=async event=>{event.preventDefault();event.stopPropagation();try{
        const data=validateInk(JSON.parse(new TextDecoder().decode(asset.data)));if(!data.background)throw Error('This older stroke file has no frozen background. Keep it as an attachment or create a new annotated copy.');
        const background=bridge.lookupAsset(data.background);if(!background||!['image/png','image/jpeg'].includes(background.mediaType))throw Error('The saved background is missing or unsupported.');
        const nodes=parse(editor.value).nodes.filter(n=>n.raw.includes(asset.path)||n.raw.includes(asset.path.replace('.jot-ink.json','.png')));if(nodes.length!==2)throw Error('This drawing has multiple or modified references. Create a new annotated copy instead.');
        const bytes=new TextEncoder().encode(editor.value),decode=byte=>new TextDecoder().decode(bytes.subarray(0,byte)).length;
        if(!begin())return;target.position=decode(nodes[0].start);target.end=decode(nodes[1].end);description='Annotated page';const ticket=epoch;await loadBackground(new Blob([background.data],{type:background.mediaType}),data,ticket);if(ticket!==epoch)return;message('Editing a copy of the stored strokes. Done replaces this reference; previous image assets stay available to Undo.');
      }catch(error){message(error.message);status(error.message,true);}};
    }
  }
  editor.addEventListener('jotliveupdate',mount);globalThis.addEventListener('beforeunload',event=>{if(!section.hidden){event.preventDefault();event.returnValue='';}});globalThis.addEventListener('pagehide',reset);
  return {reset,get pending(){return !section.hidden;}};
}
