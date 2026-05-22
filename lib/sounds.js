/** Lightweight order feedback using Web Audio API (no asset files). */

let audioCtx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function beep(freq, durationMs, type = 'sine', volume = 0.08) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    /* ignore */
  }
}

export function playOrderSuccess(enabled) {
  if (!enabled) return;
  beep(880, 80);
  setTimeout(() => beep(1100, 100), 90);
}

export function playOrderError(enabled) {
  if (!enabled) return;
  beep(220, 150, 'square', 0.05);
}
