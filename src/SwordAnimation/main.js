import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

let container;

let camera, scene, renderer, controls, clock;

let sword;

let swordInstance;
const moveRange = [200, -50];
const rotationSpeed = 0.1;
const gravity = -9.8 * 2;
const instanceCount = 600;
const originOffset = [];
const originAngle = [];
const velocities = [];
const axis = new THREE.Vector3(0, 1, 0);
const boxCenter = new THREE.Vector3();
//const originScale = new THREE.Vector3(1, 1, 1);

init();
function init() {


    container = document.getElementById('container');
    //
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 10, 5000);
    camera.position.set(200, 200, 200);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00FF00);

    clock = new THREE.Clock();

    //const axesHelper = new THREE.AxesHelper(5);
    //scene.add(axesHelper);

    const light = new THREE.DirectionalLight(0xFFFFFF, 3.5);
    light.position.set(1, 1, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 4.2);
    scene.add(ambientLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    //
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    {

        new MTLLoader()
            .setPath('/models/82-obj/72-sword_black_death_obj/')
            .load('swordHIgh.mtl', function (materials) {
                materials.preload();
                new OBJLoader()
                    .setMaterials(materials)
                    .setPath('/models/82-obj/72-sword_black_death_obj/')
                    .load('swordHIgh.obj', function (group) {

                        const material = new THREE.MeshStandardMaterial({
                            color: 0xFFFFFF,
                            metalness: 1.0,
                            roughness: 0.2
                        });
                        sword = new THREE.Group();
                        swordInstance = new THREE.InstancedMesh(group.children[0].geometry, material, instanceCount);
                        swordInstance.frustumCulled = false;

                        group.children[0].geometry.computeBoundingBox();
                        group.children[0].geometry.boundingBox.getCenter(boxCenter);

                        const offset = new THREE.Vector3();
                        //const scale = new THREE.Vector3(1, 1, 1);
                        let x, y, z;
                        for (let i = 0; i < instanceCount; i++) {

                            // offsets

                            x = Math.random() * 10 - 5;
                            y = Math.random() * 10 - 5;
                            z = Math.random() * 10 - 5;

                            offset.set(x, y, z).normalize();
                            offset.multiplyScalar(60); // move out at least 5 units from center in current direction
                            offset.set(x + offset.x, moveRange[0] + Math.random() * 100 - 100, z + offset.z);

                            originOffset.push(offset.x, offset.y, offset.z);

                            const angle = (Math.random() * 2 - 1) * Math.PI;
                            originAngle.push(angle);

                            velocities.push(Math.random() * 5);
                        }


                        swordInstance.position.set(-0.19277000427246094, 0.3753652572631836, 13.513401508331299);
                        swordInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // will be updated every frame
                        // swordInstance.castShadow = true;
                        // swordInstance.receiveShadow = true;
                        sword.add(swordInstance);
                        //sword.position.y = moveRange[0];

                        // 将NPC模型添加到场景
                        scene.add(sword);

                        animate();
                        renderer.setAnimationLoop(animate);

                    });
            });
    }

    //
    window.addEventListener('resize', onWindowResize);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//

function updateSword(deltaTime) {
    const posMatrix = new THREE.Matrix4();
    posMatrix.makeTranslation(boxCenter.x, boxCenter.y, boxCenter.z);
    const invtPosMatrix = posMatrix.clone().invert();
    const offsetMatrix = new THREE.Matrix4();
    const rotationMatrix = new THREE.Matrix4();
    const offset = new THREE.Vector3();
    let x, y, z;
    for (let i = 0; i < instanceCount; i++) {

        // offsets

        if (originOffset[i * 3 + 1] < moveRange[1]) {
            originOffset[i * 3 + 1] = moveRange[0];
            velocities[i] = Math.random() * 5;
        }

        velocities[i] += gravity * deltaTime;
        originOffset[i * 3 + 1] += velocities[i] * deltaTime;

        x = originOffset[i * 3];
        y = originOffset[i * 3 + 1];
        z = originOffset[i * 3 + 2];
        offset.set(x, y, z);


        offsetMatrix.makeTranslation(offset);

        // orientation
        originAngle[i] += rotationSpeed;
        rotationMatrix.makeRotationAxis(axis, originAngle[i]);
        //move to origin first then rotate then remove
        offsetMatrix.multiply(rotationMatrix).multiply(invtPosMatrix);

        //matrix.compose(offset, orientation, originScale);
        swordInstance.setMatrixAt(i, offsetMatrix);
    }
    swordInstance.instanceMatrix.needsUpdate = true;
}

function animate() {

    const deltaTime = clock.getDelta();
    updateSword(deltaTime);
    renderer.render(scene, camera);


}