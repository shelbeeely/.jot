/** Optional English writing hints, separate from Jot syntax diagnostics. */
export function proofread(ast,{grammar=true,dictionary=null,language='en'}={}){
 if(!ast||typeof ast.source!=='string')throw new TypeError('Expected a Jot AST');
 if(!/^en(?:-|$)/i.test(language))return [];
 const encoder=new TextEncoder(),hints=[];
 const add=(node,index,text,rule,message,suggestion)=>hints.push({kind:'writing-hint',rule,message,text,suggestion,start:node.start+encoder.encode(node.raw.slice(0,index)).length,end:node.start+encoder.encode(node.raw.slice(0,index+text.length)).length});
 // Deliberately restrict checks to prose paragraphs. Do not inspect code,
 // record properties, measurements, links, identifiers or journal headings.
 for(const n of ast.nodes){if(n.type!=='paragraph')continue;const text=n.raw;
  if(grammar){for(const m of text.matchAll(/\b([A-Za-z]+)([ \t]+)\1\b/gi))add(n,m.index,m[0],'repeated-word','Possible repeated word; repetition may be intentional.',m[1]);
   for(const m of text.matchAll(/[ \t]+([,;!?])/g))add(n,m.index,m[0],'space-before-punctuation','Consider removing the space before this punctuation.',m[1]);
   for(const m of text.matchAll(/([A-Za-z]),([A-Za-z])/g))add(n,m.index+1,',','comma-spacing','Consider adding a space after this comma.',', ');
  }
  if(dictionary){if(!(dictionary instanceof Set))throw new TypeError('dictionary must be a Set of lowercase words');
   // Proper-name capitalization and Markdown/code/link spans are excluded.
   const hidden=[...text.matchAll(/`[^`]*`|\[[^\]]*\]\([^)]*\)|https?:\/\/\S+|@[\w-]+|#[\w-]+/g)].map(m=>[m.index,m.index+m[0].length]);
   for(const m of text.matchAll(/\b[a-z][a-z']{2,}\b/g)){if(hidden.some(([a,b])=>m.index>=a&&m.index<b))continue;if(!dictionary.has(m[0].toLowerCase()))add(n,m.index,m[0],'dictionary-miss','Not in your supplied word list; it may be a name, dialect or valid word.',null);}
  }
 }return hints;
}
export default proofread;
