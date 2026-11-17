// Tiny event bus between gameplay and presentation. Gameplay modules emit
// what happened (a receiver locked, a door unlocked, a trap got hit);
// sound, camera, HUD and effects subscribe. That keeps gameplay free of
// presentation calls, and lets real audio/art replace procedural cues
// later without touching puzzle code. Emitting with no listeners is a
// no-op, so headless tests are unaffected.
export function createEvents() {
  const listeners = new Map(); // name -> Set<fn>
  return {
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
      return () => listeners.get(name).delete(fn);
    },
    emit(name, payload) {
      for (const fn of listeners.get(name) ?? []) fn(payload);
    },
    clear() {
      listeners.clear();
    },
  };
}

// The game's one bus. It is for fan-out *feedback* (sound, camera, flashes):
// listeners run in subscription order with no guarantees between them.
// Steps that must happen in order and exactly once (spawn the player,
// close the shutter before the next level loads) use level-runtime.js's
// callbacks instead (onLevelLoaded / onExit / onGameComplete).
//
// Event names in use (emitter → payload):
//   receiver:on / receiver:off   receiver.js        { receiver }
//   switch:toggle                switch.js          { active }
//   trap:on / trap:off           blocker.js         { blocker }
//   door:unlock / door:lock      door.js            { door }
//   door:moving / door:settled   door.js            { door, opening }
//   portal:player                level-runtime.js   { portal }
//   grab / release               manipulation.js    { controller }
//   press                        manipulation.js    {}  (one-shot activate)
//   rotate:tick / rail:limit     affordances.js     {}
//   level:enter                  level-runtime.js   { index, count, data }
//   level:exit                   level-runtime.js   { index }
//   game:complete                level-runtime.js   { stats }
// door:lock, trap:off and press currently have no listener; they're emitted
// for symmetry with their counterparts, which do.
export const events = createEvents();
