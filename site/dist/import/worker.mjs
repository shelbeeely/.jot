// The importer off the page's thread on the website (a Twitter archive can hold tens of thousands of posts): engine.mjs, behind
// messages. Files stay in this browser; nothing is sent anywhere. In: { id, …request }; out: { id, …result } (see engine.mjs).
import { makeEngine } from './engine.mjs';

const handle = makeEngine();
self.onmessage = async ({ data }) => self.postMessage({ id: data.id, ...(await handle(data)) });
