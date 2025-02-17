import {
    Vector3,
    Group,
    TextureLoader,
    // SRGBColorSpace,
    BufferGeometry,
    Points,
    Clock,
    Float32BufferAttribute,
    DynamicDrawUsage,
} from "three";

import { RockMaterial } from "./RockMaterial";

const _vector3 = new Vector3();
const _gravity = new Vector3(); // 重力 (m/s²)
class Rockfall extends Group {
    constructor(opts) {
        super();
        this.sceneScale = 1.0;
        //重力加速度 1/2*g
        this.CONST_G = 9.8 * this.sceneScale;

        this.disPickable = true;
        this.autoAnimation = true;

        this.originSize = 30;
        this.originIntensity = 0.5;

        this.originPosition = new Vector3();
        this.emitVelocity = new Vector3();

        this.originYaw = 0;
        this.originPitch = 0;

        const scaleCoe = 1.0;

        this.stoneSize = 1.200 * scaleCoe;
        this.originStoneSize = 1.200 * scaleCoe;
        this.randomStoneScale = 0.3;

        this.emitPositionSpread = 1.0 * this.sceneScale;
        this.emitVelocitySpread = 1.0 * this.sceneScale;

        this.loader = new TextureLoader();
        this.zoomGis = 1.0;
        this.setOpts(opts);

        const texturePath = opts.texturePath;
        this.texture = new TextureLoader().load(texturePath);

        // if (EnableDeferredRendering) {
        //     this.texture.colorSpace = SRGBColorSpace;
        // }

        this.rockfallMaterial = new RockMaterial({
            depthTest: true,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });

        this.rockfallMaterial.uniforms.pointTexture.value = this.texture;


        const geometry = new BufferGeometry();

        this.positions = [];
        this.velocities = [];
        this.sizes = [];
        this.opacities = [];
        this.rotations = [];
        this.ages = [];
        //this.maxAges = [];
        this.lifeTime = 1.5;

        this.isRunning = true;
        this.particleNumber = 2000;

        this.clock = new Clock();

        for (let i = 0; i < this.particleNumber; i++) {

            const pos = this.getRandomPosition();
            this.positions.push(pos.x);
            this.positions.push(pos.y);
            this.positions.push(pos.z);

            const velocity = this.getRandomVelocity();
            this.velocities.push(velocity.x);
            this.velocities.push(velocity.y);
            this.velocities.push(velocity.z);

            this.resetLife(i);
            this.sizes.push(this.stoneSize + (Math.random() * 2 - 1) * this.stoneSize * this.randomStoneScale);
            this.opacities.push(1.0);
            this.rotations.push(this.getInitRotation());
        }

        geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage));
        geometry.setAttribute('opacity', new Float32BufferAttribute(this.opacities, 1).setUsage(DynamicDrawUsage));
        geometry.setAttribute('rotation', new Float32BufferAttribute(this.rotations, 1).setUsage(DynamicDrawUsage));

        geometry.setAttribute('size', new Float32BufferAttribute(this.sizes, 1));

        this.particleSystem = new Points(geometry, this.rockfallMaterial);
        this.particleSystem.rotation.x = -Math.PI / 2;
        this.add(this.particleSystem);

        this.floor = this.originPosition.z - 10 * this.sceneScale;

    }

    destroy() {
        this.particleSystem.geometry.dispose();
        this.particleSystem.material.dispose();
        this.remove(this.particleSystem);
        this.particleSystem = null;
        this.loader = null;
        this.update = () => { };
    }

    play() {
        this.isRunning = true;
    }

    stop() {
        this.isRunning = false;
    }

    setLifeTime(value) {
        this.lifeTime = value;
    }

    gerLifeTime() {
        return this.lifeTime;
    }

    setParticleNumber(value) {
        this.particleNumber = value;
    }

    getParticleNumber() {
        return this.particleNumber;
    }


    setVelocitySpread(value) {
        this.emitVelocitySpread = value * this.sceneScale;
    }

    getVelocitySpread() {
        return this.emitVelocitySpread / this.sceneScale;
    }


    update() {
        const geometry = this.particleSystem.geometry;
        const deltaTime = this.clock.getDelta(); // 获取时间增量
        if (deltaTime < 0.0001) return;
        if (this.isRunning === false) return;
        _gravity.set(0, 0, -this.CONST_G);
        //movement.add(velocity.clone().multiplyScalar(deltaTime)); // s = s + v * t

        const positions = geometry.attributes.position.array;
        const opacities = geometry.attributes.opacity.array;
        const rotations = geometry.attributes.rotation.array;


        for (let i = 0; i < this.particleNumber; i++) {
            this.ages[i] += deltaTime;
            opacities[i] = 1.0;
            if (this.ages[i] < 0.0) {
                opacities[i] = 0.0;
                continue;
            }

            this.velocities[i * 3] += _gravity.x * deltaTime;
            this.velocities[i * 3 + 1] += _gravity.y * deltaTime;
            this.velocities[i * 3 + 2] += _gravity.z * deltaTime;

            positions[i * 3] += this.velocities[i * 3] * deltaTime;
            positions[i * 3 + 1] += this.velocities[i * 3 + 1] * deltaTime;
            positions[i * 3 + 2] += this.velocities[i * 3 + 2] * deltaTime;

            this.rotations[i] += deltaTime;

            if (this.ages[i] >= this.lifeTime) { // 重置到顶部
                const pos = this.getRandomPosition();

                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;

                const velocity = this.getRandomVelocity();
                this.velocities[i * 3] = velocity.x;
                this.velocities[i * 3 + 1] = velocity.y;
                this.velocities[i * 3 + 2] = velocity.z;

                opacities[i] = 0.0;
                rotations[i] = this.getInitRotation();
                this.resetLife(i);
            }
        }
        geometry.attributes.position.needsUpdate = true; //
        geometry.attributes.opacity.needsUpdate = true; //
        geometry.attributes.rotation.needsUpdate = true; //
    }

    /*
     * 实时更新参数
     */
    effectOpt(opts) {
        this.setOpts(opts);
    }


    hide() {
        this.visible = false;
    }

    show() {
        this.visible = true;
    }

    setOpts(opts) {
        if (!opts) return;
        if (opts.originPitch !== undefined && opts.originPitch !== null) this.originPitch = opts.originPitch;
        if (opts.originYaw !== undefined && opts.originYaw !== null) this.originYaw = opts.originYaw;
        //if (opts.scale !== undefined && opts.scale !== null) this.stoneSize = opts.scale * this.originStoneSize
        //if (opts.scale !== undefined && opts.scale !== null && opts.scale <= 0.0) this.stoneSize = 0.0;
        if (opts.spread !== undefined && opts.spread !== null) this.emitPositionSpread = opts.spread * this.sceneScale;
        if (opts.velocitySpread !== undefined && opts.velocitySpread !== null) this.emitVelocitySpread = opts.velocitySpread * this.sceneScale;
        if (opts.originIntensity !== undefined && opts.originIntensity !== null) this.originIntensity = opts.originIntensity + 0.1;
        if (opts.isGis !== null && opts.isGis === true) this.zoomGis = 1000;
        if (opts.originPosition !== undefined && opts.originPosition !== null) {
            this.originPosition = opts.originPosition;
        }

        //落石默认负Z方向
        this.emitVelocity.set(
            Math.sin(this.originPitch) * Math.cos(this.originYaw),
            Math.sin(this.originPitch) * Math.sin(this.originYaw),
            -Math.cos(this.originPitch)
        );
        this.emitVelocity.multiplyScalar(this.originIntensity * this.sceneScale);
    }

    resetLife(i) {
        this.ages[i] = Math.random() * this.lifeTime - this.lifeTime; // 初始年龄为 0
        //this.maxAges[i] = 4;
    }


    getInitRotation() {
        return (Math.random() * 2 - 1) * Math.PI / 2;
    }

    getRandomPosition() {
        _vector3.x = this.originPosition.x + (Math.random() * 2 - 1) * this.emitPositionSpread;
        _vector3.y = this.originPosition.y + (Math.random() * 2 - 1) * this.emitPositionSpread;
        _vector3.z = this.originPosition.z + (Math.random() * 2 - 1) * this.emitPositionSpread * 0.3;
        return _vector3;
    }

    getRandomVelocity() {
        _vector3.x = this.emitVelocity.x + (Math.random() * 2 - 1) * this.emitVelocitySpread;
        _vector3.y = this.emitVelocity.y + (Math.random() * 2 - 1) * this.emitVelocitySpread;
        _vector3.z = this.emitVelocity.z + (Math.random() * 2 - 1) * this.emitVelocitySpread;
        return _vector3;
    }

}
export { Rockfall };