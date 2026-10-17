let ctx = null, muted = false;
try { muted = localStorage.getItem('tc_mute') === '1'; } catch (e) {}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  return ctx;
}
// iOS: ses ilk dokunuştan sonra açılır
['touchend', 'mousedown', 'keydown'].forEach(ev => addEventListener(ev, ac, { passive: true }));

function tone(f, dur, type, vol, f2) {
  const c = ac();
  if (!c || muted || c.state !== 'running') return;
  const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol, freq) {
  const c = ac();
  if (!c || muted || c.state !== 'running') return;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(c.destination);
  s.start();
}

export const sfx = {
  hit()    { noise(0.12, 0.9, 900); tone(160, 0.14, 'square', 0.35, 60); },
  hurt()   { noise(0.18, 0.8, 500); tone(120, 0.22, 'sawtooth', 0.4, 45); },
  breakB() { noise(0.1, 0.5, 1400); },
  place()  { tone(220, 0.08, 'triangle', 0.35, 150); },
  isMuted: () => muted,
  setMuted(v) {
    muted = !!v;
    try { localStorage.setItem('tc_mute', v ? '1' : '0'); } catch (e) {}
  }
};
