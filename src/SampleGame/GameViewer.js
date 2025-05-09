import * as THREE from 'three';
import { ControlKey, ActionMode } from './ControlKey';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';



const PI = Math.PI;
const PI90 = Math.PI / 2;

const rotationHeadMatrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), -PI90);
const rotationMatrix = new THREE.Matrix4();
const offsetMatrix = new THREE.Matrix4();
const offsetHeardMatrix = new THREE.Matrix4();
const mainAxis = new THREE.Vector3(0, 1, 0);

class GameViewer {
    constructor() {
        this.container = null;

        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.floor = null;
        this.orbitControls;

        this.modelGroup = null;
        this.gltfModel = null;
        this.followGroup = null;
        this.skeleton = null;
        this.mixer = null,
            this.clock = null;
        this.actions = null;

        this.swordCenter = new THREE.Vector3();
        this.swordGroup = new THREE.Group();
        this.swordInstance = null;
        this.swordCount = 50;
        this.swordPosMatrix = new THREE.Matrix4();
        this.swordRotateAngel = 0.0;

        this.controls = {

            key: new ControlKey(),
            ease: new THREE.Vector3(),
            upMovement: new THREE.Vector3(),
            position: new THREE.Vector3(),
            up: new THREE.Vector3(0, 1, 0),
            rotate: new THREE.Quaternion(),
            jumpVelocity: 20,
            current: ActionMode.IDLE,
            fadeDuration: 0.5,
            flyVelocity: 6,
            fallVelocity: 9,
            runVelocity: 5,
            walkVelocity: 1.8,
            rotateSpeed: 0.05,
            floorDecale: 0,
            swordRotationVelocity: 1,
        };
    }

    async init(container) {

        this.container = container;
        //
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, - 5);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x5e5d5d);
        this.scene.fog = new THREE.Fog(0x5e5d5d, 2, 20);

        this.clock = new THREE.Clock();

        const light = new THREE.DirectionalLight(0xFFFFFF, 3.5);
        light.position.set(1, 1, 1);
        this.scene.add(light);

        const ambientLight = new THREE.AmbientLight(0xffffff, 4.2);
        this.scene.add(ambientLight);

        this.modelGroup = new THREE.Group();
        this.scene.add(this.modelGroup);

        this.followGroup = new THREE.Group();
        this.scene.add(this.followGroup);

        const dirLight = new THREE.DirectionalLight(0xffffff, 5);
        dirLight.position.set(- 2, 5, - 3);
        dirLight.castShadow = true;
        const cam = dirLight.shadow.camera;
        cam.top = cam.right = 2;
        cam.bottom = cam.left = - 2;
        cam.near = 3;
        cam.far = 8;
        dirLight.shadow.bias = -0.005;
        dirLight.shadow.radius = 4;
        this.followGroup.add(dirLight);
        this.followGroup.add(dirLight.target);


        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.5;
        this.renderer.shadowMap.enabled = true;

        this.container.appendChild(this.renderer.domElement);

        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbitControls.target.set(0, 1, 0);
        this.orbitControls.enableDamping = true;
        this.orbitControls.enablePan = false;
        this.orbitControls.maxPolarAngle = PI90 - 0.05;
        this.orbitControls.update();



        const rgbeLoader = new RGBELoader().setPath('/textures/equirectangular/');
        const glbLoader = new GLTFLoader();

        const mTLLoader = new MTLLoader().setPath('/models/82-obj/sword/');
        const oBJLoader = new OBJLoader();

        const [env, gltf, swordMaterials] = await Promise.all([
            rgbeLoader.loadAsync('lobe.hdr'),
            glbLoader.loadAsync('/models/gltf/Soldier.glb'),
            mTLLoader.loadAsync('Sword.mtl'),
        ]);


        // 修正贴图路径
        swordMaterials.materialsInfo['Material.001']['map_kd'] = '195s_497_ud5be.jpg';
        swordMaterials.preload();
        const objModel = await oBJLoader.setMaterials(swordMaterials)
            .setPath('/models/82-obj/sword/')
            .loadAsync('Sword.obj');



        env.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = env;
        this.scene.environmentIntensity = 1.5;

        this.initSword(objModel);
        this.initFloor();
        this.createPlayer(gltf);
        //
        //
    }

    initSword(objModel) {

        const swordMesh = objModel.children[0];
        const swordGeometry = swordMesh.geometry;
        swordGeometry.computeBoundingBox();
        swordGeometry.boundingBox.getCenter(this.swordCenter);

        this.swordInstance = new THREE.InstancedMesh(swordGeometry, swordMesh.material, this.swordCount);
        this.swordInstance.frustumCulled = false;

        //this.swordInstance.position.copy(this.swordCenter.multiplyScalar(-1));
        this.swordInstance.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // will be updated every frame

        this.swordGroup.add(this.swordInstance);

        this.swordPosMatrix.makeTranslation(this.swordCenter.x, this.swordCenter.y, this.swordCenter.z);
        this.swordPosMatrix.invert();

        this.updateSwordAngle(this.swordRotateAngel);

        this.scene.add(this.swordGroup);
    }


    updateSwordAngle(initAngle) {
        const rotateSeg = PI * 2 / this.swordCount;
        // 默认垂直向下，先移动到原点，然后剑尖抬起90度，超前移动一定距离，然后绕圆心旋转,最后整体向上
        for (let i = 0; i < this.swordCount; i++) {
            offsetMatrix.makeTranslation(0, 1, 0);
            offsetHeardMatrix.makeTranslation(0, 0, 1.5);
            const angle = rotateSeg * i + initAngle;
            rotationMatrix.makeRotationAxis(mainAxis, angle);
            offsetMatrix.multiply(rotationMatrix).multiply(offsetHeardMatrix).multiply(rotationHeadMatrix).multiply(this.swordPosMatrix);
            this.swordInstance.setMatrixAt(i, offsetMatrix);
        }
        this.swordInstance.instanceMatrix.needsUpdate = true;
    }


    createPlayer(gltf) {

        this.gltfModel = gltf.scene;
        this.modelGroup.add(this.gltfModel);
        this.gltfModel.rotation.y = PI;
        this.modelGroup.rotation.y = PI;

        this.gltfModel.traverse((object) => {

            if (object.isMesh) {
                if (object.name === 'vanguard_Mesh') {
                    object.castShadow = true;
                    object.receiveShadow = true;
                    object.material.shadowSide = THREE.DoubleSide;
                    //object.material.envMapIntensity = 0.5;
                    object.material.metalness = 1.0;
                    object.material.roughness = 0.2;
                    object.material.color.set(1, 1, 1);
                    object.material.metalnessMap = object.material.map;
                } else {
                    object.material.metalness = 1;
                    object.material.roughness = 0;
                    object.material.transparent = true;
                    object.material.opacity = 0.8;
                    object.material.color.set(1, 1, 1);
                }
            }

        });


        this.skeleton = new THREE.SkeletonHelper(this.gltfModel);
        this.skeleton.visible = false;
        this.scene.add(this.skeleton);


        const animations = gltf.animations;

        this.mixer = new THREE.AnimationMixer(this.gltfModel);

        this.actions = {
            Idle: this.mixer.clipAction(animations[0]),
            Walk: this.mixer.clipAction(animations[3]),
            Run: this.mixer.clipAction(animations[1])
        };

        for (const m in this.actions) {
            this.actions[m].enabled = true;
            this.actions[m].setEffectiveTimeScale(1);
            if (m !== 'Idle') this.actions[m].setEffectiveWeight(0);
        }

        this.actions.Idle.play();
    }

    initFloor() {
        const size = 50;
        const repeat = 16;

        const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

        const floorT = new THREE.TextureLoader().load('/textures/floors/FloorsCheckerboard_S_Diffuse.jpg');
        floorT.colorSpace = THREE.SRGBColorSpace;
        floorT.repeat.set(repeat, repeat);
        floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping;
        floorT.anisotropy = maxAnisotropy;

        const floorN = new THREE.TextureLoader().load('/textures/floors/FloorsCheckerboard_S_Normal.jpg');
        floorN.repeat.set(repeat, repeat);
        floorN.wrapS = floorN.wrapT = THREE.RepeatWrapping;
        floorN.anisotropy = maxAnisotropy;

        const mat = new THREE.MeshStandardMaterial({
            map: floorT,
            normalMap: floorN,
            normalScale: new THREE.Vector2(0.5, 0.5),
            color: 0x404040,
            depthWrite: false,
            roughness: 0.85
        });

        const g = new THREE.PlaneGeometry(size, size, 50, 50);
        g.rotateX(-PI90);

        this.floor = new THREE.Mesh(g, mat);
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);

        this.controls.floorDecale = (size / repeat) * 4;
    }

    render() {
        const deltaTime = this.clock.getDelta();
        this.updateCharacter(deltaTime);
        this.updateSword(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    updateCharacter(delta) {

        const fade = this.controls.fadeDuration;
        const key = this.controls.key;
        const up = this.controls.up;
        const upMovement = this.controls.upMovement;
        const ease = this.controls.ease;
        const rotate = this.controls.rotate;
        const position = this.controls.position;
        const azimut = this.orbitControls.getAzimuthalAngle();

        const play = key.getCurrentAction();

        // change animation
        // auto fall
        upMovement.copy(key.getCurrentVerticalDirection());
        //如果没有跳起且玩家没有向上移动，则自动下落
        if (this.modelGroup.position.y > 0.01 && !(upMovement.y > 0.0)) {
            key.moveDown();
        }
        else {
            //key.stopUpDown();
        }

        if (this.controls.current !== play) {

            const current = this.actions[play];
            const old = this.actions[this.controls.current];
            this.controls.current = play;

            if (true) {
                current.reset();
                current.weight = 1.0;
                current.stopFading();
                old.stopFading();
                // sycro if not idle
                if (play !== ActionMode.IDLE) current.time = old.time * (current.getClip().duration / old.getClip().duration);
                old._scheduleFading(fade, old.getEffectiveWeight(), 0);
                current._scheduleFading(fade, current.getEffectiveWeight(), 1);
                current.play();
            } else {
                this.setWeight(current, 1.0);
                old.fadeOut(fade);
                current.reset().fadeIn(fade).play();
            }

        }

        // move object

        if (this.controls.current !== ActionMode.IDLE) {

            const upVelocity = upMovement.y > 0 ? this.controls.flyVelocity : this.controls.fallVelocity;
            upMovement.multiplyScalar(upVelocity * delta);


            // run/walk velocity
            const velocity = this.controls.current === ActionMode.RUN ? this.controls.runVelocity : this.controls.walkVelocity;

            // direction with key
            //如果水平有动作或者垂直无动作
            if (key.isHorizontalActive() || upMovement.y === 0) {
                ease.copy(key.getCurrentHorizontalDirection()).multiplyScalar(velocity * delta);
            }
            // calculate camera direction
            const angle = this.unwrapRad(Math.atan2(ease.x, ease.z) + azimut);
            rotate.setFromAxisAngle(up, angle);

            // apply camera angle on ease
            this.controls.ease.applyAxisAngle(up, azimut);

            if (position.y + upMovement.y < 0.0) {
                upMovement.y = 0.0 - position.y;
                key.stopUpDown();
            }

            position.add(ease).add(upMovement);
            this.camera.position.add(ease).add(upMovement);



            this.modelGroup.position.copy(position);
            this.modelGroup.quaternion.rotateTowards(rotate, this.controls.rotateSpeed);
            this.swordInstance.position.copy(position);

            this.orbitControls.target.copy(position).add({ x: 0, y: 1, z: 0 });
            this.followGroup.position.copy(position);

            // decale this.floor at infinie
            const dx = (position.x - this.floor.position.x);
            const dz = (position.z - this.floor.position.z);
            if (Math.abs(dx) > this.controls.floorDecale) this.floor.position.x += dx;
            if (Math.abs(dz) > this.controls.floorDecale) this.floor.position.z += dz;

        }

        this.mixer.update(delta);
        this.orbitControls.update();

    }


    updateSword(deltaTime) {
        this.swordRotateAngel += this.controls.swordRotationVelocity * deltaTime;
        if (this.swordRotateAngel >= 2 * Math.PI) {
            this.swordRotateAngel = this.swordRotateAngel - 2 * Math.PI;
        }
        this.updateSwordAngle(this.swordRotateAngel);
    }

    unwrapRad(r) {
        return Math.atan2(Math.sin(r), Math.cos(r));
    }

    setWeight(action, weight) {
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(weight);

    }

    onKeyDown(event) {

        const key = this.controls.key;
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': key.moveForward(); break;
            case 'ArrowDown': case 'KeyS': key.moveBackward(); break;
            case 'ArrowLeft': case 'KeyA': key.moveLeft(); break;
            case 'ArrowRight': case 'KeyD': key.moveRight(); break;
            case 'ShiftLeft': case 'ShiftRight': key.run(); break;
            case 'Space': key.moveUp(); break;
        }

    }

    onKeyUp(event) {

        const key = this.controls.key;
        switch (event.code) {
            case 'ArrowUp': case 'KeyW': key.stopForward(); break;
            case 'ArrowDown': case 'KeyS': key.stopBackward(); break;
            case 'ArrowLeft': case 'KeyA': key.stopLeft(); break;
            case 'ArrowRight': case 'KeyD': key.stopRight(); break;
            case 'ShiftLeft': case 'ShiftRight': key.stopRun(); break;
            case 'Space': key.stopUpDown(); break;

        }
    }

    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);

    }
}


export { GameViewer };