import * as THREE from 'three';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
// import { TexturePass } from 'three/examples/jsm/postprocessing/TexturePass.js';

import { DissolutionPass } from './DissolutionPass';

let composer, renderer;

const params = {
    threshold: 0.1,
    strength: 0.2,
    radius: 0.2,
    exposure: 0.2
};


init();
function init() {


    const container = document.getElementById('container');

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    //renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(renderer.domElement);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = params.threshold;
    bloomPass.strength = params.strength;
    bloomPass.radius = params.radius;

    const outputPass = new OutputPass();

    const inputTexture = new THREE.TextureLoader().load('/textures/decker.jpg');
    inputTexture.colorSpace = THREE.SRGBColorSpace;
    // const texturePass = new TexturePass(inputTexture);
    const noiseTexture = new THREE.TextureLoader().load('/textures/sampleNoiseAB.png');
    const texturePass = new DissolutionPass(inputTexture, noiseTexture, 3.0);

    composer = new EffectComposer(renderer);
    composer.addPass(texturePass);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

    const width = window.innerWidth;
    const height = window.innerHeight;

    // camera.aspect = width / height;
    // camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
}

function animate() {
    composer.render();
}