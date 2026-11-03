import fs from 'node:fs';
const root=new URL('../',import.meta.url),check=process.argv.includes('--check');
for(const [source,parserCopy,siteCopy]of [['specification/Jot-Container-v1.md','parser/CONTAINER.md','site/dist/docs/Jot-Container-v1.md'],['specification/Jot-Protection-v1.md','parser/LOCK.md','site/dist/docs/Jot-Protection-v1.md']]){
 const canonical=fs.readFileSync(new URL(source,root),'utf8');
 for(const target of [parserCopy,siteCopy]){const data=Buffer.from(target===parserCopy?canonical.replaceAll('Jot-Protection-v1.md','LOCK.md').replaceAll('Jot-Container-v1.md','CONTAINER.md'):canonical),out=new URL(target,root);if(check){if(!fs.existsSync(out)||!fs.readFileSync(out).equals(data))throw Error('Archive spec copy is stale: '+target);}else fs.writeFileSync(out,data);}
}
const archiveCases=JSON.parse(fs.readFileSync(new URL('specification/conformance.json',root),'utf8')).archiveCases;
const fixture=Buffer.from(JSON.stringify({format:'jot-archive-conformance',version:1,cases:archiveCases},null,2)+'\n'),fixturePath=new URL('parser/archive-conformance.json',root);
if(check){if(!fs.existsSync(fixturePath)||!fs.readFileSync(fixturePath).equals(fixture))throw Error('Archive conformance copy is stale.');}else fs.writeFileSync(fixturePath,fixture);
const security=fs.readFileSync(new URL('docs/security/README.md',root)),securityPath=new URL('site/dist/docs/security-testing.md',root);
if(check){if(!fs.existsSync(securityPath)||!fs.readFileSync(securityPath).equals(security))throw Error('Security verification guide copy is stale.');}else fs.writeFileSync(securityPath,security);
console.log('Archive specification copies: '+(check?'current':'synchronized'));
