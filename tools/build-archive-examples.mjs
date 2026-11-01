// Deterministic public Jotz v2 fixtures from readable source and public test assets. No legacy format reader is shipped.
import fs from 'node:fs';import {pack,reconcileEntries} from '../parser/container.mjs';
const root=new URL('../',import.meta.url),source=fs.readFileSync(new URL('examples/packaged-source.jot',root),'utf8');
const ids=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'];
const entries=reconcileEntries(source).map((entry,i)=>({...entry,id:ids[i]}));
const assets=fs.readdirSync(new URL('examples/packaged-assets/',root)).sort().map((name,i)=>({id:`20000000-0000-4000-8000-00000000000${i+1}`,path:'assets/'+name,mediaType:name.endsWith('.png')?'image/png':'application/json',data:new Uint8Array(fs.readFileSync(new URL('examples/packaged-assets/'+name,root)))}));
const bytes=await pack({source,entries,assets,id:'30000000-0000-4000-8000-000000000001',previous:{index:{id:'40000000-0000-4000-8000-000000000001'}}});
// ZIP member timestamps are normalized by the canonical writer.
const outputs=['specification/example.jotz','examples/packaged.jotz','site/dist/examples/packaged.jotz','site/dist/docs/example.jotz'];
for(const name of outputs){const file=new URL(name,root);if(process.argv.includes('--check')){if(!fs.readFileSync(file).equals(bytes))throw Error('Archive example is stale: '+name);}else fs.writeFileSync(file,bytes);}
console.log('Jotz v2 public examples: '+(process.argv.includes('--check')?'current':'written'));
