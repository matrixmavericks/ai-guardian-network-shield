import { TAU, glowSprite, grain, layer, mixHex, rgba, ridge, rng, vgrad, type Ctx } from "./paint";

// Living backgrounds for the Focus room. Everything is drawn in code: no
// images or video, so a scene costs a few kilobytes and works offline.
// Static parts are painted once into offscreen layers; only the moving
// parts are drawn each frame.

export type SceneId = "rain" | "aurora" | "space" | "ocean" | "forest" | "drift";
export type SoundId = "rain" | "waves" | "wind" | "drone" | "fire" | "crickets" | "brown";

export type Scene = { draw: (ctx: Ctx, t: number, dt: number) => void };
export type SceneDef = {
  id: SceneId;
  name: string;
  mood: string;
  /** Accent for the controls over this scene */
  tint: string;
  /** Default sound mix (0-1) when the scene is picked */
  sounds: Partial<Record<SoundId, number>>;
  make: (w: number, h: number, dpr: number) => Scene;
};

/* ---------------------------------------------------------------- Rain */

const rain = (w: number, h: number, dpr: number): Scene => {
  const r = rng(7);
  const bg = layer(w, h, dpr);
  bg.x.fillStyle = vgrad(bg.x, 0, h, [[0, "#060a14"], [0.5, "#0e1626"], [1, "#182033"]]);
  bg.x.fillRect(0, 0, w, h);
  // City lights seen through the glass, out of focus
  const warm = ["#ffb347", "#ff8a5c", "#ffd699", "#ff6b6b"];
  const cool = ["#7cb4ff", "#a5f3fc", "#c4b5fd"];
  const n = Math.round((w * h) / 9000);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = h * (0.3 + r() * 0.68);
    const rad = 5 + r() * r() * 52;
    const col = r() < 0.65 ? warm[Math.floor(r() * warm.length)] : cool[Math.floor(r() * cool.length)];
    const a = 0.05 + r() * 0.2;
    const g = bg.x.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.75, rgba(col, a * 0.7));
    g.addColorStop(1, rgba(col, 0));
    bg.x.fillStyle = g;
    bg.x.beginPath();
    bg.x.arc(x, y, rad, 0, TAU);
    bg.x.fill();
  }
  // Droplets resting on the glass
  const glass = layer(w, h, dpr);
  const nd = Math.round((w * h) / 2600);
  for (let i = 0; i < nd; i++) {
    const x = r() * w, y = r() * h, rad = 0.5 + r() * r() * 2.6;
    glass.x.fillStyle = "rgba(190,210,240,0.07)";
    glass.x.beginPath();
    glass.x.arc(x, y, rad, 0, TAU);
    glass.x.fill();
    glass.x.fillStyle = "rgba(255,255,255,0.45)";
    glass.x.beginPath();
    glass.x.arc(x - rad * 0.3, y - rad * 0.35, rad * 0.32, 0, TAU);
    glass.x.fill();
  }
  // A cool vignette, like looking out from a dim room
  const vg = glass.x.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.2, w / 2, h * 0.55, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(2,4,10,0.55)");
  glass.x.fillStyle = vg;
  glass.x.fillRect(0, 0, w, h);

  const streaks = Array.from({ length: Math.round(w / 7) }, () => ({ x: r() * w, y: r() * h, len: 12 + r() * 26, v: 520 + r() * 520, a: 0.06 + r() * 0.2 }));
  type Slide = { x: number; y: number; r: number; v: number; pause: number; trail: number[] };
  const spawn = (anywhere: boolean): Slide => ({ x: r() * w, y: anywhere ? r() * h : -12, r: 1.8 + r() * 2.6, v: 0, pause: r() * 2.5, trail: [] });
  const slides = Array.from({ length: Math.max(6, Math.round(w / 95)) }, () => spawn(true));
  const lights = { warm: glowSprite("#ffb347"), red: glowSprite("#ff4d4d"), white: glowSprite("#e0ecff") };
  const cars = Array.from({ length: 6 }, () => ({ x: r() * w, y: h * (0.78 + r() * 0.12), v: (r() < 0.5 ? -1 : 1) * (14 + r() * 26), s: 18 + r() * 22 }));

  return {
    draw(ctx, t, dt) {
      ctx.drawImage(bg.c, 0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const c of cars) {
        c.x += c.v * dt;
        if (c.x < -60) c.x = w + 60;
        if (c.x > w + 60) c.x = -60;
        const spr = c.v > 0 ? lights.white : lights.red;
        ctx.globalAlpha = 0.22 + 0.06 * Math.sin(t * 2 + c.s);
        ctx.drawImage(spr, c.x - c.s, c.y - c.s, c.s * 2, c.s * 2);
        ctx.drawImage(spr, c.x + c.s * 0.9 - c.s, c.y - c.s, c.s * 2, c.s * 2);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#b4cdff";
      ctx.lineWidth = 1;
      for (const s of streaks) {
        s.y += s.v * dt;
        s.x += s.v * dt * 0.1;
        if (s.y - s.len > h) {
          s.y = -s.len;
          s.x = r() * w * 1.1 - w * 0.1;
        }
        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.len * 0.1, s.y - s.len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(glass.c, 0, 0, w, h);

      // Drops that gather and run down the window
      for (let i = 0; i < slides.length; i++) {
        const d = slides[i];
        if (d.pause > 0) d.pause -= dt;
        else {
          d.v = Math.min(d.v + 260 * dt, 50 + d.r * 24);
          d.y += d.v * dt;
          d.x += Math.sin(t * 1.7 + d.y * 0.04 + i) * 0.18;
          if (r() < dt * 0.9) {
            d.pause = 0.15 + r() * 1.1;
            d.v = 0;
          }
          const last = d.trail.length ? d.trail[d.trail.length - 1] : -1e9;
          if (d.y - last > 3) d.trail.push(d.x, d.y);
          if (d.trail.length > 120) d.trail.splice(0, 2);
        }
        if (d.trail.length > 3) {
          ctx.strokeStyle = "rgba(200,220,250,0.09)";
          ctx.lineWidth = d.r * 0.8;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(d.trail[0], d.trail[1]);
          for (let k = 2; k < d.trail.length; k += 2) ctx.lineTo(d.trail[k], d.trail[k + 1]);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(215,230,255,0.16)";
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.r, d.r * 1.15, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.3, 0, TAU);
        ctx.fill();
        if (d.y > h + 20) slides[i] = spawn(false);
      }
    },
  };
};

/* -------------------------------------------------------------- Aurora */

const curtainSprite = (top: string, bottom: string) => {
  const { c, x } = layer(1, 256);
  x.fillStyle = vgrad(x, 0, 256, [[0, rgba(top, 0)], [0.45, rgba(top, 0.35)], [0.86, rgba(bottom, 0.9)], [0.93, rgba(bottom, 0.5)], [1, rgba(bottom, 0)]]);
  x.fillRect(0, 0, 1, 256);
  return c;
};

const aurora = (w: number, h: number, dpr: number): Scene => {
  const r = rng(11);
  const horizon = h * 0.74;
  const bg = layer(w, h, dpr);
  bg.x.fillStyle = vgrad(bg.x, 0, horizon, [[0, "#01030b"], [0.55, "#061430"], [1, "#0d2a3a"]]);
  bg.x.fillRect(0, 0, w, h);
  for (let i = 0, n = (w * h) / 1900; i < n; i++) {
    const y = r() * horizon;
    bg.x.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.6})`;
    bg.x.beginPath();
    bg.x.arc(r() * w, y, 0.3 + r() * r() * 1.1, 0, TAU);
    bg.x.fill();
  }
  // Mountains, their reflection and the still lake
  const fg = layer(w, h, dpr);
  const far = ridge(w, h, horizon - h * 0.02, h * 0.09, 3, 1.4);
  const near = ridge(w, h, horizon + h * 0.01, h * 0.05, 5, 2.2);
  fg.x.fillStyle = "#081424";
  fg.x.fill(far);
  fg.x.fillStyle = "#03080f";
  fg.x.fill(near);
  fg.x.fillStyle = vgrad(fg.x, horizon, h, [[0, "rgba(3,10,18,0.5)"], [1, "rgba(1,3,8,0.92)"]]);
  fg.x.fillRect(0, horizon + h * 0.012, w, h);
  fg.x.save();
  fg.x.translate(0, 2 * (horizon + h * 0.012));
  fg.x.scale(1, -1);
  fg.x.globalAlpha = 0.55;
  fg.x.fillStyle = "#03080f";
  fg.x.fill(near);
  fg.x.restore();

  const curtains = [
    { base: 0.44, amp: 0.07, len: 0.26, a: 0.85, speed: 0.06, ph: 0.4, spr: curtainSprite("#22d3ee", "#34d399") },
    { base: 0.34, amp: 0.05, len: 0.2, a: 0.45, speed: 0.045, ph: 2.1, spr: curtainSprite("#f472b6", "#a78bfa") },
    { base: 0.52, amp: 0.05, len: 0.18, a: 0.55, speed: 0.08, ph: 4.2, spr: curtainSprite("#5eead4", "#4ade80") },
  ];
  const tw = Array.from({ length: 60 }, () => ({ x: r() * w, y: r() * horizon * 0.8, s: 0.8 + r() * 1.2, p: r() * TAU, f: 0.6 + r() * 1.8 }));
  let shoot = { t: 4 + r() * 6, x: 0, y: 0, vx: 0, vy: 0, life: 0 };
  const step = w > 1200 ? 3 : 2;

  return {
    draw(ctx, t, dt) {
      ctx.drawImage(bg.c, 0, 0, w, h);
      ctx.fillStyle = "#fff";
      for (const s of tw) {
        ctx.globalAlpha = 0.35 + 0.65 * Math.max(0, Math.sin(t * s.f + s.p));
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";
      for (const c of curtains) {
        for (let x = 0; x < w; x += step) {
          const u = x / w;
          const y = h * (c.base + c.amp * (Math.sin(u * 5.2 + t * c.speed * 2 + c.ph) * 0.6 + Math.sin(u * 12.7 + t * c.speed * 3.3 + c.ph * 2) * 0.28 + Math.sin(u * 2.1 - t * c.speed) * 0.5));
          const len = h * c.len * (0.65 + 0.35 * Math.sin(u * 8.6 + t * 0.25 + c.ph) + 0.2 * Math.sin(u * 29 - t * 0.7));
          const pulse = Math.pow(0.5 + 0.5 * Math.sin(u * 4.6 + t * 0.18 + c.ph), 1.6);
          const rays = 0.75 + 0.25 * Math.sin(x * 0.8 + t * 3.1 + c.ph);
          const edge = Math.min(1, u * 6, (1 - u) * 6);
          ctx.globalAlpha = c.a * (0.25 + 0.75 * pulse) * rays * edge;
          ctx.drawImage(c.spr, x, y - len, step + 0.6, len);
        }
      }
      ctx.globalAlpha = 1;
      // Shooting star now and then
      shoot.t -= dt;
      if (shoot.t <= 0 && shoot.life <= 0) {
        shoot = { t: 8 + r() * 12, x: w * (0.2 + r() * 0.7), y: h * (0.05 + r() * 0.25), vx: -(300 + r() * 250), vy: 120 + r() * 120, life: 0.9 };
      }
      if (shoot.life > 0) {
        shoot.life -= dt;
        shoot.x += shoot.vx * dt;
        shoot.y += shoot.vy * dt;
        const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * 0.25, shoot.y - shoot.vy * 0.25);
        g.addColorStop(0, `rgba(255,255,255,${Math.min(1, shoot.life * 2)})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(shoot.x, shoot.y);
        ctx.lineTo(shoot.x - shoot.vx * 0.25, shoot.y - shoot.vy * 0.25);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      // Reflection of the sky band in the lake
      const lake = horizon + h * 0.012;
      const band = Math.min(lake, h - lake);
      const k = ctx.canvas.width / w;
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.translate(0, 2 * lake);
      ctx.scale(1, -1);
      ctx.drawImage(ctx.canvas, 0, (lake - band) * k, ctx.canvas.width, band * k, 0, lake - band, w, band);
      ctx.restore();
      ctx.drawImage(fg.c, 0, 0, w, h);
    },
  };
};

/* --------------------------------------------------------------- Space */

const planetTexture = (R: number) => {
  const W = Math.ceil(R * 4), H = Math.ceil(R * 2);
  const { c, x } = layer(W, H);
  const r = rng(21);
  const cols = ["#7c2d12", "#c2410c", "#fdba74", "#ea580c", "#fed7aa", "#9a3412", "#fb923c"];
  const bands = Array.from({ length: 9 }, () => ({ f: 2 + r() * 14, p: r() * TAU, a: r() }));
  for (let y = 0; y < H; y++) {
    const v = y / H;
    let s = 0;
    for (const b of bands) s += Math.sin(v * b.f * TAU * 0.5 + b.p) * b.a;
    const idx = Math.abs(Math.floor((s + 3) * 1.6)) % cols.length;
    x.fillStyle = cols[idx];
    x.fillRect(0, y, W, 1.2);
  }
  // Wobble the bands so they look like weather, periodic across the width
  for (let i = 0; i < 40; i++) {
    const y = r() * H, len = R * (0.3 + r() * 1.4), cx = r() * W;
    x.fillStyle = rgba(cols[Math.floor(r() * cols.length)], 0.35);
    for (const off of [0, -W, W]) {
      x.beginPath();
      x.ellipse(cx + off, y, len, 1.5 + r() * R * 0.03, 0, 0, TAU);
      x.fill();
    }
  }
  // Soften the bands so they read as cloud, not stripes
  const soft = layer(W, H);
  soft.x.filter = "blur(2px)";
  soft.x.drawImage(c, 0, 0);
  x.globalAlpha = 0.85;
  x.drawImage(soft.c, 0, 0);
  x.globalAlpha = 1;
  // A great storm
  x.fillStyle = "rgba(127,29,29,0.65)";
  x.beginPath();
  x.ellipse(W * 0.3, H * 0.62, R * 0.22, R * 0.09, 0, 0, TAU);
  x.fill();
  x.fillStyle = "rgba(254,215,170,0.35)";
  x.beginPath();
  x.ellipse(W * 0.3, H * 0.62, R * 0.14, R * 0.045, 0, 0, TAU);
  x.fill();
  return { c, W };
};

const space = (w: number, h: number, dpr: number): Scene => {
  const r = rng(31);
  const bg = layer(w, h, dpr);
  bg.x.fillStyle = "#02030a";
  bg.x.fillRect(0, 0, w, h);
  bg.x.globalCompositeOperation = "lighter";
  const neb = ["#7c3aed", "#2563eb", "#db2777", "#0891b2", "#4f46e5"];
  for (let i = 0; i < 10; i++) {
    const x = r() * w, y = r() * h, rad = Math.max(w, h) * (0.18 + r() * 0.4);
    const g = bg.x.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, rgba(neb[i % neb.length], 0.06 + r() * 0.08));
    g.addColorStop(1, rgba(neb[i % neb.length], 0));
    bg.x.fillStyle = g;
    bg.x.fillRect(0, 0, w, h);
  }
  bg.x.globalCompositeOperation = "source-over";
  for (let i = 0, n = (w * h) / 1300; i < n; i++) {
    bg.x.fillStyle = `rgba(${r() < 0.2 ? "200,215,255" : "255,255,255"},${0.1 + r() * 0.55})`;
    bg.x.fillRect(r() * w, r() * h, 0.6 + r() * r(), 0.6 + r() * r());
  }
  const layers = [6, 14, 28].map((v, i) => ({ v, stars: Array.from({ length: 70 - i * 18 }, () => ({ x: r() * w, y: r() * h, s: 0.6 + i * 0.5 + r() * 0.6, p: r() * TAU })) }));
  const narrow = w < 700;
  const R = narrow ? w * 0.3 : Math.min(260, Math.min(w, h) * 0.2);
  const cx = narrow ? w * 0.68 : w * 0.74, cy = narrow ? h * 0.74 : h * 0.6;
  const tex = planetTexture(R);
  const shade = layer(R * 2.6, R * 2.6, dpr);
  {
    const s = shade.x, o = R * 1.3;
    const g = s.createRadialGradient(o - R * 0.55, o - R * 0.45, R * 0.1, o - R * 0.3, o - R * 0.25, R * 1.45);
    g.addColorStop(0, "rgba(255,240,220,0.12)");
    g.addColorStop(0.35, "rgba(2,3,10,0)");
    g.addColorStop(0.62, "rgba(2,3,10,0.55)");
    g.addColorStop(0.8, "rgba(2,3,10,0.9)");
    g.addColorStop(1, "rgba(2,3,10,0.98)");
    s.fillStyle = g;
    s.beginPath();
    s.arc(o, o, R, 0, TAU);
    s.fill();
    const a = s.createRadialGradient(o, o, R * 0.96, o, o, R * 1.28);
    a.addColorStop(0, "rgba(253,186,116,0.22)");
    a.addColorStop(1, "rgba(253,186,116,0)");
    s.fillStyle = a;
    s.beginPath();
    s.arc(o, o, R * 1.28, 0, TAU);
    s.arc(o, o, R * 0.98, 0, TAU, true);
    s.fill();
  }
  const ring = (ctx: Ctx, front: boolean) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.32);
    const rings: [number, string, number][] = [[1.45, "#fde68a", 0.25], [1.6, "#fdba74", 0.45], [1.72, "#fef3c7", 0.3], [1.86, "#fdba74", 0.22], [2.0, "#e5e7eb", 0.12]];
    for (const [k, col, a] of rings) {
      ctx.strokeStyle = rgba(col, a);
      ctx.lineWidth = R * 0.06;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * k, R * k * 0.22, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
      ctx.stroke();
    }
    ctx.restore();
  };
  let comet = { t: 3 + r() * 5, x: 0, y: 0, vx: 0, vy: 0, life: 0 };

  return {
    draw(ctx, t, dt) {
      ctx.drawImage(bg.c, 0, 0, w, h);
      ctx.fillStyle = "#fff";
      for (const L of layers)
        for (const s of L.stars) {
          s.x -= L.v * dt;
          if (s.x < -2) s.x = w + 2;
          ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 1.3 + s.p);
          ctx.fillRect(s.x, s.y, s.s, s.s);
        }
      ctx.globalAlpha = 1;
      ring(ctx, false);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.clip();
      const off = (t * R * 0.035) % tex.W;
      ctx.drawImage(tex.c, cx - R - off, cy - R, tex.W, R * 2);
      ctx.drawImage(tex.c, cx - R - off + tex.W, cy - R, tex.W, R * 2);
      ctx.restore();
      ctx.drawImage(shade.c, cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
      ring(ctx, true);
      comet.t -= dt;
      if (comet.t <= 0 && comet.life <= 0) comet = { t: 6 + r() * 10, x: w * (0.1 + r() * 0.5), y: -10, vx: 160 + r() * 200, vy: 220 + r() * 160, life: 2.2 };
      if (comet.life > 0) {
        comet.life -= dt;
        comet.x += comet.vx * dt;
        comet.y += comet.vy * dt;
        const g = ctx.createLinearGradient(comet.x, comet.y, comet.x - comet.vx * 0.35, comet.y - comet.vy * 0.35);
        g.addColorStop(0, `rgba(190,230,255,${Math.min(0.9, comet.life)})`);
        g.addColorStop(1, "rgba(190,230,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(comet.x, comet.y);
        ctx.lineTo(comet.x - comet.vx * 0.35, comet.y - comet.vy * 0.35);
        ctx.stroke();
      }
    },
  };
};

/* --------------------------------------------------------------- Ocean */

const ocean = (w: number, h: number, dpr: number): Scene => {
  const r = rng(41);
  const horizon = h * 0.6;
  const S = Math.min(w, h) * 0.075;
  const sx = w * 0.5, sy = horizon - S * 0.25;
  const bg = layer(w, h, dpr);
  const x = bg.x;
  x.fillStyle = vgrad(x, 0, horizon, [[0, "#0c0a24"], [0.32, "#33205a"], [0.6, "#8e3a6e"], [0.84, "#ea7466"], [1, "#ffc27a"]]);
  x.fillRect(0, 0, w, horizon + 1);
  x.globalCompositeOperation = "lighter";
  const glow = x.createRadialGradient(sx, sy, 0, sx, sy, S * 7);
  glow.addColorStop(0, "rgba(255,214,160,0.55)");
  glow.addColorStop(0.3, "rgba(255,160,110,0.2)");
  glow.addColorStop(1, "rgba(255,160,110,0)");
  x.fillStyle = glow;
  x.fillRect(0, 0, w, horizon);
  x.globalCompositeOperation = "source-over";
  const disk = x.createLinearGradient(0, sy - S, 0, sy + S);
  disk.addColorStop(0, "#fff6dc");
  disk.addColorStop(1, "#ffab5e");
  x.fillStyle = disk;
  x.save();
  x.beginPath();
  x.rect(0, 0, w, horizon);
  x.clip();
  x.beginPath();
  x.arc(sx, sy, S, 0, TAU);
  x.fill();
  x.restore();
  // Long thin clouds lit from below
  for (let i = 0; i < 9; i++) {
    const cy = horizon * (0.18 + r() * 0.7), cw = w * (0.18 + r() * 0.35), ch = 3 + r() * 12, cx = r() * w;
    const lit = cy / horizon;
    const g = x.createLinearGradient(cx - cw, 0, cx + cw, 0);
    const col = lit > 0.6 ? "#ffb4a2" : lit > 0.35 ? "#d9779a" : "#5b3a85";
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, 0.45));
    g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g;
    x.beginPath();
    x.ellipse(cx, cy, cw, ch, 0, 0, TAU);
    x.fill();
  }
  x.fillStyle = vgrad(x, horizon, h, [[0, "#3a2050"], [0.25, "#1d1640"], [1, "#07081a"]]);
  x.fillRect(0, horizon, w, h - horizon);
  const rows = 30;
  const pathLayer = layer(w, h, dpr);
  {
    const p = pathLayer.x;
    const g = p.createLinearGradient(0, horizon, 0, h);
    g.addColorStop(0, "rgba(255,190,120,0.45)");
    g.addColorStop(1, "rgba(255,150,100,0.05)");
    p.fillStyle = g;
    p.beginPath();
    p.moveTo(sx - S * 0.9, horizon);
    p.lineTo(sx + S * 0.9, horizon);
    p.lineTo(sx + S * 3.6, h);
    p.lineTo(sx - S * 3.6, h);
    p.closePath();
    p.filter = "blur(12px)";
    p.fill();
  }
  const path = pathLayer.c;
  const glints = Array.from({ length: 90 }, () => {
    const p = Math.pow(r(), 1.6);
    return { p, dx: (r() - 0.5), len: 3 + r() * 16, ph: r() * TAU, f: 1.5 + r() * 3 };
  });

  return {
    draw(ctx, t) {
      ctx.drawImage(bg.c, 0, 0, w, h);
      ctx.lineWidth = 1;
      for (let i = 0; i < rows; i++) {
        const p = i / rows;
        const y0 = horizon + (h - horizon) * Math.pow(p, 1.8) + 1;
        const amp = 0.4 + p * 7;
        const f = 0.012 / (0.25 + p);
        ctx.strokeStyle = `rgba(255,190,150,${0.05 + 0.12 * (1 - p)})`;
        ctx.beginPath();
        for (let X = 0; X <= w; X += 8) {
          const y = y0 + Math.sin(X * f + t * (0.6 + p * 0.8) + i * 1.7) * amp + Math.sin(X * f * 2.3 - t * 0.9 + i) * amp * 0.35;
          if (X === 0) ctx.moveTo(X, y);
          else ctx.lineTo(X, y);
        }
        ctx.stroke();
      }
      // The sun's path on the water
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(path, 0, 0, w, h);
      ctx.fillStyle = "#ffb86b";
      for (const g of glints) {
        const y = horizon + 2 + (h - horizon) * g.p;
        const spread = S * (0.45 + g.p * 3.2);
        const a = Math.pow(Math.max(0, Math.sin(t * g.f + g.ph)), 3) * (0.9 - g.p * 0.5);
        if (a < 0.02) continue;
        ctx.globalAlpha = a;
        const len = g.len * (0.5 + g.p * 2);
        ctx.fillRect(sx + g.dx * spread * 2 - len / 2, y, len, 1 + g.p * 1.5);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
};

/* -------------------------------------------------------------- Forest */

const pines = (w: number, h: number, base: number, height: number, color: string, seed: number, gap: number, dpr = 1) => {
  const r = rng(seed);
  const { c, x } = layer(w, h, dpr);
  x.fillStyle = color;
  x.fillRect(0, base, w, h - base);
  for (let px = -gap; px < w + gap; px += gap * (0.5 + r() * 0.9)) {
    const th = height * (0.55 + r() * 0.6), tw = th * (0.28 + r() * 0.1);
    const tiers = 5 + Math.floor(r() * 3);
    for (let k = 0; k < tiers; k++) {
      const y1 = base - th * (k / tiers) * 0.92, top = base - th * ((k + 1.6) / tiers);
      const half = (tw / 2) * (1 - k / (tiers + 1));
      x.beginPath();
      x.moveTo(px - half, y1);
      x.lineTo(px, Math.max(base - th, top));
      x.lineTo(px + half, y1);
      x.closePath();
      x.fill();
    }
    x.fillRect(px - th * 0.012, base - th * 0.1, th * 0.024, th * 0.12);
  }
  return c;
};

const fogStrip = (w: number, h: number, seed: number, a: number) => {
  const r = rng(seed);
  const { c, x } = layer(w * 2, h);
  for (let i = 0; i < 14; i++) {
    const cx = (i / 14) * w * 2 + r() * 80, cy = h * (0.3 + r() * 0.4), rx = w * (0.12 + r() * 0.2), ry = h * (0.25 + r() * 0.2);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rx);
    g.addColorStop(0, `rgba(160,190,215,${a})`);
    g.addColorStop(1, "rgba(160,190,215,0)");
    x.fillStyle = g;
    x.save();
    x.translate(cx, cy);
    x.scale(1, ry / rx);
    x.translate(-cx, -cy);
    x.beginPath();
    x.arc(cx, cy, rx, 0, TAU);
    x.fill();
    x.restore();
  }
  return c;
};

const forest = (w: number, h: number, dpr: number): Scene => {
  const r = rng(51);
  const bg = layer(w, h, dpr);
  bg.x.fillStyle = vgrad(bg.x, 0, h, [[0, "#020611"], [0.5, "#071a2c"], [0.75, "#0f3249"], [1, "#0f3249"]]);
  bg.x.fillRect(0, 0, w, h);
  for (let i = 0, n = (w * h) / 4500; i < n; i++) {
    bg.x.fillStyle = `rgba(255,255,255,${0.15 + r() * 0.5})`;
    bg.x.fillRect(r() * w, r() * h * 0.5, 0.8, 0.8);
  }
  const mx = w * 0.78, my = h * 0.2, mr = Math.min(w, h) * 0.045;
  const mg = bg.x.createRadialGradient(mx, my, 0, mx, my, mr * 9);
  mg.addColorStop(0, "rgba(224,242,254,0.35)");
  mg.addColorStop(1, "rgba(224,242,254,0)");
  bg.x.fillStyle = mg;
  bg.x.fillRect(0, 0, w, h);
  bg.x.fillStyle = "#eef6ff";
  bg.x.beginPath();
  bg.x.arc(mx, my, mr, 0, TAU);
  bg.x.fill();
  bg.x.fillStyle = "rgba(148,163,184,0.25)";
  bg.x.beginPath();
  bg.x.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.25, 0, TAU);
  bg.x.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.18, 0, TAU);
  bg.x.fill();
  const far = layer(w, h, dpr);
  far.x.drawImage(pines(w, h, h * 0.62, h * 0.14, "#123247", 1, 26, dpr), 0, 0, w, h);
  far.x.drawImage(pines(w, h, h * 0.7, h * 0.18, "#0c2335", 2, 34, dpr), 0, 0, w, h);
  const mid = pines(w, h, h * 0.8, h * 0.26, "#06131e", 3, 48, dpr);
  const near = pines(w, h, h * 0.94, h * 0.36, "#02070c", 4, 70, dpr);
  const fogA = fogStrip(w, h * 0.3, 8, 0.12), fogB = fogStrip(w, h * 0.3, 9, 0.08);
  const fly = glowSprite("#d9f99d", 48, 0.08);
  const flies = Array.from({ length: Math.round(w / 22) }, () => ({ x: r() * w, y: h * (0.5 + r() * 0.45), a: 0.2 + r() * 0.5, b: 0.2 + r() * 0.4, p: r() * TAU, q: r() * TAU, R: 20 + r() * 50, f: 0.4 + r() * 0.8, s: 10 + r() * 14, front: r() < 0.35 }));
  const drawFlies = (ctx: Ctx, t: number, front: boolean) => {
    ctx.globalCompositeOperation = "lighter";
    for (const f of flies) {
      if (f.front !== front) continue;
      const x = f.x + Math.sin(t * f.a + f.p) * f.R + Math.sin(t * f.b * 2.3 + f.q) * f.R * 0.4;
      const y = f.y + Math.cos(t * f.b + f.q) * f.R * 0.5;
      const blink = Math.pow(Math.max(0, Math.sin(t * f.f + f.p)), 4);
      if (blink < 0.02) continue;
      ctx.globalAlpha = blink;
      const s = f.s * (front ? 1.4 : 1);
      ctx.drawImage(fly, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  return {
    draw(ctx, t) {
      ctx.drawImage(bg.c, 0, 0, w, h);
      ctx.drawImage(far.c, 0, 0, w, h);
      const oa = (t * 8) % (w * 2), ob = (t * 14) % (w * 2);
      ctx.drawImage(fogA, -oa, h * 0.6, w * 2, h * 0.3);
      ctx.drawImage(fogA, -oa + w * 2, h * 0.6, w * 2, h * 0.3);
      ctx.drawImage(mid, 0, 0, w, h);
      drawFlies(ctx, t, false);
      ctx.drawImage(fogB, -ob, h * 0.74, w * 2, h * 0.3);
      ctx.drawImage(fogB, -ob + w * 2, h * 0.74, w * 2, h * 0.3);
      ctx.drawImage(near, 0, 0, w, h);
      drawFlies(ctx, t, true);
    },
  };
};

/* --------------------------------------------------------------- Drift */

const drift = (w: number, h: number): Scene => {
  const small = layer(Math.ceil(w / 10), Math.ceil(h / 10));
  const sw = small.c.width, sh = small.c.height;
  const blobs = [
    { c: "#1d4ed8", a: 0.13, b: 0.09, p: 0, q: 1 },
    { c: "#7c3aed", a: 0.07, b: 0.11, p: 2, q: 0.3 },
    { c: "#0891b2", a: 0.1, b: 0.06, p: 4, q: 2.2 },
    { c: "#db2777", a: 0.05, b: 0.08, p: 1, q: 3.4 },
    { c: "#4f46e5", a: 0.09, b: 0.05, p: 3, q: 5 },
  ];
  const noise = grain(160, 0.05);
  return {
    draw(ctx, t) {
      const x = small.x;
      x.fillStyle = "#070b1d";
      x.fillRect(0, 0, sw, sh);
      for (const b of blobs) {
        const cx = sw * (0.5 + 0.38 * Math.sin(t * b.a + b.p)), cy = sh * (0.5 + 0.38 * Math.cos(t * b.b + b.q));
        const rad = Math.max(sw, sh) * (0.45 + 0.1 * Math.sin(t * 0.07 + b.p));
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, rgba(b.c, 0.85));
        g.addColorStop(1, rgba(b.c, 0));
        x.fillStyle = g;
        x.fillRect(0, 0, sw, sh);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(small.c, 0, 0, w, h);
      const pat = ctx.createPattern(noise, "repeat");
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, w, h);
      }
    },
  };
};

export const SCENES: SceneDef[] = [
  { id: "rain", name: "Rainy window", mood: "Soft rain on glass, the city blurred behind it", tint: "#7cb4ff", sounds: { rain: 0.7, brown: 0.15 }, make: rain },
  { id: "aurora", name: "Northern lights", mood: "A still lake under a moving sky", tint: "#34d399", sounds: { wind: 0.45, drone: 0.2 }, make: aurora },
  { id: "space", name: "Deep space", mood: "A ringed planet turning slowly", tint: "#fdba74", sounds: { drone: 0.5, brown: 0.12 }, make: space },
  { id: "ocean", name: "Sunset sea", mood: "Waves rolling in at golden hour", tint: "#fb923c", sounds: { waves: 0.7 }, make: ocean },
  { id: "forest", name: "Firefly forest", mood: "Pines, mist and fireflies after dark", tint: "#bef264", sounds: { crickets: 0.45, wind: 0.2 }, make: forest },
  { id: "drift", name: "Drift", mood: "Slow colour, nothing to look at", tint: "#a78bfa", sounds: { brown: 0.45 }, make: drift },
];

export const sceneById = (id: string) => SCENES.find((s) => s.id === id) ?? SCENES[0];

/** Mix used by the dashboard and the island to colour small accents. */
export const tintOf = (id: string, a = 1) => (a === 1 ? sceneById(id).tint : rgba(sceneById(id).tint, a));
export { mixHex };
