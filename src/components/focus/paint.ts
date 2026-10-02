// Small drawing helpers shared by the Focus scenes and the dashboard sky.

export type Ctx = CanvasRenderingContext2D;
export const TAU = Math.PI * 2;

/** Seeded random numbers, so a scene looks the same every time it is built. */
export const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** An offscreen canvas drawn in CSS pixels at the given pixel ratio. */
export const layer = (w: number, h: number, dpr = 1) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const x = c.getContext("2d")!;
  x.scale(dpr, dpr);
  return { c, x };
};

export const vgrad = (x: Ctx, y0: number, y1: number, stops: [number, string][]) => {
  const g = x.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
};

const hex = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mix two hex colours; returns an rgb() string. */
export const mixHex = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};
export const rgba = (c: string, a: number) => {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
};

/** A soft round glow, drawn once and stamped with drawImage. */
export const glowSprite = (color: string, size = 64, core = 0.15) => {
  const { c, x } = layer(size, size);
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgba(color, 1));
  g.addColorStop(core, rgba(color, 0.7));
  g.addColorStop(0.45, rgba(color, 0.18));
  g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return c;
};

export const smooth = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** A ridge line made of a few sine waves, as a closed path down to the bottom. */
export const ridge = (w: number, h: number, base: number, amp: number, seed: number, rough = 1) => {
  const r = rng(seed);
  // Fewer hills across a narrow screen, so phones don't get spikes
  const k = Math.max(0.4, Math.min(1.2, w / 1280));
  const waves = Array.from({ length: 5 }, (_, i) => ({ f: (0.6 + r() * 1.6) * (i + 1) * rough * k, p: r() * TAU, a: amp / (i + 1.2) }));
  const p = new Path2D();
  p.moveTo(0, h);
  for (let x = 0; x <= w + 4; x += 4) {
    const u = x / w;
    let y = base;
    for (const v of waves) y -= Math.sin(u * v.f * TAU * 0.5 + v.p) * v.a;
    p.lineTo(x, y);
  }
  p.lineTo(w, h);
  p.closePath();
  return p;
};

/** Grain texture used to stop gradients from banding. */
export const grain = (size = 128, alpha = 0.05) => {
  const { c, x } = layer(size, size);
  const img = x.createImageData(size, size);
  const r = rng(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.round(r() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.round(alpha * 255);
  }
  x.putImageData(img, 0, 0);
  return c;
};
