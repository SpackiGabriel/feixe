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

// The game's one bus. Event names in use:
//   receiver:on / receiver:off        { receiver }
//   switch:toggle                     { sw, active }
//   trap:on / trap:off                { blocker }
//   door:unlock / door:lock           { door }
//   door:moving / door:settled        { door, opening }
//   portal:player                     { portal }
//   grab / release                    { controller }
//   rotate:tick / rail:limit          { controller }
//   level:enter                       { index, count, data }
//   level:exit                        { index }
//   game:complete                     {}
export const events = createEvents();
