import { browserStorage, readKey, writeKey } from '../core/storage.js';

// Procedural sound cues (no audio files). Each cue is named after what
// happened, and connectSfx() maps game events (src/core/events.js) to
// cues — so a future recorded sound replaces one function here and
// nothing else. Also the facility's ambient drone, which grows slightly
// stranger with each level (design-premise.md §7, progressive unreality).
//
// The AudioContext is created lazily on the first cue (browsers refuse to
// start one before a user gesture); in Node there's no AudioContext and
// every cue is a no-op.

const MUTE_KEY = 'feixe.muted';

let ctx = null;
let master = null;
let noiseBuffer = null;
let muted = readMuted();
let drone = null;
let motor = null;
let motorUsers = 0;

function readMuted() {
  return readKey(browserStorage(), MUTE_KEY) === '1';
}

function audio() {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(frequency, duration, { type = 'sine', gain = 0.1, delay = 0, endFrequency = null, attack = 0.005 } = {}) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t0);
  if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise(duration, { gain = 0.1, delay = 0, filter = 'bandpass', frequency = 1000, endFrequency = null, q = 1 } = {}) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(frequency, t0);
  if (endFrequency) f.frequency.exponentialRampToValueAtTime(endFrequency, t0 + duration);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(f).connect(g).connect(master);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + duration + 0.02);
}

// --- cues -------------------------------------------------------------

export const sfx = {
  hover: () => tone(2200, 0.03, { gain: 0.02 }),
  grab: () => {
    noise(0.05, { frequency: 1800, q: 3, gain: 0.14 });
    tone(150, 0.09, { type: 'triangle', gain: 0.1 });
  },
  release: () => tone(620, 0.07, { gain: 0.05, endFrequency: 420 }),
  tick: () => noise(0.018, { frequency: 3800, q: 6, gain: 0.09 }),
  railLimit: () => {
    tone(85, 0.14, { type: 'square', gain: 0.05 });
    noise(0.08, { filter: 'lowpass', frequency: 500, gain: 0.12 });
  },
  // Charge then lock: the rising sweep is the anticipation, the two bell
  // tones are the confirmation (spec RF06 "sonoro de confirmação").
  receiverOn: () => {
    tone(220, 0.24, { type: 'triangle', gain: 0.06, endFrequency: 660 });
    tone(880, 0.22, { gain: 0.07, delay: 0.24 });
    tone(1320, 0.35, { gain: 0.04, delay: 0.26 });
  },
  receiverOff: () => tone(440, 0.18, { gain: 0.04, endFrequency: 170 }),
  trapOn: () => {
    tone(110, 0.45, { type: 'sawtooth', gain: 0.05 });
    tone(117, 0.45, { type: 'sawtooth', gain: 0.05 });
    noise(0.3, { frequency: 700, q: 2, gain: 0.05 });
  },
  switchToggle: (active) => {
    noise(0.04, { frequency: 2500, q: 4, gain: 0.12 });
    tone(active ? 520 : 380, 0.12, { type: 'triangle', gain: 0.07, delay: 0.03 });
  },
  doorUnlock: () => {
    noise(0.09, { frequency: 1300, q: 5, gain: 0.16 });
    tone(190, 0.1, { type: 'square', gain: 0.04 });
    noise(0.06, { frequency: 1600, q: 5, gain: 0.12, delay: 0.12 });
  },
  doorOpened: () => tone(130, 0.2, { type: 'triangle', gain: 0.08 }),
  doorThud: () => {
    tone(58, 0.35, { gain: 0.22 });
    noise(0.22, { filter: 'lowpass', frequency: 260, gain: 0.25 });
  },
  portal: () => {
    noise(0.4, { frequency: 260, endFrequency: 3200, q: 2, gain: 0.16 });
    tone(330, 0.35, { gain: 0.04, endFrequency: 990 });
  },
  footstep: () => {
    noise(0.07, { filter: 'lowpass', frequency: 320, gain: 0.07 });
    tone(72, 0.05, { gain: 0.04 });
  },
  levelEnter: () => {
    tone(330, 0.5, { type: 'triangle', gain: 0.04 });
    tone(495, 0.7, { type: 'triangle', gain: 0.035, delay: 0.16 });
  },
  levelComplete: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { gain: 0.06, delay: i * 0.08 })),
  shutter: () => noise(0.12, { frequency: 900, endFrequency: 300, q: 1.5, gain: 0.08 }),
  ending: () => {
    tone(55, 6, { type: 'sawtooth', gain: 0.05, attack: 2, endFrequency: 110 });
    tone(82.5, 6, { type: 'sawtooth', gain: 0.03, attack: 3, endFrequency: 165 });
  },
};

// A door motor hum while any door is moving (shared, reference-counted).
// The count is kept even without audio, so the bookkeeping is testable.
export function motorStart() {
  motorUsers++;
  const c = audio();
  if (!c) return;
  if (motor) {
    motor.gain.gain.setTargetAtTime(0.035, c.currentTime, 0.05);
    return;
  }
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 52;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 260;
  const g = c.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(0.035, c.currentTime, 0.05);
  osc.connect(f).connect(g).connect(master);
  osc.start();
  motor = { osc, gain: g };
}

export function motorStop() {
  motorUsers = Math.max(0, motorUsers - 1);
  if (motorUsers === 0 && motor && ctx) motor.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
}

// A level (re)load disposes its doors without a 'door:settled' — R while a
// door moves, or leaving through an exit still lifting — so the count
// would never return to zero and the hum would play for the rest of the
// session. Every level starts silent.
export function motorReset() {
  motorUsers = 0;
  if (motor && ctx) motor.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
}

export const getMotorUsers = () => motorUsers;

// Ambient room tone: two detuned low saws and filtered air. `intensity`
// 0..1 follows level progress — more detune, a brighter filter and a
// tritone creeping in late (progressive unreality).
export function setDroneIntensity(intensity) {
  const c = audio();
  if (!c) return;
  if (!drone) {
    const out = c.createGain();
    out.gain.value = 0;
    out.gain.setTargetAtTime(0.03, c.currentTime, 2);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 160;
    filter.connect(out).connect(master);
    const make = (freq) => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.connect(filter);
      o.start();
      return o;
    };
    make(55);
    const b = make(55);
    const tritone = c.createOscillator();
    tritone.type = 'sine';
    tritone.frequency.value = 55 * Math.SQRT2;
    const tritoneGain = c.createGain();
    tritoneGain.gain.value = 0;
    tritone.connect(tritoneGain).connect(out);
    tritone.start();
    const air = c.createBufferSource();
    air.buffer = noiseBuffer;
    air.loop = true;
    const airFilter = c.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.value = 420;
    const airGain = c.createGain();
    airGain.gain.value = 0.18;
    air.connect(airFilter).connect(airGain).connect(out);
    air.start();
    drone = { b, filter, tritoneGain };
  }
  const t = c.currentTime;
  drone.b.detune.setTargetAtTime(6 + intensity * 30, t, 1.5);
  drone.filter.frequency.setTargetAtTime(150 + intensity * 260, t, 1.5);
  drone.tritoneGain.gain.setTargetAtTime(Math.max(0, intensity - 0.5) * 0.5, t, 2);
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  writeKey(browserStorage(), MUTE_KEY, value ? '1' : '0');
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.9, ctx.currentTime, 0.05);
}

// Maps game events to cues. Called once from main.js.
export function connectSfx(events) {
  events.on('receiver:on', sfx.receiverOn);
  events.on('receiver:off', sfx.receiverOff);
  events.on('switch:toggle', ({ active }) => sfx.switchToggle(active));
  events.on('trap:on', sfx.trapOn);
  events.on('door:unlock', sfx.doorUnlock);
  events.on('door:moving', motorStart);
  events.on('door:settled', ({ opening }) => {
    motorStop();
    if (opening) sfx.doorOpened();
    else sfx.doorThud();
  });
  events.on('portal:player', sfx.portal);
  events.on('grab', sfx.grab);
  events.on('release', sfx.release);
  events.on('rotate:tick', sfx.tick);
  events.on('rail:limit', sfx.railLimit);
  events.on('level:enter', ({ index, count }) => {
    motorReset();
    sfx.levelEnter();
    setDroneIntensity(count > 1 ? index / (count - 1) : 0);
  });
  events.on('level:exit', sfx.levelComplete);
  events.on('game:complete', sfx.ending);
}
