// The parts of three.js Jot's 3D model viewer uses (parser/model3d-view.mjs), bundled into parser/vendor/three.mjs by
// tools/vendor-three/build.sh. The bundle is a classic script: it sets globalThis.JotThree and exports nothing, so the
// same file runs in Writer (imported for its effect) and in a fixed-layout EPUB page (a plain <script>).
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, HemisphereLight, DirectionalLight, AmbientLight, Box3, Vector3, Sphere,
  AnimationMixer, Clock, LoadingManager, PMREMGenerator, SRGBColorSpace, NeutralToneMapping, MathUtils, REVISION,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

globalThis.JotThree = Object.freeze({
  WebGLRenderer, Scene, PerspectiveCamera, Color, HemisphereLight, DirectionalLight, AmbientLight, Box3, Vector3, Sphere,
  AnimationMixer, Clock, LoadingManager, PMREMGenerator, SRGBColorSpace, NeutralToneMapping, MathUtils, REVISION,
  GLTFLoader, OrbitControls, RoomEnvironment,
});
