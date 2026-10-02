import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Drama, MessageSquare, Pencil, Plus, Search, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell } from "@/components/subjects/kit";
import { GemOrb, Tabs, field, ghost, primary } from "@/components/spaces/ui";
import { GEM_TEMPLATES, PALETTE, listGems, paletteVars, type Gem, type GemTemplate } from "@/components/spaces/spaces";

type Tab = "mine" | "classes" | "starters";
const GemTabs = Tabs<Tab>;

const GemCard: React.FC<{ gem: Gem; mine: boolean }> = ({ gem, mine }) => (
  <div className="group relative">
    <Link
      to={`/gems/${gem.id}`}
      className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-lp-line bg-lp-surface p-5 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-lp-sky/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lp-sky"
    >
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-25 blur-3xl transition-opacity duration-500 group-hover:opacity-60" style={{ background: `radial-gradient(circle, ${PALETTE[gem.color].b}, transparent 70%)` }} />
      <GemOrb color={gem.color} emoji={gem.emoji} size="md" />
      <p className="mt-4 truncate text-[17px] font-semibold tracking-[-0.01em] text-white">{gem.name}</p>
      <p className="mt-1 line-clamp-2 min-h-[2.6em] text-[13px] leading-relaxed text-lp-soft">{gem.tagline || "A custom Refyn assistant."}</p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11.5px] text-lp-mute">
        {gem.kind === "character" && <span className="inline-flex items-center gap-1 rounded-full bg-lp-violet/15 px-2 py-0.5 text-lp-violet"><Drama className="h-3 w-3" /> Character</span>}
        {gem.knowledge.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-lp-raised px-2 py-0.5"><BookOpen className="h-3 w-3" /> {gem.knowledge.length} file{gem.knowledge.length === 1 ? "" : "s"}</span>}
        {mine && gem.visibility === "classes" && <span className="inline-flex items-center gap-1 rounded-full bg-lp-blue/15 px-2 py-0.5 text-lp-sky"><Users className="h-3 w-3" /> {gem.class_ids.length} class{gem.class_ids.length === 1 ? "" : "es"}</span>}
        {gem.uses > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {gem.uses}</span>}
      </div>
    </Link>
    {mine && (
      <Link to={`/gems/${gem.id}/edit`} aria-label={`Edit ${gem.name}`} title="Edit" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-lp-line bg-lp-surface/80 text-lp-mute opacity-100 backdrop-blur transition-opacity hover:text-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100">
        <Pencil className="h-4 w-4" />
      </Link>
    )}
  </div>
);

const TemplateCard: React.FC<{ t: GemTemplate; onUse: () => void }> = ({ t, onUse }) => (
  <button type="button" onClick={onUse} className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-dashed border-lp-line bg-lp-surface/50 p-5 text-left transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-lp-sky/50">
    <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-50" style={{ background: `radial-gradient(circle, ${PALETTE[t.color].b}, transparent 70%)` }} />
    <GemOrb color={t.color} emoji={t.emoji} size="md" />
    <p className="mt-4 text-[16px] font-semibold text-white">{t.name}</p>
    <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-lp-soft">{t.tagline}</p>
    <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-lp-sky">{t.kind === "character" ? <Drama className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />} Use as a starting point</span>
  </button>
);

const GemsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const teacher = user?.role === "teacher" || user?.role === "admin";
  const [gems, setGems] = useState<Gem[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("mine");
  const [q, setQ] = useState("");

  useEffect(() => { listGems().then(setGems, (e) => { setGems([]); setError(e.message); }); }, []);

  const mine = useMemo(() => (gems ?? []).filter((g) => g.owner_id === user?.id), [gems, user?.id]);
  const shared = useMemo(() => (gems ?? []).filter((g) => g.owner_id !== user?.id), [gems, user?.id]);
  const templates = GEM_TEMPLATES.filter((t) => t.for === "all" || t.for === (teacher ? "teacher" : "student"));
  useEffect(() => { if (gems && !mine.length) setTab(shared.length ? "classes" : "starters"); }, [gems]); // eslint-disable-line react-hooks/exhaustive-deps

  const match = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase());
  const list = (tab === "mine" ? mine : shared).filter((g) => !q.trim() || match(g.name) || match(g.tagline));
  const tlist = templates.filter((t) => !q.trim() || match(t.name) || match(t.tagline));
  const hero = (mine.length >= 3 ? mine : templates).slice(0, 4);

  return (
    <StudyShell wide>
      <section className="sp-cover relative mb-7 overflow-hidden rounded-[28px] px-6 py-9 sm:px-10 sm:py-12" style={paletteVars("violet")}>
        <div className="relative z-[1] max-w-[560px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/70">Gems</p>
          <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-[46px]">Your own AI, made for one job.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/80">
            {teacher
              ? "Give a Gem a personality, instructions and your own files. Chat with it any time, or share it with a class so every student gets the same expert helper."
              : "Give a Gem a personality, instructions and your own notes. A quiz master, an essay coach, a scientist from history: whatever helps you learn."}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/gems/new" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ffffff] px-4 text-[14px] font-semibold text-[#0f172a] shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] hover:bg-[#e2e8f0]"><Plus className="h-4 w-4" /> New Gem</Link>
            <button type="button" onClick={() => setTab("starters")} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 px-4 text-[14px] text-white hover:bg-white/10"><Sparkles className="h-4 w-4" /> Browse starters</button>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] md:block">
          {hero.map((g, i) => {
            const spots = [
              { top: "18%", right: "34%", size: "xl" as const, delay: "0s" },
              { top: "52%", right: "10%", size: "lg" as const, delay: "-2s" },
              { top: "10%", right: "6%", size: "md" as const, delay: "-4s" },
              { top: "62%", right: "48%", size: "md" as const, delay: "-1s" },
            ][i];
            return <span key={i} className="absolute" style={{ top: spots.top, right: spots.right }}><span className="sp-float inline-flex" style={{ animationDelay: spots.delay }}><GemOrb color={g.color} emoji={g.emoji} size={spots.size} /></span></span>;
          })}
        </div>
      </section>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <GemTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "mine", label: "Your Gems", count: gems ? mine.length : undefined },
            { id: "classes", label: teacher ? "Shared with you" : "From your classes", count: gems ? shared.length : undefined },
            { id: "starters", label: "Starters", count: templates.length },
          ]}
        />
        <label className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lp-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Gems" aria-label="Search Gems" className={cn(field, "h-10 py-2 pl-9")} />
        </label>
      </div>

      {error && <p className="mb-4 rounded-xl border border-lp-red/40 bg-lp-red/10 px-3 py-2 text-[13px] text-lp-red">{error}</p>}

      {!gems ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>{[0, 1, 2, 3].map((i) => <div key={i} className="lp-skeleton h-56 rounded-3xl" />)}</div>
      ) : tab === "starters" ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {tlist.map((t) => <TemplateCard key={t.name} t={t} onUse={() => navigate(`/gems/new?t=${encodeURIComponent(t.name)}`)} />)}
        </div>
      ) : list.length ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
          {list.map((g) => <GemCard key={g.id} gem={g} mine={g.owner_id === user?.id} />)}
          {tab === "mine" && !q && (
            <Link to="/gems/new" className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-lp-line text-lp-mute transition-colors hover:border-lp-sky/50 hover:text-white">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-current"><Plus className="h-6 w-6" /></span>
              <span className="text-[14px] font-medium">New Gem</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-lp-line px-6 py-14 text-center">
          <GemOrb color="violet" emoji={tab === "mine" ? "✨" : "🎓"} size="lg" float />
          <p className="mt-4 text-[17px] font-semibold text-white">{q ? "No Gems match that" : tab === "mine" ? "Make your first Gem" : teacher ? "Nothing shared with you yet" : "Nothing from your classes yet"}</p>
          <p className="mx-auto mt-1.5 max-w-[440px] text-[13.5px] text-lp-mute">
            {q ? "Try another search." : tab === "mine" ? "Describe what you want in a sentence and Refyn writes the rest, or start from one of the starters." : "When a teacher shares a Gem with one of your classes, it shows up here."}
          </p>
          {!q && tab === "mine" && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link to="/gems/new" className={primary}><Plus className="h-4 w-4" /> New Gem</Link>
              <button type="button" onClick={() => setTab("starters")} className={ghost}><Sparkles className="h-4 w-4" /> Starters</button>
            </div>
          )}
        </div>
      )}
    </StudyShell>
  );
};

export default GemsPage;
