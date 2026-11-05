// Development-only screenshot of the actual original garden GLB, using Jot's bundled renderer.
// node examples/demo-assets/render-garden-poster.cjs (Playwright and Chromium required)
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
(async () => {
  const { demoAssets } = await import('../../tools/demo-assets.mjs');
  const model = (await demoAssets()).find(a => a.path === 'media/garden.glb').data;
  const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}canvas{display:block}</style><canvas width="600" height="400"></canvas><script type="module">
import '/parser/vendor/three.mjs';
const T=globalThis.JotThree, canvas=document.querySelector('canvas'), renderer=new T.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(1);renderer.setSize(600,400);renderer.outputColorSpace=T.SRGBColorSpace;
const scene=new T.Scene();scene.background=new T.Color('#eee8dc');
scene.add(new T.HemisphereLight('#fff7e6','#949b80',2));const light=new T.DirectionalLight('#fff1d2',2.4);light.position.set(4,8,6);scene.add(light);
const camera=new T.PerspectiveCamera(40,1.5,.1,100);camera.position.set(6,4.5,6);camera.lookAt(0,.6,0);
const bytes=await(await fetch('/garden.glb')).arrayBuffer();const model=await new Promise((resolve,reject)=>new T.GLTFLoader().parse(bytes,'',resolve,reject));scene.add(model.scene);
renderer.render(scene,camera);globalThis.ready=true;
</script>`;
  const server = http.createServer((req,res) => {
    if(req.url === '/') {res.setHeader('Content-Type','text/html');res.end(html);}
    else if(req.url === '/garden.glb') {res.setHeader('Content-Type','model/gltf-binary');res.end(model);}
    else if(req.url === '/parser/vendor/three.mjs') {res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,'parser/vendor/three.mjs')));}
    else {res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch(fs.existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{});
    const page=await browser.newPage({viewport:{width:600,height:400},deviceScaleFactor:1});
    await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>globalThis.ready);
    await page.locator('canvas').screenshot({path:path.join(__dirname,'garden-poster.png')});
    console.log('Rendered the actual garden GLB to examples/demo-assets/garden-poster.png');
  } finally {await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
