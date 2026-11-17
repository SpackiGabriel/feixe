import * as THREE from 'three';

const HOVER_EMISSIVE = 0x333333;
const NO_EMISSIVE = 0x000000;

const _raycaster = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();

// Hover feedback. Every gameplay object brings its own `userData.setHovered`
// (createManipulable in presentation/affordances.js, or switch.js), since
// their emissive colour carries meaning; the gray tint is the fallback for
// a plain mesh (ADR 0002, amendment).
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
// the whole definition of "selectable": level-loader.js fills it (and
// leaves out devices with no degree of freedom); it starts empty here.
//
// Runs before renderer.render() each frame, so both the camera and any
// interactive object moved this frame (e.g. a dragged mirror) would
// otherwise still carry last frame's matrixWorld — force both up to date
// before raycasting instead of relying on the renderer to do it.
//
// `getOccluders()` returns solid meshes (room/interior walls, doors,
// blockers): an interactive object behind one of them isn't selectable,
// so a closed door or wall really does keep the player's hands off what's
// behind it (it used to be possible to grab mirrors through walls).
export function createInteraction(camera, scene, interactiveObjects, getOccluders = () => []) {
  let hovered = null;

  function update() {
    camera.updateMatrixWorld();
    scene.updateMatrixWorld();
    camera.getWorldPosition(_origin);
    camera.getWorldDirection(_direction);
    _raycaster.set(_origin, _direction);

    const hits = _raycaster.intersectObjects(interactiveObjects, false);
    let next = hits.length > 0 ? hits[0].object : null;
    if (next) {
      _raycaster.far = hits[0].distance;
      if (_raycaster.intersectObjects(getOccluders(), false).length > 0) next = null;
      _raycaster.far = Infinity;
    }

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
