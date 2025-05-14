console.log("✅ main.js загружен");

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0.5, 1.5, 2.5);

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

let clock = new THREE.Clock();
let mixer;
let actions = {};
let ledOn = false;

new RGBELoader()
  .setDataType(THREE.UnsignedByteType)
  .load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/venice_sunset_1k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;

    loadModel();
  });

function loadModel() {
  const loader = new GLTFLoader();
  loader.load('assets/Kerber.glb', (gltf) => {
    scene.add(gltf.scene);
    mixer = new THREE.AnimationMixer(gltf.scene);

    gltf.scene.traverse((child) => {
      if (child.isMesh && child.name.startsWith('led_')) {
        if (child.material && child.material.emissive) {
          child.material = child.material.clone();
          child.material.emissiveIntensity = 0;
        }
      }
    });

    gltf.animations.forEach((clip) => {
      const root = gltf.scene.getObjectByName(clip.name);
      if (root) {
        const action = mixer.clipAction(clip, root);
        actions[clip.name] = action;
      }
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(gltf.scene.children, true);

      if (intersects.length > 0) {
        const clicked = intersects[0].object;
        const btnName = clicked.name;

        if (btnName.startsWith('btn_')) {
          const action = actions[btnName];
          if (action) {
            action.reset();
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.play();

            if (btnName === 'btn_power') {
              const led = gltf.scene.getObjectByName('led_BatteryOperation');
              if (led && led.material) {
                led.material.emissiveIntensity = ledOn ? 0 : 5;
                ledOn = !ledOn;
              }
            }
          }
        }
      }
    });
  });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  controls.update();
  renderer.render(scene, camera);
}
animate();
