import { safePath } from './jot/container.mjs';
export function validateInk(value) {
  if (!value || value.format !== 'jot-ink' || value.version !== 1 || value.coordinates !== 'normalized' || !Number.isFinite(value.page?.widthMm) || !Number.isFinite(value.page?.heightMm) || value.page.widthMm <= 0 || value.page.heightMm <= 0 || value.page.widthMm > 5000 || value.page.heightMm > 5000 || !Array.isArray(value.strokes) || value.strokes.length > 10000) throw Error('Invalid or unsupported handwriting data.');
  if (value.background && (!safePath(value.background) || !/^(assets|media)\//.test(value.background))) throw Error('Unsafe handwriting background path.');
  let count = 0;
  for (const stroke of value.strokes) {
    if (!['pen','eraser'].includes(stroke.tool) || !/^#[a-f\d]{6}$/i.test(stroke.color) || !Number.isFinite(stroke.widthMm) || stroke.widthMm <= 0 || stroke.widthMm > 10 || !Array.isArray(stroke.points) || !stroke.points.length) throw Error('Invalid handwriting stroke.');
    count += stroke.points.length; if (count > 100000) throw Error('Handwriting is limited to 100,000 points per page.');
    for (const point of stroke.points) if (![point.x,point.y,point.pressure ?? 0.5].every(n=>Number.isFinite(n)&&n>=0&&n<=1)) throw Error('Invalid handwriting point.');
  }
  return value;
}
export function drawInk(canvas, strokes, widthMm) {
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
  for (const stroke of strokes) {
    ctx.save();ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=stroke.color;ctx.fillStyle=stroke.color;ctx.lineCap='round';ctx.lineJoin='round';
    for(let i=0;i<stroke.points.length;i++){
      const a=stroke.points[Math.max(0,i-1)],b=stroke.points[i];ctx.lineWidth=stroke.widthMm*canvas.width/widthMm*(stroke.tool==='eraser'?10:0.65+((a.pressure??.5)+(b.pressure??.5))*.5);
      if(i===0){ctx.beginPath();ctx.arc(a.x*canvas.width,a.y*canvas.height,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}
      else{ctx.beginPath();ctx.moveTo(a.x*canvas.width,a.y*canvas.height);ctx.lineTo(b.x*canvas.width,b.y*canvas.height);ctx.stroke();}
    }ctx.restore();
  }
}
