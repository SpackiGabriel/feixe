// Minimal procedural sound effects — no audio assets, matching the
// project's "everything procedural" approach (technical-preferences.md).
// The AudioContext is created lazily on first use, since browsers refuse
// to start one before a user gesture; by the time anything triggers a
// sound in-game, the pointer-lock click has already provided one.
let audioContext = null;

function getAudioContext() {
  if (typeof AudioContext === 'undefined') return null; // headless (Vitest/Node) — no audio
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

function playTone(frequency, duration, { type = 'sine', gain = 0.2, delay = 0, endFrequency = null } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gainNode.gain.setValueAtTime(gain, start);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gainNode).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

// Receiver activation / switch press (spec §8, RF06: "efeito ... sonoro de confirmação").
export function playConfirmTone() {
  playTone(880, 0.2);
}

// A trap blocker started being hit (spec §7 NOT) — low, buzzy, clearly "wrong".
export function playTrapTone() {
  playTone(140, 0.35, { type: 'sawtooth', gain: 0.08 });
}

// A door unlocked.
export function playDoorTone() {
  playTone(330, 0.5, { type: 'triangle', gain: 0.15, endFrequency: 660 });
}

// Level complete: a short rising arpeggio.
export function playLevelCompleteTone() {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 0.25, { gain: 0.15, delay: i * 0.09 }));
}
