import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Braces, Check, Download, FilePlus2, ImageDown, Loader2, Plus, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { StudyShell, primaryBtn } from "@/components/subjects/kit";
import { Panel, ghostBtn } from "@/components/student/ui";
import { inputCls } from "@/components/student/Modal";
import { cn } from "@/lib/utils";
import { CATALOG, DIAGRAM_SCHEMA, DiagramView, isDiagram, type DiagramSpec } from "@/components/studio/diagrams";
import { solveTriangle, type GraphSpec, type TriangleSpec } from "@/components/studio/diagrams/geometry";
import type { SupplyDemandSpec } from "@/components/studio/diagrams/humanities";
import { nice } from "@/components/studio/mathExpr";
import { PENDING_DIAGRAM, useLibrary, useStudio } from "@/components/studio/studio";
import { askStudio, extractJson, uid } from "@/components/studio/worksheet";

const svgOf = (host: HTMLElement | null) => host?.querySelector("svg") ?? null;

const downloadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const svgMarkup = (svg: SVGSVGElement) => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = svg.viewBox.baseVal;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(vb.width * 2));
  clone.setAttribute("height", String(vb.height * 2));
  clone.style.background = "#FFFFFF";
  return new XMLSerializer().serializeToString(clone);
};

/* ---------- Friendly editors for the most used figures ---------- */

const NumIn: React.FC<{ label: string; value?: number; on: (v?: number) => void; suffix?: string }> = ({ label, value, on, suffix }) => (
  <label className="block text-[11.5px] text-lp-mute">
    {label}
    <div className="mt-1 flex h-9 items-center rounded-lg border border-lp-line bg-lp-deep/40 px-2 focus-within:border-lp-sky/60">
      <input type="number" step="any" value={value ?? ""} onChange={(e) => on(e.target.value === "" ? undefined : Number(e.target.value))} className="w-full bg-transparent text-[13.5px] text-white focus:outline-none" />
      {suffix && <span className="text-[11.5px] text-lp-mute">{suffix}</span>}
    </div>
  </label>
);

const TriangleEditor: React.FC<{ spec: TriangleSpec; on: (s: TriangleSpec) => void }> = ({ spec, on }) => {
  const solved = solveTriangle(spec);
  const set = (k: keyof TriangleSpec, v?: number) => on({ ...spec, [k]: v });
  return (
    <div>
      <p className="text-[12px] text-lp-soft">Enter any three (at least one side). Leave the rest blank and they are calculated.</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <NumIn label="Side a (BC)" value={spec.a} on={(v) => set("a", v)} />
        <NumIn label="Side b (CA)" value={spec.b} on={(v) => set("b", v)} />
        <NumIn label="Side c (AB)" value={spec.c} on={(v) => set("c", v)} />
        <NumIn label="Angle A" value={spec.A} on={(v) => set("A", v)} suffix="°" />
        <NumIn label="Angle B" value={spec.B} on={(v) => set("B", v)} suffix="°" />
        <NumIn label="Angle C" value={spec.C} on={(v) => set("C", v)} suffix="°" />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["a", "b", "c"] as const).map((k, i) => (
          <label key={k} className="block text-[11.5px] text-lp-mute">
            Label {k}
            <input value={String(spec.sideLabels?.[i] ?? "")} placeholder="auto / x / blank" onChange={(e) => on({ ...spec, sideLabels: [0, 1, 2].map((j) => (j === i ? e.target.value || null : spec.sideLabels?.[j] ?? null)) })} className={cn(inputCls, "mt-1 h-9 py-1")} />
          </label>
        ))}
        {(["A", "B", "C"] as const).map((k, i) => (
          <label key={k} className="block text-[11.5px] text-lp-mute">
            Label ∠{k}
            <input value={String(spec.angleLabels?.[i] ?? "")} placeholder="auto / θ / blank" onChange={(e) => on({ ...spec, angleLabels: [0, 1, 2].map((j) => (j === i ? e.target.value || null : spec.angleLabels?.[j] ?? null)) })} className={cn(inputCls, "mt-1 h-9 py-1")} />
          </label>
        ))}
      </div>
      <label className="mt-2 block text-[11.5px] text-lp-mute">
        Unit
        <input value={spec.unit ?? ""} onChange={(e) => on({ ...spec, unit: e.target.value || undefined })} placeholder="cm" className={cn(inputCls, "mt-1 h-9 py-1 w-28")} />
      </label>
      <div className="mt-3 rounded-xl border border-lp-line bg-lp-deep/40 p-3 text-[12.5px] text-lp-soft">
        {solved ? (
          <p>
            <b className="text-white">Solved:</b> a = {nice(solved.a)}, b = {nice(solved.b)}, c = {nice(solved.c)} · A = {nice(solved.A, 1)}°, B = {nice(solved.B, 1)}°, C = {nice(solved.C, 1)}° · Area ={" "}
            {nice(0.5 * solved.b * solved.c * Math.sin((solved.A * Math.PI) / 180))}
            {spec.unit ? ` ${spec.unit}²` : ""}
          </p>
        ) : (
          <p className="text-lp-amber">Those values don't make a triangle yet.</p>
        )}
      </div>
    </div>
  );
};

const GraphEditor: React.FC<{ spec: GraphSpec; on: (s: GraphSpec) => void }> = ({ spec, on }) => {
  const fns = spec.functions ?? [];
  const x = spec.x ?? [-5, 5];
  const y = spec.y ?? [-5, 5];
  return (
    <div>
      <p className="text-[12px] text-lp-soft">Type functions like 2x^2 - 3x + 1, sin(x), 3*2^x or sqrt(x).</p>
      <div className="mt-2 space-y-2">
        {fns.map((f, i) => (
          <div key={i} className="flex gap-2">
            <span className="flex h-9 items-center text-[13px] text-lp-mute">y =</span>
            <input value={f.expr} onChange={(e) => on({ ...spec, functions: fns.map((g, j) => (j === i ? { ...g, expr: e.target.value, label: undefined } : g)) })} className={cn(inputCls, "h-9 flex-1 py-1 font-mono text-[13px]")} />
            <button type="button" onClick={() => on({ ...spec, functions: fns.filter((_, j) => j !== i) })} className="flex h-9 w-9 items-center justify-center rounded-lg text-lp-mute hover:text-lp-red" aria-label="Remove function">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => on({ ...spec, functions: [...fns, { expr: "x" }] })} className="inline-flex items-center gap-1 text-[12.5px] text-lp-sky hover:text-white">
          <Plus className="h-3.5 w-3.5" /> Add a function
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <NumIn label="x min" value={x[0]} on={(v) => on({ ...spec, x: [v ?? -5, x[1]] })} />
        <NumIn label="x max" value={x[1]} on={(v) => on({ ...spec, x: [x[0], v ?? 5] })} />
        <NumIn label="y min" value={y[0]} on={(v) => on({ ...spec, y: [v ?? -5, y[1]] })} />
        <NumIn label="y max" value={y[1]} on={(v) => on({ ...spec, y: [y[0], v ?? 5] })} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block text-[11.5px] text-lp-mute">
          x-axis label
          <input value={spec.xLabel ?? ""} onChange={(e) => on({ ...spec, xLabel: e.target.value || undefined })} className={cn(inputCls, "mt-1 h-9 py-1")} />
        </label>
        <label className="block text-[11.5px] text-lp-mute">
          y-axis label
          <input value={spec.yLabel ?? ""} onChange={(e) => on({ ...spec, yLabel: e.target.value || undefined })} className={cn(inputCls, "mt-1 h-9 py-1")} />
        </label>
      </div>
      <label className="mt-3 inline-flex items-center gap-2 text-[12.5px] text-lp-soft">
        <input type="checkbox" checked={!!spec.blank} onChange={(e) => on({ ...spec, blank: e.target.checked })} /> Blank grid for students to draw on
      </label>
    </div>
  );
};

const SdEditor: React.FC<{ spec: SupplyDemandSpec; on: (s: SupplyDemandSpec) => void }> = ({ spec, on }) => {
  const shade = new Set(spec.shade ?? []);
  const toggle = (k: NonNullable<SupplyDemandSpec["shade"]>[number]) => {
    const next = new Set(shade);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    on({ ...spec, shade: [...next] });
  };
  const shift = (curve: "D" | "S", dir: "left" | "right" | "") => on({ ...spec, shifts: [...(spec.shifts ?? []).filter((s) => s.curve !== curve), ...(dir ? [{ curve, dir }] : [])] });
  const cur = (c: "D" | "S") => spec.shifts?.find((s) => s.curve === c)?.dir ?? "";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {(["D", "S"] as const).map((c) => (
          <label key={c} className="block text-[11.5px] text-lp-mute">
            {c === "D" ? "Demand" : "Supply"} shift
            <select value={cur(c)} onChange={(e) => shift(c, e.target.value as "left" | "right" | "")} className={cn(inputCls, "mt-1 h-9 py-1")}>
              <option value="">None</option>
              <option value="right">Increase (right)</option>
              <option value="left">Decrease (left)</option>
            </select>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumIn label="Indirect tax (0-4)" value={spec.tax} on={(v) => on({ ...spec, tax: v, subsidy: v ? undefined : spec.subsidy })} />
        <NumIn label="Subsidy (0-4)" value={spec.subsidy} on={(v) => on({ ...spec, subsidy: v, tax: v ? undefined : spec.tax })} />
        <NumIn label="Price ceiling (0-10)" value={spec.ceiling} on={(v) => on({ ...spec, ceiling: v })} />
        <NumIn label="Price floor (0-10)" value={spec.floor} on={(v) => on({ ...spec, floor: v })} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["CS", "PS", "DWL", "tax", "subsidy"] as const).map((k) => (
          <button key={k} type="button" onClick={() => toggle(k)} className={cn("h-7 rounded-full border px-2.5 text-[11.5px] font-medium", shade.has(k) ? "border-lp-sky/50 bg-lp-blue/15 text-white" : "border-lp-line text-lp-mute hover:text-white")}>
            Shade {k === "CS" ? "consumer surplus" : k === "PS" ? "producer surplus" : k === "DWL" ? "deadweight loss" : k === "tax" ? "tax revenue" : "subsidy cost"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11.5px] text-lp-mute">
          Curve names
          <select
            value={spec.names?.D === "AD" ? "macro" : "micro"}
            onChange={(e) => on(e.target.value === "macro" ? { ...spec, names: { D: "AD", S: "SRAS" }, xLabel: "Real GDP", yLabel: "Price level" } : { ...spec, names: undefined, xLabel: undefined, yLabel: undefined })}
            className={cn(inputCls, "mt-1 h-9 py-1")}
          >
            <option value="micro">Demand & supply</option>
            <option value="macro">AD & SRAS</option>
          </select>
        </label>
      </div>
    </div>
  );
};

/* ---------- Page ---------- */

const DiagramLab = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { config, look, band } = useStudio();
  const lib = useLibrary();
  const [filter, setFilter] = useState<"mine" | "all">("mine");
  const [spec, setSpec] = useState<DiagramSpec | null>(null);
  const [caption, setCaption] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tweak, setTweak] = useState("");
  const [busy, setBusy] = useState<"make" | "tweak" | null>(null);
  const [json, setJson] = useState("");
  const [jsonOpen, setJsonOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!look || spec) return;
    const id = params.get("id");
    const fromLib = id ? lib.items.find((x) => x.id === id && x.type === "diagram") : null;
    if (fromLib && fromLib.type === "diagram") {
      setSpec(fromLib.spec);
      setCaption(fromLib.title);
      return;
    }
    const first = CATALOG.find((c) => c.subjects.includes(look.subject));
    if (first) {
      setSpec(first.example);
      setCaption(first.name);
    }
  }, [look]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (spec) setJson(JSON.stringify(spec, null, 2));
    setSaved(false);
  }, [spec]);

  const gallery = useMemo(() => (look ? CATALOG.filter((c) => filter === "all" || c.subjects.includes(look.subject)) : CATALOG), [filter, look]);

  if (!config || !look) return <Navigate to="/dashboard" replace />;

  const ask = async (mode: "make" | "tweak") => {
    const text = (mode === "make" ? prompt : tweak).trim();
    if (!text) return;
    setBusy(mode);
    try {
      const p = [
        config.systemContext,
        mode === "make"
          ? `A teacher wants this diagram for a ${band} worksheet: "${text}". Choose the best diagram kind and exact values.`
          : `Here is the current diagram JSON: ${JSON.stringify(spec)}\nChange it as the teacher asks: "${text}". Keep everything else the same.`,
        DIAGRAM_SCHEMA,
        'Return ONLY JSON: {"diagram": {...}, "caption": "one short sentence describing it or asking a question about it"}',
      ].join("\n\n");
      const reply = await askStudio(p, config.subjectLabel, band);
      const out = extractJson(reply) as { diagram?: unknown; caption?: string };
      const d = isDiagram(out.diagram) ? out.diagram : isDiagram(out) ? (out as DiagramSpec) : null;
      if (!d) throw new Error("no diagram");
      setSpec(d);
      if (out.caption) setCaption(String(out.caption));
      if (mode === "tweak") setTweak("");
    } catch {
      toast.error("Refyn couldn't draw that. Try describing it a little differently.");
    } finally {
      setBusy(null);
    }
  };

  const applyJson = () => {
    try {
      const v = JSON.parse(json);
      if (!isDiagram(v)) throw new Error();
      setSpec(v);
      toast.success("Diagram updated");
    } catch {
      toast.error("That JSON isn't a diagram the lab knows");
    }
  };

  const downloadSvg = () => {
    const svg = svgOf(hostRef.current);
    if (!svg) return;
    downloadBlob(new Blob([svgMarkup(svg)], { type: "image/svg+xml" }), `${(caption || "diagram").slice(0, 40).replace(/[^\w]+/g, "-")}.svg`);
  };
  const downloadPng = () => {
    const svg = svgOf(hostRef.current);
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = vb.width * 3;
      canvas.height = vb.height * 3;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => b && downloadBlob(b, `${(caption || "diagram").slice(0, 40).replace(/[^\w]+/g, "-")}.png`), "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup(svg))}`;
  };
  const toWorksheet = () => {
    if (!spec) return;
    sessionStorage.setItem(PENDING_DIAGRAM, JSON.stringify({ spec, caption }));
    navigate("/studio/create");
  };
  const save = () => {
    if (!spec) return;
    lib.save({ id: uid(), type: "diagram", title: caption || "Diagram", at: Date.now(), spec });
    setSaved(true);
    toast.success("Saved to your library");
  };

  return (
    <StudyShell wide>
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">
        <Link to="/studio" className="hover:text-white">
          {config.title}
        </Link>{" "}
        · Diagram lab
      </p>
      <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.035em] text-white">Diagram lab</h1>
      <p className="mt-1 max-w-[720px] text-[14px] text-lp-soft">Describe a figure and Refyn picks exact values; the lab calculates the geometry and draws it to scale. Edit it by hand or in words, then download it or drop it into a worksheet.</p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Panel className="p-4" delay={40}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask("make");
              }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={look.diagramIdeas[0]} className={cn(inputCls, "h-11 flex-1")} aria-label="Describe a diagram" />
              <button type="submit" disabled={busy !== null || !prompt.trim()} className={cn(primaryBtn, "h-11")}>
                {busy === "make" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Draw it
              </button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {look.diagramIdeas.map((d) => (
                <button key={d} type="button" onClick={() => setPrompt(d)} className="rounded-full border border-lp-line px-2.5 py-1 text-[11.5px] text-lp-soft hover:border-lp-sky/40 hover:text-white">
                  {d}
                </button>
              ))}
            </div>
          </Panel>

          <div className="rounded-[28px] border border-lp-line bg-lp-deep/50 p-3 sm:p-5">
            <div className="rounded-2xl bg-[#FFFFFF] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
              <div ref={hostRef} className="mx-auto max-w-[560px]">
                {spec && <DiagramView spec={spec} accent={look.accent} />}
              </div>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption or question to go with it"
                className="mt-3 w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-center text-[14px] text-[#374151] hover:border-[#E5E7EB] focus:border-[#93C5FD] focus:outline-none"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={toWorksheet} className={primaryBtn}>
                <FilePlus2 className="h-4 w-4" /> Add to a worksheet
              </button>
              <button type="button" onClick={downloadPng} className={ghostBtn}>
                <ImageDown className="h-4 w-4" /> PNG
              </button>
              <button type="button" onClick={downloadSvg} className={ghostBtn}>
                <Download className="h-4 w-4" /> SVG
              </button>
              <button type="button" onClick={save} className={ghostBtn}>
                {saved ? <Check className="h-4 w-4 text-lp-green" /> : <Save className="h-4 w-4" />} {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          <Panel className="p-4" delay={80}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask("tweak");
              }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input value={tweak} onChange={(e) => setTweak(e.target.value)} placeholder="Change it in words: “label the hypotenuse x and hide angle B”" className={cn(inputCls, "h-10 flex-1 py-1.5")} aria-label="Change the diagram" />
              <button type="submit" disabled={busy !== null || !tweak.trim() || !spec} className={cn(ghostBtn, "h-10")}>
                {busy === "tweak" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Apply
              </button>
            </form>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          {spec && (spec.kind === "triangle" || spec.kind === "graph" || spec.kind === "supplydemand") && (
            <Panel className="p-4" delay={60}>
              <p className="mb-3 text-[14px] font-medium text-white">{spec.kind === "triangle" ? "Triangle" : spec.kind === "graph" ? "Graph" : "Supply & demand"}</p>
              {spec.kind === "triangle" && <TriangleEditor spec={spec} on={setSpec} />}
              {spec.kind === "graph" && <GraphEditor spec={spec} on={setSpec} />}
              {spec.kind === "supplydemand" && <SdEditor spec={spec} on={setSpec} />}
            </Panel>
          )}

          <Panel className="p-4" delay={90}>
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium text-white">Templates</p>
              <div className="inline-flex rounded-lg border border-lp-line p-0.5">
                {(["mine", "all"] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFilter(f)} className={cn("h-7 rounded-md px-2.5 text-[12px] font-medium", filter === f ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
                    {f === "mine" ? "My subject" : "All"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {gallery.map((c) => (
                <button
                  key={c.kind}
                  type="button"
                  onClick={() => {
                    setSpec(c.example);
                    setCaption(c.name);
                  }}
                  className={cn("group overflow-hidden rounded-2xl border text-left transition-colors", spec?.kind === c.kind ? "border-lp-sky/60" : "border-lp-line hover:border-lp-sky/40")}
                >
                  <div className="pointer-events-none h-[112px] overflow-hidden bg-[#FFFFFF] p-2">
                    <DiagramView spec={c.example} accent={look.accent} className="h-full [&_svg]:h-full" />
                  </div>
                  <div className="p-2.5">
                    <p className="text-[12.5px] font-medium text-white">{c.name}</p>
                    <p className="line-clamp-2 text-[11px] leading-snug text-lp-mute">{c.blurb}</p>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="p-4" delay={120}>
            <button type="button" onClick={() => setJsonOpen((o) => !o)} className="inline-flex items-center gap-2 text-[13px] font-medium text-lp-soft hover:text-white">
              <Braces className="h-4 w-4" /> {jsonOpen ? "Hide" : "Edit"} exact values (JSON)
            </button>
            {jsonOpen && (
              <>
                <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={12} spellCheck={false} className="mt-3 w-full resize-y rounded-xl border border-lp-line bg-lp-deep/60 p-3 font-mono text-[12px] leading-relaxed text-lp-text focus:border-lp-sky/60 focus:outline-none" />
                <button type="button" onClick={applyJson} className={cn(ghostBtn, "mt-2 h-9")}>
                  Apply
                </button>
              </>
            )}
          </Panel>
        </div>
      </div>
    </StudyShell>
  );
};

export default DiagramLab;
