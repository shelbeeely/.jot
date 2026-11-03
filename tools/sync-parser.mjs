// Canonical portable parser/archive implementation and its locally vendored runtime.
import fs from 'node:fs';import path from 'node:path';
const source=new URL('../parser/',import.meta.url),target=new URL('../site/dist/jot/',import.meta.url),check=process.argv.includes('--check'),stale=[];
function copy(relative){const from=new URL(relative,source),to=new URL(relative,target);if(check){if(!fs.existsSync(to)||!fs.readFileSync(from).equals(fs.readFileSync(to)))stale.push(relative);}else{fs.mkdirSync(path.dirname(to.pathname),{recursive:true});fs.copyFileSync(from,to);}}
for(const e of fs.readdirSync(source,{withFileTypes:true}))if(e.isFile()&&e.name.endsWith('.mjs')&&!e.name.endsWith('-test.mjs')&&e.name!=='test.mjs')copy(e.name);
function walk(folder){for(const e of fs.readdirSync(new URL(folder,source),{withFileTypes:true})){if(e.isDirectory())walk(folder+e.name+'/');else copy(folder+e.name);}}walk('vendor/');walk('fonts/');
if(stale.length)throw Error('Parser copies are stale: '+stale.join(', '));console.log(check?'Parser/archive copies: current':'Parser/archive copies synchronized');
