import * as THREE from 'three';

// Our own Blinn-Phong material (enunciado §3, axis III): an empirical local
// lighting model with explicit ambient, diffuse and specular coefficients,
// written as a shader instead of Three's ready-made PBR material. Used for
// the room's walls and floor and every interior wall — the surfaces the
// beams' point lights land on.
//
// For each point, with N the surface normal, V the direction to the eye,
// L the direction to a light, H = normalize(L + V) and I_light its
// colour × intensity × distance attenuation:
//
//   colour = albedo · (ka·Ia + Σ kd·max(N·L, 0)·I_light) / π
//          + Σ ks·max(N·H, 0)^n · I_light        (only where N·L > 0)
//
// albedo = uColor × texture (the diffuse colour); Ia = ambient light plus
// the hemisphere light's sky/ground blend for this normal. The 1/π is
// Three's light-unit convention (a normalised Lambert term: ∫cosθ dω = π
// over the hemisphere), so the diffuse and ambient terms match the PBR
// material these surfaces used before (whose diffuse was albedo × (1 −
// metalness 0.05) / π). The specular term is plain textbook Blinn-Phong,
// not normalised, and is not meant to match the old GGX highlight.
//
// The same lighting function runs either per fragment (Phong shading: the
// normal is interpolated, lighting computed per pixel — the default) or
// per vertex (Gouraud: lighting computed at the vertices, the colour
// interpolated). Key L toggles it live: a wall face is two triangles, so
// per vertex a beam's light spot in the middle of a wall disappears.

// Coefficients per surface (dimensionless; shininess = the exponent n).
export const PHONG = {
  wall: { ka: 0.95, kd: 0.95, ks: 0.04, shininess: 12 },
  floor: { ka: 1, kd: 1, ks: 0.08, shininess: 32 },
};

const INV_PI = '0.3183098861837907';

// Light uniforms are Three's own (`lights: true` fills them every frame,
// positions and directions already in view space); the structs only have
// to match its names. NUM_*_LIGHTS are replaced by Three with the scene's
// light counts, and the shader recompiles when those change.
const lighting = /* glsl */ `
  uniform vec3 ambientLightColor;
  uniform float uKa;
  uniform float uKd;
  uniform float uKs;
  uniform float uShininess;

  #if NUM_DIR_LIGHTS > 0
    struct DirectionalLight { vec3 direction; vec3 color; };
    uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
  #endif
  #if NUM_POINT_LIGHTS > 0
    struct PointLight { vec3 position; vec3 color; float distance; float decay; };
    uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
  #endif
  #if NUM_HEMI_LIGHTS > 0
    struct HemisphereLight { vec3 direction; vec3 skyColor; vec3 groundColor; };
    uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
  #endif

  // One light's diffuse and specular contribution (L and V unit vectors).
  void addLight( vec3 L, vec3 light, vec3 N, vec3 V, inout vec3 diffuse, inout vec3 specular ) {
    float NdotL = max( dot( N, L ), 0.0 );
    diffuse += uKd * NdotL * light * ${INV_PI};
    if ( NdotL > 0.0 ) {
      vec3 H = normalize( L + V );
      specular += uKs * pow( max( dot( N, H ), 0.0 ), uShininess ) * light;
    }
  }

  // P: point in view space (the eye is at the origin); N: unit normal.
  // diffuse multiplies the albedo; specular is added on top.
  void blinnPhong( vec3 P, vec3 N, out vec3 diffuse, out vec3 specular ) {
    vec3 V = normalize( -P );
    vec3 ambient = ambientLightColor;
    #if NUM_HEMI_LIGHTS > 0
      for ( int i = 0; i < NUM_HEMI_LIGHTS; i++ ) {
        float w = 0.5 * dot( N, hemisphereLights[ i ].direction ) + 0.5;
        ambient += mix( hemisphereLights[ i ].groundColor, hemisphereLights[ i ].skyColor, w );
      }
    #endif
    diffuse = uKa * ambient * ${INV_PI};
    specular = vec3( 0.0 );
    #if NUM_DIR_LIGHTS > 0
      for ( int i = 0; i < NUM_DIR_LIGHTS; i++ ) {
        addLight( directionalLights[ i ].direction, directionalLights[ i ].color, N, V, diffuse, specular );
      }
    #endif
    #if NUM_POINT_LIGHTS > 0
      for ( int i = 0; i < NUM_POINT_LIGHTS; i++ ) {
        vec3 toLight = pointLights[ i ].position - P;
        float d = length( toLight );
        // Inverse-square falloff (decay 2), faded to zero at \`distance\`.
        float attenuation = 1.0 / max( pow( d, pointLights[ i ].decay ), 0.01 );
        if ( pointLights[ i ].distance > 0.0 ) {
          float edge = clamp( 1.0 - pow( d / pointLights[ i ].distance, 4.0 ), 0.0, 1.0 );
          attenuation *= edge * edge;
        }
        addLight( toLight / d, pointLights[ i ].color * attenuation, N, V, diffuse, specular );
      }
    #endif
  }
`;

const vertexShader = /* glsl */ `
  uniform mat3 uvTransform;
  varying vec2 vUv;
  #ifdef PER_VERTEX
    varying vec3 vDiffuse;
    varying vec3 vSpecular;
    ${lighting}
  #else
    varying vec3 vViewPosition;
    varying vec3 vNormal;
  #endif
  #include <fog_pars_vertex>

  void main() {
    vUv = ( uvTransform * vec3( uv, 1.0 ) ).xy;
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    // normalMatrix = inverse transpose of the model-view 3x3: the general
    // rule that keeps a normal perpendicular to the surface under
    // non-uniform scale (from n·t = 0 for every tangent t). For our scaled
    // boxes each face normal lies along a scale axis, so only its length
    // would change; it matters for oblique normals (a scaled cylinder).
    vec3 N = normalize( normalMatrix * normal );
    #ifdef PER_VERTEX
      blinnPhong( mvPosition.xyz, N, vDiffuse, vSpecular );
    #else
      vViewPosition = mvPosition.xyz;
      vNormal = N;
    #endif
    gl_Position = projectionMatrix * mvPosition; // the GPU then divides by w
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform sampler2D map;
  varying vec2 vUv;
  #ifdef PER_VERTEX
    varying vec3 vDiffuse;
    varying vec3 vSpecular;
  #else
    varying vec3 vViewPosition;
    varying vec3 vNormal;
    ${lighting}
  #endif
  #include <fog_pars_fragment>

  void main() {
    vec3 albedo = uColor * texture2D( map, vUv ).rgb;
    vec3 diffuse;
    vec3 specular;
    #ifdef PER_VERTEX
      diffuse = vDiffuse;
      specular = vSpecular;
    #else
      // Re-normalise: interpolating unit normals shortens them.
      blinnPhong( vViewPosition, normalize( vNormal ), diffuse, specular );
    #endif
    gl_FragColor = vec4( albedo * diffuse + specular, 1.0 );
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

let shadingMode = 'fragment'; // 'fragment' (Phong) | 'vertex' (Gouraud)
const materials = new Set();

function applyMode(material) {
  if (shadingMode === 'vertex') material.defines.PER_VERTEX = '';
  else delete material.defines.PER_VERTEX;
  material.needsUpdate = true; // the define changes the program: recompile
}

// `map` may carry its own repeat/offset (texture.matrix): built-in
// materials apply it for us, a ShaderMaterial has to do it itself.
export function createPhongMaterial({ map, color = 0xffffff, ka, kd, ks, shininess }) {
  map.updateMatrix();
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      {
        uColor: { value: new THREE.Color(color) },
        uKa: { value: ka },
        uKd: { value: kd },
        uKs: { value: ks },
        uShininess: { value: shininess },
        uvTransform: { value: new THREE.Matrix3() },
      },
    ]),
    vertexShader,
    fragmentShader,
    lights: true,
    fog: true,
  });
  // merge() clones values, so the texture is set after it.
  material.uniforms.map = { value: map };
  material.uniforms.uvTransform.value.copy(map.matrix);
  applyMode(material);
  materials.add(material);
  return material;
}

export function getShadingMode() {
  return shadingMode;
}

export function setShadingMode(mode) {
  shadingMode = mode === 'vertex' ? 'vertex' : 'fragment';
  for (const material of materials) applyMode(material);
  return shadingMode;
}

export function toggleShadingMode() {
  return setShadingMode(shadingMode === 'vertex' ? 'fragment' : 'vertex');
}

// Live access for the defence (?debug: window.__feixe.phong), e.g.
// __feixe.phong.materials()[0].uniforms.uKs.value = 0.5
export const getPhongMaterials = () => [...materials];
