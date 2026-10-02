import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Crosshair, Gem, Loader2, MessageSquare, Minus, Orbit, Plus, Scan, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useTeacherData } from "@/components/teacher/data";
import { SpaceShell } from "@/components/spaces/ui";
import { BrainCanvas, colorFor, type BrainHandle } from "@/components/spaces/BrainCanvas";
import { TYPE_META, conceptLayer, linkConcepts, loadBrain, type BrainLink, type BrainNode, type Graph, type Indexable, type NodeType } from "@/components/spaces/brain";

const glass = "rounded-2xl border border-lp-line/80 bg-lp-surface/75 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl";
const ORDER: NodeType[] = ["subject", "class", "student", "task", "criterion", "target", "world", "note", "scene", "character", "gem", "chat", "file", "concept"];

const BrainPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const teacher = user?.role === "teacher" || user?.role === "admin";
  const { data: tdata, loading: tloading } = useTeacherData(teacher);
  const [base, setBase] = useState<(Graph & { index: Indexable[] }) | null>(null);
  const [ideas, setIdeas] = useState<Record<string, string[]>>({});
  const [linking, setLinking] = useState<{ pending: number } | null>(null);
  const [ideaError, setIdeaError] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<NodeType>>(new Set());
  const [depth, setDepth] = useState(0);
  const [q, setQ] = useState("");
  const [qOpen, setQOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const brain = useRef<BrainHandle>(null);

  // Load everything, then let the AI link ideas across it
  useEffect(() => {
    if (!user || (teacher && tloading)) return;
    const signal = { cancelled: false };
    loadBrain({ id: user.id, name: user.fullName || "You", teacher }, teacher ? tdata : undefined).then((g) => {
      if (signal.cancelled) return;
      setBase(g);
      if (!g.index.length) return;
      setLinking({ pending: g.index.length });
      linkConcepts(g.index, (byItem, pending) => { setIdeas((prev) => ({ ...prev, ...byItem })); setLinking(pending ? { pending } : null); }, signal)
        .catch((e) => { setLinking(null); setIdeaError((e as Error).message || "Ideas couldn't be linked right now."); });
    }, (e) => setError((e as Error).message));
    return () => { signal.cancelled = true; };
  }, [user?.id, teacher, tloading]); // eslint-disable-line react-hooks/exhaustive-deps

  const graph = useMemo<Graph>(() => {
    if (!base) return { nodes: [], links: [] };
    const layer = conceptLayer(ideas, new Set(base.nodes.map((n) => n.id)));
    return { nodes: [...base.nodes, ...layer.nodes], links: [...base.links, ...layer.links] };
  }, [base, ideas]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const counts = useMemo(() => {
    const c = new Map<NodeType, number>();
    for (const n of graph.nodes) c.set(n.type, (c.get(n.type) ?? 0) + 1);
    return c;
  }, [graph]);
  const ideaCount = counts.get("concept") ?? 0;

  // Deep link: /brain?node=world:...
  useEffect(() => {
    const want = params.get("node");
    if (want && byId.has(want) && !selected) { setSelected(want); window.setTimeout(() => brain.current?.flyTo(want), 1700); }
  }, [byId]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return graph.nodes
      .filter((n) => n.label.toLowerCase().includes(s) && !hidden.has(n.type))
      .sort((a, b) => Number(b.label.toLowerCase().startsWith(s)) - Number(a.label.toLowerCase().startsWith(s)) || TYPE_META[b.type].rank - TYPE_META[a.type].rank)
      .slice(0, 8);
  }, [q, graph, hidden]);

  const pick = (id: string) => { setSelected(id); setQ(""); setQOpen(false); window.setTimeout(() => brain.current?.flyTo(id), 30); };
  const open = (n: BrainNode) => { if (n.href) navigate(n.href); };
  const toggle = (t: NodeType) => setHidden((h) => { const n = new Set(h); if (n.has(t)) n.delete(t); else n.add(t); return n; });

  const sel = selected ? byId.get(selected) ?? null : null;
  const connections = useMemo(() => {
    if (!sel) return [];
    const out: { n: BrainNode; via: BrainLink["kind"] }[] = [];
    for (const l of graph.links) {
      if (l.source === sel.id && byId.has(l.target)) out.push({ n: byId.get(l.target)!, via: l.kind });
      else if (l.target === sel.id && byId.has(l.source)) out.push({ n: byId.get(l.source)!, via: l.kind });
    }
    return out.sort((a, b) => TYPE_META[b.n.type].rank - TYPE_META[a.n.type].rank);
  }, [sel, graph, byId]);
  const sharedIdeas = sel && sel.type !== "concept" ? connections.filter((c) => c.n.type === "concept") : [];

  const loading = !base && !error;
  const emptyish = base && graph.nodes.length <= 3;
  const total = graph.nodes.length - 1;

  return (
    <SpaceShell>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(1200px 700px at 50% 45%, rgb(var(--lp-blue) / 0.12), transparent 60%), radial-gradient(700px 500px at 85% 10%, rgb(var(--lp-violet) / 0.10), transparent 60%), radial-gradient(600px 500px at 10% 90%, rgb(var(--lp-cyan) / 0.07), transparent 60%)" }}
      />
      {graph.nodes.length > 0 && (
        <BrainCanvas
          ref={brain}
          nodes={graph.nodes}
          links={graph.links}
          selected={selected}
          onSelect={setSelected}
          onOpen={open}
          hidden={hidden}
          depth={depth}
          label={`Your Refyn Brain: ${total} items${ideaCount ? ` and ${ideaCount} shared ideas` : ""}. Use the search box to find and select an item.`}
          className="absolute inset-0"
        />
      )}

      {/* Title and stats */}
      <div className={cn(glass, "pointer-events-auto absolute left-3 top-3 z-10 max-w-[calc(100%-24px)] px-4 py-3 sm:left-5 sm:top-5 sm:max-w-[340px]")}>
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky"><Orbit className="h-3.5 w-3.5" /> Brain</p>
        <p className="mt-1 text-[19px] font-semibold leading-tight tracking-[-0.02em] text-white">{teacher ? "Your teaching, connected" : "Everything you've learned, connected"}</p>
        <p className="mt-1 text-[12.5px] text-lp-mute">
          {loading ? "Gathering your work…" : `${total} item${total === 1 ? "" : "s"}${ideaCount ? ` · ${ideaCount} idea${ideaCount === 1 ? "" : "s"} linking them` : ""}`}
        </p>
        {linking && <p className="mt-2 flex items-center gap-2 text-[12px] text-lp-soft"><Loader2 className="h-3.5 w-3.5 animate-spin text-lp-sky" /> Finding the ideas that link them{linking.pending > 0 ? ` (${linking.pending} to go)` : ""}…</p>}
        {ideaError && !linking && <p className="mt-2 text-[12px] text-lp-amber">{ideaError}</p>}
      </div>

      {/* Search */}
      <div className="absolute right-3 top-[118px] z-20 w-[calc(100%-24px)] sm:right-5 sm:top-5 sm:w-[320px]">
        <label className={cn(glass, "flex h-11 items-center gap-2 px-3")}>
          <Search className="h-4 w-4 shrink-0 text-lp-mute" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setQOpen(true); setHi(0); }}
            onFocus={() => setQOpen(true)}
            onBlur={() => window.setTimeout(() => setQOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(results.length - 1, h + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
              else if (e.key === "Enter" && results[hi]) pick(results[hi].id);
              else if (e.key === "Escape") { setQ(""); (e.target as HTMLInputElement).blur(); }
            }}
            placeholder="Search your Brain"
            aria-label="Search your Brain"
            role="combobox"
            aria-expanded={qOpen && results.length > 0}
            aria-controls="brain-results"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-lp-mute"
          />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Clear" className="text-lp-mute hover:text-white"><X className="h-4 w-4" /></button>}
        </label>
        {qOpen && results.length > 0 && (
          <ul id="brain-results" role="listbox" className={cn(glass, "lp-fade mt-2 overflow-hidden p-1.5")}>
            {results.map((n, i) => (
              <li key={n.id} role="option" aria-selected={i === hi}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(n.id)} onMouseEnter={() => setHi(i)} className={cn("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left", i === hi && "bg-lp-raised")}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(n), boxShadow: `0 0 10px ${colorFor(n)}` }} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] text-white">{n.label}</span><span className="block text-[11px] text-lp-mute">{TYPE_META[n.type].label}{n.sub ? ` · ${n.sub}` : ""}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Filters (legend) */}
      <div className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-100px)] sm:bottom-5 sm:left-5 sm:max-w-[560px]">
        <button type="button" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} className={cn(glass, "mb-2 inline-flex h-10 items-center gap-2 px-3 text-[13px] text-lp-soft hover:text-white md:hidden")}>
          <SlidersHorizontal className="h-4 w-4" /> Show{hidden.size ? ` (${hidden.size} hidden)` : ""}
        </button>
        <div className={cn(glass, "flex-wrap gap-1.5 p-2", filtersOpen ? "flex" : "hidden md:flex")}>
          {ORDER.filter((t) => counts.get(t)).map((t) => {
            const off = hidden.has(t);
            const color = colorFor({ type: t, letter: t === "criterion" ? "A" : undefined, slot: t === "subject" ? 0 : undefined });
            return (
              <button key={t} type="button" aria-pressed={!off} onClick={() => toggle(t)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors", off ? "border-lp-line text-lp-mute line-through decoration-1" : "border-transparent bg-lp-raised/80 text-lp-soft hover:text-white")}>
                <span className="h-2 w-2 rounded-full" style={{ background: off ? "transparent" : color, boxShadow: off ? `inset 0 0 0 1px ${color}` : `0 0 8px ${color}` }} />
                {TYPE_META[t].plural}
                <span className="tabular-nums text-lp-mute">{counts.get(t)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Camera and local graph */}
      <div className={cn("absolute bottom-[84px] right-3 z-10 flex flex-col gap-2 sm:right-5 lg:bottom-5", sel && "lg:right-[396px]")}>
        <div className={cn(glass, "flex flex-col p-1")}>
          <button type="button" onClick={() => brain.current?.zoom(1.35)} aria-label="Zoom in" className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-soft hover:bg-lp-raised hover:text-white"><Plus className="h-4 w-4" /></button>
          <button type="button" onClick={() => brain.current?.zoom(1 / 1.35)} aria-label="Zoom out" className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-soft hover:bg-lp-raised hover:text-white"><Minus className="h-4 w-4" /></button>
          <button type="button" onClick={() => brain.current?.fit()} aria-label="Fit everything" title="Fit everything" className="flex h-9 w-9 items-center justify-center rounded-xl text-lp-soft hover:bg-lp-raised hover:text-white"><Scan className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Selected item */}
      {sel && (
        <aside className={cn(glass, "lp-fade absolute inset-x-2 bottom-2 z-30 flex max-h-[58vh] flex-col overflow-hidden rounded-3xl lg:inset-x-auto lg:bottom-5 lg:right-5 lg:top-[84px] lg:max-h-none lg:w-[360px]")} aria-label="Selected item">
          <div className="flex items-start gap-3 border-b border-lp-line/70 p-4">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: colorFor(sel), boxShadow: `0 0 14px ${colorFor(sel)}` }} />
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: colorFor(sel) }}>{TYPE_META[sel.type].label}</p>
              <p className="mt-0.5 text-[16px] font-semibold leading-snug text-white">{sel.label}</p>
              {sel.sub && <p className="mt-0.5 text-[12.5px] text-lp-mute">{sel.sub}</p>}
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lp-mute hover:bg-lp-raised hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-20 lg:pb-4">
            {sel.detail && <p className="text-[13px] leading-relaxed text-lp-soft">{sel.detail}</p>}
            <div className={cn("flex flex-wrap gap-2", sel.detail && "mt-3")}>
              {sel.href && <Link to={sel.href} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-lp-blue px-3 text-[13px] font-medium text-white hover:bg-[#2F6FE0]"><ArrowUpRight className="h-4 w-4" /> Open</Link>}
              {sel.type !== "me" && (
                <Link to={`/ai-learning-assistant?prompt=${encodeURIComponent(sel.type === "concept" ? `Explain "${sel.label}" and how it links the things I've worked on: ${connections.filter((c) => c.n.type !== "concept").slice(0, 6).map((c) => c.n.label).join("; ")}.` : `Help me with "${sel.label}" (${TYPE_META[sel.type].label.toLowerCase()}).`)}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white">
                  <MessageSquare className="h-4 w-4" /> Ask Refyn
                </Link>
              )}
              <button type="button" onClick={() => setDepth((d) => (d ? 0 : 1))} aria-pressed={depth > 0} className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[13px]", depth ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white")}>
                <Crosshair className="h-4 w-4" /> {depth ? "Show everything" : "Focus"}
              </button>
              {depth > 0 && (
                <button type="button" onClick={() => setDepth((d) => (d === 1 ? 2 : 1))} className="inline-flex h-9 items-center rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white">{depth === 1 ? "2 steps out" : "1 step out"}</button>
              )}
            </div>
            {sharedIdeas.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lp-mute">Ideas in this</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sharedIdeas.map(({ n }) => (
                    <button key={n.id} type="button" onClick={() => pick(n.id)} className="inline-flex items-center gap-1 rounded-full border border-lp-amber/30 bg-lp-amber/10 px-2.5 py-1 text-[12px] text-lp-soft hover:text-white"><Sparkles className="h-3 w-3 text-lp-amber" /> {n.label}</button>
                  ))}
                </div>
              </div>
            )}
            {connections.filter((c) => sel.type === "concept" || c.n.type !== "concept").length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lp-mute">{sel.type === "concept" ? "Where this idea comes up" : "Connected to"}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {connections.filter((c) => sel.type === "concept" || c.n.type !== "concept").slice(0, 40).map(({ n }) => (
                    <li key={n.id}>
                      <button type="button" onClick={() => pick(n.id)} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-lp-raised">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorFor(n) }} />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-lp-soft">{n.label}</span>
                        <span className="shrink-0 text-[11px] text-lp-mute">{TYPE_META[n.type].label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      )}

      {loading && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          <div className="relative h-28 w-28">
            {[0, 1, 2].map((i) => <span key={i} className="absolute inset-0 animate-ping rounded-full border border-lp-sky/40" style={{ animationDelay: `${i * 0.5}s`, animationDuration: "2s" }} />)}
            <span className="absolute inset-[38%] rounded-full bg-lp-sky shadow-[0_0_40px_rgba(124,180,255,0.9)]" />
          </div>
        </div>
      )}
      {error && <p role="alert" className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 rounded-xl border border-lp-red/40 bg-lp-red/10 px-4 py-3 text-[13px] text-lp-red">{error}</p>}
      {emptyish && (
        <div className={cn(glass, "absolute left-1/2 top-1/2 z-10 w-[min(92%,440px)] -translate-x-1/2 -translate-y-1/2 p-6 text-center")}>
          <p className="text-[17px] font-semibold text-white">Your Brain grows as you use Refyn</p>
          <p className="mt-1.5 text-[13.5px] text-lp-mute">Classes, tasks, marks, chats, Gems and Worlds all appear here, linked by the ideas they share.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link to="/ai-learning-assistant" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-lp-blue px-3 text-[13px] font-medium text-white"><MessageSquare className="h-4 w-4" /> Start a chat</Link>
            <Link to="/gems/new" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white"><Gem className="h-4 w-4" /> Make a Gem</Link>
            <Link to="/worlds" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-lp-line px-3 text-[13px] text-lp-soft hover:text-white"><Orbit className="h-4 w-4" /> Build a World</Link>
          </div>
        </div>
      )}
    </SpaceShell>
  );
};

export default BrainPage;
