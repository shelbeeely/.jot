// One small primary menu; occasional tasks live under Tools. Existing tool URLs remain valid.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
export function siteNavigation(prefix,section='',sectionPage=true){
  return '<nav aria-label="Jot tools">'+[['write','Write'],['tools','Tools'],['guide','Guides']].map(([route,label])=>`<a href="${prefix}${route}/"${route===section?` aria-current="${sectionPage?'page':'location'}"`:''}>${label}</a>`).join('')+'</nav>';
}
export const navigationStyles=prefix=>`<link rel="stylesheet" href="${prefix}navigation.css">`;
const pages=[['index.html','./',''],['write/index.html','../','write'],['tools/index.html','../','tools'],['editor/index.html','../','tools',false],['convert/index.html','../','tools',false],['import/index.html','../','tools',false],['fonts/index.html','../','tools',false]];
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const check=process.argv.includes('--check'),root=new URL('../site/dist/',import.meta.url),stale=[];
  for(const [name,prefix,section,sectionPage]of pages){const file=new URL(name,root),source=fs.readFileSync(file,'utf8');let output=source.replace(/<nav aria-label="(?:Jot tools|Workspace)">[\s\S]*?<\/nav>/,siteNavigation(prefix,section,sectionPage));
    if(output===source&&!source.includes(siteNavigation(prefix,section,sectionPage)))throw Error('Missing site navigation: '+name);
    if(name==='write/index.html'&&!output.includes('id="roadmapBtn"'))output=output.replace('</nav>','</nav><button id="roadmapBtn" type="button" hidden>Roadmap</button>');
    if(!output.includes(navigationStyles(prefix)))output=output.replace('</head>',navigationStyles(prefix)+'</head>');
    if(check){if(source!==output)stale.push(name);}else fs.writeFileSync(file,output);
  }
  if(stale.length)throw Error('Site navigation is stale: '+stale.join(', '));
  console.log(check?'Site navigation: current':'Site navigation: synchronized');
}
