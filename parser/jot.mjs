/** Jot JavaScript parser, draft 0.1. Source-preserving block parser + Marked 17.0.5. */
import { lexer } from './vendor/marked.mjs';
const enc=new TextEncoder();
const bytes=s=>enc.encode(s).length;
const RECORD=/^:::record ([a-z][a-z0-9-]*)(?: #([A-Za-z0-9][A-Za-z0-9._-]{0,127}))?$/;
const directive=/^@([a-z][a-z0-9-]*):\s*(.*)$/;
const task=/^\[([ x><!\-])\] (.+)$/;
const simple=/^(o|\?|!|=|::voice) (.+)$/;
const name=/^[a-z][a-z0-9-]*$/;
const day=/^(\d{4}-\d{2}-\d{2})(?:\s*\|.*)?$/;
const builtinDiagrams={mermaid:'mermaid',dot:'graphviz',graphviz:'graphviz',plantuml:'plantuml',puml:'plantuml',d2:'d2',vega:'vega','vega-lite':'vega-lite',vegalite:'vega-lite'};
function linesOf(s){const ls=[];let start=0,offset=0;for(const m of s.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/g)){if(!m[0])continue;const raw=m[0],text=raw.replace(/(?:\r\n|\n|\r)$/,'');ls.push({raw,text,start:offset});start+=raw.length;offset+=bytes(raw);}return ls;}
function validDate(s){const [y,m,d]=s.split('-').map(Number);if(m<1||m>12||d<1)return false;const leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];return d<=days[m-1];}

/**
 * parse(text, {journal:true}) -> source-preserving AST.
 * journal:false parses plain Markdown without Jot extensions.
 * Raw HTML tokens are data; this package never renders/evaluates HTML.
 */
export function parse(source,{journal=true,diagramLanguages={}}={}){
 if(typeof source!=='string')throw new TypeError('Jot.parse expects a string');
 const ast={format:'jot',version:'1.0',source,metadata:[],nodes:[],diagnostics:[],entries:[]};
 const lines=linesOf(source);let i=0,pending=[],pendingStart=0;
 const diag=(code,message,line,severity='warning')=>ast.diagnostics.push({severity,code,message,start:line.start,end:line.start+bytes(line.raw)});
 const node=(type,raw,start,extra={})=>{const n={type,raw,start,end:start+bytes(raw),...extra};ast.nodes.push(n);return n;};
 function markdown(raw,start){
  let offset=start;
  // Marked normalizes CRLF in token.raw. Recover original slices using a
  // normalized-to-source character boundary map, then compute UTF-8 spans.
  const normalized=raw.replace(/\r\n|\r/g,'\n'),map=[0];let k=0;
  while(k<raw.length){if(raw[k]==='\r'&&raw[k+1]==='\n')k+=2;else k++;map.push(k);}
  const tokens=lexer(normalized,{gfm:true,breaks:false});let pos=0;
  for(const token of tokens){const end=pos+token.raw.length,original=raw.slice(map[pos],map[end]);const extra={markdown:token};
   if(token.type==='code'){
    const language=(token.lang||'').trim().split(/\s+/)[0].toLowerCase(),engine={...builtinDiagrams,...diagramLanguages}[language];
    if(engine){extra.diagram={engine,language,source:token.text};if(engine==='vega'||engine==='vega-lite'){try{const value=JSON.parse(token.text);if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Expected object');extra.diagram.config=value;}catch{ast.diagnostics.push({severity:'warning',code:'invalid-diagram-json',message:'Chart block must contain a JSON object; source retained.',start:offset,end:offset+bytes(original)});}}}
   }
   if(token.type==='heading'){extra.level=token.depth;extra.text=token.text;const match=day.exec(token.text);if(match){if(validDate(match[1]))extra.date=match[1];else ast.diagnostics.push({severity:'warning',code:'invalid-date',message:'Invalid Gregorian entry date.',start:offset,end:offset+bytes(original)});}}
   else if(token.type==='paragraph')extra.text=token.text;
   node(token.type==='space'?'blank':token.type,original,offset,extra);offset+=bytes(original);pos=end;
  }
  // Preserve any source not consumed by the Markdown lexer, including BOMs.
  const used=map[pos]||0;if(used<raw.length)node('raw',raw.slice(used),offset);
 }
 const flush=()=>{if(pending.length){markdown(pending.join(''),pendingStart);pending=[];}};
 const append=l=>{if(!pending.length)pendingStart=l.start;pending.push(l.raw);};
 if(journal&&lines[0]&&lines[0].text.replace(/^\uFEFF/,'')==='---'){
  const end=lines.findIndex((l,j)=>j>0&&l.text==='---');
  if(end>0){for(let j=1;j<end;j++){const l=lines[j];if(!l.text.trim())continue;const m=/^([A-Za-z][A-Za-z0-9 -]*):\s*(.*)$/.exec(l.text);if(m)ast.metadata.push({name:m[1].trim(),value:m[2].trim()});else diag('invalid-metadata','Expected Key: value in metadata.',l);}
   ast.metadataRange={start:0,end:lines[end].start+bytes(lines[end].raw)};i=end+1;
  }else diag('unclosed-metadata','An unclosed metadata block is retained as Markdown.',lines[0]);
 }
 while(i<lines.length){const l=lines[i],t=l.text;
  // Standard Markdown fenced code takes priority over journal extensions.
  const fence=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(t);
  if(fence){append(l);const marker=fence[1][0],count=fence[1].length;i++;let closed=false;while(i<lines.length){const x=lines[i++];append(x);if(new RegExp('^ {0,3}'+marker+'{'+count+',}\\s*$').test(x.text)){closed=true;break;}}if(!closed)diag('unclosed-fence','Code fence is unclosed; original text is preserved.',l);continue;}
  if(!journal){append(l);i++;continue;}
  // Markdown-indented code is never interpreted as a journal command.
  if(/^( {4}|\t)/.test(t)){append(l);i++;continue;}
  const record=RECORD.exec(t);
  if(record){flush();let raw=l.raw;const fields=[],unparsed=[];i++;let closed=false;
   while(i<lines.length){const f=lines[i];raw+=f.raw;i++;if(f.text===':::'){closed=true;break;}if(!f.text.trim())continue;
    const m=/^([a-z][a-z0-9-]*):[ \t]*(.*)$/.exec(f.text);
    if(!m){unparsed.push(f.text);diag('invalid-field','Record fields use lowercase-name: value.',f);continue;}
    let value=m[2].trim();if(value==='|'){const parts=[];while(i<lines.length&&lines[i].text.startsWith('  ')){parts.push(lines[i].text.slice(2));raw+=lines[i].raw;i++;}value=parts.join('\n');}fields.push({name:m[1],value});
   }
   node('record',raw,l.start,{recordType:record[1],...(record[2]?{id:record[2]}:{}),fields,unparsed});if(!closed)diag('unclosed-record','Record consumes through end of file. Add ::: to close it.',l,'error');continue;
  }
  if(t==='/*'){flush();let raw=l.raw;i++;let closed=false;while(i<lines.length){const x=lines[i++];raw+=x.raw;if(x.text==='*/'){closed=true;break;}}node('comment',raw,l.start);if(!closed)diag('unclosed-comment','Hidden comment is unclosed.',l);continue;}
  const d=directive.exec(t);if(d){flush();node('directive',l.raw,l.start,{name:d[1],value:d[2]});i++;continue;}
  const a=task.exec(t),s=simple.exec(t);
  if(a||s){flush();let raw=l.raw,text=(a||s)[2];i++;while(i<lines.length&&lines[i].text.startsWith('  ')){raw+=lines[i].raw;text+='\n'+lines[i].text.slice(2);i++;}
   if(a){const status={' ':'open',x:'completed','>':'migrated','<':'scheduled','-':'cancelled','!':'open'}[a[1]];node('task',raw,l.start,{text,status,priority:a[1]==='!'?'high':'normal',inline:lexer(text,{gfm:true})});}
   else node({'o':'event','?':'question','!':'idea','=':'synopsis','::voice':'voice'}[s[1]],raw,l.start,{text});continue;
  }
  if(t.startsWith('.')&&/^\.\S/.test(t)){flush();node('scene',l.raw,l.start,{text:t.slice(1)});i++;continue;}
  if(t.startsWith('[[')&&t.endsWith(']]')){flush();node('annotation',l.raw,l.start,{text:t.slice(2,-2)});i++;continue;}
  // A standalone === is a Jot page break only after an empty line/start;
  // beneath text it remains a Markdown setext heading underline.
  if(t==='==='&&(i===0||!lines[i-1].text.trim())){flush();node('pagebreak',l.raw,l.start);i++;continue;}
  append(l);i++;
 }
 flush();
 const ids=new Map();for(const n of ast.nodes)if(n.id){if(ids.has(n.id))ast.diagnostics.push({severity:'error',code:'duplicate-id',message:'Record ID occurs more than once: '+n.id,start:n.start,end:n.end});else ids.set(n.id,n);}
 let entry=null;for(let j=0;j<ast.nodes.length;j++){const n=ast.nodes[j];if(n.date){if(entry)entry.endNode=j;entry={date:n.date,heading:n.text,startNode:j,endNode:ast.nodes.length};ast.entries.push(entry);}}
 return ast;
}
/** Exact round trip. This does not serialize mutations to derived nodes. */
export function stringify(ast){if(!ast||typeof ast.source!=='string')throw new TypeError('Expected a Jot AST with original source');return ast.source;}
export const markdownEngine={name:'Marked',version:'17.0.5',dialect:'GFM'};
export default {parse,stringify,markdownEngine};
