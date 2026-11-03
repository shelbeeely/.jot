// Read untrusted provider JSON without allocating an unbounded response body.
export async function sourceJSON(response, limit = 262144) {
  if (Number(response.headers.get('content-length')) > limit) throw Error('The source response is too large. Choose fewer entities or a shorter interval.');
  const reader = response.body?.getReader();
  if (!reader) throw Error('The browser could not read the source response.');
  let size = 0; const chunks = [];
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw Error('The source response is too large. Choose fewer entities or a shorter interval.'); chunks.push(value); }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch { throw Error('The source returned invalid JSON. Nothing was added.'); }
}
