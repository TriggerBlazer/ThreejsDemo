import {
    ShaderMaterial,
    UniformsUtils,
    Clock,
} from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { DissolutionShader } from './DissolutionShader';

class DissolutionPass extends Pass {

    constructor(map, noiseMap, loopTime) {

        super();

        const shader = DissolutionShader;

        this.map = map;
        this.noiseMap = noiseMap;
        this.loopTime = (loopTime !== undefined) ? loopTime : 1.0;

        this.uniforms = UniformsUtils.clone(shader.uniforms);

        this.material = new ShaderMaterial({

            uniforms: this.uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader,
            transparent: false,
            depthTest: false,
            depthWrite: false,
            premultipliedAlpha: true

        });

        this.needsSwap = false;

        this.fsQuad = new FullScreenQuad(null);

        this.clock = new Clock();
        this.clock.start();

    }

    render(renderer, writeBuffer, readBuffer /*, deltaTime, maskActive */) {
        const oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        this.fsQuad.material = this.material;

        this.uniforms['tNoise'].value = this.noiseMap;
        this.uniforms['tDiffuse'].value = this.map;
        this.uniforms['loopTime'].value = this.loopTime;
        const eTime = this.clock.getElapsedTime();
        const reTime = (eTime * 1000) % (this.loopTime * 1000) / 1000.0;
        this.uniforms['time'].value = reTime;

        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
        if (this.clear) renderer.clear();
        this.fsQuad.render(renderer);

        renderer.autoClear = oldAutoClear;

    }

    dispose() {

        this.material.dispose();

        this.fsQuad.dispose();

    }

}

export { DissolutionPass };
