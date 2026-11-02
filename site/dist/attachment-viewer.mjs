// Local attachments only. Never navigate to a document-supplied URL or execute HTML/SVG.
const images = new Set(['image/png','image/jpeg','image/webp','image/gif','image/avif','image/apng','image/bmp','image/x-icon','image/vnd.microsoft.icon','image/jxl']);
const audio = new Set(['audio/mpeg','audio/mp3','audio/mp4','audio/aac','audio/ogg','audio/opus','audio/webm','audio/wav','audio/x-wav','audio/flac','audio/x-flac']);
const video = new Set(['video/mp4','video/webm','video/ogg','video/quicktime','video/x-matroska']);
export function attachmentKind(asset) {
  const type = String(asset?.mediaType || '').split(';')[0].trim().toLowerCase();
  if (images.has(type)) return 'image';
  if (audio.has(type)) return 'audio';
  if (video.has(type)) return 'video';
  // Do not hand mislabeled HTML to a frame on the application's origin.
  if (type === 'application/pdf' && new TextDecoder().decode(asset.data?.slice(0, 5)) === '%PDF-') return 'pdf';
  return null;
}
export function setupAttachmentViewer({document, lookupURL}) {
  const win = document.defaultView;
  const make = (tag, text) => { const n = document.createElement(tag); if (text) n.textContent = text; return n; };
  const dialog = make('dialog'); dialog.id = 'attachmentViewer'; dialog.setAttribute('aria-labelledby','attachmentViewerTitle');
  const title = make('h2'); title.id = 'attachmentViewerTitle';
  const closeButton = make('button','Close'); closeButton.type = 'button'; closeButton.autofocus = true;
  const content = make('div'); content.className = 'attachment-viewer-content';
  const message = make('p'); message.setAttribute('role','status');
  const download = make('a','Download original');
  const note = make('p','This opens a local attachment. Downloading makes a separate, unencrypted copy.');
  dialog.append(title,closeButton,content,message,download,note); document.body.append(dialog);
  let url = null;
  function clear() {
    for (const player of content.querySelectorAll('audio,video')) { player.pause(); player.removeAttribute('src'); player.load(); }
    for (const frame of content.querySelectorAll('iframe')) frame.src = 'about:blank';
    content.replaceChildren(); download.removeAttribute('href'); download.removeAttribute('download');
    title.textContent = ''; message.textContent = '';
    if (url) win.URL.revokeObjectURL(url); url = null;
  }
  function close() { if (dialog.open) dialog.close(); clear(); }
  dialog.addEventListener('close',() => { if (!dialog.open) clear(); }); closeButton.onclick = close;
  win.addEventListener('pagehide',close);
  function open(asset) {
    const kind = attachmentKind(asset); if (!kind) return false;
    close(); title.textContent = asset.name || asset.path.split('/').pop();
    url = win.URL.createObjectURL(new win.Blob([asset.data],{type:asset.mediaType}));
    download.href = url; download.download = asset.name || asset.path.split('/').pop();
    message.textContent = 'If this browser cannot display the file, download the original to open it in another app.';
    let viewer;
    if (kind === 'image') { viewer = make('img'); viewer.alt = title.textContent; }
    else if (kind === 'pdf') {
      if (win.navigator.pdfViewerEnabled === false) {
        message.textContent = 'This browser has no built-in PDF viewer. Download the original to read it.';
      } else { viewer = make('iframe'); viewer.title = 'PDF: ' + title.textContent; viewer.referrerPolicy = 'no-referrer'; }
    } else {
      viewer = make(kind); viewer.controls = true; viewer.preload = 'metadata';
      viewer.setAttribute('aria-label',title.textContent);
      if (kind === 'video') viewer.playsInline = true;
    }
    if (viewer) {
      viewer.addEventListener('error',() => { if (!viewer.isConnected || !dialog.open) return; message.textContent = 'This browser could not display this file. Download the original to open it in another app.'; });
      viewer.src = url; content.append(viewer);
    }
    dialog.showModal(); return true;
  }
  // Preview links retain their normal download behavior when no local viewer is available.
  document.addEventListener('click',event => {
      if (!event.target.closest('#paperPreview,#liveWriting')) return;
      const node = event.target.closest('a,img');
      if (!node || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const asset = lookupURL(node.tagName === 'IMG' ? node.src : node.href);
      if (asset && attachmentKind(asset)) { event.preventDefault(); open(asset); }
  });
  return {open,close};
}
