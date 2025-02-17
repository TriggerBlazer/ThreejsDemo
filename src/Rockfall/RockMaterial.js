import {
    ShaderMaterial
} from "three";
class RockMaterial extends ShaderMaterial {

    constructor(parameters) {

        super(parameters);

        this.uniforms = {
            pointTexture: { value: null },
        };

        this.clipping = true;
        this.vertexShader = this.getVertexShader();
        this.fragmentShader = this.getFragmentShader();
    }

    getVertexShader() {
        //          attribute float angle;
        //          varying float vAngle;
        //          vAngle = angle;
        return /*glsl */`
            attribute float size;
            attribute float opacity;
            attribute float rotation;
    
    
            varying vec3 vColor;
            varying float vOpacity;
            varying float vRotation;
            varying float clipSize;

            #include <common>
            #include <logdepthbuf_pars_vertex>
            //#include <clipping_planes_pars_vertex>
            void main() {
                vColor = color;
                vOpacity = opacity;
                vRotation = rotation;
    
                vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                //#include <clipping_planes_vertex>
                gl_PointSize = size * ( 300.0 / -mvPosition.z );
                clipSize = gl_PointSize * 0.5;
                gl_Position = projectionMatrix * mvPosition;
                #include <logdepthbuf_vertex>
            }`;
    }

    getFragmentShader() {

        //              varying float vAngle;
        //                  vec2 pos = rotate(vAngle)*gl_PointCoord;
        return /* glsl */`
                uniform sampler2D pointTexture;

                varying float vOpacity;
                varying float vRotation;
                varying float clipSize;
                
                varying vec3 vColor;
                #include <logdepthbuf_pars_fragment>
                //#include <clipping_planes_pars_fragment>
                void main() {
                    //#include <num_clipping_planes_for_particle_fragment>
                    if (vOpacity < 0.5) discard;
                    #include <logdepthbuf_fragment>
                    vec2 centeredCoord = gl_PointCoord - vec2(0.5, 0.5);
                    vec2 rotatedUV = vec2(
                        cos(vRotation) * centeredCoord.x - sin(vRotation) * centeredCoord.y,
                        sin(vRotation) * centeredCoord.x + cos(vRotation) * centeredCoord.y
                        );
                    vec2 finalCoord = rotatedUV + vec2(0.5, 0.5);	
                    gl_FragColor = vec4( vColor, 1.0 );
                    gl_FragColor = texture2D( pointTexture, finalCoord );
                }`;
    }
}
export { RockMaterial };