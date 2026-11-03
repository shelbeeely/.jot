// Builds the journal map's graph off the page's main thread, so a large journal does not freeze typing or scrolling.
// It receives the journal source in memory and returns the graph; nothing is stored or sent anywhere.
import { journalGraph } from './writer-map.mjs';
self.onmessage = ({ data }) => {
  try { self.postMessage({ id: data.id, graph: journalGraph(data.source) }); }
  catch (error) { self.postMessage({ id: data.id, error: error?.message || 'The map could not be built.' }); }
};
