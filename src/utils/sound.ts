/**
 * Procedural Web Audio API sound generator for Bingo game audio feedback.
 * Requires no external audio files, works instantaneously, and includes global mute control.
 */

let audioCtx: AudioContext | null = null;
let isMuted = false;

// Initialize or resume context on user interaction
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundMuted(muted: boolean) {
  isMuted = muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('bingo_muted', muted ? '1' : '0');
  }
}

export function getSoundMuted(): boolean {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('bingo_muted');
    if (stored !== null) {
      isMuted = stored === '1';
    }
  }
  return isMuted;
}

// Gentle UI click
export function playClickSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

// Welcoming chime when joining or creating a room
export function playJoinRoomSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25]; // C5, E5
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0, now + idx * 0.08);
    gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.08 + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.22);
  });
}

// Satisfying tactile board-game daub click + pop (Web Audio API two-layer synthesis)
export function playDaubSound() {
  if (getSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Layer 1: Crisp mechanical switch click transient (1350Hz -> 360Hz snap)
  const clickOsc = ctx.createOscillator();
  const clickGain = ctx.createGain();
  clickOsc.type = 'sine';
  clickOsc.frequency.setValueAtTime(1350, now);
  clickOsc.frequency.exponentialRampToValueAtTime(360, now + 0.028);

  clickGain.gain.setValueAtTime(0.28, now);
  clickGain.gain.exponentialRampToValueAtTime(0.005, now + 0.028);

  clickOsc.connect(clickGain);
  clickGain.connect(ctx.destination);
  clickOsc.start(now);
  clickOsc.stop(now + 0.03);

  // Layer 2: Warm resonant stamp/pop body (320Hz -> 720Hz harmonic pop)
  const popOsc = ctx.createOscillator();
  const popGain = ctx.createGain();
  popOsc.type = 'triangle';
  popOsc.frequency.setValueAtTime(320, now + 0.012);
  popOsc.frequency.exponentialRampToValueAtTime(720, now + 0.085);

  popGain.gain.setValueAtTime(0.001, now);
  popGain.gain.linearRampToValueAtTime(0.26, now + 0.018);
  popGain.gain.exponentialRampToValueAtTime(0.008, now + 0.11);

  popOsc.connect(popGain);
  popGain.connect(ctx.destination);
  popOsc.start(now + 0.01);
  popOsc.stop(now + 0.115);
}

// Number reveal / ball draw announcement chime
export function playNumberCallSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [440, 554.37, 659.25]; // A4, C#5, E5 arpeggio
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);

    gain.gain.setValueAtTime(0, now + idx * 0.06);
    gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.06 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.25);
  });
}

// Line completed celebration bell
export function playLineCompleteSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  chords.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45 + idx * 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.55);
  });
}

// Victory fanfare
export function playVictorySound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const melody = [
    { freq: 523.25, delay: 0.00, dur: 0.15 }, // C5
    { freq: 659.25, delay: 0.14, dur: 0.15 }, // E5
    { freq: 783.99, delay: 0.28, dur: 0.15 }, // G5
    { freq: 1046.50, delay: 0.44, dur: 0.50 }, // C6
  ];

  melody.forEach(({ freq, delay, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + delay);

    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.22, now + delay + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + dur);
  });
}

// Crisp line snap sound for Dots & Boxes
export function playLineDrawSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}

// Resonant box completion chime
export function playBoxClaimSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [659.25, 880.0]; // E5, A5
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0.2, now + idx * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.08 + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.35);
  });
}

// Double celebration chime when completing 2 boxes in one move
export function playComboClaimSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [587.33, 739.99, 987.77]; // D5, F#5, B5
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.07);

    gain.gain.setValueAtTime(0.24, now + idx * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.07 + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.07);
    osc.stop(now + idx * 0.07 + 0.4);
  });
}

// Paper page flip swoosh
export function playPageFlipSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // White noise burst filtered as paper sweep
  const bufferSize = ctx.sampleRate * 0.12;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, now);
  filter.frequency.exponentialRampToValueAtTime(2400, now + 0.1);
  filter.Q.value = 3;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.12);
}

// Pencil doodle sketch sound
export function playPencilDrawSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(450, now);
  osc.frequency.linearRampToValueAtTime(680, now + 0.04);
  osc.frequency.linearRampToValueAtTime(320, now + 0.08);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.005, now + 0.09);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.09);
}

// Punchy paper gunshot BANG!
export function playGunshotSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Punchy low transient
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

  oscGain.gain.setValueAtTime(0.35, now);
  oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);

  // Noise crack
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.14);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.25, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.15);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.15);
}

// Impact thud when hitting target
export function playHitSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.14);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.14);
}

// Reload mechanical slide click
export function playReloadSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [0, 0.08].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(delay === 0 ? 900 : 1200, now + delay);
    osc.frequency.exponentialRampToValueAtTime(delay === 0 ? 400 : 600, now + delay + 0.04);

    gain.gain.setValueAtTime(0.12, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.005, now + delay + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 0.04);
  });
}

// Gun ready / lock & load fanfare
export function playGunReadySound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [440, 554.37, 659.25]; // A4, C#5, E5
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);

    gain.gain.setValueAtTime(0.18, now + idx * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.06 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.25);
  });
}

// Unified Sound Effects Library API
export const soundFX = {
  click: playClickSound,
  daub: playDaubSound,
  joinRoom: playJoinRoomSound,
  numberCall: playNumberCallSound,
  lineComplete: playLineCompleteSound,
  victory: playVictorySound,
  lineDraw: playLineDrawSound,
  boxClaim: playBoxClaimSound,
  comboClaim: playComboClaimSound,
  pageFlip: playPageFlipSound,
  pencilDraw: playPencilDrawSound,
  gunshot: playGunshotSound,
  hit: playHitSound,
  reload: playReloadSound,
  gunReady: playGunReadySound,
  isMuted: getSoundMuted,
  setMuted: setSoundMuted,
};
