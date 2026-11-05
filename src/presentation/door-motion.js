import { clamp01, easeInOutCubic, easeInCubic } from './motion.js';

// How long each part of a door's unlock sequence takes (seconds). The
// release waits for the receiver's charge + the conduit pulse to arrive
// (conduits.js), so the cause→effect chain reads in order.
export const DOOR_TIMING = {
  release: 0.5, // locked → clamps let go (anticipation)
  rise: 0.85, // full lift, ease-in-out
  close: 0.45, // full drop, accelerating (heavier than the lift)
  settle: 0.35, // small bounce after a full lift
};

// Openness at which the player fits under the panel (2.1 m of a 3 m door).
export const PASSABLE_OPENNESS = 0.7;

const RELEASE_DIP = 0.02; // metres the panel sags as the clamps let go
const SETTLE_BOUNCE = 0.03; // metres of overshoot after a full lift

// Pure door motion state machine (no Three.js). Gameplay decides whether
// the door is *unlocked* (door-logic.js); this decides where the panel
// physically is. Collision and the exit trigger read `passable`, so what
// blocks the player is always what they see. Any phase can be reversed:
// relocking mid-lift drops the panel from its current height, unlocking
// mid-drop lifts it again from where it is — never a jump.
//
// update() returns the name of a transition when one happens this frame
// ('released' | 'opened' | 'closing' | 'closed') or null, for sound/FX.
export function createDoorMotion(timing = DOOR_TIMING) {
  let phase = 'closed'; // closed | releasing | rising | open | closing
  let openness = 0; // 0 closed .. 1 fully up
  let from = 0; // openness when the current rise/drop started
  let t = 0; // seconds into the current phase

  function start(next) {
    phase = next;
    from = openness;
    t = 0;
  }

  function update(unlocked, deltaSeconds) {
    t += deltaSeconds;
    let event = null;

    if (unlocked) {
      if (phase === 'closed') start('releasing');
      else if (phase === 'closing') {
        start('rising');
        event = 'released';
      }
    } else if (phase === 'releasing') {
      start('closed'); // let go before the clamps released: nothing moved
    } else if (phase === 'rising' || phase === 'open') {
      start('closing');
      event = 'closing';
    }

    if (phase === 'releasing' && t >= timing.release) {
      start('rising');
      event = 'released';
    } else if (phase === 'rising') {
      const duration = Math.max(1e-6, timing.rise * (1 - from));
      const p = clamp01(t / duration);
      openness = from + (1 - from) * easeInOutCubic(p);
      if (p >= 1) {
        openness = 1;
        start('open');
        event = 'opened';
      }
    } else if (phase === 'closing') {
      const duration = Math.max(1e-6, timing.close * from);
      const p = clamp01(t / duration);
      openness = from * (1 - easeInCubic(p));
      if (p >= 1) {
        openness = 0;
        start('closed');
        event = 'closed';
      }
    }
    return event;
  }

  // Extra vertical offset in metres for presentation only (clamp sag, settle
  // bounce). Never affects `passable`.
  function visualOffset() {
    if (phase === 'releasing') return -RELEASE_DIP * clamp01(t / (timing.release * 0.4));
    if (phase === 'open' && t < timing.settle) {
      const p = t / timing.settle;
      return SETTLE_BOUNCE * Math.sin(p * Math.PI) * (1 - p);
    }
    return 0;
  }

  return {
    update,
    visualOffset,
    getPhase: () => phase,
    getOpenness: () => openness,
    isPassable: () => openness >= PASSABLE_OPENNESS,
    isMoving: () => phase === 'rising' || phase === 'closing',
  };
}
