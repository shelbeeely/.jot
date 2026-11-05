// Original, deterministic media for the fictional October demo. No downloads or provider requests.
// rain.webm is generated once from window.png with the command recorded in examples/demo-assets/README.md.
import fs from 'node:fs';
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fixedLayoutEPUB } from '../parser/epub.mjs';

const enc = new TextEncoder();
const WIDTH = 600, HEIGHT = 400;
const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(x => parseInt(x, 16));
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1;
  return n >>> 0;
});
function chunk(name, data) {
  const type = Buffer.from(name), bytes = Buffer.concat([type, data]); let crc = 0xffffffff;
  for (const b of bytes) crc = crcTable[(crc ^ b) & 255] ^ crc >>> 8;
  const length = Buffer.alloc(4), check = Buffer.alloc(4); length.writeUInt32BE(data.length); check.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, bytes, check]);
}
function png(pixels) {
  const header = Buffer.alloc(13); header.writeUInt32BE(WIDTH, 0); header.writeUInt32BE(HEIGHT, 4); header[8] = 8; header[9] = 2;
  const rows = Buffer.alloc((WIDTH * 3 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) pixels.copy(rows, y * (WIDTH * 3 + 1) + 1, y * WIDTH * 3, (y + 1) * WIDTH * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
function illustration() {
  const data = Buffer.alloc(WIDTH * HEIGHT * 3);
  const dot = (x, y, color) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return; data.set(color, (y * WIDTH + x) * 3); };
  const rect = (x, y, w, h, hex) => { const c = rgb(hex); for (let iy = y; iy < y + h; iy++) for (let ix = x; ix < x + w; ix++) dot(ix, iy, c); };
  const ellipse = (x, y, rx, ry, hex) => { const c = rgb(hex); for (let iy = Math.floor(y - ry); iy <= y + ry; iy++) for (let ix = Math.floor(x - rx); ix <= x + rx; ix++) if ((ix - x) ** 2 / rx ** 2 + (iy - y) ** 2 / ry ** 2 <= 1) dot(ix, iy, c); };
  const line = (x1, y1, x2, y2, width, hex) => { const c = rgb(hex), n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)); for (let i = 0; i <= n; i++) { const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n; for (let dy = -width; dy <= width; dy++) for (let dx = -width; dx <= width; dx++) if (dx * dx + dy * dy <= width * width) dot(x + dx, y + dy, c); } };
  rect(0, 0, 600, 400, '#e9ddc8'); rect(48, 27, 348, 242, '#8a6853'); rect(61, 40, 322, 214, '#aebdbe');
  rect(72, 55, 299, 184, '#bbc9c7'); rect(75, 184, 292, 54, '#879b82');
  for (let i = 0; i < 26; i++) line(82 + i * 11, 65 + i % 4 * 13, 75 + i * 11, 99 + i % 4 * 13, 1, '#dce7e4');
  rect(214, 42, 12, 214, '#8a6853'); rect(61, 143, 322, 10, '#8a6853'); rect(33, 257, 377, 17, '#b48c6a');
  rect(0, 298, 600, 102, '#a98261'); rect(0, 300, 600, 8, '#c29a77');
  ellipse(196, 355, 89, 15, '#8f6b50'); ellipse(196, 348, 79, 10, '#e3dac7');
  ellipse(239, 309, 27, 25, '#1d6470'); ellipse(239, 309, 16, 15, '#a98261');
  rect(145, 282, 91, 57, '#276e7b'); ellipse(190, 337, 45, 13, '#276e7b'); ellipse(190, 283, 46, 12, '#d3e4de'); ellipse(190, 284, 38, 8, '#8d6038');
  for (let i = 0; i < 3; i++) { line(174 + i * 17, 265, 166 + i * 17, 246, 2, '#f6eddd'); line(166 + i * 17, 246, 176 + i * 17, 228, 2, '#f6eddd'); }
  rect(335, 323, 146, 9, '#283c40'); rect(344, 307, 136, 17, '#ece7d5'); rect(334, 303, 147, 5, '#8c5947');
  rect(451, 265, 72, 39, '#ba7759'); ellipse(487, 265, 36, 9, '#d09570'); ellipse(487, 265, 27, 5, '#685749');
  line(486, 264, 473, 186, 3, '#60714a'); line(487, 253, 513, 205, 3, '#60714a');
  ellipse(467, 201, 21, 9, '#668760'); ellipse(488, 224, 18, 9, '#79965c'); ellipse(515, 209, 21, 9, '#50755b'); ellipse(475, 182, 16, 8, '#79965c');
  return { data, line, ellipse };
}

function rainSound() {
  const rate = 16000, samples = rate * 3, out = Buffer.alloc(44 + samples * 2);
  out.write('RIFF'); out.writeUInt32LE(out.length - 8, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(samples * 2, 40);
  let seed = 0x0c70be26, smooth = 0;
  for (let i = 0; i < samples; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const noise = seed / 0xffffffff * 2 - 1; smooth = smooth * .84 + noise * .16; const fade = Math.min(1, i / 800, (samples - i) / 800); out.writeInt16LE(Math.round(smooth * 9000 * fade), 44 + i * 2); }
  return out;
}

function gardenModel() {
  const pos = [], colors = [], normals = [];
  const tri = (a, b, c, color) => {
    const u = b.map((x, i) => x - a[i]), v = c.map((x, i) => x - a[i]);
    const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], size = Math.hypot(...cross) || 1, normal = cross.map(x => x / size);
    for (const p of [a, b, c]) { pos.push(...p); colors.push(...rgb(color).map(x => x / 255)); normals.push(...normal); }
  };
  const box = (x, y, z, w, h, d, color) => {
    const p = [[x-w/2,y-h/2,z+d/2],[x+w/2,y-h/2,z+d/2],[x+w/2,y+h/2,z+d/2],[x-w/2,y+h/2,z+d/2],[x-w/2,y-h/2,z-d/2],[x+w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z-d/2],[x-w/2,y+h/2,z-d/2]];
    for (const [a,b,c,d] of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]]) { tri(p[a],p[b],p[c],color); tri(p[a],p[c],p[d],color); }
  };
  const cone = (x, y, z, radius, height, color) => {
    for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9, b = (i + 1) * Math.PI * 2 / 9, p = [x + Math.cos(a) * radius,y,z + Math.sin(a) * radius], q = [x + Math.cos(b) * radius,y,z + Math.sin(b) * radius]; tri(p,[x,y+height,z],q,color); tri(q,[x,y,z],p,color); }
  };
  box(0,-.12,0,5.8,.22,4.6,'#91a27b'); box(-1, .7, -.3,.24,1.4,.24,'#835e45'); cone(-1,.7,-.3,1.05,1.5,'#63805c'); cone(-1,1.3,-.3,.8,1.25,'#7e955e');
  box(1.45,.6,.35,1.7,.13,.62,'#b08458'); box(1.45,1.05,.1,1.7,.42,.11,'#b08458');
  for (const x of [.8,2.1]) for (const z of [.12,.57]) box(x,.28,z,.12,.56,.12,'#696056');
  box(.05,.12,1.35,2.2,.25,.65,'#9c7757'); box(.05,.27,1.35,2.03,.07,.5,'#64523d');
  for (const x of [-.65,.05,.75]) { box(x,.39,1.35,.04,.24,.04,'#6c8358'); cone(x,.4,1.35,.15,.23,'#799956'); }
  const arrays = [new Float32Array(pos),new Float32Array(normals),new Float32Array(colors)]; let offset = 0;
  const views = arrays.map(a => { const result = { buffer: 0, byteOffset: offset, byteLength: a.byteLength, target: 34962 }; offset += a.byteLength; return result; });
  const bin = Buffer.alloc(offset); arrays.forEach((a,i) => bin.set(new Uint8Array(a.buffer),views[i].byteOffset));
  const min = [0,1,2].map(i => Math.min(...pos.filter((_,j) => j % 3 === i))), max = [0,1,2].map(i => Math.max(...pos.filter((_,j) => j % 3 === i)));
  const gltf = { asset: {version:'2.0',generator:'Jot original fictional garden demo'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'Garden tree, wooden bench and raised bed',mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1,COLOR_0:2},material:0}]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.9}}],buffers:[{byteLength:bin.length}],bufferViews:views,accessors:arrays.map((a,i)=>({bufferView:i,componentType:5126,count:a.length/3,type:'VEC3',...(i===0?{min,max}:{})}))};
  let json = Buffer.from(JSON.stringify(gltf)); json = Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
  const head = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8); head.writeUInt32LE(0x46546c67); head.writeUInt32LE(2,4); head.writeUInt32LE(28+json.length+bin.length,8); jh.writeUInt32LE(json.length); jh.writeUInt32LE(0x4e4f534a,4); bh.writeUInt32LE(bin.length); bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([head,jh,json,bh,bin]);
}

function readingPDF() {
  const text = 'BT /F1 22 Tf 50 740 Td (Small things by the window) Tj 0 -38 Td /F1 12 Tf (An original miniature book for a fictional Jot demo.) Tj 0 -35 Td (A mug leaves a circle on the table.) Tj 0 -22 Td (Rain draws paths across the window.) Tj 0 -22 Td (The notebook waits beside a pot of leaves.) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`];
  let out = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((body,i) => { offsets.push(Buffer.byteLength(out)); out += `${i+1} 0 obj\n${body}\nendobj\n`; });
  const at = Buffer.byteLength(out); out += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${at}\n%%EOF\n`;
  return enc.encode(out);
}

export async function demoAssets() {
  const drawing = illustration(), window = png(drawing.data), background = png(Buffer.from(drawing.data));
  const points = Array.from({length:49},(_,i) => { const a = i/48*Math.PI*2; return {x:.323+Math.cos(a)*.147,y:.773+Math.sin(a)*.149,pressure:.5}; });
  const ink = {format:'jot-ink',version:1,page:{widthMm:148,heightMm:148*HEIGHT/WIDTH},coordinates:'normalized',background:'media/ink-background.png',strokes:[{tool:'pen',color:'#a3483c',widthMm:.8,points}]};
  for(let i=1;i<points.length;i++) drawing.line(points[i-1].x*WIDTH,points[i-1].y*HEIGHT,points[i].x*WIDTH,points[i].y*HEIGHT,2,'#a3483c');
  const epub = await fixedLayoutEPUB({title:'Small things by the window',lang:'en',id:'urn:uuid:d36d26bb-3421-4c65-9864-49612389900c',modified:'2026-10-01T12:00:00Z',width:600,height:800,css:'body{background:#f7f1e5;color:#26372d;font:24px/1.6 serif;padding:45px} img{max-width:100%}',pages:[{body:'<h1>Small things by the window</h1><p>An original miniature book for a fictional Jot demo.</p><p>A mug leaves a circle on the table. Rain draws paths across the window. The notebook waits beside a pot of leaves.</p><img src="../media/window.png" alt="An original illustration of tea, a notebook and a plant by a rainy window."/>',headings:['Small things by the window']}],files:[{path:'media/window.png',mediaType:'image/png',data:window}]});
  const values = [
    ['window.png','image/png',window],['ink-background.png','image/png',background],['ink.png','image/png',png(drawing.data)],['ink.jot-ink.json','application/json',enc.encode(JSON.stringify(ink)+'\n')],
    ['rain.wav','audio/wav',rainSound()],['rain.webm','video/webm',fs.readFileSync(new URL('../examples/demo-assets/rain.webm',import.meta.url))],['garden.glb','model/gltf-binary',gardenModel()],
    ['garden-poster.png','image/png',fs.readFileSync(new URL('../examples/demo-assets/garden-poster.png',import.meta.url))],
    ...['draco','meshopt','ktx2'].map(name=>[name+'.glb','model/gltf-binary',fs.readFileSync(new URL('../site/fixtures/scene/'+name+'.glb',import.meta.url))]),
    ['reading.pdf','application/pdf',readingPDF()],['reading.epub','application/epub+zip',epub],
    ['note.txt','text/plain',enc.encode('Fictional library note\n\nReturn the borrowed field guide on Friday. The quiet table is beside the window.\n')],
    ['clippings.jot','text/plain',enc.encode('---\nJot: 1.0\nTitle: Fictional library clipping\n---\n\n## A small note from the library\n\nA notebook can hold a borrowed thought without holding the whole book.\n\n[[ Original fictional text, bundled for the local include example. ]]\n')],
  ];
  return values.map(([name,mediaType,data]) => {
    const hash = createHash('sha256').update('jot-demo:'+name).digest('hex').slice(0,32), id = `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20)}`;
    return {id,path:'media/'+name,name,mediaType,data:new Uint8Array(data)};
  });
}

// Exporting a still lets developers rebuild the one short original WebM without a canvas dependency.
if (process.argv.includes('--video-still')) fs.writeFileSync(process.argv[process.argv.indexOf('--video-still')+1], png(illustration().data));
