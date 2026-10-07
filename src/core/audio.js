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

const TONE_FREQUENCY = 880;
const TONE_DURATION = 0.2;
const TONE_GAIN = 0.2;

// Receiver activation confirmation (spec §8, RF06: "efeito ... sonoro de
// confirmação").
export function playConfirmTone() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(TONE_FREQUENCY, ctx.currentTime);
  gain.gain.setValueAtTime(TONE_GAIN, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + TONE_DURATION);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + TONE_DURATION);
}
