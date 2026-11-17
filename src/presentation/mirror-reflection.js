import * as THREE from 'three';
import { Reflector } from '../../vendor/three/addons/Reflector.js';
import { browserStorage, readKey, writeKey } from '../core/storage.js';

// Real planar mirror reflections (menu "Reflexos", on by default). Each face of a
// mirror plate gets a Three.js Reflector: before the main render, the
// scene is rendered again from the player camera *reflected across the
// plate's plane* (Householder reflection of position, view and up), into a
// texture the plate then samples in screen space. An oblique near plane
// (Lengyel) clips everything behind the mirror. Plain rasterisation — not
// ray tracing (spec §14).
//
// Cost control:
//   - a face only renders when it's on screen (frustum culling skips
//     onBeforeRender) and facing the camera (Reflector's own check), so
//     at most one face per visible mirror renders per frame;
//   - reflector surfaces live on REFLECTOR_LAYER, which the reflection
//     cameras don't see: a mirror inside a mirror shows the plate's
//     ordinary metal, so no recursive renders, ever. The aim raycaster
//     only tests layer 0, so the surfaces never steal the aim either.
//
// The laser tracer is unaffected: it works on the plate's geometric
// segment (mirror.js getReflectiveSegment), not on what is drawn.
export const REFLECTOR_LAYER = 1;
// Reflection texture per graphics quality ("Qualidade"): size in texels
// and MSAA samples. Note the frame cost is mostly the extra scene pass,
// not these (docs/findings.md); they set how sharp the mirror looks.
export const REFLECTION_QUALITY = {
  high: { size: 512, samples: 4 },
  low: { size: 256, samples: 0 },
};
const INSET = 0.94; // the plate's own edge stays visible as a thin frame
// Overlay-blend tint (Reflector's shader): below mid-grey darkens the
// reflection, so a mirror never outshines the beams (PIPE-05).
const TINT = new THREE.Color(0x9aa3a8);
const TINT_HOVER = new THREE.Color(0xc4ccd0);

// Whether mirrors get reflector surfaces at all: main.js turns this on;
// headless tests leave it off. Showing/hiding them is separate (below).
let enabled = false;
let settings = REFLECTION_QUALITY.high;
export function setMirrorReflections(value) {
  enabled = value;
}

// Applies to mirrors created from now on and, given the live scene, to
// the existing ones immediately (their render targets are rebuilt).
export function setReflectionQuality(quality, scene = null) {
  settings = REFLECTION_QUALITY[quality] ?? REFLECTION_QUALITY.high;
  scene?.traverse((object) => {
    if (!object.isReflector) return;
    const target = object.getRenderTarget();
    target.dispose(); // frees GPU buffers; they're re-created on next render
    target.samples = settings.samples;
    target.setSize(settings.size, settings.size);
  });
}

// The player's on/off choice, applied instantly by toggling
// REFLECTOR_LAYER on the player camera: off, the surfaces are neither
// drawn nor re-render the scene (onBeforeRender only runs for drawn
// objects), and the plate's env-mapped metal shows instead.
const SETTING_KEY = 'feixe.reflections';

export function loadReflectionsOn(storage = browserStorage()) {
  return readKey(storage, SETTING_KEY) !== 'off';
}

export function saveReflectionsOn(on, storage = browserStorage()) {
  writeKey(storage, SETTING_KEY, on ? 'on' : 'off');
}

export function showReflections(camera, on) {
  if (on) camera.layers.enable(REFLECTOR_LAYER);
  else camera.layers.disable(REFLECTOR_LAYER);
}

// Returns null when disabled (headless tests): the mirror then keeps its
// env-mapped metal only.
export function createMirrorReflection(width, height, thickness) {
  if (!enabled) return null;
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(width * INSET, height * INSET);
  const faces = [];
  for (const side of [1, -1]) { // mirrors reflect on both faces
    const face = new Reflector(geometry, {
      textureWidth: settings.size,
      textureHeight: settings.size,
      color: TINT,
      multisample: settings.samples,
    });
    face.position.z = side * (thickness / 2 + 0.002);
    if (side < 0) face.rotation.y = Math.PI;
    face.layers.set(REFLECTOR_LAYER);
    hideReflectorsFromReflection(face);
    group.add(face);
    faces.push(face);
  }

  return {
    object: group,
    setHighlight(on) {
      for (const face of faces) face.material.uniforms.color.value.copy(on ? TINT_HOVER : TINT);
    },
  };
}

// Reflector clones the player camera (layers included) for its virtual
// camera; take the reflector layer off that clone.
function hideReflectorsFromReflection(face) {
  const getCamera = face.getReflectionCamera;
  face.getReflectionCamera = function (camera) {
    const reflectionCamera = getCamera.call(this, camera);
    reflectionCamera.layers.disable(REFLECTOR_LAYER);
    return reflectionCamera;
  };
}
