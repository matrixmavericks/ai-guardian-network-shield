import { TAU, layer, rgba, ridge, rng, smooth, vgrad, type Ctx } from "@/components/focus/paint";
import type { Scene } from "@/components/focus/scenes";

// The sky over the dashboard greeting, set by the clock on the device:
// dawn, day, golden hour, dusk and night, with the sun and moon on their
// arcs, drifting clouds, stars, the odd shooting star and lights on the hills.

type RGB = [number, number, number];
const hx = (c: string): RGB => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lerp = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

// hour, top, middle, horizon
const KEYS: [number, RGB, RGB, RGB][] = (
  [
    [0, "#020617", "#0a1530", "#14264b"],
    [4.6, "#030a1e", "#0e1d3e", "#22325a"],
    [5.9, "#1b2456", "#6a4f97", "#e6907f"],
    [7.0, "#1d4aa0", "#4b86d6", "#f3bf96"],
    [9.0, "#1446a8", "#2c6fd4", "#7fb7ef"],
    [16.2, "#17489f", "#3577d2", "#92c3f0"],
    [17.7, "#2a3274", "#9a5591", "#f39a63"],
    [18.7, "#161c4b", "#43306f", "#a3527a"],
    [19.7, "#070d27", "#121f45", "#2a3260"],
    [24, "#020617", "#0a1530", "#14264b"],
  ] as [number, string, string, string][]
).map(([h, a, b, c]) => [h, hx(a), hx(b), hx(c)]);

const paletteAt = (hour: number) => {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= hour) i++;
  const [h0, a0, b0, c0] = KEYS[i];
  const [h1, a1, b1, c1] = KEYS[i + 1];
  const t = smooth(0, 1, (hour - h0) / (h1 - h0));
  return { top: lerp(a0, a1, t), mid: lerp(b0, b1, t), low: lerp(c0, c1, t) };
};

/** 1 at night, 0 by day. */
const nightness = (h: number) => 1 - smooth(5.2, 6.8, h) + smooth(18.6, 20.2, h);
/** 1 around sunrise and sunset. */
const golden = (h: number) => Math.max(smooth(5.4, 6.4, h) * (1 - smooth(7, 8.5, h)), smooth(16.4, 17.6, h) * (1 - smooth(18.8, 19.6, h)));

const hourNow = (override?: number) => {
  if (override !== undefined) return override;
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};

const cloudSprite = (color: string, seed: number) => {
  const r = rng(seed);
  const W = 260, H = 110;
  const { c, x } = layer(W, H);
  for (let i = 0; i < 9; i++) {
    const cx = 40 + r() * (W - 80), cy = H * 0.55 + (r() - 0.5) * 26, rad = 22 + r() * 30;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, rgba(color, 0.55));
    g.addColorStop(1, rgba(color, 0));
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, rad, 0, TAU);
    x.fill();
  }
  return c;
};

const moonSprite = () => {
  const { c, x } = layer(64, 64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(226,232,240,0.35)");
  g.addColorStop(1, "rgba(226,232,240,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  x.fillStyle = "#f1f5f9";
  x.beginPath();
  x.arc(32, 32, 9, 0, TAU);
  x.fill();
  x.globalCompositeOperation = "destination-out";
  x.beginPath();
  x.arc(37, 29, 8.2, 0, TAU);
  x.fill();
  return c;
};

/** Build the sky scene. `hour` pins the time (for previews); otherwise the device clock is used. */
export const makeSky = (hour?: number) => (w: number, h: number): Scene => {
  const r = rng(61);
  const horizon = h * 0.8;
  const far = ridge(w, h, h * 0.8, h * 0.09, 12, 1.2);
  const near = ridge(w, h, h * 0.92, h * 0.07, 14, 2);
  const stars = Array.from({ length: Math.round((w * h) / 2400) }, () => ({ x: r() * w, y: r() * horizon * 0.95, s: 0.5 + r() * r() * 1.4, p: r() * TAU, f: 0.5 + r() * 2 }));
  const white = cloudSprite("#ffffff", 3), warm = cloudSprite("#ffc4a8", 3);
  const clouds = Array.from({ length: Math.max(4, Math.round(w / 170)) }, (_, i) => ({ x: r() * (w + 300) - 150, y: h * (0.08 + r() * 0.5), k: 0.6 + r() * 0.9, v: 4 + r() * 8, i }));
  const moon = moonSprite();
  // Lights in the houses on the near hills (only those that land on the hillside)
  const probe = layer(1, 1).x;
  const lights = Array.from({ length: Math.round(w / 9) }, () => ({ x: r() * w, y: h * (0.88 + r() * 0.11), p: r() * TAU, f: 0.3 + r() * 1.2, warm: r() < 0.8 })).filter((l) =>
    probe.isPointInPath(near, l.x, l.y - 3),
  );
  const grad = layer(1, Math.ceil(h), 1);
  let flock = { t: 2 + r() * 6, x: -40, y: 0, v: 0, n: 0 };
  let shoot = { t: 3 + r() * 8, x: 0, y: 0, vx: 0, vy: 0, life: 0 };

  return {
    draw(ctx: Ctx, t: number, dt: number) {
      const H = hourNow(hour);
      const pal = paletteAt(H);
      const night = nightness(H), gold = golden(H);
      // Sky
      grad.x.clearRect(0, 0, 1, h);
      grad.x.fillStyle = vgrad(grad.x, 0, horizon, [[0, css(pal.top)], [0.6, css(pal.mid)], [1, css(pal.low)]]);
      grad.x.fillRect(0, 0, 1, h);
      ctx.drawImage(grad.c, 0, 0, w, h);

      // Stars
      if (night > 0.02) {
        ctx.fillStyle = "#ffffff";
        for (const s of stars) {
          ctx.globalAlpha = night * (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.f + s.p)));
          ctx.fillRect(s.x, s.y, s.s, s.s);
        }
        ctx.globalAlpha = 1;
      }

      // Sun
      if (H > 5.4 && H < 19.2) {
        const p = Math.min(1, Math.max(0, (H - 5.9) / (18.7 - 5.9)));
        const sx = w * (0.08 + 0.84 * p), sy = horizon + 10 - Math.sin(p * Math.PI) * horizon * 0.82;
        const R = Math.min(w, h) * 0.06;
        const low = 1 - Math.sin(p * Math.PI);
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 7);
        g.addColorStop(0, `rgba(255,${Math.round(236 - low * 70)},${Math.round(200 - low * 110)},0.55)`);
        g.addColorStop(1, "rgba(255,200,140,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = `rgb(255,${Math.round(248 - low * 60)},${Math.round(225 - low * 110)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, R, 0, TAU);
        ctx.fill();
      }
      // Moon
      if (night > 0.05) {
        const q = (((H - 18.3 + 24) % 24) / 12);
        if (q <= 1) {
          const mx = w * (0.08 + 0.84 * q), my = horizon + 10 - Math.sin(q * Math.PI) * horizon * 0.78;
          const M = Math.min(w, h) * 0.24;
          ctx.globalAlpha = night;
          ctx.drawImage(moon, mx - M / 2, my - M / 2, M, M);
          ctx.globalAlpha = 1;
        }
      }

      // Clouds
      const ca = 0.12 + (1 - night) * 0.6;
      for (const c of clouds) {
        c.x += c.v * dt;
        if (c.x > w + 160) c.x = -300;
        const cw = 260 * c.k, ch = 110 * c.k;
        ctx.globalAlpha = ca * (1 - gold);
        ctx.drawImage(white, c.x, c.y, cw, ch);
        if (gold > 0.01) {
          ctx.globalAlpha = ca * gold * 1.2;
          ctx.drawImage(warm, c.x, c.y, cw, ch);
        }
      }
      ctx.globalAlpha = 1;

      // Birds by day, a shooting star by night
      if (night < 0.4) {
        flock.t -= dt;
        if (flock.t <= 0 && flock.n === 0) flock = { t: 14 + r() * 18, x: -40, y: h * (0.15 + r() * 0.35), v: 34 + r() * 20, n: 3 + Math.floor(r() * 4) };
        if (flock.n) {
          flock.x += flock.v * dt;
          ctx.strokeStyle = "rgba(15,23,42,0.55)";
          ctx.lineWidth = 1.3;
          for (let i = 0; i < flock.n; i++) {
            const bx = flock.x - i * 16 - (i % 2) * 6, by = flock.y + (i % 2 ? 9 : -2) * Math.ceil(i / 2) * 0.6;
            const flap = Math.sin(t * 9 + i) * 3;
            ctx.beginPath();
            ctx.moveTo(bx - 5, by - flap);
            ctx.quadraticCurveTo(bx - 2, by - 1, bx, by + 1);
            ctx.quadraticCurveTo(bx + 2, by - 1, bx + 5, by - flap);
            ctx.stroke();
          }
          if (flock.x - flock.n * 16 > w + 20) flock.n = 0;
        }
      } else {
        shoot.t -= dt;
        if (shoot.t <= 0 && shoot.life <= 0) shoot = { t: 9 + r() * 14, x: w * (0.3 + r() * 0.6), y: h * (0.05 + r() * 0.25), vx: -(260 + r() * 200), vy: 90 + r() * 80, life: 0.8 };
        if (shoot.life > 0) {
          shoot.life -= dt;
          shoot.x += shoot.vx * dt;
          shoot.y += shoot.vy * dt;
          const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.2, shoot.y - shoot.vy * 0.2);
          g.addColorStop(0, `rgba(255,255,255,${Math.min(0.9, shoot.life * 1.6) * night})`);
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(shoot.x, shoot.y);
          ctx.lineTo(shoot.x - shoot.vx * 0.2, shoot.y - shoot.vy * 0.2);
          ctx.stroke();
        }
      }

      // Hills
      ctx.fillStyle = css(lerp(pal.low, [6, 9, 20], 0.55 + night * 0.25));
      ctx.fill(far);
      ctx.fillStyle = css(lerp(pal.low, [3, 5, 12], 0.8 + night * 0.12));
      ctx.fill(near);
      if (night > 0.15) {
        for (const l of lights) {
          ctx.fillStyle = l.warm ? "#ffcf87" : "#c7e0ff";
          ctx.globalAlpha = night * (0.5 + 0.5 * Math.sin(t * l.f + l.p));
          ctx.fillRect(l.x, l.y, 1.6, 1.6);
        }
        ctx.globalAlpha = 1;
      }
    },
  };
};

/** Words for the time of day, used under the greeting. */
export const skyMood = (hour = hourNow()) =>
  hour < 5 ? "Late night" : hour < 7 ? "Sunrise" : hour < 12 ? "Morning" : hour < 16.5 ? "Afternoon" : hour < 19 ? "Golden hour" : hour < 21 ? "Evening" : "Night";

