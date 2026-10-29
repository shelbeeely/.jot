// File handles and original bytes live only in this page. Every write requires an explicit Save action.
export const DEVICE_FILE_LIMIT = 64 * 1024 * 1024;
const signature = bytes => bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
export function equalFileBytes(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
  return true;
}
export function deviceFileName(name, packaged = false) {
  const stem = String(name || 'my-journal').replace(/\.(?:jotz?|md|txt)$/i, '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '-').trim().replace(/[. ]+$/g, '').slice(0, 120) || 'my-journal';
  return stem + (packaged ? '.jotz' : '.jot');
}
const types = packaged => [{ description: packaged ? 'Jot document with attachments' : 'Jot plain text', accept: packaged ? { 'application/zip': ['.jotz'] } : { 'text/plain': ['.jot'] } }];
const resultError = error => ({ status: error?.name === 'AbortError' ? 'cancelled' : error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'denied' : 'error', message: String(error?.message || error || 'The device file operation failed.') });
async function fileBytes(file) {
  if (file.size > DEVICE_FILE_LIMIT) throw new Error('This editor accepts device files up to 64 MiB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > DEVICE_FILE_LIMIT) throw new Error('This editor accepts device files up to 64 MiB.');
  return bytes;
}
async function outputBytes(data) {
  let bytes;
  if (typeof data === 'string') bytes = new TextEncoder().encode(data);
  else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data).slice();
  else if (ArrayBuffer.isView(data)) bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
  else if (data && typeof data.arrayBuffer === 'function') bytes = await fileBytes(data);
  else throw new Error('The journal serializer must return text or file bytes.');
  if (bytes.length > DEVICE_FILE_LIMIT) throw new Error('This editor saves device files up to 64 MiB.');
  return bytes;
}

/**
 * getDocument returns a snapshot with scalar revision, name and boolean packaged,
 * plus source/assets needed by serialize(snapshot). Snapshots are cloned before awaits.
 * open selects read-only; call adopt(result) only after successfully loading/validating it.
 */
export function createDeviceFiles({ window: win = globalThis.window, getDocument, serialize }) {
  const secure = win?.isSecureContext === true;
  const canOpen = secure && typeof win.showOpenFilePicker === 'function';
  const canSave = secure && typeof win.showSaveFilePicker === 'function';
  const openedFiles = new WeakMap();
  let active = null, busy = false, generation = 0;
  const run = action => {
    if (busy) return Promise.resolve({ status: 'busy', message: 'Finish the current device file operation first.' });
    busy = true;
    // Start now, before any promise continuation, to preserve the initiating user gesture.
    let pending;
    try { pending = action(); } catch (error) { pending = Promise.reject(error); }
    return Promise.resolve(pending).catch(resultError).finally(() => { busy = false; });
  };
  const current = snapshot => {
    let revision;
    try { revision = getDocument().revision; } catch { revision = undefined; }
    return { revision: snapshot.revision, currentRevision: revision, changedSinceSnapshot: snapshot.revision !== revision };
  };
  const open = () => {
    if (!canOpen) return Promise.resolve({ status: 'unsupported', message: 'Direct device opening needs a secure browser with the File System Access API. Use Open to choose a file instead.' });
    return run(async () => {
      const selected = await win.showOpenFilePicker({ multiple: false, excludeAcceptAllOption: true, types: [
        { description: 'Jot and plain-text journals', accept: { 'text/plain': ['.jot', '.md', '.txt'], 'application/zip': ['.jotz'] } }
      ] });
      if (!selected?.[0]) return { status: 'cancelled' };
      const handle = selected[0], file = await handle.getFile(), bytes = await fileBytes(file);
      const result = { status: 'opened', file, handle, bytes: bytes.slice(), packaged: signature(bytes) };
      openedFiles.set(result, { handle, bytes, packaged: result.packaged });
      return result;
    });
  };
  const adopt = opened => {
    if (busy) return { status: 'busy' };
    const selected = openedFiles.get(opened);
    if (!selected) return { status: 'error', message: 'Choose and load a device file before connecting it.' };
    generation++; active = selected;
    return { status: 'connected', name: active.handle.name, packaged: active.packaged };
  };
  const detach = () => { generation++; active = null; };
  const save = ({ saveAs = false } = {}) => {
    if (!canSave) return Promise.resolve({ status: 'unsupported', message: 'Direct device saving needs a secure browser with the File System Access API. Download .jot keeps a file instead.' });
    return run(async () => {
      const snapshot = structuredClone(getDocument());
      if (typeof snapshot.packaged !== 'boolean') throw new Error('The journal snapshot must declare whether it contains a .jotz package.');
      const atGeneration = generation, previous = active, extension = snapshot.packaged ? '.jotz' : '.jot';
      const choose = saveAs || !previous || previous.packaged !== snapshot.packaged || !previous.handle.name.toLowerCase().endsWith(extension);
      let target, baseline;
      if (choose) {
        // Start the picker before serialization, since serialization can outlast user activation.
        target = await win.showSaveFilePicker({ suggestedName: deviceFileName(snapshot.name, snapshot.packaged), excludeAcceptAllOption: true, types: types(snapshot.packaged) });
        if (!target) return { status: 'cancelled' };
        if (!target.name.toLowerCase().endsWith(extension)) return { status: 'needs-save-as', message: 'Choose a filename ending in ' + extension + ' so its extension matches the saved writing.' };
        const same = previous && (target === previous.handle || typeof target.isSameEntry === 'function' && await target.isSameEntry(previous.handle));
        baseline = same ? previous.bytes : await fileBytes(await target.getFile());
      } else {
        target = previous.handle; baseline = previous.bytes;
        // Call requestPermission in this gesture, rather than after packing attachments.
        if (typeof target.requestPermission !== 'function' || await target.requestPermission({ mode: 'readwrite' }) !== 'granted') return { status: 'denied', message: 'Device write permission was not granted. Your writing is still in the editor.' };
      }
      if (generation !== atGeneration) return { status: 'stale', message: 'The active journal changed. Save the current journal again.' };
      const bytes = await outputBytes(await serialize(snapshot));
      if (signature(bytes) !== snapshot.packaged) return { status: 'error', message: 'The saved file bytes do not match the chosen .jot or .jotz format.' };
      if (generation !== atGeneration) return { status: 'stale', message: 'The active journal changed. Save the current journal again.' };
      const conflict = () => ({ status: 'conflict', message: 'This device file changed outside the editor. Open it to review those changes, or use Save as for a separate copy.', name: target.name });
      if (!equalFileBytes(await fileBytes(await target.getFile()), baseline)) return conflict();
      let writable;
      try {
        writable = await target.createWritable({ mode: 'exclusive' });
        if (generation !== atGeneration) { await writable.abort(); return { status: 'stale', message: 'The active journal changed before saving.' }; }
        await writable.write(bytes);
        // Chromium buffers this write until close. Recheck the original before committing.
        if (!equalFileBytes(await fileBytes(await target.getFile()), baseline)) { await writable.abort(); return conflict(); }
        if (generation !== atGeneration) { await writable.abort(); return { status: 'stale', message: 'The active journal changed before saving.' }; }
        await writable.close();
      } catch (error) {
        try { await writable?.abort(); } catch { /* Failed writes leave the previous baseline connected. */ }
        throw error;
      }
      const documentChanged = generation !== atGeneration, revisions = current(snapshot);
      if (!documentChanged) active = { handle: target, bytes, packaged: snapshot.packaged };
      return { status: 'saved', name: target.name, packaged: snapshot.packaged, ...revisions, documentChanged, changedSinceSnapshot: documentChanged || revisions.changedSinceSnapshot };
    });
  };
  return {
    supported: canOpen && canSave, canOpen, canSave, open, adopt, save, detach,
    get state() { return Object.freeze({ connected: !!active, name: active?.handle.name || '', packaged: active?.packaged ?? null, busy }); }
  };
}
