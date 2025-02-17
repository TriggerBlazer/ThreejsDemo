import * as THREE from 'three';
import { Rockfall } from './Rockfall';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';


let container;

let camera, scene, renderer, controls, particleSystem;

init();
function init() {


    container = document.getElementById('container');
    //
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.x = 30;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00FF00);
    

    const light = new THREE.DirectionalLight(0xFFFFFF, 3.5);
    light.position.set(1, 1, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 4.2);
    scene.add(ambientLight);

    particleSystem = new Rockfall({
        originPitch: 1.5,
        originYaw: 1.5,
        scale: 1.0,
        spread: 1.0,
        originIntensity: 5,
        originPosition: new THREE.Vector3(0, 0, 10),
        texturePath: `/textures/Rock.png`
    });
    scene.add(particleSystem);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);

    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    //
    window.addEventListener('resize', onWindowResize);

}

function animate() {
    particleSystem.update();
    renderer.render(scene, camera);
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}