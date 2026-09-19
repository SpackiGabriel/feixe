import * as THREE from 'three';

const HOVER_EMISSIVE = 0x333333;
const NO_EMISSIVE = 0x000000;

const _raycaster = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();

// Default hover feedback: tint the object gray. Objects whose material
// already carries meaning through emissive color (e.g. an emitter's laser
// color) provide their own `userData.setHovered` instead of using this.
function setHoverState(object, isHovered) {
  if (!object) return;
  if (typeof object.userData.setHovered === 'function') {
    object.userData.setHovered(isHovered);
    return;
  }
  object.material.emissive.setHex(isHovered ? HOVER_EMISSIVE : NO_EMISSIVE);
}

// "Aim and select" model (spec §4): a ray from the camera center picks the
// nearest interactive object under the crosshair. `interactiveObjects` is
// populated by later systems (mirrors, emitters); it starts empty here.
//
// Runs before renderer.render() each frame, so both the camera and any
// interactive object moved this frame (e.g. a dragged mirror) would
// otherwise still carry last frame's matrixWorld — force both up to date
// before raycasting instead of relying on the renderer to do it.
export function createInteraction(camera, scene, interactiveObjects) {
  let hovered = null;

  function update() {
    camera.updateMatrixWorld();
    scene.updateMatrixWorld();
    camera.getWorldPosition(_origin);
    camera.getWorldDirection(_direction);
    _raycaster.set(_origin, _direction);

    const hits = _raycaster.intersectObjects(interactiveObjects, false);
    const next = hits.length > 0 ? hits[0].object : null;

    if (next !== hovered) {
      setHoverState(hovered, false);
      setHoverState(next, true);
      hovered = next;
    }
  }

  return {
    update,
    getHovered: () => hovered,
  };
}
