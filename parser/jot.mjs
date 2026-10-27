/** Jot JavaScript parser, draft 0.1. Source-preserving block parser + Marked 17.0.5. */
import { Marked } from './vendor/marked.mjs';
import { COLOR, isPaletteRecord } from './palette.mjs';

// Fuller formatting (spec 4.2.1), as Marked extensions: the tokens carry their text and children like Marked's own.
//   ==highlight==   ++underline++   ^superscript^   [^note] and [^note]: a footnote   -> a centred line <-
// > [!NOTE] (TIP, IMPORTANT, WARNING, CAUTION) on a blockquote's first line makes a callout (added after lexing, below).
// Each needs a non-space just inside its marks, so "a == b", "C++ and C++" and "2 ^ 3" stay prose.
const inlineMark = (name, ch) => { // a doubled mark: ==text==, ++text++
  const e = '\\' + ch, re = new RegExp(`^${e}${e}(?=\\S)([\\s\\S]*?\\S)${e}${e}(?!${e})`);
  return { name, level: 'inline', start: (src) => { const i = src.indexOf(ch + ch); return i < 0 ? undefined : i; },
    tokenizer(src) { const m = re.exec(src); if (m && !m[1].includes('\n\n')) return { type: name, raw: m[0], text: m[1], tokens: this.lexer.inlineTokens(m[1]) }; } };
};
// Readable inline presentation: [words]{ink=#rrggbb highlight=#rrggbb strike=#rrggbb underline=#rrggbb}.
// Balanced brackets allow Markdown links and nested color spans. Only allowlisted six-digit hex values reach CSS.
const colorSpan = { name: 'colorSpan', level: 'inline', start: (src) => {
  const i = src.indexOf('['); return i < 0 ? undefined : i;
}, tokenizer(src) {
  if (src[0] !== '[') return;
  let depth = 1, end = -1;
  for (let i = 1; i < src.length; i++) {
    if (src[i] === '\\') { if (src[i+1] === '\n') return; i++; continue; }
    if (src[i] === '\n') return; // selection formatting is inline, one source line
    if (src[i] === '`') {
      let count = 1; while (src[i+count] === '`') count++;
      const fence = '`'.repeat(count);
      let close = src.indexOf(fence, i+count);
      while (close >= 0 && (src[close-1] === '`' || src[close+count] === '`')) close = src.indexOf(fence, close+count);
      if (close >= 0) { if (src.slice(i, close).includes('\n')) return; i = close+count-1; continue; }
      i += count-1; continue;
    }
    if (src[i] === '[') depth++;
    if (src[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 2) return;
  const attrs = /^\{([^{}\n]+)\}/.exec(src.slice(end + 1));
  if (!attrs) return;
  const colors = {};
  for (const pair of attrs[1].split(' ')) {
    const [key, value, extra] = pair.split('=');
    if (extra !== undefined) return;
    if (colors[key]) return;
    if (key === 'highlight-style') { if (!['marker','brush','pencil'].includes(value)) return; }
    else if (!['ink','highlight','strike','underline'].includes(key) || !/^#[0-9a-fA-F]{6}$/.test(value)) return;
    colors[key] = value.toLowerCase();
  }
  const text = src.slice(1, end);
  return { type: 'colorSpan', raw: src.slice(0, end + 1 + attrs[0].length), text, colors, tokens: this.lexer.inlineTokens(text) };
} };
const EXTENSIONS = [
  colorSpan,
  inlineMark('mark', '='),
  inlineMark('ins', '+'),
  { name: 'sup', level: 'inline', start: (src) => { const i = src.indexOf('^'); return i < 0 ? undefined : i; },
    tokenizer(src) { const m = /^\^([^\s^\[\]]+)\^/.exec(src); if (m) return { type: 'sup', raw: m[0], text: m[1], tokens: this.lexer.inlineTokens(m[1]) }; } },
  { name: 'footnoteRef', level: 'inline', start: (src) => { const i = src.indexOf('[^'); return i < 0 ? undefined : i; },
    tokenizer(src) { const m = /^\[\^([A-Za-z0-9_-]{1,40})\](?!:)/.exec(src); if (m) return { type: 'footnoteRef', raw: m[0], id: m[1] }; } },
  { name: 'footnote', level: 'block', start: (src) => { const m = /(?:^|\n)\[\^[A-Za-z0-9_-]{1,40}\]:/.exec(src); return m ? m.index + (m[0][0] === '\n' ? 1 : 0) : undefined; },
    tokenizer(src) { const m = /^\[\^([A-Za-z0-9_-]{1,40})\]:[ \t]*([^\n]*(?:\n(?: {2,}|\t)[^\n]*)*)(?:\n|$)/.exec(src); if (m) { const text = m[2].replace(/\n(?: {2,}|\t)/g, '\n').trim(); return { type: 'footnote', raw: m[0], id: m[1], text, tokens: this.lexer.inlineTokens(text) }; } } },
  { name: 'center', level: 'block', start: (src) => { const m = /(?:^|\n)->/.exec(src); return m ? m.index + (m[0][0] === '\n' ? 1 : 0) : undefined; },
    tokenizer(src) { const m = /^->[ \t]+([^\n]*?\S)[ \t]+<-[ \t]*(?:\n|$)/.exec(src); if (m) return { type: 'center', raw: m[0], text: m[1], tokens: this.lexer.inlineTokens(m[1]) }; } },
];
const md = new Marked({ gfm: true, breaks: false, extensions: EXTENSIONS });
const lexer = (src) => md.lexer(src);
const ALERT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/i;
/** A blockquote whose first line is [!NOTE] (and so on) is a callout: { kind: 'note', ... } on the node; the marker leaves the tokens. */
function callout(token) {
  const first = token.tokens && token.tokens[0];
  if (!first || first.type !== 'paragraph') return null;
  const m = ALERT.exec(first.text); if (!m) return null;
  const rest = first.text.slice(m[0].length);
  if (rest.trim()) { first.text = rest; first.raw = rest; first.tokens = md.Lexer.lexInline ? md.Lexer.lexInline(rest, md.defaults) : lexer(rest)[0]?.tokens || []; } else token.tokens.shift();
  return m[1].toLowerCase();
}
const enc=new TextEncoder();
const bytes=s=>enc.encode(s).length;
const RECORD=/^:::record ([a-z][a-z0-9-]*)(?: #([A-Za-z0-9][A-Za-z0-9._-]{0,127}))?$/;
const directive=/^@([a-z][a-z0-9-]*):\s*(.*)$/;
const task=/^\[([ x><!\-])\] (.+)$/;
const simple=/^(o|\?|!|=|::voice) (.+)$/;
const day=/^(\d{4}-\d{2}-\d{2})(?:\s*\|.*)?$/;
const builtinDiagrams={mermaid:'mermaid',dot:'graphviz',graphviz:'graphviz',plantuml:'plantuml',puml:'plantuml',d2:'d2',vega:'vega','vega-lite':'vega-lite',vegalite:'vega-lite'};
function linesOf(s){const ls=[];let offset=0;for(const m of s.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/g)){if(!m[0])continue;const raw=m[0],text=raw.replace(/(?:\r\n|\n|\r)$/,'');ls.push({raw,text,start:offset});offset+=bytes(raw);}return ls;}
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
  const tokens=lexer(normalized);let pos=0;
  for(const token of tokens){const end=pos+token.raw.length,original=raw.slice(map[pos],map[end]);const extra={markdown:token};
   if(token.type==='code'){
    const language=(token.lang||'').trim().split(/\s+/)[0].toLowerCase(),engine={...builtinDiagrams,...diagramLanguages}[language];
    if(engine){extra.diagram={engine,language,source:token.text};if(engine==='vega'||engine==='vega-lite'){try{const value=JSON.parse(token.text);if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Expected object');extra.diagram.config=value;}catch{ast.diagnostics.push({severity:'warning',code:'invalid-diagram-json',message:'Chart block must contain a JSON object; source retained.',start:offset,end:offset+bytes(original)});}}}
   }
   if(token.type==='blockquote'){const kind=callout(token);if(kind)extra.callout=kind;}
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
  if(record){flush();let raw=l.raw;const fields=[],unparsed=[],colors=[];i++;let closed=false;
   while(i<lines.length){const f=lines[i];raw+=f.raw;i++;if(f.text===':::'){closed=true;break;}if(!f.text.trim())continue;
    const m=/^([a-z][a-z0-9-]*):[ \t]*(.*)$/.exec(f.text);
    if(!m){unparsed.push(f.text);diag('invalid-field','Record fields use lowercase-name: value.',f);continue;}
    let value=m[2].trim();if(value==='|'){const parts=[];while(i<lines.length&&lines[i].text.startsWith('  ')){parts.push(lines[i].text.slice(2));raw+=lines[i].raw;i++;}value=parts.join('\n');}fields.push({name:m[1],value});if(m[1]==='color')colors.push([value,f]);
   }
   // Palette colors (palette.mjs): #RRGGBB or #RGB, then a name. Kept as written either way; the preview shows a note.
   if(isPaletteRecord({type:'record',recordType:record[1],fields}))for(const [v,f] of colors)if(!COLOR.test(v))diag('invalid-color','Palette colors are written color: #RRGGBB name (or #RGB name).',f);
   node('record',raw,l.start,{recordType:record[1],...(record[2]?{id:record[2]}:{}),fields,unparsed});if(!closed)diag('unclosed-record','Record consumes through end of file. Add ::: to close it.',l,'error');continue;
  }
  if(t==='/*'){flush();let raw=l.raw;i++;let closed=false;while(i<lines.length){const x=lines[i++];raw+=x.raw;if(x.text==='*/'){closed=true;break;}}node('comment',raw,l.start);if(!closed)diag('unclosed-comment','Hidden comment is unclosed.',l);continue;}
  const d=directive.exec(t);if(d){flush();node('directive',l.raw,l.start,{name:d[1],value:d[2]});i++;continue;}
  const a=task.exec(t),s=simple.exec(t);
  if(a||s){flush();let raw=l.raw,text=(a||s)[2];i++;while(i<lines.length&&lines[i].text.startsWith('  ')){raw+=lines[i].raw;text+='\n'+lines[i].text.slice(2);i++;}
   if(a){const status={' ':'open',x:'completed','>':'migrated','<':'scheduled','-':'cancelled','!':'open'}[a[1]];node('task',raw,l.start,{text,status,priority:a[1]==='!'?'high':'normal',inline:lexer(text)});}
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
 const ids=new Map(),dupIds=new Set();for(const n of ast.nodes)if(n.id){if(ids.has(n.id)){dupIds.add(n.id);ast.diagnostics.push({severity:'error',code:'duplicate-id',message:'Record ID occurs more than once: '+n.id,start:n.start,end:n.end});}else ids.set(n.id,n);}
 let entry=null;for(let j=0;j<ast.nodes.length;j++){const n=ast.nodes[j];if(n.date){if(entry)entry.endNode=j;entry={date:n.date,heading:n.text,startNode:j,endNode:ast.nodes.length};ast.entries.push(entry);}}
 if(journal)links(ast,ids,dupIds);
 return ast;
}
// Links (spec 4.2.2). Targets: a record's unique #id, and a dated heading's date (its first heading; a record ID of the same name wins).
// [label](#id) anywhere in the writing (paragraphs, lists, tables, quotes, footnotes, tasks, events, questions, ideas, margin notes) and
// the link fields of records point at them. A missing or duplicated #id is an unresolved-reference warning; other.jot#id names another
// document and is never opened or checked here. ast.links lists every internal link; `to` is the target's node index when it resolves.
const LINK_FIELDS=new Set(['relation','member','source','parent','migrated-to','prompt']);
const INLINE_TEXT=new Set(['event','question','idea','synopsis','voice','annotation']);
const INTERNAL=/^(?:((?![a-z][a-z0-9+.-]*:)[^#\s]*\.jotz?))?#([^\s#]+)$/i; // #id or relative/path.jot#id
function linkTokens(t,out){if(!t||typeof t!=='object')return;if(Array.isArray(t)){for(const x of t)linkTokens(x,out);return;}if(t.type==='link')out.push({href:t.href||'',raw:t.raw||''});for(const k of ['tokens','items','header','rows'])if(t[k])linkTokens(t[k],out);}
function links(ast,ids,dupIds){
 const targets=new Map(),dupDates=new Set();
 ast.nodes.forEach((n,j)=>{if(n.type==='record'&&n.id&&!dupIds.has(n.id)){targets.set(n.id,j);n.anchor=n.id;}});
 ast.nodes.forEach((n,j)=>{if(!n.date)return;if(targets.has(n.date)){if(ast.nodes[targets.get(n.date)].date)dupDates.add(n.date);}else if(!ids.has(n.date)){targets.set(n.date,j);n.anchor=n.date;}});
 ast.links=[];
 ast.nodes.forEach((n,j)=>{
  const found=[];
  if(n.markdown)linkTokens(n.markdown,found);else if(n.type==='task')linkTokens(n.inline,found);else if(INLINE_TEXT.has(n.type)&&n.text.includes(']('))linkTokens(lexer(n.text),found);
  else if(n.type==='record')for(const f of n.fields)if(LINK_FIELDS.has(f.name)){const v=f.name==='relation'?(/^\S+\s+(\S+)$/.exec(f.value)||[])[1]:f.value;if(v&&INTERNAL.test(v))found.push({href:v,raw:v,field:f.name});}
  let at=0;
  for(const l of found){const m=INTERNAL.exec(l.href);if(!m)continue;
   const k=n.raw.indexOf(l.raw,l.field?n.raw.indexOf('\n'+l.field+':',at)+1:at),start=k<0?n.start:n.start+bytes(n.raw.slice(0,k)),end=k<0?n.end:start+bytes(l.raw);if(k>=0)at=k+l.raw.length;
   const link={href:l.href,target:m[2],start,end,node:j,...(l.field?{field:l.field}:{}),...(m[1]?{file:m[1]}:{})};ast.links.push(link);
   if(m[1])continue; // another document: kept as written, never fetched
   if(targets.has(m[2])){link.to=targets.get(m[2]);if(dupDates.has(m[2]))ast.diagnostics.push({severity:'warning',code:'ambiguous-reference',message:`Several headings have the date ${m[2]}; this link goes to the first.`,start,end});}
   else ast.diagnostics.push({severity:'warning',code:'unresolved-reference',message:dupIds.has(m[2])?`The ID ${m[2]} occurs more than once, so this link cannot choose one.`:`Nothing in this document has the ID or date ${m[2]}.`,start,end});
  }
 });
}
/** Exact round trip. This does not serialize mutations to derived nodes. */
export function stringify(ast){if(!ast||typeof ast.source!=='string')throw new TypeError('Expected a Jot AST with original source');return ast.source;}
export const markdownEngine={name:'Marked',version:'17.0.5',dialect:'GFM',extensions:['colorSpan','mark','ins','sup','footnote','footnoteRef','center','callout']};
export default {parse,stringify,markdownEngine};
