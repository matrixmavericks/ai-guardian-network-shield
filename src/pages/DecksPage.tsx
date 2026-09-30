import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Image as ImageIcon, Loader2, Presentation, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { StudyShell } from "@/components/subjects/kit";
import { DeckStudio } from "@/components/decks/DeckStudio";
import { ScaledSlide, SlideView } from "@/components/decks/SlideView";
import { THEMES, loadDeckFonts, resolveTheme } from "@/components/decks/themes";
import { IMAGE_STYLES, type DeckDesign } from "@/components/decks/types";
import { DEFAULT_DESIGN, createDeck, deleteDeck, listDecks, type DeckRow } from "@/components/decks/store";

const IDEAS = [
  "Photosynthesis for Year 9, with a quick quiz",
  "Causes of World War One, for MYP 4 History",
  "Persuasive writing techniques, with examples",
  "Solving linear equations, step by step",
  "Climate change: causes, effects and solutions",
  "Introduction to the periodic table",
];
const TONES = ["Clear and engaging", "Playful", "Formal", "Inspiring", "Discussion-led"];

const NewDeck: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState(10);
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [design, setDesign] = useState<DeckDesign>({ ...DEFAULT_DESIGN, theme: "auto" });
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!user || !topic.trim()) return;
    setBusy(true);
    try {
      const id = await createDeck(user.id, { topic: topic.trim(), slides, audience: audience.trim() || undefined, tone }, design, topic.trim().slice(0, 80));
      navigate(`/decks/${id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const chip = (on: boolean) => cn("h-9 rounded-full border px-3.5 text-[13px] transition-colors", on ? "border-lp-sky/60 bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft hover:text-white");
  return (
    <section className="lp-fade relative overflow-hidden rounded-3xl border border-lp-line bg-lp-surface p-5 sm:p-7" style={{ animationFillMode: "both" }}>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-[90px]" style={{ background: "radial-gradient(closest-side, rgba(99,139,255,0.7), transparent)" }} />
      <p className="relative flex items-center gap-2 text-[13px] font-medium text-lp-sky"><Wand2 className="h-4 w-4" /> New presentation</p>
      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start(); }}
        rows={3}
        placeholder="What's it about? Add anything that matters: the unit, what students already know, an activity you want included…"
        className="relative mt-3 w-full resize-none rounded-2xl border border-lp-line bg-lp-deep/60 px-4 py-3 text-[16px] leading-relaxed text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60"
      />
      <div className="relative mt-2 flex flex-wrap gap-1.5">
        {IDEAS.map((i) => <button key={i} type="button" onClick={() => setTopic(i)} className="rounded-full border border-lp-line px-3 py-1 text-[12px] text-lp-mute hover:text-white">{i}</button>)}
      </div>

      <div className="relative mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[12px] font-medium text-lp-soft">Slides</p>
          <div className="flex flex-wrap gap-1.5">{[6, 8, 10, 12, 15].map((n) => <button key={n} type="button" onClick={() => setSlides(n)} className={chip(slides === n)}>{n}</button>)}</div>
          <p className="mb-2 mt-4 text-[12px] font-medium text-lp-soft">Audience</p>
          <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Grade 9 (MYP 4), mixed ability" className="h-10 w-full rounded-xl border border-lp-line bg-lp-deep/60 px-3 py-1 text-[14px] text-white outline-none placeholder:text-lp-mute focus:border-lp-blue/60" />
          <p className="mb-2 mt-4 text-[12px] font-medium text-lp-soft">Tone</p>
          <div className="flex flex-wrap gap-1.5">{TONES.map((t) => <button key={t} type="button" onClick={() => setTone(t)} className={chip(tone === t)}>{t}</button>)}</div>
        </div>
        <div>
          <p className="mb-2 text-[12px] font-medium text-lp-soft">Theme</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            <button type="button" onClick={() => setDesign((d) => ({ ...d, theme: "auto" }))} className={cn("flex h-14 flex-col items-center justify-center rounded-xl border text-[12px]", design.theme === "auto" ? "border-lp-sky bg-lp-blue/15 text-white" : "border-lp-line text-lp-soft")}>
              <Sparkles className="mb-0.5 h-4 w-4 text-lp-sky" /> Auto
            </button>
            {THEMES.map((t) => (
              <button key={t.id} type="button" onClick={() => setDesign((d) => ({ ...d, theme: t.id }))} title={t.name} className={cn("h-14 overflow-hidden rounded-xl border", design.theme === t.id ? "border-lp-sky ring-2 ring-lp-sky/40" : "border-lp-line")} style={{ background: t.bgCss }}>
                <span style={{ fontFamily: `"${t.heading}", sans-serif`, fontWeight: t.headingWeight, color: t.text, fontSize: 15 }}>Aa</span>
                <span className="mx-auto mt-1 block h-1 w-8 rounded-full" style={{ background: t.accent }} />
              </button>
            ))}
          </div>
          <div className="mb-2 mt-4 flex items-center justify-between">
            <p className="text-[12px] font-medium text-lp-soft">AI images</p>
            <label className="flex items-center gap-2 text-[12.5px] text-lp-soft">
              <input type="checkbox" checked={design.images} onChange={(e) => setDesign((d) => ({ ...d, images: e.target.checked }))} className="h-4 w-4 accent-[#3B82F6]" /> Include images
            </label>
          </div>
          <div className={cn("flex flex-wrap gap-1.5", !design.images && "pointer-events-none opacity-40")}>
            {IMAGE_STYLES.map((s) => <button key={s.id} type="button" onClick={() => setDesign((d) => ({ ...d, imageStyle: s.id }))} className={chip(design.imageStyle === s.id)}>{s.label}</button>)}
          </div>
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-lp-mute">Slides appear as they're written. Everything stays editable, and you can export to PowerPoint or PDF.</p>
        <button type="button" onClick={start} disabled={!topic.trim() || busy} className="flex h-11 items-center gap-2 rounded-xl bg-lp-blue px-5 text-[14.5px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(59,130,246,0.9)] hover:bg-[#2F6FE0] disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate presentation
        </button>
      </div>
    </section>
  );
};

const DeckList: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<DeckRow[] | null>(null);
  useEffect(() => {
    loadDeckFonts();
    if (user) listDecks(user.id).then(setRows);
  }, [user]);
  if (!rows) return <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="lp-skeleton aspect-video rounded-2xl" />)}</div>;
  if (!rows.length) return <p className="mt-8 text-center text-[14px] text-lp-mute">Your presentations will appear here.</p>;
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r, i) => {
        const first = r.deck.slides?.[0];
        return (
          <div key={r.id} className="lp-fade group relative" style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}>
            <Link to={`/decks/${r.id}`} className="block overflow-hidden rounded-2xl border border-lp-line bg-lp-surface transition-all hover:-translate-y-0.5 hover:border-lp-blue/50">
              {first ? (
                <ScaledSlide rounded={0}>
                  <SlideView slide={first} theme={resolveTheme(r.deck.design?.theme === "auto" ? { ...r.deck.design, theme: "midnight" } : r.deck.design)} index={0} total={r.slide_count} deckTitle={r.title} />
                </ScaledSlide>
              ) : (
                <div className="flex aspect-video items-center justify-center text-lp-mute"><Presentation className="h-8 w-8" /></div>
              )}
              <div className="flex items-center justify-between gap-2 border-t border-lp-line px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-white">{r.title}</p>
                  <p className="text-[12px] text-lp-mute">{r.slide_count} slides · {formatDistanceToNow(new Date(r.updated_at), { addSuffix: true })}</p>
                </div>
                {first?.image && <ImageIcon className="h-4 w-4 shrink-0 text-lp-mute" />}
              </div>
            </Link>
            <button
              type="button"
              aria-label={`Delete ${r.title}`}
              onClick={async () => {
                if (!confirm(`Delete "${r.title}"? This can't be undone.`)) return;
                await deleteDeck(r.id, r.deck);
                setRows((x) => x?.filter((y) => y.id !== r.id) ?? null);
              }}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-lp-red group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

const DecksPage = () => {
  const { id } = useParams<{ id: string }>();
  if (id) return <DeckStudio deckId={id} />;
  return (
    <StudyShell wide>
      <header className="lp-fade mb-6" style={{ animationFillMode: "both" }}>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-lp-sky">Refyn Slides</p>
        <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white sm:text-[36px]">Presentations</h1>
        <p className="mt-1.5 max-w-[620px] text-[14.5px] text-lp-soft">Describe a lesson and watch the deck build itself: designed slides, images and speaker notes. Then click any text to edit it, or ask the AI to change anything.</p>
      </header>
      <NewDeck />
      <DeckList />
    </StudyShell>
  );
};

export default DecksPage;
