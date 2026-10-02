import type { SoundId } from "./scenes";

// Ambient sound for the Focus room, synthesised with Web Audio: filtered
// noise, slow modulation and a few scheduled sparks. No audio files.

export const SOUNDS: { id: SoundId; name: string }[] = [
  { id: "rain", name: "Rain" },
  { id: "waves", name: "Waves" },
  { id: "wind", name: "Wind" },
  { id: "drone", name: "Deep hum" },
  { id: "fire", name: "Fireplace" },
  { id: "crickets", name: "Crickets" },
  { id: "brown", name: "Brown noise" },
];

type Voice = { out: GainNode; stop: () => void };

let ac: AudioContext | null = null;
let master: GainNode | null = null;
const voices = new Map<SoundId, Voice>();
const buffers: Partial<Record<"white" | "pink" | "brown", AudioBuffer>> = {};

const ctx = () => {
  if (!ac) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.8;
    master.connect(ac.destination);
  }
  return ac;
};

const noise = (kind: "white" | "pink" | "brown") => {
  const a = ctx();
  if (buffers[kind]) return buffers[kind]!;
  const len = a.sampleRate * 6;
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") d[i] = w * 0.5;
      else if (kind === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // Fade the loop seam
    const f = Math.floor(a.sampleRate * 0.05);
    for (let i = 0; i < f; i++) {
      const k = i / f;
      d[len - f + i] = d[len - f + i] * (1 - k) + d[i] * k;
    }
  }
  buffers[kind] = buf;
  return buf;
};

const loop = (kind: "white" | "pink" | "brown") => {
  const a = ctx();
  const s = a.createBufferSource();
  s.buffer = noise(kind);
  s.loop = true;
  s.loopStart = 0;
  s.loopEnd = s.buffer.duration - 0.05;
  s.playbackRate.value = 0.97 + Math.random() * 0.06;
  return s;
};

const filter = (type: BiquadFilterType, freq: number, q = 0.7) => {
  const f = ctx().createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
};

const lfo = (rate: number, depth: number, target: AudioParam) => {
  const a = ctx();
  const o = a.createOscillator();
  o.frequency.value = rate;
  const g = a.createGain();
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  return o;
};

/** Short sounds scheduled at random times (raindrops, crackles, chirps). */
const sparks = (every: () => number, fire: (at: number) => void) => {
  const a = ctx();
  let next = a.currentTime + every();
  const id = window.setInterval(() => {
    while (next < a.currentTime + 0.4) {
      fire(Math.max(next, a.currentTime));
      next += every();
    }
  }, 120);
  return () => window.clearInterval(id);
};

const build: Record<SoundId, (out: GainNode) => () => void> = {
  rain(out) {
    const a = ctx();
    const s = loop("pink");
    const hp = filter("highpass", 500), lp = filter("lowpass", 7000);
    const g = a.createGain();
    g.gain.value = 0.55;
    s.connect(hp).connect(lp).connect(g).connect(out);
    const low = loop("brown");
    const lg = a.createGain();
    lg.gain.value = 0.25;
    low.connect(filter("lowpass", 300)).connect(lg).connect(out);
    s.start();
    low.start();
    const white = noise("white");
    const stop = sparks(() => 0.012 + Math.random() * 0.06, (at) => {
      const n = a.createBufferSource();
      n.buffer = white;
      const bp = filter("bandpass", 1800 + Math.random() * 5200, 4 + Math.random() * 8);
      const e = a.createGain();
      const v = 0.05 + Math.random() * 0.16;
      e.gain.setValueAtTime(0, at);
      e.gain.linearRampToValueAtTime(v, at + 0.002);
      e.gain.exponentialRampToValueAtTime(0.0001, at + 0.03 + Math.random() * 0.05);
      const p = a.createStereoPanner();
      p.pan.value = Math.random() * 2 - 1;
      n.connect(bp).connect(e).connect(p).connect(out);
      n.start(at, Math.random() * 5, 0.1);
    });
    return () => { stop(); s.stop(); low.stop(); };
  },
  waves(out) {
    const a = ctx();
    const s = loop("brown");
    const lp = filter("lowpass", 700);
    const g = a.createGain();
    g.gain.value = 0.25;
    s.connect(lp).connect(g).connect(out);
    const o1 = lfo(0.085, 0.22, g.gain);
    const o2 = lfo(0.085, 450, lp.frequency);
    const foam = loop("pink");
    const fg = a.createGain();
    fg.gain.value = 0.06;
    foam.connect(filter("highpass", 2500)).connect(fg).connect(out);
    const o3 = lfo(0.085, 0.06, fg.gain);
    s.start();
    foam.start();
    return () => { s.stop(); foam.stop(); o1.stop(); o2.stop(); o3.stop(); };
  },
  wind(out) {
    const a = ctx();
    const s = loop("pink");
    const bp = filter("bandpass", 420, 0.9);
    const g = a.createGain();
    g.gain.value = 0.5;
    s.connect(bp).connect(g).connect(out);
    const o1 = lfo(0.05, 260, bp.frequency);
    const o2 = lfo(0.11, 0.25, g.gain);
    s.start();
    return () => { s.stop(); o1.stop(); o2.stop(); };
  },
  drone(out) {
    const a = ctx();
    const g = a.createGain();
    g.gain.value = 0.18;
    const lp = filter("lowpass", 600);
    lp.connect(g).connect(out);
    const freqs = [55, 82.41, 110.3, 164.81];
    const oscs = freqs.map((f, i) => {
      const o = a.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 8;
      const og = a.createGain();
      og.gain.value = [0.5, 0.25, 0.18, 0.08][i];
      o.connect(og).connect(lp);
      o.start();
      return o;
    });
    const l = lfo(0.03, 250, lp.frequency);
    const shimmer = loop("pink");
    const sg = a.createGain();
    sg.gain.value = 0.05;
    shimmer.connect(filter("bandpass", 1200, 6)).connect(sg).connect(out);
    shimmer.start();
    return () => { oscs.forEach((o) => o.stop()); l.stop(); shimmer.stop(); };
  },
  fire(out) {
    const a = ctx();
    const s = loop("brown");
    const g = a.createGain();
    g.gain.value = 0.4;
    s.connect(filter("lowpass", 450)).connect(g).connect(out);
    s.start();
    const o = lfo(0.3, 0.12, g.gain);
    const white = noise("white");
    const stop = sparks(() => (Math.random() < 0.15 ? 0.02 : 0.08 + Math.random() * 0.35), (at) => {
      const n = a.createBufferSource();
      n.buffer = white;
      const hp = filter("highpass", 1500 + Math.random() * 2500);
      const e = a.createGain();
      e.gain.setValueAtTime(0.0001, at);
      e.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.4, at + 0.001);
      e.gain.exponentialRampToValueAtTime(0.0001, at + 0.008 + Math.random() * 0.03);
      n.connect(hp).connect(e).connect(out);
      n.start(at, Math.random() * 5, 0.06);
    });
    return () => { stop(); s.stop(); o.stop(); };
  },
  crickets(out) {
    const a = ctx();
    const stop = sparks(() => 0.25 + Math.random() * 0.9, (at) => {
      const o = a.createOscillator();
      o.frequency.value = 4200 + Math.random() * 900;
      const e = a.createGain();
      e.gain.value = 0;
      const pulses = 3 + Math.floor(Math.random() * 4), gap = 0.045, v = 0.015 + Math.random() * 0.03;
      for (let k = 0; k < pulses; k++) {
        const t0 = at + k * gap;
        e.gain.setValueAtTime(0, t0);
        e.gain.linearRampToValueAtTime(v, t0 + 0.006);
        e.gain.linearRampToValueAtTime(0, t0 + 0.03);
      }
      const p = a.createStereoPanner();
      p.pan.value = Math.random() * 1.6 - 0.8;
      o.connect(e).connect(p).connect(out);
      o.start(at);
      o.stop(at + pulses * gap + 0.05);
    });
    const bed = loop("pink");
    const bg = a.createGain();
    bg.gain.value = 0.04;
    bed.connect(filter("lowpass", 900)).connect(bg).connect(out);
    bed.start();
    return () => { stop(); bed.stop(); };
  },
  brown(out) {
    const s = loop("brown");
    const g = ctx().createGain();
    g.gain.value = 0.5;
    s.connect(filter("lowpass", 900)).connect(g).connect(out);
    s.start();
    return () => s.stop();
  },
};

/** Make the mix match `mix` (0-1 per sound); sounds fade in and out. */
export const setMix = (mix: Partial<Record<SoundId, number>>, on: boolean) => {
  const want = new Set(on ? (Object.keys(mix) as SoundId[]).filter((k) => (mix[k] ?? 0) > 0.001) : []);
  if (!want.size && !voices.size) return;
  const a = ctx();
  if (a.state === "suspended") a.resume().catch(() => undefined);
  for (const [id, v] of voices) {
    if (want.has(id)) continue;
    v.out.gain.cancelScheduledValues(a.currentTime);
    v.out.gain.setTargetAtTime(0, a.currentTime, 0.4);
    const stop = v.stop;
    window.setTimeout(() => { try { stop(); } catch { /* already stopped */ } v.out.disconnect(); }, 2500);
    voices.delete(id);
  }
  for (const id of want) {
    const level = Math.pow(mix[id] ?? 0, 1.6);
    let v = voices.get(id);
    if (!v) {
      const out = a.createGain();
      out.gain.value = 0;
      out.connect(master!);
      v = { out, stop: build[id](out) };
      voices.set(id, v);
    }
    v.out.gain.cancelScheduledValues(a.currentTime);
    v.out.gain.setTargetAtTime(level, a.currentTime, 0.5);
  }
};

/** A soft bell for the end of a session. */
export const chime = (kind: "focus" | "break") => {
  try {
    const a = ctx();
    if (a.state === "suspended") a.resume().catch(() => undefined);
    const base = kind === "focus" ? 659.25 : 523.25;
    [0, 0.18, 0.36].forEach((delay, n) => {
      const t0 = a.currentTime + 0.05 + delay;
      const f = base * [1, 1.25, 1.5][n];
      for (const [mult, amp] of [[1, 0.22], [2.76, 0.06], [5.4, 0.025]] as const) {
        const o = a.createOscillator();
        o.frequency.value = f * mult;
        const g = a.createGain();
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(amp, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
        o.connect(g).connect(master!);
        o.start(t0);
        o.stop(t0 + 2.5);
      }
    });
  } catch {
    /* audio unavailable */
  }
};

export const stopAll = () => setMix({}, false);
