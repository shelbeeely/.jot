// The parts of three.js Jot's 3D model viewer uses (parser/model3d-view.mjs), bundled into parser/vendor/three.mjs by
// tools/vendor-three/build.sh. The bundle is a classic script: it sets globalThis.JotThree and exports nothing, so the
// same file runs in Writer (imported for its effect) and in a fixed-layout EPUB page (a plain <script>). The Draco and Basis
// decoders it drives are separate files (parser/vendor/three-decoders/), handed to it as bytes only when a model needs them.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, HemisphereLight, DirectionalLight, AmbientLight, Box3, Vector3, Sphere,
  AnimationMixer, Timer, LoadingManager, PMREMGenerator, SRGBColorSpace, NeutralToneMapping, MathUtils, REVISION,
  // journal places (site/dist/writer-scene-build.mjs): drawn from simple shapes, with weather, as a paper pop-up book
  Mesh, Group, BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, PlaneGeometry, CapsuleGeometry,
  MeshStandardMaterial, Raycaster, Vector2, Fog, BufferGeometry, BufferAttribute, LineSegments, LineBasicMaterial, Points,
  PointsMaterial, PointLight, DoubleSide, CanvasTexture, RepeatWrapping, EdgesGeometry, MeshBasicMaterial, Spherical, PCFSoftShadowMap,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

globalThis.JotThree = Object.freeze({
  WebGLRenderer, Scene, PerspectiveCamera, Color, HemisphereLight, DirectionalLight, AmbientLight, Box3, Vector3, Sphere,
  AnimationMixer, Timer, LoadingManager, PMREMGenerator, SRGBColorSpace, NeutralToneMapping, MathUtils, REVISION,
  Mesh, Group, BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, PlaneGeometry, CapsuleGeometry,
  MeshStandardMaterial, Raycaster, Vector2, Fog, BufferGeometry, BufferAttribute, LineSegments, LineBasicMaterial, Points,
  PointsMaterial, PointLight, DoubleSide, CanvasTexture, RepeatWrapping, EdgesGeometry, MeshBasicMaterial, Spherical, PCFSoftShadowMap,
  GLTFLoader, OrbitControls, RoomEnvironment, DRACOLoader, KTX2Loader, MeshoptDecoder,
});
