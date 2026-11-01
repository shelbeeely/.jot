import fs from 'node:fs';
const root=new URL('../',import.meta.url),check=process.argv.includes('--check');
for(const [source,parserCopy,siteCopy]of [['specification/Jot-Container-v2.md','parser/CONTAINER.md','site/dist/docs/Jot-Container-v2.md'],['specification/Jot-Protection-v2.md','parser/LOCK.md','site/dist/docs/Jot-Protection-v2.md']]){
 const canonical=fs.readFileSync(new URL(source,root),'utf8');
 for(const target of [parserCopy,siteCopy]){const data=Buffer.from(target===parserCopy?canonical.replaceAll('Jot-Protection-v2.md','LOCK.md').replaceAll('Jot-Container-v2.md','CONTAINER.md'):canonical),out=new URL(target,root);if(check){if(!fs.existsSync(out)||!fs.readFileSync(out).equals(data))throw Error('Archive spec copy is stale: '+target);}else fs.writeFileSync(out,data);}
}
console.log('Archive specification copies: '+(check?'current':'synchronized'));
