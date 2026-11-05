/* Jot 3D model viewer, draft 0.1: turns a model the preview drew (preview.mjs, a `figure.jot-3d`) in 3D, with the bundled
 * three.js (vendor/three.mjs, globalThis.JotThree). Classic script: it sets globalThis.Jot3D and exports nothing, so Writer
 * imports it for its effect and a fixed-layout EPUB page loads it with a plain <script>.
 *
 *   Jot3D.open(figure, bytes, settings, { decoders })   -> Promise: draws the model (ArrayBuffer/Uint8Array of a .glb or
 *                                          self-contained .gltf). decoders: { 'draco_decoder.wasm': bytes, … } for compressed models
 *                                          (model3d.mjs decodersFor names them); meshopt needs none.
 *   Jot3D.close(figure) / closeAll(root)   back to the still picture; frees the graphics context
 *   Jot3D.viewOf(figure)                   { camera, target } of an open view, so a redrawn page can reopen it where it was
 *   Jot3D.bindAll(root, bytesOf)           wires every model's "Turn in 3D" button; bytesOf(figure) -> bytes | { bytes, decoders }
 *
 * The model is data, never code. Only bytes already in the journal are read: every outside URL a model names is refused, so
 * nothing is fetched. Draco meshes and Basis Universal (KTX2) textures are decoded by the decoders handed over as bytes, in
 * workers made from those bytes; meshopt is built in. The decoders' files are Jot's own, never the model's. Nothing moves until the reader asks: no auto-rotation, and an animation plays only on Play. Drag, the arrow
 * keys and + / − turn and zoom it; Reset view and Back to the picture are buttons. Hotspots are numbered buttons on the model:
 * each takes the view to its place and says what is there.
 */
(function () {
  const OPEN = new Map(), MAX_OPEN = 4, STEP = Math.PI / 12, FOV = 40, MathFOV = (FOV / 2) * Math.PI / 180; // the whole model in view, with room around it
  const ui = (doc, tag, text, cls) => { const e = doc.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const bytesOf = (b) => (b instanceof ArrayBuffer ? b : b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  function settingsOf(figure) { try { return JSON.parse(figure.dataset.jot3d || '{}'); } catch { return {}; } }

  function close(figure) {
    const v = OPEN.get(figure); if (!v) return;
    OPEN.delete(figure); v.stop();
  }
  function viewOf(figure) { return OPEN.get(figure)?.view() || null; }
  function closeAll(root) { for (const f of [...OPEN.keys()]) if (!root || root.contains(f) || !f.isConnected) close(f); }

  async function open(figure, bytes, settings = settingsOf(figure), { decoders = {} } = {}) {
    const T = globalThis.JotThree, doc = figure.ownerDocument, win = doc.defaultView;
    const stage = figure.querySelector('.jot-3d-stage'), tools = figure.querySelector('.jot-3d-tools'), state = figure.querySelector('.jot-3d-state');
    const say = (text) => { if (state) state.textContent = text; };
    if (!T || !stage) { say('3D drawing is not available here; the picture stays.'); return false; }
    close(figure);
    if (OPEN.size >= MAX_OPEN) close(OPEN.keys().next().value); // graphics contexts are limited: the oldest goes back to its picture
    const canvas = ui(doc, 'canvas', '', 'jot-3d-canvas');
    canvas.tabIndex = 0; canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${settings.alt || settings.title || '3D model'}. Drag or use the arrow keys to turn it, + and − to zoom.`);
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: !settings.background, preserveDrawingBuffer: true }); }
    catch { say('This device cannot draw 3D here; the picture stays.'); return false; }
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.NeutralToneMapping;
    renderer.setPixelRatio(Math.min(win.devicePixelRatio || 1, 2));
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(FOV, 4 / 3, 0.01, 1000);
    if (settings.background) scene.background = new T.Color(settings.background);
    let env = null;
    if (settings.lighting !== 'dim') { const pm = new T.PMREMGenerator(renderer); env = pm.fromScene(new T.RoomEnvironment(), 0.04).texture; pm.dispose(); scene.environment = env; }
    scene.add(new T.HemisphereLight(0xffffff, 0x8d8d8d, settings.lighting === 'dim' ? 0.45 : settings.lighting === 'studio' ? 0.3 : 0.6));
    if (settings.lighting !== 'soft') { const key = new T.DirectionalLight(0xffffff, settings.lighting === 'studio' ? 2 : 0.5); key.position.set(3, 5, 4); scene.add(key); }

    // Only the journal's own bytes: a model that names outside files is drawn without them, and says so.
    // The decoders (Jot's own files, passed in as bytes) are reached through blob: URLs made here and nowhere else.
    let refused = 0;
    const files = new Map(), urls = [];
    for (const [name, data] of Object.entries(decoders || {})) {
      if (!/^[a-z_]+\.(js|wasm)$/.test(name) || !data) continue;
      const url = win.URL.createObjectURL(new win.Blob([data], { type: name.endsWith('.wasm') ? 'application/wasm' : 'text/javascript' }));
      files.set(name, url); urls.push(url);
    }
    const manager = new T.LoadingManager();
    manager.setURLModifier((url) => {
      const own = /^jot-decoders\/([a-z_]+\.(?:js|wasm))$/.exec(url); if (own) return files.get(own[1]) || (refused++, 'data:,');
      return /^(data|blob):/i.test(url) ? url : (refused++, 'data:application/octet-stream;base64,');
    });
    const loader = new T.GLTFLoader(manager);
    loader.setMeshoptDecoder(T.MeshoptDecoder);
    let draco = null, ktx2 = null;
    if (files.has('draco_wasm_wrapper.js') && files.has('draco_decoder.wasm')) {
      draco = new T.DRACOLoader(manager).setDecoderPath({ js: files.get('draco_wasm_wrapper.js'), wasm: files.get('draco_decoder.wasm') });
      draco.setWorkerLimit(2); loader.setDRACOLoader(draco); // given the WebAssembly files, it uses them
    }
    if (files.has('basis_transcoder.js') && files.has('basis_transcoder.wasm')) {
      ktx2 = new T.KTX2Loader(manager).setTranscoderPath('jot-decoders/').setWorkerLimit(2).detectSupport(renderer); loader.setKTX2Loader(ktx2);
    }
    const freeDecoders = () => { draco?.dispose(); ktx2?.dispose(); for (const u of urls) win.URL.revokeObjectURL(u); };
    say('Opening the model…');
    let gltf;
    try {
      if (typeof win.WebAssembly !== 'object' && (draco || ktx2)) throw new Error('no WebAssembly');
      gltf = await new Promise((resolve, reject) => loader.parse(bytesOf(bytes), '', resolve, reject));
    } catch (e) {
      renderer.dispose(); renderer.forceContextLoss?.(); freeDecoders();
      const m = String(e?.message || e);
      const why = /no WebAssembly/.test(m) ? 'this reader cannot run the decoder it needs'
        : /DRACO|KHR_draco/i.test(m) ? 'it is compressed with Draco and its decoder is not available here'
        : /KTX2|basisu/i.test(m) ? 'its textures are Basis Universal (KTX2) and their decoder is not available here'
        : /meshopt/i.test(m) ? 'its meshopt compression could not be read'
        : 'it is not a glTF model Jot can read';
      say(`Could not turn this model in 3D: ${why}. The picture stays.`); return false;
    }
    const root = gltf.scene || gltf.scenes?.[0]; scene.add(root);
    const sphere = new T.Box3().setFromObject(root).getBoundingSphere(new T.Sphere()), r = sphere.radius > 0 && Number.isFinite(sphere.radius) ? sphere.radius : 1;
    const target = settings.target ? new T.Vector3(...settings.target) : sphere.center.clone();
    const start = settings.camera ? new T.Vector3(...settings.camera) : target.clone().add(new T.Vector3(1, 0.6, 1).normalize().multiplyScalar(r / Math.sin(MathFOV) * 1.2));
    camera.near = r / 200; camera.far = Math.max(r * 200, start.distanceTo(target) * 4); camera.updateProjectionMatrix();
    const controls = new T.OrbitControls(camera, canvas);
    controls.enableDamping = false; controls.enablePan = false; controls.minDistance = r * 0.2; controls.maxDistance = Math.max(r * 20, start.distanceTo(target) * 2);
    const reset = () => { camera.position.copy(start); controls.target.copy(target); controls.update(); draw(); };
    // Hotspots: numbered buttons kept over their places as the model turns; hidden when a place is behind the camera or off the view.
    const spots = (settings.hotspots || []).map((h, i) => {
      const b = ui(doc, 'button', String(i + 1), 'jot-3d-spot'), at = new T.Vector3(...h.at);
      b.type = 'button'; b.title = h.label; b.setAttribute('aria-label', `Go to ${i + 1}: ${h.label}`);
      b.onclick = () => {
        const dir = camera.position.clone().sub(controls.target).normalize();
        controls.target.copy(at); camera.position.copy(at).add(dir.multiplyScalar(Math.max(controls.minDistance * 1.5, r * 1.8)));
        controls.update(); draw(); say(`${i + 1}: ${h.label}`);
      };
      return { b, at };
    });
    const place = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      for (const s of spots) {
        const v = s.at.clone().project(camera), off = v.z > 1 || Math.abs(v.x) > 1.02 || Math.abs(v.y) > 1.02;
        s.b.hidden = off; if (!off) { s.b.style.left = `${((v.x + 1) / 2) * w}px`; s.b.style.top = `${((1 - v.y) / 2) * h}px`; }
      }
    };

    // Drawing happens when something changes, not every frame, unless an animation is playing.
    let frame = 0, playing = false, mixer = null, action = null;
    const clock = new T.Timer();
    const draw = () => { if (!frame) frame = win.requestAnimationFrame(tick); };
    function tick() { frame = 0; if (playing && mixer) { clock.update(); mixer.update(clock.getDelta()); draw(); } renderer.render(scene, camera); place(); }
    const size = () => { const w = stage.clientWidth || 320, h = stage.clientHeight || 240; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw(); };
    const resize = new win.ResizeObserver(size);
    controls.addEventListener('change', draw);
    canvas.addEventListener('keydown', (e) => {
      const off = camera.position.clone().sub(controls.target); let used = true;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') off.applyAxisAngle(new T.Vector3(0, 1, 0), e.key === 'ArrowLeft' ? -STEP : STEP);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { const axis = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), off).normalize(); const turned = off.clone().applyAxisAngle(axis, e.key === 'ArrowUp' ? -STEP : STEP); if (Math.abs(turned.clone().normalize().y) < 0.98) off.copy(turned); }
      else if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '−') off.multiplyScalar(e.key === '-' || e.key === '−' ? 1.18 : 0.85);
      else if (e.key === 'Home' || e.key === '0') { reset(); e.preventDefault(); return; }
      else used = false;
      if (!used) return;
      e.preventDefault();
      const d = Math.min(controls.maxDistance, Math.max(controls.minDistance, off.length()));
      camera.position.copy(controls.target).add(off.setLength(d)); controls.update(); draw();
    });
    let stopped = false;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (stopped) return; close(figure); say('The 3D drawing was interrupted; the picture is back. Turn it in 3D again when you like.'); });

    // Tools: the reader's own controls, kept out of print and saved pages (data-jot-live).
    const bar = ui(doc, 'div', '', 'jot-3d-live'); bar.dataset.jotLive = '';
    const resetBtn = ui(doc, 'button', 'Reset view'); resetBtn.type = 'button'; resetBtn.onclick = () => { reset(); canvas.focus(); };
    const backBtn = ui(doc, 'button', 'Back to the picture'); backBtn.type = 'button'; backBtn.onclick = () => { close(figure); figure.querySelector('.jot-3d-turn')?.focus(); };
    bar.append(resetBtn);
    const clips = gltf.animations || [];
    if (clips.length) {
      const clip = settings.animation ? clips.find((c) => c.name === settings.animation) : clips[0];
      if (clip) {
        mixer = new T.AnimationMixer(root); action = mixer.clipAction(clip);
        const play = ui(doc, 'button', 'Play animation'); play.type = 'button'; play.setAttribute('aria-pressed', 'false');
        play.onclick = () => { playing = !playing; if (playing) { action.paused = false; action.play(); clock.update(); } else action.paused = true; play.textContent = playing ? 'Pause animation' : 'Play animation'; play.setAttribute('aria-pressed', String(playing)); draw(); };
        bar.append(play);
      } else say(`No animation called “${settings.animation}” in this model.`);
    }
    bar.append(backBtn);

    const still = stage.querySelector('.jot-3d-still'); if (still) still.hidden = true;
    const turn = figure.querySelector('.jot-3d-turn'); if (turn) turn.hidden = true;
    stage.append(canvas, ...spots.map((s) => s.b)); tools?.prepend(bar); figure.classList.add('jot-3d-open');
    resize.observe(stage); size(); reset();
    if (!state?.textContent.startsWith('No animation')) say(refused ? `Turned in 3D, without ${refused} outside file${refused === 1 ? '' : 's'} the model names: only what is in the journal is drawn.` : 'Turned in 3D. Drag or use the arrow keys to turn it.');
    OPEN.set(figure, { view: () => ({ camera: camera.position.toArray(), target: controls.target.toArray() }), stop() {
      stopped = true;
      if (frame) win.cancelAnimationFrame(frame); resize.disconnect(); controls.dispose(); mixer?.stopAllAction();
      root.traverse((o) => { o.geometry?.dispose(); for (const m of [].concat(o.material || [])) { for (const k in m) if (m[k]?.isTexture) m[k].dispose(); m.dispose(); } });
      env?.dispose(); renderer.dispose(); renderer.forceContextLoss?.(); freeDecoders();
      canvas.remove(); bar.remove(); for (const s of spots) s.b.remove(); if (still) still.hidden = false; if (turn) turn.hidden = false; figure.classList.remove('jot-3d-open'); say('');
    } });
    return true;
  }

  function bindAll(root, bytesOfFigure) {
    for (const figure of root.querySelectorAll('figure.jot-3d[data-jot3d]')) {
      const turn = figure.querySelector('.jot-3d-turn'); if (!turn || turn.dataset.bound) continue;
      turn.dataset.bound = '1'; turn.disabled = false; turn.hidden = false; // shown only where it works (an EPUB page without scripts keeps the still)
      turn.addEventListener('click', async () => { turn.disabled = true; try { const got = await bytesOfFigure(figure); if (got) await (got.bytes ? open(figure, got.bytes, undefined, { decoders: got.decoders }) : open(figure, got)); } finally { turn.disabled = false; } });
    }
  }
  globalThis.Jot3D = Object.freeze({ open, close, closeAll, viewOf, bindAll });
})();
