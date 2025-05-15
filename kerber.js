console.log("✅ main.js загружен");

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0.5, 1.5, 2.5);

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

let clock = new THREE.Clock();
let mixer;
let actions = {};
let ledOn = false;

new RGBELoader()
  .setDataType(THREE.HalfFloatType)
  .load('https://rawcdn.githack.com/KhronosGroup/glTF-Sample-Viewer/HEAD/assets/environment/studio_small_09_1k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = new THREE.Color(0x222222);

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
      const action = mixer.clipAction(clip);
      actions[clip.name] = action;
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(gltf.scene.children, true);

      if (intersects.length > 0) {
        let clicked = intersects[0].object;
        while (clicked && !clicked.name.startsWith('btn_')) clicked = clicked.parent;
        if (!clicked) return;

        const btnName = clicked.name;

        // логика кнопок без привязки clip.name === object.name
        if (btnName === 'btn_power') {
          actions['btn_power_On']?.play();
          const led = gltf.scene.getObjectByName('led_BatteryOperation');
          if (led && led.material) {
            led.material.emissiveIntensity = ledOn ? 0 : 5;
            ledOn = !ledOn;
          }
        } else if (btnName === 'btn_search_with_stop') {
          actions['button_press']?.reset().play();
        } else {
          actions['press_btn_action']?.reset().play();
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
