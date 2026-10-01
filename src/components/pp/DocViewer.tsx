import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageCircleQuestion, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { findNorm, normalize } from "./analyze";

// Shows the student's own report (the real PDF or Word file, or pasted text)
// with feedback drawn on it: highlights over the quoted words and numbered pins.

export type Tone = "strength" | "weakness" | "missing" | "suggestion" | "voice" | "source";
export type ViewMark = { id: string; quote: string; page?: number | null; tone: Tone; label: string; title: string; note: string; fix?: string };

export const TONE_FILL: Record<Tone, string> = {
  strength: "rgba(16,185,129,0.30)",
  weakness: "rgba(245,158,11,0.34)",
  missing: "rgba(244,63,94,0.26)",
  suggestion: "rgba(59,130,246,0.26)",
  voice: "rgba(139,92,246,0.30)",
  source: "rgba(244,63,94,0.30)",
};
export const TONE_SOLID: Record<Tone, string> = {
  strength: "#10B981", weakness: "#F59E0B", missing: "#F43F5E", suggestion: "#3B82F6", voice: "#8B5CF6", source: "#F43F5E",
};
export const TONE_LABEL: Record<Tone, string> = {
  strength: "Earns credit", weakness: "To improve", missing: "Missing", suggestion: "Suggestion", voice: "Generic voice", source: "Check source",
};

type Props = {
  kind: "pdf" | "docx" | "text";
  blob?: Blob | null;
  text: string;
  marks: ViewMark[];
  active: string | null;
  onPick: (id: string | null) => void;
  onExplain?: (m: ViewMark) => void;
  /** Called with the ids of marks that could be placed in the document */
  onPlaced?: (ids: Set<string>) => void;
};

/* ---------- PDF ---------- */

type Item = { str: string; transform: number[]; width: number; hasEOL?: boolean };
type PageText = { items: Item[]; raw: string; owner: [number, number][]; vw: number; vh: number; vt: number[] };
type Placement = { id: string; page: number; start: number; end: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;
async function pdfjs() {
  if (pdfjsLib) return pdfjsLib;
  const lib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  lib.GlobalWorkerOptions.workerSrc = worker;
  pdfjsLib = lib;
  return lib;
}

/** Page text built the same way the report text was extracted, with each character's item. */
function pageText(items: Item[]): Pick<PageText, "raw" | "owner"> {
  let raw = "";
  const owner: [number, number][] = [];
  items.forEach((it, k) => {
    for (let j = 0; j < it.str.length; j++) { raw += it.str[j]; owner.push([k, j]); }
    if (it.hasEOL) { raw += "\n"; owner.push([-1, -1]); }
  });
  return { raw, owner };
}

function placeAll(pages: PageText[], marks: ViewMark[]): Placement[] {
  const norms = pages.map((p) => normalize(p.raw));
  const out: Placement[] = [];
  for (const m of marks) {
    if (!m.quote) continue;
    const order = [...pages.keys()];
    if (m.page && m.page >= 1 && m.page <= pages.length) order.unshift(m.page - 1);
    for (const i of order) {
      const hit = findNorm(norms[i].norm, m.quote);
      if (!hit) continue;
      out.push({ id: m.id, page: i + 1, start: norms[i].map[hit[0]], end: norms[i].map[Math.min(norms[i].map.length - 1, hit[1] - 1)] + 1 });
      break;
    }
  }
  return out;
}

type Rect = { left: number; top: number; width: number; height: number };

function rectsFor(p: PageText, start: number, end: number, scale: number): Rect[] {
  const lib = pdfjsLib;
  const groups = new Map<number, [number, number]>();
  for (let c = start; c < end; c++) {
    const [k, j] = p.owner[c] ?? [-1, -1];
    if (k < 0) continue;
    const g = groups.get(k);
    groups.set(k, g ? [Math.min(g[0], j), Math.max(g[1], j)] : [j, j]);
  }
  const vt = p.vt.map((v) => v * scale);
  const rects: Rect[] = [];
  for (const [k, [j0, j1]] of groups) {
    const it = p.items[k];
    const tx = lib.Util.transform(vt, it.transform);
    const fontH = Math.hypot(tx[2], tx[3]) || 10 * scale;
    const charW = (it.width * scale) / Math.max(1, it.str.length);
    rects.push({ left: tx[4] + j0 * charW, top: tx[5] - fontH * 0.95, width: Math.max(4, (j1 - j0 + 1) * charW), height: fontH * 1.25 });
  }
  return rects;
}

const PdfPage: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any; n: number; text: PageText; width: number; placements: Placement[]; markById: Map<string, ViewMark>; active: string | null; onPick: (id: string) => void;
}> = ({ doc, n, text, width, placements, markById, active, onPick }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(n <= 2);
  const scale = width / text.vw;
  const height = text.vh * scale;
  useEffect(() => {
    const el = holder.current;
    if (!el || visible) return;
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) setVisible(true); }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let task: any;
    (async () => {
      const page = await doc.getPage(n);
      if (cancelled || !canvas.current) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const vp = page.getViewport({ scale: scale * dpr });
      const c = canvas.current;
      c.width = vp.width;
      c.height = vp.height;
      task = page.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp });
      await task.promise.catch(() => undefined);
    })();
    return () => { cancelled = true; task?.cancel?.(); };
  }, [doc, n, scale, visible]);

  const drawn = placements.map((p) => ({ p, rects: rectsFor(text, p.start, p.end, scale) })).filter((d) => d.rects.length);
  return (
    <div ref={holder} className="relative mx-auto overflow-hidden rounded-md bg-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)]" style={{ width, height }}>
      <canvas ref={canvas} style={{ width, height, display: "block" }} />
      {!visible && <div className="absolute inset-0 flex items-center justify-center text-[12px] text-slate-400">Page {n}</div>}
      {drawn.map(({ p, rects }) =>
        rects.map((r, i) => {
          const m = markById.get(p.id)!;
          return (
            <button
              key={`${p.id}-${i}`}
              type="button"
              data-mark={i === 0 ? p.id : undefined}
              onClick={() => onPick(p.id)}
              title={m.note}
              aria-label={`${TONE_LABEL[m.tone]}: ${m.note}`}
              className="absolute rounded-[2px] transition-shadow"
              style={{ ...r, background: TONE_FILL[m.tone], mixBlendMode: "multiply", boxShadow: active === p.id ? `0 0 0 2px ${TONE_SOLID[m.tone]}` : undefined, borderBottom: `2px solid ${TONE_SOLID[m.tone]}` }}
            />
          );
        }),
      )}
      {drawn.map(({ p, rects }) => {
        const m = markById.get(p.id)!;
        return (
          <button
            key={`${p.id}-pin`}
            type="button"
            onClick={() => onPick(p.id)}
            className={cn("absolute flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow", active === p.id && "ring-2 ring-offset-1")}
            style={{ right: 4, top: Math.max(2, rects[0].top - 2), background: TONE_SOLID[m.tone] }}
            aria-label={`Note ${m.label}`}
          >
            {m.label}
          </button>
        );
      })}
      <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-slate-900/60 px-1.5 text-[10px] text-white">{n}</span>
    </div>
  );
};

const PdfView: React.FC<Props & { zoom: number }> = ({ blob, marks, active, onPick, onPlaced, zoom }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [doc, setDoc] = useState<any>(null);
  const [pages, setPages] = useState<PageText[] | null>(null);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(240, el.clientWidth - 8));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!blob) return;
    let off = false;
    (async () => {
      try {
        const lib = await pdfjs();
        const d = await lib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        const list: PageText[] = [];
        for (let i = 1; i <= d.numPages; i++) {
          const page = await d.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          const items = ((await page.getTextContent()).items as Item[]).filter((x) => typeof x.str === "string");
          list.push({ items, ...pageText(items), vw: vp.width, vh: vp.height, vt: [...vp.transform] });
        }
        if (!off) { setDoc(d); setPages(list); }
      } catch (e) {
        if (!off) setError((e as Error).message || "Couldn't open the PDF.");
      }
    })();
    return () => { off = true; };
  }, [blob]);

  const placements = useMemo(() => (pages ? placeAll(pages, marks) : []), [pages, marks]);
  const markById = useMemo(() => new Map(marks.map((m) => [m.id, m])), [marks]);
  useEffect(() => { onPlaced?.(new Set(placements.map((p) => p.id))); }, [placements, onPlaced]);

  if (error) return <p className="rounded-xl border border-lp-red/40 p-4 text-[13px] text-lp-red">{error}</p>;
  return (
    <div ref={box} className="space-y-4">
      {!pages || !doc || !width ? (
        <div className="flex h-60 items-center justify-center gap-2 text-[13px] text-lp-mute"><Loader2 className="h-4 w-4 animate-spin" /> Opening your PDF…</div>
      ) : (
        pages.map((p, i) => (
          <PdfPage key={i} doc={doc} n={i + 1} text={p} width={width * zoom} placements={placements.filter((x) => x.page === i + 1)} markById={markById} active={active} onPick={onPick} />
        ))
      )}
    </div>
  );
};

/* ---------- Word ---------- */

const BLOCK = "p,li,td,th,h1,h2,h3,h4,h5,h6,section,article";

function unwrapMarks(root: HTMLElement) {
  root.querySelectorAll("sup[data-pin]").forEach((s) => s.remove());
  root.querySelectorAll("mark[data-mark]").forEach((m) => {
    const parent = m.parentNode!;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
    parent.normalize();
  });
}

function wrapMarks(root: HTMLElement, marks: ViewMark[], active: string | null): Set<string> {
  const placed = new Set<string>();
  for (const m of marks) {
    if (!m.quote) continue;
    // Fresh text map each time: earlier wraps split text nodes
    const nodes: { node: Text; start: number }[] = [];
    let combined = "";
    let lastBlock: Element | null = null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest("style,script,sup[data-pin]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
      const block = n.parentElement?.closest(BLOCK) ?? null;
      if (combined && block !== lastBlock) combined += "\n";
      lastBlock = block;
      nodes.push({ node: n, start: combined.length });
      combined += n.data;
    }
    const { norm, map } = normalize(combined);
    const hit = findNorm(norm, m.quote);
    if (!hit) continue;
    const s = map[hit[0]], e = map[Math.min(map.length - 1, hit[1] - 1)] + 1;
    let first: HTMLElement | null = null;
    for (const { node, start } of nodes) {
      const end = start + node.data.length;
      if (end <= s || start >= e) continue;
      const a = Math.max(0, s - start), b = Math.min(node.data.length, e - start);
      if (b <= a) continue;
      const mid = node.splitText(a);
      mid.splitText(b - a);
      const mark = document.createElement("mark");
      mark.dataset.mark = m.id;
      mark.title = m.note;
      mark.style.background = TONE_FILL[m.tone];
      mark.style.color = "inherit";
      mark.style.borderBottom = `2px solid ${TONE_SOLID[m.tone]}`;
      mark.style.cursor = "pointer";
      mark.style.borderRadius = "2px";
      if (active === m.id) mark.style.boxShadow = `0 0 0 2px ${TONE_SOLID[m.tone]}`;
      mid.parentNode!.insertBefore(mark, mid);
      mark.appendChild(mid);
      if (!first) first = mark;
    }
    if (first) {
      placed.add(m.id);
      const pin = document.createElement("sup");
      pin.dataset.pin = m.id;
      pin.textContent = m.label;
      pin.style.cssText = `background:${TONE_SOLID[m.tone]};color:#fff;border-radius:999px;padding:0 5px;margin-right:2px;font:700 10px/16px Inter,system-ui,sans-serif;cursor:pointer;`;
      first.parentNode!.insertBefore(pin, first);
    }
  }
  return placed;
}

const DOCX_CSS = `.pp-docx .docx-wrapper{background:transparent!important;padding:0!important;align-items:flex-start}
.pp-docx .docx-wrapper>section.docx{margin-bottom:16px!important;box-shadow:0 8px 30px -12px rgba(0,0,0,.45)!important;border-radius:6px}`;

const DocxView: React.FC<Props & { zoom: number }> = ({ blob, marks, active, onPick, onPlaced, zoom }) => {
  const [fit, setFit] = useState(1);
  useEffect(() => {
    if (document.getElementById("pp-docx-css")) return;
    const st = document.createElement("style");
    st.id = "pp-docx-css";
    st.textContent = DOCX_CSS;
    document.head.appendChild(st);
  }, []);
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!blob || !host.current) return;
    let off = false;
    setReady(false);
    (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        host.current!.innerHTML = "";
        await renderAsync(blob, host.current!, undefined, { className: "docx", inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: false, renderHeaders: true, renderFooters: true, useBase64URL: true });
        if (!off) setReady(true);
      } catch (e) {
        if (!off) setError((e as Error).message || "Couldn't open the document.");
      }
    })();
    return () => { off = true; };
  }, [blob]);
  useEffect(() => {
    const root = host.current;
    if (!ready || !root) return;
    const measure = () => {
      const page = root.querySelector("section.docx") as HTMLElement | null;
      const w = page?.offsetWidth ?? 0;
      if (w) setFit(Math.min(1, (root.clientWidth - 8) / w));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [ready]);
  useEffect(() => {
    const wrapper = host.current?.querySelector(".docx-wrapper") as (HTMLElement & { style: CSSStyleDeclaration & { zoom?: string } }) | null;
    if (wrapper) wrapper.style.zoom = String(fit * zoom);
  }, [fit, zoom, ready]);
  useEffect(() => {
    const root = host.current;
    if (!ready || !root) return;
    unwrapMarks(root);
    onPlaced?.(wrapMarks(root, marks, active));
  }, [ready, marks, active, onPlaced]);
  return (
    <div className="relative">
      {error && <p className="rounded-xl border border-lp-red/40 p-4 text-[13px] text-lp-red">{error}</p>}
      {!ready && !error && <div className="flex h-60 items-center justify-center gap-2 text-[13px] text-lp-mute"><Loader2 className="h-4 w-4 animate-spin" /> Opening your document…</div>}
      <div
        ref={host}
        className="pp-docx overflow-x-auto rounded-xl"
        onClick={(e) => {
          const el = (e.target as HTMLElement).closest("[data-mark],[data-pin]") as HTMLElement | null;
          if (el) onPick(el.dataset.mark ?? el.dataset.pin ?? null);
        }}
      />
    </div>
  );
};

/* ---------- pasted text ---------- */

const TextView: React.FC<Props> = ({ text, marks, active, onPick, onPlaced }) => {
  const placed = useMemo(() => {
    const out: { m: ViewMark; start: number; end: number }[] = [];
    const { norm, map } = normalize(text);
    for (const m of marks) {
      if (!m.quote) continue;
      const hit = findNorm(norm, m.quote);
      if (hit) out.push({ m, start: map[hit[0]], end: map[Math.min(map.length - 1, hit[1] - 1)] + 1 });
    }
    out.sort((a, b) => a.start - b.start);
    const kept: typeof out = [];
    for (const p of out) if (!kept.length || p.start >= kept[kept.length - 1].end) kept.push(p);
    return kept;
  }, [text, marks]);
  useEffect(() => { onPlaced?.(new Set(placed.map((p) => p.m.id))); }, [placed, onPlaced]);
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const p of placed) {
    if (p.start > at) parts.push(text.slice(at, p.start));
    parts.push(
      <span key={p.m.id}>
        <sup className="mr-0.5 cursor-pointer rounded-full px-1 text-[10px] font-bold text-white" style={{ background: TONE_SOLID[p.m.tone] }} onClick={() => onPick(p.m.id)}>{p.m.label}</sup>
        <mark data-mark={p.m.id} title={p.m.note} onClick={() => onPick(p.m.id)} className="cursor-pointer rounded-[2px] text-inherit" style={{ background: TONE_FILL[p.m.tone], borderBottom: `2px solid ${TONE_SOLID[p.m.tone]}`, boxShadow: active === p.m.id ? `0 0 0 2px ${TONE_SOLID[p.m.tone]}` : undefined }}>
          {text.slice(p.start, p.end)}
        </mark>
      </span>,
    );
    at = p.end;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <div className="whitespace-pre-wrap rounded-xl bg-white px-6 py-6 text-[14.5px] leading-[1.75] text-slate-800 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)] sm:px-9">{parts}</div>;
};

/* ---------- the viewer ---------- */

export const DocViewer: React.FC<Props> = (props) => {
  const { marks, active, onPick, onExplain, kind } = props;
  const [zoom, setZoom] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);
  const activeMark = marks.find((m) => m.id === active) ?? null;
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => {
      const el = scroller.current?.querySelector(`[data-mark="${CSS.escape(active)}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [active]);
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-lp-line bg-lp-deep/50">
      <div className="flex shrink-0 items-center gap-2 border-b border-lp-line px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-[12.5px] text-lp-mute">{kind === "pdf" ? "Your PDF" : kind === "docx" ? "Your Word document" : "Your report"} · {marks.filter((m) => m.quote).length} notes</p>
        {kind !== "text" && (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))} className="flex h-7 w-7 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-10 text-center text-[11.5px] tabular-nums text-lp-mute">{Math.round(zoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))} className="flex h-7 w-7 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>
      {activeMark && (
        <div className="shrink-0 border-b border-lp-line bg-lp-surface px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ background: TONE_SOLID[activeMark.tone] }}>{activeMark.label}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium" style={{ color: TONE_SOLID[activeMark.tone] }}>{TONE_LABEL[activeMark.tone]} · {activeMark.title}</p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-white">{activeMark.note}</p>
              {activeMark.fix && <p className="mt-1 text-[13px] leading-relaxed text-lp-soft"><span className="font-medium text-lp-sky">What to do: </span>{activeMark.fix}</p>}
              {onExplain && (
                <button type="button" onClick={() => onExplain(activeMark)} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 text-[12.5px] text-lp-sky hover:border-lp-blue/50">
                  <MessageCircleQuestion className="h-3.5 w-3.5" /> Explain this
                </button>
              )}
            </div>
            <button type="button" aria-label="Close note" onClick={() => onPick(null)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-lp-mute hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
        {kind === "pdf" ? <PdfView {...props} zoom={zoom} /> : kind === "docx" ? <DocxView {...props} zoom={zoom} /> : <TextView {...props} />}
      </div>
    </div>
  );
};
