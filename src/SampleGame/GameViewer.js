import * as THREE from 'three';
import { ControlKey, ActionMode } from './ControlKey';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';



const PI = Math.PI;
const PI90 = Math.PI / 2;

const rotationHeadMatrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), -PI90);
const rotationMatrix = new THREE.Matrix4();
const offsetMatrix = new THREE.Matrix4();
const offsetHeardMatrix = new THREE.Matrix4();
const mainAxis = new THREE.Vector3(0, 1, 0);
const scratchVector_1 = new THREE.Vector3();
const scratchHeadMatrix_1 = new THREE.Matrix4();
const scratchQuaternion_1 = new THREE.Quaternion();
const controlPoint = new THREE.Vector3();
const defaultScale = new THREE.Vector3(1, 1, 1);


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
        this.swordShottingDistance = 0.0;
        this.swordShottingMaxDistance = 20.0;

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
            swordShottingVelocity: 0,
            swordShottingAcceleration: 50,
        };

        this.attackMode = {
            swordReady: false,
            pickUpSword: false,
            shotSwordReady: false,
            shotSword: false
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

        this.attackMode.swordReady = true;
        this.rotateRadius = 1.5;
        this.attackRadius = 4.0;
        this.attackTargets = [];

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
            offsetMatrix.makeTranslation(0, this.manHeight, 0);
            offsetHeardMatrix.makeTranslation(0, 0, this.rotateRadius);
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
        this.manHeight = 2.0 / 2.0;
        this.aimingPoint = new THREE.Vector3(0, this.manHeight, 10);


        const lineMaterial = new LineMaterial({
            color: 0x0000ff,
            linewidth: 3,

            dashed: false,
            alphaToCoverage: true,

        });
        const points = [];
        points.push(0, this.manHeight, 0.0);
        points.push(this.aimingPoint.x, this.aimingPoint.y, this.aimingPoint.z);

        const lineGeometry = new LineGeometry().setPositions(points);
        this.aimingLine = new Line2(lineGeometry, lineMaterial);
        this.aimingLine.computeLineDistances();
        this.aimingLine.scale.set(1, 1, 1);
        this.scene.add(this.aimingLine);
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
        TWEEN.update();
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
        this.aimingLine.position.copy(this.modelGroup.position);
        this.aimingLine.quaternion.copy(this.modelGroup.quaternion);

        this.mixer.update(delta);
        this.orbitControls.update();

    }

    unAttack() {
        this.attackMode.swordReady = true;
        this.attackMode.shotSword = false;
        this.attackMode.pickUpSword = false;
    }

    pickUpSword() {
        if (this.attackMode.shotSword === true) return;
        this.attackMode.swordReady = false;
        if (this.attackMode.shotSwordReady === true) {
            this.attackMode.shotSwordReady = false;
            this.attackMode.shotSword = true;
            return;
        }
        this.attackMode.pickUpSword = true;
        this.pickUpSwordTimeStart = Date.now();
        return;
        TWEEN.removeAll();
        this.attackTargets = [];
        const duration = 2000;
        for (let i = 0; i < this.swordCount; i++) {
            scratchVector_1.set(Math.random() - 0.5, Math.random() * 0.5, Math.random() - 0.5);
            controlPoint.copy(scratchVector_1).multiplyScalar(this.attackRadius).add(this.aimingPoint.clone());
            controlPoint.applyMatrix4(this.aimingLine.matrixWorld);

            const object = new THREE.Object3D();
            object.position.copy(this.aimingPoint.clone().applyMatrix4(this.aimingLine.matrixWorld));
            object.lookAt(controlPoint.multiplyScalar(1));

            this.swordInstance.getMatrixAt(i, scratchHeadMatrix_1);
            scratchHeadMatrix_1.decompose(scratchVector_1, scratchQuaternion_1, new THREE.Vector3());

            const curDuration = Math.random() * duration + duration;
            new TWEEN.Tween({ pos: scratchVector_1, qu: scratchQuaternion_1 })
                .to({ pos: object.position, qu: object.quaternion }, curDuration)
                .easing(TWEEN.Easing.Back.Out)
                .onUpdate((info) => {
                    scratchHeadMatrix_1.compose(info.pos, info.qu, defaultScale);
                    this.swordInstance.setMatrixAt(i, scratchHeadMatrix_1);
                    this.swordInstance.instanceMatrix.needsUpdate = true;
                })
                .start((i + 1) * 500);

            // const points = [];
            // points.push(scratchVector_1.add(this.swordCenter).add(new THREE.Vector3(0, this.manHeight, 0)));
            // points.push(controlPoint);
            // points.push(this.aimingPoint.clone().applyMatrix4(this.aimingLine.matrixWorld));

            // const pathCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 1.0);
            // const points2 = pathCurve.getPoints(100);
            // const geometry = new THREE.BufferGeometry().setFromPoints(points2);

            // const material = new THREE.LineBasicMaterial({ color: 0xff0000 });

            // const curveObject = new THREE.Line(geometry, material);
            // this.scene.add(curveObject);

            // offsetMatrix.makeTranslation(0, this.rotateRadius, 0);
            // offsetHeardMatrix.makeTranslation(0, 0, this.manHeight);
            // const angle = rotateSeg * i + initAngle;
            // rotationMatrix.makeRotationAxis(mainAxis, angle);
            // offsetMatrix.multiply(rotationMatrix).multiply(offsetHeardMatrix).multiply(rotationHeadMatrix).multiply(this.swordPosMatrix);
            // this.swordInstance.setMatrixAt(i, offsetMatrix);
        }

    }


    updateSword(deltaTime) {
        const mainSwordIndex = this.swordCount / 2;
        if (this.attackMode.swordReady === true) {
            this.swordRotateAngel += this.controls.swordRotationVelocity * deltaTime;
            if (this.swordRotateAngel >= 2 * Math.PI) {
                this.swordRotateAngel = this.swordRotateAngel - 2 * Math.PI;
            }
            this.updateSwordAngle(this.swordRotateAngel);
        } else if (this.attackMode.pickUpSword === true) {
            const timeNow = Date.now();
            const timePassed = (timeNow - this.pickUpSwordTimeStart) / 20;
            const unKnowMatrix = new THREE.Matrix4().makeTranslation(NaN, NaN, NaN);
            const rotateSeg = PI * 2 / this.swordCount;
            this.swordInstance.setMatrixAt(0, unKnowMatrix);
            for (let i = 0; i < mainSwordIndex; i++) {
                if (timePassed > mainSwordIndex) {
                    this.attackMode.pickUpSword = false;
                    this.attackMode.shotSwordReady = true;
                    return;
                }
                if (i >= mainSwordIndex - timePassed) {
                    this.swordInstance.setMatrixAt(mainSwordIndex + i, unKnowMatrix);
                    this.swordInstance.setMatrixAt(mainSwordIndex - i, unKnowMatrix);
                    continue;
                }
                offsetMatrix.makeTranslation(0, this.manHeight, 0);
                offsetHeardMatrix.makeTranslation(0, 0, this.rotateRadius);
                const angle1 = PI + i * rotateSeg;
                rotationMatrix.makeRotationAxis(mainAxis, angle1);
                offsetMatrix.multiply(rotationMatrix).multiply(offsetHeardMatrix).multiply(rotationHeadMatrix).multiply(this.swordPosMatrix);
                this.swordInstance.setMatrixAt(mainSwordIndex + i, offsetMatrix);
                offsetMatrix.makeTranslation(0, this.manHeight, 0);
                offsetHeardMatrix.makeTranslation(0, 0, this.rotateRadius);
                const angle2 = PI - i * rotateSeg;
                rotationMatrix.makeRotationAxis(mainAxis, angle2);
                offsetMatrix.multiply(rotationMatrix).multiply(offsetHeardMatrix).multiply(rotationHeadMatrix).multiply(this.swordPosMatrix);
                this.swordInstance.setMatrixAt(mainSwordIndex - i, offsetMatrix);
            }
            this.swordInstance.instanceMatrix.needsUpdate = true;
        } else if (this.attackMode.shotSwordReady === true) {
            offsetMatrix.makeTranslation(0, this.manHeight, 0);
            rotationMatrix.makeRotationFromQuaternion(this.modelGroup.quaternion);
            offsetMatrix.multiply(rotationMatrix).multiply(offsetHeardMatrix).multiply(rotationHeadMatrix).multiply(this.swordPosMatrix);
            this.swordInstance.setMatrixAt(mainSwordIndex, offsetMatrix);
            this.swordInstance.instanceMatrix.needsUpdate = true;
        } else if (this.attackMode.shotSword === true) {
            this.controls.swordShottingVelocity += this.controls.swordShottingAcceleration * deltaTime;
            this.swordShottingDistance += this.controls.swordShottingVelocity * deltaTime;
            offsetMatrix.makeTranslation(0, this.manHeight, 0);
            offsetHeardMatrix.makeTranslation(0, 0, this.rotateRadius + this.swordShottingDistance);
            rotationMatrix.makeRotationFromQuaternion(this.modelGroup.quaternion);
            offsetMatrix.multiply(rotationMatrix).multiply(offsetHeardMatrix).multiply(rotationHeadMatrix).multiply(this.swordPosMatrix);
            this.swordInstance.setMatrixAt(mainSwordIndex, offsetMatrix);
            this.swordInstance.instanceMatrix.needsUpdate = true;
            if (this.swordShottingDistance >= this.swordShottingMaxDistance) {
                this.controls.swordShottingVelocity = 0.0;
                this.swordShottingDistance = 0.0;
            }
        }
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
            case 'KeyJ': this.pickUpSword(); break;
            case 'KeyK': this.unAttack(); break;
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