(function(root){
 'use strict';
 const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0)/2;
 const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
 function hull(points){
  const p=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y);if(p.length<4)return p;
  const lo=[],hi=[];for(const a of p){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),a)<=0)lo.pop();lo.push(a);}
  for(let i=p.length-1;i>=0;i--){const a=p[i];while(hi.length>1&&cross(hi.at(-2),hi.at(-1),a)<=0)hi.pop();hi.push(a);}lo.pop();hi.pop();return lo.concat(hi);
 }
 function order(p){
  // Convex hull order, starting at its upper-left candidate, clockwise on screen.
  let q=p.slice();if(area(q)<0)q.reverse();let k=0;for(let i=1;i<q.length;i++)if(q[i].x+q[i].y<q[k].x+q[k].y)k=i;return q.slice(k).concat(q.slice(0,k));
 }
 function validQuad(p){return p.length===4&&area(p)>20&&p.every((a,i)=>cross(a,p[(i+1)%4],p[(i+2)%4])>0.01);}
 function quadFromHull(h){let p=h.slice();while(p.length>4){let m=Infinity,k=-1;for(let i=0;i<p.length;i++){const a=Math.abs(cross(p[(i+p.length-1)%p.length],p[i],p[(i+1)%p.length]));if(a<m){m=a;k=i;}}p.splice(k,1);}return order(p);}
 function detect(rgba,w,h){
  const n=w*h,g=new Uint8Array(n);for(let i=0;i<n;i++)g[i]=(rgba[i*4]*77+rgba[i*4+1]*150+rgba[i*4+2]*29)>>8;
  let best=null,bestScore=0;const queue=new Int32Array(n);
  for(const [threshold,bright] of [[185,true],[225,true],[75,false],[120,false]]){
   const seen=new Uint8Array(n),inside=i=>bright?g[i]>=threshold:g[i]<=threshold;
   for(let seed=0;seed<n;seed++){
    if(seen[seed]||!inside(seed))continue;let head=0,tail=1;queue[0]=seed;seen[seed]=1;let touch=0,minx=w,miny=h,maxx=0,maxy=0;
    while(head<tail){const k=queue[head++],x=k%w,y=(k/w)|0;minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);if(x===0||y===0||x===w-1||y===h-1)touch++;
     for(const z of [x>0?k-1:-1,x<w-1?k+1:-1,y>0?k-w:-1,y<h-1?k+w:-1])if(z>=0&&!seen[z]&&inside(z)){seen[z]=1;queue[tail++]=z;}
    }
    if(tail<n*.004||touch>4||maxx-minx<w*.15||maxy-miny<h*.15)continue;
    const points=[];for(let j=0;j<tail;j++){const k=queue[j],x=k%w,y=(k/w)|0;if(x===0||x===w-1||y===0||y===h-1||!inside(k-1)||!inside(k+1)||!inside(k-w)||!inside(k+w))points.push({x,y});}
    const q=quadFromHull(hull(points));if(!validQuad(q))continue;const a=area(q);if(a<n*.10||a>n*.98)continue;
    const fill=tail/a;if(bright&&fill<.65)continue;const score=a/n*(bright?Math.min(fill,1):.92);
    if(score>bestScore){bestScore=score;best=q;}
   }
  }return best;
 }
 // Project a unit square into a quadrilateral. Used inversely to sample the photo.
 function homography(p){const [a,b,c,d]=p,dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x,dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y;let g=0,h=0;
  if(Math.abs(dx3)+Math.abs(dy3)>1e-9){const den=dx1*dy2-dx2*dy1;if(Math.abs(den)<1e-9)throw Error('The selected corners are too close to a line.');g=(dx3*dy2-dx2*dy3)/den;h=(dx1*dy3-dx3*dy1)/den;}
  return [b.x-a.x+g*b.x,d.x-a.x+h*d.x,a.x,b.y-a.y+g*b.y,d.y-a.y+h*d.y,a.y,g,h];
 }
 function project(m,u,v){const z=m[6]*u+m[7]*v+1;return {x:(m[0]*u+m[1]*v+m[2])/z,y:(m[3]*u+m[4]*v+m[5])/z};}
 function warp(src,sw,sh,p,ow,oh,mode='color',exposure=0){
  if(!validQuad(p))throw Error('Keep the four corners in order without crossing the edges.');const m=homography(p),out=new Uint8ClampedArray(ow*oh*4),gain=Math.pow(2,exposure/100);
  for(let y=0;y<oh;y++)for(let x=0;x<ow;x++){
   const q=project(m,x/Math.max(1,ow-1),y/Math.max(1,oh-1));const sx=Math.max(0,Math.min(sw-1,q.x)),sy=Math.max(0,Math.min(sh-1,q.y)),ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
   const k=(iy*sw+ix)*4,kx=(iy*sw+Math.min(ix+1,sw-1))*4,ky=(Math.min(iy+1,sh-1)*sw+ix)*4,kxy=(Math.min(iy+1,sh-1)*sw+Math.min(ix+1,sw-1))*4,o=(y*ow+x)*4;
   const vals=[];for(let c=0;c<3;c++)vals[c]=Math.min(255,((src[k+c]*(1-fx)+src[kx+c]*fx)*(1-fy)+(src[ky+c]*(1-fx)+src[kxy+c]*fx)*fy)*gain);
   if(mode==='gray'){const l=vals[0]*.299+vals[1]*.587+vals[2]*.114;vals.fill(l);}if(mode==='bw'){const l=vals[0]*.299+vals[1]*.587+vals[2]*.114;vals.fill(l>155?255:0);}for(let c=0;c<3;c++)out[o+c]=vals[c];out[o+3]=255;
  }return out;
 }
 function outputSize(p,physical,dpi=200,max=2600){const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);let w,h;
  if(physical){w=Math.round(physical.w/25.4*dpi);h=Math.round(physical.h/25.4*dpi);}else{w=Math.round((dist(p[0],p[1])+dist(p[3],p[2]))/2);h=Math.round((dist(p[0],p[3])+dist(p[1],p[2]))/2);}
  const scale=Math.min(1,max/Math.max(w,h));return {w:Math.max(16,Math.round(w*scale)),h:Math.max(16,Math.round(h*scale)),limited:scale<1};
 }
 const api={area,validQuad,detect,homography,project,warp,outputSize};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ScannerCore=api;
})(typeof window!=='undefined'?window:globalThis);
