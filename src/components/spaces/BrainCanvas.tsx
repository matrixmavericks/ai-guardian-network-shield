import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { cn } from "@/lib/utils";
import { CRIT, SUBJECT_COLORS, TYPE_META, type BrainLink, type BrainNode, type NodeType } from "./brain";

// A living network on a canvas: d3-force lays it out; we draw glowing nodes,
// links that light up around what you point at (with particles flowing along
// them), and labels placed so they never overlap. Zoom, pan, drag nodes,
// pinch on touch; click selects, double-click opens.

type N = BrainNode & SimulationNodeDatum & { r: number; deg: number; born: number };
type L = SimulationLinkDatum<N> & { kind: BrainLink["kind"]; phase: number };
type Cam = { x: number; y: number; k: number };

export type BrainHandle = { flyTo: (id: string, k?: number) => void; zoom: (f: number) => void; fit: () => void };

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const isLight = () => document.documentElement.classList.contains("lp-light");
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const idOf = (x: string | number | N | undefined) => (typeof x === "object" ? x.id : String(x));

export const colorFor = (n: Pick<BrainNode, "type" | "letter" | "slot">, light = isLight()) =>
  n.type === "criterion" && n.letter ? CRIT[light ? "light" : "dark"][n.letter]
  : n.type === "subject" && typeof n.slot === "number" ? SUBJECT_COLORS[light ? "light" : "dark"][n.slot % 8]
  : TYPE_META[n.type][light ? "light" : "dark"];

/** Soft round glow, drawn once per colour */
const sprites = new Map<string, HTMLCanvasElement>();
const glow = (color: string) => {
  let c = sprites.get(color);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color + "cc");
  grad.addColorStop(0.35, color + "44");
  grad.addColorStop(1, color + "00");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  sprites.set(color, c);
  return c;
};

type Props = {
  nodes: BrainNode[];
  links: BrainLink[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onOpen?: (n: BrainNode) => void;
  /** Types to leave out */
  hidden?: Set<NodeType>;
  /** Only show this many steps around the selection (0 = everything) */
  depth?: number;
  className?: string;
  label: string;
};

export const BrainCanvas = forwardRef<BrainHandle, Props>(function BrainCanvas({ nodes, links, selected, onSelect, onOpen, hidden, depth = 0, className, label }, ref) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Simulation<N, L> | null>(null);
  const all = useRef<{ nodes: Map<string, N>; links: L[] }>({ nodes: new Map(), links: [] });
  const shown = useRef<{ nodes: N[]; links: L[]; adj: Map<string, Set<string>> }>({ nodes: [], links: [], adj: new Map() });
  const cam = useRef<Cam>({ x: 0, y: 0, k: 0.9 });
  const anim = useRef<{ from: Cam; to: Cam; start: number; dur: number } | null>(null);
  const size = useRef({ w: 800, h: 600, dpr: 1 });
  const hover = useRef<N | null>(null);
  const sel = useRef<string | null>(selected);
  const touched = useRef(false);
  const born = useRef(0);
  const refit = useRef(0);
  const [tip, setTip] = useState<{ x: number; y: number; n: N } | null>(null);
  const cbs = useRef({ onSelect, onOpen });
  cbs.current = { onSelect, onOpen };
  sel.current = selected;

  /* ---------- camera ---------- */

  const toWorld = (sx: number, sy: number) => {
    const { w, h } = size.current;
    const c = cam.current;
    return { x: (sx - w / 2 - c.x) / c.k, y: (sy - h / 2 - c.y) / c.k };
  };
  const flyTo = (to: Cam, dur = 750) => {
    if (reduced()) { cam.current = to; return; }
    anim.current = { from: { ...cam.current }, to, start: performance.now(), dur };
  };
  const fit = (dur = 900) => {
    const ns = shown.current.nodes;
    if (!ns.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of ns) { x0 = Math.min(x0, n.x! - n.r); y0 = Math.min(y0, n.y! - n.r); x1 = Math.max(x1, n.x! + n.r); y1 = Math.max(y1, n.y! + n.r); }
    const { w, h } = size.current;
    const k = Math.max(0.2, Math.min(2.2, Math.min((w - 120) / Math.max(80, x1 - x0), (h - 140) / Math.max(80, y1 - y0))));
    flyTo({ k, x: -((x0 + x1) / 2) * k, y: -((y0 + y1) / 2) * k }, dur);
  };
  const zoomAt = (f: number, sx = size.current.w / 2, sy = size.current.h / 2) => {
    const c = cam.current;
    const k = Math.max(0.12, Math.min(6, c.k * f));
    const p = toWorld(sx, sy);
    const { w, h } = size.current;
    cam.current = { k, x: sx - w / 2 - p.x * k, y: sy - h / 2 - p.y * k };
    anim.current = null;
  };
  useImperativeHandle(ref, () => ({
    flyTo: (id, k = 1.7) => {
      const n = all.current.nodes.get(id);
      if (!n || n.x === undefined) return;
      touched.current = true;
      flyTo({ k, x: -n.x * k, y: -n.y! * k });
    },
    zoom: (f) => { touched.current = true; const c = cam.current; flyTo({ ...c, k: Math.max(0.12, Math.min(6, c.k * f)), x: c.x * f, y: c.y * f }, 300); },
    fit: () => fit(),
  }));

  /* ---------- data in ---------- */

  useEffect(() => {
    const prev = all.current.nodes;
    const first = prev.size === 0;
    const map = new Map<string, N>();
    const deg = new Map<string, number>();
    for (const l of links) { deg.set(l.source, (deg.get(l.source) ?? 0) + 1); deg.set(l.target, (deg.get(l.target) ?? 0) + 1); }
    const anchor = new Map<string, string>();
    for (const l of links) { if (!anchor.has(l.target)) anchor.set(l.target, l.source); if (!anchor.has(l.source)) anchor.set(l.source, l.target); }
    const now = performance.now();
    if (first) born.current = now;
    nodes.forEach((n, i) => {
      const old = prev.get(n.id);
      const d = deg.get(n.id) ?? 0;
      const base = TYPE_META[n.type].r;
      const r = ["me", "subject", "class", "world", "concept", "criterion", "gem"].includes(n.type) ? base + Math.min(9, Math.sqrt(d) * 1.3) : base;
      if (old) { map.set(n.id, Object.assign(old, n, { r, deg: d })); return; }
      // New nodes grow out of what they're linked to (or burst from the centre on first load)
      const a = prev.get(anchor.get(n.id) ?? "") ?? map.get(anchor.get(n.id) ?? "");
      const ang = Math.random() * Math.PI * 2;
      const dist = first ? Math.random() * 6 : 12;
      map.set(n.id, { ...n, r, deg: d, born: first ? now + Math.min(900, i * 3) : now, x: (a?.x ?? 0) + Math.cos(ang) * dist, y: (a?.y ?? 0) + Math.sin(ang) * dist });
    });
    all.current = {
      nodes: map,
      links: links.filter((l) => map.has(l.source) && map.has(l.target)).map((l) => ({ source: l.source, target: l.target, kind: l.kind, phase: Math.random() })) as unknown as L[],
    };
    apply(first ? 1 : 0.35);
    if (first) {
      touched.current = false;
      if (reduced()) { for (let i = 0; i < 260; i++) sim.current?.tick(); fit(0); }
      else window.setTimeout(() => { if (!touched.current) fit(); }, 1500);
    } else if (!touched.current && !reduced()) {
      // More arrived (ideas): frame everything again once it settles, unless the person has moved the view
      window.clearTimeout(refit.current);
      refit.current = window.setTimeout(() => { if (!touched.current) fit(); }, 1400);
    }
  }, [nodes, links]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Pick what's visible (type filters, local graph) and (re)start the layout */
  const apply = (alpha: number) => {
    const { nodes: map, links: ls } = all.current;
    let keep = new Set([...map.values()].filter((n) => !hidden?.has(n.type) || n.type === "me").map((n) => n.id));
    if (depth > 0 && sel.current && map.has(sel.current)) {
      const adj = new Map<string, string[]>();
      for (const l of ls) { const a = idOf(l.source), b = idOf(l.target); adj.set(a, [...(adj.get(a) ?? []), b]); adj.set(b, [...(adj.get(b) ?? []), a]); }
      const near = new Set([sel.current]);
      let frontier = [sel.current];
      for (let d = 0; d < depth; d++) {
        const next: string[] = [];
        for (const id of frontier) for (const m of adj.get(id) ?? []) if (!near.has(m) && keep.has(m)) { near.add(m); next.push(m); }
        frontier = next;
      }
      keep = near;
    }
    const ns = [...map.values()].filter((n) => keep.has(n.id));
    const lsShown = ls.filter((l) => keep.has(idOf(l.source)) && keep.has(idOf(l.target)));
    const adj = new Map<string, Set<string>>();
    for (const l of lsShown) {
      const a = idOf(l.source), b = idOf(l.target);
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a)!.add(b);
      adj.get(b)!.add(a);
    }
    shown.current = { nodes: ns, links: lsShown, adj };
    if (!sim.current) {
      sim.current = forceSimulation<N, L>()
        .force("charge", forceManyBody<N>().strength((n) => -30 - n.r * 9).distanceMax(520))
        .force("collide", forceCollide<N>((n) => n.r + 3).iterations(2))
        .force("x", forceX<N>(0).strength(0.035))
        .force("y", forceY<N>(0).strength(0.035))
        .velocityDecay(0.32)
        .stop();
    }
    sim.current.nodes(ns);
    sim.current.force("link", forceLink<N, L>(lsShown).id((n) => n.id)
      .distance((l) => (l.kind === "concept" ? 70 : 26 + (l.source as N).r + (l.target as N).r + ((l.source as N).type === "me" ? 60 : 0)))
      .strength((l) => (l.kind === "concept" ? 0.12 : 0.5)));
    // Stepped by the draw loop, never by d3's own timer
    sim.current.alpha(Math.max(sim.current.alpha(), alpha));
  };
  useEffect(() => { if (all.current.nodes.size) apply(0.5); }, [hidden, depth, depth > 0 ? selected : null]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- drawing ---------- */

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    const stars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.2, p: Math.random() * Math.PI * 2 }));
    const still = reduced();
    const resize = () => {
      // The observer can fire once more as the page unmounts
      const el = wrap.current;
      if (!el) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: el.clientWidth, h: el.clientHeight, dpr };
      cv.width = Math.round(el.clientWidth * dpr);
      cv.height = Math.round(el.clientHeight * dpr);
      cv.style.width = `${el.clientWidth}px`;
      cv.style.height = `${el.clientHeight}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap.current!);

    const draw = (t: number) => {
      const { w, h, dpr } = size.current;
      const light = isLight();
      if (anim.current) {
        const a = anim.current;
        const p = Math.min(1, (t - a.start) / a.dur);
        const e = ease(p);
        cam.current = { x: a.from.x + (a.to.x - a.from.x) * e, y: a.from.y + (a.to.y - a.from.y) * e, k: a.from.k * Math.pow(a.to.k / a.from.k, e) };
        if (p >= 1) anim.current = null;
      }
      const c = cam.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Star dust drifting with the camera
      ctx.fillStyle = light ? "rgba(15,23,42,0.18)" : "rgba(226,232,240,0.7)";
      for (const s of stars) {
        const x = (((s.x * w + c.x * 0.06) % w) + w) % w;
        const y = (((s.y * h + c.y * 0.06) % h) + h) % h;
        ctx.globalAlpha = still ? 0.35 : 0.2 + 0.25 * (1 + Math.sin(t / 1400 + s.p));
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const { nodes: ns, links: ls, adj } = shown.current;
      const focus = hover.current?.id ?? sel.current;
      const near = focus ? adj.get(focus) ?? new Set<string>() : null;
      const lit = (id: string) => !focus || id === focus || near!.has(id);

      ctx.setTransform(dpr * c.k, 0, 0, dpr * c.k, dpr * (w / 2 + c.x), dpr * (h / 2 + c.y));
      const px = 1 / c.k;

      // Links: quiet ones in one pass, the focused neighbourhood brighter
      ctx.lineWidth = px;
      ctx.strokeStyle = light ? "rgba(51,65,85,0.16)" : "rgba(148,163,184,0.16)";
      ctx.beginPath();
      const hot: L[] = [];
      for (const l of ls) {
        const s = l.source as N, d = l.target as N;
        if (focus && (s.id === focus || d.id === focus)) { hot.push(l); continue; }
        ctx.globalAlpha = focus ? 0.35 : 1;
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(d.x!, d.y!);
      }
      ctx.stroke();
      // Ideas: faint gold threads
      ctx.globalAlpha = focus ? 0.25 : 0.9;
      ctx.strokeStyle = light ? "rgba(161,98,7,0.22)" : "rgba(253,230,138,0.14)";
      ctx.setLineDash([3 * px, 4 * px]);
      ctx.beginPath();
      for (const l of ls) {
        if (l.kind !== "concept") continue;
        const s = l.source as N, d = l.target as N;
        if (focus && (s.id === focus || d.id === focus)) continue;
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(d.x!, d.y!);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      for (const l of hot) {
        const s = l.source as N, d = l.target as N;
        const other = s.id === focus ? d : s;
        ctx.strokeStyle = colorFor(other, light);
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = 1.6 * px;
        ctx.beginPath();
        ctx.moveTo(s.x!, s.y!);
        ctx.lineTo(d.x!, d.y!);
        ctx.stroke();
      }
      // Particles flowing out from the focus
      if (!still && hot.length) {
        ctx.globalCompositeOperation = light ? "source-over" : "lighter";
        for (const l of hot.slice(0, 160)) {
          const s = l.source as N, d = l.target as N;
          const [a, b] = s.id === focus ? [s, d] : [d, s];
          ctx.fillStyle = colorFor(b, light);
          for (let j = 0; j < 2; j++) {
            const p = ((t / 1600) + l.phase + j / 2) % 1;
            ctx.globalAlpha = Math.sin(p * Math.PI);
            ctx.beginPath();
            ctx.arc(a.x! + (b.x! - a.x!) * p, a.y! + (b.y! - a.y!) * p, 1.9 * px, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = 1;

      // Nodes: glow, then a solid core
      const selId = sel.current;
      for (const n of ns) {
        const intro = still ? 1 : Math.max(0, Math.min(1, (t - n.born) / 500));
        if (!intro) continue;
        const on = lit(n.id);
        const col = colorFor(n, light);
        const pulse = n.id === selId && !still ? 1 + 0.12 * Math.sin(t / 260) : 1;
        const R = n.r * (n.id === focus ? 4.2 : 3.2) * pulse * (0.6 + 0.4 * intro);
        ctx.globalAlpha = (on ? (light ? 0.5 : 0.85) : 0.08) * intro;
        if (!light) ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(glow(col), n.x! - R, n.y! - R, R * 2, R * 2);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = (on ? 1 : 0.18) * intro;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, n.r * intro, 0, Math.PI * 2);
        ctx.fill();
        if (n.type === "me" || n.type === "world") {
          ctx.lineWidth = 1.5 * px;
          ctx.strokeStyle = col;
          ctx.globalAlpha = (on ? 0.5 : 0.1) * intro;
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, n.r + 5 + (still ? 0 : 1.5 * Math.sin(t / 700)), 0, Math.PI * 2);
          ctx.stroke();
        }
        if (n.id === selId) {
          ctx.globalAlpha = 1;
          ctx.lineWidth = 2 * px;
          ctx.strokeStyle = light ? "#0f172a" : "#ffffff";
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, n.r + 3.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Labels in screen space, most important first, never overlapping
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cands: { n: N; score: number }[] = [];
      for (const n of ns) {
        const isFocus = n.id === focus || n.id === selId;
        const isNear = !!near?.has(n.id);
        const big = TYPE_META[n.type].rank;
        const show = isFocus || isNear || n.type === "me" || (c.k > 0.45 && big >= 80) || (c.k > 0.8 && (big >= 55 || n.deg >= 4)) || c.k > 1.5;
        if (show) cands.push({ n, score: (isFocus ? 1e6 : 0) + (isNear ? 1e5 : 0) + big * 100 + n.deg });
      }
      cands.sort((a, b) => b.score - a.score);
      const placed: [number, number, number, number][] = [];
      let count = 0;
      for (const { n } of cands) {
        if (count > 140) break;
        const sx = w / 2 + c.x + n.x! * c.k;
        const sy = h / 2 + c.y + n.y! * c.k;
        if (sx < -100 || sx > w + 100 || sy < -40 || sy > h + 40) continue;
        const strong = n.id === focus || n.id === selId || TYPE_META[n.type].rank >= 80;
        const fs = strong ? 13 : 11.5;
        ctx.font = `${strong ? 600 : 500} ${fs}px Inter, ui-sans-serif, system-ui, sans-serif`;
        const text = n.label.length > 34 ? `${n.label.slice(0, 32)}…` : n.label;
        const tw = ctx.measureText(text).width;
        const y = sy + n.r * c.k + fs + 3;
        const box: [number, number, number, number] = [sx - tw / 2 - 3, y - fs, sx + tw / 2 + 3, y + 4];
        if (placed.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1])) continue;
        placed.push(box);
        count++;
        const dim = focus && !lit(n.id);
        ctx.globalAlpha = dim ? 0.25 : 1;
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = light ? "rgba(244,247,252,0.92)" : "rgba(5,10,24,0.88)";
        ctx.strokeText(text, sx, y);
        ctx.fillStyle = light ? (strong ? "#0f172a" : "#334155") : strong ? "#f8fafc" : "#cbd5e1";
        ctx.fillText(text, sx, y);
      }
      ctx.globalAlpha = 1;

      const s = sim.current;
      if (s && (s.alpha() > s.alphaMin() || s.alphaTarget() > 0)) s.tick();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(draw); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);


  /* ---------- input ---------- */

  useEffect(() => {
    const cv = canvas.current!;
    const pts = new Map<number, { x: number; y: number }>();
    let drag: N | null = null;
    let pan = false;
    let down = { x: 0, y: 0, t: 0, moved: 0 };
    let pinch: { d: number; k: number; mx: number; my: number; cam: Cam } | null = null;
    const local = (e: PointerEvent | WheelEvent | MouseEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const hit = (sx: number, sy: number) => {
      const p = toWorld(sx, sy);
      const n = sim.current?.find(p.x, p.y, 40 / cam.current.k);
      if (!n) return null;
      const dist = Math.hypot(n.x! - p.x, n.y! - p.y);
      return dist <= n.r + 8 / cam.current.k ? n : null;
    };
    const showTip = (n: N | null) => {
      if (n === hover.current) return;
      hover.current = n;
      cv.style.cursor = n ? "pointer" : pan ? "grabbing" : "grab";
      if (!n) { setTip(null); return; }
      const { w, h } = size.current;
      const c = cam.current;
      setTip({ x: w / 2 + c.x + n.x! * c.k, y: h / 2 + c.y + n.y! * c.k - n.r * c.k - 10, n });
    };

    const onDown = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId);
      const p = local(e);
      pts.set(e.pointerId, p);
      touched.current = true;
      anim.current = null;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        if (drag) { drag.fx = drag.fy = null; drag = null; }
        pan = false;
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: cam.current.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cam: { ...cam.current } };
        return;
      }
      down = { x: p.x, y: p.y, t: performance.now(), moved: 0 };
      const n = hit(p.x, p.y);
      if (n) { drag = n; n.fx = n.x; n.fy = n.y; const s = sim.current; if (s) { s.alphaTarget(0.15); if (s.alpha() < 0.15) s.alpha(0.15); } }
      else { pan = true; cv.style.cursor = "grabbing"; }
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      const prev = pts.get(e.pointerId);
      if (pts.has(e.pointerId)) pts.set(e.pointerId, p);
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const k = Math.max(0.12, Math.min(6, pinch.k * (d / pinch.d)));
        const { w, h } = size.current;
        const wx = (pinch.mx - w / 2 - pinch.cam.x) / pinch.cam.k;
        const wy = (pinch.my - h / 2 - pinch.cam.y) / pinch.cam.k;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        cam.current = { k, x: mx - w / 2 - wx * k, y: my - h / 2 - wy * k };
        return;
      }
      if (prev) down.moved += Math.hypot(p.x - prev.x, p.y - prev.y);
      if (drag) { const q = toWorld(p.x, p.y); drag.fx = q.x; drag.fy = q.y; showTip(null); return; }
      if (pan && prev) { cam.current = { ...cam.current, x: cam.current.x + p.x - prev.x, y: cam.current.y + p.y - prev.y }; return; }
      if (e.pointerType === "mouse") showTip(hit(p.x, p.y));
    };
    const onUp = (e: PointerEvent) => {
      const p = local(e);
      pts.delete(e.pointerId);
      if (pinch) { if (pts.size < 2) pinch = null; return; }
      const click = down.moved < 6 && performance.now() - down.t < 600;
      if (drag) { drag.fx = drag.fy = null; sim.current?.alphaTarget(0); }
      if (click) { const n = hit(p.x, p.y); cbs.current.onSelect(n ? n.id : null); }
      drag = null;
      pan = false;
      cv.style.cursor = hover.current ? "pointer" : "grab";
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      touched.current = true;
      const p = local(e);
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), p.x, p.y);
      showTip(null);
    };
    const onDbl = (e: MouseEvent) => { const p = local(e); const n = hit(p.x, p.y); if (n) cbs.current.onOpen?.(n); };
    const onLeave = () => showTip(null);
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("dblclick", onDbl);
    return () => {
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("wheel", onWheel);
      cv.removeEventListener("dblclick", onDbl);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e: React.KeyboardEvent) => {
    const step = 60;
    const c = cam.current;
    if (e.key === "Escape") cbs.current.onSelect(null);
    else if (e.key === "+" || e.key === "=") zoomAt(1.25);
    else if (e.key === "-") zoomAt(0.8);
    else if (e.key === "0") fit();
    else if (e.key === "ArrowLeft") cam.current = { ...c, x: c.x + step };
    else if (e.key === "ArrowRight") cam.current = { ...c, x: c.x - step };
    else if (e.key === "ArrowUp") cam.current = { ...c, y: c.y + step };
    else if (e.key === "ArrowDown") cam.current = { ...c, y: c.y - step };
    else return;
    e.preventDefault();
  };

  return (
    <div ref={wrap} className={cn("relative h-full w-full overflow-hidden", className)}>
      <canvas ref={canvas} tabIndex={0} role="img" aria-label={label} onKeyDown={onKey} className="absolute inset-0 block cursor-grab touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lp-sky/50" />
      {tip && (
        <div className="lp-pop pointer-events-none absolute z-10 max-w-[260px] -translate-x-1/2 -translate-y-full rounded-xl border border-lp-line bg-lp-surface/95 px-3 py-2 shadow-xl backdrop-blur" style={{ left: tip.x, top: tip.y }}>
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: colorFor(tip.n) }}>{TYPE_META[tip.n.type].label}</p>
          <p className="mt-0.5 text-[13px] font-medium leading-snug text-white">{tip.n.label}</p>
          {tip.n.sub && <p className="mt-0.5 text-[11.5px] text-lp-mute">{tip.n.sub}</p>}
        </div>
      )}
    </div>
  );
});
