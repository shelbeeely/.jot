import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceFiles, deviceFileName, equalFileBytes, DEVICE_FILE_LIMIT } from './dist/device-files.mjs';

const encode = value => new TextEncoder().encode(value), decode = value => new TextDecoder().decode(value);
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
class DeviceHandle {
  constructor(name, source = '') { this.name = name; this.bytes = typeof source === 'string' ? encode(source) : source.slice(); this.events = []; this.permission = 'granted'; }
  async getFile() { const bytes = this.bytes.slice(); return { name: this.name, size: bytes.length, lastModified: 1, arrayBuffer: async () => bytes.buffer }; }
  async requestPermission(options) { this.events.push(['permission', options]); if (this.permissionError) throw this.permissionError; return this.permission; }
  async isSameEntry(handle) { return this === handle; }
  async createWritable(options) {
    this.events.push(['create', options]); let pending;
    return {
      write: async bytes => { this.events.push(['write']); pending = bytes.slice(); await this.onWrite?.(); if (this.writeError) throw this.writeError; },
      close: async () => { this.events.push(['close']); await this.onClose?.(); if (this.closeError) throw this.closeError; this.bytes = pending; },
      abort: async () => { this.events.push(['abort']); }
    };
  }
}
function setup({ original = new DeviceHandle('journal.jot', 'Original'), destination = new DeviceHandle('copy.jot'), source = 'New writing', serialize, secure = true } = {}) {
  let document = { revision: 1, name: 'My journal', packaged: false, source, assets: [] };
  const calls = [], win = {
    isSecureContext: secure,
    showOpenFilePicker: async options => { calls.push(['open', options]); return [original]; },
    showSaveFilePicker: async options => { calls.push(['save-as', options]); return destination; }
  };
  const files = createDeviceFiles({ window: win, getDocument: () => document, serialize: serialize || (snapshot => snapshot.source) });
  return { files, win, original, destination, calls, get document() { return document; }, set document(next) { document = next; } };
}
async function connect(context) { const opened = await context.files.open(); assert.equal(opened.status, 'opened'); assert.equal(context.files.adopt(opened).status, 'connected'); return opened; }

test('feature detection requires a secure context and never calls unavailable APIs', async () => {
  const context = setup({ secure: false });
  assert.equal(context.files.supported, false); assert.equal((await context.files.open()).status, 'unsupported'); assert.equal((await context.files.save()).status, 'unsupported'); assert.deepEqual(context.calls, []);
  const missing = createDeviceFiles({ window: { isSecureContext: true }, getDocument: () => ({}), serialize: () => '' });
  assert.equal(missing.canOpen, false); assert.equal(missing.canSave, false);
});

test('opening reads only and connects only after the parent validates and adopts it', async () => {
  const context = setup(), opened = await context.files.open();
  assert.equal(opened.status, 'opened'); assert.equal(opened.file.name, 'journal.jot'); assert.equal(decode(opened.bytes), 'Original');
  assert.equal(context.files.state.connected, false); assert.deepEqual(context.original.events, []);
  opened.bytes.fill(0); // An importer cannot corrupt the controller's original-byte baseline.
  assert.equal(context.files.adopt(opened).status, 'connected');
  assert.equal((await context.files.save()).status, 'saved'); assert.equal(decode(context.original.bytes), 'New writing');
  assert.equal(context.original.events[0][0], 'permission');
  assert.equal(context.original.events.filter(([name]) => name === 'create').length, 1);
});

test('Save as supplies format-specific names and types, and packaging never overwrites plain .jot', async () => {
  const zip = new Uint8Array([0x50, 0x4b, 3, 4, 9, 8]), destination = new DeviceHandle('My journal.jotz');
  const context = setup({ destination, serialize: () => zip }); await connect(context);
  context.document.packaged = true; context.document.assets.push({ name: 'drawing.svg' });
  const saved = await context.files.save();
  assert.equal(saved.status, 'saved'); assert.equal(saved.packaged, true); assert.equal(context.files.state.name, 'My journal.jotz');
  assert.equal(decode(context.original.bytes), 'Original'); assert.deepEqual(context.original.events, []);
  assert.deepEqual(destination.bytes, zip);
  const options = context.calls.find(([name]) => name === 'save-as')[1];
  assert.equal(options.suggestedName, 'My journal.jotz'); assert.equal(options.excludeAcceptAllOption, true); assert.deepEqual(options.types[0].accept, { 'application/zip': ['.jotz'] });
  assert.equal(deviceFileName('notes.md', false), 'notes.jot'); assert.equal(deviceFileName('bad/name.jotz', true), 'bad-name.jotz');
});

test('cancelled pickers and denied permission preserve the connection and all file bytes', async () => {
  const context = setup(); await connect(context);
  const abort = new DOMException('Cancelled', 'AbortError');
  context.win.showOpenFilePicker = async () => { throw abort; };
  assert.equal((await context.files.open()).status, 'cancelled'); assert.equal(context.files.state.name, 'journal.jot');
  context.win.showSaveFilePicker = async () => { throw abort; };
  assert.equal((await context.files.save({ saveAs: true })).status, 'cancelled'); assert.equal(context.files.state.name, 'journal.jot');
  context.original.permission = 'denied';
  assert.equal((await context.files.save()).status, 'denied'); assert.equal(decode(context.original.bytes), 'Original');
  assert.deepEqual(context.original.events.map(([name]) => name), ['permission']);
});

test('exact original bytes detect external changes even with identical size and modification time', async () => {
  const context = setup(); await connect(context); context.original.bytes = encode('External');
  const result = await context.files.save();
  assert.equal(result.status, 'conflict'); assert.equal(decode(context.original.bytes), 'External'); assert.deepEqual(context.original.events.map(([name]) => name), ['permission']);
  assert.equal(equalFileBytes(encode('same'), encode('same')), true); assert.equal(equalFileBytes(encode('same'), encode('size')), false);
});

test('an external change during a buffered write aborts before committing', async () => {
  const context = setup(); await connect(context);
  context.original.onWrite = () => { context.original.bytes = encode('Edited elsewhere'); };
  assert.equal((await context.files.save()).status, 'conflict'); assert.equal(decode(context.original.bytes), 'Edited elsewhere');
  assert.ok(context.original.events.some(([name]) => name === 'abort')); assert.ok(!context.original.events.some(([name]) => name === 'close'));
});

test('permission is requested during the initiating call, overlapping operations are rejected, and saved revisions describe the snapshot', async () => {
  const entered = deferred(), release = deferred();
  const context = setup({ serialize: async snapshot => { entered.resolve(); await release.promise; return snapshot.source + snapshot.assets.join(''); } });
  await connect(context); context.document.assets = [' initial asset'];
  const saving = context.files.save();
  assert.equal(context.original.events[0][0], 'permission', 'permission starts synchronously before awaited serialization');
  await entered.promise;
  assert.equal((await context.files.save()).status, 'busy'); assert.equal((await context.files.open()).status, 'busy');
  context.document.source = 'Later writing'; context.document.assets.push(' later asset'); context.document.revision = 2;
  release.resolve(); const result = await saving;
  assert.equal(decode(context.original.bytes), 'New writing initial asset', 'source and assets were captured before later edits');
  assert.equal(result.revision, 1); assert.equal(result.currentRevision, 2); assert.equal(result.changedSinceSnapshot, true); assert.equal(result.documentChanged, false);
  assert.equal(context.files.state.busy, false);
});

test('Save as starts its picker synchronously and snapshots are not committed to a different active journal', async () => {
  const entered = deferred(), release = deferred();
  const context = setup({ serialize: async snapshot => { entered.resolve(); await release.promise; return snapshot.source; } });
  const saving = context.files.save(); assert.equal(context.calls[0][0], 'save-as');
  await entered.promise; context.files.detach(); context.document = { revision: 2, name: 'Other journal', packaged: false, source: 'Other', assets: [] }; release.resolve();
  assert.equal((await saving).status, 'stale'); assert.equal(context.files.state.connected, false); assert.equal(context.destination.bytes.length, 0);
});

test('failed writes abort without marking bytes saved or switching the active handle', async () => {
  const context = setup(); await connect(context); context.original.closeError = new DOMException('Disk full', 'QuotaExceededError');
  const result = await context.files.save();
  assert.equal(result.status, 'error'); assert.match(result.message, /Disk full/); assert.equal(decode(context.original.bytes), 'Original'); assert.equal(context.files.state.name, 'journal.jot');
  assert.ok(context.original.events.some(([name]) => name === 'abort'));
  context.original.closeError = null; assert.equal((await context.files.save()).status, 'saved', 'the original baseline remains valid for retry');
});

test('a different journal opened while close commits is never reconnected or reported fully saved', async () => {
  const context = setup(); await connect(context);
  context.original.onClose = () => {
    context.files.detach();
    context.document = { revision: 7, name: 'Different journal', packaged: false, source: 'Keep this draft', assets: [] };
  };
  const result = await context.files.save();
  assert.equal(result.status, 'saved'); assert.equal(result.revision, 1); assert.equal(result.currentRevision, 7);
  assert.equal(result.documentChanged, true); assert.equal(result.changedSinceSnapshot, true);
  assert.equal(context.files.state.connected, false); assert.equal(context.document.source, 'Keep this draft');
  assert.equal(decode(context.original.bytes), 'New writing', 'the explicit earlier save may already have committed');
});

test('extension and serialization mismatches never create a writable file', async () => {
  const wrongExtension = setup({ destination: new DeviceHandle('package.jot'), serialize: () => new Uint8Array([0x50, 0x4b, 3, 4]) });
  wrongExtension.document.packaged = true;
  assert.equal((await wrongExtension.files.save()).status, 'needs-save-as'); assert.deepEqual(wrongExtension.destination.events, []);
  const wrongBytes = setup({ destination: new DeviceHandle('package.jotz') }); wrongBytes.document.packaged = true;
  assert.equal((await wrongBytes.files.save()).status, 'error'); assert.deepEqual(wrongBytes.destination.events, []);
  const oversized = setup(); oversized.original.getFile = async () => ({ name: 'too-big.jot', size: DEVICE_FILE_LIMIT + 1, arrayBuffer: async () => { throw Error('should not read'); } });
  assert.match((await oversized.files.open()).message, /64 MiB/); assert.equal(oversized.files.state.connected, false);
});
