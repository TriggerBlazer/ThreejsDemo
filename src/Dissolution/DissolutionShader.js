/**
 * Full-screen textured quad shader
 */

const DissolutionShader = {

	name: 'DissolutionShader',

	uniforms: {

		'tNoise': { value: null },
		'tDiffuse': { value: null },
		'time': { value: 0 },
		'loopTime': { value: 1 },

	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

		uniform float time;
		uniform float loopTime;
		uniform sampler2D tDiffuse;
		uniform sampler2D tNoise;

		varying vec2 vUv;

		void main() {

			vec4 noise = texture2D( tNoise, vUv );
			vec4 texel = texture2D( tDiffuse, vUv );
			float ratio = time / loopTime;
			if(noise.r<(ratio - 0.1))
			{
				gl_FragColor = vec4(0.0,1.0,0.0,1.0);;
				return;
			}
			else if(noise.r<ratio) 
			{
				gl_FragColor = vec4(1.0,1.0,0.0,1.0);
				return;
			}
			gl_FragColor = texel;
		}`

};

export { DissolutionShader };
