import * as THREE from 'three';

import { PathGeometry, PathPointList } from './path.module.js';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let container;

let camera, scene, renderer, arrow, controls, step, clock, stepPoints;

let npc, npcMixer, standAction, walkAction, segment, relativeCameraOffset;

init();
function init() {


    container = document.getElementById('container');
    //
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 500);
    camera.position.set(100, 100, 100);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    clock = new THREE.Clock();

    const light = new THREE.DirectionalLight(0xFFFFFF, 3.5);
    scene.add(light);


    renderer = new THREE.WebGLRenderer();
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
        // 设定好的坐标
        const pointArr = [
            121.78093686863522, 0, -4.603376409073572,
            121.81339509799925, 0, -1.0333897782644268,
            88.18838269349277, 0, -1.0333897782644268,
            88.18838269349277, 0, 63.55900780432629,
            87.16531645200739, 0, 68.04794277498671,
            83.06620769318347, 0, 70.98695971872945,
            -1.130897005741467, 0, 70.34667258938468,
            -5.231039038271652, 0, 68.42613876317515,
            -7.758389327064392, 0, 64.62409029746112,
            -7.758389327064392, 0, 46.44123345882236,
            -114.62656106119152, 0, 46.44123345882236,
            -119.82497669490243, 0, 44.45968445743292,
            -121.94606515130032, 0, 39.4725534305143,
            -121.94606515130032, 0, -42.76532835182727,
            -120.11831411582477, 0, -48.53850237391983,
            -116.83579669695663, 0, -49.908124030849784,
            78.54313968215955, 0, -49.908124030849784,
            85.10694214192533, 0, -50.16532666595109,
            89.88557886450108, 0, -55.064547179368375,
            89.88557886450108, 0, -93.93831946321087,
            91.96632492268847, 0, -98.37744840781204,
            95.1920071430169, 0, -100.1746448114269,
            152.736779207395, 0, -100.1746448114269,
            157.30932898344975, 0, -96.64823157224308,
            160.4735065923067, 0, -99.846029526487,
            302.4743190232127, 0, -99.846029526487,
            307.28097694970387, 0, -98.29435216740127,
            309.4249527931002, 0, -93.79194193938966,
            317.1439029555364, 0, -10.678271186410282,
            322.7256435681537, 0, 64.82345541146658,
            321.948957384584, 0, 69.41475711676998,
            269.58743740380316, 0, 71.05051147709406,
            163.1264743368946, 0, 71.05051147709406,
            159.53952961773413, 0, 68.13337162416227,
            159.53952961773413, 0, -4.677615417615058,
            124.42066238999215, 0, -4.677615417615058,
        ];

        // 将数组转为坐标数组
        let points = [];

        // 每3个元素组成一个坐标
        for (let i = 0; i < pointArr.length; i += 3) {

            // 将数组中的三个元素，分别作为坐标的x, y, z
            points.push(new THREE.Vector3(pointArr[i], pointArr[i + 1], pointArr[i + 2]));
        }

        // 重置步数索引
        step = 0;

        // 生成一条不闭合曲线
        const pathCurve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0);


        // 金色箭头的png作为材质
        arrow = new THREE.TextureLoader().load("/textures/arrow.png");

        // 贴图在水平方向上允许重复
        arrow.wrapS = THREE.RepeatWrapping;

        // 向异性
        arrow.anisotropy = renderer.capabilities.getMaxAnisotropy();

        // 创建一个合适的材质
        const material = new THREE.MeshPhongMaterial({
            map: arrow,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        // 确定一个向上的向量
        const up = new THREE.Vector3(0, 1, 0);

        // region 引入THREE.path包

        // 创建路径点的集合
        const pathPoints = new PathPointList();

        // 设置集合属性
        pathPoints.set(pathCurve.getPoints(1000), 0.5, 2, up, false);

        // 创建路径几何体
        const geometry = new PathGeometry();

        // 更新几何体的属性
        geometry.update(pathPoints, {
            width: 15,
            arrow: false
        });

        // 创建路径的网格模型
        const pathToShow = new THREE.Mesh(geometry, material);

        // 添加到场景
        scene.add(pathToShow);


        segment = 3000;

        // 从路径曲线上面取点
        stepPoints = pathCurve.getSpacedPoints(segment);

        // 相机的相对偏移向量, y = 1.0 让相机接近平视前方的效果， z = -5, 在NPC后5距离的位置。
        relativeCameraOffset = new THREE.Vector3(0, 1.2, -4);
    }


    {
        const loader = new GLTFLoader();

        // 加载NPC模型
        loader.load('/models/Xbot.glb', (obj) => {

            npc = obj.scene;
            npc.scale.set(10, 10, 10);
            npc.name = 'npc';

            // 将NPC模型添加到场景
            scene.add(npc);

            // 创建动画混合器绑定到NPC模型
            npcMixer = new THREE.AnimationMixer(npc);

            // 截取第二个动画，作为站立动画
            standAction = npcMixer.clipAction(obj.animations[1]);

            // 默认播放站立动画, 不然会展现“T-Pose”
            //walkAction.play();

            // 截取第三个动画，作为行走动画
            walkAction = npcMixer.clipAction(obj.animations[6]);

            walkAction.play();

            animate();
            renderer.setAnimationLoop(animate);

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

function animate() {

    const delta = clock.getDelta();

    arrow.offset.x -= 0.02;


    // 每次前进一小段
    step += 1;
    // NPC下个位置的索引
    const npcIndex = step % segment;

    // NPC下一个位置
    const npcPoint = stepPoints[npcIndex];

    // 更新NPC模型的位置
    npc.position.copy(npcPoint);

    // NPC眼睛看向的点的索引
    const eyeIndex = (step + 50) % segment;

    // NPC眼睛看向的位置
    const eyePoint = stepPoints[eyeIndex];

    // 更新NPC模型看向的位置，保证模型的“朝向”
    npc.lookAt(eyePoint.x, eyePoint.y, eyePoint.z);

    // 转换为相对NPC世界矩阵的坐标
    const targetCameraPosition = relativeCameraOffset.clone().applyMatrix4(npc.matrixWorld);

    // 更新相机的位置
    camera.position.set(targetCameraPosition.x, targetCameraPosition.y, targetCameraPosition.z);

    // 更新控制器的目标为NPC的位置
    controls.target.set(npc.position.x, targetCameraPosition.y, npc.position.z);
    controls.update();

    // 更新动画混合器
    npcMixer.update(delta);

    renderer.render(scene, camera);


}