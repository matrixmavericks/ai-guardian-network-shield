import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Copy, Download, FileText, Image as ImageIcon, Loader2, Palette, Play,
  Plus, Presentation, Redo2, Send, Sparkles, Square, Trash2, Undo2, Wand2, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ACCENTS, FONT_PAIRS, THEMES, loadDeckFonts, resolveTheme } from "./themes";
import { DECK_CSS, ScaledSlide, SLIDE_H, SLIDE_W, SlideView, type ImageAction } from "./SlideView";
import { IMAGE_STYLES, LAYOUTS, blankSlide, newId, sanitizeSlide, switchLayout, type Deck, type LayoutId, type Slide } from "./types";
import { generateImage, parsePartial, streamDeck, streamEdit, type StreamEvent } from "./stream";
import { loadDeck, saveDeck, uploadSlideImage } from "./store";
import { exportPptx, pptxBlob } from "./exportPptx";
import { exportPdf } from "./exportPdf";
import { googleReady, saveToDrive } from "../assistant/files/google";

type Status = "loading" | "idle" | "generating" | "editing";
const QUICK = [
  "Make it more visual",
  "Simplify the language for younger students",
  "Add a quiz slide before the end",
  "Add an activity slide students can do in pairs",
  "Shorten the text on every slide",
  "Make the tone more fun",
  "Add a key vocabulary slide",
  "Translate everything into Hindi",
];

const btn = "flex h-9 items-center gap-2 rounded-xl border border-lp-line bg-lp-surface/70 px-3 text-[13px] font-medium text-lp-soft transition-colors hover:border-lp-blue/50 hover:text-white disabled:opacity-50";
const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-lp-mute transition-colors hover:bg-white/[0.07] hover:text-white disabled:opacity-40";

export const DeckStudio: React.FC<{ deckId: string }> = ({ deckId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deck, setDeckState] = useState<Deck | null>(null);
  const deckRef = useRef<Deck | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [live, setLive] = useState<Slide | null>(null);
  const [preview, setPreview] = useState<{ id: string; slide: Slide } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [panel, setPanel] = useState<"design" | "ai" | null>(null);
  const [prompt, setPrompt] = useState("");
  const [scopeSlide, setScopeSlide] = useState(false);
  const [saving, setSaving] = useState<"saved" | "saving" | "error">("saved");
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportMenu, setExportMenu] = useState(false);
  const [addMenu, setAddMenu] = useState<string | null>(null);
  const [presenting, setPresenting] = useState<number | null>(null);
  const [imagePrompt, setImagePrompt] = useState<{ id: string; text: string } | null>(null);
  const [edits, setEdits] = useState<string[]>([]);
  const past = useRef<Deck[]>([]);
  const future = useRef<Deck[]>([]);
  const lastRecord = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const generating = useRef(new Set<string>());
  const uploadFor = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const slideRefs = useRef(new Map<string, HTMLDivElement>());
  const liveRef = useRef<HTMLDivElement>(null);
  // Follow the deck as it's written, until the teacher scrolls away
  const follow = useRef(true);
  const [, force] = useState(0);
  const reveal = (id: string) => setTimeout(() => slideRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);

  const setDeck = useCallback((next: Deck | ((d: Deck) => Deck), record = true) => {
    setDeckState((prev) => {
      if (!prev) return prev;
      const value = typeof next === "function" ? (next as (d: Deck) => Deck)(prev) : next;
      if (record && Date.now() - lastRecord.current > 800) {
        past.current = [...past.current.slice(-49), prev];
        future.current = [];
        lastRecord.current = Date.now();
      }
      deckRef.current = value;
      return value;
    });
  }, []);
  const patchSlide = useCallback((id: string, fn: (s: Slide) => Slide, record = true) => setDeck((d) => ({ ...d, slides: d.slides.map((s) => (s.id === id ? fn(s) : s)) }), record), [setDeck]);

  /* ---------- load ---------- */
  useEffect(() => {
    loadDeckFonts();
    const style = document.createElement("style");
    style.textContent = DECK_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadDeck(deckId).then((row) => {
      if (cancelled) return;
      if (!row) { toast.error("Presentation not found"); navigate("/decks"); return; }
      deckRef.current = row.deck;
      setDeckState(row.deck);
      setSessionId(row.session_id);
      setActive(row.deck.slides[0]?.id ?? null);
      setStatus("idle");
      if (!row.deck.slides.length && row.deck.brief?.topic) generate(row.deck);
      // Images still waiting from last time
      else if (row.deck.slides.some((s) => s.image?.state === "pending")) setTimeout(runImages, 0);
    });
    return () => { cancelled = true; abort.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  /* ---------- autosave ---------- */
  // Debounced, but at least every few seconds while slides stream in; saves run
  // one at a time and always write the latest deck
  const lastSave = useRef(Date.now());
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (!deck || status === "loading") return;
    setSaving("saving");
    const h = setTimeout(() => {
      lastSave.current = Date.now();
      saveChain.current = saveChain.current
        .then(() => (deckRef.current ? saveDeck(deckId, deckRef.current) : undefined))
        .then(() => setSaving("saved"), () => setSaving("error"));
    }, Date.now() - lastSave.current > 4000 ? 0 : 1200);
    return () => clearTimeout(h);
  }, [deck, deckId, status]);

  /* ---------- images ---------- */
  const runImages = useCallback(() => {
    const d = deckRef.current;
    if (!d) return;
    const queue = d.slides.filter((s) => s.image?.state === "pending" && s.image.prompt && !generating.current.has(s.id));
    for (const s of queue) {
      if (generating.current.size >= 2) break;
      generating.current.add(s.id);
      patchSlide(s.id, (x) => ({ ...x, image: { ...x.image!, state: "generating" } }), false);
      generateImage(s.image!.prompt, d.design.imageStyle)
        .then(({ path, url }) => patchSlide(s.id, (x) => (x.image ? { ...x, image: { ...x.image, path, url, state: "done", error: undefined } } : x), false))
        .catch((e) => patchSlide(s.id, (x) => (x.image ? { ...x, image: { ...x.image, state: "error", error: (e as Error).message } } : x), false))
        .finally(() => { generating.current.delete(s.id); runImages(); });
    }
  }, [patchSlide]);

  /* ---------- generation ---------- */
  const generate = async (base: Deck) => {
    if (!base.brief) return;
    setStatus("generating");
    follow.current = true;
    const ctrl = new AbortController();
    abort.current = ctrl;
    let partialText = "";
    const onEvent = (e: StreamEvent) => {
      if (e.type === "item") {
        const it = e.item;
        if (it.type === "deck") {
          setDeck((d) => ({ ...d, title: String(it.title ?? d.title).slice(0, 200), subtitle: typeof it.subtitle === "string" ? it.subtitle : d.subtitle, design: base.design.theme === "auto" && typeof it.theme === "string" && THEMES.some((th) => th.id === it.theme) ? { ...d.design, theme: it.theme } : d.design.theme === "auto" ? { ...d.design, theme: "midnight" } : d.design }), false);
        } else if (it.type === "slide" || it.layout) {
          const slide = sanitizeSlide(it);
          if (!base.design.images && slide.image) delete slide.image;
          setDeck((d) => ({ ...d, slides: [...d.slides, slide] }), false);
          setActive((a) => a ?? slide.id);
          setLive(null);
          partialText = "";
        }
      } else if (e.type === "partial") {
        partialText = e.text;
        const p = parsePartial(partialText);
        if (p && (p.type === "slide" || p.layout) && (p.title || p.quote || p.question)) setLive(sanitizeSlide({ ...p, id: "live", layout: LAYOUTS.some((l) => l.id === p.layout) ? p.layout : "bullets" }));
      } else if (e.type === "error") toast.error(e.message);
    };
    try {
      await streamDeck(base.brief, base.design, onEvent, ctrl.signal);
    } catch (e) {
      if (!ctrl.signal.aborted) toast.error((e as Error).message);
    } finally {
      setLive(null);
      setStatus("idle");
      setDeck((d) => ({ ...d, design: d.design.theme === "auto" ? { ...d.design, theme: "midnight" } : d.design }), false);
      if (deckRef.current?.design.images) runImages();
    }
  };

  /* ---------- AI edits ---------- */
  const runEdit = async (instruction: string) => {
    const d = deckRef.current;
    if (!d || !instruction.trim() || status !== "idle") return;
    const scope = scopeSlide && active ? [active] : null;
    setStatus("editing");
    setEdits((e) => [instruction, ...e].slice(0, 12));
    setPrompt("");
    past.current = [...past.current.slice(-49), d];
    future.current = [];
    const ctrl = new AbortController();
    abort.current = ctrl;
    const applied = new Set<string>();
    const onEvent = (e: StreamEvent) => {
      if (e.type === "partial") {
        const p = parsePartial(e.text) as { op?: string; id?: string; slide?: Record<string, unknown> } | null;
        const keep = p?.id ? deckRef.current?.slides.find((s) => s.id === p.id) : undefined;
        if (p?.op === "update" && keep && p.slide && Object.keys(p.slide).length > 1) setPreview({ id: keep.id, slide: sanitizeSlide({ ...keep, ...p.slide }, keep) });
        return;
      }
      if (e.type === "error") { toast.error(e.message); return; }
      if (e.type !== "item") return;
      const op = e.item as { op?: string; id?: string; after?: string | null; slide?: Record<string, unknown>; title?: string; subtitle?: string };
      setPreview(null);
      setDeck((cur) => {
        if (op.op === "update" && op.id && op.slide) {
          applied.add(op.id);
          return { ...cur, slides: cur.slides.map((s) => (s.id === op.id ? sanitizeSlide({ ...op.slide }, s) : s)) };
        }
        if (op.op === "insert" && op.slide) {
          const slide = sanitizeSlide({ ...op.slide, id: undefined });
          if (!cur.design.images && slide.image) delete slide.image;
          const at = op.after ? cur.slides.findIndex((s) => s.id === op.after) + 1 : 0;
          applied.add(slide.id);
          reveal(slide.id);
          return { ...cur, slides: [...cur.slides.slice(0, at), slide, ...cur.slides.slice(at)] };
        }
        if (op.op === "delete" && op.id) return { ...cur, slides: cur.slides.filter((s) => s.id !== op.id) };
        if (op.op === "deck") return { ...cur, title: op.title ?? cur.title, subtitle: op.subtitle ?? cur.subtitle };
        return cur;
      }, false);
    };
    try {
      await streamEdit(d, instruction, scope, onEvent, ctrl.signal);
      if (!applied.size) toast("Refyn didn't change anything. Try saying exactly what to change.");
    } catch (e) {
      if (!ctrl.signal.aborted) toast.error((e as Error).message);
    } finally {
      setPreview(null);
      setStatus("idle");
      runImages();
    }
  };

  /* ---------- undo / redo ---------- */
  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev || !deckRef.current) return;
    future.current.push(deckRef.current);
    deckRef.current = prev;
    setDeckState(prev);
    force((n) => n + 1);
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !deckRef.current) return;
    past.current.push(deckRef.current);
    deckRef.current = next;
    setDeckState(next);
    force((n) => n + 1);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.isContentEditable || ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
      if (typing || presenting !== null) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, presenting]);

  /* ---------- slide actions ---------- */
  const addSlide = (after: string | null, layout: LayoutId) => {
    const s = blankSlide(layout);
    if (s.image && !s.image.prompt) s.image = { prompt: "", state: "none" };
    setDeck((d) => {
      const at = after ? d.slides.findIndex((x) => x.id === after) + 1 : d.slides.length;
      return { ...d, slides: [...d.slides.slice(0, at), s, ...d.slides.slice(at)] };
    });
    setAddMenu(null);
    setActive(s.id);
    setTimeout(() => slideRefs.current.get(s.id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };
  const move = (id: string, dir: -1 | 1) =>
    setDeck((d) => {
      const i = d.slides.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.slides.length) return d;
      const slides = [...d.slides];
      [slides[i], slides[j]] = [slides[j], slides[i]];
      return { ...d, slides };
    });
  const duplicate = (id: string) =>
    setDeck((d) => {
      const i = d.slides.findIndex((s) => s.id === id);
      const copy = { ...structuredClone(d.slides[i]), id: newId() };
      return { ...d, slides: [...d.slides.slice(0, i + 1), copy, ...d.slides.slice(i + 1)] };
    });
  const remove = (id: string) => setDeck((d) => ({ ...d, slides: d.slides.filter((s) => s.id !== id) }));
  const reorder = (from: string, to: string) =>
    setDeck((d) => {
      const slides = [...d.slides];
      const i = slides.findIndex((s) => s.id === from);
      const [m] = slides.splice(i, 1);
      slides.splice(slides.findIndex((s) => s.id === to), 0, m);
      return { ...d, slides };
    });

  const imageAction = (s: Slide, a: ImageAction) => {
    if (a === "remove") return patchSlide(s.id, (x) => ({ ...x, image: undefined, background: x.background === "image" ? "default" : x.background }));
    if (a === "upload") { uploadFor.current = s.id; fileInput.current?.click(); return; }
    if (a === "prompt" || !s.image?.prompt) return setImagePrompt({ id: s.id, text: s.image?.prompt || s.title || "" });
    patchSlide(s.id, (x) => ({ ...x, image: { ...x.image!, state: "pending", error: undefined } }), false);
    setTimeout(runImages, 0);
  };

  /* ---------- export ---------- */
  const fileName = (deck?.title || "Presentation").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
  const doExport = async (kind: "pptx" | "pdf" | "slides") => {
    if (!deck) return;
    setExportMenu(false);
    setExporting(kind);
    try {
      if (kind === "pptx") await exportPptx(deck, fileName);
      else if (kind === "pdf") await exportPdf(deck);
      else {
        const { url } = await saveToDrive(await pptxBlob(deck), deck.title, "slides");
        window.open(url, "_blank", "noopener");
        toast.success("Saved to Google Slides");
      }
    } catch (e) {
      toast.error((e as Error).message || "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const theme = useMemo(() => (deck ? resolveTheme(deck.design) : THEMES[0]), [deck]);
  const slideCount = deck?.slides.length ?? 0;
  useEffect(() => {
    if (status === "generating" && follow.current) (liveRef.current ?? [...slideRefs.current.values()].pop())?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [slideCount, !!live, status]); // eslint-disable-line react-hooks/exhaustive-deps
  // The slide an AI edit is rewriting comes into view
  useEffect(() => {
    if (preview?.id) slideRefs.current.get(preview.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [preview?.id]);
  if (!deck || status === "loading")
    return <div className="lp-app flex h-screen items-center justify-center bg-lp-bg text-lp-soft"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening presentation…</div>;

  const slides = deck.slides;
  const shown = (s: Slide) => (preview?.id === s.id ? preview.slide : s);
  const total = slides.length + (live ? 1 : 0);
  const target = deck.brief?.slides ?? total;
  const activeIndex = Math.max(0, slides.findIndex((s) => s.id === active));
  const busy = status !== "idle";
  const imagesBusy = slides.filter((s) => s.image?.state === "generating" || s.image?.state === "pending").length;

  return (
    <div className="lp-app flex h-screen flex-col bg-lp-bg font-ui text-white antialiased">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          const id = uploadFor.current;
          if (!f || !id || !user) return;
          patchSlide(id, (x) => ({ ...x, image: { prompt: x.image?.prompt ?? "", alt: x.image?.alt, state: "generating" } }), true);
          try {
            const { path, url } = await uploadSlideImage(user.id, f);
            patchSlide(id, (x) => ({ ...x, image: { ...x.image!, path, url, state: "done" } }), false);
          } catch (err) {
            patchSlide(id, (x) => ({ ...x, image: { ...x.image!, state: "error", error: (err as Error).message } }), false);
          }
        }}
      />

      {/* top bar */}
      <header className="lp-chrome flex h-14 shrink-0 items-center gap-3 border-b border-lp-line bg-lp-deep px-3 sm:px-4">
        <Link to={sessionId ? `/ai-learning-assistant?session=${sessionId}` : "/decks"} className={iconBtn} aria-label="Back" title={sessionId ? "Back to the chat" : "All presentations"}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Presentation className="hidden h-5 w-5 text-lp-sky sm:block" />
        <input
          value={deck.title}
          onChange={(e) => setDeck((d) => ({ ...d, title: e.target.value }))}
          aria-label="Presentation title"
          className="min-w-0 flex-1 truncate bg-transparent text-[15px] font-medium text-white outline-none placeholder:text-lp-mute"
        />
        <span className="hidden items-center gap-1.5 text-[12px] text-lp-mute md:flex">
          {saving === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saving === "error" ? <X className="h-3.5 w-3.5 text-lp-red" /> : <Check className="h-3.5 w-3.5 text-lp-green" />}
          {saving === "saving" ? "Saving" : saving === "error" ? "Not saved" : "Saved"}
        </span>
        <button type="button" onClick={undo} disabled={!past.current.length || busy} className={iconBtn} title="Undo (Ctrl+Z)" aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
        <button type="button" onClick={redo} disabled={!future.current.length || busy} className={iconBtn} title="Redo" aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
        <button type="button" onClick={() => setPanel(panel === "design" ? null : "design")} className={cn(btn, panel === "design" && "border-lp-blue/60 text-white")}>
          <Palette className="h-4 w-4 text-lp-sky" /> <span className="hidden sm:inline">Design</span>
        </button>
        <button type="button" onClick={() => setPresenting(activeIndex)} disabled={!slides.length} className={btn}>
          <Play className="h-4 w-4 text-lp-sky" /> <span className="hidden sm:inline">Present</span>
        </button>
        <div className="relative">
          <button type="button" onClick={() => setExportMenu((v) => !v)} disabled={!slides.length || !!exporting} className="flex h-9 items-center gap-2 rounded-xl bg-lp-blue px-3.5 text-[13px] font-medium text-white shadow-[0_8px_24px_-10px_rgba(59,130,246,0.9)] hover:bg-[#2F6FE0] disabled:opacity-60">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} <span className="hidden sm:inline">Export</span> <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {exportMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setExportMenu(false)} />
              <div className="lp-pop lp-fade absolute right-0 top-11 z-40 w-64 rounded-2xl border border-lp-line bg-lp-deep p-1.5 shadow-2xl">
                {[
                  { k: "pptx" as const, label: "PowerPoint (.pptx)", hint: "Editable slides with speaker notes", icon: Presentation },
                  { k: "pdf" as const, label: "PDF", hint: "Exactly as it looks here", icon: FileText },
                  ...(googleReady() ? [{ k: "slides" as const, label: "Google Slides", hint: "Opens in your Drive", icon: Presentation }] : []),
                ].map((o) => (
                  <button key={o.k} type="button" onClick={() => doExport(o.k)} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.05]">
                    <o.icon className="mt-0.5 h-4 w-4 text-lp-sky" />
                    <span>
                      <span className="block text-[13.5px] text-white">{o.label}</span>
                      <span className="block text-[12px] text-lp-mute">{o.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* progress */}
      {(status === "generating" || status === "editing" || imagesBusy > 0) && (
        <div className="flex shrink-0 items-center gap-3 border-b border-lp-line bg-lp-blue/10 px-4 py-2 text-[13px] text-lp-soft">
          <Sparkles className="h-4 w-4 animate-pulse text-lp-sky" />
          <span className="min-w-0 flex-1 truncate">
            {status === "generating"
              ? `Writing slide ${Math.min(total || 1, target)} of ${target}…`
              : status === "editing"
                ? "Refyn is making your changes…"
                : `Creating ${imagesBusy} image${imagesBusy === 1 ? "" : "s"}…`}
          </span>
          {status === "generating" && (
            <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-lp-line sm:block">
              <div className="h-full rounded-full bg-lp-blue transition-all duration-500" style={{ width: `${Math.min(100, (slides.length / Math.max(1, target)) * 100)}%` }} />
            </div>
          )}
          {busy && (
            <button type="button" onClick={() => abort.current?.abort()} className="flex h-7 items-center gap-1.5 rounded-lg border border-lp-line px-2.5 text-[12px] hover:text-white">
              <Square className="h-3 w-3" /> Stop
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* thumbnails */}
        <aside className="lp-chrome hidden w-[184px] shrink-0 overflow-y-auto border-r border-lp-line bg-lp-deep/60 p-3 md:block">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/slide", s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const from = e.dataTransfer.getData("text/slide"); if (from && from !== s.id) reorder(from, s.id); }}
              onClick={() => { setActive(s.id); slideRefs.current.get(s.id)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
              className={cn("mb-2.5 flex w-full items-start gap-2 rounded-xl p-1 text-left transition-colors", active === s.id ? "bg-lp-blue/15" : "hover:bg-white/[0.04]")}
            >
              <span className="w-4 pt-1 text-right text-[11px] tabular-nums text-lp-mute">{i + 1}</span>
              <div className={cn("min-w-0 flex-1 overflow-hidden rounded-md ring-1", active === s.id ? "ring-lp-sky" : "ring-lp-line")}>
                <ScaledSlide rounded={6}>
                  <SlideView slide={shown(s)} theme={theme} index={i} total={slides.length} deckTitle={deck.title} />
                </ScaledSlide>
              </div>
            </button>
          ))}
          {live && (
            <div className="mb-2.5 ml-6 overflow-hidden rounded-md ring-1 ring-lp-sky/60">
              <ScaledSlide rounded={6}><SlideView slide={live} theme={theme} index={slides.length} total={target} deckTitle={deck.title} /></ScaledSlide>
            </div>
          )}
          {!busy && (
            <button type="button" onClick={() => setAddMenu("end")} className="ml-6 flex w-[calc(100%-24px)] items-center justify-center gap-1.5 rounded-lg border border-dashed border-lp-line py-3 text-[12px] text-lp-mute hover:border-lp-blue/50 hover:text-white">
              <Plus className="h-3.5 w-3.5" /> Slide
            </button>
          )}
        </aside>

        {/* slides */}
        <main onWheel={() => { follow.current = false; }} onTouchMove={() => { follow.current = false; }} className="min-w-0 flex-1 overflow-y-auto px-3 pb-40 pt-6 sm:px-8">
          <div className="mx-auto max-w-[1000px] space-y-8">
            {slides.length === 0 && !live && (
              <div className="rounded-3xl border border-dashed border-lp-line p-10 text-center text-lp-soft">
                {status === "generating" ? (
                  <><Loader2 className="mx-auto h-6 w-6 animate-spin text-lp-sky" /><p className="mt-3">Planning your presentation…</p></>
                ) : (
                  <>
                    <p className="text-[15px]">This presentation is empty.</p>
                    <button type="button" onClick={() => setAddMenu("end")} className={cn(btn, "mx-auto mt-4")}><Plus className="h-4 w-4" /> Add a slide</button>
                  </>
                )}
              </div>
            )}
            {slides.map((s, i) => (
              <div
                key={s.id}
                ref={(el) => { if (el) slideRefs.current.set(s.id, el); else slideRefs.current.delete(s.id); }}
                onMouseDown={() => setActive(s.id)}
                className="lp-fade group/slide relative"
                style={{ animationFillMode: "both" }}
              >
                <div className={cn("mb-2 flex flex-wrap items-center gap-1 transition-opacity", active === s.id ? "opacity-100" : "opacity-0 group-hover/slide:opacity-100")}>
                  <span className="mr-1 text-[12px] tabular-nums text-lp-mute">{i + 1}</span>
                  <select
                    value={s.layout}
                    onChange={(e) => patchSlide(s.id, (x) => switchLayout(x, e.target.value as LayoutId))}
                    aria-label="Layout"
                    className="h-8 rounded-lg border border-lp-line bg-lp-surface px-2 text-[12.5px] text-lp-soft outline-none hover:text-white"
                  >
                    {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                  <select
                    value={s.background ?? "default"}
                    onChange={(e) => patchSlide(s.id, (x) => ({ ...x, background: e.target.value as Slide["background"], image: e.target.value === "image" && !x.image ? { prompt: x.title ?? "", state: "none" } : x.image }))}
                    aria-label="Background"
                    className="h-8 rounded-lg border border-lp-line bg-lp-surface px-2 text-[12.5px] text-lp-soft outline-none hover:text-white"
                  >
                    <option value="default">Theme background</option>
                    <option value="accent">Accent colour</option>
                    <option value="image">Image background</option>
                  </select>
                  {!s.image && (
                    <button type="button" onClick={() => setImagePrompt({ id: s.id, text: s.title ?? "" })} className={iconBtn} title="Add an image" aria-label="Add an image"><ImageIcon className="h-4 w-4" /></button>
                  )}
                  {s.layout === "split" && (
                    <button type="button" onClick={() => patchSlide(s.id, (x) => ({ ...x, imageSide: x.imageSide === "left" ? "right" : "left" }))} className={iconBtn} title="Swap sides" aria-label="Swap image side">⇆</button>
                  )}
                  <button type="button" onClick={() => { setActive(s.id); setScopeSlide(true); setPanel("ai"); }} className={iconBtn} title="Edit this slide with AI" aria-label="Edit this slide with AI"><Wand2 className="h-4 w-4" /></button>
                  <span className="ml-auto flex items-center gap-0.5">
                    <button type="button" onClick={() => move(s.id, -1)} disabled={i === 0} className={iconBtn} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => move(s.id, 1)} disabled={i === slides.length - 1} className={iconBtn} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => duplicate(s.id)} className={iconBtn} aria-label="Duplicate"><Copy className="h-4 w-4" /></button>
                    <button type="button" onClick={() => remove(s.id)} className={cn(iconBtn, "hover:text-lp-red")} aria-label="Delete slide"><Trash2 className="h-4 w-4" /></button>
                  </span>
                </div>
                <div className={cn("rounded-[20px] ring-2 transition-shadow", preview?.id === s.id ? "ring-lp-cyan shadow-[0_0_0_6px_rgba(63,233,255,0.12)]" : active === s.id ? "ring-lp-blue/60" : "ring-transparent")}>
                  <ScaledSlide rounded={18}>
                    <SlideView
                      slide={shown(s)}
                      theme={theme}
                      index={i}
                      total={slides.length}
                      deckTitle={deck.title}
                      edit={!busy}
                      typing={preview?.id === s.id}
                      onChange={(p) => patchSlide(s.id, (x) => ({ ...x, ...p }))}
                      onImage={(a) => imageAction(s, a)}
                    />
                  </ScaledSlide>
                </div>
                <details className="mt-2 rounded-xl text-[13px] text-lp-mute" open={!!s.notes && active === s.id}>
                  <summary className="cursor-pointer select-none px-1 py-1 hover:text-white">Speaker notes</summary>
                  <textarea
                    value={s.notes ?? ""}
                    onChange={(e) => patchSlide(s.id, (x) => ({ ...x, notes: e.target.value }))}
                    rows={3}
                    placeholder="What to say on this slide"
                    className="mt-1 w-full resize-y rounded-xl border border-lp-line bg-lp-surface/60 px-3 py-2 text-[13.5px] leading-relaxed text-lp-soft outline-none focus:border-lp-blue/60"
                  />
                </details>
                {!busy && (
                  <div className="relative mt-1 flex justify-center">
                    <button type="button" onClick={() => setAddMenu(addMenu === s.id ? null : s.id)} className="flex h-7 items-center gap-1 rounded-full border border-lp-line bg-lp-surface px-3 text-[12px] text-lp-mute opacity-0 transition-opacity hover:text-white group-hover/slide:opacity-100">
                      <Plus className="h-3.5 w-3.5" /> Add slide
                    </button>
                  </div>
                )}
              </div>
            ))}
            {live && (
              <div ref={liveRef} className="lp-fade">
                <p className="mb-2 flex items-center gap-2 text-[12px] text-lp-sky"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Slide {slides.length + 1}</p>
                <div className="rounded-[20px] ring-2 ring-lp-cyan/50">
                  <ScaledSlide rounded={18}><SlideView slide={live} theme={theme} index={slides.length} total={target} deckTitle={deck.title} typing /></ScaledSlide>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* side panel */}
        {panel && (
          <aside className="lp-chrome fixed inset-y-0 right-0 z-30 w-full max-w-[360px] shrink-0 overflow-y-auto border-l border-lp-line bg-lp-deep p-5 shadow-2xl lg:static lg:shadow-none">
            <div className="mb-4 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[15px] font-medium text-white">
                {panel === "design" ? <Palette className="h-4 w-4 text-lp-sky" /> : <Wand2 className="h-4 w-4 text-lp-sky" />}
                {panel === "design" ? "Design" : "Edit with AI"}
              </p>
              <button type="button" onClick={() => setPanel(null)} className={iconBtn} aria-label="Close panel"><X className="h-4 w-4" /></button>
            </div>
            {panel === "design" ? (
              <DesignPanel deck={deck} setDeck={setDeck} onRestyle={() => { setDeck((d) => ({ ...d, slides: d.slides.map((s) => (s.image?.prompt ? { ...s, image: { ...s.image, state: "pending" as const } } : s)) })); setTimeout(runImages, 0); }} />
            ) : (
              <div>
                <div className="flex rounded-xl border border-lp-line bg-lp-surface/60 p-1 text-[12.5px]">
                  {[false, true].map((one) => (
                    <button key={String(one)} type="button" onClick={() => setScopeSlide(one)} className={cn("flex-1 rounded-lg py-1.5", scopeSlide === one ? "bg-lp-blue text-white" : "text-lp-soft hover:text-white")}>
                      {one ? `Slide ${activeIndex + 1}` : "Whole deck"}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(scopeSlide ? ["Make this slide more visual", "Turn this into a timeline", "Turn this into cards", "Add an example", "Simplify this slide", "Write better speaker notes"] : QUICK).map((q) => (
                    <button key={q} type="button" disabled={busy} onClick={() => runEdit(q)} className="rounded-full border border-lp-line px-3 py-1.5 text-[12.5px] text-lp-soft hover:border-lp-blue/50 hover:text-white disabled:opacity-50">{q}</button>
                  ))}
                </div>
                {edits.length > 0 && (
                  <div className="mt-6">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute">Recent changes</p>
                    {edits.map((e, i) => <p key={i} className="mb-1.5 rounded-lg bg-lp-surface/60 px-3 py-2 text-[12.5px] text-lp-soft">{e}</p>)}
                    <button type="button" onClick={undo} disabled={!past.current.length || busy} className={cn(btn, "mt-2")}><Undo2 className="h-4 w-4" /> Undo last change</button>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* prompt bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); runEdit(prompt); }}
        className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center px-3"
      >
        <div className="lp-pop pointer-events-auto flex w-full max-w-[760px] items-center gap-2 rounded-2xl border border-lp-line bg-lp-deep/95 p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <button type="button" onClick={() => setScopeSlide((v) => !v)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-lp-line px-2.5 text-[12.5px] text-lp-soft hover:text-white" title="What the AI will change">
            <Wand2 className="h-3.5 w-3.5 text-lp-sky" /> {scopeSlide ? `Slide ${activeIndex + 1}` : "Whole deck"}
          </button>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={busy}
            placeholder={busy ? "Refyn is working…" : scopeSlide ? "Change this slide: “make it a timeline”, “add an example”…" : "Ask AI to change anything: “add a quiz”, “simplify for Year 7”…"}
            className="min-w-0 flex-1 bg-transparent px-1 text-[14.5px] text-white outline-none placeholder:text-lp-mute"
          />
          <button type="button" onClick={() => setPanel(panel === "ai" ? null : "ai")} className={cn(iconBtn, "hidden sm:flex")} title="Suggestions" aria-label="Suggestions"><Sparkles className="h-4 w-4" /></button>
          <button type="submit" disabled={busy || !prompt.trim()} aria-label="Apply" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lp-blue text-white disabled:bg-lp-raised disabled:text-lp-mute">
            {status === "editing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {/* add slide menu */}
      {addMenu && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-lp-deep/60 p-4 backdrop-blur-sm sm:items-center" onClick={() => setAddMenu(null)}>
          <div className="lp-pop lp-fade w-full max-w-[560px] rounded-3xl border border-lp-line bg-lp-deep p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[15px] font-medium text-white">Add a slide</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {LAYOUTS.map((l) => (
                <button key={l.id} type="button" onClick={() => addSlide(addMenu === "end" ? null : addMenu, l.id)} className="rounded-2xl border border-lp-line bg-lp-surface/60 p-3 text-left hover:border-lp-blue/50">
                  <span className="block text-[13.5px] font-medium text-white">{l.label}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-lp-mute">{l.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* image prompt */}
      {imagePrompt && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-lp-deep/60 p-4 backdrop-blur-sm" onClick={() => setImagePrompt(null)}>
          <form
            className="lp-pop lp-fade w-full max-w-[520px] rounded-3xl border border-lp-line bg-lp-deep p-5"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const { id, text } = imagePrompt;
              if (!text.trim()) return;
              patchSlide(id, (x) => ({ ...x, image: { prompt: text.trim(), alt: x.image?.alt, state: "pending" } }));
              setImagePrompt(null);
              setTimeout(runImages, 0);
            }}
          >
            <p className="flex items-center gap-2 text-[15px] font-medium text-white"><ImageIcon className="h-4 w-4 text-lp-sky" /> Describe the image</p>
            <textarea
              autoFocus
              value={imagePrompt.text}
              onChange={(e) => setImagePrompt({ ...imagePrompt, text: e.target.value })}
              rows={4}
              placeholder="e.g. A cross-section of a leaf showing chloroplasts, sunlight streaming in"
              className="mt-3 w-full resize-none rounded-xl border border-lp-line bg-lp-surface/60 px-3 py-2 text-[14px] text-white outline-none focus:border-lp-blue/60"
            />
            <p className="mt-2 text-[12px] text-lp-mute">Style: {IMAGE_STYLES.find((s) => s.id === deck.design.imageStyle)?.label}. Change it in Design.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setImagePrompt(null)} className={btn}>Cancel</button>
              <button type="submit" className="flex h-9 items-center gap-2 rounded-xl bg-lp-blue px-4 text-[13px] font-medium text-white"><Sparkles className="h-4 w-4" /> Generate</button>
            </div>
          </form>
        </div>
      )}

      {presenting !== null && <PresentMode deck={deck} start={presenting} onClose={() => setPresenting(null)} />}
    </div>
  );
};

/* ---------- design panel ---------- */

const DesignPanel: React.FC<{ deck: Deck; setDeck: (fn: (d: Deck) => Deck) => void; onRestyle: () => void }> = ({ deck, setDeck, onRestyle }) => {
  const d = deck.design;
  const set = (p: Partial<Deck["design"]>) => setDeck((x) => ({ ...x, design: { ...x.design, ...p } }));
  const label = "mb-2 mt-5 text-[11px] font-medium uppercase tracking-[0.18em] text-lp-mute";
  return (
    <div>
      <p className={cn(label, "mt-0")}>Theme</p>
      <div className="grid grid-cols-2 gap-2">
        {THEMES.map((t) => (
          <button key={t.id} type="button" onClick={() => set({ theme: t.id, accent: undefined })} className={cn("overflow-hidden rounded-xl border text-left", d.theme === t.id ? "border-lp-sky ring-2 ring-lp-sky/40" : "border-lp-line hover:border-lp-blue/50")}>
            <div style={{ background: t.bgCss, padding: "12px 12px 10px", height: 70 }}>
              <div style={{ fontFamily: `"${t.heading}", sans-serif`, fontWeight: t.headingWeight, color: t.text, fontSize: 17, textTransform: t.headingCase === "uppercase" ? "uppercase" : "none" }}>Aa</div>
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {[t.accent, t.accent2, t.muted].map((c) => <span key={c} style={{ width: 14, height: 6, borderRadius: 3, background: c }} />)}
              </div>
            </div>
            <p className="bg-lp-surface px-2.5 py-1.5 text-[12px] text-lp-soft">{t.name}</p>
          </button>
        ))}
      </div>
      <p className={label}>Accent colour</p>
      <div className="flex flex-wrap gap-2">
        {ACCENTS.map((c) => (
          <button key={c} type="button" aria-label={`Accent ${c}`} onClick={() => set({ accent: c })} className={cn("h-7 w-7 rounded-full ring-offset-2 ring-offset-lp-deep", d.accent === c && "ring-2 ring-white")} style={{ background: c }} />
        ))}
        <label className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-lp-line text-lp-mute" title="Custom colour">
          <Plus className="h-3.5 w-3.5" />
          <input type="color" className="sr-only" value={d.accent ?? "#6D8BFF"} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} />
        </label>
      </div>
      <p className={label}>Fonts</p>
      <select value={d.font ?? "theme"} onChange={(e) => set({ font: e.target.value === "theme" ? undefined : e.target.value })} className="h-10 w-full rounded-xl border border-lp-line bg-lp-surface px-3 text-[13.5px] text-white outline-none">
        {FONT_PAIRS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
      <p className={label}>Image style</p>
      <div className="grid grid-cols-3 gap-1.5">
        {IMAGE_STYLES.map((s) => (
          <button key={s.id} type="button" onClick={() => set({ imageStyle: s.id })} className={cn("rounded-lg border px-2 py-2 text-[12.5px]", d.imageStyle === s.id ? "border-lp-sky bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>{s.label}</button>
        ))}
      </div>
      <button type="button" onClick={onRestyle} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-lp-line text-[13px] text-lp-soft hover:border-lp-blue/50 hover:text-white">
        <RefreshIcon /> Redo all images in this style
      </button>
      <label className="mt-5 flex items-center justify-between rounded-xl border border-lp-line bg-lp-surface/60 px-3 py-2.5 text-[13px] text-lp-soft">
        AI images for new slides
        <input type="checkbox" checked={d.images} onChange={(e) => set({ images: e.target.checked })} className="h-4 w-4 accent-[#3B82F6]" />
      </label>
    </div>
  );
};
const RefreshIcon = () => <Sparkles className="h-4 w-4 text-lp-sky" />;

/* ---------- present mode ---------- */

const PresentMode: React.FC<{ deck: Deck; start: number; onClose: () => void }> = ({ deck, start, onClose }) => {
  const [i, setI] = useState(start);
  const [scale, setScale] = useState(1);
  const t = resolveTheme(deck.design);
  const ref = useRef<HTMLDivElement>(null);
  // The parent re-renders often (autosave, images): keep this effect from re-running and leaving fullscreen
  const latest = useRef({ onClose, count: deck.slides.length });
  latest.current = { onClose, count: deck.slides.length };
  useEffect(() => {
    const close = () => latest.current.onClose();
    const fit = () => setScale(Math.min(window.innerWidth / SLIDE_W, window.innerHeight / SLIDE_H));
    fit();
    window.addEventListener("resize", fit);
    ref.current?.requestFullscreen?.().catch(() => undefined);
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(e.key)) setI((x) => Math.min(latest.current.count - 1, x + 1));
      if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) setI((x) => Math.max(0, x - 1));
      if (e.key === "Escape") close();
    };
    const onFs = () => { if (!document.fullscreenElement) close(); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    };
  }, []);
  const s = deck.slides[Math.min(i, deck.slides.length - 1)];
  return (
    <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={(e) => setI((x) => (e.clientX < window.innerWidth / 3 ? Math.max(0, x - 1) : Math.min(deck.slides.length - 1, x + 1)))}>
      <div style={{ width: SLIDE_W * scale, height: SLIDE_H * scale, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          <SlideView slide={s.layout === "question" ? { ...s, answer: undefined } : s} theme={t} index={i} total={deck.slides.length} deckTitle={deck.title} />
        </div>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Exit presentation"><X className="h-5 w-5" /></button>
    </div>
  );
};
