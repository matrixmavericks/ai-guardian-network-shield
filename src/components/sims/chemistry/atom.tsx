import React, { useRef } from "react";
import { SimShell, Eq, H, Try } from "../kit/SimShell";
import { Stage, useSimParams, useSimTheme, type SimTheme } from "../kit/core";
import { Group, Readout, Readouts, Btn } from "../kit/controls";
import { glow, label, roundRect, sphere, TAU, type Ctx } from "../kit/draw";

// Build an atom from protons, neutrons and electrons: the element, mass
// number, charge, electron shells, and whether that nucleus is stable.

const ELEMENTS = [
  ["H", "Hydrogen"], ["He", "Helium"], ["Li", "Lithium"], ["Be", "Beryllium"], ["B", "Boron"], ["C", "Carbon"], ["N", "Nitrogen"], ["O", "Oxygen"], ["F", "Fluorine"], ["Ne", "Neon"],
  ["Na", "Sodium"], ["Mg", "Magnesium"], ["Al", "Aluminium"], ["Si", "Silicon"], ["P", "Phosphorus"], ["S", "Sulfur"], ["Cl", "Chlorine"], ["Ar", "Argon"], ["K", "Potassium"], ["Ca", "Calcium"],
] as const;
/** Stable mass numbers for Z = 1…20 */
const STABLE: number[][] = [[1, 2], [3, 4], [6, 7], [9], [10, 11], [12, 13], [14, 15], [16, 17, 18], [19], [20, 21, 22], [23], [24, 25, 26], [27], [28, 29, 30], [31], [32, 33, 34, 36], [35, 37], [36, 38, 40], [39, 41], [40, 42, 43, 44, 46, 48]];
const SHELLS = [2, 8, 8, 2];
// Where each element sits in the first four periods (period, group 1–8 columns)
const POS: [number, number][] = [[1, 1], [1, 8], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [4, 1], [4, 2]];

type P = { p: number; n: number; e: number };
const DEF: P = { p: 3, n: 3, e: 3 };

export const shells = (e: number) => { const out: number[] = []; let left = e; for (const cap of SHELLS) { if (left <= 0) break; out.push(Math.min(cap, left)); left -= cap; } if (left > 0) out.push(left); return out; };
export const stable = (p: number, n: number) => p >= 1 && p <= 20 && STABLE[p - 1].includes(p + n);
const sup = (s: string) => s.split("").map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻"["0123456789+-".indexOf(c)] ?? c).join("");
const sub = (s: string) => s.split("").map((c) => "₀₁₂₃₄₅₆₇₈₉"["0123456789".indexOf(c)] ?? c).join("");

/** Nucleons packed in a rough ball (golden-angle spiral) */
const nucleus = (p: number, n: number) => {
  const total = p + n, out: { x: number; y: number; proton: boolean }[] = [];
  for (let i = 0; i < total; i++) {
    const rr = Math.sqrt(i + 0.5) * 0.9, a = i * 2.39996;
    out.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, proton: (i * p) % total < p });
  }
  return out;
};

function draw(ctx: Ctx, w: number, h: number, q: P, t: SimTheme, time: number) {
  const bg = ctx.createRadialGradient(w * 0.35, h * 0.55, 10, w * 0.35, h * 0.55, Math.max(w, h) * 0.7);
  bg.addColorStop(0, t.dark ? "#101b33" : "#f8fafc"); bg.addColorStop(1, t.dark ? "#040812" : "#e2e8f0");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  const side = w > 640 ? Math.min(320, w * 0.4) : 0;
  const cx = (w - side) / 2, cy = h * 0.55;
  const sh = shells(q.e);
  const maxR = Math.min((w - side) / 2 - 30, h / 2 - 50);
  const ringR = (k: number) => 46 + ((k + 1) * (maxR - 46)) / Math.max(4, sh.length);
  // Shells and electrons
  sh.forEach((count, k) => {
    ctx.strokeStyle = t.dark ? "rgba(125,211,252,0.35)" : "rgba(2,132,199,0.35)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, ringR(k), 0, TAU); ctx.stroke();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + time * (0.6 / (k + 1)) * (k % 2 ? -1 : 1);
      const ex = cx + Math.cos(a) * ringR(k), ey = cy + Math.sin(a) * ringR(k);
      glow(ctx, ex, ey, 16, "#38bdf8", 0.55);
      sphere(ctx, ex, ey, 6, "#38bdf8", { light: "#e0f2fe" });
    }
  });
  // Nucleus
  const nr = 7.5;
  const nuc = nucleus(q.p, q.n);
  glow(ctx, cx, cy, 40 + Math.sqrt(q.p + q.n) * 6, stable(q.p, q.n) || q.p + q.n === 0 ? "#fb923c" : "#f43f5e", 0.35);
  for (const b of nuc) sphere(ctx, cx + b.x * nr * 1.6, cy + b.y * nr * 1.6, nr, b.proton ? "#ef4444" : "#94a3b8", { light: b.proton ? "#fecaca" : "#f1f5f9" });
  if (!side) return;
  // Periodic table (first 20 elements), the current one highlighted
  const tx = w - side + 6, cw = (side - 30) / 8, chh = 34, ty = 90;
  label(ctx, "Periodic table (first 20)", tx, ty - 14, { color: t.soft, size: 12, weight: 600, align: "left" });
  POS.forEach(([per, col], i) => {
    const x = tx + (col - 1) * cw, y = ty + (per - 1) * (chh + 4);
    const on = i + 1 === q.p;
    ctx.fillStyle = on ? "#ef4444" : t.dark ? "rgba(148,163,184,0.14)" : "rgba(15,23,42,0.06)";
    roundRect(ctx, x, y, cw - 4, chh, 6); ctx.fill();
    label(ctx, ELEMENTS[i][0], x + (cw - 4) / 2, y + chh / 2 + 3, { color: on ? "#ffffff" : t.soft, size: 12.5, weight: 700 });
    label(ctx, String(i + 1), x + 4, y + 8, { color: on ? "#fee2e2" : t.mute, size: 8.5, align: "left" });
  });
  // Notation card
  const ny = ty + 4 * (chh + 4) + 24;
  ctx.fillStyle = t.panel; roundRect(ctx, tx, ny, side - 30, 150, 14); ctx.fill();
  const el = q.p >= 1 && q.p <= 20 ? ELEMENTS[q.p - 1] : null;
  const charge = q.p - q.e;
  const chargeText = charge === 0 ? "" : `${Math.abs(charge) > 1 ? Math.abs(charge) : ""}${charge > 0 ? "+" : "-"}`;
  if (el) {
    label(ctx, sup(String(q.p + q.n)), tx + 40, ny + 46, { color: t.ink, size: 22, weight: 600, align: "right" });
    label(ctx, sub(String(q.p)), tx + 40, ny + 92, { color: t.ink, size: 22, weight: 600, align: "right" });
    label(ctx, el[0], tx + 46, ny + 72, { color: t.ink, size: 54, weight: 700, align: "left", font: "Georgia, serif" });
    if (chargeText) label(ctx, sup(chargeText), tx + 50 + el[0].length * 30, ny + 40, { color: t.c.amber, size: 24, weight: 700, align: "left" });
    label(ctx, `${el[1]}${q.p + q.n ? `-${q.p + q.n}` : ""}`, tx + (side - 30) / 2, ny + 128, { color: t.soft, size: 13, weight: 600 });
  } else label(ctx, q.p === 0 ? "Add a proton to make an element" : "Beyond calcium: not in this builder", tx + (side - 30) / 2, ny + 75, { color: t.mute, size: 12.5 });
}

export function thumb(ctx: Ctx, w: number, h: number, t: SimTheme) {
  draw(ctx, w, h * 1.1, { p: 6, n: 6, e: 6 }, t, 0.5);
}

export default function Atom() {
  const theme = useSimTheme();
  const [q, set, resetP] = useSimParams<P>(DEF, { p: [0, 20], n: [0, 30], e: [0, 22] });
  const clock = useRef(0);
  const render = (ctx: Ctx, w: number, h: number, dt: number) => { clock.current += dt; draw(ctx, w, h, q, theme, clock.current); };
  const el = q.p >= 1 && q.p <= 20 ? ELEMENTS[q.p - 1] : null;
  const charge = q.p - q.e, A = q.p + q.n;
  const st = stable(q.p, q.n);
  const config = shells(q.e).join(",");
  const adj = (k: keyof P, d: number) => set({ [k]: Math.max(0, Math.min(k === "p" ? 20 : k === "n" ? 30 : 22, q[k] + d)) } as Partial<P>);
  const challenges = [
    { id: "c12", title: "Build a neutral carbon-12 atom", detail: "How many of each particle?", done: q.p === 6 && q.n === 6 && q.e === 6 },
    { id: "ion", title: "Build a magnesium ion with a 2+ charge", detail: "What does magnesium lose when it reacts?", done: q.p === 12 && q.e === 10 && stable(q.p, q.n) },
    { id: "tritium", title: "Build the unstable isotope hydrogen-3", detail: "Isotopes: same protons, different neutrons.", done: q.p === 1 && q.n === 2 },
    { id: "noble", title: "Build a neutral noble gas with a full outer shell other than helium", detail: "Look at the last column.", done: (q.p === 10 || q.p === 18) && q.e === q.p && stable(q.p, q.n) },
  ];
  const Row: React.FC<{ k: keyof P; name: string; color: string; note: string }> = ({ k, name, color, note }) => (
    <div className="flex items-center gap-3">
      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1"><span className="block text-[13.5px] text-white">{name}</span><span className="block text-[11.5px] text-lp-mute">{note}</span></span>
      <Btn onClick={() => adj(k, -1)} aria-label={`Remove a ${name.toLowerCase().slice(0, -1)}`}>−</Btn>
      <span className="w-7 text-center text-[16px] font-semibold tabular-nums text-white">{q[k]}</span>
      <Btn onClick={() => adj(k, 1)} aria-label={`Add a ${name.toLowerCase().slice(0, -1)}`}>+</Btn>
    </div>
  );

  return (
    <SimShell
      id="atom"
      challenges={challenges}
      onReset={() => resetP()}
      record={() => ({ protons: q.p, neutrons: q.n, electrons: q.e, "mass number": A, charge, stable: st ? 1 : 0 })}
      ask={() => `I built a particle with ${q.p} protons, ${q.n} neutrons and ${q.e} electrons${el ? `: ${el[1]}-${A}` : ""}, charge ${charge > 0 ? "+" : ""}${charge}, electron arrangement ${config || "none"}. ${st ? "That nucleus is stable." : "That nucleus is not stable."}`}
      stage={<Stage label={el ? `Model of ${el[1]}-${A}` : "Empty atom builder"} render={render} />}
      overlay={
        <Readouts>
          <Readout label="element" value={el ? el[1] : "–"} />
          <Readout label="mass number" value={String(A)} />
          <Readout label="charge" value={charge === 0 ? "neutral" : `${charge > 0 ? "+" : "−"}${Math.abs(charge)}`} color={charge === 0 ? undefined : theme.c.amber} />
          <Readout label="electrons" value={config || "–"} color="#38bdf8" />
          <Readout label="nucleus" value={q.p + q.n === 0 ? "–" : st ? "stable" : "unstable"} color={st ? theme.c.green : theme.c.red} />
        </Readouts>
      }
      controls={
        <>
          <Group title="Particles">
            <Row k="p" name="Protons" color="#ef4444" note="Charge +1, mass 1. Decide the element." />
            <Row k="n" name="Neutrons" color="#94a3b8" note="No charge, mass 1. Change the isotope." />
            <Row k="e" name="Electrons" color="#38bdf8" note="Charge −1, almost no mass. Change the charge." />
          </Group>
          <Group title="Quick picks">
            <div className="grid grid-cols-3 gap-1.5">
              {[[1, 0, 1], [2, 2, 2], [6, 6, 6], [8, 8, 8], [11, 12, 11], [17, 18, 17]].map(([p, n, e]) => <Btn key={p} onClick={() => set({ p, n, e })}>{ELEMENTS[p - 1][0]}-{p + n}</Btn>)}
            </div>
          </Group>
        </>
      }
      learn={
        <>
          <H>Inside an atom</H>
          <p>A tiny, dense nucleus holds protons (+1) and neutrons (0). Electrons (−1) are arranged in shells around it. The number of protons, the atomic number, decides the element.</p>
          <Eq>mass number = protons + neutrons</Eq>
          <H>Electron shells</H>
          <p>For the first 20 elements, shells fill 2, then 8, then 8, then 2. The outer shell decides how an element reacts; elements in the same group have the same number of outer electrons. A full outer shell (the noble gases) is very unreactive.</p>
          <H>Ions</H>
          <p>An ion has a different number of electrons from protons. Losing electrons gives a positive ion (metals, like Na⁺ and Mg²⁺); gaining them gives a negative ion (non-metals, like Cl⁻ and O²⁻). Usually atoms gain or lose electrons to get a full outer shell.</p>
          <H>Isotopes</H>
          <p>Atoms of the same element with different numbers of neutrons. They react the same way but have different masses. Some combinations are unstable and radioactive, like hydrogen-3 (tritium) and carbon-14.</p>
          <Try>build sodium-23, then take away one electron. What is its electron arrangement now, and which atom has the same one?</Try>
        </>
      }
    />
  );
}
