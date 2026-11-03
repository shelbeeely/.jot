// A portable public-only index. No OPFS, filesystem database, journal or WAL is used.
import { LIMITS } from './archive-common.mjs';
import { parse } from './jot.mjs';
const indexText=source=>source.replace(/^\uFEFF/,'').replace(/\0/g,'\uFFFD');
let opening;
export function sqliteRuntime() {
  return opening ||= (async () => {
    const node = typeof process !== 'undefined' && process.versions?.node;
    const { default: init } = await import(node ? './vendor/sqlite/node.mjs' : './vendor/sqlite/browser.mjs');
    return init({ print: () => {}, printErr: () => {} });
  })().catch(error => { opening = null; throw error; });
}
const SCHEMA = [
  'CREATE TABLE meta (version INTEGER NOT NULL, generation TEXT NOT NULL)',
  'CREATE TABLE entries (id TEXT PRIMARY KEY, date TEXT, timezone TEXT, hash TEXT NOT NULL)',
  'CREATE TABLE tags (entry_id TEXT NOT NULL, tag TEXT NOT NULL)',
  'CREATE INDEX tag_lookup ON tags(tag)',
  'CREATE TABLE measurements (entry_id TEXT NOT NULL, metric TEXT NOT NULL, value REAL, unit TEXT)',
  'CREATE INDEX metric_lookup ON measurements(metric,value)',
  "CREATE VIRTUAL TABLE entry_text USING fts5(entry_id UNINDEXED, body, tokenize='unicode61')"
];
export async function buildIndex(entries, generation) {
  const sqlite = await sqliteRuntime(), db = new sqlite.oo1.DB(':memory:', 'c');
  try {
    db.exec('PRAGMA journal_mode=MEMORY; PRAGMA temp_store=MEMORY;');
    for (const sql of SCHEMA) db.exec(sql);
    db.exec({ sql: 'INSERT INTO meta VALUES (1,?)', bind: [generation] });
    db.exec('BEGIN');
    for (const entry of entries.filter(e => !e.private)) {
      db.exec({ sql: 'INSERT INTO entries VALUES (?,?,?,?)', bind: [entry.id, entry.date || null, entry.timezone || null, entry.hash] });
      db.exec({ sql: 'INSERT INTO entry_text VALUES (?,?)', bind: [entry.id, indexText(entry.source)] });
      for (const tag of new Set(entry.source.match(/#[\p{L}\p{N}_-]+/gu) || [])) db.exec({ sql: 'INSERT INTO tags VALUES (?,?)', bind: [entry.id, tag.slice(1)] });
      for (const node of parse(entry.source).nodes.filter(n => n.type === 'record' && n.recordType === 'measurement')) {
        const fields = Object.fromEntries(node.fields.map(f => [f.name, f.value]));
        const value = fields.missing!=='true' && fields.value !== undefined && fields.value !== '' ? Number(fields.value) : null;
        db.exec({ sql: 'INSERT INTO measurements VALUES (?,?,?,?)', bind: [entry.id, String(fields.metric || ''), Number.isFinite(value) ? value : null, fields.unit || null] });
      }
    }
    db.exec('COMMIT');
    const bytes = sqlite.capi.sqlite3_js_db_export(db.pointer);
    if (bytes.length > LIMITS.indexBytes) throw Error('The public search index exceeds 16 MiB.');
    return bytes;
  } finally { db.close(); }
}
export async function openIndex(bytes, entries, generation) {
  if (!(bytes instanceof Uint8Array) || bytes.length > LIMITS.indexBytes || new TextDecoder().decode(bytes.subarray(0,16)) !== 'SQLite format 3\0') throw Error('Invalid public search index.');
  const sqlite = await sqliteRuntime(), db = new sqlite.oo1.DB(':memory:', 'c'); let owned = 0;
  try {
    const pointer = sqlite.wasm.allocFromTypedArray(bytes); owned = pointer;
    const rc = sqlite.capi.sqlite3_deserialize(db.pointer, 'main', pointer, BigInt(bytes.length), BigInt(bytes.length), 1 | 4);
    if (rc) throw Error('Could not read the public search index.'); owned = 0;
    db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON; PRAGMA temp_store=MEMORY;');
    const schema = db.selectArrays("SELECT sql FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT LIKE 'entry_text_%' ORDER BY sql").flat();
    if (JSON.stringify(schema) !== JSON.stringify([...SCHEMA].sort())) throw Error('Unexpected index schema.');
    // Shadow tables are permitted only with the exact SQLite-generated FTS5 schema.
    const trusted = new sqlite.oo1.DB(':memory:','c'); let expected;
    try { for(const sql of SCHEMA)trusted.exec(sql);expected=trusted.selectArrays('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY name'); } finally { trusted.close(); }
    if(JSON.stringify(db.selectArrays('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY name'))!==JSON.stringify(expected))throw Error('Unexpected FTS index schema.');
    if (JSON.stringify(db.selectArrays('SELECT version,generation FROM meta')) !== JSON.stringify([[1,generation]])) throw Error('Stale public search index.');
    const publicEntries = entries.filter(e=>!e.private), byId = new Map(publicEntries.map(e=>[e.id,e]));
    const rows=db.selectArrays('SELECT id,date,timezone,hash FROM entries');
    if(rows.length!==byId.size||rows.some(([id,date,zone,hash])=>!byId.has(id)||hash!==byId.get(id).hash||date!==(byId.get(id).date||null)||zone!==(byId.get(id).timezone||null)))throw Error('Stale index entries.');
    const bodies=db.selectArrays('SELECT entry_id,body FROM entry_text');
    if(bodies.length!==byId.size||new Set(bodies.map(r=>r[0])).size!==byId.size||bodies.some(([id,body])=>!byId.has(id)||indexText(byId.get(id).source)!==body))throw Error('Stale index text.');
    return {
      search({ query='', tag='', from='', to='', metric='', min=null, max=null }={}) {
        if([query,tag,from,to,metric].some(v=>typeof v!=='string'||v.length>300))throw Error('Use bounded search terms.');
        let sql='SELECT id FROM entries WHERE 1=1';const bind=[];
        if(query.trim()){sql+=' AND id IN (SELECT entry_id FROM entry_text WHERE entry_text MATCH ?)';bind.push('"'+query.trim().replace(/"/g,'""')+'"');}
        if(tag){sql+=' AND id IN (SELECT entry_id FROM tags WHERE tag=?)';bind.push(tag.replace(/^#/,''));}
        if(from){sql+=' AND date>=?';bind.push(from);}if(to){sql+=' AND date<=?';bind.push(to);}
        if(metric){sql+=' AND id IN (SELECT entry_id FROM measurements WHERE metric=?';bind.push(metric);if(min!==null){if(!Number.isFinite(min))throw Error('Invalid lower bound.');sql+=' AND value>=?';bind.push(min);}if(max!==null){if(!Number.isFinite(max))throw Error('Invalid upper bound.');sql+=' AND value<=?';bind.push(max);}sql+=')';}
        sql+=' LIMIT 100';return db.selectArrays(sql,bind).map(([id])=>byId.get(id));
      }, close:()=>db.close()
    };
  } catch(error) { if(owned)sqlite.wasm.dealloc(owned);db.close();throw error; }
}
