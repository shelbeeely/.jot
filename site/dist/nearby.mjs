import { sha256 } from './jot/container.mjs';
import { enqueue, INBOX_LIMIT } from './inbox.mjs';
const CHUNK = 32768, LIFE = 10 * 60 * 1000;
const idOK = id => typeof id === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(id);
const privateAddress = address => {
  if (/^[a-zA-Z0-9.-]+\.local$/i.test(address)) return true;
  if (/^(?:fc|fd)[a-f\d]{2}:|^fe80:|^::1$/i.test(address)) return true;
  const n = address.split('.').map(Number);
  return n.length === 4 && n.every(x => Number.isInteger(x) && x >= 0 && x < 256) && (n[0] === 10 || n[0] === 127 || n[0] === 192 && n[1] === 168 || n[0] === 172 && n[1] >= 16 && n[1] <= 31 || n[0] === 169 && n[1] === 254);
};
export function validatePair(value, role, now = Date.now()) {
  if (!value || value.format !== 'jot-pair' || value.version !== 1 || value.role !== role || !idOK(value.session) || !Number.isFinite(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + LIFE + 5000 || value.description?.type !== role || typeof value.description.sdp !== 'string' || value.description.sdp.length > 32000) throw Error('This pairing invitation is invalid or expired.');
  const sdp = value.description.sdp;
  if (!/a=fingerprint:sha-256 /i.test(sdp) || !/a=ice-ufrag:/.test(sdp) || !/a=ice-pwd:/.test(sdp)) throw Error('Pairing information is incomplete.');
  for (const line of sdp.split(/\r?\n/).filter(line => line.startsWith('a=candidate:'))) {
    const fields = line.split(/\s+/);
    if (fields[7] !== 'host' || !privateAddress(fields[4])) throw Error('Nearby transfer accepts local host candidates only. Use the same Wi-Fi or hotspot.');
  }
  return value;
}
export class NearbySession {
  constructor(notify = () => {}) { this.notify = notify; this.closed = false; this.confirmed = false; this.peerConfirmed = false; this.transfer = null; this.outgoing = null; }
  announce(kind, message, extra = {}) { if (!this.closed) this.notify({ kind, message, ...extra }); }
  start() {
    if (this.pc) throw Error('Close the current pairing first.');
    this.pc = new RTCPeerConnection({ iceServers: [], iceCandidatePoolSize: 0 });
    this.pc.ondatachannel = event => this.bind(event.channel);
    this.pc.onconnectionstatechange = () => { if (['failed', 'disconnected'].includes(this.pc.connectionState)) this.fail('The local connection was interrupted. Your originals are unchanged.'); };
  }
  async gather() {
    // Only local (host) addresses are used, with no STUN or TURN. Some systems never report gathering as complete
    // (VPN or virtual adapters), so once a local address is known and gathering has been quiet briefly, use it.
    if (this.pc.iceGatheringState !== 'complete') await new Promise((resolve, reject) => {
      let found = 0, quiet = 0;
      const timer = setTimeout(() => { clean(); if (found) resolve(); else reject(Error('Local connection discovery timed out.')); }, 15000);
      const done = () => { clean(); resolve(); };
      const changed = () => { if (this.pc.iceGatheringState === 'complete') done(); };
      const candidate = event => { if (!event.candidate) return; found++; clearTimeout(quiet); quiet = setTimeout(done, 1500); };
      const clean = () => { clearTimeout(timer); clearTimeout(quiet); this.pc.removeEventListener('icegatheringstatechange', changed); this.pc.removeEventListener('icecandidate', candidate); };
      this.pc.addEventListener('icegatheringstatechange', changed); this.pc.addEventListener('icecandidate', candidate); changed();
      if (/\na=candidate:/.test(this.pc.localDescription?.sdp || '')) { found++; quiet = setTimeout(done, 1500); } // gathered before we listened
    });
    if (this.closed) throw Error('Pairing cancelled.');
    return this.pc.localDescription.toJSON();
  }
  expiry() { clearTimeout(this.lifetime); this.lifetime = setTimeout(() => this.fail('Pairing expired. Create a new invitation.'), Math.max(0, this.expiresAt - Date.now())); }
  async invite() {
    this.start(); this.session = crypto.randomUUID(); this.expiresAt = Date.now() + LIFE; this.expiry();
    this.bind(this.pc.createDataChannel('jot-transfer', { ordered: true }));
    await this.pc.setLocalDescription(await this.pc.createOffer());
    this.offer = validatePair({ format: 'jot-pair', version: 1, role: 'offer', session: this.session, expiresAt: this.expiresAt, description: await this.gather() }, 'offer');
    return this.offer;
  }
  async answer(value) {
    this.offer = validatePair(value, 'offer'); this.session = value.session; this.expiresAt = value.expiresAt; this.expiry(); this.start();
    await this.pc.setRemoteDescription(value.description); await this.pc.setLocalDescription(await this.pc.createAnswer());
    this.response = validatePair({ format: 'jot-pair', version: 1, role: 'answer', session: this.session, expiresAt: this.expiresAt, description: await this.gather() }, 'answer');
    return this.response;
  }
  async accept(value) {
    validatePair(value, 'answer');
    if (!this.offer || value.session !== this.session || value.expiresAt !== this.expiresAt) throw Error('This response belongs to a different invitation.');
    this.response = value; await this.pc.setRemoteDescription(value.description);
  }
  async comparison() {
    if (!this.offer || !this.response) throw Error('Finish exchanging both pairing codes.');
    const hash = await sha256(new TextEncoder().encode(JSON.stringify([this.session, this.offer.description.sdp, this.response.description.sdp])));
    return String(parseInt(hash.slice(0, 12), 16) % 1000000).padStart(6, '0');
  }
  bind(channel) {
    if (this.channel && this.channel !== channel) { channel.close(); return; }
    this.channel = channel; channel.binaryType = 'arraybuffer'; channel.bufferedAmountLowThreshold = 131072;
    channel.onopen = async () => { try { this.code = await this.comparison(); this.announce('paired', 'Compare this code on both devices: ' + this.code, { code: this.code }); } catch (e) { this.fail(e.message); } };
    channel.onmessage = event => { this.messages = (this.messages || Promise.resolve()).then(() => this.receive(event.data)).catch(error => this.fail(error.message)); };
    channel.onclose = () => { if (!this.closed) this.fail('The nearby session closed. Incomplete transfers were discarded.'); };
    channel.onerror = () => this.fail('The nearby connection failed.');
  }
  sendControl(value) { if (this.channel?.readyState !== 'open') throw Error('The other device is not connected.'); this.channel.send(JSON.stringify(value)); }
  confirm() { if (!this.code) throw Error('Wait for the comparison code.'); this.confirmed = true; this.sendControl({ type: 'confirm', code: this.code }); this.ready(); }
  ready() { if (this.confirmed && this.peerConfirmed) this.announce('ready', 'Both devices confirmed. Choose content and send.'); }
  async receive(data) {
    if (this.closed || Date.now() >= this.expiresAt) throw Error('Pairing expired.');
    if (data instanceof ArrayBuffer) {
      const current = this.transfer;
      if (!current || !data.byteLength || data.byteLength > CHUNK || current.received + data.byteLength > current.bytes) throw Error('Unexpected or oversized transfer data.');
      current.parts.push(data); current.received += data.byteLength; this.watchTransfer();
      this.announce('progress', `Receiving ${current.received} of ${current.bytes} bytes.`); return;
    }
    if (typeof data !== 'string' || data.length > 8192) throw Error('Invalid transfer message.');
    let value; try { value = JSON.parse(data); } catch { throw Error('Invalid transfer message.'); }
    if (value.type === 'confirm') { if (!this.code) this.code = await this.comparison(); if (value.code !== this.code) throw Error('The comparison codes do not match.'); this.peerConfirmed = true; this.ready(); return; }
    if (!this.confirmed || !this.peerConfirmed) throw Error('Confirm the matching code on both devices first.');
    if (value.type === 'manifest') {
      if (this.transfer || this.outgoing || !idOK(value.id) || !Number.isInteger(value.bytes) || value.bytes < 1 || value.bytes > INBOX_LIMIT || !/^[a-f\d]{64}$/.test(value.sha256) || typeof value.name !== 'string' || !value.name || value.name.length > 200 || /[\\/\x00-\x1f]/.test(value.name) || typeof value.mediaType !== 'string' || value.mediaType.length > 100) throw Error('The incoming transfer manifest is invalid or another transfer is active.');
      this.transfer = { ...value, received: 0, parts: [] }; this.watchTransfer(); return;
    }
    if (value.type === 'end') {
      const current = this.transfer;
      if (!current || value.id !== current.id || current.received !== current.bytes) throw Error('The incoming file is incomplete.');
      clearTimeout(this.transferTimer);
      const file = new File(current.parts, current.name, { type: current.mediaType });
      if (await sha256(await file.arrayBuffer()) !== current.sha256) throw Error('The incoming file failed its integrity check.');
      if (this.closed) return;
      await enqueue({ id: current.id, text: '', files: [file], origin: 'nearby' });
      if (this.closed) return;
      this.transfer = null; this.sendControl({ type: 'ack', id: current.id, sha256: current.sha256 });
      this.announce('received', 'Received into the local inbox. Review it before adding.', { id: current.id }); return;
    }
    if (value.type === 'ack') {
      const current = this.outgoing;
      if (!current || current.id !== value.id || current.sha256 !== value.sha256) throw Error('Unexpected receipt.');
      clearTimeout(this.ackTimer); this.outgoing = null; current.resolve(); this.announce('sent', 'Received into the other device’s inbox; it has not been merged into its journal.'); return;
    }
    if (value.type === 'cancel') { if (this.transfer?.id === value.id) { this.transfer = null; clearTimeout(this.transferTimer); this.announce('cancelled', 'The sender cancelled. No incomplete content was kept.'); } return; }
    throw Error('Unknown transfer message.');
  }
  watchTransfer() { clearTimeout(this.transferTimer); this.transferTimer = setTimeout(() => this.fail('The incoming transfer timed out.'), 60000); }
  async send(file, { id = crypto.randomUUID() } = {}) {
    if (!idOK(id)) throw Error('Invalid transfer ID.');
    if (!this.confirmed || !this.peerConfirmed || this.outgoing || this.transfer || !(file instanceof Blob) || !file.size || file.size > INBOX_LIMIT) throw Error('Confirm pairing and choose a file under 64 MiB; transfer one file at a time.');
    const bytes = await file.arrayBuffer();
    const manifest = { type: 'manifest', id, name: file.name, mediaType: file.type, bytes: bytes.byteLength, sha256: await sha256(bytes) };
    let resolve, reject; const receipt = new Promise((yes, no) => { resolve = yes; reject = no; }); receipt.catch(() => {});
    this.outgoing = { ...manifest, resolve, reject };
    try {
      this.sendControl(manifest);
      for (let from = 0; from < bytes.byteLength; from += CHUNK) {
        if (this.closed || !this.outgoing) throw Error('Transfer cancelled.');
        while (this.channel.bufferedAmount > 262144) await new Promise((yes, no) => {
          const timer = setTimeout(() => { cleanup(); no(Error('Transfer stalled.')); }, 10000);
          const low = () => { cleanup(); yes(); }, closed = () => { cleanup(); no(Error('Connection closed.')); };
          const cleanup = () => { clearTimeout(timer); this.channel.removeEventListener('bufferedamountlow', low); this.channel.removeEventListener('close', closed); };
          this.channel.addEventListener('bufferedamountlow', low, { once: true }); this.channel.addEventListener('close', closed, { once: true });
        });
        this.channel.send(bytes.slice(from, from + CHUNK)); this.announce('progress', `Sending ${Math.min(bytes.byteLength, from + CHUNK)} of ${bytes.byteLength} bytes.`);
      }
      this.sendControl({ type: 'end', id: manifest.id });
      this.ackTimer = setTimeout(() => this.fail('No verified receipt arrived. The original remains on this device.'), 60000);
      return await receipt;
    } catch (error) { this.cancel(); throw error; }
  }
  cancel() { if (this.outgoing) { try { this.sendControl({ type: 'cancel', id: this.outgoing.id }); } catch {} this.outgoing.reject(Error('Transfer cancelled.')); this.outgoing = null; } clearTimeout(this.ackTimer); }
  fail(message) { this.announce('error', message); this.close(); }
  close() { this.cancel(); this.closed = true; clearTimeout(this.lifetime); clearTimeout(this.transferTimer); this.transfer = null; this.channel?.close(); this.pc?.close(); }
}
