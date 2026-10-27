const assert=require('node:assert/strict');
const C=require('./dist/scan/scanner-core.js');
const q=[{x:10,y:20},{x:110,y:25},{x:100,y:170},{x:15,y:160}],m=C.homography(q);
[[0,0],[1,0],[1,1],[0,1]].forEach(([u,v],i)=>{const p=C.project(m,u,v);assert.ok(Math.abs(p.x-q[i].x)<1e-7);assert.ok(Math.abs(p.y-q[i].y)<1e-7);});
assert.equal(C.validQuad(q),true);assert.equal(C.validQuad([q[0],q[2],q[1],q[3]]),false);
const img=new Uint8ClampedArray([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,255]);assert.throws(()=>C.warp(img,2,2,[q[0],q[2],q[1],q[3]],3,3));
// Use a sufficiently large exact rectangle for non-degenerate geometry validation.
const w=21,h=21,pixels=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4;pixels[k]=x*10;pixels[k+1]=y*10;pixels[k+2]=80;pixels[k+3]=255;}
const identity=[{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}];assert.deepEqual(C.warp(pixels,w,h,identity,w,h),pixels);
const square=C.outputSize(identity,{w:100,h:100});assert.equal(square.w,square.h);const pocket=C.outputSize(identity,{w:88.9,h:139.7});assert.ok(Math.abs(pocket.w/pocket.h-88.9/139.7)<.002);
const W=240,H=300,photo=new Uint8ClampedArray(W*H*4);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4,v=x>=35&&x<=205&&y>=30&&y<=270?240:45;photo[k]=photo[k+1]=photo[k+2]=v;photo[k+3]=255;}
const found=C.detect(photo,W,H);assert.ok(found);assert.ok(found.every((p,i)=>Math.hypot(p.x-[35,205,205,35][i],p.y-[30,30,270,270][i])<3));
assert.equal(C.detect(new Uint8ClampedArray(W*H*4).fill(255),W,H),null);
console.log('PASS: projective corner mapping, invalid-corner rejection, identity resampling, physical aspect ratios, page detection, no-page fallback.');
